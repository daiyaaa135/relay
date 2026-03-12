-- Wishlists: users can save gadgets they're interested in
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gadget_id UUID NOT NULL REFERENCES gadgets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, gadget_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_profile ON wishlists(profile_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_gadget ON wishlists(gadget_id);

ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wishlist" ON wishlists
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can manage own wishlist" ON wishlists
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);
