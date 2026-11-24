import { useEffect, useMemo, useRef, useState } from 'react';
import type { HotspotFeature } from '../types/watch';
import { HL, type HairlineSpring, type RingSample } from '../utils/hairline-kernel';

const NX = 8;
const NY = 4;
const CX = 15;
const CY = 18;
const FX = 11.5;
const FY = 14.2;
const HMAX = 54;
const EX = NX * CX;
const EY = NY * CY;
const PB = 6;
const UNIT = 16;
const RADIUS = 2.6 * UNIT;
const QUIET_HEIGHT = 4.5;

let kernelCssInjected = false;

export interface FirmsMatrixHairlineProps {
  hotspots: readonly HotspotFeature[];
  onSelectHotspot: (id: string) => void;
}

interface MatrixCell {
  i: number;
  j: number;
  h0: number;
  hotspot: HotspotFeature | null;
  ring: RingSample[];
  inner: RingSample[];
  sp: HairlineSpring;
  el: ReturnType<typeof HL.solid>;
  drawn: number;
}

function falloff(u: number): number {
  if (u <= 0) return 1;
  if (u <= 0.42) return 1 - (u / 0.42) * 0.69;
  if (u <= 1) return 0.31 - ((u - 0.42) / 0.58) * 0.22;
  return 0.09;
}

/**
 * Maps active hotspots deterministically onto the 8 × 4 archipelago grid
 * (West-to-East by longitude, North-to-South by latitude) with collision fallback.
 */
function assignHotspotsToGrid(hotspots: readonly HotspotFeature[]): Map<string, { hotspot: HotspotFeature; h0: number }> {
  const placed = new Map<string, { hotspot: HotspotFeature; h0: number }>();
  if (hotspots.length === 0) return placed;

  const sorted = [...hotspots].sort((a, b) => b.frpMw - a.frpMw);
  const maxFrp = Math.max(1, sorted[0]?.frpMw ?? 1);

  for (const hs of sorted) {
    const ti = HL.clamp(Math.floor(((hs.coordinates[0] - 95) / (141 - 95)) * NX), 0, NX - 1);
    const tj = HL.clamp(Math.floor(((6 - hs.coordinates[1]) / (6 - -11)) * NY), 0, NY - 1);

    let bestKey: string | null = null;
    let bestDist = Infinity;
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const key = `${i},${j}`;
        if (placed.has(key)) continue;
        const d = (i - ti) ** 2 + (j - tj) ** 2;
        if (d < bestDist) {
          bestDist = d;
          bestKey = key;
        }
      }
    }

    if (bestKey) {
      const h0 = 14 + Math.round((hs.frpMw / maxFrp) * 36);
      placed.set(bestKey, { hotspot: hs, h0 });
    }
  }

  return placed;
}

