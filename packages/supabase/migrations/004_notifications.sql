-- =====================================================================
-- Çevre - Notifications System (004)
-- Bildirim tabloları ve push token yönetimi
-- =====================================================================

-- Bildirim tipleri
CREATE TYPE notification_type AS ENUM (
  'card_join_request',      -- Kartına katılım isteği geldi
  'card_join_accepted',     -- Katılım isteğin kabul edildi
  'card_join_declined',     -- Katılım isteğin reddedildi
  'card_reminder',          -- Kart 1 saat sonra başlıyor
  'skill_swap_match',       -- Beceri takası eşleşmesi bulundu
  'skill_swap_completed',   -- Beceri takası tamamlandı
  'neighborhood_welcome',   -- Mahalleye katıldın
  'safety_ping_reminder',   -- Güvenlik ping hatırlatması
  'system'                  -- Sistem bildirimi
);

-- Push token tablosu (Expo push notifications)
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT,  -- 'ios' | 'android' | 'web'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id) WHERE is_active = true;
CREATE INDEX idx_push_tokens_token ON push_tokens(token);

-- Bildirimler tablosu
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,  -- İlgili kaynağın ID'si ve ek veriler
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- RLS Policies
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Push tokens: Sadece kendi tokenlarını görebilir ve yönetebilir
CREATE POLICY "push_tokens_select_own"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_insert_own"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_update_own"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete_own"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications: Sadece kendi bildirimlerini görebilir
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Bildirim oluşturma fonksiyonu (sistem içinden çağrılır)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (p_user_id, p_type, p_title, p_body, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Toplu okundu işaretleme fonksiyonu
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE user_id = p_user_id AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Trigger: Yeni katılım isteği → bildirim
CREATE OR REPLACE FUNCTION notify_card_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_creator_id UUID;
  v_card_title TEXT;
  v_joiner_name TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    -- Kart sahibini ve bilgileri al
    SELECT creator_id, title INTO v_creator_id, v_card_title
    FROM activity_cards
    WHERE id = NEW.card_id;
    
    SELECT display_name INTO v_joiner_name
    FROM users
    WHERE id = NEW.user_id;
    
    -- Bildirim oluştur
    PERFORM create_notification(
      v_creator_id,
      'card_join_request',
      'Yeni Katılım İsteği',
      v_joiner_name || ' "' || v_card_title || '" etkinliğine katılmak istiyor',
      jsonb_build_object('card_id', NEW.card_id, 'join_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_card_join_notification
  AFTER INSERT ON card_joins
  FOR EACH ROW
  EXECUTE FUNCTION notify_card_join_request();

-- Trigger: Katılım kabul/red → bildirim
CREATE OR REPLACE FUNCTION notify_card_join_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card_title TEXT;
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    SELECT title INTO v_card_title FROM activity_cards WHERE id = NEW.card_id;
    
    PERFORM create_notification(
      NEW.user_id,
      'card_join_accepted',
      'Katılım İsteğin Kabul Edildi!',
      '"' || v_card_title || '" etkinliğine katılabilirsin 🎉',
      jsonb_build_object('card_id', NEW.card_id)
    );
  ELSIF NEW.status = 'declined' AND OLD.status = 'pending' THEN
    SELECT title INTO v_card_title FROM activity_cards WHERE id = NEW.card_id;
    
    PERFORM create_notification(
      NEW.user_id,
      'card_join_declined',
      'Katılım İsteğin Reddedildi',
      '"' || v_card_title || '" etkinliğine katılamıyorsun',
      jsonb_build_object('card_id', NEW.card_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_card_join_response_notification
  AFTER UPDATE ON card_joins
  FOR EACH ROW
  EXECUTE FUNCTION notify_card_join_response();

-- Trigger: Beceri takası eşleşmesi → bildirim
CREATE OR REPLACE FUNCTION notify_skill_swap_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offerer_name TEXT;
  v_skill TEXT;
BEGIN
  IF NEW.status = 'matched' AND OLD.status = 'open' AND NEW.matched_user_id IS NOT NULL THEN
    SELECT display_name INTO v_offerer_name FROM users WHERE id = NEW.offerer_id;
    
    PERFORM create_notification(
      NEW.matched_user_id,
      'skill_swap_match',
      'Beceri Takası Eşleşmesi!',
      v_offerer_name || ' ile eşleştin: ' || NEW.skill_offered || ' ↔ ' || NEW.skill_wanted,
      jsonb_build_object('swap_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_skill_swap_match_notification
  AFTER UPDATE ON skill_swaps
  FOR EACH ROW
  EXECUTE FUNCTION notify_skill_swap_match();

-- Eski bildirimleri temizleme (30 günden eski)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM notifications
  WHERE created_at < now() - INTERVAL '30 days';
END;
$$;
