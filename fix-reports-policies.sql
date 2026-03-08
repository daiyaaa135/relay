-- Run this in Supabase SQL Editor if you get "policy already exists" on reports.
-- This drops and recreates the policies so the migration can run cleanly.
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can insert own reports" ON reports;
CREATE POLICY "Users can insert own reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
