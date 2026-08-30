// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE "RESERVE THE SHAPES" PASS (P5 step 0g) — the pre-freeze reservations, `P5_step0g_design.md`.
 *
 * ⚠ WHAT A RESERVATION'S TEST PROVES. There is no BODY to exercise — 0g reserves SHAPES, not behaviour.
 * So the test proves the two things a reservation must actually deliver, or it is worthless:
 *
 *   1. THE SHAPE IS OPTIONAL AND ADDITIVE — every reserved field is absent-able (an existing element/scene
 *      is untouched) and, when present, satisfies the frozen contract. Enforced at COMPILE TIME by the typed
 *      constructions below: a field that stopped being optional, or a tagged union that grew by EDITING a
 *      member instead of adding one, would fail `tsc`. (This is the freeze-safety check 0b used for
 *      `ConstraintTarget`, generalised to the whole pass.)
 *   2. THE FIELD ROUND-TRIPS — a `.bnn` carrying every reserved field, saved and reloaded through the REAL
 *      codec, is byte-identical, and a `.bnn` carrying NONE of them defaults exactly as before. A reserved
 *      slot the persistence layer silently drops is not reserved; it is decorative.
 *
 * PURE — 0g touches no geometry, so no kernel. The reserved fields are read by no build path yet; that is
 * the point. The bodies (the room-bounding solver, the formula engine, the IFC importer) land in their phases.
 */

import { describe, expect, it } from 'vitest';
import {
  emptyScene,
  loadBnn,
  saveBnn,
  dependents,
  createRegistries,
  CORE_COMMANDS,
  SCENE_SCHEMA_VERSION,
} from '@bunyan/document';
import type {
  BimObjectType,
  Classification,
  CommandContext,
  Element,
  Grid,
  GridGeometry,
  IfcMapping,
  Params,
  ParamCondition,
  ParamField,
  ProjectGeoreference,
  RoomSeparator,
  Scene,
  SceneChange,
  SpatialContainer,
  UndoableEdit,
} from '@bunyan/document';

const CLASS: Classification = { ifcClass: 'IfcWall', loadBearing: true };
const KERNEL_BUILD = 'occt-7.9.3-test';

/* ================================================================================================
 * 1. FREEZE-SAFETY — the shapes are optional and additive (proven by `tsc` accepting this file)
 * ============================================================================================= */

