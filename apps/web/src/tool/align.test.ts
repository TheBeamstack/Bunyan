// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ALIGNMENT GUIDE tests (P4.5 §4.3). Headless: the projection is injected, so there is no camera and no
 * three.js — only the rules that decide whether the cursor is aligned and what a click there would mean.
 *
 * ⚠ WHAT THESE ARE HOSTILE TO, chosen from how this feature can be wrong while looking right:
 *   (a) **a guide that carries an identity** — the Entry-80 defect wearing a new hat. A guide point is
 *       not on any sub-shape, and a tool that inherited the reference's `ref` would host a door on one
 *       wall at a coordinate measured along an axis from another;
 *   (b) **a guide that outranks or is outranked wrongly** — Q3's order is owner-ruled, and this feature
 *       adds a candidate into it without adding a kind;
 *   (c) **a guide that is always on** — the grid lattice makes every point aligned with something, so
 *       admitting grid references would light the overlay permanently and inform nobody;
 *   (d) **a guide the active input cannot actually snap to being drawn anyway** — a dashed line the
 *       user cannot land on is a lie the renderer tells, and `snapTo` is the thing that stops it.
 */

import { describe, expect, it } from 'vitest';

import type { Vec3 } from '@bunyan/protocol';
import {
  GUIDE_SNAP_KIND,
  LINE_INTERSECTION_SNAP_KIND,
  PERPENDICULAR_SNAP_KIND,
  alignmentGuides,
  guideCandidates,
  lineIntersectionCandidates,
  lineIntersections,
  perpendicularCandidates,
  perpendicularFeet,
  referenceEdges,
  referencePoints,
  type AlignmentOptions,
  type LineIntersectionOptions,
  type PerpendicularOptions,
} from './align';
import { SNAP_PRIORITY, chooseSnap, rankOf, type Project, type SnapCandidate } from './snap';
import { OPENING_TOOL, SELECT_TOOL, WALL_TOOL } from './tools';
import type { Tool } from './toolMachine';

/** A trivial orthographic projection: x/y millimetres straight to pixels, z ignored. */
const flat: Project = (p) => [p[0], p[1]];

function ask(overrides: Partial<AlignmentOptions> = {}): ReturnType<typeof alignmentGuides> {
  return alignmentGuides({
    cursor: [4000, 0, 0],
    cursorPx: [4000, 0],
    references: [[0, 0, 0]],
    project: flat,
    tolerancePx: 12,
    ...overrides,
  });
}

