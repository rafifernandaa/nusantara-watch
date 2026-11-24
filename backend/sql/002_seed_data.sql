-- =============================================================================
-- NUSANTARA WATCH — POSTGIS SEED DATA (BNPB 47-COLUMN + KHG + FIRMS + SIRUP + BMKG)
-- Automatically executed on container first start after 001_init_postgis.sql
-- =============================================================================

-- 1. Seed BNPB Karhutla 2026 47-column Sitrep for the 6 Priority Provinces
INSERT INTO bnpb.karhutla_sitrep_47col (
  snapshot_mode, short_province, full_province, color_hex,
  hotspot_rendah, hotspot_sedang, hotspot_tinggi, total_hotspot, fire_spot,
  excel_total_hotspot, excel_fire_spot, lahan_terbakar_indikatif_ha,
  kualitas_udara_pm25_text, pm25_ugm3, air_quality_status, excel_air_quality_range,
  jarak_pandang_bandara_km, lahan_terbakar_harian_ha, excel_lahan_terbakar_harian_ha,
  luas_terbakar_centurisk_ha, luas_belum_padam_centurisk_ha, md_l, md_p, total_md,
  kabkot_terdampak, luas_ditangani_darat_ha, luas_akan_dipadamkan_ha, excel_luas_akan_dipadamkan_ha,
  personil_bpbd, personil_pemerintah_pusat, personil_tni, personil_polri, personil_pemda,
  personil_relawan, personil_polisi_hutan, personil_manggala_agni, personil_mpa,
  personil_satpol_pp, personil_perusahaan, total_personel,
  patroli_unit, patroli_sortie, wb_unit, wb_sortie, jumlah_wb_harian, volume_wb_ltr,
  omc_unit, omc_sortie, total_bahan_semai_kg, luas_ditangani_udara_ha,
  total_unit_udara_hari_ini, unit_patroli_standby, unit_wb_standby, unit_omc_standby, total_unit_standby,
  rekomendasi, kesimpulan, geom
) VALUES
(
  'live-api', 'Riau', 'Riau', '#3987e5',
  0, 0, 0, 0, 0, 0, 0, 20696.31,
  'Baik (8 µg/m³)', 8.0, 'Baik', 'Baik – Tidak Sehat',
  '± 8', 0, 2, NULL, 0, '-', '-', '-',
  2, 2.52, 0, 13.45,
  416, 20, 2465, 3030, 899, 0, 0, 297, 4059, 1671, 1980, 14837,
  1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1, 0, 1,
  'Tuntaskan 2 FS sisa lewat operasi darat, lalu lanjutkan pendinginan. Terbangkan patroli udara begitu cuaca memungkinkan.',
  'Situasi paling terkendali. Tidak ada hotspot (0 HS). Dari 6 FS seluas 13,45 ha, 7,95 ha sudah padam lewat operasi darat.',
  ST_SetSRID(ST_MakePoint(101.724, 0.562), 4326)
),
(
  'live-api', 'Jambi', 'Jambi', '#199e70',
  1, 2, 0, 3, 0, 44, 42, 4852.75,
  'Baik (13,8 µg/m³)', 13.8, 'Baik', 'Sedang – Tidak Sehat',
  '± 4', 6, 105, NULL, 97, '-', '-', '-',
  4, 7, 0, 109.50,
  346, 0, 405, 300, 0, 390, 1271, 255, 690, 0, 2327, 5984,
  0, 0, 1, 1, 50, 200000, 0, 0, 0, 1.5, 5, 2, 2, 0, 4,
  'Operasikan 2 heli yang sedang siaga untuk WB di 6 FS sisa. Perkuat perlindungan kesehatan warga (masker, PJJ).',
  'Hotspot sedikit (9 HS), tapi sisa lahan masih besar: 55,00 ha pada 6 FS dari target 109,50 ha.',
  ST_SetSRID(ST_MakePoint(103.892, -1.524), 4326)
),
(
  'live-api', 'Sumsel', 'Sumatera Selatan', '#c98500',
  18, 64, 24, 106, 28, 40, 19, 1926.23,
  'Sedang (24,9 µg/m³)', 24.9, 'Sedang', 'Sedang – Tidak Sehat',
  '2 – 1', 226, 98, NULL, 12, '0', '0', '0',
  3, 23.25, 59, 814.51,
  584, 0, 1245, 900, 851, 1862, 150, 192, 0, 100, 731, 12285,
  1, 1, 4, 4, 82, 328000, 4, 4, 7400, 15, 10, 0, 1, 0, 1,
  'Fokuskan gabungan darat dan WB ke 6 FS sisa yang luas, terutama 25 ha sasaran udara yang masih berasap.',
  'Target melonjak menjadi 814,51 ha pada 74 FS, tapi 623,01 ha sudah padam (darat 564,01 ha dan udara 59,00 ha).',
  ST_SetSRID(ST_MakePoint(105.194, -3.148), 4326)
),
(
  'live-api', 'Kalbar', 'Kalimantan Barat', '#008300',
  5, 12, 3, 20, 0, 1, 0, 38310.89,
  'Baik (11,8 µg/m³)', 11.8, 'Baik', 'Baik – Sedang',
  '1 – 10', 25, 19, NULL, 0, '-', '-', '-',
  2, 5, 0, 22.79,
  330, 0, 5522, 2702, 270, 2100, 0, 283, 0, 70, 3181, 14458,
  2, 3, 1, 2, 37, 148000, 0, 0, 0, 6, 9, 0, 6, 0, 6,
  'Tuntaskan 3 FS sisa dan lanjutkan pendinginan gambut di Ketapang. Perkuat layanan kesehatan untuk ISPA.',
  'Penanganan lapangan hampir tuntas: sisa 4,39 ha pada 3 FS dari target 22,79 ha.',
  ST_SetSRID(ST_MakePoint(109.584, -0.312), 4326)
),
(
  'live-api', 'Kalteng', 'Kalimantan Tengah', '#e66767',
  6, 21, 9, 36, 7, 907, 765, 24402.56,
  'Sedang (20,2 µg/m³)', 20.2, 'Sedang', 'Sedang – Berbahaya',
  '3 – 1', 72, 3904, NULL, 2828, '0', '0', '0',
  6, 22, 20, 529.40,
  1182, 0, 1403, 762, 1941, 1163, 0, 176, 0, 0, 0, 16387,
  1, 1, 6, 10, 176, 704000, 7, 9, 13400, 18, 16, 0, 2, 0, 2,
  'Jadikan prioritas utama. Tambah sortie WB di TNTP begitu visibilitas aman, karena 5 heli belum terbang.',
  'Provinsi paling kritis. Hotspot terbanyak dan sisa 389,10 ha pada 77 FS (59% dari sisa di 6 provinsi).',
  ST_SetSRID(ST_MakePoint(114.128, -2.426), 4326)
),
(
  'live-api', 'Kalsel', 'Kalimantan Selatan', '#9085e9',
  4, 14, 5, 23, 4, 59, 38, 8019.63,
  'Sedang (33,8 µg/m³)', 33.8, 'Sedang', 'Sedang – Berbahaya',
  '< 10', 48, 345, NULL, 128, '0', '0', '0',
  6, 12.4, 8, 51.60,
  614, 0, 1245, 900, 851, 3211, 13, 173, 0, 100, 731, 7927,
  2, 2, 2, 3, 126, 489000, 0, 0, 0, 5, 8, 1, 3, 0, 4,
  'Tindak lanjuti 11 FS temuan patroli dengan tim darat atau WB. Tuntaskan 5 FS sisa.',
  'Sisa 18,00 ha pada 5 FS dari target 51,60 ha. Patroli menemukan 11 FS baru (±31,20 ha).',
  ST_SetSRID(ST_MakePoint(114.782, -3.412), 4326)
)
ON CONFLICT (short_province, snapshot_mode) DO NOTHING;

