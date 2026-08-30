// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * DRAG PLANNER tests (P4.5 §9 + D23). Headless and pure — there is no document here, which is the point:
 * the planner PROPOSES and the document DISPOSES, so everything below is about the proposal being right.
 *
 * ⚠ WHAT THESE ARE HOSTILE TO, chosen from how this can be green and wrong:
 *   (a) **the wrong verb on a baseline wall** — `core.move` on a D52 wall does not throw in the app; it
 *       is refused by the document, and if the app proposed ONLY that, every wall drag would die. The
 *       ordering is the fix, so the ordering is what is asserted;
 *   (b) **a corner-drag that moves one wall of three** — which does not move a corner, it opens one;
 *   (c) **a corner-drag that rewrites the endpoint the user did not touch**, putting an untouched value
 *       into the change feed as though they had authored it;
 *   (d) **a plan that invents an identity** — the `align.ts` rule, one layer up.
 */

import { describe, expect, it } from 'vitest';

import type { ElementId } from '@bunyan/document';
import {
  CORNER_TOLERANCE_MM,
  cornerDragPlan,
  cornerPeerCount,
  dragPlans,
  type DragPlan,
  type DragTarget,
} from './drag';

const id = (s: string): ElementId => s;

const wall = (name: string, start: [number, number], end: [number, number]): DragTarget => ({
  elementId: id(name),
  params: { start, end, height: 2800 },
});

const opening = (name: string, host: string): DragTarget => ({
  elementId: id(name),
  hostId: id(host),
  params: { offsetU: 1000, offsetV: 0, width: 900, height: 2100 },
});

/** A GenericSolid-shaped element: no baseline, no host. The one `core.move` is actually for. */
const solid = (name: string): DragTarget => ({ elementId: id(name), params: { size: 500 } });

describe('dragPlans — the ORDER is the engine’s refusal graph read forwards', () => {
  it('⚠⚠ a D52 baseline wall proposes core.setParams BEFORE core.move', () => {
    const plans = dragPlans(wall('w1', [0, 0], [4000, 0]), [100, 200, 0]);
    expect(plans.map((p) => p.positioning)).toEqual(['baseline', 'placement']);
    expect(plans[0]?.commands[0]?.commandId).toBe('core.setParams');
    // ⚠ BOTH endpoints, by the SAME delta — the refusal message's own instruction.
    expect(plans[0]?.commands[0]?.args['params']).toEqual({ start: [100, 200], end: [4100, 200] });
  });

  it('⚠⚠ a HOSTED opening proposes its offset params first, and never core.move alone', () => {
    const plans = dragPlans(opening('d1', 'w1'), [300, 400, 50]);
    expect(plans[0]?.positioning).toBe('host');
    expect(plans[0]?.commands[0]?.commandId).toBe('core.setParams');
    const params = plans[0]?.commands[0]?.args['params'] as Record<string, number>;
    expect(params['offsetU']).toBeCloseTo(1000 + 500, 6); // hypot(300,400) = 500
    expect(params['offsetV']).toBe(50);
  });

  /**
   * ⚠⚠ PINNING THE UNSIGNED `offsetU`, because the docblock used to call it an "over-estimate" and it
   * is not — it is a LOST DIRECTION (Entry 87's review; the test population above is why it survived,
   * every drag in it being all-positive). This asserts the CURRENT behaviour so that fixing it is a
   * deliberate act with a failing test, rather than a silent change under a caller that compensates.
   */
  it('⚠⚠ hostedPlan proposes an UNSIGNED offsetU — two opposite drags are indistinguishable', () => {
    const forward = dragPlans(opening('d1', 'w1'), [300, 400, 50])[0];
    const backward = dragPlans(opening('d1', 'w1'), [-300, -400, 50])[0];
    const u = (plan: DragPlan | undefined): unknown =>
      (plan?.commands[0]?.args['params'] as Record<string, unknown>)['offsetU'];
    expect(u(forward)).toBe(1500);
    expect(u(backward)).toBe(1500); // ⚠ NOT 500 — the sign is gone, and the caller must restore it.
    // ⚠ …while offsetV keeps its sign, so the two axes of one function disagree.
    const v = (plan: DragPlan | undefined): unknown =>
      (plan?.commands[0]?.args['params'] as Record<string, unknown>)['offsetV'];
    expect(v(dragPlans(opening('d1', 'w1'), [0, 0, -50])[0])).toBe(-50);
  });

  it('a GenericSolid-shaped element proposes core.move, and it is the ONLY plan', () => {
    const plans = dragPlans(solid('s1'), [10, 0, 0]);
    expect(plans.map((p) => p.positioning)).toEqual(['placement']);
    expect(plans[0]?.commands[0]).toEqual({
      commandId: 'core.move',
      args: { elementId: 's1', by: [10, 0, 0] },
    });
  });

  it('⚠ core.move is ALWAYS proposed last rather than omitted — the document decides, not this file', () => {
    // The planner must never conclude "this cannot move". It is not the classifier; proposing the
    // placement verb last costs one refused dry run and keeps the authority in one place.
    for (const target of [wall('w1', [0, 0], [1000, 0]), opening('d1', 'w1'), solid('s1')]) {
      expect(dragPlans(target, [50, 0, 0]).at(-1)?.positioning).toBe('placement');
    }
  });

  it('a sub-millimetre drag is a click, and yields NO plan at all', () => {
    expect(dragPlans(wall('w1', [0, 0], [1000, 0]), [0.4, 0.4, 0])).toEqual([]);
    expect(dragPlans(solid('s1'), [0, 0, 0])).toEqual([]);
  });

  it('⚠ an element whose params are unreadable still proposes the placement verb, never a guess', () => {
    const mystery: DragTarget = { elementId: id('x1'), params: null };
    expect(dragPlans(mystery, [10, 0, 0]).map((p) => p.positioning)).toEqual(['placement']);
    // ⚠ And a hosted element with NO readable offsets does not fabricate them.
    const brokenHost: DragTarget = { elementId: id('d2'), hostId: id('w1'), params: {} };
    expect(dragPlans(brokenHost, [10, 0, 0]).map((p) => p.positioning)).toEqual(['placement']);
  });
});

