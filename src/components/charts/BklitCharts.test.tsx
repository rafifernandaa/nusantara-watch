import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { INDONESIAN_HOTSPOTS } from '../../data/local_data/indonesia-osint-seed';
import {
  BklitAreaSparkChart,
  BklitBudgetComparisonChart,
  BklitIspuGauge,
  BklitProvincialBarChart,
  BklitRingChart,
} from './BklitCharts';

describe('BklitCharts composable OKLCH components', () => {
  it('renders BklitRingChart, previews hovered segment in center, and triggers onSelectSegment', () => {
    const onSelect = vi.fn();
    render(
      <BklitRingChart
        title="Sebaran hotspot"
        subtitle="6 provinsi prioritas"
        totalLabel="188"
        unitLabel="titik"
        secondaryUnitLabel="fire spot"
        ariaLabel="Ring sebaran hotspot"
        onSelectSegment={onSelect}
        segments={[
          { label: 'Kalteng', value: 100, secondaryValue: 20, color: 'var(--chart-5)' },
          { label: 'Riau', value: 88, secondaryValue: 19, color: 'var(--chart-1)' },
        ]}
      />
    );

    expect(screen.getByTestId('bklit-ring-center').textContent).toContain('188');
    const riauBtn = screen.getByRole('button', { name: /Riau/i });
    fireEvent.mouseEnter(riauBtn);
    expect(screen.getByTestId('bklit-ring-center').textContent).toContain('88');
    expect(screen.getByTestId('bklit-ring-center').textContent).toContain('Riau');

    fireEvent.click(riauBtn);
    expect(onSelect).toHaveBeenCalledWith('Riau');
  });

  it('renders BklitProvincialBarChart with crosshair tooltip and click filter', () => {
    const onSelectBar = vi.fn();
    const { container } = render(
      <BklitProvincialBarChart
        title="Terbakar vs ditangani"
        subtitle="Hektar harian"
        primaryLabel="Terbakar"
        secondaryLabel="Ditangani"
        unit="ha"
        onSelectBar={onSelectBar}
        items={[
          { label: 'Riau', primary: 20, secondary: 8, color: 'var(--chart-1)' },
          { label: 'Jambi', primary: 40, secondary: 16, color: 'var(--chart-2)' },
        ]}
      />
    );

    const groups = container.querySelectorAll('svg g');
    expect(groups.length).toBeGreaterThanOrEqual(2);
    const jambiGroup = Array.from(groups).find((g) => g.textContent?.includes('Jambi'));
    expect(jambiGroup).toBeDefined();
    if (jambiGroup) {
      fireEvent.mouseEnter(jambiGroup);
      expect(screen.getByTestId('bklit-bar-tooltip').textContent).toContain('Jambi');
      fireEvent.click(jambiGroup);
      expect(onSelectBar).toHaveBeenCalledWith('Jambi');
    }
  });

  it('renders BklitBudgetComparisonChart, BklitAreaSparkChart, and BklitIspuGauge', () => {
    const onSelectBudget = vi.fn();
    const hotspot = INDONESIAN_HOTSPOTS[0];

    render(
      <>
        <BklitBudgetComparisonChart
          title="Pagu vs titik api"
          subtitle="SiRUP"
          onSelectItem={onSelectBudget}
          items={[
            {
              id: 'SIRUP-1',
              label: 'Dashboard IT',
              subLabel: 'Riau',
              budgetRp: 24_000_000_000,
              hotspots: 14,
              anomalyLevel: 'Disproportionate',
              formattedBudget: 'Rp 24 M',
            },
          ]}
        />
        <BklitAreaSparkChart hotspot={hotspot} />
        <BklitIspuGauge
          score={hotspot.nearestIspuStation.ispuScore}
          pm25={hotspot.nearestIspuStation.pm25}
          category={hotspot.nearestIspuStation.category}
          stationName={hotspot.nearestIspuStation.name}
        />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: /Dashboard IT/i }));
    expect(onSelectBudget).toHaveBeenCalledWith('SIRUP-1');
    expect(screen.getByTestId('bklit-area-tooltip').textContent).toContain(String(hotspot.frpMw));
    expect(screen.getByTestId('bklit-ispu-score').textContent).toBe(
      String(hotspot.nearestIspuStation.ispuScore)
    );
  });
});
