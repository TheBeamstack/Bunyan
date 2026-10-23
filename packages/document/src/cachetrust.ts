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
 */

import type { CacheEnvelope } from './cachekey.js';
import { canonicalJson, sha256, toHex } from './cachekey.js';
import type { CacheRecord } from './cacherestore.js';
import type { ElementId } from './entities.js';

/** The envelope as `index.json` stores it: the writer's four fields plus its install's MAC. */
export type SignedCacheEnvelope = CacheEnvelope & { readonly mac: string };

const BLOCK = 64;
const encoder = new TextEncoder();

/** HMAC-SHA-256 (RFC 2104) over the UTF-8 of `message`, on the in-house `sha256` (no async `subtle`). */
export function hmacSha256Hex(key: Uint8Array, message: string): string {
  const k = new Uint8Array(BLOCK);
  k.set(key.length > BLOCK ? sha256(key) : key);
  const inner = k.map((b) => b ^ 0x36);
  const outer = k.map((b) => b ^ 0x5c);
  return toHex(sha256(outer, sha256(inner, encoder.encode(message))));
}

/** A fresh per-install secret: 32 bytes from the platform CSPRNG. */
export function newInstallSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * The MAC of an index. Only the four envelope fields are covered, by name, so a stored `mac` (or any
 * field a later scheme adds) never feeds itself; canonical JSON, so a reformatted index keeps its MAC.
 */
function cacheIndexMac(envelope: CacheEnvelope, records: unknown, secret: Uint8Array): string {
  const { cache, fingerprint, kernelBuildId, codeId } = envelope;
  return hmacSha256Hex(
    secret,
    canonicalJson({ envelope: { cache, fingerprint, kernelBuildId, codeId }, records }),
  );
}

/** `geometry-cache/index.json`'s bytes, its envelope carrying this install's MAC. */
export function signedCacheIndex(
  envelope: CacheEnvelope,
  records: Readonly<Record<ElementId, CacheRecord>>,
  secret: Uint8Array,
): Uint8Array {
  const { cache, fingerprint, kernelBuildId, codeId } = envelope;
  const mac = cacheIndexMac(envelope, records, secret);
  return encoder.encode(
    JSON.stringify({ envelope: { cache, fingerprint, kernelBuildId, codeId, mac }, records }),
  );
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
