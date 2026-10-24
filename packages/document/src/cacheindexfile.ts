// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The cache-open worker's whole job (T-063, design `P5_step9_D29_bnn_cache_design.md` §2e, §3, §4): from the
 * posted `.bnn` bytes, check the caps for `index.json`, inflate it, open it (envelope and MAC), and return
 * its records as one buffer of per-root JSON, so the main thread runs no inflate, no whole-index parse and
 * no object-graph clone.
 *
 * ⚠ A leaf: it imports `fflate`, `bnncaps.ts` and `cachesign.ts`, none of which imports scene, joins or
 * document code.
 */

import { unzipSync } from 'fflate';
import { checkCaps } from './bnncaps.js';
import {
  CACHE_INDEX_ENTRY,
  openSignedCacheIndex,
  serializeCacheRecords,
  type CacheIndexOpenRequest,
  type OpenedCacheRecords,
} from './cachesign.js';

/** `undefined` for a file without an index, one past a cap, or an index this build or install refuses. */
export function openCacheIndexFile(request: CacheIndexOpenRequest): OpenedCacheRecords | undefined {
  let bytes: Uint8Array | undefined;
  try {
    // The same caps `loadBnn` checks, on the one entry inflated here, before fflate allocates for it.
    checkCaps(request.file, (name) => name === CACHE_INDEX_ENTRY);
    bytes = unzipSync(request.file, { filter: (file) => file.name === CACHE_INDEX_ENTRY })[
      CACHE_INDEX_ENTRY
    ];
  } catch {
    return undefined;
  }
  if (bytes === undefined) return undefined;
  const opened = openSignedCacheIndex(bytes, request.current, request.secret);
  return opened === undefined ? undefined : serializeCacheRecords(opened);
}
