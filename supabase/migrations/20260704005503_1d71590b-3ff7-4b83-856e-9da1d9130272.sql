-- Lock down public.spotify_tokens: remove all direct client access.
-- The tokens table now stores raw access/refresh tokens that must NEVER be
-- readable or writable from a client session. All access goes through the
-- server-side service-role client (spotify.functions.ts + callback route).

DROP POLICY IF EXISTS "Own spotify tokens" ON public.spotify_tokens;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.spotify_tokens FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.spotify_tokens FROM anon;

-- RLS stays enabled so that any accidental grant in the future still blocks
-- reads by default. service_role bypasses RLS.
ALTER TABLE public.spotify_tokens ENABLE ROW LEVEL SECURITY;