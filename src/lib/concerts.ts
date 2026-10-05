// Concertly data layer - backed by Lovable Cloud (Supabase).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/current-user";
import { useSignedStorageUrl } from "@/lib/signed-url";
import { clusterNames, nameKey, samePlace } from "@/lib/music-match";

export type OpenerSetlist = { artist: string; songs: string[] };

export type ConcertStatus = "attended" | "upcoming" | "wishlist";

export type Concert = {
  id: string;
  artist: string;
  tour: string | null;
  openers: string[] | null;
  date: string;
  venue: string;
  city: string;
  country: string | null;
  rating: number;
  genre: string | null;
  notes: string | null;
  ticketPrice: number | null;
  songsSeen: number | null;
  // `undefined` = not loaded. The list query skips these heavy columns; load
  // a single show with useConcertDetail() when they are needed.
  setlist?: string[] | null;
  artistImageUrl: string | null;
  openerSetlists?: OpenerSetlist[] | null;
  status: ConcertStatus;
  latitude: number | null;
  longitude: number | null;
  mediaPaths: string[];
};

type Row = {
  id: string;
  artist: string;
  tour: string | null;
  openers: string[] | null;
  date: string;
  venue: string;
  city: string;
  country: string | null;
  rating: number;
  genre: string | null;
  notes: string | null;
  ticket_price: number | null;
  songs_seen: number | null;
  setlist?: string[] | null;
  artist_image_url: string | null;
  opener_setlists?: unknown;
  status?: ConcertStatus | null;
  latitude?: number | null;
  longitude?: number | null;
  media_paths?: string[] | null;
};

function fromRow(r: Row): Concert {
  let openerSetlists: OpenerSetlist[] | null | undefined =
    r.opener_setlists === undefined ? undefined : null;
  if (Array.isArray(r.opener_setlists)) {
    openerSetlists = (r.opener_setlists as Array<{ artist?: string; songs?: string[] }>)
      .filter((x) => x && typeof x.artist === "string" && Array.isArray(x.songs))
      .map((x) => ({ artist: x.artist as string, songs: x.songs as string[] }));
  }
  return {
    id: r.id,
    artist: r.artist,
    tour: r.tour,
    openers: r.openers,
    date: r.date,
    venue: r.venue,
    city: r.city,
    country: r.country,
    rating: Number(r.rating),
    genre: r.genre,
    notes: r.notes,
    ticketPrice: r.ticket_price == null ? null : Number(r.ticket_price),
    songsSeen: r.songs_seen,
    setlist: r.setlist,
    artistImageUrl: r.artist_image_url,
    openerSetlists,
    status: (r.status as ConcertStatus | null | undefined) ?? "attended",
    latitude: r.latitude == null ? null : Number(r.latitude),
    longitude: r.longitude == null ? null : Number(r.longitude),
    mediaPaths: r.media_paths ?? [],
  };
}

// Every column except the setlist JSON, which is most of each row's size and
// only needed on the show and edit pages.
const LIST_COLUMNS =
  "id, artist, tour, openers, date, venue, city, country, rating, genre, notes, ticket_price, songs_seen, artist_image_url, status, latitude, longitude, media_paths";

export function useConcerts() {
  return useQuery({
    queryKey: ["concerts"],
    queryFn: async (): Promise<Concert[]> => {
      const user = await getCurrentUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("concerts")
        .select(LIST_COLUMNS)
        .eq("user_id", user.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data as Row[]).map(fromRow);
    },
  });
}

// One show with every column, including setlists. Lives under the "concerts"
// key so the mutations' invalidation refreshes it too.
export function useConcertDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["concerts", "detail", id],
    enabled: !!id,
    queryFn: async (): Promise<Concert | null> => {
      const { data, error } = await supabase
        .from("concerts")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data ? fromRow(data as Row) : null;
    },
  });
}

// Attended shows only - use for stats/dashboards/insights/wrapped so
// wishlist and upcoming entries never pollute counts.
export function attendedOnly(list: Concert[]): Concert[] {
  return list.filter((c) => (c.status ?? "attended") === "attended");
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, username")
        .eq("id", user.id)
        .maybeSingle();
      return {
        userId: user.id,
        email: user.email ?? "",
        displayName:
          (data?.display_name as string | null) ??
          user.email?.split("@")[0] ??
          "You",
        avatarPath: (data?.avatar_url as string | null) ?? null,
        username: (data?.username as string | null) ?? null,
      };
    },
  });
}

// Resolves a stored avatar path to a temporary signed URL.
export function useAvatarUrl(avatarPath: string | null | undefined) {
  // Allow either a stored bucket path or a direct URL.
  const isDirect = !!avatarPath && /^https?:\/\//.test(avatarPath);
  const signed = useSignedStorageUrl("avatars", isDirect ? null : avatarPath);
  return isDirect ? avatarPath! : signed;
}

