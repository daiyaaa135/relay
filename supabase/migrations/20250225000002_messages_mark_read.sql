-- Allow swap participants to mark messages as read (update read_at)
CREATE POLICY "Swap participants can mark messages as read" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM swaps s
    WHERE s.id = messages.swap_id
    AND (s.buyer_profile_id = auth.uid() OR s.seller_profile_id = auth.uid())
  )
);
