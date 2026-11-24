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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
          onPointerDown={() => setPowerUpOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={APPLE_SPRINGS.default}
            onPointerDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="powerup-title"
            className="apple-glass-heavy w-full max-w-lg rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-hairline)] shrink-0">
                  <KeyRound className="h-4 w-4" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 id="powerup-title" className="type-title text-[var(--text-primary)]">
                    Pengaturan API key penyedia
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Aplikasi berjalan tanpa API key secara default. Tambahkan key opsional untuk polling langsung ke satelit.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onPointerDown={() => setPowerUpOpen(false)}
                className="apple-pressable rounded-lg bg-[var(--surface-raised)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)]"
                aria-label="Tutup dialog"
              >
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              {/* NASA FIRMS Key */}
              <div className="apple-elevated-card rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="nasa-firms-key" className="text-xs font-medium text-[var(--text-primary)]">
                    NASA FIRMS MAP_KEY (VIIRS &amp; MODIS NRT)
                  </label>
                  <a
                    href="https://firms.modaps.eosdis.nasa.gov/api/map_key/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--info)] hover:underline"
                  >
                    Dapatkan gratis <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                  </a>
                </div>
                <input
                  id="nasa-firms-key"
                  type="password"
                  value={nasaKey}
                  onChange={(e) => setNasaKey(e.target.value)}
                  placeholder="32-karakter MAP_KEY"
                  className="w-full h-9 rounded-lg bg-[var(--surface-deepest)] px-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border-hairline)] focus:border-[var(--border-strong)] focus:outline-none"
                />
              </div>

              {/* Gemini API Key */}
              <div className="apple-elevated-card rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="gemini-api-key" className="text-xs font-medium text-[var(--text-primary)]">
                    Google Gemini API Key (Audit paket SiRUP)
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[var(--info)] hover:underline"
                  >
                    Google AI Studio <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
                  </a>
                </div>
                <input
                  id="gemini-api-key"
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy"
                  className="w-full h-9 rounded-lg bg-[var(--surface-deepest)] px-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border-hairline)] focus:border-[var(--border-strong)] focus:outline-none"
                />
              </div>

              {/* MapTiler / Custom Terrain Key */}
              <div className="apple-elevated-card rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="maptiler-key" className="text-xs font-medium text-[var(--text-primary)]">
                    MapTiler token (3D terrain DEM)
                  </label>
                  <span className="text-[11px] text-[var(--text-muted)]">Opsional</span>
                </div>
                <input
                  id="maptiler-key"
                  type="password"
                  value={maptilerKey}
                  onChange={(e) => setMaptilerKey(e.target.value)}
                  placeholder="Kosongkan untuk Esri & Carto gratis"
                  className="w-full h-9 rounded-lg bg-[var(--surface-deepest)] px-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border-hairline)] focus:border-[var(--border-strong)] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                  <ShieldCheck className="h-4 w-4 text-[var(--positive)] shrink-0" strokeWidth={1.5} />
                  <span>Disimpan lokal di peramban Anda.</span>
                </div>

                <button
                  type="submit"
                  className="apple-pressable flex h-9 items-center gap-1.5 rounded-lg bg-[var(--text-primary)] px-4 text-xs font-medium text-[var(--surface-card)] hover:opacity-90"
                >
                  {savedToast ? (
                    <>
                      <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>Tersimpan</span>
                    </>
                  ) : (
                    <span>Simpan key</span>
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
