// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE TIER-1 SNAP INDEX — P4.5 design §4.1, the browser-side half of the ruled two-tier seam (owner Q2).
 *
 * ⚠⚠ THE WHOLE DESIGN IN ONE SENTENCE: **Tier 1 chooses the target and Tier 2 records the coordinate.**
 * Everything in this file is APPROXIMATE, deliberately and by construction — it is built from the display
 * mesh, which is a chord approximation of the real surface (`DISPLAY_DEFLECTION_MM` = 5 mm). That is
 * exactly what a per-frame snap needs and exactly what a committed coordinate must never be. A snapped
 * value that becomes a command argument goes through `QueryGateway` (Tier 2) or comes from an EXACT
 * source first. *"The snap that lied" — a point a millimetre off true geometry — is a class of bug that
 * corrupts a model silently, and the only defence is knowing which tier you are holding.*
 *
 * ⚠ WHY IT IS PURE, WITH NO THREE.JS ANYWHERE. The projection from world millimetres to screen pixels is
 * INJECTED (`Project`), so the whole of snapping — candidate extraction, the spatial hash, the priority
 * tie-break — is asserted headlessly in Node. Only the camera lives in the GL layer. This is the standing
 * verification split applied to the phase's most correctness-sensitive module: GL-only code is
 * browser-verified, anything with logic in it is headless-verified.
 *
 * ⚠ Nothing here holds a `KernelClient`, mints an identity, or touches the document.
 */

import type { MeshBuffers, Vec3 } from '@bunyan/protocol';
import type { ElementId } from '@bunyan/document';

/**
 * What a snap candidate IS. `vertex` is reserved in the `SubShapeRef` role grammar (D54a) but the kernel
 * does not export vertices yet, so in v1.0.0 an "endpoint" is an edge-polyline endpoint served by Tier 1
 * — it upgrades to an exact kernel vertex with no seam change (design §4.3).
 */
export type SnapKind =
  | 'endpoint'
  | 'intersection'
  | 'midpoint'
  | 'grid'
  | 'perpendicular'
  | 'extension'
  | 'face'
  | 'free';

/**
 * ⚠⚠ THE PRIORITY ORDER — OWNER-RULED (Q3, 2026-07-30), AND IT LIVES HERE AND NOWHERE ELSE.
 *
 * When several candidates fall inside the pixel tolerance, the one EARLIER in this array wins; distance
 * breaks a tie only within a kind. This is the ArchiCAD/Revit convention, so a user arriving from either
 * finds the tie-break where they expect it.
 *
 * ⚠ It is one exported array on purpose: re-ruling it later is an edit to this constant, never a scatter
 * of comparisons across the tools. `rankOf` is the only reader.
 */
export const SNAP_PRIORITY: readonly SnapKind[] = [
  'endpoint',
  'intersection',
  'midpoint',
  'grid',
  'perpendicular',
  'extension',
  'face',
  'free',
];

/** Lower is better. An unknown kind sorts last rather than throwing — a snap must degrade, never crash. */
export function rankOf(kind: SnapKind): number {
  const index = SNAP_PRIORITY.indexOf(kind);
  return index === -1 ? SNAP_PRIORITY.length : index;
}

export interface SnapCandidate {
  readonly point: Vec3;
  readonly kind: SnapKind;
  /** Present when the candidate sits ON a named sub-shape — the token a hosted void binds to. */
  readonly ref?: string;
  /** Present when the candidate belongs to an element — feeds hosting args without a human typing one. */
  readonly elementId?: ElementId;
  /** The drawn part it came from, for hover highlighting. */
  readonly nodeId?: string;
}

/** A snap the cursor actually landed on: the candidate plus how far off it was, in CSS pixels. */
export interface SnapHit extends SnapCandidate {
  readonly pixelDistance: number;
}

/** World millimetres → screen pixels. `null` ⇒ behind the camera / off-screen, so not snappable. */
export type Project = (point: Vec3) => readonly [number, number] | null;

/* ================================================================================================
 * Candidate extraction — from geometry the viewport ALREADY retains. No kernel call, no new state.
 * ============================================================================================= */

