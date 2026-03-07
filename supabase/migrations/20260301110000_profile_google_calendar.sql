-- Google Calendar tokens per profile for availability sync and pickup events
CREATE TABLE IF NOT EXISTS profile_google_calendar (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profile_google_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can view own calendar tokens" ON profile_google_calendar;
CREATE POLICY "Owner can view own calendar tokens"
  ON profile_google_calendar
  FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Owner can upsert own calendar tokens" ON profile_google_calendar;
CREATE POLICY "Owner can upsert own calendar tokens"
  ON profile_google_calendar
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Owner can update own calendar tokens"
  ON profile_google_calendar
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Owner can delete own calendar tokens"
  ON profile_google_calendar
  FOR DELETE
  USING (auth.uid() = profile_id);

