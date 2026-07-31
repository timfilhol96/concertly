import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Download, Instagram, Link as LinkIcon, MessageCircle, Palette, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  genreBreakdown,
  getStats,
  rankBy,
  uniqueShows,
  useConcerts,
  useProfile,
  type Concert,
} from "@/lib/concerts";
import { plural } from "@/lib/utils";
import { createWrappedShare } from "@/lib/wrapped-share";
import type { WrappedSharePayload } from "@/lib/wrapped-share-types";

export const Route = createFileRoute("/_authenticated/wrapped")({
  head: () => ({ meta: [{ title: "Your Wrapped · Concertly" }] }),
  component: Wrapped,
});

const YEAR = new Date().getFullYear();
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

import { WRAPPED_THEMES, genreColors, type WrappedThemeId } from "@/lib/wrapped-themes";

const GRADIENTS = WRAPPED_THEMES;
type GradientId = WrappedThemeId;


const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "🇺🇸", USA: "🇺🇸", US: "🇺🇸",
  "United Kingdom": "🇬🇧", UK: "🇬🇧", England: "🇬🇧", Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  France: "🇫🇷", Germany: "🇩🇪", Spain: "🇪🇸", Italy: "🇮🇹", Portugal: "🇵🇹",
  Netherlands: "🇳🇱", Belgium: "🇧🇪", Ireland: "🇮🇪", Switzerland: "🇨🇭", Austria: "🇦🇹",
  Sweden: "🇸🇪", Norway: "🇳🇴", Denmark: "🇩🇰", Finland: "🇫🇮", Iceland: "🇮🇸",
  Poland: "🇵🇱", Czechia: "🇨🇿", "Czech Republic": "🇨🇿", Hungary: "🇭🇺", Greece: "🇬🇷",
  Canada: "🇨🇦", Mexico: "🇲🇽", Brazil: "🇧🇷", Argentina: "🇦🇷", Chile: "🇨🇱", Colombia: "🇨🇴",
  Japan: "🇯🇵", "South Korea": "🇰🇷", China: "🇨🇳", "Hong Kong": "🇭🇰", Taiwan: "🇹🇼",
  Thailand: "🇹🇭", Singapore: "🇸🇬", Malaysia: "🇲🇾", Indonesia: "🇮🇩", Vietnam: "🇻🇳", Philippines: "🇵🇭", India: "🇮🇳",
  Australia: "🇦🇺", "New Zealand": "🇳🇿",
  "South Africa": "🇿🇦", Morocco: "🇲🇦", Egypt: "🇪🇬",
  Turkey: "🇹🇷", "United Arab Emirates": "🇦🇪", UAE: "🇦🇪", Israel: "🇮🇱",
};

function countryFlag(name?: string | null): string {
  if (!name) return "🌍";
  return COUNTRY_FLAGS[name] ?? "🌍";
}

function showLengthMinutes(c: Concert) {
  const songs = c.setlist?.length ?? c.songsSeen ?? 0;
  return songs * 4; // ~4 min per song
}







