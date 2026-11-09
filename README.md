# Nusantara Watch — Karhutla & Civic Budget OSINT

Platform intelijen spasial terbuka (*open-source spatial intelligence*) untuk memantau **Kebakaran Hutan dan Lahan (Karhutla) Indonesia** secara *near real-time* sekaligus mengaudit **Pagu Anggaran Pengadaan SiRUP LKPP** pada wilayah terdampak.

Terinspirasi oleh arsitektur spasial [`bilawalsidhu/gods-eye-view`](https://github.com/bilawalsidhu/gods-eye-view) dan dibangun dengan prinsip fisika antarmuka [`emilkowalski/skills/apple-design`](https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md) (*WWDC Designing Fluid Interfaces*).

## Fitur Utama

1. **Keyless Cold-Start (`< 1.5s`)**: Berjalan langsung tanpa perlu registrasi API key menggunakan bundel data geospasial Indonesia (`src/data/local_data/indonesia-osint-seed.ts`), dengan panel **Power Up** untuk menghubungkan live key `NASA_FIRMS_MAP_KEY` & `GEMINI_API_KEY`.
2. **4 Layer Spasial Interaktif (MapLibre GL 3D Globe + Deck.gl)**:
   - **Titik Api FIRMS (`1`)**: Deteksi satelit VIIRS SNPP, NOAA-20, dan MODIS Terra dengan radius proporsional terhadap *Fire Radiative Power* (MW).
   - **Konsesi & Gambut (`2`)**: Poligon *Kesatuan Hidrologis Gambut* (KHG), HTI Pulpwood, dan HGU Sawit.
   - **Arc Anggaran SiRUP (`3`)**: Menghubungkan lokasi instansi pengadaan dengan episentrum titik api aktif, diberi kode warna berdasarkan tingkat anomali anggaran (`Disproportionate`, `Elevated`, `Normal`).
   - **Angin & ISPU BMKG (`4`)**: Indeks Standar Pencemar Udara (ISPU), konsentrasi PM2.5, dan kecepatan angin.
3. **Apple Fluid Interface Physics**:
   - **Response (`pointerdown`)**: Umpan balik instan tanpa jeda *click-release*.
   - **1:1 Direct Manipulation (`setPointerCapture`)**: Panel inspeksi dan lini masa 7 hari mengikuti jari/kursor secara presisi dengan pelestarian *grab-offset*.
   - **Momentum Projection & Rubber-Banding**: Proyeksi peluruhan eksponensial (`project(v, 0.998)`) dan resistensi batas progresif (`rubberband(overshoot, dim, 0.55)`).
   - **Material Hierarchy**: Kaca translusen gelap bergaya macOS/visionOS tanpa penumpukan *glass-on-glass* dan tipografi optik `tabular-nums`.

## Pintasan Papan Ketik (Keyboard Shortcuts)

- `1` – `4` : Aktifkan/nonaktifkan layer spasial
- `G` : Ubah proyeksi **3D Globe** ↔ **2D Mercator**
- `Space` : Putar / jeda lini masa satelit 7 hari
- `Esc` : Reset kamera ke tampilan kepulauan Indonesia

## Menjalankan Secara Lokal

```bash
npm install
npm run dev
```

Untuk menjalankan pengujian unit dan pemeriksaan tipe:

```bash
npm run typecheck
npm test
npm run build
```
