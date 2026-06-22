import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  availableYears,
  genreBreakdown,
  monthlyStreak,
  rankBy,
  showsByMonth,
  showsByYear,
  uniqueShows,
  useConcerts,
  type GenreBreakdownItem,
} from "@/lib/concerts";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({ meta: [{ title: "Insights · Concertly" }] }),
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
  const { data: concerts = [] } = useConcerts();
  const nav = useNavigate();
  // Collapse rows that share date+venue (headliner + support acts) into a
  // single "show" — counts and streaks reflect shows attended, not artists seen.
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
  const genres = genreBreakdown(showsInYear);
  // Top artists is per-artist seen — keep using the full list so support acts count.
  const topArtists = rankBy(concertsInYear, "artist", 8);
  const topCountries = rankBy(showsInYear, "country", 6);
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
  const totalArtists = concerts.length;

  const scopeLabel = year === "all" ? "All time" : String(year);

  function handleMonthClick(monthIdx: number) {
    if (year === "all") return;
    const m = String(monthIdx + 1).padStart(2, "0");
    nav({ to: "/shows", search: { month: `${year}-${m}` } });
  }

  function handleGenreClick(genre: string) {
    nav({ to: "/shows", search: { genre } });
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      <div className="mb-8 animate-reveal">
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Insights</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The patterns behind your live music life — when you go out, who you can't get enough of,
          and what genres own your calendar.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalShows}</span> show{totalShows === 1 ? "" : "s"} attended ·{" "}
          <span className="font-semibold text-foreground">{totalArtists}</span> artist{totalArtists === 1 ? "" : "s"} seen
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-hairline bg-card p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Viewing</p>
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

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StreakCard
          label="Current monthly streak"
          value={streak.current}
          sub={streak.current ? "consecutive months with a show" : "log a show this month to start one"}
          tone="brand"
        />
        <StreakCard label="Longest monthly streak" value={streak.longest} sub="all-time" tone="teal" />
        <StreakCard
          label="Avg shows / month"
          value={Number(avgPerMonth.toFixed(2))}
          sub={year === "all" ? "across your history" : `during ${year}`}
          tone="pink"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Shows per month"
          subtitle={scopeLabel}
        >

          <ResponsiveContainer width="100%" height={280}>
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
        </ChartCard>

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
                title={`${g.artists} artist${g.artists === 1 ? "" : "s"} · ${g.count} show${g.count === 1 ? "" : "s"} · click to view`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                {g.name} · {g.pct}%
              </button>
            ))}
          </div>
          {genres.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">Click a slice or chip to see those shows.</p>
          )}
        </ChartCard>

        <ChartCard className="lg:col-span-2" title="Top artists by shows" subtitle={scopeLabel}>
          <div className="space-y-4">
            {topArtists.map((a, i) => {
              const pct = (a.count / (topArtists[0]?.count || 1)) * 100;
              return (
                <div key={a.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-3">
                      <span className="w-6 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-medium">{a.name}</span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{a.count} shows</span>
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

        <ChartCard title="Top countries by shows" subtitle="All time">
          {topCountries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No countries logged yet.</p>
          ) : (
            <ul className="space-y-3">
              {topCountries.map((c, i) => {
                const pct = (c.count / (topCountries[0]?.count || 1)) * 100;
                return (
                  <li key={c.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-3">
                        <span className="w-6 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                        <span>{c.name}</span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">{c.count}</span>
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

        <ChartCard className="lg:col-span-2" title="Shows by year" subtitle="Lifetime">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byYear} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--hairline)" />
              <XAxis dataKey="year" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--teal)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
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
        {g.artists} artist{g.artists === 1 ? "" : "s"} · {g.count} show{g.count === 1 ? "" : "s"} · {g.pct}%
      </div>
    </div>
  );
}

function StreakCard({
  label, value, sub, tone,
}: { label: string; value: number; sub: string; tone: "brand" | "teal" | "pink" }) {
  const ring = tone === "brand" ? "from-brand/25" : tone === "teal" ? "from-teal/25" : "from-pink/25";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-hairline bg-card p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
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
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          {subtitle && <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}
