import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import { getPublicWrappedShare } from "@/lib/wrapped-share.functions";
import type { WrappedSharePayload as SharePayload } from "@/lib/wrapped-share-types";

type WrappedSearch = z.infer<typeof searchSchema>;

const searchSchema = z.object({
  d: z.string().optional(),
  g: z.string().optional(),
  id: z.string().regex(/^[A-Za-z0-9_-]{8,32}$/).optional(),
});

const GRADIENTS: Record<string, { cls: string; text: string }> = {
  sunset: { cls: "from-brand via-pink to-teal", text: "text-brand-foreground" },
  ocean: { cls: "from-teal via-brand to-pink", text: "text-brand-foreground" },
  ember: { cls: "from-pink via-brand to-pink", text: "text-brand-foreground" },
  noir: { cls: "from-slate-900 via-slate-700 to-slate-900", text: "text-white" },
  citrus: { cls: "from-yellow-400 via-pink to-brand", text: "text-brand-foreground" },
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
  loaderDeps: ({ search }) => search,
  loader: ({ deps }: { deps: WrappedSearch }) =>
    deps.id ? getPublicWrappedShare({ data: { id: deps.id } }) : null,
  head: ({ match, loaderData }) => {
    const p = loaderData?.payload ?? decode((match.search as { d?: string }).d);
    const title = p
      ? `${p.user ?? "A fan"}'s ${p.year} Wrapped · ${p.shows} shows`
      : "Concertly Wrapped";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: p
            ? `${p.shows} shows · ${p.artists} artists · ${p.venues} venues · ${p.cities} cities.`
            : "Your year in live music.",
        },
        { property: "og:title", content: title },
      ],
    };
  },
  component: SharedWrapped,
});

