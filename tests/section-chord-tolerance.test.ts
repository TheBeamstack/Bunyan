// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE SECTION CHORD TOLERANCE (D92, T-037 — `P5_step6C_plan_section_design.md` §4.1).
 *
 * A cut through a circular column is an exact circle; `SectionCurve.points` is a polyline. This holds
 * the polyline to the budget §4.1 chose for Revit-class drawings: within `BUDGET_MM` of the exact
 * circle, at the vertices AND along every chord. Vertices alone would prove nothing — a sampler puts
 * them ON the curve at any tolerance; the error lives at the chord midpoints (the sagitta).
 *
 * ⚠ `BUDGET_MM` is written here, not imported from the kernel, so loosening `SECTION_DEFLECTION`
 * fails this test instead of loosening it too. The one allowance on top is the float32 the points
 * cross the WASM boundary in: one ulp at the largest coordinate (§4.1 records that limit).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernelHost } from '@bunyan/kernel-occt';

/** §4.1: the chord error, model mm — 0.01 mm on paper at 1:1, the smallest scale chosen for. */
const BUDGET_MM = 0.01;

describe('D92 — a section polyline stays within the chord tolerance of the exact curve', () => {
  let client: KernelClient;

  beforeAll(async () => {
    client = new KernelClient(new InProcessTransport(await createOcctKernelHost()));
  });
  afterAll(() => {
    client.dispose();
  });

  // r150: a typical round column. r600: a large one, where a fixed tolerance spends the most chords.
  for (const radius of [150, 600]) {
    it(`a circular column r=${String(radius)} cuts to a polyline within ${String(BUDGET_MM)} mm`, async () => {
      const centre = [2500, -1700] as const;
      const column = await client.request('makeCylinder', {
        nodeId: `column-r${String(radius)}`,
        radius,
        height: 3000,
        at: [centre[0], centre[1], 0],
      });
      const { curves } = await client.request('sectionCut', {
        handles: [column.handle],
        plane: { origin: [0, 0, 1200], normal: [0, 0, 1], xAxis: [1, 0, 0] },
        mode: 'cut',
      });

      const rings = curves.filter((c) => c.kind === 'cut');
      expect(rings.length, 'the cut found the circle').toBeGreaterThan(0);

      // One float32 ulp at the largest coordinate: x and y each round by half an ulp.
      const extent = Math.max(...rings.flatMap((c) => c.points.map(Math.abs)));
      const ulp = 2 ** (Math.floor(Math.log2(extent)) - 23);

      let worst = 0;
      let vertices = 0;
      for (const curve of rings) {
        const p = curve.points;
        const n = p.length / 2;
        expect(n, 'a circle discretises to more than a segment').toBeGreaterThan(2);
        for (let i = 0; i < n; i++) {
          const x = (p[2 * i] ?? NaN) - centre[0];
          const y = (p[2 * i + 1] ?? NaN) - centre[1];
          worst = Math.max(worst, Math.abs(Math.hypot(x, y) - radius));
          vertices++;
          // The chord midpoint is where a polyline is farthest from the arc it spans; a closed curve
          // also owns the chord back to its first point.
          const j = i + 1 < n ? i + 1 : curve.closed ? 0 : -1;
          if (j >= 0) {
            const mx = ((p[2 * i] ?? NaN) + (p[2 * j] ?? NaN)) / 2 - centre[0];
            const my = ((p[2 * i + 1] ?? NaN) + (p[2 * j + 1] ?? NaN)) / 2 - centre[1];
            worst = Math.max(worst, Math.abs(Math.hypot(mx, my) - radius));
          }
        }
      }
      expect(vertices).toBeGreaterThan(0);
      expect(worst, `worst deviation from r=${String(radius)}, mm`).toBeLessThanOrEqual(
        BUDGET_MM + ulp,
      );
    });
  }
});
