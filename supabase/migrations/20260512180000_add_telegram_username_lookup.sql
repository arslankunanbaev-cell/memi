alter table public.users
  add column if not exists telegram_username text;

update public.users
  set telegram_username = lower(regexp_replace(telegram_username, '^@+', ''))
  where telegram_username is not null;

create index if not exists users_telegram_username_lower_idx
  on public.users (lower(telegram_username))
  where telegram_username is not null;

create or replace function public.find_user_by_telegram_username(p_username text)
returns table(id uuid, name text, photo_url text, public_code text, telegram_username text)
language sql security definer stable as $$
  select id, name, photo_url, public_code, telegram_username
  from public.users
  where lower(telegram_username) = lower(regexp_replace(trim(p_username), '^@+', ''))
  limit 1;
$$;

grant execute on function public.find_user_by_telegram_username(text) to authenticated;
