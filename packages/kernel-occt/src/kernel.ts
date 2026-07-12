/**
 * The REAL kernel: upstream OCCT 7.9.3, compiled to WebAssembly, behind the same
 * `KernelImplementation` interface the mock implements.
 *
 * This file is deliberately thin, and that is the whole payoff of the transport-agnostic design
 * (architecture §2): `KernelHost` already supplies dispatch, payload routing and the never-throws
 * failure contract, so all that is left here is
 *
 *   1. translating our op payloads into the C++ op calls, and
 *   2. turning the kernel's structural report into Bunyan IDENTITIES (`./naming.ts`).
 *
 * (2) is the part that matters, and it is the part that decides whether a window stays on its wall.
 * The C++ side answers "which sub-shape is this, structurally?" — it knows about faces, edges and
 * where they came from, and nothing else. `naming.ts` answers "whose is it?". Geometry never enters
 * the identity path (spec §4.5, D1/D18).
 *
 * Because the mock names a box's sub-shapes the same way, the two kernels emit BYTE-IDENTICAL refs
 * for a box. Swapping the mock for this one changes the Worker URL and nothing else.
 */

import { KernelHost, ShapeRegistry } from '@bunyan/kernel-core';
import type { KernelImplementation, OpHandlers } from '@bunyan/kernel-core';
import { KernelFailureError, decodeSubShapeRef, kernelFailure } from '@bunyan/protocol';
import type {
  Bounds,
  EdgePolyline,
  KernelFailureCode,
  KernelInfo,
  MeshBuffers,
} from '@bunyan/protocol';

import { UnnameableSubShape, composeRefs, drainNaming } from './naming.js';
import type { OperandRefs } from './naming.js';

import initBunyanKernel from '../wasm/bunyan-kernel.js';
import type { OcctBounds, OcctModule } from '../wasm/bunyan-kernel.js';

/**
 * The kernel build id — OCCT version + emscripten version.
 *
 * It is stamped into every saved `.bimproj` and invalidates the cached B-Rep when it changes
 * (spec §6). Bump it whenever `tools/kernel-build` produces a different binary, and re-seed the
 * goldens if OCCT itself moved.
 */
export const OCCT_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';

export const OCCT_KERNEL_INFO: KernelInfo = {
  name: 'occt',
  kernelVersion: '7.9.3',
  buildId: OCCT_BUILD_ID,
  // Owner ruling 9: v1.0.0 ships single-threaded. Multi-threaded OCCT orders boolean output
  // non-deterministically, which would make persistent-naming bugs (the #1 risk) far harder to
  // reproduce. Correctness on one core first; MT lands in v1.0.x.
  threading: 'single',
  capabilities: [
    'makeBox',
    'makeCylinder',
    'boolean',
    'fillet',
    'measure',
    'bounds',
    'distance',
    'classifyPoint',
    'tessellate',
  ],
};

/** What we track per live shape. The WASM side owns the geometry; this owns the identities. */
interface OcctShape {
  readonly id: number;
  readonly nodeId: string;
  /** Faces first, then edges — so a face's canonical index IS its index into `refs`. */
  readonly faceRefs: readonly string[];
  readonly edgeRefs: readonly string[];
  readonly refs: readonly string[];
}

const operandRefs = (shape: OcctShape): OperandRefs => ({
  faces: shape.faceRefs,
  edges: shape.edgeRefs,
});

/**
 * The kernel reports failures by returning a sentinel and setting `lastError()` — it never throws
 * across the boundary (spec §6.4, D10; Emscripten would surface an OCCT `Standard_Failure` as a bare
 * integer, which no `catch (e: Error)` would catch). The C++ prefixes the message with the protocol's
 * own failure code, so this is a lookup, not a guess.
 */
