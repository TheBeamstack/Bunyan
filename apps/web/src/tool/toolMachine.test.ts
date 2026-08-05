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

import type { Params } from '@bunyan/document';
import type { Vec3 } from '@bunyan/protocol';
import {
  acceptInput,
  anchorOf,
  beginSession,
  commitOf,
  currentInput,
  isComplete,
  type CollectedInput,
  type Tool,
  type ToolContext,
} from './toolMachine';
import { OPENING_TOOL, SELECT_TOOL, WALL_TOOL, toolById } from './tools';

const A: Vec3 = [0, 0, 0];
const B: Vec3 = [4000, 0, 0];

/**
 * A REAL face token, in the encoding `encodeSubShapeRef` actually emits.
 *
 * ⚠ It was invented as `wall-1.structure|face|lateral#1` until the browser produced the true form —
 * `/` separates the three fields and `#` the occurrence. Nothing noticed, because until the non-face
 * guard landed nothing in this file ever DECODED it. §1c-9, in miniature: measure the artifact.
 */
const WALL_FACE = 'wall-1.structure/face/lateral.1#0';

/** A click that landed on nothing named — the wall tool's whole world. */
const at = (point: Vec3): CollectedInput => ({ point });

/** A document with nothing in it: every host lookup answers `null`. */
const NO_HOST: ToolContext = { paramsOf: () => null };

describe('the collection sequence', () => {
  it('walks its declared inputs in order and completes on the last one', () => {
    let session = beginSession(WALL_TOOL);
    expect(currentInput(WALL_TOOL, session)?.prompt).toMatch(/start/i);
    expect(isComplete(WALL_TOOL, session)).toBe(false);

    const first = acceptInput(WALL_TOOL, session, at(A));
    expect(first.complete).toBe(false);
    session = first.session;
    expect(currentInput(WALL_TOOL, session)?.prompt).toMatch(/end/i);

    const second = acceptInput(WALL_TOOL, session, at(B));
    expect(second.complete).toBe(true);
    expect(currentInput(WALL_TOOL, second.session)).toBeNull();
  });

  it('⚠ IGNORES a point offered to an already-complete session — a 2-point wall never becomes 3', () => {
    const done = acceptInput(
      WALL_TOOL,
      acceptInput(WALL_TOOL, beginSession(WALL_TOOL), at(A)).session,
      at(B),
    ).session;
    const extra = acceptInput(WALL_TOOL, done, at([9999, 9999, 0]));
    expect(extra.session.collected).toHaveLength(2);
    expect(extra.session.collected.map((c) => c.point)).toEqual([A, B]);
  });

  it('is immutable — accepting an input never mutates the session it was given', () => {
    const start = beginSession(WALL_TOOL);
    acceptInput(WALL_TOOL, start, at(A));
    expect(start.collected).toEqual([]);
  });

  it('the anchor is the last point collected — what a rubber band draws FROM', () => {
    expect(anchorOf(beginSession(WALL_TOOL))).toBeNull();
    expect(anchorOf(acceptInput(WALL_TOOL, beginSession(WALL_TOOL), at(A)).session)).toEqual(A);
  });

  it('⚠ carries what the click LANDED ON, not only where it was (the opening tool exists on this)', () => {
    // Before Entry 80 `collected` was a bare `Vec3`, so a click that resolved a SubShapeRef threw it
    // away one line later and no hosted element could be authored by pointing.
    const hosted: CollectedInput = { point: [1000, 0, 1200], ref: 'w1.structure|face|lateral#1' };
    const session = acceptInput(WALL_TOOL, beginSession(WALL_TOOL), hosted).session;
    expect(session.collected[0]?.ref).toBe('w1.structure|face|lateral#1');
  });
});

describe('commit — exactly one command, and it is a DESCRIPTION (rule 19)', () => {
  it('an incomplete session commits NOTHING', () => {
    expect(commitOf(WALL_TOOL, beginSession(WALL_TOOL), NO_HOST)).toBeNull();
    expect(
      commitOf(WALL_TOOL, acceptInput(WALL_TOOL, beginSession(WALL_TOOL), at(A)).session, NO_HOST),
    ).toBeNull();
  });

  it('a complete wall gesture becomes ONE core.createElement carrying the D52 baseline', () => {
    const session = acceptInput(
      WALL_TOOL,
      acceptInput(WALL_TOOL, beginSession(WALL_TOOL), at(A)).session,
      at(B),
    ).session;
    const commit = commitOf(WALL_TOOL, session, NO_HOST)!;

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
      acceptInput(WALL_TOOL, beginSession(WALL_TOOL), at(A)).session,
      at(B),
    ).session;
    const commit = commitOf(WALL_TOOL, session, NO_HOST)!;
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
      acceptInput(WALL_TOOL, beginSession(WALL_TOOL), at(A)).session,
      at([0.5, 0, 0]),
    ).session;
    expect(commitOf(WALL_TOOL, session, NO_HOST)).toBeNull();
  });

  it('the select tool has no inputs and commits nothing — it is complete from the start', () => {
    const session = beginSession(SELECT_TOOL);
    expect(isComplete(SELECT_TOOL, session)).toBe(true);
    expect(commitOf(SELECT_TOOL, session, NO_HOST)).toBeNull();
  });
});

