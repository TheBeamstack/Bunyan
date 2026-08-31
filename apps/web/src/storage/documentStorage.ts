// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * App-facing helpers over the `IndexedDbStore` (plan P4 step 5 / persistence) — the glue between the
 * document layer's `.bnn` codec + `Autosave` and the React shell.
 *
 * ⚠ OPEN IS RELOAD-BASED, ON PURPOSE. The shell is built around one `DocumentContext` handed over by
 * `bootstrap()`; swapping a freshly-loaded document into a running app in place would mean threading a
 * new doc, a new agent surface, and reset selection/version through the whole tree. Instead, opening a
 * file parks its store key in `sessionStorage` and reloads — the boot path then loads that document
 * instead of seeding the demo. It is robust and matches how a document switch actually works: a clean
 * boot over the chosen scene.
 *
 * ⚠⚠ SAVE PERSISTS THE JOURNAL (`doc.changeFeed()`), NEVER THE UNDO STACK (`doc.history()`). The latter
 * is capped and an undo pops entries out of it; persisting it is the moat-losing bug that makes the Clean
 * Delta uncomputable (`bnn.ts` / plan step 10). `saveDocument` below takes `changeFeed` + `revision`.
 */

import { loadBnn, type StorageAdapter } from '@bunyan/document';

import { IndexedDbStore } from './indexeddb';
import type { InitialDocument } from '../bootstrap';

export type { InitialDocument };

/** Where a chosen document's store key is parked for the reload-based open (see the file header). */
export const OPEN_KEY = 'bunyan:open';

/** The key prefix under which named user documents live (autosave snapshots use `autosave-*`). */
export const DOC_PREFIX = 'doc/';

/** The app's real store (the `bunyan` database). A fresh instance is cheap — it shares the connection. */
export function createStore(): IndexedDbStore {
  return new IndexedDbStore();
}

export function docKey(name: string): string {
  return `${DOC_PREFIX}${name}.bnn`;
}

export function docName(key: string): string {
  return key.slice(DOC_PREFIX.length).replace(/\.bnn$/, '');
}

/** The saved-document store keys (not autosave snapshots), name-sorted for a stable file list. */
export async function listDocKeys(store: StorageAdapter): Promise<readonly string[]> {
  const keys = await store.list();
  return keys
    .filter((k) => k.startsWith(DOC_PREFIX))
    .sort((a, b) => docName(a).localeCompare(docName(b)));
}

/** The newest autosave snapshot's key, or `undefined` if none — what a "recover?" offer would open. */
export function latestAutosaveKey(keys: readonly string[]): string | undefined {
  return keys
    .filter((k) => k.startsWith('autosave-'))
    .sort((a, b) => autosaveCounter(a) - autosaveCounter(b))
    .at(-1);
}

function autosaveCounter(key: string): number {
  return Number(/autosave-(\d+)/.exec(key)?.[1] ?? 0);
}

/** Read a stored `.bnn` and parse it into the `InitialDocument` the boot path rebuilds from. */
export async function readInitial(
  store: StorageAdapter,
  key: string,
): Promise<InitialDocument | undefined> {
  const bytes = await store.read(key);
  if (bytes === undefined) return undefined;
  const pkg = loadBnn(bytes);
  return { scene: pkg.scene, journal: pkg.journal, revision: pkg.manifest.revision };
}

/** Park a store key for the reload-based open (see the file header), then let the caller reload. */
export function requestOpen(key: string): void {
  sessionStorage.setItem(OPEN_KEY, key);
}

/**
 * Read and clear the parked open key.
 *
 * ⚠⚠ MEMOISED AT MODULE SCOPE, and that is the whole point. React StrictMode mounts the boot effect
 * TWICE (a discarded first mount, then the surviving one). A naive read-and-clear lets the DISCARDED
 * mount consume the key and clear it, so the surviving mount sees `null` and boots the demo instead of
 * the file — the exact StrictMode class the `window.bunyan` wiring was already bitten by (Entry 23).
 * Caching the taken value for the life of the page load makes both mounts read the SAME value, while
 * still being one-shot: a manual reload is a fresh page load (module re-evaluated), so `sessionStorage`
 * — now empty — is consulted again and the app returns to the demo/scratch.
 */
let takenOpenKey: string | null | undefined;
export function takeOpenRequest(): string | null {
  if (takenOpenKey === undefined) {
    takenOpenKey = sessionStorage.getItem(OPEN_KEY);
    if (takenOpenKey !== null) sessionStorage.removeItem(OPEN_KEY);
  }
  return takenOpenKey;
}
