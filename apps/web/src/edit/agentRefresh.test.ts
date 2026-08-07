/**
 * THE UI-REFRESH GAP, CLOSED AND PINNED (P4 — the D19 equivalence work). Entry 26 found that an agent edit
 * through `window.bunyan.execute` mutated the document but did NOT refresh the React view, because it
 * bypassed the version bump the human path does. `withUiRefresh` funnels the agent surface's mutators
 * through the same `notify`. This proves it: mutators refresh, reads do not, a rejection does not, and the
 * underlying edit passes through untouched (so the two surfaces stay observably equivalent).
 */

import { describe, it, expect, vi } from 'vitest';
import type { AgentSurface, UndoableEdit } from '@bunyan/document';
import { withUiRefresh } from './agentRefresh';

const EDIT = { command: 'core.createElement', changes: [] } as unknown as UndoableEdit;

/** A fake agent surface that records which verb was called; only the shape the wrapper touches is real. */
function fakeSurface(overrides: Partial<AgentSurface> = {}): {
  agent: AgentSurface;
  calls: string[];
} {
  const calls: string[] = [];
  const record = (name: string) => (): Promise<UndoableEdit> => {
    calls.push(name);
    return Promise.resolve(EDIT);
  };
  const agent = {
    agentApi: 1,
    execute: record('execute'),
    undo: record('undo'),
    redo: record('redo'),
    dryRun: record('dryRun'),
    query: () => {
      calls.push('query');
      return [];
    },
    ...overrides,
  } as unknown as AgentSurface;
  return { agent, calls };
}

describe('withUiRefresh — an agent edit refreshes the view like a human edit (Entry 26 gap)', () => {
  it('notifies after each state-mutating verb, and passes the edit through unchanged', async () => {
    const notify = vi.fn();
    const { agent } = fakeSurface();
    const wrapped = withUiRefresh(agent, notify);

    expect(await wrapped.execute('core.createElement', {})).toBe(EDIT);
    expect(await wrapped.undo()).toBe(EDIT);
    expect(await wrapped.redo()).toBe(EDIT);

    expect(notify).toHaveBeenCalledTimes(3);
  });

  it('does NOT notify on read-only verbs — dryRun and query change nothing', async () => {
    const notify = vi.fn();
    const { agent } = fakeSurface();
    const wrapped = withUiRefresh(agent, notify);

    await wrapped.dryRun('core.deleteElement', { elementId: 'wall-1' });
    wrapped.query();

    expect(notify).not.toHaveBeenCalled();
  });

  it('does NOT notify when execute rejects — reject + keep-last-good means nothing changed', async () => {
    const notify = vi.fn();
    const boom = new Error('the kernel refused');
    const { agent } = fakeSurface({
      execute: () => Promise.reject(boom),
    });
    const wrapped = withUiRefresh(agent, notify);

    await expect(wrapped.execute('core.setParams', {})).rejects.toBe(boom);
    expect(notify).not.toHaveBeenCalled();
  });

  it('preserves the rest of the surface (agentApi and read verbs still reachable)', () => {
    const { agent } = fakeSurface();
    const wrapped = withUiRefresh(agent, () => {});
    expect(wrapped.agentApi).toBe(1);
    expect(typeof wrapped.query).toBe('function');
  });

  /**
   * ⚠⚠ THE TRANSPARENCY TEST — Entry 86, and it is the one that was missing.
   *
   * Every test above asserts what the wrapper ADDS (a notify). None asserted what it must not TAKE AWAY,
   * and it was taking away the third argument: `execute` was declared `(command, args)`, so
   * `transactionId` never reached the document and D23's corner-drag silently undid one edit at a time.
   * A pass-through wrapper's contract is that it is invisible, and the only way to hold it to that is to
   * assert the arguments arrive.
   */
  it('⚠⚠ FORWARDS options to execute — a dropped `transactionId` breaks D23 and nothing errors', async () => {
    const seen: unknown[][] = [];
    const { agent } = fakeSurface({
      execute: (...args: unknown[]) => {
        seen.push(args);
        return Promise.resolve(EDIT);
      },
    });
    const wrapped = withUiRefresh(agent, () => {});

    await wrapped.execute(
      'core.setParams',
      { elementId: 'wall-1' },
      { transactionId: 'gesture-7' },
    );

    expect(seen).toHaveLength(1);
    expect(seen[0]?.[0]).toBe('core.setParams');
    expect(seen[0]?.[1]).toEqual({ elementId: 'wall-1' });
    // ⚠ The whole finding, in one assertion.
    expect(seen[0]?.[2]).toEqual({ transactionId: 'gesture-7' });
  });

  it('⚠ …and forwards an ABSENT options unchanged, rather than inventing an empty one', async () => {
    const seen: unknown[][] = [];
    const { agent } = fakeSurface({
      execute: (...args: unknown[]) => {
        seen.push(args);
        return Promise.resolve(EDIT);
      },
    });
    const wrapped = withUiRefresh(agent, () => {});

    await wrapped.execute('core.setParams', {});
    expect(seen[0]?.[2]).toBeUndefined();
  });
});