function mountFirmsMatrix(
  stage: HTMLElement,
  svg: SVGElement,
  initialHotspots: readonly HotspotFeature[],
  onPreview: (hotspot: HotspotFeature | null, hovering: boolean) => void,
  onSelect: (id: string) => void
) {
  const bag = HL.disposer();
  const C = HL.Cam(45, 0.5, 1.54);
  HL.fit(
    C,
    [
      [-6, -9, -PB],
      [EX + 6, EY + 6, -PB],
      [EX + 6, -9, -PB],
      [-6, EY + 6, -PB],
      [-6, -9, HMAX],
      [EX + 6, -9, HMAX],
    ],
    200,
    166
  );
  const P = HL.proj(C);
  const front = HL.facing(C);

  const g = HL.mk('g', {}, svg);
  const [pr, pi] = HL.rings(-6, -9, EX + 6, EY + 6, 8, 2.0);
  HL.put(HL.solid(g), HL.prism(P, front, pr, pi, -PB, 0));

  const datumDots: SVGCircleElement[] = [];
  for (let i = 0; i < NX; i++) {
    const dot = HL.flatDot(g, C, 0.5, 'dot off');
    HL.place(dot, P((i + 0.5) * CX, -4.5, 0));
    datumDots.push(dot);
  }

  const initialMap = assignHotspotsToGrid(initialHotspots);
  const cols: MatrixCell[] = [];
  const byCell = new Map<string, MatrixCell>();

  for (let s = 0; s <= NX + NY - 2; s++) {
    for (let i = 0; i < NX; i++) {
      const j = s - i;
      if (j < 0 || j >= NY) continue;
      const key = `${i},${j}`;
      const assigned = initialMap.get(key);
      const h0 = assigned?.h0 ?? QUIET_HEIGHT;
      const x0 = i * CX + (CX - FX) / 2;
      const y0 = j * CY + (CY - FY) / 2;
      const [ring, inner] = HL.rings(x0, y0, x0 + FX, y0 + FY, 2.4, 0.85);
      const cell: MatrixCell = {
        i,
        j,
        h0,
        hotspot: assigned?.hotspot ?? null,
        ring,
        inner,
        sp: HL.spring(h0, { eps: 0.04 }),
        el: HL.solid(g),
        drawn: Number.NaN,
      };
      cols.push(cell);
      byCell.set(key, cell);
    }
  }

  const mark = HL.mk('g', {}, g);
  const md: SVGCircleElement[] = [];
  for (let k = 0; k < 3; k++) {
    md.push(HL.flatDot(mark, C, 0.55, k === 1 ? 'dot' : 'dot m'));
  }

  const pickPeakCell = () =>
    cols.reduce((best, cur) => (cur.h0 > best.h0 ? cur : best), cols[0]);

  let peak = pickPeakCell();
  let mc: MatrixCell | null = null;
  let want: MatrixCell = peak;
  let over: [number, number] | null = null;

  function syncMark() {
    if (want !== mc) {
      mc = want;
      mc.el.g.after(mark);
      datumDots.forEach((d, idx) => d.setAttribute('class', idx === mc?.i ? 'dot m' : 'dot off'));
    }
    const cx = (mc.i + 0.5) * CX;
    const cy = (mc.j + 0.5) * CY;
    const h = Math.max(0.8, mc.sp.x);
    md.forEach((el, k) => HL.place(el, P(cx + (k - 1) * 2.6, cy, h)));
  }

  function drawCol(c: MatrixCell) {
    const h = Math.max(0.8, c.sp.x);
    const active = c === want;
    if (h === c.drawn && active === c.el.sil.classList.contains('hi')) return;
    c.drawn = h;
    HL.put(c.el, HL.prism(P, front, c.ring, c.inner, 0, h));
    c.el.sil.classList.toggle('hi', active);
  }

  const loop = HL.register(stage, (dt) => {
    let moving = false;
    for (const c of cols) {
      if (HL.stepS(c.sp, dt)) moving = true;
      drawCol(c);
    }
    syncMark();
    return moving;
  });
  bag.add(loop.unregister);

  function resolveTargetCell(pt: [number, number]): MatrixCell {
    const i = HL.clamp(Math.floor(pt[0] / CX), 0, NX - 1);
    const j = HL.clamp(Math.floor(pt[1] / CY), 0, NY - 1);
    const exact = byCell.get(`${i},${j}`);
    if (exact?.hotspot) return exact;

    const hotspotCells = cols.filter((c) => c.hotspot !== null);
    if (hotspotCells.length === 0) return exact ?? peak;

    let nearest = hotspotCells[0];
    let bestDist = Infinity;
    for (const c of hotspotCells) {
      const d = Math.hypot((c.i + 0.5) * CX - pt[0], (c.j + 0.5) * CY - pt[1]);
      if (d < bestDist) {
        bestDist = d;
        nearest = c;
      }
    }
    return nearest;
  }

  function retarget() {
    if (!over) {
      want = peak;
      for (const c of cols) c.sp.t = c.h0;
      onPreview(peak.hotspot, false);
    } else {
      want = resolveTargetCell(over);
      for (const c of cols) {
        const dx = (c.i + 0.5) * CX - over[0];
        const dy = (c.j + 0.5) * CY - over[1];
        const wave = 14 * falloff(Math.hypot(dx, dy) / RADIUS);
        c.sp.t = HL.clamp(
          c === want ? Math.max(c.h0 + 12, 36) : c.h0 + wave * 0.55,
          4,
          HMAX
        );
      }
      onPreview(want.hotspot, true);
    }
    loop.wake();
  }

  bag.add(
    HL.pointer(stage, {
      move: (p) => {
        over = HL.unproj(C, p[0], p[1], 0);
        retarget();
      },
      down: (p) => {
        const groundPt = HL.unproj(C, p[0], p[1], 0);
        const target = resolveTargetCell(groundPt);
        if (target.hotspot) {
          onSelect(target.hotspot.id);
        }
      },
      leave: () => {
        over = null;
        retarget();
      },
    })
  );
  bag.add(() => svg.replaceChildren());

  return {
    updateHotspots: (nextHotspots: readonly HotspotFeature[]) => {
      const nextMap = assignHotspotsToGrid(nextHotspots);
      for (const c of cols) {
        const assigned = nextMap.get(`${c.i},${c.j}`);
        c.h0 = assigned?.h0 ?? QUIET_HEIGHT;
        c.hotspot = assigned?.hotspot ?? null;
      }
      peak = pickPeakCell();
      retarget();
    },
    destroy: bag.dispose,
  };
}

