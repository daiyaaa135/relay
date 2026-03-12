-- Add optional bio/introduction to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
