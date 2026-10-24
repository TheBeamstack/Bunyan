// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/** The cache-open worker's entry (T-061, T-063): `handleCacheOpenRequest` per message, its buffer transferred. */

import { cacheOpenTransfer, handleCacheOpenRequest, type CacheIndexOpenRequest } from './cacheOpen';

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.addEventListener('message', (event: MessageEvent<CacheIndexOpenRequest>) => {
  const reply = handleCacheOpenRequest(event.data);
  scope.postMessage(reply, cacheOpenTransfer(reply));
});
