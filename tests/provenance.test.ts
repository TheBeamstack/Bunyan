// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The tessellation provenance channel (spec §3, architecture §3).
 *
 * This is the INPUT side of persistent naming: without it, a user could never author a reference,
 * because a click in the viewport would have nothing to name. P4's sub-shape picking is built
 * entirely on these maps, which is why they are part of the frozen protocol rather than a rendering
 * detail.
 */

import { describe, expect, it } from 'vitest';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createMockKernelHost } from '@bunyan/kernel-mock';
import { decodeSubShapeRef, faceRefForTriangle, triangleCount } from '@bunyan/protocol';
import type { MeshBuffers } from '@bunyan/protocol';

async function tessellatedBox(nodeId = 'wall-1'): Promise<MeshBuffers> {
  const client = new KernelClient(new InProcessTransport(createMockKernelHost()));
  const shape = await client.request('makeBox', { nodeId, dx: 3000, dy: 200, dz: 2500 });
  const mesh = await client.request('tessellate', { handle: shape.handle, deflection: 0.1 });
  client.dispose();
  return mesh;
}

describe('provenance channel', () => {
  it('emits a complete mesh: 12 triangles, 12 edge polylines', async () => {
    const mesh = await tessellatedBox();

    expect(triangleCount(mesh)).toBe(12); // 6 faces x 2
    expect(mesh.provenance.edges).toHaveLength(12);
    expect(mesh.provenance.refs).toHaveLength(18); // 6 faces + 12 edges
  });

  it('maps EVERY triangle to a face identity — no unnamed geometry', async () => {
    const mesh = await tessellatedBox();

    expect(mesh.provenance.triangleToRef).toHaveLength(triangleCount(mesh));
    for (let t = 0; t < triangleCount(mesh); t++) {
      const ref = faceRefForTriangle(mesh, t, decodeSubShapeRef);
      expect(ref, `triangle ${t}`).toBeDefined();
      expect(ref!.kind).toBe('face');
      expect(ref!.nodeId).toBe('wall-1');
    }
  });

  it('resolves a picked triangle to the correct face — the click-to-SubShapeRef path', async () => {
    const mesh = await tessellatedBox();

    // Triangles 0 and 1 are the two halves of the first canonical face slot (`x-min`).
    const first = faceRefForTriangle(mesh, 0, decodeSubShapeRef);
    const second = faceRefForTriangle(mesh, 1, decodeSubShapeRef);

    expect(first).toEqual({ nodeId: 'wall-1', kind: 'face', role: 'x-min', occurrence: 0 });
    expect(second).toEqual(first);

    // ...and a triangle on a different face resolves to a DIFFERENT identity.
    const other = faceRefForTriangle(mesh, 10, decodeSubShapeRef);
    expect(other).not.toEqual(first);
  });

  it('names every edge by the pair of faces that generate it — structural, not positional', async () => {
    const mesh = await tessellatedBox();

    const edgeRefs = mesh.provenance.edges.map((polyline) => {
      const token = mesh.provenance.refs[polyline.refIndex];
      return decodeSubShapeRef(token!);
    });

    for (const ref of edgeRefs) {
      expect(ref).toBeDefined();
      expect(ref!.kind).toBe('edge');
      // e.g. `x-min|y-min` — the two faces whose intersection IS this edge.
      expect(ref!.role).toMatch(/^[xyz]-(min|max)\|[xyz]-(min|max)$/);
    }

    // All 12 identities are distinct: a box edge is uniquely determined by its two faces.
    expect(new Set(edgeRefs.map((r) => r!.role)).size).toBe(12);
  });

  it('every edge polyline points at real vertex data', async () => {
    const mesh = await tessellatedBox();

    for (const polyline of mesh.provenance.edges) {
      expect(polyline.count).toBe(2); // a box edge is a straight segment
      const lastFloat = (polyline.start + polyline.count) * 3;
      expect(lastFloat).toBeLessThanOrEqual(mesh.edgePositions.length);
    }
  });

  it('identity is owned by the node, so two objects never share a SubShapeRef', async () => {
    const wall = await tessellatedBox('wall-1');
    const column = await tessellatedBox('column-9');

    const wallRefs = new Set(wall.provenance.refs);
    const columnRefs = new Set(column.provenance.refs);

    for (const ref of columnRefs) {
      expect(wallRefs.has(ref), `${ref} must not collide across objects`).toBe(false);
    }
  });
});
