import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, TrendingUp } from "lucide-react";
import {
  genreBreakdown,
  getStats,
  monthlyHeatmap,
  monthlyStreak,
  rankBy,
  recentConcerts,
  uniqueShows,
} from "@/lib/concerts";
import { useFriendConcerts, useFriendships } from "@/lib/friends";
import { ConcertCard } from "@/routes/_authenticated/dashboard";
import { plural } from "@/lib/utils";
import { ctaClass } from "@/components/cta";

export const Route = createFileRoute("/_authenticated/friend/$id")({
  head: () => ({
    meta: [
      { title: "Friend · Concertly" },
      { name: "description", content: "View a friend's Concertly dashboard: their shows, top artists, venues and live music stats side by side with yours." },
    ],
  }),
  component: FriendDashboard,
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-extrabold">Couldn't load this friend</h1>
        <button
          onClick={() => { reset(); router.invalidate(); }}
          className={ctaClass({}, "mt-6")}
        >
          Retry
        </button>
      </main>
    );
  },
  notFoundComponent: () => (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="font-display text-2xl font-extrabold">Friend not found</h1>
      <Link to="/friends" className="mt-6 inline-block text-sm font-bold text-brand">← Back to Friends</Link>
    </main>
  ),
});

const YEAR = new Date().getFullYear();

function heatColor(count: number, max: number): string {
  if (count === 0) return "bg-surface-2";
  const ratio = max ? count / max : 0;
  if (ratio < 0.34) return "bg-teal/40";
  if (ratio < 0.67) return "bg-teal/70";
  return "bg-teal";
}

