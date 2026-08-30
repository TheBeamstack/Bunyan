// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE TOOL REGISTRY — P4.5 design §2, the app-layer list of what a pointing device can author.
 *
 * ⚠⚠ THIS REGISTRY IS `apps/web`-ONLY AND MUST STAY THERE. It is emphatically **not** a `scene.json`
 * collection, not a document registry, and not part of any frozen contract. A tool is disposable UI —
 * putting it below the freeze would be the exact D47 mistake in reverse (D47 is *"the ribbon rendered a
 * FORM over `argsSchema` where it should have activated a TOOL"*; answering that by freezing tools into
 * the document would weld the UI to the contract instead of the contract to the UI).
 *
 * ⚠ AND THE AGENT NEEDS NONE OF IT. An agent calls `core.createElement` directly with the numbers it
 * already knows. Tools exist for exactly one reason: **a human points instead of typing.** That is why
 * every tool here commits a command an agent could have issued verbatim — which is the equivalence §11
 * criterion 2 machine-checks.
 */

import { decodeSubShapeRef } from '@bunyan/protocol';
import {
  DEFAULT_OPENING_HEIGHT_MM,
  DEFAULT_OPENING_WIDTH_MM,
  DEFAULT_WALL_HEIGHT_MM,
  DEMO_STYLE_ID,
  OPENING_TYPE_ID,
  WALL_TYPE_ID,
} from '../scaffold/seed';
import type { CollectedInput, Tool } from './toolMachine';

/** The pointer tool: no inputs, no commit — selection and hover only. The default (design §8). */
export const SELECT_TOOL: Tool = {
  id: 'tool.select',
  label: 'Select',
  inputs: [],
  commit: () => null,
};

/**
 * THE WALL TOOL — click a start point, click an end point, one `core.createElement`.
 *
 * ⚠⚠ IT IS EXPRESSIBLE ONLY BECAUSE THE WALL IS A D52 BASELINE (`{start, end}`), AND THE APP ONLY STARTED
 * REGISTERING THAT WALL IN ENTRY 70. Against the old scaffold `core.wall.v1` (`{length, height}`) there is
 * nowhere to put two clicked points — you could compute a length from them, but the wall would have no
 * idea WHERE it is, because a `{length, height}` wall's position lives in a `placement` no command can set
 * (row ⓑ). *The parameterisation is what makes the gesture possible; that is D52's whole argument, and the
 * tool is the first thing to actually depend on it.*
 *
 * ⚠ The baseline is 2D — `[x, y]` in the Level plane — so the two collected 3D points are FLATTENED here.
 * Their `z` is not silently discarded to zero: a wall's vertical extent comes from its base/top datums
 * (D52), never from where the cursor happened to be in space, so the z of a click is genuinely not part
 * of this command's meaning.
 */
export const WALL_TOOL: Tool = {
  id: 'tool.wall',
  label: 'Wall',
  inputs: [
    { prompt: 'Pick the wall start point', snapTo: null, numeric: false },
    // Numeric entry applies to the END only: it is measured FROM the start, and the first point has
    // nothing to be relative to (§6).
    { prompt: 'Pick the end point, or type a length', snapTo: null, numeric: true },
  ],
  commit(inputs: readonly CollectedInput[]) {
    const start = inputs[0]?.point;
    const end = inputs[1]?.point;
    if (start === undefined || end === undefined) return null;
    // A zero-length baseline is refused HERE rather than by the kernel: `wall.ts` throws
    // "zero-length baseline", which would reach the user as a red geometry banner blaming their mouse.
    if (Math.hypot(end[0] - start[0], end[1] - start[1]) < 1) return null;

    return {
      commandId: 'core.createElement',
      args: {
        typeId: WALL_TYPE_ID,
        styleId: DEMO_STYLE_ID,
        params: {
          start: [start[0], start[1]],
          end: [end[0], end[1]],
          height: DEFAULT_WALL_HEIGHT_MM,
        },
      },
    };
  },
};

/**
 * THE OPENING TOOL — ONE CLICK ON A WALL FACE, ONE `core.createElement`, AND P4.5 EXIT CRITERION 3.
 *
 * > *"A window is placed by CLICKING A FACE and no human types a derivation token."*
 *
 * ⚠⚠ THE CRITERION IS ABOUT THE TOKEN, AND THE TOKEN IS THE EASY HALF. `hostRef` is an EXACT identity
 * that arrives free: the pick already resolved the clicked triangle to its face's `SubShapeRef`
 * through the retained provenance, so it is carried, never derived and never parsed. Nothing in this
 * function reads it. What the function actually has to do is the OTHER half — turn *"here"* into the
 * numbers `core.opening`'s own schema asks for.
 *
 * ⚠⚠ AND THOSE NUMBERS ARE NOT MEASURED OFF THE FACE — THEY ARE MEASURED OFF THE HOST'S AUTHORED
 * BASELINE, WHICH IS WHY THIS IS CORRECT RATHER THAN MERELY PLAUSIBLE. The owner ruled (2026-07-21)
 * that `offsetU` is the door centre's distance **from the wall's START, along the wall** — not from
 * the face's centre — exactly so that a join or a resize never moves the door. The wall's `start`
 * and `end` are EXACT numbers in `params` (D52). So the tool projects the clicked point onto that
 * exact baseline: the approximation in the answer is the click's own, and nothing else's. Taking the
 * distance along the picked FACE instead would have re-introduced the join-mobile origin the ruling
 * exists to avoid, and it would have looked identical on a straight, unjoined demo wall.
 *
 * ⚠ `offsetV` is from the face CENTRE (`0` = vertically centred), so it is `z − height/2`.
 *
 * ⚠ THE TIER. The clicked point is Tier 1 — it comes off the display mesh, a 5 mm chord
 * approximation (`snap.ts`'s header). That is the honest tier for *where along a wall a door goes*,
 * which is authored by pointing and then typed exactly in the property panel if it matters. It would
 * NOT be the honest tier for the `hostRef`, and the `hostRef` is not measured. ⚠ When the click
 * snapped to a grid intersection the point is exact by construction (§4.4), so the offset is too —
 * for free, through the priority order, with no Tier-2 round trip.
 */
