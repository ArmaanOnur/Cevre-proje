-- =====================================================================
-- Çevre - Voice & Video Calls (009)
-- WebRTC calls, call history, screen sharing
-- =====================================================================

-- Call types
CREATE TYPE call_type AS ENUM ('voice', 'video');
CREATE TYPE call_status AS ENUM ('ringing', 'active', 'ended', 'missed', 'declined', 'failed');

-- Calls tablosu
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  type call_type NOT NULL,
  status call_status DEFAULT 'ringing',
  
  -- WebRTC room
  room_id TEXT,
  agora_channel_id TEXT, -- Agora kullanıyorsak
  
  -- Timing
  initiated_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration INTEGER, -- seconds
  
  -- Stats
  participant_count INTEGER DEFAULT 0,
  max_participants INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_calls_conversation ON calls(conversation_id, created_at DESC);
CREATE INDEX idx_calls_initiator ON calls(initiator_id);
CREATE INDEX idx_calls_status ON calls(status);

-- Call participants
CREATE TABLE call_participants (
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- State
  status VARCHAR(20) DEFAULT 'ringing', -- 'ringing' | 'joined' | 'left' | 'declined'
  
  -- Timing
  invited_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  duration INTEGER, -- seconds in call
  
  -- Permissions
  can_screen_share BOOLEAN DEFAULT true,
  can_record BOOLEAN DEFAULT false,
  
  -- Media state
  is_muted BOOLEAN DEFAULT false,
  is_video_enabled BOOLEAN DEFAULT true,
  is_screen_sharing BOOLEAN DEFAULT false,
  
  PRIMARY KEY (call_id, user_id)
);

CREATE INDEX idx_call_participants_user ON call_participants(user_id, joined_at DESC);
CREATE INDEX idx_call_participants_call ON call_participants(call_id);

-- Call recordings (opsiyonel)
CREATE TABLE call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- File
  file_url TEXT NOT NULL,
  file_size INTEGER, -- bytes
  duration INTEGER, -- seconds
  
  -- Visibility
  is_public BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_recordings ENABLE ROW LEVEL SECURITY;

-- Calls: Participant'lar görebilir
CREATE POLICY "calls_select_participant"
  ON calls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM call_participants cp
      WHERE cp.call_id = id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "calls_insert_participant"
  ON calls FOR INSERT
  WITH CHECK (
    auth.uid() = initiator_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "calls_update_participant"
  ON calls FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM call_participants cp
      WHERE cp.call_id = id AND cp.user_id = auth.uid()
    )
  );

-- Call participants: İlgili kullanıcılar görebilir
CREATE POLICY "call_participants_select_related"
  ON call_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM call_participants cp
      WHERE cp.call_id = call_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "call_participants_insert_own"
  ON call_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "call_participants_update_own"
  ON call_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Triggers

-- Trigger: Call başladığında duration hesapla
CREATE OR REPLACE FUNCTION update_call_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'ended' AND OLD.status = 'active' AND NEW.ended_at IS NOT NULL THEN
    NEW.duration := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_call_duration
  BEFORE UPDATE ON calls
  FOR EACH ROW
  EXECUTE FUNCTION update_call_duration();

