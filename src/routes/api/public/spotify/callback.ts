import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/spotify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        const { verifyState, exchangeCodeForTokens } = await import("@/lib/spotify.server");

        function redirect(to: string, status: string, message?: string) {
          const target = new URL(to);
          target.searchParams.set("spotify", status);
          if (message) target.searchParams.set("spotify_message", message);
          return new Response(null, { status: 302, headers: { Location: target.toString() } });
        }

        if (error) {
          return redirect(`${url.origin}/profile`, "error", error);
        }
        if (!code || !state) {
          return redirect(`${url.origin}/profile`, "error", "missing_params");
        }

        const verified = verifyState(state);
        if (!verified) {
          return redirect(`${url.origin}/profile`, "error", "invalid_state");
        }

        const redirectUri = `${verified.origin}/api/public/spotify/callback`;

        try {
          const tokens = await exchangeCodeForTokens(code, redirectUri);

          // Fetch the Spotify profile
          const meRes = await fetch("https://api.spotify.com/v1/me", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          const me = meRes.ok
            ? ((await meRes.json()) as { id?: string; display_name?: string })
            : null;

          const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error: dbErr } = await supabaseAdmin
            .from("spotify_tokens")
            .upsert({
              user_id: verified.userId,
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              scope: tokens.scope,
              token_type: tokens.token_type,
              expires_at: expiresAt,
              spotify_user_id: me?.id ?? null,
              display_name: me?.display_name ?? null,
            });
          if (dbErr) {
            return redirect(`${verified.origin}/profile`, "error", dbErr.message);
          }

          return redirect(`${verified.origin}/profile`, "connected");
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          return redirect(`${verified.origin}/profile`, "error", msg);
        }
      },
    },
  },
});
