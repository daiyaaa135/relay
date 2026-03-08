-- Profile follows: users can follow shops (profiles)
CREATE TABLE IF NOT EXISTS profile_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT profile_follows_no_self CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_follows_following ON profile_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_profile_follows_follower ON profile_follows(follower_id);

ALTER TABLE profile_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can read follower counts (via count)
CREATE POLICY "Allow read profile_follows" ON profile_follows
  FOR SELECT USING (true);

-- Users can insert their own follow
CREATE POLICY "Users can follow profiles" ON profile_follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own follow (unfollow)
CREATE POLICY "Users can unfollow profiles" ON profile_follows
  FOR DELETE USING (auth.uid() = follower_id);
