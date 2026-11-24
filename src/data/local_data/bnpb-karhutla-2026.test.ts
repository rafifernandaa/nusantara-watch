import { describe, expect, it } from 'vitest';
import {
  aggregateBnpbMetrics,
  BNPB_INTEGRATED_PORTALS,
  BNPB_KARHUTLA_2026_RECORDS,
  BNPB_SECURITY_AUDIT_FINDINGS,
} from './bnpb-karhutla-2026';

describe('BNPB Karhutla 2026 dataset & aggregation', () => {
  it('contains all 6 priority provinces with complete 11-agency personnel and aerial metrics', () => {
    expect(BNPB_KARHUTLA_2026_RECORDS).toHaveLength(6);
    const provinces = BNPB_KARHUTLA_2026_RECORDS.map((r) => r.shortProvince);
    expect(provinces).toEqual(['Riau', 'Jambi', 'Sumsel', 'Kalbar', 'Kalteng', 'Kalsel']);
  });

  it('aggregates national 6-province totals accurately for both live-api and excel-sheet snapshots', () => {
    const liveTotals = aggregateBnpbMetrics(BNPB_KARHUTLA_2026_RECORDS, 'live-api');
    expect(liveTotals.totalHotspot).toBe(188);
    expect(liveTotals.fireSpot).toBe(39);
    expect(liveTotals.luasTerbakar24hHa).toBeCloseTo(377, 2);
    expect(liveTotals.lahanTerbakarIndikatifHa).toBeCloseTo(98208.37, 2);
    expect(liveTotals.totalPersonel).toBe(71878);
    expect(liveTotals.totalUnitUdara).toBe(50);
    expect(liveTotals.totalUnitStandby).toBe(18);
    expect(liveTotals.volumeWbLtr).toBe(1869000);
    expect(liveTotals.totalBahanSemaiKg).toBe(20800);

    const excelTotals = aggregateBnpbMetrics(BNPB_KARHUTLA_2026_RECORDS, 'excel-sheet');
    expect(excelTotals.totalHotspot).toBe(1051);
    expect(excelTotals.fireSpot).toBe(864);
    expect(excelTotals.luasTerbakar24hHa).toBeCloseTo(4473, 2);
    expect(excelTotals.luasAkanDipadamkanHa).toBeCloseTo(1541.25, 2);
  });

  it('filters metrics cleanly by province and exposes 4 integrated portals and 6 security audit findings', () => {
    const kaltengRecords = BNPB_KARHUTLA_2026_RECORDS.filter(
      (r) => r.fullProvince === 'Kalimantan Tengah'
    );
    const kalteng = aggregateBnpbMetrics(kaltengRecords, 'live-api');
    expect(kalteng.scopeLabel).toBe('Provinsi Kalimantan Tengah');
    expect(kalteng.totalHotspot).toBe(36);
    expect(kalteng.fireSpot).toBe(7);
    expect(kalteng.totalPersonel).toBe(16387);

    expect(BNPB_INTEGRATED_PORTALS).toHaveLength(4);
    expect(BNPB_SECURITY_AUDIT_FINDINGS).toHaveLength(6);
  });
});