function Wrapped() {
  const { data: profile } = useProfile();
  const { data: concerts = [] } = useConcerts();
  const [gradientId, setGradientId] = useState<GradientId>("sunset");
  const gradient = GRADIENTS.find((g) => g.id === gradientId) ?? GRADIENTS[0];


  const yearConcerts = useMemo(
    () => concerts.filter((c) => new Date(c.date).getFullYear() === YEAR),
    [concerts],
  );
  const priorConcerts = useMemo(
    () => concerts.filter((c) => new Date(c.date).getFullYear() < YEAR),
    [concerts],
  );
  const yearShows = useMemo(() => uniqueShows(yearConcerts), [yearConcerts]);

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

  const stats = getStats(yearShows);
  const artistsThisYear = new Set(yearConcerts.map((c) => c.artist));
  const venuesThisYear = new Set(yearShows.map((c) => c.venue));
  const citiesThisYear = new Set(yearShows.map((c) => c.city));
  const countriesThisYear = new Set(yearShows.map((c) => c.country).filter(Boolean));
  const hoursLive = Math.round(
    yearConcerts.reduce((s, c) => s + (c.setlist?.length ?? c.songsSeen ?? 16) * 4, 0) / 60,
  );
  const moneySpent = yearConcerts.reduce((s, c) => s + (c.ticketPrice ?? 0), 0);

  const topVenue = rankBy(yearShows, "venue", 1)[0];
  const topCity = rankBy(yearShows, "city", 1)[0];

  const longestShow = [...yearConcerts].sort((a, b) => showLengthMinutes(b) - showLengthMinutes(a))[0];
  const longestMins = longestShow ? showLengthMinutes(longestShow) : 0;
  const timedShows = yearConcerts.filter((c) => showLengthMinutes(c) > 0);
  const shortestShow = [...timedShows].sort((a, b) => showLengthMinutes(a) - showLengthMinutes(b))[0];
  const shortestMins = shortestShow ? showLengthMinutes(shortestShow) : 0;

  const prevYearShows = uniqueShows(
    concerts.filter((c) => new Date(c.date).getFullYear() === YEAR - 1),
  ).length;
  const showsDiff = yearShows.length - prevYearShows;

  const topRatedArtists = (() => {
    const seen = new Map<string, Concert>();
    for (const c of [...yearConcerts].sort((a, b) => b.rating - a.rating)) {
      if (!seen.has(c.artist)) seen.set(c.artist, c);
    }
    return [...seen.values()].slice(0, 3);
  })();

  const topVenues3 = rankBy(yearShows, "venue", 3).map((v) => ({
    ...v,
    country: yearShows.find((c) => c.venue === v.name)?.country ?? null,
  }));

  const rawGenres = genreBreakdown(yearShows).filter((g) => g.name !== "Unknown");
  const top5Genres = [...rawGenres].sort((a, b) => b.count - a.count).slice(0, 5);
  const top5Total = top5Genres.reduce((s, g) => s + g.count, 0) || 1;
  const genres = top5Genres.map((g) => ({ ...g, pct: (g.count / top5Total) * 100 }));

  const priorGenres = new Set(priorConcerts.map((c) => c.genre).filter(Boolean));
  const discoveredGenres = [...new Set(yearConcerts.map((c) => c.genre).filter(Boolean) as string[])]
    .filter((g) => !priorGenres.has(g));

  const sortedByDate = [...yearConcerts].sort((a, b) => (a.date < b.date ? -1 : 1));
  const firstShow = sortedByDate[0];
  const lastShow = sortedByDate[sortedByDate.length - 1];

  const priorArtists = new Set(priorConcerts.map((c) => c.artist));
  const newArtists = [...artistsThisYear].filter((a) => !priorArtists.has(a));

  const avgRating = yearConcerts.reduce((s, c) => s + c.rating, 0) / yearConcerts.length;
  const topRated = [...yearConcerts].sort((a, b) => b.rating - a.rating)[0];

  // Weekday counts
  const weekdayCounts = Array(7).fill(0);
  for (const c of yearShows) weekdayCounts[new Date(c.date).getDay()]++;
  const peakWeekdayIdx = weekdayCounts.indexOf(Math.max(...weekdayCounts));

  // Monthly counts
  const monthCounts = Array(12).fill(0);
  for (const c of yearShows) monthCounts[new Date(c.date).getMonth()]++;
  const peakMonthIdx = monthCounts.indexOf(Math.max(...monthCounts));
  const monthsWithShows = monthCounts.filter((n) => n > 0).length;
  const avgPerMonth = yearShows.length / Math.max(monthsWithShows, 1);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">Concertly Wrapped</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">
            {YEAR} · {profile?.displayName ?? "You"}
          </h1>
        </div>
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold transition hover:bg-muted">
              <Palette className="h-3.5 w-3.5" /> Theme
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Gradient
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {GRADIENTS.map((g) => (
                <DropdownMenuItem
                  key={g.id}
                  onClick={() => setGradientId(g.id)}
                  className="flex items-center gap-2"
                >
                  <span
                    className="h-5 w-5 rounded-full border border-hairline"
                    style={{ backgroundImage: g.swatch }}
                  />
                  <span className="flex-1">{g.label}</span>
                  {gradientId === g.id && <Check className="h-3.5 w-3.5 text-brand" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold transition hover:bg-muted">
              <Share2 className="h-3.5 w-3.5" /> Share
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Share your Wrapped
              </DropdownMenuLabel>
              <div className="px-2 pb-2 text-[10px] leading-snug text-muted-foreground">
                Heads up: share links are <span className="font-semibold text-foreground">public</span> — anyone with the URL can view this recap without signing in.
              </div>
              <DropdownMenuSeparator />
              {(() => {
                const sharePayload: WrappedSharePayload = {
                  year: YEAR,
                  user: profile?.displayName ?? undefined,
                  shows: yearShows.length,
                  artists: artistsThisYear.size,
                  venues: venuesThisYear.size,
                  cities: citiesThisYear.size,
                  countries: countriesThisYear.size,
                  hours: hoursLive,
                  ticketSpend: moneySpent,
                  topVenue: topVenue?.name,
                  topVenueCount: topVenue?.count,
                  topCity: topCity?.name,
                  topCityCount: topCity?.count,
                  topGenres: genres.slice(0, 5).map((g) => ({ name: g.name, count: g.count, pct: Math.round(g.pct) })),
                  discoveredGenres: discoveredGenres?.slice(0, 6),
                  newArtists: newArtists?.slice(0, 8),
                  longestShow: longestShow
                    ? { artist: longestShow.artist, songs: longestShow.setlist?.length ?? longestShow.songsSeen ?? 0, minutes: longestMins }
                    : undefined,
                  firstShow: firstShow
                    ? { artist: firstShow.artist, date: firstShow.date, venue: firstShow.venue, city: firstShow.city }
                    : undefined,
                  lastShow: lastShow
                    ? { artist: lastShow.artist, date: lastShow.date, venue: lastShow.venue, city: lastShow.city }
                    : undefined,
                  avgRating: Number(avgRating.toFixed(2)),
                  totalRated: yearConcerts.length,
                  topRated: topRated
                    ? { artist: topRated.artist, rating: topRated.rating, venue: topRated.venue, city: topRated.city }
                    : undefined,
                  peakWeekday: WEEKDAYS[peakWeekdayIdx],
                  peakMonth: MONTHS[peakMonthIdx],
                  peakMonthCount: monthCounts[peakMonthIdx],
                  avgPerMonth: Number(avgPerMonth.toFixed(1)),
                  monthsWithShows,
                };
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const text = `My ${YEAR} Concertly Wrapped: ${plural(yearShows.length, "show")} · ${plural(artistsThisYear.size, "artist")} · ${plural(venuesThisYear.size, "venue")} · ${plural(citiesThisYear.size, "city", "cities")} · ${hoursLive}h live.`;
                const getShareUrl = async () => {
                  const id = await createWrappedShare(sharePayload, gradientId);
                  return `${origin}/w?id=${id}`;
                };
                return (
                  <>
                    <DropdownMenuItem
                      onClick={async () => {
                        const popup = window.open("", "_blank");
                        try {
                          const shareUrl = await getShareUrl();
                          const wa = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${shareUrl}`)}`;
                          if (popup) {
                            popup.opener = null;
                            popup.location.href = wa;
                          }
                          else window.location.href = wa;
                        } catch {
                          popup?.close();
                          toast.error("Couldn't create share link");
                        }
                      }}
                    >
                      <MessageCircle className="mr-2 h-4 w-4 text-emerald-500" /> WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          const shareUrl = await getShareUrl();
                          if (navigator.clipboard) await navigator.clipboard.writeText(`${text} ${shareUrl}`);
                          toast.success("Copied — paste into your Instagram story or DM");
                          window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
                        } catch {
                          toast.error("Couldn't copy. Try the link option.");
                        }
                      }}
                    >
                      <Instagram className="mr-2 h-4 w-4 text-pink-500" /> Instagram
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          const shareUrl = await getShareUrl();
                          await navigator.clipboard.writeText(shareUrl);
                          toast.success("Link copied to clipboard");
                        } catch {
                          toast.error("Couldn't copy link");
                        }
                      }}
                    >
                      <LinkIcon className="mr-2 h-4 w-4" /> Copy link
                    </DropdownMenuItem>
                  </>
                );
              })()}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => {
              const payload = {
                year: YEAR,
                user: profile?.displayName ?? null,
                totals: {
                  shows: yearShows.length,
                  concerts: yearConcerts.length,
                  artists: artistsThisYear.size,
                  venues: venuesThisYear.size,
                  cities: citiesThisYear.size,
                  countries: countriesThisYear.size,
                  hoursLive,
                  ticketSpend: moneySpent,
                  avgRating: Number(avgRating.toFixed(2)),
                },
                highlights: {
                  topVenue: topVenue?.name ?? null,
                  topCity: topCity?.name ?? null,
                  topRated: topRated ? { artist: topRated.artist, date: topRated.date, rating: topRated.rating } : null,
                  longestShowMinutes: longestMins,
                  peakWeekday: WEEKDAYS[peakWeekdayIdx],
                  peakMonth: MONTHS[peakMonthIdx],
                  newArtists,
                  discoveredGenres,
                  topGenres: genres,
                },
                shows: yearConcerts,
              };
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `concertly-wrapped-${YEAR}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              toast.success("Exported your Wrapped");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold transition hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>



      {/* HEADLINE */}
      <section
        className={`relative overflow-hidden rounded-3xl border border-hairline ${gradient.text}`}
        style={{ backgroundImage: gradient.bg }}
      >
        {/* Card title */}
        <div className="p-8 pb-6 md:p-12 md:pb-8">
          <h2 className="font-display text-3xl font-black leading-tight md:text-4xl">
            My Concertly {YEAR} wrapped
          </h2>
        </div>

        {/* Compact stat grid */}
        
        <div className="grid grid-cols-1 divide-y divide-black/10 border-y border-black/10 bg-white/15 backdrop-blur sm:grid-cols-2 md:grid-cols-4 md:divide-y-0 md:divide-x">
          <CompactStat label={yearShows.length === 1 ? "Show" : "Shows"} value={yearShows.length}>
            <p className="text-xs font-semibold opacity-90">
              {prevYearShows === 0
                ? `First year on record`
                : `${showsDiff > 0 ? "+" : ""}${showsDiff} vs ${YEAR - 1} (${prevYearShows})`}
            </p>
          </CompactStat>

          <CompactStat label={artistsThisYear.size === 1 ? "Artist" : "Artists"} value={artistsThisYear.size}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Best rated</p>
            <ul className="mt-1.5 space-y-1.5">
              {topRatedArtists.map((c) => (
                <li key={c.artist} className="flex items-center gap-2">
                  {c.artistImageUrl ? (
                    <img
                      src={c.artistImageUrl}
                      alt={c.artist}
                      loading="lazy"
                      className="h-6 w-6 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/20 text-[10px] font-black">
                      {c.artist.slice(0, 1)}
                    </span>
                  )}
                  <span className="truncate text-xs font-semibold">{c.artist}</span>
                  <span className="ml-auto text-xs font-bold opacity-80">{c.rating}</span>
                </li>
              ))}
            </ul>
          </CompactStat>

          <CompactStat label={venuesThisYear.size === 1 ? "Venue" : "Venues"} value={venuesThisYear.size}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Most visited</p>
            <ul className="mt-1.5 space-y-1.5">
              {topVenues3.map((v) => (
                <li key={v.name} className="flex items-center gap-2">
                  <span className="text-sm leading-none">{countryFlag(v.country)}</span>
                  <span className="truncate text-xs font-semibold">{v.name}</span>
                  <span className="ml-auto text-xs font-bold opacity-80">{v.count}</span>
                </li>
              ))}
            </ul>
          </CompactStat>

          <CompactStat label="Live time" value={`${hoursLive}h`}>
            <ul className="space-y-1.5">
              {longestShow && (
                <li className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Longest</span>
                  <span className="truncate text-xs font-semibold">{longestShow.artist}</span>
                  <span className="ml-auto text-xs font-bold opacity-80">
                    {Math.round((longestMins / 60) * 10) / 10}h
                  </span>
                </li>
              )}
              {shortestShow && (
                <li className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Shortest</span>
                  <span className="truncate text-xs font-semibold">{shortestShow.artist}</span>
                  <span className="ml-auto text-xs font-bold opacity-80">
                    {Math.round((shortestMins / 60) * 10) / 10}h
                  </span>
                </li>
              )}
            </ul>
          </CompactStat>
        </div>



        {/* Top 5 genres */}
        {genres.length > 0 && (() => {
          const swatches = genreColors(gradient, genres.length);
          return (
          <div className="p-8 md:px-12 md:py-10">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Top 5 genres</p>
            <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-current/15">
              {genres.map((g, i) => (
                <div
                  key={g.name}
                  className="h-full"
                  style={{ width: `${g.pct}%`, background: swatches[i] }}
                  title={`${g.name} · ${plural(g.count, "show")}`}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              {genres.map((g, i) => (
                <span key={g.name} className="inline-flex items-center gap-2 text-sm font-semibold">
                  <span className="h-3 w-3 rounded-full" style={{ background: swatches[i] }} />
                  {g.name} · {plural(g.count, "show")}
                </span>
              ))}
            </div>

          </div>
          );
        })()}

        <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      </section>


      {/* #1s */}
      <Section title="Your #1s">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <WrappedCard label="Favorite venue" value={topVenue?.name ?? "—"} sub={topVenue ? plural(topVenue.count, "visit") : ""} tone="brand" />
          <WrappedCard label="Favorite city" value={topCity?.name ?? "—"} sub={topCity ? plural(topCity.count, "show") : ""} tone="teal" />
          <WrappedCard
            label="Longest show"
            value={longestShow?.artist ?? "—"}
            sub={longestShow ? `${plural(longestShow.setlist?.length ?? longestShow.songsSeen ?? 0, "song")} · ~${Math.round(longestMins / 60 * 10) / 10}h` : ""}
            tone="pink"
          />
        </div>
      </Section>

      {/* Taste & genre */}
      <Section title="Taste & genre">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-hairline bg-card p-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top genres live</p>
            {genres.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Add a genre to your shows to see this.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {genres.slice(0, 3).map((g, i) => (
                <li key={g.name} className="flex items-baseline gap-3">
                    <span className="font-display text-2xl font-black text-brand">{i + 1}</span>
                    <span className="font-display text-xl font-extrabold">{g.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{plural(g.count, "show")}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="rounded-3xl border border-hairline bg-card p-8">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Discovered live this year</p>
            {discoveredGenres.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No brand new genres — you know what you like.</p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                {discoveredGenres.map((g) => (
                  <span key={g} className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Firsts & milestones */}
      <Section title="Firsts & milestones">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <MilestoneCard label="First show of the year" concert={firstShow} />
          <MilestoneCard label="Last show of the year" concert={lastShow} />
        </div>
        <div className="mt-6 rounded-3xl border border-hairline bg-card p-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            First time seeing — {plural(newArtists.length, "new artist")}
          </p>
          {newArtists.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">All returning favorites this year.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {newArtists.map((a) => (
                <span key={a} className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-sm font-semibold">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Crowd & vibe */}
      <Section title="Crowd & vibe">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <WrappedCard label="Average rating" value={avgRating.toFixed(2)} sub={`out of 10 across ${plural(yearConcerts.length, "show")}`} tone="brand" />
          {topRated && (
            <WrappedCard
              label="Highest rated show"
              value={topRated.artist}
              sub={`${topRated.rating}/10 · ${topRated.venue}, ${topRated.city}`}
              tone="teal"
            />
          )}
        </div>
      </Section>

      {/* Patterns */}
      <Section title="Patterns & personality">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <WrappedCard
            label="Your concert weekday"
            value={WEEKDAYS[peakWeekdayIdx]}
            sub={`a ${WEEKDAYS[peakWeekdayIdx]}-night person`}
            tone="pink"
          />
          <WrappedCard
            label="Peak month"
            value={MONTHS[peakMonthIdx]}
            sub={plural(monthCounts[peakMonthIdx], "show")}
            tone="brand"
          />
          <WrappedCard
            label="Avg shows / active month"
            value={avgPerMonth.toFixed(1)}
            sub={`across ${plural(monthsWithShows, "month")}`}
            tone="teal"
          />
        </div>
      </Section>

      <div className="mt-10 rounded-3xl border border-hairline bg-card p-8 text-center">
        <h3 className="font-display text-2xl font-extrabold">The story keeps writing itself.</h3>
        <p className="mt-2 text-muted-foreground">Log your next show to keep the streak alive.</p>
        <Link to="/add" className="mt-6 inline-flex rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground hover:scale-[1.03] active:scale-95">
          Log a show
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

function CompactStat({
  label,
  value,
  children,
}: {
  label: string;
  value: string | number;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col p-5 md:p-6">
      <p className="font-display text-3xl font-black leading-none md:text-4xl">{value}</p>
      <p className="mt-1.5 text-xs font-bold uppercase tracking-widest opacity-80">{label}</p>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}



function MilestoneCard({ label, concert }: { label: string; concert: Concert | undefined }) {
  if (!concert) return null;
  return (
    <div className="rounded-3xl border border-hairline bg-card p-8">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-2xl font-extrabold">{concert.artist}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {new Date(concert.date).toLocaleDateString("en", { dateStyle: "medium" })} · {concert.venue}, {concert.city}
      </p>
    </div>
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
