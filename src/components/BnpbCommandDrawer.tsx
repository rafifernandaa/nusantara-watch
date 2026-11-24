import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  Camera,
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Flame,
  Layers,
  Link2,
  Plane,
  RefreshCw,
  ShieldCheck,
  Users,
  Wind,
  X,
} from 'lucide-react';
import {
  aggregateBnpbMetrics,
  BNPB_INTEGRATED_PORTALS,
  BNPB_KARHUTLA_2026_RECORDS,
  BNPB_SECURITY_AUDIT_FINDINGS,
  filterBnpbRecords,
  toShortBnpbProvince,
} from '../data/local_data/bnpb-karhutla-2026';
import { fetchGoogleSheetsStatusApi } from '../services/postgisApi';
import { useWatchStore } from '../store/useWatchStore';
import {
  APPLE_SPRINGS,
  applyRubberbandBounds,
  PointerVelocityTracker,
  resolveSnapWithMomentum,
} from '../utils/apple-physics';
import { createCustomFieldDocFromDriveUrl, getFieldDocsForProvince } from '../utils/gdriveEvidence';
import {
  buildSafeKarhutlaCsv,
  isAllowedPortalUrl,
  sanitizePlainText,
} from '../utils/security';
import type { BnpbPortalId } from '../types/watch';
import {
  BklitProvincialBarChart,
  BklitRingChart,
  type BklitBarItem,
  type BklitRingSegment,
} from './charts/BklitCharts';

type BnpbTabId = 'kpi-charts' | 'air-directives' | 'portals' | 'security';

