-- Fix: infinite recursion in collection_members RLS.
-- The SELECT policy on collection_members referenced collection_members
-- itself in a subquery, causing Postgres to recurse infinitely.
-- Solution: SECURITY DEFINER helper that bypasses RLS when looking up
-- the current user's memberships.

CREATE OR REPLACE FUNCTION get_my_collection_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT collection_id FROM collection_members WHERE user_id = get_my_user_id()
$$;

-- ── collection_members ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "members can read collection_members" ON collection_members;

-- Use the SECURITY DEFINER function — no recursion
CREATE POLICY "members can read collection_members"
  ON collection_members FOR SELECT
  USING (
    collection_id IN (SELECT get_my_collection_ids())
  );

-- ── collections ───────────────────────────────────────────────────────────────
-- Also update to use helper so SELECT on collections doesn't trigger
-- the recursive collection_members policy.

DROP POLICY IF EXISTS "members can read collection" ON collections;

CREATE POLICY "members can read collection"
  ON collections FOR SELECT
  USING (
    created_by = get_my_user_id()
    OR id IN (SELECT get_my_collection_ids())
  );

-- ── collection_moments ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "members can read collection_moments" ON collection_moments;
DROP POLICY IF EXISTS "members can add moments"             ON collection_moments;

CREATE POLICY "members can read collection_moments"
  ON collection_moments FOR SELECT
  USING (
    collection_id IN (SELECT get_my_collection_ids())
  );

CREATE POLICY "members can add moments"
  ON collection_moments FOR INSERT
  WITH CHECK (
    collection_id IN (SELECT get_my_collection_ids())
  );

-- ── DELETE policies that referenced collection_members ────────────────────────

DROP POLICY IF EXISTS "owner or self can remove member"  ON collection_members;
DROP POLICY IF EXISTS "adder or owner can remove moment" ON collection_moments;

CREATE POLICY "owner or self can remove member"
  ON collection_members FOR DELETE
  USING (
    user_id = get_my_user_id()
    OR collection_id IN (
      SELECT id FROM collections WHERE created_by = get_my_user_id()
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
