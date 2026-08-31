// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D83 (Q19) — **THE BELONGS-TO DELETION RECONCILIATION.** Real OCCT, headless.
 *
 * ⚠⚠ THE DEFECT. `cascadeOf` (D39) cascaded a delete over `hostId` only, while the exclusion rule
 * `isElementActive` (D67) walks `hostId` **and** `parentElementId` and excludes an element whose
 * ancestor is missing. Delete a parent and its members stay in `scene.elements` while vanishing from
 * every enumerating consumer: measured before this landed, two walls and one
 * `core.setElementMetadata { parentElementId }` gave **`modelElements()` 0 of 1 and a whole-model
 * schedule of 0 rows and 0 mm³ carrying `basis: 'exact'`**, with `brokenRefs()` and `unbuildable()`
 * both empty.
 *
 * The ruling closes it from both ends, and §1/§2 below are those two halves:
 *   - **(a) cascade** — the delete walks both belongs-to edges, so a member cannot outlive its parent;
 *   - **(c) surface** — an ancestor that is missing for any other reason (a `.bnn`, D43) is a visible
 *     broken reference instead of a silent exclusion.
 *
 * ⚠ **(b) refuse is ruled OUT**, so `core.deleteElement`'s `argsSchema` does not move.
 *
 * ⚠ The invariant §1 asserts is stronger than a count of what was deleted: **every row in
 * `scene.elements` is enumerated by `modelElements()`**. A cascade that deleted the wrong set would
 * satisfy "the member is gone" and fail this.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import type { Scene } from '@bunyan/document';
import { openingType, wallType } from '@bunyan/types';

