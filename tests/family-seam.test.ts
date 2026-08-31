// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D61 — THE FAMILY-DEFINITION DATA-FORMAT SEAM (Freeze-Gate row Ⓓ; `P5_step5D_family_seam_design.md`).
 * Owner-ruled 2026-07-22: Q1 = embedded in `scene.json`; Q2 = a FULLY-SHAPED grammar now; Q3 = prefixed ULID.
 *
 * ⚠ THE FREEZE QUESTION Ⓓ ANSWERS. Revit's moat is families authored as DATA, not code (Parity-D). A data
 * family produces a TYPE and an element references a type and a `.bnn` must be self-contained (rule 15) — all
 * three freeze at P5. This file proves the reserved surface is (1) OPTIONAL + ADDITIVE, (2) ROUND-TRIPS
 * embedded in the `.bnn`, and (3) — the §1b sufficiency proof — is ENOUGH to drive a REAL element vs OCCT
 * with **ZERO new `BimObjectType` field**: a data family is a `BimObjectType` a loader produces from the
 * definition. The loader/resolver/CRUD/library are Parity-D and additive; no body reads a family in v1.0.0.
 *
 * ⚠⚠ THE SUFFICIENCY TEST BUILDS FROM THE ROUND-TRIPPED DEFINITION — so it proves R1 (the definition travels
 * in the `.bnn`) and F3 (it drives a real OCCT build with no frozen change) in one shot. REVERT-VERIFY: drop
 * `families` from the `Scene` type / neuter the codec spread ⇒ `loaded.families` is undefined ⇒ the reloaded
 * definition is gone ⇒ `makeFamilyType` throws ⇒ both the round-trip test AND the OCCT build test fail.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  createRegistries,
  emptyScene,
  loadBnn,
  mintPei,
  saveBnn,
} from '@bunyan/document';
import type {
  BimObjectType,
  BuildContext,
  BuiltPart,
  FamilyChildPlacement, // exercised in the grammar-completeness fixture below
  FamilyDefinition,
  FamilyHosting,
  FamilyModifier,
  FamilyValue,
  Params,
  Scene,
} from '@bunyan/document';

const KERNEL_BUILD = 'occt-7.9.3-test';

// A two-part standalone family: a `body` box (w×d×h) + a `cap` box (w×d×capH) — enough to prove ordered
// parts (D30), per-part materials (D33), and parametric dimensions (every size is a param ref).
const W = 800;
const D = 400;
const HGT = 1000;
const CAP_H = 120;
const CONCRETE_RHO = 2400;
const STEEL_RHO = 7850;

/** A fully-shaped standalone family definition — every scalar is a param ref, so it is genuinely parametric. */
function pedestalFamily(): FamilyDefinition {
  const wRef: FamilyValue = { param: 'w' };
  const dRef: FamilyValue = { param: 'd' };
  return {
    id: mintPei('family'), // Q3 — a prefixed ULID, collision-impossible across authors
    label: 'Concrete Pedestal',
    description:
      'A data-authored two-part element — proves the family grammar drives real geometry.',
    formatVersion: 1,
    parameterSchema: {
      w: { kind: 'number', label: 'Width', unit: 'mm', default: W },
      d: { kind: 'number', label: 'Depth', unit: 'mm', default: D },
      h: { kind: 'number', label: 'Height', unit: 'mm', default: HGT },
      capH: { kind: 'number', label: 'Cap height', unit: 'mm', default: CAP_H },
    },
    defaultClassification: { ifcClass: 'IfcBuildingElementProxy', loadBearing: false },
    defaultDiscipline: 'architectural',
    parts: [
      {
        name: 'body',
        materialId: 'concrete',
        discipline: 'structural',
        base: { op: 'box', size: [wRef, dRef, { param: 'h' }] },
      },
      {
        name: 'cap',
        materialId: 'steel',
        base: { op: 'box', size: [wRef, dRef, { param: 'capH' }] },
      },
    ],
  };
}

/**
 * ⚠ A MINIMAL IN-TEST INTERPRETER — the executable proof the frozen shapes suffice (the Ⓒ discipline: it
 * lives in the TEST, not the package; no `familyFormat` loader ships in v1.0.0). It turns a `FamilyDefinition`
 * into a `BimObjectType` by CLOSING OVER `def` — which is exactly why a data family needs NO new frozen field
 * (F3). Handles the `box` primitive; the pedestal fixture is boxes so the measured volume is exact.
 */
