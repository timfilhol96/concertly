CREATE TABLE public.spotify_tokens (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  scope text,
  token_type text,
  expires_at timestamptz NOT NULL,
  spotify_user_id text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spotify_tokens TO authenticated;
GRANT ALL ON public.spotify_tokens TO service_role;

ALTER TABLE public.spotify_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own spotify tokens" ON public.spotify_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER spotify_tokens_touch_updated_at
  BEFORE UPDATE ON public.spotify_tokens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();