/**
 * Interactive 33-solid @lucasmarkes/hairline thermal matrix mapped to real
 * FIRMS hotspots by Fire Radiative Power (MW). Hover previews a fire; click flies the globe.
 */
export function FirmsMatrixHairline({
  hotspots,
  onSelectHotspot,
}: FirmsMatrixHairlineProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<{
    updateHotspots: (next: readonly HotspotFeature[]) => void;
    destroy: () => void;
  } | null>(null);
  const onSelectRef = useRef(onSelectHotspot);
  onSelectRef.current = onSelectHotspot;

  const peakHotspot = useMemo(
    () =>
      hotspots.length > 0
        ? hotspots.reduce((best, cur) => (cur.frpMw > best.frpMw ? cur : best), hotspots[0])
        : null,
    [hotspots]
  );

  const [previewHotspot, setPreviewHotspot] = useState<HotspotFeature | null>(peakHotspot);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setPreviewHotspot(peakHotspot);
  }, [peakHotspot]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    if (!kernelCssInjected && typeof document !== 'undefined') {
      HL.inject(document);
      kernelCssInjected = true;
    }

    stage.setAttribute('data-hairline', 'firms-matrix');
    const svg = HL.mk('svg', { viewBox: '0 0 400 320', 'aria-hidden': 'true' }, stage);
    const handle = mountFirmsMatrix(
      stage,
      svg,
      hotspots,
      (hs, hovering) => {
        setPreviewHotspot(hs);
        setIsHovering(hovering);
      },
      (id) => onSelectRef.current(id)
    );
    handleRef.current = handle;

    return () => {
      handle.destroy();
      handleRef.current = null;
      stage.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    handleRef.current?.updateHotspots(hotspots);
  }, [hotspots]);

  const activeTarget = previewHotspot ?? peakHotspot;
  const readoutText = !activeTarget
    ? 'rest'
    : isHovering
      ? `${activeTarget.kabupaten.toLowerCase()} · ${activeTarget.frpMw} MW`
      : `puncak · ${activeTarget.frpMw} MW`;

  return (
    <div className="rounded-xl bg-[var(--surface-deepest)] border border-[var(--border-hairline)] p-3 space-y-2.5">
      <div
        className="hairline-plate relative rounded-lg border overflow-hidden cursor-pointer"
        style={{
          backgroundColor: 'var(--ground)',
          borderColor: 'var(--line)',
        }}
      >
        <span
          className="font-mono-tabular pointer-events-none absolute top-2.5 left-3 z-10 text-[11px] leading-none"
          style={{ color: 'var(--muted)' }}
        >
          firms-matrix
        </span>
        <span
          data-testid="hairline-readout"
          className="font-mono-tabular pointer-events-none absolute top-2.5 right-3 z-10 text-[11px] leading-none"
          style={{ color: 'var(--ink)' }}
        >
          {readoutText}
        </span>
        <div
          ref={stageRef}
          role="img"
          aria-label="Matriks termal 33 solid titik api aktif berdasarkan daya radiasi api (MW)"
          className="w-full [&>svg]:block [&>svg]:w-full [&>svg]:h-auto"
        />
      </div>

      {/* Live Hotspot Preview Strip */}
      {activeTarget ? (
        <div className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-hairline)] px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0" />
              <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                {activeTarget.kecamatan}, {activeTarget.kabupaten}
              </span>
            </div>
            <p className="font-mono-tabular text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
              {activeTarget.province} · {activeTarget.frpMw} MW · {activeTarget.persistenceHours}j ·{' '}
              {activeTarget.isPeatland ? `Gambut ${activeTarget.peatDepthMeters}m` : 'Mineral'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectHotspot(activeTarget.id)}
            className="apple-pressable shrink-0 h-7 px-2.5 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] text-[11px] font-medium hover:opacity-90"
          >
            Lacak
          </button>
        </div>
      ) : (
        <div className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-hairline)] px-3 py-2 text-xs text-[var(--text-muted)]">
          Tidak ada titik api pada filter wilayah atau hari terpilih.
        </div>
      )}

      <p className="text-xs text-[var(--text-secondary)] leading-snug">
        Tinggi pilar menunjukkan daya radiasi api (MW) dari barat ke timur. Arahkan kursor untuk pratinjau, klik pilar untuk mengunci kamera.
      </p>
    </div>
  );
}

export { FirmsMatrixHairline as SortieDeckHairline };
