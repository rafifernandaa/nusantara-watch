# ADR-005: Unslop Technical Ink HUD & Custom Hairline Isometric Stage (`firms-matrix`)

## Status
Accepted

## Date
2026-11-16

## Context
As Nusantara Watch grew across Phases 1–3 (MapLibre + Deck.gl globe, 47-column BNPB Command Center, and PostgreSQL/PostGIS + Google Sheets live sync), the chrome accumulated visual noise and CSS workarounds:
1. Stacked gradient pills, sparkles, uppercase wide-tracked `.type-micro` labels, rainbow agency bars, and `transition-all` animations competed with the 3D Indonesian archipelago globe.
2. Clean Light Mode (`data-theme="light"`) relied on ~50 lines of `!important` override selectors in `src/styles/index.css` to invert hardcoded `text-white` and `bg-black/*` classes.
3. When no hotspot pin was selected on the globe, users needed a purposeful, data-connected standby instrument rather than a disconnected animation bench (`play tour` / `45ms` slider).

We ran a structured `/context-engineering`, `/idea-refine`, `/unslop`, and `/hairline-create` design pass to establish a calm, observational interface and wire a real-time 2:1 isometric Hairline thermal matrix to live FIRMS hotspot telemetry.

## Decision
1. **Technical Ink Neutral Ramp & Semantic Tokens (`src/styles/index.css`, `index.html`)**:
   - Adopt the **Technical Ink** ramp (`#07080d` / `#0b0d14` / `#11141c` / `#1a1e28` in dark mode; `#eceff4` / `#f5f7fa` / `#ffffff` in light mode) with `8%` hairline borders and a single **Signal Ember (`#ff5a36` dark / `#d94321` light)** accent.
   - Replace all `!important` light-mode CSS overrides with semantic custom properties (`--surface-deepest`, `--surface-card`, `--surface-raised`, `--border-hairline`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent`, `--positive`, `--negative`, `--warning`, `--info`) consumed directly by React components.
   - Enforce a strict `4px` spacing scale, nested radii (`16px` panel -> `12px` card -> `8px` control -> `4px` keycap), sentence-case labels (`400–500` weights, `.font-mono-tabular` for telemetry/Rupiah), and explicit property transitions on `cubic-bezier(0.22, 1, 0.36, 1)`.
2. **Ultra-Quiet Spatial HUD (`src/components/TopStatusBar.tsx`, `src/components/BottomDock.tsx`, `src/components/BnpbCommandDrawer.tsx`, `src/components/CivicBudgetDrawer.tsx`, `src/components/PowerUpModal.tsx`)**:
   - Reduce `TopStatusBar.tsx` to a single `6px` status dot, flat wordmark, inline monospace telemetry readout, and compact `32px` controls.
   - Replace the timeline scrubber gradient and active-filter gradients with solid `var(--accent)` / `var(--text-primary)` steps, and highlight only the leading agency in `BnpbCommandDrawer.tsx`'s personnel breakdown chart.
3. **Live Hotspot FRP Thermal Matrix — `firms-matrix` (`src/components/SortieDeckHairline.tsx`, `src/components/HotspotInspectorSheet.tsx`, `src/utils/hairline-kernel.js`)**:
   - Embed the `@lucasmarkes/hairline` kernel (`src/utils/hairline-kernel.js` + `src/utils/hairline-kernel.d.ts`) and build **`firms-matrix`** (`33` isometric solids: `1` plinth + `8 × 4` sector pillars) strictly adhering to the 10 Hairline rules (`hit`, `order`, `reach`, `accent`, `rest`, `honesty`, `cost`, `clock`, `radius`, `quiet`).
   - Map live `visibleHotspots` from West to East (longitude `95°..141° E`) and North to South (latitude `6° N..11° S`), sizing pillar height proportionally to real Fire Radiative Power (`frpMw` in MW).
   - Remove bench debug controls (`play tour`, `45ms` slider). Hovering a pillar updates the live target preview strip (`kecamatan`, `kabupaten`, `MW`, persistence, peatland depth), and clicking either the 3D isometric pillar or `Lacak` immediately calls `selectHotspot(id)` to fly the 3D Globe camera and open full inspection.
   - Add `formatShortRupiah` (`src/utils/formatters.ts`) so narrow summary tiles display `Rp 55,8 M` cleanly without truncation.

## Alternatives Considered

### Standalone Bench `sortie-deck` with Debug Controls (`play tour` + `45ms` Slider)
- **Pros**: Demonstrates Hairline tour playback directly inside the panel.
- **Cons**: Reads like a developer test widget rather than a live geospatial instrument and does not display or link to real FIRMS hotspot telemetry.
- **Decision**: Replaced in the Inspector UI with the data-driven `firms-matrix` instrument while retaining `sortie-deck.js`, `peat-table.js`, and `canal-locks.js` as standalone Hairline benches.

### Static Empty-State Card
- **Pros**: Zero SVG rendering cost.
- **Cons**: Leaves the right-hand Inspector barren when no pin is selected and misses a quick-jump overview of peak FRP hotspots.
- **Decision**: Rejected in favor of the interactive `firms-matrix` instrument.

## Consequences
- Every theme surface and text token switches cleanly between Dark and Light Technical Ink modes with zero `!important` CSS hacks.
- The Hotspot Inspector empty state acts as an interactive 3D thermal radar that responds instantaneously to province filters, the 7-day timeline scrubber, pointer hover previews, and click-to-fly camera locking.
- Verified via `src/components/SortieDeckHairline.test.tsx`, `validate.mjs`, and `look.mjs` (`firms-matrix.js`).
