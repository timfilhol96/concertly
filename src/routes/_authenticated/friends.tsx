import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BarChart3, Check, UserPlus, UserX, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  genreBreakdown,
  rankBy,
  showsByYear,
  uniqueShows,
  useConcerts,
  useProfile,
} from "@/lib/concerts";
import {
  useFriendConcerts,
  useFriendships,
  useRemoveFriend,
  useRespondToRequest,
  useSendFriendRequest,
  type FriendProfile,
} from "@/lib/friends";

export const Route = createFileRoute("/_authenticated/friends")({
  head: () => ({
    meta: [
      { title: "Friends · Concertly" },
      { name: "description", content: "Add friends by username on Concertly and compare live music stats: shows, artists, venues and shared nights." },
    ],
  }),
  component: FriendsPage,
});

function FriendsPage() {
  const { data: profile } = useProfile();
  const { data: friendData } = useFriendships();
  const { data: myConcerts = [] } = useConcerts();
  const sendReq = useSendFriendRequest();
  const respond = useRespondToRequest();
  const removeFriend = useRemoveFriend();

  const [usernameInput, setUsernameInput] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    friendshipId: string;
    otherUserId: string;
    label: string;
  } | null>(null);

  const friends = friendData?.friends ?? [];
  const incoming = friendData?.incoming ?? [];
  const outgoing = friendData?.outgoing ?? [];
  const profiles = friendData?.profiles ?? {};

  const selectedFriend = selectedFriendId ? profiles[selectedFriendId] : null;
  const { data: friendConcerts = [] } = useFriendConcerts(selectedFriendId);

  async function onSend() {
    try {
      const res = await sendReq.mutateAsync(usernameInput);
      setUsernameInput("");
      toast.success(
        res.accepted ? `You're now friends with @${res.username}` : `Request sent to @${res.username}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send request");
    }
  }

  const hasUsername = !!profile?.username;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
      <div className="mb-8 animate-reveal">
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Friends</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Add friends by username, then compare your live music stats side-by-side.
        </p>
        {profile?.username && (
          <p className="mt-3 text-xs text-muted-foreground">
            Your username:{" "}
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono font-semibold text-foreground">
              @{profile.username}
            </span>
          </p>
        )}
      </div>

      {!hasUsername && (
        <div className="mb-6 rounded-2xl border border-hairline bg-surface-2 p-4 text-sm">
          You need a username before friends can find you.{" "}
          <a href="/profile" className="font-semibold text-brand underline">Set one in your profile →</a>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* LEFT: add + lists */}
        <section className="space-y-4 lg:col-span-1">
          <div className="rounded-2xl border border-hairline bg-card p-5">
            <h2 className="font-display text-lg font-extrabold">Add a friend</h2>
            <p className="mt-1 text-xs text-muted-foreground">Enter their username.</p>
            <form
              onSubmit={(e) => { e.preventDefault(); onSend(); }}
              className="mt-3 flex items-stretch gap-2"
            >
              <div className="flex items-center rounded-xl border border-hairline bg-surface/60 px-3 text-sm text-muted-foreground">@</div>
              <input
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="username"
                maxLength={20}
                className="flex-1 rounded-xl border border-hairline bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <button
                type="submit"
                disabled={sendReq.isPending || !usernameInput}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-bold text-brand-foreground disabled:opacity-50"
              >
                <UserPlus className="h-3.5 w-3.5" /> Send
              </button>
            </form>
          </div>

          {incoming.length > 0 && (
            <div className="rounded-2xl border border-hairline bg-card p-5">
              <h3 className="font-display text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                Incoming requests
              </h3>
              <ul className="mt-3 space-y-2">
                {incoming.map((r) => {
                  const p = profiles[r.otherUserId];
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
                      <ProfileLabel p={p} />
                      <div className="flex gap-1">
                        <button
                          onClick={() => respond.mutate({ id: r.id, action: "accept" })}
                          className="grid h-7 w-7 place-items-center rounded-full bg-brand text-brand-foreground"
                          aria-label="Accept"
                        ><Check className="h-3.5 w-3.5" /></button>
                        <button
                          onClick={() => respond.mutate({ id: r.id, action: "reject" })}
                          className="grid h-7 w-7 place-items-center rounded-full border border-hairline bg-surface"
                          aria-label="Reject"
                        ><X className="h-3.5 w-3.5" /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {outgoing.length > 0 && (
            <div className="rounded-2xl border border-hairline bg-card p-5">
              <h3 className="font-display text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
                Sent · pending
              </h3>
              <ul className="mt-3 space-y-2">
                {outgoing.map((r) => {
                  const p = profiles[r.otherUserId];
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2">
                      <ProfileLabel p={p} />
                      <button
                        onClick={() => respond.mutate({ id: r.id, action: "reject" })}
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                      >Cancel</button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-hairline bg-card p-5">
            <h3 className="font-display text-sm font-extrabold uppercase tracking-widest text-muted-foreground">
              Your friends
            </h3>
            {friends.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No friends yet. Send a request above.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {friends.map((f) => {
                  const p = profiles[f.otherUserId];
                  const active = selectedFriendId === f.otherUserId;
                  return (
                    <li
                      key={f.id}
                      className={
                        "flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition " +
                        (active ? "bg-brand/15 ring-1 ring-brand" : "bg-surface-2 hover:bg-surface-3")
                      }
                    >
                      <Link
                        to="/friend/$id"
                        params={{ id: f.otherUserId }}
                        className="flex-1 min-w-0"
                        title={`Open ${p?.displayName ?? "friend"}'s dashboard`}
                      >
                        <ProfileLabel p={p} />
                      </Link>
                      <button
                        onClick={() => setSelectedFriendId(f.otherUserId)}
                        className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
                        aria-label="Compare"
                        title="Compare stats"
                      ><BarChart3 className="h-3.5 w-3.5" /></button>
                      <button
                        onClick={() =>
                          setRemoveTarget({
                            friendshipId: f.id,
                            otherUserId: f.otherUserId,
                            label: p?.username ? `@${p.username}` : p?.displayName ?? "this friend",
                          })
                        }
                        className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
                        aria-label="Remove friend"
                      ><UserX className="h-3.5 w-3.5" /></button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* RIGHT: comparison */}
        <section className="lg:col-span-2">
          {!selectedFriend ? (
            <div className="grid h-full min-h-[280px] place-items-center rounded-3xl border border-dashed border-hairline bg-card/50 p-10 text-center">
              <div>
                <p className="font-display text-xl font-extrabold">Pick a friend to compare</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Their stats appear next to yours: totals, shows per year, genre mix, and top lists.
                </p>
              </div>
            </div>
          ) : (
            <Comparison
              meName={profile?.displayName ?? "You"}
              friend={selectedFriend}
              myConcerts={myConcerts}
              friendConcerts={friendConcerts}
            />
          )}
        </section>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title={`Remove ${removeTarget?.label ?? "friend"}?`}
        description="You'll no longer see each other's shows. You can send a new friend request later."
        confirmLabel="Remove"
        destructive
        loading={removeFriend.isPending}
        onConfirm={async () => {
          if (!removeTarget) return;
          try {
            await removeFriend.mutateAsync(removeTarget.friendshipId);
            if (selectedFriendId === removeTarget.otherUserId) setSelectedFriendId(null);
            setRemoveTarget(null);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't remove friend");
          }
        }}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      />
    </main>
  );
}

