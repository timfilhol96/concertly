import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSpotifyAppToken } from "@/lib/spotify.server";


const InputSchema = z.object({
  artist: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
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

async function lookupSpotifyArtist(
  name: string,
): Promise<{ image: string | null; genre: string | null }> {
  const json = (await spotifyGet(
    `/search?type=artist&limit=1&q=${encodeURIComponent(name)}`,
  )) as { artists?: { items?: SpotifyArtist[] } } | null;
  const a = json?.artists?.items?.[0];
  if (!a) return { image: null, genre: null };
  return {
    image: pickSpotifyImage(a.images),
    genre: pickSpotifyGenre(a.genres),
  };
}

async function lookupArtistImage(name: string): Promise<string | null> {
  const { image } = await lookupSpotifyArtist(name);
  return image;
}


async function lookupOpenerSetlist(
  artist: string,
  isoDate: string,
  apiKey: string,
): Promise<string[]> {
  try {
    const url = new URL("https://api.setlist.fm/rest/1.0/search/setlists");
    url.searchParams.set("artistName", artist);
    url.searchParams.set("date", toSetlistDate(isoDate));
    url.searchParams.set("p", "1");
    const res = await fetch(url.toString(), {
      headers: { "x-api-key": apiKey, Accept: "application/json", "Accept-Language": "en" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      setlist?: Array<{
        artist?: { name?: string };
        sets?: { set?: Array<{ song?: Array<{ name?: string }> }> };
      }>;
    };
    const target = artist.toLowerCase();
    const match =
      json.setlist?.find((s) => s.artist?.name?.toLowerCase() === target) ??
      json.setlist?.[0];
    const songs: string[] = [];
    for (const s of match?.sets?.set ?? []) {
      for (const song of s.song ?? []) {
        const n = song.name?.trim();
        if (n) songs.push(n);
      }
    }
    return songs;
  } catch {
    return [];
  }
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

    const url = new URL("https://api.setlist.fm/rest/1.0/search/setlists");
    url.searchParams.set("artistName", data.artist);
    url.searchParams.set("date", toSetlistDate(data.date));
    url.searchParams.set("p", "1");

    const res = await fetch(url.toString(), {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json",
        "Accept-Language": "en",
      },
    });

    if (res.status === 404) return empty;
    if (!res.ok) throw new Error(`Setlist.fm request failed (${res.status})`);

    const json = (await res.json()) as {
      setlist?: Array<{
        url?: string;
        artist?: { name?: string; mbid?: string };
        tour?: { name?: string };
        venue?: {
          name?: string;
          city?: { name?: string; country?: { name?: string; code?: string } };
        };
        sets?: { set?: Array<{ name?: string; song?: Array<{ name?: string }> }> };
      }>;
    };

    const matches = json.setlist ?? [];
    if (matches.length === 0) return empty;

    const q = data.artist.trim().toLowerCase();
    const headliner =
      matches.find((s) => s.artist?.name?.toLowerCase() === q) ?? matches[0];

    const openers = Array.from(
      new Set(
        matches
          .map((s) => s.artist?.name)
          .filter(
            (n): n is string =>
              !!n && n.toLowerCase() !== (headliner.artist?.name ?? "").toLowerCase(),
          ),
      ),
    ).slice(0, 5);

    const sets = headliner.sets?.set ?? [];
    const songs: string[] = [];
    for (const s of sets) {
      for (const song of s.song ?? []) {
        const n = song.name?.trim();
        if (n) songs.push(n);
      }
    }

    // Only use the tour name attached to this specific show — no nearby fallback.
    const tour = headliner.tour?.name ?? null;

    // In parallel: MusicBrainz genre (fallback), Spotify artist (image + genre), opener setlists.
    const [mbGenre, spotify, openerSetlistsRaw] = await Promise.all([
      lookupGenre(headliner.artist?.mbid),
      lookupSpotifyArtist(headliner.artist?.name ?? data.artist),
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
        nbFan: typeof a.followers?.total === "number" ? a.followers.total : null,
      });
    }
    return out;
  });

const ArtistByIdInput = z.object({ id: z.string().min(1).max(64) });

// Formerly `lookupDeezerArtistByIdFn` — we moved from Deezer to Spotify; the
// export is now `lookupSpotifyArtistByIdFn`. A deprecated alias is kept below
// for any lingering callers, but new code should import the Spotify name.
export const lookupSpotifyArtistByIdFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ArtistByIdInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ image: string | null; genre: string | null }> => {
      const result = await getSpotifyArtistById(data.id);
      return result ?? { image: null, genre: null };
    },
  );

/** @deprecated renamed to `lookupSpotifyArtistByIdFn`. */
export const lookupDeezerArtistByIdFn = lookupSpotifyArtistByIdFn;




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
  .inputValidator((input: unknown) => ArtistImageInput.parse(input))
  .handler(async ({ data }): Promise<{ url: string | null }> => {
    const url = await lookupArtistImage(data.artist);
    return { url };
  });
