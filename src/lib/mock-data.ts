// Seeded mock data for Concertly demo.
// Realistic-looking dataset — used by the dashboard, insights, and shows pages.

export type Concert = {
  id: string;
  artist: string;
  tour?: string;
  openers?: string[];
  date: string; // ISO
  venue: string;
  city: string;
  country: string;
  rating: number; // 0-10
  genre: string;
  notes?: string;
  ticketPrice?: number;
  songsSeen?: number;
};

export const USER = {
  name: "Alex Rivera",
  handle: "alex",
  initials: "AR",
  joinedYear: 2016,
};

export const CONCERTS: Concert[] = [
  { id: "1", artist: "The Last Dinner Party", tour: "Prelude to Ecstasy", openers: ["Mary in the Junkyard"], date: "2024-11-12", venue: "Eventim Apollo", city: "London", country: "UK", rating: 9.4, genre: "Indie Rock", notes: "Abigail's vocals were transcendent. Sold out and worth every minute.", ticketPrice: 48, songsSeen: 16 },
  { id: "2", artist: "Fred again..", tour: "Ten Days Tour", date: "2024-10-22", venue: "Alexandra Palace", city: "London", country: "UK", rating: 10, genre: "Electronic", notes: "Surprise B2B with Skrillex. Pure euphoria.", ticketPrice: 65, songsSeen: 22 },
  { id: "3", artist: "Lorde", tour: "Solar Power Tour", openers: ["Remi Wolf"], date: "2024-09-30", venue: "Primavera Sound", city: "Barcelona", country: "Spain", rating: 9.5, genre: "Indie Pop", notes: "Sunset during 'Ribs'. Life-changing.", ticketPrice: 0, songsSeen: 18 },
  { id: "4", artist: "Justice", tour: "Hyperdrama", date: "2024-09-14", venue: "Forest Hills Stadium", city: "New York", country: "USA", rating: 9.7, genre: "Electronic", notes: "The cross. The wall. Iconic.", ticketPrice: 85, songsSeen: 20 },
  { id: "5", artist: "Mitski", tour: "The Land is Inhospitable", date: "2024-08-04", venue: "Beacon Theatre", city: "New York", country: "USA", rating: 9.8, genre: "Indie Pop", ticketPrice: 72, songsSeen: 19 },
  { id: "6", artist: "Fontaines D.C.", tour: "Romance Tour", openers: ["English Teacher"], date: "2024-07-28", venue: "Roundhouse", city: "London", country: "UK", rating: 9.2, genre: "Post-Punk", ticketPrice: 38, songsSeen: 17 },
  { id: "7", artist: "Charli XCX", tour: "Brat Tour", openers: ["Troye Sivan"], date: "2024-07-15", venue: "Madison Square Garden", city: "New York", country: "USA", rating: 9.6, genre: "Pop", ticketPrice: 120, songsSeen: 21 },
  { id: "8", artist: "Boygenius", date: "2024-06-22", venue: "Gunnersbury Park", city: "London", country: "UK", rating: 9.0, genre: "Indie Rock", ticketPrice: 75, songsSeen: 18 },
  { id: "9", artist: "Radiohead", tour: "OK Computer Anniversary", date: "2024-06-08", venue: "Le Trianon", city: "Paris", country: "France", rating: 10, genre: "Alternative", notes: "Bucket list. Cried during Karma Police.", ticketPrice: 95, songsSeen: 23 },
  { id: "10", artist: "LCD Soundsystem", date: "2024-05-19", venue: "Brooklyn Steel", city: "New York", country: "USA", rating: 9.3, genre: "Electronic", ticketPrice: 80, songsSeen: 16 },
  { id: "11", artist: "The Last Dinner Party", date: "2024-04-30", venue: "Village Underground", city: "London", country: "UK", rating: 9.1, genre: "Indie Rock", ticketPrice: 22, songsSeen: 14 },
  { id: "12", artist: "Idles", tour: "Tangk", openers: ["Yard Act"], date: "2024-04-12", venue: "O2 Academy Brixton", city: "London", country: "UK", rating: 9.5, genre: "Post-Punk", ticketPrice: 42, songsSeen: 19 },
  { id: "13", artist: "Caroline Polachek", date: "2024-03-22", venue: "Webster Hall", city: "New York", country: "USA", rating: 8.9, genre: "Pop", ticketPrice: 55, songsSeen: 15 },
  { id: "14", artist: "Fred again..", date: "2024-03-02", venue: "Printworks", city: "London", country: "UK", rating: 9.7, genre: "Electronic", ticketPrice: 58, songsSeen: 20 },
  { id: "15", artist: "Mitski", date: "2024-02-14", venue: "Eventim Apollo", city: "London", country: "UK", rating: 9.4, genre: "Indie Pop", ticketPrice: 48, songsSeen: 18 },
  { id: "16", artist: "Phoebe Bridgers", date: "2024-01-20", venue: "Roundhouse", city: "London", country: "UK", rating: 9.0, genre: "Indie Rock", ticketPrice: 55, songsSeen: 17 },
  // 2023
  { id: "17", artist: "Taylor Swift", tour: "The Eras Tour", date: "2023-08-19", venue: "Wembley Stadium", city: "London", country: "UK", rating: 10, genre: "Pop", notes: "3 hours of pure storytelling.", ticketPrice: 250, songsSeen: 44 },
  { id: "18", artist: "Arctic Monkeys", date: "2023-07-09", venue: "Emirates Stadium", city: "London", country: "UK", rating: 9.3, genre: "Indie Rock", ticketPrice: 95, songsSeen: 22 },
  { id: "19", artist: "Blur", tour: "Reunion", date: "2023-07-02", venue: "Wembley Stadium", city: "London", country: "UK", rating: 9.6, genre: "Britpop", ticketPrice: 110, songsSeen: 24 },
  { id: "20", artist: "Beyoncé", tour: "Renaissance", date: "2023-05-28", venue: "Tottenham Hotspur Stadium", city: "London", country: "UK", rating: 10, genre: "R&B", ticketPrice: 220, songsSeen: 38 },
  { id: "21", artist: "The Strokes", date: "2023-06-10", venue: "All Points East", city: "London", country: "UK", rating: 9.0, genre: "Indie Rock", ticketPrice: 75, songsSeen: 18 },
  { id: "22", artist: "Justice", date: "2023-04-15", venue: "Alexandra Palace", city: "London", country: "UK", rating: 9.4, genre: "Electronic", ticketPrice: 60, songsSeen: 19 },
  { id: "23", artist: "Caroline Polachek", date: "2023-03-08", venue: "O2 Forum", city: "London", country: "UK", rating: 9.1, genre: "Pop", ticketPrice: 38, songsSeen: 16 },
  { id: "24", artist: "Idles", date: "2023-02-04", venue: "Heaven", city: "London", country: "UK", rating: 9.5, genre: "Post-Punk", ticketPrice: 32, songsSeen: 18 },
];

