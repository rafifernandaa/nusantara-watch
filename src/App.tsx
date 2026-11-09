import { useEffect } from 'react';
import { BottomDock } from './components/BottomDock';
import { CivicBudgetDrawer } from './components/CivicBudgetDrawer';
import { GlobeViewport } from './components/GlobeViewport';
import { HotspotInspectorSheet } from './components/HotspotInspectorSheet';
import { PowerUpModal } from './components/PowerUpModal';
import { TopStatusBar } from './components/TopStatusBar';
import { useWatchStore } from './store/useWatchStore';

export function App() {
  const hydrateFromUrl = useWatchStore((s) => s.hydrateFromUrl);
  const toggleLayer = useWatchStore((s) => s.toggleLayer);
  const toggleGlobeProjection = useWatchStore((s) => s.toggleGlobeProjection);
  const resetGlobe = useWatchStore((s) => s.resetGlobe);
  const setIsPlayingTimeline = useWatchStore((s) => s.setIsPlayingTimeline);

  useEffect(() => {
    hydrateFromUrl();
  }, [hydrateFromUrl]);

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
      else if (e.key === 'Escape') resetGlobe();
      else if (e.key === ' ') {
        e.preventDefault();
        const playing = useWatchStore.getState().isPlayingTimeline;
        setIsPlayingTimeline(!playing);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleLayer, toggleGlobeProjection, resetGlobe, setIsPlayingTimeline]);

  return (
    <main className="relative h-screen w-screen overflow-hidden select-none bg-[#070709]">
      <GlobeViewport />
      <TopStatusBar />
      <CivicBudgetDrawer />
      <HotspotInspectorSheet />
      <BottomDock />
      <PowerUpModal />
    </main>
  );
}

export default App;
