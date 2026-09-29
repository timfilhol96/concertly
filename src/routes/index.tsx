import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Download, MapPin, Sparkles, Ticket, Users } from "lucide-react";
import heroImg from "@/assets/hero-concert.jpg";
import {
  genreBreakdown,
  getStats,
  rankBy,
  recentConcerts,
  showsByMonth,
  showsByYear,
} from "@/lib/mock-data";
import { formatDuration } from "@/lib/utils";
import { ctaClass } from "@/components/cta";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Concertly: Track every show you attend" },
      {
        name: "description",
        content:
          "The stats.fm for live music. Log every gig and watch your touring history come alive in stats, charts, and shareable year-in-review cards.",
      },
      { property: "og:title", content: "Concertly: Track every show you attend" },
      {
        property: "og:description",
        content:
          "The stats.fm for live music. Log every gig and watch your touring history come alive in stats and shareable year-in-review cards.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://concertly.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://concertly.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  const stats = getStats();
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-display text-2xl font-extrabold tracking-tighter text-brand">
            CONCERTLY
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className={ctaClass()}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Concert crowd silhouetted against vibrant purple and teal stage lights"
          width={1920}
          height={1080}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_50%_at_50%_0%,transparent_0%,var(--background)_85%)]" />

        <div className="mx-auto max-w-7xl px-6 pb-32 pt-40 md:pb-48 md:pt-56">
          <div className="max-w-4xl animate-reveal">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Open beta · Free forever
            </div>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
              Track every show.
              <br />
              <span className="gradient-text">Discover your live music story.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              The stats.fm for concert junkies. Log every gig, festival, and underground set,
              then watch your personal touring history come alive in stats, charts, and shareable
              year‑in‑review cards.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/auth"
                className={ctaClass({ size: "lg" }, "group")}
              >
                Start logging for free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#features"
                className={ctaClass({ variant: "surface", size: "lg" })}
              >
                See what it does
              </a>
            </div>
          </div>

          {/* Floating stat strip - sample data, labelled as such */}
          <p className="mt-20 mb-3 text-xs font-medium text-muted-foreground">
            Example: what a few years of concert-going looks like on Concertly
          </p>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-hairline bg-hairline backdrop-blur-md md:grid-cols-4">
            {[
              { k: "Shows tracked", v: stats.total.toString() },
              { k: "Unique artists", v: stats.uniqueArtists.toString() },
              { k: "Cities", v: stats.uniqueCities.toString() },
              { k: "Hours live", v: formatDuration(stats.hoursLive) },
            ].map((s, i) => (
              <div key={s.k} className="bg-surface/70 p-6 animate-count" style={{ animationDelay: `${i * 80}ms` }}>
                <p className="eyebrow text-muted-foreground">{s.k}</p>
                <p className="mt-2 font-display text-4xl font-extrabold md:text-5xl">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-24">
        <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          A diary for the <span className="text-brand">front row</span>.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Every gig you've ever been to, finally in one place, with the receipts to prove it.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: Ticket, title: "Log it in seconds", body: "Search artist, pick a date, done. We pull setlists, openers and tour name automatically." },
            { icon: BarChart3, title: "Stats that hit", body: "Top artists, top venues, attendance heatmaps, genre breakdowns and travel stats." },
            { icon: Sparkles, title: "Your Concertly Wrapped", body: "A beautiful, shareable year‑in‑review card of your concerts. Made for stories." },
            { icon: MapPin, title: "Your concert map", body: "Every venue you've been to, pinned on a map. See how far the music has taken you." },
            { icon: Users, title: "Friends", body: "Add friends, browse their shows, and discover the gigs you went to together." },
            { icon: Download, title: "Yours, forever", body: "Import your history from a CSV and export everything at any time. Your memories, your data." },
          ].map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-hairline bg-surface p-6 transition-colors hover:border-brand/40"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/15 text-brand">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl font-bold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand/20 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </section>

      {/* Product preview built from the sample data */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">A look inside.</h2>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          This is what your dashboard looks like once a few years of shows are logged. Sample data shown.
        </p>
        <AppPreview />
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-32">
        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-gradient-to-br from-brand/25 via-surface to-surface p-10 md:p-16">
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">
              Start your live music archive tonight.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Create a free account, log the shows you remember, and watch your stats build up
              from the very first one.
            </p>
            <Link
              to="/auth"
              className={ctaClass({ variant: "inverse", size: "lg" }, "mt-8")}
            >
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-brand/15 blur-3xl" />
        </div>
      </section>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
          <div>
            <span className="font-display text-xl font-extrabold tracking-tighter text-brand">CONCERTLY</span>
            <p className="mt-1 text-xs text-muted-foreground">Made for the front row · © {new Date().getFullYear()}</p>
          </div>
          <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/trust" className="hover:text-foreground">Trust</Link>
            <Link to="/concert-stats" className="hover:text-foreground">Concert stats</Link>
            <Link to="/blog/best-concert-trackers" className="hover:text-foreground">Best concert trackers</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AppPreview() {
  const busiestYear = [...showsByYear()].sort((a, b) => b.count - a.count)[0];
  const months = showsByMonth(Number(busiestYear.year));
  const maxMonth = Math.max(1, ...months.map((m) => m.count));
  const artists = rankBy("artist", 5);
  const genres = genreBreakdown().slice(0, 4);
  const recent = recentConcerts(3);

  return (
    <div className="mt-12 overflow-hidden rounded-3xl border border-hairline bg-card shadow-2xl glow-brand">
      {/* Fake window chrome */}
      <div className="flex items-center gap-2 border-b border-hairline px-5 py-3">
        <span className="h-3 w-3 rounded-full bg-surface-3" />
        <span className="h-3 w-3 rounded-full bg-surface-3" />
        <span className="h-3 w-3 rounded-full bg-surface-3" />
        <span className="ml-4 text-xs text-muted-foreground">Dashboard</span>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
        <div className="rounded-2xl border border-hairline bg-surface p-5 md:col-span-2">
          <p className="eyebrow text-muted-foreground">Shows per month · {busiestYear.year}</p>
          <div className="mt-6 flex h-40 items-end gap-1.5 md:gap-2">
            {months.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-md bg-brand/80"
                  style={{ height: `${Math.max(4, (m.count / maxMonth) * 128)}px`, opacity: m.count ? 1 : 0.25 }}
                />
                <span className="text-[11px] text-muted-foreground">{m.label.slice(0, 1)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-5">
          <p className="eyebrow text-muted-foreground">Top artists</p>
          <ol className="mt-4 space-y-3">
            {artists.map((a, i) => (
              <li key={a.name} className="flex items-center gap-3 text-sm">
                <span className="w-4 font-display font-bold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate font-semibold">{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.count}×</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-5">
          <p className="eyebrow text-muted-foreground">Top genres</p>
          <div className="mt-4 space-y-3">
            {genres.map((g, i) => (
              <div key={g.name} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span>{g.name}</span>
                  <span className="text-muted-foreground">{g.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${g.pct}%`, backgroundColor: `var(--chart-${(i % 5) + 1})` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-5 md:col-span-2">
          <p className="eyebrow text-muted-foreground">Recent memories</p>
          <ul className="mt-4 divide-y divide-hairline">
            {recent.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-display font-bold">{c.artist}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.venue} · {c.city}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(c.date).toLocaleDateString("en", { month: "short", year: "numeric", timeZone: "UTC" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
