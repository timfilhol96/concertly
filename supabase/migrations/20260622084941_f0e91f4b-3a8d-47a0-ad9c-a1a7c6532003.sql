
-- Pin search_path on trigger function and make it SECURITY INVOKER (default)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Restrict are_friends execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.are_friends(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;