/* ================================================================================================
 * THE OPENING TOOL — P4.5 EXIT CRITERION 3 (Entry 80).
 *
 * > "A window is placed by CLICKING A FACE and no human types a derivation token."
 *
 * ⚠ These are HEADLESS assertions about a browser gesture, which is the standing verification split:
 * the raycast that produces the hit belongs to the GL layer and is browser-verified, everything with
 * arithmetic or a decision in it is here, where Zayd can re-run it.
 * ============================================================================================= */

/** The demo wall: 4 m along +x from the origin, 2.8 m high (`scaffold/seed.ts`). */
const WALL_PARAMS: Params = { start: [0, 0], end: [4000, 0], height: 2800 };
const HOST: ToolContext = { paramsOf: (id) => (id === 'wall-1' ? WALL_PARAMS : null) };

/** A click on the wall's face at `x` mm along it, `z` mm up. */
const onWall = (x: number, z: number): CollectedInput => ({
  point: [x, 0, z],
  ref: WALL_FACE,
  elementId: 'wall-1',
});

const openingCommit = (input: CollectedInput, ctx: ToolContext = HOST) =>
  commitOf(OPENING_TOOL, acceptInput(OPENING_TOOL, beginSession(OPENING_TOOL), input).session, ctx);

describe('the opening tool — one click on a face becomes one hosted element', () => {
  it('⚠⚠ CARRIES THE PICKED FACE VERBATIM AS `hostRef` — the derivation token nobody types', () => {
    const commit = openingCommit(onWall(2000, 1400))!;
    expect(commit.commandId).toBe('core.createElement');
    expect(commit.args['typeId']).toBe('core.opening');
    expect(commit.args['hostId']).toBe('wall-1');
    // Verbatim: not parsed, not rebuilt, not matched against geometry. This is the whole criterion.
    expect(commit.args['hostRef']).toBe(WALL_FACE);
  });

  it('measures `offsetU` from the wall START along the baseline — the owner-ruled convention', () => {
    // ⚠ THE TEST THAT WOULD CATCH THE PLAUSIBLE WRONG ANSWER. Measuring from the face CENTRE (the
    // obvious alternative) puts a click at x=1000 at offsetU = -1000, and a join that lengthens the
    // wall would then move the door. Ruled 2026-07-21; `opening.ts` cites the same rule.
    expect((openingCommit(onWall(1000, 1400))!.args['params'] as Params)['offsetU']).toBe(1000);
    expect((openingCommit(onWall(3000, 1400))!.args['params'] as Params)['offsetU']).toBe(3000);
  });

  it('measures `offsetV` from the face CENTRE — 0 is vertically centred, not sill-height', () => {
    // The two conventions differ, deliberately, and the type documents both. Half of 2800 is 1400.
    expect((openingCommit(onWall(2000, 1400))!.args['params'] as Params)['offsetV']).toBe(0);
    expect((openingCommit(onWall(2000, 1200))!.args['params'] as Params)['offsetV']).toBe(-200);
  });

  it('CLAMPS `offsetV` to the headroom, so a click low on the wall does not push the head through it', () => {
    // ⚠ Written expecting -400 for a click at z=1000 and it came back -350, which is the CLAMP being
    // right and the expectation being naive: a 2100 opening in a 2800 wall has (2800-2100)/2 = 350 mm
    // of travel each way, and -400 would put the head 50 mm above the top of the wall.
    expect((openingCommit(onWall(2000, 1000))!.args['params'] as Params)['offsetV']).toBe(-350);
    expect((openingCommit(onWall(2000, 2700))!.args['params'] as Params)['offsetV']).toBe(350);
  });

  it('⚠ measures against the AUTHORED baseline, so a wall that does not run along +x still works', () => {
    // The demo's second wall runs +y from (4000, 0). A tool that assumed x-along would put every door
    // on it at a nonsense offset, and on a straight demo wall nothing would ever have said so.
    const ns: ToolContext = {
      paramsOf: () => ({ start: [4000, 0], end: [4000, 3000], height: 2800 }),
    };
    const commit = openingCommit(
      { point: [4000, 1200, 1400], ref: 'wall-2.structure/face/lateral.1#0', elementId: 'wall-2' },
      ns,
    )!;
    expect((commit.args['params'] as Params)['offsetU']).toBe(1200);
  });

  it('CLAMPS the opening inside the wall rather than letting half of it miss', () => {
    // A void is cut wherever it is told: an opening centred at 4000 on a 4000 wall would put half the
    // hole past the end, and the kernel would report success on the notch that remains.
    const params = openingCommit(onWall(3980, 1400))!.args['params'] as Params;
    expect(params['offsetU']).toBe(4000 - 900 / 2);
    expect((openingCommit(onWall(-500, 1400))!.args['params'] as Params)['offsetU']).toBe(900 / 2);
  });

  it('DECLINES a click that carries no host — a hosted void with no host is unbuildable', () => {
    // `opening.ts`: a door has `buildLeaf` and no `buildGeometry`, so an un-hosted one is correctly
    // `unbuildable`. Offering the user a way to author one is offering them a broken door.
    expect(openingCommit(at([2000, 0, 1400]))).toBeNull();
    expect(openingCommit({ point: [2000, 0, 1400], elementId: 'wall-1' })).toBeNull();
  });

  it('DECLINES when the host is not in the scene, or is not a baseline element', () => {
    expect(openingCommit(onWall(2000, 1400), NO_HOST)).toBeNull();
    const curtain: ToolContext = { paramsOf: () => ({ width: 3000, height: 2800 }) };
    expect(openingCommit(onWall(2000, 1400), curtain)).toBeNull();
  });

  it('DECLINES a wall too short or too low to hold the opening at all', () => {
    const stub: ToolContext = { paramsOf: () => ({ start: [0, 0], end: [600, 0], height: 2800 }) };
    expect(openingCommit(onWall(300, 1400), stub)).toBeNull();
    const low: ToolContext = { paramsOf: () => ({ start: [0, 0], end: [4000, 0], height: 1000 }) };
    expect(openingCommit(onWall(2000, 500), low)).toBeNull();
  });

  it('⚠ offers only the FACE snap, which is what stops it collecting a point off in space', () => {
    expect(OPENING_TOOL.inputs).toHaveLength(1);
    expect(OPENING_TOOL.inputs[0]?.snapTo).toEqual(['face']);
    // Numeric entry produces a point with no ref (see `useToolController`), so it must not be offered.
    expect(OPENING_TOOL.inputs[0]?.numeric).toBe(false);
  });
});

