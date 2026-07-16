/**
 * THE TYPED DEPENDENCY GRAPH (D50 step 0a) — "what must rebuild when this entity changes?"
 *
 * ⚠⚠ WHY THIS FILE EXISTS. The rebuild invalidator used to be three hard-coded cases inside
 * `DocumentContext.#touched()` — element-self, `hostId`, and style→instances — with a comment noting
 * that materials and sections rebuild nothing. **That is not a graph; it is a lookup that happened to be
 * right for the three edges that existed.** And it was already wrong for a fourth:
 *
 *   `build.ts` reads `elevationOf(scene, element.containerId)` — so an element's geometry ALREADY
 *   depends on its container's elevation — while the invalidator did not handle the `containers`
 *   collection at all. The edge existed in the BUILD and was missing from the INVALIDATOR. The moment
 *   `updateContainer` lands (step 0e), every element on that level would silently keep its old Z, with a
 *   green suite. (Entry 24b — a latent, silent, correct-looking bug that appears precisely when somebody
 *   fixes the other one.)
 *
 * ⚠ THE RULE THIS FILE ENFORCES: **an edge the build READS must be an edge the invalidator KNOWS.** The
 * `dependents` switch below is EXHAUSTIVE over `SceneCollection`, so adding a new collection is a compile
 * error until its rebuild edge is declared here — a collection can no longer silently invalidate nothing,
 * which is exactly how the container edge was lost. Every edge is DECLARED, with the line in the build it
 * mirrors, not inferred.
 *
 * ⚠ CONSTRAINTS ARE A FIRST-CLASS SCENE COLLECTION (D53). When the `constraints` collection lands
 * (step 0b/0c), its edges are declared HERE alongside these — this file is the one typed structure the
 * invalidator and the ecosystem consumers (Miqdar/Planitor) both read.
 */

import type { Element, ElementId } from './entities.js';
import type { Scene, SceneChange, SceneCollection } from './scene.js';
import { containerPath } from './scene.js';

/**
 * The element ids whose BUILT GEOMETRY depends on the entity this change touched — i.e. the ones that
 * must be re-staged. Assembly grouping (host↔hosted, style layers) is applied later by
 * `affectedAssemblies`; this returns the seed set of affected elements.
 *
 * @param scene the scene to resolve dependents against. Element→container and element→grid membership is
 *   unchanged by an elevation/axis edit, so the pre- or post-edit scene gives the same answer; the caller
 *   passes the pre-edit scene, matching the style edge's long-standing behaviour.
 */
export function dependents(scene: Scene, change: SceneChange): readonly ElementId[] {
  const collection: SceneCollection = change.collection;
  switch (collection) {
    case 'elements': {
      // EDGE: element-self (+ host↔hosted grouping). An element change rebuilds the element itself; if it
      // is hosted (an opening), its host's assembly must rebuild too, because the host's geometry carries
      // the hole this element cuts. `affectedAssemblies` collapses both to the assembly root.
      const element = (change.after ?? change.before) as
        { id: ElementId; hostId?: ElementId } | undefined;
      if (element === undefined) return [];
      const ids: ElementId[] = [element.id];
      if (element.hostId !== undefined) ids.push(element.hostId);
      return ids;
    }
    case 'styles':
      // EDGE: style→instance (D31). Mirrors `build.ts` reading the element's `ElementStyle` layer stack —
      // edit the shared style and every wall wearing it rebuilds. (The 400-walls edge.)
      return elementsUsingStyle(scene, change.id);
    case 'containers':
      // EDGE: container→element (elevation). ⚠ THE ONCE-MISSING EDGE. Mirrors `build.ts:393`
      // `elevation: elevationOf(scene, element.containerId)`, which walks the whole container path — so an
      // element depends on EVERY container along its path (a Level's elevation, and any ancestor's). Change
      // a container and every element whose path includes it must rebuild at the new datum.
      return elementsUnderContainer(scene, change.id);
    case 'grids':
      // EDGE: grid→element (axis placement, D32). Declared now, DORMANT until step 0b makes a Grid a real
      // placement host (today `gridRefs` is stored and validated but the build never reads it, so this
      // over-invalidates harmlessly — and there is no `updateGrid` command yet to trigger it). Declaring it
      // here means the invalidator already knows the edge the moment the build starts reading it.
      return elementsBoundToGrid(scene, change.id);
    case 'materials':
    case 'sections':
      // NO GEOMETRY EDGE — and this is a deliberate, declared "nothing", not an oversight. A part's SHAPE
      // comes from the style layer's THICKNESS and the section's profile is swept at build time from the
      // element's own params; a material carries density/structural properties read by `quantities()` and
      // Miqdar, and no solid's geometry depends on it. (A section edit that changed a profile WOULD matter,
      // but sections are create-only until step 0e; when `updateSection` lands, revisit this line.)
      return [];
    default:
      return assertNever(collection);
  }
}

/** Every element wearing a given style — the style→instance edge. */
function elementsUsingStyle(scene: Scene, styleId: string): readonly ElementId[] {
  return elementIdsWhere(scene, (e) => e.styleId === styleId);
}

/**
 * Every element whose container PATH includes the changed container — the container→element edge.
 * `containerPath` walks root-ward, so this catches an element on a Space three levels under the changed
 * Building just as it catches one directly on the changed Level.
 */
function elementsUnderContainer(scene: Scene, containerId: string): readonly ElementId[] {
  return elementIdsWhere(scene, (e) =>
    containerPath(scene, e.containerId).some((c) => c.id === containerId),
  );
}

/** Every element bound to a given grid axis — the grid→element edge (dormant until step 0b). */
function elementsBoundToGrid(scene: Scene, gridId: string): readonly ElementId[] {
  return elementIdsWhere(scene, (e) => e.gridRefs?.includes(gridId) ?? false);
}

function elementIdsWhere(
  scene: Scene,
  predicate: (element: Element) => boolean,
): readonly ElementId[] {
  return Object.values(scene.elements)
    .filter(predicate)
    .map((e) => e.id);
}

/** Exhaustiveness guard — a new `SceneCollection` fails to compile until its edge is declared above. */
function assertNever(value: never): never {
  throw new Error(`unhandled scene collection in dependency graph: ${String(value)}`);
}