// Existing call sites treat status/lat/lng as optional; default status = attended.
export type NewConcert = Omit<Concert, "id" | "status" | "latitude" | "longitude" | "mediaPaths"> & {
  status?: ConcertStatus;
  latitude?: number | null;
  longitude?: number | null;
};

type InsertPayload = {
  user_id: string;
  artist: string;
  tour: string | null;
  openers: string[] | null;
  date: string;
  venue: string;
  city: string;
  country: string | null;
  rating: number;
  genre: string | null;
  notes: string | null;
  ticket_price: number | null;
  songs_seen: number | null;
  setlist: string[] | null;
  artist_image_url: string | null;
  opener_setlists: OpenerSetlist[] | null;
  status: ConcertStatus;
  latitude: number | null;
  longitude: number | null;
};

function toInsert(c: NewConcert, userId: string): InsertPayload {
  return {
    user_id: userId,
    artist: c.artist,
    tour: c.tour,
    openers: c.openers,
    date: c.date,
    venue: c.venue,
    city: c.city,
    country: c.country,
    rating: c.rating,
    genre: c.genre,
    notes: c.notes,
    ticket_price: c.ticketPrice,
    songs_seen: c.songsSeen,
    setlist: c.setlist ?? null,
    artist_image_url: c.artistImageUrl,
    opener_setlists: c.openerSetlists ?? null,
    status: c.status ?? "attended",
    latitude: c.latitude ?? null,
    longitude: c.longitude ?? null,
  };
}

// Update payload: fields left `undefined` are not sent, so they keep their
// stored value. This protects setlists that were never loaded (list query) and
// status/coordinates that callers such as the refresh wizard don't pass.
function toUpdate(c: NewConcert): Partial<Omit<InsertPayload, "user_id">> {
  const { user_id: _ignored, ...full } = toInsert(c, "");
  void _ignored;
  const optional = {
    setlist: c.setlist,
    opener_setlists: c.openerSetlists,
    status: c.status,
    latitude: c.latitude,
    longitude: c.longitude,
  };
  const out: Partial<Omit<InsertPayload, "user_id">> = { ...full };
  for (const [k, v] of Object.entries(optional)) {
    if (v === undefined) delete out[k as keyof typeof out];
  }
  return out;
}

export function useAddConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: NewConcert) => {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not signed in");
      const { error, data } = await supabase
        .from("concerts")
        .insert(toInsert(c, user.id))
        .select()
        .single();
      if (error) throw error;
      return fromRow(data as Row);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concerts"] }),
  });
}

export function useUpdateConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...c }: NewConcert & { id: string }) => {
      const { error, data } = await supabase
        .from("concerts")
        .update(toUpdate(c))
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return fromRow(data as Row);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concerts"] }),
  });
}

export function useDeleteConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("concerts").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["concerts"] }),
  });
}

// ---------- Pure derivations ----------

export type RankedItem = { name: string; count: number };

type NameField = "artist" | "venue" | "city" | "country";

/**
 * Maps every spelling of a field's values in `list` to one display name, so
 * "The O2"/"O2" or "Star Theater"/"Star Theatre" count as one venue. Venues
 * and cities also absorb small typos; artists and countries only differ by
 * case, accents and punctuation.
 */
export function canonicalizer(list: Concert[], field: NameField): (value: string | null) => string {
  const same =
    field === "venue" || field === "city"
      ? samePlace
      : (a: string, b: string) => nameKey(a) === nameKey(b);
  const map = clusterNames(
    list.map((c) => (c[field] ?? "").trim()),
    same,
  );
  return (value) => {
    const v = (value ?? "").trim();
    return map.get(v) ?? v;
  };
}

