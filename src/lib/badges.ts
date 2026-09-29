// Badges - pure derivations from a user's concert list.
// Milestone/count based; nothing here writes to the database.

import {
  attendedOnly,
  genreBreakdown,
  monthlyStreak,
  rankBy,
  uniqueShows,
  type Concert,
} from "@/lib/concerts";

export type Badge = {
  id: string;
  label: string;
  description: string;
  icon: string; // emoji - matches the app's light-hearted card treatments
  earned: boolean;
  progress?: string; // e.g. "7 / 10"
  value: number;
  target: number;
  unit: string;
};

function milestone(
  id: string,
  icon: string,
  label: string,
  value: number,
  target: number,
  singular: string,
  plural = singular + "s",
): Badge {
  const unit = target === 1 ? singular : plural;
  return {
    id,
    icon,
    label,
    description: `Reach ${target} ${unit}.`,
    earned: value >= target,
    progress: value >= target ? undefined : `${value} / ${target}`,
    value,
    target,
    unit,
  };
}

export function computeBadges(list: Concert[]): Badge[] {
  const attended = attendedOnly(list);
  const shows = uniqueShows(attended);
  const artists = new Set(attended.map((c) => c.artist)).size;
  const cities = new Set(shows.map((c) => c.city)).size;
  const countries = new Set(shows.map((c) => c.country).filter(Boolean)).size;
  const genres = genreBreakdown(shows).length;
  const streak = monthlyStreak(shows).longest;
  const topArtist = rankBy(attended, "artist", 1)[0];
  const topArtistCount = topArtist?.count ?? 0;

  return [
    milestone("first-show", "🎟️", "First Show", shows.length, 1, "show"),
    milestone("ten-shows", "🎸", "Regular", shows.length, 10, "show"),
    milestone("fifty-shows", "🔥", "Roadie", shows.length, 50, "show"),
    milestone("century", "💯", "Century Club", shows.length, 100, "show"),
    milestone("artists-25", "🎤", "Wide Ears", artists, 25, "artist"),
    milestone("cities-10", "🌆", "City Hopper", cities, 10, "city", "cities"),
    milestone("countries-5", "🌍", "Passport", countries, 5, "country", "countries"),
    milestone("genres-6", "🎧", "Genre Explorer", genres, 6, "genre"),
    milestone("streak-6", "📅", "Six-Month Streak", streak, 6, "month"),
    milestone(
      "superfan",
      "⭐",
      "Superfan",
      topArtistCount,
      5,
      "show of one artist",
      "shows of one artist",
    ),
  ];
}

// Shows on the same MM-DD in earlier years (excluding today's calendar year).
export function onThisDay(list: Concert[], today = new Date()): Concert[] {
  const attended = attendedOnly(list);
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const yyyy = today.getFullYear();
  return attended
    .filter((c) => {
      const d = new Date(c.date);
      return (
        String(d.getMonth() + 1).padStart(2, "0") === mm &&
        String(d.getDate()).padStart(2, "0") === dd &&
        d.getFullYear() !== yyyy
      );
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

// ---------- Spend analytics ----------

export type SpendStats = {
  total: number;
  count: number; // shows with a price logged
  avg: number;
  mostExpensive: Concert | null;
  thisYear: number;
  perYear: { year: string; total: number }[];
};

export function spendStats(list: Concert[]): SpendStats {
  const attended = attendedOnly(list);
  const priced = attended.filter((c) => c.ticketPrice != null && c.ticketPrice > 0);
  const total = priced.reduce((s, c) => s + (c.ticketPrice ?? 0), 0);
  const count = priced.length;
  const avg = count ? total / count : 0;
  const mostExpensive = priced.reduce<Concert | null>(
    (best, c) => (!best || (c.ticketPrice ?? 0) > (best.ticketPrice ?? 0) ? c : best),
    null,
  );
  const thisYearNum = new Date().getFullYear();
  const thisYear = priced
    .filter((c) => new Date(c.date).getFullYear() === thisYearNum)
    .reduce((s, c) => s + (c.ticketPrice ?? 0), 0);
  const byYear = new Map<number, number>();
  for (const c of priced) {
    const y = new Date(c.date).getFullYear();
    byYear.set(y, (byYear.get(y) ?? 0) + (c.ticketPrice ?? 0));
  }
  const perYear = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, t]) => ({ year: String(y), total: Math.round(t) }));
  return { total, count, avg, mostExpensive, thisYear, perYear };
}
