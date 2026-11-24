import type {
  BnpbAerialOperations,
  BnpbKarhutlaRecord,
  BnpbPersonnelBreakdown,
} from '../src/types/watch';
import {
  BNPB_EXPORT_COLUMNS,
  parseSafeNumber,
  sanitizePlainText,
} from '../src/utils/security';

export type BnpbSheetRowPatch = Omit<
  Partial<BnpbKarhutlaRecord>,
  'shortProvince' | 'personnel' | 'aerial'
> & {
  shortProvince: string;
  personnel?: Partial<BnpbPersonnelBreakdown>;
  aerial?: Partial<BnpbAerialOperations>;
};

const SHEET_ID_PATTERN = /^[a-zA-Z0-9_-]{15,80}$/;

/**
 * Extracts a Google Spreadsheet ID from either a full docs.google.com URL
 * or a raw spreadsheet ID string. Returns null if invalid.
 */
export function extractGoogleSheetId(input: string): string | null {
  const trimmed = sanitizePlainText(input);
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]{15,80})/);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  if (SHEET_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Builds the zero-auth Google Visualization CSV export URL for a link-shared spreadsheet.
 */
export function buildGoogleSheetCsvUrl(
  sheetId: string,
  sheetName = 'Data Karhutla'
): string {
  const safeId = encodeURIComponent(sheetId);
  const safeSheet = encodeURIComponent(sheetName.trim() || 'Data Karhutla');
  return `https://docs.google.com/spreadsheets/d/${safeId}/gviz/tq?tqx=out:csv&sheet=${safeSheet}`;
}

/**
 * Computes a deterministic 32-bit FNV-1a hex digest for fast change detection
 * between polling cycles without external crypto overhead.
 */
export function computeContentHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * RFC-4180 compliant CSV parser handling UTF-8 BOM, quoted fields,
 * escaped double quotes (""), embedded newlines inside quotes, and CRLF/LF.
 */
export function parseCsvRows(csvText: string): string[][] {
  if (!csvText) return [];
  const cleanText = csvText.startsWith('\uFEFF') ? csvText.slice(1) : csvText;

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const ch = cleanText[i];

    if (inQuotes) {
      if (ch === '"') {
        if (cleanText[i + 1] === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField);
      currentField = '';
    } else if (ch === '\r') {
      if (cleanText[i + 1] === '\n') {
        i += 1;
      }
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else if (ch === '\n') {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

function normalizeHeaderKey(header: string): string {
  return sanitizePlainText(header)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HEADER_ALIASES: Record<string, string> = {
  provinsi: 'provinsi',
  province: 'provinsi',
  'short province': 'provinsi',
  'hotspot rendah': 'hotspotRendah',
  'hotspot sedang': 'hotspotSedang',
  'hotspot tinggi': 'hotspotTinggi',
  'total hotspot': 'totalHotspot',
  'fire spot': 'fireSpot',
  firespot: 'fireSpot',
  'lahan terbakar indikatif (ha)': 'lahanTerbakarIndikatifHa',
  'kualitas udara (pm 25)': 'kualitasUdaraPm25Text',
  'kualitas udara (pm25)': 'kualitasUdaraPm25Text',
  'jarak pandang bandara (km)': 'jarakPandangBandaraKm',
  'lahan terbakar harian (ha)': 'lahanTerbakarHarianHa',
  'luas lahan terbakar (centurisk)': 'luasTerbakarCenturiskHa',
  'luas lahan belum padam (centurisk)': 'luasBelumPadamCenturiskHa',
  'md (l)': 'mdL',
  'md (p)': 'mdP',
  'total md': 'totalMd',
  'kabkot terdampak': 'kabkotTerdampak',
  'luas lahan ditangani darat': 'luasDitanganiDaratHa',
  'luas lahan yang akan dipadamkan': 'luasAkanDipadamkanHa',
  'personil bpbd': 'personnel.bpbd',
  'personil pemerintah pusat': 'personnel.pemerintahPusat',
  tni: 'personnel.tni',
  polri: 'personnel.polri',
  pemda: 'personnel.pemda',
  relawan: 'personnel.relawan',
  'polisi hutan': 'personnel.polisiHutan',
  'manggala agni': 'personnel.manggalaAgni',
  mpa: 'personnel.mpa',
  'satpol pp': 'personnel.satpolPp',
  perusahaan: 'personnel.perusahaan',
  'total personel': 'personnel.totalPersonel',
  'patroli unit': 'aerial.patroliUnit',
  'patroli sortie': 'aerial.patroliSortie',
  'wb unit': 'aerial.wbUnit',
  'wb sortie': 'aerial.wbSortie',
  'jumlah wb harian': 'aerial.jumlahWbHarian',
  'volume wb (ltr)': 'aerial.volumeWbLtr',
  'omc unit': 'aerial.omcUnit',
  'omc sortie': 'aerial.omcSortie',
  'total bahan semai (kg)': 'aerial.totalBahanSemaiKg',
  'luas lahan ditangani udara': 'aerial.luasDitanganiUdaraHa',
  'total unit udara hari ini': 'aerial.totalUnitUdaraHariIni',
  rekomendasi: 'rekomendasi',
  kesimpulan: 'kesimpulan',
  'unit patroli standby': 'aerial.unitPatroliStandby',
  'unit wb standby': 'aerial.unitWbStandby',
  'unit omc standby': 'aerial.unitOmcStandby',
  'total unit standby': 'aerial.totalUnitStandby',
  'dokumentasi lapangan': 'dokumentasiLapanganUrl',
  'link drive': 'dokumentasiLapanganUrl',
  dokumentasi: 'dokumentasiLapanganUrl',
  'drive url': 'dokumentasiLapanganUrl',
};

const POSITIONAL_KEYS: string[] = BNPB_EXPORT_COLUMNS.map((col) => {
  const key = normalizeHeaderKey(col);
  return HEADER_ALIASES[key] ?? key;
});

function detectHeaderColumnMap(firstRow: string[]): Map<number, string> | null {
  const map = new Map<number, string>();
  let recognizedCount = 0;

  for (let i = 0; i < firstRow.length; i += 1) {
    const normalized = normalizeHeaderKey(firstRow[i]);
    const canonical = HEADER_ALIASES[normalized];
    if (canonical) {
      map.set(i, canonical);
      recognizedCount += 1;
    }
  }

  // Must at least include a province column plus 1 metric column to treat row 0 as headers
  const hasProvince = Array.from(map.values()).includes('provinsi');
  if (hasProvince && recognizedCount >= 2) {
    return map;
  }
  return null;
}

function unquoteSafetyPrefix(text: string): string {
  // Reverses single-quote prefix if a sanitized CSV export is re-imported
  if (text.startsWith("'") && /^'[=+\-@]/.test(text)) {
    return text.slice(1);
  }
  return text;
}

/**
 * Maps parsed CSV rows from Google Sheets (`Data Karhutla` 47-column schema or partial
 * header-based sheets) into sanitized `BnpbSheetRowPatch` updates ready for PostGIS upsert.
 */
export function mapSheetRowsToBnpbPartials(rows: string[][]): BnpbSheetRowPatch[] {
  if (rows.length === 0) return [];

  const headerMap = detectHeaderColumnMap(rows[0]);
  const dataRows = headerMap ? rows.slice(1) : rows;
  const colMap =
    headerMap ??
    new Map<number, string>(POSITIONAL_KEYS.map((key, idx) => [idx, key]));

  const results: BnpbSheetRowPatch[] = [];

  for (const row of dataRows) {
    const rawEntries = new Map<string, string>();
    for (const [colIdx, canonical] of colMap.entries()) {
      if (colIdx < row.length) {
        const cleaned = sanitizePlainText(unquoteSafetyPrefix(row[colIdx] ?? ''));
        if (cleaned !== '') {
          rawEntries.set(canonical, cleaned);
        }
      }
    }

    const provinceValue = rawEntries.get('provinsi');
    if (!provinceValue || provinceValue.toLowerCase() === 'total') {
      continue;
    }

    const patch: BnpbSheetRowPatch = {
      shortProvince: provinceValue,
    };
    const personnel: Partial<BnpbPersonnelBreakdown> = {};
    const aerial: Partial<BnpbAerialOperations> = {};

    const num = (key: string): number | undefined => {
      const val = rawEntries.get(key);
      if (val === undefined || val === '-') return undefined;
      return parseSafeNumber(val, 0);
    };

    const assignNum = <K extends keyof BnpbSheetRowPatch>(
      key: K,
      fieldName: string
    ) => {
      const val = num(fieldName);
      if (val !== undefined) {
        (patch as Record<string, unknown>)[key as string] = val;
      }
    };

    assignNum('hotspotRendah', 'hotspotRendah');
    assignNum('hotspotSedang', 'hotspotSedang');
    assignNum('hotspotTinggi', 'hotspotTinggi');
    assignNum('totalHotspot', 'totalHotspot');
    assignNum('fireSpot', 'fireSpot');
    assignNum('lahanTerbakarIndikatifHa', 'lahanTerbakarIndikatifHa');
    assignNum('lahanTerbakarHarianHa', 'lahanTerbakarHarianHa');
    assignNum('luasTerbakarCenturiskHa', 'luasTerbakarCenturiskHa');
    assignNum('luasBelumPadamCenturiskHa', 'luasBelumPadamCenturiskHa');
    assignNum('kabkotTerdampak', 'kabkotTerdampak');
    assignNum('luasDitanganiDaratHa', 'luasDitanganiDaratHa');
    assignNum('luasAkanDipadamkanHa', 'luasAkanDipadamkanHa');

    const textKeys: Array<keyof BnpbSheetRowPatch> = [
      'kualitasUdaraPm25Text',
      'jarakPandangBandaraKm',
      'mdL',
      'mdP',
      'totalMd',
      'rekomendasi',
      'kesimpulan',
      'dokumentasiLapanganUrl',
    ];
    for (const k of textKeys) {
      const raw = rawEntries.get(k);
      if (raw !== undefined) {
        (patch as Record<string, unknown>)[k as string] = raw;
      }
    }

    // Parse numeric PM2.5 and air quality status if embedded in "Sedang (24,9 µg/m³)"
    if (patch.kualitasUdaraPm25Text) {
      const pmMatch = patch.kualitasUdaraPm25Text.match(/\(([\d.,]+)\s*µg/i);
      if (pmMatch?.[1]) {
        patch.pm25UgM3 = parseSafeNumber(pmMatch[1], 0);
      }
    }

    const personnelKeys: Array<keyof BnpbPersonnelBreakdown> = [
      'bpbd',
      'pemerintahPusat',
      'tni',
      'polri',
      'pemda',
      'relawan',
      'polisiHutan',
      'manggalaAgni',
      'mpa',
      'satpolPp',
      'perusahaan',
      'totalPersonel',
    ];
    for (const pk of personnelKeys) {
      const val = num(`personnel.${pk}`);
      if (val !== undefined) {
        personnel[pk] = val;
      }
    }
    if (Object.keys(personnel).length > 0) {
      patch.personnel = personnel;
    }

    const aerialKeys: Array<keyof BnpbAerialOperations> = [
      'patroliUnit',
      'patroliSortie',
      'wbUnit',
      'wbSortie',
      'jumlahWbHarian',
      'volumeWbLtr',
      'omcUnit',
      'omcSortie',
      'totalBahanSemaiKg',
      'luasDitanganiUdaraHa',
      'totalUnitUdaraHariIni',
      'unitPatroliStandby',
      'unitWbStandby',
      'unitOmcStandby',
      'totalUnitStandby',
    ];
    for (const ak of aerialKeys) {
      const val = num(`aerial.${ak}`);
      if (val !== undefined) {
        aerial[ak] = val;
      }
    }
    if (Object.keys(aerial).length > 0) {
      patch.aerial = aerial;
    }

    results.push(patch);
  }

  return results;
}

/**
 * Generates a ready-to-paste Google Apps Script `onEdit(e)` webhook trigger
 * for sub-second push updates from an owned Google Spreadsheet into PostGIS.
 */
export function generateAppsScriptWebhookCode(
  webhookUrl: string,
  secret = 'nusantara-posko-2026'
): string {
  const safeUrl = sanitizePlainText(webhookUrl) || 'https://your-gateway.example.com/api/bnpb/webhook/gsheets';
  const safeSecret = sanitizePlainText(secret) || 'nusantara-posko-2026';

  return `/**
 * Nusantara Watch — Auto-Sync Posko Google Sheet -> PostgreSQL/PostGIS Webhook
 * Tempel ke Google Sheet: Extensions -> Apps Script -> Triggers -> onEdit (Installable)
 */
const WEBHOOK_URL = '${safeUrl}';
const WEBHOOK_SECRET = '${safeSecret}';
const TARGET_SHEET = 'Data Karhutla';

function onEditInstallable(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== TARGET_SHEET) return;

  const rowIdx = e.range.getRow();
  if (rowIdx <= 1) return; // Lewati baris header

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const values = sheet.getRange(rowIdx, 1, 1, lastCol).getValues()[0];

  const payload = {
    source: 'google-apps-script',
    secret: WEBHOOK_SECRET,
    headers: headers.map(String),
    row: values.map((v) => (v === null || v === undefined ? '' : String(v))),
  };

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': WEBHOOK_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}`;
}
