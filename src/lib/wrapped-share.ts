import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type WrappedSharePayload = {
  year: number;
  user?: string;
  shows: number;
  artists: number;
  venues: number;
  cities: number;
  countries: number;
  hours: number;
  ticketSpend?: number;
  topVenue?: string;
  topVenueCount?: number;
  topCity?: string;
  topCityCount?: number;
  topGenres?: Array<{ name: string; count: number; pct: number }>;
  discoveredGenres?: string[];
  newArtists?: string[];
  longestShow?: { artist: string; songs: number; minutes: number };
  firstShow?: { artist: string; date?: string; venue?: string; city?: string };
  lastShow?: { artist: string; date?: string; venue?: string; city?: string };
  avgRating?: number;
  totalRated?: number;
  topRated?: { artist: string; rating: number; venue?: string; city?: string };
  peakWeekday?: string;
  peakMonth?: string;
  peakMonthCount?: number;
  avgPerMonth?: number;
  monthsWithShows?: number;
};

function createShareId() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createWrappedShare(payload: WrappedSharePayload, gradient: string) {
  const { data: userRes, error: userError } = await supabase.auth.getUser();
  if (userError || !userRes.user) throw new Error("Not signed in");

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = createShareId();
    const { error } = await supabase.from("wrapped_shares").insert({
      id,
      user_id: userRes.user.id,
      payload: payload as Json,
      gradient,
    });

    if (!error) return id;
    if (error.code !== "23505") throw error;
  }

  throw new Error("Couldn't create share link");
}

export async function getWrappedShare(id: string) {
  const { data, error } = await supabase
    .from("wrapped_shares")
    .select("payload, gradient")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data
    ? {
        payload: data.payload as WrappedSharePayload,
        gradient: data.gradient,
      }
    : null;
}