/**
 * Unit test for the scale harness's pure percentile helper (plan P4 step 9b). The harness's frame-time
 * number (axis b) is a percentile over per-frame durations, so the percentile itself must be correct —
 * a wrong median would mis-price the whole axis. The rest of the harness is a WebGL measurement exercised
 * in a real browser; this is the one piece that is pure and therefore gated in `pnpm verify`.
 */

import { describe, expect, it } from 'vitest';

import { percentile } from './stats';

describe('percentile — the frame-time statistic', () => {
  it('returns 0 for an empty sample (no frames measured yet)', () => {
    expect(percentile([], 50)).toBe(0);
  });

  it('is order-independent — it sorts internally', () => {
    expect(percentile([9, 1, 5, 3, 7], 50)).toBe(5);
    expect(percentile([7, 3, 5, 1, 9], 50)).toBe(5);
  });

  it('p0 is the min and p100 is the max', () => {
    const times = [12.5, 4.0, 8.25, 16.0, 6.0];
    expect(percentile(times, 0)).toBe(4.0);
    expect(percentile(times, 100)).toBe(16.0);
  });

  it('interpolates linearly between ranks (even-length median)', () => {
    // Sorted [10, 20, 30, 40]; p50 rank = 0.5·3 = 1.5 ⇒ halfway between 20 and 30 = 25.
    expect(percentile([40, 10, 30, 20], 50)).toBe(25);
  });

  it('computes a p95 that lands inside the sample range', () => {
    const times = Array.from({ length: 100 }, (_, i) => i + 1); // 1..100
    const p95 = percentile(times, 95);
    // Rank = 0.95·99 = 94.05 ⇒ between the 95th (95) and 96th (96) value.
    expect(p95).toBeCloseTo(95.05, 5);
  });

  it('a single sample is its own every percentile', () => {
    expect(percentile([13.37], 50)).toBe(13.37);
    expect(percentile([13.37], 95)).toBe(13.37);
  });
});
