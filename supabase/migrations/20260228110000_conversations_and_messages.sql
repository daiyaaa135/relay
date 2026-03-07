-- Option B: Conversations table for message threads; messages reference conversation (not swap).
-- One conversation per (gadget, buyer, seller). When user starts "Swap with Credits", conversation.swap_id is set.

-- 1. Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gadget_id UUID NOT NULL REFERENCES gadgets(id) ON DELETE CASCADE,
  buyer_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  swap_id UUID REFERENCES swaps(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT conversations_buyer_ne_seller CHECK (buyer_profile_id != seller_profile_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_gadget_buyer_seller
  ON conversations(gadget_id, buyer_profile_id, seller_profile_id);

CREATE INDEX IF NOT EXISTS idx_conversations_swap ON conversations(swap_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_profile_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller ON conversations(seller_profile_id);

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Backfill: one conversation per (gadget, buyer, seller), using latest swap as swap_id
INSERT INTO conversations (gadget_id, buyer_profile_id, seller_profile_id, swap_id, created_at, updated_at)
SELECT DISTINCT ON (gadget_id, buyer_profile_id, seller_profile_id)
  gadget_id, buyer_profile_id, seller_profile_id, id, created_at, updated_at
FROM swaps
ORDER BY gadget_id, buyer_profile_id, seller_profile_id, created_at DESC;

-- 3. Add conversation_id to messages and backfill (all messages for same gadget+buyer+seller go to that one conversation)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE;

UPDATE messages m
SET conversation_id = (
  SELECT c.id FROM conversations c
  JOIN swaps s ON s.id = m.swap_id
  WHERE c.gadget_id = s.gadget_id AND c.buyer_profile_id = s.buyer_profile_id AND c.seller_profile_id = s.seller_profile_id
  LIMIT 1
)
WHERE m.conversation_id IS NULL;

-- 4. Drop messages RLS policies that depend on swap_id (must be before dropping column)
DROP POLICY IF EXISTS "Swap participants can view messages" ON messages;
DROP POLICY IF EXISTS "Swap participants can send messages" ON messages;

-- 5. Make conversation_id NOT NULL and drop swap_id
ALTER TABLE messages ALTER COLUMN conversation_id SET NOT NULL;
ALTER TABLE messages DROP COLUMN IF EXISTS swap_id;

DROP INDEX IF EXISTS idx_messages_swap;
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- 6. RLS for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can view" ON conversations FOR SELECT USING (
  buyer_profile_id = auth.uid() OR seller_profile_id = auth.uid()
);
CREATE POLICY "Buyer can create conversation" ON conversations FOR INSERT WITH CHECK (auth.uid() = buyer_profile_id);
CREATE POLICY "Conversation participants can update" ON conversations FOR UPDATE USING (
  buyer_profile_id = auth.uid() OR seller_profile_id = auth.uid()
);

-- 7. New messages RLS using conversation_id

CREATE POLICY "Conversation participants can view messages" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.buyer_profile_id = auth.uid() OR c.seller_profile_id = auth.uid())
  )
);
CREATE POLICY "Conversation participants can send messages" ON messages FOR INSERT WITH CHECK (
  sender_profile_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (c.buyer_profile_id = auth.uid() OR c.seller_profile_id = auth.uid())
  )
);
