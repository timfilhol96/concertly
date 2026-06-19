// Concertly data layer — backed by Lovable Cloud (Supabase).
// Exposes typed query hooks + helpers that mirror the old mock-data API
// so the dashboard / shows / insights / wrapped pages can stay structural.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";


export type Concert = {
  id: string;
  artist: string;
  tour: string | null;
  openers: string[] | null;
  date: string; // ISO yyyy-mm-dd
  venue: string;
  city: string;
  country: string | null;
  rating: number;
  genre: string | null;
  notes: string | null;
  ticketPrice: number | null;
  songsSeen: number | null;
  setlist: string[] | null;
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
};

function fromRow(r: Row): Concert {
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
  };
}

export function useConcerts() {
  return useQuery({
    queryKey: ["concerts"],
    queryFn: async (): Promise<Concert[]> => {
      const { data, error } = await supabase
        .from("concerts")
        .select("*")
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
        .select("display_name, avatar_url")
        .eq("id", userRes.user.id)
        .maybeSingle();
      return {
        userId: userRes.user.id,
        email: userRes.user.email ?? "",
        displayName: (data?.display_name as string | null) ?? userRes.user.email?.split("@")[0] ?? "You",
        avatarUrl: (data?.avatar_url as string | null) ?? null,
      };
    },
  });
}

export type NewConcert = Omit<Concert, "id">;

export function useAddConcert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: NewConcert) => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not signed in");
      const { error, data } = await supabase
        .from("concerts")
        .insert({
          user_id: userRes.user.id,
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
        })
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
        .update({
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
        })
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


// ---------- Pure derivations (operate on the loaded list) ----------

export type RankedItem = { name: string; count: number };

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

export function rankBy(list: Concert[], key: "artist" | "venue" | "city", limit = 5): RankedItem[] {
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

export function genreBreakdown(list: Concert[]) {
  const counts = new Map<string, number>();
  for (const c of list) {
    const g = c.genre ?? "Unknown";
    counts.set(g, (counts.get(g) ?? 0) + 1);
  }
  const total = list.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));
}

export function showsByMonth(list: Concert[], year: number) {
  const arr = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    label: new Date(2024, i, 1).toLocaleString("en", { month: "short" }),
    count: 0,
  }));
  for (const c of list) {
    const d = new Date(c.date);
    if (d.getFullYear() === year) arr[d.getMonth()].count++;
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

export function heatmap(list: Concert[], year: number) {
  const start = new Date(year, 0, 1);
  const startDow = start.getDay();
  const days: { date: string; count: number }[] = [];
  for (let i = 0; i < startDow; i++) days.push({ date: "", count: 0 });
  const daysInYear =
    (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
  const byDate = new Map<string, number>();
  for (const c of list) byDate.set(c.date, (byDate.get(c.date) ?? 0) + 1);
  for (let i = 0; i < daysInYear; i++) {
    const d = new Date(year, 0, 1 + i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, count: byDate.get(iso) ?? 0 });
  }
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
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
