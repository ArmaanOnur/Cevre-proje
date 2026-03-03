-- =====================================================================
-- Çevre - Audit Events Table (017)
-- T2 Phase — Event Sourcing Prep
-- Lightweight append-only log of all significant user actions.
-- Used for: analytics, abuse detection, rollback, ML training data.
-- =====================================================================

-- ── Audit event table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id            BIGSERIAL PRIMARY KEY,
  -- Who
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id    TEXT,
  -- What
  event_type    TEXT NOT NULL,   -- 'card.created', 'message.sent', 'follow.added', etc.
  entity_type   TEXT,            -- 'activity_card', 'message', 'user', etc.
  entity_id     TEXT,            -- UUID or other ID of the affected entity
  -- Details
  payload       JSONB DEFAULT '{}',   -- Relevant data snapshot (NOT PII by default)
  -- Context
  ip_address    INET,
  user_agent    TEXT,
  -- When
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS audit_events_user_idx      ON audit_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_type_idx      ON audit_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_entity_idx    ON audit_events (entity_type, entity_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_occurred_idx  ON audit_events (occurred_at DESC);

-- Partition hint comment (for future partitioning by month at scale)
COMMENT ON TABLE audit_events IS 'Append-only audit log. Partition by occurred_at when > 10M rows.';

-- RLS: Users can only read their own audit events; writes via service role only
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_events_select_own"
  ON audit_events FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies — only service_role can write audit events

-- ── Auto-archive trigger: 90-day retention via pg_cron (optional) ──────────
-- NOTE: Uncomment if pg_cron extension is enabled in your Supabase project
-- SELECT cron.schedule('cleanup-old-audit-events', '0 3 * * 0',
--   $$DELETE FROM audit_events WHERE occurred_at < now() - interval '90 days'$$
-- );

-- ── Application-level triggers → audit_events ─────────────────────────────

-- Helper: insert audit event (called from other triggers)
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id     UUID,
  p_event_type  TEXT,
  p_entity_type TEXT,
  p_entity_id   TEXT,
  p_payload     JSONB DEFAULT '{}'
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_events (user_id, event_type, entity_type, entity_id, payload)
  VALUES (p_user_id, p_event_type, p_entity_type, p_entity_id, p_payload);
EXCEPTION WHEN OTHERS THEN
  -- Never let audit failure break the main operation
  RAISE WARNING 'audit_events insert failed: %', SQLERRM;
END;
$$;

-- Trigger: card created
CREATE OR REPLACE FUNCTION audit_card_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM log_audit_event(
    NEW.creator_id,
    'card.created',
    'activity_card',
    NEW.id::TEXT,
    jsonb_build_object('category', NEW.category, 'title', NEW.title)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_card_created ON activity_cards;
CREATE TRIGGER trg_audit_card_created
  AFTER INSERT ON activity_cards
  FOR EACH ROW EXECUTE FUNCTION audit_card_created();

-- Trigger: card joined
CREATE OR REPLACE FUNCTION audit_card_joined()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM log_audit_event(
    NEW.user_id,
    'card.joined',
    'activity_card',
    NEW.card_id::TEXT,
    jsonb_build_object('status', NEW.status)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_card_joined ON card_participants;
CREATE TRIGGER trg_audit_card_joined
  AFTER INSERT ON card_participants
  FOR EACH ROW EXECUTE FUNCTION audit_card_joined();

-- Trigger: message sent
CREATE OR REPLACE FUNCTION audit_message_sent()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM log_audit_event(
    NEW.sender_id,
    'message.sent',
    'message',
    NEW.id::TEXT,
    jsonb_build_object('conversation_id', NEW.conversation_id, 'type', NEW.type)
    -- NOTE: content is NOT logged (privacy)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_message_sent ON messages;
CREATE TRIGGER trg_audit_message_sent
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION audit_message_sent();

-- Trigger: follow added/removed
CREATE OR REPLACE FUNCTION audit_follow_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      NEW.follower_id,
      'follow.added',
      'user',
      NEW.following_id::TEXT,
      jsonb_build_object('status', NEW.status)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      OLD.follower_id,
      'follow.removed',
      'user',
      OLD.following_id::TEXT,
      '{}'::JSONB
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_follow ON follows;
CREATE TRIGGER trg_audit_follow
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION audit_follow_changed();

-- Trigger: post created
CREATE OR REPLACE FUNCTION audit_post_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM log_audit_event(
    NEW.user_id,
    'post.created',
    'post',
    NEW.id::TEXT,
    jsonb_build_object('post_type', NEW.post_type, 'visibility', NEW.visibility)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_post_created ON posts;
CREATE TRIGGER trg_audit_post_created
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION audit_post_created();

-- Trigger: report submitted
CREATE OR REPLACE FUNCTION audit_report_submitted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM log_audit_event(
    NEW.reporter_id,
    'report.submitted',
    'report',
    NEW.id::TEXT,
    jsonb_build_object('content_type', NEW.content_type, 'category', NEW.category)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_report ON reports;
CREATE TRIGGER trg_audit_report
  AFTER INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION audit_report_submitted();