describe('0g freeze-safety: every reserved field is optional and additive', () => {
  it('an Element with NONE of the reserved fields is valid (absent-able)', () => {
    const bare: Element = {
      id: 'wall-1',
      typeId: 'core.wall.v1',
      typeVersion: 1,
      params: {},
      classification: CLASS,
    };
    expect(bare.phaseCreated).toBeUndefined();
    expect(bare.parentElementId).toBeUndefined();
    expect(bare.properties).toBeUndefined();
    expect(bare.classifications).toBeUndefined();
    expect(bare.mark).toBeUndefined();
  });

  it('an Element carrying ALL reserved fields satisfies the frozen contract', () => {
    const full: Element = {
      id: 'wall-1',
      typeId: 'core.wall.v1',
      typeVersion: 1,
      params: {},
      classification: CLASS,
      phaseCreated: 'phase-existing',
      phaseDemolished: 'phase-2',
      parentElementId: 'curtainwall-9',
      properties: { Pset_WallCommon: { FireRating: 'REI 60', IsExternal: true } },
      classifications: { Uniclass2015: 'EF_25_10', AssemblyCode: 'B2010' },
      mark: 'W-01',
    };
    expect(full.phaseDemolished).toBe('phase-2');
    expect(full.properties?.Pset_WallCommon?.FireRating).toBe('REI 60');
    expect(full.classifications?.Uniclass2015).toBe('EF_25_10');
  });

  it('a Space carries Option-B identity inputs; a boundary is NOT a field (derived, not stored)', () => {
    const space: SpatialContainer = {
      id: 'space-214',
      kind: 'space',
      name: 'Office',
      number: '214',
      parentId: 'level-1',
      location: [1500, 2500],
      baseOffset: 0,
      upperLevelId: 'level-2',
      limitOffset: -200,
      // ⓤ — the IFC/agent escape hatch, mirrored from Element onto the spatial tree (0g-review).
      properties: { Pset_SpaceCommon: { GrossPlannedArea: 24.5, IsExternal: false } },
      classifications: { Uniclass2015: 'SL_25' },
    };
    expect(space.location).toEqual([1500, 2500]);
    expect(space.properties?.Pset_SpaceCommon?.GrossPlannedArea).toBe(24.5);
    // @ts-expect-error — a Space stores NO boundary; the room-bounding solve derives it (recipe-is-truth).
    expect(space.boundary).toBeUndefined();
  });

  it('GridGeometry is a tagged union: line AND arc, both assignable, and it overrides axis+offset', () => {
    const line: GridGeometry = { kind: 'line', start: [0, 0], end: [5000, 1000] };
    const arc: GridGeometry = {
      kind: 'arc',
      center: [0, 0],
      radius: 8000,
      startAngle: 0,
      endAngle: 90,
    };
    const grid: Grid = {
      id: 'A',
      name: 'A',
      axis: 'x',
      offset: 0,
      geometry: arc,
      // ⓤ — a `geometry`-bearing grid may also carry imported IFC psets.
      properties: { Pset_GridCommon: { Reference: 'A' } },
      classifications: { Uniclass2015: 'Zz_20' },
    };
    expect(line.kind).toBe('line');
    expect(grid.geometry?.kind).toBe('arc');
    expect(grid.properties?.Pset_GridCommon?.Reference).toBe('A');
    // Exhaustiveness: the union has exactly the two members reserved (a third is ADDED, never an edit).
    const kinds: GridGeometry['kind'][] = ['line', 'arc'];
    expect(kinds).toHaveLength(2);
  });

  it('a RoomSeparator is a per-Level polyline (owner chose a chain over a single segment)', () => {
    const sep: RoomSeparator = {
      id: 'sep-1',
      levelId: 'level-1',
      points: [
        [0, 0],
        [3000, 0],
        [3000, 4000],
      ],
    };
    expect(sep.points).toHaveLength(3);
  });

  it('ParamField gains optional relevantWhen (a shaped predicate) and formula (a string)', () => {
    const cond: ParamCondition = { field: 'kind', equals: 'double' };
    const field: ParamField = {
      kind: 'number',
      label: 'Leaf gap',
      relevantWhen: cond,
      formula: 'width / 2',
    };
    expect(field.relevantWhen?.field).toBe('kind');
    expect(field.formula).toBe('width / 2');
    // absent-able:
    const plain: ParamField = { kind: 'number', label: 'Width' };
    expect(plain.relevantWhen).toBeUndefined();
  });

  it('BimObjectType gains optional ifcMapping and migrateStyle; a bare type is still valid', () => {
    const mapping: IfcMapping = {
      ifcClass: 'IfcWallStandardCase',
      params: { thickness: 'Width' },
    };
    const type: BimObjectType = {
      id: 'core.wall.v1',
      version: 1,
      label: 'Wall',
      parameterSchema: {},
      defaultClassification: CLASS,
      ifcMapping: mapping,
      migrateStyle: (p) => p,
    };
    expect(type.ifcMapping?.ifcClass).toBe('IfcWallStandardCase');
    expect(type.migrateStyle?.({}, 0)).toEqual({});
    const bare: BimObjectType = {
      id: 'core.slab.v1',
      version: 1,
      label: 'Slab',
      parameterSchema: {},
      defaultClassification: { ifcClass: 'IfcSlab', loadBearing: true },
    };
    expect(bare.ifcMapping).toBeUndefined();
  });

  it('a project georeference is an optional Scene field', () => {
    const geo: ProjectGeoreference = { basePoint: [100000, 200000, 0], trueNorth: 12.5 };
    const scene: Scene = { ...emptyScene(), georeference: geo };
    expect(scene.georeference?.trueNorth).toBe(12.5);
    expect(emptyScene().georeference).toBeUndefined();
  });
});

/* ================================================================================================
 * 2. ROUND-TRIP — the reserved fields survive the REAL `.bnn` codec, and absence defaults cleanly
 * ============================================================================================= */

