-- Seller-provided pickup time slots (min 2) so buyer can pick one
ALTER TABLE gadgets ADD COLUMN IF NOT EXISTS pickup_slots JSONB DEFAULT '[]';
