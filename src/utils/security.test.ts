import { describe, expect, it } from 'vitest';
import {
  BNPB_EXPORT_COLUMNS,
  buildSafeKarhutlaCsv,
  isAllowedPortalUrl,
  parseSafeNumber,
  sanitizeCsvCell,
  sanitizePlainText,
} from './security';
import { BNPB_KARHUTLA_2026_RECORDS } from '../data/local_data/bnpb-karhutla-2026';

describe('security hardening utilities', () => {
  it('strips HTML tags while decoding benign entity-escaped comparison operators', () => {
    expect(sanitizePlainText('&lt; 10 km')).toBe('< 10 km');
    expect(sanitizePlainText('<b>Baik</b> &amp; Aman')).toBe('Baik & Aman');
    expect(sanitizePlainText('Normal <img src=x> text')).toBe('Normal  text');
  });

  it('coerces untrusted strings and placeholders into finite numbers safely', () => {
    expect(parseSafeNumber(42.5)).toBe(42.5);
    expect(parseSafeNumber('13,8')).toBe(13.8);
    expect(parseSafeNumber('-')).toBe(0);
    expect(parseSafeNumber('', 9)).toBe(9);
  });

  it('enforces HTTPS and the explicit BNPB integrated portal hostname allowlist', () => {
    expect(isAllowedPortalUrl('https://sipongi.gakkum.kehutanan.go.id/')).toBe(true);
    expect(isAllowedPortalUrl('https://cews.bmkg.go.id/peta-sebaran-polutan-asap.php')).toBe(true);
    expect(isAllowedPortalUrl('http://sipongi.gakkum.kehutanan.go.id/')).toBe(false);
    expect(isAllowedPortalUrl('https://example.com/map')).toBe(false);
  });

  it('neutralizes leading spreadsheet formula prefixes while preserving standalone "-" and negative numbers', () => {
    expect(sanitizeCsvCell('-')).toBe('"-"');
    expect(sanitizeCsvCell(-12.5)).toBe('-12.5');
    expect(sanitizeCsvCell('-12.5')).toBe('"-12.5"');
    expect(sanitizeCsvCell('=SUM(A1:A5)')).toBe('"\'=SUM(A1:A5)"');
    expect(sanitizeCsvCell('+100-200')).toBe('"\'+100-200"');
    expect(sanitizeCsvCell('@RISK')).toBe('"\'@RISK"');
  });

  it('builds a UTF-8 BOM 47-column CSV matching the BNPB Karhutla 2026 schema', () => {
    const csv = buildSafeKarhutlaCsv(BNPB_KARHUTLA_2026_RECORDS, 'live-api');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines.length).toBe(BNPB_KARHUTLA_2026_RECORDS.length + 1);
    expect(BNPB_EXPORT_COLUMNS.length).toBe(47);
    expect(lines[0]).toContain('"Provinsi"');
    expect(lines[1]).toContain('"Riau"');
  });
});
