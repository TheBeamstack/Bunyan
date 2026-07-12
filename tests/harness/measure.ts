/**
 * The golden/invariant harness (spec §9, decision D9; imp-plan P1 step 8).
 *
 * SCOPE (spec §9.0, owner ruling): **we trust OCCT; we verify our own code.** Nothing here is
 * auditing the kernel. These checks catch OUR errors — a mis-wired parameter, a wrong op or op
 * order, a broken WASM build, a regression.
 *
 * It takes a kernel over the protocol — so it runs against the MOCK and against the real OCCT WASM
 * kernel with no change to the checks themselves. That is the point of building it before the
 * geometry: the gate existed first, so no `buildGeometry` could ever land ungated. It has now been
 * paid back — the OCCT kernel was dropped in and these assertions started certifying real geometry
 * without a line of test change.
 *
 * The checks:
 *   PRIMARY   reference-build oracle — committed values from a native OCCT build (`cadquery-ocp`),
 *             compared against the kernel's own `measure` op (exact, from OCCT's BRepGProp).
 *             Same kernel, different binding/build/code path ⇒ a disagreement is OUR bug.
 *   FIDELITY  `meshMeasures` (below) — the same quantities re-derived from the TRIANGLES. It is a
 *             second, independent view: a mesh that is mis-wound, not watertight, or missing a face
 *             still yields a perfect `measure` result, because that reads the B-Rep and never looks
 *             at the mesh. This is the only check that can see the mesh itself is wrong.
 *   SANITY    closed-form values, where a formula exists. Guards our own measurement code (it has
 *             already caught a real one — see tools/oracle/README.md). Not required otherwise.
 *   DRIFT     regression snapshot — a structural hash of the identity map. Self-snapshotted;
 *             guards against drift and certifies nothing on its own.
 *
 * ⚠ SCOPE OF `meshMeasures`: it is derived from the TESSELLATION, so it is exact only for
 * PLANAR-faced solids (every MVP shape except the circular Column). A tessellated cylinder
 * under-reports its volume by the chord error — that is not a bug, it is what a mesh IS. So the
 * FIDELITY check applies to planar cases only; the `measure` op is the gate everywhere.
 */

import { createHash } from 'node:crypto';
import { compareSubShapeRefs, decodeSubShapeRef } from '@bunyan/protocol';
import type { Bounds, MeshBuffers } from '@bunyan/protocol';

export interface Measures {
  readonly volume: number;
  readonly area: number;
  readonly edgeLength: number;
  readonly counts: { readonly faces: number; readonly edges: number };
  readonly bounds: Bounds;
}

function vertex(positions: Float32Array, index: number): [number, number, number] {
  const o = index * 3;
  return [positions[o] ?? 0, positions[o + 1] ?? 0, positions[o + 2] ?? 0];
}

function cross(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): [number, number, number] {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function sub(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/** Signed volume by the divergence theorem: exact for a closed, planar-faced, outward-wound mesh. */
export function meshMeasures(mesh: MeshBuffers): Measures {
  let volume = 0;
  let area = 0;

  for (let t = 0; t < mesh.indices.length; t += 3) {
    const a = vertex(mesh.positions, mesh.indices[t] ?? 0);
    const b = vertex(mesh.positions, mesh.indices[t + 1] ?? 0);
    const c = vertex(mesh.positions, mesh.indices[t + 2] ?? 0);

    const n = cross(a, b);
    volume += (n[0] * c[0] + n[1] * c[1] + n[2] * c[2]) / 6;

    const e = cross(sub(b, a), sub(c, a));
    area += Math.hypot(e[0], e[1], e[2]) / 2;
  }

  let edgeLength = 0;
  for (const polyline of mesh.provenance.edges) {
    for (let i = polyline.start; i < polyline.start + polyline.count - 1; i++) {
      const p = vertex(mesh.edgePositions, i);
      const q = vertex(mesh.edgePositions, i + 1);
      edgeLength += Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
    }
  }

  const faceRefs = new Set<number>();
  for (const refIndex of mesh.provenance.triangleToRef) faceRefs.add(refIndex);

  return {
    volume: Math.abs(volume),
    area,
    edgeLength,
    counts: { faces: faceRefs.size, edges: mesh.provenance.edges.length },
    bounds: mesh.bounds,
  };
}

/**
 * The regression snapshot (drift only). A canonical, floating-point-free serialization of the
 * identity map, hashed. FP-free by construction so it is reproducible across machines (spec §6.5):
 * it hashes only structural `SubShapeRef` tokens and integer triangle counts, never a coordinate.
 *
 * P2 must extend this to the true adjacency graph (which edge bounds which face) once OCCT topology
 * is available; today it snapshots the identity set and its triangle distribution.
 */
export function structuralSnapshot(mesh: MeshBuffers): string {
  const perRefTriangles = new Map<string, number>();
  for (const refIndex of mesh.provenance.triangleToRef) {
    const token = mesh.provenance.refs[refIndex];
    if (token === undefined) continue;
    perRefTriangles.set(token, (perRefTriangles.get(token) ?? 0) + 1);
  }

  const faceLines = [...perRefTriangles.entries()]
    .map(([token, count]) => ({ ref: decodeSubShapeRef(token), token, count }))
    .filter(
      (entry): entry is { ref: NonNullable<typeof entry.ref>; token: string; count: number } =>
        entry.ref !== undefined,
    )
    .sort((l, r) => compareSubShapeRefs(l.ref, r.ref))
    .map((entry) => `F ${entry.token} ${entry.count}`);

  const edgeLines = mesh.provenance.edges
    .map((polyline) => mesh.provenance.refs[polyline.refIndex])
    .filter((token): token is string => token !== undefined)
    .map((token) => ({ ref: decodeSubShapeRef(token), token }))
    .filter(
      (entry): entry is { ref: NonNullable<typeof entry.ref>; token: string } =>
        entry.ref !== undefined,
    )
    .sort((l, r) => compareSubShapeRefs(l.ref, r.ref))
    .map((entry) => `E ${entry.token}`);

  const canonical = [...faceLines, ...edgeLines].join('\n');
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export interface ToleranceReport {
  readonly name: string;
  readonly expected: number;
  readonly actual: number;
  readonly relativeError: number;
  readonly ok: boolean;
}

export function checkClose(
  name: string,
  expected: number,
  actual: number,
  relativeTolerance: number,
): ToleranceReport {
  const scale = Math.max(Math.abs(expected), Math.abs(actual), 1);
  const relativeError = Math.abs(expected - actual) / scale;
  return { name, expected, actual, relativeError, ok: relativeError <= relativeTolerance };
}
