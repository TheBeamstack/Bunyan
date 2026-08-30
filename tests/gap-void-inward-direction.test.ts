// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ A HOSTED VOID CUTS ALONG THE HOST'S INWARD NORMAL, ON WHICHEVER FACE IT IS HOSTED — a gap found by
 * modelling (Zayd, dev box, 2026-07-15) and closed the same day. See `current_state.md` Entry.
 *
 * THE METHOD, AGAIN: model something a building has, on a shape nobody cut, against the REAL kernel. A
 * hosted void had only ever been cut through a WALL, and only ever hosted on that wall's INTERIOR
 * (`y-min`) face. Host one on any OTHER face — a window on a wall's EXTERIOR face, a STAIRWELL in a
 * slab, a duct through a beam — and it cut the WRONG WAY, silently.
 *
 * THE CAUSE: `VoidBuildContext.hostFace` gave a void `{ ref, bounds:{min,max} }` and nothing else — so
 * a void could not tell which side of that face the host SOLID was on. A planar face has a host on ONE
 * side; its bounding box does not say which. The fixture Opening had to GUESS ("+normal, from the min
 * corner"), a coin-flip that was correct for a MIN-side face and wrong for a MAX-side one, where the
 * void projected AWAY from the host and only the −100 mm margin overlapped.
 *
 * THE FIX: the rebuild engine — which holds the host solid's handle when it resolves the face — now
 * computes an `inward` unit vector from the host solid's own extent and passes it on `hostFace`. The
 * void projects its cut along `inward`. Correct for any face of any axis-aligned host, and a
 * best-effort inward for a curved one. `VoidBuildContext` is release-candidate and freezes at P5, so
 * the field lands in exactly the pre-freeze window this method exists to protect.
 *
 * ⚠ THESE THREE CASES ARE THE REVERT-CHECK: each asserts a clean THROUGH-cut. Revert the `inward`
 * datum (or the fixture's use of it) and each one fails with the old partial cut — verified.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

describe('a hosted void cuts along the host inward normal, on whichever face it is hosted', () => {
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

  /** The flat-in-`axis` host face on the requested side (min = lower coord, max = higher). */
  const faceOnSide = async (
    handle: string,
    refs: readonly string[],
    axis: 0 | 1 | 2,
    side: 'min' | 'max',
  ): Promise<string> => {
    let chosen = '';
    let best = side === 'max' ? -Infinity : Infinity;
    for (const ref of refs.filter((r) => r.includes('/face/'))) {
      const b = await client.request('bounds', { handle, ref });
      if (Math.abs(b.bounds.max[axis] - b.bounds.min[axis]) >= 1) continue; // not flat in `axis`
      const coord = b.bounds.min[axis];
      if ((side === 'max' && coord > best) || (side === 'min' && coord < best)) {
        best = coord;
        chosen = ref;
      }
    }
    return chosen;
  };

  it('a beam: the SAME duct cuts through, whether hosted on the MIN or the MAX face', async () => {
    const removedThrough = async (side: 'min' | 'max'): Promise<number> => {
      const registries = createRegistries();
      for (const type of FIXTURE_TYPES) registries.types.register(type);
      for (const command of CORE_COMMANDS) registries.commands.register(command);
      const doc = new DocumentContext({ registries, geometry: client });
      await doc.execute('core.createMaterial', {
        id: 'steel',
        name: 'S355',
        category: 'steel',
        density: 7850,
      });
      await doc.execute('core.createSection', {
        id: 'sec',
        name: 'SEC',
        shape: 'rectangle',
        dimensions: { width: 250, depth: 500 }, // 500mm deep in y — deep enough to see the difference
      });
      await doc.execute('core.createStyle', {
        id: 'BEAM',
        name: 'BEAM',
        typeId: 'core.linearMember.v1',
        sectionId: 'sec',
        params: { materialId: 'steel' },
      });
      const beam = await doc.execute('core.createElement', {
        typeId: 'core.linearMember.v1',
        styleId: 'BEAM',
        params: { length: 6000, direction: 'x' },
      });
      const beamId = beam.changes[0]!.id;
      const before = (await doc.quantities(beamId)).parts[0]!.volume;
      const structure = doc.partsOf(beamId)!.find((p) => p.name === 'structure')!;
      const host = await faceOnSide(structure.handle, structure.refs, 1, side); // a y-face
      await doc.execute('core.createElement', {
        typeId: 'core.opening.v1',
        hostId: beamId,
        hostRef: host,
        params: { width: 150, height: 150, anchor: 'centered' },
      });
      expect(doc.brokenRefs()).toHaveLength(0);
      const after = (await doc.quantities(beamId)).parts[0]!.volume;
      return before - after;
    };

    const removedMin = await removedThrough('min');
    const removedMax = await removedThrough('max');
    // A 150×150 duct through a 500mm-deep beam removes 11,250,000 mm³ — the SAME either way now.
    // (Before the `inward` fix, the max face nicked 100mm: 2,250,000 mm³, a silent 5× discrepancy.)
    expect(removedMin).toBe(150 * 150 * 500);
    expect(removedMax).toBe(150 * 150 * 500);
  });

  it('the SHIPPING wall: a window on the EXTERIOR face cuts through every layer', async () => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });
    await doc.execute('core.createMaterial', {
      id: 'block',
      name: 'Blockwork',
      category: 'masonry',
      density: 2000,
    });
    await doc.execute('core.createMaterial', {
      id: 'plaster',
      name: 'Plaster',
      category: 'finish',
      density: 1200,
    });
    await doc.execute('core.createStyle', {
      id: 'EXT',
      name: 'EXT',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'block', thickness: 200, discipline: 'structural' },
        {
          name: 'finish.exterior',
          materialId: 'plaster',
          thickness: 15,
          discipline: 'architectural',
        },
      ],
    });
    const wall = await doc.execute('core.createElement', {
      typeId: 'core.wall.v1',
      styleId: 'EXT',
      params: { length: 4000, height: 2800 },
    });
    const wallId = wall.changes[0]!.id;
    const exterior = doc.partsOf(wallId)!.find((p) => p.name === 'finish.exterior')!;
    const outerFace = await faceOnSide(exterior.handle, exterior.refs, 1, 'max'); // the y-max outer face

    const before = await doc.quantities(wallId);
    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: wallId,
      hostRef: outerFace,
      params: { width: 1200, height: 1400, anchor: 'centered' },
    });
    expect(doc.brokenRefs()).toHaveLength(0);
    const after = await doc.quantities(wallId);

    const removed = (layer: string): number =>
      before.parts.find((p) => p.name === layer)!.volume -
      after.parts.find((p) => p.name === layer)!.volume;

    // BOTH layers are cut clean through — the near finish AND the far 200mm structure. (Before the fix
    // the structure was cut only 85mm, leaving 115mm of blockwork standing behind the glass.) The
    // boolean carries float noise, so compare within 1 mm³.
    expect(removed('finish.exterior')).toBeCloseTo(1200 * 1400 * 15, 0);
    expect(removed('structure')).toBeCloseTo(1200 * 1400 * 200, 0);
  });

  it('the SHIPPING slab: a STAIRWELL void (the commonest slab opening) cuts clean through', async () => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });
    await doc.execute('core.createMaterial', {
      id: 'rc',
      name: 'RC',
      category: 'concrete',
      density: 2400,
    });
    await doc.execute('core.createStyle', {
      id: 'SLAB',
      name: 'SLAB',
      typeId: 'core.slab.v1',
      layers: [{ name: 'structure', materialId: 'rc', thickness: 250, discipline: 'structural' }],
    });
    const slab = await doc.execute('core.createElement', {
      typeId: 'core.slab.v1',
      styleId: 'SLAB',
      params: {
        boundary: [
          [0, 0],
          [6000, 0],
          [6000, 4000],
          [0, 4000],
        ],
      },
    });
    const slabId = slab.changes[0]!.id;
    const structure = doc.partsOf(slabId)!.find((p) => p.name === 'structure')!;
    // A stairwell goes straight down through the slab's TOP face (z at its max — a max-side face).
    const top = await faceOnSide(structure.handle, structure.refs, 2, 'max');

    const before = (await doc.quantities(slabId)).parts[0]!.volume;
    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: slabId,
      hostRef: top,
      params: { width: 2000, height: 1000, anchor: 'centered' },
    });
    expect(doc.brokenRefs()).toHaveLength(0);
    const after = (await doc.quantities(slabId)).parts[0]!.volume;
    // A real 2000×1000 stairwell through a 250mm slab removes 500,000,000 mm³. (Before the fix it
    // removed a 100mm skin — 200,000,000 — leaving 150mm of concrete across the hole.) `extrude`
    // carries float noise, so compare within 1 mm³ rather than exactly.
    expect(before - after).toBeCloseTo(2000 * 1000 * 250, 0);
  });
});
