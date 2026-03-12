-- Apply carrier column migration
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/zuohjyxetrtbutamqoiw/sql

ALTER TABLE gadgets ADD COLUMN IF NOT EXISTS carrier TEXT;
