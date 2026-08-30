// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE DRAG PLANNER — P4.5 §9, the app half of the move verbs, and the corner-drag's atomicity (D23).
 *
 * ⚠⚠ WHAT THIS FILE IS, IN ONE SENTENCE: **it turns "the user dragged this thing by this much" into an
 * ORDERED LIST OF CANDIDATE COMMAND PLANS, and it does not decide which one is right.** Deciding is the
 * document's job, through `dryRun`, and the reason is the whole design below.
 *
 * ⚠⚠ THE REFUSAL IS ENFORCED, NOT DOCUMENTED, AND IT IS WHY A NAIVE MOVE TOOL WOULD REFUSE ON ALMOST
 * EVERYTHING IN THE DEMO SCENE. `core.move` writes an element's `placement`, and three whole classes of
 * element are positioned by their RECIPE instead (`placement.ts :: positioningRefusal`):
 *
 *   - a **hosted** opening — its own `placement` is never read; the void is cut in the HOST's frame and
 *     rides out on the host's placement. Writing one would succeed, move nothing, and tell the change
 *     feed it moved. ⇒ `core.setParams` on `offsetU`/`offsetV`.
 *   - a **D52 baseline** wall — `{start, end}` is what the join resolver, the room solver and the billed
 *     axis length all derive from. A placement beside them moves the SOLID and leaves every derivation
 *     at the old baseline. ⇒ `core.setParams` with the endpoint(s) moved.
 *   - a **datum-constrained** element — refused for REORIENTATION only; a pure translation is measured
 *     exactly and passes.
 *
 * ⇒ **The move verbs are for GenericSolid-shaped elements**, and the two the demo scene is made of are
 * both on the refused list. A "Move" button that refuses on every wall and every door is not a tool.
 *
 * ⚠⚠ AND HERE IS THE DECISION THAT SHAPES THE FILE: **THE APP DOES NOT CLASSIFY.** It would be four lines
 * to read `element.hostId` and to call a `params.start !== undefined` a baseline — and those four lines
 * would be a SECOND COPY of `positioningOf`, which the document deliberately builds out of the join
 * resolver's own `baselineOf` precisely so that *"this is not a guess about a Type, it is the engine's
 * own test"*. A second copy is a copy that drifts, and it would drift silently: the wrong verb on a
 * baseline wall does not throw, it moves the solid and leaves the derivations behind.
 *
 * ⚠⚠ AND STATE THE ALTERNATIVE HONESTLY, BECAUSE THE ENTRY-86 HAND-OFF DID NOT: **`positioningOf` IS
 * exported from `@bunyan/document`** (via `index.ts`, since Entry 72), so *"the app cannot reach it"*
 * was never the argument and Entry 89's review struck that premise. Calling it would tell this file the
 * positioning KIND — and it would still have to encode, in the app, which VERB each kind is authored
 * by. That mapping is `positioningRefusal`'s, it is the thing that actually decides, and re-stating it
 * here is the same silent drift one step further along. ⇒ probe-and-route survives the correction, on
 * the sharper reason: the app must not own the refusal GRAPH, not merely the classifier.
 *
 * ⇒ So this file proposes, in the order the engine's own refusal messages name, and the caller asks
 * `doc.execute(id, args, { dryRun: true })` which one the document will actually accept. That is D42's
 * stated purpose — *"a UI highlights the offender; an agent reads it and RE-PLANS"* — and it costs ONE
 * Tier-2 round trip per GESTURE, at `pointerdown`, never per frame.
 *
 * ⚠⚠ AND THE PROBE IS FAR CHEAPER THAN THE DRY-RUN'S REPUTATION, WHICH IS WHY THIS IS AFFORDABLE.
 * Measured in the real app (Entry 86): a **REFUSED** `core.move` costs **1.6 ms and then 0.2 ms**, not
 * the ~100 ms a "real kernel rebuild thrown away" implies — because `checkPositioning` refuses in the
 * document, BEFORE any geometry is staged. An **ACCEPTED** `core.setParams` dry run costs **28.5 ms**.
 * ⇒ walking the candidate list is dominated by its ONE accepted probe, and the refusals ahead of it are
 * nearly free. ⚠ Still never per frame: 28.5 ms is half a frame budget, and this sits beside a pointer
 * path whose whole design is to touch no kernel at all (`snap.ts`'s header).
 *
 * ⚠ PURE, and no `DocumentContext` anywhere — same discipline as `snap.ts` and `align.ts`, so every rule
 * here is asserted headlessly and the only browser-side part is where the numbers come from.
 */

import type { Vec3 } from '@bunyan/protocol';
import type { ContainerId, ElementId } from '@bunyan/document';

/** One command a plan would issue. The same shape `Tool.commit` returns, so the executor is unchanged. */
export interface PlannedCommand {
  readonly commandId: string;
  readonly args: Record<string, unknown>;
}

/**
 * A candidate way to express one drag.
 *
 * ⚠ `commands` is a LIST because the corner-drag is genuinely several edits — three walls meeting at a
 * point is three `core.setParams` — and they must land as ONE undo (D23). The caller passes a single
 * `transactionId` for the whole list; see `TRANSACTION_NOTE`.
 */
export interface DragPlan {
  /** Why this plan exists, in the engine's own terms. Shown to nobody; it is here to be read in review. */
  readonly positioning: 'placement' | 'baseline' | 'host';
  readonly commands: readonly PlannedCommand[];
}

/** A D52 baseline, as it is authored: 2D, in the Level plane. */
export type Baseline2D = readonly [number, number];

/** Which end of a baseline a corner-drag has hold of. */
export type BaselineEnd = 'start' | 'end';

/** What the app read out of the scene for one element. NOT a classification — just the authored facts. */
export interface DragTarget {
  readonly elementId: ElementId;
  /** The element's authored params, verbatim. `null` when it has none the app could read. */
  readonly params: Readonly<Record<string, unknown>> | null;
  /** Present when the element is hosted. Read from the scene row, never inferred. */
  readonly hostId?: ElementId;
  /**
   * ⚠⚠ THE ELEMENT'S CONTAINER, AND IT IS NOT OPTIONAL DECORATION — IT IS THE THIRD COORDINATE.
   *
   * A D52 baseline is **2D, in the Level plane**: `start`/`end` carry x and y, and the Z comes from
   * `elevationOf(scene, containerId)`. So `[4000, 0]` on the ground floor and `[4000, 0]` on the first
   * floor are the SAME 2D point and a DIFFERENT corner — which is the ordinary case, because a
   * building's walls stack. A corner-drag matching on the 2D coordinate alone rebuilds the floor above.
   * Read it from the scene row (`element.containerId`) and pass it; `undefined` on BOTH sides means the
   * same container (the root), which is how the demo scene is authored.
   */
  readonly containerId?: ContainerId;
}

/**
 * ⚠⚠ THE TRANSACTION IS THE CALLER'S, AND IT IS THE CORNER-DRAG'S WHOLE POINT (D23, owner-ruled Q5).
 *
 * `doc.execute(id, args, { transactionId })` groups CONSECUTIVE edits into one all-or-nothing undo. The
 * gesture owns the id — not the command, which is passive and knows nothing of transactional state, and
 * not this planner, which is pure and has no clock. One `pointerdown`…`pointerup` is one id, so three
 * walls dragged by one corner are three `core.setParams` and exactly one `Ctrl+Z`.
 */
export const TRANSACTION_NOTE =
  'One gesture = one transactionId, passed to every command in DragPlan.commands, in order.';

/** How close two baseline endpoints must be (mm) to count as the SAME corner. */
export const CORNER_TOLERANCE_MM = 1;

/**
 * The candidate plans for dragging a whole element by `by`, **most likely first**.
 *
 * ⚠ The order is not a preference, it is the engine's refusal graph read forwards: a hosted element is
 * refused as `host` whatever else is true of it (`positioningOf` tests `hostId` FIRST), a baseline is
 * refused as `baseline`, and anything else is a placement element. Proposing in that order means the
 * FIRST accepted dry run is the right verb, so the caller never has to read a refusal message — which
 * matters, because a message is prose and prose is not an API.
 */
export function dragPlans(target: DragTarget, by: Vec3): DragPlan[] {
  const plans: DragPlan[] = [];
  if (isDegenerate(by)) return plans;

  // 1 — hosted: the offset params along the host face are what "where it is" means.
  const hosted = hostedPlan(target, by);
  if (hosted !== null) plans.push(hosted);

  // 2 — baseline: translate BOTH endpoints, so every derivation moves with the solid.
  const baseline = baselineTranslatePlan(target, by);
  if (baseline !== null) plans.push(baseline);

  // 3 — placement: the verb the move tool is actually FOR.
  plans.push({
    positioning: 'placement',
    commands: [{ commandId: 'core.move', args: { elementId: target.elementId, by: [...by] } }],
  });

  return plans;
}

/**
 * THE CORNER-DRAG: one endpoint of one baseline moves to `to`, and **every wall sharing that corner
 * moves with it**.
 *
 * ⚠⚠ THIS IS THE CASE THE TRANSACTION EXISTS FOR, and it is also the case where doing the obvious thing
 * is wrong. Dragging one wall's endpoint and leaving its neighbours behind does not "move a corner" — it
 * OPENS one, silently, and the join resolver will then dutifully resolve a junction that is no longer a
 * junction. So the peers are found by COORDINATE (within `CORNER_TOLERANCE_MM`) and moved in the same
 * gesture, under one id.
 *
 * ⚠⚠ AND THE MATCH IS PER-CONTAINER, WHICH IS NOT A REFINEMENT — IT IS THE MISSING THIRD COORDINATE.
 * `start`/`end` are 2D in the Level plane, so a wall directly above shares the corner's x and y exactly.
 * Matching on the 2D point alone moves it too, and nothing errors: the edit applies, the geometry is
 * right for what was asked, both diagnostics stay empty, and the user who dragged a corner on the ground
 * floor has silently re-authored the first. (Found reviewing Entry 86 — the same shape as Entry 86's own
 * finding, where the casualty was not correctness but what the gesture MEANT.)
 *
 * ⚠ Peers are matched on the authored baseline endpoints and nothing else — no `ref`, no snap identity.
 * A snapped guide point carries NO `ref` by construction (`align.ts`), so a drag that needed identity
 * from the snap would be reading a field that is absent exactly when the user has aimed most carefully.
 * Matching on the coordinate is not a workaround for that; it is the correct question, because "the same
 * corner" IS a coordinate coincidence in a D52 model.
 */
export function cornerDragPlan(
  /** The baselines the app read out of the scene, in any order. */
  walls: readonly DragTarget[],
  /** The endpoint the user grabbed. */
  grabbed: { readonly elementId: ElementId; readonly end: BaselineEnd },
  to: Baseline2D,
): DragPlan | null {
  const grabbedWall = find(walls, grabbed.elementId);
  const anchor = endpointOf(grabbedWall, grabbed.end);
  if (anchor === null) return null;
  if (distance2D(anchor, to) < CORNER_TOLERANCE_MM) return null; // a drag that moved nothing

  const commands: PlannedCommand[] = [];
  for (const wall of walls) {
    // ⚠ The container is the third coordinate — see `DragTarget.containerId`. Absent on both sides is
    // the SAME container (the root), never two unknowns that happen to look alike.
    if (wall.containerId !== grabbedWall?.containerId) continue;
    for (const end of ['start', 'end'] as const) {
      const point = endpointOf(wall, end);
      if (point === null) continue;
      if (distance2D(point, anchor) > CORNER_TOLERANCE_MM) continue;
      // ⚠ ONE endpoint per command, and the OTHER is deliberately not written: `core.setParams` takes a
      // partial params patch, and re-sending an unchanged `end` would put a value the user did not touch
      // into the change feed as though they had.
      commands.push({
        commandId: 'core.setParams',
        args: { elementId: wall.elementId, params: { [end]: [to[0], to[1]] } },
      });
    }
  }
  if (commands.length === 0) return null;
  return { positioning: 'baseline', commands };
}

/**
 * How many DISTINCT walls a corner-drag would touch — the number a status line should say out loud
 * before the user commits, because "you are about to move three walls" is the whole difference between
 * the feature and a surprise.
 */
export function cornerPeerCount(plan: DragPlan | null): number {
  if (plan === null) return 0;
  return new Set(plan.commands.map((c) => c.args['elementId'])).size;
}

/* ---------------------------------------------------------------------------------------------- */

function hostedPlan(target: DragTarget, by: Vec3): DragPlan | null {
  if (target.hostId === undefined) return null;
  const offsetU = finite(target.params?.['offsetU']);
  const offsetV = finite(target.params?.['offsetV']);
  if (offsetU === null || offsetV === null) return null;

  // ⚠ THE DELTA IS IN WORLD mm AND `offsetU` IS ALONG THE HOST — they are different frames, and this
  // planner does NOT have the host's baseline, so it cannot convert. It proposes the horizontal
  // magnitude along U and the world z along V.
  // ⚠⚠ AND `Math.hypot` IS UNSIGNED, WHICH IS NOT AN OVER-ESTIMATE — IT IS A LOST DIRECTION (measured
  // in Entry 87's review of this file, and this comment used to claim "over-estimate"). Two exactly
  // OPPOSITE drags — `[+300,+400,+50]` and `[-300,-400,+50]` — both propose `offsetU 1500`, so a door
  // dragged left travels right. Note `offsetV` takes `by[2]` SIGNED, so the two axes of this one
  // function disagree about whether direction survives. ⇒ the caller MUST resolve U against the host's
  // authored baseline before committing (the opening tool already does that projection, `tools.ts`) —
  // that projection is where the sign comes back, and it is why this is a PROPOSAL and not a command.
  return {
    positioning: 'host',
    commands: [
      {
        commandId: 'core.setParams',
        args: {
          elementId: target.elementId,
          params: { offsetU: offsetU + Math.hypot(by[0], by[1]), offsetV: offsetV + by[2] },
        },
      },
    ],
  };
}

function baselineTranslatePlan(target: DragTarget, by: Vec3): DragPlan | null {
  const start = endpointOf(target, 'start');
  const end = endpointOf(target, 'end');
  if (start === null || end === null) return null;
  return {
    positioning: 'baseline',
    commands: [
      {
        commandId: 'core.setParams',
        args: {
          elementId: target.elementId,
          // ⚠ BOTH endpoints, by the SAME delta. Moving one is a corner-drag and a different gesture;
          // moving both is what "translate this wall" means, and it is the one the refusal names.
          params: {
            start: [start[0] + by[0], start[1] + by[1]],
            end: [end[0] + by[0], end[1] + by[1]],
          },
        },
      },
    ],
  };
}

function endpointOf(target: DragTarget | null, end: BaselineEnd): Baseline2D | null {
  if (target === null) return null;
  return vec2(target.params?.[end]);
}

function find(walls: readonly DragTarget[], id: ElementId): DragTarget | null {
  return walls.find((w) => w.elementId === id) ?? null;
}

function distance2D(a: Baseline2D, b: Baseline2D): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** A drag of less than a millimetre is a click, not a drag — and a zero move is a degenerate command. */
function isDegenerate(by: Vec3): boolean {
  return Math.hypot(by[0], by[1], by[2]) < CORNER_TOLERANCE_MM;
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function vec2(value: unknown): Baseline2D | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const x = finite(value[0]);
  const y = finite(value[1]);
  return x === null || y === null ? null : [x, y];
}
