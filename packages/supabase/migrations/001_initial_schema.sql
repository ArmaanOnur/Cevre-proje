-- =====================================================================
-- Çevre Uygulaması - İlk Veritabanı Migration
-- Supabase'de çalıştır: SQL Editor > New Query
-- =====================================================================

-- PostGIS uzantısı (konum sorguları için gerekli)
CREATE EXTENSION IF NOT EXISTS postgis;

-- UUID oluşturucu
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM TİPLERİ ────────────────────────────────────────────────────────────

CREATE TYPE activity_category AS ENUM (
  'kahve', 'spor', 'muzik', 'kitap', 'oyun',
  'yuruyus', 'sinema', 'yemek', 'sanat', 'dil', 'diger'
);

CREATE TYPE card_status AS ENUM ('active', 'expired', 'cancelled', 'full');
CREATE TYPE join_status AS ENUM ('pending', 'accepted', 'declined', 'cancelled');
CREATE TYPE neighborhood_role AS ENUM ('member', 'moderator', 'admin');
CREATE TYPE skill_swap_status AS ENUM ('open', 'matched', 'completed', 'cancelled');
CREATE TYPE venue_category AS ENUM ('kafe', 'restoran', 'spor', 'kultur', 'etkinlik', 'diger');
CREATE TYPE partner_tier AS ENUM ('bronz', 'gumus', 'altin');
CREATE TYPE report_reason AS ENUM ('spam', 'taciz', 'sahte_profil', 'uygunsuz_icerik', 'diger');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

-- ─── USERS ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  phone         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  bio           TEXT CHECK (char_length(bio) <= 200),
  location_point GEOMETRY(Point, 4326),
  verified_at   TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Konum üzerinde spatial index
CREATE INDEX idx_users_location ON users USING GIST(location_point);

-- ─── ACTIVITY CARDS ───────────────────────────────────────────────────────────

CREATE TABLE activity_cards (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category             activity_category NOT NULL,
  title                TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 80),
  description          TEXT CHECK (char_length(description) <= 300),
  location_point       GEOMETRY(Point, 4326) NOT NULL,
  location_name        TEXT NOT NULL,
  max_participants     INT NOT NULL DEFAULT 4 CHECK (max_participants BETWEEN 2 AND 8),
  current_participants INT NOT NULL DEFAULT 1 CHECK (current_participants >= 0),
  expires_at           TIMESTAMPTZ NOT NULL,
  status               card_status NOT NULL DEFAULT 'active',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_location ON activity_cards USING GIST(location_point);
CREATE INDEX idx_cards_status   ON activity_cards(status);
CREATE INDEX idx_cards_expires  ON activity_cards(expires_at);
CREATE INDEX idx_cards_creator  ON activity_cards(creator_id);

-- ─── CARD JOINS ───────────────────────────────────────────────────────────────

