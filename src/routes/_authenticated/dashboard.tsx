import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Star, TrendingUp } from "lucide-react";
import {
  genreBreakdown,
  getConcertAge,
  getStats,
  monthlyHeatmap,
  monthlyStreak,
  rankBy,
  recentConcerts,
  useConcerts,
  useProfile,
} from "@/lib/concerts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Concertly" },
      { name: "description", content: "Your personal live music dashboard." },
    ],
  }),
  component: Dashboard,
});

const YEAR = new Date().getFullYear();

function heatColor(count: number, max: number): string {
  if (count === 0) return "bg-surface-2";
  const ratio = max ? count / max : 0;
  if (ratio < 0.34) return "bg-brand/40";
  if (ratio < 0.67) return "bg-brand/70";
  return "bg-brand";
}

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: concerts, isLoading } = useConcerts();
  const nav = useNavigate();

  if (isLoading || !concerts) return <LoadingState />;
  if (concerts.length === 0) return <EmptyState name={profile?.displayName ?? "you"} />;

  const stats = getStats(concerts);
  const topArtists = rankBy(concerts, "artist", 6);
  const topVenues = rankBy(concerts, "venue", 5);
  const topCities = rankBy(concerts, "city", 4);
  const genres = genreBreakdown(concerts);
  const months = monthlyHeatmap(concerts, YEAR);
  const maxMonth = months.reduce((m, x) => Math.max(m, x.count), 0);
  const recent = recentConcerts(concerts, 4);
  const inYear = concerts.filter((c) => new Date(c.date).getFullYear() === YEAR);
  const yearShows = inYear.length;
  const yearArtists = new Set(inYear.map((c) => c.artist)).size;
  const yearCities = new Set(inYear.map((c) => c.city)).size;
  const streak = monthlyStreak(concerts);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="animate-reveal">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight md:text-6xl">
            Hello, {(profile?.displayName ?? "friend").split(" ")[0]}.
          </h1>
          <p className="mt-3 text-muted-foreground md:text-lg">
            You've seen <span className="font-semibold text-foreground">{yearArtists} artists</span> across{" "}
            <span className="font-semibold text-foreground">{yearCities} cities</span> in {YEAR}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 animate-reveal">
          <Stat label="Concert Age" value={`${getConcertAge(concerts)} yrs`} accent="brand" />
          <Stat label="Avg Rating" value={stats.avgRating.toFixed(1)} accent="teal" />
        </div>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-hairline bg-hairline md:grid-cols-4">
        <BigStat label={`Shows in ${YEAR}`} value={yearShows} sub={`${stats.total} all-time`} />
        <BigStat label="Unique artists" value={stats.uniqueArtists} sub="across all shows" />
        <BigStat label="Cities visited" value={stats.uniqueCities} sub={`${stats.uniqueCountries} countries`} />
        <BigStat label="Monthly streak" value={streak.current} sub={`longest ${streak.longest}`} />
      </div>

      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-card p-8 md:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-extrabold">Yearly Attendance</h2>
              <p className="text-xs text-muted-foreground">{yearShows} shows in {YEAR} · click a month to see them</p>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-3 md:grid-cols-12">
            {months.map((m) => (
              <button
                key={m.key}
                type="button"
                disabled={m.count === 0}
                onClick={() => nav({ to: "/shows", search: { month: m.key } })}
                className={`group flex aspect-square flex-col items-center justify-center rounded-xl ${heatColor(m.count, maxMonth)} transition-transform hover:scale-105 disabled:cursor-default disabled:hover:scale-100`}
                title={`${m.label} ${YEAR} — ${m.count} show${m.count === 1 ? "" : "s"}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">{m.label}</span>
                <span className="font-display text-xl font-extrabold">{m.count}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>Quiet</span>
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded-sm bg-surface-2" />
              <div className="h-3 w-3 rounded-sm bg-brand/40" />
              <div className="h-3 w-3 rounded-sm bg-brand/70" />
              <div className="h-3 w-3 rounded-sm bg-brand" />
            </div>
            <span>Packed</span>
          </div>
          <div className="pointer-events-none absolute right-6 top-4 font-display text-[10rem] font-black leading-none opacity-[0.04]">
            {YEAR}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-hairline bg-card p-8">
          <div>
            <h2 className="font-display text-2xl font-extrabold">Your #1 Artist</h2>
            {topArtists[0] ? (
              <div className="mt-6 flex items-center gap-4">
                {(() => {
                  const c = concerts.find((c) => c.artist === topArtists[0].name && c.artistImageUrl);
                  return c?.artistImageUrl ? (
                    <img src={c.artistImageUrl} alt={topArtists[0].name} className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-pink font-display text-2xl font-black text-brand-foreground">
                      {topArtists[0].name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                  );
                })()}
                <div>
                  <h3 className="text-xl font-bold leading-tight">{topArtists[0].name}</h3>
                  <p className="text-sm text-muted-foreground">{topArtists[0].count} shows attended</p>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">Log a show to find out.</p>
            )}
          </div>
          <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-pink" style={{ width: "85%" }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="space-y-5 lg:col-span-3">
          <div className="flex items-end justify-between">
            <h3 className="font-display text-xl font-extrabold">Recent Memories</h3>
            <Link to="/shows" className="text-xs font-semibold text-brand hover:underline">
              View all →
            </Link>
          </div>
          {recent.map((c) => (
            <Link key={c.id} to="/show/$id" params={{ id: c.id }} className="block">
              <ConcertCard
                artist={c.artist}
                tour={c.tour ?? undefined}
                date={c.date}
                venue={c.venue}
                city={c.city}
                rating={c.rating}
                notes={c.notes ?? undefined}
                imageUrl={c.artistImageUrl ?? undefined}
              />
            </Link>
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-brand">{YEAR} Wrapped</p>
            <h4 className="mt-1 font-display text-xl font-extrabold">Your year in concerts is ready.</h4>
            <p className="mt-2 text-xs text-muted-foreground">
              {yearShows} shows · {yearArtists} artists.
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
                  <span className="w-5 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
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
                  <span className="w-5 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
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

function LoadingState() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-20">
      <div className="animate-pulse space-y-6">
        <div className="h-12 w-72 rounded-xl bg-surface-2" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface-2" />
          ))}
        </div>
        <div className="h-72 rounded-3xl bg-surface-2" />
      </div>
    </main>
  );
}

function EmptyState({ name }: { name: string }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Welcome</p>
      <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight md:text-6xl">
        Hi {name.split(" ")[0]}. <span className="gradient-text">Log your first show.</span>
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        The archive starts the moment you add a gig. Stats, heatmaps and your year-in-review unlock automatically.
      </p>
      <Link
        to="/add"
        className="mt-8 rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground hover:scale-[1.03] active:scale-95"
      >
        Log a show
      </Link>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: "brand" | "teal" }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface/60 p-4">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={"font-display text-2xl font-extrabold " + (accent === "brand" ? "text-brand" : "text-teal")}>{value}</p>
    </div>
  );
}

function BigStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-card p-6 md:p-8">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl font-extrabold md:text-5xl">{value.toLocaleString()}</p>
      {sub && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <TrendingUp className="h-3 w-3" /> {sub}
        </p>
      )}
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
  artist, tour, date, venue, city, rating, notes, imageUrl,
}: {
  artist: string; tour?: string; date: string; venue: string; city: string; rating: number; notes?: string; imageUrl?: string;
}) {
  const d = new Date(date);
  return (
    <article className="group rounded-2xl border border-hairline bg-card/60 p-5 transition-colors hover:border-brand/30">
      <div className="flex flex-col gap-5 md:flex-row">
        <div className="grid w-full flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand/30 via-surface-2 to-teal/20 md:h-32 md:w-32">
          {imageUrl ? (
            <img src={imageUrl} alt={artist} className="h-full w-full object-cover" />
          ) : (
            <div className="py-6 text-center md:py-0">
              <p className="font-display text-3xl font-black leading-none">{d.getDate()}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {d.toLocaleString("en", { month: "short" })} {d.getFullYear()}
              </p>
            </div>
          )}
        </div>
        <div className="flex-grow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-display text-2xl font-extrabold leading-tight">
                {artist}
                {tour && <span className="text-muted-foreground"> · {tour}</span>}
              </h4>
              <p className="mt-1 text-sm text-muted-foreground">{venue} · {city}</p>
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
