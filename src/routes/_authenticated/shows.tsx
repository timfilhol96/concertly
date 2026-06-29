import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown, Pencil, RefreshCw, Search, Star, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useAddConcert,
  useConcerts,
  useDeleteConcert,
  useUpdateConcert,
  type Concert,
} from "@/lib/concerts";
import {
  coAttendanceKey,
  useFriendConcerts,
  useFriendships,
  useFriendsCoAttendance,
} from "@/lib/friends";
import {
  lookupCoPerformers,
  lookupDeezerArtistByIdFn,
  lookupSetlist,
  searchArtists,
  type ArtistSuggestion,
  type CoPerformer,
} from "@/lib/setlistfm.functions";

type Search = {
  month?: string;
  genre?: string;
  year?: string;
  friendId?: string;
  withFriends?: string[];
};

export const Route = createFileRoute("/_authenticated/shows")({
  head: () => ({ meta: [{ title: "My Shows · Concertly" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    month: typeof s.month === "string" && /^\d{4}-\d{2}$/.test(s.month) ? s.month : undefined,
    genre: typeof s.genre === "string" && s.genre.length > 0 ? s.genre : undefined,
    year: typeof s.year === "string" && /^\d{4}$/.test(s.year) ? s.year : undefined,
    friendId:
      typeof s.friendId === "string" && s.friendId.length > 0 ? s.friendId : undefined,
    withFriends: Array.isArray(s.withFriends)
      ? (s.withFriends.filter((x) => typeof x === "string" && x.length > 0) as string[])
      : undefined,
  }),
  component: Shows,
});


// ---------- Wizard prompt types ----------

type ArtistPromptKind = "ambiguous" | "not_found";

type ArtistPrompt = {
  kind: "artist";
  artistKind: ArtistPromptKind;
  concert: Concert;
  query: string;
  suggestions: ArtistSuggestion[];
  resolve: (choice: ArtistSuggestion | "skip" | "cancel") => void;
};

type CoPerformerPrompt = {
  kind: "co_performers";
  concert: Concert;
  coPerformers: CoPerformer[];
  resolve: (
    choice:
      | { kind: "log"; selected: string[]; headliner: string }
      | { kind: "skip" }
      | { kind: "cancel" },
  ) => void;
};

type NotFoundPrompt = {
  kind: "not_found";
  concert: Concert;
  fallback: { image: string | null; genre: string | null } | null;
  resolve: (choice: "apply" | "skip" | "cancel") => void;
};

type Prompt = ArtistPrompt | CoPerformerPrompt | NotFoundPrompt;

function Shows() {
  const nav = useNavigate();
  const { month, genre, year, friendId, withFriends } = Route.useSearch();
  const { data: friendData } = useFriendships();
  const friendProfile = friendId ? friendData?.profiles?.[friendId] : undefined;
  const isFriend = friendId
    ? friendData?.friends?.some((f) => f.otherUserId === friendId) ?? false
    : true;
  const readOnly = !!friendId;
  const ownConcertsQ = useConcerts();
  const friendConcertsQ = useFriendConcerts(friendId && isFriend ? friendId : null);
  const concerts = friendId ? friendConcertsQ.data ?? [] : ownConcertsQ.data ?? [];
  const isLoading = friendId ? friendConcertsQ.isLoading : ownConcertsQ.isLoading;
  const { data: coAttendance } = useFriendsCoAttendance();
  const del = useDeleteConcert();
  const update = useUpdateConcert();
  const add = useAddConcert();
  const fetchSetlist = useServerFn(lookupSetlist);
  const fetchSearchArtists = useServerFn(searchArtists);
  const fetchDeezerById = useServerFn(lookupDeezerArtistByIdFn);
  const fetchCoPerformers = useServerFn(lookupCoPerformers);
  const qc = useQueryClient();

  // Propagate the headliner's ticket price to every other row for the same
  // physical show (same date + venue), so logging the price on one performer
  // fills it in for the openers / support acts on the next refresh.
  async function syncTicketPriceAcrossShow(date: string, venue: string) {
    const { data } = await supabase
      .from("concerts")
      .select("id, notes, ticket_price")
      .eq("date", date)
      .eq("venue", venue);
    if (!data || data.length < 2) return;
    const rows = data as Array<{
      id: string;
      notes: string | null;
      ticket_price: number | null;
    }>;
    const isSupport = (n: string | null) =>
      (n ?? "").trim().toLowerCase().startsWith("support act for");
    const headliner = rows.find((r) => !isSupport(r.notes)) ?? rows[0];
    const price = headliner.ticket_price;
    if (price == null) return;
    let changed = false;
    for (const r of rows) {
      if (r.id === headliner.id) continue;
      if (r.ticket_price === price) continue;
      const { error } = await supabase
        .from("concerts")
        .update({ ticket_price: price })
        .eq("id", r.id);
      if (!error) changed = true;
    }
    if (changed) qc.invalidateQueries({ queryKey: ["concerts"] });
  }


  const [refresh, setRefresh] = useState<{ running: boolean; done: number; total: number }>({
    running: false,
    done: 0,
    total: 0,
  });
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [fetching, setFetching] = useState<{ artist: string; step: string } | null>(null);
  // Cache picked Spotify artist per artist-name (lowercase) so we don't re-ask within a batch.
  const artistChoiceCache = useRef(new Map<string, ArtistSuggestion>());

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"date" | "rating">("date");
  const withFriendsSet = useMemo<Set<string>>(
    () => new Set((withFriends ?? []) as string[]),
    [withFriends],
  );
  const list = useMemo(() => {
    let filtered = concerts.filter((c) =>
      [c.artist, c.venue, c.city, c.tour ?? ""].join(" ").toLowerCase().includes(q.toLowerCase()),
    );
    if (month) filtered = filtered.filter((c) => c.date.startsWith(month));
    if (year && !month) filtered = filtered.filter((c) => c.date.startsWith(year));
    if (genre) {
      const g = genre.toLowerCase();
      filtered = filtered.filter((c) => (c.genre ?? "Unknown").toLowerCase() === g);
    }
    if (withFriendsSet.size > 0 && coAttendance) {
      filtered = filtered.filter((c) => {
        const attendees = coAttendance.byKey[coAttendanceKey(c.date, c.venue, c.city)] ?? [];
        const ids = new Set(attendees.map((a) => a.userId));
        for (const fid of withFriendsSet) if (!ids.has(fid)) return false;
        return true;
      });
    }
    return filtered.sort((a, b) =>
      sort === "date" ? (a.date < b.date ? 1 : -1) : b.rating - a.rating,
    );
  }, [q, sort, concerts, month, genre, year, withFriendsSet, coAttendance]);

  const monthLabel = month
    ? new Date(`${month}-01T00:00:00`).toLocaleString("en", { month: "long", year: "numeric" })
    : null;

  function toggleFriendFilter(fid: string) {
    const next = new Set(withFriendsSet);
    if (next.has(fid)) next.delete(fid);
    else next.add(fid);
    nav({
      to: "/shows",
      search: {
        month,
        genre,
        year,
        friendId,
        withFriends: next.size > 0 ? [...next] : undefined,
      },
    });
  }



  async function handleDelete(id: string, artist: string) {
    if (!confirm(`Delete "${artist}" from your archive?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success("Show deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  // ---------- Wizard helpers ----------

  const askArtist = useCallback(
    (
      concert: Concert,
      artistKind: ArtistPromptKind,
      query: string,
      suggestions: ArtistSuggestion[],
    ) =>
      new Promise<ArtistSuggestion | "skip" | "cancel">((resolve) => {
        setPrompt({
          kind: "artist",
          artistKind,
          concert,
          query,
          suggestions,
          resolve: (v) => {
            setPrompt(null);
            resolve(v);
          },
        });
      }),
    [],
  );

  const askCoPerformers = useCallback(
    (concert: Concert, coPerformers: CoPerformer[]) =>
      new Promise<
        | { kind: "log"; selected: string[]; headliner: string }
        | { kind: "skip" }
        | { kind: "cancel" }
      >((resolve) => {
        setPrompt({
          kind: "co_performers",
          concert,
          coPerformers,
          resolve: (v) => {
            setPrompt(null);
            resolve(v);
          },
        });
      }),
    [],
  );

  const askNotFound = useCallback(
    (
      concert: Concert,
      fallback: { image: string | null; genre: string | null } | null,
    ) =>
      new Promise<"apply" | "skip" | "cancel">((resolve) => {
        setPrompt({
          kind: "not_found",
          concert,
          fallback,
          resolve: (v) => {
            setPrompt(null);
            resolve(v);
          },
        });
      }),
    [],
  );

  // Resolve a Spotify artist for a concert, asking if ambiguous / not found.
  // Returns null if user skipped, "cancel" if they cancelled the whole batch.
  async function resolveArtist(
    concert: Concert,
  ): Promise<ArtistSuggestion | null | "cancel"> {
    const key = concert.artist.trim().toLowerCase();
    const cached = artistChoiceCache.current.get(key);
    if (cached) return cached;
    let suggestions: ArtistSuggestion[] = [];
    try {
      suggestions = await fetchSearchArtists({ data: { query: concert.artist } });
    } catch {
      suggestions = [];
    }
    // Exact match (case-insensitive) wins automatically.
    const exact = suggestions.filter((s) => s.name.toLowerCase() === key);
    if (exact.length === 1) {
      artistChoiceCache.current.set(key, exact[0]);
      return exact[0];
    }
    if (suggestions.length === 0) {
      // Truly nothing found — ask user to broaden / pick closest (we already have none).
      const choice = await askArtist(concert, "not_found", concert.artist, []);
      if (choice === "cancel") return "cancel";
      if (choice === "skip") return null;
      artistChoiceCache.current.set(key, choice);
      return choice;
    }
    if (exact.length > 1 || suggestions.length > 1) {
      const choice = await askArtist(
        concert,
        exact.length > 1 ? "ambiguous" : "not_found",
        concert.artist,
        suggestions,
      );
      if (choice === "cancel") return "cancel";
      if (choice === "skip") return null;
      artistChoiceCache.current.set(key, choice);
      return choice;
    }
    // exactly one suggestion, not exact name match — accept it but cache it.
    artistChoiceCache.current.set(key, suggestions[0]);
    return suggestions[0];
  }

  type RefreshOutcome = {
    status: "updated" | "skipped" | "failed" | "cancelled";
    coLogged: number;
  };

  async function refreshOne(c: Concert): Promise<RefreshOutcome> {
    let coLogged = 0;
    try {
      // 1. Resolve artist on Deezer.
      setFetching({ artist: c.artist, step: "Searching artist on Spotify…" });
      const artistChoice = await resolveArtist(c);
      if (artistChoice === "cancel") return { status: "cancelled", coLogged };

      // 2. Look up the show on setlist.fm.
      setFetching({ artist: c.artist, step: "Looking up setlist…" });
      const res = await fetchSetlist({ data: { artist: c.artist, date: c.date } });

      if (!res.found) {
        // Fallback: still apply Deezer image + genre if the user picked something.
        setFetching({ artist: c.artist, step: "Fetching artist image & genre…" });
        let fallback: { image: string | null; genre: string | null } | null = null;
        if (artistChoice && artistChoice.id != null) {
          try {
            fallback = await fetchDeezerById({ data: { id: artistChoice.id } });
          } catch {
            fallback = { image: artistChoice.image, genre: null };
          }
        } else if (artistChoice) {
          fallback = { image: artistChoice.image, genre: null };
        }

        if (!fallback || (!fallback.image && !fallback.genre)) {
          return { status: "skipped", coLogged };
        }
        const decision = await askNotFound(c, fallback);
        if (decision === "cancel") return { status: "cancelled", coLogged };
        if (decision !== "apply") return { status: "skipped", coLogged };

        setFetching({ artist: c.artist, step: "Saving…" });
        await update.mutateAsync({
          id: c.id,
          artist: c.artist,
          tour: c.tour,
          openers: c.openers,
          date: c.date,
          venue: c.venue,
          city: c.city,
          country: c.country,
          rating: c.rating,
          genre: fallback.genre ?? c.genre,
          notes: c.notes,
          ticketPrice: c.ticketPrice,
          songsSeen: c.songsSeen,
          setlist: c.setlist,
          artistImageUrl: fallback.image ?? c.artistImageUrl,
          openerSetlists: c.openerSetlists,
        });
        await syncTicketPriceAcrossShow(c.date, c.venue);
        return { status: "updated", coLogged };
      }

      // Found a setlist. Prefer Spotify artist image/genre if the user picked one explicitly.
      let imageOverride: string | null = res.artistImageUrl;
      let genreOverride: string | null = res.genre;
      if (artistChoice && artistChoice.id != null) {
        try {
          setFetching({ artist: c.artist, step: "Fetching artist image & genre…" });
          const d = await fetchDeezerById({ data: { id: artistChoice.id } });
          imageOverride = d.image ?? imageOverride;
          genreOverride = d.genre ?? genreOverride;
        } catch {
          // keep setlist.fm values
        }
      }

      // Co-performer probe.
      let coPerformers: CoPerformer[] = [];
      const venue = res.venue ?? c.venue;
      if (venue) {
        try {
          setFetching({ artist: c.artist, step: "Checking for other artists that day…" });
          const exclude = [res.artist ?? c.artist, ...(res.openers ?? [])];
          coPerformers = await fetchCoPerformers({
            data: { date: c.date, venue, excludeArtists: exclude },
          });
          // Drop co-performers already in the user's archive on this date.
          const sameDay = new Set(
            concerts
              .filter((x) => x.id !== c.id && x.date === c.date)
              .map((x) => x.artist.toLowerCase()),
          );
          coPerformers = coPerformers.filter(
            (cp) => !sameDay.has(cp.artist.toLowerCase()),
          );
        } catch {
          coPerformers = [];
        }
      }

      // Start fresh from setlist.fm — do NOT carry over the concert's prior openers,
      // otherwise repeated refreshes pile up duplicates.
      let finalHeadliner = res.artist ?? c.artist;
      let finalOpeners: string[] | null = res.openers.length > 0 ? [...res.openers] : null;
      const extraConcerts: Array<{
        performer: CoPerformer;
        isHeadliner: boolean;
        otherInGroup: string[];
      }> = [];

      if (coPerformers.length > 0) {
        const decision = await askCoPerformers(c, coPerformers);
        if (decision.kind === "cancel") return { status: "cancelled", coLogged };
        if (decision.kind === "log" && decision.selected.length > 0) {
          const selectedSet = new Set(decision.selected);
          const allGroup = [res.artist ?? c.artist, ...decision.selected];
          finalHeadliner = decision.headliner;
          if (decision.headliner.toLowerCase() !== (res.artist ?? c.artist).toLowerCase()) {
            // The original concert is now a support act.
            finalOpeners = null;
          } else {
            const existing = new Set((finalOpeners ?? []).map((o) => o.toLowerCase()));
            finalOpeners = [
              ...(finalOpeners ?? []),
              ...decision.selected.filter((s) => !existing.has(s.toLowerCase())),
            ];
          }
          for (const cp of coPerformers) {
            if (!selectedSet.has(cp.artist)) continue;
            const isCpHeadliner =
              cp.artist.toLowerCase() === decision.headliner.toLowerCase();
            const otherInGroup = allGroup.filter(
              (a) => a.toLowerCase() !== cp.artist.toLowerCase(),
            );
            extraConcerts.push({ performer: cp, isHeadliner: isCpHeadliner, otherInGroup });
          }
        }
      }

      setFetching({ artist: c.artist, step: "Saving…" });
      await update.mutateAsync({
        id: c.id,
        artist: c.artist,
        tour: res.tour ?? "",
        openers: finalOpeners,
        date: c.date,
        venue: res.venue ?? c.venue,
        city: res.city ?? c.city,
        country: res.country ?? c.country,
        rating: c.rating,
        genre: genreOverride ?? c.genre,
        notes:
          finalHeadliner.toLowerCase() !== c.artist.toLowerCase()
            ? `Support act for ${finalHeadliner}`
            : c.notes,
        ticketPrice: c.ticketPrice,
        songsSeen: res.songsSeen ?? c.songsSeen,
        setlist: res.songs.length > 0 ? res.songs : c.setlist,
        artistImageUrl: imageOverride ?? c.artistImageUrl,
        openerSetlists:
          res.openerSetlists.length > 0 ? res.openerSetlists : c.openerSetlists,
      });

      // Log co-performers as new concerts.
      for (const extra of extraConcerts) {
        try {
          setFetching({ artist: extra.performer.artist, step: "Adding co-performer…" });
          let image: string | null = null;
          let genre: string | null = null;
          try {
            const sug = await fetchSearchArtists({ data: { query: extra.performer.artist } });
            const hit = sug.find(
              (s) => s.name.toLowerCase() === extra.performer.artist.toLowerCase(),
            ) ?? sug[0];
            if (hit?.id != null) {
              const d = await fetchDeezerById({ data: { id: hit.id } });
              image = d.image;
              genre = d.genre;
            } else if (hit) {
              image = hit.image;
            }
          } catch {
            // ignore image/genre failure
          }
          await add.mutateAsync({
            artist: extra.performer.artist,
            tour: extra.performer.tour,
            openers: extra.isHeadliner ? extra.otherInGroup : null,
            date: c.date,
            venue: extra.performer.venue,
            city: extra.performer.city ?? c.city,
            country: extra.performer.country ?? c.country,
            rating: 8,
            genre,
            notes: extra.isHeadliner ? null : `Support act for ${finalHeadliner}`,
            ticketPrice: null,
            songsSeen: extra.performer.songs.length || null,
            setlist: extra.performer.songs.length ? extra.performer.songs : null,
            artistImageUrl: image,
            openerSetlists: null,
          });
          coLogged++;
        } catch {
          // ignore single add failure
        }
      }

      await syncTicketPriceAcrossShow(c.date, res.venue ?? c.venue);
      return { status: "updated", coLogged };
    } catch {
      return { status: "failed", coLogged };
    }
  }

  async function handleRefreshOne(c: Concert) {
    if (refresh.running) return;
    artistChoiceCache.current.clear();
    setRefresh({ running: true, done: 0, total: 1 });
    const r = await refreshOne(c);
    setPrompt(null);
    setFetching(null);
    setRefresh({ running: false, done: 0, total: 0 });
    if (r.status === "updated") {
      toast.success(
        `Refreshed ${c.artist}` +
          (r.coLogged ? ` · added ${r.coLogged} co-performer${r.coLogged === 1 ? "" : "s"}` : ""),
      );
    } else if (r.status === "skipped") toast.info(`Skipped ${c.artist}`);
    else if (r.status === "cancelled") toast.info("Cancelled");
    else toast.error(`Couldn't refresh ${c.artist}`);
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
        `Fetch fresh info for all ${targets.length} show${
          targets.length === 1 ? "" : "s"
        }? You'll be asked to confirm when something's ambiguous. Existing rating, notes, and ticket price are always kept.`,
      )
    )
      return;
    artistChoiceCache.current.clear();
    setRefresh({ running: true, done: 0, total: targets.length });
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let coLogged = 0;
    let cancelled = false;

    for (let i = 0; i < targets.length; i++) {
      const r = await refreshOne(targets[i]);
      coLogged += r.coLogged;
      if (r.status === "updated") updated++;
      else if (r.status === "skipped") skipped++;
      else if (r.status === "failed") failed++;
      else if (r.status === "cancelled") {
        cancelled = true;
        break;
      }
      setRefresh({ running: true, done: i + 1, total: targets.length });
    }

    setPrompt(null);
    setFetching(null);
    setRefresh({ running: false, done: 0, total: 0 });
    const msg =
      `Refreshed ${updated} show${updated === 1 ? "" : "s"}` +
      (coLogged ? ` · added ${coLogged} co-performer${coLogged === 1 ? "" : "s"}` : "") +
      (skipped ? ` · ${skipped} skipped` : "") +
      (failed ? ` · ${failed} failed` : "") +
      (cancelled ? " · cancelled" : "");
    if (cancelled) toast.info(msg);
    else toast.success(msg);
  }

  const acceptedFriends = friendData?.friends ?? [];
  const friendProfiles = friendData?.profiles ?? {};
  const pageTitle = friendProfile ? `${friendProfile.displayName.split(" ")[0]}'s Shows` : "My Shows";

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      {friendProfile && (
        <Link
          to="/friend/$id"
          params={{ id: friendId! }}
          className="mb-4 inline-block text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          ← Back to {friendProfile.displayName.split(" ")[0]}'s dashboard
        </Link>
      )}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{pageTitle}</h1>
          <p className="mt-2 text-muted-foreground">
            {monthLabel
              ? `Showing ${list.length} show${list.length === 1 ? "" : "s"} in ${monthLabel}`
              : year
                ? `Showing ${list.length} show${list.length === 1 ? "" : "s"} in ${year}`
                : genre
                  ? `Showing ${list.length} show${list.length === 1 ? "" : "s"} tagged ${genre}`
                  : withFriendsSet.size > 0
                    ? `Showing ${list.length} co-attended show${list.length === 1 ? "" : "s"}.`
                    : friendProfile
                      ? `Every gig in their archive — ${concerts.length} total.`
                      : `Every gig in your archive — ${concerts.length} total.`}
          </p>
          {(month || genre || year || withFriendsSet.size > 0) && (
            <button
              type="button"
              onClick={() => nav({ to: "/shows", search: friendId ? { friendId } : {} })}
              className="mt-2 inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-3 py-1 text-xs font-semibold hover:bg-surface-2"
            >
              <X className="h-3 w-3" /> Clear filters
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
          {!readOnly && (
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
          )}
        </div>
      </div>

      {!readOnly && acceptedFriends.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-hairline bg-card p-3">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Users className="h-3 w-3" /> Attended with
          </span>
          {acceptedFriends.map((f) => {
            const p = friendProfiles[f.otherUserId];
            if (!p) return null;
            const active = withFriendsSet.has(p.userId);
            return (
              <button
                key={p.userId}
                type="button"
                onClick={() => toggleFriendFilter(p.userId)}
                className={
                  "rounded-full px-3 py-1 text-xs font-semibold transition " +
                  (active
                    ? "bg-foreground text-background"
                    : "border border-hairline bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-2")
                }
                title={`Filter shows ${p.displayName} also attended`}
              >
                @{p.username ?? p.displayName}
              </button>
            );
          })}
          {withFriendsSet.size > 0 && (
            <button
              type="button"
              onClick={() => nav({ to: "/shows", search: { month, genre, year, friendId } })}
              className="ml-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" /> clear
            </button>
          )}
        </div>
      )}


      <div className="overflow-hidden rounded-2xl border border-hairline">
        <table className="w-full text-left">
          <thead className="border-b border-hairline bg-surface text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-bold md:px-6">Artist</th>
              <th className="hidden px-4 py-3 font-bold md:table-cell md:px-6">Venue</th>
              <th className="hidden px-4 py-3 font-bold lg:table-cell">Tour</th>
              <th className="px-4 py-3 font-bold md:px-6">Date</th>
              <th className="px-4 py-3 text-right font-bold md:px-6">Rating</th>
              {!readOnly && <th className="px-4 py-3 text-right font-bold md:px-6">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline bg-card/40">
            {list.map((c) => (
              <tr
                key={c.id}
                onClick={readOnly ? undefined : () => nav({ to: "/show/$id", params: { id: c.id } })}
                className={cn("transition-colors", readOnly ? "cursor-default" : "cursor-pointer hover:bg-surface-2/60")}
              >
                <td className="px-4 py-4 md:px-6">
                  <div className="flex items-center gap-3">
                    {c.artistImageUrl ? (
                      <img src={c.artistImageUrl} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover" />
                    ) : null}
                    <div>
                      <div className="font-semibold">{c.artist}</div>
                      <div className="text-xs text-muted-foreground md:hidden">{c.venue} · {c.city}</div>
                      {!readOnly && coAttendance && (() => {
                        const attendees =
                          coAttendance.byKey[coAttendanceKey(c.date, c.venue, c.city)] ?? [];
                        if (attendees.length === 0) return null;
                        return (
                          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-teal">
                            <Users className="h-3 w-3" />
                            with {attendees.map((a) => `@${a.username ?? a.displayName}`).join(", ")}
                          </div>
                        );
                      })()}
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
                {!readOnly && (
                  <td className="px-4 py-4 md:px-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleRefreshOne(c)}
                        disabled={refresh.running}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                        aria-label={`Refresh ${c.artist}`}
                        title="Refresh info for this show"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
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
                )}
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

      {prompt && <WizardModal prompt={prompt} progress={refresh} />}
      {!prompt && fetching && refresh.running && (
        <FetchingOverlay artist={fetching.artist} step={fetching.step} progress={refresh} />
      )}
    </main>
  );
}

// ---------- Wizard modal ----------

function WizardModal({
  prompt,
  progress,
}: {
  prompt: Prompt;
  progress: { done: number; total: number };
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-hairline bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-hairline bg-surface px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <span>Refresh wizard</span>
          <span>{progress.done + 1} / {progress.total}</span>
        </div>
        <div className="p-6">
          {prompt.kind === "artist" && <ArtistPane prompt={prompt} />}
          {prompt.kind === "co_performers" && <CoPerformerPane prompt={prompt} />}
          {prompt.kind === "not_found" && <NotFoundPane prompt={prompt} />}
        </div>
      </div>
    </div>
  );
}

function ArtistPane({ prompt }: { prompt: ArtistPrompt }) {
  const { concert, suggestions, artistKind, query, resolve } = prompt;
  const heading =
    artistKind === "ambiguous"
      ? `Multiple artists named "${query}"`
      : suggestions.length === 0
        ? `Couldn't find "${query}" on Spotify`
        : `Pick the closest match for "${query}"`;
  const sub =
    artistKind === "ambiguous"
      ? `For ${concert.venue}, ${concert.date}. Which one did you see?`
      : `For ${concert.venue}, ${concert.date}.`;

  return (
    <div>
      <h2 className="font-display text-xl font-extrabold">{heading}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{sub}</p>

      {suggestions.length === 0 ? (
        <p className="mt-4 rounded-xl border border-hairline bg-surface p-4 text-sm text-muted-foreground">
          No suggestions to show. Skip to keep the show as-is.
        </p>
      ) : (
        <ul className="mt-4 grid max-h-72 grid-cols-1 gap-2 overflow-auto md:grid-cols-2">
          {suggestions.map((s) => (
            <li key={`${s.name}-${s.id ?? ""}`}>
              <button
                type="button"
                onClick={() => resolve(s)}
                className="flex w-full items-center gap-3 rounded-xl border border-hairline bg-surface p-3 text-left hover:bg-surface-2"
              >
                {s.image ? (
                  <img src={s.image} alt="" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-surface-2" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.nbFan != null ? `${formatFans(s.nbFan)} fans` : "Spotify artist"}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => resolve("cancel")}
          className="rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive"
        >
          Cancel refresh
        </button>
        <button
          type="button"
          onClick={() => resolve("skip")}
          className="rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold hover:bg-surface-2"
        >
          Skip this show
        </button>
      </div>
    </div>
  );
}

function CoPerformerPane({ prompt }: { prompt: CoPerformerPrompt }) {
  const { concert, coPerformers, resolve } = prompt;
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(coPerformers.map((c) => c.artist)),
  );
  const [headliner, setHeadliner] = useState<string>(concert.artist);

  function toggle(name: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div>
      <h2 className="font-display text-xl font-extrabold flex items-center gap-2">
        <Users className="h-5 w-5" /> Other artists played here
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        At {concert.venue} on {concert.date}. Pick which to log and mark the headliner.
      </p>

      <ul className="mt-4 max-h-72 space-y-2 overflow-auto">
        <li className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3">
          <input type="checkbox" checked disabled className="h-4 w-4" />
          <button
            type="button"
            onClick={() => setHeadliner(concert.artist)}
            className={`flex h-7 w-7 items-center justify-center rounded-full border ${
              headliner.toLowerCase() === concert.artist.toLowerCase()
                ? "border-brand bg-brand/20 text-brand"
                : "border-hairline text-muted-foreground hover:bg-surface-2"
            }`}
            title="Mark as headliner"
          >
            <Crown className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-0 flex-grow">
            <div className="text-sm font-semibold">{concert.artist}</div>
            <div className="text-xs text-muted-foreground">Already in your archive</div>
          </div>
        </li>
        {coPerformers.map((cp) => {
          const isSel = selected.has(cp.artist);
          const isHead = headliner.toLowerCase() === cp.artist.toLowerCase();
          return (
            <li key={cp.artist} className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-3">
              <input
                type="checkbox"
                checked={isSel}
                onChange={() => toggle(cp.artist)}
                className="h-4 w-4"
              />
              <button
                type="button"
                disabled={!isSel}
                onClick={() => setHeadliner(cp.artist)}
                className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                  isHead
                    ? "border-brand bg-brand/20 text-brand"
                    : "border-hairline text-muted-foreground hover:bg-surface-2"
                } disabled:opacity-30`}
                title="Mark as headliner"
              >
                <Crown className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0 flex-grow">
                <div className="text-sm font-semibold">{cp.artist}</div>
                <div className="text-xs text-muted-foreground">
                  {cp.tour ?? "—"} · {cp.songs.length} songs
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => resolve({ kind: "cancel" })}
          className="rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive"
        >
          Cancel refresh
        </button>
        <button
          type="button"
          onClick={() => resolve({ kind: "skip" })}
          className="rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold hover:bg-surface-2"
        >
          Don't log any
        </button>
        <button
          type="button"
          onClick={() =>
            resolve({
              kind: "log",
              selected: [...selected],
              headliner,
            })
          }
          className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90"
        >
          Log {selected.size} & continue
        </button>
      </div>
    </div>
  );
}

function NotFoundPane({ prompt }: { prompt: NotFoundPrompt }) {
  const { concert, fallback, resolve } = prompt;
  return (
    <div>
      <h2 className="font-display text-xl font-extrabold">Show not found on setlist.fm</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {concert.artist} · {concert.venue} · {concert.date}. We can still apply the artist's profile picture and genre.
      </p>

      <div className="mt-4 flex items-center gap-4 rounded-xl border border-hairline bg-surface p-4">
        {fallback?.image ? (
          <img src={fallback.image} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-surface-2" />
        )}
        <div className="text-sm">
          <div className="font-semibold">{concert.artist}</div>
          <div className="text-muted-foreground">{fallback?.genre ?? "No genre found"}</div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => resolve("cancel")}
          className="rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold hover:bg-destructive/10 hover:text-destructive"
        >
          Cancel refresh
        </button>
        <button
          type="button"
          onClick={() => resolve("skip")}
          className="rounded-full border border-hairline bg-surface px-4 py-2 text-xs font-semibold hover:bg-surface-2"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => resolve("apply")}
          className="rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90"
        >
          Apply image & genre
        </button>
      </div>
    </div>
  );
}

function formatFans(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function FetchingOverlay({
  artist,
  step,
  progress,
}: {
  artist: string;
  step: string;
  progress: { done: number; total: number };
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-hairline bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-hairline bg-surface px-5 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <span>Fetching info</span>
          {progress.total > 1 && (
            <span>
              {Math.min(progress.done + 1, progress.total)} / {progress.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 p-6">
          <RefreshCw className="h-6 w-6 flex-shrink-0 animate-spin text-brand" />
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-extrabold">{artist}</div>
            <div className="truncate text-sm text-muted-foreground">{step}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
