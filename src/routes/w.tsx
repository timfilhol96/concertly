import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import { getPublicWrappedShare } from "@/lib/wrapped-share.functions";
import type { WrappedSharePayload as SharePayload } from "@/lib/wrapped-share-types";
import { plural } from "@/lib/utils";
import { getWrappedTheme } from "@/lib/wrapped-themes";

const searchSchema = z.object({
  d: z.coerce.string().optional(),
  g: z.coerce.string().optional(),
  id: z.coerce.string().regex(/^[A-Za-z0-9_-]{8,32}$/).optional(),
  card: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

type WrappedSearch = z.infer<typeof searchSchema>;

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
  validateSearch: (s): WrappedSearch => {
    const parsed = searchSchema.safeParse(s);
    return parsed.success ? parsed.data : {};
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => {
    const { id } = deps as WrappedSearch;
    return id ? getPublicWrappedShare({ data: { id } }) : null;
  },
  head: ({ match, loaderData }) => {
    const p = loaderData?.payload ?? decode((match.search as { d?: string }).d);
    const title = p
      ? `${p.user ?? "A fan"}'s ${p.year} Wrapped · ${plural(p.shows, "show")}`
      : "Concertly Wrapped";
    return {
      meta: [
        { title },
        {
          name: "description",
          content: p
            ? `${plural(p.shows, "show")} · ${plural(p.artists, "artist")} · ${plural(p.venues, "venue")} · ${plural(p.cities, "city", "cities")}.`
            : "Your year in live music.",
        },
        { property: "og:title", content: title },
      ],
    };
  },
  component: SharedWrapped,
});

function SharedWrapped() {
  const { d, g, card } = Route.useSearch();
  const share = Route.useLoaderData();
  const p: SharePayload | null = share?.payload ?? decode(d);
  const gradient = getWrappedTheme(share?.gradient ?? g);
  const cardOnly = card === "1" || card === "true";

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
    <main className={`mx-auto max-w-5xl px-6 py-10 md:py-14 ${cardOnly ? "flex min-h-screen flex-col items-center justify-center" : ""}`}>
      {!cardOnly && (
        <>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Concertly Wrapped</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">
            {p.year} · {p.user ?? "A fan"}
          </h1>
        </>
      )}

      {/* HEADLINE */}
      <section
        className={`relative overflow-hidden rounded-3xl border border-hairline ${gradient.text} p-8 md:p-12 ${cardOnly ? "w-full max-w-3xl shadow-2xl" : "mt-8"}`}
        style={{ backgroundImage: gradient.bg }}
      >
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Year in numbers</p>
        <p className="mt-4 font-display text-7xl font-black leading-none md:text-9xl">{p.shows}</p>
        <p className="mt-3 font-display text-2xl font-extrabold md:text-3xl">
          {p.shows === 1 ? "show" : "shows"} · {plural(p.artists, "artist")} · {plural(p.venues, "venue")}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label={p.cities === 1 ? "City" : "Cities"} value={String(p.cities)} />
          <Stat label={p.countries === 1 ? "Country" : "Countries"} value={String(p.countries)} />
          <Stat label={p.hours === 1 ? "Hour live" : "Hours live"} value={String(p.hours)} />
          <Stat
            label="Ticket spend"
            value={p.ticketSpend && p.ticketSpend > 0 ? `$${Math.round(p.ticketSpend).toLocaleString()}` : "—"}
          />
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      </section>

      {cardOnly ? null : (
        <>
          {hasOnes && (
            <Section title="Your #1s">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {p.topVenue && (
                  <Card label="Favorite venue" value={p.topVenue} sub={p.topVenueCount ? plural(p.topVenueCount, "visit") : ""} tone="brand" />
                )}
                {p.topCity && (
                  <Card label="Favorite city" value={p.topCity} sub={p.topCityCount ? plural(p.topCityCount, "show") : ""} tone="teal" />
                )}
                {p.longestShow && (
                  <Card
                    label="Longest show"
                    value={p.longestShow.artist}
                    sub={`${plural(p.longestShow.songs, "song")} · ~${Math.round((p.longestShow.minutes / 60) * 10) / 10}h`}
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
                            {plural(g.count, "show")} · {g.pct}%
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
                    First time seeing — {plural(p.newArtists.length, "new artist")}
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
                    sub={`out of 10 across ${plural(p.totalRated ?? p.shows, "show")}`}
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
                  <Card label="Peak month" value={p.peakMonth} sub={p.peakMonthCount ? plural(p.peakMonthCount, "show") : ""} tone="brand" />
                )}
                {typeof p.avgPerMonth === "number" && (
                  <Card
                    label="Avg shows / active month"
                    value={p.avgPerMonth.toFixed(1)}
                    sub={p.monthsWithShows ? `across ${plural(p.monthsWithShows, "month")}` : ""}
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
        </>
      )}
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
