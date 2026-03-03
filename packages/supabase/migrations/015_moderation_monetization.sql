-- =====================================================================
-- Çevre - Moderation & Monetization (015)
-- =====================================================================

-- =====================================================================
-- MODERATION & SAFETY
-- =====================================================================

-- NOTE: report_status already defined in migration 001. We extend the v1 reports table here
-- instead of recreating the enum.

CREATE TYPE report_category AS ENUM (
  'spam',
  'harassment',
  'hate_speech',
  'violence',
  'nudity',
  'misinformation',
  'copyright',
  'self_harm',
  'other'
);

-- Drop the basic v1 reports table (001_initial_schema.sql) and replace with enhanced version
-- report_status enum already exists from 001 — reuse it
DROP TABLE IF EXISTS reports CASCADE;

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- What's being reported
  content_type VARCHAR(50), -- 'post' | 'comment' | 'message' | 'story' | 'user'
  content_id UUID,
  
  category report_category NOT NULL,
  description TEXT,
  
  status report_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);

-- User Blocks
CREATE TABLE user_blocks (
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  PRIMARY KEY (blocker_id, blocked_id)
);

-- User Mutes (temporary)
CREATE TABLE user_mutes (
  muter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  muted_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  PRIMARY KEY (muter_id, muted_id)
);

-- Banned Users (3-strike system)
CREATE TABLE banned_users (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  banned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  banned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ, -- NULL = permanent
  strike_count INTEGER DEFAULT 1
);

-- =====================================================================
-- MONETIZATION
-- =====================================================================

-- Subscription Plans
CREATE TYPE subscription_tier AS ENUM ('free', 'plus', 'pro');

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier subscription_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  
  -- Features (JSON)
  features JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default plans
INSERT INTO subscription_plans (tier, name, price_monthly, price_yearly, features) VALUES
  ('free', 'Ücretsiz', 0, 0, '{"posts_per_day": 10, "story_limit": 5, "highlights": 3}'::jsonb),
  ('plus', 'Çevre Plus', 29.99, 299.99, '{"posts_per_day": 50, "story_limit": 20, "highlights": 10, "verified_badge": true}'::jsonb),
  ('pro', 'Çevre Pro', 99.99, 999.99, '{"posts_per_day": -1, "story_limit": -1, "highlights": -1, "verified_badge": true, "analytics": true, "priority_support": true}'::jsonb);

-- User Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'cancelled' | 'expired'
  
  -- Stripe
  stripe_subscription_id TEXT,
  
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

-- Ad Campaigns (simple)
CREATE TABLE ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  target_url TEXT,
  image_url TEXT,
  
  -- Targeting
  target_age_min INTEGER,
  target_age_max INTEGER,
  target_cities TEXT[],
  target_interests TEXT[],
  
  -- Budget
  budget DECIMAL(10,2),
  cost_per_click DECIMAL(10,2) DEFAULT 0.50,
  
  -- Stats
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spent DECIMAL(10,2) DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'active' | 'paused' | 'completed'
  
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Virtual Gifts (for live streams)
CREATE TABLE virtual_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50),
  icon_url TEXT,
  price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'TRY',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  gift_id UUID REFERENCES virtual_gifts(id),
  
  -- Context
  stream_id UUID REFERENCES live_streams(id) ON DELETE SET NULL,
  
  amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================================
-- RLS POLICIES
-- =====================================================================

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_insert_any" ON reports 
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "subscriptions_own" ON subscriptions 
  FOR ALL USING (auth.uid() = user_id);
