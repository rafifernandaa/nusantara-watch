export type ThemeMode = 'dark' | 'light';

export type BasemapStyle = 'dark-glass' | 'light-glass' | 'satellite' | 'terrain';

export type LayerId = 'hotspots' | 'concessions' | 'budgets' | 'wind-ispu';

export type AnomalyLevel = 'Disproportionate' | 'Elevated' | 'Normal';

export type BnpbSnapshotMode = 'live-api' | 'excel-sheet';

export type BnpbPortalId = 'sipongi' | 'bmkg-polutan' | 'ispu-klhk' | 'pu-sitaba';

export interface FieldDocumentationItem {
  id: string;
  title: string;
  driveUrl: string;
  thumbnailDataUri: string;
  mediaType: 'photo' | 'folder' | 'report';
  team: string;
  capturedAt: string;
  caption: string;
  province: string;
  coordinates: [number, number];
  hotspotId?: string;
}

export interface HotspotFeature {
  id: string;
  satellite: 'VIIRS SNPP' | 'VIIRS NOAA-20' | 'MODIS Terra';
  coordinates: [number, number]; // [lng, lat]
  frpMw: number;
  brightnessK: number;
  confidence: number;
  persistenceHours: number;
  dayOffset: number; // -6 to 0 (0 = Latest / Nov 9, 2026)
  timestamp: string;
  province: string;
  kabupaten: string;
  kecamatan: string;
  isPeatland: boolean;
  peatDepthMeters: number;
  inConcession: boolean;
  concessionHolder: string | null;
  concessionType:
    | 'HTI (Pulpwood)'
    | 'HGU (Sawit / Palm Oil)'
    | 'Kawasan Hutan Lindung'
    | 'Lahan Masyarakat';
  nearestDaops: {
    name: string;
    distanceKm: number;
    waterBombingReady: boolean;
  };
  nearestIspuStation: {
    name: string;
    ispuScore: number;
    pm25: number;
    category: 'Baik' | 'Sedang' | 'Tidak Sehat' | 'Sangat Tidak Sehat' | 'Berbahaya';
  };
  fieldDocs?: FieldDocumentationItem[];
}

export interface ConcessionPolygon {
  id: string;
  name: string;
  holderGroup: string;
  type: 'HTI (Pulpwood)' | 'HGU (Sawit / Palm Oil)' | 'Kesatuan Hidrologis Gambut (KHG)';
  province: string;
  areaHectares: number;
  activeHotspotCount: number;
  coordinates: [number, number][];
}

export interface BudgetPackage {
  sirupId: string;
  packageName: string;
  agency: string;
  province: string;
  coordinates: [number, number];
  targetHotspotClusterCoords: [number, number];
  budgetRp: number;
  category:
    | 'Aplikasi & Dashboard IT'
    | 'Drone & Kamera Termal'
    | 'Sosialisasi & Rapat'
    | 'Operasi Patroli & Sekat Kanal';
  anomalyLevel: AnomalyLevel;
  anomalyReason: string;
  provinceActiveHotspots: number;
}

export interface WindIspuStation {
  id: string;
  stationName: string;
  province: string;
  coordinates: [number, number];
  ispu: number;
  pm25UgM3: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  fdrsLevel: 'Rendah' | 'Sedang' | 'Tinggi' | 'Ekstrem';
}

export interface ProviderKeys {
  nasaFirmsMapKey: string;
  geminiApiKey: string;
  maptilerKey: string;
}

export interface BnpbPersonnelBreakdown {
  bpbd: number;
  pemerintahPusat: number;
  tni: number;
  polri: number;
  pemda: number;
  relawan: number;
  polisiHutan: number;
  manggalaAgni: number;
  mpa: number;
  satpolPp: number;
  perusahaan: number;
  totalPersonel: number;
}