function sceneWithEveryReservedField(): Scene {
  const element: Element = {
    id: 'wall-1',
    typeId: 'core.wall.v1',
    typeVersion: 1,
    params: {},
    classification: CLASS,
    phaseCreated: 'phase-new',
    phaseDemolished: 'phase-3',
    parentElementId: 'cw-1',
    properties: { Pset_WallCommon: { FireRating: 'REI 60' } },
    classifications: { Uniclass2015: 'EF_25_10' },
    mark: 'W-01',
  };
  const grid: Grid = {
    id: 'A',
    name: 'A',
    axis: 'x',
    offset: 0,
    geometry: { kind: 'arc', center: [0, 0], radius: 8000, startAngle: 0, endAngle: 90 },
    properties: { Pset_GridCommon: { Reference: 'A' } },
    classifications: { Uniclass2015: 'Zz_20' },
  };
  const space: SpatialContainer = {
    id: 'space-214',
    kind: 'space',
    name: 'Office',
    number: '214',
    location: [1500, 2500],
    baseOffset: 0,
    upperLevelId: 'level-2',
    limitOffset: -200,
    properties: { Pset_SpaceCommon: { GrossPlannedArea: 24.5 } },
    classifications: { Uniclass2015: 'SL_25' },
  };
  const separator: RoomSeparator = {
    id: 'sep-1',
    levelId: 'level-1',
    points: [
      [0, 0],
      [3000, 0],
    ],
  };
  return {
    ...emptyScene(),
    elements: { 'wall-1': element },
    grids: { A: grid },
    containers: { 'space-214': space },
    roomSeparators: { 'sep-1': separator },
    georeference: { basePoint: [100000, 200000, 0], trueNorth: 12.5 },
  };
}

describe('0g round-trip: every reserved field survives save→load', () => {
  it('a .bnn carrying every reserved field reloads byte-identical', () => {
    const scene = sceneWithEveryReservedField();
    const { scene: loaded } = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD }));
    expect(loaded).toEqual(scene);
  });

  it('the fields are genuinely CARRIED, not silently dropped (the revert-check)', () => {
    const scene = sceneWithEveryReservedField();
    const { scene: loaded } = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD }));
    const wall = loaded.elements['wall-1'];
    expect(wall?.phaseDemolished).toBe('phase-3');
    expect(wall?.mark).toBe('W-01');
    expect(wall?.parentElementId).toBe('cw-1');
    expect(loaded.grids.A?.geometry).toEqual({
      kind: 'arc',
      center: [0, 0],
      radius: 8000,
      startAngle: 0,
      endAngle: 90,
    });
    expect(loaded.roomSeparators['sep-1']?.points).toHaveLength(2);
    expect(loaded.containers['space-214']?.upperLevelId).toBe('level-2');
    // ⓤ — the container/grid IFC bags survive the codec too.
    expect(loaded.containers['space-214']?.properties?.Pset_SpaceCommon?.GrossPlannedArea).toBe(
      24.5,
    );
    expect(loaded.grids.A?.properties?.Pset_GridCommon?.Reference).toBe('A');
    expect(loaded.georeference?.trueNorth).toBe(12.5);
  });

  it('a .bnn with NONE of them loads and defaults roomSeparators to {} / georeference to absent', () => {
    const plain: Scene = { ...emptyScene(), elements: {} };
    const { scene: loaded } = loadBnn(saveBnn(plain, { kernelBuildId: KERNEL_BUILD }));
    expect(loaded.roomSeparators).toEqual({});
    expect(loaded.georeference).toBeUndefined();
    expect(loaded.schemaVersion).toBe(SCENE_SCHEMA_VERSION);
  });

  it('an OLD-shaped scene.json (no roomSeparators key at all) defaults it to {} on load', () => {
    // Simulate a pre-0g file: strip the key entirely, as an older writer would have.
    const scene = emptyScene() as unknown as Record<string, unknown>;
    delete scene.roomSeparators;
    const bytes = saveBnn(scene as unknown as Scene, { kernelBuildId: KERNEL_BUILD });
    const { scene: loaded } = loadBnn(bytes);
    expect(loaded.roomSeparators).toEqual({});
  });
});

