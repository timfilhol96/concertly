REVOKE EXECUTE ON FUNCTION public.get_wrapped_share(TEXT) FROM anon, authenticated, service_role;
DROP FUNCTION IF EXISTS public.get_wrapped_share(TEXT);