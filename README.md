# Nusantara Watch — Karhutla 2026, PostGIS & Civic Budget OSINT

Platform intelijen spasial terbuka (*open-source spatial intelligence*) untuk memantau **Kebakaran Hutan dan Lahan (Karhutla) Indonesia 2026** secara *near real-time*, mengintegrasikan **Dashboard Informasi Penanganan Karhutla BNPB 2026** (47 kolom operasional untuk 6 provinsi prioritas), **Backend PostgreSQL 16 + PostGIS 3.4 (QGIS & ArcGIS Pro Dual-Citizen Schema)**, sekaligus mengaudit **Pagu Anggaran Pengadaan SiRUP LKPP** pada wilayah terdampak.

Terinspirasi oleh arsitektur spasial [`bilawalsidhu/gods-eye-view`](https://github.com/bilawalsidhu/gods-eye-view) dan dibangun dengan prinsip fisika antarmuka [`emilkowalski/skills/apple-design`](https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md) (*WWDC Designing Fluid Interfaces*) dalam mode **Apple Dark Glass** maupun **Clean Apple Daylight Mode**.

## Quick Start

1. Instal dependensi:
   ```bash
   npm install
   ```
2. *(Opsional)* Jalankan klaster **PostgreSQL 16 + PostGIS 3.4 + Martin Vector Tile Server** (otomatis menginisialisasi skema `backend/sql/001_init_postgis.sql` & data awal `002_seed_data.sql` untuk koneksi langsung **QGIS Desktop** & **ArcGIS Pro** pada port `5432`):
   ```bash
   cp .env.example .env
   npm run dev:docker
   ```
3. Jalankan server pengembangan (termasuk gateway API `/api/*` & mode *hybrid fallback*):
   ```bash
   npm run dev
   ```

## Perintah (Commands)

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan Vite dev server (`http://localhost:5173`) beserta middleware PostGIS Gateway (`/api/*`) |
| `npm run dev:docker` | Menjalankan kontainer `postgis/postgis:16-3.4-alpine` (`:5432`) & `maplibre/martin` (`:3001`) |
| `npm run typecheck` | Memeriksa tipe statis TypeScript di `src/` dan `backend/` (`tsc --noEmit`) |
| `npm test` | Menjalankan seluruh pengujian unit Vitest |
| `npm run build` | Membangun bundel produksi (`tsc -b && vite build`) |

## Arsitektur & Fitur Utama

1. **Dual-Citizen PostgreSQL 16 + PostGIS 3.4 Backend (`backend/sql/`, `backend/postgisEngine.ts`)**:
   - Dirancang agar **QGIS Desktop** dan **ArcGIS Pro (Query Layers)** dapat membaca dan mengedit tabel spasial secara langsung melalui port `5432` menggunakan `objectid SERIAL PRIMARY KEY`, subtipe geometri eksplisit `SRID 4326` (`Point`, `MultiPolygon`, `LineString`), dan indeks GiST.
   - Dilengkapi *trigger* spasial otomatis `spatial.fn_enrich_hotspot_spatial()` (`ST_Intersects`) yang menandai titik panas baru dengan konsesi/KHG gambut yang berpotongan, serta *trigger* `public.fn_notify_gis_change()` (`LISTEN / NOTIFY`) untuk pembaruan *real-time* via SSE (`/api/events`).
   - Menyediakan *endpoint* OGC GeoJSON `FeatureCollection` langsung di `/api/geojson/bnpb-sitrep`, `/api/geojson/hotspots`, `/api/geojson/concessions`, `/api/geojson/sirup-arcs`, dan `/api/geojson/bmkg-stations`.
2. **BNPB Karhutla 2026 Command Center (`B`)**:
   - **6 Provinsi Prioritas & 47 Metrik Operasional**: Mencakup Riau, Jambi, Sumatera Selatan, Kalimantan Barat, Kalimantan Tengah, dan Kalimantan Selatan dengan mode pembandingan **Live API (`karhutla-api.php`)** vs **Excel Sheet (`Data Karhutla`)**.
   - **8 Kartu KPI Operasional & Donut SVG Interaktif**: Luas Terbakar 24 Jam, Lahan Terbakar Indikatif, Lahan Belum Padam (Centurisk), Luas Ditangani (Darat + Udara), Luas Akan Dipadamkan, Kab/Kota Terdampak, Total Personel (71.878 personel lintas 11 instansi), serta Operasi Udara (Heli Patroli, Water Bombing 1.869.000 Ltr, OMC 20.800 kg bahan semai NaCl).
   - **4 Portal Peta Terintegrasi (Sandboxed)**: SIPONGI+ KLHK, Sebaran Polutan Asap BMKG, ISPU KemenLH, dan SITABA Penanganan PU.
   - **REA Security Audit & Hardening**: Dilengkapi perlindungan terhadap *CSV/Excel Formula Injection* (DDE), *DOM XSS sanitization*, *Content-Security-Policy* ketat, dan *iframe sandboxing*.
3. **4 Layer Spasial Interaktif (MapLibre GL 3D Globe + Deck.gl)**:
   - **Titik Api FIRMS (`1`)**, **Konsesi & Gambut KHG (`2`)**, **Arc Anggaran SiRUP (`3`)**, dan **Angin & ISPU BMKG (`4`)**.
4. **Technical Ink Ultra-Quiet HUD, Apple Fluid Physics & `firms-matrix` Hairline Instrument (`T`)**:
   - Sistem desain **Technical Ink** (`#0b0d14` Gelap ↔ `#f5f7fa` Terang) dengan aksen tunggal **Signal Ember (`#ff5a36`)**, grid 4px, dan tipografi optik `tabular-nums`.
   - Fisika manipulasi langsung 1:1 (`setPointerCapture`), proyeksi momentum eksponensial (`project(v, 0.998)`), dan resistensi batas (`rubberband`).
   - Status siaga **Hotspot Inspector** menampilkan instrumen isometrik 33-solid **`firms-matrix`** (`@lucasmarkes/hairline`) yang terhubung langsung ke data titik api aktif (`frpMw` dalam MW): mengarahkan kursor menampilkan pratinjau titik api, dan mengklik pilar mengunci kamera ke lokasi tersebut.

## Dokumentasi Keputusan Arsitektur (ADRs & Spesifikasi)

- [Ideation One-Pager: Dual-Citizen PostGIS + QGIS/ArcGIS Pro Backend](docs/ideas/postgis-qgis-arcgis-backend.md)
- [ADR-001: Frontend Spatial Engine, Keyless Cold-Start, and Apple Fluid Interface Physics](docs/decisions/ADR-001-frontend-spatial-engine-and-apple-fluid-physics.md)
- [ADR-002: BNPB Karhutla 2026 Integration & REA Security Hardening](docs/decisions/ADR-002-bnpb-karhutla-2026-integration-and-rea-security-hardening.md)
- [ADR-003: Dual-Citizen PostgreSQL/PostGIS + QGIS/ArcGIS Pro + Fastify/Martin Backend](docs/decisions/ADR-003-dual-citizen-postgis-qgis-arcgis-backend.md)
- [ADR-004: Automated One-Way Google Sheets to PostgreSQL/PostGIS & Live SSE Sync](docs/decisions/ADR-004-google-sheets-to-postgis-auto-sync.md)
- [ADR-005: Unslop Technical Ink HUD & Custom Hairline Isometric Stage (`firms-matrix`)](docs/decisions/ADR-005-unslop-technical-ink-and-hairline-isometric-stage.md)
- [ADR-006: Bklit UI Composable Charts & Perceptually Uniform OKLCH Palette](docs/decisions/ADR-006-bklit-composable-charts-and-oklch-palette.md)
- [Ideation One-Pager: Bklit Composable Charts & OKLCH Palette](docs/ideas/bklit-oklch-charts.md)
- [CHANGELOG.md](CHANGELOG.md)

## Pintasan Papan Ketik (Keyboard Shortcuts)

- `1` – `4` : Aktifkan/nonaktifkan layer spasial
- `B` : Buka/tutup **BNPB Karhutla 2026 Command Center**
- `T` : Ubah tema **Clean Light Mode** ↔ **Dark Mode**
- `G` : Ubah proyeksi **3D Globe** ↔ **2D Mercator**
- `Space` : Putar / jeda lini masa satelit 7 hari
- `Esc` : Reset kamera ke tampilan kepulauan Indonesia
