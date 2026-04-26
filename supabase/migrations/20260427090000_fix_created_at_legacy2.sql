-- Fix moments added after the previous fix where created_at was still
-- corrupted by the legacy insert path (created_at = moment_at).
update public.moments
set created_at = now()
where moment_at is not null
  and created_at = moment_at;
