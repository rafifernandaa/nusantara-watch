# Nusantara Watch — Bklit Composable Charts & Perceptually Uniform OKLCH Palette

## Problem Statement
How Might We elevate Nusantara Watch's static SVG donut charts and budget lists into interactive, perceptually balanced data visualizations (**Bklit UI** composable chart patterns + **OKLCH** color space) so researchers and posko analysts immediately spot regional fire concentration, suppression gaps, and budget anomalies without adding heavy charting bundle bloat?

## Recommended Direction
Adopt **Zero-Dependency Native Bklit-Style Composable Primitives** (`src/components/charts/BklitCharts.tsx`) powered by React 19, Motion 12, and a **Perceptually Uniform High-Craft OKLCH Palette** (`L=0.72, C=0.165` dark / `L=0.55, C=0.165` light) across all three analytical drawers:
1. **BNPB Command Center (`BnpbCommandDrawer.tsx`)**: Break template symmetry by replacing two identical static donuts with one lead **`BklitRingChart`** (concentric outer Hotspot vs. inner Fire Spot rings with interactive center readout and click-to-filter province) paired with a comparative **`BklitProvincialBarChart`** (grouped *Terbakar vs. Ditangani* hectares with dashed grid and vertical crosshair tooltip).
2. **Civic Budget Watchdog (`CivicBudgetDrawer.tsx`)**: Add **`BklitBudgetComparisonChart`** pairing `Pagu Anggaran SiRUP (Rp)` bars (colored semantically by OKLCH anomaly severity) directly with provincial hotspot counts, filtered dynamically and clickable to lock the globe camera on the arc.
3. **Hotspot Inspector (`HotspotInspectorSheet.tsx`)**: Add **`BklitAreaSparkChart`** (7-day FRP trajectory with single-hue OKLCH area gradient and pointer scrubbing) and **`BklitIspuGauge`** (semicircular OKLCH air-quality gauge for BMKG ISPU & `PM2.5`).

## Key Assumptions to Validate
- [x] **Zero External Charting Bloat:** Building composable SVG + Motion primitives avoids heavy `@visx/*` or Recharts bundle growth while matching Bklit Studio ergonomics.
- [x] **Perceptual Iso-Lightness Across Themes:** Setting OKLCH `--chart-1`..`--chart-6` at `L=0.72` (dark `#11141c` surfaces) and `L=0.55` (light `#ffffff` surfaces) keeps all 6 province series equally legible without neon clipping or muddy yellows.
- [ ] **Analytical Speed:** Clicking ring segments, bar columns, or budget rows accelerates province filtering and arc tracking compared to scanning raw tables.

## MVP Scope
- OKLCH semantic & `--chart-1`..`--chart-6` tokens in `src/styles/index.css` + CSS variable bindings in `src/data/local_data/bnpb-karhutla-2026.ts`.
- `src/components/charts/BklitCharts.tsx` (`BklitRingChart`, `BklitProvincialBarChart`, `BklitBudgetComparisonChart`, `BklitAreaSparkChart`, `BklitIspuGauge`) + unit tests (`BklitCharts.test.tsx`).
- Integration into `BnpbCommandDrawer.tsx`, `CivicBudgetDrawer.tsx`, and `HotspotInspectorSheet.tsx`.

## Not Doing (and Why)
- **Not installing `@visx/*` or heavy wrapper libraries** — Native SVG + Motion 12 keeps total dependencies lean and gives 100% control over Technical Ink hairlines and OKLCH CSS variables.
- **Not adding 3+ identical pie/donut charts** — Violates Unslop hierarchy; one concentric ring paired with distinct bar, area, and gauge visualizations carries clearer analytical meaning.
- **Not using rainbow gradients inside bars** — Each bar encodes a single OKLCH semantic or provincial token so color communicates data, not decoration.

## Open Questions
- Should live NASA FIRMS multi-day historical polling populate real historical `H-6..H-1` points in `BklitAreaSparkChart` once a `NASA_FIRMS_MAP_KEY` is provided?
