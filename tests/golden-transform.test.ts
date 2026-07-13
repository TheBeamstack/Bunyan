/**
 * THE GOLDENS FOR TRANSFORM — and the one case where the usual measures cannot do the job.
 *
 * ⚠ READ THIS BEFORE ADDING A CASE HERE. Volume, area, edge length and topology counts are ALL
 * INVARIANT under a rigid motion. A `transform` that rotated by the wrong angle, about the wrong axis,
 * in radians where degrees were meant — or that silently did nothing at all — would reproduce every
 * one of them EXACTLY. The measures that gate every other shape in this repo are, here, blind.
 *
 * So the two nets are:
 *   1. **`bounds`** — the only measure a rigid motion moves. This is what actually catches a wrong
 *      transform, and it is checked against a native OCCT reference AND against a closed form.
 *   2. **the invariants** — asserted to be UNCHANGED, which is what proves the motion was rigid rather
 *      than a stretch that happened to land on the right bounding box.
 *
 * The closed-form tier earns its keep here more than anywhere else in the harness: if we passed OCCT
 * the wrong angle, our WASM kernel and the native-OCCT oracle would go through the SAME wrong angle
 * and agree with each other perfectly. Only a tier that computes the answer independently from the
 * angle can catch that — and `tools/oracle/analytic.py` does, by rotating the four base corners.
 *
 * ⚠ The mock does not appear here, and cannot: it has no `transform`. Honouring one would require it
 * to become a general oriented-box engine — and its `distance` op, which is exact in closed form for
 * two AXIS-ALIGNED boxes, has no closed form for two rotated ones. It says so in `capabilities`
 * rather than half-faking it (the same rule it applies to booleans).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernelHost } from '@bunyan/kernel-occt';
import type { RigidMotion } from '@bunyan/protocol';

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

describe('goldens — transform, against a native OCCT reference AND a closed form', () => {
  let client: KernelClient;

  beforeAll(async () => {
    client = new KernelClient(new InProcessTransport(await createOcctKernelHost()));
  });
  afterAll(() => {
    client.dispose();
  });

  /** Build the golden's box, apply the golden's motions, and check it against both tiers. */
  const runCase = async (name: string) => {
    const golden = find(name);
    const box = golden.params['box'] as { dx: number; dy: number; dz: number };
    const motions = golden.params['motions'] as RigidMotion[];

    const base = await client.request('makeBox', { nodeId: 'wall-1', ...box });
    const moved = await client.request('transform', { handle: base.handle, motions });

    const m = await client.request('measure', { handle: moved.handle });
    const { bounds } = await client.request('bounds', { handle: moved.handle });

    for (const [tier, ref] of [
      ['native OCCT', golden.crossCheck],
      ['the closed form', golden.analytic],
    ] as const) {
      expect(ref, `${name} must carry a "${tier}" tier`).toBeDefined();
      if (ref === undefined) continue;

      // THE ONE THAT MOVES — and therefore the only one that can catch a wrong angle or axis.
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

      // THE ONES THAT MUST NOT — the proof that the motion was RIGID.
      closeTo(m.volume, ref.volume, `${name} volume vs ${tier}`);
      closeTo(m.area, ref.area, `${name} area vs ${tier}`);
      closeTo(m.edgeLength, ref.edgeLength, `${name} edgeLength vs ${tier}`);
      expect(m.counts, `${name} topology counts vs ${tier}`).toEqual(ref.counts);
    }

    return { base, moved, m, bounds };
  };

  it('a wall rotated 30 deg matches native OCCT and the closed form — bounds included', async () => {
    const { m } = await runCase('wall-rotated-30deg');

    // Rigid: the wall did not change size. (Stated separately from the golden so the intent survives
    // even if someone re-seeds the goldens from a broken kernel.)
    expect(m.volume).toBeCloseTo(3000 * 200 * 2500, 3);
    expect(m.counts.faces).toBe(6);

    // ⚠ AND THE ASSERTION THAT CATCHES THE DEGREES/RADIANS BUG, written out by hand. 30 degrees is
    // 0.5236 rad; a kernel that read "30" as radians would land somewhere else entirely, and every
    // invariant above would still pass. cos30 = 0.8660..., sin30 = 0.5 exactly.
    const { bounds } = await client.request('bounds', {
      handle: (
        await client.request('transform', {
          handle: (await client.request('makeBox', { nodeId: 'w2', dx: 3000, dy: 200, dz: 2500 }))
            .handle,
          motions: [{ kind: 'rotate', axis: [0, 0, 1], degrees: 30 }],
        })
      ).handle,
    });
    const cos30 = Math.cos(Math.PI / 6);
    const sin30 = Math.sin(Math.PI / 6);
    // The four base corners (0,0) (3000,0) (0,200) (3000,200) rotated: x spans -200*sin30 .. 3000*cos30.
    expect(bounds.min[0]).toBeCloseTo(-200 * sin30, 6);
    expect(bounds.max[0]).toBeCloseTo(3000 * cos30, 6);
    expect(bounds.max[1]).toBeCloseTo(3000 * sin30 + 200 * cos30, 6);
    // Z is untouched by a rotation about Z.
    expect(bounds.min[2]).toBeCloseTo(0, 6);
    expect(bounds.max[2]).toBeCloseTo(2500, 6);
  });

  /**
   * ⚠ THE MIRROR, AND THE NUMBER THAT MATTERS IS THE SIGN OF THE VOLUME.
   *
   * A mirror flips handedness. A kernel that mishandles a negative transform hands back an INSIDE-OUT
   * solid — and its area, its edge length, its counts and even its bounding box are all still perfect.
   * The only tell is that its volume comes back NEGATIVE. Nothing else in this harness would notice,
   * and a mirrored wall would render, measure and schedule as if nothing were wrong until some
   * downstream boolean produced nonsense.
   */
  it('a mirrored wall lands at negative x — and its volume is POSITIVE, not inside-out', async () => {
    const { m, bounds } = await runCase('wall-mirrored-yz');

    expect(m.volume).toBeGreaterThan(0);
    expect(m.volume).toBeCloseTo(3000 * 200 * 2500, 3);

    // Mirrored in the YZ plane: what was at x in [0, 3000] is now at x in [-3000, 0].
    expect(bounds.min[0]).toBeCloseTo(-3000, 6);
    expect(bounds.max[0]).toBeCloseTo(0, 6);
  });
});
