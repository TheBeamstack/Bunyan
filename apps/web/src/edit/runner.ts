/**
 * THE EDIT RUNNER — how the browser hot path dispatches a rapid stream of edits (a drag) without
 * corrupting the document or flooding the kernel.
 *
 * ⚠ WHY THIS EXISTS. `DocumentContext.execute` is async and mutates the scene + the WASM heap on
 * commit. Firing a fresh `execute` on every drag frame would run several of them concurrently, and two
 * commits interleaving their heap frees is a data race no amount of "reject + keep last-good" protects
 * against — that rule is about a command that FAILS, not two that succeed at once. So the UI must never
 * have more than one `execute` in flight for a given interaction.
 *
 * The pattern is *single-flight, trailing-latest*: while a task runs, newer tasks do not queue up —
 * each replaces the last, and only the most recent runs next. A 60-fps drag therefore collapses to
 * "run this frame, and when it finishes run whatever the latest frame is now" — the app-level analogue
 * of the kernel's own edit-coalescing (`coalesceKey`), and the reason a drag stays responsive without
 * a growing backlog of stale rebuilds. It is a debounce that drops intermediate frames rather than
 * delaying them, which is exactly what a live geometry preview wants.
 */

import { CommandFailure } from '@bunyan/document';
import type { ExecuteOptions, Params, UndoableEdit } from '@bunyan/document';

/**
 * How every UI surface reaches the document — the ONE door (D19). App owns the real implementation
 * (it wraps `doc.execute`, bumps a version to refresh derived state, and routes failures to the error
 * banner) and hands this narrow function down. A component never sees `DocumentContext`, never mind a
 * `KernelClient`. Returns the committed `UndoableEdit`, or `null` when the command was rejected or
 * superseded (App has already surfaced any real failure).
 */
export type Dispatch = (
  commandId: string,
  args: Params,
  options?: ExecuteOptions,
) => Promise<UndoableEdit | null>;

export interface LatestRunner {
  /** Schedule `task` as the latest work. If nothing is running, it starts now; otherwise it runs after
   *  the current task, REPLACING any other task scheduled in the meantime. */
  run(task: () => Promise<void>): void;
  /** True while a task is in flight — the property panel reads this to avoid clobbering a live drag. */
  readonly running: boolean;
}

/** @param onIdle Called each time the runner drains to empty — the moment it is safe to resync UI state. */
export function createLatestRunner(onIdle?: () => void): LatestRunner {
  let running = false;
  let pending: (() => Promise<void>) | null = null;

  const drain = async (): Promise<void> => {
    running = true;
    while (pending !== null) {
      const task = pending;
      pending = null;
      // Each task owns its own error handling (see `runCommand`); a throw here must not wedge the loop.
      try {
        await task();
      } catch {
        /* already reported by the task */
      }
    }
    running = false;
    onIdle?.();
  };

  return {
    run(task): void {
      pending = task;
      if (!running) void drain();
    },
    get running(): boolean {
      return running;
    },
  };
}

/**
 * The marker the kernel's FROZEN `SUPERSEDED` failure code leaves in a message. `KernelFailureError`
 * renders itself as `` `[${failure.code}] ${failure.message}` ``, so `[SUPERSEDED]` is the *code* in
 * brackets — it changes only if the frozen protocol code changes, NOT if someone rewords the human
 * sentence after it. Keying on this is strictly safer than the old `/superseded/i`, which matched the
 * English word "superseded" and so (a) broke the moment the message was reworded and (b) swallowed any
 * genuine geometry failure whose prose happened to contain that word.
 */
const SUPERSEDED_MARKER = /\[SUPERSEDED\]/;

/**
 * A rebuild that was SUPERSEDED by a newer edit on the same `coalesceKey` — the kernel settled the
 * in-flight op as `SUPERSEDED`. This is the EXPECTED outcome of an intermediate drag frame, not an
 * error: the newer frame is already on its way. The caller swallows it and keeps the last committed
 * geometry.
 *
 * ⚠⚠ STOPGAP — THE CLEAN FIX IS A DOCUMENT-LAYER CHANGE AND IT NEEDS ZAYD + OWNER SIGN-OFF (P4 step 11).
 * The kernel raises a TYPED `SUPERSEDED` code, but `DocumentContext` collapses every rebuild failure into
 * `GEOMETRY_FAILED` (`document.ts` — the message is `buildAssembly`'s `messageOf(kernelError)` concatenated
 * in), so the typed code is lost at the document boundary and can only be recovered from the string. The
 * proper fix preserves it across that boundary:
 *   1. `build.ts` — capture the originating `KernelFailureCode` on a failed `ElementGeometry`
 *      (`failureCode?`, beside the existing `error` string), read off `isKernelFailureError(error)`.
 *   2. `document.ts` `#stage` — carry it on `StagedRebuild.failure`.
 *   3. `commands.ts` — add a `SUPERSEDED` `CommandFailure` code (or a `cause?: KernelFailureCode`), and
 *      have `document.execute` emit it instead of folding it into `GEOMETRY_FAILED`.
 *   4. here — `error.code === 'SUPERSEDED'`, and delete this string match.
 * ⚠ `CommandFailure`'s code set is part of the document contract and FREEZES AT P5 — this is free now and
 * an amendment later, so it wants doing before the freeze. It is Zayd's package; do not land it solo.
 */
export function isSuperseded(error: unknown): boolean {
  return (
    error instanceof CommandFailure &&
    error.code === 'GEOMETRY_FAILED' &&
    SUPERSEDED_MARKER.test(error.message)
  );
}

/** A human-readable one-liner for the error banner — the typed details when we have them. */
export function formatError(error: unknown): string {
  if (error instanceof CommandFailure) {
    const detail = error.details.length > 0 ? ` (${error.details.join('; ')})` : '';
    return `${error.code}: ${error.message}${detail}`;
  }
  return error instanceof Error ? error.message : String(error);
}