function failFromKernel(wasm: OcctModule, op: string): KernelFailureError {
  const message = wasm.lastError();
  const codes: readonly KernelFailureCode[] = [
    'INVALID_PAYLOAD',
    'HANDLE_NOT_FOUND',
    'UNRESOLVED_SUBSHAPE_REF',
    'EMPTY_BOOLEAN_RESULT',
    'FILLET_RADIUS_TOO_LARGE',
    'OCCT_STANDARD_FAILURE',
  ];
  const code = codes.find((c) => message.startsWith(c)) ?? 'INTERNAL';
  return new KernelFailureError(
    kernelFailure(code, message === '' ? `Kernel op "${op}" failed without a message` : message, {
      op,
    }),
  );
}

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

function requireNodeId(nodeId: unknown): string {
  if (typeof nodeId !== 'string' || nodeId === '') {
    throw new KernelFailureError(
      kernelFailure('INVALID_PAYLOAD', 'every geometry op needs a nodeId to own its identities'),
    );
  }
  return nodeId;
}

const toBounds = (b: OcctBounds): Bounds => ({
  min: [b.xMin, b.yMin, b.zMin],
  max: [b.xMax, b.yMax, b.zMax],
});

/**
 * The kernel, plus one diagnostic the protocol has no reason to carry.
 *
 * `wasmLiveHandles` is the WASM side's OWN count of live shapes — an independent witness to the
 * registry's `liveCount`. "No rebuild leaves leaked WASM heap" is a P2 exit criterion, and it is only
 * a real assertion if the thing being asserted is not the thing doing the asserting.
 */
export interface OcctKernel extends KernelImplementation {
  wasmLiveHandles(): number;
}

