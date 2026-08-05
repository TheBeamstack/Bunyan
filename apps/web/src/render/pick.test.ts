/**
 * SUB-SHAPE PICKING — the pure resolution half (P4 step 4), tested without a GL context.
 *
 * The exit criterion is "a picked triangle maps to a valid `SubShapeRef` via the provenance map." The
 * raycast that produces the triangle index needs a renderer and is proven live in the browser (Entry 26's
 * method); THIS is the identity lookup that turns that index into a stable token — the thing that means a
 * human never hand-types a derivation path to place a window. It reads the provenance the viewport RETAINS
 * in step 2c, which the foundation pass dropped.
 */

import { describe, expect, it } from 'vitest';
import {
  encodeSubShapeRef,
  type Bounds,
  type MeshBuffers,
  type MeshProvenance,
  type SubShapeRef,
  type Vec3,
} from '@bunyan/protocol';

import { resolveFacePick, localFaceIndex, type PickablePart } from './pick';

/** Where the ray met the face. Carried through untouched — this half does no geometry (Entry 80). */
const HIT: Vec3 = [1500, 0, 1200];

const yMin: SubShapeRef = {
  nodeId: 'wall-1.structure',
  kind: 'face',
  role: 'finish.interior',
  occurrence: 0,
};
const yMax: SubShapeRef = {
  nodeId: 'wall-1.structure',
  kind: 'face',
  role: 'finish.exterior',
  occurrence: 0,
};

const bounds: Bounds = { min: [0, 0, 0], max: [3000, 295, 2500] };

/** A part with two faces and four triangles: triangles 0–1 belong to `yMin`, triangles 2–3 to `yMax`. */
function twoFacePart(refs: readonly string[]): PickablePart {
  const provenance: MeshProvenance = {
    refs,
    triangleToRef: new Uint32Array([0, 0, 1, 1]),
    edges: [],
  };
  const buffers: MeshBuffers = {
    positions: new Float32Array(),
    normals: new Float32Array(),
    indices: new Uint32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    edgePositions: new Float32Array(),
    provenance,
    bounds,
  };
  return { elementId: 'wall-1', nodeId: 'wall-1.structure', partName: 'structure', buffers };
}

describe('sub-shape picking (step 4) — a triangle resolves to a face SubShapeRef via provenance', () => {
  const part = twoFacePart([encodeSubShapeRef(yMin), encodeSubShapeRef(yMax)]);

  it('maps a triangle to the face it belongs to, decoded', () => {
    expect(resolveFacePick(part, 0, HIT)?.faceRef).toEqual(yMin);
    expect(resolveFacePick(part, 1, HIT)?.faceRef).toEqual(yMin);
    expect(resolveFacePick(part, 2, HIT)?.faceRef).toEqual(yMax);
    expect(resolveFacePick(part, 3, HIT)?.faceRef).toEqual(yMax);
  });

  it('carries the element + part identity through, so the click can select and read out', () => {
    const hit = resolveFacePick(part, 2, HIT);
    expect(hit).not.toBeNull();
    expect(hit?.elementId).toBe('wall-1');
    expect(hit?.nodeId).toBe('wall-1.structure');
    expect(hit?.partName).toBe('structure');
  });

  it('⚠ carries the ray HIT POINT through unchanged — this half does no geometry (Entry 80)', () => {
    // The point is what lets a click POSITION a hosted element; the ref is what lets it host one. This
    // function computes neither: it is an identity lookup, and the point is passed through verbatim so
    // that stays true. Anything that started deriving a point here would be measuring off a chord.
    expect(resolveFacePick(part, 0, HIT)?.point).toBe(HIT);
    expect(resolveFacePick(part, 2, [0, 0, 0])?.point).toEqual([0, 0, 0]);
  });

  it('returns null for a triangle index the provenance does not cover (a stale/out-of-range hit)', () => {
    expect(resolveFacePick(part, 99, HIT)).toBeNull();
  });

  it('returns null when the token does not decode — an untrusted map never yields a wrong ref', () => {
    // `#` is the occurrence separator; a token with a non-integer occurrence must fail to decode.
    const corrupt = twoFacePart([
      'wall-1.structure/face/finish.interior#notanumber',
      encodeSubShapeRef(yMax),
    ]);
    expect(resolveFacePick(corrupt, 0, HIT)).toBeNull();
    // …while the sound face beside it still resolves.
    expect(resolveFacePick(corrupt, 2, HIT)?.faceRef).toEqual(yMax);
  });
});

describe('batch pick remap (step 9(b), design §5) — a global face index becomes the part-local one', () => {
  const part = twoFacePart([encodeSubShapeRef(yMin), encodeSubShapeRef(yMax)]);

  it('a part at the front of the merged buffer (range start 0) is the identity map', () => {
    expect(localFaceIndex(0, 0)).toBe(0);
    expect(localFaceIndex(3, 0)).toBe(3);
  });

  it('subtracts the geometry range start (in index units ÷ 3) to recover the local triangle', () => {
    // The part sits after 10 earlier triangles ⇒ its geometry range starts at index 30 (30 index elements
    // = 10 triangles). Its first triangle is GLOBAL face 10, so global face 12 is this part's LOCAL
    // triangle 2 — `yMax`.
    const rangeStart = 30;
    const globalHit = 12;
    const local = localFaceIndex(globalHit, rangeStart);
    expect(local).toBe(2);
    expect(resolveFacePick(part, local, HIT)?.faceRef).toEqual(yMax);
  });

  it('a garbage range yields a non-local index that resolveFacePick rejects (no WRONG ref)', () => {
    // A range start past the hit gives a negative local index — out of range ⇒ null, never a wrong face.
    expect(resolveFacePick(part, localFaceIndex(1, 30), HIT)).toBeNull();
  });
});
