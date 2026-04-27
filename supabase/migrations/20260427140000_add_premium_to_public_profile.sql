-- Expose premium status in the public profile RPC so other users
-- can see if a profile owner has an active Premium subscription.
-- Must drop first because the return type is changing.

drop function if exists public.get_user_public(uuid);

create function public.get_user_public(p_user_id uuid)
returns table(
  id uuid,
  name text,
  photo_url text,
  created_at timestamptz,
  public_code text,
  public_profile_enabled boolean,
  bio text,
  featured_moment_id uuid,
  banner_url text,
  is_premium boolean,
  premium_expires_at timestamptz
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
    featured_moment_id,
    banner_url,
    coalesce(is_premium, false) as is_premium,
    premium_expires_at
  from public.users
  where id = p_user_id;
$$;

grant execute on function public.get_user_public(uuid) to authenticated;
