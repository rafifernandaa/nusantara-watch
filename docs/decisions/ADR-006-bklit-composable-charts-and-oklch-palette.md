# ADR-006: Bklit UI Composable Charts & Perceptually Uniform OKLCH Palette

## Status
Accepted

## Date
2026-11-16

## Context
Following the Technical Ink + Ultra-Quiet HUD pass (`ADR-005`), the data visualizations inside `BnpbCommandDrawer.tsx`, `CivicBudgetDrawer.tsx`, and `HotspotInspectorSheet.tsx` still relied on two static, equal-sized SVG donut charts using raw sRGB hex values (`#3987e5`, `#008300`, `#c98500`, etc.) with uneven perceived brightness across dark (`#11141c`) and light (`#ffffff`) surfaces, and lacked interactive telemetry exploration inside the Civic Budget and Hotspot Inspector panels.

## Decision
1. **Perceptually Uniform OKLCH Color System (`src/styles/index.css`, `src/data/local_data/bnpb-karhutla-2026.ts`)**:
   - Define `--chart-1` through `--chart-6` (bound to `--prov-riau`..`--prov-kalsel`) and semantic tokens (`--accent`, `--positive`, `--warning`, `--negative`, `--info`) in **OKLCH** color space.
   - Calibrate dark mode chart hues around `L=0.72, C=0.165` (`L=0.70–0.76`) and light mode chart hues around `L=0.55, C=0.165` (`L=0.54–0.58`) so every province and status series achieves balanced perceptual weight and crisp contrast against Technical Ink surfaces.
2. **Zero-Dependency Composable Bklit Chart Primitives (`src/components/charts/BklitCharts.tsx`)**:
   - Implement Bklit UI-inspired composable React 19 + Motion 12 + SVG components without adding `@visx/*` bundle overhead:
     - `BklitRingChart`: Concentric dual-ring visualization (outer Hotspot / inner Fire Spot) with segment gaps, hover dimming (`0.28` opacity), live `<RingCenter>` readout, and click-to-filter province selection.
     - `BklitProvincialBarChart`: Grouped column chart (`Terbakar` vs. `Ditangani` hectares) on a dashed `ChartGrid` with Motion scale-in bars, vertical crosshair hover band, and live `ChartTooltip` header.
     - `BklitBudgetComparisonChart`: Mirrored dual-track comparison rows pairing SiRUP procurement budgets (colored by OKLCH anomaly severity) against provincial active hotspot counts.
     - `BklitAreaSparkChart`: Interactive 7-day FRP (`MW`) area chart with single-hue OKLCH gradient fill and pointer crosshair scrubbing for `HotspotInspectorSheet.tsx`.
     - `BklitIspuGauge`: Semicircular OKLCH gauge for BMKG ISPU (`0–300`) and `PM2.5`.

## Alternatives Considered

### Installing `@visx/*` + `shadcn` Bklit Registry Dependencies
- **Pros**: Official upstream registry primitives.
- **Cons**: Introduces multiple `@visx/*` sub-packages and `shadcn` scaffolding into a Vite + Tailwind v4 app where native SVG + Motion 12 already covers all required geometry cleanly.
- **Decision**: Built zero-dependency composable primitives matching Bklit UI's architecture and interactivity directly in `src/components/charts/BklitCharts.tsx`.

### Retaining sRGB Hex Colors for Charts
- **Pros**: No CSS variable refactoring.
- **Cons**: Uncalibrated lightness across hues (e.g., `#008300` dark green vs. `#9085e9` light violet) looks uneven in Dark vs. Light Technical Ink themes.
- **Decision**: Replaced with adaptive OKLCH tokens (`--chart-1`..`--chart-6`).

## Consequences
- All dashboard panels now share a cohesive, perceptually uniform OKLCH palette across Dark and Light modes.
- Analysts can filter provinces directly from the BNPB Ring/Bar charts, track budget anomalies visually in `CivicBudgetDrawer`, and scrub 7-day FRP trends + ISPU gauges in `HotspotInspectorSheet`.
- Covered by unit tests in `src/components/charts/BklitCharts.test.tsx`.
