import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { nameKey, sameArtist, similarity, stripDecorations, titleKey } from "./music-match";

// All spotify_tokens reads/writes go through the service-role client because
// the table has no RLS policies and no grants to `authenticated` - the raw
// access/refresh tokens must never be reachable from a client session. These
// server fns still require `requireSupabaseAuth` so we scope every query to
// the authenticated caller by `context.userId`.

export const getSpotifyAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { redirectOrigin: string }) =>
    z.object({ redirectOrigin: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { signState, newNonce, SPOTIFY_SCOPES } = await import("./spotify.server");
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) throw new Error("Spotify not configured");
    const redirectUri = `${data.redirectOrigin}/api/public/spotify/callback`;
    const state = signState({
      userId: context.userId,
      origin: data.redirectOrigin,
      nonce: newNonce(),
      ts: Date.now(),
    });
    const url = new URL("https://accounts.spotify.com/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SPOTIFY_SCOPES);
    url.searchParams.set("state", state);
    url.searchParams.set("show_dialog", "false");
    return { url: url.toString() };
  });

export const getSpotifyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("spotify_tokens")
      .select("spotify_user_id, display_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      connected: !!data,
      displayName: data?.display_name ?? null,
      spotifyUserId: data?.spotify_user_id ?? null,
    };
  });

export const disconnectSpotify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("spotify_tokens")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type SpotifyTrackSummary = {
  uri: string;
  name: string;
  artists: string;
  album: string | null;
  image: string | null;
};

export type PlaylistSongMatch = {
  song: string;
  track: SpotifyTrackSummary | null;
};

type SpotifyTrack = {
  uri?: string;
  name?: string;
  artists?: Array<{ id?: string; name?: string }>;
  album?: { name?: string; images?: Array<{ url?: string }> };
};

function summarize(t: SpotifyTrack): SpotifyTrackSummary {
  const images = t.album?.images ?? [];
  return {
    uri: t.uri!,
    name: t.name ?? "",
    artists: (t.artists ?? []).map((a) => a.name).filter(Boolean).join(", "),
    album: t.album?.name ?? null,
    // Spotify sorts largest first; the smallest is plenty for a list thumbnail.
    image: images[images.length - 1]?.url ?? null,
  };
}

async function searchTracks(accessToken: string, q: string): Promise<SpotifyTrack[]> {
  const { spotifyUserGet } = await import("./spotify.server");
  const json = await spotifyUserGet<{ tracks?: { items?: SpotifyTrack[] } }>(
    accessToken,
    `/search?type=track&limit=10&market=from_token&q=${encodeURIComponent(q)}`,
  );
  return (json?.tracks?.items ?? []).filter((t) => t.uri && t.name);
}

const ALT_VERSION = /\b(live|remix|karaoke|instrumental|acoustic|demo|sped up|slowed|cover|tribute)\b/i;

type Candidate = { track: SpotifyTrack; title: number; artistMatch: boolean };

function scoreCandidate(song: string, artist: string, t: SpotifyTrack): Candidate | null {
  const want = titleKey(song);
  const got = titleKey(t.name!);
  let title = 0;
  if (want && (want === got || nameKey(song) === nameKey(t.name!))) title = 100;
  else if (want.length >= 4 && got.length >= 4 && (got.startsWith(want) || want.startsWith(got)))
    title = 70;
  else if (similarity(want, got) >= 0.85) title = 60;
  if (title === 0) return null;
  // Prefer the studio version unless the setlist names a specific one.
  if (ALT_VERSION.test(t.name!) && !ALT_VERSION.test(song)) title -= 15;
  const artistMatch = (t.artists ?? []).some((a) => a.name && sameArtist(a.name, artist));
  return { track: t, title, artistMatch };
}

