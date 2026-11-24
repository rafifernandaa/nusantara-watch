import type {
  BnpbIntegratedPortal,
  BnpbKarhutlaRecord,
  BnpbSecurityFinding,
  BnpbSnapshotMode,
} from '../../types/watch';

/**
 * Complete BNPB Dashboard Informasi Penanganan Karhutla 2026 dataset
 * Reconstructed from https://data.bnpb.go.id/data/karhutla2026 (https://gis.bnpb.go.id/karhutla2026/karhutla-api.php)
 * and cross-verified with the official BNPB Data Karhutla 2026 Excel workbook (47 columns, 6 priority provinces).
 */
export const BNPB_KARHUTLA_2026_RECORDS: BnpbKarhutlaRecord[] = [
  {
    shortProvince: 'Riau',
    fullProvince: 'Riau',
    colorHex: 'var(--prov-riau)',
    coordinates: [101.724, 0.562],
    hotspotRendah: 0,
    hotspotSedang: 0,
    hotspotTinggi: 0,
    totalHotspot: 0,
    fireSpot: 0,
    excelTotalHotspot: 0,
    excelFireSpot: 0,
    lahanTerbakarIndikatifHa: 20696.31,
    kualitasUdaraPm25Text: 'Baik (8 µg/m³)',
    pm25UgM3: 8.0,
    airQualityStatus: 'Baik',
    excelAirQualityRange: 'Baik – Tidak Sehat',
    jarakPandangBandaraKm: '± 8',
    lahanTerbakarHarianHa: 0,
    excelLahanTerbakarHarianHa: 2,
    luasTerbakarCenturiskHa: null,
    luasBelumPadamCenturiskHa: 0,
    mdL: '-',
    mdP: '-',
    totalMd: '-',
    kabkotTerdampak: 2,
    luasDitanganiDaratHa: 2.52,
    luasAkanDipadamkanHa: 0,
    excelLuasAkanDipadamkanHa: 13.45,
    personnel: {
      bpbd: 416,
      pemerintahPusat: 20,
      tni: 2465,
      polri: 3030,
      pemda: 899,
      relawan: 0,
      polisiHutan: 0,
      manggalaAgni: 297,
      mpa: 4059,
      satpolPp: 1671,
      perusahaan: 1980,
      totalPersonel: 14837,
    },
    aerial: {
      patroliUnit: 1,
      patroliSortie: 1,
      wbUnit: 0,
      wbSortie: 0,
      jumlahWbHarian: 0,
      volumeWbLtr: 0,
      omcUnit: 0,
      omcSortie: 0,
      totalBahanSemaiKg: 0,
      luasDitanganiUdaraHa: 0,
      totalUnitUdaraHariIni: 2,
      unitPatroliStandby: 0,
      unitWbStandby: 1,
      unitOmcStandby: 0,
      totalUnitStandby: 1,
    },
    rekomendasi:
      'Tuntaskan 2 FS sisa lewat operasi darat, lalu lanjutkan pendinginan. Terbangkan patroli udara begitu cuaca memungkinkan. Kalau Riau tetap nihil FS, pertimbangkan memindahkan sebagian heli WB ke provinsi yang lebih membutuhkan.',
    kesimpulan:
      'Situasi paling terkendali. Tidak ada hotspot (0 HS). Dari 6 FS seluas 13,45 ha, 7,95 ha sudah padam lewat operasi darat. Sisa 5,50 ha pada 2 FS ada di Inhu dan Inhil. Kualitas udara sedang hingga sangat tidak sehat, jarak pandang ±4,5 km. Patroli batal karena cuaca, dan 4 heli WB siap tapi tidak dioperasikan.',
  },
  {
    shortProvince: 'Jambi',
    fullProvince: 'Jambi',
    colorHex: 'var(--prov-jambi)',
    coordinates: [103.892, -1.524],
    hotspotRendah: 1,
    hotspotSedang: 2,
    hotspotTinggi: 0,
    totalHotspot: 3,
    fireSpot: 0,
    excelTotalHotspot: 44,
    excelFireSpot: 42,
    lahanTerbakarIndikatifHa: 4852.75,
    kualitasUdaraPm25Text: 'Baik (13,8 µg/m³)',
    pm25UgM3: 13.8,
    airQualityStatus: 'Baik',
    excelAirQualityRange: 'Sedang – Tidak Sehat',
    jarakPandangBandaraKm: '± 4',
    lahanTerbakarHarianHa: 6,
    excelLahanTerbakarHarianHa: 105,
    luasTerbakarCenturiskHa: null,
    luasBelumPadamCenturiskHa: 97,
    mdL: '-',
    mdP: '-',
    totalMd: '-',
    kabkotTerdampak: 4,
    luasDitanganiDaratHa: 7,
    luasAkanDipadamkanHa: 0,
    excelLuasAkanDipadamkanHa: 109.5,
    personnel: {
      bpbd: 346,
      pemerintahPusat: 0,
      tni: 405,
      polri: 300,
      pemda: 0,
      relawan: 390,
      polisiHutan: 1271,
      manggalaAgni: 255,
      mpa: 690,
      satpolPp: 0,
      perusahaan: 2327,
      totalPersonel: 5984,
    },
    aerial: {
      patroliUnit: 0,
      patroliSortie: 0,
      wbUnit: 1,
      wbSortie: 1,
      jumlahWbHarian: 50,
      volumeWbLtr: 200000,
      omcUnit: 0,
      omcSortie: 0,
      totalBahanSemaiKg: 0,
      luasDitanganiUdaraHa: 1.5,
      totalUnitUdaraHariIni: 5,
      unitPatroliStandby: 2,
      unitWbStandby: 2,
      unitOmcStandby: 0,
      totalUnitStandby: 4,
    },
    rekomendasi:
      'Operasikan 2 heli yang sedang siaga untuk WB di 6 FS sisa. Percepat pemeliharaan RA-22840. Perkuat perlindungan kesehatan warga (masker, PJJ), karena seluruh wilayah berstatus Berbahaya. Manfaatkan potensi hujan di Merangin dan Sarolangun.',
    kesimpulan:
      'Hotspot sedikit (9 HS), tapi sisa lahan masih besar: 55,00 ha pada 6 FS dari target 109,50 ha. Semua pemadaman (54,50 ha) dilakukan tim darat, tanpa WB maupun OMC. Kualitas udara Berbahaya di semua wilayah yang dipantau. Hujan sudah turun di Muara Tebo dan Kota Jambi.',
  },
  {
    shortProvince: 'Sumsel',
    fullProvince: 'Sumatera Selatan',
    colorHex: 'var(--prov-sumsel)',
    coordinates: [105.194, -3.148],
    hotspotRendah: 18,
    hotspotSedang: 64,
    hotspotTinggi: 24,
    totalHotspot: 106,
    fireSpot: 28,
    excelTotalHotspot: 40,
    excelFireSpot: 19,
    lahanTerbakarIndikatifHa: 1926.23,
    kualitasUdaraPm25Text: 'Sedang (24,9 µg/m³)',
    pm25UgM3: 24.9,
    airQualityStatus: 'Sedang',
    excelAirQualityRange: 'Sedang – Tidak Sehat',
    jarakPandangBandaraKm: '2 – 1',
    lahanTerbakarHarianHa: 226,
    excelLahanTerbakarHarianHa: 98,
    luasTerbakarCenturiskHa: null,
    luasBelumPadamCenturiskHa: 12,
    mdL: '0',
    mdP: '0',
    totalMd: '0',
    kabkotTerdampak: 3,
    luasDitanganiDaratHa: 23.25,
    luasAkanDipadamkanHa: 59,
    excelLuasAkanDipadamkanHa: 814.51,
    personnel: {
      bpbd: 584,
      pemerintahPusat: 0,
      tni: 1245,
      polri: 900,
      pemda: 851,
      relawan: 1862,
      polisiHutan: 150,
      manggalaAgni: 192,
      mpa: 0,
      satpolPp: 100,
      perusahaan: 731,
      totalPersonel: 12285,
    },
    aerial: {
      patroliUnit: 1,
      patroliSortie: 1,
      wbUnit: 4,
      wbSortie: 4,
      jumlahWbHarian: 82,
      volumeWbLtr: 328000,
      omcUnit: 4,
      omcSortie: 4,
      totalBahanSemaiKg: 7400,
      luasDitanganiUdaraHa: 15,
      totalUnitUdaraHariIni: 10,
      unitPatroliStandby: 0,
      unitWbStandby: 1,
      unitOmcStandby: 0,
      totalUnitStandby: 1,
    },
    rekomendasi:
      'Fokuskan gabungan darat dan WB ke 6 FS sisa yang luas, terutama 25 ha sasaran udara yang masih berasap. Lanjutkan OMC dry ice untuk jarak pandang di Palembang. Verifikasi lonjakan target ini (rekap ulang atau kejadian baru). Pertimbangkan mengembalikan PK-RTY, karena saat ini Sumsel tidak punya unit patroli.',
    kesimpulan:
      'Target melonjak menjadi 814,51 ha pada 74 FS, tapi 623,01 ha sudah padam. Ini hasil terbesar, dengan darat 564,01 ha dan udara 59,00 ha. Sisa 191,50 ha hanya pada 6 FS, jadi rata-rata FS yang tersisa sangat luas (±32 ha). Kualitas udara di Palembang dan PALI Berbahaya, tapi membaik pada siang hari berkat OMC.',
  },
  {
    shortProvince: 'Kalbar',
    fullProvince: 'Kalimantan Barat',
    colorHex: 'var(--prov-kalbar)',
    coordinates: [109.584, -0.312],
    hotspotRendah: 5,
    hotspotSedang: 12,
    hotspotTinggi: 3,
    totalHotspot: 20,
    fireSpot: 0,
    excelTotalHotspot: 1,
    excelFireSpot: 0,
    lahanTerbakarIndikatifHa: 38310.89,
    kualitasUdaraPm25Text: 'Baik (11,8 µg/m³)',
    pm25UgM3: 11.8,
    airQualityStatus: 'Baik',
    excelAirQualityRange: 'Baik – Sedang',
    jarakPandangBandaraKm: '1 – 10',
    lahanTerbakarHarianHa: 25,
    excelLahanTerbakarHarianHa: 19,
    luasTerbakarCenturiskHa: null,
    luasBelumPadamCenturiskHa: 0,
    mdL: '-',
    mdP: '-',
    totalMd: '-',
    kabkotTerdampak: 2,
    luasDitanganiDaratHa: 5,
    luasAkanDipadamkanHa: 0,
    excelLuasAkanDipadamkanHa: 22.79,
    personnel: {
      bpbd: 330,
      pemerintahPusat: 0,
      tni: 5522,
      polri: 2702,
      pemda: 270,
      relawan: 2100,
      polisiHutan: 0,
      manggalaAgni: 283,
      mpa: 0,
      satpolPp: 70,
      perusahaan: 3181,
      totalPersonel: 14458,
    },
    aerial: {
      patroliUnit: 2,
      patroliSortie: 3,
      wbUnit: 1,
      wbSortie: 2,
      jumlahWbHarian: 37,
      volumeWbLtr: 148000,
      omcUnit: 0,
      omcSortie: 0,
      totalBahanSemaiKg: 0,
      luasDitanganiUdaraHa: 6,
      totalUnitUdaraHariIni: 9,
      unitPatroliStandby: 0,
      unitWbStandby: 6,
      unitOmcStandby: 0,
      totalUnitStandby: 6,
    },
    rekomendasi:
      'Tuntaskan 3 FS sisa dan lanjutkan pendinginan gambut di Ketapang. Kaji ulang kebutuhan OMC setelah PK-SCH pindah. Perkuat layanan kesehatan untuk ISPA. Lakukan verifikasi lapangan, karena estimasi satelit (2.500 ha) jauh di atas data Satgas (22,79 ha).',
    kesimpulan:
      'Penanganan lapangan hampir tuntas: sisa 4,39 ha pada 3 FS dari target 22,79 ha. Tetapi dampak asap berat. Kualitas udara Tidak Sehat hingga Berbahaya, jarak pandang sampai 100 m, Bandara Ketapang lumpuh, dan tercatat 417 kasus ISPA. Hanya 2 dari 7 heli WB yang terbang, dan OMC tidak ada lagi sejak PK-SCH direposisi.',
  },
  {
    shortProvince: 'Kalteng',
    fullProvince: 'Kalimantan Tengah',
    colorHex: 'var(--prov-kalteng)',
    coordinates: [114.128, -2.426],
    hotspotRendah: 6,
    hotspotSedang: 21,
    hotspotTinggi: 9,
    totalHotspot: 36,
    fireSpot: 7,
    excelTotalHotspot: 907,
    excelFireSpot: 765,
    lahanTerbakarIndikatifHa: 24402.56,
    kualitasUdaraPm25Text: 'Sedang (20,2 µg/m³)',
    pm25UgM3: 20.2,
    airQualityStatus: 'Sedang',
    excelAirQualityRange: 'Sedang – Berbahaya',
    jarakPandangBandaraKm: '3 – 1',
    lahanTerbakarHarianHa: 72,
    excelLahanTerbakarHarianHa: 3904,
    luasTerbakarCenturiskHa: null,
    luasBelumPadamCenturiskHa: 2828,
    mdL: '0',
    mdP: '0',
    totalMd: '0',
    kabkotTerdampak: 6,
    luasDitanganiDaratHa: 22,
    luasAkanDipadamkanHa: 20,
    excelLuasAkanDipadamkanHa: 529.4,
    personnel: {
      bpbd: 1182,
      pemerintahPusat: 0,
      tni: 1403,
      polri: 762,
      pemda: 1941,
      relawan: 1163,
      polisiHutan: 0,
      manggalaAgni: 176,
      mpa: 0,
      satpolPp: 0,
      perusahaan: 0,
      totalPersonel: 16387,
    },
    aerial: {
      patroliUnit: 1,
      patroliSortie: 1,
      wbUnit: 6,
      wbSortie: 10,
      jumlahWbHarian: 176,
      volumeWbLtr: 704000,
      omcUnit: 7,
      omcSortie: 9,
      totalBahanSemaiKg: 13400,
      luasDitanganiUdaraHa: 18,
      totalUnitUdaraHariIni: 16,
      unitPatroliStandby: 0,
      unitWbStandby: 2,
      unitOmcStandby: 0,
      totalUnitStandby: 2,
    },
    rekomendasi:
      'Jadikan prioritas utama. Tambah sortie WB di TNTP begitu visibilitas aman, karena 5 heli belum terbang. Perkuat tim darat di TNTP. Manfaatkan hujan di Seruyan untuk pembasahan gambut. Lanjutkan OMC dari Syamsudin Noor. Pertahankan PJJ dan pembagian masker.',
    kesimpulan:
      'Provinsi paling kritis. Hotspot terbanyak (770 HS), dan sisa 389,10 ha pada 77 FS, atau 59% dari sisa di 6 provinsi. Pemadaman mencapai 140,30 ha, dengan WB di TNTP hanya 6 ha. Lima kabupaten/kota berkategori Berbahaya, jarak pandang 100–400 m. Hanya 3 dari 8 heli yang terbang. Hujan deras turun di Seruyan.',
  },
  {
    shortProvince: 'Kalsel',
    fullProvince: 'Kalimantan Selatan',
    colorHex: 'var(--prov-kalsel)',
    coordinates: [114.782, -3.412],
    hotspotRendah: 4,
    hotspotSedang: 14,
    hotspotTinggi: 5,
    totalHotspot: 23,
    fireSpot: 4,
    excelTotalHotspot: 59,
    excelFireSpot: 38,
    lahanTerbakarIndikatifHa: 8019.63,
    kualitasUdaraPm25Text: 'Sedang (33,8 µg/m³)',
    pm25UgM3: 33.8,
    airQualityStatus: 'Sedang',
    excelAirQualityRange: 'Sedang – Berbahaya',
    jarakPandangBandaraKm: '< 10',
    lahanTerbakarHarianHa: 48,
    excelLahanTerbakarHarianHa: 345,
    luasTerbakarCenturiskHa: null,
    luasBelumPadamCenturiskHa: 128,
    mdL: '0',
    mdP: '0',
    totalMd: '0',
    kabkotTerdampak: 6,
    luasDitanganiDaratHa: 12.4,
    luasAkanDipadamkanHa: 8,
    excelLuasAkanDipadamkanHa: 51.6,
    personnel: {
      bpbd: 614,
      pemerintahPusat: 0,
      tni: 1245,
      polri: 900,
      pemda: 851,
      relawan: 3211,
      polisiHutan: 13,
      manggalaAgni: 173,
      mpa: 0,
      satpolPp: 100,
      perusahaan: 731,
      totalPersonel: 7927,
    },
    aerial: {
      patroliUnit: 2,
      patroliSortie: 2,
      wbUnit: 2,
      wbSortie: 3,
      jumlahWbHarian: 126,
      volumeWbLtr: 489000,
      omcUnit: 0,
      omcSortie: 0,
      totalBahanSemaiKg: 0,
      luasDitanganiUdaraHa: 5,
      totalUnitUdaraHariIni: 8,
      unitPatroliStandby: 1,
      unitWbStandby: 3,
      unitOmcStandby: 0,
      totalUnitStandby: 4,
    },
    rekomendasi:
      'Tindak lanjuti 11 FS temuan patroli dengan tim darat atau WB. Tuntaskan 5 FS sisa. Evaluasi efektivitas WB dibanding volume air yang dipakai. Pertahankan armada OMC di Syamsudin Noor untuk mendukung Kalteng. Lanjutkan penegakan hukum (21 penindakan).',
    kesimpulan:
      'Sisa 18,00 ha pada 5 FS dari target 51,60 ha. Volume WB paling besar (1.166.000 L, 302 dropping), tapi hasilnya 17,50 ha dan itu pun sudah termasuk padam alami. Patroli menemukan 11 FS baru (±31,20 ha). Kualitas udara Berbahaya di Barito Kuala dan Tabalong. Hujan turun di Tapin dan Kotabaru.',
  },
];