describe('⚠⚠ the CORNER-DRAG — the case the transaction exists for (D23)', () => {
  // Three walls meeting at [4000, 0]: w1 ends there, w2 starts there, w3 starts there.
  const three = [
    wall('w1', [0, 0], [4000, 0]),
    wall('w2', [4000, 0], [4000, 3000]),
    wall('w3', [4000, 0], [8000, -1000]),
  ];

  it('⚠⚠ moves EVERY wall sharing the corner — one wall of three is not a corner-drag', () => {
    const plan = cornerDragPlan(three, { elementId: id('w1'), end: 'end' }, [4500, 500]);
    expect(plan).not.toBeNull();
    expect(cornerPeerCount(plan)).toBe(3);
    expect(plan?.commands.map((c) => c.args['elementId'])).toEqual(['w1', 'w2', 'w3']);
  });

  it('⚠⚠ writes ONLY the endpoint that is at the corner, never the far end', () => {
    const plan = cornerDragPlan(three, { elementId: id('w1'), end: 'end' }, [4500, 500]);
    // w1 is grabbed by its `end`; w2 and w3 are joined by their `start`. The other ends are untouched,
    // and are ABSENT from the patch rather than re-sent unchanged.
    expect(plan?.commands.map((c) => Object.keys(c.args['params'] as object)[0])).toEqual([
      'end',
      'start',
      'start',
    ]);
    for (const command of plan?.commands ?? []) {
      expect(Object.keys(command.args['params'] as object)).toHaveLength(1);
      expect(Object.values(command.args['params'] as object)[0]).toEqual([4500, 500]);
    }
  });

  it('⚠ a wall that merely passes NEAR the corner is not moved', () => {
    const near = [...three, wall('w4', [4000 + CORNER_TOLERANCE_MM * 10, 0], [9000, 0])];
    const plan = cornerDragPlan(near, { elementId: id('w1'), end: 'end' }, [4500, 500]);
    expect(cornerPeerCount(plan)).toBe(3);
    expect(plan?.commands.map((c) => c.args['elementId'])).not.toContain('w4');
  });

  it('⚠ a wall with BOTH endpoints on the corner (a degenerate stub) contributes both', () => {
    // Not a shape anyone authors on purpose, but it must not silently drop one: the whole stub is at
    // the corner, so the whole stub moves.
    const stub = [...three, wall('w5', [4000, 0], [4000, 0])];
    const plan = cornerDragPlan(stub, { elementId: id('w1'), end: 'end' }, [4500, 500]);
    expect(plan?.commands.filter((c) => c.args['elementId'] === 'w5')).toHaveLength(2);
    expect(cornerPeerCount(plan)).toBe(4);
  });

  it('a drag that does not move the corner yields no plan', () => {
    expect(cornerDragPlan(three, { elementId: id('w1'), end: 'end' }, [4000, 0])).toBeNull();
    expect(cornerDragPlan(three, { elementId: id('w1'), end: 'end' }, [4000.5, 0])).toBeNull();
  });

  it('grabbing an endpoint that does not exist declines rather than moving something else', () => {
    expect(cornerDragPlan(three, { elementId: id('nope'), end: 'end' }, [1, 1])).toBeNull();
    expect(cornerDragPlan([solid('s1')], { elementId: id('s1'), end: 'start' }, [1, 1])).toBeNull();
  });

  /**
   * ⚠⚠ ENTRY 89'S REVIEW FINDING. A D52 baseline is **2D, in the Level plane** — the Z comes from the
   * element's container (`elevationOf`), not from `start`/`end`. So a two-storey building has the SAME
   * `[4000, 0]` on every floor, and a corner-drag matching on the coordinate alone moves the wall
   * upstairs too. **Nothing errors:** the edit applies, the geometry is right for what was asked, both
   * diagnostics stay empty — and the user, dragging a corner on the ground floor, silently rebuilds the
   * first floor. Same shape as Entry 86's own finding: the casualty is what the gesture MEANT.
   */
  it('⚠⚠ does NOT move a wall that shares the 2D corner on a DIFFERENT LEVEL', () => {
    const ground = [
      { ...wall('g1', [0, 0], [4000, 0]), containerId: id('level-0') },
      { ...wall('g2', [4000, 0], [4000, 3000]), containerId: id('level-0') },
    ];
    const upstairs = [
      { ...wall('u1', [0, 0], [4000, 0]), containerId: id('level-1') },
      { ...wall('u2', [4000, 0], [4000, 3000]), containerId: id('level-1') },
    ];
    const plan = cornerDragPlan(
      [...ground, ...upstairs],
      { elementId: id('g1'), end: 'end' },
      [4500, 500],
    );
    expect(plan?.commands.map((c) => c.args['elementId'])).toEqual(['g1', 'g2']);
    expect(cornerPeerCount(plan)).toBe(2);
  });

  it('⚠ …and a scene with no containers at all still matches, rather than matching nothing', () => {
    // `containerId` absent on BOTH sides is the same container (the root), not two unknowns. The demo
    // scene is authored this way, so a rule that refused to match here would break the shipped case.
    const plan = cornerDragPlan(three, { elementId: id('w1'), end: 'end' }, [4500, 500]);
    expect(cornerPeerCount(plan)).toBe(3);
  });

  it('⚠⚠ NO command in ANY plan carries a ref, elementId-from-a-snap, or any other identity', () => {
    // `align.ts`'s rule one layer up: a plan names the element it was GIVEN and nothing it inferred.
    const plan = cornerDragPlan(three, { elementId: id('w1'), end: 'end' }, [4500, 500]);
    for (const command of plan?.commands ?? []) {
      expect(Object.keys(command.args).sort()).toEqual(['elementId', 'params']);
      expect(three.map((w) => w.elementId)).toContain(command.args['elementId']);
    }
  });
});