describe('when a guide fires', () => {
  it('fires along X when the cursor shares the reference’s y and z', () => {
    // Reference at the origin, cursor 4 m along +x on the same row: an X alignment, and only that.
    const guides = ask();
    expect(guides.map((g) => g.axis)).toEqual(['x']);
    expect(guides[0]?.reference).toEqual([0, 0, 0]);
    // The FOOT is the point a click would commit: the cursor's own x, the reference's y and z.
    expect(guides[0]?.point).toEqual([4000, 0, 0]);
    expect(guides[0]?.pixelDistance).toBe(0);
  });

  it('does not fire when the cursor is off the line by more than the tolerance', () => {
    // 13 px off in y, tolerance 12. The foot is [4000, 0, 0]; the cursor projects to [4000, 13].
    expect(ask({ cursor: [4000, 13, 0], cursorPx: [4000, 13] })).toEqual([]);
    // …and 11 px off it does fire, so the boundary is the tolerance and not something coarser.
    expect(ask({ cursor: [4000, 11, 0], cursorPx: [4000, 11] }).map((g) => g.axis)).toEqual(['x']);
  });

  it('⚠ refuses the DEGENERATE guide — a cursor sitting on the reference is not "aligned" with it', () => {
    // Every axis is within `minSpanMm` of the reference, so all three feet ARE the reference. A guide
    // here would be a zero-length line, and the honest answer at that position is the endpoint snap
    // (which outranks a guide anyway — see the priority test below).
    expect(ask({ cursor: [0, 0, 0], cursorPx: [0, 0] })).toEqual([]);
    // The threshold is real, not a `=== 0` check: half a millimetre away is still degenerate.
    expect(ask({ cursor: [0.5, 0, 0], cursorPx: [0.5, 0] })).toEqual([]);
    expect(ask({ cursor: [2, 0, 0], cursorPx: [2, 0] }).map((g) => g.axis)).toEqual(['x']);
  });

  it('fires on two axes at once when the cursor lines up with two different references', () => {
    const guides = ask({
      cursor: [4000, 7000, 0],
      cursorPx: [4000, 7000],
      references: [
        [0, 7000, 0], // shares the cursor's y ⇒ an X guide
        [4000, 0, 0], // shares the cursor's x ⇒ a Y guide
      ],
    });
    expect(guides.map((g) => g.axis)).toEqual(['x', 'y']);
    // Both feet are the cursor itself — this is the corner where two alignments meet.
    expect(guides[0]?.point).toEqual([4000, 7000, 0]);
    expect(guides[1]?.point).toEqual([4000, 7000, 0]);
  });

  it('⚠ keeps at most ONE guide per axis — the nearer — and the order is by axis, not by input', () => {
    const guides = ask({
      cursor: [4000, 0, 0],
      cursorPx: [4000, 0],
      references: [
        [0, 8, 0], // 8 px off — a valid X alignment, but the worse one
        [0, 0, 0], // dead on
        [0, 3, 0], // 3 px off
      ],
    });
    expect(guides).toHaveLength(1);
    expect(guides[0]?.axis).toBe('x');
    expect(guides[0]?.reference).toEqual([0, 0, 0]);
    expect(guides[0]?.pixelDistance).toBe(0);
  });

  it('drops a foot the camera cannot see rather than drawing a guide to it', () => {
    const behind: Project = () => null;
    expect(ask({ project: behind })).toEqual([]);
  });

  it('draws the line THROUGH the reference along the axis, spanning both directions', () => {
    const guides = ask({ halfSpanMm: 500 });
    expect(guides[0]?.line).toEqual([
      [-500, 0, 0],
      [500, 0, 0],
    ]);
    // ⚠ The drawn span must not change the committed point — it is decoration and nothing else.
    expect(guides[0]?.point).toEqual(ask({ halfSpanMm: 99_999 })[0]?.point);
  });
});

describe('⚠⚠ what a guide candidate CARRIES — the Entry-80 rule, applied to a new kind', () => {
  it('carries NO ref, NO elementId and NO nodeId, however identified the reference was', () => {
    const guides = ask();
    const [candidate] = guideCandidates(guides);

    expect(candidate?.point).toEqual([4000, 0, 0]);
    expect(candidate?.kind).toBe(GUIDE_SNAP_KIND);
    // ⚠ ABSENT, not `undefined`-valued: the tools test `=== undefined`, and a hosted-void tool must
    // decline a guide rather than commit a door with no host.
    expect(candidate === undefined ? [] : Object.keys(candidate)).toEqual(['point', 'kind']);
  });

  it('⚠⚠ the opening tool cannot be driven onto a guide, because `snapTo` filters it out first', () => {
    // The exact scenario that would be a defect: the cursor is over a wall face AND aligned with a
    // corner. Without the `snapTo` filter the guide (`extension`) outranks the face, so the opening
    // tool would collect a point with no `ref` — Entry 80's failure, arrived at from the other side.
    const face: SnapCandidate = {
      point: [4000, 0, 0],
      kind: 'face',
      ref: 'wall-1.structure/face/y-min#0',
      elementId: 'wall-1',
    };
    const all = [face, ...guideCandidates(ask())];

    // With no filter, the guide wins on the ruled order — and it has no ref.
    const unfiltered = chooseSnap(all, flat, [4000, 0], 12, null);
    expect(unfiltered?.kind).toBe(GUIDE_SNAP_KIND);
    expect(unfiltered?.ref).toBeUndefined();

    // With the opening tool's declared `snapTo: ['face']`, the face is what the tool sees.
    const filtered = chooseSnap(all, flat, [4000, 0], 12, ['face']);
    expect(filtered?.kind).toBe('face');
    expect(filtered?.ref).toBe('wall-1.structure/face/y-min#0');
    expect(filtered?.elementId).toBe('wall-1');
  });

  it('⚠ sits in the RULED slot without adding one: endpoint beats it, it beats face', () => {
    // The ruling (Q3, owner, 2026-07-30) is a single array; this asserts the guide's place IN it rather
    // than re-stating the array, so re-ruling the order re-rules this too.
    expect(SNAP_PRIORITY).toContain(GUIDE_SNAP_KIND);
    expect(rankOf('endpoint')).toBeLessThan(rankOf(GUIDE_SNAP_KIND));
    expect(rankOf('midpoint')).toBeLessThan(rankOf(GUIDE_SNAP_KIND));
    expect(rankOf('grid')).toBeLessThan(rankOf(GUIDE_SNAP_KIND));
    expect(rankOf(GUIDE_SNAP_KIND)).toBeLessThan(rankOf('face'));
    expect(rankOf(GUIDE_SNAP_KIND)).toBeLessThan(rankOf('free'));

    // Driven, not just ranked: an endpoint 10 px away beats a guide dead under the cursor.
    const endpoint: SnapCandidate = { point: [4010, 0, 0], kind: 'endpoint', ref: 'wall-1…edge' };
    const winner = chooseSnap([endpoint, ...guideCandidates(ask())], flat, [4000, 0], 12, null);
    expect(winner?.kind).toBe('endpoint');
  });
});

