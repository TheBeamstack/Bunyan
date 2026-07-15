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
} from '@bunyan/protocol';
import type { ElementId } from '@bunyan/document';

/** What a click on the canvas resolves to — the element, the part, and the picked face's identity. */
export interface PickResult {
  readonly elementId: ElementId;
  readonly nodeId: string;
  readonly partName: string;
  /** The `SubShapeRef` of the face the ray hit — the token a hosted void (a window) binds to. */
  readonly faceRef: SubShapeRef;
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
export function resolveFacePick(part: PickablePart, faceIndex: number): PickResult | null {
  const faceRef = faceRefForTriangle(part.buffers, faceIndex, decodeSubShapeRef);
  if (faceRef === undefined) return null;
  return { elementId: part.elementId, nodeId: part.nodeId, partName: part.partName, faceRef };
}
