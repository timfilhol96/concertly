import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  attendedOnly,
  availableYears,
  genreBreakdown,
  monthlyStreak,
  rankBy,
  showsByDay,
  showsByMonth,
  showsByYear,
  uniqueShows,
  useConcerts,
  type GenreBreakdownItem,
} from "@/lib/concerts";
import { spendStats } from "@/lib/badges";
import type { Concert } from "@/lib/concerts";
import { useFriendConcerts, useFriendships } from "@/lib/friends";
import { plural } from "@/lib/utils";
import { ctaClass } from "@/components/cta";
import { PageTitle } from "@/components/page-title";
import { PageSkeleton } from "@/components/page-skeleton";

type Search = { friendId?: string };

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights · Concertly" },
      { name: "description", content: "Deep live music insights: shows per year, month and day, top artists, venues, cities, countries and genre mix." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    friendId: typeof s.friendId === "string" && s.friendId.length > 0 ? s.friendId : undefined,
  }),
  component: Insights,
});

const CHART_COLORS = [
  "var(--brand)",
  "var(--teal)",
  "var(--pink)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#6366f1",
];
const CURRENT_YEAR = new Date().getFullYear();

type YearSel = number | "all";

function Insights() {
  const { friendId } = Route.useSearch();
  const { data: friendData, isLoading: friendsLoading } = useFriendships();
  const friendProfile = friendId ? friendData?.profiles?.[friendId] : undefined;
  const isFriend = friendId
    ? friendData?.friends?.some((f) => f.otherUserId === friendId) ?? false
    : true;
  const ownConcertsQ = useConcerts();
  const friendConcertsQ = useFriendConcerts(friendId && isFriend ? friendId : null);
  const concerts = friendId ? friendConcertsQ.data ?? [] : ownConcertsQ.data ?? [];

  const nav = useNavigate();
  // Collapse rows that share date+venue (headliner + support acts) into a
  // single "show" - counts and streaks reflect shows attended, not artists seen.
  const shows = useMemo(() => uniqueShows(concerts), [concerts]);
  const years = availableYears(shows);
  const [year, setYear] = useState<YearSel>(years[0] ?? CURRENT_YEAR);


  // Filter to the selected year for all year-aware sections.
  const showsInYear = useMemo(
    () => (year === "all" ? shows : shows.filter((s) => s.date.startsWith(String(year)))),
    [shows, year],
  );
  const concertsInYear = useMemo(
    () => (year === "all" ? concerts : concerts.filter((c) => c.date.startsWith(String(year)))),
    [concerts, year],
  );

  const byMonth = showsByMonth(shows, year);
  const byYear = showsByYear(shows);
  const byDay = showsByDay(showsInYear);
  const genres = genreBreakdown(showsInYear);
  // Top artists is per-artist seen - keep using the full list so support acts count.
  const topArtists = rankBy(concertsInYear, "artist", 8);
  const topCountries = rankBy(showsInYear, "country", 6);
  const topCities = rankBy(showsInYear, "city", 6);
  const topVenues = rankBy(showsInYear, "venue", 6);
  const streak = monthlyStreak(shows);

  const totalInRange = byMonth.reduce((s, m) => s + m.count, 0);
  const monthsCovered =
    year === "all"
      ? Math.max(1, monthsBetween(shows))
      : year === CURRENT_YEAR
        ? new Date().getMonth() + 1
        : 12;
  const avgPerMonth = totalInRange / monthsCovered;

  // Totals header: distinguish shows attended from artists seen.
  const totalShows = shows.length;
  const totalArtists = new Set(attendedOnly(concerts).map((c) => c.artist)).size;

  const scopeLabel = year === "all" ? "All time" : String(year);

  function handleMonthClick(monthIdx: number) {
    if (year === "all" || friendId) return;
    const m = String(monthIdx + 1).padStart(2, "0");
    nav({ to: "/shows", search: { month: `${year}-${m}` } });
  }

  function handleGenreClick(genre: string) {
    if (friendId) return;
    nav({
      to: "/shows",
      search: year === "all" ? { genre } : { genre, year: String(year) },
    });
  }

  function handleYearClick(y: number) {
    if (friendId) return;
    nav({ to: "/shows", search: { year: String(y) } });
  }

  function handleWeekdayClick(day: number) {
    if (friendId) return;
    nav({
      to: "/shows",
      search: year === "all" ? { weekday: String(day) } : { weekday: String(day), year: String(year) },
    });
  }


  if (friendsLoading || (friendId ? friendConcertsQ.isLoading : ownConcertsQ.isLoading)) {
    return <PageSkeleton />;
  }

  if (friendId && (!isFriend || !friendProfile)) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-extrabold">Not available</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You aren't friends with this user.
        </p>
        <Link to="/friends" className={ctaClass({}, "mt-6")}>
          Back to Friends
        </Link>
      </main>
    );
  }

  const headerTitle = friendProfile ? `${friendProfile.displayName}'s Insights` : "Insights";
  const headerSub = friendProfile
    ? `A look at @${friendProfile.username ?? "friend"}'s live music year.`
    : "The patterns behind your live music life: when you go out, who you can't get enough of, and what genres own your calendar.";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      {friendProfile && (
        <Link
          to="/friend/$id"
          params={{ id: friendId! }}
          className="mb-4 inline-block text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          ← Back to {friendProfile.displayName.split(" ")[0]}'s dashboard
        </Link>
      )}
      <div className="mb-8">
        <PageTitle title={headerTitle} description={headerSub} />
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalShows}</span> {totalShows === 1 ? "show" : "shows"} attended ·{" "}
          <span className="font-semibold text-foreground">{totalArtists}</span> {totalArtists === 1 ? "artist" : "artists"} seen
        </p>
      </div>


      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-card p-4">
        <div>
          <p className="eyebrow text-muted-foreground">Viewing</p>
          <p className="font-display text-lg font-extrabold">{scopeLabel}</p>
          <p className="text-[11px] text-muted-foreground">
            Filters monthly chart, genre mix, top artists & top countries
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <YearChip active={year === "all"} onClick={() => setYear("all")}>All time</YearChip>
          {years.map((y) => (
            <YearChip key={y} active={year === y} onClick={() => setYear(y)}>{y}</YearChip>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <ChartCard title="Shows by year" subtitle="Lifetime">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byYear} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--hairline)" />
              <XAxis dataKey="year" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, fontSize: 12 }}
              />
              <Bar
                dataKey="count"
                radius={[6, 6, 0, 0]}
                fill="var(--teal)"
                onClick={(d: { year?: string | number }) => {
                  if (d?.year != null) handleYearClick(Number(d.year));
                }}
                style={{ cursor: "pointer" }}
              >
                {byYear.map((entry, index) => {
                  const isSelected = String(entry.year) === String(year);
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isSelected ? "var(--brand)" : "var(--teal)"}
                      opacity={year === "all" || isSelected ? 1 : 0.5}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-[11px] text-muted-foreground">Click a bar to see those shows.</p>
        </ChartCard>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <StreakCard
          label="Current monthly streak"
          value={streak.current}
          sub={streak.current ? "consecutive months with a show" : "log a show this month to start one"}
          tone="brand"
        />
        <StreakCard
          label="Avg shows / month"
          value={Number(avgPerMonth.toFixed(2))}
          sub={year === "all" ? "across your history" : `during ${year}`}
          tone="pink"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Genre mix" subtitle={scopeLabel}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={genres}
                dataKey="count"
                nameKey="name"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
                onClick={(d: { name?: string }) => d?.name && handleGenreClick(d.name)}
                style={{ cursor: "pointer" }}
              >
                {genres.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                content={<GenreTooltip />}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {genres.map((g, i) => (
              <button
                key={g.name}
                type="button"
                onClick={() => handleGenreClick(g.name)}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-1 transition hover:bg-surface-3 hover:ring-1 hover:ring-hairline"
                title={`${plural(g.artists, "artist")} · ${plural(g.count, "show")} (${g.pct}%) · click to view`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                {g.name} · {plural(g.count, "show")} ({g.pct}%)
              </button>
            ))}
          </div>
          {genres.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">Click a slice or chip to see those shows.</p>
          )}
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title="Shows per month & per day"
          subtitle={scopeLabel}
        >
          <div className="mb-6">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Per month</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byMonth} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--hairline)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, fontSize: 12 }}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  fill="var(--brand)"
                  onClick={(d: { month?: number }) =>
                    typeof d?.month === "number" && handleMonthClick(d.month)
                  }
                  style={{ cursor: year === "all" ? "default" : "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Average: <span className="font-semibold text-foreground">{avgPerMonth.toFixed(2)}</span> shows / month
              {year !== "all" && " · click a bar to see those shows"}
            </p>
          </div>

          <div className="border-t border-hairline pt-6">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Per day of the week</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDay} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--hairline)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, fontSize: 12 }}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  fill="var(--teal)"
                  onClick={(d: { day?: number }) =>
                    typeof d?.day === "number" && handleWeekdayClick(d.day)
                  }
                  style={{ cursor: friendId ? "default" : "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
            {!friendId && (
              <p className="mt-2 text-[11px] text-muted-foreground">Click a bar to see those shows.</p>
            )}
          </div>
        </ChartCard>


        <ChartCard className="lg:col-span-2" title="Top artists by shows" subtitle={scopeLabel}>
          <div className="space-y-4">
            {topArtists.map((a, i) => {
              const max = topArtists[0]?.count || 1;
              const share = showsInYear.length ? (a.count / showsInYear.length) * 100 : 0;
              const pct = (a.count / max) * 100;
              return (
                <div key={a.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-3">
                      <span className="w-6 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-medium">{a.name}</span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{plural(a.count, "show")} ({Math.round(share)}%)</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand to-teal transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {topArtists.length === 0 && (
              <p className="text-sm text-muted-foreground">Add a few shows to unlock this.</p>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Top countries by shows" subtitle={scopeLabel}>
          {topCountries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No countries logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {topCountries.map((c, i) => {
                const max = topCountries[0]?.count || 1;
                const share = showsInYear.length ? (c.count / showsInYear.length) * 100 : 0;
                const pct = (c.count / max) * 100;
                return (
                  <li key={c.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-3">
                        <span className="w-6 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                        <span>{c.name}</span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{plural(c.count, "show")} ({Math.round(share)}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-gradient-to-r from-pink to-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Top cities by shows" subtitle={scopeLabel}>
          {topCities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cities logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {topCities.map((c, i) => {
                const max = topCities[0]?.count || 1;
                const share = showsInYear.length ? (c.count / showsInYear.length) * 100 : 0;
                const pct = (c.count / max) * 100;
                return (
                  <li key={c.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-3">
                        <span className="w-6 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                        <span>{c.name}</span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{plural(c.count, "show")} ({Math.round(share)}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-gradient-to-r from-teal to-brand" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>

        <ChartCard className="lg:col-span-2" title="Top venues by shows" subtitle={scopeLabel}>
          {topVenues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No venues logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {topVenues.map((v, i) => {
                const max = topVenues[0]?.count || 1;
                const share = showsInYear.length ? (v.count / showsInYear.length) * 100 : 0;
                const pct = (v.count / max) * 100;
                return (
                  <li key={v.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-3">
                        <span className="w-6 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                        <span>{v.name}</span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{plural(v.count, "show")} ({Math.round(share)}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand to-teal" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>
      </div>

      <SpendSection concerts={concerts} />
    </main>
  );
}

function monthsBetween(list: { date: string }[]): number {
  if (list.length === 0) return 1;
  let min = list[0].date;
  for (const c of list) if (c.date < min) min = c.date;
  const start = new Date(min);
  const now = new Date();
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
}

function GenreTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: GenreBreakdownItem }> }) {
  if (!active || !payload || !payload[0]) return null;
  const g = payload[0].payload;
  return (
    <div className="rounded-xl border border-hairline bg-card px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold">{g.name}</div>
      <div className="text-muted-foreground">
        {plural(g.artists, "artist")} · {plural(g.count, "show")} ({g.pct}%)
      </div>
    </div>
  );
}

function YearChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-3 py-1.5 text-xs font-semibold transition " +
        (active
          ? "bg-foreground text-background"
          : "border border-hairline bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-2")
      }
    >
      {children}
    </button>
  );
}

function StreakCard({
  label, value, sub, tone,
}: { label: string; value: number; sub: string; tone: "brand" | "teal" | "pink" }) {
  const ring = tone === "brand" ? "from-brand/25" : tone === "teal" ? "from-teal/25" : "from-pink/25";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-hairline bg-card p-5">
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl font-extrabold leading-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      <div className={`pointer-events-none absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-gradient-to-br ${ring} to-transparent blur-2xl`} />
    </div>
  );
}

function ChartCard({
  title, subtitle, children, className = "", right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <section className={"rounded-3xl border border-hairline bg-card p-6 md:p-7 " + className}>
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">{title}</h2>
          {subtitle && <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function SpendSection({ concerts }: { concerts: Concert[] }) {
  const s = spendStats(concerts);
  if (s.count === 0) return null;
  const fmt = (n: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const maxYear = s.perYear.reduce((m, y) => Math.max(m, y.total), 0);
  return (
    <section className="mt-10 rounded-3xl border border-hairline bg-card p-6 md:p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Spend</h2>
          <p className="text-xs text-muted-foreground">
            Based on {plural(s.count, "show")} with a ticket price logged.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SpendStat label="Total spent" value={fmt(s.total)} />
        <SpendStat label="This year" value={fmt(s.thisYear)} />
        <SpendStat label="Avg / show" value={fmt(s.avg)} />
        <SpendStat
          label="Most expensive"
          value={s.mostExpensive ? fmt(s.mostExpensive.ticketPrice ?? 0) : "-"}
          sub={s.mostExpensive?.artist}
        />
      </div>
      {s.perYear.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 eyebrow text-muted-foreground">
            By year
          </p>
          <ul className="space-y-2.5">
            {s.perYear.map((y) => {
              const pct = maxYear ? (y.total / maxYear) * 100 : 0;
              return (
                <li key={y.year}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{y.year}</span>
                    <span className="font-mono text-muted-foreground">{fmt(y.total)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-pink"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function SpendStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-extrabold">{value}</p>
      {sub && <p className="mt-1 truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