/**
 * Endpoints and midpoints of every tessellated edge of one drawn part.
 *
 * ⚠ This reads the SAME retained `MeshBuffers` that picking resolves through (`Viewport.#drawn`), which is
 * the design's core claim: *snapping is the picking substrate one step further* — edge endpoints instead
 * of hit triangles — so the seam needs no new kernel op and no second copy of the geometry.
 *
 * Each polyline contributes its two ends (`endpoint`) and its centre vertex (`midpoint`), carrying the
 * EDGE's own `SubShapeRef` token from the provenance table. ⚠ A degenerate polyline (`count < 2`) yields
 * nothing rather than a duplicate point — a zero-length edge is not a place to snap.
 */
export function edgeCandidates(
  buffers: MeshBuffers,
  identity: { readonly elementId: ElementId; readonly nodeId: string },
): SnapCandidate[] {
  const out: SnapCandidate[] = [];
  const xyz = buffers.edgePositions;

  for (const polyline of buffers.provenance.edges) {
    if (polyline.count < 2) continue;
    const ref = buffers.provenance.refs[polyline.refIndex];
    const at = (vertex: number): Vec3 | null => readVec3(xyz, vertex);

    const first = at(polyline.start);
    const last = at(polyline.start + polyline.count - 1);
    // The polyline's middle VERTEX, not the midpoint of the chord: on a curved edge the vertex lies on
    // the tessellation, which is the honest Tier-1 answer, and Tier 2 corrects it if it is committed.
    const middle = at(polyline.start + Math.floor(polyline.count / 2));

    for (const [point, kind] of [
      [first, 'endpoint'],
      [last, 'endpoint'],
      [middle, 'midpoint'],
    ] as const) {
      if (point === null) continue;
      out.push({
        point,
        kind,
        ...(ref === undefined ? {} : { ref }),
        elementId: identity.elementId,
        nodeId: identity.nodeId,
      });
    }
  }
  return out;
}

/**
 * Intersections of the ground grid the viewport draws (design §4.1: "the scene's grids and levels").
 *
 * ⚠ A GRID CANDIDATE IS EXACT, and that matters more than it looks: it is computed from numbers, not
 * measured off a mesh, so a baseline endpoint snapped to a grid intersection can be COMMITTED without a
 * Tier-2 round trip (§4.4 — "either from the snap's own exact source … or via Tier-2 confirm"). It is the
 * cheapest way for a drawn wall to land on exactly 4000, and the reason the wall tool feels precise
 * before numeric entry is ever used.
 *
 * ⚠ These are the WORLD grid the `GridHelper` draws, not `scene.json` `Grid` entities (D32) — the demo
 * scene has none. Feeding real scene grids in is additive: they produce candidates of the same `kind`.
 */
export function gridCandidates(options: {
  readonly spacingMm: number;
  readonly extentMm: number;
  readonly z?: number;
}): SnapCandidate[] {
  const { spacingMm, extentMm } = options;
  const z = options.z ?? 0;
  const out: SnapCandidate[] = [];
  if (spacingMm <= 0 || extentMm < 0) return out;

  const steps = Math.floor(extentMm / spacingMm);
  for (let i = -steps; i <= steps; i++) {
    for (let j = -steps; j <= steps; j++) {
      out.push({ point: [i * spacingMm, j * spacingMm, z], kind: 'grid' });
    }
  }
  return out;
}

/**
 * THE FACE CANDIDATE — the piece that was missing for design §4.2 (*"click a face to place a
 * window"*), and the one candidate kind that is NOT precomputed (Entry 80).
 *
 * ⚠⚠ IT IS PER-FRAME AND POSITIONAL, WHICH IS WHY IT CANNOT LIVE IN THE INDEX. Every other candidate
 * is a fixed place — an endpoint is at the end of an edge whether you point at it or not — so the
 * index precomputes them once per drawn set. A face is not a place: it is a whole region, and *where
 * on it* the user is pointing is the entire information. Precomputing one candidate per face means
 * committing to a point on it in advance, and the only defensible choice would be its centre — which
 * would put every door a user places in the middle of the wall, silently. So the candidate is built
 * from the ray hit the pick already computes, once per pointer move, and handed to `chooseSnap`
 * alongside the indexed ones.
 *
 * ⚠ AND `SNAP_PRIORITY` ALREADY ANTICIPATED IT: `'face'` sits second-to-last, below every exact kind
 * and above `'free'`. That ordering is the design, not an accident of this function — an endpoint
 * within tolerance beats the face behind it, so pointing near a wall's corner still means the corner,
 * and the face is what you get when nothing sharper is near. Nothing about the ruled order changes.
 *
 * ⚠ `ref` is the ENCODED token, matching `SnapCandidate.ref` (the picking path decodes for its own
 * use; the document is written in tokens). Encoding cannot throw here — the token round-tripped out
 * of the provenance table to be decoded in the first place — but a hostile buffer is exactly what
 * `decodeSubShapeRef` is untrusted about, so this takes the token and never re-derives it.
 */
