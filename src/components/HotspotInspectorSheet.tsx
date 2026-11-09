import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertOctagon,
  ChevronRight,
  Compass,
  Flame,
  Navigation,
  Trees,
  Wind,
  X,
} from 'lucide-react';
import {
  INDONESIAN_HOTSPOTS,
  SIRUP_BUDGET_PACKAGES,
} from '../data/local_data/indonesia-osint-seed';
import { useWatchStore } from '../store/useWatchStore';
import {
  APPLE_SPRINGS,
  applyRubberbandBounds,
  PointerVelocityTracker,
  resolveSnapWithMomentum,
} from '../utils/apple-physics';
import { formatCoordinates, formatRupiah } from '../utils/formatters';

export function HotspotInspectorSheet() {
  const selectedHotspotId = useWatchStore((s) => s.selectedHotspotId);
  const selectHotspot = useWatchStore((s) => s.selectHotspot);
  const selectBudget = useWatchStore((s) => s.selectBudget);
  const setBudgetWatchdogOpen = useWatchStore((s) => s.setBudgetWatchdogOpen);

  const hotspot = useMemo(
    () => INDONESIAN_HOTSPOTS.find((h) => h.id === selectedHotspotId) ?? null,
    [selectedHotspotId]
  );

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
    // Rubber-band upward pulls (< 0) strongly, allow downward drag to dismiss
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
    // Snap points: 0 (open) or 340 (dismiss)
    const snapTarget = resolveSnapWithMomentum(dragY, vy, [0, 340], 0.992);
    if (snapTarget >= 340 || dragY > 140) {
      setDragY(0);
      selectHotspot(null);
    } else {
      setDragY(0);
    }
  };

  // Cycle to next hotspot in roster
  const handleNextHotspot = () => {
    if (!hotspot) return;
    const idx = INDONESIAN_HOTSPOTS.findIndex((h) => h.id === hotspot.id);
    const next = INDONESIAN_HOTSPOTS[(idx + 1) % INDONESIAN_HOTSPOTS.length];
    selectHotspot(next.id);
  };

  return (
    <AnimatePresence>
      {hotspot && (
        <motion.aside
          key={hotspot.id}
          initial={{ opacity: 0, x: 36, scale: 0.96 }}
          animate={{
            opacity: 1,
            x: 0,
            y: dragY,
            scale: 1,
          }}
          exit={{ opacity: 0, x: 36, scale: 0.96 }}
          transition={isDragging ? { duration: 0 } : APPLE_SPRINGS.sheet}
          aria-label="Detail Titik Panas & Akuntabilitas Lahan"
          className="fixed right-3 top-20 bottom-28 z-30 w-[calc(100vw-24px)] sm:w-[390px] apple-glass-heavy rounded-3xl flex flex-col overflow-hidden"
          style={{ transformOrigin: 'top right' }}
        >
          {/* 1:1 Pointer-Capture Drag Handle Header */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="cursor-grab active:cursor-grabbing select-none touch-none px-4 pt-3 pb-2.5 border-b border-white/[0.08]"
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/25" />
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#ff453a]/20 px-2 py-0.5 text-[10px] font-semibold text-[#ff6961] border border-[#ff453a]/30">
                    <Flame className="h-3 w-3" />
                    {hotspot.satellite}
                  </span>
                  <span className="tabular-nums text-[11px] font-medium text-zinc-400">
                    {hotspot.id}
                  </span>
                </div>
                <h2 className="type-title text-white mt-1">
                  Kec. {hotspot.kecamatan}, {hotspot.kabupaten}
                </h2>
                <p className="text-xs text-zinc-400">
                  Provinsi {hotspot.province} ·{' '}
                  <span className="tabular-nums">
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
                className="apple-pressable rounded-full bg-white/10 p-1.5 text-zinc-300 hover:text-white"
                aria-label="Tutup panel inspeksi"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Telemetry Body with Gradient Edge Mask */}
          <div className="scroll-mask-y flex-1 overflow-y-auto px-4 py-3.5 space-y-3">
            {/* Primary Satellite Telemetry Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="apple-elevated-card rounded-2xl p-2.5">
                <span className="type-micro text-zinc-400 block">Radiative Power</span>
                <span className="tabular-nums text-base font-semibold text-[#ff453a]">
                  {hotspot.frpMw} MW
                </span>
              </div>
              <div className="apple-elevated-card rounded-2xl p-2.5">
                <span className="type-micro text-zinc-400 block">Confidence</span>
                <span className="tabular-nums text-base font-semibold text-white">
                  {hotspot.confidence}%
                </span>
              </div>
              <div className="apple-elevated-card rounded-2xl p-2.5">
                <span className="type-micro text-zinc-400 block">Durasi Aktif</span>
                <span className="tabular-nums text-base font-semibold text-[#ff9f0a]">
                  {hotspot.persistenceHours} Jam
                </span>
              </div>
            </div>

            {/* Concession & Peatland Accountability Card */}
            <div className="apple-elevated-card rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="type-micro text-zinc-300 flex items-center gap-1.5">
                  <Trees className="h-3.5 w-3.5 text-[#30d158]" />
                  Status Lahan &amp; Konsesi
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    hotspot.inConcession
                      ? 'bg-[#ff9f0a]/20 text-[#ffb340] border border-[#ff9f0a]/30'
                      : 'bg-white/10 text-zinc-300'
                  }`}
                >
                  {hotspot.concessionType}
                </span>
              </div>

              <p className="text-xs font-medium text-white">
                {hotspot.concessionHolder ?? 'Lahan Non-Konsesi / Kawasan Terbuka'}
              </p>

              <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400 border-t border-white/[0.06]">
                <span>Ekosistem Gambut (KHG)</span>
                <span className="tabular-nums font-medium text-zinc-200">
                  {hotspot.isPeatland
                    ? `Gambut Dalam (${hotspot.peatDepthMeters} meter)`
                    : 'Tanah Mineral'}
                </span>
              </div>
            </div>

            {/* 50 km Proximity Roster (Manggala Agni + BMKG ISPU) */}
            <div className="apple-elevated-card rounded-2xl p-3.5 space-y-2.5">
              <span className="type-micro text-zinc-300 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5 text-[#0a84ff]" />
                Radius 50 km · Respon &amp; Dampak Udara
              </span>

              <div className="flex items-start justify-between gap-2 text-xs">
                <div>
                  <p className="font-medium text-white">{hotspot.nearestDaops.name}</p>
                  <p className="text-[11px] text-zinc-400">
                    Posko Pemadam Darat &amp; Satgas Terdekat
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="tabular-nums font-semibold text-white block">
                    {hotspot.nearestDaops.distanceKm} km
                  </span>
                  <span
                    className={`text-[10px] ${
                      hotspot.nearestDaops.waterBombingReady
                        ? 'text-[#30d158]'
                        : 'text-zinc-400'
                    }`}
                  >
                    {hotspot.nearestDaops.waterBombingReady
                      ? 'Heli Water Bombing Siaga'
                      : 'Akses Darat'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs">
                <div className="flex items-center gap-1.5">
                  <Wind className="h-3.5 w-3.5 text-[#bf5af2]" />
                  <div>
                    <p className="font-medium text-white">
                      {hotspot.nearestIspuStation.name}
                    </p>
                    <p className="tabular-nums text-[11px] text-zinc-400">
                      PM2.5: {hotspot.nearestIspuStation.pm25} µg/m³
                    </p>
                  </div>
                </div>
                <span className="tabular-nums rounded-lg bg-[#bf5af2]/20 px-2 py-1 text-[11px] font-semibold text-[#d98ff8] border border-[#bf5af2]/30">
                  ISPU {hotspot.nearestIspuStation.ispuScore} ·{' '}
                  {hotspot.nearestIspuStation.category}
                </span>
              </div>
            </div>

            {/* Provincial SiRUP Budget Watchdog Correlation */}
            {provincialBudgets.length > 0 && (
              <div className="apple-elevated-card rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="type-micro text-[#ffd60a] flex items-center gap-1.5">
                    <AlertOctagon className="h-3.5 w-3.5" />
                    Anggaran SiRUP Provinsi {hotspot.province}
                  </span>
                </div>

                {provincialBudgets.map((pkg) => (
                  <div
                    key={pkg.sirupId}
                    className="rounded-xl bg-black/30 p-2.5 border border-white/[0.06] space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="tabular-nums text-xs font-semibold text-white">
                        {formatRupiah(pkg.budgetRp)}
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                          pkg.anomalyLevel === 'Disproportionate'
                            ? 'bg-[#ff453a]/20 text-[#ff6961]'
                            : pkg.anomalyLevel === 'Elevated'
                              ? 'bg-[#ff9f0a]/20 text-[#ffb340]'
                              : 'bg-[#30d158]/20 text-[#30d158]'
                        }`}
                      >
                        {pkg.anomalyLevel}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-zinc-200 leading-snug">
                      {pkg.packageName}
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {pkg.anomalyReason}
                    </p>
                    <button
                      type="button"
                      onPointerDown={() => {
                        selectBudget(pkg.sirupId);
                        setBudgetWatchdogOpen(true);
                      }}
                      className="apple-pressable mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#ffd60a] hover:underline"
                    >
                      <span>Lihat di Audit Anggaran SiRUP</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Quick Target Stepper */}
          <div className="px-4 py-2.5 border-t border-white/[0.08] flex items-center justify-between">
            <span className="tabular-nums text-[11px] text-zinc-400">
              Suhu Kecerahan: {hotspot.brightnessK} K
            </span>
            <button
              type="button"
              onPointerDown={handleNextHotspot}
              className="apple-pressable flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15"
            >
              <Navigation className="h-3 w-3" />
              <span>Titik Api Berikutnya</span>
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