function SharedWrapped() {
  const { d, g } = Route.useSearch();
  const share = Route.useLoaderData();
  const p: SharePayload | null = share?.payload ?? decode(d);
  const gradient = GRADIENTS[share?.gradient ?? g ?? "sunset"] ?? GRADIENTS.sunset;

  if (!p) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">Concertly Wrapped</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">
          This Wrapped link is missing data.
        </h1>
        <Link to="/" className="mt-6 rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground">
          Go home
        </Link>
      </main>
    );
  }

  const hasOnes = p.topVenue || p.topCity || p.longestShow;
  const hasTaste = (p.topGenres && p.topGenres.length > 0) || (p.discoveredGenres && p.discoveredGenres.length > 0);
  const hasFirsts = p.firstShow || p.lastShow || (p.newArtists && p.newArtists.length > 0);
  const hasVibe = typeof p.avgRating === "number" || p.topRated;
  const hasPatterns = p.peakWeekday || p.peakMonth || typeof p.avgPerMonth === "number";

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      <p className="text-xs font-bold uppercase tracking-widest text-brand">Concertly Wrapped</p>
      <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">
        {p.year} · {p.user ?? "A fan"}
      </h1>

      {/* HEADLINE */}
      <section
        className={`relative mt-8 overflow-hidden rounded-3xl border border-hairline bg-gradient-to-br ${gradient.cls} ${gradient.text} p-8 md:p-12`}
      >
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Year in numbers</p>
        <p className="mt-4 font-display text-7xl font-black leading-none md:text-9xl">{p.shows}</p>
        <p className="mt-3 font-display text-2xl font-extrabold md:text-3xl">
          shows · {p.artists} artists · {p.venues} venues
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Cities" value={String(p.cities)} />
          <Stat label="Countries" value={String(p.countries)} />
          <Stat label="Hours live" value={String(p.hours)} />
          <Stat
            label="Ticket spend"
            value={p.ticketSpend && p.ticketSpend > 0 ? `$${Math.round(p.ticketSpend).toLocaleString()}` : "—"}
          />
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      </section>

      {hasOnes && (
        <Section title="Your #1s">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {p.topVenue && (
              <Card label="Favorite venue" value={p.topVenue} sub={p.topVenueCount ? `${p.topVenueCount} visits` : ""} tone="brand" />
            )}
            {p.topCity && (
              <Card label="Favorite city" value={p.topCity} sub={p.topCityCount ? `${p.topCityCount} shows` : ""} tone="teal" />
            )}
            {p.longestShow && (
              <Card
                label="Longest show"
                value={p.longestShow.artist}
                sub={`${p.longestShow.songs} songs · ~${Math.round((p.longestShow.minutes / 60) * 10) / 10}h`}
                tone="pink"
              />
            )}
          </div>
        </Section>
      )}

      {hasTaste && (
        <Section title="Taste & genre">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {p.topGenres && p.topGenres.length > 0 && (
              <div className="rounded-3xl border border-hairline bg-card p-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top genres live</p>
                <ol className="mt-4 space-y-3">
                  {p.topGenres.map((g, i) => (
                    <li key={g.name} className="flex items-baseline gap-3">
                      <span className="font-display text-2xl font-black text-brand">{i + 1}</span>
                      <span className="font-display text-xl font-extrabold">{g.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {g.count} shows · {g.pct}%
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {p.discoveredGenres && p.discoveredGenres.length > 0 && (
              <div className="rounded-3xl border border-hairline bg-card p-8">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Discovered live this year
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.discoveredGenres.map((gen) => (
                    <span key={gen} className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold">
                      {gen}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {hasFirsts && (
        <Section title="Firsts & milestones">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {p.firstShow && <Milestone label="First show of the year" show={p.firstShow} />}
            {p.lastShow && <Milestone label="Last show of the year" show={p.lastShow} />}
          </div>
          {p.newArtists && p.newArtists.length > 0 && (
            <div className="mt-6 rounded-3xl border border-hairline bg-card p-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                First time seeing — {p.newArtists.length} new artists
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.newArtists.map((a) => (
                  <span key={a} className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {hasVibe && (
        <Section title="Crowd & vibe">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {typeof p.avgRating === "number" && (
              <Card
                label="Average rating"
                value={p.avgRating.toFixed(2)}
                sub={`out of 10 across ${p.totalRated ?? p.shows} shows`}
                tone="brand"
              />
            )}
            {p.topRated && (
              <Card
                label="Highest rated show"
                value={p.topRated.artist}
                sub={`${p.topRated.rating}/10${p.topRated.venue ? ` · ${p.topRated.venue}` : ""}${p.topRated.city ? `, ${p.topRated.city}` : ""}`}
                tone="teal"
              />
            )}
          </div>
        </Section>
      )}

      {hasPatterns && (
        <Section title="Patterns & personality">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {p.peakWeekday && (
              <Card label="Concert weekday" value={p.peakWeekday} sub={`a ${p.peakWeekday}-night person`} tone="pink" />
            )}
            {p.peakMonth && (
              <Card label="Peak month" value={p.peakMonth} sub={p.peakMonthCount ? `${p.peakMonthCount} shows` : ""} tone="brand" />
            )}
            {typeof p.avgPerMonth === "number" && (
              <Card
                label="Avg shows / active month"
                value={p.avgPerMonth.toFixed(1)}
                sub={p.monthsWithShows ? `across ${p.monthsWithShows} months` : ""}
                tone="teal"
              />
            )}
          </div>
        </Section>
      )}

      <div className="mt-10 rounded-3xl border border-hairline bg-card p-8 text-center">
        <h3 className="font-display text-2xl font-extrabold">Track your own live year.</h3>
        <p className="mt-2 text-muted-foreground">Log every show on Concertly and get your own Wrapped.</p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground hover:scale-[1.03] active:scale-95"
        >
          Try Concertly
        </Link>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h2>
      {children}
    </section>
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

function Card({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "brand" | "teal" | "pink";
}) {
  const ring = tone === "brand" ? "from-brand/25" : tone === "teal" ? "from-teal/25" : "from-pink/25";
  return (
    <div className="relative overflow-hidden rounded-3xl border border-hairline bg-card p-8">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-3xl font-extrabold leading-tight md:text-4xl">{value}</p>
      {sub && <p className="mt-2 text-xs text-muted-foreground">{sub}</p>}
      <div
        className={`pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-gradient-to-br ${ring} to-transparent blur-2xl`}
      />
    </div>
  );
}

function Milestone({ label, show }: { label: string; show: NonNullable<SharePayload["firstShow"]> }) {
  return (
    <div className="rounded-3xl border border-hairline bg-card p-8">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-2xl font-extrabold">{show.artist}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {show.date ? new Date(show.date).toLocaleDateString("en", { dateStyle: "medium" }) : ""}
        {show.venue ? ` · ${show.venue}` : ""}
        {show.city ? `, ${show.city}` : ""}
      </p>
    </div>
  );
}
