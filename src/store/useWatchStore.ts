import { create } from 'zustand';
import {
  INDONESIA_DEFAULT_CAMERA,
  INDONESIAN_HOTSPOTS,
  SIRUP_BUDGET_PACKAGES,
} from '../data/local_data/indonesia-osint-seed';
import {
  BNPB_KARHUTLA_2026_RECORDS,
  toFullProvinceName,
} from '../data/local_data/bnpb-karhutla-2026';
import {
  configureGoogleSheetsApi,
  fetchPostgisBootstrap,
  insertHotspotToPostgis,
  triggerGoogleSheetsPullApi,
} from '../services/postgisApi';
import { sanitizePlainText } from '../utils/security';
import type {
  BackendConnectionMode,
  BasemapStyle,
  BnpbKarhutlaRecord,
  BnpbSnapshotMode,
  FieldDocumentationItem,
  GisChangeNotification,
  HotspotFeature,
  LayerId,
  PostgisHealthStatus,
  ProviderKeys,
  ThemeMode,
} from '../types/watch';

export interface CameraTarget {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionToken: number;
}

interface WatchState {
  theme: ThemeMode;
  basemap: BasemapStyle;
  isGlobeProjection: boolean;
  activeLayers: Record<LayerId, boolean>;
  selectedHotspotId: string | null;
  selectedBudgetId: string | null;
  selectedProvinceFilter: string;
  /** -6 (Nov 3) to 0 (Nov 9 / Live) */
  timelineDayOffset: number;
  /** If true, shows cumulative hotspots up to timelineDayOffset; if false, only exact day */
  cumulativeTimeline: boolean;
  isPlayingTimeline: boolean;
  isBudgetWatchdogOpen: boolean;
  isBnpbCommandOpen: boolean;
  bnpbSnapshotMode: BnpbSnapshotMode;
  lastBnpbRefreshedAt: string;
  isPowerUpOpen: boolean;
  cameraTarget: CameraTarget;
  providerKeys: ProviderKeys;

  /** Hybrid PostGIS + Local Seed state */
  backendMode: BackendConnectionMode;
  postgisHealth: PostgisHealthStatus | null;
  bnpbRecords: BnpbKarhutlaRecord[];
  hotspots: HotspotFeature[];
  lastGisNotification: GisChangeNotification | null;

  /** Field Documentation (Google Drive) Lightbox & Custom Evidence */
  activeEvidenceModalDoc: FieldDocumentationItem | null;
  customFieldDocs: FieldDocumentationItem[];

  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setBasemap: (basemap: BasemapStyle) => void;
  toggleGlobeProjection: () => void;
  toggleLayer: (layer: LayerId) => void;
  selectHotspot: (id: string | null) => void;
  selectBudget: (sirupId: string | null) => void;
  setProvinceFilter: (province: string, flyToProvince?: boolean) => void;
  setTimelineDayOffset: (offset: number) => void;
  setCumulativeTimeline: (cumulative: boolean) => void;
  setIsPlayingTimeline: (playing: boolean) => void;
  setBudgetWatchdogOpen: (open: boolean) => void;
  setBnpbCommandOpen: (open: boolean) => void;
  setBnpbSnapshotMode: (mode: BnpbSnapshotMode) => void;
  refreshBnpbData: () => void;
  hydrateFromPostgis: () => Promise<void>;
  simulateQgisDigitizeHotspot: (coordinates?: [number, number]) => Promise<HotspotFeature | null>;
  configureGoogleSheets: (sheetUrlOrId: string, pollIntervalSec?: number, sheetName?: string) => Promise<boolean>;
  simulateGoogleSheetPoskoEdit: () => Promise<boolean>;
  applyGisChangeNotification: (notification: GisChangeNotification) => void;
  setPowerUpOpen: (open: boolean) => void;
  setActiveEvidenceModalDoc: (doc: FieldDocumentationItem | null) => void;
  addCustomFieldDoc: (doc: FieldDocumentationItem) => void;
  flyToCoordinates: (lng: number, lat: number, zoom?: number, pitch?: number) => void;
  resetGlobe: () => void;
  saveProviderKeys: (keys: ProviderKeys) => void;
  syncStateToUrl: () => string;
  hydrateFromUrl: () => void;
}

const STORAGE_KEY = 'nusantara_watch_provider_keys_v1';
const THEME_STORAGE_KEY = 'nusantara_watch_theme_v1';

