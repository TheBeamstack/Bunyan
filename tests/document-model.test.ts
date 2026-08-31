// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE DOCUMENT MODEL, ON REAL GEOMETRY (P3 steps 1–2; D30, D31, D33, D35, D36).
 *
 * ⚠ EVERY ASSERTION HERE RUNS AGAINST THE REAL OCCT KERNEL, not the mock. The document layer's whole
 * job is to turn a recipe into solids and quantities, and a fake kernel would prove that it turns a
 * recipe into *fake* solids. The numbers below are millimetres of actual B-Rep.
 *
 * ⚠ AND THE ONE THING THIS FILE IS REALLY FOR: **"how much plaster is on this wall?"** — the question
 * that was unanswerable at any price against a monolithic solid, that a declared north-star depended
 * on, and that domain rule 8 forbade foreclosing. It is the last test in the file, and it is three
 * lines, because D30 did the work.
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
  describeCommands,
  describeTypes,
} from '@bunyan/document';
import type { Registries } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

/** A 3 m × 2.5 m wall: 15 plaster + 200 blockwork + 80 insulation = 295 mm of real construction. */
const PLASTER = 15;
const BLOCKWORK = 200;
const INSULATION = 80;
const LENGTH = 3000;
const HEIGHT = 2500;

describe('the document model, on real geometry', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let registries: Registries;

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  });
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  /** A document with a material library, a wall style, and a level — the minimum real building. */
  const newDocument = async (): Promise<DocumentContext> => {
    registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);

    const doc = new DocumentContext({ registries, geometry: client });

    await doc.execute('core.createMaterial', {
      id: 'plaster-15',
      name: 'Gypsum plaster',
      category: 'finish',
      density: 1200,
    });
    await doc.execute('core.createMaterial', {
      id: 'blockwork-200',
      name: 'Concrete blockwork',
      category: 'masonry',
      density: 2000,
      structural: { f_ck: 20 },
    });
    await doc.execute('core.createMaterial', {
      id: 'eps-80',
      name: 'EPS insulation',
      category: 'insulation',
      density: 20,
    });
    await doc.execute('core.createContainer', {
      id: 'site',
      kind: 'site',
      name: 'Site',
    });
    await doc.execute('core.createContainer', {
      id: 'tower-a',
      kind: 'building',
      name: 'Tower A',
      parentId: 'site',
    });
    await doc.execute('core.createContainer', {
      id: 'level-0',
      kind: 'level',
      name: 'Ground floor',
      parentId: 'tower-a',
      elevation: 0,
    });
    await doc.execute('core.createStyle', {
      id: 'EXT-295',
      name: 'EXT-295-Blockwork',
      typeId: 'core.wall.v1',
      layers: [
        {
          name: 'finish.interior',
          materialId: 'plaster-15',
          thickness: PLASTER,
          discipline: 'architectural',
        },
        {
          name: 'structure',
          materialId: 'blockwork-200',
          thickness: BLOCKWORK,
          discipline: 'structural',
        },
        {
          name: 'insulation',
          materialId: 'eps-80',
          thickness: INSULATION,
          discipline: 'architectural',
        },
      ],
    });
    return doc;
  };

  const addWall = (doc: DocumentContext, length = LENGTH) =>
    doc.execute('core.createElement', {
      typeId: 'core.wall.v1',
      styleId: 'EXT-295',
      containerId: 'level-0',
      params: { length, height: HEIGHT },
    });

  /* ---- D30: AN ELEMENT IS ITS PARTS ---------------------------------------------------------- */

  it('a wall is THREE solids, in order, each with its own material (D30)', async () => {
    const doc = await newDocument();
    const edit = await addWall(doc);
    const wallId = edit.changes[0]!.id;

    const parts = doc.partsOf(wallId);
    expect(parts).toHaveLength(3);
    // ⚠ ORDERED — from one face of the wall to the other. A layer stack that came back in a different
    // order every rebuild would make "the interior finish" a name for whichever layer OCCT felt like.
    expect(parts!.map((p) => p.name)).toEqual(['finish.interior', 'structure', 'insulation']);
    expect(parts!.map((p) => p.materialId)).toEqual(['plaster-15', 'blockwork-200', 'eps-80']);

    // Each part is its own DAG node — which is the ENTIRE kernel cost of D30, and it is zero.
    expect(parts!.map((p) => p.nodeId)).toEqual([
      `${wallId}.finish.interior`,
      `${wallId}.structure`,
      `${wallId}.insulation`,
    ]);
    // And each owns real, named sub-shapes: 6 faces + 12 edges of an actual OCCT solid.
    for (const part of parts!) expect(part.refs.length).toBe(18);
  });

  /* ---- D31: THE STYLE IS SHARED -------------------------------------------------------------- */

  it('editing ONE style rebuilds EVERY wall wearing it — the most-used operation in Revit (D31)', async () => {
    const doc = await newDocument();
    const walls = [
      (await addWall(doc)).changes[0]!.id,
      (await addWall(doc)).changes[0]!.id,
      (await addWall(doc)).changes[0]!.id,
    ];

    const before = await doc.quantities(walls[0]!);
    expect(structureVolume(before)).toBeCloseTo(LENGTH * BLOCKWORK * HEIGHT, 3);

    // ONE edit. "Change every EXT-295 wall to 250 mm blockwork."
    const edit = await doc.execute('core.updateStyle', {
      styleId: 'EXT-295',
      layers: [
        {
          name: 'finish.interior',
          materialId: 'plaster-15',
          thickness: PLASTER,
          discipline: 'architectural',
        },
        {
          name: 'structure',
          materialId: 'blockwork-200',
          thickness: 250,
          discipline: 'structural',
        },
        {
          name: 'insulation',
          materialId: 'eps-80',
          thickness: INSULATION,
          discipline: 'architectural',
        },
      ],
    });

    // The edit KNOWS it touched all three — that list is what an agent verifies against (D23).
    expect(new Set(edit.rebuilt)).toEqual(new Set(walls));

    // And all three walls are genuinely thicker, in the B-Rep, not just in the recipe.
    for (const wall of walls) {
      const after = await doc.quantities(wall);
      expect(structureVolume(after)).toBeCloseTo(LENGTH * 250 * HEIGHT, 3);
    }
  });

  /* ---- D33 + domain rule 15: THE QUANTITY ---------------------------------------------------- */

  it('⚠ "HOW MUCH PLASTER IS ON THIS WALL?" — the question a monolithic solid could not answer', async () => {
    const doc = await newDocument();
    const wallId = (await addWall(doc)).changes[0]!.id;

    const quantities = await doc.quantities(wallId);

    // Per part. Per material. Measured from the B-Rep — never estimated, never reconstructed.
    expect(quantities.basis).toBe('exact');
    const plaster = quantities.parts.find((p) => p.materialId === 'plaster-15')!;
    expect(plaster.name).toBe('finish.interior');
    expect(plaster.volume).toBeCloseTo(LENGTH * PLASTER * HEIGHT, 3);

    // ⚠ AND ITS MASS, from the MATERIAL'S OWN DENSITY (D33) — the number Planitor has to reconstruct
    // through a fallback ladder that hardcodes 7850 for steel, because IFC so often will not say it.
    // 3000 × 15 × 2500 mm³ = 0.1125 m³ of plaster, at 1200 kg/m³ = 135 kg.
    expect(plaster.mass!).toBeCloseTo(135, 6);

    // The insulation weighs almost nothing, and that is exactly the point: one solid could not have
    // told you that, because one solid has one density and a wall does not.
    const insulation = quantities.parts.find((p) => p.materialId === 'eps-80')!;
    expect(insulation.mass!).toBeCloseTo((LENGTH * INSULATION * HEIGHT * 20) / 1e9, 6);
    expect(insulation.mass!).toBeLessThan(plaster.mass!);
  });

  it('the PAINT AREA of one named wall face — what measure(ref) bought (Entry 14)', async () => {
    const doc = await newDocument();
    const wallId = (await addWall(doc)).changes[0]!.id;
    const interior = doc.partsOf(wallId)!.find((p) => p.name === 'finish.interior')!;

    const face = interior.refs.find((ref) => ref.includes('/face/y-min'))!;
    const area = await doc.faceArea(wallId, face);

    // The paintable face of the plaster: 3000 × 2500 mm.
    expect(area).toBeCloseTo(LENGTH * HEIGHT, 3);
  });

  /* ---- D35 / D36: THE TREE, AND WHAT AN ELEMENT *IS* ---------------------------------------- */

  it('an element knows where it is (D35) and what it IS (D36) — Miqdar must never guess', async () => {
    const doc = await newDocument();
    const wallId = (await addWall(doc)).changes[0]!.id;

    // ⚠ D36: a Wall may be a shear wall or a partition. It is a PROPERTY, not a type — and Miqdar
    // imports "the structural elements", so something has to say which those are.
    expect(doc.scene.elements[wallId]!.classification.loadBearing).toBe(false);
    // ⚠ NO `discipline` ARG ANY MORE (D45) — it lives on the PART, authored on the style's layer.
    // Miqdar filters on `loadBearing`, which is what this command is actually for.
    await doc.execute('core.setClassification', { elementId: wallId, loadBearing: true });
    expect(doc.scene.elements[wallId]!.classification.loadBearing).toBe(true);

    // ⚠ D35: the spatial tree, which IS the downstream Location Breakdown Structure.
    // A two-tower project was literally unmodellable before it.
    expect(doc.scene.elements[wallId]!.containerId).toBe('level-0');
  });

  /* ---- D21: THE REGISTRIES DESCRIBE THEMSELVES ---------------------------------------------- */

  it('capability discovery is GENERATED from the registries, never maintained (D21)', async () => {
    const doc = await newDocument();

    const commands = describeCommands(doc.registries);
    const types = describeTypes(doc.registries);

    // Every command carries its argsSchema — this is what makes the agent's tool list derivable.
    expect(commands.every((c) => typeof c.argsSchema === 'object')).toBe(true);
    // And every command returns its UndoableEdit (D23) — the diff an actor verifies against.
    expect(commands.every((c) => c.returns === 'UndoableEdit')).toBe(true);

    const wall = types.find((t) => t.id === 'core.wall.v1')!;
    expect(wall.styleable).toBe(true);
    expect(wall.hosted).toBe(false);
    expect(wall.ifcClass).toBe('IfcWall');

    const opening = types.find((t) => t.id === 'core.opening.v1')!;
    expect(opening.hosted).toBe(true);

    // ⚠ THE CRITERION, LITERALLY: registering a command makes it appear as a verb with ZERO other
    // edits. The exact mirror of P4's ribbon criterion, and the reason there is no "agent phase".
    const stub = {
      id: 'test.stub',
      label: 'A stub',
      argsSchema: {},
      execute: (ctx: { edit: (l: string, c: never[], r: never[]) => unknown }) =>
        ctx.edit('stub', [], []) as never,
    };
    doc.registries.commands.register(stub);
    expect(describeCommands(doc.registries).map((c) => c.name)).toContain('test.stub');
  });

  it('a registry refuses a silent overwrite — behaviour must not change under existing documents', async () => {
    const doc = await newDocument();
    expect(() => {
      doc.registries.types.register(FIXTURE_TYPES[0]!);
    }).toThrow(/already registered/);
  });
});

function structureVolume(quantities: {
  parts: readonly { name: string; volume: number }[];
}): number {
  return quantities.parts.find((p) => p.name === 'structure')!.volume;
}
