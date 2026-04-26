-- The 2026-04-26 migration incorrectly reset created_at to now() for ALL moments
-- where created_at = moment_at, including legitimate old moments whose moment_at
-- was set to their original created_at by the add_moment_at migration.
--
-- Restore: for any moment whose created_at was reset to 2026-04-26 by that migration,
-- put it back to moment_at (which equals the true original created_at for these rows).
--
-- The corrupted new moment added on 2026-04-26 has created_at = 2026-04-27 (set by
-- the second fix migration) and is NOT touched here.
update public.moments
set created_at = moment_at
where moment_at is not null
  and created_at >= '2026-04-26T00:00:00Z'
  and created_at < '2026-04-27T00:00:00Z';
