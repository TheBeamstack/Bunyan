/**
 * THE FIVE MOVE VERBS + `transactionId` ATOMICITY — P4.5 rows ⓑ and ⓘ, owner-ruled Q4/Q5 (2026-07-30).
 * Against the REAL OCCT kernel. Entry 72.
 *
 * ⚠ WHAT THIS PROVES, AND WHAT EACH HALF IS HOSTILE TO:
 *
 *  §1 THE VERBS MOVE REAL GEOMETRY — measured off the built solid, never off the recipe: a translate, an
 *     absolute placement, a rotation and a copy, with the refs byte-identical across the move (D25 — a
 *     moved wall is the same wall, which is the fact the whole placement design rests on).
 *  §2 ⚠⚠ THE RULED SPLIT, AND THE MEASUREMENTS THAT JUSTIFY REFUSING: the ruling names *"an Opening's
 *     offset"* as the placement-positioned case, and **measured, it is not** — a hosted element's own
 *     `placement` is never read by the engine, so `core.move` on a door would have SUCCEEDED, changed
 *     nothing, and told the change feed the door moved. The same shape one road over: a D52 baseline
 *     wall's placement moves its solid while the join resolver, the room solver and the billed axis
 *     length stay at the untouched baseline. Both are measured here, on both sides.
 *  §3 THE DATUM RUNG IS PER-AXIS — a grid-constrained member may still be raised, a Level-constrained one
 *     may still be slid sideways, and neither may be reoriented (where a rotation carries a solid is Type
 *     knowledge this layer does not have).
 *  §4 ⚠⚠ ONE `Ctrl+Z` REVERSES A GESTURE (row ⓘ): three `core.setParams` under one `transactionId` undo
 *     and redo as one atomic unit — and the revert-check is the same three edits WITHOUT the id, which
 *     take three undos, exactly as they did before this entry.
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
  UndoStack,
  baselineOf,
  builtAxisLength,
  createAgentSurface,
  createRegistries,
} from '@bunyan/document';
import type { Scene, UndoableEdit } from '@bunyan/document';
import { openingType as realOpeningType, wallType as realWallType } from '@bunyan/types';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

/* A styleless member: a plain box, no host, no baseline, no datum ⇒ its position IS its placement. */
const MEMBER = { width: 400, depth: 1000, height: 3000 };