export async function createOcctKernel(): Promise<OcctKernel> {
  const wasm = await initBunyanKernel();

  // The registry is the single owner of WASM-heap memory: OCCT shapes are NOT garbage-collected, so
  // releasing a handle here is what actually frees the solid over there (spec §6.2).
  const shapes = new ShapeRegistry<OcctShape>({
    prefix: 'occt',
    onRelease: (shape) => {
      wasm.releaseShape(shape.id);
    },
  });

  const liveShape = (handle: string, op: string): OcctShape => {
    const shape = shapes.get(handle);
    if (shape === undefined) {
      throw new KernelFailureError(
        kernelFailure('HANDLE_NOT_FOUND', `No live shape for handle "${handle}"`, { op }),
      );
    }
    return shape;
  };

  /**
   * Read the kernel's structural report and turn it into identities.
   *
   * ⚠ `composeRefs` throws `UnnameableSubShape` when a sub-shape cannot be named — a collision, or an
   * ancestor the operand never named. That is not an internal error to be swallowed: it is the naming
   * layer REFUSING to invent an identity, and it must reach the caller as a typed failure so the UI
   * can say "this edit cannot be represented" instead of silently producing a mislabelled solid.
   */
  const register = (
    id: number,
    nodeId: string,
    opTag: string,
    operands: readonly OcctShape[],
  ): { handle: string; bounds: Bounds; refs: readonly string[] } => {
    let faces: string[];
    let edges: string[];
    try {
      const naming = drainNaming(wasm.getNaming(id));
      ({ faces, edges } = composeRefs(nodeId, opTag, naming, operands.map(operandRefs)));
    } catch (error) {
      wasm.releaseShape(id); // the solid exists but nothing can name it — do not leak it
      if (error instanceof UnnameableSubShape) {
        throw new KernelFailureError(
          kernelFailure('UNRESOLVED_SUBSHAPE_REF', error.message, { op: opTag }),
        );
      }
      throw error;
    }

    const shape: OcctShape = {
      id,
      nodeId,
      faceRefs: faces,
      edgeRefs: edges,
      refs: [...faces, ...edges],
    };
    return {
      handle: shapes.add(shape),
      bounds: toBounds(wasm.getBounds(id)),
      refs: shape.refs,
    };
  };

  /**
   * Resolve a `SubShapeRef` token to the canonical index the kernel addresses it by.
   *
   * This is the resolve path, and it is a LOOKUP, not a search: the token was handed out by the
   * operation that created the sub-shape, so finding it is a table lookup, never a geometric match
   * (spec §4.5 — "no geometric guessing on the resolve path").
   */
  const resolveEdge = (shape: OcctShape, token: string, op: string): number => {
    const index = shape.edgeRefs.indexOf(token);
    if (index < 0) {
      const kind = decodeSubShapeRef(token)?.kind;
      throw new KernelFailureError(
        kernelFailure(
          'UNRESOLVED_SUBSHAPE_REF',
          kind !== undefined && kind !== 'edge'
            ? `"${token}" names a ${kind}, and this op needs an edge`
            : `"${token}" is not an edge of this shape — it may have been removed by an earlier edit`,
          { op },
        ),
      );
    }
    return index;
  };

  const handlers: OpHandlers = {
    echo: (payload) => payload,

    makeBox: (payload) => {
      const nodeId = requireNodeId(payload.nodeId);
      const dx = requireFinitePositive('dx', payload.dx);
      const dy = requireFinitePositive('dy', payload.dy);
      const dz = requireFinitePositive('dz', payload.dz);

      const [x, y, z] = payload.at ?? [0, 0, 0];
      const id = wasm.makeBox(x, y, z, dx, dy, dz);
      if (id === 0) throw failFromKernel(wasm, 'makeBox');
      return register(id, nodeId, 'box', []);
    },

    // The circular column — and the first shape whose SEAM edge no face pair can name. The C++ names
    // it from the operation's own accessor, which is the same rule as everywhere else.
    makeCylinder: (payload) => {
      const nodeId = requireNodeId(payload.nodeId);
      const radius = requireFinitePositive('radius', payload.radius);
      const height = requireFinitePositive('height', payload.height);

      const [x, y, z] = payload.at ?? [0, 0, 0];
      const [ax, ay, az] = payload.axis ?? [0, 0, 1];
      const id = wasm.makeCylinder(x, y, z, ax, ay, az, radius, height);
      if (id === 0) throw failFromKernel(wasm, 'makeCylinder');
      return register(id, nodeId, 'cylinder', []);
    },

    // ⚠ The operation that persistent naming exists for. The result's identities are composed from
    // the OPERANDS' identities: what the boolean left alone keeps its old ref (so an opening already
    // hosted on a wall face is not re-targeted by cutting a second one), and only the section edges
    // and split faces are owned by this node.
    boolean: (payload) => {
      const nodeId = requireNodeId(payload.nodeId);
      const kinds = { cut: 0, fuse: 1, common: 2 } as const;
      const kind = kinds[payload.kind];
      if (kind === undefined) {
        throw new KernelFailureError(
          kernelFailure('INVALID_PAYLOAD', `unknown boolean kind "${payload.kind}"`),
        );
      }
      const a = liveShape(payload.a, 'boolean');
      const b = liveShape(payload.b, 'boolean');

      const id = wasm.booleanOp(a.id, b.id, kind);
      if (id === 0) throw failFromKernel(wasm, 'boolean');
      return register(id, nodeId, payload.kind, [a, b]);
    },

    // The edge is addressed BY ITS IDENTITY — a ref token, not a position. "Round that edge" therefore
    // still means the same edge after the wall has been resized and the model rebuilt, which is the
    // entire point of D1 and the reason this op could not exist before the naming did.
    fillet: (payload) => {
      const nodeId = requireNodeId(payload.nodeId);
      const radius = requireFinitePositive('radius', payload.radius);
      const shape = liveShape(payload.handle, 'fillet');
      const edgeIndex = resolveEdge(shape, payload.edge, 'fillet');

      const id = wasm.fillet(shape.id, edgeIndex, radius);
      if (id === 0) throw failFromKernel(wasm, 'fillet');
      return register(id, nodeId, 'fillet', [shape]);
    },

    // Exact, from BRepGProp — NOT measured off the mesh. A tessellated cylinder under-reports its
    // volume by the chord error, so quantities must come from the B-Rep (protocol: MeasureResult).
    measure: (payload) => {
      const shape = liveShape(payload.handle, 'measure');
      const m = wasm.measure(shape.id);
      return {
        volume: m.volume,
        area: m.area,
        edgeLength: m.edgeLength,
        counts: { solids: m.solids, faces: m.faces, edges: m.edges, vertices: m.vertices },
      };
    },

    // ---- THE GEOMETRIC QUERIES (D23) — answered from the B-Rep, never from the mesh ----------------

    bounds: (payload) => {
      const shape = liveShape(payload.handle, 'bounds');
      if (payload.ref === undefined) {
        return { bounds: toBounds(wasm.getBounds(shape.id)) };
      }
      // The tight bounds of ONE named sub-shape — "where exactly is the south face of that wall?".
      const faceIndex = shape.faceRefs.indexOf(payload.ref);
      const kind = faceIndex >= 0 ? 0 : 1;
      const index = faceIndex >= 0 ? faceIndex : resolveEdge(shape, payload.ref, 'bounds');
      return { bounds: toBounds(wasm.subShapeBounds(shape.id, kind, index)) };
    },

    distance: (payload) => {
      const a = liveShape(payload.a, 'distance');
      const b = liveShape(payload.b, 'distance');
      const p = wasm.distanceBetween(a.id, b.id);
      if (p.distance < 0) throw failFromKernel(wasm, 'distance');
      return {
        distance: p.distance,
        pointA: [p.ax, p.ay, p.az],
        pointB: [p.bx, p.by, p.bz],
      };
    },

    classifyPoint: (payload) => {
      const shape = liveShape(payload.handle, 'classifyPoint');
      const [x, y, z] = payload.point;
      const state = wasm.classifyPoint(shape.id, x, y, z, payload.tolerance ?? 0);
      if (state < 0) throw failFromKernel(wasm, 'classifyPoint');
      return { state: state === 1 ? 'inside' : state === 2 ? 'on' : 'outside' };
    },

    tessellate: (payload) => {
      const shape = liveShape(payload.handle, 'tessellate');
      const views = wasm.tessellate(shape.id, payload.deflection);
      if (!views.ok) throw failFromKernel(wasm, 'tessellate');

      // ⚠ COPY NOW. Every array on `views` is a zero-copy window onto the WASM heap, invalidated by
      // the next tessellate call or by any heap growth. These constructors copy; nothing below may
      // await before they run.
      const positions = new Float32Array(views.positions);
      const normals = new Float32Array(views.normals);
      const indices = new Uint32Array(views.indices);
      const triangleToRef = new Uint32Array(views.triangleFace);
      const edgePositions = new Float32Array(views.edgePositions);

      // A face's canonical index is already its index into `refs` (faces were emitted first), so
      // `triangleFace` needs no remapping. Edges sit after them.
      const edges: EdgePolyline[] = [];
      for (let i = 0; i < views.edgeIndex.length; i++) {
        edges.push({
          refIndex: shape.faceRefs.length + (views.edgeIndex[i] ?? 0),
          start: views.edgeStart[i] ?? 0,
          count: views.edgeCount[i] ?? 0,
        });
      }

      const mesh: MeshBuffers = {
        positions,
        normals,
        indices,
        edgePositions,
        provenance: { refs: shape.refs, triangleToRef, edges },
        bounds: toBounds(wasm.getBounds(shape.id)),
      };
      return mesh;
    },

    releaseShape: (payload) => ({
      released: shapes.release(payload.handle),
      // Asserted against the WASM side's own count in the tests: if these two ever disagree, the
      // registry is lying about what it freed and the heap is leaking.
      liveHandles: shapes.liveCount,
    }),

    demoFailure: (payload) => {
      throw new KernelFailureError(
        kernelFailure(payload.code, payload.message ?? `Simulated ${payload.code}`, {
          op: 'demoFailure',
        }),
      );
    },
  };

  return {
    info: OCCT_KERNEL_INFO,
    handlers,
    wasmLiveHandles: () => wasm.liveHandles(),
    dispose: () => {
      shapes.releaseAll();
    },
  };
}

export async function createOcctKernelHost(): Promise<KernelHost> {
  return new KernelHost(await createOcctKernel());
}
