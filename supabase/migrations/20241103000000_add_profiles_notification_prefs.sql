-- Notification preferences for profiles (used on Settings > Notifications)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_messages BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_swaps BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_pickup_30_min BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify_pickup_15_min BOOLEAN NOT NULL DEFAULT false;
