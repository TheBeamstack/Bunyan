/**
 * A HOSTED DOOR HOLDS ITS POSITION WHEN ITS WALL IS JOINED (Revit's model — owner-ruled 2026-07-21).
 *
 * ⚠⚠ THE GAP THIS PINS (found 2026-07-21 by composing the two newest surfaces — the `buildLeaf` door, Entry
 * 44, and 0c wall joins, Entry 42 — for the first time): the shipped `core.opening` USED TO anchor `offsetU`
 * to the host face's PARAMETRIC CENTRE (`opening.ts` faceBasis → `hostFace.frame.origin`). An auto-mitre
 * extends the joined side-face past the corner (`wall-joins` §7.2), which moves that centre — so a door on
 * the face MOVED when a NEIGHBOUR wall arrived: measured +T/4 (50 mm on a 200 mm wall) with nobody touching
 * the door or its wall. Entry 42's anti-fuse gate never caught it — it checked the host TOKEN and the void
 * VOLUME, not the door's POSITION, and it drove the legacy fixture opening, not the shipped one.
 *
 * ⚠ THE FIX (owner ruling): anchor `offsetU` to the HOST WALL'S START — a `{start,end}` baseline value the
 * join never touches — which the frozen `VoidBuildContext` already exposes via `hostParams`. NO frozen
 * contract changed; `core.opening` is a registry type. This test drives the shipped door + a real join
 * against the real OCCT kernel and asserts the door does NOT move. Revert the faceBasis anchor to the frame
 * origin and this fails (the +50 mm drift returns and the absolute position is wrong) — the §1b guarantee.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import { openingType, wallType } from '@bunyan/types';

const T = 200; // wall thickness (single synthetic layer)
const H = 2400; // wall height
const OFFSET_U = 3000; // the door centre's distance from the wall start — near the FAR (joined) corner

describe('a hosted door holds its position when its wall is joined (Revit anchoring)', () => {
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
    const registries = createRegistries();
    registries.types.register(wallType);
    registries.types.register(openingType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return new DocumentContext({ registries, geometry: client });
  };

  /** Wall A [0,0]→[4000,0] with a Door at OFFSET_U from the wall start on its a-side face. */
  const wallWithDoor = async (doc: DocumentContext) => {
    const wall = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 0], end: [4000, 0], thickness: T, height: H },
      })
    ).changes[0]!.id;
    const p = doc.partsOf(wall)!.find((q) => q.name === 'wall')!;
    const host = p.refs.find((r) => r.includes('/face/lateral.1'))!;
    const door = (
      await doc.execute('core.createElement', {
        typeId: 'core.opening',
        hostId: wall,
        hostRef: host,
        params: { width: 900, height: 2000, offsetU: OFFSET_U, offsetV: 0 },
      })
    ).changes[0]!.id;
    return { wall, door };
  };

  const leafBounds = async (doc: DocumentContext, door: string) => {
    const leaf = doc.partsOf(door)!.find((q) => q.name === 'leaf')!;
    return (await client.request('bounds', { handle: leaf.handle })).bounds;
  };

  it('⚠⚠ a NEIGHBOUR wall arriving at the far corner does NOT move the door (anchored to the wall start)', async () => {
    // Case A — wall alone: the door sits OFFSET_U from the start along the baseline.
    const solo = newDoc();
    const { door: soloDoor } = await wallWithDoor(solo);
    const before = await leafBounds(solo, soloDoor);
    const beforeX = (before.min[0] + before.max[0]) / 2;
    expect(beforeX).toBeCloseTo(OFFSET_U, 1); // anchored to the start (x=0) + OFFSET_U

    // Case B — same wall + a perpendicular wall meeting at the FAR corner (4000,0): AUTO-MITRE.
    const joined = newDoc();
    const { door: joinedDoor } = await wallWithDoor(joined);
    await joined.execute('core.createElement', {
      typeId: 'core.wall',
      params: { start: [4000, 0], end: [4000, 3000], thickness: T, height: H },
    });

    // Anti-fuse still holds: the join did not break the door (leaf + hole co-move, shared faceBasis).
    expect(joined.brokenRefs(), 'the join broke the door — it fused').toHaveLength(0);

    const after = await leafBounds(joined, joinedDoor);
    const afterX = (after.min[0] + after.max[0]) / 2;

    // The leaf kept its size (a stable placement, not a deformation).
    expect(after.max[0] - after.min[0]).toBeCloseTo(before.max[0] - before.min[0], 3);

    // ⚠⚠ THE GUARANTEE: the door did NOT move. Under the old face-centre anchoring this drifted +T/4.
    expect(afterX - beforeX).toBeCloseTo(0, 1);
  });
});
