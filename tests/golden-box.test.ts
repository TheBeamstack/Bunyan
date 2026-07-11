/**
 * P1 exit criterion: "the golden/invariant harness passes on the known box (reference-build oracle
 * AND regression snapshot), bounds pass."
 *
 * Verification scope (spec §9.0): we trust OCCT; these checks exist to catch OUR bugs.
 *
 * SCOPE, stated plainly so nobody over-reads a green tick: the kernel under test here is the MOCK.
 * These assertions therefore prove the HARNESS, the protocol round-trip, the provenance channel and
 * the tessellation contract — not OCCT. The goldens are real (seeded offline from closed-form
 * analysis and cross-checked against a native OCCT build), and in P2 the same file runs unchanged
 * against the WASM kernel, at which point it starts certifying geometry. That is the whole reason
 * to build the gate before the geometry.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createMockKernelHost } from '@bunyan/kernel-mock';

import { checkClose, meshMeasures, structuralSnapshot } from './harness/measure.js';

interface GoldenCase {
  case: string;
  op: string;
  params: { dx: number; dy: number; dz: number };
  analytic: {
    volume: number;
    area: number;
    edgeLength: number;
    counts: { solids: number; faces: number; edges: number; vertices: number };
    bounds: { min: number[]; max: number[] };
  };
  crossCheck: { volume: number; area: number; edgeLength: number };
  tolerances: { relative: number };
}

const goldens = JSON.parse(
  readFileSync(fileURLToPath(new URL('./goldens/geometry.golden.json', import.meta.url)), 'utf8'),
) as { cases: GoldenCase[]; env: Record<string, string> };

function connect(): KernelClient {
  return new KernelClient(new InProcessTransport(createMockKernelHost()));
}

describe('golden/invariant harness [mock kernel — P2 swaps in OCCT]', () => {
  it('ships goldens seeded on a recorded, pinned environment (spec §6.5)', () => {
    expect(goldens.env['ocpVersion']).toBeTruthy();
    expect(goldens.env['python']).toBeTruthy();
    expect(goldens.cases.length).toBeGreaterThan(0);
  });

  for (const golden of goldens.cases) {
    describe(golden.case, () => {
      it('oracle — matches the committed reference values (volume, area, edge length)', async () => {
        const client = connect();
        const shape = await client.request('makeBox', { nodeId: 'g', ...golden.params });
        const mesh = await client.request('tessellate', { handle: shape.handle, deflection: 0.1 });
        const measured = meshMeasures(mesh);

        const tol = golden.tolerances.relative;
        for (const report of [
          checkClose('volume', golden.analytic.volume, measured.volume, tol),
          checkClose('area', golden.analytic.area, measured.area, tol),
          checkClose('edgeLength', golden.analytic.edgeLength, measured.edgeLength, tol),
        ]) {
          expect(
            report,
            `${report.name}: expected ${report.expected}, got ${report.actual}`,
          ).toMatchObject({
            ok: true,
          });
        }
        client.dispose();
      });

      it('sanity — the closed form and the native OCCT build agreed at seed time', () => {
        // Guards the goldens themselves, and our own measurement code. If a re-seed ever commits a
        // crossCheck that disagrees with the closed form, the seeder aborts — this asserts the
        // committed file honors that. (It has caught a real defect: see tools/oracle/README.md.)
        const tol = 1e-6;
        for (const key of ['volume', 'area', 'edgeLength'] as const) {
          const report = checkClose(key, golden.analytic[key], golden.crossCheck[key], tol);
          expect(report, `${key} analytic vs OCCT`).toMatchObject({ ok: true });
        }
      });

      it('invariant — topology counts match the oracle', async () => {
        const client = connect();
        const shape = await client.request('makeBox', { nodeId: 'g', ...golden.params });
        const mesh = await client.request('tessellate', { handle: shape.handle, deflection: 0.1 });
        const measured = meshMeasures(mesh);

        expect(measured.counts.faces).toBe(golden.analytic.counts.faces);
        expect(measured.counts.edges).toBe(golden.analytic.counts.edges);
        client.dispose();
      });

      it('bounds — the tight bounding box matches the schema', async () => {
        const client = connect();
        const shape = await client.request('makeBox', { nodeId: 'g', ...golden.params });

        expect(shape.bounds.min).toEqual(golden.analytic.bounds.min);
        expect(shape.bounds.max).toEqual(golden.analytic.bounds.max);
        client.dispose();
      });

      it('drift — the structural snapshot is stable and floating-point-free', async () => {
        const client = connect();

        const build = async (): Promise<string> => {
          const shape = await client.request('makeBox', { nodeId: 'g', ...golden.params });
          const mesh = await client.request('tessellate', {
            handle: shape.handle,
            deflection: 0.1,
          });
          return structuralSnapshot(mesh);
        };

        // Same recipe, rebuilt: identity must be reproducible. This is the property the whole
        // naming engine rests on, asserted at its smallest possible scale.
        expect(await build()).toBe(await build());
        client.dispose();
      });
    });
  }

  it('the snapshot depends on identity, NOT on the size of the box', async () => {
    // Two different boxes under the same node have the same face/edge identities — identity is
    // derivation, not geometry (core_logic §4). A snapshot that changed with the dimensions would
    // mean geometry had leaked into the identity path.
    const client = connect();

    const snapshotOf = async (dx: number): Promise<string> => {
      const shape = await client.request('makeBox', { nodeId: 'same-node', dx, dy: 200, dz: 2500 });
      const mesh = await client.request('tessellate', { handle: shape.handle, deflection: 0.1 });
      return structuralSnapshot(mesh);
    };

    expect(await snapshotOf(3000)).toBe(await snapshotOf(9999));
    client.dispose();
  });
});