-- 2. Seed KHG Peatland & Concession MultiPolygons
INSERT INTO spatial.concessions_khg (
  concession_uid, name, holder_group, concession_type, province, area_hectares, active_hotspot_count, geom
) VALUES
(
  'KHG-RIAU-KAMPAR',
  'KHG Semenanjung Kampar & Konsesi HTI Pelalawan',
  'PT Rimba Gambut Lestari Group',
  'HTI (Pulpwood)',
  'Riau',
  142500,
  3,
  ST_GeomFromText('MULTIPOLYGON(((101.35 0.85, 102.35 0.85, 102.45 0.25, 101.40 0.18, 101.35 0.85)))', 4326)
),
(
  'HGU-SUMSEL-OKI',
  'Konsesi HGU & Gambut Dalam Pampangan - Tulung Selapan',
  'PT Agro Cipta Sriwijaya',
  'HGU (Sawit / Palm Oil)',
  'Sumatera Selatan',
  98400,
  2,
  ST_GeomFromText('MULTIPOLYGON(((104.85 -2.85, 105.65 -2.85, 105.72 -3.55, 104.90 -3.52, 104.85 -2.85)))', 4326)
),
(
  'KHG-KALTENG-PLG',
  'KHG Kahayan - Sebangau & Eks-PLG Blok C Jabiren',
  'Kawasan Gambut Prioritas Restorasi & HGU Kapuas',
  'Kesatuan Hidrologis Gambut (KHG)',
  'Kalimantan Tengah',
  215000,
  3,
  ST_GeomFromText('MULTIPOLYGON(((113.55 -1.95, 114.48 -1.95, 114.52 -2.82, 113.60 -2.85, 113.55 -1.95)))', 4326)
),
(
  'HTI-KALBAR-KUBU',
  'Konsesi HTI & HGU Gambut Rasau Jaya - Kubu Raya',
  'PT Khatulistiwa Pulp & Paper',
  'HTI (Pulpwood)',
  'Kalimantan Barat',
  86200,
  2,
  ST_GeomFromText('MULTIPOLYGON(((109.25 -0.05, 110.05 -0.05, 110.08 -0.68, 109.28 -0.65, 109.25 -0.05)))', 4326)
),
(
  'HGU-PAPUA-MERAUKE',
  'Blok Konsesi Bioenergy & Sawit Tanah Miring Merauke',
  'PT Merauke Bioenergy Estate',
  'HGU (Sawit / Palm Oil)',
  'Papua Selatan',
  118000,
  1,
  ST_GeomFromText('MULTIPOLYGON(((140.10 -7.85, 140.85 -7.85, 140.88 -8.52, 140.12 -8.52, 140.10 -7.85)))', 4326)
)
ON CONFLICT (concession_uid) DO NOTHING;