export function BnpbCommandDrawer() {
  const isBnpbCommandOpen = useWatchStore((s) => s.isBnpbCommandOpen);
  const selectedProvinceFilter = useWatchStore((s) => s.selectedProvinceFilter);
  const bnpbSnapshotMode = useWatchStore((s) => s.bnpbSnapshotMode);
  const lastBnpbRefreshedAt = useWatchStore((s) => s.lastBnpbRefreshedAt);
  const bnpbRecords = useWatchStore((s) => s.bnpbRecords);
  const customFieldDocs = useWatchStore((s) => s.customFieldDocs);
  const backendMode = useWatchStore((s) => s.backendMode);
  const postgisHealth = useWatchStore((s) => s.postgisHealth);
  const lastGisNotification = useWatchStore((s) => s.lastGisNotification);

  const setBnpbCommandOpen = useWatchStore((s) => s.setBnpbCommandOpen);
  const setProvinceFilter = useWatchStore((s) => s.setProvinceFilter);
  const setBnpbSnapshotMode = useWatchStore((s) => s.setBnpbSnapshotMode);
  const refreshBnpbData = useWatchStore((s) => s.refreshBnpbData);
  const simulateQgisDigitizeHotspot = useWatchStore((s) => s.simulateQgisDigitizeHotspot);
  const configureGoogleSheets = useWatchStore((s) => s.configureGoogleSheets);
  const simulateGoogleSheetPoskoEdit = useWatchStore((s) => s.simulateGoogleSheetPoskoEdit);
  const setActiveEvidenceModalDoc = useWatchStore((s) => s.setActiveEvidenceModalDoc);

  const [activeTab, setActiveTab] = useState<BnpbTabId>('kpi-charts');
  const [selectedPortalId, setSelectedPortalId] = useState<BnpbPortalId>('sipongi');
  const [showLivePortalIframe, setShowLivePortalIframe] = useState(false);
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState(false);

  // Google Sheets <-> PostgreSQL Auto-Sync Bridge state
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [sheetPollIntervalSec, setSheetPollIntervalSec] = useState(30);
  const [isSavingSheetConfig, setIsSavingSheetConfig] = useState(false);
  const [isSimulatingSheetEdit, setIsSimulatingSheetEdit] = useState(false);
  const [showAppsScriptSnippet, setShowAppsScriptSnippet] = useState(false);
  const [appsScriptCode, setAppsScriptCode] = useState('');
  const [copiedAppsScript, setCopiedAppsScript] = useState(false);

  useEffect(() => {
    if (!isBnpbCommandOpen || activeTab !== 'security') return;
    let active = true;
    void fetchGoogleSheetsStatusApi().then((res) => {
      if (!active || !res) return;
      if (res.googleSheetsSync.sheetId && !sheetUrlInput) {
        setSheetUrlInput(res.googleSheetsSync.sheetId);
      }
      setSheetPollIntervalSec(res.googleSheetsSync.pollIntervalSec);
      setAppsScriptCode(res.appsScriptCode);
    });
    return () => {
      active = false;
    };
  }, [isBnpbCommandOpen, activeTab, sheetUrlInput]);

  const gsheetsSync = postgisHealth?.googleSheetsSync;

  const activeShortProvince = toShortBnpbProvince(selectedProvinceFilter);

  const filteredRecords = useMemo(() => {
    if (selectedProvinceFilter === 'ALL') return bnpbRecords;
    const baseFiltered = filterBnpbRecords(selectedProvinceFilter);
    return baseFiltered.map(
      (seed) => bnpbRecords.find((r) => r.shortProvince === seed.shortProvince) ?? seed
    );
  }, [bnpbRecords, selectedProvinceFilter]);

  const metrics = useMemo(
    () => aggregateBnpbMetrics(filteredRecords, bnpbSnapshotMode),
    [filteredRecords, bnpbSnapshotMode]
  );

  const hotspotRingSegments = useMemo<BklitRingSegment[]>(
    () =>
      BNPB_KARHUTLA_2026_RECORDS.map((r) => ({
        label: r.shortProvince,
        value:
          bnpbSnapshotMode === 'live-api' ? r.totalHotspot : r.excelTotalHotspot,
        secondaryValue:
          bnpbSnapshotMode === 'live-api' ? r.fireSpot : r.excelFireSpot,
        color: r.colorHex,
      })),
    [bnpbSnapshotMode]
  );

  const provincialBarItems = useMemo<BklitBarItem[]>(
    () =>
      BNPB_KARHUTLA_2026_RECORDS.map((r) => ({
        label: r.shortProvince,
        primary:
          bnpbSnapshotMode === 'live-api'
            ? r.lahanTerbakarHarianHa
            : r.excelLahanTerbakarHarianHa,
        secondary: Number(
          (r.luasDitanganiDaratHa + r.aerial.luasDitanganiUdaraHa).toFixed(1)
        ),
        color: r.colorHex,
      })),
    [bnpbSnapshotMode]
  );

  const handleToggleProvinceByShort = (shortProv: string) => {
    const match = BNPB_KARHUTLA_2026_RECORDS.find(
      (r) => r.shortProvince === shortProv
    );
    if (!match) return;
    if (activeShortProvince === shortProv) {
      setProvinceFilter('ALL', true);
    } else {
      setProvinceFilter(match.fullProvince, true);
    }
  };

  const activePortal = useMemo(
    () =>
      BNPB_INTEGRATED_PORTALS.find((p) => p.id === selectedPortalId) ??
      BNPB_INTEGRATED_PORTALS[0],
    [selectedPortalId]
  );

  // 1:1 Direct Manipulation & Momentum Projection state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const grabStartYRef = useRef(0);
  const velocityTrackerRef = useRef(new PointerVelocityTracker());

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    grabStartYRef.current = e.clientY - dragY;
    velocityTrackerRef.current.reset();
    velocityTrackerRef.current.record(e.clientX, e.clientY);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    velocityTrackerRef.current.record(e.clientX, e.clientY);
    const rawDeltaY = e.clientY - grabStartYRef.current;
    const resistedY = applyRubberbandBounds(rawDeltaY, 0, 280, 380, 0.52);
    setDragY(resistedY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    const { vy } = velocityTrackerRef.current.getVelocity();
    const snapTarget = resolveSnapWithMomentum(dragY, vy, [0, 340], 0.992);
    if (snapTarget >= 340 || dragY > 150) {
      setDragY(0);
      setBnpbCommandOpen(false);
    } else {
      setDragY(0);
    }
  };

  const triggerSafeDownload = (format: 'csv' | 'excel-csv') => {
    const csvContent = buildSafeKarhutlaCsv(filteredRecords, bnpbSnapshotMode);
    const blob = new Blob([csvContent], {
      type:
        format === 'excel-csv'
          ? 'application/vnd.ms-excel;charset=utf-8'
          : 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const scopeSlug =
      activeShortProvince === 'ALL'
        ? 'semua-provinsi'
        : activeShortProvince.toLowerCase();
    const ext = format === 'excel-csv' ? 'xls.csv' : 'csv';
    link.href = url;
    link.download = `karhutla-2026_${scopeSlug}_${bnpbSnapshotMode}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsDownloadMenuOpen(false);
  };

  const maxAgencyCount = Math.max(
    1,
    ...metrics.agencyBreakdown.map((a) => a.count)
  );

  return (
    <AnimatePresence>
      {isBnpbCommandOpen && (
        <motion.section
          initial={{ opacity: 0, x: -32, scale: 0.97 }}
          animate={{
            opacity: 1,
            x: 0,
            y: dragY,
            scale: 1,
          }}
          exit={{ opacity: 0, x: -32, scale: 0.97 }}
          transition={isDragging ? { duration: 0 } : APPLE_SPRINGS.sheet}
          aria-label="Dashboard Informasi Penanganan Karhutla BNPB 2026"
          className="fixed left-4 top-20 bottom-24 z-30 w-[calc(100vw-32px)] sm:w-[540px] lg:w-[610px] apple-glass-heavy rounded-2xl flex flex-col overflow-hidden"
          style={{ transformOrigin: 'top left' }}
        >
          {/* 1:1 Pointer-Capture Drag Handle & Header */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="cursor-grab active:cursor-grabbing select-none touch-none px-4 pt-3 pb-3 border-b border-[var(--border-hairline)]"
          >
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-[var(--border-strong)]" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Flame className="h-3.5 w-3.5" strokeWidth={1.5} />
                    BNPB Karhutla 2026
                  </span>
                  <span className="font-mono-tabular text-[11px] text-[var(--text-muted)]">
                    {lastBnpbRefreshedAt}
                  </span>
                </div>
                <h2 className="type-title text-[var(--text-primary)] mt-1.5">
                  Dashboard Informasi Penanganan Karhutla
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Sumber: Tim Penanganan Karhutla BNPB · PDSI Pusdatinkomben (6 Provinsi Prioritas)
                </p>
              </div>

              <div
                className="flex items-center gap-1.5"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {/* Refresh Data Button */}
                <button
                  type="button"
                  onPointerDown={() => refreshBnpbData()}
                  className="apple-pressable flex items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] px-2.5 h-8 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]"
                  title="Sinkronkan ulang telemetri BNPB"
                >
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                {/* Unduh Data Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onPointerDown={() => setIsDownloadMenuOpen(!isDownloadMenuOpen)}
                    aria-expanded={isDownloadMenuOpen}
                    className="apple-pressable flex items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] px-2.5 h-8 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]"
                  >
                    <Download className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="hidden sm:inline">Unduh data</span>
                  </button>

                  {isDownloadMenuOpen && (
                    <div
                      role="menu"
                      className="apple-glass-heavy absolute right-0 mt-1.5 w-48 rounded-xl p-1.5 z-50 space-y-1"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onPointerDown={() => triggerSafeDownload('excel-csv')}
                        className="apple-pressable w-full text-left rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] flex items-center justify-between"
                      >
                        <span>Excel (.xlsx / BOM)</span>
                        <span className="text-[11px] text-[var(--text-muted)]">Aman</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onPointerDown={() => triggerSafeDownload('csv')}
                        className="apple-pressable w-full text-left rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-raised)] flex items-center justify-between"
                      >
                        <span>CSV (.csv)</span>
                        <span className="text-[11px] text-[var(--text-muted)]">RFC-4180</span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onPointerDown={() => setBnpbCommandOpen(false)}
                  className="apple-pressable rounded-lg bg-[var(--surface-raised)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]"
                  aria-label="Tutup panel BNPB Karhutla"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Provinsi (7-State Chip Selector) + Snapshot Switcher */}
          <div className="px-4 pt-3 pb-2.5 border-b border-[var(--border-hairline)] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--text-muted)]">Filter provinsi prioritas</span>
              <div className="flex items-center rounded-lg bg-[var(--surface-deepest)] p-0.5 border border-[var(--border-hairline)]">
                <button
                  type="button"
                  onPointerDown={() => setBnpbSnapshotMode('live-api')}
                  className={`apple-pressable font-mono-tabular rounded-md px-2 py-1 text-[11px] font-medium ${
                    bnpbSnapshotMode === 'live-api'
                      ? 'bg-[var(--surface-raised)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  API Live (188 HS)
                </button>
                <button
                  type="button"
                  onPointerDown={() => setBnpbSnapshotMode('excel-sheet')}
                  className={`apple-pressable font-mono-tabular rounded-md px-2 py-1 text-[11px] font-medium ${
                    bnpbSnapshotMode === 'excel-sheet'
                      ? 'bg-[var(--surface-raised)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Data Excel (1.051 HS)
                </button>
              </div>
            </div>

            <div
              role="group"
              aria-label="Filter Provinsi BNPB"
              className="flex flex-wrap items-center gap-1.5"
            >
              <button
                type="button"
                aria-pressed={activeShortProvince === 'ALL'}
                onPointerDown={() => setProvinceFilter('ALL', true)}
                className={`apple-pressable flex items-center gap-1.5 rounded-lg px-2.5 h-7 text-xs font-medium border ${
                  activeShortProvince === 'ALL'
                    ? 'bg-[var(--text-primary)] text-[var(--surface-card)] border-transparent'
                    : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      activeShortProvince === 'ALL' ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                />
                <span>Semua provinsi</span>
              </button>

              {BNPB_KARHUTLA_2026_RECORDS.map((prov) => {
                const pressed = activeShortProvince === prov.shortProvince;
                return (
                  <button
                    key={prov.shortProvince}
                    type="button"
                    aria-pressed={pressed}
                    onPointerDown={() => setProvinceFilter(prov.fullProvince, true)}
                    className={`apple-pressable flex items-center gap-1.5 rounded-lg px-2.5 h-7 text-xs font-medium border ${
                      pressed
                        ? 'bg-[var(--text-primary)] text-[var(--surface-card)] border-transparent'
                        : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: prov.colorHex }}
                    />
                    <span>{prov.shortProvince}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4-Tab Segmented Navigation */}
          <div className="px-4 pt-3">
            <div className="grid grid-cols-4 rounded-lg bg-[var(--surface-deepest)] p-1 border border-[var(--border-hairline)]">
              {(
                [
                  { id: 'kpi-charts', label: '8 KPI & grafik' },
                  { id: 'air-directives', label: 'PM2.5 & arahan' },
                  { id: 'portals', label: 'Peta portal (4)' },
                  { id: 'security', label: 'Audit keamanan' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onPointerDown={() => setActiveTab(tab.id)}
                  className={`apple-pressable rounded-md py-1.5 text-[11px] font-medium truncate px-1 ${
                    activeTab === tab.id
                      ? 'bg-[var(--surface-raised)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Body Content */}
          <div className="scroll-mask-y flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {activeTab === 'kpi-charts' && (
              <>
                {/* 8 Core BNPB Operational KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Card 1: Total Hotspot & Fire Spot */}
                  <div className="apple-elevated-card rounded-xl p-2.5 space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">
                      Total hotspot hari ini
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono-tabular text-lg font-medium text-[var(--accent)]">
                        {metrics.totalHotspot.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">titik</span>
                    </div>
                    <span className="font-mono-tabular inline-block rounded bg-[var(--negative-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--negative)]">
                      Fire spot: {metrics.fireSpot.toLocaleString('id-ID')} titik
                    </span>
                  </div>

                  {/* Card 2: Luas Terbakar 24H */}
                  <div className="apple-elevated-card rounded-xl p-2.5 space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">
                      Luas terbakar 24j
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono-tabular text-lg font-medium text-[var(--text-primary)]">
                        {metrics.luasTerbakar24hHa.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">ha</span>
                    </div>
                    <span className="font-mono-tabular text-[11px] text-[var(--text-secondary)] block">
                      Indikatif: {metrics.lahanTerbakarIndikatifHa.toLocaleString('id-ID')} ha
                    </span>
                  </div>

                  {/* Card 3: Luas Ditangani Darat + Udara */}
                  <div className="apple-elevated-card rounded-xl p-2.5 space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">
                      Ditangani (darat+udara)
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono-tabular text-lg font-medium text-[var(--positive)]">
                        {metrics.luasDitanganiTotalHa.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">ha</span>
                    </div>
                    <span className="font-mono-tabular text-[11px] text-[var(--text-secondary)] block">
                      Darat {metrics.luasDitanganiDaratHa.toLocaleString('id-ID')} · Udara{' '}
                      {metrics.luasDitanganiUdaraHa.toLocaleString('id-ID')} ha
                    </span>
                  </div>

                  {/* Card 4: Personel Gabungan */}
                  <div className="apple-elevated-card rounded-xl p-2.5 space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">
                      Personel gabungan
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono-tabular text-lg font-medium text-[var(--text-primary)]">
                        {metrics.totalPersonel.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">org</span>
                    </div>
                    <span className="font-mono-tabular text-[11px] text-[var(--text-secondary)] block">
                      {metrics.kabkotTerdampak} kab/kot terdampak
                    </span>
                  </div>

                  {/* Card 5: Total Unit Udara Hari Ini */}
                  <div className="apple-elevated-card rounded-xl p-2.5 space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">
                      Total unit udara
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono-tabular text-lg font-medium text-[var(--info)]">
                        {metrics.totalUnitUdara}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">unit</span>
                    </div>
                    <span className="font-mono-tabular text-[11px] text-[var(--text-secondary)] block">
                      Patroli {metrics.patroliUnit} · WB {metrics.wbUnit} · OMC{' '}
                      {metrics.omcUnit}
                    </span>
                  </div>

                  {/* Card 6: Sortie Hari Ini */}
                  <div className="apple-elevated-card rounded-xl p-2.5 space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">
                      Patroli / WB / OMC sortie
                    </span>
                    <div className="font-mono-tabular text-xs font-medium text-[var(--text-primary)] space-x-1">
                      <span>{metrics.patroliSortie} patroli</span>
                      <span>·</span>
                      <span className="text-[var(--info)]">{metrics.wbSortie} WB</span>
                      <span>·</span>
                      <span className="text-[var(--positive)]">{metrics.omcSortie} OMC</span>
                    </div>
                    <span className="font-mono-tabular text-[11px] text-[var(--text-secondary)] block">
                      Standby: {metrics.totalUnitStandby} heli/pesawat
                    </span>
                  </div>

                  {/* Card 7: Bahan Semai & Volume WB */}
                  <div className="apple-elevated-card rounded-xl p-2.5 space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">
                      Bahan semai &amp; vol WB
                    </span>
                    <div className="font-mono-tabular text-xs font-medium text-[var(--text-primary)]">
                      {metrics.totalBahanSemaiKg.toLocaleString('id-ID')} kg semai
                    </div>
                    <span className="font-mono-tabular text-[11px] text-[var(--info)] font-medium block">
                      {(metrics.volumeWbLtr / 1_000_000).toLocaleString('id-ID', {
                        maximumFractionDigits: 3,
                      })}{' '}
                      juta L ({metrics.jumlahWbDropping}x drop)
                    </span>
                  </div>

                  {/* Card 8: Luas Yang Akan Dipadamkan */}
                  <div className="apple-elevated-card rounded-xl p-2.5 space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] block">
                      Akan dipadamkan
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono-tabular text-lg font-medium text-[var(--warning)]">
                        {metrics.luasAkanDipadamkanHa.toLocaleString('id-ID')}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">ha</span>
                    </div>
                    <span className="font-mono-tabular text-[11px] text-[var(--text-secondary)] block">
                      Centurisk sisa:{' '}
                      {metrics.luasBelumPadamCenturiskHa.toLocaleString('id-ID')} ha
                    </span>
                  </div>
                </div>

                {/* Bklit UI Composable OKLCH Charts (Concentric Ring + Crosshair Bar Comparison) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <BklitRingChart
                    title="Sebaran hotspot & fire spot"
                    subtitle="Klik segmen provinsi untuk filter peta"
                    totalLabel={metrics.totalHotspot.toLocaleString('id-ID')}
                    unitLabel="hotspot"
                    secondaryUnitLabel="fire spot"
                    segments={hotspotRingSegments}
                    selectedLabel={activeShortProvince}
                    onSelectSegment={handleToggleProvinceByShort}
                    ariaLabel="Diagram cincin konsentris sebaran hotspot dan fire spot per provinsi"
                  />
                  <BklitProvincialBarChart
                    title="Luas terbakar vs ditangani"
                    subtitle="Patroli harian vs penanganan darat & udara (ha)"
                    primaryLabel="Terbakar"
                    secondaryLabel="Ditangani"
                    unit="ha"
                    items={provincialBarItems}
                    activeLabel={activeShortProvince}
                    onSelectBar={handleToggleProvinceByShort}
                  />
                </div>

                {/* Personel Gabungan Per Instansi (Stepped OKLCH Ramp) */}
                <div className="apple-elevated-card rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} />
                        Komposisi personel gabungan per instansi
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {metrics.scopeLabel} — total{' '}
                        <span className="font-mono-tabular">
                          {metrics.totalPersonel.toLocaleString('id-ID')}
                        </span>{' '}
                        personel
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {metrics.agencyBreakdown.map((item, idx) => {
                      const widthPct = Math.max(
                        2,
                        Math.round((item.count / maxAgencyCount) * 100)
                      );
                      const barTone =
                        idx === 0
                          ? 'var(--accent)'
                          : idx < 4
                            ? 'oklch(0.68 0.055 248)'
                            : 'oklch(0.56 0.03 248)';
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-[var(--text-secondary)]">
                              {item.label}
                            </span>
                            <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
                              {item.count.toLocaleString('id-ID')} personel
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-[var(--surface-deepest)] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-[width] duration-300"
                              style={{
                                width: `${widthPct}%`,
                                backgroundColor: barTone,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'air-directives' && (
              <>
                {/* Kualitas Udara Hari Ini (PM2.5 & Jarak Pandang Bandara) */}
                <div className="apple-elevated-card rounded-xl p-3.5 space-y-2.5">
                  <div>
                    <h3 className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                      <Wind className="h-4 w-4 text-[var(--info)]" strokeWidth={1.5} />
                      Kualitas udara hari ini (PM2.5 &amp; jarak pandang bandara)
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      Pemantauan stasiun bandara terdekat &amp; rentang dampak asap provinsi
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredRecords.map((rec) => (
                      <div
                        key={rec.shortProvince}
                        className="rounded-lg bg-[var(--surface-deepest)] p-2.5 border border-[var(--border-hairline)] flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: rec.colorHex }}
                            />
                            <span className="text-xs font-medium text-[var(--text-primary)]">
                              {rec.fullProvince}
                            </span>
                          </div>
                          <p className="font-mono-tabular text-[11px] text-[var(--text-secondary)]">
                            {sanitizePlainText(rec.kualitasUdaraPm25Text)}
                          </p>
                          <p className="font-mono-tabular text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                            Jarak pandang:{' '}
                            {sanitizePlainText(rec.jarakPandangBandaraKm)} km · Rentang:{' '}
                            {rec.excelAirQualityRange}
                          </p>
                        </div>

                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-medium shrink-0 ${
                            rec.airQualityStatus === 'Baik'
                              ? 'bg-[var(--positive-soft)] text-[var(--positive)]'
                              : 'bg-[var(--warning-soft)] text-[var(--warning)]'
                          }`}
                        >
                          {rec.airQualityStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kesimpulan & Rekomendasi Taktis BNPB per Provinsi */}
                <div className="space-y-2.5">
                  {filteredRecords.map((rec) => {
                    const sheetDriveDoc = rec.dokumentasiLapanganUrl
                      ? createCustomFieldDocFromDriveUrl({
                          driveUrl: rec.dokumentasiLapanganUrl,
                          title: `Dokumentasi Posko ${rec.fullProvince} (Google Sheet)`,
                          province: rec.fullProvince,
                          coordinates: rec.coordinates,
                        })
                      : null;
                    const provinceDocs = sheetDriveDoc
                      ? [sheetDriveDoc, ...getFieldDocsForProvince(rec.fullProvince, customFieldDocs)]
                      : getFieldDocsForProvince(rec.fullProvince, customFieldDocs);
                    const featuredDoc = provinceDocs[0] ?? null;

                    return (
                      <div
                        key={rec.shortProvince}
                        className="apple-elevated-card rounded-xl p-3.5 space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] pb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: rec.colorHex }}
                            />
                            <h4 className="text-xs font-medium text-[var(--text-primary)]">
                              Laporan taktis satgas Provinsi {rec.fullProvince}
                            </h4>
                          </div>
                          <div className="font-mono-tabular flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                            <span className="inline-flex items-center gap-1">
                              <Plane className="h-3.5 w-3.5 text-[var(--info)]" strokeWidth={1.5} />
                              Udara: {rec.aerial.totalUnitUdaraHariIni} unit (
                              {rec.aerial.totalUnitStandby} standby)
                            </span>
                            <span>·</span>
                            <span>Korban MD: {rec.totalMd}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="rounded-lg bg-[var(--surface-deepest)] p-2.5 border border-[var(--border-hairline)]">
                            <span className="text-[11px] font-medium text-[var(--info)] block mb-0.5">
                              Kesimpulan situasi lapangan
                            </span>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              {sanitizePlainText(rec.kesimpulan)}
                            </p>
                          </div>

                          <div className="rounded-lg bg-[var(--surface-deepest)] p-2.5 border border-[var(--border-hairline)]">
                            <span className="text-[11px] font-medium text-[var(--accent)] block mb-0.5">
                              Rekomendasi &amp; arahan operasi BNPB
                            </span>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                              {sanitizePlainText(rec.rekomendasi)}
                            </p>
                          </div>

                          {featuredDoc && (
                            <div className="rounded-lg bg-[var(--surface-deepest)] p-2.5 border border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2.5">
                              <button
                                type="button"
                                onPointerDown={() => setActiveEvidenceModalDoc(featuredDoc)}
                                className="apple-pressable flex items-center gap-2.5 text-left min-w-0 flex-1"
                              >
                                <img
                                  src={featuredDoc.thumbnailDataUri}
                                  alt={featuredDoc.title}
                                  className="h-11 w-16 rounded object-cover border border-[var(--border-hairline)] shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1 truncate">
                                    <Camera className="h-3 w-3 text-[var(--accent)] shrink-0" />
                                    <span className="truncate">{featuredDoc.title}</span>
                                  </span>
                                  <span className="text-[10px] text-[var(--text-muted)] block truncate">
                                    {featuredDoc.team} · Klik untuk Lightbox
                                  </span>
                                </div>
                              </button>
                              <a
                                href={featuredDoc.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="apple-pressable inline-flex items-center gap-1 rounded-md bg-[var(--surface-raised)] px-2 py-1 text-[11px] font-medium text-[var(--info)] border border-[var(--border-hairline)] shrink-0"
                              >
                                <span>Google Drive</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'portals' && (
              <div className="space-y-3">
                <div className="apple-elevated-card rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} />
                        Pilih sumber peta terintegrasi BNPB
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        4 portal geospasial lintas kementerian/lembaga yang terhubung di BNPB
                        Karhutla 2026
                      </p>
                    </div>
                  </div>

                  {/* 4 Portal Buttons */}
                  <div className="grid grid-cols-2 gap-1.5" role="tablist">
                    {BNPB_INTEGRATED_PORTALS.map((portal) => {
                      const selected = portal.id === selectedPortalId;
                      return (
                        <button
                          key={portal.id}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onPointerDown={() => {
                            setSelectedPortalId(portal.id);
                            setShowLivePortalIframe(false);
                          }}
                          className={`apple-pressable text-left rounded-lg p-2.5 border transition-colors ${
                            selected
                              ? 'bg-[var(--text-primary)] text-[var(--surface-card)] border-transparent'
                              : 'bg-[var(--surface-deepest)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="text-xs font-medium">{portal.shortLabel}</div>
                          <div
                            className={`text-[11px] truncate ${
                              selected ? 'opacity-80' : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {portal.agency}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Portal Details Card */}
                  <div className="rounded-lg bg-[var(--surface-deepest)] p-3 border border-[var(--border-hairline)] space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-medium text-[var(--text-primary)]">
                          {activePortal.title}
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {activePortal.subtitle}
                        </p>
                      </div>
                      <a
                        href={activePortal.embedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="apple-pressable inline-flex items-center gap-1 rounded-lg bg-[var(--surface-raised)] px-2.5 h-8 text-[11px] font-medium text-[var(--accent)] border border-[var(--border-hairline)] shrink-0"
                      >
                        <span>Buka di tab baru</span>
                        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </a>
                    </div>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {activePortal.framingNote}
                    </p>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] font-mono-tabular text-[var(--text-muted)] truncate">
                        {activePortal.embedUrl}
                      </span>
                      <button
                        type="button"
                        onPointerDown={() => setShowLivePortalIframe(!showLivePortalIframe)}
                        className="apple-pressable rounded-lg bg-[var(--surface-raised)] px-2.5 h-7 text-[11px] font-medium text-[var(--text-primary)] border border-[var(--border-hairline)] shrink-0"
                      >
                        {showLivePortalIframe
                          ? 'Tutup pratinjau sandbox'
                          : 'Muat pratinjau terisolasi'}
                      </button>
                    </div>

                    {showLivePortalIframe &&
                      isAllowedPortalUrl(activePortal.embedUrl) && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-[var(--border-hairline)] bg-[var(--surface-deepest)] h-64">
                          <iframe
                            src={activePortal.embedUrl}
                            title={activePortal.title}
                            sandbox="allow-scripts allow-same-origin"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full border-0"
                          />
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-2.5">
                {/* PostGIS 3.4 + QGIS / ArcGIS Pro Dual-Citizen Bridge Card */}
                <div className="apple-elevated-card rounded-xl p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-[var(--info)]" strokeWidth={1.5} />
                        Backend PostgreSQL 16 + PostGIS 3.4 (QGIS &amp; ArcGIS Pro Bridge)
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Skema Dual-Citizen (<code className="text-[var(--text-primary)]">objectid SERIAL PRIMARY KEY</code>,{' '}
                        <code className="text-[var(--text-primary)]">SRID 4326</code>, GiST Index &amp; Trigger{' '}
                        <code className="text-[var(--text-primary)]">ST_Intersects</code>)
                      </p>
                    </div>
                    <button
                      type="button"
                      onPointerDown={() => {
                        void simulateQgisDigitizeHotspot();
                      }}
                      className="apple-pressable rounded-lg bg-[var(--info-soft)] px-3 h-8 text-[11px] font-medium text-[var(--info)] border border-[var(--border-hairline)]"
                      title="Simulasikan input titik panas baru dari QGIS/ArcGIS dengan pengayaan otomatis ST_Intersects"
                    >
                      + Uji digitasi hotspot QGIS
                    </button>
                  </div>

                  <div className="rounded-lg bg-[var(--surface-deepest)] p-2.5 border border-[var(--border-hairline)] space-y-1.5 text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[var(--text-muted)]">Mode engine spasial:</span>
                      <span className="font-mono-tabular font-medium text-[var(--positive)]">
                        {postgisHealth?.engine ?? backendMode} · SRID {postgisHealth?.srid ?? 4326}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[var(--text-muted)]">Koneksi langsung QGIS / ArcGIS:</span>
                      <code className="font-mono-tabular text-[11px] text-[var(--text-primary)]">
                        {postgisHealth?.qgisConnectionUri ??
                          "dbname='nusantara_watch' host=localhost port=5432 user='gis_analyst' srid=4326"}
                      </code>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-[var(--text-muted)]">Endpoint GeoJSON OGC:</span>
                      {[
                        { label: 'bnpb-sitrep', href: '/api/geojson/bnpb-sitrep' },
                        { label: 'hotspots', href: '/api/geojson/hotspots' },
                        { label: 'concessions', href: '/api/geojson/concessions' },
                        { label: 'sirup-arcs', href: '/api/geojson/sirup-arcs' },
                        { label: 'bmkg-stations', href: '/api/geojson/bmkg-stations' },
                      ].map((ep) => (
                        <a
                          key={ep.label}
                          href={ep.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-mono-tabular text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]"
                        >
                          {ep.label}
                        </a>
                      ))}
                    </div>
                    {lastGisNotification && (
                      <div className="mt-1.5 rounded-lg bg-[var(--positive-soft)] px-2.5 py-1.5 text-[11px] text-[var(--positive)]">
                        <strong>LISTEN / NOTIFY ({lastGisNotification.op}):</strong>{' '}
                        {lastGisNotification.summary}
                      </div>
                    )}
                  </div>
                </div>

                {/* Google Sheets <-> PostgreSQL Auto-Sync (Posko Bridge) */}
                <div className="apple-elevated-card rounded-xl p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                        <FileSpreadsheet className="h-4 w-4 text-[var(--positive)]" strokeWidth={1.5} />
                        Google Sheets &#8596; PostgreSQL Auto-Sync (Posko Bridge)
                      </h3>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Sinkronisasi otomatis satu arah (<code className="text-[var(--text-primary)]">Google Sheet Posko</code>{' '}
                        &#8594; <code className="text-[var(--text-primary)]">bnpb.karhutla_sitrep_47col</code> &#8594;{' '}
                        <code className="text-[var(--text-primary)]">SSE Live</code>) tanpa kredensial OAuth GCP.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSimulatingSheetEdit}
                      onPointerDown={() => {
                        setIsSimulatingSheetEdit(true);
                        void simulateGoogleSheetPoskoEdit().finally(() => {
                          setIsSimulatingSheetEdit(false);
                        });
                      }}
                      className="apple-pressable rounded-lg bg-[var(--positive-soft)] px-3 h-8 text-[11px] font-medium text-[var(--positive)] border border-[var(--border-hairline)] disabled:opacity-60"
                      title="Simulasikan staf posko mengedit angka di Google Sheet dan melihatnya mengalir otomatis lewat PostGIS ke dashboard"
                    >
                      {isSimulatingSheetEdit
                        ? 'Menyinkronkan...'
                        : '+ Simulasi update posko'}
                    </button>
                  </div>

                  {/* Sheet URL/ID + Interval Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-1.5 items-center">
                    <div className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-deepest)] px-2.5 h-8 border border-[var(--border-hairline)]">
                      <Link2 className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" strokeWidth={1.5} />
                      <input
                        type="text"
                        value={sheetUrlInput}
                        onChange={(e) => setSheetUrlInput(e.target.value)}
                        placeholder="URL atau ID Google Sheet"
                        aria-label="URL atau ID Google Sheet Posko"
                        className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                      />
                    </div>

                    <select
                      value={sheetPollIntervalSec}
                      onChange={(e) => setSheetPollIntervalSec(Number(e.target.value))}
                      aria-label="Interval Auto-Poll Google Sheet"
                      className="h-8 rounded-lg bg-[var(--surface-deepest)] px-2.5 text-[11px] font-medium text-[var(--text-primary)] border border-[var(--border-hairline)] focus:outline-none cursor-pointer"
                    >
                      <option value={15}>Tiap 15 dtk</option>
                      <option value={30}>Tiap 30 dtk</option>
                      <option value={60}>Tiap 60 dtk</option>
                    </select>

                    <button
                      type="button"
                      disabled={isSavingSheetConfig}
                      onPointerDown={() => {
                        setIsSavingSheetConfig(true);
                        void configureGoogleSheets(sheetUrlInput, sheetPollIntervalSec).finally(() => {
                          setIsSavingSheetConfig(false);
                        });
                      }}
                      className="apple-pressable rounded-lg bg-[var(--text-primary)] px-3 h-8 text-[11px] font-medium text-[var(--surface-card)] disabled:opacity-60"
                    >
                      {isSavingSheetConfig ? 'Menyimpan...' : 'Aktifkan auto-sync'}
                    </button>
                  </div>

                  {/* Live Sync Status Telemetry */}
                  <div className="rounded-lg bg-[var(--surface-deepest)] p-2.5 border border-[var(--border-hairline)] space-y-1 text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[var(--text-muted)]">Status poller otomatis:</span>
                      <span
                        className={`font-mono-tabular font-medium ${
                          gsheetsSync?.enabled ? 'text-[var(--positive)]' : 'text-[var(--warning)]'
                        }`}
                      >
                        {gsheetsSync?.enabled
                          ? `Aktif · "${gsheetsSync.sheetName}" (${gsheetsSync.pollIntervalSec} dtk)`
                          : 'Standby (siap menerima webhook / simulasi)'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                      <span className="font-mono-tabular">
                        Sinkronisasi berhasil: {gsheetsSync?.syncCount ?? 0} kali
                      </span>
                      <span className="font-mono-tabular">
                        Webhook: {gsheetsSync?.webhookEndpoint ?? '/api/bnpb/webhook/gsheets'}
                      </span>
                    </div>
                    {gsheetsSync?.lastError && (
                      <div className="rounded bg-[var(--negative-soft)] px-2 py-1 text-[11px] text-[var(--negative)]">
                        {gsheetsSync.lastError}
                      </div>
                    )}
                  </div>

                  {/* Collapsible Google Apps Script onEdit Webhook Viewer */}
                  <div className="pt-0.5">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onPointerDown={() => setShowAppsScriptSnippet(!showAppsScriptSnippet)}
                        className="apple-pressable inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--info)] hover:underline"
                      >
                        <Code2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        <span>
                          {showAppsScriptSnippet
                            ? 'Sembunyikan skrip Google Apps Script (onEdit Push < 1 dtk)'
                            : 'Lihat skrip Google Apps Script (onEdit Push < 1 dtk)'}
                        </span>
                      </button>

                      {showAppsScriptSnippet && appsScriptCode && (
                        <button
                          type="button"
                          onPointerDown={() => {
                            if (typeof navigator !== 'undefined' && navigator.clipboard) {
                              void navigator.clipboard.writeText(appsScriptCode);
                              setCopiedAppsScript(true);
                              window.setTimeout(() => setCopiedAppsScript(false), 1800);
                            }
                          }}
                          className="apple-pressable inline-flex items-center gap-1 rounded bg-[var(--surface-deepest)] px-2 py-1 text-[10px] font-medium text-[var(--text-primary)] border border-[var(--border-hairline)]"
                        >
                          {copiedAppsScript ? (
                            <>
                              <Check className="h-3 w-3 text-[var(--positive)]" strokeWidth={1.5} />
                              <span>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" strokeWidth={1.5} />
                              <span>Salin Apps Script</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {showAppsScriptSnippet && (
                      <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-[var(--surface-deepest)] p-2.5 text-[11px] font-mono-tabular text-[var(--text-secondary)] border border-[var(--border-hairline)] leading-relaxed select-text">
                        {appsScriptCode || '// Memuat templat Google Apps Script...'}
                      </pre>
                    )}
                  </div>
                </div>

                <div className="apple-elevated-card rounded-xl p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--positive)]" strokeWidth={1.5} />
                    <h3 className="text-xs font-medium text-[var(--text-primary)]">
                      Audit keamanan REA &amp; mitigasi kerentanan BNPB Karhutla 2026
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Hasil analisis statis &amp; observasi pasif REA terhadap{' '}
                    <code className="text-[var(--text-primary)]">data.bnpb.go.id</code> dan{' '}
                    <code className="text-[var(--text-primary)]">gis.bnpb.go.id</code> beserta
                    perlindungan yang diterapkan di Nusantara Watch.
                  </p>
                </div>

                {BNPB_SECURITY_AUDIT_FINDINGS.map((finding) => (
                  <div
                    key={finding.id}
                    className="apple-elevated-card rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        {finding.id} · {finding.title}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          finding.severity === 'High'
                            ? 'bg-[var(--negative-soft)] text-[var(--negative)]'
                            : finding.severity === 'Medium'
                              ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                              : 'bg-[var(--positive-soft)] text-[var(--positive)]'
                        }`}
                      >
                        {finding.severity}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-[var(--surface-deepest)] p-2.5 border border-[var(--border-hairline)]">
                        <span className="text-[11px] font-medium text-[var(--negative)] block mb-0.5">
                          Temuan di BNPB Dashboard
                        </span>
                        <p className="text-[var(--text-secondary)] leading-relaxed">
                          {finding.bnpbObservation}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-deepest)] p-2.5 border border-[var(--border-hairline)]">
                        <span className="text-[11px] font-medium text-[var(--positive)] block mb-0.5">
                          Proteksi di Nusantara Watch
                        </span>
                        <p className="text-[var(--text-secondary)] leading-relaxed">
                          {finding.nusantaraWatchDefense}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-mono-tabular">
                      <span>REA evidence: {finding.reaEvidenceRef.slice(0, 24)}...</span>
                      <span className="text-[var(--positive)] font-sans font-medium">
                        Termitigasi
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Summary Bar */}
          <div className="px-4 py-2.5 border-t border-[var(--border-hairline)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-[var(--positive)]" strokeWidth={1.5} />
              <span>Cakupan: {metrics.scopeLabel}</span>
            </span>
            <span className="font-mono-tabular font-medium text-[var(--text-secondary)]">
              {metrics.totalUnitUdara} unit udara · {metrics.totalPersonel.toLocaleString('id-ID')}{' '}
              personel
            </span>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
