-- Optional text comment with the rating.
ALTER TABLE swap_ratings
  ADD COLUMN IF NOT EXISTS comment TEXT;