export const OPENING_TOOL: Tool = {
  id: 'tool.opening',
  label: 'Opening',
  inputs: [
    // ⚠ `snapTo: ['face']` is NOT a filter for its own sake — it is what stops the tool collecting a
    // point with no `ref`. Every other kind can land on empty space; a hosted void with no host is
    // the `unbuildable` element `opening.ts` documents, and offering the user a way to author one is
    // offering them a broken door.
    { prompt: 'Click a wall face to place an opening', snapTo: ['face'], numeric: false },
  ],
  commit(inputs: readonly CollectedInput[], ctx) {
    const hit = inputs[0];
    if (hit?.ref === undefined || hit.elementId === undefined) return null;

    // ⚠⚠ A VOID IS HOSTED ON A FACE, AND NOTHING ELSE WAS CHECKING (Entry 80, found in the browser).
    // `core.createElement` ACCEPTS an edge token as `hostRef` — `faceFrame` then has no surface to
    // read, the build throws, and the element lands `state: 'failed'` with `parts: []`, no banner, no
    // console error, and `unbuildable()` and `brokenRefs()` both EMPTY. A door that is simply not
    // there is the worst possible failure mode for an authoring gesture. The snap filter above is the
    // primary fix; this is the commit boundary, and it is cheap because a ref's kind is IN the token.
    if (decodeSubShapeRef(hit.ref)?.kind !== 'face') return null;

    const params = ctx.paramsOf(hit.elementId);
    if (params === null) return null;

    const start = vec2(params['start']);
    const end = vec2(params['end']);
    const wallHeight = finite(params['height']);
    // Not a baseline element: the tool declines rather than guessing a convention it does not know.
    // ⚠ This is where a click on a curtain wall or a future non-baseline host lands, and declining is
    // the whole answer — `offsetU`'s meaning is defined against a baseline and nothing else.
    if (start === null || end === null || wallHeight === null) return null;

    const along: readonly [number, number] = [end[0] - start[0], end[1] - start[1]];
    const length = Math.hypot(along[0], along[1]);
    if (length < 1) return null;

    // The clicked point projected onto the EXACT baseline: the scalar distance from `start`.
    const u =
      ((hit.point[0] - start[0]) * along[0] + (hit.point[1] - start[1]) * along[1]) / length;

    // ⚠ THE OPENING MUST FIT, AND DECLINING IS THE RIGHT ANSWER WHEN IT CANNOT. A door hanging off
    // the end of its wall is not a refusal the kernel would raise — the void is cut wherever it is
    // told, so half of it would simply miss and the user would get a notch. Clamping keeps a click
    // near the end meaningful; refusing when the wall is too small keeps a click on a 600 mm return
    // from silently authoring a door that cannot be there.
    const halfWidth = DEFAULT_OPENING_WIDTH_MM / 2;
    if (length < DEFAULT_OPENING_WIDTH_MM || wallHeight < DEFAULT_OPENING_HEIGHT_MM) return null;
    const offsetU = clamp(u, halfWidth, length - halfWidth);

    const headroom = (wallHeight - DEFAULT_OPENING_HEIGHT_MM) / 2;
    const offsetV = clamp(hit.point[2] - wallHeight / 2, -headroom, headroom);

    return {
      commandId: 'core.createElement',
      args: {
        typeId: OPENING_TYPE_ID,
        // ⚠⚠ THE TWO ARGUMENTS THE CRITERION IS ABOUT, AND NEITHER WAS TYPED, PARSED OR DERIVED.
        hostId: hit.elementId,
        hostRef: hit.ref,
        params: {
          width: DEFAULT_OPENING_WIDTH_MM,
          height: DEFAULT_OPENING_HEIGHT_MM,
          offsetU,
          offsetV,
        },
      },
    };
  },
};

export const TOOLS: readonly Tool[] = [SELECT_TOOL, WALL_TOOL, OPENING_TOOL];

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** A finite number, or `null` — an absent or non-numeric param is a reason to decline, never a `0`. */
function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** A `[x, y]` param (a D52 baseline endpoint), or `null` when it is not one. */
function vec2(value: unknown): readonly [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const x = finite(value[0]);
  const y = finite(value[1]);
  return x === null || y === null ? null : [x, y];
}

export function toolById(id: string): Tool | undefined {
  return TOOLS.find((tool) => tool.id === id);
}
