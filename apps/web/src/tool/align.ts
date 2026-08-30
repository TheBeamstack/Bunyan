/**
 * DERIVED SNAP CANDIDATES — P4.5 design §4.3's app-produced kinds: the axis GUIDE (*"when the cursor is
 * aligned with a live reference point, draw a dashed guide line and snap to it"*) and the PERPENDICULAR
 * foot (below, from the gesture anchor onto a reference edge).
 *
 * ⚠⚠ WHAT THIS FILE IS, IN ONE SENTENCE: **a guide is a RENDERING of a Tier-1 candidate, and its point
 * is a Tier-1 candidate of its own** — nothing here touches the model, mints an identity, or calls the
 * kernel. It is the same discipline `snap.ts` holds: the projection is INJECTED, so every rule below is
 * asserted headlessly and only the dashed line is GL. (The standing verification split; and Entry 80 is
 * the reason to take it seriously — the code that *declared* the right thing was the code that was
 * wrong.)
 *
 * ⚠⚠ AND THE ONE DECISION THAT SHAPES EVERYTHING ELSE: **A GUIDE CARRIES NO `ref` AND NO `elementId`.**
 * It is a point on a line through a reference, which is not a point on any sub-shape — the reference's
 * identity belongs to the reference, not to the place the cursor happens to reach along an axis from it.
 * Inheriting it would be Entry 80's defect exactly: *"a `SnapHit`'s `ref` and its `point` must come from
 * the same place"*, committed on a coordinate measured somewhere else. A tool that needs a host
 * therefore declines a guide, which is correct, and `snapTo` makes it never see one in the first place.
 *
 * ⚠ WHERE IT SITS IN THE RULED PRIORITY ORDER, WITHOUT RE-RULING IT. A guide candidate is
 * **`'extension'`** — Q3's owner-ruled order already has a slot for it (*endpoint > intersection >
 * midpoint > grid > perpendicular/extension > face > free*), and the slot is right in both directions:
 * an endpoint 3 px away beats the guide (the user pointing at a corner means the corner), and the guide
 * beats the face behind it (the user who has lined up with something means the alignment). **No entry is
 * added to `SNAP_PRIORITY` and nothing about Q3 changes.**
 */

import type { Vec3 } from '@bunyan/protocol';
import type { Project, SnapCandidate, SnapKind } from './snap';

/** The world axis a guide line RUNS ALONG. An `'x'` guide holds y and z fixed at the reference's. */
export type GuideAxis = 'x' | 'y' | 'z';

const AXES: readonly GuideAxis[] = ['x', 'y', 'z'];
const AXIS_INDEX: Readonly<Record<GuideAxis, 0 | 1 | 2>> = { x: 0, y: 1, z: 2 };

/**
 * ⚠ THE KIND A GUIDE CANDIDATE CARRIES. One constant, read by `guideCandidates` and by the tests, so
 * "which slot in the ruled order does an alignment occupy?" has exactly one answer in the codebase.
 */
export const GUIDE_SNAP_KIND: SnapKind = 'extension';

export interface AlignmentGuide {
  readonly axis: GuideAxis;
  /** The live reference the guide runs through — an endpoint, a midpoint, or the gesture's own anchor. */
  readonly reference: Vec3;
  /** The cursor's foot on the guide: the point that would actually be committed. */
  readonly point: Vec3;
  /** What to draw, in world mm. Two points; the renderer dashes it. */
  readonly line: readonly [Vec3, Vec3];
  /** How far the foot projects from the cursor, in CSS pixels — the same instrument `chooseSnap` uses. */
  readonly pixelDistance: number;
}

export interface AlignmentOptions {
  /** Where the cursor is in the world right now — the free point a click would otherwise commit. */
  readonly cursor: Vec3;
  /** Where the cursor is on screen, in canvas CSS pixels. */
  readonly cursorPx: readonly [number, number];
  /** The live reference points. See `referencePoints` for which candidates may become one, and why. */
  readonly references: readonly Vec3[];
  readonly project: Project;
  /** How close (CSS px) the foot must project to the cursor for the alignment to fire. */
  readonly tolerancePx: number;
  /**
   * ⚠ Below this, the cursor is AT the reference along that axis and the "guide" is a degenerate point
   * rather than a line. Rejecting it is not cosmetic: a zero-length line has no direction to draw, and
   * the honest answer at that position is the reference's own endpoint snap, which outranks a guide.
   */
  readonly minSpanMm?: number;
  /** Half the drawn length, either side of the reference. Drawing only; it never affects the point. */
  readonly halfSpanMm?: number;
}

