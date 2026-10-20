// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R5 — the cache is trusted only from this install (`docs/design/P5_step9_D29_bnn_cache_design.md`
 * §2e, `D-20261012-05`: `own`). Pure: the MAC and `openCacheIndex` need no kernel. The real-OCCT
 * consequence — another install's file restores nothing — is `geometry-cache-restore-d29.test.ts`.
 *
 * REVERT-VERIFY: drop the `verifyCacheIndex` call in `openCacheIndex` and every "refuses" case below
 * goes red (recorded in the T-043 handoff).
 */

import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CACHE_SCHEME,
  hmacSha256Hex,
  newInstallSecret,
  openCacheIndex,
  signedCacheIndex,
} from '@bunyan/document';
import type { CacheEnvelope, CacheRecord, GeometryCacheReader } from '@bunyan/document';

const ENVELOPE: CacheEnvelope = {
  cache: CACHE_SCHEME,
  fingerprint: 'bnn1',
  kernelBuildId: 'occt-test',
  codeId: 'test-bundle',
};
const SECRET = new Uint8Array(32).fill(7);
const OTHER = new Uint8Array(32).fill(9);

const RECORDS: Record<string, CacheRecord> = {
  W1: {
    key: 'k1',
    root: {
      elementId: 'W1',
      parts: [
        {
          name: 'structure',
          materialId: 'concrete',
          discipline: 'structural',
          nodeId: 'n1',
          refs: ['n1#f0', 'n1#f1'],
          brep: { k: '0', refs: ['n1#f0', 'n1#f1'], fingerprint: 'fp' },
        },
      ],
    },
    voids: [],
  },
};

const reader = (index: Uint8Array): GeometryCacheReader => ({
  names: ['index.json'],
  read: (name) => (name === 'index.json' ? index : undefined),
  readMany: (names) => new Map([...names].flatMap((n) => (n === 'index.json' ? [[n, index]] : []))),
});

const open = (index: Uint8Array, installSecret = SECRET): unknown =>
  openCacheIndex({ files: reader(index), current: ENVELOPE, installSecret });

const parsed = (bytes: Uint8Array): { envelope: Record<string, unknown>; records: unknown } =>
  JSON.parse(new TextDecoder().decode(bytes)) as never;
const encode = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));

describe('D29 R5 — HMAC-SHA-256 is RFC 2104', () => {
  it.each([
    ['empty message', new Uint8Array(0), ''],
    ['RFC 4231 case 2', new TextEncoder().encode('Jefe'), 'what do ya want for nothing?'],
    ['a key longer than the block', new Uint8Array(131).fill(0xaa), 'x'.repeat(200)],
    ['a 64-byte key, multi-byte UTF-8', new Uint8Array(64).fill(3), 'مقدار — Ω ✓ 𝄞'],
    ['a message across block edges', SECRET, 'a'.repeat(119)],
  ])('%s matches node:crypto', (_, key, message) => {
    expect(hmacSha256Hex(key, message)).toBe(
      createHmac('sha256', key).update(message, 'utf8').digest('hex'),
    );
  });
});

describe('D29 R5 — the envelope carries a MAC keyed by this install, and nothing else restores', () => {
  it("restores this install's own index", () => {
    const bytes = signedCacheIndex(ENVELOPE, RECORDS, SECRET);
    expect(typeof parsed(bytes).envelope['mac']).toBe('string');
    expect(open(bytes)).toMatchObject({ records: RECORDS });
  });

  it('refuses an index another install signed', () => {
    expect(open(signedCacheIndex(ENVELOPE, RECORDS, OTHER))).toBeUndefined();
  });

  it('refuses an unsigned index (every cache written before R5)', () => {
    expect(open(encode({ envelope: ENVELOPE, records: RECORDS }))).toBeUndefined();
  });

  it('refuses a signed index whose record was edited afterwards (a billed material swapped)', () => {
    const index = parsed(signedCacheIndex(ENVELOPE, RECORDS, SECRET));
    const edited = structuredClone(index) as typeof index & {
      records: { W1: { root: { parts: { materialId: string }[] } } };
    };
    edited.records.W1.root.parts[0]!.materialId = 'glass';
    expect(open(encode(edited))).toBeUndefined();
  });

  it('refuses a signed index whose MAC was replaced by another', () => {
    const index = parsed(signedCacheIndex(ENVELOPE, RECORDS, SECRET));
    expect(open(encode({ ...index, envelope: { ...index.envelope, mac: '0'.repeat(64) } }))).toBe(
      undefined,
    );
  });

  it('a reformatted or key-reordered index still restores (the MAC is over canonical JSON)', () => {
    const index = parsed(signedCacheIndex(ENVELOPE, RECORDS, SECRET));
    const reordered = { records: index.records, envelope: index.envelope };
    const text = JSON.stringify(reordered, undefined, 2);
    expect(open(new TextEncoder().encode(text))).toMatchObject({ records: RECORDS });
  });

  it('newInstallSecret draws 32 fresh random bytes', () => {
    const a = newInstallSecret();
    expect(a).toHaveLength(32);
    expect(a).not.toEqual(newInstallSecret());
  });
});
