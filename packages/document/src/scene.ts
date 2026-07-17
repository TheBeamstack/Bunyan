/**
 * `Scene` — the parametric truth. **This object IS `scene.json`** (spec §6): serialize it and you have
 * the file; parse the file and you have the model.
 *
 * ⚠ THE INVARIANT, AND EVERYTHING ELSE FOLLOWS FROM IT: **the recipe is the source of truth.** No
 * geometry lives here. No handles, no meshes, no parts. A `.bnn` that lost every solid it ever built
 * still contains the entire building, because the building IS the recipe — and that is exactly why
 * rebuild-from-`scene.json` is the primary load path and must remain a supported path forever.
 *
 * ⚠ **PARTS ARE NOT STORED** (D30). They are BUILT from params + style on every load, exactly as the
 * geometry is. Storing them would be storing a result.
 */

import type {
  BrokenReference,
  Constraint,
  ConstraintId,
  ContainerId,
  DatumConstraint,
  Element,
  ElementId,
  ElementStyle,
  Grid,
  GridId,
  Material,
  MaterialId,
  Section,
  SectionId,
  SpatialContainer,
  StyleId,
} from './entities.js';

/**
 * Bumped when `scene.json`'s own shape changes (not a type's — that is `element.typeVersion`).
 * - v1 → v2 (D50 step 0b): added the first-class `constraints` collection (D53). A v1 file has no
 *   `constraints` key; the loader defaults it to `{}`, so old `.bnn` files open unchanged.
 */
export const SCENE_SCHEMA_VERSION = 2;

export interface Scene {
  readonly schemaVersion: number;
  readonly elements: Readonly<Record<ElementId, Element>>;
  /** The SHARED parameter sets (D31). Edit one, and every instance referencing it rebuilds. */
  readonly styles: Readonly<Record<StyleId, ElementStyle>>;
  /**
   * The materials this document USES, embedded (D33).
   *
   * ⚠ Embedded, not referenced-by-name into some library: a `.bnn` must be self-contained, or a model
   * opened on a machine without the right material pack would silently lose every density in it — and
   * a quantity that cannot be trusted is worse than one that is absent (domain rule 15).
   */
  readonly materials: Readonly<Record<MaterialId, Material>>;
  readonly sections: Readonly<Record<SectionId, Section>>;
  /** `Site → Building → Level → Space` (D35). This tree IS Planitor's Location Breakdown Structure. */
  readonly containers: Readonly<Record<ContainerId, SpatialContainer>>;
  readonly grids: Readonly<Record<GridId, Grid>>;
  /**
   * The ACTIVE-DATUM bindings (D50 step 0b, D53) — base/top level spans and grid placements, first-class
   * and orthogonal to params. This is the one structure the rebuild invalidator (`dependency.ts`) and the
   * ecosystem consumers (Miqdar/Planitor) both read; the sketch solver (0d) extends the `Constraint` union.
   */
  readonly constraints: Readonly<Record<ConstraintId, Constraint>>;
  /**
   * References that did not resolve on the last rebuild (domain rule 3).
   *
   * ⚠ PERSISTED ON PURPOSE. A broken reference is a first-class, visible state awaiting manual
   * retargeting — so it must survive a save/load, or closing the file would "fix" the model by
   * forgetting the problem. That is the silent wrongness the whole design exists to refuse.
   */
  readonly brokenRefs: readonly BrokenReference[];
}

export function emptyScene(): Scene {
  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    elements: {},
    styles: {},
    materials: {},
    sections: {},
    containers: {},
    grids: {},
    constraints: {},
    brokenRefs: [],
  };
}

/** The collections a `SceneChange` can touch. Undo is a diff over these (spec §6.1). */
export type SceneCollection =
  'elements' | 'styles' | 'materials' | 'sections' | 'containers' | 'grids' | 'constraints';

/**
 * One atomic change to the scene — and the unit undo is built from.
 *
 * ⚠ IT CARRIES BOTH SIDES (`before` and `after`) BECAUSE UNDO IS A STATE DELTA, NOT A COMMAND REPLAY
 * (spec §6.1, decision D-fold). Replaying commands backwards would re-run booleans, and boolean
 * topology is not guaranteed identical across runs — so a replay-based undo would silently re-target
 * references across the building. A delta cannot: it restores the recipe, and the recipe rebuilds
 * deterministically.
 */
export interface SceneChange {
  readonly collection: SceneCollection;
  readonly id: string;
  /** Absent ⇒ the entity did not exist (a create). */
  readonly before?: unknown;
  /** Absent ⇒ the entity ceases to exist (a delete). */
  readonly after?: unknown;
}

/** Apply changes forward. Pure: returns a new scene, never mutates. */
export function applyChanges(scene: Scene, changes: readonly SceneChange[]): Scene {
  return changes.reduce(applyOne, scene);
}

/** Apply changes in reverse — this is `undo` (spec §6.1). */
export function revertChanges(scene: Scene, changes: readonly SceneChange[]): Scene {
  return [...changes]
    .reverse()
    .reduce(
      (acc, change) => applyOne(acc, { ...change, before: change.after, after: change.before }),
      scene,
    );
}

function applyOne(scene: Scene, change: SceneChange): Scene {
  const current = scene[change.collection] as Record<string, unknown>;
  const collection: Record<string, unknown> = {};
  // Rebuilt rather than mutated-and-deleted: a delta must never leave a `{ id: undefined }` hole,
  // because that key would survive `JSON.stringify` as nothing and come back on load as a phantom.
  for (const [id, entity] of Object.entries(current)) {
    if (id !== change.id) collection[id] = entity;
  }
  if (change.after !== undefined) collection[change.id] = change.after;
  return { ...scene, [change.collection]: collection };
}