/**
 * Every axis the cursor is currently aligned on — **at most one guide per axis, the nearest**, so three
 * is the hard maximum and the set is deterministic.
 *
 * ⚠ WHY ONE PER AXIS RATHER THAN A TOP-N CAP. Two references whose y differs by less than the tolerance
 * produce two guides a user cannot tell apart, and drawing both is noise that hides the one that matters.
 * Picking the nearer is the same tie-break `chooseSnap` uses within a kind, so the two agree by
 * construction rather than by coincidence. ⚠ It is a real bound and it is stated rather than silent: if
 * you are aligned with two DIFFERENT references on the same axis, you see the nearer one only.
 */
export function alignmentGuides(options: AlignmentOptions): AlignmentGuide[] {
  const { cursor, cursorPx, references, project, tolerancePx } = options;
  const minSpanMm = options.minSpanMm ?? 1;
  const halfSpanMm = options.halfSpanMm ?? 20_000;

  const best = new Map<GuideAxis, AlignmentGuide>();

  for (const reference of references) {
    for (const axis of AXES) {
      const a = AXIS_INDEX[axis];
      // The foot: the cursor's own coordinate along the guide, the reference's on the other two.
      const point: Vec3 = [
        a === 0 ? cursor[0] : reference[0],
        a === 1 ? cursor[1] : reference[1],
        a === 2 ? cursor[2] : reference[2],
      ];
      if (Math.abs(point[a] - reference[a]) < minSpanMm) continue;

      const screen = project(point);
      if (screen === null) continue;
      const pixelDistance = Math.hypot(screen[0] - cursorPx[0], screen[1] - cursorPx[1]);
      if (pixelDistance > tolerancePx) continue;

      const incumbent = best.get(axis);
      if (incumbent !== undefined && incumbent.pixelDistance <= pixelDistance) continue;

      best.set(axis, {
        axis,
        reference,
        point,
        line: [
          withAxis(reference, a, reference[a] - halfSpanMm),
          withAxis(reference, a, reference[a] + halfSpanMm),
        ],
        pixelDistance,
      });
    }
  }

  // Stable order — by axis, not by insertion — so a re-render never reshuffles the drawn overlay.
  return AXES.map((axis) => best.get(axis)).filter((g): g is AlignmentGuide => g !== undefined);
}

/**
 * The guides, as snap candidates for `chooseSnap`.
 *
 * ⚠⚠ NO `ref`, NO `elementId`, NO `nodeId` — see this file's header. They are omitted rather than set to
 * `undefined` because `SnapCandidate` is exact-optional and the tools test `=== undefined`; an explicit
 * `undefined` would read as *"we looked and there is none"* where the truth is *"this kind of candidate
 * has none, by construction"*.
 */
export function guideCandidates(guides: readonly AlignmentGuide[]): SnapCandidate[] {
  return guides.map((guide) => ({ point: guide.point, kind: GUIDE_SNAP_KIND }));
}

/**
 * Which Tier-1 candidates may serve as a guide's reference.
 *
 * ⚠⚠ **`'grid'` IS EXCLUDED, AND IT IS THE WHOLE REASON THIS FUNCTION EXISTS RATHER THAN A `.map()`.**
 * The ground grid is a lattice, so admitting grid points lights both guides at once — and **the
 * condition for "everywhere, permanently" is a zoom, not a certainty** (corrected at Entry 86; the
 * original note here claimed it held at every cursor position unconditionally, and the test backing it
 * had put the cursor ON both grid lines). A guide fires on a PIXEL tolerance: once the grid pitch
 * projects to no more than twice that tolerance — a 1 m grid at anything but a close zoom — every
 * cursor is within tolerance of some grid line on both axes and the overlay never goes out. Zoomed
 * in it flickers on and off with the pitch instead, which is not an improvement: an alignment that
 * appears and vanishes as you zoom informs nobody either way. Grid alignment is already served, and
 * served better, by the `'grid'` snap itself — which is EXACT (`snap.ts`) where a guide is not.
 *
 * ⚠ `'face'` is excluded for the same reason one step along: a face candidate is wherever the ray hit,
 * so it moves with the cursor and can never be *aligned with* it. What is left is the fixed places a
 * human recognises — an endpoint and a midpoint — plus whatever the caller adds (the gesture's anchor).
 */
