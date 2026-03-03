-- =====================================================================
-- Çevre - PostGIS Helpers (003)
-- Koordinat parse kolaylaştırıcı view ve fonksiyonlar
-- =====================================================================

-- activity_cards'a GeoJSON formatında koordinat döndüren view
CREATE OR REPLACE VIEW activity_cards_with_coords AS
SELECT
  ac.*,
  ST_X(ac.location_point::geometry) AS lng,
  ST_Y(ac.location_point::geometry) AS lat,
  ST_AsGeoJSON(ac.location_point::geometry)::json AS location_geojson
FROM activity_cards ac;

-- users için de aynı view
CREATE OR REPLACE VIEW users_with_coords AS
SELECT
  u.*,
  ST_X(u.location_point::geometry) AS lng,
  ST_Y(u.location_point::geometry) AS lat
FROM users u;

-- venues için de
CREATE OR REPLACE VIEW venues_with_coords AS
SELECT
  v.*,
  ST_X(v.location_point::geometry) AS lng,
  ST_Y(v.location_point::geometry) AS lat,
  ST_AsGeoJSON(v.location_point::geometry)::json AS location_geojson
FROM venues v;

-- get_nearby_cards fonksiyonunu GeoJSON ile döndürecek şekilde güncelle
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
  description          TEXT,
  location_name        TEXT,
  location_geojson     JSON,
  card_lat             FLOAT,
  card_lng             FLOAT,
  expires_at           TIMESTAMPTZ,
  status               card_status,
  current_participants INT,
  max_participants     INT,
  created_at           TIMESTAMPTZ,
  distance_meters      FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    ac.id,
    ac.creator_id,
    ac.category,
    ac.title,
    ac.description,
    ac.location_name,
    ST_AsGeoJSON(ac.location_point::geometry)::json AS location_geojson,
    ST_Y(ac.location_point::geometry)               AS card_lat,
    ST_X(ac.location_point::geometry)               AS card_lng,
    ac.expires_at,
    ac.status,
    ac.current_participants,
    ac.max_participants,
    ac.created_at,
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

-- activity_cards view'ına RLS ekle (view üzerinden politika direkt çalışmaz,
-- bu yüzden view'ı security_invoker olarak işaretle)
ALTER VIEW activity_cards_with_coords SET (security_invoker = true);
ALTER VIEW users_with_coords SET (security_invoker = true);
ALTER VIEW venues_with_coords SET (security_invoker = true);

-- Yakın mekanları getir
CREATE OR REPLACE FUNCTION get_nearby_venues(
  lat           FLOAT,
  lng           FLOAT,
  radius_meters INT DEFAULT 3000
)
RETURNS TABLE (
  id             UUID,
  name           TEXT,
  category       venue_category,
  partner_tier   partner_tier,
  address        TEXT,
  venue_lat      FLOAT,
  venue_lng      FLOAT,
  distance_meters FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    v.id, v.name, v.category, v.partner_tier, v.address,
    ST_Y(v.location_point::geometry) AS venue_lat,
    ST_X(v.location_point::geometry) AS venue_lng,
    ST_Distance(
      v.location_point::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM venues v
  WHERE
    v.is_active = true
    AND ST_DWithin(
      v.location_point::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY partner_tier DESC, distance_meters ASC; -- Altın mekanlar önce
$$;
