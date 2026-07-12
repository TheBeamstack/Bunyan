/**
 * THE GEOMETRIC QUERY OPS (decision D23) — `bounds`, `distance`, `classifyPoint`.
 *
 * These are the ops an AI agent needs in order to ask **spatial** questions: "where exactly is the
 * south face of that wall?", "what is within 2 m of this column?", "is this point inside that slab?".
 * They read the B-Rep, so they are kernel ops, and they had to land BEFORE the protocol freezes at the
 * end of P3 (§5 task 1a) — after the freeze, adding one is a contract amendment.
 *
 * ⚠ EVERY ASSERTION RUNS TWICE: once on the mock, once on real OCCT. That is not belt-and-braces, it
 * is the point — the mock answers these in closed form and OCCT answers them from the B-Rep, so where
 * they agree, our wiring is right; where they disagree, one of the two is our bug. (We are not
 * auditing OCCT — spec §9.0 — we are auditing ourselves against it.)
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createMockKernel } from '@bunyan/kernel-mock';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { KernelImplementation } from '@bunyan/kernel-core';

const WALL = { nodeId: 'wall-1', dx: 3000, dy: 200, dz: 2500 } as const;

const KERNELS: readonly [string, () => KernelImplementation | Promise<KernelImplementation>][] = [
  ['mock', createMockKernel],
  ['occt', createOcctKernel],
];

describe.each(KERNELS)('geometric queries — %s kernel', (name, create) => {
  let kernel: KernelImplementation;
  let client: KernelClient;

  beforeAll(async () => {
    kernel = await create();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  });
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  it('reports the tight bounds of a whole shape', async () => {
    const wall = await client.request('makeBox', { ...WALL, at: [1000, 500, 0] });
    const { bounds } = await client.request('bounds', { handle: wall.handle });

    // ⚠ TIGHT, not tolerant. OCCT's own bounding box is INFLATED by the shape's tolerance (~1e-7 mm),
    // so a box on the origin reports xMin = -1e-7 unless the gap is explicitly dropped. An agent that
    // asked "does this fit in a 3000 mm opening?" would be told no, by a ten-millionth of a millimetre.
    expect(bounds.min).toEqual([1000, 500, 0]);
    expect(bounds.max).toEqual([4000, 700, 2500]);
  });

  /**
   * ⚠ THE QUERY THAT ONLY WORKS BECAUSE NAMING WORKS.
   *
   * "Where is the south face of that wall?" is answerable only if `the south face of that wall` is a
   * thing you can NAME and still resolve after the wall has been edited. This is persistent naming
   * being cashed in as a product capability, not just an invariant.
   */
  it('reports the tight bounds of ONE NAMED sub-shape — the face an agent asked about by name', async () => {
    const wall = await client.request('makeBox', { ...WALL, at: [1000, 500, 0] });

    const face = await client.request('bounds', {
      handle: wall.handle,
      ref: 'wall-1/face/y-min#0',
    });
    // A face is flat: its bounds collapse on its own axis, at the plane its name claims.
    expect(face.bounds.min).toEqual([1000, 500, 0]);
    expect(face.bounds.max).toEqual([4000, 500, 2500]);

    const edge = await client.request('bounds', {
      handle: wall.handle,
      ref: 'wall-1/edge/x-min|y-min#0',
    });
    // An edge is a line: it collapses on TWO axes.
    expect(edge.bounds.min).toEqual([1000, 500, 0]);
    expect(edge.bounds.max).toEqual([1000, 500, 2500]);
  });

  it('refuses a ref it cannot resolve, rather than answering about the wrong face', async () => {
    const wall = await client.request('makeBox', WALL);
    await expect(
      client.request('bounds', { handle: wall.handle, ref: 'some-other-wall/face/y-min#0' }),
    ).rejects.toMatchObject({ failure: { code: 'UNRESOLVED_SUBSHAPE_REF' } });
  });

  it('measures the distance between two solids, and says WHERE they are closest', async () => {
    const a = await client.request('makeBox', { nodeId: 'a', dx: 1000, dy: 1000, dz: 1000 });
    const b = await client.request('makeBox', {
      nodeId: 'b',
      at: [3000, 0, 0], // a 2 m gap on x
      dx: 1000,
      dy: 1000,
      dz: 1000,
    });

    const near = await client.request('distance', { a: a.handle, b: b.handle });
    expect(near.distance).toBeCloseTo(2000, 6);

    // The witness points are what make this usable: an agent can say not just "2 m apart" but "2 m
    // apart, between these two faces".
    expect(near.pointA[0]).toBeCloseTo(1000, 6);
    expect(near.pointB[0]).toBeCloseTo(3000, 6);
  });

  it('reports zero distance for solids that touch or overlap — which is the clash primitive', async () => {
    const a = await client.request('makeBox', { nodeId: 'a', dx: 1000, dy: 1000, dz: 1000 });
    const b = await client.request('makeBox', {
      nodeId: 'b',
      at: [900, 0, 0], // 100 mm of overlap: a clash
      dx: 1000,
      dy: 1000,
      dz: 1000,
    });

    const clash = await client.request('distance', { a: a.handle, b: b.handle });
    expect(clash.distance).toBe(0);
  });

  it('classifies a point as inside, outside, or on the boundary', async () => {
    const wall = await client.request('makeBox', { ...WALL, at: [1000, 500, 0] });
    const at = async (point: readonly [number, number, number]) =>
      (await client.request('classifyPoint', { handle: wall.handle, point })).state;

    expect(await at([2500, 600, 1250])).toBe('inside');
    expect(await at([0, 0, 0])).toBe('outside');
    expect(await at([2500, 600, 5000])).toBe('outside');

    // On the y-min face — the boundary is neither in nor out, and a query that rounded it to one of
    // them would be wrong exactly where a wall's surface is, which is where everything gets hosted.
    expect(await at([2500, 500, 1250])).toBe('on');
  });

  it('answers from the B-REP, not from the mesh — and never returns triangles', async () => {
    const wall = await client.request('makeBox', WALL);
    const { bounds } = await client.request('bounds', { handle: wall.handle });

    // The result is millimetres and nothing else. If a query ever starts handing back geometry, an
    // agent will start reasoning about triangles — and a tessellated column is SMALLER than the real
    // one by its chord error, so every clearance it computed would be quietly wrong (D23).
    expect(Object.keys(bounds).sort()).toEqual(['max', 'min']);
    expect(bounds.max).toEqual([WALL.dx, WALL.dy, WALL.dz]);
  });

  it(`(${name}) advertises what it can actually do`, async () => {
    const { kernel: info } = await client.handshake();
    // A caller should be able to ASK, rather than discover by failure, whether this kernel can answer
    // spatial queries. The mock can (a box has a closed form); it cannot do booleans, and says so.
    expect(info.capabilities).toContain('bounds');
    expect(info.capabilities).toContain('distance');
    expect(info.capabilities).toContain('classifyPoint');
    expect(info.capabilities.includes('boolean')).toBe(name === 'occt');
  });
});
