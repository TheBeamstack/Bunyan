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
import {
  KERNEL_FAILURE_CODES,
  KernelFailureError,
  capabilitiesOf,
  decodeSubShapeRef,
  kernelFailure,
} from '@bunyan/protocol';
import type {
  Bounds,
  EdgePolyline,
  KernelFailureCode,
  KernelInfo,
  MeshBuffers,
} from '@bunyan/protocol';

import { UnnameableSubShape, composeRefs, composeTransformRefs, drainNaming } from './naming.js';
import type { OperandRefs } from './naming.js';
import { decodeBrepBytes, fingerprintOf, parseSignature, refsInShapeOrder } from './cache.js';

import initBunyanKernel from '../wasm/bunyan-kernel.js';
import type { OcctBounds, OcctModule, OcctVectorDouble } from '../wasm/bunyan-kernel.js';

/**
 * The kernel build id — OCCT version + emscripten version.
 *
 * It is stamped into every saved `.bnn` and invalidates the cached B-Rep when it changes
 * (spec §6). Bump it whenever `tools/kernel-build` produces a different binary, and re-seed the
 * goldens if OCCT itself moved.
 */
export const OCCT_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';

/**
 * Everything about this kernel that is NOT derived from its handlers.
 *
 * ⚠ `capabilities` is deliberately absent here: it is GENERATED from the handler map at construction
 * (`capabilitiesOf`), never written down. The hand-written list drifted once already — `transform`
 * shipped in Entry 11 and was missing from it for two sessions — and a kernel that misdescribes itself
 * is worse than one that cannot do the thing, because a caller *plans* around the advertisement.
 */
export const OCCT_KERNEL_META = {
  name: 'occt',
  kernelVersion: '7.9.3',
  buildId: OCCT_BUILD_ID,
  // Owner ruling 9: v1.0.0 ships single-threaded. Multi-threaded OCCT orders boolean output
  // non-deterministically, which would make persistent-naming bugs (the #1 risk) far harder to
  // reproduce. Correctness on one core first; MT lands in v1.0.x.
  threading: 'single',
} as const satisfies Omit<KernelInfo, 'capabilities'>;

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
 *
 * ⚠ It reads that vocabulary FROM THE PROTOCOL rather than restating it. A hand-written subset is a
 * second list that has to be remembered, and it had already drifted: `INVALID_PROFILE` existed in the
 * protocol, the kernel emitted it, and this function silently downgraded it to `INTERNAL` — turning a
 * precise, actionable *"your slab boundary is self-intersecting"* into *"something went wrong"*.
 */
