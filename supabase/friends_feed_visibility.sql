-- Friends feed visibility
-- Additive policy for moments shared with accepted friends.
-- Run in Supabase Dashboard -> SQL Editor after the existing auth/RLS scripts.

drop policy if exists "moments_friends_read" on public.moments;
create policy "moments_friends_read" on public.moments
  for select to authenticated
  using (
    visibility = 'friends'
    and exists (
      select 1
      from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = public.get_my_user_id() and f.receiver_id = public.moments.user_id)
          or (f.receiver_id = public.get_my_user_id() and f.requester_id = public.moments.user_id)
        )
    )
  );