describe('the five move verbs + transactionId atomicity (P4.5 rows ⓑ/ⓘ, Entry 72)', () => {
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

  const newRegistries = () => {
    const r = createRegistries();
    for (const t of FIXTURE_TYPES) r.types.register(t);
    r.types.register(realWallType);
    r.types.register(realOpeningType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    return r;
  };
  const newDoc = () => new DocumentContext({ registries: newRegistries(), geometry: client });

  const boundsOf = async (doc: DocumentContext, id: string) => {
    const part = doc.partsOf(id)![0]!;
    return (await client.request('bounds', { handle: part.handle })).bounds;
  };
  const centreOf = async (doc: DocumentContext, id: string) => {
    const b = await boundsOf(doc, id);
    return [0, 1, 2].map((i) => (b.min[i]! + b.max[i]!) / 2);
  };
  const makeMember = async (doc: DocumentContext, args: Record<string, unknown> = {}) => {
    const edit = await doc.execute('core.createElement', {
      typeId: 'core.constrainedMember.v1',
      params: MEMBER,
      ...args,
    });
    return edit.changes[0]!.id;
  };

  /** The fixture wall is placement-positioned — but it is layered (D30), so it needs a style. */
  const makeStyledWall = async (doc: DocumentContext, args: Record<string, unknown> = {}) => {
    await doc.execute('core.createMaterial', {
      id: 'blockwork-200',
      name: 'Blockwork',
      category: 'masonry',
      density: 2000,
    });
    await doc.execute('core.createStyle', {
      id: 'EXT-200',
      name: 'EXT-200',
      typeId: 'core.wall.v1',
      layers: [
        {
          name: 'structure',
          materialId: 'blockwork-200',
          thickness: 200,
          discipline: 'structural',
        },
      ],
    });
    const edit = await doc.execute('core.createElement', {
      typeId: 'core.wall.v1',
      styleId: 'EXT-200',
      params: { length: 5000, height: 3000 },
      ...args,
    });
    return edit.changes[0]!.id;
  };

  /**
   * Rebuild a scene the AUTHORING door now refuses to create — a document written before this entry's
   * guard existed. ⚠ It is also the guarantee that such a document still OPENS and still BUILDS: the
   * refusal is on the verbs, never on the load path (D43's discipline).
   */
  const reopenWith = async (doc: DocumentContext, mutate: (scene: Scene) => Scene) => {
    const reopened = new DocumentContext({
      registries: newRegistries(),
      geometry: client,
      scene: mutate(doc.scene),
    });
    await reopened.rebuildAll();
    return reopened;
  };
  const withPlacement = (
    scene: Scene,
    id: string,
    by: readonly [number, number, number],
  ): Scene => ({
    ...scene,
    elements: {
      ...scene.elements,
      [id]: { ...scene.elements[id]!, placement: [{ kind: 'translate', by }] },
    },
  });

  /* ============================================================================================
   * §1 — THE VERBS MOVE REAL GEOMETRY
   * ========================================================================================= */

  it('core.move translates the BUILT SOLID by exactly the delta — and the refs are byte-identical (D25)', async () => {
    const doc = newDoc();
    const id = await makeMember(doc);
    const before = await boundsOf(doc, id);
    const refsBefore = [...doc.partsOf(id)![0]!.refs];

    const edit = await doc.execute('core.move', { elementId: id, by: [5000, 1000, 0] });

    const after = await boundsOf(doc, id);
    expect(after.min[0]).toBeCloseTo(before.min[0] + 5000, 6);
    expect(after.min[1]).toBeCloseTo(before.min[1] + 1000, 6);
    expect(after.min[2]).toBeCloseTo(before.min[2], 6);
    // ⚠ THE LOAD-BEARING HALF: a rigid motion is a topological isomorphism, so the moved element is the
    // SAME element — every identity token survives, and anything hosted on it stays hosted.
    expect(doc.partsOf(id)![0]!.refs).toEqual(refsBefore);
    expect(edit.command).toBe('core.move');
    expect(edit.rebuilt).toContain(id);
  });

  it('⚠ consecutive moves MERGE into ONE motion — a drag does not grow the saved recipe without bound', async () => {
    const doc = newDoc();
    const id = await makeMember(doc);
    const start = await boundsOf(doc, id);
    for (let i = 0; i < 3; i++) await doc.execute('core.move', { elementId: id, by: [1000, 0, 0] });

    expect(doc.scene.elements[id]!.placement).toHaveLength(1);
    expect((await boundsOf(doc, id)).min[0]).toBeCloseTo(start.min[0] + 3000, 6);
  });

  it('core.setPlacement is ABSOLUTE and idempotent; an empty placement returns the element to its build frame', async () => {
    const doc = newDoc();
    const id = await makeMember(doc);
    const home = await boundsOf(doc, id);

    const placement = [{ kind: 'translate', by: [2000, 0, 0] }];
    await doc.execute('core.setPlacement', { elementId: id, placement });
    const once = await boundsOf(doc, id);
    await doc.execute('core.setPlacement', { elementId: id, placement });
    expect(await boundsOf(doc, id)).toEqual(once);
    expect(once.min[0]).toBeCloseTo(home.min[0] + 2000, 6);

    await doc.execute('core.setPlacement', { elementId: id, placement: [] });
    expect((await boundsOf(doc, id)).min[0]).toBeCloseTo(home.min[0], 6);
  });

  it('⚠⚠ core.rotate with NO `about` SPINS THE ELEMENT IN PLACE — it does not orbit the world origin', async () => {
    const doc = newDoc();
    const id = await makeMember(doc);
    await doc.execute('core.move', { elementId: id, by: [5000, 0, 0] });
    expect(await centreOf(doc, id)).toEqual([5000, 0, 1500]);

    await doc.execute('core.rotate', { elementId: id, axis: [0, 0, 1], angle: 90 });

    // ⚠ THE MEASUREMENT THE DEFAULT EXISTS FOR: the centre stays put (it spun), and the section turned —
    // 400 × 1000 became 1000 × 400. Let the motion default to the protocol's own world origin instead and
    // the centre lands at [0, 5000, …]: a perfectly valid solid, 7 m from where the user asked for it.
    const centre = await centreOf(doc, id);
    expect(centre[0]).toBeCloseTo(5000, 6);
    expect(centre[1]).toBeCloseTo(0, 6);
    const b = await boundsOf(doc, id);
    expect(b.max[0] - b.min[0]).toBeCloseTo(MEMBER.depth, 6);
    expect(b.max[1] - b.min[1]).toBeCloseTo(MEMBER.width, 6);
  });

  it('core.rotate WITH an explicit `about` orbits about that point — so the default is a default, not a hardcode', async () => {
    const doc = newDoc();
    const id = await makeMember(doc);
    await doc.execute('core.move', { elementId: id, by: [5000, 0, 0] });
    await doc.execute('core.rotate', {
      elementId: id,
      axis: [0, 0, 1],
      angle: 90,
      about: [0, 0, 0],
    });
    const centre = await centreOf(doc, id);
    expect(centre[0]).toBeCloseTo(0, 6);
    expect(centre[1]).toBeCloseTo(5000, 6);
  });

  it('core.copy mints a NEW element at the offset, leaves the source untouched, and carries its datum constraints', async () => {
    const doc = newDoc();
    await doc.execute('core.createContainer', {
      id: 'L0',
      kind: 'level',
      name: 'L0',
      elevation: 0,
    });
    await doc.execute('core.createContainer', {
      id: 'L1',
      kind: 'level',
      name: 'L1',
      elevation: 3000,
    });
    const id = await makeMember(doc, { baseLevel: 'L0', topLevel: 'L1' });
    const sourceBounds = await boundsOf(doc, id);

    const edit = await doc.execute('core.copy', { elementId: id, by: [4000, 0, 0] });
    const copyId = edit.changes.find((c) => c.collection === 'elements')!.id;

    expect(copyId).not.toBe(id);
    expect((await boundsOf(doc, copyId)).min[0]).toBeCloseTo(sourceBounds.min[0] + 4000, 6);
    // The source did not move.
    expect(await boundsOf(doc, id)).toEqual(sourceBounds);
    // ⚠ A COPY IS EXACT: the datum constraints came with it, so the copy still spans L0 → L1 (its height
    // is DERIVED, and a copy that had silently lost them would be a different kind of thing).
    const copied = Object.values(doc.scene.constraints).filter((c) => c.element === copyId);
    expect(copied.map((c) => c.kind).sort()).toEqual(['base', 'top']);
    expect((await boundsOf(doc, copyId)).max[2]).toBeCloseTo(3000, 6);
  });

  it('core.copy REFUSES a source anything points at — a wall copied without its window is not a copy', async () => {
    const doc = newDoc();
    const wall = await makeStyledWall(doc);
    const face = doc.partsOf(wall)![0]!.refs.find((r) => r.includes('/face/'))!;
    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: wall,
      hostRef: face,
      params: { width: 900, height: 1200 },
    });

    await expect(doc.execute('core.copy', { elementId: wall, by: [1000, 0, 0] })).rejects.toThrow(
      /cannot be copied exactly.*hosted element/s,
    );
  });

  it('core.array is a REGISTERED, RESERVED SHAPE that refuses — the argsSchema freezes, the body is v1.0.x', async () => {
    const doc = newDoc();
    const id = await makeMember(doc);
    // The shape IS in the contract — that is the whole point of registering it before the freeze.
    const array = doc.registries.commands.get('core.array')!;
    expect(Object.keys(array.argsSchema).sort()).toEqual([
      'count',
      'count2',
      'elementId',
      'mode',
      'step',
      'step2',
    ]);
    await expect(
      doc.execute('core.array', { elementId: id, mode: 'linear', count: 3, step: [1000, 0, 0] }),
    ).rejects.toThrow(/RESERVED SHAPE with no body/);
    // ⚠ And a malformed call is refused as malformed, not as unbuilt: two different facts.
    await expect(
      doc.execute('core.array', { elementId: id, mode: 'spiral', count: 3, step: [1000, 0, 0] }),
    ).rejects.toThrow(/invalid arguments/);
  });

  /* ============================================================================================
   * §2 — THE RULED SPLIT: WHERE A PLACEMENT IS IGNORED, AND WHERE IT CONTRADICTS THE RECIPE
   * ========================================================================================= */

  it('⚠⚠ MEASURED: a HOSTED element’s own placement is never read — the door does not move, and params do', async () => {
    const doc = newDoc();
    const wall = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 0], end: [5000, 0], thickness: 200, height: 3000 },
      })
    ).changes[0]!.id;
    const face = doc.partsOf(wall)![0]!.refs.find((r) => r.includes('/face/lateral.1'))!;
    const door = (
      await doc.execute('core.createElement', {
        typeId: 'core.opening',
        hostId: wall,
        hostRef: face,
        params: { width: 900, height: 2100, offsetU: 1000 },
      })
    ).changes[0]!.id;
    const leaf = await boundsOf(doc, door);

    // (a) THE SAME DOCUMENT, with a 1000 mm placement written onto the door (which the verbs now refuse
    //     and `createElement` refuses too — so it is reached the only way it can still exist: a file
    //     written before the guard). The leaf is in EXACTLY the same place, to the last measured digit.
    const placed = await reopenWith(doc, (scene) => withPlacement(scene, door, [1000, 0, 0]));
    expect(await boundsOf(placed, door)).toEqual(leaf);

    // (b) THE PARAM ROAD, which is the one the ruling says to use: +1000 on `offsetU` moves the door by
    //     exactly 1000 mm. So the door is movable — just not by this verb.
    await doc.execute('core.setParams', { elementId: door, params: { offsetU: 2000 } });
    expect((await boundsOf(doc, door)).min[0]).toBeCloseTo(leaf.min[0] + 1000, 6);
  });

  it('⚠ so core.move / setPlacement / rotate / copy REFUSE a hosted element, and name core.setParams', async () => {
    const doc = newDoc();
    const wall = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 0], end: [5000, 0], thickness: 200, height: 3000 },
      })
    ).changes[0]!.id;
    const face = doc.partsOf(wall)![0]!.refs.find((r) => r.includes('/face/lateral.1'))!;
    const door = (
      await doc.execute('core.createElement', {
        typeId: 'core.opening',
        hostId: wall,
        hostRef: face,
        params: { width: 900, height: 2100, offsetU: 1000 },
      })
    ).changes[0]!.id;

    for (const [command, args] of [
      ['core.move', { by: [1000, 0, 0] }],
      ['core.setPlacement', { placement: [{ kind: 'translate', by: [1000, 0, 0] }] }],
      ['core.rotate', { axis: [0, 0, 1], angle: 45 }],
      ['core.copy', { by: [1000, 0, 0] }],
    ] as const) {
      const failure = await doc
        .execute(command, { elementId: door, ...args })
        .then(() => undefined)
        .catch((e: unknown) => e as CommandFailure);
      expect(failure?.code, command).toBe('REFUSED');
      expect(failure?.message, command).toMatch(/HOSTED/);
      expect(failure?.message, command).toMatch(/core\.setParams/);
    }
  });

  it('⚠⚠ MEASURED: a placed D52 BASELINE wall moves its solid 5 m and its billed axis length not at all', async () => {
    const doc = newDoc();
    // Wall A runs along +X to the corner at (5000, 0); wall B leaves that corner along +Y, so the two
    // auto-mitre there (0c) and B's billed axis length is CLIPPED by that mitre.
    await doc.execute('core.createElement', {
      typeId: 'core.wall',
      params: { start: [0, 0], end: [5000, 0], thickness: 200, height: 3000 },
    });
    const b = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [5000, 0], end: [5000, 4000], thickness: 200, height: 3000 },
      })
    ).changes[0]!.id;

    const home = await boundsOf(doc, b);
    const lengthHome = builtAxisLength(doc.scene, b);
    const placed = await reopenWith(doc, (scene) => withPlacement(scene, b, [5000, 0, 0]));

    // (a) THE SOLID MOVED — the kernel applied the placement, exactly as it does for a GenericSolid.
    expect((await boundsOf(placed, b)).min[0]).toBeCloseTo(home.min[0] + 5000, 6);

    // (b) ⚠⚠ AND NOTHING THE MODEL DERIVES FROM THE RECIPE MOVED WITH IT. The baseline is byte-identical,
    //     so the join resolver still miters wall B into wall A at a corner B's solid is now 5 m from, and
    //     the BILLED AXIS LENGTH (D72 — clipped by that join) is the same number to the millimetre. One
    //     wall, two positions, both wearing `basis: 'exact'`.
    expect(baselineOf(placed.scene.elements[b]!)).toEqual(baselineOf(doc.scene.elements[b]!));
    expect(builtAxisLength(placed.scene, b)).toBe(lengthHome);

    // ⇒ which is why the verbs refuse it, and name the road that works.
    const failure = await doc
      .execute('core.move', { elementId: b, by: [5000, 0, 0] })
      .then(() => undefined)
      .catch((e: unknown) => e as CommandFailure);
    expect(failure?.code).toBe('REFUSED');
    expect(failure?.message).toMatch(/BASELINE params/);
    expect(failure?.message).toMatch(/core\.setParams/);
  });

  it('⚠ the guard is on BOTH doors: core.createElement refuses a placement on a baseline wall too', async () => {
    const doc = newDoc();
    await expect(
      doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 0], end: [5000, 0], thickness: 200, height: 3000 },
        placement: [{ kind: 'translate', by: [5000, 0, 0] }],
      }),
    ).rejects.toThrow(/cannot create .* with that placement/);
    // ⚠ And a placement-positioned type is still created with one, unchanged since P4 — the guard is
    // about WHICH elements, never about the field.
    await expect(
      doc.execute('core.createElement', {
        typeId: 'core.constrainedMember.v1',
        params: MEMBER,
        placement: [{ kind: 'translate', by: [5000, 0, 0] }],
      }),
    ).resolves.toBeDefined();
  });

  it('a malformed motion is refused as INVALID_ARGS, naming the motion — not as a broken geometry', async () => {
    const doc = newDoc();
    const id = await makeMember(doc);
    const failure = await doc
      .execute('core.setPlacement', {
        elementId: id,
        placement: [{ kind: 'rotate', axis: [0, 0, 0], degrees: 90 }],
      })
      .then(() => undefined)
      .catch((e: unknown) => e as CommandFailure);
    expect(failure?.code).toBe('INVALID_ARGS');
    expect(failure?.details.join(' ')).toMatch(/placement\[0\]\.axis must not be zero-length/);
  });

  /* ============================================================================================
   * §3 — THE DATUM RUNG IS PER-AXIS
   * ========================================================================================= */

  it('⚠ a GRID-constrained member refuses a move in PLAN and allows one straight up', async () => {
    const doc = newDoc();
    await doc.execute('core.createGrid', { id: 'B', name: 'B', axis: 'x', offset: 6000 });
    const id = await makeMember(doc, { gridRefs: ['B'] });

    await expect(doc.execute('core.move', { elementId: id, by: [1000, 0, 0] })).rejects.toThrow(
      /`grid` constraint/,
    );
    const up = await boundsOf(doc, id);
    await doc.execute('core.move', { elementId: id, by: [0, 0, 500] });
    expect((await boundsOf(doc, id)).min[2]).toBeCloseTo(up.min[2] + 500, 6);
  });

  it('⚠ a LEVEL-constrained member refuses a move straight up and allows one in plan', async () => {
    const doc = newDoc();
    await doc.execute('core.createContainer', {
      id: 'L0',
      kind: 'level',
      name: 'L0',
      elevation: 0,
    });
    await doc.execute('core.createContainer', {
      id: 'L1',
      kind: 'level',
      name: 'L1',
      elevation: 3000,
    });
    const id = await makeMember(doc, { baseLevel: 'L0', topLevel: 'L1' });

    await expect(doc.execute('core.move', { elementId: id, by: [0, 0, 500] })).rejects.toThrow(
      /`base`\/`top` Level constraint/,
    );
    const home = await boundsOf(doc, id);
    await doc.execute('core.move', { elementId: id, by: [1500, 0, 0] });
    expect((await boundsOf(doc, id)).min[0]).toBeCloseTo(home.min[0] + 1500, 6);
  });

  it('⚠⚠ a datum-positioned element refuses to be ROTATED — where a spin carries the solid is Type knowledge', async () => {
    const doc = newDoc();
    await doc.execute('core.createGrid', { id: 'B', name: 'B', axis: 'x', offset: 6000 });
    const id = await makeMember(doc, { gridRefs: ['B'] });
    // ⚠ Its frame origin does not move (the rotation is about it), so a frame-origin test alone would
    // have PASSED this — while the member itself is built centred on the grid POINT, 6 m away, and would
    // have swung right off its own grid line. That is the case `reorients` exists for.
    await expect(
      doc.execute('core.rotate', { elementId: id, axis: [0, 0, 1], angle: 90 }),
    ).rejects.toThrow(/REORIENTS/);
  });

  /* ============================================================================================
   * §4 — `transactionId`: ONE Ctrl+Z REVERSES THE GESTURE (row ⓘ, owner-ruled Q5)
   * ========================================================================================= */

  /** Three walls meeting at one corner — the smallest real compound edit (design §10). */
  const cornerOfThreeWalls = async (doc: DocumentContext) => {
    const ids: string[] = [];
    for (const end of [
      [5000, 0],
      [0, 5000],
      [-5000, 0],
    ]) {
      const edit = await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 0], end, thickness: 200, height: 3000 },
      });
      ids.push(edit.changes[0]!.id);
    }
    return ids;
  };
  /** Drag the shared corner to (500, 500) — one `core.setParams` per wall, all under one gesture. */
  const dragCorner = async (
    doc: DocumentContext,
    ids: readonly string[],
    transactionId?: string,
  ) => {
    for (const id of ids) {
      await doc.execute(
        'core.setParams',
        { elementId: id, params: { start: [500, 500] } },
        transactionId === undefined ? {} : { transactionId },
      );
    }
  };
  const startsOf = (doc: DocumentContext, ids: readonly string[]) =>
    ids.map((id) => doc.scene.elements[id]!.params['start']);

  it('⚠⚠ THE CORNER-DRAG: three setParams under one transactionId undo as ONE unit', async () => {
    const doc = newDoc();
    const ids = await cornerOfThreeWalls(doc);
    const home = startsOf(doc, ids);

    await dragCorner(doc, ids, 'gesture-1');
    expect(startsOf(doc, ids)).toEqual([
      [500, 500],
      [500, 500],
      [500, 500],
    ]);
    // The executor stamped the gesture onto every edit (a command never sees it).
    expect(
      doc
        .changeFeed()
        .slice(-3)
        .map((e) => e.transactionId),
    ).toEqual(['gesture-1', 'gesture-1', 'gesture-1']);

    await doc.undo();

    // ⚠ ONE undo, THREE walls back — and the geometry with them (the corner is a real rebuild).
    expect(startsOf(doc, ids)).toEqual(home);
    const b = await boundsOf(doc, ids[0]!);
    expect(b.min[1]).toBeCloseTo(-100, 6);
  });

  it('⚠ THE REVERT-CHECK: the same three edits WITHOUT a transactionId still take three undos', async () => {
    const doc = newDoc();
    const ids = await cornerOfThreeWalls(doc);
    const home = startsOf(doc, ids);

    await dragCorner(doc, ids);
    await doc.undo();
    // The LAST wall of the three is back and the other two are still dragged — which is exactly what
    // Entry 70 measured and declined to ship a gesture on top of.
    expect(startsOf(doc, ids)).toEqual([[500, 500], [500, 500], home[2]]);
    await doc.undo();
    await doc.undo();
    expect(startsOf(doc, ids)).toEqual(home);
  });

  it('the undo of a transaction is journalled as THREE reversals, each naming what it reverses (D40)', async () => {
    const doc = newDoc();
    const ids = await cornerOfThreeWalls(doc);
    await dragCorner(doc, ids, 'gesture-1');
    const dragged = doc.changeFeed().slice(-3);

    await doc.undo();

    const reversals = doc.changeFeed().slice(-3);
    expect(reversals).toHaveLength(3);
    // Newest first — the order they were reversed in, which is the order they must be reversed in.
    expect(reversals.map((e) => e.reverses)).toEqual([...dragged].reverse().map((e) => e.id));
    // ⚠ The journal is APPEND-ONLY: the drag's own three edits are still in it, untouched.
    expect(doc.changeFeed().filter((e) => e.transactionId === 'gesture-1')).toHaveLength(6);
    expect(reversals.every((e) => e.transactionId === 'gesture-1')).toBe(true);
  });

  it('redo re-applies the whole transaction, oldest-first, in one call', async () => {
    const doc = newDoc();
    const ids = await cornerOfThreeWalls(doc);
    await dragCorner(doc, ids, 'gesture-1');
    await doc.undo();
    await doc.redo();

    expect(startsOf(doc, ids)).toEqual([
      [500, 500],
      [500, 500],
      [500, 500],
    ]);
    // ⚠ And one more undo takes the whole gesture away again — the unit survives the round trip.
    await doc.undo();
    expect(doc.scene.elements[ids[2]!]!.params['start']).toEqual([0, 0]);
  });

  it('⚠ grouping is CONSECUTIVE: an edit from outside the gesture ends the run rather than being skipped', () => {
    const stack = new UndoStack();
    const edit = (id: string, transactionId?: string): UndoableEdit => ({
      id,
      command: 'core.setParams',
      label: id,
      changes: [],
      seq: Number(id.slice(1)),
      at: '2026-07-30T00:00:00.000Z',
      rebuilt: [],
      ...(transactionId === undefined ? {} : { transactionId }),
    });
    for (const e of [edit('e1', 't'), edit('e2'), edit('e3', 't'), edit('e4', 't')]) stack.push(e);

    // The top run is e4+e3; e1 wears the same id but is NOT contiguous, and reversing across e2 would
    // apply a delta to a state that never produced it.
    expect(stack.takeUndoGroup().map((e) => e.id)).toEqual(['e4', 'e3']);
    expect(stack.history().map((e) => e.id)).toEqual(['e1', 'e2']);

    // ⚠ THE ROLLBACK PATH a refused undo takes: one `takeRedo` per edit taken restores the stack exactly.
    stack.takeRedo();
    stack.takeRedo();
    expect(stack.history().map((e) => e.id)).toEqual(['e1', 'e2', 'e3', 'e4']);
  });

  it('⚠ D19: an AGENT can open a transaction too — the same capability, not a UI-only one', async () => {
    const doc = newDoc();
    const ids = await cornerOfThreeWalls(doc);
    const home = startsOf(doc, ids);
    const agent = createAgentSurface(doc);

    for (const id of ids) {
      await agent.execute(
        'core.setParams',
        { elementId: id, params: { start: [500, 500] } },
        { transactionId: 'agent-gesture' },
      );
    }
    await agent.undo();
    expect(startsOf(doc, ids)).toEqual(home);
  });

  it('an ungrouped document behaves exactly as it did before transactions existed', async () => {
    const doc = newDoc();
    const id = await makeMember(doc);
    await doc.execute('core.move', { elementId: id, by: [1000, 0, 0] });
    expect(doc.changeFeed().at(-1)?.transactionId).toBeUndefined();
    const edit = await doc.undo();
    expect(edit?.command).toBe('core.move');
    expect(doc.scene.elements[id]!.placement ?? []).toHaveLength(0);
  });
});