-- 3. Seed Satellite Thermal Hotspots
INSERT INTO spatial.hotspots_firms (
  hotspot_uid, satellite, frp_mw, brightness_k, confidence, persistence_hours, day_offset,
  province, kabupaten, kecamatan, is_peatland, peat_depth_meters, in_concession,
  concession_holder, concession_type, daops_name, daops_distance_km, water_bombing_ready,
  ispu_station_name, ispu_score, pm25_ugm3, ispu_category, geom
) VALUES
(
  'FIRMS-IDN-RIAU-001', 'VIIRS SNPP', 84.6, 362.4, 98, 76, 0,
  'Riau', 'Pelalawan', 'Teluk Meranti', TRUE, 5.4, TRUE,
  'PT Rimba Gambut Lestari (HTI Blok IV)', 'HTI (Pulpwood)',
  'Manggala Agni Daops Sumatera IV / Pekanbaru', 34.2, TRUE,
  'BMKG Pekanbaru - Tampan', 214, 148.5, 'Sangat Tidak Sehat',
  ST_SetSRID(ST_MakePoint(101.724, 0.562), 4326)
),
(
  'FIRMS-IDN-SUMSEL-001', 'VIIRS SNPP', 118.4, 366.9, 99, 94, 0,
  'Sumatera Selatan', 'Ogan Komering Ilir (OKI)', 'Pampangan & Tulung Selapan', TRUE, 6.2, TRUE,
  'PT Agro Cipta Sriwijaya (Konsesi HGU)', 'HGU (Sawit / Palm Oil)',
  'Manggala Agni Daops Sumatera XIV / Banyuasin', 41.5, TRUE,
  'BMKG Kenten Palembang', 238, 176.4, 'Sangat Tidak Sehat',
  ST_SetSRID(ST_MakePoint(105.194, -3.148), 4326)
),
(
  'FIRMS-IDN-KALTENG-001', 'VIIRS SNPP', 142.8, 369.5, 100, 112, 0,
  'Kalimantan Tengah', 'Pulang Pisau', 'Jabiren Raya (Eks-PLG Blok C)', TRUE, 7.4, FALSE,
  'Area Eks-PLG / KHG Kahayan-Sebangau', 'Kawasan Hutan Lindung',
  'Manggala Agni Daops Kalimantan I / Palangka Raya', 24.8, TRUE,
  'BMKG Tjilik Riwut Palangka Raya', 286, 229.0, 'Sangat Tidak Sehat',
  ST_SetSRID(ST_MakePoint(114.128, -2.426), 4326)
)
ON CONFLICT (hotspot_uid) DO NOTHING;

