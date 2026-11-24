# Nusantara Watch — Karhutla & Civic Budget OSINT

## Problem Statement
How Might We combine satellite fire detections, land-concession boundaries, and public government procurement data into a fluid, zero-setup spatial interface so citizens, journalists, and researchers can instantly compare **where Indonesia is burning** against **where billions of Rupiah in Karhutla budgets are actually being spent**?

## Recommended Direction
**Nusantara Watch** is a keyless-first, open-source spatial intelligence web platform inspired by `bilawalsidhu/gods-eye-view`, engineered with the physical motion of *Designing Fluid Interfaces* (`src/utils/apple-physics.ts`) and refined via Unslop (`ADR-005`) into an **Ultra-Quiet Spatial HUD** using the **Technical Ink** neutral ramp (`#0b0d14` dark / `#f5f7fa` light) and a single **Signal Ember (`#ff5a36`)** accent.

Instead of military cockpit gimmicks or noisy chrome, it presents matte instrument surfaces over an interactive 3D/2.5D MapLibre GL + Deck.gl globe of the Indonesian archipelago, paired with an interactive **`03 sortie-deck`** (`@lucasmarkes/hairline`) 2:1 isometric standby stage inside the Hotspot Inspector empty state. It correlates four public datasets in real time:
1. **NASA FIRMS (VIIRS & MODIS) Active Fires** — sized by Fire Radiative Power (MW) and colored by persistence.
2. **Peatland (KHG) & Corporate Concessions (HGU/HTI)** — revealing whether fires burn on public land or inside palm oil/pulpwood concessions.
3. **SiRUP LKPP / LPSE Karhutla Procurement Budgets** — exposing provincial and agency spending (`Rp`) on fire prevention, drones, apps, and canal blocking alongside actual fire incidence.
4. **BMKG Wind Vectors & ISPU Air Quality** — tracking smoke drift and public health impact.

## Key Assumptions to Validate
- [x] **Zero-Key Cold Start:** Users and evaluators need the globe and all 4 layers to work immediately (`< 1.5s` cold start) using bundled real Indonesian GeoJSON snapshots before optionally adding live API keys in a "Power Up" sheet.
- [ ] **Timeline Over Static Pins:** Since satellites pass every 3–6 hours, a 1:1 draggable 7-day timeline scrubber communicates fire spread and persistence better than a static map.
- [ ] **Budget-to-Hotspot Ratio Clarity:** Ranking provinces and procurement packages by `Pagu Anggaran (Rp)` vs. `Persistent Hotspots` surfaces actionable civic insights without false accusations.

## MVP Scope (Frontend-First Incremental Plan)
- **Increment 1:** App Shell, Apple Design System Tokens, Spring Physics Utilities (`project`, `rubberband`), Floating Dark Glass Chrome, & Keyless 3D/2.5D Indonesian Globe (MapLibre GL + Satellite/Dark/Terrain switch).
- **Increment 2:** Bundled Indonesian Spatial Datasets (Hotspots, Peatland/Concessions, BMKG ISPU, SiRUP LKPP Budgets) & 60fps Deck.gl Layers.
- **Increment 3:** Click-to-Track Camera Lock & Physics-Driven 1:1 Draggable Inspector Sheet + 50 km Proximity Roster.
- **Increment 4:** "Anggaran vs. Realita" Civic Watchdog Drawer & 1:1 Draggable 7-Day Timeline Scrubber.
- **Increment 5:** "Power Up" Live API Key Manager, Shareable URL State Serialization, Keyboard Shortcuts, & Reduced-Motion Accessibility Audit.

## Not Doing (and Why)
- **Military Cockpit Shaders (CRT / NVG / Radar Reticles):** Hurts civic journalism credibility and violates Apple Design restraint.
- **Mandatory Login or API Key Gate:** Kills public OSINT accessibility; keys are strictly optional upgrades.
- **Fixed-Duration CSS Keyframes on Gesture Surfaces:** Cannot be interrupted or reversed mid-flight; all interactive sheets use velocity-aware springs.
- **Nested Translucent Glass Surfaces:** Stacking `backdrop-filter` on `backdrop-filter` ruins legibility and GPU frame pacing.