// Collapse rows that represent the same physical show (same date + venue) into
// a single "show". The headliner row (one whose notes don't start with
// "support act for") is preferred; otherwise the first row wins.
export function uniqueShows(list: Concert[]): Concert[] {
  list = attendedOnly(list);
  const venueOf = canonicalizer(list, "venue");
  const cityOf = canonicalizer(list, "city");
  const groups = new Map<string, Concert[]>();
  for (const c of list) {
    const key = `${c.date}|${venueOf(c.venue)}|${cityOf(c.city)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  const out: Concert[] = [];
  for (const rows of groups.values()) {
    const headliner = rows.find(
      (r) => !(r.notes ?? "").trim().toLowerCase().startsWith("support act for"),
    );
    out.push(headliner ?? rows[0]);
  }
  return out;
}

export function getStats(list: Concert[]) {
  list = attendedOnly(list);
  const total = list.length;
  const uniqueArtists = new Set(list.map((c) => c.artist)).size;
  const cityOf = canonicalizer(list, "city");
  const uniqueCities = new Set(list.map((c) => cityOf(c.city))).size;
  const uniqueCountries = new Set(list.map((c) => c.country).filter(Boolean)).size;
  const hoursLive = Math.round(list.reduce((s, c) => s + (c.songsSeen ?? 16) * 4, 0) / 60);
  const avgRating = total ? list.reduce((s, c) => s + c.rating, 0) / total : 0;
  const totalSpend = list.reduce((s, c) => s + (c.ticketPrice ?? 0), 0);
  return { total, uniqueArtists, uniqueCities, uniqueCountries, hoursLive, avgRating, totalSpend };
}

export function rankBy(
  list: Concert[],
  key: NameField,
  limit = 5,
): RankedItem[] {
  list = attendedOnly(list);
  const nameOf = canonicalizer(list, key);
  const counts = new Map<string, number>();
  for (const c of list) {
    const v = nameOf(c[key]);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export type GenreBreakdownItem = {
  name: string;
  count: number;
  artists: number;
  pct: number;
};

export function genreBreakdown(list: Concert[]): GenreBreakdownItem[] {
  list = attendedOnly(list);
  const counts = new Map<string, number>();
  const artistSets = new Map<string, Set<string>>();
  for (const c of list) {
    const g = c.genre ?? "Unknown";
    counts.set(g, (counts.get(g) ?? 0) + 1);
    if (!artistSets.has(g)) artistSets.set(g, new Set());
    artistSets.get(g)!.add(c.artist);
  }
  const total = list.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      artists: artistSets.get(name)?.size ?? 0,
      pct: Math.round((count / total) * 100),
    }));
}

export function showsByMonth(list: Concert[], year: number | "all") {
  list = attendedOnly(list);
  const arr = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    label: new Date(2024, i, 1).toLocaleString("en", { month: "short" }),
    count: 0,
  }));
  for (const c of list) {
    const d = new Date(c.date);
    if (year === "all" || d.getFullYear() === year) arr[d.getMonth()].count++;
  }
  return arr;
}

export function showsByYear(list: Concert[]) {
  list = attendedOnly(list);
  const counts = new Map<number, number>();
  for (const c of list) {
    const y = new Date(c.date).getFullYear();
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ year: String(year), count }));
}

export function showsByDay(list: Concert[]) {
  list = attendedOnly(list);
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const arr = labels.map((label, day) => ({ label, day, count: 0 }));
  for (const c of list) {
    const d = new Date(c.date);
    arr[d.getDay()].count++;
  }
  return arr;
}

// Monthly heatmap: 12 buckets for the given year (or all-time max month count).
export function monthlyHeatmap(list: Concert[], year: number) {
  list = attendedOnly(list);
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    label: new Date(2024, i, 1).toLocaleString("en", { month: "short" }),
    count: 0,
    key: `${year}-${String(i + 1).padStart(2, "0")}`,
  }));
  for (const c of list) {
    const d = new Date(c.date);
    if (d.getFullYear() === year) months[d.getMonth()].count++;
  }
  return months;
}

export function getConcertAge(list: Concert[]): number {
  list = attendedOnly(list);
  if (!list.length) return 0;
  const earliest = list.reduce((min, c) => (c.date < min ? c.date : min), list[0].date);
  const years = (Date.now() - new Date(earliest).getTime()) / (365.25 * 24 * 3600 * 1000);
  return Math.round(years * 10) / 10;
}

export function recentConcerts(list: Concert[], n = 5) {
  list = attendedOnly(list);
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, n);
}

export function availableYears(list: Concert[]): number[] {
  list = attendedOnly(list);
  const set = new Set<number>();
  for (const c of list) set.add(new Date(c.date).getFullYear());
  return [...set].sort((a, b) => b - a);
}

// Monthly streak: count of consecutive months (ending in current month, or the
// most recent month with a show) where at least one show is logged.
export function monthlyStreak(list: Concert[]): {
  current: number;
  longest: number;
} {
  if (list.length === 0) return { current: 0, longest: 0 };
  const monthsWithShows = new Set<string>();
  for (const c of list) {
    const d = new Date(c.date);
    monthsWithShows.add(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  const key = (y: number, m: number) =>
    `${y}-${String(m + 1).padStart(2, "0")}`;
  // longest run
  const sorted = [...monthsWithShows].sort();
  let longest = 0;
  let run = 0;
  let prev: { y: number; m: number } | null = null;
  for (const s of sorted) {
    const [ys, ms] = s.split("-").map(Number);
    const y = ys;
    const m = ms - 1;
    if (
      prev &&
      ((prev.m === 11 && y === prev.y + 1 && m === 0) ||
        (y === prev.y && m === prev.m + 1))
    ) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = { y, m };
  }
  // current streak - walk back from today
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  let current = 0;
  // If the current month has no show, start counting from the prior month.
  if (!monthsWithShows.has(key(y, m))) {
    if (m === 0) {
      y -= 1;
      m = 11;
    } else m -= 1;
  }
  while (monthsWithShows.has(key(y, m))) {
    current++;
    if (m === 0) {
      y -= 1;
      m = 11;
    } else m -= 1;
  }
  return { current, longest };
}
