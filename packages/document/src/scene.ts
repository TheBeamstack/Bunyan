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
  RoomSeparator,
  RoomSeparatorId,
  Section,
  SectionId,
  SketchConstraint,
  SpatialContainer,
  StyleId,
} from './entities.js';
import { isDatumConstraint, isSketchConstraint } from './entities.js';
import type {
  Annotation,
  AnnotationId,
  ScheduleDefinition,
  ScheduleId,
  Sheet,
  SheetId,
  ViewDescriptor,
  ViewId,
} from './documentation.js';
import type { FamilyDefinition, FamilyId } from './families.js';
import type { SystemDefinition, SystemId } from './systems.js';
import type { DesignOption, DesignOptionId } from './designoptions.js';

/**
 * Bumped when `scene.json`'s own shape changes (not a type's — that is `element.typeVersion`).
 * - v1 → v2 (D50 step 0b): added the first-class `constraints` collection (D53). A v1 file has no
 *   `constraints` key; the loader defaults it to `{}`, so old `.bnn` files open unchanged.
 * - v2 (P5 step 0g): `roomSeparators` + `georeference` were FOLDED IN without a bump — pre-freeze the
 *   schema is release-candidate (no shipped v2 file distinguishes their absence), and both are
 *   absent-defaulted by `emptyScene()` on load, so no migration is needed. They freeze into v2 at P5.
 */
export const SCENE_SCHEMA_VERSION = 2;

/**
 * ⚠ RESERVED (Freeze-Gate ⓚ, `P5_step0g_design.md` §6). The project's placement in the world — a survey
 * base point + true north — for multi-building coordination and IFC georeferencing (`IfcMapConversion` /
 * `IfcProjectedCRS`). Shaped-but-open: IFC/GIS fields (CRS name, easting/northing) are additive members.
 */
