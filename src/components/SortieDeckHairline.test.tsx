import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { INDONESIAN_HOTSPOTS } from '../data/local_data/indonesia-osint-seed';
import { FirmsMatrixHairline } from './SortieDeckHairline';

beforeAll(() => {
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }

  if (typeof globalThis.IntersectionObserver !== 'function') {
    class MockIntersectionObserver {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
    }
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      writable: true,
      value: MockIntersectionObserver,
    });
  }
});

describe('FirmsMatrixHairline', () => {
  it('mounts 33 isometric solids driven by real hotspot FRP data without debug controls', () => {
    const onSelect = vi.fn();
    const { container, unmount } = render(
      <FirmsMatrixHairline hotspots={INDONESIAN_HOTSPOTS} onSelectHotspot={onSelect} />
    );

    const svg = container.querySelector('svg[viewBox="0 0 400 320"]');
    expect(svg).not.toBeNull();
    // 1 plinth + 32 matrix pillars = 33 solid groups (+1 outer group +1 mark group)
    expect(svg?.querySelectorAll('path.sil').length).toBe(33);

    const peakHotspot = INDONESIAN_HOTSPOTS.reduce((best, cur) =>
      cur.frpMw > best.frpMw ? cur : best
    );
    expect(screen.getByTestId('hairline-readout').textContent).toBe(
      `puncak · ${peakHotspot.frpMw} MW`
    );
    expect(screen.queryByRole('button', { name: 'play tour' })).toBeNull();
    expect(screen.queryByLabelText('intensitas')).toBeNull();

    const trackBtn = screen.getByRole('button', { name: 'Lacak' });
    fireEvent.click(trackBtn);
    expect(onSelect).toHaveBeenCalledWith(peakHotspot.id);

    unmount();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('shows rest readout when filtered hotspots array is empty', () => {
    const { unmount } = render(
      <FirmsMatrixHairline hotspots={[]} onSelectHotspot={vi.fn()} />
    );

    expect(screen.getByTestId('hairline-readout').textContent).toBe('rest');
    unmount();
  });
});
