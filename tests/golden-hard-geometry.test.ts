/**
 * THE GOLDENS FOR HARD GEOMETRY — a cylinder, a boolean, a fillet.
 *
 * `golden-box.test.ts` gates the box. `naming-hard-topology.test.ts` gates the NAMES on hard shapes.
 * Neither gates the *numbers* of a boolean — and a wrong boolean is the one bug in this session's work
 * that WOULD look like a geometry bug, and would therefore slip past every naming test in the repo.
 *
 * So: every case below is measured by our WASM kernel and compared to a value seeded offline from a
 * NATIVE OCCT build (`tools/oracle`, via `cadquery-ocp`). Same kernel, different binding, different
 * build, different code path — so a disagreement means **our** code is wrong (spec §9.0). We are not
 * auditing OCCT; we are auditing ourselves against it.
 *
 * ⚠ The mock does not appear here, and cannot: it has no booleans. It says so in its `capabilities`
 * rather than faking one (see `kernel-mock/src/kernel.ts`).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernelHost } from '@bunyan/kernel-occt';

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
  /** The op's parameters as seeded. Shaped per op, so each test asserts what it expects to find. */
  readonly params: Readonly<Record<string, unknown>>;
  readonly analytic?: Reference;
  readonly crossCheck: Reference;
  /**
   * A closed form for the VOLUME ALONE (D28's through-duct). Some shapes have an exact form for one
   * measure and none for the others — checking the one we can is strictly better than checking none.
   */
  readonly volumeClosedForm?: number;
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

/** The goldens are exact to the last bit the kernel can produce; 1e-9 relative is the seeded tolerance. */
const closeTo = (actual: number, expected: number, what: string) => {
  const tolerance = 1e-9 * Math.max(Math.abs(expected), 1);
  expect(
    Math.abs(actual - expected),
    `${what}: got ${String(actual)}, native OCCT says ${String(expected)}`,
  ).toBeLessThanOrEqual(tolerance);
};

