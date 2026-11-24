import type { FieldDocumentationItem, HotspotFeature } from '../types/watch';
import { sanitizePlainText } from './security';

const TRUSTED_DRIVE_HOSTS = new Set([
  'drive.google.com',
  'docs.google.com',
  'lh3.googleusercontent.com',
]);

export interface ParsedGoogleDriveLink {
  isValidDriveUrl: boolean;
  kind: 'file' | 'folder' | 'external';
  resourceId: string | null;
  cleanUrl: string;
  directImageUrl: string | null;
  embedPreviewUrl: string | null;
}

/**
 * Safely parses a Google Drive share URL (`/file/d/<ID>`, `/drive/folders/<ID>`,
 * or `/open?id=<ID>`), rejecting non-HTTPS or untrusted hostnames.
 */
export function parseGoogleDriveLink(rawUrl: string): ParsedGoogleDriveLink {
  const sanitized = sanitizePlainText(rawUrl);
  if (!sanitized) {
    return {
      isValidDriveUrl: false,
      kind: 'external',
      resourceId: null,
      cleanUrl: '',
      directImageUrl: null,
      embedPreviewUrl: null,
    };
  }

  try {
    const parsed = new URL(sanitized);
    if (parsed.protocol !== 'https:' || !TRUSTED_DRIVE_HOSTS.has(parsed.hostname)) {
      return {
        isValidDriveUrl: false,
        kind: 'external',
        resourceId: null,
        cleanUrl: '',
        directImageUrl: null,
        embedPreviewUrl: null,
      };
    }

    const cleanUrl = parsed.toString();

    if (parsed.hostname === 'lh3.googleusercontent.com') {
      const segment = parsed.pathname.split('/').filter(Boolean).pop() ?? null;
      return {
        isValidDriveUrl: true,
        kind: 'file',
        resourceId: segment,
        cleanUrl,
        directImageUrl: cleanUrl,
        embedPreviewUrl: null,
      };
    }

    const folderMatch = parsed.pathname.match(/\/drive(?:\/u\/\d+)?\/folders\/([a-zA-Z0-9_-]{8,128})/);
    if (folderMatch?.[1]) {
      const id = folderMatch[1];
      return {
        isValidDriveUrl: true,
        kind: 'folder',
        resourceId: id,
        cleanUrl,
        directImageUrl: null,
        embedPreviewUrl: `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(id)}#grid`,
      };
    }

    const fileMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]{8,128})/);
    if (fileMatch?.[1]) {
      const id = fileMatch[1];
      return {
        isValidDriveUrl: true,
        kind: 'file',
        resourceId: id,
        cleanUrl,
        directImageUrl: `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`,
        embedPreviewUrl: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`,
      };
    }

    const openId = parsed.searchParams.get('id');
    if (openId && /^[a-zA-Z0-9_-]{8,128}$/.test(openId)) {
      return {
        isValidDriveUrl: true,
        kind: 'file',
        resourceId: openId,
        cleanUrl,
        directImageUrl: `https://drive.google.com/thumbnail?id=${encodeURIComponent(openId)}&sz=w1200`,
        embedPreviewUrl: `https://drive.google.com/file/d/${encodeURIComponent(openId)}/preview`,
      };
    }

    return {
      isValidDriveUrl: false,
      kind: 'external',
      resourceId: null,
      cleanUrl: '',
      directImageUrl: null,
      embedPreviewUrl: null,
    };
  } catch {
    return {
      isValidDriveUrl: false,
      kind: 'external',
      resourceId: null,
      cleanUrl: '',
      directImageUrl: null,
      embedPreviewUrl: null,
    };
  }
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds a deterministic, offline-safe SVG camera reconnaissance frame so every
 * field documentation entry renders an immediate visual preview alongside its Drive link.
 */
