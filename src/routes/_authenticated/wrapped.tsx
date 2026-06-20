import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Share2 } from "lucide-react";
import { getStats, rankBy, uniqueShows, useConcerts, useProfile } from "@/lib/concerts";

export const Route = createFileRoute("/_authenticated/wrapped")({
  head: () => ({ meta: [{ title: "Your Wrapped · Concertly" }] }),
  component: Wrapped,
});

const YEAR = new Date().getFullYear();

function Wrapped() {
  const { data: profile } = useProfile();
  const { data: concerts = [] } = useConcerts();
  const yearConcerts = concerts.filter((c) => new Date(c.date).getFullYear() === YEAR);
  const yearShows = uniqueShows(yearConcerts);
  const stats = getStats(concerts);
  const topArtist = rankBy(yearConcerts, "artist", 1)[0];
  const topVenue = rankBy(yearShows, "venue", 1)[0];
  const topRated = [...yearConcerts].sort((a, b) => b.rating - a.rating)[0];

  if (yearConcerts.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Concertly Wrapped</p>
        <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight">No {YEAR} shows yet.</h1>
        <p className="mt-3 text-muted-foreground">Log a gig from this year to unlock your Wrapped.</p>
        <Link to="/add" className="mt-6 rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground">
          Log a show
        </Link>
      </main>
    );
  }

  const avgRating = yearConcerts.reduce((s, c) => s + c.rating, 0) / yearConcerts.length;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Concertly Wrapped</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">
            {YEAR} · {profile?.displayName ?? "You"}
          </h1>
        </div>
        <div className="hidden gap-2 md:flex">
          <button className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
          <button className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-gradient-to-br from-brand via-pink to-teal p-8 text-brand-foreground md:col-span-6 md:p-12">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Your year in numbers</p>
          <p className="mt-4 font-display text-7xl font-black leading-none md:text-9xl">{yearConcerts.length}</p>
          <p className="mt-3 font-display text-2xl font-extrabold md:text-3xl">
            shows. {new Set(yearConcerts.map((c) => c.artist)).size} artists. {new Set(yearConcerts.map((c) => c.city)).size} cities.
          </p>
          <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        </div>

        {topArtist && (
          <WrappedCard className="md:col-span-3" label="Your #1 artist" value={topArtist.name} sub={`${topArtist.count} shows this year`} tone="brand" />
        )}
        {topVenue && (
          <WrappedCard className="md:col-span-3" label="Most visited venue" value={topVenue.name} sub={`${topVenue.count} shows`} tone="teal" />
        )}

        <WrappedCard className="md:col-span-2" label="Hours lived live" value={stats.hoursLive.toString()} sub="and counting" tone="pink" />
        <WrappedCard className="md:col-span-2" label="Avg rating" value={avgRating.toFixed(2)} sub="out of 10" tone="brand" />
        {topRated && (
          <WrappedCard className="md:col-span-2" label="Highest rated" value={topRated.artist} sub={`${topRated.rating}/10 at ${topRated.venue}`} tone="teal" />
        )}

        <div className="rounded-3xl border border-hairline bg-card p-8 md:col-span-6">
          <h2 className="font-display text-2xl font-extrabold">Your highlight reel</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {yearConcerts.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center gap-4 rounded-xl border border-hairline bg-surface p-4">
                <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand to-teal font-display text-sm font-black text-brand-foreground">
                  {new Date(c.date).getDate()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.artist}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.venue} · {c.city}</p>
                </div>
                <span className="ml-auto font-display text-lg font-extrabold text-teal">{c.rating.toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-hairline bg-card p-8 text-center md:col-span-6">
          <h3 className="font-display text-2xl font-extrabold">The story keeps writing itself.</h3>
          <p className="mt-2 text-muted-foreground">Log your next show to keep the streak alive.</p>
          <Link to="/add" className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground hover:scale-[1.03] active:scale-95">
            Log a show
          </Link>
        </div>
      </div>
    </main>
  );
}

function WrappedCard({
  label, value, sub, tone, className = "",
}: { label: string; value: string; sub: string; tone: "brand" | "teal" | "pink"; className?: string }) {
  const ring = tone === "brand" ? "from-brand/25" : tone === "teal" ? "from-teal/25" : "from-pink/25";
  return (
    <div className={"relative overflow-hidden rounded-3xl border border-hairline bg-card p-8 " + className}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-3xl font-extrabold leading-tight md:text-4xl">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
      <div className={`pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-gradient-to-br ${ring} to-transparent blur-2xl`} />
    </div>
  );
}
