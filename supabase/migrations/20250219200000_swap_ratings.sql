-- One rating per participant per swap (rater rates the other party after pickup).
CREATE TABLE IF NOT EXISTS swap_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swap_id UUID NOT NULL REFERENCES swaps(id) ON DELETE CASCADE,
  rater_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(swap_id, rater_profile_id)
);

CREATE INDEX idx_swap_ratings_swap ON swap_ratings(swap_id);
CREATE INDEX idx_swap_ratings_rated ON swap_ratings(rated_profile_id);

ALTER TABLE swap_ratings ENABLE ROW LEVEL SECURITY;

-- Participants can view ratings for their swap.
CREATE POLICY "Swap participants can view swap_ratings"
  ON swap_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM swaps s
      WHERE s.id = swap_ratings.swap_id
      AND (s.buyer_profile_id = auth.uid() OR s.seller_profile_id = auth.uid())
    )
  );

-- Participants can insert their own rating (one per swap).
CREATE POLICY "Participants can insert own rating"
  ON swap_ratings FOR INSERT
  WITH CHECK (
    rater_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM swaps s
      WHERE s.id = swap_id AND s.status = 'completed'
      AND (s.buyer_profile_id = auth.uid() OR s.seller_profile_id = auth.uid())
    )
  );
