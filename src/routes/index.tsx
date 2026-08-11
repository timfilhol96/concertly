import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Calendar, Sparkles, Ticket } from "lucide-react";
import heroImg from "@/assets/hero-concert.jpg";
import { CONCERTS, getStats } from "@/lib/mock-data";
import { formatDuration } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Concertly — Track every show you attend" },
      {
        name: "description",
        content:
          "The stats.fm for live music. Log every gig and watch your touring history come alive in stats, charts, and shareable year-in-review cards.",
      },
      { property: "og:title", content: "Concertly — Track every show you attend" },
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
              className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-foreground transition-all hover:scale-[1.03] active:scale-95"
            >
              Try the demo
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
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              Now in open beta — free forever
            </div>
            <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
              Track every show.
              <br />
              <span className="gradient-text">Discover your live music story.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              The stats.fm for concert junkies. Log every gig, festival, and underground set —
              then watch your personal touring history come alive in stats, charts, and shareable
              year‑in‑review cards.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/auth"
                className="group inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-brand-foreground transition-all hover:scale-[1.03] active:scale-95"
              >
                Open your dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface/60 px-6 py-3.5 text-sm font-bold text-foreground backdrop-blur-md transition-colors hover:bg-surface-2"
              >
                Log your first show
              </Link>
            </div>
          </div>

          {/* Floating stat strip */}
          <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-hairline bg-hairline backdrop-blur-md md:grid-cols-4">
            {[
              { k: "Shows tracked", v: stats.total.toString() },
              { k: "Unique artists", v: stats.uniqueArtists.toString() },
              { k: "Cities", v: stats.uniqueCities.toString() },
              { k: "Hours live", v: stats.hoursLive.toString() },
            ].map((s, i) => (
              <div key={s.k} className="bg-surface/70 p-6 animate-count" style={{ animationDelay: `${i * 80}ms` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.k}</p>
                <p className="mt-2 font-display text-4xl font-extrabold md:text-5xl">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          A diary for the <span className="gradient-text">front row</span>.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Every gig you've ever been to, finally in one place — with the receipts to prove it.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: Ticket, title: "Log it in seconds", body: "Search artist, pick a date, done. We pull setlists, openers and tour name automatically." },
            { icon: BarChart3, title: "Stats that hit", body: "Top artists, top venues, attendance heatmaps, genre breakdowns and travel stats." },
            { icon: Sparkles, title: "Your Concertly Wrapped", body: "A beautiful, shareable year‑in‑review card every December. Made for stories." },
            { icon: Calendar, title: "Never miss a tour", body: "Follow your favorite artists and get a heads‑up when they hit your city." },
            { icon: BarChart3, title: "Friends + leaderboards", body: "Compare attendance with friends. Compete on shows, miles, and obscure venues." },
            { icon: Sparkles, title: "Yours, forever", body: "Export everything as JSON or CSV at any time. Your memories, your data." },
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

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-32">
        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-gradient-to-br from-brand/25 via-surface to-teal/15 p-10 md:p-16">
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">
              Start your live music archive tonight.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {CONCERTS.length} sample shows are already loaded. Jump in and explore the dashboard,
              then start logging your own.
            </p>
            <Link
              to="/auth"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-bold text-background transition-transform hover:scale-[1.03] active:scale-95"
            >
              Enter the venue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-teal/20 blur-3xl" />
        </div>
      </section>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
          <div>
            <span className="font-display text-xl font-extrabold tracking-tighter text-brand">CONCERTLY</span>
            <p className="mt-1 text-xs text-muted-foreground">Made for the front row · © {new Date().getFullYear()}</p>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/trust" className="hover:text-foreground">Trust</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
