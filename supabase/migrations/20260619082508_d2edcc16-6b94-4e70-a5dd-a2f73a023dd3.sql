ALTER TABLE public.concerts
  ADD COLUMN IF NOT EXISTS artist_image_url text,
  ADD COLUMN IF NOT EXISTS opener_setlists jsonb;