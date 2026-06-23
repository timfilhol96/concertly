
CREATE POLICY "Concert media: owner can read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'concert-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Concert media: friends can read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'concert-media'
  AND public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Concert media: owner can insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'concert-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Concert media: owner can update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'concert-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Concert media: owner can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'concert-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
