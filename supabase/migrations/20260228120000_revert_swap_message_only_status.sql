-- Revert message_only from swap status (Option B uses conversations instead).
ALTER TABLE swaps DROP CONSTRAINT IF EXISTS swaps_status_check;
ALTER TABLE swaps ADD CONSTRAINT swaps_status_check CHECK (
  status IN ('pending', 'confirmed', 'pickup_arranged', 'completed', 'cancelled')
);
