import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Children, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { cn, formatDuration, plural } from "@/lib/utils";
import { ArrowUpRight, Award, CalendarClock, Clock, Star, TrendingUp, Users } from "lucide-react";
import {
  attendedOnly,
  genreBreakdown,
  getConcertAge,
  getStats,
  monthlyHeatmap,
  monthlyStreak,
  rankBy,
  recentConcerts,
  uniqueShows,
  useConcerts,
  useProfile,
} from "@/lib/concerts";
import { computeBadges, onThisDay } from "@/lib/badges";
import { useFriendships } from "@/lib/friends";
import { useConcertMedia, useSignedMediaUrl, type ConcertMediaItem } from "@/lib/concert-media";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ctaClass } from "@/components/cta";
import { PageTitle } from "@/components/page-title";
import { IconTip } from "@/components/icon-tip";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Concertly" },
      { name: "description", content: "Your personal live music dashboard." },
    ],
  }),
  component: Dashboard,
});

const YEAR = new Date().getFullYear();
// Recent memories shown on small screens; on desktop the list grows to match
// the sidebar's height, up to MAX_RECENT.
const MIN_RECENT = 4;
const MAX_RECENT = 12;

function heatColor(count: number, max: number): string {
  if (count === 0) return "bg-surface-2";
  const ratio = max ? count / max : 0;
  if (ratio < 0.34) return "bg-brand/40";
  if (ratio < 0.67) return "bg-brand/70";
  return "bg-brand";
}

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: concerts, isLoading } = useConcerts();
  const { data: friendships } = useFriendships();
  const friendCount = friendships?.friends.length ?? 0;
  const nav = useNavigate();
  const asideRef = useRef<HTMLElement>(null);
  // Derived stats cluster venue/city spellings (pairwise comparisons), so only
  // recompute when the concerts change, not on every re-render.
  const derived = useMemo(() => {
    if (!concerts || concerts.length === 0) return null;
    const shows = uniqueShows(concerts);
    const showStats = getStats(shows);

    const topArtists = rankBy(concerts, "artist", 6);
    const topVenues = rankBy(shows, "venue", 5);
    const topCities = rankBy(shows, "city", 4);
    const genres = genreBreakdown(shows);
    const months = monthlyHeatmap(shows, YEAR);
    const maxMonth = months.reduce((m, x) => Math.max(m, x.count), 0);
    const recent = recentConcerts(shows, MAX_RECENT);
    const inYear = concerts.filter((c) => new Date(c.date).getFullYear() === YEAR);
    const yearShows = uniqueShows(inYear).length;
    const yearArtists = new Set(inYear.map((c) => c.artist)).size;
    const yearCities = new Set(inYear.map((c) => c.city)).size;
    const streak = monthlyStreak(shows);
    const badges = computeBadges(concerts);
    const onThisDayShows = onThisDay(concerts);
    return {
      shows,
      showStats,
      topArtists,
      topVenues,
      topCities,
      genres,
      months,
      maxMonth,
      recent,
      yearShows,
      yearArtists,
      yearCities,
      streak,
      badges,
      onThisDayShows,
    };
  }, [concerts]);

  if (isLoading || !concerts) return <LoadingState />;
  if (concerts.length === 0) return <EmptyState name={profile?.displayName ?? "you"} />;

  const {
    shows,
    showStats,
    topArtists,
    topVenues,
    topCities,
    genres,
    months,
    maxMonth,
    recent,
    yearShows,
    yearArtists,
    yearCities,
    streak,
    badges,
    onThisDayShows,
  } = derived!;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <PageTitle
          eyebrow="Welcome back"
          title={<>Hello, {(profile?.displayName ?? "friend").split(" ")[0]}.</>}
          description={
            <>
              You've seen <span className="font-semibold text-foreground">{plural(yearArtists, "artist")}</span>{" "}
              across <span className="font-semibold text-foreground">{plural(yearCities, "city", "cities")}</span> in{" "}
              {YEAR}.
            </>
          }
        />
        <div className="grid grid-cols-3 gap-3 animate-reveal">
          <Stat label="Concert Age" value={`${getConcertAge(shows)} yrs`} accent="brand" />
          <Stat label="Hours live" value={formatDuration(showStats.hoursLive)} accent="pink" />
          <Stat label="Avg Rating" value={showStats.avgRating.toFixed(1)} accent="teal" />
        </div>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-hairline bg-hairline md:grid-cols-5">
        <BigStat label={`Shows in ${YEAR}`} value={yearShows} sub={`${showStats.total} all-time`} />
        <BigStat label="Unique artists" value={new Set(attendedOnly(concerts).map((c) => c.artist)).size} sub="across all shows" />
        <BigStat
          label="Cities visited"
          value={showStats.uniqueCities}
          sub={plural(showStats.uniqueCountries, "country", "countries")}
        />
        <BigStat label="Monthly streak" value={streak.current} sub={`longest ${streak.longest}`} />

        <Link to="/friends" className="bg-card p-6 transition-colors hover:bg-surface-2 md:p-8">
          <p className="flex items-center gap-1.5 eyebrow text-muted-foreground">
            <Users className="h-3 w-3" /> Friends
          </p>
          <p className="mt-2 font-display text-4xl font-extrabold md:text-5xl">
            {friendCount.toLocaleString()}
          </p>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <ArrowUpRight className="h-3 w-3" />{" "}
            {friendCount === 0 ? "add your first" : "manage friends"}
          </p>
        </Link>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl border border-hairline bg-card p-8 md:col-span-2">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Yearly Attendance</h2>
              <p className="text-xs text-muted-foreground">
                {plural(yearShows, "show")} in {YEAR} · click a month to see them
              </p>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-3 md:grid-cols-12">
            {months.map((m) => (
              <IconTip key={m.key} label={`${m.label} ${YEAR}: ${plural(m.count, "show")}`}>
                <button
                  type="button"
                  disabled={m.count === 0}
                  onClick={() => nav({ to: "/shows", search: { month: m.key } })}
                  className={`group flex aspect-square flex-col items-center justify-center rounded-xl ${heatColor(m.count, maxMonth)} transition-transform hover:scale-105 disabled:cursor-default disabled:hover:scale-100`}
                  aria-label={`${m.label} ${YEAR}: ${plural(m.count, "show")}. View shows`}
                >
                  <span className="eyebrow text-foreground/70">
                    {m.label}
                  </span>
                  <span className="font-display text-xl font-extrabold">{m.count}</span>
                </button>
              </IconTip>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>Quiet</span>
            <div className="flex gap-1">
              <div className="h-3 w-3 rounded-sm bg-surface-2" />
              <div className="h-3 w-3 rounded-sm bg-brand/40" />
              <div className="h-3 w-3 rounded-sm bg-brand/70" />
              <div className="h-3 w-3 rounded-sm bg-brand" />
            </div>
            <span>Packed</span>
          </div>
          <div className="pointer-events-none absolute right-6 top-4 font-display text-[10rem] font-black leading-none opacity-[0.04]">
            {YEAR}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-hairline bg-card p-8">
          <div>
            <h2 className="font-display text-2xl font-bold">Your #1 Artist</h2>
            {topArtists[0] ? (
              <div className="mt-6 flex items-center gap-4">
                {(() => {
                  const c = concerts.find(
                    (c) => c.artist === topArtists[0].name && c.artistImageUrl,
                  );
                  return c?.artistImageUrl ? (
                    <img
                      src={c.artistImageUrl}
                      alt={topArtists[0].name}
                      className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-16 flex-shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-pink font-display text-2xl font-black text-brand-foreground">
                      {topArtists[0].name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  );
                })()}
                <div>
                  <h3 className="text-xl font-bold leading-tight">{topArtists[0].name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plural(topArtists[0].count, "show")} attended
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">Log a show to find out.</p>
            )}
          </div>
          {topArtists[0] &&
            showStats.total > 0 &&
            (() => {
              const share = Math.min(
                100,
                Math.round((topArtists[0].count / showStats.total) * 100),
              );
              return (
                <div className="mt-8">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-pink transition-all"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {share}% of your logged shows
                  </p>
                </div>
              );
            })()}
        </div>
      </div>

      {onThisDayShows.length > 0 && (
        <div className="mb-10 rounded-3xl border border-hairline bg-card p-6 md:p-8">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand" />
            <p className="eyebrow text-muted-foreground">
              On this day
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {onThisDayShows.slice(0, 6).map((c) => {
              const yearsAgo = new Date().getFullYear() - new Date(c.date).getFullYear();
              return (
                <Link
                  key={c.id}
                  to="/show/$id"
                  params={{ id: c.id }}
                  className="rounded-2xl border border-hairline bg-surface p-4 transition-colors hover:border-brand/40"
                >
                  <p className="eyebrow text-brand">
                    {plural(yearsAgo, "year")} ago
                  </p>
                  <h3 className="mt-1 truncate font-display text-lg font-bold">{c.artist}</h3>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {c.venue} · {c.city}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="flex flex-col gap-5 lg:col-span-3">
          <div className="flex items-end justify-between">
            <h3 className="font-display text-xl font-bold">Recent Memories</h3>
            <Link to="/shows" className="text-xs font-semibold text-brand hover:underline">
              View all →
            </Link>
          </div>
          <RecentMemories asideRef={asideRef}>
          {recent.map((c) => (
            <Link key={c.id} to="/show/$id" params={{ id: c.id }} className="block">
              <ConcertCard
                artist={c.artist}
                tour={c.tour ?? undefined}
                date={c.date}
                venue={c.venue}
                city={c.city}
                rating={c.rating}
                notes={c.notes ?? undefined}
                imageUrl={c.artistImageUrl ?? undefined}
                concertId={c.id}
                ownerId={profile?.userId}
              />
            </Link>
          ))}
          </RecentMemories>
        </div>

        <aside ref={asideRef} className="space-y-10 self-start">
          <Panel title="Top Genres">
            <div className="space-y-3">
              {genres.slice(0, 5).map((g, i) => (
                <div key={g.name} className="space-y-1.5">
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate">{g.name}</span>
                    <span className="shrink-0 whitespace-nowrap text-muted-foreground">
                      {plural(g.count, "show")} ({g.pct}%)
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${g.pct}%`,
                        backgroundColor: [
                          "var(--brand)",
                          "var(--teal)",
                          "var(--pink)",
                          "var(--chart-4)",
                          "var(--chart-5)",
                        ][i % 5],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/20 via-transparent to-transparent p-6">
            <p className="eyebrow text-brand">
              {YEAR} Wrapped
            </p>
            <h3 className="mt-1 font-display text-xl font-bold">
              Your year in concerts is ready.
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {plural(yearShows, "show")} · {plural(yearArtists, "artist")}.
            </p>
            <Link
              to="/wrapped"
              className={ctaClass({ variant: "inverse", size: "sm" }, "mt-4 gap-1")}
            >
              View summary <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <Panel title="Badges">
            <TooltipProvider delayDuration={150}>
              <ul className="grid grid-cols-2 gap-2">
                {badges.map((b) => (
                  <Tooltip key={b.id}>
                    <TooltipTrigger asChild>
                      <li
                        className={cn(
                          "flex cursor-default items-start gap-2 rounded-xl border p-2.5 text-[11px]",
                          b.earned
                            ? "border-brand/40 bg-brand/5"
                            : "border-hairline bg-surface/40 opacity-60",
                        )}
                      >
                        <span className="text-lg leading-none">{b.icon}</span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{b.label}</p>
                          <p className="truncate text-muted-foreground">
                            {b.earned ? (
                              <span className="inline-flex items-center gap-1 text-brand">
                                <Award className="h-3 w-3" /> Earned
                              </span>
                            ) : (
                              (b.progress ?? "Locked")
                            )}
                          </p>
                        </div>
                      </li>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] space-y-1 p-3">
                      <p className="flex items-center gap-1.5 font-display text-sm font-bold">
                        <span>{b.icon}</span>
                        <span>{b.label}</span>
                      </p>
                      <p className="text-xs leading-relaxed text-primary-foreground/80">
                        {b.description}
                      </p>
                      <p className="text-[11px] font-semibold text-primary-foreground/90">
                        {b.earned ? (
                          <span className="inline-flex items-center gap-1">
                            <Award className="h-3 w-3" /> Earned
                          </span>
                        ) : (
                          `${b.value} of ${b.target} ${b.unit}`
                        )}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </ul>
            </TooltipProvider>
          </Panel>

          <Panel title="Top Venues">
            <ul className="space-y-3">
              {topVenues.map((v, i) => (
                <li key={v.name} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{v.name}</span>
                  <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
                    {plural(v.count, "show")} ({showStats.total ? Math.round((v.count / showStats.total) * 100) : 0}%)
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Top Cities">
            <ul className="space-y-3">
              {topCities.map((v, i) => (
                <li key={v.name} className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-xs font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{v.name}</span>
                  <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
                    {plural(v.count, "show")} ({showStats.total ? Math.round((v.count / showStats.total) * 100) : 0}%)
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
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

function EmptyState({ name }: { name: string }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Welcome</p>
      <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight md:text-6xl">
        Hi {name.split(" ")[0]}. <span className="gradient-text">Log your first show.</span>
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        The archive starts the moment you add a gig. Stats, heatmaps and your year-in-review unlock
        automatically.
      </p>
      <Link
        to="/add"
        className={ctaClass({ size: "lg" }, "mt-8")}
      >
        Log a show
      </Link>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "brand" | "teal" | "pink";
}) {
  const color = accent === "brand" ? "text-brand" : accent === "teal" ? "text-teal" : "text-pink";
  return (
    <div className="rounded-2xl border border-hairline bg-surface/60 p-4">
      <p className="mb-1 flex items-center gap-1 eyebrow text-muted-foreground">
        {accent === "pink" && <Clock className="h-3 w-3" />} {label}
      </p>
      <p className={"font-display text-2xl font-extrabold " + color}>{value}</p>
    </div>
  );
}

function BigStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="bg-card p-6 md:p-8">
      <p className="eyebrow text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-4xl font-extrabold md:text-5xl">
        {value.toLocaleString()}
      </p>
      {sub && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <TrendingUp className="h-3 w-3" /> {sub}
        </p>
      )}
    </div>
  );
}

// Shows as many recent memories as fit next to the sidebar (desktop only), then
// spreads the leftover space between cards so the last one ends exactly where
// the sidebar does. Cards vary in height (notes, photos), so this measures
// rather than guessing a count.
function RecentMemories({
  asideRef,
  children,
}: {
  asideRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  const listRef = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(Math.min(MIN_RECENT, items.length));
  const [desktop, setDesktop] = useState(false);
  // Largest count known to fit for the current sidebar height. Stops a tall
  // card from being added, overflowing, removed and added again forever.
  const fit = useRef<{ available: number; ceiling: number }>({ available: 0, ceiling: Infinity });

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    const aside = asideRef.current;
    if (!desktop || !list || !aside) {
      setCount(Math.min(MIN_RECENT, items.length));
      return;
    }
    const measure = () => {
      const cards = Array.from(list.children) as HTMLElement[];
      if (cards.length === 0) return;
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      const used = cards.reduce((s, el) => s + el.offsetHeight, 0) + gap * (cards.length - 1);
      const available = aside.getBoundingClientRect().bottom - list.getBoundingClientRect().top;
      const avgCard = used / cards.length;
      if (Math.abs(available - fit.current.available) > 1) {
        fit.current = { available, ceiling: Infinity };
      }
      setCount((n) => {
        if (used > available + 1 && n > 2) {
          fit.current.ceiling = n - 1;
          return n - 1;
        }
        if (n < Math.min(items.length, fit.current.ceiling) && used + gap + avgCard <= available) {
          return n + 1;
        }
        return n;
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(aside);
    for (const el of Array.from(list.children)) ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [desktop, count, items.length, asideRef]);

  return (
    <div ref={listRef} className="flex flex-1 flex-col justify-between gap-5">
      {items.slice(0, count)}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ConcertCard({
  artist,
  tour,
  date,
  venue,
  city,
  rating,
  notes,
  imageUrl,
  concertId,
  ownerId,
  isReadOnly,
}: {
  artist: string;
  tour?: string;
  date: string;
  venue: string;
  city: string;
  rating: number;
  notes?: string;
  imageUrl?: string;
  concertId?: string;
  ownerId?: string;
  isReadOnly?: boolean;
}) {
  const d = new Date(date);
  const { data: media } = useConcertMedia(concertId, ownerId);
  const firstImage = media?.find((m) => m.kind === "image");
  const thumbUrl = useSignedMediaUrl(firstImage?.path);
  const dateLabel = d.toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" });
  return (
    <article
      className={cn(
        "group rounded-2xl border border-hairline bg-card/60 p-5",
        !isReadOnly && "transition-colors hover:border-brand/30",
      )}
    >
      <div className="flex flex-col gap-5 md:flex-row">
        <div className="grid w-full flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand/30 via-surface-2 to-surface-2 md:h-32 md:w-32">
          {thumbUrl ? (
            <img src={thumbUrl} alt={`${artist} memory`} className="h-full w-full object-cover" />
          ) : imageUrl ? (
            <img src={imageUrl} alt={artist} className="h-full w-full object-cover" />
          ) : (
            <div className="py-6 text-center md:py-0">
              <p className="font-display text-3xl font-black leading-none">{d.getDate()}</p>
              <p className="mt-1 eyebrow text-muted-foreground">
                {d.toLocaleString("en", { month: "short" })} {d.getFullYear()}
              </p>
            </div>
          )}
        </div>
        <div className="flex-grow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-bold leading-tight">
                {artist}
                {tour && <span className="text-muted-foreground"> · {tour}</span>}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {venue} · {city}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {dateLabel}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1 rounded-full border border-hairline bg-surface-2 px-3 py-1.5">
              <Star className="h-3.5 w-3.5 fill-teal text-teal" />
              <span className="text-xs font-bold">{rating.toFixed(1)}</span>
            </div>
          </div>
          {notes && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{notes}</p>}
          {media && media.length > 1 && (
            <div className="mt-3 flex gap-1.5">
              {media.slice(1, 5).map((m) => (
                <MediaThumb key={m.path} path={m.path} kind={m.kind} />
              ))}
              {media.length > 5 && (
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-surface-2 text-[11px] font-bold text-muted-foreground">
                  +{media.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function MediaThumb({ path, kind }: { path: string; kind: "image" | "video" }) {
  const url = useSignedMediaUrl(path);
  if (!url) return <div className="h-12 w-12 animate-pulse rounded-xl bg-surface-2" />;
  if (kind === "video") {
    return (
      <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-black">
        <video src={url} className="h-full w-full object-cover" muted />
        <span className="absolute inset-0 grid place-items-center text-white text-xs">▶</span>
      </div>
    );
  }
  return <img src={url} alt="" className="h-12 w-12 rounded-xl object-cover" />;
}
