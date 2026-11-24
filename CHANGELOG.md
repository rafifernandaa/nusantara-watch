# Changelog

All notable changes to **Nusantara Watch** are documented in this file.

## [0.5.0] - 2026-11-16
### Added & Changed
- **Perceptually Uniform OKLCH Palette (`src/styles/index.css`, `src/data/local_data/bnpb-karhutla-2026.ts`)**:
  - Upgraded `--accent`, semantic status colors, and `--chart-1`..`--chart-6` (`--prov-*`) to adaptive OKLCH tokens (`L=0.72 C=0.165` dark / `L=0.55 C=0.165` light).
- **Composable Bklit UI Charts (`src/components/charts/BklitCharts.tsx`, `BnpbCommandDrawer.tsx`, `CivicBudgetDrawer.tsx`, `HotspotInspectorSheet.tsx`)**:
  - Replaced duplicate static donuts in `BnpbCommandDrawer.tsx` with a concentric interactive `BklitRingChart` (Hotspot + Fire Spot with click-to-filter) and grouped crosshair `BklitProvincialBarChart` (*Terbakar vs. Ditangani* ha).
  - Added `BklitBudgetComparisonChart` in `CivicBudgetDrawer.tsx` pairing SiRUP procurement budgets against active provincial hotspots.
  - Added interactive 7-day `BklitAreaSparkChart` (with pointer scrubbing) and `BklitIspuGauge` in `HotspotInspectorSheet.tsx`.
  - Recorded ideation & architecture in [bklit-oklch-charts.md](docs/ideas/bklit-oklch-charts.md) and [ADR-006](docs/decisions/ADR-006-bklit-composable-charts-and-oklch-palette.md).

## [0.4.0] - 2026-11-16
### Changed & Added
- **Unslop Technical Ink Design System (`src/styles/index.css`, `index.html`, `AGENTS.md`)**:
  - Migrated to the **Technical Ink** matte neutral ramp (`#0b0d14` dark / `#f5f7fa` light, `8%` hairline borders, single Signal Ember `#ff5a36` accent), strict `4px` spacing grid, nested radii (`16px` -> `12px` -> `8px` -> `4px`), and `.font-mono-tabular` numerals.
  - Eliminated uppercase tracked `.type-micro` labels, hue-to-hue gradients, `transition-all`, and all `!important` light-mode CSS overrides.
- **Ultra-Quiet Spatial HUD (`src/components/TopStatusBar.tsx`, `src/components/BottomDock.tsx`, `src/components/BnpbCommandDrawer.tsx`, `src/components/CivicBudgetDrawer.tsx`, `src/components/PowerUpModal.tsx`)**:
  - Streamlined `TopStatusBar.tsx` to a single `6px` status dot, flat wordmark, inline monospace telemetry, and compact `32px` controls.
  - Replaced gradient progress/filter fills with solid Signal Ember / primary surface steps and updated the 11-agency personnel chart to use a single lead accent.
- **Custom `@lucasmarkes/hairline` Live Hotspot FRP Thermal Matrix (`src/components/SortieDeckHairline.tsx`, `src/components/HotspotInspectorSheet.tsx`, `src/utils/hairline-kernel.js`, `src/utils/formatters.ts`)**:
  - Built and validated **`firms-matrix`** (`firms-matrix.js`, 33 isometric solids: 1 plinth + `8 × 4` sector pillars) mapped to live `visibleHotspots` Fire Radiative Power (`frpMw`) from West to East across the Indonesian archipelago.
  - Wired hover previews (district, province, MW, persistence, peatland depth) and click-to-fly camera locking (`selectHotspot`), removed debug bench controls (`play tour` / `45ms` slider), and added `formatShortRupiah` to prevent summary tile truncation (`Rp 55,8 M`).
  - Recorded architecture decision in [ADR-005](docs/decisions/ADR-005-unslop-technical-ink-and-hairline-isometric-stage.md).

