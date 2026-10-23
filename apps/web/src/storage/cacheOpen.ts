// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The open path's cache-index worker (T-061, design `P5_step9_D29_bnn_cache_design.md` §2e, §4): the main
 * thread posts the stored `index.json` bytes, and the worker parses them and checks the envelope and the
 * MAC, so a 16k open does not hold the main thread on the ~2 s HMAC pass. The install secret crosses to this
 * same-origin worker with the bytes it verifies.
 *
 * ⚠ Imports only the leaf `@bunyan/document/cachesign`, so the worker bundle carries no document code.
 */

import {
  openSignedCacheIndex,
  type CacheIndexOpenRequest,
  type CacheIndexOpener,
  type OpenedCacheIndex,
} from '@bunyan/document/cachesign';

export type { CacheIndexOpenRequest };

export interface CacheOpenReply {
  readonly index: OpenedCacheIndex | undefined;
}

/** The worker side: one request, one reply. */
export function handleCacheOpenRequest(request: CacheIndexOpenRequest): CacheOpenReply {
  return { index: openSignedCacheIndex(request.bytes, request.current, request.secret) };
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
