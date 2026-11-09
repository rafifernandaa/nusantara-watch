import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ExternalLink, KeyRound, ShieldCheck, X } from 'lucide-react';
import { useWatchStore } from '../store/useWatchStore';
import { APPLE_SPRINGS } from '../utils/apple-physics';

export function PowerUpModal() {
  const isPowerUpOpen = useWatchStore((s) => s.isPowerUpOpen);
  const providerKeys = useWatchStore((s) => s.providerKeys);
  const setPowerUpOpen = useWatchStore((s) => s.setPowerUpOpen);
  const saveProviderKeys = useWatchStore((s) => s.saveProviderKeys);

  const [nasaKey, setNasaKey] = useState(providerKeys.nasaFirmsMapKey);
  const [geminiKey, setGeminiKey] = useState(providerKeys.geminiApiKey);
  const [maptilerKey, setMaptilerKey] = useState(providerKeys.maptilerKey);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setNasaKey(providerKeys.nasaFirmsMapKey);
    setGeminiKey(providerKeys.geminiApiKey);
    setMaptilerKey(providerKeys.maptilerKey);
  }, [providerKeys, isPowerUpOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveProviderKeys({
      nasaFirmsMapKey: nasaKey.trim(),
      geminiApiKey: geminiKey.trim(),
      maptilerKey: maptilerKey.trim(),
    });
    setSavedToast(true);
    window.setTimeout(() => {
      setSavedToast(false);
      setPowerUpOpen(false);
    }, 900);
  };

  return (
    <AnimatePresence>
      {isPowerUpOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onPointerDown={() => setPowerUpOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={APPLE_SPRINGS.default}
            onPointerDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="powerup-title"
            className="apple-glass-heavy w-full max-w-lg rounded-3xl p-6 space-y-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ffd60a]/15 text-[#ffd60a] border border-[#ffd60a]/30">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="powerup-title" className="type-title text-white">
                    Power Up — Provider Settings
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Aplikasi berjalan tanpa API key secara default. Tambahkan key gratis untuk
                    polling langsung ke satelit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onPointerDown={() => setPowerUpOpen(false)}
                className="apple-pressable rounded-full bg-white/10 p-1.5 text-zinc-300 hover:text-white"
                aria-label="Tutup dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              {/* NASA FIRMS Key */}
              <div className="apple-elevated-card rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="nasa-firms-key" className="text-xs font-semibold text-white">
                    NASA FIRMS `MAP_KEY` (VIIRS &amp; MODIS NRT)
                  </label>
                  <a
                    href="https://firms.modaps.eosdis.nasa.gov/api/map_key/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#0a84ff] hover:underline"
                  >
                    Dapatkan Gratis <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <input
                  id="nasa-firms-key"
                  type="password"
                  value={nasaKey}
                  onChange={(e) => setNasaKey(e.target.value)}
                  placeholder="Masukkan 32-karakter NASA FIRMS MAP_KEY..."
                  className="w-full rounded-xl bg-black/40 px-3 py-2 text-xs text-white placeholder-zinc-500 border border-white/10 focus:border-white/30 focus:outline-none"
                />
              </div>

              {/* Gemini API Key */}
              <div className="apple-elevated-card rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="gemini-api-key" className="text-xs font-semibold text-white">
                    Google Gemini API Key (Audit AI Paket SiRUP LKPP)
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#0a84ff] hover:underline"
                  >
                    Google AI Studio <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <input
                  id="gemini-api-key"
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full rounded-xl bg-black/40 px-3 py-2 text-xs text-white placeholder-zinc-500 border border-white/10 focus:border-white/30 focus:outline-none"
                />
              </div>

              {/* MapTiler / Custom Terrain Key */}
              <div className="apple-elevated-card rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="maptiler-key" className="text-xs font-semibold text-white">
                    MapTiler Token (Opsional — 3D Terrain DEM Resolusi Tinggi)
                  </label>
                  <span className="text-[10px] text-zinc-400">Opsional</span>
                </div>
                <input
                  id="maptiler-key"
                  type="password"
                  value={maptilerKey}
                  onChange={(e) => setMaptilerKey(e.target.value)}
                  placeholder="Kosongkan untuk memakai Esri Satellite & Carto gratis..."
                  className="w-full rounded-xl bg-black/40 px-3 py-2 text-xs text-white placeholder-zinc-500 border border-white/10 focus:border-white/30 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <ShieldCheck className="h-4 w-4 text-[#30d158]" />
                  <span>Disimpan lokal di peramban Anda (tidak dikirim ke pihak ketiga).</span>
                </div>

                <button
                  type="submit"
                  className="apple-pressable flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200"
                >
                  {savedToast ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Tersimpan</span>
                    </>
                  ) : (
                    <span>Simpan Key</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