describe('the registry', () => {
  it('resolves by id and refuses an unknown one', () => {
    expect(toolById('tool.wall')).toBe(WALL_TOOL);
    expect(toolById('tool.opening')).toBe(OPENING_TOOL);
    expect(toolById('tool.nope')).toBeUndefined();
  });

  it('every registered tool declares a prompt for each input it collects', () => {
    for (const tool of [SELECT_TOOL, WALL_TOOL, OPENING_TOOL] as Tool[]) {
      for (const input of tool.inputs) expect(input.prompt.length).toBeGreaterThan(0);
    }
  });
});

describe('⚠ the opening tool REFUSES a non-face host — the browser finding, at the commit boundary', () => {
  /**
   * `core.createElement` accepts an edge token as `hostRef`. The build then throws, the element lands
   * `state: 'failed'` with `parts: []`, and NOTHING says so — no banner, no console error, and both
   * `unbuildable()` and `brokenRefs()` come back empty. Measured in the browser on the demo scene
   * (Entry 80). `chooseSnap`'s `allow` filter is the primary fix; this is the second line, and it is
   * cheap because a ref's kind is carried IN the token.
   */
  it('declines an EDGE ref, which is what a corner snap actually hands it', () => {
    const onEdge: CollectedInput = {
      point: [1000, 0, 1400],
      ref: 'wall-1.structure/edge/cap-end|lateral.0#0',
      elementId: 'wall-1',
    };
    expect(openingCommit(onEdge)).toBeNull();
  });

  it('declines a ref that does not decode at all, rather than passing the token through', () => {
    expect(
      openingCommit({ point: [1000, 0, 1400], ref: 'not-a-token', elementId: 'wall-1' }),
    ).toBeNull();
  });

  it('…and still accepts the face ref beside it, so the guard is not simply refusing everything', () => {
    expect(openingCommit(onWall(2000, 1400))).not.toBeNull();
  });
});
