import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Calendar, Check, ImagePlus, ListMusic, MapPin, Music, Pencil, Play, Plus, Search, Star, Ticket, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAvatarUrl, useConcertDetail, useConcerts, useDeleteConcert } from "@/lib/concerts";
import { samePlace } from "@/lib/music-match";
import { useFriendsAtShow, type FriendProfile } from "@/lib/friends";
import {
  createSpotifyPlaylist,
  getSpotifyStatus,
  matchSetlistOnSpotify,
  searchSpotifyTracks,
  type SpotifyTrackSummary,
} from "@/lib/spotify.functions";
import {
  useConcertMedia,
  useDeleteConcertMedia,
  useSignedMediaUrl,
  useUploadConcertMedia,
  type ConcertMediaItem,
} from "@/lib/concert-media";
import { ctaClass } from "@/components/cta";
import { IconTip } from "@/components/icon-tip";

export const Route = createFileRoute("/_authenticated/show/$id")({
  head: () => ({
    meta: [
      { title: "Show · Concertly" },
      { name: "description", content: "Concert details on Concertly: setlist, openers, venue, rating, photos and friends who were at the same show." },
    ],
  }),
  component: ShowDetail,
});

function ShowDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { data: concerts, isLoading } = useConcerts();
  const del = useDeleteConcert();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const concert = concerts?.find((c) => c.id === id);
  // Setlists aren't in the list query; load this show's full row for them.
  const { data: detail, isLoading: detailLoading } = useConcertDetail(id);
  const setlist = detail?.setlist ?? [];
  const openerSetlists = detail?.openerSetlists ?? [];

  // Merge stored openers with any same-date/same-venue concerts logged as a
  // support act for this artist (these are stored as their own row, so the
  // headliner row's `openers` column doesn't know about them).
  const mergedOpeners = (() => {
    if (!concert) return [] as string[];
    const stored = concert.openers ?? [];
    const supportNote = `support act for ${concert.artist.toLowerCase()}`;
    const implicit = (concerts ?? [])
      .filter(
        (c) =>
          c.id !== concert.id &&
          c.date === concert.date &&
          samePlace(c.venue, concert.venue) &&
          (c.notes ?? "").trim().toLowerCase().startsWith(supportNote),
      )
      .map((c) => c.artist);
    const seen = new Set<string>();
    return [...stored, ...implicit].filter((name) => {
      const k = name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  })();

  if (isLoading) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-20">
        <div className="h-12 w-72 animate-pulse rounded-xl bg-surface-2" />
      </main>
    );
  }

  if (!concert) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="font-display text-3xl font-extrabold">Show not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been deleted.</p>
        <Link to="/shows" className={ctaClass({}, "mt-6")}>
          Back to my shows
        </Link>
      </main>
    );
  }

  const d = new Date(concert.date);

  async function handleDelete() {
    if (!concert) return;
    try {
      await del.mutateAsync(concert.id);
      setConfirmDelete(false);
      toast.success("Show deleted");
      nav({ to: "/shows" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 md:py-14">
      <Link to="/shows" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to my shows
      </Link>

      <header className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-5">
          {concert.artistImageUrl ? (
            <img
              src={concert.artistImageUrl}
              alt={concert.artist}
              className="h-24 w-24 flex-shrink-0 rounded-2xl object-cover md:h-32 md:w-32"
            />
          ) : null}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              {d.toLocaleString("en", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </p>
            <h1 className="mt-2 font-display text-5xl font-extrabold leading-[0.95] tracking-tight md:text-7xl">
              {concert.artist}
            </h1>
            {concert.tour && (
              <p className="mt-3 text-lg text-muted-foreground">{concert.tour}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/add"
            search={{ id: concert.id }}
            className="inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold hover:bg-surface-2"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={del.isPending}
            className="inline-flex items-center gap-2 rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </header>

      <section className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-hairline bg-hairline md:grid-cols-4">
        <Tile icon={Star} label="Rating" value={concert.rating.toFixed(1)} accent />
        <Tile icon={MapPin} label="Venue" value={concert.venue} sub={`${concert.city}${concert.country ? `, ${concert.country}` : ""}`} />
        <Tile icon={Music} label="Genre" value={concert.genre ?? "-"} />
        <Tile icon={Ticket} label="Ticket" value={concert.ticketPrice != null ? `$${concert.ticketPrice}` : "-"} sub={concert.songsSeen ? `${concert.songsSeen} songs` : undefined} />
      </section>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <article className="space-y-8">
          <div className="rounded-3xl border border-hairline bg-card p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <Music className="h-4 w-4 text-brand" /> Setlist
              </h2>
              {setlist.length ? (
                <SpotifyPlaylistButton
                  concertId={concert.id}
                  artist={concert.artist}
                  defaultName={`${concert.artist} - ${concert.country || concert.city} - ${new Date(concert.date).getFullYear()}`}
                />
              ) : null}
            </div>
            {detailLoading ? (
              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Loading setlist">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="h-9 animate-pulse rounded-xl bg-surface-2" />
                ))}
              </div>
            ) : setlist.length ? (
              <ol className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {setlist.map((song, i) => (
                  <li
                    key={`${song}-${i}`}
                    className="flex items-baseline gap-3 rounded-xl border border-hairline bg-surface/50 px-3 py-2"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <span className="truncate text-sm">{song}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                No setlist recorded for this show. Edit it and run auto-fill to pull from setlist.fm.
              </p>
            )}
          </div>

          {openerSetlists.length ? (
            <div className="rounded-3xl border border-hairline bg-card p-6 md:p-8">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <Users className="h-4 w-4 text-brand" /> Opener setlists
              </h2>
              <div className="mt-6 space-y-5">
                {openerSetlists.map((o, oi) => (
                  <div key={"opener-" + oi}>
                    <h3 className="text-sm font-bold">{o.artist} <span className="text-muted-foreground">· {o.songs.length} songs</span></h3>
                    <ol className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {o.songs.map((song, i) => (
                        <li
                          key={`${o.artist}-${i}`}
                          className="flex items-baseline gap-3 rounded-xl border border-hairline bg-surface/40 px-3 py-1.5"
                        >
                          <span className="font-mono text-[11px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                          <span className="truncate text-xs">{song}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <MediaSection concertId={concert.id} />
        </article>


        <aside className="space-y-6">
          {mergedOpeners.length ? (
            <div className="rounded-3xl border border-hairline bg-card p-6">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Openers
              </h3>
              <ul className="mt-3 space-y-2">
                {mergedOpeners.map((o) => (
                  <li key={o} className="text-sm font-semibold">{o}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <FriendsAtShow date={concert.date} venue={concert.venue} city={concert.city} />

          {concert.notes && (
            <div className="rounded-3xl border border-hairline bg-card p-6">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> Your notes
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{concert.notes}</p>
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete "${concert.artist}"?`}
        description="This removes the show from your archive. It cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={handleDelete}
        onOpenChange={setConfirmDelete}
      />
    </main>
  );
}

function Tile({
  icon: Icon, label, value, sub, accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-card p-5 md:p-6">
      <div className="flex items-center gap-2 eyebrow text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={"mt-2 font-display text-2xl font-extrabold leading-tight " + (accent ? "text-brand" : "")}>
        {value}
      </p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function FriendsAtShow({ date, venue, city }: { date: string; venue: string; city: string }) {
  const { data: friends = [], isLoading } = useFriendsAtShow({ date, venue, city });
  if (isLoading || friends.length === 0) return null;
  return (
    <div className="rounded-3xl border border-hairline bg-card p-6">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <Users className="h-3.5 w-3.5 text-teal" /> Friends who were there
      </h3>
      <ul className="mt-3 space-y-2">
        {friends.map((f) => (
          <FriendRow key={f.userId} friend={f} />
        ))}
      </ul>
    </div>
  );
}

function FriendRow({ friend }: { friend: FriendProfile }) {
  const url = useAvatarUrl(friend.avatarPath);
  const initials = (friend.displayName || friend.username || "U")
    .split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <li>
      <Link
        to="/friend/$id"
        params={{ id: friend.userId }}
        className="flex items-center gap-2.5 rounded-xl -mx-1 px-1 py-1 hover:bg-surface-2"
      >
        <div className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-full border border-hairline bg-surface-2 text-[11px] font-bold">
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{friend.displayName}</p>
          {friend.username && (
            <p className="truncate font-mono text-[11px] text-muted-foreground">@{friend.username}</p>
          )}
        </div>
      </Link>
    </li>
  );
}

type PlaylistRow = { song: string; track: SpotifyTrackSummary | null; skip: boolean };

function SpotifyPlaylistButton({
  concertId,
  defaultName,
  artist,
}: {
  concertId: string;
  defaultName: string;
  artist: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [rows, setRows] = useState<PlaylistRow[] | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [fixing, setFixing] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const { data: status } = useQuery({
    queryKey: ["spotify-status"],
    queryFn: () => getSpotifyStatus(),
  });

  async function startMatching() {
    setRows(null);
    setMatchError(null);
    setFixing(null);
    try {
      const res = await matchSetlistOnSpotify({ data: { concertId } });
      setRows(res.matches.map((m) => ({ ...m, skip: false })));
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Couldn't search Spotify");
    }
  }

  function updateRow(i: number, patch: Partial<PlaylistRow>) {
    setRows((prev) => prev && prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  const included = rows?.filter((r) => !r.skip) ?? [];
  const unresolved = included.filter((r) => !r.track).length;
  const uris = included.flatMap((r) => (r.track ? [r.track.uri] : []));
  const canCreate = !!rows && unresolved === 0 && uris.length > 0 && !!name.trim();

  async function onCreate() {
    if (!canCreate) return;
    setCreating(true);
    try {
      const res = await createSpotifyPlaylist({ data: { concertId, name: name.trim(), uris } });
      const toastOptions = res.playlistUrl
        ? {
            action: {
              label: "Open",
              onClick: () => window.open(res.playlistUrl!, "_blank", "noopener"),
            },
          }
        : undefined;
      if (res.warning) toast.warning(res.warning, toastOptions);
      else toast.success(`Playlist created with ${res.added} tracks`, toastOptions);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create playlist");
    } finally {
      setCreating(false);
    }
  }

  if (!status?.connected) {
    return (
      <Link
        to="/profile"
        className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-surface-2"
        title="Connect Spotify on your profile"
      >
        <ListMusic className="h-3.5 w-3.5" /> Connect Spotify
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setName(defaultName);
          setOpen(true);
          void startMatching();
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-spotify px-3 py-1.5 text-[11px] font-bold text-black hover:opacity-90"
      >
        <ListMusic className="h-3.5 w-3.5" /> Spotify playlist
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => !creating && setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-hairline bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-xl font-bold">Create Spotify playlist</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Check each song's match before the private playlist is created.
            </p>
            <label className="mt-5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Playlist name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="mt-2 w-full rounded-xl border border-hairline bg-surface px-4 py-3 text-sm outline-none focus:border-brand"
            />

            <div className="mt-5 flex items-baseline justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Tracks
              </p>
              {rows && (
                <p className="text-[11px] text-muted-foreground">
                  {rows.filter((r) => r.track && !r.skip).length} of {rows.length} matched
                </p>
              )}
            </div>
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-xl border border-hairline">
              {matchError ? (
                <div className="space-y-3 p-4 text-sm">
                  <p className="text-destructive">{matchError}</p>
                  <button
                    type="button"
                    onClick={() => void startMatching()}
                    className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold hover:bg-surface-2"
                  >
                    Try again
                  </button>
                </div>
              ) : !rows ? (
                <div className="space-y-2 p-3" aria-label="Finding songs on Spotify">
                  <p className="px-1 text-xs text-muted-foreground">Finding each song on Spotify…</p>
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-2" />
                  ))}
                </div>
              ) : (
                <ol className="divide-y divide-hairline">
                  {rows.map((row, i) => (
                    <PlaylistTrackRow
                      key={i}
                      index={i}
                      row={row}
                      artist={artist}
                      fixing={fixing === i}
                      onFix={() => setFixing(fixing === i ? null : i)}
                      onPick={(track) => {
                        updateRow(i, { track, skip: false });
                        setFixing(null);
                      }}
                      onToggleSkip={() => updateRow(i, { skip: !row.skip })}
                    />
                  ))}
                </ol>
              )}
            </div>

            {unresolved > 0 && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-pink" />
                {unresolved === 1 ? "1 song isn't" : `${unresolved} songs aren't`} matched yet. Find
                {unresolved === 1 ? " it" : " them"} on Spotify or skip to continue.
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={creating}
                className="rounded-full border border-hairline px-4 py-2 text-xs font-semibold hover:bg-surface-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={creating || !canCreate}
                className="rounded-full bg-spotify px-4 py-2 text-xs font-bold text-black hover:opacity-90 disabled:opacity-60"
              >
                {creating ? "Creating…" : `Create playlist${uris.length ? ` (${uris.length})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PlaylistTrackRow({
  index,
  row,
  artist,
  fixing,
  onFix,
  onPick,
  onToggleSkip,
}: {
  index: number;
  row: PlaylistRow;
  artist: string;
  fixing: boolean;
  onFix: () => void;
  onPick: (track: SpotifyTrackSummary) => void;
  onToggleSkip: () => void;
}) {
  const { song, track, skip } = row;
  return (
    <li className={`px-3 py-2.5 ${skip ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="w-5 flex-none text-right font-mono text-[11px] text-muted-foreground">
          {index + 1}
        </span>
        <div className="grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-md bg-surface-2">
          {track?.image ? (
            <img src={track.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <Music className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{song}</p>
          {track ? (
            <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <Check className="h-3 w-3 flex-none text-spotify" />
              <span className="truncate">
                {track.name} · {track.artists}
              </span>
            </p>
          ) : (
            <p className="text-[11px] font-semibold text-pink">
              {skip ? "Skipped" : "Not found on Spotify"}
            </p>
          )}
        </div>
        <div className="flex flex-none gap-1">
          <IconTip label={track ? "Change match" : "Find on Spotify"}>
            <button
              type="button"
              onClick={onFix}
              aria-label={track ? "Change match" : "Find on Spotify"}
              className={`grid h-8 w-8 place-items-center rounded-full border border-hairline hover:bg-surface-2 ${
                fixing ? "bg-surface-2" : ""
              }`}
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </IconTip>
          <IconTip label={skip ? "Include song" : "Skip song"}>
            <button
              type="button"
              onClick={onToggleSkip}
              aria-label={skip ? "Include song" : "Skip song"}
              className="grid h-8 w-8 place-items-center rounded-full border border-hairline hover:bg-surface-2"
            >
              {skip ? <Plus className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
            </button>
          </IconTip>
        </div>
      </div>
      {fixing && <TrackSearch initialQuery={`${song} ${artist}`} onPick={onPick} />}
    </li>
  );
}

function TrackSearch({
  initialQuery,
  onPick,
}: {
  initialQuery: string;
  onPick: (track: SpotifyTrackSummary) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery);
  const { data: results, isFetching, error } = useQuery({
    queryKey: ["spotify-track-search", submitted],
    queryFn: () => searchSpotifyTracks({ data: { query: submitted } }),
    enabled: submitted.trim().length > 0,
    staleTime: 60_000,
  });

  return (
    <div className="mt-2 ml-8 space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 py-2 text-xs outline-none focus:border-brand"
          placeholder="Song and artist"
        />
        <button
          type="submit"
          className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold hover:bg-surface-2"
        >
          Search
        </button>
      </form>
      {isFetching ? (
        <p className="text-[11px] text-muted-foreground">Searching…</p>
      ) : error ? (
        <p className="text-[11px] text-destructive">Search failed. Try again.</p>
      ) : results && results.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No results. Try a different spelling.</p>
      ) : (
        <ul className="space-y-1">
          {results?.map((t) => (
            <li key={t.uri}>
              <button
                type="button"
                onClick={() => onPick(t)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
              >
                <div className="h-7 w-7 flex-none overflow-hidden rounded bg-surface-2">
                  {t.image && <img src={t.image} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{t.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {t.artists}
                    {t.album ? ` · ${t.album}` : ""}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MediaSection({ concertId }: { concertId: string }) {
  const { data: media = [], isLoading } = useConcertMedia(concertId);
  const upload = useUploadConcertMedia(concertId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<ConcertMediaItem | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const tooBig = arr.find((f) => f.size > 50 * 1024 * 1024);
    if (tooBig) {
      toast.error(`"${tooBig.name}" is over 50 MB`);
      return;
    }
    try {
      await upload.mutateAsync(arr);
      toast.success(`Uploaded ${arr.length} file${arr.length > 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-3xl border border-hairline bg-card p-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold">
          <ImagePlus className="h-4 w-4 text-brand" /> Photos & videos
        </h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className={ctaClass({ size: "sm" })}
        >
          <ImagePlus className="h-3.5 w-3.5" />
          {upload.isPending ? "Uploading…" : "Add media"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {isLoading ? (
        <div className="mt-6 h-24 animate-pulse rounded-xl bg-surface-2" />
      ) : media.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No photos or videos yet. Add memories from the show.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {media.map((m) => (
            <MediaThumb key={m.path} item={m} concertId={concertId} onOpen={() => setLightbox(m)} />
          ))}
        </div>
      )}

      {lightbox && <MediaLightbox item={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function MediaThumb({
  item,
  concertId,
  onOpen,
}: {
  item: ConcertMediaItem;
  concertId: string;
  onOpen: () => void;
}) {
  const url = useSignedMediaUrl(item.path);
  const del = useDeleteConcertMedia(concertId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onDelete() {
    try {
      await del.mutateAsync(item.path);
      setConfirmDelete(false);
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-hairline bg-surface-2">
      <button
        type="button"
        onClick={onOpen}
        className="block h-full w-full"
      >
        {url ? (
          item.kind === "image" ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <>
              <video src={url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30">
                <Play className="h-8 w-8 text-white" />
              </div>
            </>
          )
        ) : (
          <div className="h-full w-full animate-pulse bg-surface-2" />
        )}
      </button>
      <IconTip label="Delete">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmDelete(true);
          }}
          aria-label="Delete file"
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-destructive group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </IconTip>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete this ${item.kind === "image" ? "photo" : "video"}?`}
        description="It will be removed from this show. It cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={onDelete}
        onOpenChange={setConfirmDelete}
      />
    </div>
  );
}

function MediaLightbox({ item, onClose }: { item: ConcertMediaItem; onClose: () => void }) {
  const url = useSignedMediaUrl(item.path);
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        {url ? (
          item.kind === "image" ? (
            <img src={url} alt="" className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
          ) : (
            <video src={url} controls autoPlay className="max-h-[85vh] max-w-full rounded-2xl" />
          )
        ) : null}
      </div>
    </div>
  );
}
