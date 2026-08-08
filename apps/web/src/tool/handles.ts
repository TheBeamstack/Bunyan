/**
 * THE DRAG HANDLES — P4.5 §9, the gizmo Entry 86 stopped one step short of, and the last mile of the
 * corner-drag. `drag.ts` decides WHAT a drag commands; this decides WHICH POINT the user has hold of.
 *
 * ⚠⚠ THE ONE RULE THIS FILE EXISTS TO ENFORCE: **A HANDLE'S IDENTITY COMES FROM THE SELECTION, NEVER
 * FROM THE SNAP.** A handle is minted from an element the user has already selected, so it carries that
 * element's `elementId` and the `end` it was built from, and it keeps them for the whole gesture. The
 * cursor's snap decides only WHERE the drag lands — never WHAT is being dragged. This is not a
 * preference: a guide candidate carries **no `ref` and no `elementId`** by construction (`align.ts`),
 * and it is the candidate that wins exactly when the user has aimed most carefully. A gizmo that read
 * identity off the winning snap would lose it precisely in the careful case.
 *
 * ⚠ THE HIT TEST IS IN PIXELS, AND THAT IS THE SAME ARGUMENT `chooseSnap` MAKES. A world-space radius is
 * a different-sized target at every camera distance — grabbable across the room and unmissable from
 * inside the wall. The projection is INJECTED (`Project`, from `snap.ts`), so the whole of this file is
 * pure and asserted headlessly; only the camera lives in the GL layer. That is the standing verification
 * split, and it is why the gizmo's behaviour is not a browser-only claim.
 *
 * ⚠ Nothing here holds a `KernelClient`, mints an identity, or touches the document. A handle is an
 * OVERLAY — it is drawn in the preview layer, so it can never be picked and never be snapped to.
 */

import type { Vec3 } from '@bunyan/protocol';
import type { ElementId } from '@bunyan/document';

import type { Project } from './snap';
import { endpointOf, type BaselineEnd, type DragTarget } from './drag';

/** How close (CSS px) the cursor must be to grab a handle. Matches `SNAP_TOLERANCE_PX`'s scale. */
export const HANDLE_HIT_RADIUS_PX = 12;

/**
 * One grabbable point in the viewport: a baseline endpoint of a SELECTED element.
 *
 * ⚠ `elementId` + `end` are the identity, and they are what `cornerDragPlan` is handed on drop. The
 * `point` is where it is drawn and where the hit test measures from — it is NOT identity, and nothing
 * downstream re-derives the element from it.
 */
export interface DragHandle {
  readonly elementId: ElementId;
  readonly end: BaselineEnd;
  /**
   * World mm. ⚠ A D52 baseline is **2D, in the Level plane** — `start`/`end` carry x and y only, so the
   * z is the LEVEL's elevation and the caller supplies it (`elevationOf`). Drawing every handle at z=0
   * would put the first floor's gizmo on the ground, on top of the ground floor's.
   */
  readonly point: Vec3;
}

/**
 * The handles for a set of drag targets — one per readable baseline endpoint, `start` before `end`.
 *
 * ⚠ Only the SELECTION is passed in. An element with no readable baseline (a hosted opening, a
 * GenericSolid) contributes nothing rather than a handle at a guessed point: a handle the user can grab
 * that does not correspond to an authored value is a control that lies about what it will do.
 */
export function baselineHandles(
  targets: readonly DragTarget[],
  /** The z for this target's Level, in mm. `elevationOf(scene, element.containerId)` in the app. */
  elevationOf: (target: DragTarget) => number,
): DragHandle[] {
  const handles: DragHandle[] = [];
  for (const target of targets) {
    const z = elevationOf(target);
    for (const end of ['start', 'end'] as const) {
      // ⚠ `drag.ts`'s reader, not a second one — a handle must exist exactly where the planner will
      // find an endpoint to move, or the gizmo and the command disagree about what a baseline is.
      const xy = endpointOf(target, end);
      if (xy === null) continue;
      handles.push({ elementId: target.elementId, end, point: [xy[0], xy[1], z] });
    }
  }
  return handles;
}

/**
 * The handle under the cursor, or `null`. **Nearest in PIXELS wins**, and a handle the camera cannot see
 * (behind it, or past the far plane — `project` returns `null`) can never be grabbed.
 *
 * ⚠ Ties are broken by ORDER, not by chance: two handles at the same projected point are the coincident
 * corner every D52 model is full of, and taking the first keeps a gesture reproducible frame to frame.
 * It does not matter WHICH one is returned — `cornerDragPlan` moves every wall sharing that corner
 * anyway, and the peer match is by coordinate.
 */
export function handleAt(
  handles: readonly DragHandle[],
  project: Project,
  cursorPx: readonly [number, number],
  tolerancePx: number = HANDLE_HIT_RADIUS_PX,
): DragHandle | null {
  let best: DragHandle | null = null;
  let bestDistance = Infinity;
  for (const handle of handles) {
    const screen = project(handle.point);
    if (screen === null) continue;
    const distance = Math.hypot(screen[0] - cursorPx[0], screen[1] - cursorPx[1]);
    if (distance > tolerancePx) continue;
    if (distance < bestDistance) {
      best = handle;
      bestDistance = distance;
    }
  }
  return best;
}
