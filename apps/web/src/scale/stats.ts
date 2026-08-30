// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure statistics for the scale harness (plan P4 step 9b) — kept in their own module, with NO three.js
 * import, so they can be unit-tested in plain Node like the rest of the suite (the harness itself pulls
 * in the WebGL renderer and is exercised only in a real browser).
 */

/**
 * The `p`-th percentile of `times` (linear interpolation between ranks). Median (p50) is the steady-state
 * frame time reported for axis (b); p95 catches the GC/upload hitches a user feels as jank.
 */
export function percentile(times: readonly number[], p: number): number {
  if (times.length === 0) return 0;
  const sorted = [...times].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (rank - lo);
}
