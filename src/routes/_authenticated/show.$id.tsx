import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Calendar, ListMusic, MapPin, Music, Pencil, Star, Ticket, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useAvatarUrl, useConcerts, useDeleteConcert } from "@/lib/concerts";
import { useFriendsAtShow, type FriendProfile } from "@/lib/friends";
import { createSpotifyPlaylist, getSpotifyStatus } from "@/lib/spotify.functions";

export const Route = createFileRoute("/_authenticated/show/$id")({
  head: () => ({ meta: [{ title: "Show · Concertly" }] }),
  component: ShowDetail,
});

function ShowDetail() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const { data: concerts, isLoading } = useConcerts();
  const del = useDeleteConcert();
  const concert = concerts?.find((c) => c.id === id);

  // Merge stored openers with any same-date/same-venue concerts logged as a
  // support act for this artist (these are stored as their own row, so the
  // headliner row's `openers` column doesn't know about them).
  const mergedOpeners = (() => {
    if (!concert) return [] as string[];
    const stored = concert.openers ?? [];
    const supportNote = `support act for ${concert.artist.toLowerCase()}`;
    const venueKey = concert.venue.trim().toLowerCase();
    const implicit = (concerts ?? [])
      .filter(
        (c) =>
          c.id !== concert.id &&
          c.date === concert.date &&
          c.venue.trim().toLowerCase() === venueKey &&
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
        <Link to="/shows" className="mt-6 inline-block rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-foreground">
          Back to my shows
        </Link>
      </main>
    );
  }

  const d = new Date(concert.date);

  async function handleDelete() {
    if (!concert) return;
    if (!confirm(`Delete "${concert.artist}" from your archive?`)) return;
    try {
      await del.mutateAsync(concert.id);
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
            onClick={handleDelete}
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
        <Tile icon={Music} label="Genre" value={concert.genre ?? "—"} />
        <Tile icon={Ticket} label="Ticket" value={concert.ticketPrice != null ? `$${concert.ticketPrice}` : "—"} sub={concert.songsSeen ? `${concert.songsSeen} songs` : undefined} />
      </section>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <article className="space-y-8">
          <div className="rounded-3xl border border-hairline bg-card p-6 md:p-8">
            <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
              <Music className="h-4 w-4 text-brand" /> Setlist
            </h2>
            {concert.setlist?.length ? (
              <ol className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {concert.setlist.map((song, i) => (
                  <li
                    key={`${song}-${i}`}
                    className="flex items-baseline gap-3 rounded-lg border border-hairline bg-surface/50 px-3 py-2"
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

          {concert.openerSetlists?.length ? (
            <div className="rounded-3xl border border-hairline bg-card p-6 md:p-8">
              <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
                <Users className="h-4 w-4 text-pink" /> Opener setlists
              </h2>
              <div className="mt-6 space-y-5">
                {concert.openerSetlists.map((o) => (
                  <div key={o.artist}>
                    <h3 className="text-sm font-bold">{o.artist} <span className="text-muted-foreground">· {o.songs.length} songs</span></h3>
                    <ol className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {o.songs.map((song, i) => (
                        <li
                          key={`${o.artist}-${i}`}
                          className="flex items-baseline gap-3 rounded-lg border border-hairline bg-surface/40 px-3 py-1.5"
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
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className={"mt-2 font-display text-2xl font-extrabold leading-tight " + (accent ? "gradient-text" : "")}>
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
        className="flex items-center gap-2.5 rounded-lg -mx-1 px-1 py-1 hover:bg-surface-2"
      >
        <div className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-full border border-hairline bg-surface-2 text-[10px] font-bold">
          {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{friend.displayName}</p>
          {friend.username && (
            <p className="truncate font-mono text-[10px] text-muted-foreground">@{friend.username}</p>
          )}
        </div>
      </Link>
    </li>
  );
}
