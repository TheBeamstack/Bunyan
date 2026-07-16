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
 * ⚠ CONSTRAINTS ARE A FIRST-CLASS SCENE COLLECTION (D53, landed step 0b). The `constraints` edges are
 * declared HERE alongside the rest — a `constraint` change re-stages its element, and the `containers`/
 * `grids` cases widened to also follow datum bindings (base/top→Level, grid→axis). This file is the one
 * typed structure the invalidator and the ecosystem consumers (Miqdar/Planitor) both read. The sketch
 * solver (0d) will add sketch-constraint members to the `Constraint` union without touching these edges.
 */

import type { Constraint, Element, ElementId } from './entities.js';
import type { Scene, SceneChange, SceneCollection } from './scene.js';
import { containerPath, elementsConstrainedToGrid, elementsConstrainedToLevel } from './scene.js';

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
      // EDGE: container→element. ⚠ THE ONCE-MISSING EDGE, now with TWO paths (D50 step 0b). (1) elevation:
      // mirrors `build.ts` `elevationOf(scene, element.containerId)`, which walks the whole container path,
      // so an element depends on every container along its path. (2) datum: an element with a `base`/`top`
      // constraint targeting this Level follows it too — "move a Level, the building follows".
      return unique([
        ...elementsUnderContainer(scene, change.id),
        ...elementsConstrainedToLevel(scene, change.id),
      ]);
    case 'grids':
      // EDGE: grid→element (D32) — NO LONGER DORMANT (step 0b). An element with a `grid` constraint on this
      // axis is placed at its intersection, so the build reads it and it must re-stage — "move a Grid line,
      // its columns follow". (`gridRefs` is gone; the binding is a constraint now — owner decision A.)
      return elementsConstrainedToGrid(scene, change.id);
    case 'constraints': {
      // EDGE: constraint→element. A datum binding appeared, moved or vanished ⇒ re-stage the element that
      // depends on it. (The container/grid the constraint TARGETS is handled by the two cases above.)
      const c = (change.after ?? change.before) as Constraint | undefined;
      return c === undefined ? [] : [c.element];
    }
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

function unique(ids: readonly ElementId[]): readonly ElementId[] {
  return [...new Set(ids)];
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