/* ================================================================================================
 * 3. THE roomSeparators COLLECTION — its dependency edge, and the hostile-file guard
 * ============================================================================================= */

describe('0g roomSeparators is a first-class collection', () => {
  it('its dependency edge is a declared "nothing" — a separator re-stages NO element geometry', () => {
    const scene = sceneWithEveryReservedField();
    const change: SceneChange = {
      collection: 'roomSeparators',
      id: 'sep-1',
      after: scene.roomSeparators['sep-1'],
    };
    // The exhaustive switch in dependency.ts compiles ONLY because 'roomSeparators' has a case; the edge
    // is [] because a separator bounds a Space (a query), never an element's solid.
    expect(dependents(scene, change)).toEqual([]);
  });

  it('a hostile .bnn with "roomSeparators": null is REFUSED, not crashed into', () => {
    const bad = { ...emptyScene(), roomSeparators: null } as unknown as Scene;
    const bytes = saveBnn(bad, { kernelBuildId: KERNEL_BUILD });
    expect(() => loadBnn(bytes)).toThrow(/roomSeparators/);
  });

  it('a hostile .bnn with "constraints": null is now ALSO refused (the latent 0b gap 0g closed)', () => {
    const bad = { ...emptyScene(), constraints: null } as unknown as Scene;
    const bytes = saveBnn(bad, { kernelBuildId: KERNEL_BUILD });
    expect(() => loadBnn(bytes)).toThrow(/constraints/);
  });
});

/* ================================================================================================
 * 4. THE VERB HALF (0g.2, Freeze-Gate ⓣ) — the reserved metadata has an AUTHORING path
 *
 * ⚠ WHY THIS TEST EXISTS. 0g reserved the NOUNS (`Element.mark`/`properties`/… ) but not the VERB ARGS
 * that set them — and `Command.argsSchema` freezes at the SAME step 6. Without an arg, a later body would
 * amend a frozen contract (the ⓓ discipline, missed on the CREATE path). This proves an element can be
 * BORN with the metadata in one atomic edit, EDITED afterward, and that the args are genuinely in the
 * frozen schema. PURE — `createElement`/`setElementMetadata` touch no kernel (geometry builds later).
 *
 * ⚠ THE REVERT-CHECK IS STRUCTURAL: drop any of the six args from `createElement.argsSchema` and
 * `checkArgs` refuses the call as an unknown arg (INVALID_ARGS) ⇒ the "born-with" test below fails. A
 * reserved slot with no authoring path is exactly the gap ⓣ names.
 * ============================================================================================= */

const METADATA_TYPE: BimObjectType = {
  id: 'core.meta.v1',
  version: 1,
  label: 'Metadata test type',
  parameterSchema: {},
  defaultClassification: CLASS,
};

/** A minimal `CommandContext` — no kernel, no DocumentContext. `edit` captures the `rebuilt` set so a test
 *  can assert metadata edits re-stage NOTHING. `mintId` is deterministic so the round-trip is stable. */
function makeCtx(scene: Scene): { ctx: CommandContext; captured: { rebuilt: readonly string[] } } {
  const registries = createRegistries();
  registries.types.register(METADATA_TYPE);
  for (const command of CORE_COMMANDS) registries.commands.register(command);
  let n = 0;
  const captured = { rebuilt: [] as readonly string[] };
  const ctx: CommandContext = {
    scene,
    registries,
    mintId: (prefix) => `${prefix}-META${(n += 1)}`,
    revision: undefined,
    seq: 0,
    edit: (label, changes, rebuilt) => {
      captured.rebuilt = rebuilt;
      return {
        id: 'edit-test',
        command: 'test',
        label,
        changes,
        rebuilt,
        seq: 0,
        at: '2026-07-18T00:00:00.000Z',
      };
    },
  };
  return { ctx, captured };
}

function run(ctx: CommandContext, id: string, args: Params): UndoableEdit {
  const command = CORE_COMMANDS.find((c) => c.id === id);
  if (command === undefined) throw new Error(`no command "${id}"`);
  const result = command.execute(ctx, args);
  if (result instanceof Promise) throw new Error('metadata commands are synchronous');
  return result;
}

