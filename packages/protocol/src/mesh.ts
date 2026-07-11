/**
 * Tessellation output + the PROVENANCE CHANNEL (spec §3, architecture §3).
 *
 * A mesh is a disposable display artifact — but it ships with the maps that let the main thread
 * turn a picked triangle or edge polyline back into a stable `SubShapeRef`. That is the *input*
 * side of the persistent-naming system: without it, the viewport could not author references.
 * This is part of the frozen protocol.
 *
 * The numeric arrays are transferable `ArrayBuffer`s (moved, not copied, across postMessage).
 * The `refs` table is a small array of encoded tokens, structured-cloned alongside them.
 */

import type { SubShapeRef } from './subshape.js';

export type Vec3 = readonly [number, number, number];

export interface Bounds {
  readonly min: Vec3;
  readonly max: Vec3;
}

/** A tessellated edge, as a contiguous run of vertices in `edgePositions`. */
export interface EdgePolyline {
  /** Index into `MeshProvenance.refs` — the edge's `SubShapeRef`. */
  readonly refIndex: number;
  /** Offset in VERTICES (not floats) into `edgePositions`. */
  readonly start: number;
  /** Number of vertices in this polyline. */
  readonly count: number;
}

export interface MeshProvenance {
  /** Deduplicated `SubShapeRef` tokens (see `encodeSubShapeRef`). The maps below index into this. */
  readonly refs: readonly string[];
  /** One entry per triangle (`indices.length / 3`): the index of the owning FACE ref. */
  readonly triangleToRef: Uint32Array;
  /** One entry per tessellated edge, each pointing at its owning EDGE ref. */
  readonly edges: readonly EdgePolyline[];
}

export interface MeshBuffers {
  /** xyz triples, millimetres (spec §6, decision D5). */
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly indices: Uint32Array;
  /** xyz triples for the edge polylines (rendered as lines, and pickable). */
  readonly edgePositions: Float32Array;
  readonly provenance: MeshProvenance;
  readonly bounds: Bounds;
}

/** The buffers to hand to `postMessage`'s transfer list so they move instead of copying. */
export function meshTransferables(mesh: MeshBuffers): ArrayBuffer[] {
  return [
    mesh.positions.buffer as ArrayBuffer,
    mesh.normals.buffer as ArrayBuffer,
    mesh.indices.buffer as ArrayBuffer,
    mesh.edgePositions.buffer as ArrayBuffer,
    mesh.provenance.triangleToRef.buffer as ArrayBuffer,
  ];
}

export function triangleCount(mesh: MeshBuffers): number {
  return mesh.indices.length / 3;
}

/**
 * Resolve a picked triangle to the `SubShapeRef` of the face it belongs to.
 * This is the call the viewport makes on a click (architecture §6.2 step 1).
 */
export function faceRefForTriangle(
  mesh: MeshBuffers,
  triangleIndex: number,
  decode: (token: string) => SubShapeRef | undefined,
): SubShapeRef | undefined {
  const refIndex = mesh.provenance.triangleToRef[triangleIndex];
  if (refIndex === undefined) return undefined;
  const token = mesh.provenance.refs[refIndex];
  if (token === undefined) return undefined;
  return decode(token);
}
