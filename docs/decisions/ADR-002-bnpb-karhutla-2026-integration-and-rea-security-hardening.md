# ADR-002: BNPB Karhutla 2026 Integration & REA Security Hardening

## Status
Accepted

## Date
2026-11-11

## Context
During Phase 2 of the frontend development, we inspected the official **BNPB Dashboard Informasi Penanganan Karhutla 2026** (`https://data.bnpb.go.id/data/karhutla2026`, which embeds `https://gis.bnpb.go.id/karhutla2026/` and polls `https://gis.bnpb.go.id/karhutla2026/karhutla-api.php`) using **REA (`reverse-engineer-anything`)** and runtime browser inspection (`BROWSER_HOST_FACTS`), alongside the official 47-column BNPB Excel dataset (`Data Karhutla` sheet across the 6 priority provinces: Riau, Jambi, Sumatera Selatan, Kalimantan Barat, Kalimantan Tengah, and Kalimantan Selatan).

Our REA audit (`ev_97cc83c0cfcadf2c5e229e9f2eda7823e509a3891b41788141d9cc5add4f9d5a`, `ev_1152371ed1ada6f99176834689221410125f9466411f180933a3a363ec3c7267`) uncovered 6 architectural and security vulnerabilities in the upstream BNPB web application:
1. **`VULN-BNPB-01` (High)**: Missing `Content-Security-Policy` and `frame-ancestors` headers; relies on a client-side `if (window.top === window.self)` redirect that is trivially bypassed via `<iframe sandbox="allow-scripts">`.
2. **`VULN-BNPB-02` (Medium)**: DOM-based XSS sinks where raw API strings (`Kualitas Udara (PM 25)`, `Jarak Pandang Bandara (Km)` containing `&lt; 10`, `kesimpulan`, `rekomendasi`) are concatenated directly into `innerHTML` for SVG charts and cards.
3. **`VULN-BNPB-03` (Medium)**: CSV / Spreadsheet Formula Injection (DDE) in client-side CSV/XLSX export (`Blob` creation without neutralizing leading `=`, `+`, `-`, `@`, `\t`, `\r`).
4. **`VULN-BNPB-04` (Medium)**: Invalid `X-Frame-Options: strict-origin-when-cross-origin` header on embedded `ispu.kemenlh.go.id` and unsandboxed third-party iframes (`SIPONGI`, `BMKG`, `ISPU`, `SITABA PU`).
5. **`VULN-BNPB-05` (Medium)**: Unvalidated API polling (`karhutla-api.php`) with mixed string/number/placeholder (`"-"`, `""`) coercion.
6. **`VULN-BNPB-06` (Low)**: External font stylesheets loaded without Subresource Integrity (`integrity` / SRI).

## Decision
1. **Full 47-Column Dual-Snapshot Integration (`src/data/local_data/bnpb-karhutla-2026.ts` & `src/components/BnpbCommandDrawer.tsx`)**:
   - Integrate all 47 columns for the 6 priority provinces, supporting instant toggling between the **Live API (`karhutla-api.php`)** snapshot and the **Excel Sheet (`Data Karhutla`)** snapshot.
   - Render all 8 BNPB KPI cards, 2 interactive SVG Donut charts (*Sebaran Luas Lahan Terbakar* & *Tingkat & Sebaran Hotspot*), 11-agency personnel breakdown bars, PM2.5 & Airport Visibility cards, official province-level *Kesimpulan* & *Rekomendasi*, and the 4 integrated geospatial portals (**SIPONGI KLHK**, **Sebaran Polutan BMKG**, **ISPU KemenLH**, **SITABA Penanganan PU**).
2. **Defense-in-Depth Security Hardening (`src/utils/security.ts`, `index.html`, `vite.config.ts`)**:
   - Enforce declarative `Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
   - Eliminate all `innerHTML` / `dangerouslySetInnerHTML` usage; render charts with native React JSX `<svg>` elements and sanitize all incoming text via `sanitizePlainText()`.
   - Sanitize all exported CSV/Excel cells with `sanitizeCsvCell()` and `buildSafeKarhutlaCsv()` (UTF-8 BOM + OWASP DDE prefix neutralization).
   - Restrict embedded external portals via `isAllowedPortalUrl()` hostname allowlisting and render opt-in iframe previews with `sandbox="allow-scripts allow-same-origin"` and `referrerPolicy="no-referrer"`.

## Alternatives Considered

### Embedding `https://gis.bnpb.go.id/karhutla2026/` Directly as an Iframe
- **Pros**: Zero UI reconstruction effort.
- **Cons**: Inherits all upstream vulnerabilities (`VULN-BNPB-01`..`06`), breaks when `gis.bnpb.go.id` is slow or unreachable, cannot synchronize with our 3D MapLibre globe camera or Clean Light Mode, and prevents side-by-side comparison with the uploaded Excel snapshot.
- **Rejected**: Reconstructing the command center natively in React with typed data contracts and security utilities provides superior UX, offline resilience, and security.

## Consequences
- Users can inspect all 47 BNPB Karhutla 2026 columns, charts, and tactical notes natively inside Nusantara Watch (`B` shortcut), with automatic camera flight to any selected priority province.
- Exported CSV/Excel files are safe against spreadsheet formula injection and open cleanly in Microsoft Excel on Windows via UTF-8 BOM.
- All security controls are covered by automated unit tests in `src/utils/security.test.ts`.
