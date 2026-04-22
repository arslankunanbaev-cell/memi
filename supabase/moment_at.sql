-- Separate the moment's own date from the record insertion time.
alter table public.moments
  add column if not exists moment_at timestamptz;

-- Keep existing cards/dates stable for already-saved moments.
update public.moments
set moment_at = created_at
where moment_at is null;
