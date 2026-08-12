import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Calendar, Check, Music, Share2, Smartphone, Ticket, X } from "lucide-react";

export const Route = createFileRoute("/blog/best-concert-trackers")({
  head: () => ({
    meta: [
      { title: "Best Concert Tracker Apps in 2026 · Compared" },
      {
        name: "description",
        content:
          "Compare the best concert tracker apps of 2026: Concertly, Setlist.fm, Songkick and more for logging gigs, setlists, stats and yearly recaps.",
      },
      {
        property: "og:title",
        content: "Best Concert Tracker Apps in 2026 · Compared",
      },
      {
        property: "og:description",
        content:
          "Compare the best concert tracker apps for logging shows, setlists, stats, and shareable recaps.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://concertly.lovable.app/blog/best-concert-trackers" },
    ],
    links: [
      { rel: "canonical", href: "https://concertly.lovable.app/blog/best-concert-trackers" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Best Concert Tracker Apps (2026) — Concertly vs Setlist.fm, Songkick & More",
          url: "https://concertly.lovable.app/blog/best-concert-trackers",
          author: { "@type": "Organization", name: "Concertly" },
          publisher: { "@type": "Organization", name: "Concertly", logo: "https://concertly.lovable.app/favicon.ico" },
          datePublished: "2026-08-11",
          dateModified: "2026-08-11",
        }),
      },
    ],
  }),
  component: BestConcertTrackers,
});

const APPS = [
  {
    name: "Concertly",
    tagline: "The personal stats.fm for live music",
    log: true,
    setlists: true,
    stats: true,
    wrapped: true,
    social: true,
    export: true,
    price: "Free",
    bestFor: "Music fans who want personal stats, Wrapped-style recaps, and friend leaderboards",
  },
  {
    name: "Setlist.fm",
    tagline: "Crowd-sourced setlist archive",
    log: false,
    setlists: true,
    stats: false,
    wrapped: false,
    social: false,
    export: false,
    price: "Free / Pro",
    bestFor: "Looking up what a band played at a specific show",
  },
  {
    name: "Songkick",
    tagline: "Concert discovery and tour tracking",
    log: false,
    setlists: false,
    stats: false,
    wrapped: false,
    social: false,
    export: false,
    price: "Free",
    bestFor: "Finding upcoming concerts in your city",
  },
  {
    name: "Concert Archives",
    tagline: "A database of historic concerts",
    log: true,
    setlists: true,
    stats: false,
    wrapped: false,
    social: false,
    export: false,
    price: "Free",
    bestFor: "Researching tour history and venue archives",
  },
  {
    name: "Jukely / Songkick Premium",
    tagline: "Ticket subscriptions and discovery",
    log: false,
    setlists: false,
    stats: false,
    wrapped: false,
    social: false,
    export: false,
    price: "Subscription",
    bestFor: "Accessing ticket deals and discovery-driven subscriptions",
  },
];

