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

import { decodeSubShapeRef, encodeSubShapeRef } from '@bunyan/protocol';
import type {
  Bounds,
  DistanceResult,
  EdgePolyline,
  FaceFrameResult,
  MeasureResult,
  MeshBuffers,
} from '@bunyan/protocol';

export interface BoxParams {
  readonly nodeId: string;
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
  /**
   * The min corner. Defaults to the origin.
   *
   * ⚠ IT CHANGES NO NAME, AND THAT IS THE TEST. A face is `x-min` because the operation says so, not
   * because of where it sits — so moving this box emits byte-identical refs. If placement could rename
   * a face, every stored reference in a project would break the day someone nudged the site grid.
   */
  readonly at?: readonly [number, number, number];
}

/** The min corner, defaulted. */
function origin(p: BoxParams): readonly [number, number, number] {
  return p.at ?? [0, 0, 0];
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
  const [x, y, z] = origin(p);
  return { min: [x, y, z], max: [x + p.dx, y + p.dy, z + p.dz] };
}

/**
 * Closed-form properties. The real kernel answers this from OCCT's `BRepGProp`; a box is one of the
 * cases where the closed form is exact, so the two must agree to the last bit — which is exactly what
 * `golden-box.test.ts` asserts when it runs the same checks against both kernels.
 */
export function boxMeasure(p: BoxParams): MeasureResult {
  const { dx, dy, dz } = p;
  return {
    volume: dx * dy * dz,
    area: 2 * (dx * dy + dy * dz + dz * dx),
    edgeLength: 4 * (dx + dy + dz),
    counts: { solids: 1, faces: 6, edges: 12, vertices: 8 },
  };
}

/**
 * THE GEOMETRIC QUERIES (D23), in closed form.
 *
 * The mock cannot fake a boolean — but it CAN answer these exactly, because an axis-aligned box has a
 * closed form for every one of them. So the agent/query code path is buildable against the mock, and
 * the answers it gives are not approximations of the real kernel's: they are the same numbers.
 */

/** The tight bounds of ONE named sub-shape, derived from its ROLE — never from a coordinate search. */
export function boxSubShapeBounds(p: BoxParams, token: string): Bounds | undefined {
  const ref = decodeSubShapeRef(token);
  if (ref === undefined || ref.nodeId !== p.nodeId) return undefined;

  const { min, max } = boxBounds(p);
  const plane: Record<BoxFaceRole, [axis: number, value: number]> = {
    'x-min': [0, min[0]],
    'x-max': [0, max[0]],
    'y-min': [1, min[1]],
    'y-max': [1, max[1]],
    'z-min': [2, min[2]],
    'z-max': [2, max[2]],
  };

  // A face is one constraint (`x-min`); an edge is two (`x-min|y-min`). Collapse the box's bounds
  // along each constrained axis, and what is left IS the sub-shape's extent. Note the direction of
  // travel: the ROLE decides the geometry, never the other way round.
  const roles = ref.role.split('|');
  const lo: [number, number, number] = [...min];
  const hi: [number, number, number] = [...max];
  for (const role of roles) {
    const constraint = plane[role as BoxFaceRole];
    if (constraint === undefined) return undefined;
    const [axis, value] = constraint;
    lo[axis] = value;
    hi[axis] = value;
  }
  const expected = ref.kind === 'face' ? 1 : 2;
  return roles.length === expected ? { min: lo, max: hi } : undefined;
}

/**
 * The local frame of ONE named box face, from its ROLE — the closed form the real kernel evaluates off
 * the surface. An axis-aligned face has an exact frame: origin at the face centre, `normal` the outward
 * axis, `uAxis`/`vAxis` the two in-plane axes (right-handed). Same numbers the OCCT kernel returns.
 */
