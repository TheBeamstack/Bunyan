/**
 * Tier-1 snap index tests (P4.5 §4). Headless: the projection is injected, so there is no camera and no
 * three.js — only the logic that decides WHERE a click lands.
 *
 * ⚠ These are written hostile to the INDEX and to the RULED PRIORITY, not to the arithmetic. The two ways
 * this module can be wrong and still look right are (a) a bucket boundary hiding the nearest candidate —
 * D73's lesson, that an index buys speed by changing who is asked — and (b) "nearest pixel wins" quietly
 * replacing Q3's ruled order.
 */

import { describe, expect, it } from 'vitest';

import type { MeshBuffers, Vec3 } from '@bunyan/protocol';
import {
  SNAP_PRIORITY,
  SnapIndex,
  chooseSnap,
  edgeCandidates,
  faceCandidate,
  gridCandidates,
  rankOf,
  type Project,
  type SnapCandidate,
} from './snap';

/** A trivial orthographic projection: x/y millimetres straight to pixels, z ignored. */
const flat: Project = (p) => [p[0], p[1]];

function candidate(point: Vec3, kind: SnapCandidate['kind']): SnapCandidate {
  return { point, kind };
}

/** One straight tessellated edge from (0,0,0) to (1000,0,0) with a middle vertex, as the kernel emits it. */
function oneEdgeMesh(): MeshBuffers {
  return {
    positions: new Float32Array(),
    normals: new Float32Array(),
    indices: new Uint32Array(),
    edgePositions: new Float32Array([0, 0, 0, 500, 0, 0, 1000, 0, 0]),
    provenance: {
      refs: ['wall-1.structure/face/y-min#0|edge'],
      triangleToRef: new Uint32Array(),
      edges: [{ refIndex: 0, start: 0, count: 3 }],
    },
    bounds: { min: [0, 0, 0], max: [1000, 0, 0] },
  };
}

describe('candidate extraction — from the mesh the viewport already retains', () => {
  it('yields both endpoints and the midpoint of an edge, each carrying the edge ref', () => {
    const found = edgeCandidates(oneEdgeMesh(), {
      elementId: 'wall-1',
      nodeId: 'wall-1.structure',
    });

    expect(found.map((c) => c.kind)).toEqual(['endpoint', 'endpoint', 'midpoint']);
    expect(found.map((c) => c.point)).toEqual([
      [0, 0, 0],
      [1000, 0, 0],
      [500, 0, 0],
    ]);
    // The identity a hosted void would bind to comes along for free — no human types a token (§4.2).
    for (const c of found) {
      expect(c.ref).toBe('wall-1.structure/face/y-min#0|edge');
      expect(c.elementId).toBe('wall-1');
      expect(c.nodeId).toBe('wall-1.structure');
    }
  });

  it('⚠ a degenerate polyline yields NOTHING — a zero-length edge is not a place to snap', () => {
    const mesh = oneEdgeMesh();
    const degenerate: MeshBuffers = {
      ...mesh,
      provenance: { ...mesh.provenance, edges: [{ refIndex: 0, start: 0, count: 1 }] },
    };
    expect(edgeCandidates(degenerate, { elementId: 'w', nodeId: 'n' })).toEqual([]);
  });

  it('grid candidates are computed, not measured — exact numbers, so they can commit unconfirmed', () => {
    const grid = gridCandidates({ spacingMm: 1000, extentMm: 2000 });
    // 5 x 5 lattice from -2000 to +2000.
    expect(grid).toHaveLength(25);
    expect(grid.every((c) => c.kind === 'grid')).toBe(true);
    expect(grid.some((c) => c.point[0] === 2000 && c.point[1] === -1000)).toBe(true);
    // Exact: no float drift from a mesh, which is what lets §4.4 skip the Tier-2 round trip.
    expect(grid.map((c) => c.point[0]).every(Number.isInteger)).toBe(true);
  });

  it('a non-positive grid spacing yields nothing rather than looping forever', () => {
    expect(gridCandidates({ spacingMm: 0, extentMm: 1000 })).toEqual([]);
  });
});

describe('SnapIndex — and the bucket-boundary risk the index itself creates (D73s lesson)', () => {
  it('finds a candidate in a NEIGHBOURING bucket — the failure a centre-bucket-only lookup would hide', () => {
    const index = new SnapIndex(500);
    // 499.9 and 500.1 are 0.2 mm apart and in DIFFERENT buckets (the boundary falls between them).
    const justUnder: Vec3 = [499.9, 0, 0];
    const justOver: Vec3 = [500.1, 0, 0];
    index.add(candidate(justOver, 'endpoint'));

    const near = index.near(justUnder, 10);
    expect(near).toHaveLength(1);
    expect(near[0]!.point).toEqual(justOver);
  });

  it('sweeps every bucket the search sphere touches, not a fixed 3x3', () => {
    const index = new SnapIndex(100);
    index.add(candidate([950, 0, 0], 'endpoint')); // 9.5 cells away from the origin
    // A radius that reaches it needs a 10-cell sweep; a hard-coded 3x3 would miss.
    expect(index.near([0, 0, 0], 1000)).toHaveLength(1);
    expect(index.near([0, 0, 0], 100)).toHaveLength(0);
  });

  it('a zero radius still searches the cursors own bucket', () => {
    const index = new SnapIndex(500);
    index.add(candidate([10, 10, 10], 'endpoint'));
    expect(index.near([20, 20, 20], 0)).toHaveLength(1);
  });

  it('counts everything added, including several in one bucket', () => {
    const index = new SnapIndex(500);
    index.addAll([candidate([1, 1, 1], 'endpoint'), candidate([2, 2, 2], 'midpoint')]);
    expect(index.size).toBe(2);
    expect(index.near([0, 0, 0], 100)).toHaveLength(2);
  });
});