function BestConcertTrackers() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
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
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link to="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li>
              <Link to="/blog/best-concert-trackers" className="hover:text-foreground">
                Best concert trackers
              </Link>
            </li>
          </ol>
        </nav>

        <article>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Best concert tracker apps in 2026
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            A side-by-side look at the tools music fans use to remember every gig. Whether you want
            setlists, stats, or a year-in-review card, here's how Concertly, Setlist.fm, Songkick,
            and others compare.
          </p>

          {/* Quick takeaways */}
          <section className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { icon: BarChart3, title: "Personal stats", body: "See your top artists, venues, and live hours over time." },
              { icon: Calendar, title: "Log shows fast", body: "Add a date, artist, and venue. Import from CSV or Spotify." },
              { icon: Share2, title: "Shareable recaps", body: "A Wrapped-style card for every year you went to shows." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-hairline bg-surface p-5">
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand/15 text-brand">
                  <item.icon className="h-4 w-4" />
                </div>
                <h3 className="font-display text-base font-bold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </section>

          {/* Comparison table */}
          <section className="mt-16">
            <h2 className="font-display text-2xl font-bold tracking-tight">Concert tracker comparison</h2>
            <p className="mt-2 text-muted-foreground">
              We compared the leading apps across the features that matter most to live music fans.
            </p>

            <div className="mt-6 overflow-hidden rounded-2xl border border-hairline">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hairline bg-surface text-left">
                      <th className="px-4 py-3 font-semibold">App</th>
                      <th className="px-4 py-3 font-semibold">Log shows</th>
                      <th className="px-4 py-3 font-semibold">Setlists</th>
                      <th className="px-4 py-3 font-semibold">Personal stats</th>
                      <th className="px-4 py-3 font-semibold">Year-in-review</th>
                      <th className="px-4 py-3 font-semibold">Export</th>
                      <th className="px-4 py-3 font-semibold">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {APPS.map((app) => (
                      <tr key={app.name} className={app.name === "Concertly" ? "bg-brand/5" : undefined}>
                        <td className="px-4 py-3 font-semibold">
                          {app.name === "Concertly" ? (
                            <span className="text-brand">{app.name}</span>
                          ) : (
                            app.name
                          )}
                        </td>
                        <td className="px-4 py-3">{app.log ? <Check className="h-4 w-4 text-teal" /> : <X className="h-4 w-4 text-muted-foreground" />}</td>
                        <td className="px-4 py-3">{app.setlists ? <Check className="h-4 w-4 text-teal" /> : <X className="h-4 w-4 text-muted-foreground" />}</td>
                        <td className="px-4 py-3">{app.stats ? <Check className="h-4 w-4 text-teal" /> : <X className="h-4 w-4 text-muted-foreground" />}</td>
                        <td className="px-4 py-3">{app.wrapped ? <Check className="h-4 w-4 text-teal" /> : <X className="h-4 w-4 text-muted-foreground" />}</td>
                        <td className="px-4 py-3">{app.export ? <Check className="h-4 w-4 text-teal" /> : <X className="h-4 w-4 text-muted-foreground" />}</td>
                        <td className="px-4 py-3 text-muted-foreground">{app.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* App breakdowns */}
          <section className="mt-16 space-y-10">
            <h2 className="font-display text-2xl font-bold tracking-tight">How each app works</h2>

            <div className="space-y-8">
              <AppSection
                name="Concertly"
                summary="Built for fans who want more than a list. Concertly turns every logged show into personal stats: top artists, top venues, cities, countries, genre mix, and hours lived live. It also generates a shareable, Wrapped-style recap each year and lets you compare stats with friends."
                pros={["Personal stats and dashboards", "Year-in-review cards", "Friend leaderboards and shared-show detection", "CSV import and Spotify playlist creation", "Free during open beta"]}
                cons={["Newer database than Setlist.fm", "Setlist lookup depends on third-party data"]}
                cta
              />
              <AppSection
                name="Setlist.fm"
                summary="The largest crowd-sourced setlist archive on the web. If you want to know what a band played on a specific night, this is usually the answer. It is less focused on personal tracking and stats, but excellent for reference."
                pros={["Huge setlist archive", "Tour and festival pages", "Active community edits"]}
                cons={["No personal stats", "No year-in-review", "Not designed as a diary"]}
              />
              <AppSection
                name="Songkick"
                summary="Songkick is primarily a discovery engine. It tracks your favorite artists and tells you when they announce shows near you. It is great for planning future concerts, but not for archiving past ones."
                pros={["Excellent upcoming show alerts", "Wide artist coverage", "Calendar and ticket links"]}
                cons={["Limited show logging", "No personal stats or recaps", "No setlist focus"]}
              />
              <AppSection
                name="Concert Archives"
                summary="A community-driven database of historic concerts. It is useful for researching tours, venues, and lineups, but the interface is more database than diary."
                pros={["Deep historical archive", "Venue and tour pages", "Setlist information"]}
                cons={["No personal stats dashboard", "No social or friend features", "No export or Wrapped recap"]}
              />
              <AppSection
                name="Jukely / Songkick Premium"
                summary="These services focus on tickets and discovery rather than memory-keeping. Jukely was known for subscription ticket access, while Songkick Premium adds advanced alerts and recommendations."
                pros={["Ticket deals and discovery", "Artist recommendations"]}
                cons={["Not a personal archive", "No stats or recaps", "Subscription cost for full value"]}
              />
            </div>
          </section>

          {/* What to look for */}
          <section className="mt-16">
            <h2 className="font-display text-2xl font-bold tracking-tight">What to look for in a concert tracker</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                { icon: Ticket, title: "Fast show logging", body: "You should be able to add a show in seconds without typing every opener or song." },
                { icon: Music, title: "Setlist integration", body: "A good tracker pulls setlists so you remember what was played, not just where you were." },
                { icon: BarChart3, title: "Personal stats", body: "Total shows, unique artists, cities, venues, and genre mix help you see your live music identity." },
                { icon: Share2, title: "Shareable recaps", body: "A yearly Wrapped-style card makes it easy to celebrate your year with friends." },
                { icon: Smartphone, title: "Mobile-friendly", body: "Most logging happens at the venue or on the way home, so the interface must work on a phone." },
                { icon: Check, title: "Data portability", body: "CSV export means your concert history stays yours even if the app changes." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 rounded-2xl border border-hairline bg-surface p-5">
                  <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-16">
            <h2 className="font-display text-2xl font-bold tracking-tight">Frequently asked questions</h2>
            <dl className="mt-6 space-y-5">
              <div>
                <dt className="font-semibold">What is the best app for tracking concerts I've attended?</dt>
                <dd className="mt-1 text-muted-foreground">
                  For personal archiving, stats, and recaps, Concertly is designed specifically for that
                  use case. For pure setlist lookup, Setlist.fm remains the gold standard.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Is Setlist.fm good for tracking my own shows?</dt>
                <dd className="mt-1 text-muted-foreground">
                  Setlist.fm is primarily a reference database. You can mark shows you attended, but it
                  does not generate personal stats, year-in-review cards, or friend comparisons.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Can I import my existing concert data?</dt>
                <dd className="mt-1 text-muted-foreground">
                  Concertly supports CSV import, so you can bring in spreadsheets from Setlist.fm
                  exports, Songkick lists, or your own notes.
                </dd>
              </div>
              <div>
                <dt className="font-semibold">What makes a concert tracker different from a music journal?</dt>
                <dd className="mt-1 text-muted-foreground">
                  A music journal is narrative. A concert tracker is structured: dates, venues,
                  setlists, artists, ratings, and stats that can be compared and shared.
                </dd>
              </div>
            </dl>
          </section>

          {/* CTA */}
          <section className="mt-16">
            <div className="relative overflow-hidden rounded-3xl border border-hairline bg-gradient-to-br from-brand/25 via-surface to-teal/15 p-8 md:p-12">
              <div className="relative z-10 max-w-2xl">
                <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                  Start your live music archive
                </h2>
                <p className="mt-3 text-lg text-muted-foreground">
                  Log your first show, import your history, and see your personal touring stats in
                  seconds.
                </p>
                <Link
                  to="/auth"
                  className="mt-6 group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-bold text-background transition-transform hover:scale-[1.03] active:scale-95"
                >
                  Try Concertly free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-teal/20 blur-3xl" />
            </div>
          </section>
        </article>
      </main>

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

function AppSection({
  name,
  summary,
  pros,
  cons,
  cta = false,
}: {
  name: string;
  summary: string;
  pros: string[];
  cons: string[];
  cta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6">
      <h3 className="font-display text-xl font-bold">{name}</h3>
      <p className="mt-2 text-muted-foreground">{summary}</p>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-teal">Pros</p>
          <ul className="mt-2 space-y-1">
            {pros.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-red-400">Cons</p>
          <ul className="mt-2 space-y-1">
            {cons.map((c) => (
              <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {cta && (
        <Link
          to="/auth"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-foreground transition-all hover:scale-[1.03] active:scale-95"
        >
          Try Concertly free <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
