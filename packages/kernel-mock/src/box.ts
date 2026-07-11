/**
 * An analytically exact box, tessellated with a COMPLETE provenance map.
 *
 * This is a mock (no OCCT), but the geometry and the identities are real, not placeholders:
 *   - 6 faces, each named by its canonical slot (`x-min` … `z-max`);
 *   - 12 edges, each named by the *pair of faces that generate it* — a structural, ordering-free,
 *     floating-point-free name. Every edge of a box is the intersection of exactly two
 *     non-opposite faces, and there are exactly 12 such pairs, so the naming is a bijection.
 *
 * That last property is the point. The identity of an edge is derived from what produced it, not
 * from where it sits — which is the whole naming model (spec §4.5) in miniature. It lets the
 * viewport build real face/edge picking against the mock and have it keep working, unchanged,
 * when the OCCT kernel replaces it.
 */

import { encodeSubShapeRef } from '@bunyan/protocol';
import type { Bounds, MeshBuffers, EdgePolyline } from '@bunyan/protocol';

export interface BoxParams {
  readonly nodeId: string;
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
}

/** Canonical face slots, in a fixed order. The order IS the canonical re-sort for this primitive. */
export const BOX_FACE_ROLES = ['x-min', 'x-max', 'y-min', 'y-max', 'z-min', 'z-max'] as const;
export type BoxFaceRole = (typeof BOX_FACE_ROLES)[number];

/** Opposite faces never meet, so they generate no edge. */
const OPPOSITE: Record<BoxFaceRole, BoxFaceRole> = {
  'x-min': 'x-max',
  'x-max': 'x-min',
  'y-min': 'y-max',
  'y-max': 'y-min',
  'z-min': 'z-max',
  'z-max': 'z-min',
};

/** The 12 edges: every unordered pair of non-opposite faces, in a deterministic order. */
export function boxEdgeRoles(): string[] {
  const roles: string[] = [];
  for (let i = 0; i < BOX_FACE_ROLES.length; i++) {
    for (let j = i + 1; j < BOX_FACE_ROLES.length; j++) {
      const a = BOX_FACE_ROLES[i] as BoxFaceRole;
      const b = BOX_FACE_ROLES[j] as BoxFaceRole;
      if (OPPOSITE[a] === b) continue;
      roles.push(`${a}|${b}`);
    }
  }
  return roles;
}

export function boxFaceRefs(nodeId: string): string[] {
  return BOX_FACE_ROLES.map((role) =>
    encodeSubShapeRef({ nodeId, kind: 'face', role, occurrence: 0 }),
  );
}

export function boxEdgeRefs(nodeId: string): string[] {
  return boxEdgeRoles().map((role) =>
    encodeSubShapeRef({ nodeId, kind: 'edge', role, occurrence: 0 }),
  );
}

export function boxBounds(p: BoxParams): Bounds {
  return { min: [0, 0, 0], max: [p.dx, p.dy, p.dz] };
}

type Vec = readonly [number, number, number];

/** Each face as (base point, u axis, v axis) with u × v = outward normal. */
function faceFrames(dx: number, dy: number, dz: number): Record<BoxFaceRole, [Vec, Vec, Vec, Vec]> {
  // [base, u, v, normal]
  return {
    'x-min': [
      [0, 0, 0],
      [0, 0, dz],
      [0, dy, 0],
      [-1, 0, 0],
    ],
    'x-max': [
      [dx, 0, 0],
      [0, dy, 0],
      [0, 0, dz],
      [1, 0, 0],
    ],
    'y-min': [
      [0, 0, 0],
      [dx, 0, 0],
      [0, 0, dz],
      [0, -1, 0],
    ],
    'y-max': [
      [0, dy, 0],
      [0, 0, dz],
      [dx, 0, 0],
      [0, 1, 0],
    ],
    'z-min': [
      [0, 0, 0],
      [0, dy, 0],
      [dx, 0, 0],
      [0, 0, -1],
    ],
    'z-max': [
      [0, 0, dz],
      [dx, 0, 0],
      [0, dy, 0],
      [0, 0, 1],
    ],
  };
}

/** The 4 corners of the box that lie on a given face, used to place the edges. */
function cornerOn(role: BoxFaceRole, dx: number, dy: number, dz: number): (v: Vec) => boolean {
  switch (role) {
    case 'x-min':
      return (v) => v[0] === 0;
    case 'x-max':
      return (v) => v[0] === dx;
    case 'y-min':
      return (v) => v[1] === 0;
    case 'y-max':
      return (v) => v[1] === dy;
    case 'z-min':
      return (v) => v[2] === 0;
    case 'z-max':
      return (v) => v[2] === dz;
  }
}

export function tessellateBox(p: BoxParams): MeshBuffers {
  const { dx, dy, dz, nodeId } = p;

  const faceRefs = boxFaceRefs(nodeId);
  const edgeRefs = boxEdgeRefs(nodeId);
  // The refs table: faces first (indices 0..5), then edges (6..17).
  const refs = [...faceRefs, ...edgeRefs];

  const frames = faceFrames(dx, dy, dz);

  // 6 faces x 4 vertices, flat-shaded (each face owns its vertices so normals stay crisp).
  const positions = new Float32Array(6 * 4 * 3);
  const normals = new Float32Array(6 * 4 * 3);
  const indices = new Uint32Array(6 * 2 * 3);
  const triangleToRef = new Uint32Array(6 * 2);

  BOX_FACE_ROLES.forEach((role, f) => {
    const frame = frames[role];
    const [base, u, v, n] = frame;
    const corners: Vec[] = [
      base,
      [base[0] + u[0], base[1] + u[1], base[2] + u[2]],
      [base[0] + u[0] + v[0], base[1] + u[1] + v[1], base[2] + u[2] + v[2]],
      [base[0] + v[0], base[1] + v[1], base[2] + v[2]],
    ];

    corners.forEach((c, k) => {
      const o = (f * 4 + k) * 3;
      positions[o] = c[0];
      positions[o + 1] = c[1];
      positions[o + 2] = c[2];
      normals[o] = n[0];
      normals[o + 1] = n[1];
      normals[o + 2] = n[2];
    });

    const v0 = f * 4;
    const t = f * 6;
    indices[t] = v0;
    indices[t + 1] = v0 + 1;
    indices[t + 2] = v0 + 2;
    indices[t + 3] = v0;
    indices[t + 4] = v0 + 2;
    indices[t + 5] = v0 + 3;

    // Both triangles of this face carry the face's identity — this is the picking map.
    triangleToRef[f * 2] = f;
    triangleToRef[f * 2 + 1] = f;
  });

  // Edges: each is the segment shared by its two generating faces.
  const allCorners: Vec[] = [
    [0, 0, 0],
    [dx, 0, 0],
    [0, dy, 0],
    [dx, dy, 0],
    [0, 0, dz],
    [dx, 0, dz],
    [0, dy, dz],
    [dx, dy, dz],
  ];

  const edgeRoles = boxEdgeRoles();
  const edgePositions = new Float32Array(edgeRoles.length * 2 * 3);
  const edges: EdgePolyline[] = [];

  edgeRoles.forEach((role, e) => {
    const [ra, rb] = role.split('|') as [BoxFaceRole, BoxFaceRole];
    const onA = cornerOn(ra, dx, dy, dz);
    const onB = cornerOn(rb, dx, dy, dz);
    const shared = allCorners.filter((c) => onA(c) && onB(c));

    // A box edge is exactly the two corners shared by its two generating faces.
    const [s, t] = shared as [Vec, Vec];
    const o = e * 6;
    edgePositions[o] = s[0];
    edgePositions[o + 1] = s[1];
    edgePositions[o + 2] = s[2];
    edgePositions[o + 3] = t[0];
    edgePositions[o + 4] = t[1];
    edgePositions[o + 5] = t[2];

    edges.push({ refIndex: faceRefs.length + e, start: e * 2, count: 2 });
  });

  return {
    positions,
    normals,
    indices,
    edgePositions,
    provenance: { refs, triangleToRef, edges },
    bounds: boxBounds(p),
  };
}
