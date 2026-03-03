-- =====================================================================
-- Çevre - Live Streaming (012)
-- RTMP streaming, live chat, virtual gifts
-- =====================================================================

CREATE TYPE stream_status AS ENUM ('scheduled', 'live', 'ended');

CREATE TABLE live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  
  -- Stream URLs
  stream_key TEXT,
  stream_url TEXT,
  rtmp_url TEXT,
  playback_url TEXT,
  
  -- Status
  status stream_status DEFAULT 'scheduled',
  
  -- Stats
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  
  -- Visibility
  visibility VARCHAR(20) DEFAULT 'public',
  is_paid BOOLEAN DEFAULT false,
  price DECIMAL(10,2),
  
  -- Timing
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_live_streams_user ON live_streams(user_id);
CREATE INDEX idx_live_streams_status ON live_streams(status);

CREATE TABLE live_viewers (
  stream_id UUID REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  PRIMARY KEY (stream_id, user_id, joined_at)
);

CREATE TABLE live_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE live_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES live_streams(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  gift_type VARCHAR(50),
  amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live_streams_select_public" ON live_streams FOR SELECT 
  USING (visibility = 'public' OR user_id = auth.uid());
CREATE POLICY "live_streams_insert_own" ON live_streams FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
