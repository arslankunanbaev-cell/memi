-- Re-apply the public profile fields on get_user_public.
-- security_hardening.sql previously recreated this RPC without
-- public_profile_enabled/bio/featured_moment_id, which made open
-- profiles look closed for other users.

alter table public.users
  add column if not exists public_profile_enabled boolean default false,
  add column if not exists bio text,
  add column if not exists featured_moment_id uuid;

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
    coalesce(public_profile_enabled, false) as public_profile_enabled,
    bio,
    featured_moment_id
  from public.users
  where id = p_user_id;
$$;

grant execute on function public.get_user_public(uuid) to authenticated;
