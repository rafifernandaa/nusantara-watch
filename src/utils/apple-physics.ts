/**
 * Apple Fluid Interface Physics & Gesture Utilities
 * Distilled from WWDC "Designing Fluid Interfaces" & emilkowalski/skills/apple-design
 */

export const APPLE_SPRINGS = {
  /** Critically damped default (damping 1.0, response 0.35s) — no overshoot */
  default: { type: 'spring' as const, bounce: 0, duration: 0.35 },
  /** Reposition / PiP / Camera card (damping 1.0, response 0.4s) */
  reposition: { type: 'spring' as const, bounce: 0, duration: 0.4 },
  /** Drawer / Sheet with momentum (damping 0.8, response 0.3s) */
  sheet: { type: 'spring' as const, bounce: 0.18, duration: 0.3 },
  /** Flick / Momentum interaction (damping 0.8, response 0.38s) */
  momentum: { type: 'spring' as const, bounce: 0.2, duration: 0.38 },
};

/**
 * Apple's exponential-decay momentum projection function.
 * Projects where a flick gesture would naturally come to rest.
 *
 * @param initialVelocity Velocity in px/s
 * @param decelerationRate 0.998 for normal scroll feel; 0.99 for snappier sheet feel
 */
export function project(initialVelocity: number, decelerationRate = 0.998): number {
  if (!Number.isFinite(initialVelocity) || Math.abs(initialVelocity) < 1) {
    return 0;
  }
  return ((initialVelocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive boundary resistance (rubber-banding).
 * The further past the boundary the user drags, the more the surface resists.
 *
 * @param overshoot Distance dragged past the boundary (px)
 * @param dimension Total dimension of the draggable container/axis (px)
 * @param constant Resistance constant (Apple standard = 0.55)
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0 || overshoot === 0) return 0;
  const absOvershoot = Math.abs(overshoot);
  const resisted = (absOvershoot * dimension * constant) / (dimension + constant * absOvershoot);
  return Math.sign(overshoot) * resisted;
}

/**
 * Applies soft rubber-band resistance when a value exceeds [min, max].
 */
export function applyRubberbandBounds(
  value: number,
  min: number,
  max: number,
  dimension: number,
  constant = 0.55
): number {
  if (value < min) {
    return min + rubberband(value - min, dimension, constant);
  }
  if (value > max) {
    return max + rubberband(value - max, dimension, constant);
  }
  return value;
}

/**
 * Finds the snap point closest to a projected resting coordinate.
 */
export function nearestSnapPoint(projectedValue: number, snapPoints: readonly number[]): number {
  if (snapPoints.length === 0) return projectedValue;
  let closest = snapPoints[0];
  let minDistance = Math.abs(projectedValue - closest);

  for (let i = 1; i < snapPoints.length; i++) {
    const distance = Math.abs(projectedValue - snapPoints[i]);
    if (distance < minDistance) {
      minDistance = distance;
      closest = snapPoints[i];
    }
  }
  return closest;
}

/**
 * Resolves a gesture release into a target snap point using both momentum projection
 * and velocity sign so fast flicks always advance in the direction of the gesture.
 */
export function resolveSnapWithMomentum(
  currentValue: number,
  velocityPxPerSec: number,
  snapPoints: readonly number[],
  decelerationRate = 0.992
): number {
  if (snapPoints.length === 0) return currentValue;
  const sorted = [...snapPoints].sort((a, b) => a - b);
  const projectedEndpoint = currentValue + project(velocityPxPerSec, decelerationRate);
  const candidate = nearestSnapPoint(projectedEndpoint, sorted);

  // If the user flicked decisively (> 280 px/s), ensure we move in the direction of velocity sign
  const FLICK_THRESHOLD = 280;
  if (Math.abs(velocityPxPerSec) >= FLICK_THRESHOLD) {
    if (velocityPxPerSec > 0 && candidate <= currentValue) {
      const nextUp = sorted.find((pt) => pt > currentValue);
      if (nextUp !== undefined) return nextUp;
    } else if (velocityPxPerSec < 0 && candidate >= currentValue) {
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i] < currentValue) return sorted[i];
      }
    }
  }

  return candidate;
}

/**
 * Normalizes gesture release velocity relative to remaining distance.
 */
export function computeRelativeVelocity(
  gestureVelocityPxPerSec: number,
  currentValue: number,
  targetValue: number
): number {
  const remaining = targetValue - currentValue;
  if (Math.abs(remaining) < 1) return 0;
  return gestureVelocityPxPerSec / remaining;
}

interface PointerSample {
  x: number;
  y: number;
  time: number;
}

/**
 * Tracks a rolling window of pointer positions and timestamps to compute
 * accurate release velocity in px/s for smooth velocity handoff.
 */
export class PointerVelocityTracker {
  private samples: PointerSample[] = [];
  private readonly maxSamples = 6;
  private readonly maxAgeMs = 120;

  public record(x: number, y: number, time = performance.now()): void {
    this.samples.push({ x, y, time });
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  public getVelocity(now = performance.now()): { vx: number; vy: number } {
    const recent = this.samples.filter((s) => now - s.time <= this.maxAgeMs);
    if (recent.length < 2) {
      return { vx: 0, vy: 0 };
    }
    const first = recent[0];
    const last = recent[recent.length - 1];
    const dtSeconds = (last.time - first.time) / 1000;
    if (dtSeconds <= 0.001) {
      return { vx: 0, vy: 0 };
    }
    return {
      vx: (last.x - first.x) / dtSeconds,
      vy: (last.y - first.y) / dtSeconds,
    };
  }

  public reset(): void {
    this.samples = [];
  }
}
