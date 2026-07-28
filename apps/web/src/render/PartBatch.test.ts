/**
 * THE PART BATCH (P4 step 9(b)) — the lifecycle logic, tested without a GL context.
 *
 * `BatchedMesh`'s add/remove/geometry-range operations are pure JS array bookkeeping (its textures are
 * plain data, uploaded to the GPU only at render time), so the batch's install / update / remove / pick-
 * remap can be asserted headlessly. The batched RENDER (draw calls, frame time) is a browser measurement
 * (the scale harness); THIS pins the identity + lifecycle invariants that picking and the incremental
 * redraw rest on.
 *
 * ⚠ THE REGRESSION IT LOCKS IN. `remove` deletes a part's face GEOMETRY, and three's `deleteGeometry`
 * ALSO cascades to delete the instance referencing it. An earlier cut deleted the instance FIRST and then
 * the geometry, so the cascade re-deleted an already-dead instance and threw `Invalid instanceId` — found
 * by removing 16,000 parts at once in the scale harness (a shape the small fixtures never cut). This test
 * removes several parts and asserts no throw; revert the fix (add the `deleteInstance` back) and it fails.
 */

import { describe, expect, it } from 'vitest';
import {
  encodeSubShapeRef,
  type MeshBuffers,
  type MeshProvenance,
  type SubShapeRef,
} from '@bunyan/protocol';

import { PartBatch } from './PartBatch';

const faceRef: SubShapeRef = { nodeId: 'x', kind: 'face', role: 'y-min', occurrence: 0 };

/** A minimal but valid part: a quad (two triangles, one face) plus one edge segment. */
function quadPart(nodeId: string): MeshBuffers {
  const provenance: MeshProvenance = {
    refs: [encodeSubShapeRef({ ...faceRef, nodeId })],
    triangleToRef: new Uint32Array([0, 0]), // both triangles → face 0
    edges: [{ start: 0, count: 2, refIndex: 0 }], // one segment (2 verts) in edgePositions
  };
  return {
    positions: new Float32Array([0, 0, 0, 100, 0, 0, 100, 100, 0, 0, 100, 0]),
    normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    edgePositions: new Float32Array([0, 0, 0, 100, 0, 0]),
    provenance,
    bounds: { min: [0, 0, 0], max: [100, 100, 0] },
  };
}

describe('PartBatch — install, remove, update, and the pick remap', () => {
  it('installs parts and tracks the count', () => {
    const batch = new PartBatch();
    batch.set('a', quadPart('a'), 0x9aa0a6);
    batch.set('b', quadPart('b'), 0xf4d35e);
    batch.set('c', quadPart('c'), 0x7fb069);
    expect(batch.partCount).toBe(3);
    expect(batch.has('b')).toBe(true);
    batch.dispose();
  });

  it('REMOVES parts without throwing — deleteGeometry cascades the instance, no double-delete', () => {
    const batch = new PartBatch();
    for (let i = 0; i < 5; i++) batch.set(`p${String(i)}`, quadPart(`p${String(i)}`), 0xffffff);
    expect(batch.partCount).toBe(5);
    // Remove all, newest-first (the scale-harness teardown order that surfaced the bug).
    expect(() => {
      for (let i = 4; i >= 0; i--) batch.remove(`p${String(i)}`);
    }).not.toThrow();
    expect(batch.partCount).toBe(0);
    batch.dispose();
  });

  it('reuses freed slots on a later install after a remove', () => {
    const batch = new PartBatch();
    batch.set('a', quadPart('a'), 0xffffff);
    batch.remove('a');
    expect(batch.partCount).toBe(0);
    // A fresh install after a full remove must work (freed instance/geometry ids reused).
    expect(() => {
      batch.set('d', quadPart('d'), 0xffffff);
    }).not.toThrow();
    expect(batch.partCount).toBe(1);
    batch.dispose();
  });

  it('updates a part in place (same-size re-tessellation) without changing the count', () => {
    const batch = new PartBatch();
    batch.set('a', quadPart('a'), 0xffffff);
    expect(() => {
      batch.set('a', quadPart('a'), 0x123456); // rebuild, fits in place
    }).not.toThrow();
    expect(batch.partCount).toBe(1);
    batch.dispose();
  });

  it('resolves a raycast hit back to the part and its LOCAL face index', () => {
    const batch = new PartBatch();
    batch.set('a', quadPart('a'), 0xffffff);
    batch.set('b', quadPart('b'), 0xffffff);
    // Instance 1 is part 'b'; its geometry range starts at index 6 (part 'a' has 6 indices before it),
    // so a global face index of 2 (6/3 = 2 triangles precede it, its triangle 0) maps to local 0.
    const hit = batch.resolveHit(1, 2);
    expect(hit).not.toBeNull();
    expect(hit?.nodeId).toBe('b');
    expect(hit?.localFaceIndex).toBe(0);
    batch.dispose();
  });
});
