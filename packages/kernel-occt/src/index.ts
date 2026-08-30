// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

export {
  OCCT_BUILD_ID,
  OCCT_KERNEL_META,
  createOcctKernel,
  createOcctKernelHost,
} from './kernel.js';
export type { OcctKernel } from './kernel.js';

/**
 * THE GEOMETRY CACHE'S VERIFICATION HALF (D29). Exported so the D29 suite can check the digest against
 * `node:crypto` and drive the untrusted-input bound directly — the two things that must be verified
 * rather than trusted, and neither is reachable through an op.
 */
export {
  FINGERPRINT_SCHEME,
  MAX_BREP_BYTES,
  decodeBrepBytes,
  fingerprintOf,
  parseSignature,
  refsInShapeOrder,
  sha256Hex,
} from './cache.js';
export type { ShapeSignature, SignatureRow } from './cache.js';