describe('⚠ the SHIPPED tools decide who sees a guide — driven off their real declarations', () => {
  // ⚠ Read from `tools.ts` rather than restated, so a tool whose `snapTo` changes changes this too.
  const allows = (tool: Tool, index = 0): boolean => {
    const spec = tool.inputs[index];
    if (spec === undefined) return false; // no input to collect ⇒ nothing to land ⇒ no guide
    return spec.snapTo === null || spec.snapTo.includes(GUIDE_SNAP_KIND);
  };

  it('Select gets none (it collects nothing), Wall gets them, Opening is filtered out', () => {
    expect(SELECT_TOOL.inputs).toHaveLength(0);
    expect(allows(SELECT_TOOL)).toBe(false);

    // The wall tool declares `snapTo: null` on BOTH points — every kind, so guides on both.
    expect(allows(WALL_TOOL, 0)).toBe(true);
    expect(allows(WALL_TOOL, 1)).toBe(true);

    // ⚠ The opening tool's `['face']` excludes the guide kind — no guide is offered to it, and
    // therefore (per `Viewport.guidesAt`) none is DRAWN for it either.
    expect(OPENING_TOOL.inputs[0]?.snapTo).toEqual(['face']);
    expect(allows(OPENING_TOOL)).toBe(false);
  });
});

describe('⚠⚠ which candidates may be a REFERENCE — and the lattice that must not be', () => {
  it('takes endpoints and midpoints, and refuses grid and face', () => {
    const at = (point: Vec3, kind: SnapCandidate['kind']): SnapCandidate => ({ point, kind });
    const picked = referencePoints([
      at([1, 0, 0], 'endpoint'),
      at([2, 0, 0], 'midpoint'),
      at([3, 0, 0], 'grid'),
      at([4, 0, 0], 'face'),
      at([5, 0, 0], 'free'),
      at([6, 0, 0], 'extension'),
    ]);
    expect(picked).toEqual([
      [1, 0, 0],
      [2, 0, 0],
    ]);
  });

  /**
   * ⚠⚠ THE LATTICE ARGUMENT, WITH ITS REAL PRECONDITION — corrected at Entry 86's review of Entry 84.
   *
   * The original form of this test asserted *"both guides at EVERY cursor position, permanently"* from a
   * cursor at `[1000, 2000, 0]` on a 1000 mm lattice — which is a point sitting ON both grid lines, the
   * single most favourable position there is. It passed for a reason weaker than its own title (§1c-7),
   * and the universal claim it stated is false: the guide fires on a PIXEL tolerance, so whether the
   * lattice covers the plane depends on what a grid pitch is WORTH IN PIXELS, i.e. on the zoom.
   *
   * The true statement is the one below, and it is the one that justifies the exclusion: **once the grid
   * pitch projects to no more than twice the tolerance, every cursor position is within tolerance of some
   * grid line on both axes** — so the overlay is permanently lit at any zoom at or beyond that, which for
   * a 1 m grid and a 12 px tolerance is simply "most of the time". Zoomed in it is intermittent instead,
   * which is not better: an alignment that appears and vanishes with the zoom is noise either way.
   */
  it('⚠⚠ THE WEAK GREEN THIS BLOCKS: a grid lattice lights both guides at every cursor ONCE ZOOMED OUT', () => {
    const lattice: SnapCandidate[] = [];
    for (let i = -3; i <= 3; i++) {
      for (let j = -3; j <= 3; j++) {
        lattice.push({ point: [i * 1000, j * 1000, 0], kind: 'grid' });
      }
    }
    // 1000 mm ⇒ 20 px, i.e. pitch < 2 × tolerance. THE WORST CASE: dead between four intersections,
    // the position furthest from every grid line. If the guides fire here they fire everywhere.
    const zoomedOut: Project = (p) => [p[0] / 50, p[1] / 50];
    const worst: Vec3 = [1500, 2500, 0];
    const asGrid = alignmentGuides({
      cursor: worst,
      cursorPx: [1500 / 50, 2500 / 50],
      references: lattice.map((c) => c.point),
      project: zoomedOut,
      tolerancePx: 12,
    });
    expect(asGrid.map((g) => g.axis)).toEqual(['x', 'y']); // always on ⇒ informs nobody

    // ⚠ And the precondition is REAL, not decorative: at 1 mm ⇒ 1 px the same lattice and the same
    // worst-case cursor fire NOTHING, which is why the original universal claim was wrong.
    expect(
      alignmentGuides({
        cursor: worst,
        cursorPx: [1500, 2500],
        references: lattice.map((c) => c.point),
        project: flat,
        tolerancePx: 12,
      }),
    ).toEqual([]);

    // Through the real reference filter, the lattice yields nothing at EITHER zoom.
    for (const [project, cursorPx] of [
      [zoomedOut, [1500 / 50, 2500 / 50]],
      [flat, [1500, 2500]],
    ] as const) {
      expect(
        alignmentGuides({
          cursor: worst,
          cursorPx,
          references: referencePoints(lattice),
          project,
          tolerancePx: 12,
        }),
      ).toEqual([]);
    }
  });
});

