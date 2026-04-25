-- Fix moments where created_at was incorrectly set to moment_at by the legacy insert path.
-- These rows have no true insertion timestamp, so we reset them to NOW() so they appear
-- at the top of the home feed (added "recently") rather than scattered by their moment date.
update public.moments
set created_at = now()
where moment_at is not null
  and created_at = moment_at;
