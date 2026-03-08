-- Apply all pending migrations for gadgets table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/zuohjyxetrtbutamqoiw/sql
-- This script is idempotent (safe to run multiple times)

-- 1. Add color column (from 20241107000000_add_gadgets_color.sql)
ALTER TABLE gadgets ADD COLUMN IF NOT EXISTS color TEXT;

-- 2. Add carrier column (from 20241108000000_add_gadgets_carrier.sql)
ALTER TABLE gadgets ADD COLUMN IF NOT EXISTS carrier TEXT;

-- 3. Update condition constraint to allow 'new' and 'mint' (from 20241109000000_gadgets_condition_new_mint.sql)
ALTER TABLE gadgets DROP CONSTRAINT IF EXISTS gadgets_condition_check;
ALTER TABLE gadgets ADD CONSTRAINT gadgets_condition_check
  CHECK (condition IN ('new', 'mint', 'like_new', 'excellent', 'good', 'fair', 'poor'));

-- Verify the schema
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'gadgets'
  AND table_schema = 'public'
ORDER BY ordinal_position;
