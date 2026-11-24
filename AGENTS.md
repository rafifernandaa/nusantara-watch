# Project: Nusantara Watch

## Tech Stack
- React 19, TypeScript 5.7, Vite 6, Tailwind CSS 4
- MapLibre GL 5, Deck.gl 9, Zustand 5, Motion 12, Lucide React
- PostgreSQL 16 + PostGIS 3.4 + Martin Vector Tile Server

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Type check: `npm run typecheck`
- Test: `npm test`
- Docker PostGIS: `npm run dev:docker`

## Design Direction (Unslop + Idea-Refine)
- **Product:** Real-time Indonesian wildfire (Karhutla BNPB 2026) and civic procurement budget (SiRUP LKPP) spatial intelligence platform for researchers, journalists, and posko analysts.
- **Character:** calm, exact, observational
- **World:** Night-shift satellite ground station and hydrological survey desk — **Technical Ink** neutral ramp with a single **Signal Ember (`#ff5a36`)** accent.
- **Moments:**
  1. The 3D Indonesian archipelago globe with thermal fire columns and SiRUP budget arcs.
  2. The interactive `@lucasmarkes/hairline` **`firms-matrix`** 33-solid thermal FRP matrix (`src/components/SortieDeckHairline.tsx`) in the Hotspot Inspector empty state, wired to live `visibleHotspots` and click-to-fly camera locking (see [ADR-005](docs/decisions/ADR-005-unslop-technical-ink-and-hairline-isometric-stage.md)).
- **Signature:** Live monospace coordinate and telemetry readout (`tabular-nums`) paired with a single `6px` status dot.

### Palette Tokens (Technical Ink Ramp + Adaptive OKLCH Charts)
| Role | Dark | Light |
| --- | --- | --- |
| Deepest surface | `#07080d` | `#eceff4` |
| Page background | `#0b0d14` | `#f5f7fa` |
| Panel / Card | `#11141c` | `#ffffff` |
| Raised row / input | `#1a1e28` | `#eceff4` |
| Hairline border | `rgba(238, 240, 245, 0.08)` | `rgba(17, 24, 39, 0.08)` |
| Primary text | `#eef0f5` | `#111827` |
| Secondary text | `#a3a9b8` | `#4b5565` |
| Muted text / icons | `#7a8296` | `#6b7487` |
| Signal Ember accent | `oklch(0.68 0.195 34)` | `oklch(0.56 0.195 34)` |
| Positive / Negative | `oklch(0.74 0.165 156)` / `oklch(0.66 0.195 22)` | `oklch(0.54 0.165 156)` / `oklch(0.55 0.195 22)` |
| Chart series (`--chart-1`..`--chart-6`) | `L=0.70–0.76, C=0.165–0.185` | `L=0.54–0.58, C=0.165–0.185` |

- **Charts:** Use zero-dependency composable Bklit-style primitives in `src/components/charts/BklitCharts.tsx` (`BklitRingChart`, `BklitProvincialBarChart`, `BklitBudgetComparisonChart`, `BklitAreaSparkChart`, `BklitIspuGauge`, see [ADR-006](docs/decisions/ADR-006-bklit-composable-charts-and-oklch-palette.md)).

## UI & Code Conventions
- **4px Grid:** All margins, paddings, gaps, and control heights use multiples of `4px` (`32px` compact, `36px` default, `40–44px` touch).
- **Sentence Case & Quiet Type:** No uppercase wide-tracked `.type-micro` labels, no italic emphasis, no negative tracking on small text (`< 16px`). Weights stay in `400–500` (`600` max for rare emphasis). Always use `tabular-nums` for telemetry and Rupiah values.
- **Nested Radius:** `16px` panel -> `12px` card -> `8px` control/input -> `4px` keycap/tag.
- **No Slop Effects:** No hue-to-hue gradients, no gradient text, no colored glows or shadows, no `!important` light-mode CSS overrides, no `transition-all`, no `animate-pulse` on static items.
- **Motion:** Single easing curve `cubic-bezier(0.22, 1, 0.36, 1)`; transition only `color`, `background-color`, `border-color`, `opacity`, and `transform`.
- **Ultra-Quiet Spatial HUD:** Strip top bar and bottom dock to bare essentials so the 3D Globe and the Inspector's Hairline plate carry visual weight.

## Hairline Isometric Guardrails (`@lucasmarkes/hairline`)
- Strictly obey the 10 Hairline rules (`hit`, `order`, `reach`, `accent`, `rest`, `honesty`, `cost`, `clock`, `radius`, `quiet`).
- Never set explicit colors, fills, strokes, filters, shadows, timers, `requestAnimationFrame`, `getBoundingClientRect`, or text elements inside figure code; use only `HL` primitives and classes (`sil`, `hi`, `lo`, `nf`, `fo`, `dash`, `dot`, `dot m`, `dot off`).
- Keep every figure self-contained and `<= 200` lines, ending with `hairline({ name, means, rules, range, tour, mount })`.
- Validate every figure with `validate.mjs` and visually inspect via `look.mjs` across all 8 shots.

## Boundaries
- Never commit `.env` files, API keys, or secrets.
- Always preserve security hardening (Formula Injection CSV protection, plain-text sanitization, CSP, sandboxed portals).
- Run `npm run typecheck`, `npm test`, and `npm run build` after modifying `src/`.