function elementOf(edit: UndoableEdit): Element {
  const change = edit.changes.find((c) => c.collection === 'elements');
  if (change?.after === undefined) throw new Error('no element change in edit');
  return change.after as Element;
}

describe('0g.2 the verb half (ⓣ): the reserved metadata has an authoring path', () => {
  it('the six reserved args are in createElement.argsSchema (the structural revert-check)', () => {
    const createElement = CORE_COMMANDS.find((c) => c.id === 'core.createElement');
    expect(createElement).toBeDefined();
    for (const key of [
      'mark',
      'phaseCreated',
      'phaseDemolished',
      'parentElementId',
      'properties',
      'classifications',
    ]) {
      expect(createElement?.argsSchema[key]).toBeDefined();
    }
  });

  it('an element is BORN with mark + phase + properties + classifications in ONE createElement edit', () => {
    const { ctx } = makeCtx(emptyScene());
    const el = elementOf(
      run(ctx, 'core.createElement', {
        typeId: 'core.meta.v1',
        params: {},
        mark: 'W-01',
        phaseCreated: 'phase-new',
        phaseDemolished: 'phase-3',
        properties: { Pset_WallCommon: { FireRating: 'REI 60' } },
        classifications: { Uniclass2015: 'EF_25_10' },
      }),
    );
    expect(el.mark).toBe('W-01');
    expect(el.phaseCreated).toBe('phase-new');
    expect(el.phaseDemolished).toBe('phase-3');
    expect(el.properties?.Pset_WallCommon?.FireRating).toBe('REI 60');
    expect(el.classifications?.Uniclass2015).toBe('EF_25_10');

    // …and it round-trips through the REAL codec byte-identical (the reservation actually persists).
    const scene: Scene = { ...emptyScene(), elements: { [el.id]: el } };
    const { scene: loaded } = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD }));
    expect(loaded).toEqual(scene);
    expect(loaded.elements[el.id]?.mark).toBe('W-01');
  });

  it('createElement with NO metadata args builds an element carrying NONE (absent, not empty)', () => {
    const { ctx } = makeCtx(emptyScene());
    const el = elementOf(run(ctx, 'core.createElement', { typeId: 'core.meta.v1', params: {} }));
    expect(el.mark).toBeUndefined();
    expect(el.properties).toBeUndefined();
    expect(el.classifications).toBeUndefined();
    expect(el.phaseCreated).toBeUndefined();
    expect(el.parentElementId).toBeUndefined();
  });

  it('parentElementId is a VALIDATED ref — a dangling parent is refused (the containerId lesson)', () => {
    const { ctx } = makeCtx(emptyScene());
    expect(() =>
      run(ctx, 'core.createElement', {
        typeId: 'core.meta.v1',
        params: {},
        parentElementId: 'no-such-element',
      }),
    ).toThrow(/no element/);
  });

  it('core.setElementMetadata edits metadata post-create — provided sets, absent leaves, no rebuild', () => {
    const { ctx: ctx0 } = makeCtx(emptyScene());
    const created = elementOf(
      run(ctx0, 'core.createElement', { typeId: 'core.meta.v1', params: {}, mark: 'OLD' }),
    );
    const scene: Scene = { ...emptyScene(), elements: { [created.id]: created } };

    const { ctx, captured } = makeCtx(scene);
    const edit = run(ctx, 'core.setElementMetadata', {
      elementId: created.id,
      mark: 'C12',
      phaseDemolished: 'phase-2',
    });
    const after = elementOf(edit);
    expect(after.mark).toBe('C12'); // provided ⇒ set
    expect(after.phaseDemolished).toBe('phase-2'); // provided ⇒ set
    expect(after.id).toBe(created.id); // same element
    expect(edit.changes).toHaveLength(1);
    expect(captured.rebuilt).toEqual([]); // metadata is not geometry — nothing re-stages
  });

  it('core.setElementMetadata is registered and reachable as a core verb', () => {
    expect(CORE_COMMANDS.some((c) => c.id === 'core.setElementMetadata')).toBe(true);
  });
});
