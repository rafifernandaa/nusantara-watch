import type {
  BnpbKarhutlaRecord,
  GisChangeNotification,
  GoogleSheetsSyncStatus,
  HotspotFeature,
  PostgisBootstrapPayload,
  PostgisHealthStatus,
} from '../types/watch';

const API_BASE = '/api';

/**
 * Fetches the initial PostGIS + BNPB Karhutla 2026 bootstrap payload.
 * Returns null cleanly if running in pure static mode without the API middleware.
 */
export async function fetchPostgisBootstrap(): Promise<PostgisBootstrapPayload | null> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return null;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2000);
  try {
    const res = await fetch(`${API_BASE}/bootstrap`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as PostgisBootstrapPayload;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Sends a 47-column BNPB province sitrep update to `/api/bnpb/sync` (PostGIS upsert).
 */
export async function syncBnpbProvinceToPostgis(
  payload: Omit<Partial<BnpbKarhutlaRecord>, 'shortProvince'> & { shortProvince: string }
): Promise<BnpbKarhutlaRecord | null> {
  try {
    const res = await fetch(`${API_BASE}/bnpb/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { status: string; record?: BnpbKarhutlaRecord };
    return data.record ?? null;
  } catch {
    return null;
  }
}

/**
 * Inserts a new satellite/field hotspot into `/api/spatial/hotspots`, triggering
 * the PostGIS `ST_Intersects` concession/KHG enrichment and `LISTEN / NOTIFY` broadcast.
 */
export async function insertHotspotToPostgis(input: {
  coordinates: [number, number];
  frpMw?: number;
  brightnessK?: number;
  confidence?: number;
  province?: string;
  kabupaten?: string;
  kecamatan?: string;
}): Promise<HotspotFeature | null> {
  try {
    const res = await fetch(`${API_BASE}/spatial/hotspots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { status: string; hotspot?: HotspotFeature };
    return data.hotspot ?? null;
  } catch {
    return null;
  }
}

/**
 * Subscribes to Server-Sent Events (`/api/events`) backed by PostgreSQL `LISTEN gis_changes`.
 */
export function subscribeToPostgisEvents(
  onGisChange: (notification: GisChangeNotification) => void
): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }
  try {
    const source = new EventSource(`${API_BASE}/events`);
    source.addEventListener('gis_change', (event) => {
      try {
        const parsed = JSON.parse((event as MessageEvent).data) as GisChangeNotification;
        onGisChange(parsed);
      } catch {
        // Ignore malformed event payloads
      }
    });
    return () => {
      source.close();
    };
  } catch {
    return () => {};
  }
}

export interface GoogleSheetsStatusResponse {
  status: string;
  googleSheetsSync: GoogleSheetsSyncStatus;
  appsScriptCode: string;
}

/**
 * Fetches current Google Sheets polling status and the ready-to-paste Apps Script webhook code.
 */
export async function fetchGoogleSheetsStatusApi(): Promise<GoogleSheetsStatusResponse | null> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') return null;
  try {
    const res = await fetch(`${API_BASE}/bnpb/gsheets/status`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as GoogleSheetsStatusResponse;
  } catch {
    return null;
  }
}

/**
 * Configures the Google Sheet URL/ID and polling interval for automated one-way PostGIS sync.
 */
export async function configureGoogleSheetsApi(config: {
  sheetUrlOrId: string;
  sheetName?: string;
  pollIntervalSec?: number;
  enabled?: boolean;
}): Promise<{
  googleSheetsSync: GoogleSheetsSyncStatus;
  health?: PostgisHealthStatus;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/bnpb/gsheets/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      googleSheetsSync: GoogleSheetsSyncStatus;
      health?: PostgisHealthStatus;
    };
  } catch {
    return null;
  }
}

/**
 * Triggers an immediate Google Sheet pull/diff cycle (or simulated posko row edit).
 */
export async function triggerGoogleSheetsPullApi(opts?: {
  simulatePoskoEdit?: boolean;
  csvText?: string;
}): Promise<{
  updatedCount: number;
  changed: boolean;
  status: GoogleSheetsSyncStatus;
  health?: PostgisHealthStatus;
} | null> {
  try {
    const res = await fetch(`${API_BASE}/bnpb/gsheets/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts ?? {}),
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      updatedCount: number;
      changed: boolean;
      status: GoogleSheetsSyncStatus;
      health?: PostgisHealthStatus;
    };
  } catch {
    return null;
  }
}
