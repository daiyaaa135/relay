-- Allow condition values 'new' and 'mint' (Claude-evaluated condition grades)
ALTER TABLE gadgets DROP CONSTRAINT IF EXISTS gadgets_condition_check;
ALTER TABLE gadgets ADD CONSTRAINT gadgets_condition_check
  CHECK (condition IN ('new', 'mint', 'like_new', 'excellent', 'good', 'fair', 'poor'));