function ProfileLabel({ p }: { p: FriendProfile | undefined }) {
  if (!p) return <span className="text-sm text-muted-foreground">unknown</span>;
  const initials = (p.displayName || p.username || "U")
    .split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="grid h-7 w-7 flex-none place-items-center rounded-full border border-hairline bg-surface text-[11px] font-bold">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{p.displayName}</p>
        {p.username && <p className="truncate font-mono text-[11px] text-muted-foreground">@{p.username}</p>}
      </div>
    </div>
  );
}

// ---------- Comparison ----------

function Comparison({
  meName,
  friend,
  myConcerts,
  friendConcerts,
}: {
  meName: string;
  friend: FriendProfile;
  myConcerts: import("@/lib/concerts").Concert[];
  friendConcerts: import("@/lib/concerts").Concert[];
}) {
  const mine = useMemo(() => uniqueShows(myConcerts), [myConcerts]);
  const theirs = useMemo(() => uniqueShows(friendConcerts), [friendConcerts]);

  const meLabel = meName;
  const friendLabel = friend.displayName;

  // Totals
  const totals = [
    { label: "Shows attended", me: mine.length, them: theirs.length },
    {
      label: "Unique artists",
      me: new Set(myConcerts.map((c) => c.artist)).size,
      them: new Set(friendConcerts.map((c) => c.artist)).size,
    },
    {
      label: "Countries",
      me: new Set(mine.map((c) => c.country).filter(Boolean)).size,
      them: new Set(theirs.map((c) => c.country).filter(Boolean)).size,
    },
  ];

  // Shows per year, overlaid
  const yearData = useMemo(() => {
    const a = new Map(showsByYear(mine).map((r) => [r.year, r.count]));
    const b = new Map(showsByYear(theirs).map((r) => [r.year, r.count]));
    const allYears = [...new Set([...a.keys(), ...b.keys()])].sort();
    return allYears.map((y) => ({ year: y, me: a.get(y) ?? 0, them: b.get(y) ?? 0 }));
  }, [mine, theirs]);

  // Genres
  const myGenres = useMemo(() => genreBreakdown(mine).slice(0, 6), [mine]);
  const theirGenres = useMemo(() => genreBreakdown(theirs).slice(0, 6), [theirs]);

  // Top artists & countries with overlap
  const myArtists = useMemo(() => rankBy(myConcerts, "artist", 8), [myConcerts]);
  const theirArtists = useMemo(() => rankBy(friendConcerts, "artist", 8), [friendConcerts]);
  const sharedArtists = useMemo(() => {
    const s = new Set(theirArtists.map((a) => a.name));
    return new Set(myArtists.filter((a) => s.has(a.name)).map((a) => a.name));
  }, [myArtists, theirArtists]);

  const myCountries = useMemo(() => rankBy(mine, "country", 6), [mine]);
  const theirCountries = useMemo(() => rankBy(theirs, "country", 6), [theirs]);
  const sharedCountries = useMemo(() => {
    const s = new Set(theirCountries.map((c) => c.name));
    return new Set(myCountries.filter((c) => s.has(c.name)).map((c) => c.name));
  }, [myCountries, theirCountries]);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-hairline bg-card p-6">
        <p className="eyebrow text-muted-foreground">Comparing</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold">
          <span className="text-brand">{meLabel}</span>{" "}
          <span className="text-muted-foreground">vs</span>{" "}
          <span className="text-teal">{friendLabel}</span>
          {friend.username && <span className="ml-2 font-mono text-sm text-muted-foreground">@{friend.username}</span>}
        </h2>
      </header>

      {/* Totals */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {totals.map((t) => {
          const max = Math.max(t.me, t.them, 1);
          const meWins = t.me > t.them;
          const themWins = t.them > t.me;
          return (
            <div key={t.label} className="rounded-2xl border border-hairline bg-card p-4">
              <p className="eyebrow text-muted-foreground">{t.label}</p>
              <div className="mt-3 space-y-2">
                <Row label={meLabel} value={t.me} pct={(t.me / max) * 100} color="bg-brand" highlight={meWins} />
                <Row label={friendLabel} value={t.them} pct={(t.them / max) * 100} color="bg-teal" highlight={themWins} />
              </div>
            </div>
          );
        })}
      </section>

      {/* Shows per year overlay */}
      <section className="rounded-3xl border border-hairline bg-card p-6">
        <h3 className="font-display text-lg font-extrabold">Shows per year</h3>
        {yearData.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No shows logged yet.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={yearData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="var(--hairline)" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)" }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 12, fontSize: 12 }}
                />
                <Bar dataKey="me" name={meLabel} fill="var(--brand)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="them" name={friendLabel} fill="var(--teal)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <Legend />
          </>
        )}
      </section>

      {/* Genres */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <GenrePanel title={meLabel} accent="bg-brand" items={myGenres} />
        <GenrePanel title={friendLabel} accent="bg-teal" items={theirGenres} />
      </section>

      {/* Top artists & countries */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RankPanel
          title="Top artists"
          a={{ label: meLabel, items: myArtists, color: "from-brand" }}
          b={{ label: friendLabel, items: theirArtists, color: "from-teal" }}
          shared={sharedArtists}
        />
        <RankPanel
          title="Top countries"
          a={{ label: meLabel, items: myCountries, color: "from-brand" }}
          b={{ label: friendLabel, items: theirCountries, color: "from-teal" }}
          shared={sharedCountries}
        />
      </section>

      {sharedArtists.size > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          ✦ Highlighted entries appear in both top lists
        </p>
      )}
    </div>
  );
}