function failFromKernel(wasm: OcctModule, op: string): KernelFailureError {
  const message = wasm.lastError();
  const code: KernelFailureCode =
    KERNEL_FAILURE_CODES.find((c) => message.startsWith(`${c}:`)) ?? 'INTERNAL';
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

/**
 * Validate a transform's motions and flatten them for the C++ side — 8 doubles each, applied in order:
 *
 *   translate : [0, tx,ty,tz,  0, 0, 0,  0      ]
 *   rotate    : [1, ax,ay,az,  ox,oy,oz, degrees]
 *   mirror    : [2, nx,ny,nz,  ox,oy,oz, 0      ]
 *
 * ⚠ The parameter is `unknown` ON PURPOSE, even though the protocol types it. A payload arrives off a
 * `postMessage` wire and is untrusted until a handler checks it (`KernelHost.handle` says so) — the
 * static type describes what a WELL-BEHAVED caller sends, not what actually shows up. Trusting it here
 * would let a malformed message reach OCCT as garbage doubles.
 */
function flattenMotions(motions: unknown): number[] {
  const bad = (why: string): never => {
    throw new KernelFailureError(kernelFailure('INVALID_PAYLOAD', why, { op: 'transform' }));
  };

  if (!Array.isArray(motions) || motions.length === 0) {
    return bad('transform needs a non-empty array of motions');
  }

  const vec3 = (value: unknown, what: string): [number, number, number] => {
    if (
      !Array.isArray(value) ||
      value.length !== 3 ||
      !value.every((n) => typeof n === 'number' && Number.isFinite(n))
    ) {
      return bad(`${what} must be three finite numbers`);
    }
    return value as [number, number, number];
  };

  const flat: number[] = [];
  for (const raw of motions as readonly unknown[]) {
    if (typeof raw !== 'object' || raw === null) return bad('each motion must be an object');
    const motion = raw as Record<string, unknown>;

    switch (motion['kind']) {
      case 'translate':
        flat.push(0, ...vec3(motion['by'], 'translate.by'), 0, 0, 0, 0);
        break;
      case 'rotate': {
        const degrees = motion['degrees'];
        if (typeof degrees !== 'number' || !Number.isFinite(degrees)) {
          return bad('rotate.degrees must be a finite number');
        }
        flat.push(
          1,
          ...vec3(motion['axis'], 'rotate.axis'),
          ...vec3(motion['origin'] ?? [0, 0, 0], 'rotate.origin'),
          degrees,
        );
        break;
      }
      case 'mirror':
        flat.push(
          2,
          ...vec3(motion['normal'], 'mirror.normal'),
          ...vec3(motion['origin'] ?? [0, 0, 0], 'mirror.origin'),
          0,
        );
        break;
      default:
        return bad(`unknown motion kind "${String(motion['kind'])}"`);
    }
  }
  return flat;
}

/**
 * Validate a profile and flatten it for the C++ side:
 *
 *   [0..2] plane origin   [3..5] plane normal   [6..8] plane x-axis   [9..10] start (u,v)
 *   then one segment per 5 doubles: [kind, viaU, viaV, toU, toV]     (0 = line, 1 = arc)
 *
 * ⚠ `unknown` on purpose, for the same reason as `flattenMotions`: a payload off a `postMessage` wire
 * is untrusted, and the static type describes a well-behaved caller, not what actually arrives.
 *
 * The kernel validates the geometry (closed, planar, non-self-intersecting); this validates the
 * SHAPE OF THE MESSAGE, so garbage never reaches OCCT as doubles.
 */
function flattenProfile(profile: unknown): number[] {
  const bad = (why: string): never => {
    throw new KernelFailureError(kernelFailure('INVALID_PAYLOAD', why, { op: 'extrude' }));
  };

  if (typeof profile !== 'object' || profile === null) return bad('extrude needs a profile object');
  const p = profile as Record<string, unknown>;

  const nums = (value: unknown, n: number, what: string): number[] => {
    if (
      !Array.isArray(value) ||
      value.length !== n ||
      !value.every((v) => typeof v === 'number' && Number.isFinite(v))
    ) {
      return bad(`${what} must be ${String(n)} finite numbers`);
    }
    return value as number[];
  };

  const plane = p['plane'];
  if (typeof plane !== 'object' || plane === null) return bad('profile.plane is required');
  const pl = plane as Record<string, unknown>;

  const flat: number[] = [
    ...nums(pl['origin'], 3, 'profile.plane.origin'),
    ...nums(pl['normal'], 3, 'profile.plane.normal'),
    ...nums(pl['xAxis'], 3, 'profile.plane.xAxis'),
    ...nums(p['start'], 2, 'profile.start'),
  ];

  const segments = p['segments'];
  if (!Array.isArray(segments) || segments.length < 3) {
    // Two segments cannot bound an area unless one of them is an arc — and the kernel's own closure
    // and self-intersection checks catch the rest. Three is the smallest polygon; refuse below it
    // here so the message is about the message, not about OCCT.
    return bad('profile.segments must be an array of at least 3 segments');
  }

  for (const raw of segments as readonly unknown[]) {
    if (typeof raw !== 'object' || raw === null)
      return bad('each profile segment must be an object');
    const seg = raw as Record<string, unknown>;
    switch (seg['kind']) {
      case 'line': {
        const to = nums(seg['to'], 2, 'segment.to');
        flat.push(0, 0, 0, ...to);
        break;
      }
      case 'arc': {
        const via = nums(seg['via'], 2, 'segment.via');
        const to = nums(seg['to'], 2, 'segment.to');
        flat.push(1, ...via, ...to);
        break;
      }
      default:
        return bad(`unknown profile segment kind "${String(seg['kind'])}"`);
    }
  }
  return flat;
}

function requireNodeId(nodeId: unknown): string {
  if (typeof nodeId !== 'string' || nodeId === '') {
    throw new KernelFailureError(
      kernelFailure('INVALID_PAYLOAD', 'every geometry op needs a nodeId to own its identities'),
    );
  }
  return nodeId;
}

/**
 * Drain an embind `std::vector<double>` — one boundary crossing PER ELEMENT, so drain once and free.
 * (The same rule `naming.ts` states for its int/row vectors; the cache's signature vector is tens of
 * numbers, which is why a flat vector is cheaper than a new value_object.)
 */
const drainDoubles = (vector: OcctVectorDouble): number[] => {
  try {
    const out: number[] = [];
    for (let i = 0; i < vector.size(); i++) out.push(vector.get(i) ?? 0);
    return out;
  } finally {
    vector.delete();
  }
};

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
  /**
   * The dlmalloc bytes the live OCCT solids currently occupy — the WASM side's own witness, and the
   * fine-grained companion to `wasmLiveHandles`. It is the per-solid heap signal the scale gate needs
   * (P4 step 9a): the linear-memory size starts at 64 MB and only jumps at growth boundaries, so it
   * cannot price a single solid, but this tracks every allocation. See `tests/document-heap-scale.test.ts`.
   */
  wasmHeapUsedBytes(): number;
}

