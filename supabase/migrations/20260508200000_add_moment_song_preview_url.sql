alter table public.moments
  add column if not exists song_preview_url text;
