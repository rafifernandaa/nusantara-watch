import type { BnpbKarhutlaRecord, BnpbSnapshotMode } from '../types/watch';

const ALLOWED_PORTAL_HOSTS = new Set([
  'sipongi.gakkum.kehutanan.go.id',
  'cews.bmkg.go.id',
  'ispu.kemenlh.go.id',
  'sigi.pu.go.id',
]);

/**
 * Safely normalizes untrusted API/spreadsheet strings for React text rendering
 * without ever invoking innerHTML or DOM HTML parsers.
 * Converts benign entity-escaped symbols (e.g. "&lt; 10" from karhutla-api.php)
 * while stripping executable HTML tags and control characters.
 */
export function sanitizePlainText(input: unknown): string {
  if (input === null || input === undefined) return '';
  const raw = String(input);
  // Strip any angle-bracket HTML tags first before decoding benign comparison entities
  const withoutTags = raw.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  const decoded = withoutTags
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'");
  // Remove non-printable ASCII control chars except tab/newline
  return decoded.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

/**
 * Coerces untrusted JSON/CSV values into finite numbers with fallback.
 */
export function parseSafeNumber(input: unknown, fallback = 0): number {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string') {
    const cleaned = input.replace(/,/g, '.').trim();
    if (!cleaned || cleaned === '-') return fallback;
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Validates that an external map/portal URL uses HTTPS and belongs to the
 * explicit government geospatial hostname allowlist.
 */
export function isAllowedPortalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ALLOWED_PORTAL_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * OWASP CSV / Spreadsheet Formula Injection sanitizer.
 * Neutralizes leading '=', '+', '-', '@', '\t', '\r' characters that could trigger
 * DDE / formula execution when opened in Microsoft Excel or LibreOffice Calc,
 * while preserving standalone '-' placeholders and negative numbers.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '0';
  }
  let text = sanitizePlainText(value);
  if (text === '-') {
    return '"-"';
  }
  const isNegativeNumeric = /^-\d+(\.\d+)?$/.test(text);
  if (!isNegativeNumeric && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

export const BNPB_EXPORT_COLUMNS = [
  'Provinsi',
  'Hotspot Rendah',
  'Hotspot Sedang',
  'Hotspot Tinggi',
  'Total Hotspot',
  'Fire Spot',
  'Lahan Terbakar Indikatif (Ha)',
  'Kualitas Udara (PM 25)',
  'Jarak Pandang Bandara (Km)',
  'Lahan Terbakar Harian (Ha)',
  'Luas lahan terbakar (centurisk)',
  'Luas lahan belum padam (centurisk)',
  'MD (L)',
  'MD (P)',
  'Total MD',
  'Kabkot Terdampak',
  'luas lahan ditangani darat',
  'luas lahan yang akan dipadamkan',
  'personil BPBD',
  'personil pemerintah pusat',
  'TNI',
  'Polri',
  'Pemda',
  'Relawan',
  'Polisi Hutan',
  'Manggala Agni',
  'MPA',
  'Satpol PP',
  'Perusahaan',
  'Total Personel',
  'Patroli unit',
  'Patroli sortie',
  'WB unit',
  'WB sortie',
  'jumlah WB harian',
  'Volume WB (Ltr)',
  'OMC unit',
  'OMC sortie',
  'total bahan semai (kg)',
  'luas lahan ditangani udara',
  'Total Unit Udara Hari Ini',
  'rekomendasi',
  'kesimpulan',
  'unit patroli standby',
  'unit WB standby',
  'unit OMC standby',
  'Total Unit Standby',
] as const;

export function buildSafeKarhutlaCsv(
  records: readonly BnpbKarhutlaRecord[],
  mode: BnpbSnapshotMode = 'live-api'
): string {
  const headerLine = BNPB_EXPORT_COLUMNS.map((col) => sanitizeCsvCell(col)).join(',');
  const rows = records.map((r) => {
    const totalHs = mode === 'live-api' ? r.totalHotspot : r.excelTotalHotspot;
    const fireSpot = mode === 'live-api' ? r.fireSpot : r.excelFireSpot;
    const burnedDaily =
      mode === 'live-api' ? r.lahanTerbakarHarianHa : r.excelLahanTerbakarHarianHa;
    const targetExtinguish =
      mode === 'live-api' ? r.luasAkanDipadamkanHa : r.excelLuasAkanDipadamkanHa;
    const airText =
      mode === 'live-api' ? r.kualitasUdaraPm25Text : r.excelAirQualityRange;

    const cells: unknown[] = [
      r.shortProvince,
      r.hotspotRendah,
      r.hotspotSedang,
      r.hotspotTinggi,
      totalHs,
      fireSpot,
      r.lahanTerbakarIndikatifHa,
      airText,
      r.jarakPandangBandaraKm,
      burnedDaily,
      r.luasTerbakarCenturiskHa ?? '',
      r.luasBelumPadamCenturiskHa,
      r.mdL,
      r.mdP,
      r.totalMd,
      r.kabkotTerdampak,
      r.luasDitanganiDaratHa,
      targetExtinguish,
      r.personnel.bpbd,
      r.personnel.pemerintahPusat,
      r.personnel.tni,
      r.personnel.polri,
      r.personnel.pemda,
      r.personnel.relawan,
      r.personnel.polisiHutan,
      r.personnel.manggalaAgni,
      r.personnel.mpa,
      r.personnel.satpolPp,
      r.personnel.perusahaan,
      r.personnel.totalPersonel,
      r.aerial.patroliUnit,
      r.aerial.patroliSortie,
      r.aerial.wbUnit,
      r.aerial.wbSortie,
      r.aerial.jumlahWbHarian,
      r.aerial.volumeWbLtr,
      r.aerial.omcUnit,
      r.aerial.omcSortie,
      r.aerial.totalBahanSemaiKg,
      r.aerial.luasDitanganiUdaraHa,
      r.aerial.totalUnitUdaraHariIni,
      r.rekomendasi,
      r.kesimpulan,
      r.aerial.unitPatroliStandby,
      r.aerial.unitWbStandby,
      r.aerial.unitOmcStandby,
      r.aerial.totalUnitStandby,
    ];
    return cells.map((c) => sanitizeCsvCell(c)).join(',');
  });

  // Add UTF-8 BOM so Microsoft Excel on Windows opens Indonesian characters & '±' cleanly
  return `\uFEFF${[headerLine, ...rows].join('\r\n')}`;
}
