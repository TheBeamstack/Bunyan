// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * P1 exit criterion: "the golden/invariant harness passes on the known box (reference-build oracle
 * AND regression snapshot), bounds pass."
 *
 * Verification scope (spec §9.0): we trust OCCT; these checks exist to catch OUR bugs.
 *
 * ⚠ READ THIS BEFORE INTERPRETING A GREEN TICK. Every assertion below runs TWICE: once against the
 * MOCK, once against the REAL OCCT WASM kernel. Against the mock they prove the harness, the protocol
 * round-trip and the provenance channel. Against `occt` they prove GEOMETRY — the numbers come from
 * upstream OCCT 7.9.3 in WebAssembly and are compared to goldens seeded offline from a *native* OCCT
 * build (`cadquery-ocp`). Same kernel, different binding, build and code path, so a disagreement means
 * OUR code is wrong: the WASM build, the op wiring, or our own measurement.
 *
 * Not one assertion changed when the real kernel arrived. That is the entire payoff of building the
 * gate before the geometry, and of keeping the kernel transport-agnostic.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createMockKernelHost } from '@bunyan/kernel-mock';
import { createOcctKernelHost } from '@bunyan/kernel-occt';
import type { KernelLike } from '@bunyan/kernel-client';

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

/**
 * The two kernels, behind one interface. The mock is not a stub being humoured here — it is the
 * critical-path mitigation (spec §12) that let the browser shell be built before the kernel existed,
 * and keeping it under the same gate is what stops the two drifting apart.
 */
const KERNELS: ReadonlyArray<{ name: string; boot: () => Promise<KernelLike> }> = [
  // The mock is synchronous; the real kernel must instantiate a 4 MB WebAssembly module first.
  { name: 'mock', boot: () => Promise.resolve(createMockKernelHost()) },
  { name: 'occt', boot: () => createOcctKernelHost() },
];

describe('goldens', () => {
  it('ship values seeded on a recorded, pinned environment (spec §6.5)', () => {
    expect(goldens.env['ocpVersion']).toBeTruthy();
    expect(goldens.env['python']).toBeTruthy();
    expect(goldens.cases.length).toBeGreaterThan(0);
  });
});

