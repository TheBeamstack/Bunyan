/**
 * Unit test for the PURE helpers in `documentStorage` (plan P4 step 5 / persistence). The IndexedDB
 * adapter itself is browser-only (verified by the `storage-check` page), but the key derivation and the
 * recover-key selection are pure and must be correct headlessly — a wrong `latestAutosaveKey` offers the
 * user the wrong snapshot to recover, the failure mode `Autosave` exists to prevent.
 */

import { describe, expect, it } from 'vitest';

import { docKey, docName, latestAutosaveKey } from './documentStorage';

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
