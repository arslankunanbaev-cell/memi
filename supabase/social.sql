-- ── Social features migration ─────────────────────────────────────────────────
-- Run this in your Supabase SQL editor.
-- Safe to re-run (uses IF NOT EXISTS / CREATE POLICY ... IF NOT EXISTS).

-- ── 1. friendships ────────────────────────────────────────────────────────────

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  receiver_id  uuid not null references public.users(id) on delete cascade,
  status       text not null default 'pending',
  created_at   timestamptz default now(),
  unique (requester_id, receiver_id)
);

alter table public.friendships enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'friendships' and policyname = 'friendships_select'
  ) then
    create policy "friendships_select" on public.friendships
      for select using (
        requester_id = auth.uid() or receiver_id = auth.uid()
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'friendships' and policyname = 'friendships_insert'
  ) then
    create policy "friendships_insert" on public.friendships
      for insert with check (requester_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'friendships' and policyname = 'friendships_update'
  ) then
    create policy "friendships_update" on public.friendships
      for update using (receiver_id = auth.uid());
  end if;
end $$;

-- ── 2. moment_participants ────────────────────────────────────────────────────

create table if not exists public.moment_participants (
  id        uuid primary key default gen_random_uuid(),
  moment_id uuid not null references public.moments(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  unique (moment_id, user_id)
);

alter table public.moment_participants enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'moment_participants' and policyname = 'participants_select'
  ) then
    create policy "participants_select" on public.moment_participants
      for select using (
        user_id = auth.uid()
        or exists (
          select 1 from public.moments m
          where m.id = moment_id and m.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'moment_participants' and policyname = 'participants_insert'
  ) then
    create policy "participants_insert" on public.moment_participants
      for insert with check (
        exists (
          select 1 from public.moments m
          where m.id = moment_id and m.user_id = auth.uid()
        )
      );
  end if;
end $$;
