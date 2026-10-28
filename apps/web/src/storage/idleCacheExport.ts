// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R4 in the app (T-059, `docs/design/P5_step9_D29_bnn_cache_design.md` §5): built assemblies are
 * exported to the geometry cache in idle time, one per idle slot, so a named save only assembles what is
 * already exported (`DocumentContext.geometryCacheFiles`) and never pays `exportBrep`.
 *
 * ⚠ Each export runs under the doc lock (`edit/docLock.ts`): it reads the WASM heap an edit or lazy build
 * frees, so it never runs alongside one.
 */

import type { DocumentContext } from '@bunyan/document';

import type { DocLock } from '../edit/docLock';

/** Runs `task` once, in idle time; returns its cancel. Injected so a node test drives it by hand. */
export type IdleScheduler = (task: () => void) => () => void;

/** `requestIdleCallback` where the browser has it (Safari does not), else a short timer. */
export const browserIdleScheduler: IdleScheduler = (task) => {
  if (typeof requestIdleCallback === 'function') {
    const handle = requestIdleCallback(task, { timeout: 2000 });
    return () => {
      cancelIdleCallback(handle);
    };
  }
  const handle = setTimeout(task, 50);
  return () => {
    clearTimeout(handle);
  };
};

export interface IdleCacheExporter {
  /** A commit landed (an edit or a build): schedule idle runs until the export queue is empty. */
  kick(): void;
  dispose(): void;
}

export function createIdleCacheExporter(
  doc: Pick<DocumentContext, 'exportCacheIdle'>,
  lock: DocLock,
  schedule: IdleScheduler = browserIdleScheduler,
  onError: (error: unknown) => void = () => undefined,
): IdleCacheExporter {
  let cancel: (() => void) | undefined;
  let running = false;
  // A commit queued behind a running export lands after it counted the queue, so it must re-kick.
  let kickedWhileRunning = false;
  let disposed = false;

  const run = (): void => {
    cancel = undefined;
    running = true;
    lock
      .run(() => doc.exportCacheIdle(1))
      .then(
        (waiting) => {
          running = false;
          const again = waiting > 0 || kickedWhileRunning;
          kickedWhileRunning = false;
          if (again) kick();
        },
        (error: unknown) => {
          running = false;
          kickedWhileRunning = false;
          onError(error);
        },
      );
  };

  const kick = (): void => {
    if (disposed) return;
    if (running) {
      kickedWhileRunning = true;
      return;
    }
    cancel ??= schedule(run);
  };

  return {
    kick,
    dispose(): void {
      disposed = true;
      cancel?.();
      cancel = undefined;
    },
  };
}
