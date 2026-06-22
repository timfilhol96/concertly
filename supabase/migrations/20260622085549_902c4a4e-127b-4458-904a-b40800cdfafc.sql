
-- 1) Friendships: lock UPDATE so addressee can only flip status to 'accepted'
DROP POLICY IF EXISTS "Accept/reject as addressee" ON public.friendships;
CREATE POLICY "Accept as addressee"
  ON public.friendships FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id AND status = 'pending')
  WITH CHECK (
    auth.uid() = addressee_id
    AND status = 'accepted'
    AND requester_id = (SELECT requester_id FROM public.friendships f WHERE f.id = friendships.id)
    AND addressee_id = (SELECT addressee_id FROM public.friendships f WHERE f.id = friendships.id)
  );

-- 2) Avatar reads: own folder OR an accepted friend's folder
DROP POLICY IF EXISTS "Avatars: authenticated read" ON storage.objects;
CREATE POLICY "Avatars: own or friend read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );
