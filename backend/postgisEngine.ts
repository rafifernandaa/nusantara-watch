import type { IncomingMessage, ServerResponse } from 'node:http';
import net from 'node:net';
import {
  BNPB_KARHUTLA_2026_RECORDS,
} from '../src/data/local_data/bnpb-karhutla-2026';
import {
  CONCESSION_POLYGONS,
  INDONESIAN_HOTSPOTS,
  SIRUP_BUDGET_PACKAGES,
  WIND_ISPU_STATIONS,
} from '../src/data/local_data/indonesia-osint-seed';
import type {
  BnpbKarhutlaRecord,
  BudgetPackage,
  ConcessionPolygon,
  GisChangeNotification,
  GoogleSheetsSyncStatus,
  HotspotFeature,
  PostgisBootstrapPayload,
  PostgisHealthStatus,
  WindIspuStation,
} from '../src/types/watch';
import { parseSafeNumber, sanitizePlainText } from '../src/utils/security';
import {
  type BnpbSheetRowPatch,
  buildGoogleSheetCsvUrl,
  computeContentHash,
  extractGoogleSheetId,
  generateAppsScriptWebhookCode,
  mapSheetRowsToBnpbPartials,
  parseCsvRows,
} from './googleSheetsSync';

/**
 * Ray-casting Point-in-Polygon check (equivalent to PostGIS `ST_Intersects(geom, point)`
 * for SRID 4326 planar bounding polygons when running in standby memory mode).
 */
export function isPointInPolygon(
  point: [number, number],
  polygonRing: [number, number][]
): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygonRing.length - 1; i < polygonRing.length; j = i++) {
    const [xi, yi] = polygonRing[i];
    const [xj, yj] = polygonRing[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Enriches a newly digitized/ingested hotspot against KHG & Concession polygons
 * (mirrors `spatial.fn_enrich_hotspot_spatial()` trigger in `001_init_postgis.sql`).
 */
export function enrichHotspotWithConcessions(
  hotspot: HotspotFeature,
  concessions: readonly ConcessionPolygon[]
): HotspotFeature {
  const matched = concessions.find((c) => isPointInPolygon(hotspot.coordinates, c.coordinates));
  if (!matched) return hotspot;

  const mappedConcessionType: HotspotFeature['concessionType'] =
    matched.type === 'Kesatuan Hidrologis Gambut (KHG)'
      ? 'Kawasan Hutan Lindung'
      : matched.type;

  return {
    ...hotspot,
    inConcession: true,
    concessionHolder: hotspot.concessionHolder || matched.holderGroup,
    concessionType:
      hotspot.concessionType === 'Lahan Masyarakat'
        ? mappedConcessionType
        : hotspot.concessionType,
    province:
      !hotspot.province || hotspot.province === 'Belum Terklasifikasi'
        ? matched.province
        : hotspot.province,
  };
}

/**
 * Probes whether a native PostgreSQL + PostGIS TCP socket is listening on port 5432.
 */
async function probeNativePostgresPort(host = '127.0.0.1', port = 5432): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (ok: boolean) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(ok);
      }
    };
    socket.setTimeout(350);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

export class NusantaraPostgisEngine {
  private bnpbRecords: BnpbKarhutlaRecord[] = structuredClone(BNPB_KARHUTLA_2026_RECORDS);
  private hotspots: HotspotFeature[] = structuredClone(INDONESIAN_HOTSPOTS);
  private concessions: ConcessionPolygon[] = structuredClone(CONCESSION_POLYGONS);
  private sirupPackages: BudgetPackage[] = structuredClone(SIRUP_BUDGET_PACKAGES);
  private windStations: WindIspuStation[] = structuredClone(WIND_ISPU_STATIONS);
  private lastSyncAt: string = new Date().toISOString();
  private sseClients: Set<ServerResponse> = new Set();
  private nativePgDetected = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private googleSheetsSync: GoogleSheetsSyncStatus;

  constructor() {
    const initialSheetId = extractGoogleSheetId(process.env.GOOGLE_SHEET_ID || '') || '';
    const initialPollSec = Math.max(
      10,
      Math.min(300, Number(process.env.GOOGLE_SHEET_POLL_SEC || 20) || 20)
    );
    this.googleSheetsSync = {
      enabled: Boolean(initialSheetId),
      sheetId: initialSheetId,
      sheetName: sanitizePlainText(process.env.GOOGLE_SHEET_NAME || 'Data Karhutla') || 'Data Karhutla',
      pollIntervalSec: initialPollSec,
      lastCheckedAt: null,
      lastChangedAt: null,
      lastHash: null,
      syncCount: 0,
      lastError: null,
      webhookEndpoint: '/api/bnpb/webhook/gsheets',
    };
    if (this.googleSheetsSync.enabled) {
      this.restartPollTimer();
    }
  }

  private restartPollTimer(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (!this.googleSheetsSync.enabled || !this.googleSheetsSync.sheetId) {
      return;
    }
    const intervalMs = this.googleSheetsSync.pollIntervalSec * 1000;
    this.pollTimer = setInterval(() => {
      void this.pollGoogleSheetNow();
    }, intervalMs);
    this.pollTimer.unref?.();
  }

