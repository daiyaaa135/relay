-- Live locations for pickup: buyer and seller can share location so both see when the other has arrived.
ALTER TABLE swaps
  ADD COLUMN IF NOT EXISTS buyer_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS buyer_lon DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS buyer_location_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seller_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS seller_lon DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS seller_location_at TIMESTAMPTZ;
