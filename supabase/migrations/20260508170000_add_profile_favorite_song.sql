alter table public.users
  add column if not exists favorite_song_title text,
  add column if not exists favorite_song_artist text,
  add column if not exists favorite_song_cover text;

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
  premium_expires_at timestamptz,
  favorite_song_title text,
  favorite_song_artist text,
  favorite_song_cover text
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
    premium_expires_at,
    favorite_song_title,
    favorite_song_artist,
    favorite_song_cover
  from public.users
  where id = p_user_id;
$$;

grant execute on function public.get_user_public(uuid) to authenticated;
