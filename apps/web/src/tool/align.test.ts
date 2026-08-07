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
  alignmentGuides,
  guideCandidates,
  referencePoints,
  type AlignmentOptions,
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