/**
 * PERPENDICULAR FOOT tests (T-001, P4.5 §4.3's second derived kind). Hostile to the same three shapes as
 * the guide tests, plus the one new question this kind adds — is the foot built from the ruled edge
 * IDENTITY (`ref`) or from geometric proximity, the D1 anti-pattern one layer up:
 *   (a) a foot that carries an identity — Entry-80's rule, applied to a point on no sub-shape;
 *   (b) a foot that outranks or is outranked wrongly — Q3's array, not restated but asserted BY PLACE;
 *   (c) a foot that is degenerate — the anchor already on the reference edge's line;
 *   (d) a reference edge reconstructed by matching nearby points instead of reading the `ref` the mesh
 *       already stamped on both of an edge's ends.
 */
function foot(overrides: Partial<PerpendicularOptions> = {}): ReturnType<typeof perpendicularFeet> {
  return perpendicularFeet({
    anchor: [2000, 2000, 0],
    cursorPx: [2000, 0],
    edges: [
      [
        [0, 0, 0],
        [4000, 0, 0],
      ],
    ],
    project: flat,
    tolerancePx: 12,
    ...overrides,
  });
}

describe('when a perpendicular foot fires', () => {
  it('lands where the anchor projects perpendicular onto the edge’s line', () => {
    const feet = foot();
    expect(feet).toHaveLength(1);
    expect(feet[0]?.point).toEqual([2000, 0, 0]);
    expect(feet[0]?.anchor).toEqual([2000, 2000, 0]);
    expect(feet[0]?.pixelDistance).toBe(0);
  });

  it('does not fire when the foot is off the cursor by more than the tolerance', () => {
    expect(foot({ cursorPx: [2000, 13] })).toEqual([]);
    expect(foot({ cursorPx: [2000, 11] })).toHaveLength(1);
  });

  it('⚠ refuses the DEGENERATE foot — an anchor already ON the edge’s line has no perpendicular', () => {
    expect(foot({ anchor: [1000, 0, 0], cursorPx: [1000, 0] })).toEqual([]);
    // The threshold is real, not `=== 0`: half a millimetre off is still degenerate.
    expect(foot({ anchor: [1000, 0.5, 0], cursorPx: [1000, 0] })).toEqual([]);
    expect(foot({ anchor: [1000, 2, 0], cursorPx: [1000, 0] })).toHaveLength(1);
  });

  it('skips an edge with no direction (its two ends coincide) rather than throwing', () => {
    expect(
      foot({
        edges: [
          [
            [10, 10, 0],
            [10, 10, 0],
          ],
        ],
      }),
    ).toEqual([]);
  });

  it('⚠ is NOT clamped to the segment — a foot past either end is still a valid perpendicular', () => {
    // Anchor sits past the edge's [4000,0,0] end; the foot follows the LINE, not the drawn extent.
    const feet = foot({ anchor: [6000, 500, 0], cursorPx: [6000, 0] });
    expect(feet[0]?.point).toEqual([6000, 0, 0]);
  });

  it('drops a foot the camera cannot see rather than drawing to it', () => {
    const behind: Project = () => null;
    expect(foot({ project: behind })).toEqual([]);
  });

  it('draws the indicator FROM the anchor TO the foot, and nothing else', () => {
    const feet = foot();
    expect(feet[0]?.line).toEqual([
      [2000, 2000, 0],
      [2000, 0, 0],
    ]);
  });
});