function makeFamilyType(def: FamilyDefinition): BimObjectType {
  const resolve = (v: FamilyValue, params: Params): number =>
    typeof v === 'number' ? v : Number(params[v.param]);
  return {
    id: def.id, // a family produces a Type; its FamilyId doubles as the TypeId
    version: def.formatVersion,
    label: def.label,
    ...(def.description === undefined ? {} : { description: def.description }),
    parameterSchema: def.parameterSchema,
    defaultClassification: def.defaultClassification,
    ...(def.defaultDiscipline === undefined ? {} : { defaultDiscipline: def.defaultDiscipline }),
    buildGeometry: async (ctx: BuildContext): Promise<readonly BuiltPart[]> => {
      const parts: BuiltPart[] = [];
      for (const part of def.parts ?? []) {
        if (part.base.op !== 'box')
          throw new Error('test interpreter handles the box primitive only');
        const [dx, dy, dz] = part.base.size.map((s) => resolve(s, ctx.params)) as [
          number,
          number,
          number,
        ];
        const nodeId = ctx.nodeId(part.name);
        const solid = await ctx.geometry.request('makeBox', { nodeId, dx, dy, dz });
        parts.push({
          name: part.name,
          materialId: part.materialId,
          discipline: part.discipline ?? ctx.defaultDiscipline,
          nodeId,
          handle: solid.handle,
          refs: solid.refs,
        });
      }
      return parts;
    },
  };
}

/* ================================================================================================
 * PART 1 — THE SEAM IS SUFFICIENT (F3): a data family builds a REAL element vs OCCT, no frozen field.
 * ============================================================================================= */

describe('Ⓓ family seam — a data family drives a real OCCT build (built FROM the round-tripped .bnn)', () => {
  let kernel: OcctKernel;
  let client: KernelClient;

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  });
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  it('⭐ a FamilyDefinition → makeFamilyType → a BimObjectType → a built element with exact quantities', async () => {
    const family = pedestalFamily();

    // Embed it in a scene, save + reload — the interpreter consumes the RELOADED definition, so this
    // proves the definition TRAVELS (R1) and is SUFFICIENT (F3) together.
    const scene: Scene = { ...emptyScene(), families: { [family.id]: family } };
    const { scene: loaded } = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD }));
    const reloaded = loaded.families![family.id]!;
    expect(reloaded).toEqual(family); // round-trip, byte-identical

    // Build an element of the PRODUCED type — with ZERO new BimObjectType field (F3).
    const registries = createRegistries();
    registries.types.register(makeFamilyType(reloaded));
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });

    await doc.execute('core.createMaterial', {
      id: 'concrete',
      name: 'C25/30',
      category: 'concrete',
      density: CONCRETE_RHO,
    });
    await doc.execute('core.createMaterial', {
      id: 'steel',
      name: 'S235',
      category: 'steel',
      density: STEEL_RHO,
    });

    const id = (
      await doc.execute('core.createElement', {
        typeId: family.id,
        params: { w: W, d: D, h: HGT, capH: CAP_H },
      })
    ).changes[0]!.id;

    expect(doc.brokenRefs()).toHaveLength(0);

    // Ordered parts (D30), each with its own material + discipline.
    const parts = doc.partsOf(id)!;
    expect(parts.map((p) => p.name)).toEqual(['body', 'cap']);

    // ⭐ EXACT quantities from the B-Rep (not the mesh) — the data family is a real element (rule 15).
    const q = await doc.quantities(id);
    const body = q.parts.find((p) => p.name === 'body')!;
    const cap = q.parts.find((p) => p.name === 'cap')!;
    expect(body.volume).toBeCloseTo(W * D * HGT, 0);
    expect(cap.volume).toBeCloseTo(W * D * CAP_H, 0);
    expect(body.mass).toBeCloseTo(((W * D * HGT) / 1e9) * CONCRETE_RHO, 3);
    expect(cap.mass).toBeCloseTo(((W * D * CAP_H) / 1e9) * STEEL_RHO, 3);
    expect(q.basis).toBe('exact'); // rule 15 — a data family reports MEASURED quantities, never estimates
  });

  it('⚠ a data family is ASSOCIATIVE like any element — a param edit re-derives its geometry', async () => {
    const family = pedestalFamily();
    const registries = createRegistries();
    registries.types.register(makeFamilyType(family));
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });
    await doc.execute('core.createMaterial', {
      id: 'concrete',
      name: 'C25/30',
      category: 'concrete',
      density: CONCRETE_RHO,
    });
    await doc.execute('core.createMaterial', {
      id: 'steel',
      name: 'S235',
      category: 'steel',
      density: STEEL_RHO,
    });
    const id = (
      await doc.execute('core.createElement', {
        typeId: family.id,
        params: { w: W, d: D, h: HGT, capH: CAP_H },
      })
    ).changes[0]!.id;

    await doc.execute('core.setParams', { elementId: id, params: { h: 1500 } });
    const q = await doc.quantities(id);
    expect(q.parts.find((p) => p.name === 'body')!.volume).toBeCloseTo(W * D * 1500, 0);
  });
});

