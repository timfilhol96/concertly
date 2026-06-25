CREATE TABLE public.wrapped_shares (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  gradient TEXT NOT NULL DEFAULT 'sunset',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wrapped_shares_id_format CHECK (id ~ '^[A-Za-z0-9_-]{8,32}$'),
  CONSTRAINT wrapped_shares_gradient_check CHECK (gradient IN ('sunset', 'ocean', 'ember', 'noir', 'citrus'))
);
GRANT SELECT ON public.wrapped_shares TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wrapped_shares TO authenticated;
GRANT ALL ON public.wrapped_shares TO service_role;
ALTER TABLE public.wrapped_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shared Wrapped links"
ON public.wrapped_shares
FOR SELECT
TO anon, authenticated
USING (true);
CREATE POLICY "Users can create their own Wrapped links"
ON public.wrapped_shares
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own Wrapped links"
ON public.wrapped_shares
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own Wrapped links"
ON public.wrapped_shares
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER update_wrapped_shares_updated_at
BEFORE UPDATE ON public.wrapped_shares
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();