export interface ProjectGeoreference {
  /** Survey point in world coordinates, mm — the model origin's true location. */
  readonly basePoint: readonly [number, number, number];
  /** Clockwise rotation from world +Y to true north, degrees. */
  readonly trueNorth: number;
}

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
  /**
   * ⚠ RESERVED (owner-ruled 2026-07-17, `P5_step0g_design.md` §8.2). Room SEPARATION LINES — 2D polylines
   * that bound a `Space` where no wall runs. A first-class collection so it participates in undo and the
   * dependency graph (its geometry edge is a declared "nothing" — a separator re-bounds a room, a query, not
   * an element's solid). No command authors one in 0g; the CRUD lands with the room-bounding solver (v1.0.0).
   */
  readonly roomSeparators: Readonly<Record<RoomSeparatorId, RoomSeparator>>;
  /**
   * ⚠ RESERVED (Freeze-Gate ⓚ). The project's georeference — base point + true north. Absent ⇒ the model is
   * in its own local frame at the origin (today's behaviour, and the common case). An OPTIONAL field, not a
   * collection: no default row, so no `emptyScene` entry and no `SceneCollection` member.
   */
  readonly georeference?: ProjectGeoreference;
  /* ----------------------------------------------------------------------------------------------
   * THE DOCUMENTATION LAYER — RESERVED (D58, Freeze-Gate row Ⓐ; `P5_step5A_documentation_anchoring_
   * design.md`; `documentation.ts`). A drawing is a LIVE PROJECTION of the B-Rep (`core_logic.md` rule 17):
   * the projected 2D geometry is DERIVED and never stored — only the DEFINITION (a cut plane, an anchor set,
   * a filter + columns) lives here. v1.0.0 ships a MINIMAL body in P6 (one plan + one section + one schedule);
   * the full apparatus is Parity-B. No body authors or reads these yet.
   *
   * ⚠ FOUR OPTIONAL COLLECTIONS, ABSENT-DEFAULTED (the `georeference` precedent, NOT `roomSeparators`):
   * absent ⇒ no documentation (today's behaviour). TOP-LEVEL (not a nested `documentation?` bag) so each is
   * promotable to a full `SceneCollection` ADDITIVELY when its CRUD lands (the flat-key undo machinery
   * indexes `scene[key]`): its body adds the `emptyScene` entry + the `isPlainObject` guard + the dependency
   * edge in the same additive step. No `SCENE_SCHEMA_VERSION` bump (they fold into the frozen v2, exactly as
   * 0g's reservations).
   *
   * ⚠⚠ `schedules` IS NOW PROMOTED (Entry 68, D58 row Ⓐ's CRUD — `core.createSchedule`/`updateSchedule`/
   * `deleteSchedule`): it is a `SceneCollection` member and a guarded key, so it participates in undo and
   * the dependency graph like any other collection. ⚠ TWO of the three steps this comment predicted, not
   * three: **no `emptyScene()` entry.** The collection materialises on first authoring (`applyOne`), so a
   * document with no schedules is byte-identical to one written before this entry, and all four
   * documentation collections keep ONE rule — absent ⇒ none of it. `views`/`annotations`/`sheets` remain
   * pure reservations (no body authors or reads them yet).
   * -------------------------------------------------------------------------------------------- */
  readonly views?: Readonly<Record<ViewId, ViewDescriptor>>;
  readonly annotations?: Readonly<Record<AnnotationId, Annotation>>;
  readonly schedules?: Readonly<Record<ScheduleId, ScheduleDefinition>>;
  readonly sheets?: Readonly<Record<SheetId, Sheet>>;
  /* ----------------------------------------------------------------------------------------------
   * THE FAMILY LAYER — RESERVED (D61, Freeze-Gate row Ⓓ; `P5_step5D_family_seam_design.md`; `families.ts`).
   * A family is a building-element type authored as DATA, not code (Revit's Family Editor moat, Parity-D).
   * The DEFINITION is EMBEDDED here (owner Q1) so a `.bnn` is self-contained — a family-typed element on a
   * machine without the family's code STILL builds, exactly why materials are embedded (rule 15). The library/
   * registry is the palette; a document embeds copies of the families it uses (the materials/sections dual).
   *
   * ⚠ ONE OPTIONAL COLLECTION, ABSENT-DEFAULTED (the `views`/documentation precedent, NOT `roomSeparators`):
   * absent ⇒ no data-families (today's only case). NOT in `emptyScene()`, NOT in `SceneCollection`, NOT in the
   * hostile-`.bnn` guard, NOT in the dependency graph — because in v1.0.0 no body authors, reads, invalidates,
   * or undoes a family (the loader/resolver/CRUD are Parity-D). TOP-LEVEL so it is promotable to a full
   * `SceneCollection` ADDITIVELY when Parity-D's CRUD lands (add the `emptyScene` entry + the `isPlainObject`
   * guard row + the "a family edit rebuilds its instances" dependency edge, one additive step). No
   * `SCENE_SCHEMA_VERSION` bump (it folds into frozen v2, exactly as 0g's / Ⓐ's reservations).
   * -------------------------------------------------------------------------------------------- */
  readonly families?: Readonly<Record<FamilyId, FamilyDefinition>>;
  /* ----------------------------------------------------------------------------------------------
   * ROW Ⓕ — THE LAST PRE-FREEZE RESERVATIONS (2026-07-24, owner-ruled; `P5_step5F_reservations_design.md`).
   * Both follow the `families`/`views` precedent EXACTLY: one optional, absent-defaulted, TOP-LEVEL
   * collection each — NOT in `emptyScene()`, NOT in `SceneCollection`, NOT in the hostile-`.bnn` guard, NOT
   * in the dependency graph, because no body authors/reads/invalidates/undoes one in v1.0.0. Promotable to a
   * full `SceneCollection` additively when their bodies land. **No `SCENE_SCHEMA_VERSION` bump.**
   * -------------------------------------------------------------------------------------------- */
  /**
   * MEP NETWORKS — RESERVED (D62, Parity-C; `systems.ts`). The named systems (`SA-1`, `CWS`) elements are
   * grouped into. A shared DEFINITION rather than a string per element, for the D33 reason: a value that
   * must be grouped, scheduled and read downstream cannot be a copy. Absent ⇒ no systems (today's case).
   * ⚠ The GEOMETRY half needs nothing reserved — `sweepAlongPath`/`loft` are additive ops under D13, proven
   * by `faceFrame` landing after the protocol froze.
   */
  readonly systems?: Readonly<Record<SystemId, SystemDefinition>>;
  /**
   * DESIGN OPTIONS (D65, Parity-F; `designoptions.ts`). Parallel design alternatives held in one document.
   * Absent ⇒ no options (the common case). ⚠ **PROMOTED from a pure reservation (D85/Q17a)** —
   * `core.createDesignOption`/`updateDesignOption`/`deleteDesignOption` author it now; see
   * `SceneCollection` below for the promotion's terms.
   *
   * ⚠⚠⚠ THIS COLLECTION CHANGES HOW `elements` MUST BE READ — see `designoptions.ts`. With options present,
   * the document deliberately contains MUTUALLY-EXCLUSIVE elements, so every aggregating/publishing consumer
   * (`quantities()`, the roll-up, the Clean Delta exporter, schedules — and downstream, Planitor and Miqdar)
   * MUST exclude elements whose option is not active (`isElementActive`). That invariant is part of the
   * frozen contract, written in at reserve time — the `Grid.geometry`/ⓥ discipline.
   */
  readonly designOptions?: Readonly<Record<DesignOptionId, DesignOption>>;
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
    roomSeparators: {},
    // ⚠⚠ NOTE WHAT IS NOT HERE: `schedules`, even though Entry 68 made it a full `SceneCollection`. The row
    // Ⓐ design predicted an `emptyScene` entry would land with the CRUD, and building it showed that it
    // should NOT: the collection MATERIALISES ON FIRST AUTHORING (`applyOne` creates it), so a document
    // that has no schedules stays byte-identical to one written before this entry — no new key in every
    // `.bnn`, and the four documentation collections keep ONE uniform rule (absent ⇒ none of it), which is
    // exactly what `tests/documentation-anchoring.test.ts` asserts and what a reservation means.
  };
}

