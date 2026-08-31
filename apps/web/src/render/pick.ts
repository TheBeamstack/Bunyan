// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * SUB-SHAPE PICKING — the pure resolution half (P4 step 4). No three.js here on purpose: the raycast that
 * produces a hit triangle lives in `Viewport` (it needs the camera + renderer), but turning that triangle
 * index into a stable `SubShapeRef` is pure identity lookup through the provenance the viewport RETAINS in
 * step 2c. Keeping it here makes it testable headlessly, and keeps the thing that ends hand-typed
 * derivation tokens out of the GL layer.
 */

import {
  faceRefForTriangle,
  decodeSubShapeRef,
  type MeshBuffers,
  type SubShapeRef,
  type Vec3,
} from '@bunyan/protocol';
import type { ElementId } from '@bunyan/document';

/** What a click on the canvas resolves to — the element, the part, and the picked face's identity. */
export interface PickResult {
  readonly elementId: ElementId;
  readonly nodeId: string;
  readonly partName: string;
  /** The `SubShapeRef` of the face the ray hit — the token a hosted void (a window) binds to. */
  readonly faceRef: SubShapeRef;
  /**
   * WHERE on that face the ray landed, in world millimetres (Entry 80).
   *
   * ⚠⚠ IT IS TIER 1 AND IT IS NOT NEGOTIABLE THAT IT SAYS SO. This point comes off the DISPLAY mesh —
   * a 5 mm chord approximation — via a three.js raycast, so it is a place, not a coordinate. It is
   * what lets a click mean *"a door about here on this wall"* rather than only *"this wall"*; the
   * exact thing a click authors is the `faceRef` beside it, which is an identity and carries no
   * approximation at all. `tool/snap.ts`'s header is the standing statement of the rule.
   *
   * ⚠ The `faceRef` was already enough to HOST a void. It was never enough to POSITION one, which is
   * why the opening tool needed this field and the wall tool never did.
   */
  readonly point: Vec3;
}

/** The identity + retained buffers a pick resolves against — the fields `pick()` reads off a `DrawnPart`. */
export interface PickablePart {
  readonly elementId: ElementId;
  readonly nodeId: string;
  readonly partName: string;
  readonly buffers: MeshBuffers;
}

/**
 * Map a hit triangle back to the `SubShapeRef` of the face it belongs to, through the provenance retained
 * in step 2c. Returns `null` when the triangle carries no decodable face ref (an out-of-range index, or an
 * untrusted token that fails to decode — an untrusted map must never yield a *wrong* ref, only no ref).
 */
export function resolveFacePick(
  part: PickablePart,
  faceIndex: number,
  point: Vec3,
): PickResult | null {
  const faceRef = faceRefForTriangle(part.buffers, faceIndex, decodeSubShapeRef);
  if (faceRef === undefined) return null;
  return {
    elementId: part.elementId,
    nodeId: part.nodeId,
    partName: part.partName,
    faceRef,
    point,
  };
}

/**
 * Convert a `BatchedMesh` raycast's GLOBAL face index into the part's LOCAL one (the batching rewrite,
 * P4 step 9(b); design §5). `BatchedMesh.raycast` reports `faceIndex` against the MERGED index buffer, so
 * the local triangle index the retained provenance is keyed by is the global one minus the part's geometry
 * range start (`getGeometryRangeAt(...).start`, in index units ⇒ divide by 3 for triangles).
 *
 * ⚠ THIS IS THE LOAD-BEARING ARITHMETIC OF THE REWRITE — the plan warned batching AFTER picking is a
 * rewrite (imp_plan:366), and this is the seam it named. Kept pure so it is asserted in Node, not only in
 * the browser. `rangeStart` is always a multiple of 3 (a triangle boundary), so the division is exact;
 * a caller that passes a garbage range gets a non-integer or negative index, which `resolveFacePick`
 * rejects downstream (no ref, never a WRONG ref — the picking contract).
 */
export function localFaceIndex(globalFaceIndex: number, rangeStart: number): number {
  return globalFaceIndex - rangeStart / 3;
}
