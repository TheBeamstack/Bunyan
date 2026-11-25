// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The plan panel's curve-to-path mapping (T-075) — pure, so it is asserted headlessly.
 *
 * ⚠ Points are written in the `ViewResult`'s own 2D frame (millimetres), unscaled and unrounded:
 * fitting and the y-flip are the SVG's `viewBox`/`transform`, never arithmetic on a point, so every
 * vertex drawn is the vertex the kernel cut.
 */

import type { ElementId, ViewResult } from '@bunyan/document';

export interface PlanPath {
  readonly elementId: ElementId;
  readonly kind: 'cut' | 'projected';
  /** SVG path data: `M x0 y0 L x1 y1 …`, plus `Z` when the kernel reported the curve closed. */
  readonly d: string;
}

export interface PlanBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** One path per curve with at least two points; a shorter one has no segment to draw. */
export function planPaths(result: ViewResult): PlanPath[] {
  const paths: PlanPath[] = [];
  for (const { elementId, curve } of result.curves) {
    const p = curve.points;
    if (p.length < 4) continue;
    let d = `M ${String(p[0])} ${String(p[1])}`;
    for (let i = 2; i + 1 < p.length; i += 2) d += ` L ${String(p[i])} ${String(p[i + 1])}`;
    if (curve.closed) d += ' Z';
    paths.push({ elementId, kind: curve.kind, d });
  }
  return paths;
}

/** The extent of every point the paths draw, read back from their data; `undefined` when empty. */
export function planBounds(paths: readonly PlanPath[]): PlanBounds | undefined {
  let b: { minX: number; minY: number; maxX: number; maxY: number } | undefined;
  for (const { d } of paths) {
    for (const m of d.matchAll(/[ML] (\S+) (\S+)/g)) {
      const x = Number(m[1]);
      const y = Number(m[2]);
      if (b === undefined) b = { minX: x, minY: y, maxX: x, maxY: y };
      else {
        b.minX = Math.min(b.minX, x);
        b.minY = Math.min(b.minY, y);
        b.maxX = Math.max(b.maxX, x);
        b.maxY = Math.max(b.maxY, y);
      }
    }
  }
  return b;
}
