-- Verify gadgets table schema matches expected columns
-- Run this in your Supabase SQL Editor to check what columns exist

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'gadgets'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected columns:
-- ✓ id (UUID)
-- ✓ profile_id (UUID)
-- ✓ name (TEXT)
-- ✓ brand (TEXT)
-- ✓ category (TEXT)
-- ✓ credits (INTEGER)
-- ✓ condition (TEXT with CHECK constraint)
-- ✓ specs (TEXT, nullable)
-- ✓ description (TEXT, nullable)
-- ✓ color (TEXT, nullable) - ADDED in migration 20241107000000
-- ✓ carrier (TEXT, nullable) - ADDED in migration 20241108000000
-- ✓ image_urls (TEXT[])
-- ✓ status (TEXT)
-- ✓ latitude (DOUBLE PRECISION, nullable)
-- ✓ longitude (DOUBLE PRECISION, nullable)
-- ✓ city (TEXT, nullable)
-- ✓ state (TEXT, nullable)
-- ✓ created_at (TIMESTAMPTZ)
-- ✓ updated_at (TIMESTAMPTZ)

-- Check condition constraint
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'gadgets'::regclass
  AND conname = 'gadgets_condition_check';