export function faceCandidate(hit: {
  readonly point: Vec3;
  readonly ref: string;
  readonly elementId: ElementId;
  readonly nodeId: string;
}): SnapCandidate {
  return {
    point: hit.point,
    kind: 'face',
    ref: hit.ref,
    elementId: hit.elementId,
    nodeId: hit.nodeId,
  };
}

/* ================================================================================================
 * The index — a uniform spatial hash in WORLD space, so a query touches a handful of candidates.
 * ============================================================================================= */

/**
 * A uniform-grid spatial hash over candidate points.
 *
 * ⚠ WHY WORLD-SPACE BUCKETS FOR A SCREEN-SPACE QUERY. The pixel tolerance is a screen quantity, but
 * bucketing in screen space would mean re-projecting every candidate on every camera move — i.e. exactly
 * the O(all candidates) per-frame cost the index exists to avoid. So the hash prunes in world space with
 * a generous radius and the caller projects only the survivors. At the 10k-element target that is a few
 * dozen projections per frame instead of hundreds of thousands.
 *
 * ⚠⚠ AND THE RISK THE INDEX CREATES IS THE ONE D73 NAMED WHEN IT INDEXED THE JOIN RESOLVER: **an index
 * buys speed by changing WHO IS ASKED.** Two candidates a millimetre apart can fall in different buckets,
 * so a query that looked only in the cursor's own bucket would silently miss the nearer one. `near()`
 * therefore sweeps every bucket the search sphere touches (not the centre bucket, and not a fixed 3×3) —
 * which is the whole correctness argument, and what `snap.test.ts` is hostile to.
 */
export class SnapIndex {
  readonly #cellMm: number;
  readonly #buckets = new Map<string, SnapCandidate[]>();
  #size = 0;

  constructor(cellMm = 500) {
    this.#cellMm = cellMm > 0 ? cellMm : 500;
  }

  get size(): number {
    return this.#size;
  }

  get cellMm(): number {
    return this.#cellMm;
  }

  add(candidate: SnapCandidate): void {
    const key = this.#keyOf(candidate.point);
    const bucket = this.#buckets.get(key);
    if (bucket === undefined) this.#buckets.set(key, [candidate]);
    else bucket.push(candidate);
    this.#size++;
  }

  addAll(candidates: Iterable<SnapCandidate>): void {
    for (const candidate of candidates) this.add(candidate);
  }

