/**
 * The first test that lives inside `apps/web` — its existence is half of P4 step 0's point: before the
 * gate could see this directory, a test here could not run at all (`vitest.config.ts` collected only
 * `tests/**`; review_P4.md §2). It covers `createLatestRunner`, the single-flight / trailing-latest
 * discipline the drag path depends on, which is pure logic and runs in plain Node like the rest of the
 * suite. Imports come from `vitest` explicitly because `apps/web/tsconfig.json` does not register the
 * vitest globals the root config does.
 */

import { describe, it, expect } from 'vitest';
import { CommandFailure } from '@bunyan/document';
import { createLatestRunner, isSuperseded } from './runner';

/** A promise whose resolution we drive by hand, so a test can hold a task "in flight". */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('createLatestRunner (single-flight, trailing-latest)', () => {
  it('starts the first task immediately and reports running until it drains', async () => {
    const runner = createLatestRunner();
    expect(runner.running).toBe(false);

    const task = deferred();
    runner.run(() => task.promise);
    expect(runner.running).toBe(true);

    task.resolve();
    await task.promise;
    // Let the drain loop settle after the awaited task resolves.
    await Promise.resolve();
    expect(runner.running).toBe(false);
  });

  it('drops intermediate work, keeping only the latest task scheduled while busy', async () => {
    const order: string[] = [];
    const idle = deferred();
    const runner = createLatestRunner(() => {
      idle.resolve();
    });

    const first = deferred();
    // A begins immediately and blocks; while it is in flight we queue B then C.
    runner.run(async () => {
      order.push('A-start');
      await first.promise;
      order.push('A-end');
    });
    runner.run(() => {
      order.push('B');
      return Promise.resolve();
    });
    runner.run(() => {
      order.push('C');
      return Promise.resolve();
    });

    expect(runner.running).toBe(true);
    first.resolve();
    await idle.promise;

    // B was replaced by C before A finished — a 60-fps drag collapses to first-frame + latest-frame.
    expect(order).toEqual(['A-start', 'A-end', 'C']);
    expect(runner.running).toBe(false);
  });

  it('calls onIdle once per drain, and a burst after idle starts a fresh drain', async () => {
    let idles = 0;
    let signal = deferred();
    const runner = createLatestRunner(() => {
      idles += 1;
      signal.resolve();
    });

    runner.run(() => Promise.resolve());
    await signal.promise;
    expect(idles).toBe(1);

    signal = deferred();
    runner.run(() => Promise.resolve());
    await signal.promise;
    expect(idles).toBe(2);
  });
});

describe('isSuperseded — keys on the FROZEN [SUPERSEDED] code marker, not English prose (step 11)', () => {
  // How a superseded drag frame actually arrives: DocumentContext folds the kernel's typed SUPERSEDED
  // into GEOMETRY_FAILED, concatenating the KernelFailureError message — which begins `[SUPERSEDED]`
  // because that class renders `[${code}] ${message}`.
  const supersededFrame = new CommandFailure(
    'GEOMETRY_FAILED',
    '"core.setParams" was rejected: element "wall-1" — [SUPERSEDED] Superseded by a newer edit on "rebuild:wall-1"',
    ['wall-1'],
  );

  it('recognises a superseded drag frame', () => {
    expect(isSuperseded(supersededFrame)).toBe(true);
  });

  it('is robust to the human message being reworded — the [SUPERSEDED] code marker still carries', () => {
    const reworded = new CommandFailure(
      'GEOMETRY_FAILED',
      'element "wall-1" — [SUPERSEDED] Replaced by a fresher edit', // prose changed; code marker intact
      ['wall-1'],
    );
    expect(isSuperseded(reworded)).toBe(true);
  });

  it('does NOT swallow a genuine geometry failure whose prose merely contains the word "superseded"', () => {
    // This is the false positive the old /superseded/i regex allowed — a real refusal, silenced.
    const genuine = new CommandFailure(
      'GEOMETRY_FAILED',
      'element "wall-1" — the fillet radius superseded the edge length and the kernel refused',
      ['wall-1'],
    );
    expect(isSuperseded(genuine)).toBe(false);
  });

  it('is false for a different code, and for a non-CommandFailure', () => {
    expect(isSuperseded(new CommandFailure('REFUSED', '[SUPERSEDED] wrong code', []))).toBe(false);
    expect(isSuperseded(new Error('[SUPERSEDED] not a CommandFailure'))).toBe(false);
    expect(isSuperseded(null)).toBe(false);
  });
});
