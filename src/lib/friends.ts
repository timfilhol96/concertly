// Friends data layer — usernames, friend requests, and friend concert reads.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Concert } from "@/lib/concerts";

export type FriendProfile = {
  userId: string;
  username: string | null;
  displayName: string;
  avatarPath: string | null;
};

export type Friendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted";
  createdAt: string;
  // populated client-side
  otherUserId: string;
  direction: "incoming" | "outgoing" | "mutual";
};

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function rowToFriendProfile(r: ProfileRow): FriendProfile {
  return {
    userId: r.id,
    username: r.username,
    displayName: r.display_name ?? r.username ?? "Someone",
    avatarPath: r.avatar_url,
  };
}

// -------- Username --------

export function useUpdateUsername() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      const u = username.trim().toLowerCase();
      if (!USERNAME_RE.test(u)) {
        throw new Error("3–20 chars, lowercase letters, numbers, underscore");
      }
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ username: u })
        .eq("id", userRes.user.id);
      if (error) {
        if (error.code === "23505") throw new Error("That username is taken");
        throw error;
      }
      return u;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// -------- Friendships --------

export function useFriendships() {
  return useQuery({
    queryKey: ["friendships"],
    queryFn: async (): Promise<{
      friends: Friendship[];
      incoming: Friendship[];
      outgoing: Friendship[];
      profiles: Record<string, FriendProfile>;
    }> => {
      const { data: userRes } = await supabase.auth.getUser();
      const me = userRes.user?.id;
      if (!me) return { friends: [], incoming: [], outgoing: [], profiles: {} };

      const { data: rows, error } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const friends: Friendship[] = [];
      const incoming: Friendship[] = [];
      const outgoing: Friendship[] = [];
      const otherIds = new Set<string>();

      for (const r of rows ?? []) {
        const other = r.requester_id === me ? r.addressee_id : r.requester_id;
        otherIds.add(other);
        const f: Friendship = {
          id: r.id,
          requesterId: r.requester_id,
          addresseeId: r.addressee_id,
          status: r.status as "pending" | "accepted",
          createdAt: r.created_at,
          otherUserId: other,
          direction:
            r.status === "accepted"
              ? "mutual"
              : r.requester_id === me
                ? "outgoing"
                : "incoming",
        };
        if (f.status === "accepted") friends.push(f);
        else if (f.direction === "incoming") incoming.push(f);
        else outgoing.push(f);
      }

      const profiles: Record<string, FriendProfile> = {};
      if (otherIds.size) {
        const { data: profRows } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", [...otherIds]);
        for (const p of (profRows ?? []) as ProfileRow[]) {
          profiles[p.id] = rowToFriendProfile(p);
        }
      }

      return { friends, incoming, outgoing, profiles };
    },
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      const u = username.trim().toLowerCase().replace(/^@/, "");
      if (!u) throw new Error("Enter a username");
      const { data: userRes } = await supabase.auth.getUser();
      const me = userRes.user?.id;
      if (!me) throw new Error("Not signed in");

      const { data: target, error: lookupErr } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .eq("username", u)
        .maybeSingle();
      if (lookupErr) throw lookupErr;
      if (!target) throw new Error(`No user @${u}`);
      if (target.id === me) throw new Error("That's you!");

      // If a reverse pending request exists, accept it instead.
      const { data: existing } = await supabase
        .from("friendships")
        .select("id, requester_id, addressee_id, status")
        .or(
          `and(requester_id.eq.${me},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${me})`,
        )
        .maybeSingle();

      if (existing) {
        if (existing.status === "accepted") {
          throw new Error(`You're already friends with @${u}`);
        }
        if (existing.requester_id === target.id) {
          const { error: updErr } = await supabase
            .from("friendships")
            .update({ status: "accepted" })
            .eq("id", existing.id);
          if (updErr) throw updErr;
          return { accepted: true, username: u };
        }
        throw new Error(`Request to @${u} is already pending`);
      }

      const { error: insErr } = await supabase
        .from("friendships")
        .insert({ requester_id: me, addressee_id: target.id });
      if (insErr) throw insErr;
      return { accepted: false, username: u };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friendships"] }),
  });
}

export function useRespondToRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "accept" | "reject";
    }) => {
      if (action === "accept") {
        const { error } = await supabase
          .from("friendships")
          .update({ status: "accepted" })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("friendships").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friendships"] }),
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("friendships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendships"] });
      qc.invalidateQueries({ queryKey: ["friend-concerts"] });
    },
  });
}

