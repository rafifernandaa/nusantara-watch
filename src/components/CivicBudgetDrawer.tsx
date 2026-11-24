import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Flame,
  Scale,
  X,
} from 'lucide-react';
import {
  INDONESIAN_HOTSPOTS,
  SIRUP_BUDGET_PACKAGES,
} from '../data/local_data/indonesia-osint-seed';
import { useWatchStore } from '../store/useWatchStore';
import { APPLE_SPRINGS } from '../utils/apple-physics';
import { formatRupiah, formatShortRupiah } from '../utils/formatters';
import type { AnomalyLevel } from '../types/watch';
import { BklitBudgetComparisonChart } from './charts/BklitCharts';

export function CivicBudgetDrawer() {
  const isBudgetWatchdogOpen = useWatchStore((s) => s.isBudgetWatchdogOpen);
  const selectedBudgetId = useWatchStore((s) => s.selectedBudgetId);
  const selectedHotspotId = useWatchStore((s) => s.selectedHotspotId);
  const setBudgetWatchdogOpen = useWatchStore((s) => s.setBudgetWatchdogOpen);
  const selectBudget = useWatchStore((s) => s.selectBudget);
  const selectHotspot = useWatchStore((s) => s.selectHotspot);

  const [activeTab, setActiveTab] = useState<'budgets' | 'hotspots'>('budgets');
  const [riskFilter, setRiskFilter] = useState<'ALL' | AnomalyLevel>('ALL');

  const filteredBudgets = useMemo(
    () =>
      SIRUP_BUDGET_PACKAGES.filter(
        (b) => riskFilter === 'ALL' || b.anomalyLevel === riskFilter
      ),
    [riskFilter]
  );

  const summary = useMemo(() => {
    const itDashboardSpend = SIRUP_BUDGET_PACKAGES.filter(
      (b) => b.category === 'Aplikasi & Dashboard IT'
    ).reduce((acc, b) => acc + b.budgetRp, 0);

    const physicalFieldSpend = SIRUP_BUDGET_PACKAGES.filter(
      (b) => b.category === 'Operasi Patroli & Sekat Kanal'
    ).reduce((acc, b) => acc + b.budgetRp, 0);

    return { itDashboardSpend, physicalFieldSpend };
  }, []);

  return (
    <AnimatePresence>
      {isBudgetWatchdogOpen && (
        <motion.section
          initial={{ opacity: 0, x: -32, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -32, scale: 0.97 }}
          transition={APPLE_SPRINGS.default}
          aria-label="Audit Anggaran SiRUP LKPP vs Realita Titik Api"
          className="fixed left-4 top-20 bottom-24 z-30 w-[calc(100vw-32px)] sm:w-[416px] apple-glass-heavy rounded-2xl flex flex-col overflow-hidden"
          style={{ transformOrigin: 'top left' }}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 border-b border-[var(--border-hairline)] flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.5} />
                <h2 className="type-title text-[var(--text-primary)]">
                  Anggaran SiRUP vs. realita karhutla
                </h2>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Komparasi pagu pengadaan LKPP dengan titik api satelit aktif
              </p>
            </div>
            <button
              type="button"
              onPointerDown={() => setBudgetWatchdogOpen(false)}
              className="apple-pressable rounded-lg bg-[var(--surface-raised)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]"
              aria-label="Tutup panel anggaran"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Mode Segmented Control */}
          <div className="px-4 pt-3 flex items-center gap-2">
            <div className="flex w-full rounded-lg bg-[var(--surface-deepest)] p-1 border border-[var(--border-hairline)]">
              <button
                type="button"
                onPointerDown={() => setActiveTab('budgets')}
                className={`apple-pressable flex-1 rounded-md py-1.5 text-xs font-medium ${
                  activeTab === 'budgets'
                    ? 'bg-[var(--surface-raised)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Paket SiRUP ({SIRUP_BUDGET_PACKAGES.length})
              </button>
              <button
                type="button"
                onPointerDown={() => setActiveTab('hotspots')}
                className={`apple-pressable flex-1 rounded-md py-1.5 text-xs font-medium ${
                  activeTab === 'hotspots'
                    ? 'bg-[var(--surface-raised)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Daftar titik api ({INDONESIAN_HOTSPOTS.length})
              </button>
            </div>
          </div>

          {activeTab === 'budgets' ? (
            <>
              {/* Headline Discrepancy Banner */}
              <div className="mx-4 mt-3 apple-elevated-card rounded-xl p-3 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-[var(--negative)] block">
                    Belanja aplikasi/portal IT
                  </span>
                  <span className="font-mono-tabular text-sm font-medium text-[var(--text-primary)] mt-0.5 block">
                    {formatRupiah(summary.itDashboardSpend)}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] block">
                    3 paket dashboard/web
                  </span>
                </div>
                <div className="border-l border-[var(--border-hairline)] pl-3">
                  <span className="text-[11px] text-[var(--positive)] block">
                    Fisik sekat kanal gambut
                  </span>
                  <span className="font-mono-tabular text-sm font-medium text-[var(--text-primary)] mt-0.5 block">
                    {formatRupiah(summary.physicalFieldSpend)}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] block">
                    185 konstruksi basah
                  </span>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="px-4 pt-3 pb-1 flex items-center gap-1.5 overflow-x-auto">
                {(['ALL', 'Disproportionate', 'Elevated', 'Normal'] as const).map(
                  (lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onPointerDown={() => setRiskFilter(lvl)}
                      className={`apple-pressable rounded-lg px-2.5 h-7 text-[11px] font-medium border ${
                        riskFilter === lvl
                          ? 'bg-[var(--text-primary)] text-[var(--surface-card)] border-transparent'
                          : 'bg-transparent text-[var(--text-muted)] border-[var(--border-hairline)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {lvl === 'ALL' ? 'Semua' : lvl}
                    </button>
                  )
                )}
              </div>

              {/* Scrollable Comparison Chart & Package List */}
              <div className="scroll-mask-y flex-1 overflow-y-auto px-4 py-2.5 space-y-2.5">
                <BklitBudgetComparisonChart
                  title="Perbandingan pagu SiRUP vs titik api"
                  subtitle="Klik baris paket untuk melacak arc di peta"
                  selectedId={selectedBudgetId}
                  onSelectItem={(id) => selectBudget(id)}
                  items={filteredBudgets.map((pkg) => ({
                    id: pkg.sirupId,
                    label: `${pkg.province} · ${pkg.category}`,
                    subLabel: pkg.agency,
                    budgetRp: pkg.budgetRp,
                    hotspots: pkg.provinceActiveHotspots,
                    anomalyLevel: pkg.anomalyLevel,
                    formattedBudget: formatShortRupiah(pkg.budgetRp),
                  }))}
                />

                {filteredBudgets.map((pkg) => {
                  const isSelected = pkg.sirupId === selectedBudgetId;
                  return (
                    <div
                      key={pkg.sirupId}
                      onPointerDown={() => selectBudget(pkg.sirupId)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') selectBudget(pkg.sirupId);
                      }}
                      className={`apple-pressable apple-elevated-card cursor-pointer rounded-xl p-3.5 space-y-2 transition-colors ${
                        isSelected ? 'border-[var(--accent)]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono-tabular text-[11px] text-[var(--text-muted)]">
                          {pkg.sirupId} · {pkg.province}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                            pkg.anomalyLevel === 'Disproportionate'
                              ? 'bg-[var(--negative-soft)] text-[var(--negative)]'
                              : pkg.anomalyLevel === 'Elevated'
                                ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                                : 'bg-[var(--positive-soft)] text-[var(--positive)]'
                          }`}
                        >
                          {pkg.anomalyLevel === 'Normal' ? (
                            <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
                          ) : (
                            <AlertTriangle className="h-3 w-3" strokeWidth={1.5} />
                          )}
                          {pkg.anomalyLevel}
                        </span>
                      </div>

                      <h3 className="text-xs font-medium text-[var(--text-primary)] leading-snug">
                        {pkg.packageName}
                      </h3>

                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          {pkg.agency}
                        </span>
                        <span className="font-mono-tabular text-sm font-medium text-[var(--accent)]">
                          {formatRupiah(pkg.budgetRp)}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--surface-deepest)] rounded-lg p-2.5 border border-[var(--border-hairline)]">
                        {pkg.anomalyReason}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--text-muted)]">
                        <span className="font-mono-tabular text-[var(--negative)] font-medium">
                          {pkg.provinceActiveHotspots} titik api aktif di {pkg.province}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[var(--text-primary)] font-medium">
                          Lacak arc di peta <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Hotspots Quick Roster Tab */
            <div className="scroll-mask-y flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {INDONESIAN_HOTSPOTS.map((h) => {
                const selected = h.id === selectedHotspotId;
                return (
                  <div
                    key={h.id}
                    onPointerDown={() => selectHotspot(h.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') selectHotspot(h.id);
                    }}
                    className={`apple-pressable apple-elevated-card cursor-pointer rounded-xl p-3 flex items-center justify-between gap-3 transition-colors ${
                      selected ? 'border-[var(--accent)]' : ''
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={1.5} />
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          {h.kabupaten}, {h.province}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {h.concessionHolder ?? 'Lahan non-konsesi'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono-tabular text-xs font-medium text-[var(--accent)] block">
                        {h.frpMw} MW
                      </span>
                      <span className="font-mono-tabular text-[11px] text-[var(--text-muted)]">
                        {h.persistenceHours}j · {h.confidence}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