/** The collections a `SceneChange` can touch. Undo is a diff over these (spec §6.1). */
export type SceneCollection =
  | 'elements'
  | 'styles'
  | 'materials'
  | 'sections'
  | 'containers'
  | 'grids'
  | 'constraints'
  | 'roomSeparators'
  /**
   * ⚠ PROMOTED FROM A RESERVATION (Entry 68 — D58 row Ⓐ's CRUD). A schedule is now AUTHORED, so its
   * creation/rename/deletion is an ordinary undoable `SceneChange`, and adding this member forced its
   * rebuild edge to be declared in `dependency.ts` (the exhaustive switch fails to compile until it is —
   * the designed mechanism, Entry 33). `views`/`annotations`/`sheets` follow the same way when their
   * bodies land.
   */
  | 'schedules'
  /**
   * ⚠ PROMOTED FROM A RESERVATION (Entry 77 — D58 row Ⓐ's third unit, D81). Identical terms to
   * `schedules` above, deliberately: a view is now AUTHORED (`core.createView`/`updateView`/
   * `deleteView`), so its creation/rename/deletion is an ordinary undoable `SceneChange`, and adding
   * this member forced its rebuild edge to be declared in `dependency.ts` before this file would
   * compile. `annotations`/`sheets` remain reservations and follow the same way when their bodies land.
   *
   * ⚠⚠ AND NOTE WHAT DID NOT HAPPEN: no `emptyScene()` entry. Entry 68 predicted one and MEASURED that
   * it was wrong (see the comment in `emptyScene` above); this unit did not re-litigate it. A document
   * with no views stays byte-identical, and all four documentation collections keep the one rule —
   * absent ⇒ none of it.
   */
  | 'views'
  /**
   * ⚠ PROMOTED FROM A RESERVATION (D85/Q17a, `docs/design/P5_step6D_design_options_crud_design.md`).
   * A design option is now AUTHORED (`core.createDesignOption`/`updateDesignOption`/
   * `deleteDesignOption`), so its creation/rename/deletion is an ordinary undoable `SceneChange` — the
   * `schedules`/`views` precedent verbatim, including no `emptyScene()` entry (materialises on first
   * authoring; a document with no options stays byte-identical).
   *
   * ⚠⚠ AND UNLIKE `schedules`/`views`, THE DEPENDENCY EDGE IS NOT "NOTHING" (`dependency.ts`'s
   * `designOptions` case). A projection reads the model and the model does not read the projection —
   * that argument does not transfer here: the join resolver and the room solver (D68) read the ACTIVE
   * option selection while BUILDING, so which option is primary changes a built B-Rep.
   */
  | 'designOptions';

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
  // ⚠⚠ `?? {}` — AND IT IS NOT DEFENSIVE PADDING. A `SceneCollection` may be an OPTIONAL field on `Scene`
  // (`schedules`, Entry 68, and every documentation collection that follows it), so a scene that predates
  // the collection — a `.bnn` written last week, a `Scene` a caller assembled by hand — simply has no such
  // key. Measured before this line existed: the FIRST create into an absent collection died with a raw
  // `TypeError: Cannot convert undefined or null to object` out of `Object.entries`, i.e. an untyped crash
  // from the undo machinery where domain rule 4 promises a typed refusal or a clean edit. Creating INTO an
  // absent collection is not an error state; it is the normal first create.
  const current = (scene[change.collection] ?? {}) as Record<string, unknown>;
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

/** Every DATUM constraint owned by an element (the sketch ones are `sketchConstraintsOf`). */
export function constraintsOf(scene: Scene, elementId: ElementId): readonly DatumConstraint[] {
  return Object.values(scene.constraints).filter(
    (c): c is DatumConstraint => c.element === elementId && isDatumConstraint(c),
  );
}

/**
 * Every SKETCH constraint owned by an element — the rules the sketch solver enforces on this element's
 * profile (0d). Kept beside `constraintsOf` so the build resolves both from ONE collection, never two.
 */
export function sketchConstraintsOf(
  scene: Scene,
  elementId: ElementId,
): readonly SketchConstraint[] {
  return Object.values(scene.constraints).filter(
    (c): c is SketchConstraint => c.element === elementId && isSketchConstraint(c),
  );
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
  kinds: readonly DatumConstraint['kind'][],
  targetKind: 'level' | 'grid',
  targetId: string,
): readonly ElementId[] {
  return Object.values(scene.constraints)
    .filter(
      (c) =>
        isDatumConstraint(c) &&
        kinds.includes(c.kind) &&
        c.target.kind === targetKind &&
        c.target.id === targetId,
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
