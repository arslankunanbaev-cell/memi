alter table public.moments
  add column if not exists photo_crop_x integer not null default 50,
  add column if not exists photo_crop_y integer not null default 50;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'moments_photo_crop_x_range'
  ) then
    alter table public.moments
      add constraint moments_photo_crop_x_range check (photo_crop_x between 0 and 100);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'moments_photo_crop_y_range'
  ) then
    alter table public.moments
      add constraint moments_photo_crop_y_range check (photo_crop_y between 0 and 100);
  end if;
end $$;
