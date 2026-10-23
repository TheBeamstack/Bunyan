// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/** The cache-open worker's entry (T-061): `handleCacheOpenRequest` per message. */

import { handleCacheOpenRequest, type CacheIndexOpenRequest } from './cacheOpen';

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.addEventListener('message', (event: MessageEvent<CacheIndexOpenRequest>) => {
  scope.postMessage(handleCacheOpenRequest(event.data));
});
