// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE GOLDENS FOR EXTRUDE AND CHAMFER — the ops that were missing, and how they are gated.
 *
 * ⚠ WHY THE CLOSED FORM IS NOT OPTIONAL HERE, AND IS THE WHOLE POINT OF THIS FILE.
 *
 * The native-OCCT oracle (`tools/oracle/occt.py`) and our WASM kernel are handed **the same profile**.
 * So if *we* build that boundary wrongly — a dropped vertex, a transposed coordinate, a loop that
 * closes the long way round — both of them sweep the *same wrong polygon*, produce the *same wrong
 * solid*, and agree with each other to the last digit. **The primary oracle is structurally blind to
 * the most likely bug in the op.** It is the same trap `transform` set with its angle (Entry 11), and
 * it is why spec §9.0 keeps the closed-form tier even after demoting it.
 *
 * `analytic.py` is the only thing in the harness that computes the answer **from the vertices** — the
 * shoelace area for a polygon, the circular-segment area for an arc. It is the independent check, and
 * the seeder ABORTS if it disagrees with OCCT.
 *
 * ⚠ The mock does not appear here, and cannot: it has no `extrude`. A prism over a POLYGON does have a
 * closed form — but the profile also admits ARCS, and a mock that is exact for some inputs and wrong
 * for others is the one thing a mock must never be. It says so in `capabilities`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernelHost } from '@bunyan/kernel-occt';
import type { Profile, ProfileSegment } from '@bunyan/protocol';

interface Reference {
  readonly volume: number;
  readonly area: number;
  readonly edgeLength: number;
  readonly counts: {
    readonly solids: number;
    readonly faces: number;
    readonly edges: number;
    readonly vertices: number;
  };
  readonly bounds: { readonly min: number[]; readonly max: number[] };
}

interface GoldenCase {
  readonly case: string;
  readonly op: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly analytic?: Reference;
  readonly crossCheck: Reference;
}

const goldens = JSON.parse(
  readFileSync(fileURLToPath(new URL('./goldens/geometry.golden.json', import.meta.url)), 'utf8'),
) as { cases: GoldenCase[] };

const find = (name: string): GoldenCase => {
  const golden = goldens.cases.find((c) => c.case === name);
  if (golden === undefined)
    throw new Error(`golden case "${name}" is missing — re-seed the goldens`);
  return golden;
};

const closeTo = (actual: number, expected: number, what: string) => {
  const tolerance = 1e-9 * Math.max(Math.abs(expected), 1);
  expect(
    Math.abs(actual - expected),
    `${what}: got ${String(actual)}, the reference says ${String(expected)}`,
  ).toBeLessThanOrEqual(tolerance);
};

/**
 * Rebuild the golden's boundary as a protocol `Profile`: a loop of vertices on the ground plane,
 * with one segment optionally bowed into a three-point arc.
 */
const profileFromGolden = (golden: GoldenCase): Profile => {
  const points = golden.params['points'] as [number, number][];
  const arcIndex = golden.params['arcIndex'] as number | undefined;
  const via = golden.params['via'] as [number, number] | undefined;

  const segments: ProfileSegment[] = points.map((_, k) => {
    const to = points[(k + 1) % points.length] as [number, number];
    return arcIndex === k && via !== undefined
      ? ({ kind: 'arc', via, to } satisfies ProfileSegment)
      : ({ kind: 'line', to } satisfies ProfileSegment);
  });

  return {
    plane: { origin: [0, 0, 0], normal: [0, 0, 1], xAxis: [1, 0, 0] },
    start: points[0] as [number, number],
    segments,
  };
};