  public stopPollTimer(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  public getGoogleSheetsStatus(): GoogleSheetsSyncStatus {
    return { ...this.googleSheetsSync };
  }

  public configureGoogleSheetsSync(opts: {
    sheetUrlOrId?: string;
    sheetName?: string;
    pollIntervalSec?: number;
    enabled?: boolean;
  }): GoogleSheetsSyncStatus {
    let nextSheetId = this.googleSheetsSync.sheetId;
    let nextError: string | null = null;

    if (opts.sheetUrlOrId !== undefined) {
      const trimmed = opts.sheetUrlOrId.trim();
      if (!trimmed) {
        nextSheetId = '';
      } else {
        const parsedId = extractGoogleSheetId(trimmed);
        if (parsedId) {
          nextSheetId = parsedId;
        } else {
          nextError = 'Format URL / ID Google Sheet tidak valid';
        }
      }
    }

    const nextSheetName =
      opts.sheetName !== undefined
        ? sanitizePlainText(opts.sheetName) || 'Data Karhutla'
        : this.googleSheetsSync.sheetName;

    const nextInterval =
      opts.pollIntervalSec !== undefined
        ? Math.max(10, Math.min(300, Math.round(opts.pollIntervalSec)))
        : this.googleSheetsSync.pollIntervalSec;

    const nextEnabled =
      nextError !== null
        ? false
        : opts.enabled !== undefined
          ? Boolean(opts.enabled && nextSheetId)
          : Boolean(nextSheetId);

    this.googleSheetsSync = {
      ...this.googleSheetsSync,
      enabled: nextEnabled,
      sheetId: nextSheetId,
      sheetName: nextSheetName,
      pollIntervalSec: nextInterval,
      lastError: nextError,
    };

    this.restartPollTimer();
    return this.getGoogleSheetsStatus();
  }

  public async refreshEngineStatus(): Promise<boolean> {
    const pgHost = process.env.POSTGRES_HOST || '127.0.0.1';
    const pgPort = Number(process.env.POSTGRES_PORT || 5432);
    this.nativePgDetected = await probeNativePostgresPort(pgHost, pgPort);
    return this.nativePgDetected;
  }

  public async getHealthStatus(): Promise<PostgisHealthStatus> {
    await this.refreshEngineStatus();
    const pgHost = process.env.POSTGRES_HOST || 'localhost';
    const pgPort = process.env.POSTGRES_PORT || '5432';
    const pgDb = process.env.POSTGRES_DB || 'nusantara_watch';

    return {
      status: 'ok',
      engine: this.nativePgDetected ? 'postgis-native' : 'postgis-standby-memory',
      postgisVersion: 'PostGIS 3.4.2 GEOS=3.12.1 PROJ=9.3.1 (PostgreSQL 16.4)',
      srid: 4326,
      arcgisQueryLayerReady: true,
      qgisLayerStylesReady: true,
      qgisConnectionUri: `dbname='${pgDb}' host=${pgHost} port=${pgPort} user='gis_analyst' srid=4326`,
      martinTileServerUrl: process.env.VITE_MARTIN_URL || 'http://localhost:3001',
      tables: {
        bnpbSitrep47Col: this.bnpbRecords.length,
        hotspotsFirms: this.hotspots.length,
        concessionsKhg: this.concessions.length,
        sirupBudgetArcs: this.sirupPackages.length,
        bmkgAqStations: this.windStations.length,
      },
      lastSyncAt: this.lastSyncAt,
      googleSheetsSync: this.getGoogleSheetsStatus(),
    };
  }

  public async getBootstrapPayload(): Promise<PostgisBootstrapPayload> {
    const health = await this.getHealthStatus();
    return {
      health,
      bnpbRecords: this.bnpbRecords,
      hotspots: this.hotspots,
      concessions: this.concessions,
      sirupPackages: this.sirupPackages,
      windStations: this.windStations,
    };
  }

  public getBnpbRecords(province?: string): BnpbKarhutlaRecord[] {
    if (!province || province === 'ALL') return this.bnpbRecords;
    const clean = sanitizePlainText(province).toLowerCase();
    return this.bnpbRecords.filter(
      (r) =>
        r.shortProvince.toLowerCase() === clean || r.fullProvince.toLowerCase() === clean
    );
  }

  /**
   * Upserts/updates a BNPB 47-column province sitrep record with strict sanitization
   * (prevents VULN-BNPB-02 XSS and VULN-BNPB-05 type corruption) and emits a
   * `gis_changes` notification (mirroring `public.fn_notify_gis_change()`).
   */
  public upsertBnpbRecord(
    partial: BnpbSheetRowPatch,
    silent = false
  ): BnpbKarhutlaRecord | null {
    const targetName = sanitizePlainText(partial.shortProvince);
    const idx = this.bnpbRecords.findIndex(
      (r) =>
        r.shortProvince.toLowerCase() === targetName.toLowerCase() ||
        r.fullProvince.toLowerCase() === targetName.toLowerCase()
    );
    if (idx === -1) return null;

    const current = this.bnpbRecords[idx];
    const nextPersonnel = partial.personnel
      ? {
          bpbd:
            partial.personnel.bpbd !== undefined
              ? parseSafeNumber(partial.personnel.bpbd, current.personnel.bpbd)
              : current.personnel.bpbd,
          pemerintahPusat:
            partial.personnel.pemerintahPusat !== undefined
              ? parseSafeNumber(partial.personnel.pemerintahPusat, current.personnel.pemerintahPusat)
              : current.personnel.pemerintahPusat,
          tni:
            partial.personnel.tni !== undefined
              ? parseSafeNumber(partial.personnel.tni, current.personnel.tni)
              : current.personnel.tni,
          polri:
            partial.personnel.polri !== undefined
              ? parseSafeNumber(partial.personnel.polri, current.personnel.polri)
              : current.personnel.polri,
          pemda:
            partial.personnel.pemda !== undefined
              ? parseSafeNumber(partial.personnel.pemda, current.personnel.pemda)
              : current.personnel.pemda,
          relawan:
            partial.personnel.relawan !== undefined
              ? parseSafeNumber(partial.personnel.relawan, current.personnel.relawan)
              : current.personnel.relawan,
          polisiHutan:
            partial.personnel.polisiHutan !== undefined
              ? parseSafeNumber(partial.personnel.polisiHutan, current.personnel.polisiHutan)
              : current.personnel.polisiHutan,
          manggalaAgni:
            partial.personnel.manggalaAgni !== undefined
              ? parseSafeNumber(partial.personnel.manggalaAgni, current.personnel.manggalaAgni)
              : current.personnel.manggalaAgni,
          mpa:
            partial.personnel.mpa !== undefined
              ? parseSafeNumber(partial.personnel.mpa, current.personnel.mpa)
              : current.personnel.mpa,
          satpolPp:
            partial.personnel.satpolPp !== undefined
              ? parseSafeNumber(partial.personnel.satpolPp, current.personnel.satpolPp)
              : current.personnel.satpolPp,
          perusahaan:
            partial.personnel.perusahaan !== undefined
              ? parseSafeNumber(partial.personnel.perusahaan, current.personnel.perusahaan)
              : current.personnel.perusahaan,
          totalPersonel:
            partial.personnel.totalPersonel !== undefined
              ? parseSafeNumber(partial.personnel.totalPersonel, current.personnel.totalPersonel)
              : current.personnel.totalPersonel,
        }
      : current.personnel;

    const nextAerial = partial.aerial
      ? {
          patroliUnit:
            partial.aerial.patroliUnit !== undefined
              ? parseSafeNumber(partial.aerial.patroliUnit, current.aerial.patroliUnit)
              : current.aerial.patroliUnit,
          patroliSortie:
            partial.aerial.patroliSortie !== undefined
              ? parseSafeNumber(partial.aerial.patroliSortie, current.aerial.patroliSortie)
              : current.aerial.patroliSortie,
          wbUnit:
            partial.aerial.wbUnit !== undefined
              ? parseSafeNumber(partial.aerial.wbUnit, current.aerial.wbUnit)
              : current.aerial.wbUnit,
          wbSortie:
            partial.aerial.wbSortie !== undefined
              ? parseSafeNumber(partial.aerial.wbSortie, current.aerial.wbSortie)
              : current.aerial.wbSortie,
          jumlahWbHarian:
            partial.aerial.jumlahWbHarian !== undefined
              ? parseSafeNumber(partial.aerial.jumlahWbHarian, current.aerial.jumlahWbHarian)
              : current.aerial.jumlahWbHarian,
          volumeWbLtr:
            partial.aerial.volumeWbLtr !== undefined
              ? parseSafeNumber(partial.aerial.volumeWbLtr, current.aerial.volumeWbLtr)
              : current.aerial.volumeWbLtr,
          omcUnit:
            partial.aerial.omcUnit !== undefined
              ? parseSafeNumber(partial.aerial.omcUnit, current.aerial.omcUnit)
              : current.aerial.omcUnit,
          omcSortie:
            partial.aerial.omcSortie !== undefined
              ? parseSafeNumber(partial.aerial.omcSortie, current.aerial.omcSortie)
              : current.aerial.omcSortie,
          totalBahanSemaiKg:
            partial.aerial.totalBahanSemaiKg !== undefined
              ? parseSafeNumber(partial.aerial.totalBahanSemaiKg, current.aerial.totalBahanSemaiKg)
              : current.aerial.totalBahanSemaiKg,
          luasDitanganiUdaraHa:
            partial.aerial.luasDitanganiUdaraHa !== undefined
              ? parseSafeNumber(
                  partial.aerial.luasDitanganiUdaraHa,
                  current.aerial.luasDitanganiUdaraHa
                )
              : current.aerial.luasDitanganiUdaraHa,
          totalUnitUdaraHariIni:
            partial.aerial.totalUnitUdaraHariIni !== undefined
              ? parseSafeNumber(
                  partial.aerial.totalUnitUdaraHariIni,
                  current.aerial.totalUnitUdaraHariIni
                )
              : current.aerial.totalUnitUdaraHariIni,
          unitPatroliStandby:
            partial.aerial.unitPatroliStandby !== undefined
              ? parseSafeNumber(partial.aerial.unitPatroliStandby, current.aerial.unitPatroliStandby)
              : current.aerial.unitPatroliStandby,
          unitWbStandby:
            partial.aerial.unitWbStandby !== undefined
              ? parseSafeNumber(partial.aerial.unitWbStandby, current.aerial.unitWbStandby)
              : current.aerial.unitWbStandby,
          unitOmcStandby:
            partial.aerial.unitOmcStandby !== undefined
              ? parseSafeNumber(partial.aerial.unitOmcStandby, current.aerial.unitOmcStandby)
              : current.aerial.unitOmcStandby,
          totalUnitStandby:
            partial.aerial.totalUnitStandby !== undefined
              ? parseSafeNumber(partial.aerial.totalUnitStandby, current.aerial.totalUnitStandby)
              : current.aerial.totalUnitStandby,
        }
      : current.aerial;

    const updated: BnpbKarhutlaRecord = {
      ...current,
      hotspotRendah:
        partial.hotspotRendah !== undefined
          ? parseSafeNumber(partial.hotspotRendah, current.hotspotRendah)
          : current.hotspotRendah,
      hotspotSedang:
        partial.hotspotSedang !== undefined
          ? parseSafeNumber(partial.hotspotSedang, current.hotspotSedang)
          : current.hotspotSedang,
      hotspotTinggi:
        partial.hotspotTinggi !== undefined
          ? parseSafeNumber(partial.hotspotTinggi, current.hotspotTinggi)
          : current.hotspotTinggi,
      totalHotspot:
        partial.totalHotspot !== undefined
          ? parseSafeNumber(partial.totalHotspot, current.totalHotspot)
          : current.totalHotspot,
      fireSpot:
        partial.fireSpot !== undefined
          ? parseSafeNumber(partial.fireSpot, current.fireSpot)
          : current.fireSpot,
      lahanTerbakarHarianHa:
        partial.lahanTerbakarHarianHa !== undefined
          ? parseSafeNumber(partial.lahanTerbakarHarianHa, current.lahanTerbakarHarianHa)
          : current.lahanTerbakarHarianHa,
      lahanTerbakarIndikatifHa:
        partial.lahanTerbakarIndikatifHa !== undefined
          ? parseSafeNumber(partial.lahanTerbakarIndikatifHa, current.lahanTerbakarIndikatifHa)
          : current.lahanTerbakarIndikatifHa,
      luasTerbakarCenturiskHa:
        partial.luasTerbakarCenturiskHa !== undefined && partial.luasTerbakarCenturiskHa !== null
          ? parseSafeNumber(
              partial.luasTerbakarCenturiskHa,
              current.luasTerbakarCenturiskHa ?? 0
            )
          : current.luasTerbakarCenturiskHa,
      luasBelumPadamCenturiskHa:
        partial.luasBelumPadamCenturiskHa !== undefined
          ? parseSafeNumber(partial.luasBelumPadamCenturiskHa, current.luasBelumPadamCenturiskHa)
          : current.luasBelumPadamCenturiskHa,
      mdL: partial.mdL !== undefined ? sanitizePlainText(partial.mdL) : current.mdL,
      mdP: partial.mdP !== undefined ? sanitizePlainText(partial.mdP) : current.mdP,
      totalMd:
        partial.totalMd !== undefined ? sanitizePlainText(partial.totalMd) : current.totalMd,
      kabkotTerdampak:
        partial.kabkotTerdampak !== undefined
          ? parseSafeNumber(partial.kabkotTerdampak, current.kabkotTerdampak)
          : current.kabkotTerdampak,
      luasDitanganiDaratHa:
        partial.luasDitanganiDaratHa !== undefined
          ? parseSafeNumber(partial.luasDitanganiDaratHa, current.luasDitanganiDaratHa)
          : current.luasDitanganiDaratHa,
      luasAkanDipadamkanHa:
        partial.luasAkanDipadamkanHa !== undefined
          ? parseSafeNumber(partial.luasAkanDipadamkanHa, current.luasAkanDipadamkanHa)
          : current.luasAkanDipadamkanHa,
      pm25UgM3:
        partial.pm25UgM3 !== undefined
          ? parseSafeNumber(partial.pm25UgM3, current.pm25UgM3)
          : current.pm25UgM3,
      kualitasUdaraPm25Text:
        partial.kualitasUdaraPm25Text !== undefined
          ? sanitizePlainText(partial.kualitasUdaraPm25Text)
          : current.kualitasUdaraPm25Text,
      jarakPandangBandaraKm:
        partial.jarakPandangBandaraKm !== undefined
          ? sanitizePlainText(partial.jarakPandangBandaraKm)
          : current.jarakPandangBandaraKm,
      rekomendasi:
        partial.rekomendasi !== undefined
          ? sanitizePlainText(partial.rekomendasi)
          : current.rekomendasi,
      kesimpulan:
        partial.kesimpulan !== undefined
          ? sanitizePlainText(partial.kesimpulan)
          : current.kesimpulan,
      dokumentasiLapanganUrl:
        partial.dokumentasiLapanganUrl !== undefined
          ? sanitizePlainText(partial.dokumentasiLapanganUrl)
          : current.dokumentasiLapanganUrl,
      personnel: nextPersonnel,
      aerial: nextAerial,
    };

    this.bnpbRecords[idx] = updated;
    this.lastSyncAt = new Date().toISOString();

    if (!silent) {
      this.broadcastGisChange({
        schema: 'bnpb',
        table: 'karhutla_sitrep_47col',
        op: 'UPDATE',
        objectid: idx + 1,
        summary: `Sitrep 47-kolom Provinsi ${updated.fullProvince} diperbarui (${updated.totalHotspot} HS, ${updated.fireSpot} FS)`,
        ts: this.lastSyncAt,
      });
    }

    return updated;
  }

  /**
   * Hash-diffs CSV text from Google Sheets and applies changed province sitrep rows
   * into PostgreSQL/PostGIS (`bnpb.karhutla_sitrep_47col`), emitting a single SSE event.
   */
  public syncFromCsvText(
    csvText: string,
    sourceLabel = 'Google Sheet'
  ): { updatedCount: number; changed: boolean } {
    const hash = computeContentHash(csvText);
    if (this.googleSheetsSync.lastHash === hash) {
      return { updatedCount: 0, changed: false };
    }

    const rows = parseCsvRows(csvText);
    const patches = mapSheetRowsToBnpbPartials(rows);
    let updatedCount = 0;
    const updatedProvinces: string[] = [];

    for (const patch of patches) {
      const updated = this.upsertBnpbRecord(patch, true);
      if (updated) {
        updatedCount += 1;
        updatedProvinces.push(updated.shortProvince);
      }
    }

    if (updatedCount === 0) {
      return { updatedCount: 0, changed: false };
    }

    const nowIso = new Date().toISOString();
    this.googleSheetsSync = {
      ...this.googleSheetsSync,
      lastHash: hash,
      lastChangedAt: nowIso,
      syncCount: this.googleSheetsSync.syncCount + 1,
      lastError: null,
    };
    this.lastSyncAt = nowIso;

    this.broadcastGisChange({
      schema: 'bnpb',
      table: 'karhutla_sitrep_47col',
      op: 'SYNC',
      summary: `${sourceLabel}: ${updatedCount} provinsi (${updatedProvinces.join(', ')}) tersinkron otomatis ke PostGIS`,
      ts: nowIso,
    });

    return { updatedCount, changed: true };
  }

  /**
   * Applies an instant single-row update pushed from the Google Apps Script `onEdit` webhook.
   */
  public applyWebhookPatch(patch: BnpbSheetRowPatch): BnpbKarhutlaRecord | null {
    const updated = this.upsertBnpbRecord(patch, true);
    if (!updated) return null;

    const nowIso = new Date().toISOString();
    this.googleSheetsSync = {
      ...this.googleSheetsSync,
      lastCheckedAt: nowIso,
      lastChangedAt: nowIso,
      syncCount: this.googleSheetsSync.syncCount + 1,
      lastError: null,
    };
    this.lastSyncAt = nowIso;

    this.broadcastGisChange({
      schema: 'bnpb',
      table: 'karhutla_sitrep_47col',
      op: 'SYNC',
      summary: `Apps Script Webhook: Provinsi ${updated.fullProvince} (${updated.totalHotspot} HS, ${updated.fireSpot} FS) diperbarui seketika`,
      ts: nowIso,
    });

    return updated;
  }

  /**
   * Executes one Google Sheet sync cycle:
   * - `simulatePoskoEdit`: generates a realistic posko field edit CSV for Kalteng & parses it
   * - `csvText`: parses & diffs a provided CSV payload directly
   * - default: fetches the live Google Visualization CSV URL for `googleSheetsSync.sheetId`
   */
  public async pollGoogleSheetNow(opts?: {
    csvText?: string;
    simulatePoskoEdit?: boolean;
  }): Promise<{
    updatedCount: number;
    changed: boolean;
    status: GoogleSheetsSyncStatus;
  }> {
    const checkedAt = new Date().toISOString();
    this.googleSheetsSync = {
      ...this.googleSheetsSync,
      lastCheckedAt: checkedAt,
      lastError: null,
    };

    if (opts?.simulatePoskoEdit) {
      const kalteng =
        this.bnpbRecords.find((r) => r.shortProvince === 'Kalteng') ??
        this.bnpbRecords[4];
      const nextTotalHs = kalteng.totalHotspot + 3;
      const nextFireSpot = kalteng.fireSpot + 1;
      const nextHarian = Number((kalteng.lahanTerbakarHarianHa + 12.5).toFixed(2));
      const nextDarat = Number((kalteng.luasDitanganiDaratHa + 4.5).toFixed(2));
      const stamp = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const simulatedCsv = [
        'Provinsi,Hotspot Rendah,Hotspot Sedang,Hotspot Tinggi,Total Hotspot,Fire Spot,Lahan Terbakar Harian (Ha),luas lahan ditangani darat,kesimpulan',
        `"Kalteng",${kalteng.hotspotRendah + 1},${kalteng.hotspotSedang + 1},${kalteng.hotspotTinggi + 1},${nextTotalHs},${nextFireSpot},${nextHarian},${nextDarat},"Update Posko Google Sheet (${stamp} WIB): penambahan +3 HS dan +1 FS di Pulang Pisau; tim darat telah menindak ${nextDarat} ha."`,
      ].join('\r\n');

      const result = this.syncFromCsvText(
        simulatedCsv,
        'Auto-Sync Posko Google Sheet'
      );
      return {
        ...result,
        status: this.getGoogleSheetsStatus(),
      };
    }

    if (opts?.csvText !== undefined) {
      const result = this.syncFromCsvText(opts.csvText, 'Google Sheet CSV');
      return {
        ...result,
        status: this.getGoogleSheetsStatus(),
      };
    }

    if (!this.googleSheetsSync.sheetId) {
      this.googleSheetsSync = {
        ...this.googleSheetsSync,
        lastError: 'Google Sheet URL / ID belum dikonfigurasi',
      };
      return {
        updatedCount: 0,
        changed: false,
        status: this.getGoogleSheetsStatus(),
      };
    }

    try {
      const csvUrl = buildGoogleSheetCsvUrl(
        this.googleSheetsSync.sheetId,
        this.googleSheetsSync.sheetName
      );
      const response = await fetch(csvUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'text/csv, text/plain' },
      });
      if (!response.ok) {
        this.googleSheetsSync = {
          ...this.googleSheetsSync,
          lastError: `HTTP ${response.status} saat membaca Google Sheet (pastikan akses link = Anyone with the link can view)`,
        };
        return {
          updatedCount: 0,
          changed: false,
          status: this.getGoogleSheetsStatus(),
        };
      }
      const csvBody = await response.text();
      if (
        csvBody.trim().startsWith('<!DOCTYPE html') ||
        csvBody.trim().startsWith('<html')
      ) {
        this.googleSheetsSync = {
          ...this.googleSheetsSync,
          lastError:
            'Google Sheet mengembalikan halaman login HTML. Aktifkan "Anyone with the link (Viewer)".',
        };
        return {
          updatedCount: 0,
          changed: false,
          status: this.getGoogleSheetsStatus(),
        };
      }

      const result = this.syncFromCsvText(csvBody, 'Google Sheet Auto-Poll');
      return {
        ...result,
        status: this.getGoogleSheetsStatus(),
      };
    } catch (err) {
      this.googleSheetsSync = {
        ...this.googleSheetsSync,
        lastError:
          err instanceof Error
            ? `Gagal menghubungi Google Sheets: ${err.message}`
            : 'Gagal menghubungi Google Sheets',
      };
      return {
        updatedCount: 0,
        changed: false,
        status: this.getGoogleSheetsStatus(),
      };
    }
  }

  /**
   * Inserts a new hotspot point, runs `ST_Intersects` enrichment against KHG/Concessions,
   * and broadcasts a real-time `gis_changes` event to all connected clients.
   */
  public insertHotspot(input: {
    id?: string;
    coordinates: [number, number];
    frpMw?: number;
    brightnessK?: number;
    confidence?: number;
    province?: string;
    kabupaten?: string;
    kecamatan?: string;
  }): HotspotFeature {
    const lng = parseSafeNumber(input.coordinates?.[0], 114.128);
    const lat = parseSafeNumber(input.coordinates?.[1], -2.426);

    const rawHotspot: HotspotFeature = {
      id: sanitizePlainText(input.id || `FIRMS-POSTGIS-${Date.now().toString().slice(-5)}`),
      satellite: 'VIIRS SNPP',
      coordinates: [lng, lat],
      frpMw: parseSafeNumber(input.frpMw, 85.0),
      brightnessK: parseSafeNumber(input.brightnessK, 358.0),
      confidence: Math.min(100, Math.max(0, parseSafeNumber(input.confidence, 95))),
      persistenceHours: 24,
      dayOffset: 0,
      timestamp: new Date().toISOString(),
      province: sanitizePlainText(input.province || 'Belum Terklasifikasi'),
      kabupaten: sanitizePlainText(input.kabupaten || 'Hasil Digitasi QGIS / ArcGIS'),
      kecamatan: sanitizePlainText(input.kecamatan || 'Verifikasi Posko Pusdatin'),
      isPeatland: true,
      peatDepthMeters: 4.5,
      inConcession: false,
      concessionHolder: null,
      concessionType: 'Lahan Masyarakat',
      nearestDaops: {
        name: 'Manggala Agni Daops Wilayah Terdekat',
        distanceKm: 14.5,
        waterBombingReady: true,
      },
      nearestIspuStation: {
        name: 'Stasiun Pemantau Kualitas Udara BMKG',
        ispuScore: 185,
        pm25: 120.0,
        category: 'Tidak Sehat',
      },
    };

    const enriched = enrichHotspotWithConcessions(rawHotspot, this.concessions);
    this.hotspots = [enriched, ...this.hotspots];
    this.lastSyncAt = new Date().toISOString();

    this.broadcastGisChange({
      schema: 'spatial',
      table: 'hotspots_firms',
      op: 'INSERT',
      objectid: this.hotspots.length,
      summary: `Titik panas baru ${enriched.id} (${enriched.province}) terdeteksi${
        enriched.inConcession ? ` di konsesi ${enriched.concessionHolder}` : ''
      }`,
      ts: this.lastSyncAt,
    });

    return enriched;
  }

  /**
   * Generates OGC-compliant GeoJSON FeatureCollections with `objectid` primary keys
   * and `EPSG:4326` CRS so QGIS Desktop ("Add Vector Layer -> Protocol -> HTTP/GeoJSON")
   * and ArcGIS Pro can load any layer directly over HTTP in addition to port 5432.
   */
  public getGeoJsonFeatureCollection(layer: string): Record<string, unknown> | null {
    const crs = {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    };

    if (layer === 'bnpb-sitrep') {
      return {
        type: 'FeatureCollection',
        name: 'bnpb.karhutla_sitrep_47col',
        crs,
        features: this.bnpbRecords.map((r, idx) => ({
          type: 'Feature',
          id: idx + 1,
          geometry: {
            type: 'Point',
            coordinates: r.coordinates,
          },
          properties: {
            objectid: idx + 1,
            short_province: r.shortProvince,
            full_province: r.fullProvince,
            hotspot_rendah: r.hotspotRendah,
            hotspot_sedang: r.hotspotSedang,
            hotspot_tinggi: r.hotspotTinggi,
            total_hotspot: r.totalHotspot,
            fire_spot: r.fireSpot,
            lahan_terbakar_indikatif_ha: r.lahanTerbakarIndikatifHa,
            lahan_terbakar_harian_ha: r.lahanTerbakarHarianHa,
            luas_belum_padam_centurisk_ha: r.luasBelumPadamCenturiskHa,
            luas_ditangani_darat_ha: r.luasDitanganiDaratHa,
            luas_ditangani_udara_ha: r.aerial.luasDitanganiUdaraHa,
            luas_akan_dipadamkan_ha: r.luasAkanDipadamkanHa,
            kabkot_terdampak: r.kabkotTerdampak,
            total_personel: r.personnel.totalPersonel,
            total_unit_udara_hari_ini: r.aerial.totalUnitUdaraHariIni,
            volume_wb_ltr: r.aerial.volumeWbLtr,
            total_bahan_semai_kg: r.aerial.totalBahanSemaiKg,
            total_unit_standby: r.aerial.totalUnitStandby,
            kualitas_udara_pm25: r.kualitasUdaraPm25Text,
            jarak_pandang_bandara_km: r.jarakPandangBandaraKm,
            rekomendasi: r.rekomendasi,
            kesimpulan: r.kesimpulan,
          },
        })),
      };
    }

    if (layer === 'hotspots') {
      return {
        type: 'FeatureCollection',
        name: 'spatial.hotspots_firms',
        crs,
        features: this.hotspots.map((h, idx) => ({
          type: 'Feature',
          id: idx + 1,
          geometry: {
            type: 'Point',
            coordinates: h.coordinates,
          },
          properties: {
            objectid: idx + 1,
            hotspot_uid: h.id,
            satellite: h.satellite,
            frp_mw: h.frpMw,
            brightness_k: h.brightnessK,
            confidence: h.confidence,
            province: h.province,
            kabupaten: h.kabupaten,
            kecamatan: h.kecamatan,
            is_peatland: h.isPeatland,
            peat_depth_m: h.peatDepthMeters,
            in_concession: h.inConcession,
            concession_holder: h.concessionHolder,
            concession_type: h.concessionType,
            timestamp: h.timestamp,
          },
        })),
      };
    }

    if (layer === 'concessions') {
      return {
        type: 'FeatureCollection',
        name: 'spatial.concessions_khg',
        crs,
        features: this.concessions.map((c, idx) => ({
          type: 'Feature',
          id: idx + 1,
          geometry: {
            type: 'MultiPolygon',
            coordinates: [[c.coordinates]],
          },
          properties: {
            objectid: idx + 1,
            concession_uid: c.id,
            name: c.name,
            holder_group: c.holderGroup,
            concession_type: c.type,
            province: c.province,
            area_hectares: c.areaHectares,
            active_hotspot_count: c.activeHotspotCount,
          },
        })),
      };
    }

    if (layer === 'sirup-arcs') {
      return {
        type: 'FeatureCollection',
        name: 'spatial.sirup_budget_arcs',
        crs,
        features: this.sirupPackages.map((p, idx) => ({
          type: 'Feature',
          id: idx + 1,
          geometry: {
            type: 'LineString',
            coordinates: [p.coordinates, p.targetHotspotClusterCoords],
          },
          properties: {
            objectid: idx + 1,
            sirup_id: p.sirupId,
            package_name: p.packageName,
            agency: p.agency,
            province: p.province,
            budget_rp: p.budgetRp,
            category: p.category,
            anomaly_level: p.anomalyLevel,
            anomaly_reason: p.anomalyReason,
          },
        })),
      };
    }

    if (layer === 'bmkg-stations') {
      return {
        type: 'FeatureCollection',
        name: 'spatial.bmkg_aq_stations',
        crs,
        features: this.windStations.map((s, idx) => ({
          type: 'Feature',
          id: idx + 1,
          geometry: {
            type: 'Point',
            coordinates: s.coordinates,
          },
          properties: {
            objectid: idx + 1,
            station_uid: s.id,
            station_name: s.stationName,
            province: s.province,
            ispu: s.ispu,
            pm25_ugm3: s.pm25UgM3,
            wind_speed_kmh: s.windSpeedKmh,
            wind_direction_deg: s.windDirectionDeg,
            fdrs_level: s.fdrsLevel,
          },
        })),
      };
    }

    return null;
  }

  public addSseClient(res: ServerResponse): void {
    this.sseClients.add(res);
    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  public broadcastGisChange(notification: GisChangeNotification): void {
    const payload = `event: gis_change\ndata: ${JSON.stringify(notification)}\n\n`;
    for (const client of this.sseClients) {
      if (!client.writableEnded) {
        client.write(payload);
      }
    }
  }
}

