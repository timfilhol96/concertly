import { formatDuration, plural } from "@/lib/utils";
import { genreColors, type WrappedTheme } from "@/lib/wrapped-themes";

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

export function countryFlag(name?: string | null): string {
  if (!name) return "🌍";
  return COUNTRY_FLAGS[name] ?? "🌍";
}

export type WrappedCardData = {
  year: number;
  shows: number;
  artists: number;
  venues: number;
  hours: number;
  prevYearShows?: number;
  bestRatedArtists?: Array<{ name: string; rating: number; image?: string | null }>;
  topVenues?: Array<{ name: string; count: number; country?: string | null }>;
  longest?: { artist: string; hours: number };
  shortest?: { artist: string; hours: number };
  topGenres?: Array<{ name: string; count: number; pct: number }>;
};

export function WrappedStatCard({
  data,
  theme,
  className = "",
}: {
  data: WrappedCardData;
  theme: WrappedTheme;
  className?: string;
}) {
  const genres = (data.topGenres ?? []).slice(0, 5);
  const genreTotal = genres.reduce((s, g) => s + g.count, 0) || 1;
  const swatches = genreColors(theme, Math.max(genres.length, 1));
  const showsDiff = data.prevYearShows != null ? data.shows - data.prevYearShows : null;

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border border-hairline ${theme.text} ${className}`}
      style={{ backgroundImage: theme.bg }}
    >
      <div className="p-8 pb-6 md:p-12 md:pb-8">
        <h2 className="font-display text-3xl font-black leading-tight md:text-4xl">
          My Concertly {data.year} wrapped
        </h2>
      </div>

      <div className="grid grid-cols-1 divide-y divide-black/10 border-y border-black/10 bg-white/15 backdrop-blur sm:grid-cols-2 md:grid-cols-4 md:divide-y-0 md:divide-x">
        <CompactStat label={data.shows === 1 ? "Show" : "Shows"} value={data.shows}>
          {showsDiff != null && (
            <p className="text-xs font-semibold opacity-90">
              {data.prevYearShows === 0
                ? "First year on record"
                : `${showsDiff > 0 ? "+" : ""}${showsDiff} vs ${data.year - 1} (${data.prevYearShows})`}
            </p>
          )}
        </CompactStat>

        <CompactStat label={data.artists === 1 ? "Artist" : "Artists"} value={data.artists}>
          {data.bestRatedArtists && data.bestRatedArtists.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Best rated</p>
              <ul className="mt-1.5 space-y-1.5">
                {data.bestRatedArtists.map((a) => (
                  <li key={a.name} className="flex items-center gap-2">
                    {a.image ? (
                      <img src={a.image} alt={a.name} loading="lazy" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/20 text-[10px] font-black">
                        {a.name.slice(0, 1)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 break-words text-xs font-semibold leading-tight">{a.name}</span>
                    <span className="shrink-0 text-xs font-bold opacity-80">{a.rating}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CompactStat>

        <CompactStat label={data.venues === 1 ? "Venue" : "Venues"} value={data.venues}>
          {data.topVenues && data.topVenues.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Most visited</p>
              <ul className="mt-1.5 space-y-1.5">
                {data.topVenues.map((v) => (
                  <li key={v.name} className="flex items-start gap-2">
                    <span className="text-sm leading-tight">{countryFlag(v.country)}</span>
                    <span className="min-w-0 flex-1 break-words text-xs font-semibold leading-tight">{v.name}</span>
                    <span className="shrink-0 text-xs font-bold opacity-80">{v.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CompactStat>

        <CompactStat label="Live time" value={formatDuration(data.hours)}>
          <ul className="space-y-2">
            {data.longest && (
              <li>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Longest</p>
                <p className="flex items-start gap-2 text-xs font-semibold leading-tight">
                  <span className="min-w-0 flex-1 break-words">{data.longest.artist}</span>
                  <span className="shrink-0 font-bold opacity-80">{formatDuration(data.longest.hours)}</span>
                </p>
              </li>
            )}
            {data.shortest && (
              <li>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Shortest</p>
                <p className="flex items-start gap-2 text-xs font-semibold leading-tight">
                  <span className="min-w-0 flex-1 break-words">{data.shortest.artist}</span>
                  <span className="shrink-0 font-bold opacity-80">{data.shortest.hours}h</span>
                </p>
              </li>
            )}
          </ul>
        </CompactStat>
      </div>

      {genres.length > 0 && (
        <div className="p-8 md:px-12 md:py-10">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Top 5 genres</p>
          <div className="mt-4 flex h-4 w-full overflow-hidden rounded-full bg-current/15">
            {genres.map((g, i) => (
              <div
                key={g.name}
                className="h-full"
                style={{ width: `${(g.count / genreTotal) * 100}%`, background: swatches[i] }}
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
      )}

      <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
    </section>
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
