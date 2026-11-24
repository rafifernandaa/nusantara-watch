import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertOctagon,
  Camera,
  ChevronRight,
  Compass,
  ExternalLink,
  Flame,
  FolderOpen,
  Minimize2,
  Navigation,
  Trees,
  X,
} from 'lucide-react';
import { SIRUP_BUDGET_PACKAGES } from '../data/local_data/indonesia-osint-seed';
import { useWatchStore } from '../store/useWatchStore';
import {
  APPLE_SPRINGS,
  applyRubberbandBounds,
  PointerVelocityTracker,
  resolveSnapWithMomentum,
} from '../utils/apple-physics';
import { filterHotspots, formatCoordinates, formatRupiah, formatShortRupiah } from '../utils/formatters';
import { getFieldDocsForHotspot, parseGoogleDriveLink } from '../utils/gdriveEvidence';
import { BklitAreaSparkChart, BklitIspuGauge } from './charts/BklitCharts';
import { FirmsMatrixHairline } from './SortieDeckHairline';

export function HotspotInspectorSheet() {
  const selectedHotspotId = useWatchStore((s) => s.selectedHotspotId);
  const hotspots = useWatchStore((s) => s.hotspots);
  const customFieldDocs = useWatchStore((s) => s.customFieldDocs);
  const selectedProvinceFilter = useWatchStore((s) => s.selectedProvinceFilter);
  const timelineDayOffset = useWatchStore((s) => s.timelineDayOffset);
  const cumulativeTimeline = useWatchStore((s) => s.cumulativeTimeline);
  const selectHotspot = useWatchStore((s) => s.selectHotspot);
  const selectBudget = useWatchStore((s) => s.selectBudget);
  const setBudgetWatchdogOpen = useWatchStore((s) => s.setBudgetWatchdogOpen);
  const setActiveEvidenceModalDoc = useWatchStore((s) => s.setActiveEvidenceModalDoc);

  const [isEmptyCollapsed, setIsEmptyCollapsed] = useState(false);

  const hotspot = useMemo(
    () => hotspots.find((h) => h.id === selectedHotspotId) ?? null,
    [hotspots, selectedHotspotId]
  );

  const hotspotFieldDocs = useMemo(
    () => (hotspot ? getFieldDocsForHotspot(hotspot, customFieldDocs) : []),
    [hotspot, customFieldDocs]
  );

  const visibleHotspots = useMemo(
    () =>
      filterHotspots(
        hotspots,
        selectedProvinceFilter,
        timelineDayOffset,
        cumulativeTimeline
      ),
    [hotspots, selectedProvinceFilter, timelineDayOffset, cumulativeTimeline]
  );

  const emptySummary = useMemo(() => {
    const inConcession = visibleHotspots.filter((h) => h.inConcession).length;
    const concessionRatio =
      visibleHotspots.length > 0
        ? Math.round((inConcession / visibleHotspots.length) * 100)
        : 0;
    const totalBudgetRp = SIRUP_BUDGET_PACKAGES.filter(
      (b) => selectedProvinceFilter === 'ALL' || b.province === selectedProvinceFilter
    ).reduce((acc, b) => acc + b.budgetRp, 0);

    return {
      count: visibleHotspots.length,
      concessionRatio,
      totalBudgetRp,
    };
  }, [visibleHotspots, selectedProvinceFilter]);

  const provincialBudgets = useMemo(
    () =>
      hotspot
        ? SIRUP_BUDGET_PACKAGES.filter((b) => b.province === hotspot.province)
        : [],
    [hotspot]
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
    const resistedY = applyRubberbandBounds(rawDeltaY, 0, 260, 360, 0.52);
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
    if (snapTarget >= 340 || dragY > 140) {
      setDragY(0);
      selectHotspot(null);
    } else {
      setDragY(0);
    }
  };

  const handleNextHotspot = () => {
    if (!hotspot || hotspots.length === 0) return;
    const idx = hotspots.findIndex((h) => h.id === hotspot.id);
    const next = hotspots[(idx + 1) % hotspots.length];
    selectHotspot(next.id);
  };

  if (!hotspot) {
    if (isEmptyCollapsed) {
      return (
        <button
          type="button"
          onPointerDown={() => setIsEmptyCollapsed(false)}
          className="apple-pressable apple-glass-pill fixed right-4 top-20 z-20 flex items-center gap-2 rounded-lg px-3 h-8 text-xs font-medium text-[var(--text-primary)]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          <span>Inspektor siaga</span>
        </button>
      );
    }

    return (
      <aside
        aria-label="Inspektor Titik Api Siaga"
        className="fixed right-4 top-20 bottom-24 z-20 hidden lg:flex w-[392px] apple-glass-heavy rounded-2xl flex-col overflow-hidden"
      >
        <div className="px-5 pt-4 pb-3 border-b border-[var(--border-hairline)] flex items-start justify-between gap-3">
          <div>
            <h2 className="type-title text-[var(--text-primary)]">Inspektor titik api</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Matriks termal 3D titik api aktif (MW) — klik pilar untuk inspeksi
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-mono-tabular rounded px-2 py-0.5 text-[11px] bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border-hairline)]">
              Siaga
            </span>
            <button
              type="button"
              onPointerDown={() => setIsEmptyCollapsed(true)}
              className="apple-pressable rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
              aria-label="Perkecil panel inspektor"
            >
              <Minimize2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="scroll-mask-y flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          <FirmsMatrixHairline
            hotspots={visibleHotspots}
            onSelectHotspot={(id) => selectHotspot(id)}
          />

          <div className="grid grid-cols-3 gap-2">
            <div className="apple-elevated-card rounded-xl px-3 py-2.5">
              <span className="text-[11px] text-[var(--text-muted)] block">Titik aktif</span>
              <span className="font-mono-tabular text-base font-medium text-[var(--accent)] mt-0.5 block">
                {emptySummary.count}
              </span>
            </div>
            <div className="apple-elevated-card rounded-xl px-3 py-2.5">
              <span className="text-[11px] text-[var(--text-muted)] block">Di konsesi</span>
              <span className="font-mono-tabular text-base font-medium text-[var(--text-primary)] mt-0.5 block">
                {emptySummary.concessionRatio}%
              </span>
            </div>
            <div className="apple-elevated-card rounded-xl px-3 py-2.5">
              <span className="text-[11px] text-[var(--text-muted)] block">Pagu SiRUP</span>
              <span className="font-mono-tabular text-base font-medium text-[var(--text-primary)] mt-0.5 block whitespace-nowrap">
                {formatShortRupiah(emptySummary.totalBudgetRp)}
              </span>
            </div>
          </div>

          <div className="mt-auto rounded-xl bg-[var(--surface-deepest)] border border-[var(--border-hairline)] px-3 py-2.5 flex items-center justify-between gap-2">
            <span className="text-xs text-[var(--text-secondary)]">
              Klik pin di peta atau mulai inspeksi
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onPointerDown={() => {
                  const first = visibleHotspots[0] ?? hotspots[0];
                  if (first) selectHotspot(first.id);
                }}
                className="apple-pressable h-7 px-2.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)]"
              >
                Inspeksi titik
              </button>
              <kbd className="font-mono-tabular rounded bg-[var(--surface-raised)] border border-[var(--border-hairline)] px-1.5 py-0.5 text-[11px] text-[var(--text-muted)]">
                Esc
              </kbd>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <AnimatePresence>
      <motion.aside
        key={hotspot.id}
        initial={{ opacity: 0, x: 32, scale: 0.97 }}
        animate={{
          opacity: 1,
          x: 0,
          y: dragY,
          scale: 1,
        }}
        exit={{ opacity: 0, x: 32, scale: 0.97 }}
        transition={isDragging ? { duration: 0 } : APPLE_SPRINGS.sheet}
        aria-label="Detail Titik Panas & Akuntabilitas Lahan"
        className="fixed right-4 top-20 bottom-24 z-30 w-[calc(100vw-32px)] sm:w-[392px] apple-glass-heavy rounded-2xl flex flex-col overflow-hidden"
        style={{ transformOrigin: 'top right' }}
      >
        {/* 1:1 Pointer-Capture Drag Handle Header */}
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
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Flame className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {hotspot.satellite}
                </span>
                <span className="font-mono-tabular text-[11px] text-[var(--text-muted)]">
                  {hotspot.id}
                </span>
              </div>
              <h2 className="type-title text-[var(--text-primary)] mt-1.5">
                Kec. {hotspot.kecamatan}, {hotspot.kabupaten}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Provinsi {hotspot.province} ·{' '}
                <span className="font-mono-tabular">
                  {formatCoordinates(hotspot.coordinates[0], hotspot.coordinates[1])}
                </span>
              </p>
            </div>

            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                selectHotspot(null);
              }}
              className="apple-pressable rounded-lg bg-[var(--surface-raised)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]"
              aria-label="Tutup panel inspeksi"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Scrollable Telemetry Body */}
        <div className="scroll-mask-y flex-1 overflow-y-auto px-4 py-3.5 space-y-3">
          {/* Primary Satellite Telemetry Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="apple-elevated-card rounded-xl p-2.5">
              <span className="text-xs text-[var(--text-muted)] block">Radiative power</span>
              <span className="font-mono-tabular text-base font-medium text-[var(--accent)] mt-0.5 block">
                {hotspot.frpMw} MW
              </span>
            </div>
            <div className="apple-elevated-card rounded-xl p-2.5">
              <span className="text-xs text-[var(--text-muted)] block">Confidence</span>
              <span className="font-mono-tabular text-base font-medium text-[var(--text-primary)] mt-0.5 block">
                {hotspot.confidence}%
              </span>
            </div>
            <div className="apple-elevated-card rounded-xl p-2.5">
              <span className="text-xs text-[var(--text-muted)] block">Durasi aktif</span>
              <span className="font-mono-tabular text-base font-medium text-[var(--text-primary)] mt-0.5 block">
                {hotspot.persistenceHours} jam
              </span>
            </div>
          </div>

          {/* Bklit 7-Day FRP Trajectory AreaChart */}
          <BklitAreaSparkChart hotspot={hotspot} />

          {/* Concession & Peatland Accountability Card */}
          <div className="apple-elevated-card rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                <Trees className="h-4 w-4 text-[var(--positive)]" strokeWidth={1.5} />
                Status lahan &amp; konsesi
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                  hotspot.inConcession
                    ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                    : 'bg-[var(--surface-card)] text-[var(--text-secondary)] border border-[var(--border-hairline)]'
                }`}
              >
                {hotspot.concessionType}
              </span>
            </div>

            <p className="text-xs font-medium text-[var(--text-primary)]">
              {hotspot.concessionHolder ?? 'Lahan Non-Konsesi / Kawasan Terbuka'}
            </p>

            <div className="flex items-center justify-between pt-2 text-xs text-[var(--text-secondary)] border-t border-[var(--border-hairline)]">
              <span>Ekosistem gambut (KHG)</span>
              <span className="font-mono-tabular font-medium text-[var(--text-primary)]">
                {hotspot.isPeatland
                  ? `Gambut dalam (${hotspot.peatDepthMeters} m)`
                  : 'Tanah mineral'}
              </span>
            </div>
          </div>

          {/* 50 km Proximity Roster */}
          <div className="apple-elevated-card rounded-xl p-3.5 space-y-2.5">
            <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-[var(--info)]" strokeWidth={1.5} />
              Radius 50 km · Respon &amp; dampak udara
            </span>

            <div className="flex items-start justify-between gap-2 text-xs">
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {hotspot.nearestDaops.name}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Posko pemadam darat &amp; satgas terdekat
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono-tabular font-medium text-[var(--text-primary)] block">
                  {hotspot.nearestDaops.distanceKm} km
                </span>
                <span
                  className={`text-[11px] ${
                    hotspot.nearestDaops.waterBombingReady
                      ? 'text-[var(--positive)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {hotspot.nearestDaops.waterBombingReady
                    ? 'Heli water bombing siaga'
                    : 'Akses darat'}
                </span>
              </div>
            </div>

            <BklitIspuGauge
              score={hotspot.nearestIspuStation.ispuScore}
              pm25={hotspot.nearestIspuStation.pm25}
              category={hotspot.nearestIspuStation.category}
              stationName={hotspot.nearestIspuStation.name}
            />
          </div>

          {/* BNPB Field Worker Documentation (Google Drive Photos & Folders) */}
          {hotspotFieldDocs.length > 0 && (
            <div className="apple-elevated-card rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} />
                  Dokumentasi lapangan (Google Drive)
                </span>
                <span className="font-mono-tabular rounded px-1.5 py-0.5 text-[10px] bg-[var(--surface-deepest)] text-[var(--text-muted)] border border-[var(--border-hairline)]">
                  {hotspotFieldDocs.length} bukti
                </span>
              </div>

              <div className="space-y-2">
                {hotspotFieldDocs.map((doc) => {
                  const parsed = parseGoogleDriveLink(doc.driveUrl);
                  return (
                    <div
                      key={doc.id}
                      className="rounded-lg bg-[var(--surface-deepest)] border border-[var(--border-hairline)] overflow-hidden"
                    >
                      <button
                        type="button"
                        onPointerDown={() => setActiveEvidenceModalDoc(doc)}
                        className="w-full text-left group"
                      >
                        <img
                          src={doc.thumbnailDataUri}
                          alt={doc.title}
                          className="w-full h-28 object-cover block"
                        />
                        <div className="p-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                              {doc.title}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)] shrink-0">
                              {doc.mediaType === 'folder' && <FolderOpen className="h-3 w-3" />}
                              <span>Lightbox</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {doc.team} · {doc.capturedAt}
                          </p>
                        </div>
                      </button>

                      {parsed.isValidDriveUrl && (
                        <div className="px-2.5 pb-2 pt-0.5 flex items-center justify-between border-t border-[var(--border-hairline)]">
                          <span className="font-mono-tabular text-[10px] text-[var(--text-muted)] truncate">
                            drive.google.com/{parsed.kind}
                          </span>
                          <a
                            href={parsed.cleanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--info)] hover:underline shrink-0"
                          >
                            <span>Buka Drive</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Provincial SiRUP Budget Watchdog Correlation */}
          {provincialBudgets.length > 0 && (
            <div className="apple-elevated-card rounded-xl p-3.5 space-y-2">
              <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4 text-[var(--warning)]" strokeWidth={1.5} />
                Anggaran SiRUP Provinsi {hotspot.province}
              </span>

              {provincialBudgets.map((pkg) => (
                <div
                  key={pkg.sirupId}
                  className="rounded-lg bg-[var(--surface-deepest)] p-2.5 border border-[var(--border-hairline)] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tabular text-xs font-medium text-[var(--text-primary)]">
                      {formatRupiah(pkg.budgetRp)}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                        pkg.anomalyLevel === 'Disproportionate'
                          ? 'bg-[var(--negative-soft)] text-[var(--negative)]'
                          : pkg.anomalyLevel === 'Elevated'
                            ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                            : 'bg-[var(--positive-soft)] text-[var(--positive)]'
                      }`}
                    >
                      {pkg.anomalyLevel}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                    {pkg.packageName}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {pkg.anomalyReason}
                  </p>
                  <button
                    type="button"
                    onPointerDown={() => {
                      selectBudget(pkg.sirupId);
                      setBudgetWatchdogOpen(true);
                    }}
                    className="apple-pressable mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    <span>Lihat di Audit Anggaran SiRUP</span>
                    <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Quick Target Stepper */}
        <div className="px-4 py-2.5 border-t border-[var(--border-hairline)] flex items-center justify-between">
          <span className="font-mono-tabular text-xs text-[var(--text-muted)]">
            Suhu kecerahan: {hotspot.brightnessK} K
          </span>
          <button
            type="button"
            onPointerDown={handleNextHotspot}
            className="apple-pressable flex items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-hairline)] px-3 h-8 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)]"
          >
            <Navigation className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>Titik api berikutnya</span>
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
