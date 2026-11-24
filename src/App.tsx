import { useEffect } from 'react';
import { BnpbCommandDrawer } from './components/BnpbCommandDrawer';
import { BottomDock } from './components/BottomDock';
import { CivicBudgetDrawer } from './components/CivicBudgetDrawer';
import { FieldEvidenceModal } from './components/FieldEvidenceModal';
import { GlobeViewport } from './components/GlobeViewport';
import { HotspotInspectorSheet } from './components/HotspotInspectorSheet';
import { PowerUpModal } from './components/PowerUpModal';
import { TopStatusBar } from './components/TopStatusBar';
import { subscribeToPostgisEvents } from './services/postgisApi';
import { useWatchStore } from './store/useWatchStore';

export function App() {
  const hydrateFromUrl = useWatchStore((s) => s.hydrateFromUrl);
  const hydrateFromPostgis = useWatchStore((s) => s.hydrateFromPostgis);
  const applyGisChangeNotification = useWatchStore((s) => s.applyGisChangeNotification);
  const toggleLayer = useWatchStore((s) => s.toggleLayer);
  const toggleGlobeProjection = useWatchStore((s) => s.toggleGlobeProjection);
  const toggleTheme = useWatchStore((s) => s.toggleTheme);
  const resetGlobe = useWatchStore((s) => s.resetGlobe);
  const setIsPlayingTimeline = useWatchStore((s) => s.setIsPlayingTimeline);
  const setBnpbCommandOpen = useWatchStore((s) => s.setBnpbCommandOpen);

  useEffect(() => {
    hydrateFromUrl();
    void hydrateFromPostgis();
    const unsubscribe = subscribeToPostgisEvents((notification) => {
      applyGisChangeNotification(notification);
    });
    return () => unsubscribe();
  }, [hydrateFromUrl, hydrateFromPostgis, applyGisChangeNotification]);

  // Global keyboard shortcuts (inspired by gods-eye-view + Apple accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (e.key === '1') toggleLayer('hotspots');
      else if (e.key === '2') toggleLayer('concessions');
      else if (e.key === '3') toggleLayer('budgets');
      else if (e.key === '4') toggleLayer('wind-ispu');
      else if (e.key.toLowerCase() === 'g') toggleGlobeProjection();
      else if (e.key.toLowerCase() === 't') toggleTheme();
      else if (e.key.toLowerCase() === 'b') {
        const open = useWatchStore.getState().isBnpbCommandOpen;
        setBnpbCommandOpen(!open);
      } else if (e.key === 'Escape') resetGlobe();
      else if (e.key === ' ') {
        e.preventDefault();
        const playing = useWatchStore.getState().isPlayingTimeline;
        setIsPlayingTimeline(!playing);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    toggleLayer,
    toggleGlobeProjection,
    toggleTheme,
    resetGlobe,
    setIsPlayingTimeline,
    setBnpbCommandOpen,
  ]);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden select-none transition-colors duration-300"
      style={{ backgroundColor: 'var(--canvas-bg)', color: 'var(--text-primary)' }}
    >
      <GlobeViewport />
      <TopStatusBar />
      <BnpbCommandDrawer />
      <CivicBudgetDrawer />
      <HotspotInspectorSheet />
      <BottomDock />
      <PowerUpModal />
      <FieldEvidenceModal />
    </main>
  );
}

export default App;