## [0.3.0] - 2026-11-11
### Added
- **Dual-Citizen PostgreSQL 16 + PostGIS 3.4 Backend (`docker-compose.yml`, `backend/sql/`)**:
  - Created `bnpb.karhutla_sitrep_47col`, `spatial.hotspots_firms`, `spatial.concessions_khg`, `spatial.sirup_budget_arcs`, `spatial.bmkg_aq_stations`, and `public.layer_styles` designed for direct read/write compatibility with both **QGIS Desktop** and **ArcGIS Pro Query Layers** (`objectid SERIAL PRIMARY KEY`, explicit `SRID 4326` geometry subtypes, GiST spatial indexes).
  - Added PostGIS spatial auto-enrichment trigger (`spatial.fn_enrich_hotspot_spatial`) using `ST_Intersects` to automatically tag newly inserted hotspots with intersecting KHG peatland and concession metadata.
  - Added real-time `LISTEN / NOTIFY` change broadcasting (`public.fn_notify_gis_change`).
- **Typed Fastify + Martin Vector Tile Gateway (`backend/server.ts`, `backend/martin-config.yaml`)**:
  - Added `/api/health`, `/api/bootstrap`, `/api/bnpb/karhutla-2026`, `/api/bnpb/sync`, `/api/spatial/hotspots`, `/api/geojson/:layer` (OGC-compatible GeoJSON `FeatureCollection` for QGIS/ArcGIS/MapLibre), and `/api/events` (SSE live push).
- **Hybrid Frontend PostGIS Hydration (`src/services/postgisApi.ts`, `src/store/useWatchStore.ts`)**:
  - Preserved `< 1.5s` offline seed startup while automatically hydrating from PostGIS when online and displaying live connection status (`POSTGIS LIVE` vs `LOCAL SEED`) in `TopStatusBar.tsx` and `BnpbCommandDrawer.tsx`.
- **Architecture Decision Records (`docs/decisions/ADR-001`..`ADR-003`) & Ideation Spec (`docs/ideas/postgis-qgis-arcgis-backend.md`)**.

## [0.2.0] - 2026-11-11
### Added
- **BNPB Karhutla 2026 Command Center (`src/components/BnpbCommandDrawer.tsx`, `src/data/local_data/bnpb-karhutla-2026.ts`)**:
  - Integrated all 47 operational columns across the 6 priority provinces (Riau, Jambi, Sumatera Selatan, Kalimantan Barat, Kalimantan Tengah, Kalimantan Selatan) with dual-snapshot toggling (**Live API `karhutla-api.php`** vs **Excel Sheet `Data Karhutla`**).
  - Added 8 BNPB operational KPI cards, 2 interactive JSX SVG Donut charts, 11-agency personnel breakdown bars, PM2.5 & Airport Visibility cards, official tactical *Kesimpulan* & *Rekomendasi*, and 4 sandboxed integrated map portals (**SIPONGI KLHK**, **Sebaran Polutan BMKG**, **ISPU KemenLH**, **SITABA Penanganan PU**).
- **Clean Apple Light Mode (`src/styles/index.css`, `src/components/GlobeViewport.tsx`, `src/components/TopStatusBar.tsx`)**:
  - Added `:root[data-theme="light"]` daylight glass tokens, `light-glass` Carto Positron basemap synchronization, and keyboard shortcut `T`.
- **REA Security Hardening (`src/utils/security.ts`, `index.html`, `vite.config.ts`)**:
  - Remediated `VULN-BNPB-01` through `VULN-BNPB-06` via declarative CSP, `X-Frame-Options: SAMEORIGIN`, `sanitizePlainText`, `sanitizeCsvCell` (OWASP CSV Formula Injection prevention), and `isAllowedPortalUrl`.

## [0.1.0] - 2026-11-10
### Added
- Initial **Nusantara Watch** 3D Globe & 2D Mercator spatial OSINT platform powered by MapLibre GL v5, Deck.gl v9, React 19, and Zustand.
- 4 interactive spatial layers: **Titik Api FIRMS (`1`)**, **Konsesi & Gambut KHG (`2`)**, **Arc Anggaran SiRUP LKPP (`3`)**, and **Angin & ISPU BMKG (`4`)**.
- Apple Fluid Interface Physics (`src/utils/apple-physics.ts`) with `pointerdown` response, 1:1 `setPointerCapture` direct manipulation, exponential momentum projection, and rubberband boundary resistance.
