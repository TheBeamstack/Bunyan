/**
 * THE INCREMENTAL REDRAW PLANNER (P4 step 2b) — pure, and therefore measurable headlessly.
 *
 * ⚠ THE PROBLEM IT SOLVES. The foundation pass re-tessellated EVERY part of EVERY element on every edit:
 * at 195 elements, 865 of the 965 ms an edit costs was redrawing 309 solids that did not change
 * (`review_P4.md` §2 / Entry 24). Tessellation is the dominant interactive cost, and none of the kernel
 * levers (the D29 cache, `instantiate`, threading) touch it — only this does.
 *
 * ⚠ THE SIGNAL, AND WHY IT NEEDS NOTHING FROM THE EDIT. A rebuild mints fresh `ShapeHandle`s only for the
 * elements it actually rebuilt (`DocumentContext` rebuilds the edited element, its hosted openings and its
 * style-mates — nothing else). So keyed by the STABLE `nodeId`, a part whose `handle` is unchanged is a
 * part whose geometry is unchanged: reuse its mesh. This is strictly more robust than reading
 * `edit.changes`, because it is also correct on undo/redo and on a fresh load, where there is no single
 * edit to consult — the handles carry the truth by themselves.
 *
 * `planRedraw` is a pure function of (what is on screen) × (what should be on screen). The caller
 * (`Viewport`) executes the plan against three.js; a test executes it against a counter. That split is
 * what lets the exit criterion — "an edit re-tessellates only the parts that changed" — be asserted by
 * COUNTING, in Node, with no GPU and no wall-clock threshold to flake in CI.
 */

import type { ShapeHandle } from '@bunyan/protocol';
import type { RenderPart } from './RenderPart';

/** What the renderer currently holds for a `nodeId` — the two fields the plan compares against. */
export interface CachedPart {
  readonly handle: ShapeHandle;
  readonly color: number;
}

export interface RedrawPlan {
  /** New parts, or parts whose `handle` changed — the ONLY parts that need a (costly) tessellation. */
  readonly tessellate: readonly RenderPart[];
  /** Same geometry, different colour — swap the material, never re-tessellate. */
  readonly recolor: readonly RenderPart[];
  /** `nodeId`s that were on screen and are no longer in the scene — dispose them. */
  readonly remove: readonly string[];
}

/**
 * Diff the cached scene against the desired parts. Everything not named in the returned plan is left
 * exactly as it is — an untouched element contributes zero work.
 */
export function planRedraw(
  prev: ReadonlyMap<string, CachedPart>,
  parts: readonly RenderPart[],
): RedrawPlan {
  const tessellate: RenderPart[] = [];
  const recolor: RenderPart[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    seen.add(part.nodeId);
    const cached = prev.get(part.nodeId);
    if (cached === undefined || cached.handle !== part.handle) {
      // New node, or the solid was rebuilt (fresh handle) ⇒ its geometry is dirty.
      tessellate.push(part);
    } else if (cached.color !== part.color) {
      // Same solid, new colour (e.g. a material re-assignment) ⇒ material swap only.
      recolor.push(part);
    }
    // Otherwise identical: reuse the existing mesh untouched.
  }

  const remove: string[] = [];
  for (const nodeId of prev.keys()) {
    if (!seen.has(nodeId)) remove.push(nodeId);
  }

  return { tessellate, recolor, remove };
}