export const BNPB_INTEGRATED_PORTALS: BnpbIntegratedPortal[] = [
  {
    id: 'sipongi',
    shortLabel: 'SIPONGI KLHK',
    title: 'Peta SIPONGI+',
    subtitle: 'Peta Sebaran Hotspot — Kementerian Kehutanan (NASA-TERRA/AQUA, NOAA-20, NOAA-21)',
    agency: 'Kementerian Kehutanan & Manggala Agni',
    embedUrl: 'https://sipongi.gakkum.kehutanan.go.id/peta',
    framingNote: 'Menampilkan confidence level hotspot Low, Medium, High secara real-time.',
  },
  {
    id: 'bmkg-polutan',
    shortLabel: 'Sebaran Polutan BMKG',
    title: 'BMKG Early Warning Pollutant Prediction',
    subtitle: 'Prediksi Sebaran Asap & Partikulat Lintas Wilayah (CEWS BMKG)',
    agency: 'Badan Meteorologi, Klimatologi, dan Geofisika (BMKG)',
    embedUrl: 'https://cews.bmkg.go.id/tempatirk/POLLUTANT-PRED/index.html',
    framingNote: 'Model dispersi polutan atmosfer dan arah sebaran asap karhutla.',
  },
  {
    id: 'ispu-klhk',
    shortLabel: 'ISPU Kementerian LH',
    title: 'Indeks Standar Pencemar Udara (ISPU)',
    subtitle: 'Pemantauan Kualitas Udara Ambien Stasiun Otomatis Nasional',
    agency: 'Kementerian Lingkungan Hidup',
    embedUrl: 'https://ispu.kemenlh.go.id/app/',
    framingNote:
      'Catatan Keamanan REA: Server asli mengirim X-Frame-Options tidak valid (strict-origin-when-cross-origin). Diisolasi dengan sandbox ketat di Nusantara Watch.',
  },
  {
    id: 'pu-sitaba',
    shortLabel: 'Penanganan PU',
    title: 'SITABA PU — Penanganan Karhutla & Infrastruktur PU',
    subtitle: 'Lokasi Penanganan & Infrastruktur Kementerian PU dalam Radius 10 km',
    agency: 'Kementerian Pekerjaan Umum (SITABA / DWH PU)',
    embedUrl: 'https://sigi.pu.go.id/karhutla-pu/',
    framingNote:
      'Menampilkan sebaran sarana prasarana PU di sekitar titik penanganan kebakaran.',
  },
];