describe('goldens — hard geometry, against a native OCCT reference build', () => {
  let client: KernelClient;

  beforeAll(async () => {
    client = new KernelClient(new InProcessTransport(await createOcctKernelHost()));
  });
  afterAll(() => {
    client.dispose();
  });

  const assertMatches = async (handle: string, golden: GoldenCase) => {
    const m = await client.request('measure', { handle });
    const { bounds } = await client.request('bounds', { handle });
    const ref = golden.crossCheck;

    closeTo(m.volume, ref.volume, `${golden.case} volume`);
    closeTo(m.area, ref.area, `${golden.case} area`);
    closeTo(m.edgeLength, ref.edgeLength, `${golden.case} edgeLength`);
    expect(m.counts, `${golden.case} topology counts`).toEqual(ref.counts);

    for (let axis = 0; axis < 3; axis++) {
      closeTo(bounds.min[axis] ?? 0, ref.bounds.min[axis] ?? 0, `${golden.case} bounds.min`);
      closeTo(bounds.max[axis] ?? 0, ref.bounds.max[axis] ?? 0, `${golden.case} bounds.max`);
    }
  };

  it('a cylinder matches native OCCT exactly — volume, area, and the curved-surface area', async () => {
    const golden = find('cylinder-column-r150-h3000');
    const column = await client.request('makeCylinder', {
      nodeId: 'column-1',
      radius: golden.params['radius'] as number,
      height: golden.params['height'] as number,
    });
    await assertMatches(column.handle, golden);

    // ⚠ THE REASON THE `measure` OP EXISTS. Read off the triangles, this volume is SMALLER — every
    // chord cuts a sliver off the circle. A quantity schedule built on the mesh under-bills every
    // column in the project, and nothing about the drawing would look wrong.
    const mesh = await client.request('tessellate', { handle: column.handle, deflection: 1 });
    expect(mesh.provenance.refs.length).toBeGreaterThan(0);
    const exact = await client.request('measure', { handle: column.handle });
    expect(exact.volume).toBeCloseTo(Math.PI * 150 * 150 * 3000, 3);
  });

  /**
   * ⚠ THE ONE THAT MATTERS, AND THE HARDEST ONE HERE.
   *
   * The opening pierces the wall FLUSH — its faces are exactly coplanar with the wall's front and back
   * faces, which is the degenerate case booleans are worst at and the case a real window actually is.
   * The closed form, the native OCCT build and our WASM build all have to agree, down to the vertex
   * count.
   */
  it('a window cut clean through a wall matches native OCCT — and the closed form agrees with both', async () => {
    const golden = find('wall-with-window-1000x1400');
    const wall = golden.params['wall'] as { dx: number; dy: number; dz: number };
    const opening = golden.params['opening'] as {
      dx: number;
      dy: number;
      dz: number;
      at: [number, number, number];
    };

    const host = await client.request('makeBox', { nodeId: 'wall-1', ...wall });
    const tool = await client.request('makeBox', {
      nodeId: 'opening-1',
      dx: opening.dx,
      dy: opening.dy,
      dz: opening.dz,
      at: opening.at,
    });
    const cut = await client.request('boolean', {
      nodeId: 'cut-1',
      kind: 'cut',
      a: host.handle,
      b: tool.handle,
    });

    await assertMatches(cut.handle, golden);

    // And the third tier: the closed form, which exists for this shape and is the check that would
    // catch us cutting with the wrong solid — or cutting the wrong way round, which would still be a
    // perfectly valid solid with a perfectly plausible volume.
    expect(golden.analytic, 'this case must carry a closed-form tier').toBeDefined();
    const m = await client.request('measure', { handle: cut.handle });
    closeTo(m.volume, golden.analytic?.volume ?? 0, 'wall-with-window volume vs the closed form');

    // The wall, less the window. ⚠ NOT bit-exact, and it should not be: a box's volume is a
    // multiplication, but a boolean's is an INTEGRATION over the result's faces, so it lands within a
    // few ULPs rather than on the nose (here: 1220000000.0000002). Demanding exact equality would be
    // demanding something OCCT never promised — and the day someone "fixed" that failing assertion,
    // they would most likely do it by loosening the tolerance on everything, including the box.
    closeTo(m.volume, 3000 * 200 * 2500 - 1000 * 200 * 1400, 'wall-with-window volume');

    // Every sub-shape of the result is named, and named once — on the flush/coplanar case too.
    expect(cut.refs.length).toBe(m.counts.faces + m.counts.edges);
    expect(new Set(cut.refs).size).toBe(cut.refs.length);
  });

  /**
   * ⚠ THE SHAPE THAT WAS UNBUILDABLE UNTIL D28 — and the reason it needs a GEOMETRY golden at all.
   *
   * `naming-revolve.test.ts` proves the two rims get distinct, stable identities. It asserts nothing
   * about millimetres — so a positional key that shipped alongside a boolean quietly cutting the WRONG
   * MATERIAL would pass it, and pass every other naming test in the repo. This case closes that gap.
   *
   * The area, edge length and counts of two intersecting cylinders have no closed form worth deriving
   * (elliptic integrals, tangled with a seam — spec §9.0 forbids inventing an approximate one), so the
   * native-OCCT oracle stands alone for those, exactly as it does for the fillet. **But the VOLUME has
   * an exact form**, and it is precisely the measure that catches a cut which removed nothing or
   * removed the wrong solid. The seeder checks it and aborts on disagreement; so does this test.
   */
  it('a duct drilled CLEAN THROUGH a round column matches native OCCT — and the exact volume agrees', async () => {
    const golden = find('column-through-duct-r400-d80');
    const col = golden.params['column'] as { radius: number; height: number };
    const duct = golden.params['duct'] as {
      radius: number;
      axis: [number, number, number];
      atZ: number;
    };

    const column = await client.request('makeCylinder', {
      nodeId: 'column-1',
      radius: col.radius,
      height: col.height,
    });
    const tool = await client.request('makeCylinder', {
      nodeId: 'duct-1',
      radius: duct.radius,
      height: 4 * col.radius,
      at: [0, -2 * col.radius, duct.atZ],
      axis: duct.axis,
    });
    const cut = await client.request('boolean', {
      nodeId: 'cut-1',
      kind: 'cut',
      a: column.handle,
      b: tool.handle,
    });

    await assertMatches(cut.handle, golden);

    // The independent tier — computed from the RADII, never from the B-Rep (see
    // `analytic.cylinder_through_duct_volume`). Held to 1e-5 rather than 1e-9 because OCCT's boolean
    // carries a tolerance of its own (~6e-7 here); that is still far tighter than any wrong-solid bug.
    const exact = golden.volumeClosedForm;
    expect(exact, 'this case must carry a closed-form VOLUME tier').toBeDefined();
    const m = await client.request('measure', { handle: cut.handle });
    expect(
      Math.abs(m.volume - (exact ?? 0)) / (exact ?? 1),
      `through-duct volume vs the closed form: got ${String(m.volume)}, exact is ${String(exact)}`,
    ).toBeLessThan(1e-5);

    // It really is a THROUGH hole. A blind pocket, or a cut that missed, would still be a valid solid
    // with a plausible volume — and would still name cleanly.
    expect(m.volume).toBeLessThan(Math.PI * col.radius ** 2 * col.height);
    expect(m.counts.faces, 'lateral + 2 caps + the hole wall').toBe(4);

    // And the payload of the whole ruling: every sub-shape named, and named ONCE. Before D28 the two
    // rims collided and the kernel refused the operation outright.
    expect(cut.refs.length).toBe(m.counts.faces + m.counts.edges);
    expect(new Set(cut.refs).size).toBe(cut.refs.length);
  });

  it('a fillet matches native OCCT — the tier where no closed form exists and the oracle stands alone', async () => {
    const golden = find('box-wall-fillet-r50');
    const box = golden.params['box'] as { dx: number; dy: number; dz: number };

    const wall = await client.request('makeBox', { nodeId: 'wall-1', ...box });
    const rounded = await client.request('fillet', {
      nodeId: 'fillet-1',
      handle: wall.handle,
      // The oracle found this edge geometrically; WE find it by its persistent identity. That the two
      // land on the same edge is not a coincidence — it is the naming subsystem being correct.
      edge: `wall-1/edge/${golden.params['edge'] as string}#0`,
      radius: golden.params['radius'] as number,
    });

    await assertMatches(rounded.handle, golden);
    expect(
      golden.analytic,
      'a fillet has no closed form — it must NOT carry an analytic tier',
    ).toBeUndefined();
  });
});
