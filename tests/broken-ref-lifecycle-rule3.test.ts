/**
 * ⚠⚠ DOMAIN RULES 1 AND 3, SWEPT BACKWARD — *"the recipe is the source of truth; geometry is derived and
 * disposable"* and *"broken references fail loudly (marked, **manually retargeted**), never silently
 * reattach."* Real OCCT, headless. (2026-07-27, the sweep ledger's rules 1 and 3.)
 *
 * **THE FINDING: A BROKEN REFERENCE OUTLIVED THE ELEMENT IT NAMED.** `scene.brokenRefs` is a RESULT — it
 * is re-derived by `buildAssembly` every time an assembly rebuilds — and it is persisted on purpose, so
 * that closing the file cannot "fix" a model by forgetting its problem. But `#stage` re-derived it only
 * for the assemblies it was REBUILDING, and `affectedAssemblies` deliberately skips any id that is no
 * longer in the scene. **A deleted element is therefore never a rebuild root, so its entry passed through
 * the filter untouched — forever.**
 *
 * Measured before the fix, both roads:
 *
 *   - delete the orphaned OPENING            ⇒ `brokenRefs()` still names it; it is not in the scene.
 *   - delete the HOST WALL (D39 cascade)     ⇒ same, for an opening the cascade also removed.
 *
 * ⚠⚠ **WHY IT IS RULE 3 AND NOT COSMETIC.** Rule 3's sentence is that a broken ref is a first-class
 * visible state **awaiting manual retargeting**. This one awaits nothing: `core.retargetReference`
 * cannot act on an element that does not exist, and the entry is **saved into the `.bnn`**, so it is
 * permanent. A document is left permanently, unfixably dirty — `brokenRefs()` never empties, a UI shows
 * a fault the user is given no way to clear, and any consumer gating on *"is this model clean?"* reads
 * dirty for the rest of the file's life. *A refusal you cannot act on has stopped being a refusal and
 * become a lie about the model's state.*
 *
 * ⚠ **AND IT IS RULE 1 FIRST.** The entry stopped being derived and started being stored: it survived
 * even `rebuildAll` — the primary load path, which rebuilds every element there is — because the thing
 * it describes was not among them. A derived value that outlives its subject is no longer derived.
 *
 * ⚠⚠ **THE FIX IS A DROP, NOT A SUPPRESSION, AND §4 IS WHAT PROVES THE DIFFERENCE:** undo the delete and
 * **the broken ref comes back**, because the rebuild re-derives it from the recipe. If the fix had
 * merely hidden the symptom, §4 would stay clean and be wrong.
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
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import { openingType, wallType } from '@bunyan/types';

describe('domain rules 1 + 3 — a broken reference may not outlive the element it names', () => {
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

  const newDoc = (): DocumentContext => {
    const r = createRegistries();
    r.types.register(wallType);
    r.types.register(openingType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    return new DocumentContext({ registries: r, geometry: client });
  };

  /**
   * A wall + a door hosted on its structure layer, then the layer RENAMED with `acknowledge` — D51's own
   * case: a style layer's name is identity-bearing (it is inside the `SubShapeRef` token), so renaming it
   * orphans the opening. That is the sanctioned way to produce a real broken ref.
   */
  const wallWithOrphanedDoor = async (
    doc: DocumentContext,
  ): Promise<{ wall: string; door: string }> => {
    await doc.execute('core.createMaterial', {
      id: 'block',
      name: 'Block',
      category: 'masonry',
      density: 2000,
    });
    await doc.execute('core.createStyle', {
      id: 'S',
      name: 'S',
      typeId: 'core.wall',
      layers: [
        { name: 'structure', materialId: 'block', thickness: 200, discipline: 'structural' },
      ],
    });
    const wall = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        styleId: 'S',
        params: { start: [0, 0], end: [5000, 0], height: 3000 },
      })
    ).changes[0]!.id;
    const face = doc.partsOf(wall)![0]!.refs.find((x) => x.includes('/face/lateral.1'))!;
    const door = (
      await doc.execute('core.createElement', {
        typeId: 'core.opening',
        hostId: wall,
        hostRef: face,
        params: { width: 900, height: 2100, offsetU: 2500 },
      })
    ).changes[0]!.id;

    await doc.execute('core.updateStyle', {
      styleId: 'S',
      layers: [{ name: 'renamed', materialId: 'block', thickness: 200, discipline: 'structural' }],
      acknowledge: true,
    });
    expect(doc.brokenRefs()).toHaveLength(1);
    expect(doc.brokenRefs()[0]!.elementId).toBe(door);
    return { wall, door };
  };

  it('⚠⚠ §1 deleting the orphaned OPENING clears its broken ref', async () => {
    const doc = newDoc();
    const { door } = await wallWithOrphanedDoor(doc);

    await doc.execute('core.deleteElement', { elementId: door });

    // Measured failing first: the entry survived, naming an element no longer in the scene.
    expect(doc.scene.elements[door]).toBeUndefined();
    expect(doc.brokenRefs()).toHaveLength(0);
  });

  it('⚠⚠ §2 deleting the HOST clears the broken ref of the opening its cascade took (D39)', async () => {
    const doc = newDoc();
    const { wall, door } = await wallWithOrphanedDoor(doc);

    // D39: deleting a wall deletes its openings, in ONE undoable edit. Neither is a rebuild root
    // afterwards — which is exactly why the stale entry used to survive this road too.
    await doc.execute('core.deleteElement', { elementId: wall });

    expect(doc.scene.elements[wall]).toBeUndefined();
    expect(doc.scene.elements[door]).toBeUndefined();
    expect(doc.brokenRefs()).toHaveLength(0);
  });

  it('⚠⚠ §3 the stale entry is not merely hidden — it never reaches the saved `.bnn`', async () => {
    const doc = newDoc();
    const { door } = await wallWithOrphanedDoor(doc);
    await doc.execute('core.deleteElement', { elementId: door });

    // ⚠ THE REASON THIS MATTERED: `scene.brokenRefs` is PERSISTED on purpose (a problem must survive a
    // save, or closing the file would "fix" the model by forgetting it). So a stale entry was permanent
    // — and `rebuildAll`, the primary load path, could not clear it either, because the element it
    // names is not among the elements there are to rebuild.
    const bytes = saveBnn(doc.scene, {
      kernelBuildId: 'sweep-rule3',
      journal: doc.changeFeed(),
    });
    const loaded = loadBnn(bytes);
    expect(loaded.scene.brokenRefs).toHaveLength(0);

    const r = createRegistries();
    r.types.register(wallType);
    r.types.register(openingType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    const reopened = new DocumentContext({ registries: r, geometry: client, scene: loaded.scene });
    await reopened.rebuildAll();
    expect(reopened.brokenRefs()).toHaveLength(0);
  });

  it('⚠⚠ §4 THE PROOF IT IS A DROP AND NOT A SUPPRESSION: undo restores the door AND its broken ref', async () => {
    const doc = newDoc();
    const { door } = await wallWithOrphanedDoor(doc);
    await doc.execute('core.deleteElement', { elementId: door });
    expect(doc.brokenRefs()).toHaveLength(0);

    await doc.undo();

    // The recipe is the source of truth (rule 1): the opening is back, its `hostRef` still names a face
    // that no longer exists, and the rebuild DERIVES the broken ref again. Nothing was remembered — and
    // if the fix had suppressed the symptom instead of dropping a stale row, this would stay at 0.
    expect(doc.scene.elements[door]).toBeDefined();
    expect(doc.brokenRefs()).toHaveLength(1);
    expect(doc.brokenRefs()[0]!.elementId).toBe(door);
  });

  it('§5 a broken ref on an element that STILL EXISTS is untouched — the fix changes only deletion', async () => {
    const doc = newDoc();
    const { door } = await wallWithOrphanedDoor(doc);

    // Edit something else entirely. The orphaned door is still in the model, still awaiting a retarget,
    // and must still be reported — the additivity gate (the "an unjoined wall still reports its full
    // baseline" discipline, D72).
    await doc.execute('core.createElement', {
      typeId: 'core.wall',
      params: { start: [0, 9000], end: [3000, 9000], thickness: 200, height: 3000 },
    });

    expect(doc.brokenRefs()).toHaveLength(1);
    expect(doc.brokenRefs()[0]!.elementId).toBe(door);
  });
});
