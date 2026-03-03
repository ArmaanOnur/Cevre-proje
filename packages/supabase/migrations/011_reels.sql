-- =====================================================================
-- Çevre - Reels System (011)
-- Short-form video content, trending, algorithm
-- =====================================================================

CREATE TABLE reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Video
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER NOT NULL, -- seconds (max 90)
  width INTEGER,
  height INTEGER,
  
  -- Content
  caption TEXT,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Music
  music_track_id TEXT,
  music_track_name TEXT,
  music_artist TEXT,
  
  -- Engagement
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  
  -- Algorithm
  trending_score DOUBLE PRECISION DEFAULT 0,
  category VARCHAR(50),
  
  -- Settings
  allow_comments BOOLEAN DEFAULT true,
  allow_duet BOOLEAN DEFAULT true,
  
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reels_user ON reels(user_id, created_at DESC);
CREATE INDEX idx_reels_trending ON reels(trending_score DESC, created_at DESC) 
  WHERE deleted_at IS NULL;
CREATE INDEX idx_reels_category ON reels(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_reels_hashtags ON reels USING GIN(hashtags);

CREATE TABLE reel_views (
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  watch_duration INTEGER, -- seconds watched
  completed BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (reel_id, user_id, viewed_at)
);

CREATE TABLE reel_likes (
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (reel_id, user_id)
);

-- RLS
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reels_select_all" ON reels FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "reels_insert_own" ON reels FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update trending score (scheduled)
CREATE OR REPLACE FUNCTION update_reel_trending_scores()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE reels
  SET trending_score = (
    (view_count * 1.0) +
    (like_count * 5.0) +
    (comment_count * 10.0) +
    (share_count * 20.0)
  ) / EXTRACT(EPOCH FROM (now() - created_at + interval '2 hours'))
  WHERE created_at > now() - interval '7 days';
END;
$$;
