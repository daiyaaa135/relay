-- Weekly availability windows for each profile (used for listing meetups)
CREATE TABLE IF NOT EXISTS profile_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- 0 = Sunday, 6 = Saturday (aligns with JS Date.getDay)
  day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_time < end_time),
  UNIQUE (profile_id, day_of_week, start_time, end_time)
);

CREATE INDEX IF NOT EXISTS idx_profile_availability_profile
  ON profile_availability(profile_id, day_of_week, start_time);

ALTER TABLE profile_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view availability"
  ON profile_availability
  FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Owner can insert availability"
  ON profile_availability
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Owner can update availability"
  ON profile_availability
  FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Owner can delete availability"
  ON profile_availability
  FOR DELETE
  USING (auth.uid() = profile_id);

CREATE TRIGGER profile_availability_updated_at
  BEFORE UPDATE ON profile_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

