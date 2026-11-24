# Nusantara Watch — Dual-Citizen PostGIS + QGIS/ArcGIS Pro + Fastify/Martin Backend

## Problem Statement
How might we enable BNPB Pusdatin GIS analysts to read and edit spatial layers and 47-column Karhutla operational data directly in **QGIS and ArcGIS Pro** against a shared **PostgreSQL 16 + PostGIS 3.4** database—and reflect those changes live on **Nusantara Watch's** 3D MapLibre/Deck.gl globe—while preserving our `< 1.5s` offline-capable cold start and eliminating the security flaws found in `gis.bnpb.go.id`?

## Recommended Direction
We adopt **Direction B: Dockerized PostGIS-Centric Hybrid Architecture** consisting of three integrated tiers:
1. **PostgreSQL 16 + PostGIS 3.4 ("Dual-Citizen" GIS Schema)** exposed on port `5432` for local/intranet desktop GIS clients (**QGIS Desktop** and **ArcGIS Pro**). Every spatial and operational table uses `objectid SERIAL PRIMARY KEY`, explicit OGC geometry subtypes with `SRID 4326` (`geometry(Point, 4326)`, `geometry(MultiPolygon, 4326)`), and flat, strictly typed columns so both QGIS and ArcGIS Pro Query Layers can inspect, filter, and edit records without requiring proprietary Esri Enterprise Geodatabase (`sde`) licensing.
2. **Martin Vector Tile Server + Typed Fastify API Gateway** in front of PostGIS for web traffic. **Martin** (`:3001`) serves Mapbox Vector Tiles (`.pbf` / MVT) directly from PostGIS tables/views, while a lightweight **Node.js + Fastify + TypeScript** gateway (`:3000`) serves validated JSON/GeoJSON contracts matching `src/types/watch.ts`, ingests 47-column BNPB `.xlsx` / `karhutla-api.php` updates, and streams real-time database edits to the browser over **Server-Sent Events (`LISTEN / NOTIFY`)**.
3. **Hybrid Frontend Hydration (`useWatchStore.ts`)**: The React frontend boots instantaneously (`< 1.5s`) using bundled local seeds (`indonesia-osint-seed.ts` and `bnpb-karhutla-2026.ts`), then asynchronously hydrates from the Fastify/PostGIS API and subscribes to live GIS updates when the backend is online.

## Key Assumptions to Validate
- [x] **ArcGIS Pro & QGIS Direct Layer Compatibility** — Validated schema design with `objectid SERIAL PRIMARY KEY`, explicit `geometry(Point|MultiPolygon, 4326)` registered in `public.geometry_columns`, and pre-seeded `public.layer_styles` for QGIS symbology.
- [x] **Automated Spatial Enrichment via PostGIS Triggers** — Validated `BEFORE INSERT OR UPDATE` trigger (`spatial.fn_enrich_hotspot_spatial()`) using `ST_Intersects` to auto-populate `province`, `peat_hydrological_unit`, and `concession_name` when analysts add points in QGIS/ArcGIS.
- [x] **Zero-Downtime Hybrid Fallback** — Validated frontend store (`useWatchStore.ts`) and API client (`src/services/postgisApi.ts`) that gracefully fall back to local seed data when Docker is offline, surfacing a live `POSTGIS LIVE` / `LOCAL SEED` badge in `TopStatusBar.tsx`.
- [x] **End-to-End Remediation of `VULN-BNPB-01`..`06`** — Validated runtime input sanitization, parameterized SQL queries, and OWASP CSV formula neutralization across both backend and frontend.

## MVP Scope
- **`docker-compose.yml`**: `postgis/postgis:16-3.4-alpine` (`:5432`), `ghcr.io/maplibre/martin:v0.14.2` (`:3001`), and the Nusantara Watch API server (`:3000`).
- **PostGIS Initialization & Seed (`backend/sql/001_init_postgis.sql` & `002_seed_data.sql`)**:
  - Schemas: `bnpb` and `spatial`
  - Tables: `bnpb.karhutla_sitrep_47col`, `spatial.hotspots_firms`, `spatial.concessions_khg`, `spatial.sirup_budget_arcs`, `spatial.bmkg_aq_stations`, and `public.layer_styles` (default QGIS styling).
  - Views: `bnpb.v_karhutla_latest_json`, `spatial.v_hotspots_geojson`, `spatial.v_arcgis_qgis_sitrep_summary`.
  - Triggers: `spatial.fn_enrich_hotspot_spatial()` (`ST_Intersects` auto-tagging) and `public.fn_notify_gis_change()` (`pg_notify('gis_changes', ...)`).
  - Roles: `gis_analyst` (for QGIS/ArcGIS desktop editing) and `api_service` (for web API & Martin tile server).
- **Backend API Server (`backend/server.ts`)**:
  - `GET /api/health` — PostGIS connection status, version, and row counts.
  - `GET /api/bootstrap` — Full spatial + 47-column BNPB payload for hybrid frontend hydration.
  - `GET /api/bnpb/karhutla-2026` — 47-column BNPB records filtered by `mode` (`live-api` | `excel-sheet`) and `province`.
  - `POST /api/bnpb/sync` — Validated upsert of 47-column BNPB records (from `karhutla-api.php` or Pusdatin operator payload) into PostGIS.
  - `POST /api/spatial/hotspots` — Validated hotspot insertion that triggers PostGIS `ST_Intersects` enrichment.
  - `GET /api/geojson/:layer` — Direct GeoJSON `FeatureCollection` endpoints (`hotspots`, `concessions`, `bmkg`, `bnpb-sitrep`) consumable by QGIS (`Add Vector Layer -> Protocol: HTTP/GeoJSON`), ArcGIS Online/Pro, and MapLibre GL.
  - `GET /api/events` — Server-Sent Events (SSE) stream broadcasting `pg_notify('gis_changes')` to connected browsers.
- **Frontend Hybrid Hydration (`src/services/postgisApi.ts`, `src/store/useWatchStore.ts`, `src/components/TopStatusBar.tsx`, `src/components/BnpbCommandDrawer.tsx`)**:
  - Automatic hydration on startup + manual sync button + real-time SSE listener.

## Not Doing (and Why)
- **Not deploying GeoServer / MapServer (Java)** — Adds 2–4 GB RAM overhead and XML configuration complexity when QGIS/ArcGIS already connect natively to PostGIS (`:5432`) and Martin serves MVT vector tiles in ~15 MB RAM.
- **Not requiring Esri Enterprise Geodatabase (`sde`) license tables** — Standard OGC PostGIS tables with `objectid SERIAL PRIMARY KEY` and fixed SRID `4326` work out-of-the-box in both QGIS and ArcGIS Pro Query Layers without license lock-in.
- **Not removing local seed files from the frontend** — Preserving `bnpb-karhutla-2026.ts` and `indonesia-osint-seed.ts` guarantees `< 1.5s` cold start and 100% resilience when running without Docker.