export function referencePoints(candidates: readonly SnapCandidate[]): Vec3[] {
  const out: Vec3[] = [];
  for (const candidate of candidates) {
    if (candidate.kind === 'endpoint' || candidate.kind === 'midpoint') out.push(candidate.point);
  }
  return out;
}

function withAxis(point: Vec3, axis: 0 | 1 | 2, value: number): Vec3 {
  const out: [number, number, number] = [point[0], point[1], point[2]];
  out[axis] = value;
  return out;
}

/* ================================================================================================
 * THE PERPENDICULAR FOOT — P4.5 design §4.3's other derived kind. Entry 84 shipped the axis guide and
 * named this the next one, "the same shape (a derived line, a foot on it), in the same module, with the
 * same identity rule." It is that shape: a fixed point, computed from the gesture anchor and a reference
 * EDGE rather than a reference POINT and a world axis.
 * ================================================================================================ */

/**
 * ⚠ THE KIND A FOOT CANDIDATE CARRIES. `SnapKind` already declares `'perpendicular'` and `SNAP_PRIORITY`
 * already ranks it (Q3) — this file is the first producer, not a new slot.
 */
export const PERPENDICULAR_SNAP_KIND: SnapKind = 'perpendicular';

export interface PerpendicularFoot {
  /** The reference edge the foot is perpendicular TO — its two ends, in world mm. */
  readonly edge: readonly [Vec3, Vec3];
  /** The gesture anchor the foot is measured FROM. Fixed for the whole gesture, unlike a guide's cursor-
   *  dependent foot: a perpendicular is a relationship between the anchor and the edge, not the cursor. */
  readonly anchor: Vec3;
  /** The foot itself: the point on the edge's line nearest the anchor — what a click would commit. */
  readonly point: Vec3;
  /** What to draw: the right-angle indicator, anchor to foot. Two points; the renderer dashes it. */
  readonly line: readonly [Vec3, Vec3];
  /** How far the foot projects from the cursor, in CSS pixels — the same instrument `chooseSnap` uses. */
  readonly pixelDistance: number;
}

export interface PerpendicularOptions {
  /** The point the perpendicular is measured FROM — the in-progress gesture's own anchor. */
  readonly anchor: Vec3;
  /** Where the cursor is on screen, in canvas CSS pixels — a foot only fires within `tolerancePx` of it. */
  readonly cursorPx: readonly [number, number];
  /** Candidate reference edges. See `referenceEdges` for how one is built without geometric matching. */
  readonly edges: readonly (readonly [Vec3, Vec3])[];
  readonly project: Project;
  readonly tolerancePx: number;
  /**
   * ⚠ Below this the anchor is already ON the edge's line and the foot IS the anchor — a degenerate,
   * direction-less "perpendicular" exactly as `alignmentGuides`' `minSpanMm` refuses for a guide.
   */
  readonly minSpanMm?: number;
}

/**
 * The perpendicular foot from `anchor` onto each reference edge's line, within pixel tolerance of the
 * cursor — the CAD-familiar "perpendicular" osnap: while drawing FROM a point, land the next one square
 * onto an existing edge.
 *
 * ⚠ THE FOOT DOES NOT DEPEND ON THE CURSOR'S POSITION ALONG THE LINE, only on whether the cursor is near
 * enough to it on screen to mean it — unlike an axis guide, whose foot slides with the cursor. `anchor`
 * and `edge` alone fix the point; nearer geometry (`vector algebra: project anchor onto the line through
 * edge[0]/edge[1]`) is the whole computation, and it is done once per edge, not once per pointer move
 * per edge times a cursor coordinate.
 *
 * ⚠ THE FOOT IS NOT CLAMPED TO THE SEGMENT. A real perpendicular can land past either end of the edge
 * that is visible — this is the same "deferred perpendicular" every CAD tool offers, and clamping would
 * silently refuse a valid, useful foot just outside the drawn extent for no geometric reason.
 */
