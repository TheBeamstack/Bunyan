// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ THE JOIN SPATIAL INDEX — correctness under the failure mode it introduces (Entry 61,
 * `review_P5.md` #3). Pure TS, no kernel.
 *
 * **What changed and why.** `partnersAt`, `throughWallsAt` and `wallsJoinedTo` each scanned every element
 * in the scene, and `resolveJoins` runs once per element in the build — so a cold load of N walls did N
 * full scans. Measured on a room grid: **4757.7 ms at 1984 walls**, per-wall cost *rising* with N
 * (143 µs → 2398 µs), i.e. quadratic; ~**3.5 minutes of pure join scanning** extrapolated to the 10,000
 * element target D48 makes BINDING. With a uniform grid keyed on the `Scene` object: **169 ms at 9940
 * walls**, per-wall **flat at 14–17 µs** from 1k to 10k.
 *
 * ⚠⚠ **AND THIS FILE EXISTS BECAUSE AN INDEX BUYS SPEED BY CHANGING *WHO IS ASKED*, WHICH IS EXACTLY HOW
 * IT CAN GO WRONG SILENTLY.** The 32 existing join/dependency tests all pass unchanged, but every one of
 * them places its walls at comfortable round coordinates. The failure this optimisation actually risks is
 * a **coincident corner that straddles a cell boundary**: two endpoints `JOIN_TOL` apart but in different
 * buckets, so the miter is silently never found — and *the geometry that comes out is a perfectly valid
 * wall with a plain cap*, which nothing would flag. That is the D68 failure shape (a join silently not
 * happening), reached by a new road.
 *
 * So the cases below are chosen to be hostile to the grid, not to the geometry: corners ON a cell
 * boundary, corners just either side of one, and a mid-span T landing exactly on one.
 */

import { describe, expect, it } from 'vitest';
import { resolveJoins, wallsJoinedTo } from '@bunyan/document';
import type { Scene } from '@bunyan/document';

/** The index's cell size (mm). The tests below deliberately sit on multiples of it. */
const CELL = 500;

function sceneOf(walls: readonly { start: [number, number]; end: [number, number] }[]): Scene {
  const elements: Record<string, unknown> = {};
  walls.forEach((w, i) => {
    const id = `wall-${i}`;
    elements[id] = {
      id,
      typeId: 'core.wall',
      typeVersion: 1,
      params: { start: w.start, end: w.end, thickness: 200, height: 3000 },
    };
  });
  return {
    schemaVersion: 2,
    elements,
    styles: {},
    materials: {},
    sections: {},
    containers: {},
    grids: {},
    constraints: {},
  } as unknown as Scene;
}

describe('the join spatial index — correct where the grid is most likely to betray it', () => {
  it('⚠⚠ a corner sitting EXACTLY on a cell boundary still miters', () => {
    // Both walls meet at (500, 500) — a cell corner in both axes, the worst case for a floor()-keyed grid.
    const scene = sceneOf([
      { start: [0, 500], end: [CELL, CELL] },
      { start: [CELL, CELL], end: [CELL, 4000] },
    ]);
    expect(resolveJoins(scene, 'wall-0')).toHaveLength(1);
    expect(resolveJoins(scene, 'wall-1')).toHaveLength(1);
  });

  it('⚠⚠ two endpoints within JOIN_TOL but on OPPOSITE sides of a cell boundary still miter', () => {
    // 999.9999 and 1000.0001 are 2e-4 apart — well inside JOIN_TOL (1e-3), so they ARE the same corner —
    // but floor(x/500) puts them in cells 1 and 2. An index that trusted its bucket would miss this.
    const scene = sceneOf([
      { start: [0, 0], end: [999.9999, 0] },
      { start: [1000.0001, 0], end: [1000.0001, 3000] },
    ]);
    expect(resolveJoins(scene, 'wall-0')).toHaveLength(1);
    expect(resolveJoins(scene, 'wall-1')).toHaveLength(1);
  });

  it('a mid-span T landing exactly on a cell boundary still butts', () => {
    const scene = sceneOf([
      { start: [0, 0], end: [4000, 0] },
      { start: [CELL * 3, 0], end: [CELL * 3, 2000] }, // lands at x = 1500, a cell edge
    ]);
    // The partition butts (one cap line); the through wall is untouched (butt is directional).
    expect(resolveJoins(scene, 'wall-1')).toHaveLength(1);
    expect(resolveJoins(scene, 'wall-0')).toHaveLength(0);
  });

  it('walls in FAR-APART cells do not join — the index must not over-report either', () => {
    const scene = sceneOf([
      { start: [0, 0], end: [1000, 0] },
      { start: [50000, 50000], end: [51000, 50000] },
    ]);
    expect(resolveJoins(scene, 'wall-0')).toHaveLength(0);
    expect(resolveJoins(scene, 'wall-1')).toHaveLength(0);
  });

  it('a LONG wall is found from a point in the middle of its span, many cells from either end', () => {
    // 60 m long: the segment must be recorded in every cell it crosses, not just its endpoints' cells.
    const scene = sceneOf([
      { start: [0, 0], end: [60000, 0] },
      { start: [37250, 0], end: [37250, 2000] }, // deliberately not a round multiple of the cell
    ]);
    expect(resolveJoins(scene, 'wall-1')).toHaveLength(1);
  });

  it('⚠ the INVALIDATOR keeps both edges through the index (endpoint AND mid-span)', () => {
    const scene = sceneOf([
      { start: [0, 0], end: [4000, 0] }, // through wall
      { start: [2000, 0], end: [2000, 2000] }, // butts mid-span
      { start: [4000, 0], end: [4000, 3000] }, // meets its END at a corner
    ]);
    const through = scene.elements['wall-0']!;
    const s = through.params['start'] as [number, number];
    const e = through.params['end'] as [number, number];

    const dependents = wallsJoinedTo(scene, 'wall-0', [s, e], [{ start: s, end: e }]);
    // The corner neighbour (endpoint edge) AND the mid-span partition (segment edge) must both re-stage.
    expect([...dependents].sort()).toEqual(['wall-1', 'wall-2']);
  });

  it('⚠ the index is rebuilt for a NEW scene — it is keyed on the Scene object, never mutated', () => {
    const before = sceneOf([
      { start: [0, 0], end: [4000, 0] },
      { start: [2000, 0], end: [2000, 2000] },
    ]);
    expect(resolveJoins(before, 'wall-1')).toHaveLength(1);

    // A different Scene object with the partition moved off the through wall. If the index were cached
    // by anything coarser than object identity, this would answer with the OLD scene's joins — the
    // stale-cache failure that makes a "pure performance" change a correctness change.
    const after = sceneOf([
      { start: [0, 0], end: [4000, 0] },
      { start: [2000, 9000], end: [2000, 11000] },
    ]);
    expect(resolveJoins(after, 'wall-1')).toHaveLength(0);
    // …and the original scene still answers as it did: it is a different key, untouched.
    expect(resolveJoins(before, 'wall-1')).toHaveLength(1);
  });
});
