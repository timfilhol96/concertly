ALTER TABLE public.concerts ADD COLUMN IF NOT EXISTS media_paths text[] NOT NULL DEFAULT '{}';

UPDATE public.concerts c
SET media_paths = sub.paths
FROM (
  SELECT c2.id, array_agg(o.name ORDER BY o.created_at DESC) AS paths
  FROM public.concerts c2
  JOIN storage.objects o
    ON o.bucket_id = 'concert-media'
   AND o.name LIKE c2.user_id::text || '/' || c2.id::text || '/%'
   AND split_part(o.name, '/', 3) NOT LIKE '.%'
  GROUP BY c2.id
) sub
WHERE sub.id = c.id;