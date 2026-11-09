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
import { formatRupiah } from '../utils/formatters';
import type { AnomalyLevel } from '../types/watch';

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
          initial={{ opacity: 0, x: -36, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -36, scale: 0.96 }}
          transition={APPLE_SPRINGS.default}
          aria-label="Audit Anggaran SiRUP LKPP vs Realita Titik Api"
          className="fixed left-3 top-20 bottom-28 z-30 w-[calc(100vw-24px)] sm:w-[415px] apple-glass-heavy rounded-3xl flex flex-col overflow-hidden"
          style={{ transformOrigin: 'top left' }}
        >
          {/* Header */}
          <div className="px-4 pt-3.5 pb-3 border-b border-white/[0.08] flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-[#ff6961]" />
                <h2 className="type-title text-white">
                  Anggaran SiRUP vs. Realita Karhutla
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Komparasi Pagu Pengadaan LKPP dengan Titik Api Satelit Aktif
              </p>
            </div>
            <button
              type="button"
              onPointerDown={() => setBudgetWatchdogOpen(false)}
              className="apple-pressable rounded-full bg-white/10 p-1.5 text-zinc-300 hover:text-white"
              aria-label="Tutup panel anggaran"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode Segmented Control */}
          <div className="px-4 pt-2.5 flex items-center gap-2">
            <div className="flex w-full rounded-xl bg-black/35 p-0.5 border border-white/10">
              <button
                type="button"
                onPointerDown={() => setActiveTab('budgets')}
                className={`apple-pressable flex-1 rounded-lg py-1.5 text-xs font-medium ${
                  activeTab === 'budgets'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Paket SiRUP ({SIRUP_BUDGET_PACKAGES.length})
              </button>
              <button
                type="button"
                onPointerDown={() => setActiveTab('hotspots')}
                className={`apple-pressable flex-1 rounded-lg py-1.5 text-xs font-medium ${
                  activeTab === 'hotspots'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Daftar Titik Api ({INDONESIAN_HOTSPOTS.length})
              </button>
            </div>
          </div>

          {activeTab === 'budgets' ? (
            <>
              {/* Headline Discrepancy Banner ("Abil Sudarman" Insight) */}
              <div className="mx-4 mt-2.5 apple-elevated-card rounded-2xl p-3 grid grid-cols-2 gap-2.5">
                <div>
                  <span className="type-micro text-[#ff6961] block">
                    Belanja Aplikasi/Portal IT
                  </span>
                  <span className="tabular-nums text-sm font-semibold text-white">
                    {formatRupiah(summary.itDashboardSpend)}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    3 Paket Dashboard/Web
                  </span>
                </div>
                <div className="border-l border-white/10 pl-2.5">
                  <span className="type-micro text-[#30d158] block">
                    Fisik Sekat Kanal Gambut
                  </span>
                  <span className="tabular-nums text-sm font-semibold text-white">
                    {formatRupiah(summary.physicalFieldSpend)}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    185 Konstruksi Basah
                  </span>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="px-4 pt-2.5 pb-1 flex items-center gap-1.5 overflow-x-auto">
                {(['ALL', 'Disproportionate', 'Elevated', 'Normal'] as const).map(
                  (lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onPointerDown={() => setRiskFilter(lvl)}
                      className={`apple-pressable rounded-lg px-2.5 py-1 text-[11px] font-medium border ${
                        riskFilter === lvl
                          ? 'bg-white/15 text-white border-white/25'
                          : 'bg-transparent text-zinc-400 border-white/5 hover:text-zinc-200'
                      }`}
                    >
                      {lvl === 'ALL' ? 'Semua' : lvl}
                    </button>
                  )
                )}
              </div>

              {/* Scrollable Package List */}
              <div className="scroll-mask-y flex-1 overflow-y-auto px-4 py-2.5 space-y-2.5">
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
                      className={`apple-pressable apple-elevated-card cursor-pointer rounded-2xl p-3.5 space-y-2 transition-all ${
                        isSelected ? 'ring-1 ring-[#ffd60a] bg-white/[0.09]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="tabular-nums text-[10px] font-mono text-zinc-400">
                          {pkg.sirupId} · {pkg.province}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            pkg.anomalyLevel === 'Disproportionate'
                              ? 'bg-[#ff453a]/20 text-[#ff6961] border border-[#ff453a]/30'
                              : pkg.anomalyLevel === 'Elevated'
                                ? 'bg-[#ff9f0a]/20 text-[#ffb340] border border-[#ff9f0a]/30'
                                : 'bg-[#30d158]/20 text-[#30d158] border border-[#30d158]/30'
                          }`}
                        >
                          {pkg.anomalyLevel === 'Normal' ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {pkg.anomalyLevel}
                        </span>
                      </div>

                      <h3 className="text-xs font-semibold text-white leading-snug">
                        {pkg.packageName}
                      </h3>

                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-zinc-400">{pkg.agency}</span>
                        <span className="tabular-nums text-sm font-bold text-[#ffd60a]">
                          {formatRupiah(pkg.budgetRp)}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-300 leading-relaxed bg-black/25 rounded-xl p-2 border border-white/[0.05]">
                        {pkg.anomalyReason}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                        <span className="tabular-nums text-[#ff6961] font-medium">
                          {pkg.provinceActiveHotspots} Titik Api Aktif di {pkg.province}
                        </span>
                        <span className="inline-flex items-center gap-1 text-zinc-200 font-medium">
                          Lacak Arc di Peta <ArrowUpRight className="h-3 w-3" />
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
                    className={`apple-pressable apple-elevated-card cursor-pointer rounded-2xl p-3 flex items-center justify-between gap-3 ${
                      selected ? 'ring-1 ring-[#ff453a] bg-white/[0.09]' : ''
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 text-[#ff453a]" />
                        <span className="text-xs font-semibold text-white">
                          {h.kabupaten}, {h.province}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {h.concessionHolder ?? 'Lahan Non-Konsesi'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="tabular-nums text-xs font-bold text-[#ff453a] block">
                        {h.frpMw} MW
                      </span>
                      <span className="tabular-nums text-[10px] text-zinc-400">
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
