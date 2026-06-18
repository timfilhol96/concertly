import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, MapPin, Music, Sparkles, Star, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAddConcert, useConcerts, useDeleteConcert, useUpdateConcert } from "@/lib/concerts";
import { lookupSetlist } from "@/lib/setlistfm.functions";

type Search = { id?: string };

export const Route = createFileRoute("/_authenticated/add")({
  head: () => ({ meta: [{ title: "Log a show · Concertly" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  component: AddShow,
});

function AddShow() {
  const nav = useNavigate();
  const { id } = Route.useSearch();
  const { data: concerts } = useConcerts();
  const existing = id ? concerts?.find((c) => c.id === id) : undefined;
  const isEdit = Boolean(existing);

  const add = useAddConcert();
  const update = useUpdateConcert();
  const del = useDeleteConcert();
  const fetchSetlist = useServerFn(lookupSetlist);

  const [rating, setRating] = useState(existing?.rating ?? 8);
  const [openers, setOpeners] = useState<string[] | null>(existing?.openers ?? null);
  const [songsSeen, setSongsSeen] = useState<number | null>(existing?.songsSeen ?? null);
  const [looking, setLooking] = useState(false);
  const [form, setForm] = useState({
    artist: existing?.artist ?? "",
    tour: existing?.tour ?? "",
    date: existing?.date ?? new Date().toISOString().slice(0, 10),
    venue: existing?.venue ?? "",
    city: existing?.city ?? "",
    country: existing?.country ?? "",
    genre: existing?.genre ?? "",
    notes: existing?.notes ?? "",
    ticketPrice: existing?.ticketPrice != null ? String(existing.ticketPrice) : "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onAutoFill() {
    if (!form.artist.trim() || !form.date) {
      toast.error("Add an artist and date first");
      return;
    }
    setLooking(true);
    try {
      const r = await fetchSetlist({ data: { artist: form.artist.trim(), date: form.date } });
      if (!r.found) {
        toast.message("No setlist found", {
          description: "Try the exact artist spelling, or fill the details manually.",
        });
        return;
      }
      setForm((f) => ({
        ...f,
        artist: r.artist ?? f.artist,
        tour: r.tour ?? f.tour,
        venue: r.venue ?? f.venue,
        city: r.city ?? f.city,
        country: r.country ?? f.country,
      }));
      setOpeners(r.openers.length ? r.openers : null);
      setSongsSeen(r.songsSeen);
      toast.success("Pulled from setlist.fm", {
        description:
          [r.tour, r.openers.length ? `${r.openers.length} opener(s)` : null, r.songsSeen ? `${r.songsSeen} songs` : null]
            .filter(Boolean)
            .join(" · ") || "Details filled in.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLooking(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      artist: form.artist.trim(),
      tour: form.tour.trim() || null,
      openers: existing?.openers ?? null,
      date: form.date,
      venue: form.venue.trim(),
      city: form.city.trim(),
      country: form.country.trim() || null,
      rating,
      genre: form.genre.trim() || null,
      notes: form.notes.trim() || null,
      ticketPrice: form.ticketPrice ? Number(form.ticketPrice) : null,
      songsSeen: existing?.songsSeen ?? null,
    };
    try {
      if (isEdit && existing) {
        await update.mutateAsync({ id: existing.id, ...payload });
        toast.success("Show updated");
      } else {
        await add.mutateAsync(payload);
        toast.success("Show logged! 🎉", { description: "Your archive just got bigger." });
      }
      nav({ to: "/shows" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the show");
    }
  }

  async function onDelete() {
    if (!existing) return;
    if (!confirm(`Delete "${existing.artist}" from your archive?`)) return;
    try {
      await del.mutateAsync(existing.id);
      toast.success("Show deleted");
      nav({ to: "/shows" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  const pending = add.isPending || update.isPending;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <div className="mb-8 animate-reveal">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {isEdit ? "Edit entry" : "New entry"}
        </p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          {isEdit ? "Edit" : "Log a"} <span className="gradient-text">show</span>.
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isEdit ? "Update the details of this gig." : "Capture the basics — it lives in your archive forever."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6 rounded-3xl border border-hairline bg-card p-6 md:p-8">
        <Field icon={Music} label="Artist / Headliner">
          <input required value={form.artist} onChange={(e) => set("artist", e.target.value)} className={inputCls} placeholder="e.g. Fred again.." />
        </Field>

        <div className="grid gap-6 md:grid-cols-2">
          <Field icon={Calendar} label="Date">
            <input required type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
          </Field>
          <Field icon={Ticket} label="Tour (optional)">
            <input value={form.tour} onChange={(e) => set("tour", e.target.value)} className={inputCls} placeholder="e.g. Ten Days Tour" />
          </Field>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Field icon={MapPin} label="Venue">
            <input required value={form.venue} onChange={(e) => set("venue", e.target.value)} className={inputCls} placeholder="e.g. Alexandra Palace" />
          </Field>
          <Field icon={MapPin} label="City">
            <input required value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} placeholder="e.g. London" />
          </Field>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Field icon={MapPin} label="Country (optional)">
            <input value={form.country} onChange={(e) => set("country", e.target.value)} className={inputCls} placeholder="e.g. UK" />
          </Field>
          <Field icon={Music} label="Genre (optional)">
            <input value={form.genre} onChange={(e) => set("genre", e.target.value)} className={inputCls} placeholder="e.g. Electronic" />
          </Field>
        </div>

        <Field icon={Ticket} label="Ticket price (optional)">
          <input type="number" min={0} step="0.01" value={form.ticketPrice} onChange={(e) => set("ticketPrice", e.target.value)} className={inputCls} placeholder="0.00" />
        </Field>

        <div>
          <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Star className="h-3.5 w-3.5" /> Rating
          </label>
          <div className="rounded-2xl border border-hairline bg-surface p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-5xl font-extrabold gradient-text">{rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">/ 10</span>
            </div>
            <input type="range" min={0} max={10} step={0.1} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-3 w-full accent-brand" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">Notes</label>
          <textarea rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls + " resize-none"} placeholder="Best moment? Crowd energy? Setlist surprises?" />
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={onDelete}
                disabled={del.isPending}
                className="inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" /> {del.isPending ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => nav({ to: "/shows" })} className="rounded-full px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add to archive"}
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

const inputCls =
  "w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand";

function Field({
  icon: Icon, label, children,
}: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </label>
      {children}
    </div>
  );
}