/* ================================================================================================
 * PART 2 — THE RESERVATION IS OPTIONAL + ADDITIVE + ROUND-TRIPS (pure — the reserve-shapes doctrine)
 * ============================================================================================= */

describe('Ⓓ family seam — the reservation is optional, additive, and round-trips (pure)', () => {
  it('a .bnn carrying NO families defaults exactly as before (absent, not empty)', () => {
    const { scene: loaded } = loadBnn(saveBnn(emptyScene(), { kernelBuildId: KERNEL_BUILD }));
    expect(loaded.families).toBeUndefined();
    // Every existing collection is byte-identical to today (no SCENE_SCHEMA_VERSION bump).
    expect(loaded.schemaVersion).toBe(emptyScene().schemaVersion);
    expect(loaded.elements).toEqual({});
  });

  it('⚠ the FULLY-SHAPED grammar round-trips byte-identical — every union member (parts + modifier + child + hosting)', () => {
    // A definition that exercises the WHOLE grammar: a sketch profile, a polygon profile, a revolve, a
    // modifier, a nested child (D59), and the hosted half (a data door). Nothing builds it here — this is
    // the shape-completeness + round-trip proof, the reserve-shapes doctrine (no body reads it in v1.0.0).
    const child: FamilyChildPlacement = {
      slot: 'panel.r0c0',
      typeId: 'core.curtainwall.panel',
      params: { at: { param: 'origin' }, dx: 950 },
      classification: { ifcClass: 'IfcPlate', loadBearing: false },
      name: 'Panel',
    };
    const chamfer: FamilyModifier = {
      op: 'chamfer',
      distance: { param: 'cham' },
      edges: { by: 'all' },
    };
    const hosting: FamilyHosting = {
      cutsHost: true,
      voidPrimitive: { op: 'box', size: [{ param: 'ow' }, 500, { param: 'oh' }] },
      leafParts: [
        {
          name: 'leaf',
          materialId: 'timber',
          base: { op: 'extrude', profile: { kind: 'polygon', profile: leafProfile() }, height: 40 },
        },
      ],
    };
    const full: FamilyDefinition = {
      id: mintPei('family'),
      label: 'Grammar-completeness fixture',
      formatVersion: 3,
      parameterSchema: {
        origin: { kind: 'point', label: 'Origin' },
        cham: { kind: 'number', label: 'Chamfer', unit: 'mm', default: 10 },
        ow: { kind: 'number', label: 'Opening width', unit: 'mm', default: 900 },
        oh: { kind: 'number', label: 'Opening height', unit: 'mm', default: 2100 },
      },
      defaultClassification: { ifcClass: 'IfcDoor', loadBearing: false },
      parts: [
        {
          name: 'post',
          materialId: 'steel',
          base: {
            op: 'revolve',
            profile: { kind: 'sketch', sketch: { points: [], segments: [] } },
            angle: { param: 'cham' },
          },
          modifiers: [chamfer],
        },
      ],
      children: [child],
      hosting,
    };

    const scene: Scene = { ...emptyScene(), families: { [full.id]: full } };
    const { scene: loaded } = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD }));
    expect(loaded.families).toEqual(scene.families);
  });
});

/** A trivial closed triangle in the XY plane — a `polygon` FamilyProfile for the leaf. */
function leafProfile() {
  return {
    plane: { origin: [0, 0, 0], normal: [0, 0, 1], xAxis: [1, 0, 0] },
    start: [0, 0],
    segments: [
      { kind: 'line', to: [100, 0] },
      { kind: 'line', to: [0, 100] },
      { kind: 'line', to: [0, 0] },
    ],
  } as const;
}
