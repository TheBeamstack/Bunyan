// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R5 — WHOSE CACHE IS TRUSTED (`docs/design/P5_step9_D29_bnn_cache_design.md` §2e, `D-20261012-05`:
 * `own`). The fingerprint is a public SHA-256, so any author can write a solid the recipe would not build
 * with a fingerprint and input key that verify. The envelope therefore carries an HMAC, keyed by a secret
 * only this install holds, over the envelope and every record; a file this install did not write — or one
 * edited after it wrote it — restores nothing and is built from the recipe.
 *
 * The records name each `.brep`'s fingerprint, which `importBrep` checks, so the MAC over the index
 * covers the solids too. Where the secret is kept (browser storage) is the caller's: this layer has none.
 * Signing, and the MAC itself, are the leaf `cachesign.ts` (T-060), so the zip worker can sign.
 */

import type { CacheEnvelope } from './cachesign.js';
import { cacheIndexMac } from './cachesign.js';

/** The envelope as `index.json` stores it: the writer's four fields plus its install's MAC. */
export type SignedCacheEnvelope = CacheEnvelope & { readonly mac: string };

/** A fresh per-install secret: 32 bytes from the platform CSPRNG. */
export function newInstallSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/** Whether a parsed index carries the MAC `secret` gives it — i.e. this install wrote it, unedited. */
export function verifyCacheIndex(
  envelope: Record<string, unknown>,
  records: unknown,
  secret: Uint8Array,
): boolean {
  const mac = envelope['mac'];
  if (typeof mac !== 'string') return false;
  return mac === cacheIndexMac(envelope as unknown as CacheEnvelope, records, secret);
}

/** Same secret, byte for byte: a carried record is re-signed only by the install that verified it. */
export function sameInstallSecret(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
