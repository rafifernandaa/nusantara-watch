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
  { id: 'hotspots', label: 'Titik api', shortcut: '1', color: 'var(--accent)' },
  { id: 'concessions', label: 'Gambut', shortcut: '2', color: 'var(--positive)' },
  { id: 'budgets', label: 'SiRUP', shortcut: '3', color: 'var(--warning)' },
  { id: 'wind-ispu', label: 'Angin', shortcut: '4', color: 'var(--info)' },
];

const BASEMAPS: { id: BasemapStyle; label: string }[] = [
  { id: 'dark-glass', label: 'Dark' },
  { id: 'light-glass', label: 'Light' },
  { id: 'satellite', label: 'Satelit' },
  { id: 'terrain', label: 'Topo' },
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
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-30 flex flex-col items-center gap-2">
      {/* 7-Day Spatiotemporal Timeline Scrubber */}
      <div
        className="pointer-events-auto apple-glass-pill flex w-full max-w-3xl items-center gap-3 rounded-xl px-3 py-2"
        style={{
          transform: `translate3d(${rubberPullPx * 0.35}px, 0, 0)`,
          transition: rubberPullPx === 0 ? 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
        }}
      >
        <button
          type="button"
          onPointerDown={() => setIsPlayingTimeline(!isPlayingTimeline)}
          className="apple-pressable flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-raised)] border border-[var(--border-hairline)] text-[var(--text-primary)] hover:border-[var(--border-strong)]"
          aria-label={isPlayingTimeline ? 'Jeda lini masa' : 'Putar lini masa 7 hari'}
        >
          {isPlayingTimeline ? (
            <Pause className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <Play className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>

        <div className="flex flex-col min-w-[136px]">
          <span className="text-[11px] text-[var(--text-muted)]">Lini masa satelit (7 hari)</span>
          <span className="font-mono-tabular text-xs font-medium text-[var(--text-primary)]">
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
          <div className="h-1 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Day ticks */}
          <div className="pointer-events-none absolute inset-x-0 flex justify-between px-0.5">
            {[-6, -5, -4, -3, -2, -1, 0].map((d) => (
              <span
                key={d}
                className="h-1.5 w-0.5 rounded-full"
                style={{
                  backgroundColor:
                    d <= timelineDayOffset ? 'var(--text-muted)' : 'var(--border-strong)',
                }}
              />
            ))}
          </div>

          {/* Thumb */}
          <div
            className="pointer-events-none absolute -ml-2 h-4 w-4 rounded-full bg-[var(--text-primary)] border-2 border-[var(--surface-card)]"
            style={{ left: `${progressPercent}%` }}
          />
        </div>

        <button
          type="button"
          onPointerDown={() => setCumulativeTimeline(!cumulativeTimeline)}
          className="apple-pressable h-7 rounded-lg bg-[var(--surface-raised)] px-2.5 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]"
          title="Tampilkan akumulasi 7 hari atau hanya hari terpilih"
        >
          {cumulativeTimeline ? 'Akumulatif' : 'Per hari'}
        </button>
      </div>

      {/* Main Ultra-Quiet Control Dock */}
      <div className="pointer-events-auto apple-glass-heavy flex flex-wrap items-center justify-center gap-2 rounded-2xl px-3 py-2">
        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-1">
          {LAYER_CONFIG.map((layer) => {
            const active = activeLayers[layer.id];
            return (
              <button
                key={layer.id}
                type="button"
                onPointerDown={() => toggleLayer(layer.id)}
                aria-pressed={active}
                className={`apple-pressable flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-medium border ${
                  active
                    ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border-[var(--border-hairline)]'
                    : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-transparent'
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: active ? layer.color : 'var(--text-muted)',
                    opacity: active ? 1 : 0.45,
                  }}
                />
                <span>{layer.label}</span>
                <kbd className="hidden sm:inline-block font-mono-tabular rounded bg-[var(--surface-deepest)] border border-[var(--border-hairline)] px-1 text-[10px] text-[var(--text-muted)]">
                  {layer.shortcut}
                </kbd>
              </button>
            );
          })}
        </div>

        <div className="hidden md:block h-4 w-px bg-[var(--border-hairline)] mx-1" />

        {/* Basemap Switcher */}
        <div className="flex items-center rounded-lg bg-[var(--surface-deepest)] p-0.5 border border-[var(--border-hairline)]">
          {BASEMAPS.map((b) => (
            <button
              key={b.id}
              type="button"
              onPointerDown={() => setBasemap(b.id)}
              className={`apple-pressable h-7 rounded-md px-2.5 text-[11px] font-medium ${
                basemap === b.id
                  ? 'bg-[var(--surface-raised)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
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
            className={`apple-pressable flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium border ${
              isGlobeProjection
                ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border-[var(--border-hairline)]'
                : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
            }`}
            title="Ubah Proyeksi 3D Globe / 2D Datar (G)"
          >
            <Globe className="h-4 w-4" strokeWidth={1.5} />
            <span>{isGlobeProjection ? '3D Globe' : '2D Peta'}</span>
          </button>

          <button
            type="button"
            onPointerDown={resetGlobe}
            className="apple-pressable flex h-8 items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]"
            title="Reset Kamera ke Kepulauan Indonesia (Esc)"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onPointerDown={handleCopyShareLink}
            className="apple-pressable flex h-8 items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]"
            title="Salin tautan posisi & layer aktif"
          >
            {copiedUrl ? (
              <>
                <Check className="h-4 w-4 text-[var(--positive)]" strokeWidth={1.5} />
                <span className="text-[var(--positive)]">Tersalin</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">Bagikan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
