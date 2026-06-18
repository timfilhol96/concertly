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
  songsSeen: number | null;
  artist: string | null;
  setlistUrl: string | null;
};

// setlist.fm wants DD-MM-YYYY
function toSetlistDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
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
      songsSeen: null,
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
        artist?: { name?: string };
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

    // Prefer the entry whose artist name matches the query (case-insensitive),
    // otherwise the first result. Openers = other distinct artists on same date.
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
    const songCount = sets.reduce(
      (acc, s) => acc + (s.song?.filter((x) => x.name && x.name.trim()).length ?? 0),
      0,
    );

    return {
      found: true,
      artist: headliner.artist?.name ?? null,
      tour: headliner.tour?.name ?? null,
      venue: headliner.venue?.name ?? null,
      city: headliner.venue?.city?.name ?? null,
      country:
        headliner.venue?.city?.country?.name ??
        headliner.venue?.city?.country?.code ??
        null,
      openers,
      songsSeen: songCount > 0 ? songCount : null,
      setlistUrl: headliner.url ?? null,
    };
  });