describe('⚠⚠ what a perpendicular candidate CARRIES — the Entry-80 rule, applied to this kind too', () => {
  it('carries NO ref, NO elementId and NO nodeId, however the edge was found', () => {
    const [candidate] = perpendicularCandidates(foot());
    expect(candidate?.point).toEqual([2000, 0, 0]);
    expect(candidate?.kind).toBe(PERPENDICULAR_SNAP_KIND);
    expect(candidate === undefined ? [] : Object.keys(candidate)).toEqual(['point', 'kind']);
  });

  it('⚠ sits in the RULED slot without adding one: midpoint/grid beat it, it beats extension/face/free', () => {
    // The ruling (Q3, owner, 2026-07-30) is a single array; this asserts the foot's place IN it rather
    // than re-stating the array, so re-ruling the order re-rules this too.
    expect(SNAP_PRIORITY).toContain(PERPENDICULAR_SNAP_KIND);
    expect(rankOf('endpoint')).toBeLessThan(rankOf(PERPENDICULAR_SNAP_KIND));
    expect(rankOf('intersection')).toBeLessThan(rankOf(PERPENDICULAR_SNAP_KIND));
    expect(rankOf('midpoint')).toBeLessThan(rankOf(PERPENDICULAR_SNAP_KIND));
    expect(rankOf('grid')).toBeLessThan(rankOf(PERPENDICULAR_SNAP_KIND));
    expect(rankOf(PERPENDICULAR_SNAP_KIND)).toBeLessThan(rankOf(GUIDE_SNAP_KIND));
    expect(rankOf(PERPENDICULAR_SNAP_KIND)).toBeLessThan(rankOf('face'));
    expect(rankOf(PERPENDICULAR_SNAP_KIND)).toBeLessThan(rankOf('free'));

    // Driven, not just ranked: a grid point 10 px away beats a perpendicular foot dead under the cursor.
    const grid: SnapCandidate = { point: [2000, 0, 0], kind: 'grid' };
    const winner = chooseSnap(
      [{ ...grid, point: [2010, 0, 0] }, ...perpendicularCandidates(foot())],
      flat,
      [2000, 0],
      12,
      null,
    );
    expect(winner?.kind).toBe('grid');
  });
});

describe('⚠⚠ which candidates may form a REFERENCE EDGE — by `ref`, never by proximity', () => {
  it('pairs the two endpoints that share a `ref` into one edge', () => {
    const at = (point: Vec3, kind: SnapCandidate['kind'], ref?: string): SnapCandidate => ({
      point,
      kind,
      ...(ref === undefined ? {} : { ref }),
    });
    const edges = referenceEdges([
      at([0, 0, 0], 'endpoint', 'wall-1.structure/edge/e0'),
      at([4000, 0, 0], 'endpoint', 'wall-1.structure/edge/e0'),
      at([2000, 0, 0], 'midpoint', 'wall-1.structure/edge/e0'), // same ref, wrong KIND — not an end
      at([4000, 0, 0], 'endpoint', 'wall-2.structure/edge/e0'), // a different edge's OWN pair
      at([4000, 3000, 0], 'endpoint', 'wall-2.structure/edge/e0'),
      at([9000, 9000, 0], 'endpoint'), // no ref at all — cannot be paired
    ]);
    expect(edges).toEqual([
      [
        [0, 0, 0],
        [4000, 0, 0],
      ],
      [
        [4000, 0, 0],
        [4000, 3000, 0],
      ],
    ]);
  });

  it('skips a `ref` that does not resolve to exactly two endpoints, rather than guessing', () => {
    const at = (point: Vec3, ref: string): SnapCandidate => ({ point, kind: 'endpoint', ref });
    expect(referenceEdges([at([0, 0, 0], 'lone-ref')])).toEqual([]);
    expect(
      referenceEdges([
        at([0, 0, 0], 'triple-ref'),
        at([1, 0, 0], 'triple-ref'),
        at([2, 0, 0], 'triple-ref'),
      ]),
    ).toEqual([]);
  });

  it('never pairs two DIFFERENT edges’ ends by how close together they happen to be', () => {
    // Two near-coincident points a millimetre apart, but different `ref`s — the geometric-matching
    // failure mode D1 forbids one layer up. Proximity must not stand in for identity here either.
    const at = (point: Vec3, ref: string): SnapCandidate => ({ point, kind: 'endpoint', ref });
    expect(
      referenceEdges([at([0, 0, 0], 'wall-a/edge/0'), at([0, 1, 0], 'wall-b/edge/0')]),
    ).toEqual([]); // each `ref` alone has only ONE endpoint — neither resolves to a pair
  });
});

