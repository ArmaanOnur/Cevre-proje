-- =====================================================================
-- Çevre - Gamification (014)
-- Achievements, points, levels, leaderboards
-- =====================================================================

CREATE TYPE achievement_rarity AS ENUM ('common', 'rare', 'epic', 'legendary');

CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  rarity achievement_rarity DEFAULT 'common',
  points INTEGER DEFAULT 0,
  category VARCHAR(50),
  
  -- Requirements
  requirement_type VARCHAR(50), -- 'posts_count' | 'events_joined' | 'followers' | 'streak'
  requirement_value INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_achievements (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id, unlocked_at DESC);

CREATE TABLE user_points (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20), -- 'weekly' | 'monthly' | 'all_time' | 'category'
  category VARCHAR(50),
  start_date DATE,
  end_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE leaderboard_entries (
  leaderboard_id UUID REFERENCES leaderboards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rank INTEGER,
  score INTEGER,
  PRIMARY KEY (leaderboard_id, user_id)
);

CREATE INDEX idx_leaderboard_entries_rank ON leaderboard_entries(leaderboard_id, rank);

-- Add points to user
CREATE OR REPLACE FUNCTION add_user_points(
  p_user_id UUID,
  p_points INTEGER,
  p_source VARCHAR(50)
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_total INTEGER;
  v_new_level INTEGER;
BEGIN
  INSERT INTO user_points (user_id, total_points, last_activity_date)
  VALUES (p_user_id, p_points, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_points = user_points.total_points + p_points,
    last_activity_date = CURRENT_DATE,
    current_streak = CASE 
      WHEN user_points.last_activity_date = CURRENT_DATE - 1 
      THEN user_points.current_streak + 1
      WHEN user_points.last_activity_date < CURRENT_DATE - 1
      THEN 1
      ELSE user_points.current_streak
    END,
    longest_streak = GREATEST(
      user_points.longest_streak,
      CASE 
        WHEN user_points.last_activity_date = CURRENT_DATE - 1 
        THEN user_points.current_streak + 1
        ELSE 1
      END
    ),
    updated_at = now()
  RETURNING total_points INTO v_new_total;
  
  -- Calculate new level (every 100 points = 1 level)
  v_new_level := FLOOR(v_new_total / 100) + 1;
  
  UPDATE user_points
  SET level = v_new_level
  WHERE user_id = p_user_id;
END;
$$;

-- Check and unlock achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_achievement RECORD;
  v_current_value INTEGER;
BEGIN
  FOR v_achievement IN 
    SELECT * FROM achievements 
    WHERE id NOT IN (
      SELECT achievement_id FROM user_achievements WHERE user_id = p_user_id
    )
  LOOP
    -- Get current value for requirement
    CASE v_achievement.requirement_type
      WHEN 'posts_count' THEN
        SELECT post_count INTO v_current_value FROM users WHERE id = p_user_id;
      WHEN 'followers' THEN
        SELECT follower_count INTO v_current_value FROM users WHERE id = p_user_id;
      WHEN 'events_joined' THEN
        SELECT COUNT(*)::INTEGER INTO v_current_value 
        FROM card_joins WHERE user_id = p_user_id AND status = 'accepted';
      ELSE
        v_current_value := 0;
    END CASE;
    
    -- Check if unlocked
    IF v_current_value >= v_achievement.requirement_value THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, v_achievement.id);
      
      -- Add points
      PERFORM add_user_points(p_user_id, v_achievement.points, 'achievement');
      
      -- Notify
      PERFORM create_notification(
        p_user_id,
        'achievement_unlocked',
        'Yeni Rozet!',
        v_achievement.name || ' rozetini kazandın! 🎉',
        jsonb_build_object('achievement_id', v_achievement.id, 'points', v_achievement.points)
      );
    END IF;
  END LOOP;
END;
$$;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'achievement_unlocked';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'level_up';
