-- Make public profiles enabled by default for all users (new and existing).

-- 1. Change column default
alter table public.users
  alter column public_profile_enabled set default true;

-- 2. Enable for all existing users (was false/null before)
update public.users
  set public_profile_enabled = true
  where public_profile_enabled is null or public_profile_enabled = false;

-- 3. Update RPC coalesce fallback to match new default
create or replace function public.get_user_public(p_user_id uuid)
returns table(
  id uuid,
  name text,
  photo_url text,
  created_at timestamptz,
  public_code text,
  public_profile_enabled boolean,
  bio text,
  featured_moment_id uuid
)
language sql
security definer
stable
as $$
  select
    id,
    name,
    photo_url,
    created_at,
    public_code,
    coalesce(public_profile_enabled, true) as public_profile_enabled,
    bio,
    featured_moment_id
  from public.users
  where id = p_user_id;
$$;

grant execute on function public.get_user_public(uuid) to authenticated;
