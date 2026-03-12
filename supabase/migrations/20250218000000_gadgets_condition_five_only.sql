-- Conditions: only new, mint, good, fair, poor. Remove like_new and excellent.
UPDATE gadgets SET condition = 'mint' WHERE condition IN ('like_new', 'excellent');
ALTER TABLE gadgets DROP CONSTRAINT IF EXISTS gadgets_condition_check;
ALTER TABLE gadgets ADD CONSTRAINT gadgets_condition_check
  CHECK (condition IN ('new', 'mint', 'good', 'fair', 'poor'));
