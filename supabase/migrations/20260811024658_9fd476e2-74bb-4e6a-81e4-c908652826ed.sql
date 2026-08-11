DROP POLICY IF EXISTS "Profiles readable by self or connections" ON public.profiles;

CREATE POLICY "Profiles readable by self or accepted friends"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'::friendship_status
      AND ((f.requester_id = auth.uid() AND f.addressee_id = profiles.id)
        OR (f.addressee_id = auth.uid() AND f.requester_id = profiles.id))
  )
);

DROP FUNCTION IF EXISTS public.find_profile_by_username(text);
DROP FUNCTION IF EXISTS public.has_friend_link(uuid, uuid);