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
 * fails this test instead of loosening it too. There is no allowance on top: the points cross the
 * WASM boundary as float64 (T-069), so a column 300 m from its view origin is held to the same budget.
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
  // (300000, 300000): beyond 262 m, where a float32 coordinate alone rounds by up to 0.0156 mm.
  const cases = [
    { radius: 150, centre: [2500, -1700] },
    { radius: 600, centre: [2500, -1700] },
    { radius: 150, centre: [300000, 300000] },
  ] as const;
  for (const { radius, centre } of cases) {
    it(`a circular column r=${String(radius)} at (${centre.join(', ')}) cuts to a polyline within ${String(BUDGET_MM)} mm`, async () => {
      const column = await client.request('makeCylinder', {
        nodeId: `column-r${String(radius)}-${String(centre[0])}`,
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
      expect(worst, `worst deviation from r=${String(radius)}, mm`).toBeLessThanOrEqual(BUDGET_MM);
    });
  }
});
