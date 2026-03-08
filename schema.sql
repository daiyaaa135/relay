-- ReLay Circular Tech Marketplace - Single schema file
-- Use this only for a FRESH project. If you already have tables (profiles, gadgets, etc.),
-- do NOT run this — you'll get "relation already exists". Your DB is already correct.
-- Credit-based economy, local pickup only

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "cube";
CREATE EXTENSION IF NOT EXISTS "earthdistance";

-- PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  credits_balance INTEGER NOT NULL DEFAULT 0 CHECK (credits_balance >= 0),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  state TEXT,
  max_pickup_miles INTEGER DEFAULT 50,
  rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  rating_count INTEGER DEFAULT 0,
  membership_tier TEXT NOT NULL DEFAULT 'guest' CHECK (membership_tier IN ('guest', 'relay_plus')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- GADGETS (listings)
CREATE TABLE IF NOT EXISTS gadgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  condition TEXT NOT NULL CHECK (condition IN ('like_new', 'excellent', 'good', 'fair', 'poor')),
  specs TEXT,
  description TEXT,
  color TEXT,
  verification_code TEXT,
  image_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending_swap', 'swapped', 'removed')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gadgets_profile ON gadgets(profile_id);
CREATE INDEX IF NOT EXISTS idx_gadgets_status ON gadgets(status) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_gadgets_category ON gadgets(category);
CREATE INDEX IF NOT EXISTS idx_gadgets_location ON gadgets(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gadgets_created ON gadgets(created_at DESC);

-- TRANSACTIONS (credit ledger)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('listing_credit', 'swap_debit', 'swap_credit', 'monthly_fee', 'referral_bonus', 'system_adjustment')),
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_profile ON transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- SWAPS
CREATE TABLE IF NOT EXISTS swaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gadget_id UUID NOT NULL REFERENCES gadgets(id) ON DELETE CASCADE,
  buyer_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credits_amount INTEGER NOT NULL CHECK (credits_amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'pickup_arranged', 'completed', 'cancelled')),
  pickup_arranged_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT swaps_buyer_ne_seller CHECK (buyer_profile_id != seller_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_swaps_buyer ON swaps(buyer_profile_id);
CREATE INDEX IF NOT EXISTS idx_swaps_seller ON swaps(seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_swaps_gadget ON swaps(gadget_id);
CREATE INDEX IF NOT EXISTS idx_swaps_status ON swaps(status);

-- CONVERSATIONS (message threads; optional swap_id when user starts "Swap with Credits")
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_gadget_buyer_seller ON conversations(gadget_id, buyer_profile_id, seller_profile_id);
CREATE INDEX IF NOT EXISTS idx_conversations_swap ON conversations(swap_id);

-- MESSAGES (belong to a conversation, not directly to a swap)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

-- VALUATIONS
CREATE TABLE IF NOT EXISTS valuations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gadget_id UUID REFERENCES gadgets(id) ON DELETE SET NULL,
  brand TEXT,
  category TEXT,
  model_name TEXT,
  condition TEXT,
  credits_estimated INTEGER NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_valuations_profile ON valuations(profile_id);
CREATE INDEX IF NOT EXISTS idx_valuations_created ON valuations(created_at DESC);

-- UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER gadgets_updated_at BEFORE UPDATE ON gadgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER swaps_updated_at BEFORE UPDATE ON swaps FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gadgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Available gadgets are viewable by everyone" ON gadgets FOR SELECT USING (status = 'available' OR profile_id = auth.uid());
CREATE POLICY "Users can insert own gadgets" ON gadgets FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Users can update own gadgets" ON gadgets FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Swap participants can view swap" ON swaps FOR SELECT USING (buyer_profile_id = auth.uid() OR seller_profile_id = auth.uid());
CREATE POLICY "Users can create swaps as buyer" ON swaps FOR INSERT WITH CHECK (auth.uid() = buyer_profile_id);
CREATE POLICY "Swap participants can update swap status" ON swaps FOR UPDATE USING (buyer_profile_id = auth.uid() OR seller_profile_id = auth.uid());

CREATE POLICY "Swap participants can view messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM swaps s WHERE s.id = messages.swap_id AND (s.buyer_profile_id = auth.uid() OR s.seller_profile_id = auth.uid()))
);
CREATE POLICY "Swap participants can send messages" ON messages FOR INSERT WITH CHECK (
  sender_profile_id = auth.uid() AND
  EXISTS (SELECT 1 FROM swaps s WHERE s.id = messages.swap_id AND (s.buyer_profile_id = auth.uid() OR s.seller_profile_id = auth.uid()))
);

CREATE POLICY "Users can view own valuations" ON valuations FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can insert valuations" ON valuations FOR INSERT WITH CHECK (auth.uid() = profile_id);
