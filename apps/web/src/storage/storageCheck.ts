/**
 * BROWSER SELF-CHECK for the `IndexedDbStore` (plan P4 step 5 / persistence).
 *
 * ⚠ WHY THIS EXISTS. The `StorageAdapter` seam is unit-tested in `@bunyan/document` via `MemoryStore`,
 * but the REAL IndexedDB adapter is browser-only code the headless box cannot run — the same situation
 * as the scale harness. So its "test" is this: an asserting harness that runs the adapter + `Autosave`
 * contract against REAL IndexedDB in a real browser and reports pass/fail. It runs each check against a
 * FRESH, randomly-named database and deletes it after, so it never touches the app's real store.
 *
 * ⚠⚠ THE CHECK THAT MATTERS MOST is the cross-session `Autosave` one: a fresh `Autosave` over a store
 * that already holds snapshots must CONTINUE the ring (seed its counter from `list()`), not overwrite
 * from 1 — the "saved 9999, recovered 1300" data-loss bug (`bnn.ts`). It is exactly the case a
 * same-instance test cannot see, so it is the reason this harness drives a real store.
 */

import { Autosave, emptyScene, loadBnn, saveBnn } from '@bunyan/document';

import { IndexedDbStore } from './indexeddb';

export interface CheckResult {
  readonly name: string;
  readonly pass: boolean;
  readonly detail: string;
}

/** Run all storage checks against real IndexedDB; returns one result per assertion. */
export async function runStorageCheck(): Promise<readonly CheckResult[]> {
  const results: CheckResult[] = [];
  const record = (name: string, pass: boolean, detail: string): void => {
    results.push({ name, pass, detail });
  };

  if (!IndexedDbStore.available) {
    record('IndexedDB available', false, 'indexedDB is undefined in this environment');
    return results;
  }

  const dbName = `bunyan-selfcheck-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}`;
  try {
    const store = new IndexedDbStore(dbName);

    // 1) write → read round-trips the exact bytes.
    const payload = new Uint8Array([1, 2, 3, 250, 0, 128]);
    await store.write('a.bin', payload);
    const back = await store.read('a.bin');
    record(
      'write → read round-trips bytes',
      back !== undefined && sameBytes(back, payload),
      back === undefined ? 'read returned undefined' : `read ${String(back.length)} bytes`,
    );

    // 2) a missing key reads as undefined (not an error, not empty bytes).
    const missing = await store.read('nope.bin');
    record('missing key → undefined', missing === undefined, `got ${describe(missing)}`);

    // 3) ⚠ list() returns EVERY written key — the property Autosave's counter-seed depends on.
    await store.write('b.bin', new Uint8Array([9]));
    const keys = await store.list();
    const listOk = keys.includes('a.bin') && keys.includes('b.bin');
    record('list() returns all written keys', listOk, `[${keys.join(', ')}]`);

    // 4) remove deletes, and list() reflects it.
    await store.remove('b.bin');
    const afterRemove = await store.list();
    record(
      'remove deletes the key',
      !afterRemove.includes('b.bin') && afterRemove.includes('a.bin'),
      `[${afterRemove.join(', ')}]`,
    );

    // 5) a real .bnn round-trips through the store byte-for-byte and re-parses.
    const bytes = saveBnn(emptyScene(), { kernelBuildId: 'selfcheck' });
    await store.write('doc/empty.bnn', bytes);
    const loadedBytes = await store.read('doc/empty.bnn');
    let bnnOk = loadedBytes !== undefined && sameBytes(loadedBytes, bytes);
    let bnnDetail = `${String(bytes.length)} bytes`;
    if (bnnOk && loadedBytes !== undefined) {
      const pkg = loadBnn(loadedBytes);
      bnnOk = pkg.manifest.app === 'bunyan' && typeof pkg.scene.elements === 'object';
      bnnDetail = `re-parsed app=${pkg.manifest.app}`;
    }
    record('.bnn round-trips through the store', bnnOk, bnnDetail);

    // 6) ⚠⚠ CROSS-SESSION AUTOSAVE — the data-loss gotcha. Session A writes 3 snapshots; a FRESH
    //    Autosave (session B) over the SAME store must write autosave-4, not autosave-1.
    const sessionA = new Autosave(store, 5);
    await sessionA.snapshot(tagBytes(1));
    await sessionA.snapshot(tagBytes(2));
    const keyA3 = await sessionA.snapshot(tagBytes(3));
    const sessionB = new Autosave(store, 5); // a fresh session over the existing store
    const keyB = await sessionB.snapshot(tagBytes(4));
    const continued = keyA3 === 'autosave-3.bnn' && keyB === 'autosave-4.bnn';
    record(
      'a fresh Autosave CONTINUES the ring (no stale overwrite)',
      continued,
      `A's 3rd=${keyA3}, B's 1st=${keyB}`,
    );

    // 7) latest() from the fresh session returns the NEWEST snapshot (session B's), not a stale one.
    const latest = await sessionB.latest();
    const latestOk = latest !== undefined && latest[0] === 4;
    record(
      'latest() returns the newest snapshot across sessions',
      latestOk,
      latest === undefined ? 'undefined' : `tag=${String(latest[0])}`,
    );

    // 8) the ring prunes to its depth, keeping the newest.
    const ring = new IndexedDbStore(`${dbName}-ring`);
    try {
      const capped = new Autosave(ring, 2);
      for (let i = 1; i <= 5; i++) await capped.snapshot(tagBytes(i));
      const ringKeys = (await ring.list()).filter((k) => k.startsWith('autosave-'));
      const newest = await capped.latest();
      record(
        'the autosave ring prunes to its depth (keeps newest)',
        ringKeys.length === 2 && newest !== undefined && newest[0] === 5,
        `${String(ringKeys.length)} kept, newest tag=${newest ? String(newest[0]) : '—'}`,
      );
    } finally {
      await deleteDatabase(`${dbName}-ring`);
    }
  } catch (error) {
    record(
      'harness ran without throwing',
      false,
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await deleteDatabase(dbName);
  }

  return results;
}

/** A snapshot whose first byte tags which snapshot it is, so `latest()` is checkable by value. */
function tagBytes(tag: number): Uint8Array {
  return new Uint8Array([tag, 0, 0, 0]);
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function describe(value: Uint8Array | undefined): string {
  return value === undefined ? 'undefined' : `${String(value.length)} bytes`;
}

/** Drop the throwaway database so the self-check leaves nothing behind. */
function deleteDatabase(name: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = (): void => {
      resolve();
    };
    // A failed/blocked cleanup is not worth failing the checks over — the db is throwaway either way.
    req.onerror = (): void => {
      resolve();
    };
    req.onblocked = (): void => {
      resolve();
    };
  });
}
