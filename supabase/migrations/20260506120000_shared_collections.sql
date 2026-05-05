-- ── Shared Collections ────────────────────────────────────────────────────────
-- Named groups of moments that multiple users can contribute to.

CREATE TABLE IF NOT EXISTS collections (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  cover_url   TEXT,
  created_by  UUID        REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT        UNIQUE DEFAULT substring(md5(random()::text || clock_timestamp()::text), 1, 16),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_members (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT        NOT NULL DEFAULT 'member', -- 'owner' | 'member'
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection_id, user_id)
);

CREATE TABLE IF NOT EXISTS collection_moments (
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  moment_id     UUID REFERENCES moments(id) ON DELETE CASCADE,
  added_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (collection_id, moment_id)
);

-- Indexes for common lookup patterns
CREATE INDEX IF NOT EXISTS idx_collection_members_user ON collection_members(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_moments_collection ON collection_moments(collection_id);

-- RLS
ALTER TABLE collections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_moments ENABLE ROW LEVEL SECURITY;

-- collections: visible to members only
CREATE POLICY "members can read collection"
  ON collections FOR SELECT
  USING (
    id IN (
      SELECT collection_id FROM collection_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated users can create collection"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "owner can update collection"
  ON collections FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "owner can delete collection"
  ON collections FOR DELETE
  USING (created_by = auth.uid());

-- collection_members: visible to collection members
CREATE POLICY "members can read collection_members"
  ON collection_members FOR SELECT
  USING (
    collection_id IN (
      SELECT collection_id FROM collection_members cm2 WHERE cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated users can join collection"
  ON collection_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "owner or self can remove member"
  ON collection_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR collection_id IN (
      SELECT id FROM collections WHERE created_by = auth.uid()
    )
  );

-- collection_moments: visible to collection members
CREATE POLICY "members can read collection_moments"
  ON collection_moments FOR SELECT
  USING (
    collection_id IN (
      SELECT collection_id FROM collection_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members can add moments"
  ON collection_moments FOR INSERT
  WITH CHECK (
    collection_id IN (
      SELECT collection_id FROM collection_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "adder or owner can remove moment"
  ON collection_moments FOR DELETE
  USING (
    added_by = auth.uid()
    OR collection_id IN (
      SELECT id FROM collections WHERE created_by = auth.uid()
    )
  );