/**
 * TWO-CANDIDATE-LINE INTERSECTION tests (T-002, P4.5 §4.3's third derived kind). Hostile to the same
 * shapes the perpendicular tests are, plus the two new ways THIS kind can be wrong while looking right:
 *   (a) an intersection that carries an identity — Entry-80's rule, applied to a point on NEITHER line;
 *   (b) an intersection that outranks or is outranked wrongly — Q3's array, asserted BY PLACE;
 *   (c) an intersection clamped to a finite segment when the real crossing is past either edge's end;
 *   (d) an intersection reported for lines that are genuinely skew (different levels) rather than a
 *       mesh-deflection hair off coplanar — the Tier-1-is-approximate guard-rail (§4.1/§4.4) applied to
 *       two lines instead of one.
 */
function intersect(
  overrides: Partial<LineIntersectionOptions> = {},
): ReturnType<typeof lineIntersections> {
  return lineIntersections({
    cursorPx: [2000, 0],
    lines: [
      [
        [0, 0, 0],
        [4000, 0, 0],
      ],
      [
        [2000, -4000, 0],
        [2000, 4000, 0],
      ],
    ],
    project: flat,
    tolerancePx: 12,
    ...overrides,
  });
}

describe('when a line-line intersection fires', () => {
  it('lands where the two lines cross', () => {
    const hits = intersect();
    expect(hits).toHaveLength(1);
    expect(hits[0]?.point).toEqual([2000, 0, 0]);
    expect(hits[0]?.pixelDistance).toBe(0);
  });

  it('does not fire when the crossing is off the cursor by more than the tolerance', () => {
    expect(intersect({ cursorPx: [2013, 0] })).toEqual([]);
    expect(intersect({ cursorPx: [2011, 0] })).toHaveLength(1);
  });

  it('⚠ is NOT clamped to either segment — a crossing past both drawn extents is still valid', () => {
    // Line A only spans x∈[0,1000]; line B only spans y∈[-1000,1000] at x=5000. Extended, they cross at
    // (5000,0,0) — nowhere near either drawn segment.
    const hits = intersect({
      cursorPx: [5000, 0],
      lines: [
        [
          [0, 0, 0],
          [1000, 0, 0],
        ],
        [
          [5000, -1000, 0],
          [5000, 1000, 0],
        ],
      ],
    });
    expect(hits[0]?.point).toEqual([5000, 0, 0]);
  });

  it('skips two parallel lines — there is no single crossing to report', () => {
    expect(
      intersect({
        cursorPx: [2000, 50],
        lines: [
          [
            [0, 0, 0],
            [4000, 0, 0],
          ],
          [
            [0, 100, 0],
            [4000, 100, 0],
          ],
        ],
      }),
    ).toEqual([]);
  });

  it('⚠ refuses a NEAR-parallel crossing too — under `minAngleDeg` the point is not stable', () => {
    // Both lines lie in z=0, so any non-parallel pair here truly meets (gap 0) — only the angle decides.
    const lines: readonly (readonly [Vec3, Vec3])[] = [
      [
        [0, 0, 0],
        [1000, 0, 0],
      ],
      [
        [0, 100, 0],
        [1000, 110, 0], // ~0.57° off parallel
      ],
    ];
    expect(intersect({ lines, cursorPx: [0, 0], tolerancePx: 1_000_000 })).toEqual([]);
    // The threshold is real, not decorative: lowering it below the actual ~0.57° admits the same pair.
    expect(
      intersect({ lines, cursorPx: [0, 0], tolerancePx: 1_000_000, minAngleDeg: 0.1 }),
    ).toHaveLength(1);
  });

  it('skips a degenerate (zero-length) line rather than throwing', () => {
    expect(
      intersect({
        lines: [
          [
            [10, 10, 0],
            [10, 10, 0],
          ],
          [
            [2000, -4000, 0],
            [2000, 4000, 0],
          ],
        ],
      }),
    ).toEqual([]);
  });

  it('⚠⚠ refuses a genuinely SKEW crossing — Tier 1 is approximate, and a real gap is not a mesh hair', () => {
    // Coplanar-in-x/y but 1000 mm apart in z: two edges at different levels that only LOOK like they
    // cross from this projection. Default `maxGapMm` (5, the display mesh's own chord error) refuses it.
    const skew: readonly (readonly [Vec3, Vec3])[] = [
      [
        [0, 0, 0],
        [4000, 0, 0],
      ],
      [
        [2000, -4000, 1000],
        [2000, 4000, 1000],
      ],
    ];
    expect(intersect({ lines: skew })).toEqual([]);
    // ⚠ And the guard is a real threshold, not a `=== 0` check: raising it far enough accepts the same
    // pair, landing at the MIDPOINT of the two lines' closest approach — never one line's point alone.
    const hits = intersect({ lines: skew, maxGapMm: 2000 });
    expect(hits[0]?.point).toEqual([2000, 0, 500]);
  });

  it('drops a crossing the camera cannot see rather than reporting it', () => {
    const behind: Project = () => null;
    expect(intersect({ project: behind })).toEqual([]);
  });
});

