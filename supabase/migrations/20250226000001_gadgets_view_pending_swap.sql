-- Allow swap participants (buyer or seller) to view gadgets with status pending_swap
DROP POLICY IF EXISTS "Available gadgets are viewable by everyone" ON gadgets;
CREATE POLICY "Gadgets viewable by owner or available or swap participants" ON gadgets
  FOR SELECT USING (
    status = 'available'
    OR profile_id = auth.uid()
    OR (
      status = 'pending_swap'
      AND EXISTS (
        SELECT 1 FROM swaps s
        WHERE s.gadget_id = gadgets.id
        AND (s.buyer_profile_id = auth.uid() OR s.seller_profile_id = auth.uid())
        AND s.status NOT IN ('completed', 'cancelled')
      )
    )
  );
