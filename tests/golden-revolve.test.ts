// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE GOLDENS FOR REVOLVE — the last op P2 step 1 named that had never been built, and the half of
 * GenericSolid that `extrude` does not cover.
 *
 * ⚠ WHY A CLOSED FORM, AGAIN, AND WHY IT IS NOT DECORATION. The native-OCCT oracle
 * (`tools/oracle/occt.py`) and our WASM kernel are handed **the same meridian profile**. If *we* author
 * that boundary wrongly, both spin the *same wrong section*, produce the *same wrong solid*, and agree
 * to the last digit — the primary oracle is structurally blind to the likeliest bug in the op. So every
 * case below is also checked against a formula computed some OTHER way: a cylinder's, a tube's, a
 * hemisphere's. `analytic.py` never sees a swept solid, and the seeder ABORTS if the two disagree.
 *
 * ⚠⚠ AND WHY THESE FOUR CASES SPECIFICALLY. Each one is the only thing in the suite that exercises a
 * path the kernel gets right for a MEASURED reason (`tools/kernel-build/probe.cpp`, Entry 14) rather
 * than an assumed one. A full 360° revolve is not a partial one with a bigger number:
 *
 *   | case         | what only it can catch                                                        |
 *   |--------------|-------------------------------------------------------------------------------|
 *   | column       | a segment lying ON THE AXIS sweeps into a line, not a face — a naive "every    |
 *   |              | segment generates exactly one face, or refuse" rule rejects an ordinary column |
 *   | tube         | a RADIAL segment's face gets NO HISTORY AT ALL from OCCT, though the face is   |
 *   |              | right there — the flat bottom of every column, the base of every dome          |
 *   | hemisphere   | an ARC, and a pole where the face degenerates to a point                       |
 *   | partial 90°  | the control: a partial revolve HAS caps, and a full one has none               |
 *
 * ⚠ The mock does not appear here and cannot: it has no `revolve` (and no `extrude`). A surface of
 * revolution over an arc has no closed form a mock could honestly fake. It says so in `capabilities`.
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

/** The Z axis, through the origin — the axis every case below spins around. */
const Z_AXIS = { origin: [0, 0, 0], direction: [0, 0, 1] } as const;

/**
 * The golden's meridian, as a protocol `Profile`.
 *
 * ⚠ The plane is the MERIDIAN plane — normal −Y, x-axis +X — so `(u, v)` lands at `(u, 0, v)`: the
 * section is drawn beside the axis it spins around, which is how a column, a baluster or a dome is
 * actually authored. It is the same frame `occt.py` builds its reference in; if they differed, the two
 * would not be comparable at all.
 */
const meridianFromGolden = (golden: GoldenCase): Profile => {
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
    plane: { origin: [0, 0, 0], normal: [0, -1, 0], xAxis: [1, 0, 0] },
    start: points[0] as [number, number],
    segments,
  };
};