/** Every element hosted BY this one — the windows in this wall. */
export function hostedBy(scene: Scene, hostId: ElementId): readonly Element[] {
  return Object.values(scene.elements).filter((e) => e.hostId === hostId);
}

/** Every element wearing this style — the 400 walls that rebuild when it is edited (D31). */
export function instancesOfStyle(scene: Scene, styleId: StyleId): readonly Element[] {
  return Object.values(scene.elements).filter((e) => e.styleId === styleId);
}

/** Every style that names this section (D33). */
export function stylesUsingSection(scene: Scene, sectionId: SectionId): readonly ElementStyle[] {
  return Object.values(scene.styles).filter((s) => s.sectionId === sectionId);
}

/** Every style with a layer built of this material (D33). */
export function stylesUsingMaterial(scene: Scene, materialId: MaterialId): readonly ElementStyle[] {
  return Object.values(scene.styles).filter((s) =>
    (s.layers ?? []).some((l) => l.materialId === materialId),
  );
}

/**
 * Every element whose geometry is swept from this section — its style names it, so a section edit
 * re-stages its instances (D50 step 0e: the `sections` dependency edge, once "nothing", is now real).
 */
export function elementsUsingSection(scene: Scene, sectionId: SectionId): readonly ElementId[] {
  return stylesUsingSection(scene, sectionId).flatMap((s) =>
    instancesOfStyle(scene, s.id).map((e) => e.id),
  );
}

/** The spatial container chain, root-first: `[Site, Building, Level]` — Planitor's LBS path (D35). */
export function containerPath(
  scene: Scene,
  id: ContainerId | undefined,
): readonly SpatialContainer[] {
  const path: SpatialContainer[] = [];
  let cursor = id;
  const guard = new Set<ContainerId>();
  while (cursor !== undefined && !guard.has(cursor)) {
    guard.add(cursor);
    const container = scene.containers[cursor];
    if (container === undefined) break;
    path.unshift(container);
    cursor = container.parentId;
  }
  return path;
}

/** The elevation of the Level an element sits on, in mm. `0` if it is on none. */
export function elevationOf(scene: Scene, containerId: ContainerId | undefined): number {
  for (const container of [...containerPath(scene, containerId)].reverse()) {
    if (container.elevation !== undefined) return container.elevation;
  }
  return 0;
}

/* ------------------------------------------------------------------------------------------------
 * CONSTRAINT RESOLUTION (D50 step 0b) — the datum bindings, read the same way by the invalidator
 * (`dependency.ts`) and the build (`build.ts`). Kept here so both read ONE resolver, never two.
 * ---------------------------------------------------------------------------------------------- */

/** Every datum constraint owned by an element. */
export function constraintsOf(scene: Scene, elementId: ElementId): readonly DatumConstraint[] {
  return Object.values(scene.constraints).filter((c) => c.element === elementId);
}

/** Elements with a `base`/`top` constraint targeting this Level — the container→element datum edge. */
export function elementsConstrainedToLevel(
  scene: Scene,
  containerId: ContainerId,
): readonly ElementId[] {
  return datumEdges(scene, ['base', 'top'], 'level', containerId);
}

/** Elements with a `grid` constraint on this axis — the grid→element edge (activated in 0b). */
export function elementsConstrainedToGrid(scene: Scene, gridId: GridId): readonly ElementId[] {
  return datumEdges(scene, ['grid'], 'grid', gridId);
}

function datumEdges(
  scene: Scene,
  kinds: readonly Constraint['kind'][],
  targetKind: 'level' | 'grid',
  targetId: string,
): readonly ElementId[] {
  return Object.values(scene.constraints)
    .filter(
      (c) => kinds.includes(c.kind) && c.target.kind === targetKind && c.target.id === targetId,
    )
    .map((c) => c.element);
}

/**
 * Resolve an element's `base`/`top` constraints to absolute elevations (offset folded in). Either side is
 * `undefined` when the element has no constraint of that kind — the build then falls back to its own
 * container elevation + a `height` param, which is byte-identical to the pre-0b behaviour.
 */
export function datumElevations(
  scene: Scene,
  elementId: ElementId,
): { base?: number; top?: number } {
  const result: { base?: number; top?: number } = {};
  for (const c of constraintsOf(scene, elementId)) {
    if (c.target.kind !== 'level') continue;
    const z = elevationOf(scene, c.target.id) + (c.offset ?? 0);
    if (c.kind === 'base') result.base = z;
    if (c.kind === 'top') result.top = z;
  }
  return result;
}

/**
 * Resolve an element's `grid` constraints to an (x, y) placement point — the intersection of the axes it is
 * bound to. A grid `axis: 'x'` line runs along X at `offset` in Y (and vice-versa), so the `y`-axis grid
 * fixes X and the `x`-axis grid fixes Y. `undefined` unless the element is bound to at least one grid of
 * each orientation (or the coordinate it does fix, with the other left at 0 — a single-axis binding).
 */
export function gridPointOf(
  scene: Scene,
  elementId: ElementId,
): readonly [number, number] | undefined {
  let x: number | undefined;
  let y: number | undefined;
  for (const c of constraintsOf(scene, elementId)) {
    if (c.kind !== 'grid' || c.target.kind !== 'grid') continue;
    const grid = scene.grids[c.target.id];
    if (grid === undefined) continue;
    if (grid.axis === 'y') x = grid.offset; // a line running along Y is fixed in X
    if (grid.axis === 'x') y = grid.offset; // a line running along X is fixed in Y
  }
  if (x === undefined && y === undefined) return undefined;
  return [x ?? 0, y ?? 0];
}
