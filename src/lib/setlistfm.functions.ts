import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSpotifyAppToken } from "@/lib/spotify.server";
import { nameKey, sameArtist, similarity } from "@/lib/music-match";

const InputSchema = z.object({
  artist: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  // Optional hints that help when setlist.fm spells the artist differently.
  city: z.string().max(120).optional(),
  // When the caller already resolved the artist on Spotify, use that exact
  // artist for the image + genre instead of a name search.
  spotifyArtistId: z.string().min(1).max(64).optional(),
});

export type OpenerSetlist = { artist: string; songs: string[] };

export type SetlistLookupResult = {
  found: boolean;
  tour: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  openers: string[];
  openerSetlists: OpenerSetlist[];
  songs: string[];
  songsSeen: number | null;
  genre: string | null;
  artist: string | null;
  artistImageUrl: string | null;
  setlistUrl: string | null;
};

// setlist.fm wants DD-MM-YYYY
function toSetlistDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function lookupGenre(mbid: string | undefined): Promise<string | null> {
  if (!mbid) return null;
  try {
    const res = await fetch(
      `https://musicbrainz.org/ws/2/artist/${mbid}?inc=genres+tags&fmt=json`,
      {
        headers: {
          "User-Agent": "Concertly/1.0 (https://concertly.lovable.app)",
          Accept: "application/json",
        },
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      genres?: Array<{ name?: string; count?: number }>;
      tags?: Array<{ name?: string; count?: number }>;
    };
    const pool = [...(json.genres ?? []), ...(json.tags ?? [])]
      .filter((x): x is { name: string; count?: number } => !!x.name)
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
    return pool[0] ? titleCase(pool[0].name) : null;
  } catch {
    return null;
  }
}

// Use Spotify's Web API for artist images + genre (client-credentials flow).
type SpotifyImage = { url?: string; width?: number; height?: number };
type SpotifyArtist = {
  id?: string;
  name?: string;
  images?: SpotifyImage[];
  genres?: string[];
  followers?: { total?: number };
};

function pickSpotifyImage(images: SpotifyImage[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  // Spotify returns images sorted largest-first.
  return images[0]?.url ?? null;
}

function pickSpotifyGenre(genres: string[] | undefined): string | null {
  const g = genres?.[0];
  return g ? titleCase(g) : null;
}

async function spotifyGet(path: string): Promise<unknown | null> {
  try {
    const token = await getSpotifyAppToken();
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getSpotifyArtistById(
  id: string,
): Promise<{ image: string | null; genre: string | null } | null> {
  const json = (await spotifyGet(`/artists/${encodeURIComponent(id)}`)) as
    | SpotifyArtist
    | null;
  if (!json) return null;
  return {
    image: pickSpotifyImage(json.images),
    genre: pickSpotifyGenre(json.genres),
  };
}

// Search Spotify by name and only accept an artist whose name actually matches.
// Taking the first hit blindly gave unrelated artists (and their genre) when
// the spelling differed slightly.
async function lookupSpotifyArtist(
  name: string,
): Promise<{ image: string | null; genre: string | null }> {
  const json = (await spotifyGet(
    `/search?type=artist&limit=10&q=${encodeURIComponent(name)}`,
  )) as { artists?: { items?: SpotifyArtist[] } } | null;
  const items = (json?.artists?.items ?? []).filter((a) => a.name);
  const key = nameKey(name);
  const exact = items.filter((a) => nameKey(a.name!) === key);
  // Among same-name artists prefer one with genres, i.e. the established act.
  const a =
    exact.find((x) => x.genres?.length) ??
    exact[0] ??
    items.find((x) => sameArtist(x.name!, name));
  if (!a) return { image: null, genre: null };
  const image = pickSpotifyImage(a.images);
  const genre = pickSpotifyGenre(a.genres);
  if (image && genre) return { image, genre };
  // Only fetch the full artist when the search hit lacked something.
  const full = a.id ? await getSpotifyArtistById(a.id) : null;
  return { image: image ?? full?.image ?? null, genre: genre ?? full?.genre ?? null };
}

async function lookupArtistImage(name: string): Promise<string | null> {
  const { image } = await lookupSpotifyArtist(name);
  return image;
}


type SetlistFmSetlist = {
  url?: string;
  artist?: { name?: string; mbid?: string };
  tour?: { name?: string };
  venue?: {
    id?: string;
    name?: string;
    city?: { name?: string; country?: { name?: string; code?: string } };
  };
  sets?: { set?: Array<{ name?: string; song?: Array<{ name?: string }> }> };
};

// setlist.fm allows ~2 requests/second, so retry once after a short pause on 429.
async function setlistFmGet(
  path: string,
  params: Record<string, string>,
  apiKey: string,
): Promise<Response> {
  const url = new URL(`https://api.setlist.fm/rest/1.0${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const init = {
    headers: { "x-api-key": apiKey, Accept: "application/json", "Accept-Language": "en" },
  };
  const res = await fetch(url.toString(), init);
  if (res.status !== 429) return res;
  await new Promise((r) => setTimeout(r, 1100));
  return fetch(url.toString(), init);
}

async function searchSetlists(
  params: Record<string, string>,
  apiKey: string,
): Promise<SetlistFmSetlist[]> {
  const res = await setlistFmGet("/search/setlists", { ...params, p: "1" }, apiKey);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Setlist.fm request failed (${res.status})`);
  const json = (await res.json()) as { setlist?: SetlistFmSetlist[] };
  return json.setlist ?? [];
}

function findArtistSetlist(
  list: SetlistFmSetlist[],
  artist: string,
): SetlistFmSetlist | undefined {
  const key = nameKey(artist);
  return (
    list.find((s) => s.artist?.name && nameKey(s.artist.name) === key) ??
    list.find((s) => s.artist?.name && sameArtist(s.artist.name, artist))
  );
}

// Find the headliner's setlist even when setlist.fm spells the artist
// differently from what the user typed (usually the Spotify spelling):
// 1. exact artistName search, 2. resolve the artist via setlist.fm's fuzzy
// artist search and query by MBID, 3. list every show in the city that day
// and pick the closest artist name.
async function findHeadlinerSetlist(
  artist: string,
  isoDate: string,
  city: string | undefined,
  apiKey: string,
): Promise<{ headliner: SetlistFmSetlist; sameDay: SetlistFmSetlist[] } | null> {
  const date = toSetlistDate(isoDate);

  const byName = await searchSetlists({ artistName: artist, date }, apiKey);
  const direct = findArtistSetlist(byName, artist);
  if (direct) return { headliner: direct, sameDay: byName };

  try {
    const res = await setlistFmGet(
      "/search/artists",
      { artistName: artist, sort: "relevance", p: "1" },
      apiKey,
    );
    if (res.ok) {
      const json = (await res.json()) as { artist?: Array<{ mbid?: string; name?: string }> };
      const key = nameKey(artist);
      const candidates = (json.artist ?? [])
        .filter((a): a is { mbid: string; name: string } => !!a.mbid && !!a.name)
        .map((a) => ({ ...a, score: similarity(nameKey(a.name), key) }))
        .filter((a) => a.score >= 0.75)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);
      for (const c of candidates) {
        const list = await searchSetlists({ artistMbid: c.mbid, date }, apiKey);
        if (list[0]) return { headliner: list[0], sameDay: [...list, ...byName] };
      }
    }
  } catch {
    // fall through to the city search
  }

  if (city?.trim()) {
    const inCity = await searchSetlists({ cityName: city.trim(), date }, apiKey).catch(
      () => [] as SetlistFmSetlist[],
    );
    const hit = findArtistSetlist(inCity, artist);
    if (hit) return { headliner: hit, sameDay: inCity };
  }

  // setlist.fm's artistName search is fuzzy, so byName[0] may be a different
  // act entirely ("Nothing" -> "Nothing But Thieves"); report not found instead.
  return null;
}

async function lookupOpenerSetlist(
  artist: string,
  isoDate: string,
  apiKey: string,
): Promise<string[]> {
  try {
    const list = await searchSetlists({ artistName: artist, date: toSetlistDate(isoDate) }, apiKey);
    return songsOf(findArtistSetlist(list, artist) ?? list[0]);
  } catch {
    return [];
  }
}

function songsOf(setlist: SetlistFmSetlist | undefined): string[] {
  const songs: string[] = [];
  for (const s of setlist?.sets?.set ?? []) {
    for (const song of s.song ?? []) {
      const n = song.name?.trim();
      if (n) songs.push(n);
    }
  }
  return songs;
}

export const lookupSetlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<SetlistLookupResult> => {
    const apiKey = process.env.SETLISTFM_API_KEY;
    if (!apiKey) throw new Error("Setlist.fm API key is not configured");

    const empty: SetlistLookupResult = {
      found: false,
      tour: null,
      venue: null,
      city: null,
      country: null,
      openers: [],
      openerSetlists: [],
      songs: [],
      songsSeen: null,
      genre: null,
      artist: null,
      artistImageUrl: null,
      setlistUrl: null,
    };

    const found = await findHeadlinerSetlist(data.artist, data.date, data.city, apiKey);
    if (!found) {
      // No setlist, but still return the picked artist's image + genre so the
      // caller doesn't need a second round trip for them.
      const a = data.spotifyArtistId ? await getSpotifyArtistById(data.spotifyArtistId) : null;
      return { ...empty, genre: a?.genre ?? null, artistImageUrl: a?.image ?? null };
    }
    const { headliner } = found;
    const headlinerName = headliner.artist?.name ?? "";

    // Openers are the other artists that played the same venue that day.
    const venueId = headliner.venue?.id;
    const venueName = headliner.venue?.name?.toLowerCase();
    const openers = Array.from(
      new Set(
        found.sameDay
          .filter((s) =>
            venueId && s.venue?.id
              ? s.venue.id === venueId
              : s.venue?.name?.toLowerCase() === venueName,
          )
          .map((s) => s.artist?.name)
          .filter((n): n is string => !!n && !sameArtist(n, headlinerName)),
      ),
    ).slice(0, 5);

    const songs = songsOf(headliner);

    // Only use the tour name attached to this specific show - no nearby fallback.
    const tour = headliner.tour?.name ?? null;

    // In parallel: Spotify artist (image + genre), MusicBrainz genre (only
    // used when Spotify has none for this artist), opener setlists.
    const [spotify, mbGenre, openerSetlistsRaw] = await Promise.all([
      data.spotifyArtistId
        ? getSpotifyArtistById(data.spotifyArtistId).then(
            (r) => r ?? lookupSpotifyArtist(data.artist),
          )
        : lookupSpotifyArtist(data.artist).then((r) =>
            r.image || r.genre || !headlinerName || sameArtist(headlinerName, data.artist)
              ? r
              : lookupSpotifyArtist(headlinerName),
          ),
      lookupGenre(headliner.artist?.mbid),
      Promise.all(
        openers.slice(0, 3).map(async (name) => ({
          artist: name,
          songs: await lookupOpenerSetlist(name, data.date, apiKey),
        })),
      ),
    ]);
    const genre = spotify.genre ?? mbGenre;
    const artistImageUrl = spotify.image;
    const openerSetlists = openerSetlistsRaw.filter((o: { songs: string[] }) => o.songs.length > 0);


    return {
      found: true,
      artist: headliner.artist?.name ?? null,
      tour,
      venue: headliner.venue?.name ?? null,
      city: headliner.venue?.city?.name ?? null,
      country:
        headliner.venue?.city?.country?.name ??
        headliner.venue?.city?.country?.code ??
        null,
      openers,
      openerSetlists,
      songs,
      songsSeen: songs.length > 0 ? songs.length : null,
      genre,
      artistImageUrl,
      setlistUrl: headliner.url ?? null,
    };
  });

const ArtistSearchInput = z.object({ query: z.string().min(1).max(120) });

export type ArtistSuggestion = {
  id: string | null;
  name: string;
  image: string | null;
  genre: string | null;
  nbFan: number | null;
};

export const searchArtists = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ArtistSearchInput.parse(input))
  .handler(async ({ data }): Promise<ArtistSuggestion[]> => {
    const json = (await spotifyGet(
      `/search?type=artist&limit=8&q=${encodeURIComponent(data.query)}`,
    )) as { artists?: { items?: SpotifyArtist[] } } | null;
    const items = json?.artists?.items ?? [];
    const seen = new Set<string>();
    const out: ArtistSuggestion[] = [];
    for (const a of items) {
      const name = a.name?.trim();
      if (!name) continue;
      const key = `${name.toLowerCase()}::${a.id ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: typeof a.id === "string" ? a.id : null,
        name,
        image: pickSpotifyImage(a.images),
        genre: pickSpotifyGenre(a.genres),
        nbFan: typeof a.followers?.total === "number" ? a.followers.total : null,
      });
    }
    return out;
  });

const CoPerformersInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.string().min(1),
  excludeArtists: z.array(z.string()).default([]),
});

export type CoPerformer = {
  artist: string;
  songs: string[];
  tour: string | null;
  city: string | null;
  country: string | null;
  venue: string;
};

export const lookupCoPerformers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CoPerformersInput.parse(input))
  .handler(async ({ data }): Promise<CoPerformer[]> => {
    const apiKey = process.env.SETLISTFM_API_KEY;
    if (!apiKey) throw new Error("Setlist.fm API key is not configured");

    const url = new URL("https://api.setlist.fm/rest/1.0/search/setlists");
    url.searchParams.set("venueName", data.venue);
    url.searchParams.set("date", toSetlistDate(data.date));
    url.searchParams.set("p", "1");

    const res = await fetch(url.toString(), {
      headers: { "x-api-key": apiKey, Accept: "application/json", "Accept-Language": "en" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      setlist?: Array<{
        artist?: { name?: string };
        tour?: { name?: string };
        venue?: {
          name?: string;
          city?: { name?: string; country?: { name?: string; code?: string } };
        };
        sets?: { set?: Array<{ song?: Array<{ name?: string }> }> };
      }>;
    };

    const excluded = new Set(data.excludeArtists.map((a) => a.trim().toLowerCase()));
    const venueLc = data.venue.trim().toLowerCase();
    const seen = new Set<string>();
    const out: CoPerformer[] = [];
    for (const s of json.setlist ?? []) {
      const name = s.artist?.name?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (excluded.has(key) || seen.has(key)) continue;
      // ensure venue actually matches (setlist.fm does fuzzy matching)
      const vName = s.venue?.name?.trim().toLowerCase();
      if (!vName || (vName !== venueLc && !vName.includes(venueLc) && !venueLc.includes(vName))) {
        continue;
      }
      seen.add(key);
      const songs: string[] = [];
      for (const set of s.sets?.set ?? []) {
        for (const song of set.song ?? []) {
          const n = song.name?.trim();
          if (n) songs.push(n);
        }
      }
      out.push({
        artist: name,
        songs,
        tour: s.tour?.name ?? null,
        venue: s.venue?.name ?? data.venue,
        city: s.venue?.city?.name ?? null,
        country:
          s.venue?.city?.country?.name ?? s.venue?.city?.country?.code ?? null,
      });
    }
    return out;
  });

const ArtistImageInput = z.object({ artist: z.string().min(1).max(200) });

export const lookupArtistImageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ArtistImageInput.parse(input))
  .handler(async ({ data }): Promise<{ url: string | null }> => {
    const url = await lookupArtistImage(data.artist);
    return { url };
  });

