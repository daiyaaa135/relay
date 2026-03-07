-- Add verification_code column to gadgets table.
-- Each listing gets a unique code that the seller must write on paper
-- and photograph next to the device to prove physical possession.
ALTER TABLE gadgets ADD COLUMN IF NOT EXISTS verification_code TEXT;
