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
  ContainerId,
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

/** Bumped when `scene.json`'s own shape changes (not a type's — that is `element.typeVersion`). */
export const SCENE_SCHEMA_VERSION = 1;

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
    brokenRefs: [],
  };
}

/** The collections a `SceneChange` can touch. Undo is a diff over these (spec §6.1). */
export type SceneCollection =
  'elements' | 'styles' | 'materials' | 'sections' | 'containers' | 'grids';

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
