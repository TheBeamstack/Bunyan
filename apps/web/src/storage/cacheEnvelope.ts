// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

import { CACHE_SCHEME, type CacheEnvelope } from '@bunyan/document';
import { FINGERPRINT_SCHEME } from '@bunyan/kernel-occt';
import { CODE_ID } from '../codeId.js';

/** The running build's D29 envelope (§2a): what a cache must have been written by to restore here. */
export function cacheEnvelope(kernelBuildId: string): CacheEnvelope {
  return { cache: CACHE_SCHEME, fingerprint: FINGERPRINT_SCHEME, kernelBuildId, codeId: CODE_ID };
}
