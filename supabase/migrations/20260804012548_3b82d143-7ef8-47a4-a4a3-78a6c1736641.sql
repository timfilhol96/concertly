
CREATE OR REPLACE FUNCTION public.has_friend_link(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (requester_id = a AND addressee_id = b)
       OR (requester_id = b AND addressee_id = a)
  );
$$;

DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;

CREATE POLICY "Profiles readable by self or connections"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.has_friend_link(auth.uid(), id));

CREATE OR REPLACE FUNCTION public.find_profile_by_username(_username text)
RETURNS TABLE (id uuid, username text, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.username, p.display_name
  FROM public.profiles p
  WHERE p.username = lower(trim(_username))
    AND auth.uid() IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_profile_by_username(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_by_username(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_friend_link(uuid, uuid) TO authenticated;
