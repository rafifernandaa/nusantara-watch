# ADR-003: Dual-Citizen PostgreSQL/PostGIS + QGIS/ArcGIS Pro + Fastify/Martin Backend

## Status
Accepted

## Date
2026-11-11

## Context
BNPB Pusdatin and GIS analysts use **PostgreSQL + PostGIS** alongside desktop GIS software (**ArcGIS Pro** and **QGIS Desktop**) to manage spatial layers and daily Karhutla operational sitreps. We need a backend architecture for Nusantara Watch that:
1. Allows **QGIS Desktop** and **ArcGIS Pro** to connect directly to PostgreSQL/PostGIS (`:5432`) to read, query, and edit spatial layers (`hotspots_firms`, `concessions_khg`, `sirup_budget_arcs`, `bmkg_aq_stations`) and the 47-column Karhutla operational table (`karhutla_sitrep_47col`).
2. Automatically enriches newly inserted hotspots with intersecting *Kesatuan Hidrologis Gambut* (KHG) peatland and concession attributes inside the database (`ST_Intersects`).
3. Streams real-time desktop GIS edits to the Nusantara Watch 3D globe while preserving the frontend's `< 1.5s` offline-capable cold start.

## Decision
We adopt a **Dockerized Dual-Citizen PostGIS + Martin + Fastify Architecture**:
1. **PostgreSQL 16 + PostGIS 3.4 ("Dual-Citizen" Schema in `backend/sql/001_init_postgis.sql`)**:
   - Every spatial and operational table defines `objectid SERIAL PRIMARY KEY` (a strict requirement for ArcGIS Pro Query Layers without Enterprise ArcSDE licensing, and natively supported by QGIS).
   - Geometry columns use explicit OGC geometry subtypes and SRID 4326 (`geometry(Point, 4326)`, `geometry(MultiPolygon, 4326)`) with GiST spatial indexes (`USING GIST (geom)`).
   - Operational columns use flat, standard SQL numeric/text types rather than nested `JSONB` so ArcGIS Pro and QGIS attribute tables can edit all 47 BNPB columns directly.
   - Includes a pre-populated `public.layer_styles` table so QGIS automatically applies Nusantara Watch's symbology when loading PostGIS layers.
   - Includes `spatial.fn_enrich_hotspot_spatial()` (`BEFORE INSERT OR UPDATE` trigger using `ST_Intersects`) and `public.fn_notify_gis_change()` (`AFTER INSERT OR UPDATE OR DELETE` trigger firing `pg_notify('gis_changes', ...)`).
2. **Martin Vector Tile Server (`:3001`) + Typed Fastify API Gateway (`:3000`)**:
   - **Martin** auto-publishes PostGIS tables and views as Mapbox Vector Tiles (`.pbf` / MVT) for large polygon datasets.
   - **Fastify (`backend/server.ts`)** provides typed REST & GeoJSON endpoints (`/api/health`, `/api/bootstrap`, `/api/bnpb/karhutla-2026`, `/api/bnpb/sync`, `/api/spatial/hotspots`, `/api/geojson/:layer`) and a Server-Sent Events stream (`/api/events`) backed by PostgreSQL `LISTEN gis_changes`.
3. **Hybrid Frontend Hydration (`src/services/postgisApi.ts` & `src/store/useWatchStore.ts`)**:
   - The frontend boots immediately from bundled local seeds (`LOCAL SEED` mode), probes `/api/bootstrap` on startup, switches to `POSTGIS LIVE` mode when the backend is reachable, and listens to `/api/events` so edits committed in QGIS or ArcGIS Pro immediately refresh the 3D globe and BNPB Command Drawer.

## Alternatives Considered

### Direction A: Pure PostgREST + Martin (No Custom API Gateway)
- **Pros**: Zero backend application code.
- **Cons**: Cannot easily run custom multi-step `.xlsx` / `karhutla-api.php` synchronization, custom OWASP sanitization, or a unified `/api/events` SSE bridge without additional sidecars.
- **Rejected**: A lightweight TypeScript/Fastify gateway shares types directly with `src/types/watch.ts` and handles both REST/GeoJSON and SSE cleanly.

### Direction C: PostGIS + GeoServer (Java OGC WFS-T/WMS)
- **Pros**: Traditional government SDI stack.
- **Cons**: High memory footprint (2–4 GB RAM), slow cold start, and unnecessary when QGIS and ArcGIS Pro connect directly to PostGIS on port `5432` and Martin serves vector tiles in ~15 MB RAM.
- **Rejected**: Excessive operational complexity for local and intranet deployment.

## Consequences
- GIS analysts can open QGIS or ArcGIS Pro, connect to `localhost:5432` (database `nusantara_watch`, user `gis_analyst`), edit any hotspot, KHG polygon, or 47-column sitrep row, and see the update reflected on the 3D globe in real time.
- If Docker/PostgreSQL is not running, the frontend continues to operate with zero errors using its local seed data.
