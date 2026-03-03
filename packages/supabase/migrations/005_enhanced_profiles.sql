-- =====================================================================
-- Çevre - Enhanced Profile System (005)
-- Gelişmiş profil, username, verification, social links
-- =====================================================================

-- Username sistemi için unique constraint ekle
ALTER TABLE users
  ADD COLUMN username VARCHAR(30) UNIQUE,
  ADD COLUMN cover_photo TEXT,
  ADD COLUMN pronouns VARCHAR(50),
  ADD COLUMN website TEXT,
  ADD COLUMN social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN interests TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN languages TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN follower_count INTEGER DEFAULT 0,
  ADD COLUMN following_count INTEGER DEFAULT 0,
  ADD COLUMN post_count INTEGER DEFAULT 0,
  ADD COLUMN verification_tier VARCHAR(20) DEFAULT 'none',
  ADD COLUMN is_private BOOLEAN DEFAULT false,
  ADD COLUMN show_activity BOOLEAN DEFAULT true,
  ADD COLUMN show_location BOOLEAN DEFAULT true;

-- Username için index
CREATE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;

-- Verification tiers
CREATE TYPE verification_tier AS ENUM ('none', 'verified', 'professional', 'business');
ALTER TABLE users 
  ALTER COLUMN verification_tier TYPE verification_tier USING verification_tier::verification_tier;

-- Username generation function (ilk kayıtta otomatik)
CREATE OR REPLACE FUNCTION generate_unique_username(display_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Türkçe karakterleri çevir ve temizle
  base_username := LOWER(display_name);
  base_username := TRANSLATE(base_username, 'ğüşöçıİ', 'gusociu');
  base_username := REGEXP_REPLACE(base_username, '[^a-z0-9]', '', 'g');
  base_username := SUBSTRING(base_username, 1, 20);
  
  final_username := base_username;
  
  -- Unique olana kadar dene
  WHILE EXISTS (SELECT 1 FROM users WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter;
  END LOOP;
  
  RETURN final_username;
END;
$$;

-- Trigger: Yeni user oluşturulunca otomatik username ver
CREATE OR REPLACE FUNCTION set_default_username()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.username IS NULL THEN
    NEW.username := generate_unique_username(NEW.display_name);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_default_username
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_default_username();

-- Social links validation function
CREATE OR REPLACE FUNCTION validate_social_links()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Instagram
  IF NEW.social_links ? 'instagram' THEN
    IF NOT (NEW.social_links->>'instagram' ~ '^https?://(www\.)?instagram\.com/[a-zA-Z0-9_.]+/?$') THEN
      RAISE EXCEPTION 'Invalid Instagram URL';
    END IF;
  END IF;
  
  -- Twitter
  IF NEW.social_links ? 'twitter' THEN
    IF NOT (NEW.social_links->>'twitter' ~ '^https?://(www\.)?(twitter|x)\.com/[a-zA-Z0-9_]+/?$') THEN
      RAISE EXCEPTION 'Invalid Twitter URL';
    END IF;
  END IF;
  
  -- LinkedIn
  IF NEW.social_links ? 'linkedin' THEN
    IF NOT (NEW.social_links->>'linkedin' ~ '^https?://(www\.)?linkedin\.com/in/[a-zA-Z0-9-]+/?$') THEN
      RAISE EXCEPTION 'Invalid LinkedIn URL';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_social_links
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_social_links();

-- Profile completeness function
CREATE OR REPLACE FUNCTION calculate_profile_completeness(user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  completeness INTEGER := 0;
  user_record RECORD;
BEGIN
  SELECT * INTO user_record FROM users WHERE id = user_id;
  
  -- Base fields (40%)
  IF user_record.display_name IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF user_record.bio IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF user_record.avatar_url IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF user_record.location_point IS NOT NULL THEN completeness := completeness + 10; END IF;
  
  -- Additional fields (30%)
  IF user_record.cover_photo IS NOT NULL THEN completeness := completeness + 10; END IF;
  IF user_record.website IS NOT NULL THEN completeness := completeness + 5; END IF;
  IF ARRAY_LENGTH(user_record.interests, 1) > 0 THEN completeness := completeness + 10; END IF;
  IF ARRAY_LENGTH(user_record.skills, 1) > 0 THEN completeness := completeness + 5; END IF;
  
  -- Social links (15%)
  IF user_record.social_links ? 'instagram' THEN completeness := completeness + 5; END IF;
  IF user_record.social_links ? 'twitter' THEN completeness := completeness + 5; END IF;
  IF user_record.social_links ? 'linkedin' THEN completeness := completeness + 5; END IF;
  
  -- Activity (15%)
  IF user_record.post_count > 0 THEN completeness := completeness + 5; END IF;
  IF user_record.follower_count > 0 THEN completeness := completeness + 5; END IF;
  IF user_record.following_count > 0 THEN completeness := completeness + 5; END IF;
  
  RETURN LEAST(completeness, 100);
END;
$$;

-- View: Enhanced user profiles with completeness
CREATE OR REPLACE VIEW user_profiles_enhanced AS
SELECT 
  u.*,
  calculate_profile_completeness(u.id) as profile_completeness,
  (SELECT COUNT(*) FROM activity_cards WHERE creator_id = u.id AND status = 'active') as active_events_count,
  (SELECT COUNT(*) FROM skill_swaps WHERE offerer_id = u.id AND status = 'open') as active_skill_swaps_count
FROM users u
WHERE u.deleted_at IS NULL;

-- RLS Policy updates
CREATE POLICY "users_update_own_extended"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
