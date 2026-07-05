
CREATE TYPE public.concert_status AS ENUM ('attended', 'upcoming', 'wishlist');

ALTER TABLE public.concerts
  ADD COLUMN status public.concert_status NOT NULL DEFAULT 'attended',
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision;

CREATE INDEX concerts_user_status_idx ON public.concerts (user_id, status);
