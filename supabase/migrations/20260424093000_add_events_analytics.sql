create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_user_id_created_at_idx
  on public.events (user_id, created_at desc);

create index if not exists events_event_name_created_at_idx
  on public.events (event_name, created_at desc);

alter table public.events enable row level security;

do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'events_select_own'
  ) then
    create policy "events_select_own" on public.events
      for select
      using (user_id = public.get_my_user_id());
  end if;
end $$;

do $$ begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
      and policyname = 'events_insert_own'
  ) then
    create policy "events_insert_own" on public.events
      for insert
      with check (user_id = public.get_my_user_id());
  end if;
end $$;
