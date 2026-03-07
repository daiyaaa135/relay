-- Prevent blocked users from sending messages to their blocker.
-- Uses SECURITY DEFINER so the check can read profile_blocks (RLS would otherwise hide it from the blocked user).
CREATE OR REPLACE FUNCTION is_sender_blocked_by_recipient(swap_id UUID, sender_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  recipient_id UUID;
BEGIN
  SELECT CASE
    WHEN s.buyer_profile_id = sender_id THEN s.seller_profile_id
    ELSE s.buyer_profile_id
  END
  INTO recipient_id
  FROM swaps s
  WHERE s.id = swap_id;
  IF recipient_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM profile_blocks
    WHERE blocker_id = recipient_id AND blocked_id = sender_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the send policy to add block check
DROP POLICY IF EXISTS "Swap participants can send messages" ON messages;
CREATE POLICY "Swap participants can send messages" ON messages FOR INSERT WITH CHECK (
  sender_profile_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM swaps s
    WHERE s.id = messages.swap_id
    AND (s.buyer_profile_id = auth.uid() OR s.seller_profile_id = auth.uid())
  )
  AND NOT is_sender_blocked_by_recipient(messages.swap_id, auth.uid())
);
