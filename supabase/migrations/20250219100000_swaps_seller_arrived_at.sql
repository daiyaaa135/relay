-- Seller can mark "I arrived at the meeting spot" so buyer sees "[Name] is here".
ALTER TABLE swaps
  ADD COLUMN IF NOT EXISTS seller_arrived_at TIMESTAMPTZ;

COMMENT ON COLUMN swaps.seller_arrived_at IS 'When the seller tapped Yes on "Did you arrive at the meeting spot?"';
