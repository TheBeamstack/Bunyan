/**
 * Tool state machine tests (P4.5 §2) — and what they actually assert is DOMAIN RULE 19: a tool collects
 * input, only a command changes the model, and an in-progress interaction is not model state.
 *
 * ⚠ The last clause is the one worth testing, because it is the one a future change would break by
 * accident. A session is a plain value; a commit is a DESCRIPTION of one command. If either ever grows a
 * reference to the document, these tests still pass — so the structural check ("a commit is data, and
 * exactly one") is asserted explicitly rather than left to the shape.
 */

import { describe, expect, it } from 'vitest';

import type { Vec3 } from '@bunyan/protocol';
import {
  acceptInput,
  anchorOf,
  beginSession,
  commitOf,
  currentInput,
  isComplete,
  type Tool,
} from './toolMachine';
import { SELECT_TOOL, WALL_TOOL, toolById } from './tools';

const A: Vec3 = [0, 0, 0];
const B: Vec3 = [4000, 0, 0];

describe('the collection sequence', () => {
  it('walks its declared inputs in order and completes on the last one', () => {
    let session = beginSession(WALL_TOOL);
    expect(currentInput(WALL_TOOL, session)?.prompt).toMatch(/start/i);
    expect(isComplete(WALL_TOOL, session)).toBe(false);

    const first = acceptInput(WALL_TOOL, session, A);
    expect(first.complete).toBe(false);
    session = first.session;
    expect(currentInput(WALL_TOOL, session)?.prompt).toMatch(/end/i);

    const second = acceptInput(WALL_TOOL, session, B);
    expect(second.complete).toBe(true);
    expect(currentInput(WALL_TOOL, second.session)).toBeNull();
  });

  it('⚠ IGNORES a point offered to an already-complete session — a 2-point wall never becomes 3', () => {
    const done = acceptInput(
      WALL_TOOL,
      acceptInput(WALL_TOOL, beginSession(WALL_TOOL), A).session,
      B,
    ).session;
    const extra = acceptInput(WALL_TOOL, done, [9999, 9999, 0]);
    expect(extra.session.collected).toHaveLength(2);
    expect(extra.session.collected).toEqual([A, B]);
  });

  it('is immutable — accepting an input never mutates the session it was given', () => {
    const start = beginSession(WALL_TOOL);
    acceptInput(WALL_TOOL, start, A);
    expect(start.collected).toEqual([]);
  });

  it('the anchor is the last point collected — what a rubber band draws FROM', () => {
    expect(anchorOf(beginSession(WALL_TOOL))).toBeNull();
    expect(anchorOf(acceptInput(WALL_TOOL, beginSession(WALL_TOOL), A).session)).toEqual(A);
  });
});

describe('commit — exactly one command, and it is a DESCRIPTION (rule 19)', () => {
  it('an incomplete session commits NOTHING', () => {
    expect(commitOf(WALL_TOOL, beginSession(WALL_TOOL))).toBeNull();
    expect(
      commitOf(WALL_TOOL, acceptInput(WALL_TOOL, beginSession(WALL_TOOL), A).session),
    ).toBeNull();
  });

  it('a complete wall gesture becomes ONE core.createElement carrying the D52 baseline', () => {
    const session = acceptInput(
      WALL_TOOL,
      acceptInput(WALL_TOOL, beginSession(WALL_TOOL), A).session,
      B,
    ).session;
    const commit = commitOf(WALL_TOOL, session)!;

    expect(commit.commandId).toBe('core.createElement');
    const params = commit.args['params'] as Record<string, unknown>;
    // ⚠ The baseline is 2D: the clicked z is not part of this command's meaning (height is a datum, D52).
    expect(params['start']).toEqual([0, 0]);
    expect(params['end']).toEqual([4000, 0]);
    expect(commit.args['typeId']).toBe('core.wall');
  });

  it('⚠ the commit is inert DATA — no dispatch, no document, nothing to await', () => {
    const session = acceptInput(
      WALL_TOOL,
      acceptInput(WALL_TOOL, beginSession(WALL_TOOL), A).session,
      B,
    ).session;
    const commit = commitOf(WALL_TOOL, session)!;
    // If a commit were ever a thenable, the tool would be doing the dispatching — the private path rule 19
    // exists to forbid, and the thing §11 criterion 2 could no longer prove absent.
    expect(typeof (commit as { then?: unknown }).then).toBe('undefined');
    expect(Object.keys(commit).sort()).toEqual(['args', 'commandId']);
  });

  it('⚠ a ZERO-LENGTH baseline is DECLINED by the tool, not sent for the kernel to refuse', () => {
    // `wall.ts` throws "zero-length baseline" — which would reach the user as a red geometry banner
    // blaming their mouse for a double-click.
    const session = acceptInput(
      WALL_TOOL,
      acceptInput(WALL_TOOL, beginSession(WALL_TOOL), A).session,
      [0.5, 0, 0],
    ).session;
    expect(commitOf(WALL_TOOL, session)).toBeNull();
  });

  it('the select tool has no inputs and commits nothing — it is complete from the start', () => {
    const session = beginSession(SELECT_TOOL);
    expect(isComplete(SELECT_TOOL, session)).toBe(true);
    expect(commitOf(SELECT_TOOL, session)).toBeNull();
  });
});

describe('the registry', () => {
  it('resolves by id and refuses an unknown one', () => {
    expect(toolById('tool.wall')).toBe(WALL_TOOL);
    expect(toolById('tool.nope')).toBeUndefined();
  });

  it('every registered tool declares a prompt for each input it collects', () => {
    for (const tool of [SELECT_TOOL, WALL_TOOL] as Tool[]) {
      for (const input of tool.inputs) expect(input.prompt.length).toBeGreaterThan(0);
    }
  });
});
