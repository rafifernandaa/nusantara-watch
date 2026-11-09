import { describe, expect, it } from 'vitest';
import { INDONESIAN_HOTSPOTS } from '../data/local_data/indonesia-osint-seed';
import {
  filterHotspots,
  formatCoordinates,
  formatRupiah,
  getDayLabel,
} from './formatters';

describe('formatters & spatial filter utilities', () => {
  it('formats Rupiah values in compact and full Indonesian notation', () => {
    expect(formatRupiah(14_850_000_000)).toContain('Miliar');
    expect(formatRupiah(450_000_000)).toContain('Juta');
    expect(formatRupiah(10_000, false)).toContain('10.000');
  });

  it('formats WGS84 coordinates with Indonesian LU/LS/BT notation', () => {
    expect(formatCoordinates(101.724, 0.562)).toBe('0.562° LU, 101.724° BT');
    expect(formatCoordinates(114.128, -2.426)).toBe('2.426° LS, 114.128° BT');
  });

  it('filters hotspots accurately by province and timeline offset', () => {
    const allToday = filterHotspots(INDONESIAN_HOTSPOTS, 'ALL', 0, true);
    expect(allToday.length).toBe(INDONESIAN_HOTSPOTS.length);

    const riauOnly = filterHotspots(INDONESIAN_HOTSPOTS, 'Riau', 0, true);
    expect(riauOnly.every((h) => h.province === 'Riau')).toBe(true);
    expect(riauOnly.length).toBe(3);

    const exactToday = filterHotspots(INDONESIAN_HOTSPOTS, 'ALL', 0, false);
    expect(exactToday.every((h) => h.dayOffset === 0)).toBe(true);
  });

  it('returns human-readable timeline date labels', () => {
    expect(getDayLabel(0)).toContain('Hari Ini');
    expect(getDayLabel(-6)).toBe('3 Nov 2026');
  });
});
