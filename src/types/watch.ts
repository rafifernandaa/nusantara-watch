export type BasemapStyle = 'dark-glass' | 'satellite' | 'terrain';

export type LayerId = 'hotspots' | 'concessions' | 'budgets' | 'wind-ispu';

export type AnomalyLevel = 'Disproportionate' | 'Elevated' | 'Normal';

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