-- Trigger: Participant katıldı/ayrıldı → call participant_count güncelle
CREATE OR REPLACE FUNCTION update_call_participant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Aktif participant sayısı
  SELECT COUNT(*) INTO v_count
  FROM call_participants
  WHERE call_id = COALESCE(NEW.call_id, OLD.call_id)
    AND status = 'joined'
    AND left_at IS NULL;
  
  UPDATE calls
  SET 
    participant_count = v_count,
    max_participants = GREATEST(max_participants, v_count)
  WHERE id = COALESCE(NEW.call_id, OLD.call_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_call_participant_count
  AFTER INSERT OR UPDATE ON call_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_call_participant_count();

-- Trigger: Call başladı → bildirim gönder
CREATE OR REPLACE FUNCTION notify_call_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_participant RECORD;
  v_initiator_name TEXT;
BEGIN
  IF NEW.status = 'ringing' AND OLD.status IS NULL THEN
    -- Initiator adını al
    SELECT display_name INTO v_initiator_name
    FROM users WHERE id = NEW.initiator_id;
    
    -- Conversation'daki tüm kullanıcılara bildirim
    FOR v_participant IN 
      SELECT user_id 
      FROM conversation_participants
      WHERE conversation_id = NEW.conversation_id
        AND user_id != NEW.initiator_id
        AND left_at IS NULL
    LOOP
      -- Call participant ekle
      INSERT INTO call_participants (call_id, user_id, status)
      VALUES (NEW.id, v_participant.user_id, 'ringing')
      ON CONFLICT DO NOTHING;
      
      -- Bildirim gönder
      PERFORM create_notification(
        v_participant.user_id,
        'incoming_call',
        CASE NEW.type
          WHEN 'voice' THEN 'Gelen Sesli Arama'
          WHEN 'video' THEN 'Gelen Görüntülü Arama'
        END,
        v_initiator_name || ' seni arıyor',
        jsonb_build_object('call_id', NEW.id, 'conversation_id', NEW.conversation_id, 'type', NEW.type)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_call_participants
  AFTER INSERT ON calls
  FOR EACH ROW
  EXECUTE FUNCTION notify_call_participants();

-- Helper Functions

-- Initiate call
CREATE OR REPLACE FUNCTION initiate_call(
  p_conversation_id UUID,
  p_initiator_id UUID,
  p_type call_type
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_call_id UUID;
  v_room_id TEXT;
BEGIN
  -- Random room ID
  v_room_id := 'room_' || gen_random_uuid()::text;
  
  -- Call oluştur
  INSERT INTO calls (conversation_id, initiator_id, type, status, room_id)
  VALUES (p_conversation_id, p_initiator_id, p_type, 'ringing', v_room_id)
  RETURNING id INTO v_call_id;
  
  RETURN v_call_id;
END;
$$;

-- Join call
CREATE OR REPLACE FUNCTION join_call(
  p_call_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Participant'ı güncelle
  UPDATE call_participants
  SET 
    status = 'joined',
    joined_at = now()
  WHERE call_id = p_call_id AND user_id = p_user_id;
  
  -- Call'ı active yap (ilk katılan)
  UPDATE calls
  SET 
    status = 'active',
    started_at = COALESCE(started_at, now())
  WHERE id = p_call_id AND status = 'ringing';
END;
$$;

-- Leave call
CREATE OR REPLACE FUNCTION leave_call(
  p_call_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_count INTEGER;
BEGIN
  -- Participant'ı güncelle
  UPDATE call_participants
  SET 
    left_at = now(),
    duration = EXTRACT(EPOCH FROM (now() - joined_at))::INTEGER
  WHERE call_id = p_call_id AND user_id = p_user_id;
  
  -- Aktif participant sayısı
  SELECT COUNT(*) INTO v_active_count
  FROM call_participants
  WHERE call_id = p_call_id
    AND status = 'joined'
    AND left_at IS NULL;
  
  -- Kimse kalmadıysa call'ı sonlandır
  IF v_active_count = 0 THEN
    UPDATE calls
    SET 
      status = 'ended',
      ended_at = now()
    WHERE id = p_call_id;
  END IF;
END;
$$;

-- Decline call
CREATE OR REPLACE FUNCTION decline_call(
  p_call_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE call_participants
  SET status = 'declined'
  WHERE call_id = p_call_id AND user_id = p_user_id;
END;
$$;

-- Get call history
CREATE OR REPLACE FUNCTION get_call_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  call_id UUID,
  conversation_id UUID,
  type call_type,
  status call_status,
  initiator_id UUID,
  initiated_at TIMESTAMPTZ,
  duration INTEGER,
  participant_count INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as call_id,
    c.conversation_id,
    c.type,
    c.status,
    c.initiator_id,
    c.initiated_at,
    c.duration,
    c.participant_count
  FROM calls c
  JOIN call_participants cp ON cp.call_id = c.id
  WHERE cp.user_id = p_user_id
  ORDER BY c.initiated_at DESC
  LIMIT p_limit;
END;
$$;

-- Update notification types
ALTER TYPE notification_type ADD VALUE 'incoming_call';
ALTER TYPE notification_type ADD VALUE 'missed_call';
