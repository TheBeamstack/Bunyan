// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-051 — `core.move`/`rotate`/`copy` move a D52 wall through its `motion` tags (D95, D-20261012-03
 * `annotation`, D-20261012-04 `detach`; `docs/design/P4.5_baseline_move_design.md` §5 A, §6, §7).
 * Against the REAL OCCT kernel, on the demo scene the design's §1 probe measured 6 of 6 refused.
 *
 * Revert-check: remove `motion: 'planPoint'` from `core.wall`'s `start`/`end` and the first block goes red
 * (the verbs fall back to `placement`, so the params do not move and the placement does).
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
  createRegistries,
  motionFieldsOf,
} from '@bunyan/document';
import { openingType, wallType } from '@bunyan/types';
import { seedDemoScene } from '../apps/web/src/scaffold/seed.js';

describe('T-051: a D52 wall moves, rotates and copies through its motion tags (D95)', () => {
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

  const demo = async () => {
    const r = createRegistries();
    r.types.register(wallType);
    r.types.register(openingType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    const doc = new DocumentContext({ registries: r, geometry: client });
    await seedDemoScene(doc);
    const walls = Object.values(doc.scene.elements).filter((e) => e.typeId === 'core.wall');
    expect(walls).toHaveLength(2);
    return { doc, walls: walls.map((w) => w.id) };
  };

  const failureOf = (p: Promise<unknown>) =>
    p.then(() => undefined).catch((e: unknown) => e as CommandFailure);

  const close = (actual: unknown, expected: readonly number[]) => {
    const a = actual as readonly number[];
    expect(a).toHaveLength(expected.length);
    expected.forEach((v, i) => {
      expect(a[i]).toBeCloseTo(v, 6);
    });
  };

  it('core.wall tags start and end as plan points, and nothing else', () => {
    expect(motionFieldsOf(wallType.parameterSchema)).toEqual([
      { name: 'start', motion: 'planPoint' },
      { name: 'end', motion: 'planPoint' },
    ]);
  });

  it('the §A probe: move, rotate and copy succeed on both demo walls, each one edit and one undo', async () => {
    for (const index of [0, 1]) {
      for (const [command, args] of [
        ['core.move', { by: [1000, 0, 0] }],
        ['core.rotate', { axis: [0, 0, 1], angle: 90 }],
        ['core.copy', { by: [1000, 0, 0] }],
      ] as const) {
        const { doc, walls } = await demo();
        const id = walls[index]!;
        const source = doc.scene.elements[id]!;
        const before = structuredClone(doc.scene);

        const edit = await doc.execute(command, { elementId: id, ...args });

        const written = doc.scene.elements[edit.changes[0]!.id]!;
        expect(
          edit.changes.filter((c) => c.collection === 'elements'),
          command,
        ).toHaveLength(1);
        expect(written.placement, command).toEqual(source.placement);
        if (command === 'core.rotate') {
          // About the baseline midpoint: the wall spins in place.
          const [s, e] = [source.params['start'] as number[], source.params['end'] as number[]];
          const [mx, my] = [(s[0]! + e[0]!) / 2, (s[1]! + e[1]!) / 2];
          close(written.params['start'], [mx - (s[1]! - my), my + (s[0]! - mx)]);
          close(written.params['end'], [mx - (e[1]! - my), my + (e[0]! - mx)]);
        } else {
          for (const p of ['start', 'end']) {
            const v = source.params[p] as number[];
            close(written.params[p], [v[0]! + 1000, v[1]!]);
          }
        }
        if (command === 'core.copy') expect(written.id).not.toBe(id);
        expect(doc.partsOf(written.id), command).toBeDefined();

        await doc.undo();
        expect(doc.scene, command).toEqual(before);
      }
    }
  }, 120_000);

  it('moving a wall leaves the wall joined to it unmoved (detach, D-20261012-04)', async () => {
    const { doc, walls } = await demo();
    const partner = JSON.stringify(doc.scene.elements[walls[1]!]!.params);
    await doc.execute('core.move', { elementId: walls[0]!, by: [0, -500, 0] });
    expect(JSON.stringify(doc.scene.elements[walls[1]!]!.params)).toBe(partner);
  });

  it("core.rotate's default `about` is the centroid of the tagged points; an explicit one still wins", async () => {
    const { doc, walls } = await demo();
    const id = walls[0]!; // [0, 0] → [4000, 0]; centroid [2000, 0]
    await doc.execute('core.rotate', { elementId: id, axis: [0, 0, 1], angle: 90 });
    close(doc.scene.elements[id]!.params['start'], [2000, -2000]);
    close(doc.scene.elements[id]!.params['end'], [2000, 2000]);

    const other = await demo();
    const w = other.walls[0]!;
    await other.doc.execute('core.rotate', {
      elementId: w,
      axis: [0, 0, 1],
      angle: 90,
      about: [0, 0, 0],
    });
    close(other.doc.scene.elements[w]!.params['start'], [0, 0]);
    close(other.doc.scene.elements[w]!.params['end'], [0, 4000]);
  });

  it('refused, named: dz ≠ 0 and a non-vertical axis name core.updateContainer', async () => {
    const { doc, walls } = await demo();
    for (const [command, args] of [
      ['core.move', { by: [0, 0, 500] }],
      ['core.copy', { by: [1000, 0, 500] }],
      ['core.rotate', { axis: [1, 0, 0], angle: 90 }],
    ] as const) {
      const failure = await failureOf(doc.execute(command, { elementId: walls[0]!, ...args }));
      expect(failure?.code, command).toBe('REFUSED');
      expect(failure?.message, command).toMatch(/planPoint/);
      expect(failure?.message, command).toMatch(/core\.updateContainer/);
    }
  });

  it('refused, named: core.setPlacement names core.move, and a mirror gets its own reason (§6)', async () => {
    const { doc, walls } = await demo();
    const place = await failureOf(
      doc.execute('core.setPlacement', {
        elementId: walls[0]!,
        placement: [{ kind: 'translate', by: [1000, 0, 0] }],
      }),
    );
    expect(place?.code).toBe('REFUSED');
    expect(place?.message).toMatch(/core\.move/);
    expect(place?.message).toMatch(/\{start, end\}/);

    const mirror = await failureOf(
      doc.execute('core.setPlacement', {
        elementId: walls[0]!,
        placement: [{ kind: 'mirror', normal: [0, 1, 0] }],
      }),
    );
    expect(mirror?.code).toBe('REFUSED');
    expect(mirror?.message).toMatch(/a mirror of an element positioned by its `motion`-tagged/);

    // The other door too: a wall cannot be BORN with a placement.
    await expect(
      doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 0], end: [5000, 0], thickness: 200, height: 3000 },
        placement: [{ kind: 'translate', by: [5000, 0, 0] }],
      }),
    ).rejects.toThrow(/cannot create .* with that placement.*core\.move/s);
  });

  it('core.copy of a wall that hosts an opening still refuses at the hosted check (T-036 lifts it)', async () => {
    const { doc, walls } = await demo();
    const face = doc.partsOf(walls[0]!)![0]!.refs.find((r) => r.includes('/face/lateral.1'))!;
    await doc.execute('core.createElement', {
      typeId: 'core.opening',
      hostId: walls[0]!,
      hostRef: face,
      params: { width: 900, height: 2100, offsetU: 1000 },
    });
    const failure = await failureOf(
      doc.execute('core.copy', { elementId: walls[0]!, by: [0, 5000, 0] }),
    );
    expect(failure?.code).toBe('REFUSED');
    expect(failure?.message).toMatch(/cannot be copied exactly.*hosted element/s);
  });

  it('a grid-bound params-positioned element refuses a plan motion (the datum rung still holds)', async () => {
    const { doc } = await demo();
    await doc.execute('core.createGrid', { id: 'B', name: 'B', axis: 'x', offset: 6000 });
    const id = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 8000], end: [4000, 8000], thickness: 200, height: 3000 },
        gridRefs: ['B'],
      })
    ).changes.find((c) => c.collection === 'elements')!.id;
    await expect(doc.execute('core.move', { elementId: id, by: [1000, 0, 0] })).rejects.toThrow(
      /`grid` constraint/,
    );
    // Only the params road names the `grid` constraint here; the placement road refuses a rotate as REORIENTING.
    await expect(
      doc.execute('core.rotate', { elementId: id, axis: [0, 0, 1], angle: 90 }),
    ).rejects.toThrow(/`grid` constraint/);
  });
});
