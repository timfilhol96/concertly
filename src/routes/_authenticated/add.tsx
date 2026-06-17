import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, MapPin, Music, Star, Ticket } from "lucide-react";
import { toast } from "sonner";
import { useAddConcert } from "@/lib/concerts";

export const Route = createFileRoute("/_authenticated/add")({
  head: () => ({ meta: [{ title: "Log a show · Concertly" }] }),
  component: AddShow,
});

function AddShow() {
  const nav = useNavigate();
  const add = useAddConcert();
  const [rating, setRating] = useState(8);
  const [form, setForm] = useState({
    artist: "",
    tour: "",
    date: new Date().toISOString().slice(0, 10),
    venue: "",
    city: "",
    country: "",
    genre: "",
    notes: "",
    ticketPrice: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await add.mutateAsync({
        artist: form.artist.trim(),
        tour: form.tour.trim() || null,
        openers: null,
        date: form.date,
        venue: form.venue.trim(),
        city: form.city.trim(),
        country: form.country.trim() || null,
        rating,
        genre: form.genre.trim() || null,
        notes: form.notes.trim() || null,
        ticketPrice: form.ticketPrice ? Number(form.ticketPrice) : null,
        songsSeen: null,
      });
      toast.success("Show logged! 🎉", { description: "Your archive just got bigger." });
      nav({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the show");
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <div className="mb-8 animate-reveal">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New entry</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Log a <span className="gradient-text">show</span>.
        </h1>
        <p className="mt-2 text-muted-foreground">Capture the basics — it lives in your archive forever.</p>
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

        <div className="flex flex-col items-center justify-end gap-3 pt-2 sm:flex-row">
          <button type="button" onClick={() => nav({ to: "/dashboard" })} className="rounded-full px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            type="submit"
            disabled={add.isPending}
            className="w-full rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60 sm:w-auto"
          >
            {add.isPending ? "Saving…" : "Add to archive"}
          </button>
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
