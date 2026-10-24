// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The open path's cache-index worker (T-061, T-063, design `P5_step9_D29_bnn_cache_design.md` §2e, §4): the
 * main thread posts the loaded `.bnn`'s bytes (cloned: the reader keeps them), and the worker inflates
 * `index.json` under the zip caps, checks the envelope and the MAC, and transfers back one buffer of
 * per-root record JSON, so a 16k open holds the main thread on no inflate, parse, HMAC pass or clone. The
 * install secret crosses to this same-origin worker with the bytes it verifies.
 *
 * ⚠ Imports only the leaves `@bunyan/document/cacheindexfile` and `@bunyan/document/cachesign`, so the
 * worker bundle carries no document code.
 */

import { openCacheIndexFile } from '@bunyan/document/cacheindexfile';
import type {
  CacheIndexOpenRequest,
  CacheIndexOpener,
  OpenedCacheRecords,
} from '@bunyan/document/cachesign';

export type { CacheIndexOpenRequest };

export interface CacheOpenReply {
  readonly index: OpenedCacheRecords | undefined;
}

/** The worker side: one request, one reply. */
export function handleCacheOpenRequest(request: CacheIndexOpenRequest): CacheOpenReply {
  return { index: openCacheIndexFile(request) };
}

/** What the worker transfers with a reply: the records' one buffer, never a copy of it. */
export function cacheOpenTransfer(reply: CacheOpenReply): ArrayBuffer[] {
  return reply.index === undefined ? [] : [reply.index.json.buffer as ArrayBuffer];
}

/** What the opener needs of a `Worker`, so a node test can stand in for one. */
export interface CacheOpenPort {
  postMessage(message: CacheIndexOpenRequest): void;
  addEventListener(type: 'message', listener: (event: { data: CacheOpenReply }) => void): void;
  addEventListener(type: 'error', listener: (event: { message?: string }) => void): void;
}

/**
 * The posting side, for one open per port (one document). A worker `error` resolves `undefined`: the
 * cache restores nothing and every root builds, as for a file this install did not sign.
 */
export function cacheIndexOpenerOn(port: CacheOpenPort): CacheIndexOpener {
  return (request) =>
    new Promise((resolve) => {
      port.addEventListener('message', ({ data }) => {
        resolve(data.index);
      });
      port.addEventListener('error', () => {
        resolve(undefined);
      });
      port.postMessage(request);
    });
}