function FriendDashboard() {
  const { id } = Route.useParams();
  const { data: friendData, isLoading: friendsLoading } = useFriendships();
  const { data: concerts, isLoading: concertsLoading } = useFriendConcerts(id);

  const profile = friendData?.profiles?.[id];
  const isFriend = friendData?.friends?.some((f) => f.otherUserId === id) ?? false;

  if (friendsLoading || concertsLoading) return <LoadingState />;

  if (!isFriend || !profile) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Not available</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">You aren't friends with this user</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Send them a request to see their shows and stats.
        </p>
        <Link to="/friends" className={ctaClass({}, "mt-6")}>
          Back to Friends
        </Link>
      </main>
    );
  }

  const list = concerts ?? [];
  const shows = uniqueShows(list);
  const stats = getStats(list);
  const showStats = getStats(shows);
  const topArtists = rankBy(list, "artist", 6);
  const topVenues = rankBy(shows, "venue", 5);
  const topCities = rankBy(shows, "city", 4);
  const genres = genreBreakdown(shows);
  const months = monthlyHeatmap(shows, YEAR);
  const maxMonth = months.reduce((m, x) => Math.max(m, x.count), 0);
  const recent = recentConcerts(shows, 4);
  const inYear = list.filter((c) => new Date(c.date).getFullYear() === YEAR);
  const yearShows = uniqueShows(inYear).length;
  const yearArtists = new Set(inYear.map((c) => c.artist)).size;
  const yearCities = new Set(inYear.map((c) => c.city)).size;
  const streak = monthlyStreak(shows);

  const firstName = profile.displayName.split(" ")[0];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      <Link
        to="/friends"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Friends
      </Link>

      <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div className="animate-reveal">
          <p className="text-xs font-bold uppercase tracking-widest text-teal">Friend dashboard</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight md:text-6xl">
            {profile.displayName}
          </h1>
          {profile.username && (
            <p className="mt-2 font-mono text-sm text-muted-foreground">@{profile.username}</p>
          )}
          {list.length > 0 && (
            <p className="mt-3 text-muted-foreground md:text-lg">
              They've seen <span className="font-semibold text-foreground">{plural(yearArtists, "artist")}</span> across{" "}
              <span className="font-semibold text-foreground">{plural(yearCities, "city", "cities")}</span> in {YEAR}.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/shows"
            search={{ friendId: id }}
            className="rounded-full border border-hairline bg-card px-4 py-2 text-xs font-bold hover:border-brand"
          >
            Their shows →
          </Link>
          <Link
            to="/insights"
            search={{ friendId: id }}
            className="rounded-full border border-hairline bg-card px-4 py-2 text-xs font-bold hover:border-brand"
          >
            Their insights →
          </Link>
          <Link
            to="/friends"
            className="rounded-full border border-hairline bg-card px-4 py-2 text-xs font-bold hover:border-brand"
          >
            Compare with you →
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="grid min-h-[280px] place-items-center rounded-3xl border border-dashed border-hairline bg-card/50 p-10 text-center">
          <div>
            <p className="font-display text-xl font-extrabold">{firstName} hasn't logged any shows yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Their dashboard will fill in as they add gigs.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-hairline bg-hairline md:grid-cols-4">
            <BigStat label={`Shows in ${YEAR}`} value={yearShows} sub={`${showStats.total} all-time`} />
            <BigStat label="Unique artists" value={stats.uniqueArtists} sub="across all shows" />
            <BigStat label="Cities visited" value={stats.uniqueCities} sub={plural(stats.uniqueCountries, "country", "countries")} />
            <BigStat label="Monthly streak" value={streak.current} sub={`longest ${streak.longest}`} />
          </div>

          <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-3xl border border-hairline bg-card p-8 md:col-span-2">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-extrabold">Yearly Attendance</h2>
                  <p className="text-xs text-muted-foreground">{plural(yearShows, "show")} in {YEAR}</p>
                </div>
              </div>
              <div className="grid grid-cols-6 gap-3 md:grid-cols-12">
                {months.map((m) => (
                  <div
                    key={m.key}
                    className={`flex aspect-square flex-col items-center justify-center rounded-xl ${heatColor(m.count, maxMonth)}`}
                    title={`${m.label} ${YEAR}: ${plural(m.count, "show")}`}
                  >
                    <span className="eyebrow text-foreground/70">{m.label}</span>
                    <span className="font-display text-xl font-extrabold">{m.count}</span>
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute right-6 top-4 font-display text-[10rem] font-black leading-none opacity-[0.04]">
                {YEAR}
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-3xl border border-hairline bg-card p-8">
              <div>
                <h2 className="font-display text-2xl font-extrabold">Their #1 Artist</h2>
                {topArtists[0] ? (
                  <div className="mt-6 flex items-center gap-4">
                    {(() => {
                      const c = list.find((c) => c.artist === topArtists[0].name && c.artistImageUrl);
                      return c?.artistImageUrl ? (
                        <img src={c.artistImageUrl} alt={topArtists[0].name} className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover" />
                      ) : (
                        <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal to-pink font-display text-2xl font-black text-brand-foreground">
                          {topArtists[0].name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="text-xl font-bold leading-tight">{topArtists[0].name}</h3>
                      <p className="text-sm text-muted-foreground">{plural(topArtists[0].count, "show")} attended</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-muted-foreground">No artist data yet.</p>
                )}
              </div>
              <div className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-gradient-to-r from-teal to-pink" style={{ width: "85%" }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="space-y-5 lg:col-span-3">
              <h3 className="font-display text-xl font-extrabold">Recent Memories</h3>
              {recent.map((c) => (
              <ConcertCard
                  key={c.id}
                  artist={c.artist}
                  tour={c.tour ?? undefined}
                  date={c.date}
                  venue={c.venue}
                  city={c.city}
                  rating={c.rating}
                  notes={c.notes ?? undefined}
                  imageUrl={c.artistImageUrl ?? undefined}
                  concertId={c.id}
                  isReadOnly
                />
              ))}
            </div>

            <aside className="space-y-10">
              <Panel title="Top Genres">
                <div className="space-y-3">
                  {genres.slice(0, 5).map((g, i) => (
                    <div key={g.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>{g.name}</span>
                        <span className="text-muted-foreground">{g.pct}%</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${g.pct}%`,
                            backgroundColor: ["var(--teal)", "var(--brand)", "var(--pink)", "var(--chart-4)", "var(--chart-5)"][i % 5],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Top Venues">
                <ul className="space-y-3">
                  {topVenues.map((v, i) => (
                    <li key={v.name} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="truncate text-sm">{v.name}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground">{plural(v.count, "show")}</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="Top Cities">
                <ul className="space-y-3">
                  {topCities.map((v, i) => (
                    <li key={v.name} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="truncate text-sm">{v.name}</span>
                      <span className="ml-auto text-[11px] text-muted-foreground">{plural(v.count, "show")}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </aside>
          </div>
        </>
      )}
    </main>
  );
}

function LoadingState() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-20">
      <div className="animate-pulse space-y-6">
        <div className="h-12 w-72 rounded-xl bg-surface-2" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface-2" />
          ))}
        </div>
        <div className="h-72 rounded-3xl bg-surface-2" />
      </div>
    </main>
  );
}

function BigStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-card p-6 md:p-8">
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl font-extrabold md:text-5xl">{value.toLocaleString()}</p>
      {sub && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <TrendingUp className="h-3 w-3" /> {sub}
        </p>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