  /**
   * Every candidate within `radiusMm` of `point` — every bucket the sphere touches, never just one.
   *
   * ⚠⚠ TWO WAYS TO ANSWER THE SAME QUESTION, AND WHICH IS CHEAPER DEPENDS ENTIRELY ON THE RADIUS.
   * Sweeping the sphere's cells costs `(2·reach+1)³` map lookups **whether or not those cells hold
   * anything**, so the cost is set by the RADIUS and not by the model. That is fine at the snap
   * radius (3 m ⇒ 13³ = 2 197 probes, 0.16 ms) and ruinous at the guide radius (15 m ⇒ 61³ =
   * 226 981 probes, measured at **16.5 ms per call against a 24-candidate index** — essentially all
   * of it spent proving that empty cells are empty, on the per-frame pointer path). Entry 86 review
   * of Entry 84.
   *
   * ⇒ When the sweep would probe more cells than the index holds candidates, SCAN the candidates
   * instead and apply the identical cell-window test. Same answer; the cost becomes the smaller of
   * the two rather than always the first. This is D73's lesson carried one step on — *an index buys
   * speed by changing who is asked* — and a sweep whose bound is the query VOLUME has stopped being
   * an index at all.
   *
   * ⚠ The cell-window test is kept EXACTLY the sweep's, so the branches return the same set. Order is
   * not part of this method's contract (it was already insertion-order within a bucket); callers rank
   * by the ruled priority and pixel distance, never by position in this array.
   */
  near(point: Vec3, radiusMm: number): SnapCandidate[] {
    const reach = Math.max(0, Math.ceil(radiusMm / this.#cellMm));
    const [cx, cy, cz] = this.#cellOf(point);
    const out: SnapCandidate[] = [];

    if ((2 * reach + 1) ** 3 > this.#size) {
      for (const bucket of this.#buckets.values()) {
        for (const candidate of bucket) {
          const [i, j, k] = this.#cellOf(candidate.point);
          if (Math.abs(i - cx) <= reach && Math.abs(j - cy) <= reach && Math.abs(k - cz) <= reach) {
            out.push(candidate);
          }
        }
      }
      return out;
    }

    for (let i = cx - reach; i <= cx + reach; i++) {
      for (let j = cy - reach; j <= cy + reach; j++) {
        for (let k = cz - reach; k <= cz + reach; k++) {
          const bucket = this.#buckets.get(`${i}|${j}|${k}`);
          if (bucket !== undefined) out.push(...bucket);
        }
      }
    }
    return out;
  }

  #cellOf(point: Vec3): [number, number, number] {
    return [
      Math.floor(point[0] / this.#cellMm),
      Math.floor(point[1] / this.#cellMm),
      Math.floor(point[2] / this.#cellMm),
    ];
  }

  #keyOf(point: Vec3): string {
    const [i, j, k] = this.#cellOf(point);
    return `${i}|${j}|${k}`;
  }
}

/* ================================================================================================
 * The query — screen-space nearest, resolved by the RULED priority order.
 * ============================================================================================= */

/**
 * The best snap for a cursor position, or `null` when nothing is within tolerance.
 *
 * The rule, in order: a candidate must project on-screen and land within `tolerancePx`; among those, the
 * **kind with the best rank wins** (Q3's ruled order); distance decides only between candidates of the
 * same kind. ⚠ That ordering is deliberate and is not "nearest wins": a grid intersection 6 px away must
 * not beat a wall endpoint 8 px away, because the user who is pointing near a corner means the corner.
 */
export function chooseSnap(
  candidates: readonly SnapCandidate[],
  project: Project,
  cursorPx: readonly [number, number],
  tolerancePx: number,
  /**
   * ⚠⚠ THE KINDS THE ACTIVE INPUT WILL ACCEPT (`InputSpec.snapTo`) — `null`/omitted ⇒ all of them.
   *
   * ⚠ THIS PARAMETER EXISTS BECAUSE `snapTo` WAS DECORATIVE FOR THREE ENTRIES AND IT COST A REAL
   * DEFECT (Entry 80, found in the browser, not by reading). `InputSpec.snapTo` was declared, typed
   * and documented — *"which snap kinds are offered for this input"* — and **nothing ever read it.**
   * The opening tool declares `['face']`, but `SNAP_PRIORITY` ranks `endpoint` and `midpoint` ABOVE
   * `face`, so pointing anywhere near a wall's corner won the endpoint — and an endpoint candidate
   * carries the **EDGE's** `SubShapeRef`. The tool then committed a door hosted on an edge, which
   * `core.createElement` accepts and the build then silently fails: `state: 'failed'`, `parts: []`,
   * no banner, no console error, and `unbuildable()`/`brokenRefs()` both empty. Measured on the demo
   * scene: **1 in 2 successful placements came back hosted on an edge.**
   *
   * ⇒ The filter belongs HERE, before the ruled comparison, not after it. Filtering the winner
   * afterwards would answer "no snap" where a perfectly good face candidate was sitting second.
   */
  allow: readonly SnapKind[] | null = null,
): SnapHit | null {
  let best: SnapHit | null = null;

  for (const candidate of candidates) {
    if (allow !== null && !allow.includes(candidate.kind)) continue;
    const screen = project(candidate.point);
    if (screen === null) continue;
    const pixelDistance = Math.hypot(screen[0] - cursorPx[0], screen[1] - cursorPx[1]);
    if (pixelDistance > tolerancePx) continue;

    if (best === null || beats(candidate.kind, pixelDistance, best)) {
      best = { ...candidate, pixelDistance };
    }
  }
  return best;
}

function beats(kind: SnapKind, pixelDistance: number, incumbent: SnapHit): boolean {
  const a = rankOf(kind);
  const b = rankOf(incumbent.kind);
  if (a !== b) return a < b;
  return pixelDistance < incumbent.pixelDistance;
}

/** Read one xyz triple out of a flat position buffer. `null` when the vertex index is out of range. */
function readVec3(xyz: Float32Array, vertex: number): Vec3 | null {
  const i = vertex * 3;
  const x = xyz[i];
  const y = xyz[i + 1];
  const z = xyz[i + 2];
  if (x === undefined || y === undefined || z === undefined) return null;
  return [x, y, z];
}
