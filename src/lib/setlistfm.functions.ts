import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  artist: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
});

export type SetlistLookupResult = {
  found: boolean;
  tour: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  openers: string[];
  songs: string[];
  songsSeen: number | null;
  genre: string | null;
  artist: string | null;
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
      songs: [],
      songsSeen: null,
      genre: null,
      artist: null,
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
    if (!res.ok) {
      throw new Error(`Setlist.fm request failed (${res.status})`);
    }

    const json = (await res.json()) as {
      setlist?: Array<{
        url?: string;
        artist?: { name?: string; mbid?: string };
        tour?: { name?: string };
        venue?: {
          name?: string;
          city?: {
            name?: string;
            country?: { name?: string; code?: string };
          };
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
          .filter((n): n is string => !!n && n.toLowerCase() !== (headliner.artist?.name ?? "").toLowerCase()),
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

    // Fallback: setlist.fm often omits tour on individual shows. Look up the
    // artist's nearby setlists by MBID and use the closest dated tour name.
    if (!tour && headliner.artist?.mbid) {
      tour = await lookupTourNearby(headliner.artist.mbid, data.date, apiKey);
    }

    const genre = await lookupGenre(headliner.artist?.mbid);

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
      songs,
      songsSeen: songs.length > 0 ? songs.length : null,
      genre,
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

    // Pull the first two pages of the artist's setlists and pick the
    // tour name from the chronologically closest show that has one.
    const candidates: Array<{ tour: string; date: number }> = [];
    for (const page of [1, 2]) {
      const url = new URL(
        `https://api.setlist.fm/rest/1.0/artist/${mbid}/setlists`,
      );
      url.searchParams.set("p", String(page));
      const res = await fetch(url.toString(), {
        headers: {
          "x-api-key": apiKey,
          Accept: "application/json",
          "Accept-Language": "en",
        },
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
    candidates.sort(
      (a, b) => Math.abs(a.date - target) - Math.abs(b.date - target),
    );
    return candidates[0].tour;
  } catch {
    return null;
  }
}
