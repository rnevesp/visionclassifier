import type { Prediction } from './types';

/** A top result below this probability is flagged as uncertain in the UI. */
export const UNCERTAIN_THRESHOLD = 0.5;

/** Returns a new array sorted by probability, highest first. Stable for ties. */
export function rankPredictions(raw: readonly Prediction[]): Prediction[] {
  return raw
    .map((p, index) => ({ p, index }))
    .sort((a, b) => b.p.probability - a.p.probability || a.index - b.index)
    .map(({ p }) => ({ className: p.className, probability: p.probability }));
}

/** 0.4567 -> "45.7%". Clamps to [0, 1] and treats NaN as 0. */
export function formatPercent(probability: number, digits = 1): string {
  const clamped = Number.isFinite(probability) ? Math.min(1, Math.max(0, probability)) : 0;
  return (clamped * 100).toFixed(digits) + '%';
}

/** True when there is no result or the best one is below the threshold. */
export function isUncertain(ranked: readonly Prediction[], threshold = UNCERTAIN_THRESHOLD): boolean {
  return ranked.length === 0 || ranked[0].probability < threshold;
}
