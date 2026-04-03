-- Hero image persisted at save time (Unsplash API URLs + attribution JSON).
alter table public.saved_trips
  add column if not exists hero_image_url text,
  add column if not exists hero_image_thumb_url text,
  add column if not exists hero_image_attribution jsonb;

comment on column public.saved_trips.hero_image_url is 'Full-size Unsplash CDN URL resolved at save time';
comment on column public.saved_trips.hero_image_thumb_url is 'Thumbnail URL for lists';
comment on column public.saved_trips.hero_image_attribution is 'JSON: photographerName, photographerUrl, unsplashPhotoPageUrl';