export async function createOcctKernel(
  // ⚠ Optional emscripten module overrides, forwarded verbatim to the WASM factory. The BROWSER PATH
  // passes nothing and is untouched; it exists solely so a HEADLESS harness can inject an
  // `instantiateWasm` hook and keep a handle on the exported `WebAssembly.Memory` — the only way to
  // witness the true linear-memory size, which is the scale-harness release gate (P4 step 9a: every
  // OCCT solid lives in this heap for the whole session and nothing evicts). See
  // `tests/document-heap-scale.test.ts`.
  moduleArg?: Record<string, unknown>,
): Promise<OcctKernel> {
  const wasm = await initBunyanKernel(moduleArg);

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

    // ⚠ THE OP THREE OF THE FIVE MVP TYPES NEED — Slab ("planar boundary + thickness"), a Column of
    // arbitrary profile, and GenericSolid ("free sketch + extrude/revolve"). `makeBox` can express
    // none of them: a real floor plate is L-shaped, or five-sided, or has a curved edge.
    //
    // ⚠ The faces are named `lateral.k` after the AUTHORED segment index — so editing the boundary
    // never renumbers them, and an opening hosted on `lateral.2` is still on `lateral.2` afterwards.
    extrude: (payload) => {
      const nodeId = requireNodeId(payload.nodeId);
      const height = payload.height;
      if (typeof height !== 'number' || !Number.isFinite(height) || height === 0) {
        throw new KernelFailureError(
          kernelFailure('INVALID_PAYLOAD', 'extrude.height must be a non-zero finite number', {
            op: 'extrude',
          }),
        );
      }
      const flat = flattenProfile(payload.profile);

      // The sweep defaults to the profile plane's own normal — the ordinary case: draw the slab
      // boundary flat, thicken it upward.
      const dir = payload.direction ?? payload.profile.plane.normal;
      const len = Math.hypot(dir[0], dir[1], dir[2]);
      if (!(len > 0)) {
        throw new KernelFailureError(
          kernelFailure('INVALID_PAYLOAD', 'extrude.direction must be a non-zero vector', {
            op: 'extrude',
          }),
        );
      }
      const s = height / len;

      const profile = new wasm.VectorDouble();
      let id: number;
      try {
        for (const v of flat) profile.push_back(v);
        id = wasm.extrudeProfile(profile, dir[0] * s, dir[1] * s, dir[2] * s);
      } finally {
        profile.delete(); // an embind vector is WASM heap, and it is ours to free
      }
      if (id === 0) throw failFromKernel(wasm, 'extrude');
      return register(id, nodeId, 'prism', []);
    },

    // REVOLVE — the other half of GenericSolid. The naming is the prism's (`lateral.k` after the
    // AUTHORED segment), and everything hard about it lives in the C++, where it was MEASURED: a full
    // 360° turn has NO CAPS, each lateral face carries a SEAM, and a segment perpendicular to the axis
    // reports NO HISTORY AT ALL even though its face is right there in the result. See the block
    // comment on `revolveProfile` in `kernel.cpp`, and re-run `probe.cpp` before changing any of it.
    revolve: (payload) => {
      const nodeId = requireNodeId(payload.nodeId);
      const angle = payload.angle;
      if (typeof angle !== 'number' || !Number.isFinite(angle) || angle <= 0 || angle > 360) {
        throw new KernelFailureError(
          kernelFailure('INVALID_PAYLOAD', 'revolve.angle must be in (0, 360] degrees', {
            op: 'revolve',
          }),
        );
      }
      const dir = payload.axis.direction;
      if (!(Math.hypot(dir[0], dir[1], dir[2]) > 0)) {
        throw new KernelFailureError(
          kernelFailure('INVALID_PAYLOAD', 'revolve.axis.direction must be a non-zero vector', {
            op: 'revolve',
          }),
        );
      }
      const origin = payload.axis.origin;
      const flat = flattenProfile(payload.profile);

      const profile = new wasm.VectorDouble();
      let id: number;
      try {
        for (const v of flat) profile.push_back(v);
        id = wasm.revolveProfile(
          profile,
          origin[0],
          origin[1],
          origin[2],
          dir[0],
          dir[1],
          dir[2],
          angle,
        );
      } finally {
        profile.delete(); // an embind vector is WASM heap, and it is ours to free
      }
      if (id === 0) throw failFromKernel(wasm, 'revolve');
      return register(id, nodeId, 'revol', []);
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

    // The fillet's flat sibling — same contract, same resolver, same weak spot (it rebuilds its
    // neighbouring edges with no history, and they come back through the ADJACENT rule).
    chamfer: (payload) => {
      const nodeId = requireNodeId(payload.nodeId);
      const distance = requireFinitePositive('distance', payload.distance);
      const shape = liveShape(payload.handle, 'chamfer');
      const edgeIndex = resolveEdge(shape, payload.edge, 'chamfer');

      const id = wasm.chamfer(shape.id, edgeIndex, distance);
      if (id === 0) throw failFromKernel(wasm, 'chamfer');
      return register(id, nodeId, 'chamfer', [shape]);
    },

    // ⚠ THE OP THAT CREATES NO IDENTITIES — note there is no `nodeId` anywhere in this handler, and
    // that absence is the contract. A rigid motion is a 1:1 map, so the result's refs ARE the operand's
    // refs, token for token, in the same order: a rotated wall is the same wall, and the window hosted
    // on its y-min face is still hosted there. `composeTransformRefs` cannot mint a ref even if it
    // wanted to — it has no node to mint one under (see naming.ts).
    transform: (payload) => {
      const shape = liveShape(payload.handle, 'transform');
      const flat = flattenMotions(payload.motions);

      const motions = new wasm.VectorDouble();
      let id: number;
      try {
        for (const v of flat) motions.push_back(v);
        id = wasm.transformShape(shape.id, motions);
      } finally {
        motions.delete(); // an embind vector is WASM heap, and it is ours to free
      }
      if (id === 0) throw failFromKernel(wasm, 'transform');

      let faces: string[];
      let edges: string[];
      try {
        const naming = drainNaming(wasm.getNaming(id));
        ({ faces, edges } = composeTransformRefs(naming, operandRefs(shape)));
      } catch (error) {
        wasm.releaseShape(id); // the solid exists but nothing can name it — do not leak it
        if (error instanceof UnnameableSubShape) {
          throw new KernelFailureError(
            kernelFailure('UNRESOLVED_SUBSHAPE_REF', error.message, { op: 'transform' }),
          );
        }
        throw error;
      }

      // The transformed shape belongs to the SAME element — it is that element, moved. It keeps the
      // operand's nodeId so that a later op naming something new against it (a boolean's section edge)
      // attributes it to the node that actually owns the geometry.
      const moved: OcctShape = {
        id,
        nodeId: shape.nodeId,
        faceRefs: faces,
        edgeRefs: edges,
        refs: [...faces, ...edges],
      };
      return {
        handle: shapes.add(moved),
        bounds: toBounds(wasm.getBounds(id)),
        refs: moved.refs,
      };
    },

    // Exact, from BRepGProp — NOT measured off the mesh. A tessellated cylinder under-reports its
    // volume by the chord error, so quantities must come from the B-Rep (protocol: MeasureResult).
    measure: (payload) => {
      const shape = liveShape(payload.handle, 'measure');

      // The whole solid — or, with a `ref`, ONE NAMED SUB-SHAPE of it: "what is the area of THAT wall
      // face?" That question is the paint area, the formwork area, the cladding take-off; it is P5's
      // `quantities` hook and Miqdar's entire input, and until Entry 14 it was simply not askable
      // (Entry 13 §2). `bounds` has taken a `ref` since Entry 9; this was an oversight, not a design.
      let kind = -1;
      let index = 0;
      if (payload.ref !== undefined) {
        const faceIndex = shape.faceRefs.indexOf(payload.ref);
        kind = faceIndex >= 0 ? 0 : 1;
        index = faceIndex >= 0 ? faceIndex : resolveEdge(shape, payload.ref, 'measure');
      }

      const m = wasm.measure(shape.id, kind, index);
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

    faceFrame: (payload) => {
      const shape = liveShape(payload.handle, 'faceFrame');
      // A frame is a FACE concept. `indexOf` yields -1 for an edge token (or a stranger), which the
      // C++ turns into UNRESOLVED_SUBSHAPE_REF — the honest reply, surfaced through `lastError`.
      const faceIndex = shape.faceRefs.indexOf(payload.ref);
      const f = wasm.faceFrame(shape.id, faceIndex);
      if (wasm.lastError() !== '') throw failFromKernel(wasm, 'faceFrame');
      return {
        origin: [f.ox, f.oy, f.oz],
        normal: [f.nx, f.ny, f.nz],
        uAxis: [f.ux, f.uy, f.uz],
        vAxis: [f.vx, f.vy, f.vz],
      };
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

    // ---- THE GEOMETRY CACHE (D29) — the ops whose whole job is to REFUSE convincingly -------------
    //
    // ⚠⚠ Read `./cache.ts` before either of these. The rule that keeps D1 intact is not "the cache
    // stores tokens" (it does) — it is that the tokens are re-attached by an order the READER derives
    // from the shape itself and then VERIFIES against a fingerprint, so the failure mode is a rebuild
    // and never a mis-named face. Neither op mints an identity: `exportBrep` reads the ones the recipe
    // already assigned, and `importBrep` is handed them.

    exportBrep: (payload) => {
      const shape = liveShape(payload.handle, 'exportBrep');
      const brep = wasm.exportBrep(shape.id);
      if (brep === '') throw failFromKernel(wasm, 'exportBrep');

      const signature = parseSignature(drainDoubles(wasm.shapeSignature(shape.id)), 'exportBrep');
      if (wasm.lastError() !== '') throw failFromKernel(wasm, 'exportBrep');

      const refs = refsInShapeOrder(signature, shape.faceRefs, shape.edgeRefs, 'exportBrep');
      return {
        // ASCII by construction (VERSION_1 BRep is text), so this encode is 1:1 and the bytes satisfy
        // `decodeBrepBytes` — asserted in the tests, because a producer that cannot pass its own
        // consumer's guard is a cache nobody can read.
        brep: new TextEncoder().encode(brep),
        refs,
        // ⚠ The tokens go INTO the digest, not just the geometry (see `cache.ts`): over the geometry
        // alone, a permuted `refs` array verifies and mis-names two faces.
        fingerprint: fingerprintOf(signature, refs, 'exportBrep'),
      };
    },

    importBrep: (payload) => {
      // ⚠ `nodeId` is bookkeeping, NOT a claim about the refs — see the corrected note in `ops.ts`.
      const nodeId = requireNodeId(payload.nodeId);
      if (!(payload.brep instanceof Uint8Array)) {
        throw new KernelFailureError(
          kernelFailure('INVALID_PAYLOAD', 'importBrep.brep must be bytes', { op: 'importBrep' }),
        );
      }
      // ⚠ `unknown` first, then narrowed — the same discipline as `flattenMotions`: the static type
      // describes a well-behaved caller, and this payload arrives off a `postMessage` wire.
      const rawRefs: unknown = payload.refs;
      if (!Array.isArray(rawRefs) || rawRefs.some((r) => typeof r !== 'string' || r === '')) {
        throw new KernelFailureError(
          kernelFailure('INVALID_PAYLOAD', 'importBrep.refs must be non-empty ref tokens', {
            op: 'importBrep',
          }),
        );
      }
      const refs = rawRefs as string[];
      if (typeof payload.fingerprint !== 'string' || payload.fingerprint === '') {
        throw new KernelFailureError(
          kernelFailure('INVALID_PAYLOAD', 'importBrep needs the fingerprint taken at write time', {
            op: 'importBrep',
          }),
        );
      }

      // Guard the bytes BEFORE OCCT sees them (the measured 93-byte, 56-second case).
      const text = decodeBrepBytes(payload.brep, 'importBrep');

      const id = wasm.importBrep(text);
      if (id === 0) throw failFromKernel(wasm, 'importBrep');

      // ⚠ From here on, every exit path releases the solid. It exists on the WASM heap and nothing else
      // holds it: a refusal that leaked it would turn "the cache was stale" into a heap leak per load.
      try {
        const signature = parseSignature(drainDoubles(wasm.shapeSignature(id)), 'importBrep');
        if (wasm.lastError() !== '') throw failFromKernel(wasm, 'importBrep');

        // ⚠⚠ THE VERIFICATION, AND IT IS THE WHOLE OP. It is computed from the shape actually read, by
        // the same function that produced the fingerprint on the way out, so a disagreement means the
        // bytes are not the solid whose tokens these are — whatever the reason.
        const fingerprint = fingerprintOf(signature, refs, 'importBrep');
        if (fingerprint !== payload.fingerprint) {
          throw new KernelFailureError(
            kernelFailure(
              'CACHE_STALE',
              `the cached B-Rep does not match its fingerprint (read ${fingerprint}, expected ` +
                `${payload.fingerprint}) — refusing to attach identities to a shape that is not the one ` +
                `they were assigned to. Rebuild from the recipe.`,
              { op: 'importBrep' },
            ),
          );
        }

        const faces = signature.faces.length;
        const edges = signature.edges.length;
        if (refs.length !== faces + edges) {
          throw new KernelFailureError(
            kernelFailure(
              'CACHE_STALE',
              `the cache carries ${String(refs.length)} identities for a solid with ` +
                `${String(faces)} faces and ${String(edges)} edges`,
              { op: 'importBrep' },
            ),
          );
        }
        // The convention is faces first, then edges (as `exportBrep` emits and as `OcctShape` stores).
        // A token whose own kind contradicts its position means the arrays were built by something that
        // did not share the convention, and a face token addressing an edge resolves to nothing later.
        refs.forEach((ref, at) => {
          const expected = at < faces ? 'face' : 'edge';
          const kind = decodeSubShapeRef(ref)?.kind;
          if (kind !== expected) {
            throw new KernelFailureError(
              kernelFailure(
                'CACHE_STALE',
                `identity ${String(at)} of this cache is "${ref}", which names a ` +
                  `${kind ?? 'nothing'} where a ${expected} belongs`,
                { op: 'importBrep' },
              ),
            );
          }
        });
        if (new Set(refs).size !== refs.length) {
          throw new KernelFailureError(
            kernelFailure(
              'CACHE_STALE',
              'the cache names two sub-shapes with the SAME identity — refusing rather than hand out a ' +
                'ref that names two things',
              { op: 'importBrep' },
            ),
          );
        }

        const restored: OcctShape = {
          id,
          nodeId,
          faceRefs: refs.slice(0, faces),
          edgeRefs: refs.slice(faces),
          refs: [...refs],
        };
        return {
          handle: shapes.add(restored),
          bounds: toBounds(wasm.getBounds(id)),
          refs: restored.refs,
        };
      } catch (error) {
        wasm.releaseShape(id);
        throw error;
      }
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
    // Generated, not maintained (D21): the kernel advertises exactly what it implements.
    info: { ...OCCT_KERNEL_META, capabilities: capabilitiesOf(handlers) },
    handlers,
    wasmLiveHandles: () => wasm.liveHandles(),
    wasmHeapUsedBytes: () => wasm.heapUsedBytes(),
    dispose: () => {
      shapes.releaseAll();
    },
  };
}

export async function createOcctKernelHost(): Promise<KernelHost> {
  return new KernelHost(await createOcctKernel());
}
