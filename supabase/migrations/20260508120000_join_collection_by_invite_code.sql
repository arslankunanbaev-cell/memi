-- Join a shared collection from a Telegram invite code.
-- New members cannot read collections before joining, so this lookup has to
-- happen inside a SECURITY DEFINER function instead of through table SELECT.

CREATE OR REPLACE FUNCTION join_collection_by_invite_code(
  p_invite_code TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  cover_url TEXT,
  created_by UUID,
  invite_code TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  target_collection collections%ROWTYPE;
BEGIN
  current_user_id := get_my_user_id();

  IF current_user_id IS NULL OR current_user_id <> p_user_id THEN
    RAISE EXCEPTION 'Cannot join collection for a different user';
  END IF;

  SELECT *
    INTO target_collection
    FROM collections
    WHERE collections.invite_code = p_invite_code
    LIMIT 1;

  IF target_collection.id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO collection_members (collection_id, user_id, role)
  VALUES (target_collection.id, current_user_id, 'member')
  ON CONFLICT (collection_id, user_id) DO NOTHING;

  RETURN QUERY
  SELECT
    target_collection.id,
    target_collection.name,
    target_collection.cover_url,
    target_collection.created_by,
    target_collection.invite_code,
    target_collection.created_at;
END;
$$;
