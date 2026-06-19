import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, RefreshCw, Search, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useConcerts, useDeleteConcert, useUpdateConcert } from "@/lib/concerts";
import { lookupSetlist } from "@/lib/setlistfm.functions";

type Search = { month?: string };

export const Route = createFileRoute("/_authenticated/shows")({
  head: () => ({ meta: [{ title: "My Shows · Concertly" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    month: typeof s.month === "string" && /^\d{4}-\d{2}$/.test(s.month) ? s.month : undefined,
  }),
  component: Shows,
});

function Shows() {
  const nav = useNavigate();
  const { month } = Route.useSearch();
  const { data: concerts = [], isLoading } = useConcerts();
  const del = useDeleteConcert();
  const update = useUpdateConcert();
  const fetchSetlist = useServerFn(lookupSetlist);
  const [refresh, setRefresh] = useState<{ running: boolean; done: number; total: number }>({
    running: false,
    done: 0,
    total: 0,
  });
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"date" | "rating">("date");
  const list = useMemo(() => {
    let filtered = concerts.filter((c) =>
      [c.artist, c.venue, c.city, c.tour ?? ""].join(" ").toLowerCase().includes(q.toLowerCase()),
    );
    if (month) filtered = filtered.filter((c) => c.date.startsWith(month));
    return filtered.sort((a, b) =>
      sort === "date" ? (a.date < b.date ? 1 : -1) : b.rating - a.rating,
    );
  }, [q, sort, concerts, month]);

  const monthLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleString("en", { month: "long", year: "numeric" })
    : null;

  async function handleDelete(id: string, artist: string) {
    if (!confirm(`Delete "${artist}" from your archive?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success("Show deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  async function handleRefreshAll() {
    if (refresh.running) return;
    const targets = concerts;
    if (targets.length === 0) {
      toast.info("No shows to refresh");
      return;
    }
    if (
      !confirm(
        `Fetch fresh setlist.fm info for all ${targets.length} show${
          targets.length === 1 ? "" : "s"
        }? Existing rating, notes, and ticket price will be kept.`,
      )
    )
      return;
    setRefresh({ running: true, done: 0, total: targets.length });
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const c = targets[i];
      try {
        const res = await fetchSetlist({ data: { artist: c.artist, date: c.date } });
        if (res.found) {
          await update.mutateAsync({
            id: c.id,
            artist: res.artist ?? c.artist,
            tour: res.tour ?? c.tour,
            openers: res.openers.length > 0 ? res.openers : c.openers,
            date: c.date,
            venue: res.venue ?? c.venue,
            city: res.city ?? c.city,
            country: res.country ?? c.country,
            rating: c.rating,
            genre: res.genre ?? c.genre,
            notes: c.notes,
            ticketPrice: c.ticketPrice,
            songsSeen: res.songsSeen ?? c.songsSeen,
            setlist: res.songs.length > 0 ? res.songs : c.setlist,
            artistImageUrl: res.artistImageUrl ?? c.artistImageUrl,
            openerSetlists:
              res.openerSetlists.length > 0 ? res.openerSetlists : c.openerSetlists,
          });
          updated++;
        } else {
          skipped++;
        }
      } catch {
        failed++;
      }
      setRefresh({ running: true, done: i + 1, total: targets.length });
    }
    setRefresh({ running: false, done: 0, total: 0 });
    toast.success(
      `Refreshed ${updated} show${updated === 1 ? "" : "s"}` +
        (skipped ? ` · ${skipped} not found` : "") +
        (failed ? ` · ${failed} failed` : ""),
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">My Shows</h1>
          <p className="mt-2 text-muted-foreground">
            {monthLabel
              ? `Showing ${list.length} show${list.length === 1 ? "" : "s"} in ${monthLabel}`
              : `Every gig in your archive — ${concerts.length} total.`}
          </p>
          {month && (
            <button
              type="button"
              onClick={() => nav({ to: "/shows", search: {} })}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-semibold hover:bg-surface-2"
            >
              <X className="h-3 w-3" /> Clear month filter
            </button>
          )}
        </div>
        <div className="flex w-full items-center gap-3 md:w-auto">
          <div className="relative flex-grow md:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search artist, venue, city…"
              className="w-full rounded-full border border-hairline bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-brand"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "date" | "rating")}
            className="rounded-full border border-hairline bg-surface px-3 py-2 text-xs outline-none"
          >
            <option value="date">Newest</option>
            <option value="rating">Top rated</option>
          </select>
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={refresh.running || concerts.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-2 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
            title="Re-fetch tour, setlist, genre & artist image for every show"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refresh.running ? "animate-spin" : ""}`} />
            {refresh.running
              ? `Refreshing ${refresh.done}/${refresh.total}`
              : "Refresh all info"}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-hairline">
        <table className="w-full text-left">
          <thead className="border-b border-hairline bg-surface text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-bold md:px-6">Artist</th>
              <th className="hidden px-4 py-3 font-bold md:table-cell md:px-6">Venue</th>
              <th className="hidden px-4 py-3 font-bold lg:table-cell">Tour</th>
              <th className="px-4 py-3 font-bold md:px-6">Date</th>
              <th className="px-4 py-3 text-right font-bold md:px-6">Rating</th>
              <th className="px-4 py-3 text-right font-bold md:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline bg-card/40">
            {list.map((c) => (
              <tr
                key={c.id}
                onClick={() => nav({ to: "/show/$id", params: { id: c.id } })}
                className="cursor-pointer transition-colors hover:bg-surface-2/60"
              >
                <td className="px-4 py-4 md:px-6">
                  <div className="flex items-center gap-3">
                    {c.artistImageUrl ? (
                      <img src={c.artistImageUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                    ) : null}
                    <div>
                      <div className="font-semibold">{c.artist}</div>
                      <div className="text-xs text-muted-foreground md:hidden">{c.venue} · {c.city}</div>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-4 text-sm text-muted-foreground md:table-cell md:px-6">
                  {c.venue}
                  <div className="text-xs">{c.city}{c.country ? `, ${c.country}` : ""}</div>
                </td>
                <td className="hidden px-4 py-4 text-xs text-muted-foreground lg:table-cell">
                  {c.tour ?? "—"}
                </td>
                <td className="px-4 py-4 font-mono text-xs md:px-6">
                  {new Date(c.date).toLocaleDateString("en", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-4 py-4 md:px-6">
                  <div className="flex items-center justify-end gap-1">
                    <Star className="h-3.5 w-3.5 fill-teal text-teal" />
                    <span className="font-display text-lg font-extrabold">{c.rating.toFixed(1)}</span>
                  </div>
                </td>
                <td className="px-4 py-4 md:px-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to="/add"
                      search={{ id: c.id }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                      aria-label={`Edit ${c.artist}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id, c.artist)}
                      disabled={del.isPending}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      aria-label={`Delete ${c.artist}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && list.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                {concerts.length === 0 ? "No shows yet — log your first one!" : "No shows match that filter."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