export function buildFieldPhotoSvgDataUri(opts: {
  title: string;
  location: string;
  team: string;
  capturedAt: string;
  frpMw?: number;
}): string {
  const title = escapeXmlText(sanitizePlainText(opts.title).slice(0, 48));
  const location = escapeXmlText(sanitizePlainText(opts.location).slice(0, 44));
  const team = escapeXmlText(sanitizePlainText(opts.team).slice(0, 42));
  const capturedAt = escapeXmlText(sanitizePlainText(opts.capturedAt).slice(0, 32));
  const frpBadge =
    opts.frpMw !== undefined && Number.isFinite(opts.frpMw)
      ? `${opts.frpMw.toFixed(1)} MW FRP`
      : 'DOKUMENTASI SATGAS';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="640" height="360">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#171b26"/>
      <stop offset="55%" stop-color="#292428"/>
      <stop offset="100%" stop-color="#11141c"/>
    </linearGradient>
    <radialGradient id="ember" cx="0.62" cy="0.64" r="0.45">
      <stop offset="0%" stop-color="#ff5a36" stop-opacity="0.72"/>
      <stop offset="52%" stop-color="#ff8a3d" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#11141c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="640" height="360" fill="url(#sky)"/>
  <rect width="640" height="360" fill="url(#ember)"/>
  <path d="M0 245 Q130 220 265 242 T520 226 L640 238 L640 360 L0 360 Z" fill="#18211d" opacity="0.92"/>
  <path d="M0 278 Q170 258 340 276 T640 266 L640 360 L0 360 Z" fill="#0d1117"/>
  <ellipse cx="395" cy="182" rx="140" ry="62" fill="#9ca3af" opacity="0.16"/>
  <ellipse cx="445" cy="144" rx="105" ry="48" fill="#d1d5db" opacity="0.12"/>
  <circle cx="396" cy="236" r="46" fill="#ff5a36" fill-opacity="0.18" stroke="#ff5a36" stroke-opacity="0.6" stroke-width="1"/>
  <circle cx="396" cy="236" r="24" fill="#ff5a36" fill-opacity="0.34" stroke="#ff5a36" stroke-width="1.2"/>
  <circle cx="396" cy="236" r="5" fill="#fff7ed"/>
  <g stroke="#eef0f5" stroke-opacity="0.28" stroke-width="1" fill="none">
    <path d="M24 44 L24 24 L48 24"/>
    <path d="M592 24 L616 24 L616 44"/>
    <path d="M24 316 L24 336 L48 336"/>
    <path d="M592 336 L616 336 L616 316"/>
    <circle cx="320" cy="180" r="28" stroke-dasharray="3 4"/>
    <line x1="286" y1="180" x2="354" y2="180"/>
    <line x1="320" y1="146" x2="320" y2="214"/>
  </g>
  <rect x="28" y="30" width="176" height="24" rx="6" fill="#07080d" fill-opacity="0.78" stroke="#eef0f5" stroke-opacity="0.16"/>
  <circle cx="42" cy="42" r="4" fill="#ff5a36"/>
  <text x="53" y="46" fill="#eef0f5" font-family="monospace" font-size="11" font-weight="600">${escapeXmlText(frpBadge)}</text>
  <rect x="24" y="274" width="592" height="62" rx="10" fill="#07080d" fill-opacity="0.82" stroke="#eef0f5" stroke-opacity="0.14"/>
  <text x="38" y="295" fill="#eef0f5" font-family="sans-serif" font-size="13" font-weight="600">${title}</text>
  <text x="38" y="313" fill="#a3a9b8" font-family="sans-serif" font-size="11">${location} · ${team}</text>
  <text x="38" y="328" fill="#7a8296" font-family="monospace" font-size="10">${capturedAt} · Bukti Lapangan Google Drive</text>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const CURATED_FIELD_DOCUMENTATION: FieldDocumentationItem[] = [
  {
    id: 'GDRIVE-KALTENG-001',
    hotspotId: 'FIRMS-IDN-KALTENG-001',
    title: 'Mop-Up Gambut Dalam Eks-PLG Blok C Jabiren',
    driveUrl: 'https://drive.google.com/drive/folders/1BnpbKarhutla2026KaltengPlg',
    mediaType: 'folder',
    team: 'Manggala Agni Daops I & BPBD Pulang Pisau',
    capturedAt: '09 Nov 2026 · 14:20 WIB',
    caption:
      'Tim darat melakukan pembasahan sekat kanal dan penyuntikan air tanah gambut kedalaman 7,4 m untuk memutus rambatan api bawah permukaan.',
    province: 'Kalimantan Tengah',
    coordinates: [114.128, -2.426],
    thumbnailDataUri: buildFieldPhotoSvgDataUri({
      title: 'Mop-Up Gambut Dalam Eks-PLG Blok C',
      location: 'Jabiren Raya, Pulang Pisau',
      team: 'Manggala Agni Daops I',
      capturedAt: '09 Nov 2026 · 14:20 WIB',
      frpMw: 142.8,
    }),
  },
  {
    id: 'GDRIVE-KALTENG-003',
    hotspotId: 'FIRMS-IDN-KALTENG-003',
    title: 'Relay Pompa Tekanan Tinggi Gambut Mantangai',
    driveUrl: 'https://drive.google.com/file/d/1KaltengMantangaiRelay2026/view?usp=sharing',
    mediaType: 'photo',
    team: 'Satgas Darat Kapuas & MPA',
    capturedAt: '09 Nov 2026 · 11:05 WIB',
    caption:
      'Jalur selang 900 meter dari kanal primer berhasil menekan titik asap aktif di perbatasan konsesi HGU Kapuas.',
    province: 'Kalimantan Tengah',
    coordinates: [113.785, -2.189],
    thumbnailDataUri: buildFieldPhotoSvgDataUri({
      title: 'Relay Pompa Tekanan Tinggi Mantangai',
      location: 'Mantangai, Kapuas',
      team: 'Satgas Darat & MPA',
      capturedAt: '09 Nov 2026 · 11:05 WIB',
      frpMw: 88.2,
    }),
  },
  {
    id: 'GDRIVE-SUMSEL-001',
    hotspotId: 'FIRMS-IDN-SUMSEL-001',
    title: 'Operasi Water Bombing Heli Mi-8 Pampangan OKI',
    driveUrl: 'https://drive.google.com/file/d/1SumselOkiWaterBombing2026/view?usp=sharing',
    mediaType: 'photo',
    team: 'Satgas Udara BNPB & BPBD Sumsel',
    capturedAt: '09 Nov 2026 · 13:45 WIB',
    caption:
      '82 kali dropping (328.000 liter air) diarahkan ke kantong api gambut Pampangan–Tulung Selapan yang sulit diakses jalur darat.',
    province: 'Sumatera Selatan',
    coordinates: [105.194, -3.148],
    thumbnailDataUri: buildFieldPhotoSvgDataUri({
      title: 'Water Bombing Heli Mi-8 Pampangan',
      location: 'Ogan Komering Ilir (OKI)',
      team: 'Satgas Udara BNPB',
      capturedAt: '09 Nov 2026 · 13:45 WIB',
      frpMw: 118.4,
    }),
  },
  {
    id: 'GDRIVE-RIAU-001',
    hotspotId: 'FIRMS-IDN-RIAU-001',
    title: 'Citra Drone Termal & Pendinginan Teluk Meranti',
    driveUrl: 'https://drive.google.com/drive/folders/1RiauPelalawanDroneDocs2026',
    mediaType: 'folder',
    team: 'Manggala Agni Daops Pekanbaru & TNI/Polri',
    capturedAt: '09 Nov 2026 · 10:15 WIB',
    caption:
      'Verifikasi lapangan dan pemantauan drone termal pada blok HTI Pelalawan; api permukaan telah dipadamkan dan memasuki fase pendinginan.',
    province: 'Riau',
    coordinates: [101.724, 0.562],
    thumbnailDataUri: buildFieldPhotoSvgDataUri({
      title: 'Drone Termal & Pendinginan Teluk Meranti',
      location: 'Pelalawan, Riau',
      team: 'Manggala Agni Daops IV',
      capturedAt: '09 Nov 2026 · 10:15 WIB',
      frpMw: 84.6,
    }),
  },
  {
    id: 'GDRIVE-JAMBI-001',
    hotspotId: 'FIRMS-IDN-JAMBI-001',
    title: 'Konstruksi Embung & Pemadaman Darat Kumpeh',
    driveUrl: 'https://drive.google.com/file/d/1JambiKumpehPoskoField2026/view?usp=sharing',
    mediaType: 'photo',
    team: 'BPBD Muaro Jambi & Polisi Hutan',
    capturedAt: '09 Nov 2026 · 15:10 WIB',
    caption:
      'Pemadaman 54,5 ha oleh tim gabungan darat disertai pembasahan sekat kanal di zona gambut Kumpeh.',
    province: 'Jambi',
    coordinates: [103.892, -1.524],
    thumbnailDataUri: buildFieldPhotoSvgDataUri({
      title: 'Pemadaman Darat & Sekat Kanal Kumpeh',
      location: 'Muaro Jambi, Jambi',
      team: 'BPBD & Polisi Hutan',
      capturedAt: '09 Nov 2026 · 15:10 WIB',
      frpMw: 91.5,
    }),
  },
  {
    id: 'GDRIVE-KALBAR-001',
    hotspotId: 'FIRMS-IDN-KALBAR-001',
    title: 'Parit Isolasi & Patroli Asap Kubu Raya',
    driveUrl: 'https://drive.google.com/drive/folders/1KalbarKubuRayaEvidence2026',
    mediaType: 'folder',
    team: 'BPBD Kalbar, Manggala Agni VII & Relawan',
    capturedAt: '09 Nov 2026 · 09:30 WIB',
    caption:
      'Laporan visual posko Rasau Jaya: pemotongan parit isolator selebar 4 meter dan pengukuran jarak pandang di koridor Supadio.',
    province: 'Kalimantan Barat',
    coordinates: [109.584, -0.312],
    thumbnailDataUri: buildFieldPhotoSvgDataUri({
      title: 'Parit Isolasi & Patroli Asap Kubu Raya',
      location: 'Rasau Jaya, Kubu Raya',
      team: 'BPBD Kalbar & Relawan',
      capturedAt: '09 Nov 2026 · 09:30 WIB',
      frpMw: 96.4,
    }),
  },
  {
    id: 'GDRIVE-KALSEL-001',
    hotspotId: 'FIRMS-IDN-KALSEL-001',
    title: 'Pengamanan Ring Bandara Syamsudin Noor',
    driveUrl: 'https://drive.google.com/file/d/1KalselBanjarbaruRing2026/view?usp=sharing',
    mediaType: 'photo',
    team: 'Satgas Karhutla Kalsel & Manggala Agni V',
    capturedAt: '08 Nov 2026 · 16:40 WIB',
    caption:
      'Penyisiran semak gambut di Landasan Ulin guna menjaga jarak pandang landasan pacu Bandara Syamsudin Noor tetap di atas batas aman.',
    province: 'Kalimantan Selatan',
    coordinates: [114.782, -3.412],
    thumbnailDataUri: buildFieldPhotoSvgDataUri({
      title: 'Pengamanan Ring Bandara Syamsudin Noor',
      location: 'Banjarbaru, Kalimantan Selatan',
      team: 'Satgas Karhutla Kalsel',
      capturedAt: '08 Nov 2026 · 16:40 WIB',
      frpMw: 58.7,
    }),
  },
  {
    id: 'GDRIVE-PAPUA-001',
    hotspotId: 'FIRMS-IDN-PAPUA-001',
    title: 'Verifikasi Ground Check Sabana Tanah Miring',
    driveUrl: 'https://drive.google.com/file/d/1PapuaMeraukeGroundCheck2026/view?usp=sharing',
    mediaType: 'report',
    team: 'BPBD & Satgas Karhutla Merauke',
    capturedAt: '09 Nov 2026 · 08:50 WIB',
    caption:
      'Dokumentasi patroli darat di koridor Tanah Miring–Kurik menggunakan tangki semprot portabel dan sekat bakar mekanis.',
    province: 'Papua Selatan',
    coordinates: [140.418, -8.192],
    thumbnailDataUri: buildFieldPhotoSvgDataUri({
      title: 'Ground Check Sabana Tanah Miring',
      location: 'Merauke, Papua Selatan',
      team: 'BPBD Merauke',
      capturedAt: '09 Nov 2026 · 08:50 WIB',
      frpMw: 109.2,
    }),
  },
];

/**
 * Returns curated + custom field documentation entries matched to a hotspot
 * (by direct `hotspotId`, attached `hotspot.fieldDocs`, or fallback to province).
 */
export function getFieldDocsForHotspot(
  hotspot: HotspotFeature,
  customDocs: readonly FieldDocumentationItem[] = []
): FieldDocumentationItem[] {
  const combined = [
    ...(hotspot.fieldDocs ?? []),
    ...customDocs,
    ...CURATED_FIELD_DOCUMENTATION,
  ];
  const directMatches = combined.filter((doc) => doc.hotspotId === hotspot.id);
  if (directMatches.length > 0) {
    return directMatches;
  }
  return combined.filter((doc) => doc.province === hotspot.province);
}

/**
 * Returns all curated + custom field documentation items for a province (or all when 'ALL').
 */
export function getFieldDocsForProvince(
  province: string,
  customDocs: readonly FieldDocumentationItem[] = []
): FieldDocumentationItem[] {
  const combined = [...customDocs, ...CURATED_FIELD_DOCUMENTATION];
  if (!province || province === 'ALL') return combined;
  const cleanProv = sanitizePlainText(province).toLowerCase();
  return combined.filter((doc) => doc.province.toLowerCase() === cleanProv);
}

/**
 * Validates and constructs a new `FieldDocumentationItem` from a Google Drive share URL
 * pasted by a field worker or analyst.
 */
export function createCustomFieldDocFromDriveUrl(input: {
  driveUrl: string;
  title?: string;
  team?: string;
  caption?: string;
  province: string;
  coordinates: [number, number];
  hotspotId?: string;
}): FieldDocumentationItem | null {
  const parsed = parseGoogleDriveLink(input.driveUrl);
  if (!parsed.isValidDriveUrl) {
    return null;
  }

  const cleanTitle =
    sanitizePlainText(input.title || '') ||
    (parsed.kind === 'folder'
      ? `Folder Bukti Lapangan (${sanitizePlainText(input.province)})`
      : `Foto Dokumentasi Posko (${sanitizePlainText(input.province)})`);
  const cleanTeam = sanitizePlainText(input.team || '') || 'Tim Posko Lapangan BNPB';
  const cleanCaption =
    sanitizePlainText(input.caption || '') ||
    'Dokumentasi lapangan terlampir melalui tautan Google Drive.';
  const cleanProvince = sanitizePlainText(input.province) || 'Indonesia';
  const capturedAt = new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    id: `GDRIVE-CUSTOM-${Date.now().toString(36).toUpperCase()}`,
    hotspotId: input.hotspotId ? sanitizePlainText(input.hotspotId) : undefined,
    title: cleanTitle,
    driveUrl: parsed.cleanUrl,
    mediaType: parsed.kind === 'folder' ? 'folder' : 'photo',
    team: cleanTeam,
    capturedAt: `${capturedAt} WIB`,
    caption: cleanCaption,
    province: cleanProvince,
    coordinates: input.coordinates,
    thumbnailDataUri: buildFieldPhotoSvgDataUri({
      title: cleanTitle,
      location: cleanProvince,
      team: cleanTeam,
      capturedAt: `${capturedAt} WIB`,
    }),
  };
}
