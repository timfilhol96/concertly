import { createHmac, timingSafeEqual, randomBytes } from "crypto";

function stateSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SPOTIFY_CLIENT_SECRET ||
    "fallback-state-secret-do-not-use"
  );
}

export type SpotifyState = { userId: string; origin: string; nonce: string; ts: number };

export function signState(payload: SpotifyState): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string): SpotifyState | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = createHmac("sha256", stateSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as SpotifyState;
    if (Date.now() - parsed.ts > 10 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function newNonce(): string {
  return randomBytes(8).toString("hex");
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify not configured");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify token exchange failed: ${t}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify not configured");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error("Failed to refresh Spotify token");
  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };
}

export const SPOTIFY_SCOPES = "playlist-modify-private playlist-modify-public";

// Cached app-level access token via client-credentials flow.
let appTokenCache: { token: string; expiresAt: number } | null = null;

export async function getSpotifyAppToken(): Promise<string> {
  if (appTokenCache && appTokenCache.expiresAt > Date.now() + 30_000) {
    return appTokenCache.token;
  }
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Spotify not configured");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Spotify app token failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  appTokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}


// Returns a valid access token for the user's connected Spotify account,
// refreshing (and persisting) it when it is about to expire.
export async function getUserAccessToken(
  userId: string,
): Promise<{ accessToken: string; scope: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Admin client: spotify_tokens has no RLS grants for client sessions.
  const { data: tok, error } = await supabaseAdmin
    .from("spotify_tokens")
    .select("access_token, refresh_token, expires_at, scope")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!tok) throw new Error("Spotify is not connected.");

  let accessToken = tok.access_token;
  if (new Date(tok.expires_at).getTime() - 60_000 <= Date.now()) {
    const refreshed = await refreshAccessToken(tok.refresh_token);
    accessToken = refreshed.access_token;
    await supabaseAdmin
      .from("spotify_tokens")
      .update({
        access_token: accessToken,
        expires_at: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
        refresh_token: refreshed.refresh_token ?? tok.refresh_token,
      })
      .eq("user_id", userId);
  }
  return { accessToken, scope: tok.scope ?? "" };
}

// GET against the Web API, retrying once when rate limited.
export async function spotifyUserGet<T>(accessToken: string, path: string): Promise<T | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    if (res.status === 429 && attempt === 0) {
      const wait = Math.min(Number(res.headers.get("Retry-After") ?? "1"), 5);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) {
      console.error("[spotify] GET failed", path, res.status, await res.text().catch(() => ""));
      return null;
    }
    return (await res.json()) as T;
  }
  return null;
}
