import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSpotifyAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { redirectOrigin: string }) =>
    z.object({ redirectOrigin: z.string().url() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { signState, newNonce, SPOTIFY_SCOPES } = await import("./spotify.server");
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) throw new Error("Spotify not configured");
    const redirectUri = `${data.redirectOrigin}/api/public/spotify/callback`;
    const state = signState({
      userId: context.userId,
      origin: data.redirectOrigin,
      nonce: newNonce(),
      ts: Date.now(),
    });
    const url = new URL("https://accounts.spotify.com/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SPOTIFY_SCOPES);
    url.searchParams.set("state", state);
    url.searchParams.set("show_dialog", "false");
    return { url: url.toString() };
  });

export const getSpotifyStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("spotify_tokens")
      .select("spotify_user_id, display_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      connected: !!data,
      displayName: data?.display_name ?? null,
      spotifyUserId: data?.spotify_user_id ?? null,
    };
  });

export const disconnectSpotify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("spotify_tokens")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createSpotifyPlaylist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { concertId: string; name: string }) =>
    z.object({ concertId: z.string().uuid(), name: z.string().min(1).max(100) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { refreshAccessToken } = await import("./spotify.server");

    const { data: concert, error: cErr } = await context.supabase
      .from("concerts")
      .select("id, artist, venue, city, country, date, setlist, user_id")
      .eq("id", data.concertId)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!concert) throw new Error("Concert not found");
    const songs: string[] = (concert.setlist as string[] | null) ?? [];
    if (songs.length === 0) throw new Error("This show has no setlist yet.");

    // Load tokens
    const { data: tok, error: tErr } = await context.supabase
      .from("spotify_tokens")
      .select("access_token, refresh_token, expires_at, scope")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tok) throw new Error("Spotify is not connected.");

    let accessToken = tok.access_token;
    const expiresMs = new Date(tok.expires_at).getTime();
    if (expiresMs - 60_000 <= Date.now()) {
      const refreshed = await refreshAccessToken(tok.refresh_token);
      accessToken = refreshed.access_token;
      const newExpires = new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString();
      await context.supabase
        .from("spotify_tokens")
        .update({
          access_token: accessToken,
          expires_at: newExpires,
          refresh_token: refreshed.refresh_token ?? tok.refresh_token,
        })
        .eq("user_id", context.userId);
    }

    // Identify user
    const meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!meRes.ok) {
      const body = await meRes.text().catch(() => "");
      console.error("[spotify] /me failed", meRes.status, body);
      throw new Error(`Spotify auth failed (${meRes.status}). Please reconnect.`);
    }
    const me = (await meRes.json()) as { id: string };

    // Search each song (cap to 80 to stay within request budget)
    const limited = songs.slice(0, 80);
    const trackUris: string[] = [];
    const notFound: string[] = [];
    for (const song of limited) {
      const cleanSong = song.replace(/"/g, "").trim();
      const cleanArtist = concert.artist.replace(/"/g, "").trim();
      const q = encodeURIComponent(`track:"${cleanSong}" artist:"${cleanArtist}"`);
      const sr = await fetch(`https://api.spotify.com/v1/search?type=track&limit=1&q=${q}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!sr.ok) {
        const body = await sr.text().catch(() => "");
        console.error("[spotify] search failed", sr.status, body);
        notFound.push(song);
        continue;
      }
      const sd = (await sr.json()) as { tracks?: { items?: Array<{ uri?: string }> } };
      const uri = sd.tracks?.items?.[0]?.uri;
      if (uri) trackUris.push(uri);
      else notFound.push(song);
    }

    const grantedScopes = new Set((tok.scope ?? "").split(/\s+/).filter(Boolean));
    const hasPlaylistScope =
      grantedScopes.has("playlist-modify-private") || grantedScopes.has("playlist-modify-public");
    if (!hasPlaylistScope) {
      throw new Error("Spotify playlist permission is missing. Disconnect Spotify, connect again, and approve playlist access.");
    }

    // Create playlist
    const description = `${concert.artist} · ${concert.venue}, ${concert.city} · ${concert.date}`;
    const cpRes = await fetch("https://api.spotify.com/v1/me/playlists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: data.name, public: false, description }),
    });
    if (!cpRes.ok) {
      const body = await cpRes.text().catch(() => "");
      console.error("[spotify] create playlist failed", cpRes.status, body);
      throw new Error(`Failed to create playlist (${cpRes.status}): ${body.slice(0, 300)}`);
    }
    const pl = (await cpRes.json()) as {
      id: string;
      external_urls?: { spotify?: string };
    };

    // Add tracks in chunks of 100. Use the current "items" endpoint; the old
    // "tracks" endpoint is deprecated and can return bare 403s for newer apps.
    let addTracksError: string | null = null;
    for (let i = 0; i < trackUris.length; i += 100) {
      const chunk = trackUris.slice(i, i + 100);
      if (chunk.length === 0) continue;
      const ar = await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: chunk }),
      });
      if (!ar.ok) {
        const body = await ar.text().catch(() => "");
        console.error("[spotify] add tracks failed", ar.status, body);
        addTracksError = `Spotify created the playlist, but would not add tracks (${ar.status}). Open it in Spotify and try adding songs manually.`;
        break;
      }
    }

    return {
      playlistUrl: pl.external_urls?.spotify ?? null,
      added: addTracksError ? 0 : trackUris.length,
      notFound,
      warning: addTracksError,
      total: songs.length,
    };
  });