describe('chooseSnap — the OWNER-RULED priority order (Q3), not nearest-wins', () => {
  it('⚠⚠ a FARTHER endpoint beats a NEARER grid point — the ruling, and the thing "nearest" gets wrong', () => {
    const hit = chooseSnap(
      [candidate([6, 0, 0], 'grid'), candidate([8, 0, 0], 'endpoint')],
      flat,
      [0, 0],
      20,
    );
    expect(hit?.kind).toBe('endpoint');
    expect(hit?.pixelDistance).toBe(8);
  });

  it('distance decides only WITHIN a kind', () => {
    const hit = chooseSnap(
      [candidate([9, 0, 0], 'endpoint'), candidate([3, 0, 0], 'endpoint')],
      flat,
      [0, 0],
      20,
    );
    expect(hit?.point).toEqual([3, 0, 0]);
  });

  it('respects the full ruled order, pairwise, in both argument orders', () => {
    for (let i = 0; i < SNAP_PRIORITY.length - 1; i++) {
      const better = SNAP_PRIORITY[i]!;
      const worse = SNAP_PRIORITY[i + 1]!;
      // The BETTER kind is placed FARTHER away, so only the ruling can make it win.
      const pair = [candidate([9, 0, 0], better), candidate([1, 0, 0], worse)];
      expect(chooseSnap(pair, flat, [0, 0], 20)?.kind, `${better} must beat ${worse}`).toBe(better);
      expect(chooseSnap([...pair].reverse(), flat, [0, 0], 20)?.kind).toBe(better);
    }
  });

  it('returns null when nothing is inside the pixel tolerance', () => {
    expect(chooseSnap([candidate([100, 0, 0], 'endpoint')], flat, [0, 0], 12)).toBeNull();
  });

  it('skips a candidate the projection rejects (behind the camera) instead of snapping to it', () => {
    const behind: Project = (p) => (p[2] < 0 ? null : [p[0], p[1]]);
    const hit = chooseSnap(
      [candidate([0, 0, -1], 'endpoint'), candidate([5, 0, 1], 'grid')],
      behind,
      [0, 0],
      20,
    );
    expect(hit?.kind).toBe('grid');
  });

  it('an unknown kind sorts last rather than throwing — a snap degrades, never crashes', () => {
    expect(rankOf('nonsense' as never)).toBe(SNAP_PRIORITY.length);
  });
});

/* ================================================================================================
 * THE FACE CANDIDATE + THE `snapTo` FILTER — Entry 80, and the second one is a fixed DEFECT.
 * ============================================================================================= */

describe('the face candidate and the filter that makes `snapTo` real', () => {
  it('carries the picked face through as a `face` candidate — ref, element and part intact', () => {
    const c = faceCandidate({
      point: [1000, 0, 1400],
      ref: 'wall-1.structure/face/lateral.1#0',
      elementId: 'wall-1',
      nodeId: 'wall-1.structure',
    });
    expect(c.kind).toBe('face');
    expect(c.ref).toBe('wall-1.structure/face/lateral.1#0');
    expect(c.elementId).toBe('wall-1');
  });

  /**
   * ⚠⚠ THE DEFECT THIS FIXES, AND IT WAS FOUND IN A REAL BROWSER RATHER THAN BY READING THE CODE.
   *
   * `InputSpec.snapTo` was declared, typed and documented for three entries — *"which snap kinds are
   * offered for this input"* — and **nothing read it.** The opening tool asks for `['face']`, but
   * `SNAP_PRIORITY` ranks `endpoint` and `midpoint` ABOVE `face`, so a cursor anywhere near a wall's
   * corner won the endpoint — whose `ref` is the EDGE's, not the face's. The tool then hosted a door
   * on an edge; `core.createElement` accepted it, the build threw, and the element landed
   * `state: 'failed'` with `parts: []`, NO banner, NO console error, and `unbuildable()` and
   * `brokenRefs()` both empty. Measured on the demo scene: **1 of 2 successful placements** came back
   * hosted on an edge, i.e. a door the user asked for that simply was not there.
   *
   * ⚠ Weak-green: the assertion is on the CHOSEN KIND, not on "a filter ran". A `chooseSnap` that
   * dropped the filter returns `endpoint` here, because the endpoint is both nearer and higher-ranked
   * — the test is built so the wrong answer is the tempting one.
   */
  it("⚠ HONOURS the input's allowed kinds, and applies them BEFORE the ruled priority", () => {
    const near = candidate([1, 0, 0], 'endpoint'); // nearer AND higher-ranked
    const far = candidate([6, 0, 0], 'face');

    expect(chooseSnap([near, far], flat, [0, 0], 20)?.kind).toBe('endpoint');
    expect(chooseSnap([near, far], flat, [0, 0], 20, ['face'])?.kind).toBe('face');
  });

  it('answers null rather than falling back when nothing of an allowed kind is in reach', () => {
    // ⚠ The honest answer. Falling back to the best DISALLOWED candidate is how the defect above
    // reached the document in the first place.
    expect(chooseSnap([candidate([1, 0, 0], 'endpoint')], flat, [0, 0], 20, ['face'])).toBeNull();
  });

  it('an explicit null allows everything, so `snapTo: null` keeps the wall tool unchanged', () => {
    expect(chooseSnap([candidate([1, 0, 0], 'grid')], flat, [0, 0], 20, null)?.kind).toBe('grid');
  });
});
