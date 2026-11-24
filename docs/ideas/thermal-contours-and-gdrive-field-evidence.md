# Nusantara Watch — Concentric Thermal Yield Cartography & BNPB Field Documentation (GDrive)

## Problem Statement
How might we elevate Nusantara Watch's map canvas from basic GIS polygons and scatter dots to an editorial-grade **Concentric Thermal Yield & Hydrological Contour** visualization—while surfacing **BNPB field worker Google Drive documentation (photos, reports, and folder links)** in map hover tooltips, inspector panels, and a full-screen evidence lightbox synced from Google Sheets and PostGIS?

## Recommended Direction
1. **Concentric Multi-Ring Thermal Signatures (`src/components/GlobeViewport.tsx`)**:
   - Render each hotspot using 3 concentric translucent rings (`outer peat/spread halo`, `middle persistence ring`, `inner FRP core ring`) with ultra-fine perimeter strokes around a high-contrast pinpoint core (`#11141c` / `#ff5a36`).
   - Add **Technical Ink Callout Labels** (`#11141c` badge) for priority/selected epicenters and a **Concentric FRP Yield Scale Legend (`25 / 75 / 150 MW`)** in the bottom-left map HUD.
2. **Organic Hydrological KHG Contours (`src/data/local_data/indonesia-osint-seed.ts` & `src/components/GlobeViewport.tsx`)**:
   - Replace boxy 4-corner rectangles with smooth 16-to-20-vertex organic peat-basin contours styled with a whisper-quiet technical tint and fine perimeter strokes, plus quiet crosshair ISPU station markers.
3. **BNPB Field Documentation Tooltip & Lightbox Modal (`src/components/FieldEvidenceModal.tsx`, `src/utils/gdriveEvidence.ts`)**:
   - Attach structured `fieldDocs` (Google Drive file/folder URL, instant thumbnail preview, field team name, timestamp, coordinates, and caption) to hotspots and BNPB provincial records (including Google Sheets CSV column support for `Dokumentasi Lapangan` / `Link Drive`).
   - Show an instant **Map Hover Tooltip Card** with photo preview + telemetry when hovering a hotspot, and open a **Full-Screen Evidence Lightbox Modal** when clicking the documentation badge or card.

## Key Assumptions to Validate
- [x] Concentric rings remain legible and high-contrast on both **Clean Apple Light Mode (`light-glass`)** and **Dark Mode (`dark-glass`)**.
- [x] Callout badges only appear on priority (`frpMw >= 85`) or hovered/selected hotspots so labels never clutter.
- [x] Both Google Drive file links (`/file/d/<ID>/view`, `/open?id=<ID>`) and folder links (`/drive/folders/<ID>`) resolve safely in `gdriveEvidence.ts` while rejecting non-HTTPS or untrusted hostnames.

## MVP Scope
- Organic 16–20-vertex KHG & concession contours in `indonesia-osint-seed.ts`.
- 3-ring concentric thermal yield Deck.gl layer stack + pinpoint core + priority callouts + bottom-left `25 / 75 / 150 MW` legend + hover evidence tooltip in `GlobeViewport.tsx`.
- Google Drive parser, preview generator, and curated evidence registry in `src/utils/gdriveEvidence.ts`.
- Lightbox Evidence Modal (`src/components/FieldEvidenceModal.tsx`) wired to `HotspotInspectorSheet.tsx`, `BnpbCommandDrawer.tsx`, and `GlobeViewport.tsx`.
- Google Sheet & PostGIS schema support for `dokumentasiLapanganUrl` in `backend/googleSheetsSync.ts` & `backend/postgisEngine.ts`.

## Not Doing (and Why)
- **Not putting callout labels on every minor hotspot simultaneously** — Prevents label collisions and preserves the clean editorial hierarchy of the reference map.
- **Not requiring Google Drive OAuth API tokens to view link-shared field photos** — Uses direct link resolution and safe SVG/thumbnail previews so posko staff only need to paste standard Google Drive share links.