export function boxFaceFrame(p: BoxParams, token: string): FaceFrameResult | undefined {
  const ref = decodeSubShapeRef(token);
  if (ref === undefined || ref.nodeId !== p.nodeId || ref.kind !== 'face') return undefined;

  const { min, max } = boxBounds(p);
  const mid: [number, number, number] = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  const face: Record<BoxFaceRole, { axis: number; sign: number; coord: number }> = {
    'x-min': { axis: 0, sign: -1, coord: min[0] },
    'x-max': { axis: 0, sign: 1, coord: max[0] },
    'y-min': { axis: 1, sign: -1, coord: min[1] },
    'y-max': { axis: 1, sign: 1, coord: max[1] },
    'z-min': { axis: 2, sign: -1, coord: min[2] },
    'z-max': { axis: 2, sign: 1, coord: max[2] },
  };
  const f = face[ref.role as BoxFaceRole];
  if (f === undefined) return undefined;

  const origin: [number, number, number] = [...mid];
  origin[f.axis] = f.coord;
  const normal: [number, number, number] = [0, 0, 0];
  normal[f.axis] = f.sign;
  // The two in-plane axes, in ascending index order; `vAxis = normal × uAxis` keeps it right-handed.
  const inPlane = [0, 1, 2].filter((a) => a !== f.axis) as [number, number];
  const uAxis: [number, number, number] = [0, 0, 0];
  uAxis[inPlane[0]] = 1;
  const vAxis: [number, number, number] = [
    normal[1] * uAxis[2] - normal[2] * uAxis[1],
    normal[2] * uAxis[0] - normal[0] * uAxis[2],
    normal[0] * uAxis[1] - normal[1] * uAxis[0],
  ];
  return { origin, normal, uAxis, vAxis };
}

/** 0 when the boxes touch or overlap — which is what makes this the clash primitive as well. */
export function boxDistance(a: BoxParams, b: BoxParams): DistanceResult {
  const ba = boxBounds(a);
  const bb = boxBounds(b);

  const pointA: [number, number, number] = [0, 0, 0];
  const pointB: [number, number, number] = [0, 0, 0];
  let squared = 0;
  for (let axis = 0; axis < 3; axis++) {
    const aLo = ba.min[axis] ?? 0;
    const aHi = ba.max[axis] ?? 0;
    const bLo = bb.min[axis] ?? 0;
    const bHi = bb.max[axis] ?? 0;

    // Separated on this axis, and by how much. Zero on every axis ⇒ the boxes overlap ⇒ distance 0.
    const gap = Math.max(bLo - aHi, aLo - bHi, 0);
    squared += gap * gap;

    // The witness points: the closest coordinate on each box. Where they overlap, any shared value
    // will do, so take the middle of the overlap.
    if (bLo - aHi > 0) {
      pointA[axis] = aHi;
      pointB[axis] = bLo;
    } else if (aLo - bHi > 0) {
      pointA[axis] = aLo;
      pointB[axis] = bHi;
    } else {
      const shared = (Math.max(aLo, bLo) + Math.min(aHi, bHi)) / 2;
      pointA[axis] = shared;
      pointB[axis] = shared;
    }
  }
  return { distance: Math.sqrt(squared), pointA, pointB };
}

export function classifyAgainstBox(
  p: BoxParams,
  point: readonly [number, number, number],
  tolerance: number,
): 'inside' | 'outside' | 'on' {
  const { min, max } = boxBounds(p);
  let onBoundary = false;
  for (let axis = 0; axis < 3; axis++) {
    const v = point[axis] ?? 0;
    const lo = min[axis] ?? 0;
    const hi = max[axis] ?? 0;
    if (v < lo - tolerance || v > hi + tolerance) return 'outside';
    if (Math.abs(v - lo) <= tolerance || Math.abs(v - hi) <= tolerance) onBoundary = true;
  }
  return onBoundary ? 'on' : 'inside';
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

  // The frames above are built at the origin, so placement is the last step — a translation, applied
  // to the geometry and to nothing else. Note what is NOT re-done here: the refs. Moving a box does
  // not rename a single one of its faces.
  const [ox, oy, oz] = origin(p);
  if (ox !== 0 || oy !== 0 || oz !== 0) {
    for (const buffer of [positions, edgePositions]) {
      for (let i = 0; i < buffer.length; i += 3) {
        buffer[i] = (buffer[i] ?? 0) + ox;
        buffer[i + 1] = (buffer[i + 1] ?? 0) + oy;
        buffer[i + 2] = (buffer[i + 2] ?? 0) + oz;
      }
    }
  }

  return {
    positions,
    normals,
    indices,
    edgePositions,
    provenance: { refs, triangleToRef, edges },
    bounds: boxBounds(p),
  };
}
