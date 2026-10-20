// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-054 — a container move re-stages every datum on a Level beneath it that inherits its elevation.
 *
 * `datumElevations` resolves a datum through `elevationOf`, which walks the container path, so a Level
 * with no elevation follows its Building. The invalidator matched only a datum's direct target, so the
 * wall kept its old extent (and its join neighbour its old cap) until a `rebuildAll`.
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
  dependents,
  resolveJoins,
} from '@bunyan/document';
import type { SceneChange } from '@bunyan/document';
import { wallType } from '@bunyan/types';

const T = 200;
const STOREY = 3000;

describe('a container move re-stages datums on Levels that inherit its elevation (T-054)', () => {
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

  /** Building b with l0 at 0 (and l1 at `l1At`); Building b2 at 3000 holding Level u with no elevation. */
  const newDoc = async (l1At = STOREY): Promise<DocumentContext> => {
    const registries = createRegistries();
    registries.types.register(wallType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });
    await doc.execute('core.createContainer', { id: 'b', kind: 'building', name: 'B' });
    await doc.execute('core.createContainer', {
      id: 'l0',
      kind: 'level',
      name: 'l0',
      parentId: 'b',
      elevation: 0,
    });
    await doc.execute('core.createContainer', {
      id: 'l1',
      kind: 'level',
      name: 'l1',
      parentId: 'b',
      elevation: l1At,
    });
    await doc.execute('core.createContainer', {
      id: 'b2',
      kind: 'building',
      name: 'B2',
      elevation: STOREY,
    });
    await doc.execute('core.createContainer', {
      id: 'u',
      kind: 'level',
      name: 'u',
      parentId: 'b2',
    });
    return doc;
  };

  const wall = async (
    doc: DocumentContext,
    containerId: string,
    start: readonly [number, number],
    end: readonly [number, number],
  ): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        containerId,
        params: { start, end, thickness: T, height: STOREY },
      })
    ).changes[0]!.id;

  const bounds = async (doc: DocumentContext, id: string) => {
    const p = doc.partsOf(id)!.find((q) => q.name === 'wall')!;
    return (await client.request('bounds', { handle: p.handle })).bounds;
  };

  const ends = (doc: DocumentContext, id: string): string[] =>
    resolveJoins(doc.scene, id).map((j) => j.end);

  const moveB2 = (doc: DocumentContext): Promise<unknown> =>
    doc.execute('core.updateContainer', { id: 'b2', elevation: 2000 });

  it('a base datum on u: C follows the Building, and A re-miters, after the move and after undo', async () => {
    const doc = await newDoc();
    const a = await wall(doc, 'l0', [0, 0], [4000, 0]); // [0, 3000]
    const c = await wall(doc, 'l0', [0, 0], [0, 3000]);
    await doc.execute('core.createConstraint', { element: c, kind: 'base', target: 'u' }); // [3000, 6000]
    expect(ends(doc, a)).toEqual([]); // touching extents: no miter

    await moveB2(doc); // C is [2000, 5000]: overlaps A
    const cMin = (await bounds(doc, c)).min[2];
    expect(ends(doc, a)).toEqual(['start']);
    const aMin = (await bounds(doc, a)).min[0];
    await doc.rebuildAll();
    expect(Math.abs((await bounds(doc, c)).min[2] - 2000)).toBeLessThan(1e-6);
    expect(cMin).toBe((await bounds(doc, c)).min[2]);
    expect(Math.abs((await bounds(doc, a)).min[0] - -T / 2)).toBeLessThan(1e-6);
    expect(aMin).toBe((await bounds(doc, a)).min[0]);

    await doc.undo(); // back to touching
    const cUndo = (await bounds(doc, c)).min[2];
    const aUndo = (await bounds(doc, a)).min[0];
    await doc.rebuildAll();
    expect(Math.abs((await bounds(doc, c)).min[2] - STOREY)).toBeLessThan(1e-6);
    expect(cUndo).toBe((await bounds(doc, c)).min[2]);
    expect(Math.abs((await bounds(doc, a)).min[0])).toBeLessThan(1e-6);
    expect(aUndo).toBe((await bounds(doc, a)).min[0]);
  }, 120000);

  it('a top datum on u: C follows the Building, and A loses its miter, after the move and after undo', async () => {
    const doc = await newDoc(2500);
    const a = await wall(doc, 'l1', [0, 0], [4000, 0]); // [2500, 5500]
    const c = await wall(doc, 'l0', [0, 0], [0, 3000]);
    await doc.execute('core.createConstraint', { element: c, kind: 'top', target: 'u' }); // [0, 3000]
    expect(ends(doc, a)).toEqual(['start']);

    await moveB2(doc); // C is [0, 2000]: disjoint from A
    const cMax = (await bounds(doc, c)).max[2];
    expect(ends(doc, a)).toEqual([]);
    const aMin = (await bounds(doc, a)).min[0];
    await doc.rebuildAll();
    expect(Math.abs((await bounds(doc, c)).max[2] - 2000)).toBeLessThan(1e-6);
    expect(cMax).toBe((await bounds(doc, c)).max[2]);
    expect(Math.abs((await bounds(doc, a)).min[0])).toBeLessThan(1e-6);
    expect(aMin).toBe((await bounds(doc, a)).min[0]);

    await doc.undo(); // back to overlapping
    const cUndo = (await bounds(doc, c)).max[2];
    const aUndo = (await bounds(doc, a)).min[0];
    await doc.rebuildAll();
    expect(Math.abs((await bounds(doc, c)).max[2] - STOREY)).toBeLessThan(1e-6);
    expect(cUndo).toBe((await bounds(doc, c)).max[2]);
    expect(Math.abs((await bounds(doc, a)).min[0] - -T / 2)).toBeLessThan(1e-6);
    expect(aUndo).toBe((await bounds(doc, a)).min[0]);
  }, 120000);

  it('a Level with its own elevation shields its datums from the Building move', async () => {
    const doc = await newDoc();
    await doc.execute('core.createContainer', {
      id: 'v',
      kind: 'level',
      name: 'v',
      parentId: 'b2',
      elevation: 6000,
    });
    const c = await wall(doc, 'l0', [0, 0], [0, 3000]);
    await doc.execute('core.createConstraint', { element: c, kind: 'base', target: 'v' });
    const b2 = doc.scene.containers['b2']!;
    const change = {
      collection: 'containers',
      id: 'b2',
      before: b2,
      after: { ...b2, elevation: 2000 },
    } as SceneChange;
    expect(dependents(doc.scene, change)).toEqual([]);
  }, 120000);
});