export function perpendicularFeet(options: PerpendicularOptions): PerpendicularFoot[] {
  const { anchor, cursorPx, edges, project, tolerancePx } = options;
  const minSpanMm = options.minSpanMm ?? 1;
  const out: PerpendicularFoot[] = [];

  for (const edge of edges) {
    const [a, b] = edge;
    const dir: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const lenSq = dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2];
    if (lenSq < 1) continue; // a zero-length edge has no direction to be perpendicular to

    const toAnchor: Vec3 = [anchor[0] - a[0], anchor[1] - a[1], anchor[2] - a[2]];
    const t = (toAnchor[0] * dir[0] + toAnchor[1] * dir[1] + toAnchor[2] * dir[2]) / lenSq;
    const point: Vec3 = [a[0] + dir[0] * t, a[1] + dir[1] * t, a[2] + dir[2] * t];

    if (distance(point, anchor) < minSpanMm) continue; // the anchor is already ON this edge's line

    const screen = project(point);
    if (screen === null) continue;
    const pixelDistance = Math.hypot(screen[0] - cursorPx[0], screen[1] - cursorPx[1]);
    if (pixelDistance > tolerancePx) continue;

    out.push({ edge, anchor, point, line: [anchor, point], pixelDistance });
  }
  return out;
}

/**
 * The feet, as snap candidates for `chooseSnap`.
 *
 * ⚠⚠ NO `ref`, NO `elementId`, NO `nodeId` — Entry 84's rule for the guide, applied to this kind for the
 * same reason: the foot is a point on the LINE through an edge, not a point ON the edge (it is not even
 * clamped to it), so it is on no sub-shape whichever edge it was measured against. A hosted-void tool
 * therefore declines a perpendicular foot exactly as it declines a guide.
 */
export function perpendicularCandidates(feet: readonly PerpendicularFoot[]): SnapCandidate[] {
  return feet.map((foot) => ({ point: foot.point, kind: PERPENDICULAR_SNAP_KIND }));
}

/**
 * Which Tier-1 candidates may serve as a perpendicular reference EDGE — reconstructed from the two
 * `'endpoint'` candidates that share an edge's `ref`, never from which points happen to sit near each
 * other.
 *
 * ⚠⚠ WHY BY `ref` AND NOT BY PROXIMITY. Pairing the two nearest endpoints into a line would be exactly
 * the geometric-index anti-pattern D1 exists to forbid one layer up — a "derived" identity built by
 * matching *positions* rather than reading the one the model already assigned. `ref` is that identity:
 * `edgeCandidates` (`tool/snap.ts`) stamps every endpoint of one tessellated edge with the SAME `ref`, so
 * grouping by it recovers exactly the edge the mesh drew, never two ends of two different walls that
 * happen to be close together.
 *
 * A `ref` that does not resolve to exactly two endpoints is skipped rather than guessed at — a degenerate
 * polyline (`edgeCandidates` already refuses one under two vertices) or any future candidate that reuses
 * a `ref` for something else must not silently become a fabricated edge.
 */
export function referenceEdges(
  candidates: readonly SnapCandidate[],
): ReadonlyArray<readonly [Vec3, Vec3]> {
  const byRef = new Map<string, Vec3[]>();
  for (const candidate of candidates) {
    if (candidate.kind !== 'endpoint' || candidate.ref === undefined) continue;
    const points = byRef.get(candidate.ref);
    if (points === undefined) byRef.set(candidate.ref, [candidate.point]);
    else points.push(candidate.point);
  }

  const out: (readonly [Vec3, Vec3])[] = [];
  for (const points of byRef.values()) {
    if (points.length !== 2) continue;
    out.push([points[0]!, points[1]!]);
  }
  return out;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