// Friends who attended the same physical show (same date + venue + city, case-insensitive).
export function useFriendsAtShow(args: {
  date: string;
  venue: string;
  city: string;
} | null) {
  return useQuery({
    enabled: !!args,
    queryKey: ["friends-at-show", args?.date, args?.venue?.toLowerCase(), args?.city?.toLowerCase()],
    queryFn: async (): Promise<FriendProfile[]> => {
      if (!args) return [];
      const { data: userRes } = await supabase.auth.getUser();
      const me = userRes.user?.id;
      if (!me) return [];

      // Accepted friends only
      const { data: friendRows } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .eq("status", "accepted");
      const friendIds = (friendRows ?? [])
        .map((r) => (r.requester_id === me ? r.addressee_id : r.requester_id))
        .filter((id): id is string => !!id);
      if (friendIds.length === 0) return [];

      const venueKey = args.venue.trim().toLowerCase();
      const cityKey = args.city.trim().toLowerCase();

      const { data: rows, error } = await supabase
        .from("concerts")
        .select("user_id, venue, city")
        .in("user_id", friendIds)
        .eq("date", args.date);
      if (error) throw error;

      const matchedIds = new Set<string>();
      for (const r of rows ?? []) {
        if (
          (r.venue ?? "").trim().toLowerCase() === venueKey &&
          (r.city ?? "").trim().toLowerCase() === cityKey
        ) {
          matchedIds.add(r.user_id as string);
        }
      }
      if (matchedIds.size === 0) return [];

      const { data: profRows } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", [...matchedIds]);

      return ((profRows ?? []) as ProfileRow[]).map(rowToFriendProfile);
    },
  });
}

// -------- Friend concert read (RLS-allowed via are_friends policy) --------

type ConcertRow = {
  id: string;
  artist: string;
  tour: string | null;
  openers: string[] | null;
  date: string;
  venue: string;
  city: string;
  country: string | null;
  rating: number;
  genre: string | null;
  notes: string | null;
  ticket_price: number | null;
  songs_seen: number | null;
  artist_image_url: string | null;
};

export function useFriendConcerts(friendUserId: string | null) {
  return useQuery({
    enabled: !!friendUserId,
    queryKey: ["friend-concerts", friendUserId],
    queryFn: async (): Promise<Concert[]> => {
      if (!friendUserId) return [];
      const { data, error } = await supabase
        .from("concerts")
        .select(
          "id, artist, tour, openers, date, venue, city, country, rating, genre, notes, ticket_price, songs_seen, artist_image_url",
        )
        .eq("user_id", friendUserId)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data as ConcertRow[]).map((r) => ({
        id: r.id,
        artist: r.artist,
        tour: r.tour,
        openers: r.openers,
        date: r.date,
        venue: r.venue,
        city: r.city,
        country: r.country,
        rating: Number(r.rating),
        genre: r.genre,
        notes: r.notes,
        ticketPrice: r.ticket_price == null ? null : Number(r.ticket_price),
        songsSeen: r.songs_seen,
        setlist: null,
        artistImageUrl: r.artist_image_url,
        openerSetlists: null,
        status: "attended" as const,
        latitude: null,
        longitude: null,
      }));
    },
  });
}

// Aggregated co-attendance: which accepted friends attended which physical
// shows (matched by date + venue + city, case-insensitive). Returns a map
// keyed by `${date}|${venueLower}|${cityLower}` → array of friend profiles.
export function useFriendsCoAttendance() {
  return useQuery({
    queryKey: ["friends-coattendance"],
    queryFn: async (): Promise<{
      byKey: Record<string, FriendProfile[]>;
      profiles: Record<string, FriendProfile>;
    }> => {
      const { data: userRes } = await supabase.auth.getUser();
      const me = userRes.user?.id;
      if (!me) return { byKey: {}, profiles: {} };
      const { data: friendRows } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .eq("status", "accepted");
      const friendIds = (friendRows ?? [])
        .map((r) => (r.requester_id === me ? r.addressee_id : r.requester_id))
        .filter((id): id is string => !!id);
      if (friendIds.length === 0) return { byKey: {}, profiles: {} };
      const { data: rows } = await supabase
        .from("concerts")
        .select("user_id, date, venue, city")
        .in("user_id", friendIds);
      const { data: profRows } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", friendIds);
      const profiles: Record<string, FriendProfile> = {};
      for (const p of (profRows ?? []) as ProfileRow[]) {
        profiles[p.id] = rowToFriendProfile(p);
      }
      const byKey: Record<string, FriendProfile[]> = {};
      for (const r of rows ?? []) {
        const key = `${r.date}|${(r.venue ?? "").trim().toLowerCase()}|${(r.city ?? "").trim().toLowerCase()}`;
        const p = profiles[r.user_id as string];
        if (!p) continue;
        if (!byKey[key]) byKey[key] = [];
        if (!byKey[key].some((x) => x.userId === p.userId)) byKey[key].push(p);
      }
      return { byKey, profiles };
    },
  });
}

export function coAttendanceKey(date: string, venue: string, city: string): string {
  return `${date}|${(venue ?? "").trim().toLowerCase()}|${(city ?? "").trim().toLowerCase()}`;
}
