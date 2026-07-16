/**
 * The mock kernel (P2 step 0 / spec §12 — the critical-path mitigation).
 *
 * It implements the real protocol against canned geometry so the browser shell (P4) can be built
 * in parallel with the OCCT kernel instead of idling on the serial P1→P2→P3 path. It is a FAKE:
 * `kernel.name === 'mock'`, and it will refuse anything it cannot honestly answer. What it is not
 * is a stub — the box it returns is exact and its provenance map is complete, so picking, property
 * panels and undo can all be developed and tested against it.
 */

import { KernelHost, ShapeRegistry } from '@bunyan/kernel-core';
import type { KernelImplementation, OpHandlers } from '@bunyan/kernel-core';
import { KernelFailureError, capabilitiesOf, kernelFailure } from '@bunyan/protocol';
import type { KernelInfo } from '@bunyan/protocol';

import {
  boxDistance,
  boxEdgeRefs,
  boxFaceRefs,
  boxFaceFrame,
  boxBounds,
  boxMeasure,
  boxSubShapeBounds,
  classifyAgainstBox,
  tessellateBox,
} from './box.js';
import type { BoxParams } from './box.js';

/**
 * Everything about this kernel that is NOT derived from its handlers.
 *
 * ⚠ `capabilities` is deliberately absent: it is GENERATED from the handler map (`capabilitiesOf`), so
 * the mock's honest refusals below are stated ONCE — by not implementing the op — instead of twice.
 * The comment that follows explains WHY each op is missing; the list of which ones is the code itself.
 */
export const MOCK_KERNEL_META = {
  name: 'mock',
  kernelVersion: '0.0.0',
  // A distinct build id matters: it must invalidate any BREP cache written by a real kernel (spec §6).
  buildId: 'mock-kernel-v0',
  threading: 'single',
  // ⚠ WHAT IS **NOT** HERE IS THE POINT: no `makeCylinder`, no `extrude`, no `boolean`, no `fillet`,
  // no `chamfer`, no `transform`.
  // A mock cannot fake a boolean — it would have to BE a geometry kernel — and pretending otherwise
  // would hand the browser a solid whose sub-shape identities are invented. Those ops return UNKNOWN_OP
  // here, and `capabilities` says so up front, so a caller can find out by asking rather than by being
  // lied to.
  //
  // ⚠ `extrude` is absent by the same rule, and it is the closest call of them all — a prism over a
  // POLYGON has a perfectly good closed form (volume = shoelace area x height). But the profile also
  // admits ARCS, and the moment one appears the closed form is gone; and a prism over a non-axis-aligned
  // polygon breaks `distance` exactly as a rotated box does (below). Supporting the easy half would make
  // this an op that is exact for some inputs and wrong for others — which is the one thing a mock must
  // never be.
  //
  // ⚠ `transform` is absent for a subtler reason worth stating, because it looks cheap and is not. A
  // rigid motion of a box is exactly representable — but this mock's whole value is that its answers
  // are EXACT, and one of its ops stops being exact the moment a box is rotated: `distance` is
  // closed-form for two AXIS-ALIGNED boxes and has no closed form for two arbitrarily rotated ones
  // (it becomes a convex-separation problem). A mock that supported `transform` would therefore have
  // to either lie about `distance` or support it only sometimes — and a partially-honest mock is worse
  // than one that refuses, because the lie is discovered downstream, in Amer's code, weeks later.
  // The real kernel does `transform`, and it is one import away.
  //
  // The GEOMETRIC QUERIES (D23) *are* here, because for an axis-aligned box they are closed-form and
  // therefore exact — so the agent/query code path can be built against the mock, with no 14 MB wasm.
  // ⚠ `revolve` is absent for the same reason as `extrude`, and more so: a surface of revolution over an
  // arc has no closed form at all.
} as const satisfies Omit<KernelInfo, 'capabilities'>;

