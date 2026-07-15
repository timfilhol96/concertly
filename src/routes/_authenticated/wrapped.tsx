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
import { createWrappedShare } from "@/lib/wrapped-share";
import type { WrappedSharePayload } from "@/lib/wrapped-share-types";

export const Route = createFileRoute("/_authenticated/wrapped")({
  head: () => ({ meta: [{ title: "Your Wrapped · Concertly" }] }),
  component: Wrapped,
});

const YEAR = new Date().getFullYear();
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const GRADIENTS = [
  { id: "sunset", label: "Sunset", cls: "from-orange-500 via-pink-500 to-purple-600", text: "text-white", swatch: "linear-gradient(135deg, #f97316, #ec4899, #9333ea)" },
  { id: "ocean", label: "Ocean", cls: "from-cyan-400 via-blue-500 to-indigo-700", text: "text-white", swatch: "linear-gradient(135deg, #22d3ee, #3b82f6, #4338ca)" },
  { id: "ember", label: "Ember", cls: "from-red-600 via-orange-500 to-yellow-400", text: "text-white", swatch: "linear-gradient(135deg, #dc2626, #f97316, #facc15)" },
  { id: "noir", label: "Noir", cls: "from-slate-900 via-slate-700 to-slate-900", text: "text-white", swatch: "linear-gradient(135deg, #0f172a, #475569, #0f172a)" },
  { id: "citrus", label: "Citrus", cls: "from-lime-400 via-emerald-500 to-teal-600", text: "text-white", swatch: "linear-gradient(135deg, #a3e635, #10b981, #0d9488)" },
  { id: "berry", label: "Berry", cls: "from-fuchsia-600 via-purple-700 to-indigo-900", text: "text-white", swatch: "linear-gradient(135deg, #c026d3, #7e22ce, #312e81)" },
  { id: "aurora", label: "Aurora", cls: "from-green-400 via-cyan-500 to-purple-600", text: "text-white", swatch: "linear-gradient(135deg, #4ade80, #06b6d4, #9333ea)" },
  { id: "candy", label: "Candy", cls: "from-pink-400 via-rose-400 to-amber-300", text: "text-slate-900", swatch: "linear-gradient(135deg, #f472b6, #fb7185, #fcd34d)" },
] as const;

type GradientId = (typeof GRADIENTS)[number]["id"];

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

  const genres = genreBreakdown(yearShows).filter((g) => g.name !== "Unknown").slice(0, 3);
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
                const text = `My ${YEAR} Concertly Wrapped: ${yearShows.length} shows · ${artistsThisYear.size} artists · ${venuesThisYear.size} venues · ${citiesThisYear.size} cities · ${hoursLive}h live.`;
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
      <section className={`relative overflow-hidden rounded-3xl border border-hairline bg-gradient-to-br ${gradient.cls} ${gradient.text} p-8 md:p-12`}>
        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Your year in numbers</p>
        <p className="mt-4 font-display text-7xl font-black leading-none md:text-9xl">{yearShows.length}</p>
        <p className="mt-3 font-display text-2xl font-extrabold md:text-3xl">shows</p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Artists" value={String(artistsThisYear.size)} />
          <Stat label="Venues" value={String(venuesThisYear.size)} />
          <Stat label="Hours lived live" value={String(hoursLive)} />
          <Stat label="Ticket spend" value={moneySpent > 0 ? `$${Math.round(moneySpent).toLocaleString()}` : "—"} />
        </div>

        {genres.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Top genres</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {genres.map((g, i) => (
                <span
                  key={g.name}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur"
                >
                  <span className="opacity-70">#{i + 1}</span> {g.name}
                  <span className="opacity-70">· {g.count} shows</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {topVenue && (
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Top venues</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {rankBy(yearShows, "venue", 5).map((v, i) => (
                <span
                  key={v.name}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur"
                >
                  <span className="opacity-70">#{i + 1}</span> {v.name}
                  <span className="opacity-70">· {v.count} {v.count === 1 ? "show" : "shows"}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {citiesThisYear.size > 0 && (
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              Where you went · {citiesThisYear.size} {citiesThisYear.size === 1 ? "city" : "cities"} · {countriesThisYear.size} {countriesThisYear.size === 1 ? "country" : "countries"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...new Map(yearShows.map((c) => [`${c.city}|${c.country ?? ""}`, c])).values()].map((c) => (
                <span
                  key={`${c.city}-${c.country ?? ""}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur"
                >
                  <span className="text-sm leading-none">{countryFlag(c.country)}</span> {c.city}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      </section>


      {/* #1s */}
      <Section title="Your #1s">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <WrappedCard label="Favorite venue" value={topVenue?.name ?? "—"} sub={topVenue ? `${topVenue.count} visits` : ""} tone="brand" />
          <WrappedCard label="Favorite city" value={topCity?.name ?? "—"} sub={topCity ? `${topCity.count} shows` : ""} tone="teal" />
          <WrappedCard
            label="Longest show"
            value={longestShow?.artist ?? "—"}
            sub={longestShow ? `${longestShow.setlist?.length ?? longestShow.songsSeen ?? 0} songs · ~${Math.round(longestMins / 60 * 10) / 10}h` : ""}
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
                {genres.map((g, i) => (
                  <li key={g.name} className="flex items-baseline gap-3">
                    <span className="font-display text-2xl font-black text-brand">{i + 1}</span>
                    <span className="font-display text-xl font-extrabold">{g.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{g.count} shows · {g.pct}%</span>
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
            First time seeing — {newArtists.length} new artists
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
          <WrappedCard label="Average rating" value={avgRating.toFixed(2)} sub={`out of 10 across ${yearConcerts.length} shows`} tone="brand" />
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
            sub={`${monthCounts[peakMonthIdx]} shows`}
            tone="brand"
          />
          <WrappedCard
            label="Avg shows / active month"
            value={avgPerMonth.toFixed(1)}
            sub={`across ${monthsWithShows} months`}
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