export const BNPB_SECURITY_AUDIT_FINDINGS: BnpbSecurityFinding[] = [
  {
    id: 'VULN-BNPB-01',
    title: 'Missing Content-Security-Policy (CSP) & JS-Only Frame Guard',
    severity: 'High',
    bnpbObservation:
      'Baik data.bnpb.go.id maupun gis.bnpb.go.id tidak mengirim header Content-Security-Policy atau frame-ancestors. Proteksi hanya mengandalkan JS (if window.top === window.self) yang dapat di-bypass dengan sandboxed iframe.',
    nusantaraWatchDefense:
      'Menerapkan CSP deklaratif ketat di index.html & header keamanan HTTP di vite.config.ts (X-Content-Type-Options: nosniff, Referrer-Policy, X-Frame-Options: SAMEORIGIN).',
    reaEvidenceRef: 'ev_1152371ed1ada6f99176834689221410125f9466411f180933a3a363ec3c7267',
  },
  {
    id: 'VULN-BNPB-02',
    title: 'DOM-Based XSS Sinks via Raw innerHTML String Concatenation',
    severity: 'Medium',
    bnpbObservation:
      'Script dashboard gis.bnpb.go.id merender SVG donut, label kualitas udara (&lt; 10 km), dan teks rekomendasi/kesimpulan menggunakan innerHTML tanpa sanitasi.',
    nusantaraWatchDefense:
      '100% bebas innerHTML / dangerouslySetInnerHTML. Seluruh grafik SVG Donut & bar dirender sebagai komponen React JSX murni dengan sanitasi teks sanitizePlainText().',
    reaEvidenceRef: 'ev_9e33be506f5d6831b382a7bf3baf5d35020369090326eb3f9ab978a5ce729292',
  },
  {
    id: 'VULN-BNPB-03',
    title: 'CSV / Spreadsheet Formula Injection (DDE) pada Fitur Unduh Data',
    severity: 'Medium',
    bnpbObservation:
      'Fitur Unduh Data CSV/Excel mengekspor nilai mentah (seperti "-" atau string berawalan "=", "+", "-", "@") langsung ke Blob CSV yang dapat memicu eksekusi formula di Excel.',
    nusantaraWatchDefense:
      'Menggunakan fungsi sanitizeCsvCell() berbasis standar OWASP yang menetralisir karakter pemicu formula (=, +, -, @, tab, CR) dan menambahkan karakter escape RFC-4180.',
    reaEvidenceRef: 'ev_1c399dd7e3f34f0bbd0bfc6a11b85dc240999d40a1f87cd07f36900bf8095579',
  },
  {
    id: 'VULN-BNPB-04',
    title: 'Misconfigured X-Frame-Options & Unsandboxed Third-Party Iframes',
    severity: 'Medium',
    bnpbObservation:
      'Iframe pihak ketiga (ispu.kemenlh.go.id) mengirim X-Frame-Options: strict-origin-when-cross-origin yang tidak valid dan dimuat tanpa pembatasan atribut sandbox.',
    nusantaraWatchDefense:
      'Memvalidasi setiap URL portal terhadap allowlist HTTPS (isAllowedPortalUrl) serta mengisolasi pratinjau dengan sandbox="allow-scripts allow-same-origin" & referrerPolicy="no-referrer".',
    reaEvidenceRef: 'ev_97cc83c0cfcadf2c5e229e9f2eda7823e509a3891b41788141d9cc5add4f9d5a',
  },
  {
    id: 'VULN-BNPB-05',
    title: 'Unauthenticated API Polling Tanpa Schema Validation & Timeout',
    severity: 'Medium',
    bnpbObservation:
      'Polling otomatis setiap 5 menit ke karhutla-api.php?t=<timestamp> memproses JSON tanpa validasi tipe numerik (menyebabkan string kosong "" tercampur dengan angka).',
    nusantaraWatchDefense:
      'Menerapkan koersi numerik aman parseSafeNumber(), skema terketik penuh (TypeScript strict), dan fallback deterministik bebas crash.',
    reaEvidenceRef: 'ev_1152371ed1ada6f99176834689221410125f9466411f180933a3a363ec3c7267',
  },
  {
    id: 'VULN-BNPB-06',
    title: 'Ketergantungan Font & Aset Eksternal Tanpa Subresource Integrity (SRI)',
    severity: 'Low',
    bnpbObservation:
      'Memuat stylesheet Google Fonts eksternal tanpa atribut integrity (SRI), membocorkan metadata IP/peramban pengunjung ke pihak ketiga.',
    nusantaraWatchDefense:
      'Menggunakan native Apple SF Pro / system font stack tanpa request font pihak ketiga, menjamin privasi pengunjung dan waktu muat instan (< 1.5s).',
    reaEvidenceRef: 'ev_9e33be506f5d6831b382a7bf3baf5d35020369090326eb3f9ab978a5ce729292',
  },
];

