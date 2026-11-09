import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Globe,
  Pause,
  Play,
  RotateCcw,
  Share2,
} from 'lucide-react';
import { useWatchStore } from '../store/useWatchStore';
import { applyRubberbandBounds } from '../utils/apple-physics';
import { getDayLabel } from '../utils/formatters';
import type { BasemapStyle, LayerId } from '../types/watch';

const LAYER_CONFIG: { id: LayerId; label: string; shortcut: string; color: string }[] = [
  { id: 'hotspots', label: 'Titik Api FIRMS', shortcut: '1', color: '#ff453a' },
  { id: 'concessions', label: 'Konsesi & Gambut', shortcut: '2', color: '#30d158' },
  { id: 'budgets', label: 'Arc Anggaran SiRUP', shortcut: '3', color: '#ffd60a' },
  { id: 'wind-ispu', label: 'Angin & ISPU BMKG', shortcut: '4', color: '#0a84ff' },
];

const BASEMAPS: { id: BasemapStyle; label: string }[] = [
  { id: 'dark-glass', label: 'Dark Glass' },
  { id: 'satellite', label: 'Satelit Esri' },
  { id: 'terrain', label: 'Topografi' },
];

export function BottomDock() {
  const basemap = useWatchStore((s) => s.basemap);
  const isGlobeProjection = useWatchStore((s) => s.isGlobeProjection);
  const activeLayers = useWatchStore((s) => s.activeLayers);
  const timelineDayOffset = useWatchStore((s) => s.timelineDayOffset);
  const cumulativeTimeline = useWatchStore((s) => s.cumulativeTimeline);
  const isPlayingTimeline = useWatchStore((s) => s.isPlayingTimeline);

  const setBasemap = useWatchStore((s) => s.setBasemap);
  const toggleGlobeProjection = useWatchStore((s) => s.toggleGlobeProjection);
  const toggleLayer = useWatchStore((s) => s.toggleLayer);
  const setTimelineDayOffset = useWatchStore((s) => s.setTimelineDayOffset);
  const setCumulativeTimeline = useWatchStore((s) => s.setCumulativeTimeline);
  const setIsPlayingTimeline = useWatchStore((s) => s.setIsPlayingTimeline);
  const resetGlobe = useWatchStore((s) => s.resetGlobe);
  const syncStateToUrl = useWatchStore((s) => s.syncStateToUrl);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [rubberPullPx, setRubberPullPx] = useState(0);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Timeline playback loop
  useEffect(() => {
    if (!isPlayingTimeline) return;
    const timer = window.setInterval(() => {
      const current = useWatchStore.getState().timelineDayOffset;
      if (current >= 0) {
        setTimelineDayOffset(-6);
      } else {
        setTimelineDayOffset(current + 1);
      }
    }, 1100);
    return () => window.clearInterval(timer);
  }, [isPlayingTimeline, setTimelineDayOffset]);

  // 1:1 Pointer-Captured Scrubbing with Rubber-Banding at Boundaries
  const updateScrubberFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const rawX = clientX - rect.left;
    const clampedWithRubber = applyRubberbandBounds(rawX, 0, rect.width, rect.width, 0.35);

    if (rawX < 0) {
      setRubberPullPx(clampedWithRubber);
    } else if (rawX > rect.width) {
      setRubberPullPx(clampedWithRubber - rect.width);
    } else {
      setRubberPullPx(0);
    }

    const ratio = Math.max(0, Math.min(1, rawX / Math.max(1, rect.width)));
    const nextDay = Math.round(-6 + ratio * 6);
    setTimelineDayOffset(nextDay);
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPlayingTimeline(false);
    updateScrubberFromPointer(e.clientX);
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    updateScrubberFromPointer(e.clientX);
  };

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setRubberPullPx(0);
    syncStateToUrl();
  };

  const handleCopyShareLink = async () => {
    const url = syncStateToUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      // Fallback ignored
    }
  };

  const progressPercent = ((timelineDayOffset + 6) / 6) * 100;

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 right-3 z-30 flex flex-col items-center gap-2">
      {/* 7-Day Spatiotemporal Timeline Scrubber */}
      <div
        className="pointer-events-auto apple-glass-pill flex w-full max-w-3xl items-center gap-3 rounded-2xl px-3.5 py-2"
        style={{
          transform: `translate3d(${rubberPullPx * 0.35}px, 0, 0)`,
          transition: rubberPullPx === 0 ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        }}
      >
        <button
          type="button"
          onPointerDown={() => setIsPlayingTimeline(!isPlayingTimeline)}
          className="apple-pressable flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/15"
          aria-label={isPlayingTimeline ? 'Jeda lini masa' : 'Putar lini masa 7 hari'}
        >
          {isPlayingTimeline ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>

        <div className="flex flex-col min-w-[138px]">
          <span className="type-micro text-zinc-400">Lini Masa Satelit (7 Hari)</span>
          <span className="tabular-nums text-xs font-semibold text-white">
            {getDayLabel(timelineDayOffset)}
          </span>
        </div>

        {/* 1:1 Pointer Capture Track */}
        <div
          ref={trackRef}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
          onPointerCancel={handleTrackPointerUp}
          role="slider"
          aria-label="Geser rentang hari deteksi titik api"
          aria-valuemin={-6}
          aria-valuemax={0}
          aria-valuenow={timelineDayOffset}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setTimelineDayOffset(timelineDayOffset - 1);
            if (e.key === 'ArrowRight') setTimelineDayOffset(timelineDayOffset + 1);
          }}
          className="relative flex-1 h-7 flex items-center cursor-ew-resize select-none touch-none"
        >
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ff9f0a] to-[#ff453a]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Day ticks */}
          <div className="pointer-events-none absolute inset-x-0 flex justify-between px-0.5">
            {[-6, -5, -4, -3, -2, -1, 0].map((d) => (
              <span
                key={d}
                className={`h-2 w-0.5 rounded-full ${
                  d <= timelineDayOffset ? 'bg-white/60' : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Thumb */}
          <div
            className="pointer-events-none absolute -ml-2.5 h-5 w-5 rounded-full bg-white shadow-lg border border-black/20"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        <button
          type="button"
          onPointerDown={() => setCumulativeTimeline(!cumulativeTimeline)}
          className="apple-pressable rounded-xl bg-white/[0.07] px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white border border-white/10"
          title="Tampilkan akumulasi 7 hari atau hanya hari terpilih"
        >
          {cumulativeTimeline ? 'Akumulatif' : 'Per Hari'}
        </button>
      </div>

      {/* Main Floating macOS / visionOS Control Dock */}
      <div className="pointer-events-auto apple-glass-heavy flex flex-wrap items-center justify-center gap-2 rounded-2xl px-3 py-2">
        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-1.5">
          {LAYER_CONFIG.map((layer) => {
            const active = activeLayers[layer.id];
            return (
              <button
                key={layer.id}
                type="button"
                onPointerDown={() => toggleLayer(layer.id)}
                aria-pressed={active}
                className={`apple-pressable flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-white/14 text-white border border-white/20'
                    : 'bg-transparent text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: active ? layer.color : 'rgba(255,255,255,0.2)',
                  }}
                />
                <span>{layer.label}</span>
                <kbd className="hidden sm:inline-block rounded bg-white/10 px-1 text-[10px] text-zinc-400">
                  {layer.shortcut}
                </kbd>
              </button>
            );
          })}
        </div>

        <div className="hidden md:block h-5 w-px bg-white/10 mx-1" />

        {/* Basemap Switcher */}
        <div className="flex items-center rounded-xl bg-black/30 p-0.5 border border-white/10">
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              type="button"
              onPointerDown={() => setBasemap(b.id)}
              className={`apple-pressable rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                basemap === b.id
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Globe Projection & Reset & Share */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onPointerDown={toggleGlobeProjection}
            aria-pressed={isGlobeProjection}
            className={`apple-pressable flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium border ${
              isGlobeProjection
                ? 'bg-white/12 text-white border-white/20'
                : 'text-zinc-400 border-white/5 hover:text-white'
            }`}
            title="Ubah Proyeksi 3D Globe / 2D Datar (G)"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{isGlobeProjection ? '3D Globe' : '2D Peta'}</span>
          </button>

          <button
            type="button"
            onPointerDown={resetGlobe}
            className="apple-pressable flex items-center gap-1 rounded-xl bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white border border-white/10"
            title="Reset Kamera ke Kepulauan Indonesia (Esc)"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onPointerDown={handleCopyShareLink}
            className="apple-pressable flex items-center gap-1 rounded-xl bg-white/[0.06] px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:text-white border border-white/10"
            title="Salin tautan posisi & layer aktif"
          >
            {copiedUrl ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#30d158]" />
                <span className="text-[#30d158]">Tersalin</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bagikan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
