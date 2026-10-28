// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Unit test for the PURE helpers in `documentStorage` (plan P4 step 5 / persistence). The IndexedDB
 * adapter itself is browser-only (verified by the `storage-check` page), but the key derivation and the
 * recover-key selection are pure and must be correct headlessly — a wrong `latestAutosaveKey` offers the
 * user the wrong snapshot to recover, the failure mode `Autosave` exists to prevent.
 */

import { describe, expect, it } from 'vitest';
import { Autosave, MemoryStore, emptyScene } from '@bunyan/document';

import {
  INSTALL_SECRET_KEY,
  docKey,
  docName,
  installSecret,
  latestAutosaveKey,
  listDocKeys,
} from './documentStorage';

describe('T-057 — the per-install cache secret (D29 R5)', () => {
  it('returns the same 32 bytes on a second call and writes exactly one key', async () => {
    const store = new MemoryStore();
    const first = await installSecret(store);
    expect(first).toHaveLength(32);
    expect(await store.list()).toEqual([INSTALL_SECRET_KEY]);
    expect(await installSecret(store)).toEqual(first);
    expect(await store.list()).toEqual([INSTALL_SECRET_KEY]);
  });

  it('is counted by no file list, recover offer or autosave ring', async () => {
    const store = new MemoryStore();
    await installSecret(store);
    await store.write(docKey('house'), new Uint8Array([1]));
    const ring = new Autosave(store, 2);
    for (let i = 0; i < 3; i++) {
      await ring.snapshotScene(emptyScene(), { kernelBuildId: 'test' });
    }
    const keys = await store.list();
    expect(await listDocKeys(store)).toEqual(['doc/house.bnn']);
    expect(latestAutosaveKey(keys)).toBe('autosave-3.bnn');
    expect(keys.filter((k) => k.startsWith('autosave-')).sort()).toEqual([
      'autosave-2.bnn',
      'autosave-3.bnn',
    ]);
    expect(keys, 'the ring never prunes the secret').toContain(INSTALL_SECRET_KEY);
  });
});

describe('document key derivation', () => {
  it('wraps a name into a doc/ key and back', () => {
    expect(docKey('house-a')).toBe('doc/house-a.bnn');
    expect(docName('doc/house-a.bnn')).toBe('house-a');
  });

  it('round-trips a name through key → name', () => {
    for (const name of ['a', 'my building', 'v2.final']) {
      expect(docName(docKey(name))).toBe(name);
    }
  });
});

describe('latestAutosaveKey — which snapshot "recover" offers', () => {
  it('returns undefined when there are no autosave snapshots', () => {
    expect(latestAutosaveKey([])).toBeUndefined();
    expect(latestAutosaveKey(['doc/a.bnn', 'doc/b.bnn'])).toBeUndefined();
  });

  it('⚠ picks the highest counter NUMERICALLY, not lexically (autosave-10 > autosave-2)', () => {
    // Lexical max here would be 'autosave-9.bnn' — the exact off-by-a-lot bug that recovers stale work.
    const keys = ['autosave-2.bnn', 'autosave-9.bnn', 'autosave-10.bnn', 'doc/house.bnn'];
    expect(latestAutosaveKey(keys)).toBe('autosave-10.bnn');
  });

  it('ignores non-autosave keys entirely', () => {
    expect(latestAutosaveKey(['doc/x.bnn', 'autosave-1.bnn', 'doc/autosave-fake.bnn'])).toBe(
      'autosave-1.bnn',
    );
  });
});
