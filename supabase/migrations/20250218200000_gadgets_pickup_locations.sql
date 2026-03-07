-- Seller chooses 2 pickup locations (buyer later picks one); time slots are chosen by buyer after swap
ALTER TABLE gadgets ADD COLUMN IF NOT EXISTS pickup_locations JSONB DEFAULT '[]';
