/* Add optional color to gadgets (listing) */
ALTER TABLE gadgets ADD COLUMN IF NOT EXISTS color TEXT;
