-- Fix: creator couldn't read the collection immediately after INSERT
-- because the SELECT policy required membership, but the member row
-- doesn't exist yet at the moment of insert...select.

DROP POLICY IF EXISTS "members can read collection" ON collections;

CREATE POLICY "members can read collection"
  ON collections FOR SELECT
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT collection_id FROM collection_members WHERE user_id = auth.uid()
    )
  );