describe('⚠⚠ what an intersection candidate CARRIES — the Entry-80 rule, applied to this kind too', () => {
  it('carries NO ref, NO elementId and NO nodeId, however the two edges were found', () => {
    const [candidate] = lineIntersectionCandidates(intersect());
    expect(candidate?.point).toEqual([2000, 0, 0]);
    expect(candidate?.kind).toBe(LINE_INTERSECTION_SNAP_KIND);
    expect(candidate === undefined ? [] : Object.keys(candidate)).toEqual(['point', 'kind']);
  });

  it('⚠ sits in the RULED slot without adding one: only endpoint beats it', () => {
    // The ruling (Q3, owner, 2026-07-30) is a single array; this asserts the crossing's place IN it
    // rather than re-stating the array, so re-ruling the order re-rules this too.
    expect(SNAP_PRIORITY).toContain(LINE_INTERSECTION_SNAP_KIND);
    expect(rankOf('endpoint')).toBeLessThan(rankOf(LINE_INTERSECTION_SNAP_KIND));
    expect(rankOf(LINE_INTERSECTION_SNAP_KIND)).toBeLessThan(rankOf('midpoint'));
    expect(rankOf(LINE_INTERSECTION_SNAP_KIND)).toBeLessThan(rankOf('grid'));
    expect(rankOf(LINE_INTERSECTION_SNAP_KIND)).toBeLessThan(rankOf(PERPENDICULAR_SNAP_KIND));
    expect(rankOf(LINE_INTERSECTION_SNAP_KIND)).toBeLessThan(rankOf(GUIDE_SNAP_KIND));
    expect(rankOf(LINE_INTERSECTION_SNAP_KIND)).toBeLessThan(rankOf('face'));
    expect(rankOf(LINE_INTERSECTION_SNAP_KIND)).toBeLessThan(rankOf('free'));

    // Driven, not just ranked: an endpoint 10 px away beats a crossing dead under the cursor.
    const endpoint: SnapCandidate = { point: [2010, 0, 0], kind: 'endpoint', ref: 'wall-1…edge' };
    const winner = chooseSnap(
      [endpoint, ...lineIntersectionCandidates(intersect())],
      flat,
      [2000, 0],
      12,
      null,
    );
    expect(winner?.kind).toBe('endpoint');

    // And it beats a midpoint dead under the cursor the other way.
    const midpoint: SnapCandidate = { point: [2010, 0, 0], kind: 'midpoint' };
    const winnerOther = chooseSnap(
      [midpoint, ...lineIntersectionCandidates(intersect())],
      flat,
      [2000, 0],
      12,
      null,
    );
    expect(winnerOther?.kind).toBe(LINE_INTERSECTION_SNAP_KIND);
  });
});
