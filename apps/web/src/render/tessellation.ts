// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `MeshBuffers` → three.js geometry — the shared, GL-agnostic tessellation helpers.
 *
 * ⚠ WHY A SEPARATE MODULE (P4 step 9(b), the batching rewrite). These used to live in `Viewport.ts`.
 * The batch (`PartBatch`) and the `Viewport` both need them, and `Viewport` imports `PartBatch`, so a
 * shared home avoids an import cycle. `Viewport` re-exports them so the scale harness's existing imports
 * (`from '../render/Viewport'`) keep working unchanged.
 */

import * as THREE from 'three';

import type { MeshBuffers } from '@bunyan/protocol';

/**
 * Edge colour — near-black, so edges read as CAD linework over the shaded faces. Exported for the scale
 * harness (P4 step 9b) so its filler edges match the shipped viewport's appearance exactly.
 */
export const EDGE_COLOR = 0x11141a;

/**
 * The per-part face material for the UNBATCHED path (still used by the scale harness's real-part meshes).
 * Carries its colour directly. The BATCHED path uses `createBatchFaceMaterial` (a white base + per-instance
 * colour) instead — see `PartBatch`.
 */
export function createPartMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.0,
    // Push faces back a hair so the edge lines sit cleanly on top without z-fighting.
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

/**
 * The face material for a `BatchedMesh` (P4 step 9(b)). Base colour WHITE because `BatchedMesh` multiplies
 * the material colour by each instance's `setColorAt` colour — a non-white base would tint every part.
 * Same roughness/metalness/polygon-offset as `createPartMaterial`, so a batched frame shades identically
 * to the per-part one it replaces (the measurement must compare like with like).
 */
export function createBatchFaceMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
}

/**
 * `MeshBuffers` → a three.js face `BufferGeometry`. The tight kernel `bounds` become the geometry's
 * bounding volume directly — tighter than three's mesh-AABB and floating-point-stable across machines,
 * which keeps frustum culling (now per-instance, via `BatchedMesh`) and fit-to-view honest.
 */
export function toBufferGeometry(mesh: MeshBuffers): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));

  const { min, max } = mesh.bounds;
  const box = new THREE.Box3(
    new THREE.Vector3(min[0], min[1], min[2]),
    new THREE.Vector3(max[0], max[1], max[2]),
  );
  geometry.boundingBox = box;
  geometry.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  return geometry;
}

/**
 * The part's edge polylines → one `LineSegments` (the UNBATCHED path — scale harness real parts). Each
 * `EdgePolyline` is a contiguous run of `count` vertices in `edgePositions`; expanded into consecutive
 * segment pairs indexed into the shared position buffer, so no vertex data is duplicated. Returns `null`
 * when the kernel gave no edges. The BATCHED path uses `expandEdgeSegments` instead (a flat, non-indexed
 * buffer that packs into the shared edge buffer — see `PartBatch`).
 */
export function buildEdgeSegments(mesh: MeshBuffers): THREE.LineSegments | null {
  const { edgePositions, provenance } = mesh;
  if (edgePositions.length === 0 || provenance.edges.length === 0) return null;

  const indices: number[] = [];
  for (const edge of provenance.edges) {
    for (let i = 0; i < edge.count - 1; i++) {
      indices.push(edge.start + i, edge.start + i + 1);
    }
  }
  if (indices.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
  geometry.setIndex(indices);
  return new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: EDGE_COLOR }));
}

/**
 * A part's edges → a FLAT, NON-INDEXED array of segment-endpoint positions (the BATCHED path, P4 step
 * 9(b)). Every segment contributes its two endpoints' xyz directly, so the returned array packs
 * straight into the shared edge buffer at any offset (no per-part index remapping) and `LineSegments`
 * draws it as consecutive pairs. Vertices duplicate at shared endpoints — cheap for edges, and the price
 * of a single position-only buffer with trivial sub-range allocation. Returns `null` when there are no
 * edges. The returned length is always even (`segments × 2 × 3`), preserving segment-pair alignment.
 */
export function expandEdgeSegments(mesh: MeshBuffers): Float32Array | null {
  const { edgePositions, provenance } = mesh;
  if (edgePositions.length === 0 || provenance.edges.length === 0) return null;

  let segments = 0;
  for (const edge of provenance.edges) segments += Math.max(0, edge.count - 1);
  if (segments === 0) return null;

  const out = new Float32Array(segments * 2 * 3);
  let w = 0;
  for (const edge of provenance.edges) {
    for (let i = 0; i < edge.count - 1; i++) {
      const a = (edge.start + i) * 3;
      const b = (edge.start + i + 1) * 3;
      out[w++] = edgePositions[a]!;
      out[w++] = edgePositions[a + 1]!;
      out[w++] = edgePositions[a + 2]!;
      out[w++] = edgePositions[b]!;
      out[w++] = edgePositions[b + 1]!;
      out[w++] = edgePositions[b + 2]!;
    }
  }
  return out;
}