describe('D83 — a member may not outlive its parent, and a lost ancestor is visible', () => {
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

  const newDoc = (scene?: Scene): DocumentContext => {
    const r = createRegistries();
    r.types.register(wallType);
    r.types.register(openingType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    return new DocumentContext({
      registries: r,
      geometry: client,
      ...(scene === undefined ? {} : { scene }),
    });
  };

  const seeded = async (): Promise<DocumentContext> => {
    const doc = newDoc();
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
    return doc;
  };

  const wall = async (doc: DocumentContext, y = 0): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        styleId: 'S',
        params: { start: [0, y], end: [5000, y], height: 3000 },
      })
    ).changes[0]!.id;

  const doorIn = async (doc: DocumentContext, host: string): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: 'core.opening',
        hostId: host,
        hostRef: doc.partsOf(host)![0]!.refs.find((x) => x.includes('/face/lateral.1'))!,
        params: { width: 900, height: 2100, offsetU: 2500 },
      })
    ).changes[0]!.id;

  /** The property the defect broke: no row sits in the scene that no consumer can see. */
  const everyRowIsEnumerated = (doc: DocumentContext): void => {
    expect(
      doc
        .modelElements()
        .map((e) => e.id)
        .sort(),
    ).toEqual(Object.keys(doc.scene.elements).sort());
  };

  /* ============================================================================================
   * §1 — (a) THE CASCADE. `cascadeOf` walks the exclusion rule's edge set, not half of it.
   * ========================================================================================= */

  it('⚠⚠ deleting a parent deletes its members, in ONE undoable edit — the measured zero-volume walk', async () => {
    const doc = await seeded();
    const parent = await wall(doc);
    const member = await wall(doc, 4000);
    const bystander = await wall(doc, 8000);
    await doc.execute('core.setElementMetadata', { elementId: member, parentElementId: parent });

    const edit = await doc.execute('core.deleteElement', { elementId: parent });

    expect(edit.changes.map((c) => c.id).sort()).toEqual([member, parent].sort());
    expect(Object.keys(doc.scene.elements)).toEqual([bystander]);
    everyRowIsEnumerated(doc);

    // ⚠ The number D83 was ruled on: before the cascade covered this edge, the survivor left the
    // schedule while staying in the scene, so the take-off under-reported and said `exact` about it.
    const quantities = await doc.projectQuantities();
    expect(quantities.basis).toBe('exact');
    expect(quantities.rows.map((r) => r.elementId)).toEqual([bystander]);
  }, 120_000);

  it('⚠⚠ the edit label does not hard-code "hosted" for a belongs-to-only member', async () => {
    // Two walls joined by `parentElementId` ALONE — no `hostId` edge anywhere in this pair, so a
    // label that still says "hosted" is wrong for every member the D83 cascade widening added.
    const doc = await seeded();
    const parent = await wall(doc);
    const member = await wall(doc, 4000);
    await doc.execute('core.setElementMetadata', { elementId: member, parentElementId: parent });

    const edit = await doc.execute('core.deleteElement', { elementId: parent });

    expect(edit.changes.map((c) => c.id).sort()).toEqual([member, parent].sort());
    expect(edit.label).not.toMatch(/hosted/);
  }, 120_000);

  it('the cascade is TRANSITIVE ACROSS BOTH EDGES — a door in a wall in a group', async () => {
    const doc = await seeded();
    const parent = await wall(doc);
    const member = await wall(doc, 4000);
    const door = await doorIn(doc, member);
    await doc.execute('core.setElementMetadata', { elementId: member, parentElementId: parent });

    const edit = await doc.execute('core.deleteElement', { elementId: parent });

    // The walk changes edge at every step: parent →(parentElementId) member →(hostId) door.
    expect(edit.changes.map((c) => c.id).sort()).toEqual([door, member, parent].sort());
    expect(Object.keys(doc.scene.elements)).toHaveLength(0);
  }, 120_000);

  it('UNDO restores the whole cascade — the reason it has to be one edit (D39)', async () => {
    const doc = await seeded();
    const parent = await wall(doc);
    const member = await wall(doc, 4000);
    await doc.execute('core.setElementMetadata', { elementId: member, parentElementId: parent });

    await doc.execute('core.deleteElement', { elementId: parent });
    expect(Object.keys(doc.scene.elements)).toHaveLength(0); // the precondition undo has to reverse
    await doc.undo();

    expect(Object.keys(doc.scene.elements).sort()).toEqual([member, parent].sort());
    expect(doc.scene.elements[member]?.parentElementId).toBe(parent);
    everyRowIsEnumerated(doc);
  }, 120_000);

  it('a member hosted on a SURVIVING wall makes that wall rebuild — its hole goes with it', async () => {
    const doc = await seeded();
    const group = await wall(doc);
    const host = await wall(doc, 4000);
    const door = await doorIn(doc, host);
    await doc.execute('core.setElementMetadata', { elementId: door, parentElementId: group });
    const pierced = (await doc.quantities(host)).parts[0]!.volume;

    const edit = await doc.execute('core.deleteElement', { elementId: group });

    expect(Object.keys(doc.scene.elements)).toEqual([host]);
    expect(edit.rebuilt).toContain(host);
    // Measured rather than asserted: the wall is solid again, so the void really was re-cut.
    expect((await doc.quantities(host)).parts[0]!.volume).toBeGreaterThan(pierced);
  }, 120_000);

  /* ============================================================================================
   * §2 — (c) THE SURFACE. The cascade closes the DELETE road; a `.bnn` (D43) still carries the shape,
   * and there the element is not even built, because `affectedAssemblies` drops a root that is gone.
   * ========================================================================================= */

  /** Drop a row the way a foreign writer would — the D43 population, with no verb involved. */
  const without = (scene: Scene, id: string): Scene => {
    const elements = Object.fromEntries(Object.entries(scene.elements).filter(([k]) => k !== id));
    return { ...scene, elements };
  };

  it('⚠⚠ a dangling `parentElementId` is a broken reference, naming the id that is gone', async () => {
    const doc = await seeded();
    const parent = await wall(doc);
    const member = await wall(doc, 4000);
    await doc.execute('core.setElementMetadata', { elementId: member, parentElementId: parent });

    const reopened = newDoc(without(doc.scene, parent));
    await reopened.rebuildAll();

    const broken = reopened.brokenRefs();
    expect(broken).toHaveLength(1);
    expect(broken[0]!.elementId).toBe(member);
    expect(broken[0]!.ref).toBe(parent);
    expect(broken[0]!.reason).toMatch(/parentElementId/);
  }, 120_000);

  it('⚠⚠ a dangling `hostId` too — the element the build never even reaches', async () => {
    const doc = await seeded();
    const host = await wall(doc);
    const door = await doorIn(doc, host);

    const reopened = newDoc(without(doc.scene, host));
    await reopened.rebuildAll();

    // `assemblyRoot` sends the door to a root that is not there, so it is never built and
    // `unbuildable()` — which lists only registration failures — has nothing to say about it either.
    expect(reopened.geometryOf(door)).toBeUndefined();
    expect(reopened.unbuildable()).toHaveLength(0);

    const broken = reopened.brokenRefs();
    expect(broken).toHaveLength(1);
    expect(broken[0]!.elementId).toBe(door);
    expect(broken[0]!.ref).toBe(host);
  }, 120_000);

  it('⚠⚠ ONE missing ancestor named on BOTH edges reports ONCE, not twice', async () => {
    // The two edges are checked independently, so a door whose `hostId` AND `parentElementId` both
    // name the same missing wall must not yield two `BrokenReference`s differing only in `reason` —
    // `App.tsx` keys its Problems list on `${elementId}:${ref}` alone, so a second entry collides.
    const doc = await seeded();
    const host = await wall(doc);
    const door = await doorIn(doc, host);
    await doc.execute('core.setElementMetadata', { elementId: door, parentElementId: host });

    const reopened = newDoc(without(doc.scene, host));
    await reopened.rebuildAll();

    const broken = reopened.brokenRefs();
    expect(broken).toHaveLength(1);
    expect(broken[0]!.elementId).toBe(door);
    expect(broken[0]!.ref).toBe(host);
  }, 120_000);

  it('it is DERIVED and never stored — nothing enters the persisted `scene.brokenRefs`', async () => {
    const doc = await seeded();
    const parent = await wall(doc);
    const member = await wall(doc, 4000);
    const bystander = await wall(doc, 8000);
    await doc.execute('core.setElementMetadata', { elementId: member, parentElementId: parent });

    const reopened = newDoc(without(doc.scene, parent));
    await reopened.rebuildAll();

    // ⚠ The D74 filter is what makes this the right shape: a stored entry survives every partial
    // rebuild whose root is not the element it names, and this one has no rebuild to be re-derived by.
    expect(reopened.scene.brokenRefs).toHaveLength(0);
    expect(reopened.brokenRefs()).toHaveLength(1);

    // Point the member at an element that exists and the report clears — a drop, not a suppression.
    await reopened.execute('core.setElementMetadata', {
      elementId: member,
      parentElementId: bystander,
    });
    expect(reopened.brokenRefs()).toHaveLength(0);
  }, 120_000);
});
