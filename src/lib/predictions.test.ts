import { describe, expect, it } from 'vitest';
import { formatPercent, isUncertain, rankPredictions } from './predictions';

describe('rankPredictions', () => {
  it('sorts highest first without mutating the input', () => {
    const raw = [
      { className: 'a', probability: 0.2 },
      { className: 'b', probability: 0.7 },
      { className: 'c', probability: 0.1 },
    ];
    const ranked = rankPredictions(raw);
    expect(ranked.map((p) => p.className)).toEqual(['b', 'a', 'c']);
    expect(raw.map((p) => p.className)).toEqual(['a', 'b', 'c']);
  });

  it('keeps input order for ties', () => {
    const ranked = rankPredictions([
      { className: 'x', probability: 0.5 },
      { className: 'y', probability: 0.5 },
    ]);
    expect(ranked.map((p) => p.className)).toEqual(['x', 'y']);
  });

  it('handles empty input', () => {
    expect(rankPredictions([])).toEqual([]);
  });
});

describe('formatPercent', () => {
  it('formats with one decimal by default', () => {
    expect(formatPercent(0.4567)).toBe('45.7%');
    expect(formatPercent(1)).toBe('100.0%');
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('clamps out-of-range and non-finite values', () => {
    expect(formatPercent(1.2)).toBe('100.0%');
    expect(formatPercent(-0.1)).toBe('0.0%');
    expect(formatPercent(NaN)).toBe('0.0%');
  });

  it('respects the digits argument', () => {
    expect(formatPercent(0.12345, 0)).toBe('12%');
  });
});

describe('isUncertain', () => {
  it('flags a weak top result and empty lists', () => {
    expect(isUncertain([{ className: 'a', probability: 0.49 }])).toBe(true);
    expect(isUncertain([])).toBe(true);
  });

  it('does not flag a confident top result', () => {
    expect(isUncertain([{ className: 'a', probability: 0.5 }])).toBe(false);
    expect(isUncertain([{ className: 'a', probability: 0.9 }])).toBe(false);
  });
});
