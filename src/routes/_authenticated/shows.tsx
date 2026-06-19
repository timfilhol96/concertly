import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Pencil, Search, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useConcerts, useDeleteConcert } from "@/lib/concerts";

export const Route = createFileRoute("/_authenticated/shows")({
  head: () => ({ meta: [{ title: "My Shows · Concertly" }] }),
  component: Shows,
});

function Shows() {
  const nav = useNavigate();
  const { data: concerts = [], isLoading } = useConcerts();
  const del = useDeleteConcert();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"date" | "rating">("date");
  const list = useMemo(() => {
    const filtered = concerts.filter((c) =>
      [c.artist, c.venue, c.city, c.tour ?? ""].join(" ").toLowerCase().includes(q.toLowerCase()),
    );
    return filtered.sort((a, b) =>
      sort === "date" ? (a.date < b.date ? 1 : -1) : b.rating - a.rating,
    );
  }, [q, sort, concerts]);

  async function handleDelete(id: string, artist: string) {
    if (!confirm(`Delete "${artist}" from your archive?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success("Show deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">My Shows</h1>
          <p className="mt-2 text-muted-foreground">
            Every gig in your archive — {concerts.length} total.
          </p>
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
              <tr key={c.id} className="transition-colors hover:bg-surface-2/60">
                <td className="px-4 py-4 md:px-6">
                  <div className="font-semibold">{c.artist}</div>
                  <div className="text-xs text-muted-foreground md:hidden">{c.venue} · {c.city}</div>
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
                <td className="px-4 py-4 md:px-6">
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
                {concerts.length === 0 ? "No shows yet — log your first one!" : "No shows match that search."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

