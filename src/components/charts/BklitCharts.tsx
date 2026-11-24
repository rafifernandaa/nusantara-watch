import { useId, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import type { AnomalyLevel, HotspotFeature } from '../../types/watch';

function ChartCard({
  title,
  subtitle,
  headerRight,
  children,
}: {
  title: string;
  subtitle: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="apple-elevated-card rounded-xl p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-medium text-[var(--text-primary)]">{title}</h3>
          <p className="text-[11px] text-[var(--text-secondary)] truncate">{subtitle}</p>
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function ChartGrid({
  width,
  top,
  bottom,
  rows = 3,
}: {
  width: number;
  top: number;
  bottom: number;
  rows?: number;
}) {
  const ys = Array.from({ length: rows }, (_, i) =>
    top + (i / Math.max(1, rows - 1)) * (bottom - top)
  );
  return (
    <g aria-hidden="true">
      {ys.map((y) => (
        <line
          key={y}
          x1={0}
          x2={width}
          y1={y}
          y2={y}
          stroke="var(--border-hairline)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      ))}
    </g>
  );
}

export interface BklitRingSegment {
  label: string;
  value: number;
  secondaryValue?: number;
  color: string;
}

export interface BklitRingChartProps {
  title: string;
  subtitle: string;
  totalLabel: string;
  unitLabel: string;
  secondaryUnitLabel?: string;
  segments: BklitRingSegment[];
  selectedLabel?: string;
  onSelectSegment?: (label: string) => void;
  ariaLabel: string;
}

/**
 * Composable concentric ring chart modeled after Bklit UI RingChart with
 * interactive hover focus, live center readout, and OKLCH segment hues.
 */
export function BklitRingChart({
  title,
  subtitle,
  totalLabel,
  unitLabel,
  secondaryUnitLabel,
  segments,
  selectedLabel,
  onSelectSegment,
  ariaLabel,
}: BklitRingChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const outerR = 54;
  const innerR = 39;
  const outerCirc = 2 * Math.PI * outerR;
  const innerCirc = 2 * Math.PI * innerR;
  const total = segments.reduce((acc, s) => acc + Math.max(0, s.value), 0);
  const secondaryTotal = segments.reduce(
    (acc, s) => acc + Math.max(0, s.secondaryValue ?? 0),
    0
  );
  const hasSecondary = segments.some((s) => typeof s.secondaryValue === 'number');
  const activeCount = segments.filter((s) => s.value > 0).length;
  const gapPx = activeCount > 1 ? 3 : 0;

  let outerOffset = 0;
  let innerOffset = 0;
  const arcs = segments.map((seg, idx) => {
    const val = Math.max(0, seg.value);
    const rawLen = total > 0 ? (val / total) * outerCirc : 0;
    const drawLen = val > 0 ? Math.max(2, rawLen - gapPx) : 0;
    const dashArray = `${drawLen} ${Math.max(0, outerCirc - drawLen)}`;
    const dashOffset = -outerOffset;
    outerOffset += rawLen;

    const secVal = Math.max(0, seg.secondaryValue ?? 0);
    const rawSecLen = secondaryTotal > 0 ? (secVal / secondaryTotal) * innerCirc : 0;
    const drawSecLen = secVal > 0 ? Math.max(2, rawSecLen - (hasSecondary ? 2.5 : 0)) : 0;
    const secDashArray = `${drawSecLen} ${Math.max(0, innerCirc - drawSecLen)}`;
    const secDashOffset = -innerOffset;
    innerOffset += rawSecLen;

    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
    return {
      ...seg,
      idx,
      dashArray,
      dashOffset,
      secDashArray,
      secDashOffset,
      pct,
    };
  });

  const focusedIdx =
    hoveredIdx !== null
      ? hoveredIdx
      : selectedLabel && selectedLabel !== 'ALL'
        ? arcs.findIndex((a) => a.label === selectedLabel)
        : -1;
  const focusedArc = focusedIdx >= 0 ? arcs[focusedIdx] : null;

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      headerRight={
        hasSecondary && secondaryUnitLabel ? (
          <span className="font-mono-tabular shrink-0 rounded bg-[var(--surface-deepest)] border border-[var(--border-hairline)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
            Dalam: {secondaryUnitLabel}
          </span>
        ) : undefined
      }
    >
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div
          className="relative flex items-center justify-center shrink-0"
          role="img"
          aria-label={ariaLabel}
        >
          <svg viewBox="0 0 140 140" className="h-32 w-32">
            <circle
              cx="70"
              cy="70"
              r={outerR}
              fill="none"
              stroke="var(--border-hairline)"
              strokeWidth={11}
            />
            {hasSecondary && (
              <circle
                cx="70"
                cy="70"
                r={innerR}
                fill="none"
                stroke="var(--border-hairline)"
                strokeWidth={5}
              />
            )}
            {arcs.map((arc) => {
              if (arc.value <= 0) return null;
              const dimmed = focusedArc !== null && focusedArc.idx !== arc.idx;
              const isFocused = focusedArc?.idx === arc.idx;
              return (
                <circle
                  key={arc.label}
                  cx="70"
                  cy="70"
                  r={outerR}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={isFocused ? 13 : 11}
                  strokeDasharray={arc.dashArray}
                  strokeDashoffset={arc.dashOffset}
                  transform="rotate(-90 70 70)"
                  style={{
                    opacity: dimmed ? 0.28 : 1,
                    cursor: onSelectSegment ? 'pointer' : 'default',
                    transition: 'opacity 160ms cubic-bezier(0.22, 1, 0.36, 1), stroke-width 160ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  onMouseEnter={() => setHoveredIdx(arc.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSelectSegment?.(arc.label)}
                />
              );
            })}
            {hasSecondary &&
              arcs.map((arc) => {
                if ((arc.secondaryValue ?? 0) <= 0) return null;
                const dimmed = focusedArc !== null && focusedArc.idx !== arc.idx;
                return (
                  <circle
                    key={`${arc.label}-inner`}
                    cx="70"
                    cy="70"
                    r={innerR}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={5}
                    strokeDasharray={arc.secDashArray}
                    strokeDashoffset={arc.secDashOffset}
                    transform="rotate(-90 70 70)"
                    style={{
                      opacity: dimmed ? 0.16 : 0.52,
                      pointerEvents: 'none',
                      transition: 'opacity 160ms cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />
                );
              })}
          </svg>

          <div
            data-testid="bklit-ring-center"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3"
          >
            <span
              className="font-mono-tabular text-sm font-medium leading-tight"
              style={{ color: focusedArc ? focusedArc.color : 'var(--text-primary)' }}
            >
              {focusedArc ? focusedArc.value.toLocaleString('id-ID') : totalLabel}
            </span>
            <span className="font-mono-tabular text-[10px] text-[var(--text-muted)] mt-0.5 truncate max-w-[74px]">
              {focusedArc ? `${focusedArc.label} · ${focusedArc.pct}%` : unitLabel}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full space-y-1">
          {arcs.map((arc) => {
            const isFocused = focusedArc?.idx === arc.idx;
            return (
              <button
                key={arc.label}
                type="button"
                onMouseEnter={() => setHoveredIdx(arc.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectSegment?.(arc.label)}
                className={`w-full flex items-center justify-between text-[11px] gap-2 rounded-md px-2 py-1 transition-colors ${
                  isFocused
                    ? 'bg-[var(--surface-card)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-card)]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: arc.color }}
                  />
                  <span className="font-medium truncate">{arc.label}</span>
                </div>
                <div className="font-mono-tabular text-right shrink-0">
                  <span className="font-medium text-[var(--text-primary)]">
                    {arc.value.toLocaleString('id-ID')}
                  </span>
                  <span className="text-[var(--text-muted)] ml-1.5">({arc.pct}%)</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}

export interface BklitBarItem {
  label: string;
  primary: number;
  secondary: number;
  color: string;
}

export interface BklitProvincialBarChartProps {
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel: string;
  unit: string;
  items: BklitBarItem[];
  activeLabel?: string;
  onSelectBar?: (label: string) => void;
}

/**
 * Composable grouped bar chart modeled after Bklit UI BarChart with dashed Grid,
 * XAxis labels, crosshair column highlight, and live ChartTooltip header readout.
 */
export function BklitProvincialBarChart({
  title,
  subtitle,
  primaryLabel,
  secondaryLabel,
  unit,
  items,
  activeLabel,
  onSelectBar,
}: BklitProvincialBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const width = 320;
  const chartTop = 10;
  const chartBottom = 114;
  const chartHeight = chartBottom - chartTop;
  const maxVal = Math.max(1, ...items.flatMap((it) => [it.primary, it.secondary]));
  const slotW = width / Math.max(1, items.length);

  const focusedItem =
    hoveredIdx !== null
      ? items[hoveredIdx] ?? null
      : activeLabel && activeLabel !== 'ALL'
        ? items.find((it) => it.label === activeLabel) ?? null
        : null;

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      headerRight={
        <div
          data-testid="bklit-bar-tooltip"
          className="font-mono-tabular shrink-0 rounded-md bg-[var(--surface-deepest)] border border-[var(--border-hairline)] px-2 py-1 text-[10px] text-[var(--text-secondary)]"
        >
          {focusedItem ? (
            <span>
              <strong className="font-medium text-[var(--text-primary)]">{focusedItem.label}</strong>{' '}
              · {focusedItem.primary.toLocaleString('id-ID')} /{' '}
              <span className="text-[var(--positive)]">
                {focusedItem.secondary.toLocaleString('id-ID')}
              </span>{' '}
              {unit}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span>{primaryLabel}</span>
              <span className="text-[var(--text-muted)]">vs</span>
              <span className="text-[var(--positive)]">{secondaryLabel}</span>
            </span>
          )}
        </div>
      }
    >
      <svg
        viewBox={`0 0 ${width} 138`}
        className="w-full h-auto block select-none"
        role="img"
        aria-label={`${title}: ${primaryLabel} vs ${secondaryLabel}`}
      >
        <ChartGrid width={width} top={chartTop} bottom={chartBottom} rows={3} />

        {items.map((item, idx) => {
          const slotX = idx * slotW;
          const centerX = slotX + slotW / 2;
          const isFocused = focusedItem?.label === item.label;
          const dimmed = focusedItem !== null && !isFocused;

          const h1 = item.primary > 0 ? Math.max(4, (item.primary / maxVal) * chartHeight) : 2;
          const h2 = item.secondary > 0 ? Math.max(4, (item.secondary / maxVal) * chartHeight) : 2;
          const barW = 11;

          return (
            <g
              key={item.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => onSelectBar?.(item.label)}
              style={{ cursor: onSelectBar ? 'pointer' : 'default' }}
            >
              <rect
                x={slotX + 3}
                y={chartTop - 4}
                width={slotW - 6}
                height={chartHeight + 8}
                rx={6}
                fill={isFocused ? 'var(--surface-deepest)' : 'transparent'}
                stroke={isFocused ? 'var(--border-hairline)' : 'transparent'}
              />

              <motion.rect
                x={centerX - barW - 1.5}
                y={chartBottom - h1}
                width={barW}
                height={h1}
                rx={3}
                fill={item.color}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1, opacity: dimmed ? 0.3 : 1 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'bottom', transformBox: 'fill-box' }}
              />

              <motion.rect
                x={centerX + 1.5}
                y={chartBottom - h2}
                width={barW}
                height={h2}
                rx={3}
                fill="var(--positive)"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1, opacity: dimmed ? 0.25 : 0.85 }}
                transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: 'bottom', transformBox: 'fill-box' }}
              />

              <text
                x={centerX}
                y={131}
                textAnchor="middle"
                fontSize="10"
                fill={isFocused ? 'var(--text-primary)' : 'var(--text-muted)'}
                style={{ fontWeight: isFocused ? 500 : 400 }}
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </ChartCard>
  );
}

export interface BklitBudgetCompareItem {
  id: string;
  label: string;
  subLabel: string;
  budgetRp: number;
  hotspots: number;
  anomalyLevel: AnomalyLevel;
  formattedBudget: string;
}

export interface BklitBudgetComparisonChartProps {
  title: string;
  subtitle: string;
  items: BklitBudgetCompareItem[];
  selectedId?: string | null;
  onSelectItem?: (id: string) => void;
}

/**
 * Mirrored comparison bar chart pairing SiRUP procurement budget (Rp) against
 * active satellite hotspot incidence per province.
 */
export function BklitBudgetComparisonChart({
  title,
  subtitle,
  items,
  selectedId,
  onSelectItem,
}: BklitBudgetComparisonChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const maxBudget = Math.max(1, ...items.map((it) => it.budgetRp));
  const maxHotspots = Math.max(1, ...items.map((it) => it.hotspots));

  const levelColor = (lvl: AnomalyLevel) =>
    lvl === 'Disproportionate'
      ? 'var(--negative)'
      : lvl === 'Elevated'
        ? 'var(--warning)'
        : 'var(--positive)';

  return (
    <ChartCard
      title={title}
      subtitle={subtitle}
      headerRight={
        <span className="font-mono-tabular shrink-0 rounded bg-[var(--surface-deepest)] border border-[var(--border-hairline)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
          Pagu vs HS
        </span>
      }
    >
      <div className="space-y-2">
        {items.map((item) => {
          const budgetPct = Math.max(6, Math.round((item.budgetRp / maxBudget) * 100));
          const hotspotPct = Math.max(6, Math.round((item.hotspots / maxHotspots) * 100));
          const active = hoveredId === item.id || selectedId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSelectItem?.(item.id)}
              className={`w-full text-left rounded-lg px-2 py-1.5 transition-colors border ${
                active
                  ? 'bg-[var(--surface-card)] border-[var(--border-strong)]'
                  : 'bg-transparent border-transparent hover:bg-[var(--surface-card)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-medium text-[var(--text-primary)] truncate">
                  {item.label}
                </span>
                <span className="font-mono-tabular text-[var(--text-secondary)] shrink-0">
                  {item.formattedBudget} ·{' '}
                  <strong className="font-medium text-[var(--accent)]">
                    {item.hotspots} HS
                  </strong>
                </span>
              </div>

              <div className="mt-1.5 space-y-1">
                <div className="h-1.5 w-full rounded-full bg-[var(--surface-deepest)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      width: `${budgetPct}%`,
                      backgroundColor: levelColor(item.anomalyLevel),
                      transformOrigin: 'left',
                    }}
                  />
                </div>
                <div className="h-1 w-full rounded-full bg-[var(--surface-deepest)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      width: `${hotspotPct}%`,
                      backgroundColor: 'var(--accent)',
                      opacity: 0.72,
                      transformOrigin: 'left',
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ChartCard>
  );
}

export interface BklitAreaSparkChartProps {
  hotspot: HotspotFeature;
}

/**
 * Interactive 7-day FRP (MW) trajectory AreaChart for a selected hotspot with
 * OKLCH single-hue gradient fill and pointer crosshair scrubbing.
 */
export function BklitAreaSparkChart({ hotspot }: BklitAreaSparkChartProps) {
  const gradId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const series = useMemo(() => {
    const labels = ['H-6', 'H-5', 'H-4', 'H-3', 'H-2', 'H-1', 'Kini'];
    const base = Math.max(12, hotspot.frpMw * 0.42);
    const seedShift = (hotspot.confidence % 7) * 0.08;
    const persistenceRatio = Math.min(1, hotspot.persistenceHours / 96);

    return labels.map((label, idx) => {
      const progress = idx / 6;
      const wave = Math.sin((idx + 1) * 1.15 + seedShift) * 0.12;
      const val =
        idx === 6
          ? hotspot.frpMw
          : Number(
              (base + (hotspot.frpMw - base) * (0.35 + progress * 0.65) * (0.88 + persistenceRatio * 0.16 + wave)).toFixed(1)
            );
      return { label, frpMw: Math.max(8, val) };
    });
  }, [hotspot.frpMw, hotspot.persistenceHours, hotspot.confidence]);

  const width = 300;
  const height = 84;
  const padX = 10;
  const top = 10;
  const bottom = 64;
  const maxVal = Math.max(1, ...series.map((p) => p.frpMw)) * 1.12;
  const minVal = Math.min(...series.map((p) => p.frpMw)) * 0.75;

  const coords = series.map((pt, idx) => {
    const x = padX + (idx / (series.length - 1)) * (width - padX * 2);
    const y =
      bottom - ((pt.frpMw - minVal) / Math.max(1, maxVal - minVal)) * (bottom - top);
    return { ...pt, x, y };
  });

  const linePath = coords
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${bottom} L ${coords[0].x.toFixed(1)} ${bottom} Z`;

  const activeIdx = hoverIdx ?? coords.length - 1;
  const activePt = coords[activeIdx];

  return (
    <div className="apple-elevated-card rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[var(--text-secondary)]">
          Tren 7 hari radiative power (MW)
        </span>
        <span
          data-testid="bklit-area-tooltip"
          className="font-mono-tabular rounded bg-[var(--surface-card)] border border-[var(--border-hairline)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]"
        >
          {activePt.label} · {activePt.frpMw} MW
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block touch-none cursor-crosshair"
        role="img"
        aria-label={`Grafik tren 7 hari FRP untuk ${hotspot.kabupaten}`}
        onPointerLeave={() => setHoverIdx(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * width;
          let nearest = 0;
          let best = Infinity;
          coords.forEach((c, i) => {
            const d = Math.abs(c.x - relX);
            if (d < best) {
              best = d;
              nearest = i;
            }
          });
          setHoverIdx(nearest);
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <ChartGrid width={width} top={top} bottom={bottom} rows={3} />

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <line
          x1={activePt.x}
          x2={activePt.x}
          y1={top - 2}
          y2={bottom}
          stroke="var(--border-strong)"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
        <circle
          cx={activePt.x}
          cy={activePt.y}
          r={3.5}
          fill="var(--accent)"
          stroke="var(--surface-card)"
          strokeWidth={1.5}
        />

        {coords.map((pt, idx) => (
          <text
            key={pt.label}
            x={pt.x}
            y={height - 4}
            textAnchor="middle"
            fontSize="9"
            fill={idx === activeIdx ? 'var(--text-primary)' : 'var(--text-muted)'}
          >
            {pt.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

export interface BklitIspuGaugeProps {
  score: number;
  pm25: number;
  category: string;
  stationName: string;
}

/**
 * Composable semicircular OKLCH air-quality gauge for BMKG ISPU & PM2.5 readings.
 */
export function BklitIspuGauge({
  score,
  pm25,
  category,
  stationName,
}: BklitIspuGaugeProps) {
  const clamped = Math.max(0, Math.min(300, score));
  const ratio = clamped / 300;
  const r = 34;
  const halfCirc = Math.PI * r;
  const fillLen = ratio * halfCirc;

  const toneColor =
    clamped <= 50
      ? 'var(--positive)'
      : clamped <= 100
        ? 'var(--info)'
        : clamped <= 200
          ? 'var(--warning)'
          : 'var(--negative)';

  return (
    <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border-hairline)]">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
          {stationName}
        </p>
        <p className="font-mono-tabular text-[11px] text-[var(--text-muted)] mt-0.5">
          PM2.5: {pm25} µg/m³
        </p>
        <span
          className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: 'var(--surface-card)',
            color: toneColor,
            border: '1px solid var(--border-hairline)',
          }}
        >
          {category}
        </span>
      </div>

      <div className="relative shrink-0 w-[92px] h-[54px] flex items-end justify-center">
        <svg viewBox="0 0 92 54" className="w-[92px] h-[54px]" role="img" aria-label={`Gauge ISPU ${score}`}>
          <path
            d="M 12 46 A 34 34 0 0 1 80 46"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={6}
            strokeLinecap="round"
          />
          <path
            d="M 12 46 A 34 34 0 0 1 80 46"
            fill="none"
            stroke={toneColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${fillLen} ${halfCirc}`}
          />
        </svg>
        <div className="pointer-events-none absolute bottom-1 flex flex-col items-center leading-none">
          <span
            data-testid="bklit-ispu-score"
            className="font-mono-tabular text-xs font-medium text-[var(--text-primary)]"
          >
            {score}
          </span>
          <span className="text-[9px] text-[var(--text-muted)]">ISPU</span>
        </div>
      </div>
    </div>
  );
}
