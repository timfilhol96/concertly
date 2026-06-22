import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

// Use Deezer's public search (no API key required) for artist images + genre.
async function genreForArtistId(id: number): Promise<string | null> {
  try {
    const albRes = await fetch(
      `https://api.deezer.com/artist/${id}/albums?limit=10`,
      { headers: { Accept: "application/json" } },
    );
    if (!albRes.ok) return null;
    const albJson = (await albRes.json()) as {
      data?: Array<{ genre_id?: number }>;
    };
    const counts = new Map<number, number>();
    for (const al of albJson.data ?? []) {
      if (typeof al.genre_id === "number" && al.genre_id > 0) {
        counts.set(al.genre_id, (counts.get(al.genre_id) ?? 0) + 1);
      }
    }
    const top = [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0];
    if (!top) return null;
    const gRes = await fetch(`https://api.deezer.com/genre/${top}`, {
      headers: { Accept: "application/json" },
    });
    if (!gRes.ok) return null;
    const gJson = (await gRes.json()) as { name?: string };
    return gJson.name ?? null;
  } catch {
    return null;
  }
}

async function lookupDeezerArtist(
  name: string,
): Promise<{ image: string | null; genre: string | null }> {
  try {
    const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return { image: null, genre: null };
    const json = (await res.json()) as {
      data?: Array<{
        id?: number;
        picture_xl?: string;
        picture_big?: string;
        picture_medium?: string;
      }>;
    };
    const a = json.data?.[0];
    if (!a) return { image: null, genre: null };
    const image = a.picture_xl ?? a.picture_big ?? a.picture_medium ?? null;
    const genre = a.id ? await genreForArtistId(a.id) : null;
    return { image, genre };
  } catch {
    return { image: null, genre: null };
  }
}

async function lookupArtistImage(name: string): Promise<string | null> {
  const { image } = await lookupDeezerArtist(name);
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

    // In parallel: MusicBrainz genre (fallback), Deezer artist (image + genre), opener setlists.
    const [mbGenre, deezer, openerSetlistsRaw] = await Promise.all([
      lookupGenre(headliner.artist?.mbid),
      lookupDeezerArtist(headliner.artist?.name ?? data.artist),
      Promise.all(
        openers.slice(0, 3).map(async (name) => ({
          artist: name,
          songs: await lookupOpenerSetlist(name, data.date, apiKey),
        })),
      ),
    ]);
    const genre = deezer.genre ?? mbGenre;
    const artistImageUrl = deezer.image;
    const openerSetlists = openerSetlistsRaw.filter((o) => o.songs.length > 0);

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
  id: number | null;
  name: string;
  image: string | null;
  nbFan: number | null;
};

export const searchArtists = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ArtistSearchInput.parse(input))
  .handler(async ({ data }): Promise<ArtistSuggestion[]> => {
    try {
      const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(
        data.query,
      )}&limit=8`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return [];
      const json = (await res.json()) as {
        data?: Array<{
          id?: number;
          name?: string;
          picture_medium?: string;
          picture_small?: string;
          nb_fan?: number;
        }>;
      };
      const seen = new Set<string>();
      const out: ArtistSuggestion[] = [];
      for (const a of json.data ?? []) {
        const name = a.name?.trim();
        if (!name) continue;
        const key = `${name.toLowerCase()}::${a.id ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          id: typeof a.id === "number" ? a.id : null,
          name,
          image: a.picture_medium ?? a.picture_small ?? null,
          nbFan: typeof a.nb_fan === "number" ? a.nb_fan : null,
        });
      }
      return out;
    } catch {
      return [];
    }
  });

const ArtistByIdInput = z.object({ id: z.number().int().positive() });

export const lookupDeezerArtistByIdFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ArtistByIdInput.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ image: string | null; genre: string | null }> => {
      try {
        const res = await fetch(`https://api.deezer.com/artist/${data.id}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return { image: null, genre: null };
        const json = (await res.json()) as {
          picture_xl?: string;
          picture_big?: string;
          picture_medium?: string;
        };
        const image =
          json.picture_xl ?? json.picture_big ?? json.picture_medium ?? null;
        const genre = await genreForArtistId(data.id);
        return { image, genre };
      } catch {
        return { image: null, genre: null };
      }
    },
  );

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
