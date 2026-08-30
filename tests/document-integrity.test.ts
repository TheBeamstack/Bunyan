// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE INTEGRITY GATES — the validation gaps the P3 review found (`P3_correction_plan.md` §1[7]), and
 * the D44/D45 rulings that closed two of them.
 *
 * ⚠⚠ WHAT THESE ALL HAVE IN COMMON, AND IT IS THE LESSON OF THE WHOLE REVIEW: **not one of them was a
 * crash.** Every single one produced a **plausible, confident, WRONG answer** — a wall on the wrong
 * floor, a quantity of `0 kg` stamped `basis: 'exact'`, two different faces answering to the same
 * reference token, a dead element's id handed to a living one. A crash gets fixed on the day it
 * happens. These get *believed*, and they get believed by three products downstream that were told,
 * in writing, that Bunyan's reconciliation queue is **empty by construction** — so nobody is even
 * looking.
 *
 * *"Predictable breakage beats silent wrongness"* is the domain's own sentence. This file is where it
 * is enforced.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  CommandFailure,
  DocumentContext,
  createAgentSurface,
  createRegistries,
  loadBnn,
  mintPei,
  saveBnn,
} from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';

describe('the integrity gates', () => {
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

  const newDocument = (): DocumentContext => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return new DocumentContext({ registries, geometry: client });
  };

  /** A document with one material and one Level, ready to hang a wall on. */
  const withLibrary = async (doc: DocumentContext): Promise<void> => {
    await doc.execute('core.createMaterial', {
      id: 'concrete',
      name: 'C25/30',
      category: 'concrete',
      density: 2400,
    });
    await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
    await doc.execute('core.createContainer', {
      id: 'level-9',
      kind: 'level',
      name: 'Level 9',
      parentId: 'site',
      elevation: 9000,
    });
  };

  /* ============================================================================================
   * D44 — THE PEI. An id is a promise to three other products.
   * ========================================================================================= */

  /**
   * ⚠⚠ **A DEAD ELEMENT'S ID WAS HANDED TO A LIVING ONE.**
   *
   * The counter was rebuilt on load by scanning the ids of the elements that **survived**. So: create
   * `wall-1..3`, delete `wall-3`, save, reload, create → **the new element was minted `wall-3`.**
   * Planitor's progress records and Miqdar's analytical model both bind to that id, and §4i *promises
   * them* that a Bunyan model never needs reconciliation — **so the mis-binding is silent, and nobody
   * downstream is looking for it.** Domain rule 13: not a refactor, *a breaking change to three
   * products.*
   */
  it('⚠⚠ AN ID IS NEVER REUSED — not even after a delete, a save and a reload (D44)', async () => {
    const first = newDocument();
    await withLibrary(first);
    await first.execute('core.createStyle', {
      id: 'W',
      name: 'W',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
      ],
    });

    const mkWall = async (doc: DocumentContext): Promise<string> =>
      (
        await doc.execute('core.createElement', {
          typeId: 'core.wall.v1',
          styleId: 'W',
          params: { length: 3000, height: 2500 },
        })
      ).changes[0]!.id;

    const doomed = await mkWall(first);
    await first.execute('core.deleteElement', { elementId: doomed });

    // ---- SAVE → RELOAD → CREATE. This is the exact reproduction. --------------------------------
    const reopened = new DocumentContext({
      registries: first.registries,
      geometry: client,
      scene: loadBnn(saveBnn(first.scene, { kernelBuildId: KERNEL_BUILD_ID })).scene,
    });
    await reopened.rebuildAll();
    const fresh = await mkWall(reopened);

    // Before D44 this was `wall-1` both times. A different building element, wearing a dead element's
    // name, in three products' databases.
    expect(fresh).not.toBe(doomed);
  });

  it('10 000 ids minted in a tight loop are all distinct — monotonic within a millisecond (D44)', () => {
    // ⚠ `Date.now()` has ~1 ms resolution and this loop runs thousands of times inside one tick, so a
    // naive "timestamp + random" ULID collides on birthday odds alone. The random tail is INCREMENTED
    // within a millisecond, not re-drawn.
    const ids = new Set<string>();
    for (let i = 0; i < 10_000; i++) ids.add(mintPei('wall'));
    expect(ids.size).toBe(10_000);
  });

  /* ============================================================================================
   * D45 — A QUANTITY THAT CANNOT BE MEASURED IS OMITTED, NEVER ZEROED.
   * ========================================================================================= */

  /**
   * ⚠⚠ **`{ mass: 0, basis: 'exact' }` — A WRONG NUMBER WEARING THE BADGE THAT SAYS *TRUST ME*.**
   *
   * An unresolvable `materialId` gave `0 kg` and stamped it **exact**. Domain rule 15 forbids an
   * *estimate* dressed as a measurement; this is worse. **A missing density is an unknown, not a
   * nought** — so `mass` is now **absent**, while the volume and area beside it (which genuinely *are*
   * measured from the B-Rep) are still reported.
   *
   * And the hole it came through: **`updateStyle` validated its materials and `createStyle` did not** —
   * so the *first* way anybody makes a style was the unguarded one.
   */
  it('⚠⚠ createStyle REFUSES a dangling material — the gap updateStyle was already guarding (D45)', async () => {
    const doc = newDocument();
    await withLibrary(doc);

    await expect(
      doc.execute('core.createStyle', {
        id: 'W',
        name: 'W',
        typeId: 'core.wall.v1',
        layers: [
          {
            name: 'structure',
            materialId: 'no-such-material',
            thickness: 200,
            discipline: 'structural',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(CommandFailure);
    expect(doc.scene.styles['W']).toBeUndefined();
  });

  it('⚠⚠ A MASS THAT CANNOT BE MEASURED IS OMITTED, NOT ZEROED — and volume/area stay exact (D45)', async () => {
    const doc = newDocument();
    await withLibrary(doc);
    await doc.execute('core.createStyle', {
      id: 'W',
      name: 'W',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
      ],
    });
    const wallId = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: 'W',
        params: { length: 3000, height: 2500 },
      })
    ).changes[0]!.id;

    // A healthy wall answers with a mass.
    expect((await doc.quantities(wallId)).parts[0]!.mass).toBeCloseTo(
      (3000 * 200 * 2500 * 2400) / 1e9,
      6,
    );

    // ---- Now the material goes missing beneath it. A `.bnn` is a file you can be SENT, so the
    // command-layer check above is necessary but NOT sufficient — the guard has to hold at the
    // measurement too.
    const hostile = {
      ...doc.scene,
      materials: {},
    };
    const reopened = new DocumentContext({
      registries: doc.registries,
      geometry: client,
      scene: hostile,
    });
    await reopened.rebuildAll();

    const quantity = (await reopened.quantities(wallId)).parts[0]!;
    // ⚠ THE ASSERTION THAT WAS FALSE: it used to be `0`, stamped `exact`.
    expect(quantity.mass).toBeUndefined();
    // …while the numbers that ARE measured are still there, and still exact.
    expect(quantity.volume).toBeCloseTo(3000 * 200 * 2500, 3);
    expect(quantity.area).toBeGreaterThan(0);
  });

  /* ============================================================================================
   * COLLIDING IDENTITIES — the guard that was on the one path that could never fail.
   * ========================================================================================= */

  /**
   * ⚠⚠ **TWO LAYERS NAMED `structure` MINTED SIX BYTE-IDENTICAL REF TOKENS FOR DIFFERENT FACES OF
   * DIFFERENT SOLIDS.**
   *
   * A part's DAG node is `${elementId}.${partName}` — so a duplicate layer name is not untidy, it is an
   * **identity collision**: a window hosted on one of those faces is hosted on both, or on neither, and
   * nothing downstream can recover which was meant.
   *
   * ⚠ And note where the existing guard was: `checkIdSafe()` rejected `/` and `#` in a **minted id** —
   * which is a ULID and *can never contain one*. **The strings that actually reach a `nodeId` are the
   * layer names, which an agent authors, and they were unchecked.** A guard on the safe path is not a
   * guard.
   */
  it('⚠⚠ DUPLICATE LAYER NAMES ARE REFUSED — they would mint IDENTICAL SubShapeRefs (core_logic §5)', async () => {
    const doc = newDocument();
    await withLibrary(doc);

    await expect(
      doc.execute('core.createStyle', {
        id: 'W',
        name: 'W',
        typeId: 'core.wall.v1',
        layers: [
          { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
          { name: 'structure', materialId: 'concrete', thickness: 100, discipline: 'structural' },
        ],
      }),
    ).rejects.toThrow(/two layers are both named "structure"/);
  });

  it('a layer name carrying a SubShapeRef separator is refused — it could forge a reference', async () => {
    const doc = newDocument();
    await withLibrary(doc);

    await expect(
      doc.execute('core.createStyle', {
        id: 'W',
        name: 'W',
        typeId: 'core.wall.v1',
        layers: [
          {
            name: 'structure/face/y-min#0',
            materialId: 'concrete',
            thickness: 200,
            discipline: 'structural',
          },
        ],
      }),
    ).rejects.toThrow(/could forge a reference/);
  });

  /* ============================================================================================
   * THE LBS ADDRESS — a typo was a wrong building AND a wrong work package.
   * ========================================================================================= */

  /**
   * ⚠⚠ **A MISTYPED `containerId` SILENTLY PUT THE WALL ON THE GROUND FLOOR.**
   *
   * `createElement` validated `styleId` and `hostId` but **not** `containerId` — and `elevationOf()`
   * returns **0** for a container it cannot find. So the wall was *built*, at z = 0 instead of z = 9000,
   * and nothing anywhere said a word. ⚠ `containerId` **is the LBS address** (D35): that is a wrong
   * building *and* a wrong work package, from one mistyped string.
   */
  it('⚠⚠ A MISTYPED containerId IS REFUSED — it is the LBS address, not a label (D35)', async () => {
    const doc = newDocument();
    await withLibrary(doc);
    await doc.execute('core.createStyle', {
      id: 'W',
      name: 'W',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
      ],
    });

    await expect(
      doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: 'W',
        containerId: 'level-nine', // it is `level-9`
        params: { length: 3000, height: 2500 },
      }),
    ).rejects.toBeInstanceOf(CommandFailure);

    // The right one still works — and lands at 9000 mm, where it was asked to be.
    const wallId = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: 'W',
        containerId: 'level-9',
        params: { length: 3000, height: 2500 },
      })
    ).changes[0]!.id;
    const bounds = await client.request('bounds', {
      handle: doc.partsOf(wallId)![0]!.handle,
    });
    expect(bounds.bounds.min[2]).toBeCloseTo(9000, 3);
  });

  it('an unknown gridRef is refused — a column stays at B-3 only if B-3 exists (D32)', async () => {
    const doc = newDocument();
    await withLibrary(doc);
    await doc.execute('core.createStyle', {
      id: 'W',
      name: 'W',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
      ],
    });

    await expect(
      doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: 'W',
        gridRefs: ['B', '3'],
        params: { length: 3000, height: 2500 },
      }),
    ).rejects.toBeInstanceOf(CommandFailure);
  });

  /* ============================================================================================
   * D45 — DISCIPLINE IS PART-SCOPED, AND THE OWNER FOUND THIS ONE FROM THE DOMAIN.
   * ========================================================================================= */

  /**
   * ⚠⚠ **AN RC WALL IS A STRUCTURAL CORE WITH ARCHITECTURAL PLASTER ON IT.**
   *
   * `discipline` was a single value on the **element** — so the wall had to be *entirely* structural or
   * *entirely* architectural, and **two written ecosystem claims were therefore false as built**:
   * `core_logic.md` §3.3a says Miqdar *"idealizes the structural layer of a wall, not its finishes"*
   * (**it could not ask which part that was**), and §4i says *"a task binds to the part it actually
   * builds"* (**Planitor could not route the concreter and the plasterer to different work packages on
   * one wall**).
   *
   * The owner refused the question *"where should discipline live?"* and asked a better one: **"why do
   * we need a per-element discipline at all?"** All three consumers of one evaporated.
   */
  it('⚠⚠ ONE WALL ANSWERS *BOTH* "structural" AND "architectural" — through DIFFERENT PARTS (D45)', async () => {
    const doc = newDocument();
    await withLibrary(doc);
    await doc.execute('core.createMaterial', {
      id: 'plaster',
      name: 'Plaster',
      category: 'finish',
      density: 1200,
    });
    await doc.execute('core.createStyle', {
      id: 'RC-PLASTERED',
      name: 'RC wall, plastered',
      typeId: 'core.wall.v1',
      layers: [
        // The concreter's work…
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
        // …and the plasterer's, on the same wall, with the same PEI.
        {
          name: 'finish.interior',
          materialId: 'plaster',
          thickness: 15,
          discipline: 'architectural',
        },
      ],
    });
    const wallId = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: 'RC-PLASTERED',
        params: { length: 3000, height: 2500 },
      })
    ).changes[0]!.id;

    const bunyan = createAgentSurface(doc);

    // ⚠⚠ THE SAME WALL COMES BACK FROM BOTH QUERIES — and that is not a fudge, it is what the wall IS.
    // An element-level field had to lie about one of them.
    expect(bunyan.query({ discipline: 'structural' }).map((e) => e.id)).toEqual([wallId]);
    expect(bunyan.query({ discipline: 'architectural' }).map((e) => e.id)).toEqual([wallId]);

    // …and each part reports its own, so a work package can bind to the part it actually builds.
    const parts = bunyan.get(wallId)!.parts;
    expect(parts.find((p) => p.name === 'structure')!.discipline).toBe('structural');
    expect(parts.find((p) => p.name === 'finish.interior')!.discipline).toBe('architectural');

    // The quantity carries it too — this is the field the Clean Delta routes on, PER PART.
    const quantities = await doc.quantities(wallId);
    expect(quantities.parts.map((p) => p.discipline)).toEqual(['structural', 'architectural']);

    // ⚠ And nothing answers a discipline it has no part for.
    expect(bunyan.query({ discipline: 'mep' })).toHaveLength(0);
  });

  it("a LinearMember with no layer stack takes its TYPE's defaultDiscipline (D45)", async () => {
    const doc = newDocument();
    await withLibrary(doc);
    await doc.execute('core.createSection', {
      id: 'R300',
      name: 'RECT-300x300',
      shape: 'rectangle',
      dimensions: { width: 300, depth: 300 },
    });
    await doc.execute('core.createStyle', {
      id: 'COL',
      name: 'COL',
      typeId: 'core.linearMember.v1',
      sectionId: 'R300',
      params: { materialId: 'concrete' },
    });
    const columnId = (
      await doc.execute('core.createElement', {
        typeId: 'core.linearMember.v1',
        styleId: 'COL',
        params: { length: 3000, direction: 'z' },
      })
    ).changes[0]!.id;

    // No layers to ask ⇒ the Type's own stamp. ⚠ NEVER inferred from the material: a concrete screed is
    // not structural, and a timber shear wall is.
    expect(doc.partsOf(columnId)![0]!.discipline).toBe('structural');
  });

  /* ============================================================================================
   * ONE DERIVATION OF "WHAT MUST REBUILD" — there used to be two answers to one question.
   * ========================================================================================= */

  it('undoing a createMaterial rebuilds NOTHING — it changed no geometry (§1[7e])', async () => {
    const doc = newDocument();
    await withLibrary(doc);
    await doc.execute('core.createStyle', {
      id: 'W',
      name: 'W',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
      ],
    });
    const wallId = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: 'W',
        params: { length: 3000, height: 2500 },
      })
    ).changes[0]!.id;

    await doc.execute('core.createMaterial', {
      id: 'steel',
      name: 'S235',
      category: 'steel',
      density: 7850,
    });
    const handlesBefore = doc.partsOf(wallId)!.map((p) => p.handle);

    // ⚠ `execute` rebuilt `edit.rebuilt` while `undo` rebuilt `#touched(changes)` — TWO ANSWERS TO ONE
    // QUESTION. So undoing a `createMaterial` rebuilt **every element in the document** (~7.3 s on the
    // 195-element building) for an edit that changed no geometry at all. There is one derivation now.
    await doc.undo();

    // The wall's solids are the SAME solids — not rebuilt, not even successfully.
    expect(doc.partsOf(wallId)!.map((p) => p.handle)).toEqual(handlesBefore);
    expect(doc.scene.materials['steel']).toBeUndefined();
  });

  it('undoing a DELETE rebuilds the elements it restores (the other half of the same derivation)', async () => {
    const doc = newDocument();
    await withLibrary(doc);
    await doc.execute('core.createStyle', {
      id: 'W',
      name: 'W',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
      ],
    });
    const wallId = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: 'W',
        params: { length: 3000, height: 2500 },
      })
    ).changes[0]!.id;

    await doc.execute('core.deleteElement', { elementId: wallId });
    expect(doc.partsOf(wallId)).toBeUndefined();

    // ⚠ A delete's `edit.rebuilt` is EMPTY — the elements it names are being destroyed. So a derivation
    // that trusted only `edit.rebuilt` would restore the wall to the scene and never build its solid.
    // The changes know what came back; the command knows what a style edit reaches. Both are needed.
    await doc.undo();
    expect(doc.partsOf(wallId)).toHaveLength(1);
    expect((await doc.quantities(wallId)).parts[0]!.volume).toBeCloseTo(3000 * 200 * 2500, 3);
  });
});