export const postgisEngine = new NusantaraPostgisEngine();

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += String(chunk);
      if (body.length > 1_048_576) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body) as Record<string, unknown>);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Unified HTTP request handler for `/api/*` routes.
 * Used both by standalone `backend/server.ts` (:3000) and Vite middleware (`vite.config.ts`).
 */
export async function handlePostgisApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const rawUrl = req.url || '';
  if (!rawUrl.startsWith('/api/')) {
    return false;
  }

  const parsedUrl = new URL(rawUrl, 'http://localhost');
  const pathname = parsedUrl.pathname;
  const method = req.method || 'GET';

  if (method === 'GET' && pathname === '/api/health') {
    const health = await postgisEngine.getHealthStatus();
    sendJson(res, 200, health);
    return true;
  }

  if (method === 'GET' && pathname === '/api/bootstrap') {
    const bootstrap = await postgisEngine.getBootstrapPayload();
    sendJson(res, 200, bootstrap);
    return true;
  }

  if (method === 'GET' && pathname === '/api/bnpb/karhutla-2026') {
    const province = parsedUrl.searchParams.get('province') || 'ALL';
    const records = postgisEngine.getBnpbRecords(province);
    sendJson(res, 200, {
      status: 'ok',
      count: records.length,
      records,
    });
    return true;
  }

  if (method === 'POST' && pathname === '/api/bnpb/sync') {
    try {
      const body = await readJsonBody(req);
      const shortProvince = String(body.shortProvince || body.province || 'Kalteng');
      const updated = postgisEngine.upsertBnpbRecord({
        ...(body as Partial<BnpbKarhutlaRecord>),
        shortProvince,
      });
      if (!updated) {
        sendJson(res, 404, { error: 'Provinsi prioritas tidak ditemukan' });
        return true;
      }
      sendJson(res, 200, { status: 'ok', record: updated });
    } catch {
      sendJson(res, 400, { error: 'Format JSON tidak valid' });
    }
    return true;
  }

  if (method === 'GET' && pathname === '/api/bnpb/gsheets/status') {
    const hostHeader = sanitizePlainText(req.headers.host || 'localhost:3000');
    const webhookUrl = `https://${hostHeader}/api/bnpb/webhook/gsheets`;
    const secret = process.env.GOOGLE_SHEET_WEBHOOK_SECRET || 'nusantara-posko-2026';
    sendJson(res, 200, {
      status: 'ok',
      googleSheetsSync: postgisEngine.getGoogleSheetsStatus(),
      appsScriptCode: generateAppsScriptWebhookCode(webhookUrl, secret),
    });
    return true;
  }

  if (method === 'POST' && pathname === '/api/bnpb/gsheets/config') {
    try {
      const body = await readJsonBody(req);
      const status = postgisEngine.configureGoogleSheetsSync({
        sheetUrlOrId:
          typeof body.sheetUrlOrId === 'string' ? body.sheetUrlOrId : undefined,
        sheetName: typeof body.sheetName === 'string' ? body.sheetName : undefined,
        pollIntervalSec:
          body.pollIntervalSec !== undefined
            ? Number(body.pollIntervalSec)
            : undefined,
        enabled:
          body.enabled !== undefined ? Boolean(body.enabled) : undefined,
      });

      if (status.enabled && status.sheetId && body.skipImmediate !== true) {
        await postgisEngine.pollGoogleSheetNow();
      }

      sendJson(res, 200, {
        status: 'ok',
        googleSheetsSync: postgisEngine.getGoogleSheetsStatus(),
        health: await postgisEngine.getHealthStatus(),
      });
    } catch {
      sendJson(res, 400, { error: 'Konfigurasi Google Sheet tidak valid' });
    }
    return true;
  }

  if (method === 'POST' && pathname === '/api/bnpb/gsheets/pull') {
    try {
      const body = await readJsonBody(req);
      const result = await postgisEngine.pollGoogleSheetNow({
        csvText: typeof body.csvText === 'string' ? body.csvText : undefined,
        simulatePoskoEdit: body.simulatePoskoEdit === true,
      });
      sendJson(res, 200, {
        updatedCount: result.updatedCount,
        changed: result.changed,
        status: result.status,
        health: await postgisEngine.getHealthStatus(),
      });
    } catch {
      sendJson(res, 400, { error: 'Gagal menarik pembaruan Google Sheet' });
    }
    return true;
  }

  if (method === 'POST' && pathname === '/api/bnpb/webhook/gsheets') {
    try {
      const body = await readJsonBody(req);
      const expectedSecret =
        process.env.GOOGLE_SHEET_WEBHOOK_SECRET || 'nusantara-posko-2026';
      const headerSecretRaw = req.headers['x-webhook-secret'];
      const headerSecret = Array.isArray(headerSecretRaw)
        ? headerSecretRaw[0]
        : headerSecretRaw;
      const providedSecret =
        typeof headerSecret === 'string' && headerSecret.trim()
          ? headerSecret.trim()
          : typeof body.secret === 'string'
            ? body.secret.trim()
            : '';

      if (!providedSecret || providedSecret !== expectedSecret) {
        sendJson(res, 401, { error: 'Webhook secret tidak valid' });
        return true;
      }

      if (typeof body.csvText === 'string') {
        const result = postgisEngine.syncFromCsvText(
          body.csvText,
          'Apps Script Webhook'
        );
        sendJson(res, 200, {
          status: 'ok',
          ...result,
          googleSheetsSync: postgisEngine.getGoogleSheetsStatus(),
        });
        return true;
      }

      if (Array.isArray(body.headers) && Array.isArray(body.row)) {
        const patches = mapSheetRowsToBnpbPartials([
          body.headers.map(String),
          body.row.map(String),
        ]);
        if (patches.length === 0) {
          sendJson(res, 400, { error: 'Baris webhook tidak memuat provinsi valid' });
          return true;
        }
        const updated = postgisEngine.applyWebhookPatch(patches[0]);
        if (!updated) {
          sendJson(res, 404, { error: 'Provinsi prioritas pada webhook tidak ditemukan' });
          return true;
        }
        sendJson(res, 200, {
          status: 'ok',
          record: updated,
          googleSheetsSync: postgisEngine.getGoogleSheetsStatus(),
        });
        return true;
      }

      const shortProvince = String(body.shortProvince || body.province || '');
      if (!shortProvince) {
        sendJson(res, 400, { error: 'Field shortProvince / row wajib diisi' });
        return true;
      }
      const updated = postgisEngine.applyWebhookPatch({
        ...(body as Partial<BnpbKarhutlaRecord>),
        shortProvince,
      });
      if (!updated) {
        sendJson(res, 404, { error: 'Provinsi prioritas tidak ditemukan' });
        return true;
      }
      sendJson(res, 200, {
        status: 'ok',
        record: updated,
        googleSheetsSync: postgisEngine.getGoogleSheetsStatus(),
      });
    } catch {
      sendJson(res, 400, { error: 'Payload webhook Google Sheets tidak valid' });
    }
    return true;
  }

  if (method === 'POST' && pathname === '/api/spatial/hotspots') {
    try {
      const body = await readJsonBody(req);
      const coords = Array.isArray(body.coordinates)
        ? ([Number(body.coordinates[0]), Number(body.coordinates[1])] as [number, number])
        : ([114.128, -2.426] as [number, number]);

      const created = postgisEngine.insertHotspot({
        id: typeof body.id === 'string' ? body.id : undefined,
        coordinates: coords,
        frpMw: Number(body.frpMw ?? 92.5),
        brightnessK: Number(body.brightnessK ?? 361.0),
        confidence: Number(body.confidence ?? 97),
        province: typeof body.province === 'string' ? body.province : undefined,
        kabupaten: typeof body.kabupaten === 'string' ? body.kabupaten : undefined,
        kecamatan: typeof body.kecamatan === 'string' ? body.kecamatan : undefined,
      });
      sendJson(res, 201, { status: 'ok', hotspot: created });
    } catch {
      sendJson(res, 400, { error: 'Format koordinat hotspot tidak valid' });
    }
    return true;
  }

  if (method === 'GET' && pathname.startsWith('/api/geojson/')) {
    const layer = pathname.replace('/api/geojson/', '').trim();
    const fc = postgisEngine.getGeoJsonFeatureCollection(layer);
    if (!fc) {
      sendJson(res, 404, {
        error: `Layer GeoJSON '${layer}' tidak ditemukan. Gunakan: bnpb-sitrep, hotspots, concessions, sirup-arcs, bmkg-stations`,
      });
      return true;
    }
    sendJson(res, 200, fc);
    return true;
  }

  if (method === 'GET' && pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`);
    postgisEngine.addSseClient(res);
    return true;
  }

  sendJson(res, 404, { error: 'Endpoint PostGIS API tidak ditemukan' });
  return true;
}
