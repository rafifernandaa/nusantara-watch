import { useMemo } from 'react';
import { KeyRound, Moon, Sun } from 'lucide-react';
import { SIRUP_BUDGET_PACKAGES } from '../data/local_data/indonesia-osint-seed';
import {
  aggregateBnpbMetrics,
  filterBnpbRecords,
} from '../data/local_data/bnpb-karhutla-2026';
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
  const theme = useWatchStore((s) => s.theme);
  const backendMode = useWatchStore((s) => s.backendMode);
  const hotspots = useWatchStore((s) => s.hotspots);
  const bnpbRecords = useWatchStore((s) => s.bnpbRecords);
  const selectedProvinceFilter = useWatchStore((s) => s.selectedProvinceFilter);
  const timelineDayOffset = useWatchStore((s) => s.timelineDayOffset);
  const cumulativeTimeline = useWatchStore((s) => s.cumulativeTimeline);
  const isBudgetWatchdogOpen = useWatchStore((s) => s.isBudgetWatchdogOpen);
  const isBnpbCommandOpen = useWatchStore((s) => s.isBnpbCommandOpen);
  const bnpbSnapshotMode = useWatchStore((s) => s.bnpbSnapshotMode);
  const providerKeys = useWatchStore((s) => s.providerKeys);

  const toggleTheme = useWatchStore((s) => s.toggleTheme);
  const setProvinceFilter = useWatchStore((s) => s.setProvinceFilter);
  const setBudgetWatchdogOpen = useWatchStore((s) => s.setBudgetWatchdogOpen);
  const setBnpbCommandOpen = useWatchStore((s) => s.setBnpbCommandOpen);
  const setPowerUpOpen = useWatchStore((s) => s.setPowerUpOpen);

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

  const bnpbMetrics = useMemo(() => {
    const filtered =
      selectedProvinceFilter === 'ALL'
        ? bnpbRecords
        : filterBnpbRecords(selectedProvinceFilter).map(
            (seed) => bnpbRecords.find((r) => r.shortProvince === seed.shortProvince) ?? seed
          );
    return aggregateBnpbMetrics(filtered, bnpbSnapshotMode);
  }, [bnpbRecords, selectedProvinceFilter, bnpbSnapshotMode]);

  const stats = useMemo(() => {
    const matchingBudgets = SIRUP_BUDGET_PACKAGES.filter(
      (b) => selectedProvinceFilter === 'ALL' || b.province === selectedProvinceFilter
    );
    const totalBudgetRp = matchingBudgets.reduce((acc, b) => acc + b.budgetRp, 0);
    const flaggedCount = matchingBudgets.filter(
      (b) => b.anomalyLevel === 'Disproportionate' || b.anomalyLevel === 'Elevated'
    ).length;

    return {
      count: visibleHotspots.length,
      totalBudgetRp,
      flaggedCount,
    };
  }, [visibleHotspots, selectedProvinceFilter]);

  const hasLiveKeys = Boolean(providerKeys.nasaFirmsMapKey.trim());
  const isLiveTelemetry = backendMode === 'postgis-live' || hasLiveKeys;
  const sourceLabel =
    backendMode === 'postgis-live'
      ? 'PostGIS 3.4'
      : backendMode === 'postgis-standby'
        ? 'PostGIS gateway'
        : hasLiveKeys
          ? 'FIRMS live'
          : 'Seed lokal';

  return (
    <header className="pointer-events-none fixed top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-3">
      {/* Left Ultra-Quiet Brand + Monospace Telemetry Readout */}
      <div className="pointer-events-auto apple-glass-pill flex h-11 items-center gap-3 rounded-xl px-3">
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: isLiveTelemetry ? 'var(--positive)' : 'var(--warning)',
          }}
          title={
            backendMode === 'postgis-live'
              ? 'PostgreSQL 16 + PostGIS 3.4 aktif'
              : 'Mode dataset lokal / siaga'
          }
        />
        <h1 className="text-[15px] font-medium tracking-[-0.01em] text-[var(--text-primary)] whitespace-nowrap">
          Nusantara Watch
        </h1>

        <div className="hidden md:block h-4 w-px bg-[var(--border-hairline)]" />

        <div className="hidden md:flex items-center gap-2 font-mono-tabular text-xs text-[var(--text-secondary)] whitespace-nowrap">
          <span>
            <strong className="font-medium text-[var(--accent)]">{stats.count}</strong> titik api
          </span>
          <span className="text-[var(--text-muted)]">·</span>
          <span>{bnpbMetrics.luasTerbakar24hHa.toLocaleString('id-ID')} ha</span>
          <span className="text-[var(--text-muted)] hidden xl:inline">·</span>
          <span className="hidden xl:inline">{formatRupiah(stats.totalBudgetRp)}</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span className="text-[var(--text-muted)]">{sourceLabel}</span>
        </div>
      </div>

      {/* Right Ultra-Quiet Controls */}
      <div className="pointer-events-auto apple-glass-pill flex flex-wrap items-center gap-1.5 rounded-xl px-2 py-1.5">
        <select
          id="province-select"
          aria-label="Filter wilayah"
          value={selectedProvinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value, true)}
          className="h-8 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-hairline)] px-2.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] focus:outline-none cursor-pointer"
        >
          {PROVINCE_OPTIONS.map((prov) => (
            <option key={prov} value={prov}>
              {prov === 'ALL' ? 'Seluruh Indonesia' : prov}
            </option>
          ))}
        </select>

        <button
          type="button"
          onPointerDown={() => setBnpbCommandOpen(!isBnpbCommandOpen)}
          className={`apple-pressable flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium border ${
            isBnpbCommandOpen
              ? 'bg-[var(--text-primary)] text-[var(--surface-card)] border-transparent'
              : 'bg-[var(--surface-raised)] text-[var(--text-primary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
          }`}
          aria-pressed={isBnpbCommandOpen}
          title="Buka Dashboard Informasi Penanganan Karhutla BNPB 2026 (B)"
        >
          <span>Posko BNPB</span>
          <span
            className={`font-mono-tabular text-[11px] ${
              isBnpbCommandOpen ? 'opacity-80' : 'text-[var(--accent)]'
            }`}
          >
            {bnpbMetrics.totalHotspot.toLocaleString('id-ID')}
          </span>
        </button>

        <button
          type="button"
          onPointerDown={() => setBudgetWatchdogOpen(!isBudgetWatchdogOpen)}
          className={`apple-pressable flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium border ${
            isBudgetWatchdogOpen
              ? 'bg-[var(--text-primary)] text-[var(--surface-card)] border-transparent'
              : 'bg-[var(--surface-raised)] text-[var(--text-primary)] border-[var(--border-hairline)] hover:border-[var(--border-strong)]'
          }`}
          aria-pressed={isBudgetWatchdogOpen}
          title="Buka Audit Anggaran SiRUP LKPP"
        >
          <span>Audit SiRUP</span>
          <span
            className={`font-mono-tabular text-[11px] ${
              isBudgetWatchdogOpen ? 'opacity-80' : 'text-[var(--text-muted)]'
            }`}
          >
            {stats.flaggedCount}
          </span>
        </button>

        <button
          type="button"
          onPointerDown={toggleTheme}
          className="apple-pressable flex h-8 items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-hairline)] px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
          aria-label={
            theme === 'dark' ? 'Ubah ke mode terang' : 'Ubah ke mode gelap'
          }
          title="Ubah mode tampilan (T)"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Terang</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" strokeWidth={1.5} />
              <span className="hidden sm:inline">Gelap</span>
            </>
          )}
        </button>

        <button
          type="button"
          onPointerDown={() => setPowerUpOpen(true)}
          className="apple-pressable flex h-8 items-center gap-1.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-hairline)] px-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]"
          aria-label="Pengaturan API key penyedia"
          title="Tambahkan NASA FIRMS / Gemini API key"
        >
          <KeyRound className="h-4 w-4" strokeWidth={1.5} />
          <span className="hidden sm:inline">{hasLiveKeys ? 'API aktif' : 'API key'}</span>
        </button>
      </div>
    </header>
  );
}
