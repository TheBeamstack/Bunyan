// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The `.bnn` zip step (T-056, design `P5_step9_D29_bnn_cache_design.md` §5): `saveBnn` is
 * `zipBnnEntries(assembleBnnEntries(...))`, and a worker can run this half on entries posted to it.
 *
 * ⚠ It imports only `fflate`, so a worker bundle that imports this file directly carries no document code.
 * fflate's async `zip()` still deflates entries under 160,000 B on the calling thread (fflate 0.8.3), so
 * the off-thread save needs a dedicated worker, not the async API.
 */

import { zipSync } from 'fflate';

/** A `.bnn`'s entries by zip path, as `assembleBnnEntries` returns them. Survives `structuredClone`. */
export type BnnEntries = Readonly<Record<string, Uint8Array>>;

/** Every zip entry's timestamp: the earliest DOS date, in local time (see `zipBnnEntries`). */
const BNN_ZIP_MTIME = new Date(1980, 0, 1);

/** The zip step, and the worker-side handler: equal entries give bytes equal to `saveBnn`. */
export function zipBnnEntries(entries: BnnEntries): Uint8Array {
  // ⚠ One constant `mtime` (T-047, spec §6.5): fflate otherwise stamps `Date.now()` into every header, so
  // two saves of one scene differ by the clock. A local-time date, since fflate 0.8.3 encodes the local
  // year and throws below 1980.
  return zipSync(entries, { level: 6, mtime: BNN_ZIP_MTIME });
}
