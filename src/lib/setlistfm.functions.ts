import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

// Use Deezer's public search (no API key required) for artist images.
async function lookupArtistImage(name: string): Promise<string | null> {
  try {
    const url = `https://api.deezer.com/search/artist?q=${encodeURIComponent(name)}&limit=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: Array<{ picture_xl?: string; picture_big?: string; picture_medium?: string }>;
    };
    const a = json.data?.[0];
    return a?.picture_xl ?? a?.picture_big ?? a?.picture_medium ?? null;
  } catch {
    return null;
  }
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

    let tour = headliner.tour?.name ?? null;
    if (!tour && headliner.artist?.mbid) {
      tour = await lookupTourNearby(headliner.artist.mbid, data.date, apiKey);
    }

    // In parallel: genre, artist image, opener setlists.
    const [genre, artistImageUrl, openerSetlistsRaw] = await Promise.all([
      lookupGenre(headliner.artist?.mbid),
      lookupArtistImage(headliner.artist?.name ?? data.artist),
      Promise.all(
        openers.slice(0, 3).map(async (name) => ({
          artist: name,
          songs: await lookupOpenerSetlist(name, data.date, apiKey),
        })),
      ),
    ]);
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

function parseSetlistDate(ddmmyyyy: string | undefined): number | null {
  if (!ddmmyyyy) return null;
  const [d, m, y] = ddmmyyyy.split("-");
  if (!d || !m || !y) return null;
  const t = Date.parse(`${y}-${m}-${d}`);
  return Number.isFinite(t) ? t : null;
}

async function lookupTourNearby(
  mbid: string,
  isoDate: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const target = Date.parse(isoDate);
    if (!Number.isFinite(target)) return null;
    const candidates: Array<{ tour: string; date: number }> = [];
    for (const page of [1, 2]) {
      const url = new URL(`https://api.setlist.fm/rest/1.0/artist/${mbid}/setlists`);
      url.searchParams.set("p", String(page));
      const res = await fetch(url.toString(), {
        headers: { "x-api-key": apiKey, Accept: "application/json", "Accept-Language": "en" },
      });
      if (!res.ok) break;
      const json = (await res.json()) as {
        setlist?: Array<{ eventDate?: string; tour?: { name?: string } }>;
      };
      for (const s of json.setlist ?? []) {
        const name = s.tour?.name?.trim();
        const d = parseSetlistDate(s.eventDate);
        if (name && d !== null) candidates.push({ tour: name, date: d });
      }
      if ((json.setlist?.length ?? 0) < 20) break;
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => Math.abs(a.date - target) - Math.abs(b.date - target));
    return candidates[0].tour;
  } catch {
    return null;
  }
}

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
