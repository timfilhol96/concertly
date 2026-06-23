DROP POLICY IF EXISTS "Send friend request" ON public.friendships;
CREATE POLICY "Send friend request" ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id AND status = 'pending');

CREATE POLICY "Profiles delete by owner" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);