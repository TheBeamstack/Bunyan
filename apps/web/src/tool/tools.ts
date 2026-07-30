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

import type { Vec3 } from '@bunyan/protocol';
import { DEFAULT_WALL_HEIGHT_MM, DEMO_STYLE_ID, WALL_TYPE_ID } from '../scaffold/seed';
import type { Tool } from './toolMachine';

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
  commit(points: readonly Vec3[]) {
    const [start, end] = points;
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

export const TOOLS: readonly Tool[] = [SELECT_TOOL, WALL_TOOL];

export function toolById(id: string): Tool | undefined {
  return TOOLS.find((tool) => tool.id === id);
}
