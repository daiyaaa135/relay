/* Add optional carrier to gadgets (listing) - e.g. Unlocked, AT&T, T-Mobile, Verizon */
ALTER TABLE gadgets ADD COLUMN IF NOT EXISTS carrier TEXT;
