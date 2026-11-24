-- =============================================================================
-- NUSANTARA WATCH — DUAL-CITIZEN POSTGIS 3.4 SCHEMA (QGIS + ARCGIS PRO + WEBGIS)
-- See docs/decisions/ADR-003-dual-citizen-postgis-qgis-arcgis-backend.md
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

CREATE SCHEMA IF NOT EXISTS bnpb;
CREATE SCHEMA IF NOT EXISTS spatial;

-- Database roles for least-privilege separation (Dealbreaker #2 in ADR-003):
-- 1. gis_analyst: Used by BNPB Pusdatin analysts in QGIS Desktop & ArcGIS Pro (:5432)
-- 2. api_service: Used by the Fastify API Gateway & Martin Vector Tile Server
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'gis_analyst') THEN
    CREATE ROLE gis_analyst NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'api_service') THEN
    CREATE ROLE api_service NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public, bnpb, spatial TO gis_analyst, api_service;

-- =============================================================================
-- 1. BNPB KARHUTLA 2026 — 47-COLUMN OPERATIONAL SITREP TABLE
-- Designed with `objectid SERIAL PRIMARY KEY` + flat typed columns + explicit
-- `geometry(Point, 4326)` so both QGIS Desktop and ArcGIS Pro Query Layers can
-- open, filter, symbolize, and edit all 47 columns directly.
-- =============================================================================
CREATE TABLE IF NOT EXISTS bnpb.karhutla_sitrep_47col (
  objectid SERIAL PRIMARY KEY,
  snapshot_mode VARCHAR(20) NOT NULL DEFAULT 'live-api' CHECK (snapshot_mode IN ('live-api', 'excel-sheet')),
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  short_province VARCHAR(32) NOT NULL,
  full_province VARCHAR(64) NOT NULL,
  color_hex VARCHAR(16) NOT NULL DEFAULT '#ff4d3d',

  -- Columns 2..6: Hotspot & Fire Spot
  hotspot_rendah INTEGER NOT NULL DEFAULT 0,
  hotspot_sedang INTEGER NOT NULL DEFAULT 0,
  hotspot_tinggi INTEGER NOT NULL DEFAULT 0,
  total_hotspot INTEGER NOT NULL DEFAULT 0,
  fire_spot INTEGER NOT NULL DEFAULT 0,
  excel_total_hotspot INTEGER NOT NULL DEFAULT 0,
  excel_fire_spot INTEGER NOT NULL DEFAULT 0,

  -- Columns 7..18: Burned Area, Air Quality, Visibility, Casualties, Ground Ops
  lahan_terbakar_indikatif_ha NUMERIC(12, 2) NOT NULL DEFAULT 0,
  kualitas_udara_pm25_text VARCHAR(64) NOT NULL DEFAULT '-',
  pm25_ugm3 NUMERIC(8, 2),
  air_quality_status VARCHAR(32) NOT NULL DEFAULT 'Baik',
  excel_air_quality_range VARCHAR(64) NOT NULL DEFAULT '-',
  jarak_pandang_bandara_km VARCHAR(32) NOT NULL DEFAULT '-',
  lahan_terbakar_harian_ha NUMERIC(12, 2) NOT NULL DEFAULT 0,
  excel_lahan_terbakar_harian_ha NUMERIC(12, 2) NOT NULL DEFAULT 0,
  luas_terbakar_centurisk_ha NUMERIC(12, 2),
  luas_belum_padam_centurisk_ha NUMERIC(12, 2) NOT NULL DEFAULT 0,
  md_l VARCHAR(16) NOT NULL DEFAULT '-',
  md_p VARCHAR(16) NOT NULL DEFAULT '-',
  total_md VARCHAR(16) NOT NULL DEFAULT '-',
  kabkot_terdampak INTEGER NOT NULL DEFAULT 0,
  luas_ditangani_darat_ha NUMERIC(12, 2) NOT NULL DEFAULT 0,
  luas_akan_dipadamkan_ha NUMERIC(12, 2) NOT NULL DEFAULT 0,
  excel_luas_akan_dipadamkan_ha NUMERIC(12, 2) NOT NULL DEFAULT 0,

  -- Columns 19..30: 11-Agency Personnel Breakdown
  personil_bpbd INTEGER NOT NULL DEFAULT 0,
  personil_pemerintah_pusat INTEGER NOT NULL DEFAULT 0,
  personil_tni INTEGER NOT NULL DEFAULT 0,
  personil_polri INTEGER NOT NULL DEFAULT 0,
  personil_pemda INTEGER NOT NULL DEFAULT 0,
  personil_relawan INTEGER NOT NULL DEFAULT 0,
  personil_polisi_hutan INTEGER NOT NULL DEFAULT 0,
  personil_manggala_agni INTEGER NOT NULL DEFAULT 0,
  personil_mpa INTEGER NOT NULL DEFAULT 0,
  personil_satpol_pp INTEGER NOT NULL DEFAULT 0,
  personil_perusahaan INTEGER NOT NULL DEFAULT 0,
  total_personel INTEGER NOT NULL DEFAULT 0,

  -- Columns 31..41 & 44..47: Aerial Operations (Patroli, Water Bombing, OMC, Standby)
  patroli_unit INTEGER NOT NULL DEFAULT 0,
  patroli_sortie INTEGER NOT NULL DEFAULT 0,
  wb_unit INTEGER NOT NULL DEFAULT 0,
  wb_sortie INTEGER NOT NULL DEFAULT 0,
  jumlah_wb_harian INTEGER NOT NULL DEFAULT 0,
  volume_wb_ltr BIGINT NOT NULL DEFAULT 0,
  omc_unit INTEGER NOT NULL DEFAULT 0,
  omc_sortie INTEGER NOT NULL DEFAULT 0,
  total_bahan_semai_kg INTEGER NOT NULL DEFAULT 0,
  luas_ditangani_udara_ha NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_unit_udara_hari_ini INTEGER NOT NULL DEFAULT 0,
  unit_patroli_standby INTEGER NOT NULL DEFAULT 0,
  unit_wb_standby INTEGER NOT NULL DEFAULT 0,
  unit_omc_standby INTEGER NOT NULL DEFAULT 0,
  total_unit_standby INTEGER NOT NULL DEFAULT 0,

  -- Columns 42..43: Official BNPB Tactical Notes
  rekomendasi TEXT NOT NULL DEFAULT '',
  kesimpulan TEXT NOT NULL DEFAULT '',

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  geom geometry(Point, 4326) NOT NULL,
  CONSTRAINT uq_bnpb_province_mode UNIQUE (short_province, snapshot_mode)
);