describe('goldens — extrude & chamfer, against a native OCCT reference AND a closed form', () => {
  let client: KernelClient;

  beforeAll(async () => {
    client = new KernelClient(new InProcessTransport(await createOcctKernelHost()));
  });
  afterAll(() => {
    client.dispose();
  });

  const checkAgainstBothTiers = async (name: string, handle: string) => {
    const golden = find(name);
    const m = await client.request('measure', { handle });
    const { bounds } = await client.request('bounds', { handle });

    for (const [tier, ref] of [
      ['native OCCT', golden.crossCheck],
      ['the closed form', golden.analytic],
    ] as const) {
      if (ref === undefined) continue; // no closed form for a chamfer — spec §9.0 permits it

      closeTo(m.volume, ref.volume, `${name} volume vs ${tier}`);
      closeTo(m.area, ref.area, `${name} area vs ${tier}`);
      closeTo(m.edgeLength, ref.edgeLength, `${name} edgeLength vs ${tier}`);
      expect(m.counts, `${name} topology counts vs ${tier}`).toEqual(ref.counts);

      for (let axis = 0; axis < 3; axis++) {
        closeTo(
          bounds.min[axis] ?? 0,
          ref.bounds.min[axis] ?? 0,
          `${name} bounds.min[${axis}] vs ${tier}`,
        );
        closeTo(
          bounds.max[axis] ?? 0,
          ref.bounds.max[axis] ?? 0,
          `${name} bounds.max[${axis}] vs ${tier}`,
        );
      }
    }
    return m;
  };

  /**
   * THE L-SHAPED FLOOR PLATE — the shape that showed the protocol could not build a building.
   * A Slab is "planar boundary + thickness" (spec §5), and a real plate is not a rectangle.
   */
  it('an L-shaped slab matches native OCCT and the shoelace closed form', async () => {
    const golden = find('slab-L-shaped-200thk');
    const slab = await client.request('extrude', {
      nodeId: 'slab-1',
      profile: profileFromGolden(golden),
      height: golden.params['height'] as number,
    });

    const m = await checkAgainstBothTiers('slab-L-shaped-200thk', slab.handle);

    // Written out by hand, so the intent survives a re-seed from a broken kernel: the L is a
    // 6000x2000 leg plus a 2000x2000 leg, 200 mm thick.
    expect(m.volume).toBeCloseTo((6000 * 2000 + 2000 * 2000) * 200, 3);
    // A prism over an n-gon has n+2 faces, 3n edges, 2n vertices. n = 6.
    expect(m.counts).toEqual({ solids: 1, faces: 8, edges: 18, vertices: 12 });
  });

  /**
   * ⚠ THE CURVED EDGE — the case that proves `extrude` bought something a box could not.
   *
   * An L-shaped plate is reachable (clumsily) as a fuse of two boxes. A CURVED boundary is reachable
   * from boxes and booleans at no cost whatsoever. This is the shape that makes the op load-bearing
   * rather than a convenience.
   */
  it('a slab with a curved edge matches OCCT and the circular-segment closed form', async () => {
    const golden = find('slab-curved-edge-200thk');
    const slab = await client.request('extrude', {
      nodeId: 'slab-2',
      profile: profileFromGolden(golden),
      height: golden.params['height'] as number,
    });

    const m = await checkAgainstBothTiers('slab-curved-edge-200thk', slab.handle);

    // Derived by hand and asserted here, independent of both the goldens and the kernel:
    // the arc through (6000,0), (7000,2000), (6000,4000) lies on a circle of centre (4500,2000),
    // R = 2500. Its circular segment beyond the chord x = 6000 has area
    //     R^2*acos(d/R) - d*sqrt(R^2 - d^2),  with d = R - sagitta = 2500 - 1000 = 1500
    //   = 6.25e6 * acos(0.6) - 1500*2000 = 2,795,595.1125 mm^2.
    const segment = 2500 ** 2 * Math.acos(0.6) - 1500 * 2000;
    expect(m.volume).toBeCloseTo((6000 * 4000 + segment) * 200, 3);

    // The bulge pushes the bounding box past the polygon — to x = 4500 + 2500 = 7000.
    const { bounds } = await client.request('bounds', { handle: slab.handle });
    expect(bounds.max[0]).toBeCloseTo(7000, 6);
  });

  /**
   * CHAMFER — no closed form is offered, deliberately (spec §9.0: where none exists, the reference
   * build stands alone). But the volume a chamfer REMOVES does have one, and it is asserted here:
   * a 45-degree cut of setback d along an edge of length L removes a triangular prism, d^2/2 * L.
   */
  it('a chamfered box matches native OCCT — and removes exactly the triangular prism it should', async () => {
    const golden = find('box-wall-chamfer-d50');
    const box = golden.params['box'] as { dx: number; dy: number; dz: number };
    const distance = golden.params['distance'] as number;

    const base = await client.request('makeBox', { nodeId: 'wall-1', ...box });
    const edge = base.refs.find((r) => r.includes('/edge/x-max|y-min'));
    expect(edge, 'the box must expose its x-max|y-min edge by identity').toBeDefined();

    const chamfered = await client.request('chamfer', {
      nodeId: 'ch-1',
      handle: base.handle,
      // ⚠ ADDRESSED BY IDENTITY, not by an index — the same contract as the fillet, and the reason
      // "chamfer THAT edge" still means the same edge after the wall is resized and rebuilt.
      edge: edge ?? '',
      distance,
    });

    const m = await checkAgainstBothTiers('box-wall-chamfer-d50', chamfered.handle);

    // The removed wedge: a right triangle of legs 50x50, swept the full 2500 mm height of the edge.
    const removed = ((distance * distance) / 2) * box.dz;
    expect(m.volume).toBeCloseTo(box.dx * box.dy * box.dz - removed, 3);
    // One new face where the edge was.
    expect(m.counts.faces).toBe(7);
  });
});
