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
} from '@bunyan/protocol';

import { resolveFacePick, type PickablePart } from './pick';

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
    expect(resolveFacePick(part, 0)?.faceRef).toEqual(yMin);
    expect(resolveFacePick(part, 1)?.faceRef).toEqual(yMin);
    expect(resolveFacePick(part, 2)?.faceRef).toEqual(yMax);
    expect(resolveFacePick(part, 3)?.faceRef).toEqual(yMax);
  });

  it('carries the element + part identity through, so the click can select and read out', () => {
    const hit = resolveFacePick(part, 2);
    expect(hit).not.toBeNull();
    expect(hit?.elementId).toBe('wall-1');
    expect(hit?.nodeId).toBe('wall-1.structure');
    expect(hit?.partName).toBe('structure');
  });

  it('returns null for a triangle index the provenance does not cover (a stale/out-of-range hit)', () => {
    expect(resolveFacePick(part, 99)).toBeNull();
  });

  it('returns null when the token does not decode — an untrusted map never yields a wrong ref', () => {
    // `#` is the occurrence separator; a token with a non-integer occurrence must fail to decode.
    const corrupt = twoFacePart([
      'wall-1.structure/face/finish.interior#notanumber',
      encodeSubShapeRef(yMax),
    ]);
    expect(resolveFacePick(corrupt, 0)).toBeNull();
    // …while the sound face beside it still resolves.
    expect(resolveFacePick(corrupt, 2)?.faceRef).toEqual(yMax);
  });
});
