import { describe, expect, it } from 'vitest';
import { INDONESIAN_HOTSPOTS } from '../data/local_data/indonesia-osint-seed';
import {
  createCustomFieldDocFromDriveUrl,
  getFieldDocsForHotspot,
  getFieldDocsForProvince,
  parseGoogleDriveLink,
} from './gdriveEvidence';

describe('Google Drive field worker evidence resolver', () => {
  it('parses file, folder, and open?id Google Drive URLs while rejecting non-HTTPS or untrusted URLs', () => {
    const fileRes = parseGoogleDriveLink(
      'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing'
    );
    expect(fileRes.isValidDriveUrl).toBe(true);
    expect(fileRes.kind).toBe('file');
    expect(fileRes.resourceId).toBe('1AbCdEfGhIjKlMnOpQrStUvWxYz');
    expect(fileRes.directImageUrl).toContain('1AbCdEfGhIjKlMnOpQrStUvWxYz');

    const folderRes = parseGoogleDriveLink(
      'https://drive.google.com/drive/folders/1BnpbKarhutla2026KaltengPlg?usp=drive_link'
    );
    expect(folderRes.isValidDriveUrl).toBe(true);
    expect(folderRes.kind).toBe('folder');
    expect(folderRes.resourceId).toBe('1BnpbKarhutla2026KaltengPlg');
    expect(folderRes.embedPreviewUrl).toContain('embeddedfolderview');

    const openRes = parseGoogleDriveLink(
      'https://drive.google.com/open?id=1OpenParamDocId987654321'
    );
    expect(openRes.isValidDriveUrl).toBe(true);
    expect(openRes.kind).toBe('file');
    expect(openRes.resourceId).toBe('1OpenParamDocId987654321');

    const httpRejected = parseGoogleDriveLink(
      'http://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view'
    );
    expect(httpRejected.isValidDriveUrl).toBe(false);

    const untrustedRejected = parseGoogleDriveLink(
      'https://malicious.example.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view'
    );
    expect(untrustedRejected.isValidDriveUrl).toBe(false);
  });

  it('returns curated and custom field documentation matched to hotspots and provinces', () => {
    const kaltengPeak = INDONESIAN_HOTSPOTS.find((h) => h.id === 'FIRMS-IDN-KALTENG-001')!;
    const docs = getFieldDocsForHotspot(kaltengPeak);
    expect(docs.length).toBeGreaterThanOrEqual(1);
    expect(docs[0].hotspotId).toBe('FIRMS-IDN-KALTENG-001');
    expect(docs[0].thumbnailDataUri.startsWith('data:image/svg+xml')).toBe(true);

    const provinceDocs = getFieldDocsForProvince('Kalimantan Tengah');
    expect(provinceDocs.length).toBeGreaterThanOrEqual(2);
  });

  it('sanitizes inputs and constructs custom field documentation entries from Drive URLs', () => {
    const created = createCustomFieldDocFromDriveUrl({
      driveUrl: 'https://drive.google.com/file/d/1CustomPoskoPhoto2026/view',
      title: '<b>Patroli Sekat Kanal</b> &amp; Sumur Bor',
      team: 'Satgas <script>alert(1)</script> BPBD',
      caption: 'Pemadaman gambut kedalaman 4m.',
      province: 'Riau',
      coordinates: [101.724, 0.562],
      hotspotId: 'FIRMS-IDN-RIAU-001',
    });

    expect(created).not.toBeNull();
    expect(created?.title).toBe('Patroli Sekat Kanal & Sumur Bor');
    expect(created?.team).toBe('Satgas alert(1) BPBD');
    expect(created?.mediaType).toBe('photo');
    expect(created?.thumbnailDataUri.startsWith('data:image/svg+xml')).toBe(true);

    const rejected = createCustomFieldDocFromDriveUrl({
      driveUrl: 'javascript:alert(1)',
      province: 'Riau',
      coordinates: [101.724, 0.562],
    });
    expect(rejected).toBeNull();
  });
});
