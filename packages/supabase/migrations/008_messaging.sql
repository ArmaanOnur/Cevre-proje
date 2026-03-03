-- =====================================================================
-- Çevre - Messaging System (008)
-- Direct messages, group chat, typing indicators, read receipts
-- =====================================================================

-- Message types
CREATE TYPE message_type AS ENUM (
  'text', 'image', 'video', 'audio', 'file', 'location', 'post', 'sticker', 'voice_note'
);

-- Conversation types
CREATE TYPE conversation_type AS ENUM ('direct', 'group');

-- Conversations tablosu
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL DEFAULT 'direct',
  
  -- Group için
  name TEXT,
  avatar_url TEXT,
  description TEXT,
  
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Last message (denormalized for performance)
  last_message_id UUID,
  last_message_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_type ON conversations(type);

-- Conversation participants
CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role (group için)
  role VARCHAR(20) DEFAULT 'member', -- 'admin' | 'member'
  
  -- State
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  last_read_message_id UUID,
  
  -- Settings
  is_muted BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  notifications_enabled BOOLEAN DEFAULT true,
  
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id) 
  WHERE left_at IS NULL;
CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);

-- Messages tablosu
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content
  type message_type NOT NULL DEFAULT 'text',
  content TEXT,
  
  -- Media
  media_url TEXT,
  media_type VARCHAR(50),
  media_thumbnail_url TEXT,
  media_duration INTEGER, -- seconds
  
  -- Reply
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  
  -- Encryption
  is_encrypted BOOLEAN DEFAULT false,
  encryption_key_id TEXT,
  
  -- Self-destruct
  expires_at TIMESTAMPTZ,
  
  -- Deletion
  deleted_at TIMESTAMPTZ,
  deleted_for UUID[], -- Kullanıcılar için "benden sil"
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC) 
  WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_reply ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;

-- Message reads (görüldü)
CREATE TABLE message_reads (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX idx_message_reads_message ON message_reads(message_id);
CREATE INDEX idx_message_reads_user ON message_reads(user_id);

-- Typing indicators (ephemeral - realtime only, opsiyonel table)
CREATE TABLE typing_indicators (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '10 seconds'),
  PRIMARY KEY (conversation_id, user_id)
);

-- RLS Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Conversations: Sadece participant'lar görebilir
CREATE POLICY "conversations_select_participant"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "conversations_update_admin"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id
      AND cp.user_id = auth.uid()
      AND cp.role = 'admin'
    )
  );

-- Participants: Conversation'ı görebiliyorsa participant'ları görebilir
CREATE POLICY "participants_select_member"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "participants_insert_admin"
  ON conversation_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_id
      AND cp.user_id = auth.uid()
      AND cp.role = 'admin'
    )
    OR auth.uid() = user_id -- Kendi katılımını ekleyebilir
  );

-- Messages: Participant'lar görebilir
CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND (deleted_for IS NULL OR NOT (auth.uid() = ANY(deleted_for)))
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

CREATE POLICY "messages_insert_participant"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_id
      AND cp.user_id = auth.uid()
      AND cp.left_at IS NULL
    )
  );

CREATE POLICY "messages_update_own"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- Triggers

-- Trigger: Yeni mesaj → conversation updated_at & last_message güncelle
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE conversations
  SET 
    last_message_id = NEW.id,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- Trigger: Mesaj okundu → message_reads ekle ve delivered_at güncelle
CREATE OR REPLACE FUNCTION mark_message_as_read()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delivered_at henüz set edilmemişse set et
  IF (SELECT delivered_at FROM messages WHERE id = NEW.message_id) IS NULL THEN
    UPDATE messages 
    SET delivered_at = NEW.read_at 
    WHERE id = NEW.message_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_mark_message_as_read
  AFTER INSERT ON message_reads
  FOR EACH ROW
  EXECUTE FUNCTION mark_message_as_read();

-- Helper Functions

-- Get or create direct conversation
CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(
  user1_id UUID,
  user2_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Mevcut conversation'ı bul
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'direct'
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp1
    WHERE cp1.conversation_id = c.id AND cp1.user_id = user1_id
  )
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = c.id AND cp2.user_id = user2_id
  )
  LIMIT 1;
  
  -- Yoksa oluştur
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', user1_id)
    RETURNING id INTO v_conversation_id;
    
    -- Participant'ları ekle
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES 
      (v_conversation_id, user1_id),
      (v_conversation_id, user2_id);
  END IF;
  
  RETURN v_conversation_id;
END;
$$;

-- Get unread message count for user
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE cp.user_id = p_user_id
    AND cp.left_at IS NULL
    AND m.sender_id != p_user_id
    AND m.deleted_at IS NULL
    AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01'::timestamptz);
  
  RETURN v_count;
END;
$$;

-- Mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_as_read(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_message_id UUID;
BEGIN
  -- Son mesaj ID'sini al
  SELECT id INTO v_last_message_id
  FROM messages
  WHERE conversation_id = p_conversation_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Participant'ı güncelle
  UPDATE conversation_participants
  SET 
    last_read_at = now(),
    last_read_message_id = v_last_message_id
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
  
  -- Tüm mesajları read olarak işaretle
  INSERT INTO message_reads (message_id, user_id, read_at)
  SELECT m.id, p_user_id, now()
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id != p_user_id
    AND m.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM message_reads mr
      WHERE mr.message_id = m.id AND mr.user_id = p_user_id
    )
  ON CONFLICT DO NOTHING;
END;
$$;

-- Search messages
CREATE OR REPLACE FUNCTION search_messages(
  p_user_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  message_id UUID,
  conversation_id UUID,
  content TEXT,
  sender_id UUID,
  sender_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.conversation_id,
    m.content,
    m.sender_id,
    u.display_name as sender_name,
    m.created_at
  FROM messages m
  JOIN users u ON u.id = m.sender_id
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE cp.user_id = p_user_id
    AND cp.left_at IS NULL
    AND m.deleted_at IS NULL
    AND m.content ILIKE '%' || p_query || '%'
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Update notification types
ALTER TYPE notification_type ADD VALUE 'new_message';
ALTER TYPE notification_type ADD VALUE 'message_reaction';
