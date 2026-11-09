import { create } from 'zustand';
import {
  INDONESIA_DEFAULT_CAMERA,
  INDONESIAN_HOTSPOTS,
  SIRUP_BUDGET_PACKAGES,
} from '../data/local_data/indonesia-osint-seed';
import type { BasemapStyle, LayerId, ProviderKeys } from '../types/watch';

export interface CameraTarget {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  transitionToken: number;
}

interface WatchState {
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
  isPowerUpOpen: boolean;
  cameraTarget: CameraTarget;
  providerKeys: ProviderKeys;

  setBasemap: (basemap: BasemapStyle) => void;
  toggleGlobeProjection: () => void;
  toggleLayer: (layer: LayerId) => void;
  selectHotspot: (id: string | null) => void;
  selectBudget: (sirupId: string | null) => void;
  setProvinceFilter: (province: string) => void;
  setTimelineDayOffset: (offset: number) => void;
  setCumulativeTimeline: (cumulative: boolean) => void;
  setIsPlayingTimeline: (playing: boolean) => void;
  setBudgetWatchdogOpen: (open: boolean) => void;
  setPowerUpOpen: (open: boolean) => void;
  flyToCoordinates: (lng: number, lat: number, zoom?: number, pitch?: number) => void;
  resetGlobe: () => void;
  saveProviderKeys: (keys: ProviderKeys) => void;
  syncStateToUrl: () => string;
  hydrateFromUrl: () => void;
}

const STORAGE_KEY = 'nusantara_watch_provider_keys_v1';

function loadStoredKeys(): ProviderKeys {
  if (typeof window === 'undefined') {
    return { nasaFirmsMapKey: '', geminiApiKey: '', maptilerKey: '' };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { nasaFirmsMapKey: '', geminiApiKey: '', maptilerKey: '' };
    const parsed = JSON.parse(raw) as Partial<ProviderKeys>;
    return {
      nasaFirmsMapKey: parsed.nasaFirmsMapKey ?? '',
      geminiApiKey: parsed.geminiApiKey ?? '',
      maptilerKey: parsed.maptilerKey ?? '',
    };
  } catch {
    return { nasaFirmsMapKey: '', geminiApiKey: '', maptilerKey: '' };
  }
}

export const useWatchStore = create<WatchState>((set, get) => ({
  basemap: 'dark-glass',
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
  isPowerUpOpen: false,
  cameraTarget: {
    ...INDONESIA_DEFAULT_CAMERA,
    transitionToken: 0,
  },
  providerKeys: loadStoredKeys(),

  setBasemap: (basemap) => {
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
    const found = INDONESIAN_HOTSPOTS.find((h) => h.id === id);
    if (found) {
      set((state) => ({
        selectedHotspotId: id,
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
      set({ selectedHotspotId: id });
    }
    get().syncStateToUrl();
  },

  selectBudget: (sirupId) => {
    if (!sirupId) {
      set({ selectedBudgetId: null });
      return;
    }
    const pkg = SIRUP_BUDGET_PACKAGES.find((b) => b.sirupId === sirupId);
    if (pkg) {
      const midLng = (pkg.coordinates[0] + pkg.targetHotspotClusterCoords[0]) / 2;
      const midLat = (pkg.coordinates[1] + pkg.targetHotspotClusterCoords[1]) / 2;
      set((state) => ({
        selectedBudgetId: sirupId,
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

  setProvinceFilter: (province) => {
    set({ selectedProvinceFilter: province });
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
    set({ isBudgetWatchdogOpen: open });
  },

  setPowerUpOpen: (open) => {
    set({ isPowerUpOpen: open });
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
      cameraTarget: {
        ...INDONESIA_DEFAULT_CAMERA,
        transitionToken: state.cameraTarget.transitionToken + 1,
      },
    }));
    get().syncStateToUrl();
  },

  saveProviderKeys: (keys) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
      } catch {
        // Ignore storage quota errors
      }
    }
    set({ providerKeys: keys });
  },

  syncStateToUrl: () => {
    if (typeof window === 'undefined') return '';
    const state = get();
    const params = new URLSearchParams();
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
    const bm = params.get('bm') as BasemapStyle | null;
    if (bm && ['dark-glass', 'satellite', 'terrain'].includes(bm)) {
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
