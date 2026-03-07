-- Profile blocks: users can block other users
CREATE TABLE IF NOT EXISTS profile_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT profile_blocks_no_self CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_blocks_blocker ON profile_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_profile_blocks_blocked ON profile_blocks(blocked_id);

ALTER TABLE profile_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blocks" ON profile_blocks;
CREATE POLICY "Users can view own blocks" ON profile_blocks
  FOR SELECT USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can block profiles" ON profile_blocks;
CREATE POLICY "Users can block profiles" ON profile_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can unblock profiles" ON profile_blocks;
CREATE POLICY "Users can unblock profiles" ON profile_blocks
  FOR DELETE USING (auth.uid() = blocker_id);