CREATE TABLE card_joins (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id      UUID NOT NULL REFERENCES activity_cards(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       join_status NOT NULL DEFAULT 'pending',
  message      TEXT CHECK (char_length(message) <= 200),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(card_id, user_id)
);

CREATE INDEX idx_joins_card ON card_joins(card_id);
CREATE INDEX idx_joins_user ON card_joins(user_id);

-- ─── NEIGHBORHOODS ────────────────────────────────────────────────────────────

CREATE TABLE neighborhoods (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  city         TEXT NOT NULL,
  district     TEXT NOT NULL,
  description  TEXT,
  member_count INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE neighborhood_members (
  neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role            neighborhood_role NOT NULL DEFAULT 'member',
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (neighborhood_id, user_id)
);

-- ─── SKILL SWAPS ──────────────────────────────────────────────────────────────

CREATE TABLE skill_swaps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offerer_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_offered   TEXT NOT NULL CHECK (char_length(skill_offered) BETWEEN 2 AND 100),
  skill_wanted    TEXT NOT NULL CHECK (char_length(skill_wanted) BETWEEN 2 AND 100),
  description     TEXT CHECK (char_length(description) <= 300),
  status          skill_swap_status NOT NULL DEFAULT 'open',
  matched_user_id UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_swaps_offerer ON skill_swaps(offerer_id);
CREATE INDEX idx_swaps_status  ON skill_swaps(status);

-- ─── VENUES ───────────────────────────────────────────────────────────────────

CREATE TABLE venues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  location_point  GEOMETRY(Point, 4326) NOT NULL,
  address         TEXT NOT NULL,
  category        venue_category NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.0,
  partner_tier    partner_tier NOT NULL DEFAULT 'bronz',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  partner_since   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_location ON venues USING GIST(location_point);

-- ─── SAFETY LOGS ─────────────────────────────────────────────────────────────

CREATE TABLE safety_logs (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id              UUID NOT NULL REFERENCES activity_cards(id) ON DELETE CASCADE,
  safe_ping_at         TIMESTAMPTZ,
  emergency_contact_id UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── REPORTS ─────────────────────────────────────────────────────────────────

CREATE TABLE reports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason           report_reason NOT NULL,
  description      TEXT CHECK (char_length(description) <= 500),
  status           report_status NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── FONKSİYONLAR ────────────────────────────────────────────────────────────

-- Yakın aktivite kartlarını getir
CREATE OR REPLACE FUNCTION get_nearby_cards(
  lat            FLOAT,
  lng            FLOAT,
  radius_meters  INT DEFAULT 5000
)
RETURNS TABLE (
  id                   UUID,
  creator_id           UUID,
  category             activity_category,
  title                TEXT,
  location_name        TEXT,
  expires_at           TIMESTAMPTZ,
  status               card_status,
  current_participants INT,
  max_participants     INT,
  distance_meters      FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    ac.id,
    ac.creator_id,
    ac.category,
    ac.title,
    ac.location_name,
    ac.expires_at,
    ac.status,
    ac.current_participants,
    ac.max_participants,
    ST_Distance(
      ac.location_point::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM activity_cards ac
  WHERE
    ac.status = 'active'
    AND ac.expires_at > now()
    AND ST_DWithin(
      ac.location_point::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC;
$$;

-- Kullanıcı konumunu güncelle
CREATE OR REPLACE FUNCTION update_user_location(user_id UUID, lat FLOAT, lng FLOAT)
RETURNS void LANGUAGE sql AS $$
  UPDATE users
  SET location_point = ST_SetSRID(ST_MakePoint(lng, lat), 4326),
      updated_at = now()
  WHERE id = user_id;
$$;

-- Katılım kabul edilince katılımcı sayısını artır
CREATE OR REPLACE FUNCTION on_join_accepted()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    UPDATE activity_cards
    SET
      current_participants = current_participants + 1,
      status = CASE
        WHEN current_participants + 1 >= max_participants THEN 'full'::card_status
        ELSE status
      END
    WHERE id = NEW.card_id;
  END IF;
  IF NEW.status != 'accepted' AND OLD.status = 'accepted' THEN
    UPDATE activity_cards
    SET current_participants = GREATEST(0, current_participants - 1)
    WHERE id = NEW.card_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_join_accepted
  AFTER UPDATE ON card_joins
  FOR EACH ROW EXECUTE FUNCTION on_join_accepted();

-- Üye sayısı güncelle
CREATE OR REPLACE FUNCTION update_neighborhood_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE neighborhoods SET member_count = member_count + 1 WHERE id = NEW.neighborhood_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE neighborhoods SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.neighborhood_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_neighborhood_count
  AFTER INSERT OR DELETE ON neighborhood_members
  FOR EACH ROW EXECUTE FUNCTION update_neighborhood_count();

-- updated_at otomatik güncelle
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_cards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_joins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods       ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhood_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_swaps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports             ENABLE ROW LEVEL SECURITY;

-- USERS: Herkes okuyabilir, sadece kendi profilini yazabilir
CREATE POLICY "users_select_all"    ON users FOR SELECT USING (true);
CREATE POLICY "users_insert_own"    ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own"    ON users FOR UPDATE USING (auth.uid() = id);

-- ACTIVITY CARDS: Herkes aktif kartları okuyabilir, kendi kartını yönetebilir
CREATE POLICY "cards_select_active" ON activity_cards FOR SELECT USING (status = 'active' OR creator_id = auth.uid());
CREATE POLICY "cards_insert_auth"   ON activity_cards FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "cards_update_own"    ON activity_cards FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "cards_delete_own"    ON activity_cards FOR DELETE USING (auth.uid() = creator_id);

-- CARD JOINS: İlgili kart yaratıcısı ve katılımcı görebilir
CREATE POLICY "joins_select"  ON card_joins FOR SELECT USING (
  auth.uid() = user_id OR
  auth.uid() IN (SELECT creator_id FROM activity_cards WHERE id = card_id)
);
CREATE POLICY "joins_insert"  ON card_joins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "joins_update"  ON card_joins FOR UPDATE USING (
  auth.uid() IN (SELECT creator_id FROM activity_cards WHERE id = card_id)
);

-- NEIGHBORHOODS: Herkes okuyabilir, üyeler katılabilir
CREATE POLICY "hood_select_all"  ON neighborhoods        FOR SELECT USING (true);
CREATE POLICY "hood_member_all"  ON neighborhood_members FOR SELECT USING (true);
CREATE POLICY "hood_member_join" ON neighborhood_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hood_member_leave"ON neighborhood_members FOR DELETE USING (auth.uid() = user_id);

-- SKILL SWAPS: Herkes açık ilanları görebilir
CREATE POLICY "swap_select_open"  ON skill_swaps FOR SELECT USING (status = 'open' OR offerer_id = auth.uid());
CREATE POLICY "swap_insert_auth"  ON skill_swaps FOR INSERT WITH CHECK (auth.uid() = offerer_id);
CREATE POLICY "swap_update_own"   ON skill_swaps FOR UPDATE USING (auth.uid() = offerer_id);

-- SAFETY: Sadece kendi kaydını görebilir
CREATE POLICY "safety_own"  ON safety_logs FOR ALL USING (auth.uid() = user_id);

-- REPORTS: Kendi şikayetini görebilir
CREATE POLICY "reports_own" ON reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ─── PILOT VERİ: İlk mahalleler ───────────────────────────────────────────────

INSERT INTO neighborhoods (name, city, district, description) VALUES
  ('Kadıköy Çevresi', 'İstanbul', 'Kadıköy', 'Kadıköy''de sosyal aktivite ve buluşma noktası'),
  ('Beşiktaş Çevresi', 'İstanbul', 'Beşiktaş', 'Beşiktaş''ta spor, kültür ve kahve molası'),
  ('Şişli Çevresi', 'İstanbul', 'Şişli', 'Şişli''de iş sonrası sosyalleşme');
