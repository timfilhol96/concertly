import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, MapPin, Music, Sparkles, Star, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useAddConcert,
  useConcerts,
  useDeleteConcert,
  useUpdateConcert,
  type OpenerSetlist,
} from "@/lib/concerts";
import {
  lookupArtistImageFn,
  lookupCoPerformers,
  lookupDeezerArtistByIdFn,
  lookupSetlist,
  searchArtists,
  type ArtistSuggestion,
  type CoPerformer,
} from "@/lib/setlistfm.functions";
import { Crown, Users } from "lucide-react";

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
  const fetchCoPerformers = useServerFn(lookupCoPerformers);
  const fetchArtistImage = useServerFn(lookupArtistImageFn);
  const fetchArtistById = useServerFn(lookupDeezerArtistByIdFn);
  const fetchArtistSuggestions = useServerFn(searchArtists);

  const [rating, setRating] = useState(existing?.rating ?? 8);
  const [openers, setOpeners] = useState<string[] | null>(existing?.openers ?? null);
  const [songsSeen, setSongsSeen] = useState<number | null>(existing?.songsSeen ?? null);
  const [setlist, setSetlist] = useState<string[] | null>(existing?.setlist ?? null);
  const [artistImageUrl, setArtistImageUrl] = useState<string | null>(
    existing?.artistImageUrl ?? null,
  );
  const [openerSetlists, setOpenerSetlists] = useState<OpenerSetlist[] | null>(
    existing?.openerSetlists ?? null,
  );
  const [looking, setLooking] = useState(false);
  const [coPerformers, setCoPerformers] = useState<CoPerformer[] | null>(null);
  const [selectedCo, setSelectedCo] = useState<Set<string>>(new Set());
  const [headliner, setHeadliner] = useState<string>(existing?.artist ?? "");
  const [loggingCo, setLoggingCo] = useState(false);
  const [picker, setPicker] = useState<{
    title: string;
    description: string;
    options: ArtistSuggestion[];
    resolve: (a: ArtistSuggestion | null) => void;
  } | null>(null);
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

  function pickArtist(
    title: string,
    description: string,
    options: ArtistSuggestion[],
  ): Promise<ArtistSuggestion | null> {
    return new Promise((resolve) => {
      setPicker({ title, description, options, resolve });
    });
  }

  async function onAutoFill() {
    if (!form.artist.trim() || !form.date) {
      toast.error("Add an artist and date first");
      return;
    }
    setLooking(true);
    try {
      const name = form.artist.trim();
      const [r, suggestions] = await Promise.all([
        fetchSetlist({ data: { artist: name, date: form.date } }),
        fetchArtistSuggestions({ data: { query: name } }).catch(
          () => [] as ArtistSuggestion[],
        ),
      ]);

      // Artist disambiguation: ask the user to pick when there isn't a single
      // clean match in Deezer.
      const lc = name.toLowerCase();
      const exact = suggestions.filter((s) => s.name.toLowerCase() === lc);
      let chosenArtist: ArtistSuggestion | null = null;
      if (exact.length === 1) {
        chosenArtist = exact[0];
      } else if (exact.length > 1) {
        chosenArtist = await pickArtist(
          "Multiple artists share this name",
          "Pick which one you saw — we use this for the image and genre.",
          exact,
        );
      } else if (suggestions.length > 0) {
        chosenArtist = await pickArtist(
          "Artist not found exactly",
          "Pick the closest match, or cancel to keep the name as-is.",
          suggestions.slice(0, 6),
        );
      }

      if (!r.found) {
        // Concert isn't on setlist.fm — still grab the artist's image + genre
        // from Deezer so the entry isn't bare.
        let image: string | null = null;
        let genre: string | null = null;
        if (chosenArtist?.id) {
          try {
            const d = await fetchArtistById({ data: { id: chosenArtist.id } });
            image = d.image;
            genre = d.genre;
          } catch {
            // non-fatal
          }
        }
        setForm((f) => ({
          ...f,
          artist: chosenArtist?.name ?? f.artist,
          genre: genre ?? f.genre,
        }));
        setArtistImageUrl(image);
        toast.message("No setlist found", {
          description:
            image || genre
              ? "Filled in the artist image and genre instead."
              : "Try the exact artist spelling, or fill the details manually.",
        });
        return;
      }

      // Concert found — prefer setlist.fm data, but if the user picked a
      // different Deezer artist, use their image + genre instead.
      let artistImage = r.artistImageUrl;
      let artistGenre = r.genre;
      if (
        chosenArtist?.id &&
        chosenArtist.name.toLowerCase() !== (r.artist ?? name).toLowerCase()
      ) {
        try {
          const d = await fetchArtistById({ data: { id: chosenArtist.id } });
          artistImage = d.image ?? artistImage;
          artistGenre = d.genre ?? artistGenre;
        } catch {
          // non-fatal
        }
      }

      setForm((f) => ({
        ...f,
        artist: chosenArtist?.name ?? r.artist ?? f.artist,
        tour: r.tour ?? "",
        venue: r.venue ?? f.venue,
        city: r.city ?? f.city,
        country: r.country ?? f.country,
        genre: artistGenre ?? f.genre,
      }));
      setOpeners(r.openers.length ? r.openers : null);
      setSongsSeen(r.songsSeen);
      setSetlist(r.songs.length ? r.songs : null);
      setArtistImageUrl(artistImage);
      setOpenerSetlists(r.openerSetlists.length ? r.openerSetlists : null);
      toast.success("Pulled from setlist.fm", {
        description:
          [
            r.tour,
            r.openers.length ? `${r.openers.length} opener(s)` : null,
            r.openerSetlists.length ? `${r.openerSetlists.length} opener setlists` : null,
            r.songs.length ? `${r.songs.length} songs` : null,
            artistGenre,
          ]
            .filter(Boolean)
            .join(" · ") || "Details filled in.",
      });

      // Look for other artists at the same venue/date
      const venue = r.venue ?? form.venue;
      if (venue) {
        try {
          const exclude = [r.artist ?? form.artist, ...r.openers];
          const co = await fetchCoPerformers({
            data: { date: form.date, venue, excludeArtists: exclude },
          });
          if (co.length > 0) {
            setCoPerformers(co);
            setSelectedCo(new Set(co.map((c) => c.artist)));
            setHeadliner(r.artist ?? form.artist);
          } else {
            setCoPerformers(null);
            setSelectedCo(new Set());
          }
        } catch {
          // non-fatal
        }
      }
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
      openers,
      date: form.date,
      venue: form.venue.trim(),
      city: form.city.trim(),
      country: form.country.trim() || null,
      rating,
      genre: form.genre.trim() || null,
      notes: form.notes.trim() || null,
      ticketPrice: form.ticketPrice ? Number(form.ticketPrice) : null,
      songsSeen,
      setlist,
      artistImageUrl,
      openerSetlists,
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

  async function onLogSelectedCoPerformers() {
    if (!coPerformers || selectedCo.size === 0) return;
    const targets = coPerformers.filter((c) => selectedCo.has(c.artist));
    setLoggingCo(true);
    let ok = 0;
    try {
      // Fetch profile images for all selected co-performers in parallel.
      const images = await Promise.all(
        targets.map(async (c) => {
          try {
            const { url } = await fetchArtistImage({ data: { artist: c.artist } });
            return [c.artist, url] as const;
          } catch {
            return [c.artist, null] as const;
          }
        }),
      );
      const imageMap = new Map(images);

      const headlinerName = headliner.trim();
      const allArtistsInGroup = [form.artist.trim(), ...targets.map((t) => t.artist)];

      for (const c of targets) {
        const isHeadliner =
          headlinerName.length > 0 && c.artist.toLowerCase() === headlinerName.toLowerCase();
        const supportNote = isHeadliner ? null : `Support act for ${headlinerName}`;
        const openersForRow = isHeadliner
          ? allArtistsInGroup.filter(
              (a) => a && a.toLowerCase() !== c.artist.toLowerCase(),
            )
          : null;
        await add.mutateAsync({
          artist: c.artist,
          tour: c.tour,
          openers: openersForRow && openersForRow.length ? openersForRow : null,
          date: form.date,
          venue: c.venue || form.venue,
          city: c.city ?? form.city,
          country: c.country ?? (form.country || null),
          rating,
          genre: form.genre.trim() || null,
          notes: supportNote,
          ticketPrice: null,
          songsSeen: c.songs.length || null,
          setlist: c.songs.length ? c.songs : null,
          artistImageUrl: imageMap.get(c.artist) ?? null,
          openerSetlists: null,
        });
        ok += 1;
      }

      // If user picked a co-performer as the headliner, the main form's artist
      // is actually a support act — reflect that in the main form before submit.
      if (
        headlinerName &&
        headlinerName.toLowerCase() !== form.artist.trim().toLowerCase()
      ) {
        setForm((f) => ({
          ...f,
          notes: f.notes?.trim() ? f.notes : `Support act for ${headlinerName}`,
        }));
        setOpeners(null);
      }

      toast.success(`Logged ${ok} additional ${ok === 1 ? "show" : "shows"}`);
      setCoPerformers(null);
      setSelectedCo(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't log all performers");
    } finally {
      setLoggingCo(false);
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
          <ArtistAutocomplete
            value={form.artist}
            onChange={(v) => set("artist", v)}
            inputClassName={inputCls}
          />
        </Field>

        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <Field icon={Calendar} label="Date">
            <input required type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
          </Field>
          <button
            type="button"
            onClick={onAutoFill}
            disabled={looking}
            className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand/10 px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4" />
            {looking ? "Searching setlist.fm…" : "Auto-fill from setlist.fm"}
          </button>
        </div>

        <Field icon={Ticket} label="Tour (optional)">
          <input value={form.tour} onChange={(e) => set("tour", e.target.value)} className={inputCls} placeholder="e.g. Ten Days Tour" />
        </Field>

        {(artistImageUrl || openers?.length || songsSeen || setlist?.length || openerSetlists?.length) && (
          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">From setlist.fm</p>
            {artistImageUrl && (
              <div className="mb-3 flex items-center gap-3">
                <img src={artistImageUrl} alt={form.artist} className="h-14 w-14 rounded-full object-cover" />
                <span className="text-sm font-semibold">{form.artist}</span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {openers?.map((o) => (
                <span key={o} className="rounded-full border border-hairline px-3 py-1 text-xs">
                  opener · {o}
                </span>
              ))}
              {songsSeen ? (
                <span className="rounded-full border border-hairline px-3 py-1 text-xs">{songsSeen} songs played</span>
              ) : null}
            </div>
            {setlist?.length ? (
              <ol className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {setlist.map((s, i) => (
                  <li key={`${s}-${i}`} className="flex items-center gap-2 text-xs">
                    <span className="w-6 font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <span className="truncate">{s}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            {openerSetlists?.length ? (
              <div className="mt-5 space-y-3">
                {openerSetlists.map((o) => (
                  <details key={o.artist} className="rounded-xl border border-hairline bg-card/40 p-3">
                    <summary className="cursor-pointer text-xs font-semibold">
                      {o.artist} · {o.songs.length} songs
                    </summary>
                    <ol className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {o.songs.map((s, i) => (
                        <li key={`${o.artist}-${i}`} className="flex gap-2 text-xs text-muted-foreground">
                          <span className="w-5 font-mono">{String(i + 1).padStart(2, "0")}</span>
                          <span className="truncate">{s}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {coPerformers && coPerformers.length > 0 && (
          <div className="rounded-2xl border border-brand/40 bg-brand/5 p-4">
            <div className="mb-3 flex items-start gap-3">
              <Users className="mt-0.5 h-5 w-5 text-brand" />
              <div className="flex-1">
                <p className="text-sm font-bold">
                  {coPerformers.length} other {coPerformers.length === 1 ? "artist" : "artists"} performed at {form.venue} on this date
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Log them as separate shows. Pick which artist headlined — the rest will be marked as support.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCoPerformers(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
            <div className="space-y-2">
              {/* Main form artist row — always present, always "logged" via main submit */}
              <div className="flex items-center gap-3 rounded-xl border border-hairline bg-card/60 p-3">
                <span className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground" title="Logged via main form">
                  ✓
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{form.artist || "(main entry)"}</p>
                  <p className="text-xs text-muted-foreground">From the form above</p>
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                  <input
                    type="radio"
                    name="co-headliner"
                    checked={headliner.toLowerCase() === form.artist.trim().toLowerCase()}
                    onChange={() => setHeadliner(form.artist.trim())}
                    className="h-3.5 w-3.5 accent-brand"
                  />
                  <Crown className="h-3.5 w-3.5" /> Headliner
                </label>
              </div>
              {coPerformers.map((c) => {
                const checked = selectedCo.has(c.artist);
                const isHeadliner = headliner.toLowerCase() === c.artist.toLowerCase();
                return (
                  <div
                    key={c.artist}
                    className={`flex items-center gap-3 rounded-xl border bg-card/60 p-3 ${isHeadliner ? "border-brand/60" : "border-hairline"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedCo((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(c.artist);
                          else next.delete(c.artist);
                          return next;
                        });
                      }}
                      className="h-4 w-4 accent-brand"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{c.artist}</p>
                      <p className="text-xs text-muted-foreground">
                        {[c.tour, c.songs.length ? `${c.songs.length} songs` : null]
                          .filter(Boolean)
                          .join(" · ") || "Setlist available"}
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                      <input
                        type="radio"
                        name="co-headliner"
                        checked={isHeadliner}
                        onChange={() => setHeadliner(c.artist)}
                        disabled={!checked}
                        className="h-3.5 w-3.5 accent-brand"
                      />
                      <Crown className="h-3.5 w-3.5" /> Headliner
                    </label>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={onLogSelectedCoPerformers}
                disabled={loggingCo || selectedCo.size === 0}
                className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-brand-foreground disabled:opacity-50"
              >
                {loggingCo ? "Logging…" : `Log ${selectedCo.size} selected`}
              </button>
            </div>
          </div>
        )}


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
      {picker && (
        <ArtistPickerModal
          title={picker.title}
          description={picker.description}
          options={picker.options}
          onPick={(a) => {
            picker.resolve(a);
            setPicker(null);
          }}
        />
      )}
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

function ArtistAutocomplete({
  value,
  onChange,
  inputClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  inputClassName: string;
}) {
  const search = useServerFn(searchArtists);
  const [suggestions, setSuggestions] = useState<ArtistSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const seq = ++seqRef.current;
      try {
        const res = await search({ data: { query: q } });
        if (seq === seqRef.current) {
          setSuggestions(res);
          setHighlight(-1);
        }
      } catch {
        // ignore
      }
    }, 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, search]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setSuggestions([]);
  }

  const showList = open && suggestions.length > 0;

  return (
    <div ref={wrapRef} className="relative">
      <input
        required
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && highlight >= 0) {
            e.preventDefault();
            pick(suggestions[highlight].name);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={inputClassName}
        placeholder="e.g. Fred again.."
        autoComplete="off"
      />
      {showList && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-hairline bg-card shadow-xl">
          {suggestions.map((s, i) => (
            <li key={s.name}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s.name);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${
                  i === highlight ? "bg-surface-2" : "hover:bg-surface"
                }`}
              >
                {s.image ? (
                  <img src={s.image} alt="" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-surface-2" />
                )}
                <span className="font-medium">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ArtistPickerModal({
  title,
  description,
  options,
  onPick,
}: {
  title: string;
  description: string;
  options: ArtistSuggestion[];
  onPick: (a: ArtistSuggestion | null) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => onPick(null)}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-hairline bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <ul className="mt-4 max-h-80 space-y-1 overflow-auto">
          {options.map((a) => (
            <li key={`${a.id ?? a.name}`}>
              <button
                type="button"
                onClick={() => onPick(a)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-surface"
              >
                {a.image ? (
                  <img
                    src={a.image}
                    alt=""
                    className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-surface-2" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{a.name}</p>
                  {typeof a.nbFan === "number" && a.nbFan > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {a.nbFan.toLocaleString()} fans
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => onPick(null)}
            className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