-- 4. Seed LKPP SiRUP Procurement Budget Arcs
INSERT INTO spatial.sirup_budget_arcs (
  sirup_id, package_name, agency, province, budget_rp, category, anomaly_level, anomaly_reason,
  province_active_hotspots, agency_geom, target_geom
) VALUES
(
  'SIRUP-2026-KLHK-88412',
  'Pengembangan Command Center & Aplikasi Portal AI Prediksi Karhutla Terintegrasi V3',
  'Kementerian LHK / Satker Pusat & Balai Wilayah',
  'Riau',
  14850000000,
  'Aplikasi & Dashboard IT',
  'Disproportionate',
  'Pagu Rp 14,85 Miliar untuk pembuatan ulang aplikasi dashboard monitoring, padahal API satelit NASA FIRMS & BMKG bersifat publik.',
  3,
  ST_SetSRID(ST_MakePoint(101.4478, 0.5071), 4326),
  ST_SetSRID(ST_MakePoint(101.724, 0.562), 4326)
),
(
  'SIRUP-2026-KALTENG-55209',
  'Pengadaan Sewa Lisensi Platform Geospasial & Konsultan Analitik Titik Panas Daerah',
  'Pemprov Kalimantan Tengah',
  'Kalimantan Tengah',
  11400000000,
  'Aplikasi & Dashboard IT',
  'Disproportionate',
  'Alokasi Rp 11,4 Miliar untuk lisensi software visualisasi peta tahunan, sementara anggaran sumur bor gambut Jabiren Raya < Rp 1,8 Miliar.',
  3,
  ST_SetSRID(ST_MakePoint(113.9213, -2.2136), 4326),
  ST_SetSRID(ST_MakePoint(114.128, -2.426), 4326)
)
ON CONFLICT (sirup_id) DO NOTHING;

-- 5. Seed BMKG Air Quality & Wind Stations
INSERT INTO spatial.bmkg_aq_stations (
  station_uid, station_name, province, ispu, pm25_ugm3, wind_speed_kmh, wind_direction_deg, fdrs_level, geom
) VALUES
('ISPU-PKU', 'BMKG Pekanbaru', 'Riau', 214, 148.5, 18, 315, 'Ekstrem', ST_SetSRID(ST_MakePoint(101.45, 0.46), 4326)),
('ISPU-PLM', 'BMKG Kenten Palembang', 'Sumatera Selatan', 238, 176.4, 22, 300, 'Ekstrem', ST_SetSRID(ST_MakePoint(104.76, -2.93), 4326)),
('ISPU-PKY', 'BMKG Tjilik Riwut Palangka Raya', 'Kalimantan Tengah', 286, 229.0, 14, 285, 'Ekstrem', ST_SetSRID(ST_MakePoint(113.94, -2.22), 4326))
ON CONFLICT (station_uid) DO NOTHING;
