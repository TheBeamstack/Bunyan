// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE SKETCH CONSTRAINT SOLVER (D50 §0d, `P5_step0d_design.md`) — real planegcs, headless, against the
 * real OCCT kernel. Entry 40, 2026-07-18. Executes D50 §0d + D26 (the no-permute invariant).
 *
 * ⚠ WHAT THIS PROVES, END TO END:
 *   1. every v1.0.0 line/point constraint solves a rough sketch to exact satisfied values (real planegcs);
 *   2. the `solve → Profile → extrude` pipeline builds the exact solid, and `lateral.k` names the face
 *      swept from AUTHORED segment k (D26) — including after a dimensional re-solve (the associativity
 *      proof, the sketch analogue of 0b's rebind-a-datum);
 *   3. an over-constrained sketch is REFUSED at build time (D42) — the document stays at last-good;
 *   4. an under-constrained sketch SOLVES with `dof > 0` (CAD-normal, not an error);
 *   5. the `MockSketchSolver` keeps a document test green without booting planegcs (the seam works);
 *   6. a constrained sketch round-trips through `.bnn` and rebuilds identically (Q1=A ⇒ no version bump).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  MockSketchSolver,
  createRegistries,
  loadBnn,
  saveBnn,
  toSolvableSketch,
} from '@bunyan/document';
import type { ParamValue, Sketch, SketchConstraint, SketchConstraintKind } from '@bunyan/document';
import { createPlanegcsSolver } from '@bunyan/sketch-solver';
import type { PlanegcsSolver } from '@bunyan/sketch-solver';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

const THICKNESS = 200;

/** A ROUGH rectangle — deliberately off — plus the constraints that pin it to an exact `w × h`. */
function roughRectangle(): Sketch {
  return {
    points: [
      { id: 'A', x: 0, y: 0, fixed: true },
      { id: 'B', x: 2900, y: 100, fixed: false },
      { id: 'C', x: 2850, y: 1900, fixed: false },
      { id: 'D', x: 50, y: 2050, fixed: false },
    ],
    segments: [
      { from: 'A', to: 'B' }, // seg 0 — bottom (y = 0)
      { from: 'B', to: 'C' }, // seg 1 — right  (x = w)
      { from: 'C', to: 'D' }, // seg 2 — top    (y = h)
      { from: 'D', to: 'A' }, // seg 3 — left   (x = 0)
    ],
  };
}

/** The constraint args (for `createSketchConstraint`) that make `roughRectangle` an exact `w × h`. */
function rectangleConstraints(
  w: number,
  h: number,
): readonly {
  kind: SketchConstraintKind;
  points?: readonly string[];
  segments?: readonly number[];
  value?: number;
}[] {
  return [
    { kind: 'horizontal', segments: [0] },
    { kind: 'perpendicular', segments: [0, 1] },
    { kind: 'perpendicular', segments: [1, 2] },
    { kind: 'perpendicular', segments: [2, 3] },
    { kind: 'distance', points: ['A', 'B'], value: w },
    { kind: 'distance', points: ['B', 'C'], value: h },
  ];
}