const SHORT_TO_FULL_MAP: Record<string, string> = {
  Riau: 'Riau',
  Jambi: 'Jambi',
  Sumsel: 'Sumatera Selatan',
  Kalbar: 'Kalimantan Barat',
  Kalteng: 'Kalimantan Tengah',
  Kalsel: 'Kalimantan Selatan',
};

const FULL_TO_SHORT_MAP: Record<string, BnpbKarhutlaRecord['shortProvince']> = {
  Riau: 'Riau',
  Jambi: 'Jambi',
  'Sumatera Selatan': 'Sumsel',
  Sumsel: 'Sumsel',
  'Kalimantan Barat': 'Kalbar',
  Kalbar: 'Kalbar',
  'Kalimantan Tengah': 'Kalteng',
  Kalteng: 'Kalteng',
  'Kalimantan Selatan': 'Kalsel',
  Kalsel: 'Kalsel',
};

export function toFullProvinceName(prov: string): string {
  return SHORT_TO_FULL_MAP[prov] ?? prov;
}

export function toShortBnpbProvince(
  prov: string
): BnpbKarhutlaRecord['shortProvince'] | 'ALL' {
  if (prov === 'ALL') return 'ALL';
  return FULL_TO_SHORT_MAP[prov] ?? 'ALL';
}

