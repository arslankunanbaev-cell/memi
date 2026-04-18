-- ══════════════════════════════════════════════════════════════════════════════
-- Public profiles migration — ADDITIVE ONLY, do not remove existing policies
-- Run in Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Add visibility column to moments ──────────────────────────────────────
alter table public.moments
  add column if not exists visibility text default 'private';

-- ── 2. Add SELECT policy for public moments (keeps moments_own intact) ────────
-- moments_own covers owner's full access (all operations)
-- moments_public_read adds read-only access to anyone's public moments
drop policy if exists "moments_public_read" on public.moments;
create policy "moments_public_read" on public.moments
  for select to authenticated
  using (visibility = 'public');

-- ── 3. Add SELECT policy so authenticated users can read other users' info ────
-- users_own still controls write access; this only extends SELECT
drop policy if exists "users_public_read" on public.users;
create policy "users_public_read" on public.users
  for select to authenticated
  using (true);