describe('the sketch constraint solver (Entry 40, step 0d)', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let planegcs: PlanegcsSolver;

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
    planegcs = await createPlanegcsSolver();
  });
  afterAll(() => {
    planegcs.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  const newDoc = (solver: MockSketchSolver | PlanegcsSolver = planegcs): DocumentContext => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return new DocumentContext({ registries, geometry: client, sketchSolver: solver });
  };

  /** Author a sketchProfile element + its constraints, one atomic build. Returns the element id. */
  const buildRectangle = async (doc: DocumentContext, w = 3000, h = 2000): Promise<string> => {
    const edit = await doc.execute('core.createElement', {
      typeId: 'core.sketchProfile.v1',
      params: { sketch: roughRectangle() as unknown as ParamValue, thickness: THICKNESS },
    });
    const id = edit.changes[0]!.id;
    for (const c of rectangleConstraints(w, h)) {
      await doc.execute('core.createSketchConstraint', {
        element: id,
        kind: c.kind,
        ...(c.points === undefined ? {} : { points: [...c.points] }),
        ...(c.segments === undefined ? {} : { segments: [...c.segments] }),
        ...(c.value === undefined ? {} : { value: c.value }),
      });
    }
    return id;
  };

  const profilePart = (doc: DocumentContext, id: string) =>
    doc.partsOf(id)!.find((p) => p.name === 'profile')!;

  const lateralBounds = async (doc: DocumentContext, id: string, k: number) => {
    const part = profilePart(doc, id);
    const ref = part.refs.find((r) => r.includes(`/face/lateral.${String(k)}#`))!;
    return (await client.request('bounds', { handle: part.handle, ref })).bounds;
  };

  /* ---------------------------------------------------------------------------------------------- */

  it('⚠ EACH constraint kind solves a rough sketch to exact satisfied values (real planegcs)', () => {
    const dist = (a: readonly [number, number], b: readonly [number, number]) =>
      Math.hypot(a[0] - b[0], a[1] - b[1]);

    // perpendicular + two distances — the L-corner (the §1 spike, generalised).
    {
      const sketch: Sketch = {
        points: [
          { id: 'A', x: 0, y: 0, fixed: true },
          { id: 'B', x: 3100, y: 120, fixed: false },
          { id: 'C', x: 3050, y: -1900, fixed: false },
        ],
        segments: [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
        ],
      };
      const cs: SketchConstraint[] = [
        { id: 'k0', element: 'e', kind: 'horizontal', operands: { segments: [0] } },
        { id: 'k1', element: 'e', kind: 'perpendicular', operands: { segments: [0, 1] } },
        { id: 'k2', element: 'e', kind: 'distance', operands: { points: ['A', 'B'] }, value: 3000 },
        { id: 'k3', element: 'e', kind: 'distance', operands: { points: ['B', 'C'] }, value: 2000 },
      ];
      const r = planegcs.solve(toSolvableSketch(sketch, cs));
      expect(r.status).toBe('solved');
      const by = Object.fromEntries(r.solved!.map((p) => [p.id, [p.x, p.y] as const]));
      expect(dist([0, 0], by['B']!)).toBeCloseTo(3000, 3);
      expect(dist(by['B']!, by['C']!)).toBeCloseTo(2000, 3);
      const ab = [by['B']![0] - 0, by['B']![1] - 0];
      const bc = [by['C']![0] - by['B']![0], by['C']![1] - by['B']![1]];
      expect(ab[0]! * bc[0]! + ab[1]! * bc[1]!).toBeCloseTo(0, 3); // perpendicular ⇒ dot 0
    }

    // horizontal — the free point drops to the anchor's y.
    {
      const sketch: Sketch = {
        points: [
          { id: 'A', x: 0, y: 0, fixed: true },
          { id: 'B', x: 1000, y: 373, fixed: false },
        ],
        segments: [{ from: 'A', to: 'B' }],
      };
      const r = planegcs.solve(
        toSolvableSketch(sketch, [
          { id: 'k', element: 'e', kind: 'horizontal', operands: { segments: [0] } },
        ]),
      );
      expect(r.status).not.toBe('over-constrained');
      expect(r.solved!.find((p) => p.id === 'B')!.y).toBeCloseTo(0, 3);
    }

    // vertical — the free point drops to the anchor's x.
    {
      const sketch: Sketch = {
        points: [
          { id: 'A', x: 0, y: 0, fixed: true },
          { id: 'B', x: 412, y: 1000, fixed: false },
        ],
        segments: [{ from: 'A', to: 'B' }],
      };
      const r = planegcs.solve(
        toSolvableSketch(sketch, [
          { id: 'k', element: 'e', kind: 'vertical', operands: { segments: [0] } },
        ]),
      );
      expect(r.solved!.find((p) => p.id === 'B')!.x).toBeCloseTo(0, 3);
    }

    // coincident — two points collapse to one location.
    {
      const sketch: Sketch = {
        points: [
          { id: 'A', x: 0, y: 0, fixed: true },
          { id: 'B', x: 500, y: 500, fixed: false },
        ],
        segments: [{ from: 'A', to: 'B' }],
      };
      const r = planegcs.solve(
        toSolvableSketch(sketch, [
          { id: 'k', element: 'e', kind: 'coincident', operands: { points: ['A', 'B'] } },
        ]),
      );
      const b = r.solved!.find((p) => p.id === 'B')!;
      expect(b.x).toBeCloseTo(0, 3);
      expect(b.y).toBeCloseTo(0, 3);
    }

    // equal — two segments driven to the same length.
    {
      const sketch: Sketch = {
        points: [
          { id: 'A', x: 0, y: 0, fixed: true },
          { id: 'B', x: 1000, y: 0, fixed: true },
          { id: 'C', x: 1000, y: 0, fixed: false },
          { id: 'D', x: 1600, y: 0, fixed: false },
        ],
        segments: [
          { from: 'A', to: 'B' }, // fixed length 1000
          { from: 'C', to: 'D' }, // ~600, driven equal ⇒ 1000
        ],
      };
      const r = planegcs.solve(
        toSolvableSketch(sketch, [
          { id: 'k0', element: 'e', kind: 'coincident', operands: { points: ['B', 'C'] } },
          { id: 'k1', element: 'e', kind: 'horizontal', operands: { segments: [1] } },
          { id: 'k2', element: 'e', kind: 'equal', operands: { segments: [0, 1] } },
        ]),
      );
      const by = Object.fromEntries(r.solved!.map((p) => [p.id, [p.x, p.y] as const]));
      expect(dist(by['C']!, by['D']!)).toBeCloseTo(1000, 2);
    }
  });

  it('⚠⚠ solve → extrude → EXACT volume, and `lateral.k` names AUTHORED segment k (D26)', async () => {
    const doc = newDoc();
    const id = await buildRectangle(doc, 3000, 2000);

    expect(doc.brokenRefs()).toHaveLength(0);
    const q = await doc.quantities(id);
    // 3000 × 2000 × 200 = 1.2e9 mm³.
    expect(q.parts[0]!.volume).toBeCloseTo(3000 * 2000 * THICKNESS, 2);

    // seg 2 was authored C→D (the TOP edge). So `lateral.2` must be the face at y = 2000, not any other.
    const top = await lateralBounds(doc, id, 2);
    expect(top.min[1]).toBeCloseTo(2000, 3);
    expect(top.max[1]).toBeCloseTo(2000, 3);
    // seg 0 (A→B) is the bottom edge at y = 0 — a different face, proving order IS identity.
    const bottom = await lateralBounds(doc, id, 0);
    expect(bottom.min[1]).toBeCloseTo(0, 3);
    expect(bottom.max[1]).toBeCloseTo(0, 3);
  });

  it('⚠ a dimensional RE-SOLVE moves the geometry but `lateral.2` stays lateral.2 (associativity)', async () => {
    const doc = newDoc();
    const id = await buildRectangle(doc, 3000, 2000);
    const beforeToken = profilePart(doc, id).refs.find((r) => r.includes('/face/lateral.2#'))!;

    // Widen the height dimension: find the `distance(B,C)` constraint (the height) and repoint it to 2600
    // via delete + re-create (sketch constraints edit through their own verbs, Q2).
    const bcId = Object.values(doc.scene.constraints).find(
      (c) => 'operands' in c && c.kind === 'distance' && c.operands.points?.[0] === 'B',
    )!.id;
    await doc.execute('core.deleteSketchConstraint', { id: bcId });
    await doc.execute('core.createSketchConstraint', {
      element: id,
      kind: 'distance',
      points: ['B', 'C'],
      value: 2600,
    });

    expect(doc.brokenRefs()).toHaveLength(0);
    const q = await doc.quantities(id);
    expect(q.parts[0]!.volume).toBeCloseTo(3000 * 2600 * THICKNESS, 2);

    // ⚠ THE NAME IS BYTE-IDENTICAL and the face followed the constraint to y = 2600.
    const afterToken = profilePart(doc, id).refs.find((r) => r.includes('/face/lateral.2#'))!;
    expect(afterToken).toBe(beforeToken);
    const top = await lateralBounds(doc, id, 2);
    expect(top.min[1]).toBeCloseTo(2600, 3);
  });

  it('⚠⚠ an OVER-CONSTRAINED sketch is REFUSED at build time; the document stays at last-good (D42)', async () => {
    const doc = newDoc();
    const id = await buildRectangle(doc, 3000, 2000);
    const goodVolume = (await doc.quantities(id)).parts[0]!.volume;
    const constraintCount = Object.keys(doc.scene.constraints).length;

    // Add a SECOND, conflicting width dimension: |A B| = 5000 alongside the existing |A B| = 3000.
    await expect(
      doc.execute('core.createSketchConstraint', {
        element: id,
        kind: 'distance',
        points: ['A', 'B'],
        value: 5000,
      }),
    ).rejects.toMatchObject({ code: 'GEOMETRY_FAILED' });

    // ⚠ LAST-GOOD, BOTH HALVES: the conflicting constraint never landed, and the solid is unchanged.
    expect(Object.keys(doc.scene.constraints)).toHaveLength(constraintCount);
    expect(doc.brokenRefs()).toHaveLength(0);
    expect((await doc.quantities(id)).parts[0]!.volume).toBeCloseTo(goodVolume, 2);
  });

  it('⚠ an UNDER-CONSTRAINED sketch SOLVES with dof > 0 — CAD-normal, not an error', () => {
    const sketch: Sketch = {
      points: [
        { id: 'A', x: 0, y: 0, fixed: true },
        { id: 'B', x: 10, y: 10, fixed: false },
      ],
      segments: [{ from: 'A', to: 'B' }],
    };
    const r = planegcs.solve(
      toSolvableSketch(sketch, [
        { id: 'k', element: 'e', kind: 'distance', operands: { points: ['A', 'B'] }, value: 100 },
      ]),
    );
    expect(r.status).toBe('under-constrained');
    expect(r.dof).toBeGreaterThan(0);
    expect(r.solved).toBeDefined();
  });

  it('⚠ the MockSketchSolver keeps a document test green without booting planegcs (the seam works)', async () => {
    const doc = newDoc(new MockSketchSolver());
    // No constraints — the mock is an identity solve, so the ROUGH coordinates are extruded as authored.
    const edit = await doc.execute('core.createElement', {
      typeId: 'core.sketchProfile.v1',
      params: { sketch: roughRectangle() as unknown as ParamValue, thickness: THICKNESS },
    });
    const id = edit.changes[0]!.id;
    expect(doc.brokenRefs()).toHaveLength(0);
    expect(doc.partsOf(id)).toHaveLength(1);
    expect((await doc.quantities(id)).parts[0]!.volume).toBeGreaterThan(0);
  });

  it('⚠ a constrained sketch round-trips through .bnn and rebuilds IDENTICALLY (Q1=A ⇒ no version bump)', async () => {
    const original = newDoc();
    const id = await buildRectangle(original, 3000, 2000);
    const before = await original.quantities(id);

    const bytes = saveBnn(original.scene, { kernelBuildId: 'test' });
    const loaded = loadBnn(bytes);

    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const reopened = new DocumentContext({
      registries,
      geometry: client,
      sketchSolver: planegcs,
      scene: loaded.scene,
    });
    await reopened.rebuildAll();

    expect(reopened.brokenRefs()).toHaveLength(0);
    expect((await reopened.quantities(id)).parts[0]!.volume).toBeCloseTo(
      before.parts[0]!.volume,
      2,
    );
    // the sketch constraints survived the round-trip in `scene.constraints`.
    expect(Object.keys(reopened.scene.constraints)).toHaveLength(
      Object.keys(original.scene.constraints).length,
    );
  });
});