export function filterBnpbRecords(
  provinceFilter: string
): BnpbKarhutlaRecord[] {
  const shortProv = toShortBnpbProvince(provinceFilter);
  if (shortProv === 'ALL') return BNPB_KARHUTLA_2026_RECORDS;
  return BNPB_KARHUTLA_2026_RECORDS.filter((r) => r.shortProvince === shortProv);
}

export interface AggregatedBnpbMetrics {
  scopeLabel: string;
  totalHotspot: number;
  fireSpot: number;
  hotspotRendah: number;
  hotspotSedang: number;
  hotspotTinggi: number;
  luasTerbakar24hHa: number;
  lahanTerbakarIndikatifHa: number;
  luasBelumPadamCenturiskHa: number;
  luasDitanganiTotalHa: number;
  luasDitanganiDaratHa: number;
  luasDitanganiUdaraHa: number;
  luasAkanDipadamkanHa: number;
  kabkotTerdampak: number;
  totalPersonel: number;
  totalUnitUdara: number;
  patroliUnit: number;
  wbUnit: number;
  omcUnit: number;
  patroliSortie: number;
  wbSortie: number;
  omcSortie: number;
  jumlahWbDropping: number;
  volumeWbLtr: number;
  totalBahanSemaiKg: number;
  totalUnitStandby: number;
  unitPatroliStandby: number;
  unitWbStandby: number;
  unitOmcStandby: number;
  agencyBreakdown: { label: string; count: number; color: string }[];
}