function Row({
  label, value, pct, color, highlight,
}: { label: string; value: number; pct: number; color: string; highlight?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className={"truncate " + (highlight ? "font-bold text-foreground" : "text-muted-foreground")}>
          {label}{highlight && " ★"}
        </span>
        <span className="font-mono font-semibold">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex justify-center gap-4 text-[11px]">
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-brand" /> You</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-teal" /> Friend</span>
    </div>
  );
}

function GenrePanel({
  title, accent, items,
}: { title: string; accent: string; items: ReturnType<typeof genreBreakdown> }) {
  const max = items[0]?.count ?? 1;
  return (
    <div className="rounded-2xl border border-hairline bg-card p-5">
      <h3 className="font-display text-sm font-extrabold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No genres logged.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((g) => (
            <li key={g.name}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="truncate">{g.name}</span>
                <span className="font-mono text-muted-foreground">{g.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className={`h-full rounded-full ${accent}`} style={{ width: `${(g.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RankPanel({
  title, a, b, shared,
}: {
  title: string;
  a: { label: string; items: { name: string; count: number }[]; color: string };
  b: { label: string; items: { name: string; count: number }[]; color: string };
  shared: Set<string>;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-card p-5">
      <h3 className="font-display text-sm font-extrabold">{title}</h3>
      <div className="mt-3 grid grid-cols-2 gap-4">
        {[a, b].map((side, idx) => (
          <div key={idx}>
            <p className="mb-2 eyebrow text-muted-foreground">{side.label}</p>
            {side.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">-</p>
            ) : (
              <ol className="space-y-1.5">
                {side.items.map((it, i) => {
                  const isShared = shared.has(it.name);
                  return (
                    <li
                      key={it.name}
                      className={
                        "flex items-center justify-between gap-2 rounded-xl px-2 py-1 text-xs " +
                        (isShared ? "bg-gradient-to-r " + side.color + "/20 to-transparent ring-1 ring-inset ring-hairline" : "")
                      }
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="w-4 text-[11px] font-bold text-muted-foreground">{i + 1}</span>
                        <span className="truncate">{it.name}{isShared && " ✦"}</span>
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">{it.count}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
