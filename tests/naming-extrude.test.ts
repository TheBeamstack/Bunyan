// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * PERSISTENT NAMING ON AN EXTRUDED PROFILE — the op three of the five MVP types are built from.
 *
 * ⚠ THE RULE THIS FILE ENFORCES, and it is the one thing that makes `extrude` safe to freeze into the
 * protocol:
 *
 *     `lateral.k` IS THE FACE SWEPT FROM THE k-TH SEGMENT THE AUTHOR DREW.
 *
 * Not the k-th face OCCT happened to build. Not the k-th face in some traversal. The k-th segment of
 * the array in the payload. That distinction is invisible on a rectangle and decisive on everything
 * else: it is what lets a user drag a slab's corner — moving the boundary, changing every coordinate
 * of two faces — without re-targeting a single reference into it.
 *
 * ⚠ And per `core_logic.md` §5: **a naming bug does not look like a geometry bug.** The volumes stay
 * exact while the names lie (four of a box's six faces were once mislabelled, and every number in the
 * suite still passed). So these tests do not check millimetres — `golden-extrude.test.ts` does that.
 * They check that the names refer to what they claim to, and that they SURVIVE the edits that must
 * preserve them.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernelHost } from '@bunyan/kernel-occt';
import type { Profile } from '@bunyan/protocol';

/** A rectangle drawn flat on the ground, counter-clockwise from the origin. */
const rect = (dx: number, dy: number): Profile => ({
  plane: { origin: [0, 0, 0], normal: [0, 0, 1], xAxis: [1, 0, 0] },
  start: [0, 0],
  segments: [
    { kind: 'line', to: [dx, 0] }, // segment 0 -> the y-min face
    { kind: 'line', to: [dx, dy] }, // segment 1 -> the x-max face
    { kind: 'line', to: [0, dy] }, // segment 2 -> the y-max face
    { kind: 'line', to: [0, 0] }, // segment 3 -> the x-min face
  ],
});

