import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Star, TrendingUp } from "lucide-react";
import {
  CONCERTS,
  USER,
  genreBreakdown,
  getConcertAge,
  getStats,
  heatmap,
  rankBy,
  recentConcerts,
} from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Concertly" },
      { name: "description", content: "Your personal live music dashboard." },
    ],
  }),
  component: Dashboard,
});

const YEAR = 2024;

function heatColor(count: number): string {
  if (count === 0) return "bg-surface-2";
  if (count === 1) return "bg-brand/40";
  if (count === 2) return "bg-brand/70";
  return "bg-brand";
}

function Dashboard() {
  const stats = getStats();
  const topArtists = rankBy("artist", 6);
  const topVenues = rankBy("venue", 5);
  const topCities = rankBy("city", 4);
  const genres = genreBreakdown();
  const weeks = heatmap(YEAR);
  const recent = recentConcerts(4);
  const yearShows = CONCERTS.filter((c) => new Date(c.date).getFullYear() === YEAR).length;
  const yearArtists = new Set(
    CONCERTS.filter((c) => new Date(c.date).getFullYear() === YEAR).map((c) => c.artist),
  ).size;
  const yearCities = new Set(
    CONCERTS.filter((c) => new Date(c.date).getFullYear() === YEAR).map((c) => c.city),
  ).size;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      {/* Hero header */}
      <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="animate-reveal">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Welcome back
          </p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight md:text-6xl">
            Hello, {USER.name.split(" ")[0]}.
          </h1>
          <p className="mt-3 text-muted-foreground md:text-lg">
            You've seen <span className="font-semibold text-foreground">{yearArtists} artists</span> across{" "}
            <span className="font-semibold text-foreground">{yearCities} cities</span> in {YEAR}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 animate-reveal">
          <Stat label="Concert Age" value={`${getConcertAge()} yrs`} accent="brand" />
          <Stat label="Avg Rating" value={stats.avgRating.toFixed(1)} accent="teal" />
        </div>
      </div>

      {/* Big stat strip */}
      <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-hairline bg-hairline md:grid-cols-4">
        <BigStat label="Shows in {YEAR}" value={yearShows} sub={`${stats.total} all-time`} />
        <BigStat label="Unique artists" value={stats.uniqueArtists} sub="across all shows" />
        <BigStat label="Cities visited" value={stats.uniqueCities} sub={`${stats.uniqueCountries} countries`} />
        <BigStat label="Hours live" value={stats.hoursLive} sub={`$${stats.totalSpend} spent`} />
      </div>

      {/* Heatmap + Top artist */}
      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-card p-8 md:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-extrabold">Yearly Attendance</h2>
              <p className="text-xs text-muted-foreground">{yearShows} shows in {YEAR}</p>
            </div>
            <select className="rounded-lg border border-hairline bg-surface-2 px-3 py-1 text-xs outline-none">
              <option>2024</option>
              <option>2023</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <div className="flex gap-[3px]">
              {weeks.map((week, i) => (
                <div key={i} className="flex flex-col gap-[3px]">
                  {Array.from({ length: 7 }).map((_, d) => {
                    const day = week[d];
                    if (!day || !day.date) return <div key={d} className="h-3 w-3 rounded-sm bg-transparent" />;
                    return (
                      <div
                        key={d}
                        title={`${day.date} — ${day.count} show${day.count === 1 ? "" : "s"}`}
                        className={`h-3 w-3 rounded-sm transition-transform hover:scale-150 ${heatColor(day.count)}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded-sm bg-surface-2" />
              <div className="h-3 w-3 rounded-sm bg-brand/40" />
              <div className="h-3 w-3 rounded-sm bg-brand/70" />
              <div className="h-3 w-3 rounded-sm bg-brand" />
            </div>
            <span>More</span>
          </div>
          <div className="pointer-events-none absolute right-6 top-4 font-display text-[10rem] font-black leading-none opacity-[0.04]">
            {YEAR}
          </div>
        </div>

        {/* Top artist */}
        <div className="flex flex-col justify-between rounded-3xl border border-hairline bg-card p-8">
          <div>
            <h2 className="font-display text-2xl font-extrabold">Your #1 Artist</h2>
            <div className="mt-6 flex items-center gap-4">
              <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-pink font-display text-2xl font-black text-brand-foreground">
                {topArtists[0].name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </div>
              <div>
                <h3 className="text-xl font-bold leading-tight">{topArtists[0].name}</h3>
                <p className="text-sm text-muted-foreground">{topArtists[0].count} shows attended</p>
              </div>
            </div>
          </div>
          <div className="mt-8 space-y-3">
            <RowKV k="Top venue" v="Eventim Apollo" />
            <RowKV k="Songs seen" v="104" />
            <RowKV k="Latest" v="Nov 12, 2024" />
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-gradient-to-r from-brand to-pink" style={{ width: "85%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent + sidebar */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="space-y-5 lg:col-span-3">
          <div className="flex items-end justify-between">
            <h3 className="font-display text-xl font-extrabold">Recent Memories</h3>
            <Link to="/shows" className="text-xs font-semibold text-brand hover:underline">
              View all →
            </Link>
          </div>
          {recent.map((c) => (
            <ConcertCard
              key={c.id}
              artist={c.artist}
              tour={c.tour}
              date={c.date}
              venue={c.venue}
              city={c.city}
              rating={c.rating}
              notes={c.notes}
            />
          ))}
        </div>

        <aside className="space-y-10">
          <Panel title="Top Genres">
            <div className="space-y-3">
              {genres.slice(0, 5).map((g, i) => (
                <div key={g.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span>{g.name}</span>
                    <span className="text-muted-foreground">{g.pct}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${g.pct}%`,
                        backgroundColor: ["var(--brand)", "var(--teal)", "var(--pink)", "var(--chart-4)", "var(--chart-5)"][i % 5],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/20 via-transparent to-teal/10 p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand">2024 Wrapped</p>
            <h4 className="mt-1 font-display text-xl font-extrabold">Your year in concerts is ready.</h4>
            <p className="mt-2 text-xs text-muted-foreground">
              {yearShows} shows · {yearArtists} artists · best month was July.
            </p>
            <Link
              to="/wrapped"
              className="mt-4 inline-flex items-center gap-1 rounded-lg bg-foreground px-3 py-2 text-xs font-bold text-background"
            >
              View summary <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <Panel title="Top Venues">
            <ul className="space-y-3">
              {topVenues.map((v, i) => (
                <li key={v.name} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-sm">{v.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{v.count} shows</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Top Cities">
            <ul className="space-y-3">
              {topCities.map((v, i) => (
                <li key={v.name} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-sm">{v.name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{v.count} shows</span>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: "brand" | "teal" }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface/60 p-4">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={"font-display text-2xl font-extrabold " + (accent === "brand" ? "text-brand" : "text-teal")}>
        {value}
      </p>
    </div>
  );
}

function BigStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-card p-6 md:p-8">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label.replace("{YEAR}", "2024")}
      </p>
      <p className="mt-2 font-display text-4xl font-extrabold md:text-5xl">{value.toLocaleString()}</p>
      {sub && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <TrendingUp className="h-3 w-3" /> {sub}
        </p>
      )}
    </div>
  );
}

function RowKV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function ConcertCard({
  artist, tour, date, venue, city, rating, notes,
}: {
  artist: string; tour?: string; date: string; venue: string; city: string; rating: number; notes?: string;
}) {
  const d = new Date(date);
  return (
    <article className="group rounded-2xl border border-hairline bg-card/60 p-5 transition-colors hover:border-brand/30">
      <div className="flex flex-col gap-5 md:flex-row">
        <div className="grid w-full flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/30 via-surface-2 to-teal/20 md:h-32 md:w-32">
          <div className="py-6 text-center md:py-0">
            <p className="font-display text-3xl font-black leading-none">{d.getDate()}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {d.toLocaleString("en", { month: "short" })} {d.getFullYear()}
            </p>
          </div>
        </div>
        <div className="flex-grow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-display text-2xl font-extrabold leading-tight">
                {artist}
                {tour && <span className="text-muted-foreground"> · {tour}</span>}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {venue} · {city}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1 rounded-full border border-hairline bg-surface-2 px-3 py-1.5">
              <Star className="h-3.5 w-3.5 fill-teal text-teal" />
              <span className="text-xs font-bold">{rating.toFixed(1)}</span>
            </div>
          </div>
          {notes && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{notes}</p>}
        </div>
      </div>
    </article>
  );
}
