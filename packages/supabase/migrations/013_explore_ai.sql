-- =====================================================================
-- Çevre - Explore & AI (013)
-- Search, trending, recommendations, ML data
-- =====================================================================

CREATE TABLE search_history (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  search_type VARCHAR(20), -- 'user' | 'post' | 'event' | 'hashtag'
  result_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_search_history_user ON search_history(user_id, created_at DESC);

CREATE TABLE trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  topic_type VARCHAR(20), -- 'hashtag' | 'location' | 'category'
  score DOUBLE PRECISION DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  user_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_trending_topics_score ON trending_topics(score DESC, updated_at DESC);

CREATE TABLE user_interests (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest VARCHAR(100),
  score DOUBLE PRECISION DEFAULT 1.0,
  source VARCHAR(50), -- 'explicit' | 'inferred'
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, interest)
);

-- ML training data
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20), -- 'post' | 'user' | 'event' | 'reel'
  target_id UUID NOT NULL,
  interaction_type VARCHAR(20), -- 'view' | 'like' | 'comment' | 'share' | 'follow'
  duration INTEGER, -- seconds
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_interactions_user ON user_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_interactions_target ON user_interactions(target_type, target_id);

-- Recommendation cache
CREATE TABLE recommendations (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recommended_type VARCHAR(20),
  recommended_id UUID,
  score DOUBLE PRECISION,
  reason TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, recommended_type, recommended_id)
);

-- RLS
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_history_own" ON search_history 
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_interactions_own" ON user_interactions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update trending topics (scheduled)
CREATE OR REPLACE FUNCTION update_trending_topics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Hashtag trends
  INSERT INTO trending_topics (topic, topic_type, score, post_count)
  SELECT 
    unnest(hashtags) as topic,
    'hashtag',
    COUNT(*) * 1.0 / EXTRACT(EPOCH FROM (now() - MIN(created_at) + interval '1 hour')) as score,
    COUNT(*)::INTEGER as post_count
  FROM posts
  WHERE created_at > now() - interval '24 hours'
    AND deleted_at IS NULL
  GROUP BY unnest(hashtags)
  ON CONFLICT (topic, topic_type) DO UPDATE
  SET score = EXCLUDED.score, post_count = EXCLUDED.post_count, updated_at = now();
  
  -- Cleanup old trends
  DELETE FROM trending_topics WHERE updated_at < now() - interval '7 days';
END;
$$;
