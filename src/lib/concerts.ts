// Concertly data layer — backed by Lovable Cloud (Supabase).

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  setlist: string[] | null;
  artistImageUrl: string | null;
  openerSetlists: OpenerSetlist[] | null;
  status: ConcertStatus;
  latitude: number | null;
  longitude: number | null;
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
  setlist: string[] | null;
  artist_image_url: string | null;
  opener_setlists: unknown;
};

function fromRow(r: Row): Concert {
  let openerSetlists: OpenerSetlist[] | null = null;
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
  };
}

export function useConcerts() {
  return useQuery({
    queryKey: ["concerts"],
    queryFn: async (): Promise<Concert[]> => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return [];
      const { data, error } = await supabase
        .from("concerts")
        .select("*")
        .eq("user_id", userRes.user.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data as Row[]).map(fromRow);
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, username")
        .eq("id", userRes.user.id)
        .maybeSingle();
      return {
        userId: userRes.user.id,
        email: userRes.user.email ?? "",
        displayName:
          (data?.display_name as string | null) ??
          userRes.user.email?.split("@")[0] ??
          "You",
        avatarPath: (data?.avatar_url as string | null) ?? null,
        username: (data?.username as string | null) ?? null,
      };
    },
  });
}

// Resolves a stored avatar path to a temporary signed URL.
export function useAvatarUrl(avatarPath: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!avatarPath) {
      setUrl(null);
      return;
    }
    // Allow either a stored bucket path or a direct URL.
    if (/^https?:\/\//.test(avatarPath)) {
      setUrl(avatarPath);
      return;
    }
    supabase.storage
      .from("avatars")
      .createSignedUrl(avatarPath, 60 * 60)
      .then((res) => {
        if (cancelled) return;
        setUrl(res.data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [avatarPath]);
  return url;
}

export type NewConcert = Omit<Concert, "id">;

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
    setlist: c.setlist,
    artist_image_url: c.artistImageUrl,
    opener_setlists: c.openerSetlists,
  };
}

export function useAddConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: NewConcert) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not signed in");
      const { error, data } = await supabase
        .from("concerts")
        .insert(toInsert(c, userRes.user.id))
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
      const payload = toInsert(c, ""); // user_id is ignored on update
      const { user_id: _ignored, ...update } = payload;
      void _ignored;
      const { error, data } = await supabase
        .from("concerts")
        .update(update)
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

// Collapse rows that represent the same physical show (same date + venue) into
// a single "show". The headliner row (one whose notes don't start with
// "support act for") is preferred; otherwise the first row wins.
export function uniqueShows(list: Concert[]): Concert[] {
  const groups = new Map<string, Concert[]>();
  for (const c of list) {
    const key = `${c.date}|${(c.venue ?? "").trim().toLowerCase()}|${(c.city ?? "").trim().toLowerCase()}`;
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
  const total = list.length;
  const uniqueArtists = new Set(list.map((c) => c.artist)).size;
  const uniqueCities = new Set(list.map((c) => c.city)).size;
  const uniqueCountries = new Set(list.map((c) => c.country).filter(Boolean)).size;
  const hoursLive = Math.round(list.reduce((s, c) => s + (c.songsSeen ?? 16) * 4, 0) / 60);
  const avgRating = total ? list.reduce((s, c) => s + c.rating, 0) / total : 0;
  const totalSpend = list.reduce((s, c) => s + (c.ticketPrice ?? 0), 0);
  return { total, uniqueArtists, uniqueCities, uniqueCountries, hoursLive, avgRating, totalSpend };
}

export function rankBy(
  list: Concert[],
  key: "artist" | "venue" | "city" | "country",
  limit = 5,
): RankedItem[] {
  const counts = new Map<string, number>();
  for (const c of list) {
    const v = String(c[key] ?? "");
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
  const counts = new Map<number, number>();
  for (const c of list) {
    const y = new Date(c.date).getFullYear();
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, count]) => ({ year: String(year), count }));
}

// Monthly heatmap: 12 buckets for the given year (or all-time max month count).
export function monthlyHeatmap(list: Concert[], year: number) {
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
  if (!list.length) return 0;
  const earliest = list.reduce((min, c) => (c.date < min ? c.date : min), list[0].date);
  const years = (Date.now() - new Date(earliest).getTime()) / (365.25 * 24 * 3600 * 1000);
  return Math.round(years * 10) / 10;
}

export function recentConcerts(list: Concert[], n = 5) {
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, n);
}

export function availableYears(list: Concert[]): number[] {
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
  // current streak — walk back from today
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
