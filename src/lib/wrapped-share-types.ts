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
  prevYearShows?: number;
  bestRatedArtists?: Array<{ name: string; rating: number; image?: string | null }>;
  topVenues?: Array<{ name: string; count: number; country?: string | null }>;
  longestHours?: number;
  shortestShow?: { artist: string; hours: number };
};

export type WrappedShare = {
  payload: WrappedSharePayload;
  gradient: string;
};