describe('persistent naming — extrude', () => {
  let client: KernelClient;

  beforeAll(async () => {
    client = new KernelClient(new InProcessTransport(await createOcctKernelHost()));
  });
  afterAll(() => {
    client.dispose();
  });

  /** A wall, built the way a Wall type will build one: a footprint, swept up. */
  const wall = async (nodeId: string, dx = 3000, dy = 200, dz = 2500) =>
    client.request('extrude', { nodeId, profile: rect(dx, dy), height: dz });

  /**
   * ⚠ THE HONESTY CHECK, and nothing else in the suite can do its job.
   *
   * A mislabelled face passes every numeric test in this repo: the solid is exact, and only its NAMES
   * are wrong. So we go and MEASURE where each named face actually is. `lateral.0` was swept from the
   * segment (0,0) -> (dx,0), so it had better be the face lying flat at y = 0.
   */
  it('the role labels are HONEST: lateral.k is the face swept from authored segment k', async () => {
    const dx = 3000;
    const dy = 200;
    const dz = 2500;
    const w = await wall('wall-1', dx, dy, dz);

    const boundsOf = async (ref: string) =>
      (await client.request('bounds', { handle: w.handle, ref })).bounds;

    // Segment 0: (0,0) -> (3000,0). Its face is the plane y = 0.
    const l0 = await boundsOf('wall-1/face/lateral.0#0');
    expect(l0.min[1]).toBeCloseTo(0, 6);
    expect(l0.max[1]).toBeCloseTo(0, 6);

    // Segment 1: (3000,0) -> (3000,200). Its face is the plane x = 3000.
    const l1 = await boundsOf('wall-1/face/lateral.1#0');
    expect(l1.min[0]).toBeCloseTo(dx, 6);
    expect(l1.max[0]).toBeCloseTo(dx, 6);

    // Segment 2: (3000,200) -> (0,200). Its face is the plane y = 200.
    const l2 = await boundsOf('wall-1/face/lateral.2#0');
    expect(l2.min[1]).toBeCloseTo(dy, 6);
    expect(l2.max[1]).toBeCloseTo(dy, 6);

    // Segment 3: (0,200) -> (0,0). Its face is the plane x = 0.
    const l3 = await boundsOf('wall-1/face/lateral.3#0');
    expect(l3.min[0]).toBeCloseTo(0, 6);
    expect(l3.max[0]).toBeCloseTo(0, 6);

    // And the caps are where the sweep started and ended.
    const start = await boundsOf('wall-1/face/cap-start#0');
    const end = await boundsOf('wall-1/face/cap-end#0');
    expect(start.max[2]).toBeCloseTo(0, 6);
    expect(end.min[2]).toBeCloseTo(dz, 6);
  });

  /**
   * ⚠⚠ THE TEST THAT MATTERS. If only one test about `extrude` survives, keep this one.
   *
   * The parametric recipe is the source of truth (`core_logic.md` §2), so a parameter change
   * RE-RUNS THE WHOLE RECIPE from scratch — the solid is rebuilt, not edited. If identity were
   * recovered by matching geometry afterwards, this is precisely where it would silently re-target
   * every reference in the building. So: resize the wall, rebuild, and demand the names come back
   * byte for byte.
   */
  it('a wall resized from 3000 to 4000 long comes back with byte-identical refs', async () => {
    const before = await wall('wall-1', 3000, 200, 2500);
    const after = await wall('wall-1', 4000, 200, 2500);

    expect(after.refs).toEqual(before.refs);

    // And the names still mean what they meant — `lateral.1` is the far end, wherever the far end now
    // is. The face MOVED (x = 3000 -> x = 4000); its identity did NOT.
    const far = (
      await client.request('bounds', { handle: after.handle, ref: 'wall-1/face/lateral.1#0' })
    ).bounds;
    expect(far.min[0]).toBeCloseTo(4000, 6);
    expect(far.max[0]).toBeCloseTo(4000, 6);
  });

  /**
   * ⚠ THE SAME, BUT MOVING A SINGLE VERTEX — an L-shaped plate whose inner corner is dragged.
   *
   * This is the edit a slab actually receives, and the one where a positional naming scheme would come
   * apart: two of the six faces change size, one changes plane, and the vertex count is unchanged. A
   * scheme that named faces by "which face is at x = 2000" would re-target here. An authored-index
   * scheme cannot.
   */
  it('an L-shaped slab keeps every ref when its inner corner is dragged', async () => {
    const plate = (inner: number): Profile => ({
      plane: { origin: [0, 0, 0], normal: [0, 0, 1], xAxis: [1, 0, 0] },
      start: [0, 0],
      segments: [
        { kind: 'line', to: [6000, 0] },
        { kind: 'line', to: [6000, 2000] },
        { kind: 'line', to: [inner, 2000] }, // <- the corner being dragged
        { kind: 'line', to: [inner, 4000] },
        { kind: 'line', to: [0, 4000] },
        { kind: 'line', to: [0, 0] },
      ],
    });

    const before = await client.request('extrude', {
      nodeId: 'slab-1',
      profile: plate(2000),
      height: 200,
    });
    const after = await client.request('extrude', {
      nodeId: 'slab-1',
      profile: plate(3500), // drag the inner corner 1.5 m
      height: 200,
    });

    expect(after.refs).toEqual(before.refs);
    expect(after.refs.filter((r) => r.includes('/face/'))).toHaveLength(8); // 6 laterals + 2 caps

    // `lateral.3` was swept from the segment (inner,2000) -> (inner,4000), so it is the face at
    // x = inner. It must have FOLLOWED the drag — same name, new place.
    const moved = (
      await client.request('bounds', { handle: after.handle, ref: 'slab-1/face/lateral.3#0' })
    ).bounds;
    expect(moved.min[0]).toBeCloseTo(3500, 6);
    expect(moved.max[0]).toBeCloseTo(3500, 6);
  });

  /**
   * ⚠ THE PAYOFF — and the reason any of this exists.
   *
   * Host a window on the wall's `lateral.0` face, then RESIZE THE WALL and rebuild the whole recipe.
   * The window's host reference must still name the same face. This is the Opening→Host relationship
   * (`core_logic.md` §3.6) running on an extruded wall rather than a box, which is what a real Wall
   * type will do.
   */
  it('a window hosted on lateral.0 survives the wall being made longer AND taller', async () => {
    const cutWindow = async (wallDx: number, wallDz: number) => {
      const w = await client.request('extrude', {
        nodeId: 'wall-1',
        profile: rect(wallDx, 200),
        height: wallDz,
      });
      const opening = await client.request('makeBox', {
        nodeId: 'window-1',
        at: [800, -50, 900],
        dx: 1000,
        dy: 300, // clean through the 200 mm wall, with margin on both sides
        dz: 1400,
      });
      return client.request('boolean', {
        nodeId: 'cut-1',
        kind: 'cut',
        a: w.handle,
        b: opening.handle,
      });
    };

    const before = await cutWindow(3000, 2500);
    const after = await cutWindow(5000, 3000); // longer AND taller — the whole recipe re-runs

    // Every identity, byte for byte, across a full rebuild at different parameters.
    expect(after.refs).toEqual(before.refs);

    // ⚠ AND THE HOST FACE IS STILL THERE, STILL ITSELF. The boolean reports `lateral.0` as `Modified`
    // (it now has a hole in it) — but it is still ONE face, so it is still THAT face, and it keeps its
    // token. If this ref had been re-owned by the cut, the window would be hosted on a face that only
    // exists because the window is there: a circular reference that breaks the moment it is edited.
    expect(after.refs).toContain('wall-1/face/lateral.0#0');
  });

  /**
   * The profile is validated before it ever reaches a solid op (spec §5.2), and the failures are
   * TYPED — so the UI can say "your boundary crosses itself", not "something went wrong".
   */
  it('refuses an open profile and a self-intersecting one, with typed failures', async () => {
    const open = client.request('extrude', {
      nodeId: 'bad-1',
      profile: {
        plane: { origin: [0, 0, 0], normal: [0, 0, 1], xAxis: [1, 0, 0] },
        start: [0, 0],
        segments: [
          { kind: 'line', to: [1000, 0] },
          { kind: 'line', to: [1000, 1000] },
          { kind: 'line', to: [500, 500] }, // ... and never returns to the start
        ],
      },
      height: 100,
    });
    await expect(open).rejects.toMatchObject({ failure: { code: 'INVALID_PROFILE' } });

    // A figure-eight: closed, planar, and complete nonsense.
    const crossed = client.request('extrude', {
      nodeId: 'bad-2',
      profile: {
        plane: { origin: [0, 0, 0], normal: [0, 0, 1], xAxis: [1, 0, 0] },
        start: [0, 0],
        segments: [
          { kind: 'line', to: [1000, 1000] },
          { kind: 'line', to: [1000, 0] },
          { kind: 'line', to: [0, 1000] },
          { kind: 'line', to: [0, 0] },
        ],
      },
      height: 100,
    });
    await expect(crossed).rejects.toMatchObject({ failure: { code: 'INVALID_PROFILE' } });
  });

  /**
   * CHAMFER addresses its edge BY IDENTITY, exactly as the fillet does — so "chamfer that edge" still
   * means the same edge after the wall is resized and the model rebuilt.
   */
  it('a chamfer follows its edge through a rebuild at different parameters', async () => {
    const chamferedWall = async (dx: number) => {
      const w = await wall('wall-1', dx, 200, 2500);
      const edge = w.refs.find((r) => r.includes('/edge/'));
      expect(edge).toBeDefined();
      return {
        edge,
        result: await client.request('chamfer', {
          nodeId: 'ch-1',
          handle: w.handle,
          edge: edge ?? '',
          distance: 40,
        }),
      };
    };

    const before = await chamferedWall(3000);
    const after = await chamferedWall(4500);

    // The edge it chamfered is the same edge, named the same way, on a wall of a different size.
    expect(after.edge).toBe(before.edge);
    expect(after.result.refs).toEqual(before.result.refs);
  });
});
