-- 1) Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_friend_link(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_profile_by_username(text) FROM PUBLIC, anon, authenticated;

-- find_profile_by_username is intentionally called via RPC by signed-in users only
GRANT EXECUTE ON FUNCTION public.find_profile_by_username(text) TO authenticated;

-- 2) Enforce immutability of friendship parties via trigger instead of a self-referencing WITH CHECK
CREATE OR REPLACE FUNCTION public.enforce_friendship_immutable_parties()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id THEN
    RAISE EXCEPTION 'Friendship participants cannot be changed';
  END IF;
  IF OLD.status = 'accepted'::friendship_status
     AND NEW.status <> 'accepted'::friendship_status THEN
    RAISE EXCEPTION 'Accepted friendships cannot be reverted';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_friendship_immutable_parties() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS friendships_immutable_parties ON public.friendships;
CREATE TRIGGER friendships_immutable_parties
BEFORE UPDATE ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.enforce_friendship_immutable_parties();

DROP POLICY IF EXISTS "Accept as addressee" ON public.friendships;
CREATE POLICY "Accept as addressee"
ON public.friendships
FOR UPDATE
TO authenticated
USING (auth.uid() = addressee_id AND status = 'pending'::friendship_status)
WITH CHECK (auth.uid() = addressee_id AND status = 'accepted'::friendship_status);