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
import { isJoinConstraint } from './entities.js';
import type { Scene, SceneChange, SceneCollection } from './scene.js';
import {
  containerPath,
  elementsConstrainedToGrid,
  elementsConstrainedToLevel,
  instancesOfStyle,
  stylesUsingSection,
} from './scene.js';
import { baselineOf, endpointsOf, wallsJoinedTo } from './joins.js';

/**
 * The element ids whose BUILT GEOMETRY depends on the entity this change touched — i.e. the ones that
 * must be re-staged. Assembly grouping (host↔hosted, style layers) is applied later by
 * `affectedAssemblies`; this returns the seed set of affected elements.
 *
 * @param scene the scene to resolve dependents against. Element→container and element→grid membership is
 *   unchanged by an elevation/axis edit, so the pre- or post-edit scene gives the same answer; the caller
 *   passes the pre-edit scene, matching the style edge's long-standing behaviour.
 */
export function dependents(
  scene: Scene,
  change: SceneChange,
  childStyles: ReadonlyMap<string, ReadonlySet<ElementId>> = new Map(),
): readonly ElementId[] {
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
      // EDGE: wall↔wall JOIN (0c) — the bidirectional element↔element edge. When a wall moves, every wall
      // whose cap is joined to it must re-stage so its miter follows (`P5_step0c_design.md` §4). "Joined"
      // is a proximity fact over baselines, so we scan the wall's OLD and NEW endpoints (before/after): the
      // old ones catch a neighbour it is LEAVING, the new ones a neighbour it is now MEETING. Overrides
      // naming it are added too. This is what makes "move a wall, its neighbour's corner follows" true.
      const points = [
        ...endpointsOf(change.before as Element | undefined),
        ...endpointsOf(change.after as Element | undefined),
      ];
      // ⚠ AND THE SEGMENTS, not only the endpoints (Entry 60). A wall that BUTTS INTO this one mid-span
      // rests its cap on this wall's face, so it re-stages when this wall moves OR thickens — a change
      // that leaves both endpoints exactly where they were. Endpoints alone cannot see that dependency.
      const segments = [change.before, change.after]
        .map((e) => (e === undefined ? undefined : baselineOf(e as Element)))
        .filter((s): s is NonNullable<typeof s> => s !== undefined);
      if (points.length > 0) ids.push(...wallsJoinedTo(scene, element.id, points, segments));
      return ids;
    }
    case 'styles':
      // EDGE: style→instance (D31). Mirrors `build.ts` reading the element's `ElementStyle` layer stack —
      // edit the shared style and every wall wearing it rebuilds. (The 400-walls edge.)
      //
      // ⚠⚠ AND IT REACHES GENERATED CHILD ELEMENTS TOO (rule 18, D59 — swept 2026-07-28). "Every element
      // wearing this style" was answered out of `scene.elements`, and a child is not a scene row: a style
      // worn only by a curtain wall's panels invalidated NOTHING, leaving their solids stale (measured 3×
      // wrong) until an unrelated full rebuild. The child cannot be re-staged on its own — it is derived —
      // so the AUTHORED ROOT that generates it is what must rebuild, which regenerates the child.
      return unique([
        ...elementsUsingStyle(scene, change.id),
        ...(childStyles.get(change.id) ?? []),
      ]);
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
      // ⚠ A JOIN override (0c) re-stages BOTH walls of the corner: setting/clearing it changes each wall's
      // cap (butt affects only the butting wall's geometry, but flipping to/from miter can move both, so we
      // re-stage the pair unconditionally — correct and cheap).
      const c = (change.after ?? change.before) as Constraint | undefined;
      if (c === undefined) return [];
      return isJoinConstraint(c) ? [c.element, c.other] : [c.element];
    }
    case 'sections':
      // EDGE: section→element (D50 step 0e). ⚠ NO LONGER "nothing" — `updateSection` landed. A `Section`
      // is swept into a LinearMember's PROFILE, so a section change re-stages every element whose style
      // names it (section → styles-using-it → their instances). (0a's note here said exactly this: "when
      // `updateSection` lands, revisit this line.")
      //
      // ⚠ A section reaches geometry ONLY through a style, so the child gap above is inherited here
      // verbatim: resolve the styles first, then take BOTH their scene-row instances and their child
      // users. Composing the two edges rather than duplicating either is what keeps them one answer.
      return unique(
        stylesUsingSection(scene, change.id).flatMap((style) => [
          ...instancesOfStyle(scene, style.id).map((e) => e.id),
          ...(childStyles.get(style.id) ?? []),
        ]),
      );
    case 'materials':
      // NO GEOMETRY EDGE — a deliberate, declared "nothing". A part's SHAPE comes from the style layer's
      // THICKNESS; a material carries only density/structural properties read by `quantities()` and Miqdar,
      // and no solid's geometry depends on it. A density edit re-computes quantities lazily, rebuilds nothing.
      return [];
    case 'schedules':
      // NO ELEMENT-GEOMETRY EDGE — a declared "nothing", and here it is a STATEMENT OF WHAT A SCHEDULE IS
      // (Entry 68, D58 row Ⓐ's CRUD). A schedule is a PROJECTION of the model (`core_logic.md` rule 17):
      // the arrow points ONE way — the schedule reads elements, no element reads the schedule — so no
      // solid changes shape when a schedule is created, renamed, re-columned or deleted.
      //
      // ⚠ THE EDGE THAT WOULD BE WRONG TO DECLARE HERE IS THE INVERSE ONE. "Editing a schedule re-stages
      // the elements it lists" is superficially plausible and would be a real defect: a table with a
      // filter matching 400 walls would rebuild 400 solids to change a column heading. The schedule's own
      // freshness needs no invalidation at all, because its rows are re-derived on every `evaluateSchedule`
      // and NOTHING is stored (D78 — the body caches nothing, exactly so this line can stay empty).
      return [];
    case 'roomSeparators':
      // NO ELEMENT-GEOMETRY EDGE — a declared "nothing", like `materials` (P5 step 0g). A separator re-bounds
      // a SPACE (a query the room-bounding solver recomputes on demand), never an element's SOLID — no wall,
      // slab or opening changes shape when a separator moves. The edge is declared here so the exhaustive
      // switch stays satisfied; the room-area invalidation lives with the solver, not in the rebuild graph.
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
