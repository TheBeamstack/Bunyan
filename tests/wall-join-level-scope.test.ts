// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-053 — wall auto-joins pair only walls whose vertical extents overlap.
 *
 * The join index is plan-only, so the same corner authored on the storey above was a second partner at
 * the lower corner: 2 partners read as ambiguous and the lower walls silently lost their miter (D68's
 * ambiguity flip, reached through Levels instead of design options).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries, resolveJoins } from '@bunyan/document';
import { wallType } from '@bunyan/types';

const T = 200;
const STOREY = 3000;

describe('wall auto-joins are scoped to overlapping vertical extents (T-053)', () => {
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

  /** A document with Levels l0 at 0 and l1 at 3000. */
  const newDoc = async (): Promise<DocumentContext> => {
    const registries = createRegistries();
    registries.types.register(wallType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });
    await doc.execute('core.createContainer', { id: 'b', kind: 'building', name: 'B' });
    for (const [id, elevation] of [
      ['l0', 0],
      ['l1', STOREY],
    ] as const)
      await doc.execute('core.createContainer', {
        id,
        kind: 'level',
        name: id,
        parentId: 'b',
        elevation,
      });
    return doc;
  };

  const wall = async (
    doc: DocumentContext,
    containerId: string,
    start: readonly [number, number],
    end: readonly [number, number],
    params: Record<string, unknown> = { height: STOREY },
  ): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        containerId,
        params: { start, end, thickness: T, ...params },
      })
    ).changes[0]!.id;

  /** The 90-degree corner at the origin on `level`; returns the east-running wall. */
  const corner = async (doc: DocumentContext, level: string): Promise<string> => {
    const a = await wall(doc, level, [0, 0], [4000, 0]);
    await wall(doc, level, [0, 0], [0, 3000]);
    return a;
  };

  const minX = async (doc: DocumentContext, id: string): Promise<number> => {
    const p = doc.partsOf(id)!.find((q) => q.name === 'wall')!;
    return (await client.request('bounds', { handle: p.handle })).bounds.min[0];
  };

  const ends = (doc: DocumentContext, id: string): string[] =>
    resolveJoins(doc.scene, id).map((j) => j.end);

  it('⚠⚠ the same corner on the storey above leaves the lower corner mitered, as with l1 empty', async () => {
    const alone = await newDoc();
    const aloneA = await corner(alone, 'l0');
    expect(ends(alone, aloneA)).toEqual(['start']);
    const aloneMin = await minX(alone, aloneA);
    expect(Math.abs(aloneMin - -T / 2)).toBeLessThan(1e-6);

    const stacked = await newDoc();
    const a = await corner(stacked, 'l0');
    const upper = await corner(stacked, 'l1');
    expect(ends(stacked, a)).toEqual(['start']);
    expect(Math.abs((await minX(stacked, a)) - -T / 2)).toBeLessThan(1e-6);
    expect(await minX(stacked, a)).toBe(aloneMin);
    // One cached index answers both storeys: the upper corner still finds its own partner (D73).
    expect(ends(stacked, upper)).toEqual(['start']);
  }, 120000);

  it('extents that only touch get no auto-miter', async () => {
    const doc = await newDoc();
    // l0's wall tops out at 3000, exactly l1's base.
    const a = await wall(doc, 'l0', [0, 0], [4000, 0]);
    await wall(doc, 'l1', [0, 0], [0, 3000]);
    expect(ends(doc, a)).toEqual([]);
  }, 120000);

  it('disjoint extents get no auto-miter', async () => {
    const doc = await newDoc();
    const a = await wall(doc, 'l0', [0, 0], [4000, 0], { height: 2400 });
    await wall(doc, 'l1', [0, 0], [0, 3000]);
    expect(ends(doc, a)).toEqual([]);
  }, 120000);

  it('touching or disjoint extents get no auto-butt at a mid-span T', async () => {
    const doc = await newDoc();
    // A partition on l1 ends mid-span on an l0 wall: touching extents (3000 = 3000).
    await wall(doc, 'l0', [0, 0], [4000, 0]);
    const touching = await wall(doc, 'l1', [2000, 0], [2000, 3000]);
    expect(ends(doc, touching)).toEqual([]);
    const disjoint = await wall(doc, 'l0', [3000, 0], [3000, -3000], { height: 2400 });
    await wall(doc, 'l1', [0, 1000], [4000, 1000]);
    const upperPartition = await wall(doc, 'l1', [3000, 1000], [3000, 3000]);
    expect(ends(doc, disjoint)).toEqual(['start']); // its own l0 T still butts
    expect(ends(doc, upperPartition)).toEqual(['start']); // and the l1 T, against its l1 wall
    const crossing = await wall(doc, 'l0', [1000, 1000], [1000, 2000], { height: 2400 });
    expect(ends(doc, crossing)).toEqual([]); // ends mid-span on the l1 wall only
  }, 120000);

  it('a corner whose extents overlap still miters — including one whose top is set by a datum', async () => {
    const doc = await newDoc();
    const a = await wall(doc, 'l0', [0, 0], [4000, 0], { height: 1 }); // [0, 1]
    const b = await wall(doc, 'l0', [0, 0], [0, 3000], { height: 500 });
    await doc.execute('core.createConstraint', {
      element: b,
      kind: 'base',
      target: 'l0',
      offset: 2000,
    }); // b is [2000, 2500]: disjoint from a
    expect(ends(doc, a)).toEqual([]);
    await doc.execute('core.createConstraint', { element: a, kind: 'top', target: 'l1' }); // [0, 3000]
    expect(ends(doc, a)).toEqual(['start']);
    expect(Math.abs((await minX(doc, a)) - -T / 2)).toBeLessThan(1e-6);

    // A full-height wall on l0 overlaps a raised one on l1 whose base datum sits below l1.
    const tall = await wall(doc, 'l1', [10000, 0], [14000, 0]);
    await doc.execute('core.createConstraint', {
      element: tall,
      kind: 'base',
      target: 'l1',
      offset: -500,
    });
    await wall(doc, 'l0', [10000, 0], [10000, 3000]);
    expect(ends(doc, tall)).toEqual(['start']);
  }, 120000);
});
