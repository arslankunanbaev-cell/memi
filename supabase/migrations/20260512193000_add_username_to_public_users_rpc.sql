drop function if exists public.get_users_public(uuid[]);

create or replace function public.get_users_public(p_user_ids uuid[])
returns table(id uuid, name text, photo_url text, public_code text, telegram_username text)
language sql security definer stable as $$
  select id, name, photo_url, public_code, telegram_username
  from public.users
  where id = any(p_user_ids);
$$;

grant execute on function public.get_users_public(uuid[]) to authenticated;