CREATE INDEX IF NOT EXISTS idx_bnpb_sitrep_geom ON bnpb.karhutla_sitrep_47col USING GIST (geom);

-- =============================================================================
-- 2. KESATUAN HIDROLOGIS GAMBUT (KHG) & CONCESSION POLYGONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS spatial.concessions_khg (
  objectid SERIAL PRIMARY KEY,
  concession_uid VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  holder_group VARCHAR(160) NOT NULL,
  concession_type VARCHAR(64) NOT NULL,
  province VARCHAR(64) NOT NULL,
  area_hectares NUMERIC(12, 2) NOT NULL DEFAULT 0,
  active_hotspot_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  geom geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_concessions_khg_geom ON spatial.concessions_khg USING GIST (geom);

-- =============================================================================
-- 3. SATELLITE THERMAL HOTSPOTS (NASA FIRMS VIIRS / MODIS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS spatial.hotspots_firms (
  objectid SERIAL PRIMARY KEY,
  hotspot_uid VARCHAR(64) UNIQUE NOT NULL,
  satellite VARCHAR(32) NOT NULL DEFAULT 'VIIRS SNPP',
  frp_mw NUMERIC(8, 2) NOT NULL DEFAULT 0,
  brightness_k NUMERIC(8, 2) NOT NULL DEFAULT 330,
  confidence INTEGER NOT NULL DEFAULT 85,
  persistence_hours INTEGER NOT NULL DEFAULT 24,
  day_offset INTEGER NOT NULL DEFAULT 0,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  province VARCHAR(64) NOT NULL DEFAULT 'Belum Terklasifikasi',
  kabupaten VARCHAR(96) NOT NULL DEFAULT '-',
  kecamatan VARCHAR(96) NOT NULL DEFAULT '-',
  is_peatland BOOLEAN NOT NULL DEFAULT TRUE,
  peat_depth_meters NUMERIC(6, 2) NOT NULL DEFAULT 0,
  in_concession BOOLEAN NOT NULL DEFAULT FALSE,
  concession_holder VARCHAR(160),
  concession_type VARCHAR(64) NOT NULL DEFAULT 'Lahan Masyarakat',
  daops_name VARCHAR(160) NOT NULL DEFAULT 'Manggala Agni Daops Wilayah',
  daops_distance_km NUMERIC(6, 2) NOT NULL DEFAULT 15.0,
  water_bombing_ready BOOLEAN NOT NULL DEFAULT TRUE,
  ispu_station_name VARCHAR(160) NOT NULL DEFAULT 'Stasiun Pemantau BMKG',
  ispu_score INTEGER NOT NULL DEFAULT 100,
  pm25_ugm3 NUMERIC(8, 2) NOT NULL DEFAULT 35.0,
  ispu_category VARCHAR(32) NOT NULL DEFAULT 'Sedang',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  geom geometry(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hotspots_firms_geom ON spatial.hotspots_firms USING GIST (geom);

-- =============================================================================
-- 4. LKPP SIRUP PROCUREMENT BUDGET ARCS
-- Stores both origin (`agency_geom`), destination (`target_geom`), and generated
-- `LineString` (`arc_geom`) so QGIS & ArcGIS Pro can render the budget arcs natively!
-- =============================================================================
CREATE TABLE IF NOT EXISTS spatial.sirup_budget_arcs (
  objectid SERIAL PRIMARY KEY,
  sirup_id VARCHAR(64) UNIQUE NOT NULL,
  package_name TEXT NOT NULL,
  agency VARCHAR(160) NOT NULL,
  province VARCHAR(64) NOT NULL,
  budget_rp BIGINT NOT NULL,
  category VARCHAR(64) NOT NULL,
  anomaly_level VARCHAR(32) NOT NULL,
  anomaly_reason TEXT NOT NULL,
  province_active_hotspots INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agency_geom geometry(Point, 4326) NOT NULL,
  target_geom geometry(Point, 4326) NOT NULL,
  arc_geom geometry(LineString, 4326) GENERATED ALWAYS AS (ST_MakeLine(agency_geom, target_geom)) STORED
);

CREATE INDEX IF NOT EXISTS idx_sirup_arcs_geom ON spatial.sirup_budget_arcs USING GIST (arc_geom);

-- =============================================================================
-- 5. BMKG WIND & ISPU AIR QUALITY STATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS spatial.bmkg_aq_stations (
  objectid SERIAL PRIMARY KEY,
  station_uid VARCHAR(64) UNIQUE NOT NULL,
  station_name VARCHAR(160) NOT NULL,
  province VARCHAR(64) NOT NULL,
  ispu INTEGER NOT NULL,
  pm25_ugm3 NUMERIC(8, 2) NOT NULL,
  wind_speed_kmh NUMERIC(6, 2) NOT NULL,
  wind_direction_deg NUMERIC(6, 2) NOT NULL,
  fdrs_level VARCHAR(32) NOT NULL DEFAULT 'Tinggi',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  geom geometry(Point, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bmkg_aq_geom ON spatial.bmkg_aq_stations USING GIST (geom);

-- =============================================================================
-- 6. QGIS NATIVE LAYER STYLES TABLE (`public.layer_styles`)
-- Allows QGIS Desktop to automatically load Nusantara Watch symbology on connect
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.layer_styles (
  id SERIAL PRIMARY KEY,
  f_table_catalog VARCHAR(256),
  f_table_schema VARCHAR(256),
  f_table_name VARCHAR(256),
  f_geometry_column VARCHAR(256),
  stylename VARCHAR(256),
  styleqml XML,
  stylesld XML,
  useasdefault BOOLEAN,
  description TEXT,
  owner VARCHAR(63),
  ui XML,
  update_time TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 7. AUTOMATED POSTGIS SPATIAL ENRICHMENT TRIGGER (`ST_Intersects`)
-- When a GIS analyst digitizes or imports a hotspot point in QGIS or ArcGIS Pro,
-- this trigger automatically intersects it against `spatial.concessions_khg` to
-- populate concession holder, concession type, and province if omitted.
-- =============================================================================
CREATE OR REPLACE FUNCTION spatial.fn_enrich_hotspot_spatial()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  matched_concession RECORD;
BEGIN
  NEW.updated_at := NOW();

  SELECT
    c.holder_group,
    c.concession_type,
    c.province
  INTO matched_concession
  FROM spatial.concessions_khg c
  WHERE ST_Intersects(c.geom, NEW.geom)
  LIMIT 1;

  IF FOUND THEN
    NEW.in_concession := TRUE;
    IF NEW.concession_holder IS NULL OR NEW.concession_holder = '' THEN
      NEW.concession_holder := matched_concession.holder_group;
    END IF;
    IF NEW.concession_type IS NULL OR NEW.concession_type = 'Lahan Masyarakat' THEN
      NEW.concession_type := matched_concession.concession_type;
    END IF;
    IF NEW.province IS NULL OR NEW.province = 'Belum Terklasifikasi' THEN
      NEW.province := matched_concession.province;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enrich_hotspot_spatial ON spatial.hotspots_firms;
CREATE TRIGGER trg_enrich_hotspot_spatial
BEFORE INSERT OR UPDATE ON spatial.hotspots_firms
FOR EACH ROW
EXECUTE FUNCTION spatial.fn_enrich_hotspot_spatial();

-- =============================================================================
-- 8. REAL-TIME `LISTEN / NOTIFY` TRIGGER FOR LIVE 3D GLOBE SYNC
-- Emits a JSON event on channel `gis_changes` whenever a GIS analyst saves edits
-- in QGIS Desktop, ArcGIS Pro, or via the API.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_notify_gis_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  row_id INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_id := OLD.objectid;
  ELSE
    row_id := NEW.objectid;
  END IF;

  PERFORM pg_notify(
    'gis_changes',
    json_build_object(
      'schema', TG_TABLE_SCHEMA,
      'table', TG_TABLE_NAME,
      'op', TG_OP,
      'objectid', row_id,
      'ts', NOW()
    )::text
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_bnpb_sitrep ON bnpb.karhutla_sitrep_47col;
CREATE TRIGGER trg_notify_bnpb_sitrep
AFTER INSERT OR UPDATE OR DELETE ON bnpb.karhutla_sitrep_47col
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_gis_change();

DROP TRIGGER IF EXISTS trg_notify_hotspots ON spatial.hotspots_firms;
CREATE TRIGGER trg_notify_hotspots
AFTER INSERT OR UPDATE OR DELETE ON spatial.hotspots_firms
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_gis_change();

DROP TRIGGER IF EXISTS trg_notify_concessions ON spatial.concessions_khg;
CREATE TRIGGER trg_notify_concessions
AFTER INSERT OR UPDATE OR DELETE ON spatial.concessions_khg
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_gis_change();

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA bnpb, spatial, public TO gis_analyst, api_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA bnpb, spatial, public TO gis_analyst, api_service;