export type RankedItem = { name: string; count: number; meta?: string };

export function getStats() {
  const total = CONCERTS.length;
  const uniqueArtists = new Set(CONCERTS.map((c) => c.artist)).size;
  const uniqueCities = new Set(CONCERTS.map((c) => c.city)).size;
  const uniqueCountries = new Set(CONCERTS.map((c) => c.country)).size;
  const hoursLive = Math.round(CONCERTS.reduce((s, c) => s + (c.songsSeen ?? 16) * 4, 0) / 60);
  const avgRating = CONCERTS.reduce((s, c) => s + c.rating, 0) / total;
  const totalSpend = CONCERTS.reduce((s, c) => s + (c.ticketPrice ?? 0), 0);

  return { total, uniqueArtists, uniqueCities, uniqueCountries, hoursLive, avgRating, totalSpend };
}

export function rankBy<K extends keyof Concert>(key: K, limit = 5): RankedItem[] {
  const counts = new Map<string, number>();
  for (const c of CONCERTS) {
    const v = String(c[key] ?? "");
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function genreBreakdown() {
  const counts = new Map<string, number>();
  for (const c of CONCERTS) counts.set(c.genre, (counts.get(c.genre) ?? 0) + 1);
  const total = CONCERTS.length;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }));
}

export function showsByMonth(year: number) {
  const arr = Array.from({ length: 12 }, (_, i) => ({ month: i, label: new Date(2024, i, 1).toLocaleString("en", { month: "short" }), count: 0 }));
  for (const c of CONCERTS) {
    const d = new Date(c.date);
    if (d.getFullYear() === year) arr[d.getMonth()].count++;
  }
  return arr;
}

export function showsByYear() {
  const counts = new Map<number, number>();
  for (const c of CONCERTS) {
    const y = new Date(c.date).getFullYear();
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year: String(year), count }));
}

export function heatmap(year: number) {
  // Returns an array of weeks x 7 days with show counts.
  const start = new Date(year, 0, 1);
  const startDow = start.getDay(); // 0=Sun
  const days: { date: string; count: number }[] = [];
  // pad with empty days before Jan 1
  for (let i = 0; i < startDow; i++) days.push({ date: "", count: 0 });
  const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
  for (let i = 0; i < daysInYear; i++) {
    const d = new Date(year, 0, 1 + i);
    const iso = d.toISOString().slice(0, 10);
    const count = CONCERTS.filter((c) => c.date === iso).length;
    days.push({ date: iso, count });
  }
  // Group into weeks of 7
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

export function getConcertAge(): number {
  const earliest = CONCERTS.reduce((min, c) => (c.date < min ? c.date : min), CONCERTS[0].date);
  const years = (Date.now() - new Date(earliest).getTime()) / (365.25 * 24 * 3600 * 1000);
  return Math.round(years * 10) / 10;
}

export function recentConcerts(n = 5) {
  return [...CONCERTS].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, n);
}
