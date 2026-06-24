import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  d: z.string().optional(),
  g: z.string().optional(),
});

const GRADIENTS: Record<string, string> = {
  sunset: "from-brand via-pink to-teal",
  ocean: "from-teal via-brand to-pink",
  ember: "from-pink via-brand to-pink",
  noir: "from-slate-900 via-slate-700 to-slate-900",
  citrus: "from-yellow-400 via-pink to-brand",
};

type SharePayload = {
  year: number;
  user?: string;
  shows: number;
  artists: number;
  venues: number;
  cities: number;
  countries: number;
  hours: number;
  topVenue?: string;
  topCity?: string;
  topGenres?: string[];
};

function decode(d?: string): SharePayload | null {
  if (!d) return null;
  try {
    const b64 = d.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob !== "undefined" ? atob(b64) : Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(decodeURIComponent(escape(json))) as SharePayload;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/w")({
  validateSearch: (s) => searchSchema.parse(s),
  head: ({ match }) => {
    const p = decode((match.search as { d?: string }).d);
    const title = p
      ? `${p.user ?? "A fan"}'s ${p.year} Wrapped · ${p.shows} shows`
      : "Concertly Wrapped";
    return {
      meta: [
        { title },
        { name: "description", content: p ? `${p.shows} shows · ${p.artists} artists · ${p.venues} venues · ${p.cities} cities.` : "Your year in live music." },
        { property: "og:title", content: title },
      ],
    };
  },
  component: SharedWrapped,
});

function SharedWrapped() {
  const { d, g } = Route.useSearch();
  const p = decode(d);
  const gradient = GRADIENTS[g ?? "sunset"] ?? GRADIENTS.sunset;

  if (!p) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Concertly Wrapped</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">This Wrapped link is missing data.</h1>
        <Link to="/" className="mt-6 rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground">Go home</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <p className="text-xs font-bold uppercase tracking-widest text-brand">Concertly Wrapped</p>
      <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">
        {p.year} · {p.user ?? "A fan"}
      </h1>

      <section className={`relative mt-8 overflow-hidden rounded-3xl border border-hairline bg-gradient-to-br ${gradient} p-8 text-brand-foreground md:p-12`}>
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Year in numbers</p>
        <p className="mt-4 font-display text-7xl font-black leading-none md:text-9xl">{p.shows}</p>
        <p className="mt-3 font-display text-2xl font-extrabold md:text-3xl">
          shows · {p.artists} artists · {p.venues} venues
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Cities" value={String(p.cities)} />
          <Stat label="Countries" value={String(p.countries)} />
          <Stat label="Hours live" value={String(p.hours)} />
          <Stat label="Top city" value={p.topCity ?? "—"} />
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      </section>

      {(p.topVenue || (p.topGenres && p.topGenres.length > 0)) && (
        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {p.topVenue && (
            <div className="rounded-3xl border border-hairline bg-card p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Favorite venue</p>
              <p className="mt-2 font-display text-2xl font-extrabold">{p.topVenue}</p>
            </div>
          )}
          {p.topGenres && p.topGenres.length > 0 && (
            <div className="rounded-3xl border border-hairline bg-card p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top genres</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.topGenres.map((g) => (
                  <span key={g} className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold">{g}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="mt-10 rounded-3xl border border-hairline bg-card p-8 text-center">
        <h3 className="font-display text-2xl font-extrabold">Track your own live year.</h3>
        <p className="mt-2 text-muted-foreground">Log every show on Concertly and get your own Wrapped.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground hover:scale-[1.03] active:scale-95">
          Try Concertly
        </Link>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{label}</p>
      <p className="mt-1 font-display text-2xl font-black md:text-3xl">{value}</p>
    </div>
  );
}
