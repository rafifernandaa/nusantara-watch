import type { HotspotFeature } from '../types/watch';

/**
 * Formats Indonesian Rupiah values cleanly for civic watchdog displays.
 */
export function formatRupiah(amount: number, compact = true): string {
  if (!Number.isFinite(amount)) return 'Rp 0';
  if (compact) {
    if (Math.abs(amount) >= 1_000_000_000_000) {
      const val = (amount / 1_000_000_000_000).toLocaleString('id-ID', {
        maximumFractionDigits: 2,
      });
      return `Rp ${val} Triliun`;
    }
    if (Math.abs(amount) >= 1_000_000_000) {
      const val = (amount / 1_000_000_000).toLocaleString('id-ID', {
        maximumFractionDigits: 2,
      });
      return `Rp ${val} Miliar`;
    }
    if (Math.abs(amount) >= 1_000_000) {
      const val = (amount / 1_000_000).toLocaleString('id-ID', {
        maximumFractionDigits: 1,
      });
      return `Rp ${val} Juta`;
    }
  }
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
}

/**
 * Formats WGS84 coordinates into crisp geographic strings.
 */
export function formatCoordinates(lng: number, lat: number): string {
  const latDir = lat >= 0 ? 'LU' : 'LS';
  const lngDir = lng >= 0 ? 'BT' : 'BB';
  return `${Math.abs(lat).toFixed(3)}° ${latDir}, ${Math.abs(lng).toFixed(3)}° ${lngDir}`;
}

const TIMELINE_DATES: Record<number, string> = {
  [-6]: '3 Nov 2026',
  [-5]: '4 Nov 2026',
  [-4]: '5 Nov 2026',
  [-3]: '6 Nov 2026',
  [-2]: '7 Nov 2026',
  [-1]: '8 Nov 2026',
  [0]: '9 Nov 2026 · Hari Ini',
};

export function getDayLabel(dayOffset: number): string {
  return TIMELINE_DATES[dayOffset] ?? '9 Nov 2026';
}

export function filterHotspots(
  hotspots: readonly HotspotFeature[],
  provinceFilter: string,
  dayOffset: number,
  cumulative: boolean
): HotspotFeature[] {
  return hotspots.filter((h) => {
    const matchesProvince = provinceFilter === 'ALL' || h.province === provinceFilter;
    const matchesTime = cumulative ? h.dayOffset <= dayOffset : h.dayOffset === dayOffset;
    return matchesProvince && matchesTime;
  });
}
