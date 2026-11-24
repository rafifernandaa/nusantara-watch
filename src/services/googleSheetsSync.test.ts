import { describe, expect, it } from 'vitest';
import {
  buildGoogleSheetCsvUrl,
  computeContentHash,
  extractGoogleSheetId,
  generateAppsScriptWebhookCode,
  mapSheetRowsToBnpbPartials,
  parseCsvRows,
} from '../../backend/googleSheetsSync';
import { NusantaraPostgisEngine } from '../../backend/postgisEngine';
import { BNPB_KARHUTLA_2026_RECORDS } from '../data/local_data/bnpb-karhutla-2026';
import { buildSafeKarhutlaCsv } from '../utils/security';

describe('Google Sheets to PostgreSQL/PostGIS auto-sync pipeline', () => {
  it('extracts Google Spreadsheet IDs from full URLs and raw IDs cleanly', () => {
    const sampleId = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
    const fullUrl = `https://docs.google.com/spreadsheets/d/${sampleId}/edit?gid=0#gid=0`;

    expect(extractGoogleSheetId(fullUrl)).toBe(sampleId);
    expect(extractGoogleSheetId(sampleId)).toBe(sampleId);
    expect(extractGoogleSheetId('bad-id')).toBeNull();
    expect(extractGoogleSheetId('https://example.com/not-a-sheet')).toBeNull();
    expect(buildGoogleSheetCsvUrl(sampleId, 'Data Karhutla')).toBe(
      `https://docs.google.com/spreadsheets/d/${sampleId}/gviz/tq?tqx=out:csv&sheet=Data%20Karhutla`
    );
  });

  it('parses RFC-4180 CSV rows and maps both 47-column exports and partial posko sheets with sanitization', () => {
    const partialCsv = [
      'Provinsi,Hotspot Rendah,Hotspot Sedang,Hotspot Tinggi,Total Hotspot,Fire Spot,"Jarak Pandang Bandara (Km)",kesimpulan',
      '"Kalteng",8,25,11,44,10,"&lt; 3 <script>alert(1)</script>","Update posko ""Aman"", asap berkurang."',
      '"Total",8,25,11,44,10,"-","-"',
    ].join('\r\n');

    const rows = parseCsvRows(partialCsv);
    expect(rows).toHaveLength(3);

    const patches = mapSheetRowsToBnpbPartials(rows);
    expect(patches).toHaveLength(1);
    expect(patches[0].shortProvince).toBe('Kalteng');
    expect(patches[0].totalHotspot).toBe(44);
    expect(patches[0].fireSpot).toBe(10);
    expect(patches[0].jarakPandangBandaraKm).toBe('< 3 alert(1)');
    expect(patches[0].kesimpulan).toBe('Update posko "Aman", asap berkurang.');

    // Full 47-column round-trip from buildSafeKarhutlaCsv
    const fullCsv = buildSafeKarhutlaCsv(BNPB_KARHUTLA_2026_RECORDS, 'live-api');
    const fullRows = parseCsvRows(fullCsv);
    const fullPatches = mapSheetRowsToBnpbPartials(fullRows);
    expect(fullPatches).toHaveLength(6);
    expect(fullPatches[0].shortProvince).toBe('Riau');
    expect(fullPatches[0].personnel?.totalPersonel).toBe(14837);
    expect(fullPatches[4].aerial?.volumeWbLtr).toBe(704000);
  });

  it('deduplicates identical Google Sheet CSV polls via FNV-1a hash and updates bnpbRecords only when changed', () => {
    const engine = new NusantaraPostgisEngine();
    const csvV1 = [
      'Provinsi,Total Hotspot,Fire Spot,Lahan Terbakar Harian (Ha)',
      '"Jambi",15,4,32.5',
    ].join('\r\n');

    const first = engine.syncFromCsvText(csvV1, 'Google Sheet Test');
    expect(first.changed).toBe(true);
    expect(first.updatedCount).toBe(1);
    expect(engine.getBnpbRecords('Jambi')[0].totalHotspot).toBe(15);
    expect(engine.getBnpbRecords('Jambi')[0].fireSpot).toBe(4);
    expect(engine.getGoogleSheetsStatus().lastHash).toBe(computeContentHash(csvV1));
    expect(engine.getGoogleSheetsStatus().syncCount).toBe(1);

    // Second poll with identical CSV should be a no-op
    const second = engine.syncFromCsvText(csvV1, 'Google Sheet Test');
    expect(second.changed).toBe(false);
    expect(second.updatedCount).toBe(0);
    expect(engine.getGoogleSheetsStatus().syncCount).toBe(1);

    // Third poll with modified numbers triggers update + syncCount increment
    const csvV2 = [
      'Provinsi,Total Hotspot,Fire Spot,Lahan Terbakar Harian (Ha)',
      '"Jambi",19,6,41.0',
    ].join('\r\n');
    const third = engine.syncFromCsvText(csvV2, 'Google Sheet Test');
    expect(third.changed).toBe(true);
    expect(third.updatedCount).toBe(1);
    expect(engine.getBnpbRecords('Jambi')[0].totalHotspot).toBe(19);
    expect(engine.getGoogleSheetsStatus().syncCount).toBe(2);
  });

  it('simulates live Posko Google Sheet edits, configures polling cleanly, and generates Apps Script code', async () => {
    const engine = new NusantaraPostgisEngine();
    const beforeKalteng = engine.getBnpbRecords('Kalteng')[0];
    const initialHotspots = beforeKalteng.totalHotspot;
    const initialFireSpots = beforeKalteng.fireSpot;

    const sim = await engine.pollGoogleSheetNow({ simulatePoskoEdit: true });
    expect(sim.changed).toBe(true);
    expect(sim.updatedCount).toBe(1);
    expect(sim.status.syncCount).toBe(1);
    expect(sim.status.lastCheckedAt).not.toBeNull();
    expect(sim.status.lastChangedAt).not.toBeNull();

    const afterKalteng = engine.getBnpbRecords('Kalteng')[0];
    expect(afterKalteng.totalHotspot).toBe(initialHotspots + 3);
    expect(afterKalteng.fireSpot).toBe(initialFireSpots + 1);

    const configured = engine.configureGoogleSheetsSync({
      sheetUrlOrId:
        'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
      pollIntervalSec: 15,
      enabled: true,
    });
    expect(configured.enabled).toBe(true);
    expect(configured.pollIntervalSec).toBe(15);
    expect(configured.lastError).toBeNull();
    engine.stopPollTimer();

    const script = generateAppsScriptWebhookCode(
      'https://bnpb-gateway.example.com/api/bnpb/webhook/gsheets',
      'test-secret'
    );
    expect(script).toContain('function onEditInstallable(e)');
    expect(script).toContain('x-webhook-secret');
  });
});
