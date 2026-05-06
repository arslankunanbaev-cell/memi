-- Fix: all collection RLS policies were using auth.uid() directly,
-- but this app stores users in public.users with a separate auth_id column.
-- The existing helper get_my_user_id() maps auth.uid() -> public.users.id.

-- ── collections ───────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "members can read collection"         ON collections;
DROP POLICY IF EXISTS "authenticated users can create collection" ON collections;
DROP POLICY IF EXISTS "owner can update collection"         ON collections;
DROP POLICY IF EXISTS "owner can delete collection"         ON collections;

CREATE POLICY "members can read collection"
  ON collections FOR SELECT
  USING (
    created_by = get_my_user_id()
    OR id IN (
      SELECT collection_id FROM collection_members WHERE user_id = get_my_user_id()
    )
  );

CREATE POLICY "authenticated users can create collection"
  ON collections FOR INSERT
  WITH CHECK (get_my_user_id() IS NOT NULL);

CREATE POLICY "owner can update collection"
  ON collections FOR UPDATE
  USING (created_by = get_my_user_id());

CREATE POLICY "owner can delete collection"
  ON collections FOR DELETE
  USING (created_by = get_my_user_id());

-- ── collection_members ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "members can read collection_members"   ON collection_members;
DROP POLICY IF EXISTS "authenticated users can join collection" ON collection_members;
DROP POLICY IF EXISTS "owner or self can remove member"       ON collection_members;

CREATE POLICY "members can read collection_members"
  ON collection_members FOR SELECT
  USING (
    collection_id IN (
      SELECT collection_id FROM collection_members cm2
      WHERE cm2.user_id = get_my_user_id()
    )
  );

CREATE POLICY "authenticated users can join collection"
  ON collection_members FOR INSERT
  WITH CHECK (get_my_user_id() IS NOT NULL);

CREATE POLICY "owner or self can remove member"
  ON collection_members FOR DELETE
  USING (
    user_id = get_my_user_id()
    OR collection_id IN (
      SELECT id FROM collections WHERE created_by = get_my_user_id()
    )
  );

-- ── collection_moments ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "members can read collection_moments" ON collection_moments;
DROP POLICY IF EXISTS "members can add moments"             ON collection_moments;
DROP POLICY IF EXISTS "adder or owner can remove moment"    ON collection_moments;

CREATE POLICY "members can read collection_moments"
  ON collection_moments FOR SELECT
  USING (
    collection_id IN (
      SELECT collection_id FROM collection_members WHERE user_id = get_my_user_id()
    )
  );

CREATE POLICY "members can add moments"
  ON collection_moments FOR INSERT
  WITH CHECK (
    collection_id IN (
      SELECT collection_id FROM collection_members WHERE user_id = get_my_user_id()
    )
  );

CREATE POLICY "adder or owner can remove moment"
  ON collection_moments FOR DELETE
  USING (
    added_by = get_my_user_id()
    OR collection_id IN (
      SELECT id FROM collections WHERE created_by = get_my_user_id()
    )
  );