describe('goldens — revolve, against a native OCCT reference AND a closed form', () => {
  let client: KernelClient;

  beforeAll(async () => {
    client = new KernelClient(new InProcessTransport(await createOcctKernelHost()));
  });
  afterAll(() => {
    client.dispose();
  });

  const revolveGolden = async (name: string, nodeId: string) => {
    const golden = find(name);
    const shape = await client.request('revolve', {
      nodeId,
      profile: meridianFromGolden(golden),
      axis: Z_AXIS,
      angle: golden.params['angle'] as number,
    });

    const m = await client.request('measure', { handle: shape.handle });
    const { bounds } = await client.request('bounds', { handle: shape.handle });

    for (const [tier, ref] of [
      ['native OCCT', golden.crossCheck],
      ['the closed form', golden.analytic],
    ] as const) {
      if (ref === undefined) continue;

      closeTo(m.volume, ref.volume, `${name} volume vs ${tier}`);
      closeTo(m.area, ref.area, `${name} area vs ${tier}`);
      closeTo(m.edgeLength, ref.edgeLength, `${name} edgeLength vs ${tier}`);
      expect(m.counts, `${name} topology counts vs ${tier}`).toEqual(ref.counts);

      for (let axis = 0; axis < 3; axis++) {
        closeTo(bounds.min[axis] ?? 0, ref.bounds.min[axis] ?? 0, `${name} bounds.min[${axis}]`);
        closeTo(bounds.max[axis] ?? 0, ref.bounds.max[axis] ?? 0, `${name} bounds.max[${axis}]`);
      }
    }
    return { shape, measure: m };
  };

  /**
   * ⚠ THE STRONGEST CHECK IN THE SET, AND THE CHEAPEST. A rectangle touching the axis, spun a full
   * turn, IS a cylinder — so `revolve` and the `makeCylinder` primitive, two entirely different OCCT
   * code paths, must land on the same solid to the last digit. They are compared directly, here.
   *
   * Its meridian also has a segment lying ON THE AXIS (the closing side, from the top of the axis back
   * to the origin). That segment sweeps into a LINE, not a face — so it generates nothing, and a naive
   * "every segment generates exactly one face, or refuse" rule (which is what the prism uses, and what
   * copying the prism would have given us) rejects an ordinary column outright.
   */
  it('a revolved rectangle IS a cylinder — and measures identically to the makeCylinder primitive', async () => {
    const { measure: m } = await revolveGolden('revolve-column-r150-h3000', 'col-1');

    const primitive = await client.request('makeCylinder', {
      nodeId: 'col-primitive',
      radius: 150,
      height: 3000,
    });
    const p = await client.request('measure', { handle: primitive.handle });

    closeTo(m.volume, p.volume, 'revolved column volume vs the makeCylinder primitive');
    closeTo(m.area, p.area, 'revolved column area vs the makeCylinder primitive');
    closeTo(m.edgeLength, p.edgeLength, 'revolved column edgeLength vs the makeCylinder primitive');
    expect(m.counts, 'a revolved rectangle has a cylinder’s topology').toEqual(p.counts);

    // And by hand, so the intent survives a re-seed from a broken kernel.
    expect(m.volume).toBeCloseTo(Math.PI * 150 ** 2 * 3000, 3);
    expect(m.counts).toEqual({ solids: 1, faces: 3, edges: 3, vertices: 2 });
  });

  /**
   * ⚠⚠ THE ORPHAN-FACE CASE — the one that would have shipped a kernel refusing every real column.
   *
   * A rectangle clear of the axis sweeps into a hollow tube: two cylindrical walls, and two ANNULI
   * swept from the two RADIAL segments. OCCT reports **no history at all** for those two segments —
   * `Generated()` is empty and `IsDeleted()` is true — while their faces sit right there in the result
   * (measured, probe.cpp). The kernel names them from the circles their endpoints sweep. If that rule
   * were wrong, this shape would not build; if the geometry were wrong, the closed form catches it.
   */
  it('a hollow tube: the annular faces OCCT gives NO history for are still named, and the solid is exact', async () => {
    const { shape, measure: m } = await revolveGolden('revolve-tube-r500-r1000-h3000', 'tube-1');

    expect(m.volume).toBeCloseTo(Math.PI * (1000 ** 2 - 500 ** 2) * 3000, 3);
    expect(m.counts).toEqual({ solids: 1, faces: 4, edges: 6, vertices: 4 });

    // ⚠ THE POINT OF THE CASE: all four faces are NAMED, including the two OCCT disowned. The kernel
    // refuses to store a solid carrying a face it could not name, so a build at all is half the proof —
    // and the refs being the AUTHORED segment indices is the other half.
    const faces = shape.refs.filter((r) => r.includes('/face/'));
    expect(faces).toHaveLength(4);
    for (const k of [0, 1, 2, 3]) {
      expect(
        faces.some((r) => r.endsWith(`/face/lateral.${String(k)}#0`)),
        `the face swept from AUTHORED segment ${String(k)} must be named lateral.${String(k)} — segments 0 and 2 are the radial ones OCCT reports nothing for`,
      ).toBe(true);
    }

    // The two cylindrical faces close on themselves, so each carries a SEAM edge that no face PAIR can
    // name (the cylinder's problem, Entry 9). The revolve gets them free: the seam IS the authored
    // profile edge, handed back by identity. The two ANNULI have no seam — a plane does not close on
    // itself — which is why there are exactly two.
    const seams = shape.refs.filter((r) => r.includes('.seam'));
    expect(seams).toHaveLength(2);
    expect(seams.some((r) => r.includes('lateral.1.seam'))).toBe(true);
    expect(seams.some((r) => r.includes('lateral.3.seam'))).toBe(true);
  });

  /**
   * A HEMISPHERE — an arc segment, and a pole where the spherical face degenerates to a point (OCCT
   * emits a degenerate edge there, which counts in the topology and contributes no length).
   *
   * Its closed form is the schoolbook 2/3·π·r³, which our profile code cannot taint.
   */
  it('a hemisphere from an arc: 2/3·π·r³, and the pole does not break the naming', async () => {
    const { shape, measure: m } = await revolveGolden('revolve-hemisphere-r1000', 'dome-1');

    expect(m.volume).toBeCloseTo((2 / 3) * Math.PI * 1000 ** 3, 3);
    expect(m.area).toBeCloseTo(3 * Math.PI * 1000 ** 2, 3);
    expect(m.counts).toEqual({ solids: 1, faces: 2, edges: 3, vertices: 2 });

    // Two faces: the flat base (segment 0, radial ⇒ no OCCT history) and the spherical cap (segment 1,
    // the arc). The third segment lies ON THE AXIS and sweeps into nothing — correctly, and it must not
    // be mistaken for a face the kernel failed to find.
    const faces = shape.refs.filter((r) => r.includes('/face/'));
    expect(faces).toHaveLength(2);
    expect(faces.some((r) => r.endsWith('/face/lateral.0#0'))).toBe(true);
    expect(faces.some((r) => r.endsWith('/face/lateral.1#0'))).toBe(true);
  });

  /**
   * ⚠ THE CONTROL. A PARTIAL revolve has caps and no seams — it behaves exactly like an extrusion. A
   * full one has seams and no caps. If the kernel ever conflates the two, exactly one of these two
   * cases fails, which is precisely what a control is for.
   */
  it('a partial (90°) revolve HAS caps and no seams — the full-turn case has neither', async () => {
    const { shape, measure: m } = await revolveGolden('revolve-tube-partial-90deg', 'tube-90');

    expect(m.volume).toBeCloseTo((Math.PI * (1000 ** 2 - 500 ** 2) * 3000) / 4, 3);
    expect(m.counts).toEqual({ solids: 1, faces: 6, edges: 12, vertices: 8 });

    // Six faces: four laterals (one per authored segment — ALL of them generate here) plus the two caps
    // that only a partial turn has.
    expect(shape.refs.some((r) => r.endsWith('/face/cap-start#0'))).toBe(true);
    expect(shape.refs.some((r) => r.endsWith('/face/cap-end#0'))).toBe(true);
    for (const k of [0, 1, 2, 3]) {
      expect(shape.refs.some((r) => r.endsWith(`/face/lateral.${String(k)}#0`))).toBe(true);
    }
    // And NO seam: nothing closes on itself in a 90° sweep.
    expect(shape.refs.filter((r) => r.includes('.seam'))).toHaveLength(0);
  });

  /**
   * The payload contract, refused loudly rather than guessed at: an angle outside (0, 360].
   */
  it('refuses an angle outside (0, 360] with a typed failure', async () => {
    const golden = find('revolve-column-r150-h3000');
    for (const angle of [0, -90, 361]) {
      await expect(
        client.request('revolve', {
          nodeId: 'bad',
          profile: meridianFromGolden(golden),
          axis: Z_AXIS,
          angle,
        }),
      ).rejects.toMatchObject({ failure: { code: 'INVALID_PAYLOAD' } });
    }
  });
});