const ALLOWED_BASEMAPS = new Set<BasemapStyle>([
  'dark-glass',
  'light-glass',
  'satellite',
  'terrain',
]);

function applyThemeToDocument(theme: ThemeMode): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
}

function loadStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') {
      applyThemeToDocument(raw);
      return raw;
    }
  } catch {
    // Ignore storage read errors
  }
  applyThemeToDocument('dark');
  return 'dark';
}

function loadStoredKeys(): ProviderKeys {
  if (typeof window === 'undefined') {
    return { nasaFirmsMapKey: '', geminiApiKey: '', maptilerKey: '' };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { nasaFirmsMapKey: '', geminiApiKey: '', maptilerKey: '' };
    const parsed = JSON.parse(raw) as Partial<ProviderKeys>;
    return {
      nasaFirmsMapKey: sanitizePlainText(parsed.nasaFirmsMapKey ?? ''),
      geminiApiKey: sanitizePlainText(parsed.geminiApiKey ?? ''),
      maptilerKey: sanitizePlainText(parsed.maptilerKey ?? ''),
    };
  } catch {
    return { nasaFirmsMapKey: '', geminiApiKey: '', maptilerKey: '' };
  }
}

const initialTheme = loadStoredTheme();

export const useWatchStore = create<WatchState>((set, get) => ({
  theme: initialTheme,
  basemap: initialTheme === 'light' ? 'light-glass' : 'dark-glass',
  isGlobeProjection: true,
  activeLayers: {
    hotspots: true,
    concessions: true,
    budgets: true,
    'wind-ispu': true,
  },
  selectedHotspotId: null,
  selectedBudgetId: null,
  selectedProvinceFilter: 'ALL',
  timelineDayOffset: 0,
  cumulativeTimeline: true,
  isPlayingTimeline: false,
  isBudgetWatchdogOpen: false,
  isBnpbCommandOpen: false,
  bnpbSnapshotMode: 'live-api',
  lastBnpbRefreshedAt: '10 Nov 2026 · Update BNPB',
  isPowerUpOpen: false,
  cameraTarget: {
    ...INDONESIA_DEFAULT_CAMERA,
    transitionToken: 0,
  },
  providerKeys: loadStoredKeys(),

  backendMode: 'local-seed',
  postgisHealth: null,
  bnpbRecords: BNPB_KARHUTLA_2026_RECORDS,
  hotspots: INDONESIAN_HOTSPOTS,
  lastGisNotification: null,

  activeEvidenceModalDoc: null,
  customFieldDocs: [],

  setTheme: (theme) => {
    applyThemeToDocument(theme);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // Ignore storage quota errors
      }
    }
    set((state) => {
      let nextBasemap = state.basemap;
      if (theme === 'light' && state.basemap === 'dark-glass') {
        nextBasemap = 'light-glass';
      } else if (theme === 'dark' && state.basemap === 'light-glass') {
        nextBasemap = 'dark-glass';
      }
      return { theme, basemap: nextBasemap };
    });
    get().syncStateToUrl();
  },

  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },

  setBasemap: (basemap) => {
    if (!ALLOWED_BASEMAPS.has(basemap)) return;
    set({ basemap });
    get().syncStateToUrl();
  },

  toggleGlobeProjection: () => {
    set((state) => ({ isGlobeProjection: !state.isGlobeProjection }));
  },

  toggleLayer: (layer) => {
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [layer]: !state.activeLayers[layer],
      },
    }));
    get().syncStateToUrl();
  },

  selectHotspot: (id) => {
    if (!id) {
      set({ selectedHotspotId: null });
      get().syncStateToUrl();
      return;
    }
    const cleanId = sanitizePlainText(id);
    const found = get().hotspots.find((h) => h.id === cleanId);
    if (found) {
      set((state) => ({
        selectedHotspotId: found.id,
        selectedBudgetId: null,
        cameraTarget: {
          longitude: found.coordinates[0],
          latitude: found.coordinates[1],
          zoom: 8.6,
          pitch: 45,
          bearing: -12,
          transitionToken: state.cameraTarget.transitionToken + 1,
        },
      }));
    } else {
      set({ selectedHotspotId: null });
    }
    get().syncStateToUrl();
  },

  selectBudget: (sirupId) => {
    if (!sirupId) {
      set({ selectedBudgetId: null });
      return;
    }
    const cleanId = sanitizePlainText(sirupId);
    const pkg = SIRUP_BUDGET_PACKAGES.find((b) => b.sirupId === cleanId);
    if (pkg) {
      const midLng = (pkg.coordinates[0] + pkg.targetHotspotClusterCoords[0]) / 2;
      const midLat = (pkg.coordinates[1] + pkg.targetHotspotClusterCoords[1]) / 2;
      set((state) => ({
        selectedBudgetId: pkg.sirupId,
        activeLayers: { ...state.activeLayers, budgets: true, hotspots: true },
        cameraTarget: {
          longitude: midLng,
          latitude: midLat,
          zoom: 7.8,
          pitch: 48,
          bearing: 15,
          transitionToken: state.cameraTarget.transitionToken + 1,
        },
      }));
    }
  },

  setProvinceFilter: (province, flyToProvince = false) => {
    const normalized = toFullProvinceName(sanitizePlainText(province) || 'ALL');
    set({ selectedProvinceFilter: normalized });

    if (flyToProvince) {
      if (normalized === 'ALL') {
        set((state) => ({
          cameraTarget: {
            ...INDONESIA_DEFAULT_CAMERA,
            transitionToken: state.cameraTarget.transitionToken + 1,
          },
        }));
      } else {
        const bnpbMatch = get().bnpbRecords.find(
          (r) => r.fullProvince === normalized || r.shortProvince === province
        );
        if (bnpbMatch) {
          set((state) => ({
            cameraTarget: {
              longitude: bnpbMatch.coordinates[0],
              latitude: bnpbMatch.coordinates[1],
              zoom: 6.8,
              pitch: 38,
              bearing: 0,
              transitionToken: state.cameraTarget.transitionToken + 1,
            },
          }));
        }
      }
    }
  },

  setTimelineDayOffset: (offset) => {
    const clamped = Math.max(-6, Math.min(0, Math.round(offset)));
    set({ timelineDayOffset: clamped });
  },

  setCumulativeTimeline: (cumulative) => {
    set({ cumulativeTimeline: cumulative });
  },

  setIsPlayingTimeline: (playing) => {
    set({ isPlayingTimeline: playing });
  },

  setBudgetWatchdogOpen: (open) => {
    set((state) => ({
      isBudgetWatchdogOpen: open,
      isBnpbCommandOpen: open ? false : state.isBnpbCommandOpen,
    }));
  },

  setBnpbCommandOpen: (open) => {
    set((state) => ({
      isBnpbCommandOpen: open,
      isBudgetWatchdogOpen: open ? false : state.isBudgetWatchdogOpen,
    }));
  },

  setBnpbSnapshotMode: (mode) => {
    set({ bnpbSnapshotMode: mode });
  },

  refreshBnpbData: () => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    set({
      lastBnpbRefreshedAt: `Disinkronkan ${timeStr} WIB`,
    });
    void get().hydrateFromPostgis();
  },

  hydrateFromPostgis: async () => {
    const payload = await fetchPostgisBootstrap();
    if (!payload) {
      set({ backendMode: 'local-seed' });
      return;
    }
    const mode: BackendConnectionMode =
      payload.health.engine === 'postgis-native' ? 'postgis-live' : 'postgis-standby';
    const timeStr = new Date(payload.health.lastSyncAt).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    set({
      backendMode: mode,
      postgisHealth: payload.health,
      bnpbRecords: payload.bnpbRecords,
      hotspots: payload.hotspots,
      lastBnpbRefreshedAt: `PostGIS Sync · ${timeStr} WIB`,
    });
  },

  simulateQgisDigitizeHotspot: async (coordinates) => {
    const targetCoords: [number, number] = coordinates ?? [
      113.98 + (Math.random() - 0.5) * 0.25,
      -2.35 + (Math.random() - 0.5) * 0.25,
    ];
    const created = await insertHotspotToPostgis({
      coordinates: targetCoords,
      frpMw: Number((95 + Math.random() * 45).toFixed(1)),
      brightnessK: 364.2,
      confidence: 99,
      kabupaten: 'Pulang Pisau (Digitasi QGIS/ArcGIS)',
      kecamatan: 'Blok KHG Kahayan - Sebangau',
    });
    if (created) {
      await get().hydrateFromPostgis();
      get().selectHotspot(created.id);
      return created;
    }
    return null;
  },

  applyGisChangeNotification: (notification) => {
    set({ lastGisNotification: notification });
    void get().hydrateFromPostgis();
  },

  configureGoogleSheets: async (sheetUrlOrId, pollIntervalSec = 20, sheetName = 'Data Karhutla') => {
    const cleanUrlOrId = sanitizePlainText(sheetUrlOrId);
    const result = await configureGoogleSheetsApi({
      sheetUrlOrId: cleanUrlOrId,
      sheetName: sanitizePlainText(sheetName) || 'Data Karhutla',
      pollIntervalSec,
      enabled: Boolean(cleanUrlOrId),
    });
    if (!result) return false;
    await get().hydrateFromPostgis();
    return Boolean(!result.googleSheetsSync.lastError);
  },

  simulateGoogleSheetPoskoEdit: async () => {
    const result = await triggerGoogleSheetsPullApi({ simulatePoskoEdit: true });
    if (!result) return false;
    await get().hydrateFromPostgis();
    return result.changed;
  },

  setPowerUpOpen: (open) => {
    set({ isPowerUpOpen: open });
  },

  setActiveEvidenceModalDoc: (doc) => {
    set({ activeEvidenceModalDoc: doc });
  },

  addCustomFieldDoc: (doc) => {
    set((state) => ({
      customFieldDocs: [doc, ...state.customFieldDocs],
    }));
  },

  flyToCoordinates: (lng, lat, zoom = 8.2, pitch = 42) => {
    set((state) => ({
      cameraTarget: {
        longitude: lng,
        latitude: lat,
        zoom,
        pitch,
        bearing: 0,
        transitionToken: state.cameraTarget.transitionToken + 1,
      },
    }));
  },

  resetGlobe: () => {
    set((state) => ({
      selectedHotspotId: null,
      selectedBudgetId: null,
      selectedProvinceFilter: 'ALL',
      timelineDayOffset: 0,
      isPlayingTimeline: false,
      hotspots: INDONESIAN_HOTSPOTS,
      bnpbRecords: BNPB_KARHUTLA_2026_RECORDS,
      cameraTarget: {
        ...INDONESIA_DEFAULT_CAMERA,
        transitionToken: state.cameraTarget.transitionToken + 1,
      },
    }));
    get().syncStateToUrl();
  },

  saveProviderKeys: (keys) => {
    const sanitized: ProviderKeys = {
      nasaFirmsMapKey: sanitizePlainText(keys.nasaFirmsMapKey),
      geminiApiKey: sanitizePlainText(keys.geminiApiKey),
      maptilerKey: sanitizePlainText(keys.maptilerKey),
    };
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      } catch {
        // Ignore storage quota errors
      }
    }
    set({ providerKeys: sanitized });
  },

  syncStateToUrl: () => {
    if (typeof window === 'undefined') return '';
    const state = get();
    const params = new URLSearchParams();
    params.set('th', state.theme);
    params.set('bm', state.basemap);
    const activeList = (Object.keys(state.activeLayers) as LayerId[]).filter(
      (k) => state.activeLayers[k]
    );
    params.set('ly', activeList.join(','));
    if (state.selectedHotspotId) params.set('hs', state.selectedHotspotId);
    if (state.timelineDayOffset !== 0) params.set('day', String(state.timelineDayOffset));
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', url);
    return window.location.href;
  },

  hydrateFromUrl: () => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('setup') === '1') {
      set({ isPowerUpOpen: true });
    }
    if (params.get('bnpb') === '1') {
      set({ isBnpbCommandOpen: true });
    }
    const th = params.get('th');
    if (th === 'light' || th === 'dark') {
      applyThemeToDocument(th);
      set({ theme: th });
    }
    const bm = params.get('bm') as BasemapStyle | null;
    if (bm && ALLOWED_BASEMAPS.has(bm)) {
      set({ basemap: bm });
    }
    const ly = params.get('ly');
    if (ly) {
      const setList = new Set(ly.split(','));
      set({
        activeLayers: {
          hotspots: setList.has('hotspots'),
          concessions: setList.has('concessions'),
          budgets: setList.has('budgets'),
          'wind-ispu': setList.has('wind-ispu'),
        },
      });
    }
    const day = params.get('day');
    if (day !== null && !Number.isNaN(Number(day))) {
      set({ timelineDayOffset: Math.max(-6, Math.min(0, Number(day))) });
    }
    const hs = params.get('hs');
    if (hs) {
      get().selectHotspot(hs);
    }
  },
}));
