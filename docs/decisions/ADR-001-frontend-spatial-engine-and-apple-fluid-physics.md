# ADR-001: Frontend Spatial Engine, Keyless Cold-Start, and Apple Fluid Interface Physics

## Status
Accepted

## Date
2026-11-10

## Context
Nusantara Watch is an open-source spatial intelligence (OSINT) dashboard designed to monitor Indonesian forest and peatland fires (*Kebakaran Hutan dan Lahan* / Karhutla) alongside civic procurement budget allocations (*Pagu Anggaran SiRUP LKPP*). We needed a frontend architecture that:
1. Renders multi-layered geospatial intelligence (satellite thermal hotspots, peatland hydrological polygons, origin-to-hotspot procurement budget arcs, and BMKG air quality stations) smoothly at 60 FPS in both **3D Globe** and **2D Mercator** projections.
2. Boots in `< 1.5s` with **zero mandatory API keys** so analysts, evaluators, and citizens can inspect real data immediately, while still supporting optional live API keys (`NASA_FIRMS_MAP_KEY`, `GEMINI_API_KEY`).
3. Feels tactile and responsive under heavy spatial manipulation, supporting both **Dark Mode** (for low-light command centers) and **Clean Daylight Mode** (for bright office environments and printed reports).

## Decision
1. **MapLibre GL v5 + Deck.gl v9 (`MapboxOverlay`)**: Use MapLibre GL for the base vector globe/mercator canvas and interleave Deck.gl GPU layers (`ScatterplotLayer`, `GeoJsonLayer`, `ArcLayer`, `ColumnLayer`, `TextLayer`) for high-density spatial rendering.
2. **Keyless Cold-Start Seed + Zustand Store (`useWatchStore.ts`)**: Bundle curated Indonesian spatial OSINT seed data (`src/data/local_data/indonesia-osint-seed.ts`) directly into the client for instant cold start, managed via a single deterministic Zustand store with URL query parameter synchronization (`?lat=..&lng=..&z=..&th=..`).
3. **Apple Fluid Interface Physics (`src/utils/apple-physics.ts`) & Adaptive Glass Hierarchy (`src/styles/index.css`)**:
   - Trigger interactive feedback on `pointerdown` rather than waiting for click-release.
   - Use `setPointerCapture` for 1:1 direct manipulation on floating drawers (`InspectorDrawer.tsx`, `BnpbCommandDrawer.tsx`) and the 7-day timeline scrubber (`BottomDock.tsx`), paired with exponential momentum decay (`project(velocity, 0.998)`) and boundary resistance (`rubberband(overshoot, dimension, 0.55)`).
   - Provide both **Apple Dark Glass** (`data-theme="dark"`) and **Clean Apple Daylight** (`data-theme="light"`), syncing the MapLibre basemap (`dark-glass` Dark Matter ↔ `light-glass` Positron) and strictly avoiding glass-on-glass stacking (translucent outer shells use solid-contrast interior cards).

## Alternatives Considered

### CesiumJS for 3D Globe
- **Pros**: Native 3D terrain and orbital mechanics.
- **Cons**: Heavy bundle footprint (> 5 MB), requires Cesium Ion token for default assets, and less ergonomic 2D Mercator switching compared to MapLibre GL v5's native `globe` ↔ `mercator` projection toggle.
- **Rejected**: MapLibre GL v5 + Deck.gl v9 delivers lighter bundles, zero-token vector tiles, and seamless 3D/2D switching.

### Leaflet / React-Leaflet
- **Pros**: Simple 2D DOM marker API.
- **Cons**: No WebGL 3D globe projection, poor performance with thousands of animated arcs and polygons.
- **Rejected**: Insufficient for 3D spatial intelligence and GPU-accelerated Deck.gl layers.

## Consequences
- Instant `< 1.5s` cold start without API keys or external database dependencies required at boot.
- Consistent 60 FPS interaction across 3D Globe and 2D Mercator views.
- Seamless theme switching (`T` shortcut or TopStatusBar toggle) that adapts CSS tokens, Deck.gl label strokes, and MapLibre basemap tiles simultaneously.