function requireFinitePositive(name: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new KernelFailureError(
      kernelFailure(
        'INVALID_PAYLOAD',
        `"${name}" must be a positive finite number, got ${String(value)}`,
      ),
    );
  }
  return value;
}

export function createMockKernel(): KernelImplementation {
  const shapes = new ShapeRegistry<BoxParams>({ prefix: 'mock' });

  const liveShape = (handle: string, op: string): BoxParams => {
    const params = shapes.get(handle);
    if (params === undefined) {
      throw new KernelFailureError(
        kernelFailure('HANDLE_NOT_FOUND', `No live shape for handle "${handle}"`, { op }),
      );
    }
    return params;
  };

  const handlers: OpHandlers = {
    echo: (payload) => payload,

    makeBox: (payload) => {
      const dx = requireFinitePositive('dx', payload.dx);
      const dy = requireFinitePositive('dy', payload.dy);
      const dz = requireFinitePositive('dz', payload.dz);
      if (typeof payload.nodeId !== 'string' || payload.nodeId === '') {
        throw new KernelFailureError(
          kernelFailure(
            'INVALID_PAYLOAD',
            'makeBox requires a non-empty nodeId to own the identities',
          ),
        );
      }

      const params: BoxParams = {
        nodeId: payload.nodeId,
        dx,
        dy,
        dz,
        ...(payload.at ? { at: payload.at } : {}),
      };
      const handle = shapes.add(params);
      return {
        handle,
        bounds: boxBounds(params),
        refs: [...boxFaceRefs(params.nodeId), ...boxEdgeRefs(params.nodeId)],
      };
    },

    measure: (payload) => boxMeasure(liveShape(payload.handle, 'measure')),

    // ---- THE GEOMETRIC QUERIES (D23) — closed-form, and therefore exact, for an axis-aligned box ---

    bounds: (payload) => {
      const params = liveShape(payload.handle, 'bounds');
      if (payload.ref === undefined) return { bounds: boxBounds(params) };
      const bounds = boxSubShapeBounds(params, payload.ref);
      if (bounds === undefined) {
        throw new KernelFailureError(
          kernelFailure(
            'UNRESOLVED_SUBSHAPE_REF',
            `"${payload.ref}" is not a named sub-shape of this shape`,
            { op: 'bounds' },
          ),
        );
      }
      return { bounds };
    },

    distance: (payload) => {
      const a = liveShape(payload.a, 'distance');
      const b = liveShape(payload.b, 'distance');
      return boxDistance(a, b);
    },

    classifyPoint: (payload) => ({
      state: classifyAgainstBox(
        liveShape(payload.handle, 'classifyPoint'),
        payload.point,
        payload.tolerance ?? 1e-7,
      ),
    }),

    faceFrame: (payload) => {
      const params = liveShape(payload.handle, 'faceFrame');
      const frame = boxFaceFrame(params, payload.ref);
      if (frame === undefined) {
        throw new KernelFailureError(
          kernelFailure('UNRESOLVED_SUBSHAPE_REF', `"${payload.ref}" is not a face of this shape`, {
            op: 'faceFrame',
          }),
        );
      }
      return frame;
    },

    tessellate: (payload) => tessellateBox(liveShape(payload.handle, 'tessellate')),

    releaseShape: (payload) => ({
      released: shapes.release(payload.handle),
      liveHandles: shapes.liveCount,
    }),

    // Proves the typed-failure path end to end without needing a real OCCT failure (P1 step 4).
    demoFailure: (payload) => {
      throw new KernelFailureError(
        kernelFailure(payload.code, payload.message ?? `Simulated ${payload.code}`, {
          op: 'demoFailure',
        }),
      );
    },
  };

  return {
    // Generated, not maintained (D21): the mock advertises exactly what it implements — no more.
    info: { ...MOCK_KERNEL_META, capabilities: capabilitiesOf(handlers) },
    handlers,
    dispose: () => {
      shapes.releaseAll();
    },
  };
}

export function createMockKernelHost(): KernelHost {
  return new KernelHost(createMockKernel());
}
