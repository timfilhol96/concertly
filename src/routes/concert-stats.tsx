import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Clock,
  Globe2,
  MapPin,
  Music,
  Share2,
  Sparkles,
  Trophy,
  Upload,
  Users,
} from "lucide-react";

const TITLE = "Live Music Stats: Track Your Concert History | Concertly";
const DESCRIPTION =
  "See your live music stats: total shows, unique artists, top venues, cities, genre mix and hours lived live. A free concert tracker with a yearly Wrapped recap.";
const URL = "https://concertly.lovable.app/concert-stats";

export const Route = createFileRoute("/concert-stats")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              name: TITLE,
              description: DESCRIPTION,
              url: URL,
            },
            {
              "@type": "SoftwareApplication",
              name: "Concertly",
              applicationCategory: "LifestyleApplication",
              operatingSystem: "Web",
              url: "https://concertly.lovable.app",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQ.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],
  }),
  component: ConcertStatsPage,
});

const FAQ = [
  {
    q: "How do I track the concerts I have been to?",
    a: "Log each show with a date, artist, and venue. Concertly enriches it with setlists, artist artwork, and location data, then turns your history into live music stats you can browse by year.",
  },
  {
    q: "What live music stats does Concertly calculate?",
    a: "Total shows, unique artists, top venues, top cities and countries, genre mix, hours lived live, ticket spend, shows per month and per day, longest and shortest shows, and year-over-year change.",
  },
  {
    q: "Is Concertly free?",
    a: "Yes. Logging shows, viewing your stats dashboard, generating your yearly Wrapped recap, and exporting your data are all free.",
  },
  {
    q: "Can I import concerts from a spreadsheet?",
    a: "Yes. Concertly supports CSV import so you can bring in an existing list of gigs, and CSV export so your concert history always stays yours.",
  },
  {
    q: "Can I compare my concert stats with friends?",
    a: "Add friends by username and compare totals side by side. If you both logged the same night, Concertly detects the shared show and links you on the concert page.",
  },
];

const STATS = [
  { icon: CalendarDays, label: "Shows attended", body: "Deduplicated by night, so a five-band lineup still counts as one show." },
  { icon: Music, label: "Unique artists", body: "Every headliner and opener you have seen, counted once each." },
  { icon: Clock, label: "Hours lived live", body: "Estimated stage time across your whole history, from setlist length." },
  { icon: MapPin, label: "Top venues", body: "Your home rooms ranked by how many nights you spent in them." },
  { icon: Globe2, label: "Cities and countries", body: "A map of everywhere your live music has taken you." },
  { icon: BarChart3, label: "Genre mix", body: "The proportional breakdown of what you actually go out to see." },
];

const STEPS = [
  { icon: Upload, title: "Log or import", body: "Add a show in seconds, or import your whole back catalogue from CSV." },
  { icon: Sparkles, title: "Get enriched data", body: "Setlists, artist images, and venue locations are attached automatically." },
  { icon: BarChart3, title: "Read your stats", body: "Dashboard and Insights break your history down by year, month, and day." },
  { icon: Share2, title: "Share your Wrapped", body: "Generate a year-in-review card and send it to friends with one link." },
];

function ConcertStatsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-hairline bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="font-display text-2xl font-extrabold tracking-tighter text-brand">
            CONCERTLY
          </Link>
          <Link
            to="/auth"
            className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-brand-foreground transition-all hover:scale-[1.03] active:scale-95"
          >
            Try Concertly
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <nav className="mb-8 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link to="/concert-stats" className="hover:text-foreground">
                Concert stats
              </Link>
            </li>
          </ol>
        </nav>

        <section>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Your live music stats, from every show you log
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Concertly is a free concert tracker that turns a list of gigs into a personal
            dashboard: shows attended, unique artists, top venues, cities, genre mix, and hours
            lived live, all broken down year by year.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground transition-all hover:scale-[1.03] active:scale-95"
            >
              Start tracking free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/blog/best-concert-trackers"
              className="inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Compare concert trackers
            </Link>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            The stats Concertly calculates
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {STATS.map((s) => (
              <div key={s.label} className="flex gap-4 rounded-2xl border border-hairline bg-surface p-5">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold">{s.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold tracking-tight">How concert tracking works</h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-hairline bg-surface p-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="font-display font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold tracking-tight">Beyond the numbers</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { icon: Trophy, title: "Badges and milestones", body: "First shows, venue streaks, and country counts unlock as you log." },
              { icon: Users, title: "Friends and shared nights", body: "Compare stats and see who else was in the room that night." },
              { icon: Share2, title: "Yearly Wrapped card", body: "A shareable recap of your standout venue, top artists, and genre mix." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-hairline bg-surface p-5">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand">
                  <c.icon className="h-4 w-4" />
                </div>
                <h3 className="font-display font-bold">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <h2 className="font-display text-2xl font-bold tracking-tight">Frequently asked questions</h2>
          <dl className="mt-6 space-y-5">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-1 text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-16">
          <div className="relative overflow-hidden rounded-3xl border border-hairline bg-gradient-to-br from-brand/25 via-surface to-teal/15 p-8 md:p-12">
            <div className="relative z-10 max-w-2xl">
              <h2 className="font-display text-3xl font-extrabold tracking-tight">
                Start your live music stats today
              </h2>
              <p className="mt-3 text-muted-foreground">
                Log your next gig, import the ones you already remember, and watch the dashboard
                fill in. Free, with CSV export whenever you want your data back.
              </p>
              <Link
                to="/auth"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground transition-all hover:scale-[1.03] active:scale-95"
              >
                Create your free account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
          </div>
        </section>
      </main>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
          <span className="font-display text-xl font-extrabold tracking-tighter text-brand">CONCERTLY</span>
          <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/trust" className="hover:text-foreground">Trust</Link>
            <Link to="/blog/best-concert-trackers" className="hover:text-foreground">Best concert trackers</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
