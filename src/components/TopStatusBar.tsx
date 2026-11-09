import { useMemo } from 'react';
import {
  AlertTriangle,
  Flame,
  KeyRound,
  Scale,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  INDONESIAN_HOTSPOTS,
  SIRUP_BUDGET_PACKAGES,
} from '../data/local_data/indonesia-osint-seed';
import { useWatchStore } from '../store/useWatchStore';
import { filterHotspots, formatRupiah } from '../utils/formatters';

const PROVINCE_OPTIONS = [
  'ALL',
  'Riau',
  'Sumatera Selatan',
  'Kalimantan Tengah',
  'Kalimantan Barat',
  'Jambi',
  'Kalimantan Selatan',
  'Papua Selatan',
  'Kalimantan Timur',
];

export function TopStatusBar() {
  const selectedProvinceFilter = useWatchStore((s) => s.selectedProvinceFilter);
  const timelineDayOffset = useWatchStore((s) => s.timelineDayOffset);
  const cumulativeTimeline = useWatchStore((s) => s.cumulativeTimeline);
  const isBudgetWatchdogOpen = useWatchStore((s) => s.isBudgetWatchdogOpen);
  const providerKeys = useWatchStore((s) => s.providerKeys);

  const setProvinceFilter = useWatchStore((s) => s.setProvinceFilter);
  const setBudgetWatchdogOpen = useWatchStore((s) => s.setBudgetWatchdogOpen);
  const setPowerUpOpen = useWatchStore((s) => s.setPowerUpOpen);

  const visibleHotspots = useMemo(
    () =>
      filterHotspots(
        INDONESIAN_HOTSPOTS,
        selectedProvinceFilter,
        timelineDayOffset,
        cumulativeTimeline
      ),
    [selectedProvinceFilter, timelineDayOffset, cumulativeTimeline]
  );

  const stats = useMemo(() => {
    const totalFrp = visibleHotspots.reduce((acc, h) => acc + h.frpMw, 0);
    const inConcessionCount = visibleHotspots.filter((h) => h.inConcession).length;
    const concessionRatio =
      visibleHotspots.length > 0
        ? Math.round((inConcessionCount / visibleHotspots.length) * 100)
        : 0;

    const matchingBudgets = SIRUP_BUDGET_PACKAGES.filter(
      (b) => selectedProvinceFilter === 'ALL' || b.province === selectedProvinceFilter
    );
    const totalBudgetRp = matchingBudgets.reduce((acc, b) => acc + b.budgetRp, 0);
    const flaggedCount = matchingBudgets.filter(
      (b) => b.anomalyLevel === 'Disproportionate' || b.anomalyLevel === 'Elevated'
    ).length;

    return {
      count: visibleHotspots.length,
      totalFrp: totalFrp.toFixed(1),
      concessionRatio,
      totalBudgetRp,
      flaggedCount,
    };
  }, [visibleHotspots, selectedProvinceFilter]);

  const hasLiveKeys = Boolean(providerKeys.nasaFirmsMapKey.trim());

  return (
    <header className="pointer-events-none fixed top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2.5">
      {/* Brand + Feed Provenance Pill */}
      <div className="pointer-events-auto apple-glass-pill flex items-center gap-3 rounded-2xl px-3.5 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30">
          <Flame className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-white">
              Nusantara Watch
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-medium text-zinc-300 border border-white/10">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasLiveKeys ? 'bg-[#30d158]' : 'bg-[#ffd60a]'
                }`}
              />
              {hasLiveKeys ? 'LIVE FIRMS + SI-RUP' : 'OSINT SEED · KEYLESS'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Karhutla Satelit (VIIRS/MODIS) &amp; Transparansi Anggaran SiRUP LKPP
          </p>
        </div>
      </div>

      {/* Center Telemetry Metrics (Tabular Numerals) */}
      <div className="pointer-events-auto apple-glass-pill hidden xl:flex items-center gap-5 rounded-2xl px-4 py-2">
        <div className="flex items-center gap-2.5">
          <span className="type-micro text-zinc-400">Titik Api Aktif</span>
          <span className="tabular-nums text-sm font-semibold text-[#ff453a]">
            {stats.count}
          </span>
          <span className="tabular-nums text-xs text-zinc-400">
            ({stats.totalFrp} MW FRP)
          </span>
        </div>

        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-[#ff9f0a]" />
          <span className="type-micro text-zinc-400">Di Area Konsesi</span>
          <span className="tabular-nums text-sm font-semibold text-[#ff9f0a]">
            {stats.concessionRatio}%
          </span>
        </div>

        <div className="h-4 w-px bg-white/10" />

        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-[#ffd60a]" />
          <span className="type-micro text-zinc-400">Pagu SiRUP Terpantau</span>
          <span className="tabular-nums text-sm font-semibold text-white">
            {formatRupiah(stats.totalBudgetRp)}
          </span>
          {stats.flaggedCount > 0 && (
            <span className="tabular-nums rounded-full bg-[#ff453a]/20 px-2 py-0.5 text-[10px] font-semibold text-[#ff6961] border border-[#ff453a]/30">
              {stats.flaggedCount} Anomali
            </span>
          )}
        </div>
      </div>

      {/* Right Controls: Province Filter, Budget Watchdog, Power Up */}
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="apple-glass-pill rounded-2xl px-2.5 py-1.5 flex items-center gap-2">
          <label htmlFor="province-select" className="type-micro text-zinc-400 pl-1">
            Wilayah
          </label>
          <select
            id="province-select"
            value={selectedProvinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
            className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer pr-1"
          >
            {PROVINCE_OPTIONS.map((prov) => (
              <option key={prov} value={prov} className="bg-[#16161a] text-white">
                {prov === 'ALL' ? 'Seluruh Indonesia' : prov}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onPointerDown={() => setBudgetWatchdogOpen(!isBudgetWatchdogOpen)}
          className={`apple-pressable apple-glass-pill flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-medium transition-colors ${
            isBudgetWatchdogOpen
              ? 'bg-[#ff453a]/25 text-white border-[#ff453a]/50'
              : 'text-zinc-200 hover:text-white'
          }`}
          aria-pressed={isBudgetWatchdogOpen}
        >
          <Scale className="h-3.5 w-3.5 text-[#ff6961]" />
          <span>Anggaran vs. Realita</span>
          <span className="tabular-nums rounded-md bg-[#ff453a]/20 px-1.5 py-0.2 text-[10px] font-semibold text-[#ff6961]">
            {stats.flaggedCount}
          </span>
        </button>

        <button
          type="button"
          onPointerDown={() => setPowerUpOpen(true)}
          className="apple-pressable apple-glass-pill flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-medium text-zinc-200 hover:text-white"
          aria-label="Power Up Provider API Keys"
        >
          {hasLiveKeys ? (
            <Sparkles className="h-3.5 w-3.5 text-[#30d158]" />
          ) : (
            <KeyRound className="h-3.5 w-3.5 text-[#ffd60a]" />
          )}
          <span className="hidden sm:inline">
            {hasLiveKeys ? 'Powered Up' : 'Power Up'}
          </span>
        </button>
      </div>
    </header>
  );
}