export interface BnpbAerialOperations {
  patroliUnit: number;
  patroliSortie: number;
  wbUnit: number;
  wbSortie: number;
  jumlahWbHarian: number;
  volumeWbLtr: number;
  omcUnit: number;
  omcSortie: number;
  totalBahanSemaiKg: number;
  luasDitanganiUdaraHa: number;
  totalUnitUdaraHariIni: number;
  unitPatroliStandby: number;
  unitWbStandby: number;
  unitOmcStandby: number;
  totalUnitStandby: number;
}

export interface BnpbKarhutlaRecord {
  shortProvince: 'Riau' | 'Jambi' | 'Sumsel' | 'Kalbar' | 'Kalteng' | 'Kalsel';
  fullProvince: string;
  colorHex: string;
  coordinates: [number, number];
  hotspotRendah: number;
  hotspotSedang: number;
  hotspotTinggi: number;
  totalHotspot: number;
  fireSpot: number;
  excelTotalHotspot: number;
  excelFireSpot: number;
  lahanTerbakarIndikatifHa: number;
  kualitasUdaraPm25Text: string;
  pm25UgM3: number;
  airQualityStatus: 'Baik' | 'Sedang' | 'Tidak Sehat' | 'Sangat Tidak Sehat' | 'Berbahaya';
  excelAirQualityRange: string;
  jarakPandangBandaraKm: string;
  lahanTerbakarHarianHa: number;
  excelLahanTerbakarHarianHa: number;
  luasTerbakarCenturiskHa: number | null;
  luasBelumPadamCenturiskHa: number;
  mdL: string;
  mdP: string;
  totalMd: string;
  kabkotTerdampak: number;
  luasDitanganiDaratHa: number;
  luasAkanDipadamkanHa: number;
  excelLuasAkanDipadamkanHa: number;
  personnel: BnpbPersonnelBreakdown;
  aerial: BnpbAerialOperations;
  rekomendasi: string;
  kesimpulan: string;
  dokumentasiLapanganUrl?: string;
}

export interface BnpbIntegratedPortal {
  id: BnpbPortalId;
  shortLabel: string;
  title: string;
  subtitle: string;
  agency: string;
  embedUrl: string;
  framingNote: string;
}

export interface BnpbSecurityFinding {
  id: string;
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  bnpbObservation: string;
  nusantaraWatchDefense: string;
  reaEvidenceRef: string;
}

export type BackendConnectionMode = 'postgis-live' | 'postgis-standby' | 'local-seed';

export interface GoogleSheetsSyncStatus {
  enabled: boolean;
  sheetId: string;
  sheetName: string;
  pollIntervalSec: number;
  lastCheckedAt: string | null;
  lastChangedAt: string | null;
  lastHash: string | null;
  syncCount: number;
  lastError: string | null;
  webhookEndpoint: string;
}

export interface PostgisHealthStatus {
  status: 'ok';
  engine: 'postgis-native' | 'postgis-standby-memory';
  postgisVersion: string;
  srid: 4326;
  arcgisQueryLayerReady: boolean;
  qgisLayerStylesReady: boolean;
  qgisConnectionUri: string;
  martinTileServerUrl: string;
  tables: {
    bnpbSitrep47Col: number;
    hotspotsFirms: number;
    concessionsKhg: number;
    sirupBudgetArcs: number;
    bmkgAqStations: number;
  };
  lastSyncAt: string;
  googleSheetsSync?: GoogleSheetsSyncStatus;
}

export interface PostgisBootstrapPayload {
  health: PostgisHealthStatus;
  bnpbRecords: BnpbKarhutlaRecord[];
  hotspots: HotspotFeature[];
  concessions: ConcessionPolygon[];
  sirupPackages: BudgetPackage[];
  windStations: WindIspuStation[];
}

export interface GisChangeNotification {
  schema: 'bnpb' | 'spatial';
  table: string;
  op: 'INSERT' | 'UPDATE' | 'DELETE' | 'SYNC';
  objectid?: number;
  summary: string;
  ts: string;
}

