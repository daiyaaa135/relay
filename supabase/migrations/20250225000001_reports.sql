-- Reports: user-submitted reports (harassment, fraud, etc.)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can insert own reports" ON reports;
CREATE POLICY "Users can insert own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
