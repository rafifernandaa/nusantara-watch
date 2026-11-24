import { beforeEach, describe, expect, it } from 'vitest';
import { useWatchStore } from './useWatchStore';

describe('useWatchStore state & spatial actions', () => {
  beforeEach(() => {
    useWatchStore.getState().resetGlobe();
    useWatchStore.getState().setBasemap('dark-glass');
    useWatchStore.getState().setTheme('dark');
    useWatchStore.getState().setBnpbCommandOpen(false);
  });

  it('toggles spatial layers and basemaps', () => {
    const store = useWatchStore.getState();
    expect(store.activeLayers.hotspots).toBe(true);

    store.toggleLayer('hotspots');
    expect(useWatchStore.getState().activeLayers.hotspots).toBe(false);

    store.setBasemap('satellite');
    expect(useWatchStore.getState().basemap).toBe('satellite');
  });

  it('toggles between Apple Dark Mode and Clean Light Mode while syncing basemap', () => {
    const store = useWatchStore.getState();
    expect(store.theme).toBe('dark');
    expect(store.basemap).toBe('dark-glass');

    store.toggleTheme();
    expect(useWatchStore.getState().theme).toBe('light');
    expect(useWatchStore.getState().basemap).toBe('light-glass');

    store.toggleTheme();
    expect(useWatchStore.getState().theme).toBe('dark');
    expect(useWatchStore.getState().basemap).toBe('dark-glass');
  });

  it('switches BNPB snapshot mode and opens BNPB Command Drawer', () => {
    const store = useWatchStore.getState();
    expect(store.isBnpbCommandOpen).toBe(false);
    expect(store.bnpbSnapshotMode).toBe('live-api');

    store.setBnpbCommandOpen(true);
    store.setBnpbSnapshotMode('excel-sheet');

    expect(useWatchStore.getState().isBnpbCommandOpen).toBe(true);
    expect(useWatchStore.getState().bnpbSnapshotMode).toBe('excel-sheet');
  });

  it('locks camera onto a hotspot when selected', () => {
    const prevToken = useWatchStore.getState().cameraTarget.transitionToken;
    useWatchStore.getState().selectHotspot('FIRMS-IDN-KALTENG-001');

    const nextState = useWatchStore.getState();
    expect(nextState.selectedHotspotId).toBe('FIRMS-IDN-KALTENG-001');
    expect(nextState.cameraTarget.longitude).toBeCloseTo(114.128, 3);
    expect(nextState.cameraTarget.latitude).toBeCloseTo(-2.426, 3);
    expect(nextState.cameraTarget.transitionToken).toBe(prevToken + 1);
  });

  it('clamps timeline day offset between -6 and 0', () => {
    useWatchStore.getState().setTimelineDayOffset(-10);
    expect(useWatchStore.getState().timelineDayOffset).toBe(-6);

    useWatchStore.getState().setTimelineDayOffset(4);
    expect(useWatchStore.getState().timelineDayOffset).toBe(0);
  });
});
