DROP POLICY IF EXISTS "Anyone can view shared Wrapped links" ON public.wrapped_shares;
REVOKE SELECT ON public.wrapped_shares FROM anon;
CREATE POLICY "Signed-in users can view their own Wrapped links"
ON public.wrapped_shares
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.get_wrapped_share(share_id TEXT)
RETURNS TABLE(payload JSONB, gradient TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ws.payload, ws.gradient
  FROM public.wrapped_shares ws
  WHERE ws.id = share_id
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_wrapped_share(TEXT) TO anon, authenticated, service_role;