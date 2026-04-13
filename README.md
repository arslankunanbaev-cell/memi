# Memi — Telegram Mini App

Приложение для сохранения личных воспоминаний.

## Стек

- React + Vite
- Tailwind CSS v4
- Telegram Web App SDK
- Supabase (PostgreSQL)
- Zustand

## Настройка Supabase

### 1. Создай проект на [supabase.com](https://supabase.com)

### 2. Выполни SQL в Dashboard → SQL Editor

```sql
-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
create table if not exists public.users (
  id          uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────
-- MOMENTS
-- ─────────────────────────────────────────
create table if not exists public.moments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  title        text not null,
  description  text,
  mood         text,
  location     text,
  song_title   text,
  song_artist  text,
  song_cover   text,
  photo_url    text,
  created_at   timestamptz not null default now()
);

create index if not exists moments_user_id_idx on public.moments(user_id);
create index if not exists moments_created_at_idx on public.moments(created_at desc);

-- ─────────────────────────────────────────
-- PEOPLE
-- ─────────────────────────────────────────
create table if not exists public.people (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  name         text not null,
  avatar_color text not null default '#D98B52',
  photo_url    text,
  created_at   timestamptz not null default now()
);

create index if not exists people_user_id_idx on public.people(user_id);

-- ─────────────────────────────────────────
-- MOMENT ↔ PEOPLE (many-to-many)
-- ─────────────────────────────────────────
create table if not exists public.moment_people (
  moment_id uuid not null references public.moments(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  primary key (moment_id, person_id)
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table public.users         enable row level security;
alter table public.moments       enable row level security;
alter table public.people        enable row level security;
alter table public.moment_people enable row level security;

create policy "users: own row" on public.users
  for all using (id = auth.uid());

create policy "moments: own" on public.moments
  for all using (user_id = auth.uid());

create policy "people: own" on public.people
  for all using (user_id = auth.uid());

create policy "moment_people: via moment" on public.moment_people
  for all using (
    exists (
      select 1 from public.moments m
      where m.id = moment_id and m.user_id = auth.uid()
    )
  );
```

### 3. Storage bucket для фото

В Dashboard → Storage → New bucket:
- Имя: `memi-photos`
- Public: **выключен**

### 4. Переменные окружения

Создай `.env` в корне проекта:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

URL и ключ — в Dashboard → Settings → API.

## Запуск

```bash
npm install
npm run dev
```
