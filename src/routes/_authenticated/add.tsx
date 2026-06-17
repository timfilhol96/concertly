import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, MapPin, Music, Star, Ticket } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/add")({
  head: () => ({ meta: [{ title: "Log a show · Concertly" }] }),
  component: AddShow,
});

function AddShow() {
  const nav = useNavigate();
  const [rating, setRating] = useState(8);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Show logged! 🎉", { description: "Your archive just got bigger." });
    setTimeout(() => nav({ to: "/dashboard" }), 800);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
      <div className="mb-8 animate-reveal">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          New entry
        </p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Log a <span className="gradient-text">show</span>.
        </h1>
        <p className="mt-2 text-muted-foreground">
          Capture the basics — we'll pull setlists, openers and tour info from Setlist.fm.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-3xl border border-hairline bg-card p-6 md:p-8"
      >
        <Field icon={Music} label="Artist / Headliner" placeholder="e.g. Fred again..">
          <input required className={inputCls} placeholder="Search artist…" />
        </Field>

        <div className="grid gap-6 md:grid-cols-2">
          <Field icon={Calendar} label="Date">
            <input required type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={inputCls} />
          </Field>
          <Field icon={Ticket} label="Tour (optional)">
            <input className={inputCls} placeholder="e.g. Ten Days Tour" />
          </Field>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Field icon={MapPin} label="Venue">
            <input required className={inputCls} placeholder="e.g. Alexandra Palace" />
          </Field>
          <Field icon={MapPin} label="City">
            <input required className={inputCls} placeholder="e.g. London, UK" />
          </Field>
        </div>

        <div>
          <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Star className="h-3.5 w-3.5" /> Rating
          </label>
          <div className="rounded-2xl border border-hairline bg-surface p-5">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-5xl font-extrabold gradient-text">{rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">/ 10</span>
            </div>
            <input
              type="range" min={0} max={10} step={0.1}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="mt-3 w-full accent-brand"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Notes
          </label>
          <textarea
            rows={4}
            className={inputCls + " resize-none"}
            placeholder="Best moment? Crowd energy? Setlist surprises?"
          />
        </div>

        <div className="flex flex-col items-center justify-end gap-3 pt-2 sm:flex-row">
          <button type="button" onClick={() => nav({ to: "/dashboard" })} className="rounded-full px-5 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            type="submit"
            className="w-full rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-foreground transition-transform hover:scale-[1.02] active:scale-95 sm:w-auto"
          >
            Add to archive
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
}: { icon: React.ComponentType<{ className?: string }>; label: string; placeholder?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </label>
      {children}
    </div>
  );
}