// Collect candidate tracks for one setlist entry, trying progressively looser
// queries. The strict field query misses curly apostrophes, "(Live)" suffixes
// and covers; the title-only query is what finds covers of other artists.
async function findCandidates(
  accessToken: string,
  song: string,
  artist: string,
): Promise<Candidate[]> {
  const cleanSong = song.replace(/["“”]/g, "").trim();
  const bare = stripDecorations(cleanSong);
  const cleanArtist = artist.replace(/["“”]/g, "").trim();
  const queries = [
    `track:"${cleanSong}" artist:"${cleanArtist}"`,
    `${bare} ${cleanArtist}`,
    `track:"${bare}"`,
  ];
  const all: Candidate[] = [];
  const seen = new Set<string>();
  for (const [i, q] of queries.entries()) {
    for (const t of await searchTracks(accessToken, q)) {
      if (seen.has(t.uri!)) continue;
      seen.add(t.uri!);
      const c = scoreCandidate(song, artist, t);
      // Title-only results are only trusted on an exact title (likely a cover).
      if (c && (c.artistMatch || (i === 2 && c.title >= 85))) all.push(c);
    }
    if (all.some((c) => c.artistMatch && c.title === 100)) break;
  }
  return all;
}

function pick(cands: Candidate[], preferredArtistId: string | null): SpotifyTrack | null {
  let best: { t: SpotifyTrack; score: number } | null = null;
  for (const c of cands) {
    let score = c.title + (c.artistMatch ? 30 : 0);
    if (preferredArtistId && c.track.artists?.some((a) => a.id === preferredArtistId)) score += 10;
    if (!best || score > best.score) best = { t: c.track, score };
  }
  return best?.t ?? null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function loadConcertForUser(supabase: SupabaseClient<Database>, concertId: string) {
  // User-scoped client so RLS enforces that the caller can see this concert
  // (their own or a friend's).
  const { data: concert, error } = await supabase
    .from("concerts")
    .select("id, artist, venue, city, country, date, setlist, user_id")
    .eq("id", concertId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!concert) throw new Error("Concert not found");
  return { ...concert, setlist: (concert.setlist as string[] | null) ?? [] };
}

// Step 1 of the playlist flow: match every setlist song to a Spotify track so
// the user can review (and fix) the list before anything is created.
export const matchSetlistOnSpotify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { concertId: string }) =>
    z.object({ concertId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }): Promise<{ matches: PlaylistSongMatch[] }> => {
    const { getUserAccessToken } = await import("./spotify.server");
    const concert = await loadConcertForUser(context.supabase, data.concertId);
    const songs = concert.setlist.slice(0, 100);
    if (songs.length === 0) throw new Error("This show has no setlist yet.");
    const { accessToken } = await getUserAccessToken(context.userId);

    // Search each distinct title once; setlists can repeat a song (reprises).
    const distinct = [...new Set(songs)];
    const cands = await mapWithConcurrency(distinct, 4, (song) =>
      findCandidates(accessToken, song, concert.artist),
    );

    // Several artists can share a name ("Nothing"); the one that most of the
    // setlist resolves to is the act that played, so favour it everywhere.
    const votes = new Map<string, number>();
    for (const list of cands) {
      const top = pick(list.filter((c) => c.artistMatch), null);
      const id = top?.artists?.find((a) => a.name && sameArtist(a.name, concert.artist))?.id;
      if (id) votes.set(id, (votes.get(id) ?? 0) + 1);
    }
    const preferred = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const bySong = new Map(
      distinct.map((song, i) => {
        const t = pick(cands[i], preferred);
        return [song, t ? summarize(t) : null] as const;
      }),
    );
    return { matches: songs.map((song) => ({ song, track: bySong.get(song) ?? null })) };
  });

// Manual search for songs the automatic match missed.
export const searchSpotifyTracks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string }) =>
    z.object({ query: z.string().trim().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<SpotifyTrackSummary[]> => {
    const { getUserAccessToken } = await import("./spotify.server");
    const { accessToken } = await getUserAccessToken(context.userId);
    return (await searchTracks(accessToken, data.query)).map(summarize);
  });

// Step 2: create the playlist from the exact tracks the user confirmed.
export const createSpotifyPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { concertId: string; name: string; uris: string[] }) =>
    z
      .object({
        concertId: z.string().uuid(),
        name: z.string().min(1).max(100),
        uris: z.array(z.string().regex(/^spotify:track:[A-Za-z0-9]{22}$/)).min(1).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { getUserAccessToken } = await import("./spotify.server");
    const concert = await loadConcertForUser(context.supabase, data.concertId);
    const { accessToken, scope } = await getUserAccessToken(context.userId);

    const grantedScopes = new Set(scope.split(/\s+/).filter(Boolean));
    const hasPlaylistScope =
      grantedScopes.has("playlist-modify-private") || grantedScopes.has("playlist-modify-public");
    if (!hasPlaylistScope) {
      throw new Error(
        "Spotify playlist permission is missing. Disconnect Spotify, connect again, and approve playlist access.",
      );
    }

    // Create playlist
    const description = `${concert.artist} · ${concert.venue}, ${concert.city} · ${concert.date}`;
    const cpRes = await fetch("https://api.spotify.com/v1/me/playlists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: data.name, public: false, description }),
    });
    if (!cpRes.ok) {
      const body = await cpRes.text().catch(() => "");
      console.error("[spotify] create playlist failed", cpRes.status, body);
      if (cpRes.status === 401) throw new Error("Spotify auth failed (401). Please reconnect.");
      throw new Error(`Failed to create playlist (${cpRes.status}): ${body.slice(0, 300)}`);
    }
    const pl = (await cpRes.json()) as {
      id: string;
      external_urls?: { spotify?: string };
    };
    console.info("[spotify] playlist created", { playlistId: pl.id });

    // Use the current "items" endpoint; the old "tracks" endpoint is
    // deprecated and can return bare 403s for newer apps. 100 is the per-call max.
    const ar = await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/items`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: data.uris }),
    });
    let warning: string | null = null;
    if (!ar.ok) {
      const body = await ar.text().catch(() => "");
      console.error("[spotify] add tracks failed", {
        status: ar.status,
        body,
        playlistId: pl.id,
        scopes: [...grantedScopes].join(" "),
        trackCount: data.uris.length,
      });
      warning = `Spotify created the playlist, but would not add tracks (${ar.status}). Open it in Spotify and try adding songs manually.`;
    }

    return {
      playlistUrl: pl.external_urls?.spotify ?? null,
      added: warning ? 0 : data.uris.length,
      warning,
    };
  });
