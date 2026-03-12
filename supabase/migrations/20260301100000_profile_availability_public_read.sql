-- Allow buyers to read a seller's profile_availability when choosing pickup times.
-- Existing "Owner can view" only allows the profile to read their own rows; buyers need SELECT on seller rows.
CREATE POLICY "Anyone can view availability"
  ON profile_availability
  FOR SELECT
  USING (true);
