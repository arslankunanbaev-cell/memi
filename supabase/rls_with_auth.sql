-- ══════════════════════════════════════════════════════════════════════════════
-- Миграция: настоящий RLS через Supabase Auth
-- Запускать в Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Добавляем auth_id в таблицу users ─────────────────────────────────────
alter table public.users
  add column if not exists auth_id uuid unique references auth.users(id);

-- ── 2. Хелпер-функция: UUID нашего пользователя по auth.uid() ────────────────
-- Все RLS-политики используют её — один JOIN вместо sub-query в каждой таблице
create or replace function public.get_my_user_id()
returns uuid language sql security definer stable as $$
  select id from public.users where auth_id = auth.uid() limit 1
$$;

-- ── 3. users ──────────────────────────────────────────────────────────────────
alter table public.users enable row level security;
drop policy if exists "users_own" on public.users;
create policy "users_own" on public.users
  for all using (auth_id = auth.uid());

-- ── 4. moments ────────────────────────────────────────────────────────────────
alter table public.moments enable row level security;
drop policy if exists "moments_own" on public.moments;
create policy "moments_own" on public.moments
  for all using (user_id = public.get_my_user_id());

-- ── 5. people ─────────────────────────────────────────────────────────────────
alter table public.people enable row level security;
drop policy if exists "people_own" on public.people;
create policy "people_own" on public.people
  for all using (user_id = public.get_my_user_id());

-- ── 6. moment_people ──────────────────────────────────────────────────────────
alter table public.moment_people enable row level security;
drop policy if exists "moment_people_own" on public.moment_people;
create policy "moment_people_own" on public.moment_people
  for all using (
    moment_id in (
      select id from public.moments where user_id = public.get_my_user_id()
    )
  );

-- ── 7. capsule ────────────────────────────────────────────────────────────────
alter table public.capsule enable row level security;
drop policy if exists "capsule_anon_all" on public.capsule;
drop policy if exists "capsule_own"      on public.capsule;
create policy "capsule_own" on public.capsule
  for all using (user_id = public.get_my_user_id());

-- ── 8. friendships ────────────────────────────────────────────────────────────
alter table public.friendships enable row level security;
drop policy if exists "friendships_own" on public.friendships;
create policy "friendships_own" on public.friendships
  for all using (
    requester_id = public.get_my_user_id()
    or receiver_id = public.get_my_user_id()
  );

-- ── 9. moment_participants ────────────────────────────────────────────────────
alter table public.moment_participants enable row level security;
drop policy if exists "participants_own" on public.moment_participants;
create policy "participants_own" on public.moment_participants
  for all using (
    user_id = public.get_my_user_id()
    or moment_id in (
      select id from public.moments where user_id = public.get_my_user_id()
    )
  );

-- ── 10. Storage: photos bucket ────────────────────────────────────────────────
-- Удаляем старые политики, добавляем привязанные к auth.uid()
drop policy if exists "photos_upload"  on storage.objects;
drop policy if exists "photos_read"    on storage.objects;
drop policy if exists "photos_delete"  on storage.objects;

create policy "photos_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (
      select telegram_id::text from public.users where auth_id = auth.uid() limit 1
    )
  );

create policy "photos_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos');

create policy "photos_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (
      select telegram_id::text from public.users where auth_id = auth.uid() limit 1
    )
  );
