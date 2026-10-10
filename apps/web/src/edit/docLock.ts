// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ONE WRITER AT A TIME ON THE DOCUMENT. Both an edit and a lazy build (D66 §3b, T-006) commit into the
 * scene and the WASM heap, and two commits interleaving their heap frees is the data race
 * `runner.ts` exists to prevent among edits. Lazy build adds a second writer that is not an edit, so
 * the two are serialised here: every task runs after the previous one settles, in call order.
 */

export interface DocLock {
  run<T>(task: () => Promise<T>): Promise<T>;
}

export function createDocLock(): DocLock {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    run<T>(task: () => Promise<T>): Promise<T> {
      const result = tail.then(task, task);
      tail = result.catch(() => undefined);
      return result;
    },
  };
}
