/**
 * Checks that only apply to the REAL kernel — the ones that would be vacuous against the mock.
 *
 * `golden-box.test.ts` gates the numbers. This file gates the things that are specific to running
 * OCCT inside WebAssembly: that the identities we hand out are honest, that the WASM heap does not
 * leak, and that an OCCT failure comes back as a typed `Fail` rather than an exception.
 *
 * These are ported from `tools/kernel-build/verify.mjs`, which judged the kernel at build time and
 * therefore only ever ran when someone remembered to run it. Here they run on every push.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import { decodeSubShapeRef, faceRefForTriangle, triangleCount } from '@bunyan/protocol';
import type { OcctKernel } from '@bunyan/kernel-occt';

const BOX = { nodeId: 'wall-1', dx: 3000, dy: 200, dz: 2500 } as const;

describe('OCCT WASM kernel', () => {
  let kernel: OcctKernel;
  let client: KernelClient;

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  });
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  it('identifies itself as real OCCT, single-threaded, with a build id that pins the cache', async () => {
    const { kernel: info } = await client.handshake();
    expect(info.name).toBe('occt');
    expect(info.kernelVersion).toBe('7.9.3');
    // Owner ruling 9 — v1.0.0 ships single-threaded so that persistent-naming bugs stay reproducible.
    expect(info.threading).toBe('single');
    expect(info.buildId).toBe('occt-7.9.3-emcc-6.0.2');
  });

  /**
   * ⚠ THE CHECK THAT ALREADY EARNED ITS PLACE.
   *
   * Face identities come from the OPERATION — we ask `BRepPrimAPI_MakeBox` which face is which, never
   * "which face is at x=0" (spec §4.5, D1). But OCCT's vocabulary is not ours, and the translation
   * table between them is a place to be wrong: OCCT's `LeftFace()` is the y-min face, and its
   * `FrontFace()` is x-max — neither of which is what the names suggest. The first version of this
   * kernel mapped four of the six faces to the wrong role.
   *
   * Nothing failed. The geometry was perfect; only the NAMES were lies. It would have surfaced much
   * later as a window that had moved to the wrong wall.
   *
   * So: measure where each named face actually is, and require the name to tell the truth. Checking a
   * label against geometry is NOT deriving identity from geometry — the derivation is unchanged. This
   * is the harness doing its stated job (spec §9.0): catching OUR bugs, not auditing OCCT's.
   */
  it('role labels are honest — a face named x-min really is the face at minimum x', async () => {
    const shape = await client.request('makeBox', BOX);
    const mesh = await client.request('tessellate', { handle: shape.handle, deflection: 0.1 });

    // The bounding box of the vertices each named face actually touches.
    const extent = new Map<string, { lo: number[]; hi: number[] }>();
    for (let t = 0; t < triangleCount(mesh); t++) {
      const ref = faceRefForTriangle(mesh, t, decodeSubShapeRef);
      expect(ref, `triangle ${t} has no face ref`).toBeDefined();
      const role = ref?.role ?? '';

      const box = extent.get(role) ?? {
        lo: [Infinity, Infinity, Infinity],
        hi: [-1e9, -1e9, -1e9],
      };
      for (let v = 0; v < 3; v++) {
        const vertex = mesh.indices[t * 3 + v] ?? 0;
        for (let axis = 0; axis < 3; axis++) {
          const value = mesh.positions[vertex * 3 + axis] ?? 0;
          box.lo[axis] = Math.min(box.lo[axis] ?? Infinity, value);
          box.hi[axis] = Math.max(box.hi[axis] ?? -Infinity, value);
        }
      }
      extent.set(role, box);
    }

    // Each face must be planar at the extreme its own name claims.
    const expected: Record<string, [number, number]> = {
      'x-min': [0, 0],
      'x-max': [0, BOX.dx],
      'y-min': [1, 0],
      'y-max': [1, BOX.dy],
      'z-min': [2, 0],
      'z-max': [2, BOX.dz],
    };

    expect([...extent.keys()].sort()).toEqual(Object.keys(expected).sort());
    for (const [role, [axis, plane]] of Object.entries(expected)) {
      const box = extent.get(role);
      expect(box, role).toBeDefined();
      expect(box?.lo[axis], `${role} should lie in the plane ${'xyz'[axis]}=${plane}`).toBe(plane);
      expect(box?.hi[axis], `${role} should lie in the plane ${'xyz'[axis]}=${plane}`).toBe(plane);
    }
  });

  it('every triangle carries a face identity, and every edge a polyline', async () => {
    const shape = await client.request('makeBox', BOX);
    const mesh = await client.request('tessellate', { handle: shape.handle, deflection: 0.1 });

    // Provenance is what makes picking authorable: no triangle may be anonymous.
    expect(mesh.provenance.triangleToRef.length).toBe(triangleCount(mesh));
    expect(triangleCount(mesh)).toBeGreaterThan(0);

    // 6 faces + 12 edges, each named exactly once.
    expect(mesh.provenance.refs.length).toBe(18);
    expect(new Set(mesh.provenance.refs).size).toBe(18);
    expect(mesh.provenance.edges.length).toBe(12);

    // Every edge polyline points at an EDGE ref (not a face), and its vertices exist.
    for (const polyline of mesh.provenance.edges) {
      const token = mesh.provenance.refs[polyline.refIndex];
      expect(token).toBeDefined();
      expect(decodeSubShapeRef(token ?? '')?.kind).toBe('edge');
      expect(polyline.count).toBeGreaterThanOrEqual(2);
      expect((polyline.start + polyline.count) * 3).toBeLessThanOrEqual(mesh.edgePositions.length);
    }
  });

  it('releasing a handle actually frees the OCCT solid on the WASM heap', async () => {
    // OCCT shapes are NOT garbage-collected — they live on the Emscripten heap until explicitly
    // deleted, so a long editing session leaks until the tab dies (spec §6.2). The registry's own
    // count could agree with itself while freeing nothing; `wasmLiveHandles()` is the independent
    // witness from the other side of the boundary.
    const before = kernel.wasmLiveHandles();

    const a = await client.request('makeBox', BOX);
    const b = await client.request('makeBox', { ...BOX, nodeId: 'wall-2' });
    expect(kernel.wasmLiveHandles()).toBe(before + 2);

    const released = await client.request('releaseShape', { handle: a.handle });
    expect(released.released).toBe(true);
    expect(kernel.wasmLiveHandles()).toBe(before + 1);

    await client.request('releaseShape', { handle: b.handle });
    expect(kernel.wasmLiveHandles()).toBe(before);
  });

  it('a released handle is gone — using it fails, and does not crash the kernel', async () => {
    const shape = await client.request('makeBox', BOX);
    await client.request('releaseShape', { handle: shape.handle });

    await expect(
      client.request('tessellate', { handle: shape.handle, deflection: 0.1 }),
    ).rejects.toMatchObject({ failure: { code: 'HANDLE_NOT_FOUND' } });

    // Still alive afterwards: a failed op leaves the kernel usable (spec §6.4).
    const next = await client.request('makeBox', BOX);
    expect(next.handle).toBeTruthy();
    await client.request('releaseShape', { handle: next.handle });
  });

  it('invalid geometry is a typed failure, never a throw across the boundary', async () => {
    // OCCT/Emscripten surfaces a Standard_Failure as a bare integer, not an Error — a naive
    // `catch (e: Error)` would drop it on the floor. D10 says every failure arrives as a typed Fail.
    await expect(client.request('makeBox', { ...BOX, dx: -1 })).rejects.toMatchObject({
      failure: { code: 'INVALID_PAYLOAD' },
    });

    await expect(client.request('makeBox', { ...BOX, dz: 0 })).rejects.toMatchObject({
      failure: { code: 'INVALID_PAYLOAD' },
    });

    // And the kernel is still healthy.
    const { kernel: info } = await client.handshake();
    expect(info.name).toBe('occt');
  });

  it('measure is exact, not read off the triangles', async () => {
    // A cylinder is the case that forces this op to exist; a box is the case where we can PROVE the
    // op is wired to BRepGProp rather than to the mesh, because the closed form is known exactly.
    const shape = await client.request('makeBox', BOX);
    const m = await client.request('measure', { handle: shape.handle });

    expect(m.volume).toBe(BOX.dx * BOX.dy * BOX.dz);
    expect(m.counts).toEqual({ solids: 1, faces: 6, edges: 12, vertices: 8 });

    // The bug the closed-form tier caught at seed time: BRepGProp::LinearProperties on a SOLID counts
    // every edge once per adjoining face, reporting 45,600 mm for a box whose edges total 22,800 mm.
    // Our kernel sums UNIQUE edges. This asserts it never regresses to the double-counting version.
    expect(m.edgeLength).toBe(4 * (BOX.dx + BOX.dy + BOX.dz));
    expect(m.edgeLength).not.toBe(45_600);
  });
});
