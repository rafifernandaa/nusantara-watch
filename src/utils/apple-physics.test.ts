import { describe, expect, it } from 'vitest';
import {
  applyRubberbandBounds,
  computeRelativeVelocity,
  nearestSnapPoint,
  PointerVelocityTracker,
  project,
  resolveSnapWithMomentum,
  rubberband,
} from './apple-physics';

describe('apple-physics utilities', () => {
  it('projects momentum using Apple exponential decay formula', () => {
    expect(project(0)).toBe(0);
    const forward = project(1000, 0.998);
    expect(forward).toBeCloseTo(499, 0);
    const backward = project(-1000, 0.998);
    expect(backward).toBeCloseTo(-499, 0);
  });

  it('applies progressive rubber-banding past boundaries', () => {
    expect(rubberband(0, 400)).toBe(0);
    const smallPull = rubberband(50, 400);
    const largePull = rubberband(200, 400);
    expect(smallPull).toBeGreaterThan(0);
    expect(smallPull).toBeLessThan(50);
    expect(largePull).toBeGreaterThan(smallPull);
    expect(largePull).toBeLessThan(200);
    expect(rubberband(-50, 400)).toBeCloseTo(-smallPull, 5);
  });

  it('clamps inside bounds and rubber-bands outside bounds', () => {
    expect(applyRubberbandBounds(150, 0, 300, 300)).toBe(150);
    expect(applyRubberbandBounds(-40, 0, 300, 300)).toBeGreaterThan(-40);
    expect(applyRubberbandBounds(-40, 0, 300, 300)).toBeLessThan(0);
    expect(applyRubberbandBounds(340, 0, 300, 300)).toBeGreaterThan(300);
    expect(applyRubberbandBounds(340, 0, 300, 300)).toBeLessThan(340);
  });

  it('selects nearest snap point and respects flick velocity direction', () => {
    const snaps = [0, 280, 620];
    expect(nearestSnapPoint(250, snaps)).toBe(280);
    // Fast downward flick from 50 should advance to 280 even if close to 0
    expect(resolveSnapWithMomentum(50, 650, snaps)).toBe(280);
    // Fast upward flick from 260 should return to 0
    expect(resolveSnapWithMomentum(260, -650, snaps)).toBe(0);
  });

  it('computes relative velocity and tracks pointer velocity history', () => {
    expect(computeRelativeVelocity(50, 50, 150)).toBeCloseTo(0.5, 4);
    const tracker = new PointerVelocityTracker();
    tracker.record(100, 100, 1000);
    tracker.record(100, 220, 1060);
    const { vx, vy } = tracker.getVelocity(1065);
    expect(vx).toBe(0);
    expect(vy).toBeCloseTo(2000, 0);
  });
});
