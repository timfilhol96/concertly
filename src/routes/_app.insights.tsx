import { createFileRoute } from "@tanstack/react-router";
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
  genreBreakdown,
  rankBy,
  showsByMonth,
  showsByYear,
} from "@/lib/mock-data";

export const Route = createFileRoute("/_app/insights")({
  head: () => ({ meta: [{ title: "Insights · Concertly" }] }),
  component: Insights,
});

const CHART_COLORS = ["var(--brand)", "var(--teal)", "var(--pink)", "var(--chart-4)", "var(--chart-5)", "#6366f1"];

function Insights() {
  const byMonth = showsByMonth(2024);
  const byYear = showsByYear();
  const genres = genreBreakdown();
  const topArtists = rankBy("artist", 8);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      <div className="mb-10 animate-reveal">
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Insights</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          The patterns behind your live music life — when you go out, who you can't get enough of,
          and what genres own your calendar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Shows per month" subtitle="2024">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byMonth} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--hairline)" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="var(--brand)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Genre mix" subtitle="All time">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={genres} dataKey="count" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                {genres.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--card)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {genres.map((g, i) => (
              <span key={g.name} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2 py-1">
                <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                {g.name} · {g.pct}%
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard className="lg:col-span-2" title="Top artists by shows" subtitle="All time">
          <div className="space-y-4">
            {topArtists.map((a, i) => {
              const pct = (a.count / topArtists[0].count) * 100;
              return (
                <div key={a.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-3">
                      <span className="w-6 text-xs font-bold text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-medium">{a.name}</span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{a.count} shows</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-teal transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Shows by year" subtitle="Lifetime streak">
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

function ChartCard({
  title, subtitle, children, className = "",
}: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={"rounded-3xl border border-hairline bg-card p-6 md:p-7 " + className}>
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          {subtitle && <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}