for (const kernel of KERNELS) {
  describe(`golden/invariant harness [${kernel.name}]`, () => {
    let client: KernelClient;

    beforeAll(async () => {
      client = new KernelClient(new InProcessTransport(await kernel.boot()));
    });
    afterAll(() => {
      client.dispose();
    });

    it('reports who it is', async () => {
      const { kernel: info } = await client.handshake();
      expect(info.name).toBe(kernel.name);
      // The build id pins the geometry cache (spec §6): a shape cached by one kernel must never be
      // silently reused by another.
      expect(info.buildId).toBeTruthy();
    });

    // ⚠ THE BOX CASES ONLY, and the filter is load-bearing. The goldens file also carries the hard
    // shapes P2 added — a cylinder, a boolean, a fillet — and those are driven by
    // `golden-hard-geometry.test.ts` against the REAL kernel alone, because the mock has no booleans
    // and does not pretend to. Without this filter the mock would be asked to `makeBox` a cylinder,
    // and would answer with a box: a green test certifying the wrong solid.
    for (const golden of goldens.cases.filter((c) => c.op === 'makeBox')) {
      describe(golden.case, () => {
        it('oracle — exact properties match the reference build (volume, area, edge length)', async () => {
          const shape = await client.request('makeBox', { nodeId: 'g', ...golden.params });
          // Straight from OCCT's BRepGProp, NOT from the mesh. This is the op the owner approved for
          // P2: it is what will let a circular column be gated at all, since its tessellation
          // under-reports its volume by the chord error.
          const measured = await client.request('measure', { handle: shape.handle });

          const tol = golden.tolerances.relative;
          for (const report of [
            checkClose('volume', golden.analytic.volume, measured.volume, tol),
            checkClose('area', golden.analytic.area, measured.area, tol),
            checkClose('edgeLength', golden.analytic.edgeLength, measured.edgeLength, tol),
          ]) {
            expect(
              report,
              `${report.name}: expected ${report.expected}, got ${report.actual}`,
            ).toMatchObject({ ok: true });
          }

          expect(measured.counts).toEqual(golden.analytic.counts);
        });

        it('mesh fidelity — the tessellation agrees with the exact B-Rep', async () => {
          // An independent second view: measure the MESH and require it to reproduce the exact
          // values. It catches a different class of bug from the oracle above — a mesh that is
          // wrongly wound, not watertight, or missing a face still yields a perfectly correct
          // BRepGProp measurement, because that reads the B-Rep and never looks at the triangles.
          //
          // Exact only because a box is planar-faced. A curved solid legitimately fails this check,
          // which is precisely why `measure` exists and why it, not this, is the gate.
          const shape = await client.request('makeBox', { nodeId: 'g', ...golden.params });
          const mesh = await client.request('tessellate', {
            handle: shape.handle,
            deflection: 0.1,
          });
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
            ).toMatchObject({ ok: true });
          }

          expect(measured.counts.faces).toBe(golden.analytic.counts.faces);
          expect(measured.counts.edges).toBe(golden.analytic.counts.edges);
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

        it('bounds — the tight bounding box matches the schema', async () => {
          const shape = await client.request('makeBox', { nodeId: 'g', ...golden.params });
          expect(shape.bounds.min).toEqual(golden.analytic.bounds.min);
          expect(shape.bounds.max).toEqual(golden.analytic.bounds.max);
        });

        it('drift — the structural snapshot is stable and floating-point-free', async () => {
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
        });
      });
    }

    it('the snapshot depends on identity, NOT on the size of the box', async () => {
      // Two different boxes under the same node have the same face/edge identities — identity is
      // derivation, not geometry (core_logic §4). A snapshot that changed with the dimensions would
      // mean geometry had leaked into the identity path.
      const snapshotOf = async (dx: number): Promise<string> => {
        const shape = await client.request('makeBox', {
          nodeId: 'same-node',
          dx,
          dy: 200,
          dz: 2500,
        });
        const mesh = await client.request('tessellate', { handle: shape.handle, deflection: 0.1 });
        return structuralSnapshot(mesh);
      };

      expect(await snapshotOf(3000)).toBe(await snapshotOf(9999));
    });
  });
}

describe('mock vs occt — the swap must be invisible', () => {
  it('both kernels assign the SAME identities to the same box', async () => {
    // The mock exists so the browser could be built before the kernel. That bet only pays off if the
    // refs survive the swap: Amer's picking, property panels and undo all key off these tokens, and a
    // saved .bnn stores them. If the two kernels disagreed here, every file authored against the
    // mock would silently re-target the day the real kernel shipped.
    const params = { nodeId: 'wall-1', dx: 3000, dy: 200, dz: 2500 };

    const mock = new KernelClient(new InProcessTransport(createMockKernelHost()));
    const occt = new KernelClient(new InProcessTransport(await createOcctKernelHost()));

    const mockShape = await mock.request('makeBox', params);
    const occtShape = await occt.request('makeBox', params);
    expect(occtShape.refs).toEqual(mockShape.refs);

    const mockMesh = await mock.request('tessellate', {
      handle: mockShape.handle,
      deflection: 0.1,
    });
    const occtMesh = await occt.request('tessellate', {
      handle: occtShape.handle,
      deflection: 0.1,
    });
    // The structural snapshot is FP-free by construction, so this compares identity and topology —
    // not coordinates, and not triangle counts that a mesher is free to choose differently.
    expect(structuralSnapshot(occtMesh)).toBe(structuralSnapshot(mockMesh));

    mock.dispose();
    occt.dispose();
  });
});
