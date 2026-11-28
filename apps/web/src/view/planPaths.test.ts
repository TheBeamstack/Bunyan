// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-075 — the plan panel's curve-to-path mapping. Every point the panel draws must BE the `ViewResult`
 * point it came from: the drawing is a projection of the B-Rep (D81), so a mapping that rounds, scales
 * or drops a vertex draws a building the model is not.
 */

import { describe, expect, it } from 'vitest';
import type { ViewCurve, ViewResult } from '@bunyan/document';
import { planBounds, planPaths } from './planPaths';

const curve = (elementId: string, points: number[], closed = false): ViewCurve => ({
  elementId,
  rootId: elementId,
  curve: { kind: 'cut', points, closed },
});

const result = (curves: ViewCurve[]): ViewResult => ({
  viewId: 'v1',
  kind: 'plan',
  plane: { origin: [0, 0, 1200], normal: [0, 0, 1], xAxis: [0, -1, 0] },
  curves,
  unprojected: [],
});

/** The `[x, y]` pairs an SVG path's `M`/`L` commands draw, read back from its `d`. */
function drawnPoints(d: string): number[] {
  const out: number[] = [];
  for (const match of d.matchAll(/[ML]\s*(\S+)\s+(\S+)/g))
    out.push(Number(match[1]), Number(match[2]));
  return out;
}

// Values a rounding, a toFixed or a float32 pass would each change.
const AWKWARD = [0.1 + 0.2, -1234.5678901234567, 1e-7, 4000, -3.3333333333333335, 2800.0000000001];

describe('planPaths — every drawn point equals the ViewResult point it came from', () => {
  it('draws each curve as one path whose points are its own, exactly and in order', () => {
    const source = result([
      curve('w1', [0, 0, ...AWKWARD]),
      curve('w2', [5, 6, 7, 8], true),
      curve('cw', [-100.25, 50.125, 99999.99999, -0.000001]),
    ]);
    const paths = planPaths(source);

    expect(paths).toHaveLength(source.curves.length);
    paths.forEach((path, i) => {
      const from = source.curves[i]!;
      expect(path.elementId).toBe(from.elementId);
      expect(drawnPoints(path.d)).toEqual(from.curve.points);
    });
  });

  it('closes a closed curve and leaves an open one open', () => {
    const [open, closed] = planPaths(
      result([curve('a', [0, 0, 1, 1]), curve('b', [0, 0, 1, 1], true)]),
    );
    expect(open!.d.trim().endsWith('Z')).toBe(false);
    expect(closed!.d.trim().endsWith('Z')).toBe(true);
  });

  it('skips a curve with fewer than two points rather than drawing a malformed path', () => {
    expect(planPaths(result([curve('a', [1, 2]), curve('b', [])]))).toEqual([]);
  });

  it('bounds cover every drawn point, and an empty drawing has none', () => {
    const paths = planPaths(result([curve('a', [-10, 5, 30, -2]), curve('b', [0, 40, 1, 1])]));
    expect(planBounds(paths)).toEqual({ minX: -10, minY: -2, maxX: 30, maxY: 40 });
    expect(planBounds([])).toBeUndefined();
  });
});