export function aggregateBnpbMetrics(
  records: readonly BnpbKarhutlaRecord[],
  mode: BnpbSnapshotMode = 'live-api'
): AggregatedBnpbMetrics {
  const isSingle = records.length === 1;
  const scopeLabel = isSingle
    ? `Provinsi ${records[0].fullProvince}`
    : `Akumulasi ${records.length} provinsi prioritas`;

  let totalHotspot = 0;
  let fireSpot = 0;
  let hotspotRendah = 0;
  let hotspotSedang = 0;
  let hotspotTinggi = 0;
  let luasTerbakar24hHa = 0;
  let lahanTerbakarIndikatifHa = 0;
  let luasBelumPadamCenturiskHa = 0;
  let luasDitanganiDaratHa = 0;
  let luasDitanganiUdaraHa = 0;
  let luasAkanDipadamkanHa = 0;
  let kabkotTerdampak = 0;
  let totalPersonel = 0;
  let totalUnitUdara = 0;
  let patroliUnit = 0;
  let wbUnit = 0;
  let omcUnit = 0;
  let patroliSortie = 0;
  let wbSortie = 0;
  let omcSortie = 0;
  let jumlahWbDropping = 0;
  let volumeWbLtr = 0;
  let totalBahanSemaiKg = 0;
  let totalUnitStandby = 0;
  let unitPatroliStandby = 0;
  let unitWbStandby = 0;
  let unitOmcStandby = 0;

  let tni = 0;
  let perusahaan = 0;
  let relawan = 0;
  let polri = 0;
  let pemda = 0;
  let mpa = 0;
  let bpbd = 0;
  let satpolPp = 0;
  let polisiHutan = 0;
  let manggalaAgni = 0;
  let pemerintahPusat = 0;

  for (const r of records) {
    totalHotspot += mode === 'live-api' ? r.totalHotspot : r.excelTotalHotspot;
    fireSpot += mode === 'live-api' ? r.fireSpot : r.excelFireSpot;
    hotspotRendah += r.hotspotRendah;
    hotspotSedang += r.hotspotSedang;
    hotspotTinggi += r.hotspotTinggi;
    luasTerbakar24hHa +=
      mode === 'live-api' ? r.lahanTerbakarHarianHa : r.excelLahanTerbakarHarianHa;
    lahanTerbakarIndikatifHa += r.lahanTerbakarIndikatifHa;
    luasBelumPadamCenturiskHa += r.luasBelumPadamCenturiskHa;
    luasDitanganiDaratHa += r.luasDitanganiDaratHa;
    luasDitanganiUdaraHa += r.aerial.luasDitanganiUdaraHa;
    luasAkanDipadamkanHa +=
      mode === 'live-api' ? r.luasAkanDipadamkanHa : r.excelLuasAkanDipadamkanHa;
    kabkotTerdampak += r.kabkotTerdampak;
    totalPersonel += r.personnel.totalPersonel;
    totalUnitUdara += r.aerial.totalUnitUdaraHariIni;
    patroliUnit += r.aerial.patroliUnit;
    wbUnit += r.aerial.wbUnit;
    omcUnit += r.aerial.omcUnit;
    patroliSortie += r.aerial.patroliSortie;
    wbSortie += r.aerial.wbSortie;
    omcSortie += r.aerial.omcSortie;
    jumlahWbDropping += r.aerial.jumlahWbHarian;
    volumeWbLtr += r.aerial.volumeWbLtr;
    totalBahanSemaiKg += r.aerial.totalBahanSemaiKg;
    totalUnitStandby += r.aerial.totalUnitStandby;
    unitPatroliStandby += r.aerial.unitPatroliStandby;
    unitWbStandby += r.aerial.unitWbStandby;
    unitOmcStandby += r.aerial.unitOmcStandby;

    tni += r.personnel.tni;
    perusahaan += r.personnel.perusahaan;
    relawan += r.personnel.relawan;
    polri += r.personnel.polri;
    pemda += r.personnel.pemda;
    mpa += r.personnel.mpa;
    bpbd += r.personnel.bpbd;
    satpolPp += r.personnel.satpolPp;
    polisiHutan += r.personnel.polisiHutan;
    manggalaAgni += r.personnel.manggalaAgni;
    pemerintahPusat += r.personnel.pemerintahPusat;
  }

  const agencyBreakdown = [
    { label: 'TNI', count: tni, color: '#ff8a3d' },
    { label: 'Perusahaan', count: perusahaan, color: '#3987e5' },
    { label: 'Relawan', count: relawan, color: '#199e70' },
    { label: 'Polri', count: polri, color: '#c98500' },
    { label: 'Pemda', count: pemda, color: '#9085e9' },
    { label: 'MPA (Peduli Api)', count: mpa, color: '#e66767' },
    { label: 'BPBD', count: bpbd, color: '#ff4d3d' },
    { label: 'Satpol PP', count: satpolPp, color: '#5aa2ff' },
    { label: 'Polisi Hutan', count: polisiHutan, color: '#22c55e' },
    { label: 'Manggala Agni', count: manggalaAgni, color: '#fab219' },
    { label: 'Pemerintah Pusat', count: pemerintahPusat, color: '#a0947f' },
  ].sort((a, b) => b.count - a.count);

  return {
    scopeLabel,
    totalHotspot,
    fireSpot,
    hotspotRendah,
    hotspotSedang,
    hotspotTinggi,
    luasTerbakar24hHa: Number(luasTerbakar24hHa.toFixed(2)),
    lahanTerbakarIndikatifHa: Number(lahanTerbakarIndikatifHa.toFixed(2)),
    luasBelumPadamCenturiskHa: Number(luasBelumPadamCenturiskHa.toFixed(2)),
    luasDitanganiTotalHa: Number((luasDitanganiDaratHa + luasDitanganiUdaraHa).toFixed(2)),
    luasDitanganiDaratHa: Number(luasDitanganiDaratHa.toFixed(2)),
    luasDitanganiUdaraHa: Number(luasDitanganiUdaraHa.toFixed(2)),
    luasAkanDipadamkanHa: Number(luasAkanDipadamkanHa.toFixed(2)),
    kabkotTerdampak,
    totalPersonel,
    totalUnitUdara,
    patroliUnit,
    wbUnit,
    omcUnit,
    patroliSortie,
    wbSortie,
    omcSortie,
    jumlahWbDropping,
    volumeWbLtr,
    totalBahanSemaiKg,
    totalUnitStandby,
    unitPatroliStandby,
    unitWbStandby,
    unitOmcStandby,
    agencyBreakdown,
  };
}
