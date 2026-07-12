/**
 * The operation set of protocol v1.
 *
 * P1 scope: enough to prove the seam end to end (handshake, echo/transferables, a real solid,
 * tessellation with provenance, handle lifecycle, and a deliberately-failing op). P2 grows this
 * with the rest of the primitives, booleans and fillets — additively, without reshaping the envelope.
 */

import type { Bounds, MeshBuffers, Vec3 } from './mesh.js';
import type { KernelFailureCode } from './failures.js';

/**
 * An opaque token for a shape living on the WASM heap. The main thread NEVER holds a raw OCCT
 * pointer (spec §6.2) — it holds one of these, and the worker's handle registry owns the memory.
 */
export type ShapeHandle = string;

export interface KernelInfo {
  /** `occt` for the real kernel, `mock` for the protocol-conformant fake (P2 step 0). */
  readonly name: string;
  readonly kernelVersion: string;
  /**
   * The OCCT/OpenCascade.js build id. Recorded in `manifest.json`; a mismatch invalidates the
   * `geometry-cache.brep` and forces a rebuild from the recipe (spec §6).
   */
  readonly buildId: string;
  readonly threading: 'multi' | 'single';
  readonly capabilities: readonly string[];
}

export interface HandshakeResult {
  readonly protocolVersion: number;
  readonly kernel: KernelInfo;
}

export interface EchoPayload {
  readonly note: string;
  /** Round-trips a transferable so the plumbing is proven, not assumed (P1 step 5). */
  readonly blob?: Uint8Array;
}

export interface MakeBoxPayload {
  /** The DAG node that will OWN the resulting sub-shape identities (spec §4.5). */
  readonly nodeId: string;
  /** Millimetres. */
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
  /**
   * The min corner, in millimetres. Defaults to the origin.
   *
   * ⚠ A TRANSLATION, NOT A TRANSFORM — and the distinction is deliberate. Without it, two solids both
   * sit at the origin and a boolean between them can only ever cut a CORNER off a wall; a window in
   * the middle of one is unreachable, and that is the single operation this product exists to perform.
   * Rotation is NOT here: a rotated element needs a general `transform` op with its own naming rules,
   * and inventing half of one under time pressure is how contracts rot. Placement of a *rotated* wall
   * is P3's problem, and it is a new op, not a new field.
   */
  readonly at?: Vec3;
}

export interface ShapeResult {
  readonly handle: ShapeHandle;
  readonly bounds: Bounds;
  /** Every face/edge identity this operation assigned, canonically ordered. */
  readonly refs: readonly string[];
}

export interface TessellatePayload {
  readonly handle: ShapeHandle;
  /** Chordal deviation in mm. Smaller = finer mesh. */
  readonly deflection: number;
}

export interface MeasurePayload {
  readonly handle: ShapeHandle;
}

/**
 * EXACT properties, straight from OCCT's `BRepGProp` — deliberately NOT derived from the mesh.
 *
 * Why this op exists (owner-approved, spec §4b-C): measuring a tessellation is only exact for
 * PLANAR-faced solids. A circular column's triangles under-report its volume by the chord error, so
 * a quantity schedule built on the mesh would quietly under-bill every column in the project. The
 * mesh is a disposable projection; quantities must come from the B-Rep, which is the source of truth.
 */
export interface MeasureResult {
  /** mm³ */
  readonly volume: number;
  /** mm² */
  readonly area: number;
  /** mm — summed over UNIQUE edges (see the kernel's note on `LinearProperties`). */
  readonly edgeLength: number;
  readonly counts: {
    readonly solids: number;
    readonly faces: number;
    readonly edges: number;
    readonly vertices: number;
  };
}

export interface MakeCylinderPayload {
  readonly nodeId: string;
  /** Millimetres. */
  readonly radius: number;
  readonly height: number;
  /** The centre of the base cap. Defaults to the origin. */
  readonly at?: Vec3;
  /**
   * The axis the cylinder extrudes along. Defaults to +Z (a column).
   *
   * It exists because the two things a cylinder is FOR in a building point in different directions: a
   * column stands up, and a duct penetration goes horizontally through a wall. Without this the
   * kernel could model one and not the other.
   */
  readonly axis?: Vec3;
}

/** `cut` = A minus B; `fuse` = A plus B; `common` = the intersection of A and B. */
export type BooleanKind = 'cut' | 'fuse' | 'common';

export interface BooleanPayload {
  /** The DAG node that owns the identities this operation CREATES (the section edges, the splits). */
  readonly nodeId: string;
  readonly kind: BooleanKind;
  readonly a: ShapeHandle;
  readonly b: ShapeHandle;
}

export interface FilletPayload {
  readonly nodeId: string;
  readonly handle: ShapeHandle;
  /**
   * The edge to round, addressed BY ITS IDENTITY — a `SubShapeRef` token, not an index into some
   * traversal. That is the whole point of persistent naming: "round *that* edge" must still mean the
   * same edge after the wall is resized and the model rebuilt.
   */
  readonly edge: string;
  /** Millimetres. */
  readonly radius: number;
}

/**
 * THE GEOMETRIC QUERIES (decision D23).
 *
 * An agent must be able to ask **spatial** questions — "what are the tight bounds of this element?",
 * "what is within 2 m of this column?", "is this point inside that wall?" — and the answers are in the
 * B-Rep, so they are kernel ops. They had to land **before the protocol freezes at the end of P3**;
 * afterwards, adding one is a contract amendment.
 *
 * ⚠ Two rules these obey, and they are the reason the ops look the way they do:
 *   1. **They return semantics, never triangles.** A query answers in millimetres and identities.
 *   2. **They read the B-Rep, never the mesh.** A tessellated column is smaller than the real one by
 *      its chord error; an agent reasoning about clearances from the mesh would confidently
 *      under-report every clash in the project.
 *
 * ⚠ Document-level queries ("which walls are on level 2?") need NO kernel op — they read the
 * parametric recipe, which is the source of truth. Only geometry comes here.
 */
export interface BoundsPayload {
  readonly handle: ShapeHandle;
  /**
   * Optional: the tight bounds of ONE named sub-shape (a `SubShapeRef` token) rather than of the
   * whole shape — "where exactly is the south face of that wall?". Omitted ⇒ the whole shape.
   */
  readonly ref?: string;
}

export interface BoundsResult {
  readonly bounds: Bounds;
}

export interface DistancePayload {
  readonly a: ShapeHandle;
  readonly b: ShapeHandle;
}

export interface DistanceResult {
  /** mm. **Zero means the two shapes touch or overlap** — which makes this the clash primitive too. */
  readonly distance: number;
  /** The two points that realise the minimum — i.e. WHERE they are closest. */
  readonly pointA: readonly [number, number, number];
  readonly pointB: readonly [number, number, number];
}

export interface ClassifyPointPayload {
  readonly handle: ShapeHandle;
  readonly point: readonly [number, number, number];
  /** mm. Defaults to the kernel's own tolerance. */
  readonly tolerance?: number;
}

export interface ClassifyPointResult {
  readonly state: 'inside' | 'outside' | 'on';
}

export interface ReleaseShapePayload {
  readonly handle: ShapeHandle;
}

export interface ReleaseShapeResult {
  readonly released: boolean;
  /** Live handles remaining — the heap telemetry that drives the soft budget (spec §6.2). */
  readonly liveHandles: number;
}

/** Forces a marshalled failure. Exists to prove the typed-failure path in CI (P1 step 4). */
export interface DemoFailurePayload {
  readonly code: KernelFailureCode;
  readonly message?: string;
}

/**
 * The single source of truth for op names and their payload/result types. Adding an op is adding
 * a line here — the dispatcher, the client and the mock all derive their types from this map.
 */
export interface OpMap {
  handshake: { payload: { readonly clientProtocolVersion: number }; result: HandshakeResult };
  kernelInfo: { payload: Record<string, never>; result: KernelInfo };
  echo: { payload: EchoPayload; result: EchoPayload };
  makeBox: { payload: MakeBoxPayload; result: ShapeResult };
  makeCylinder: { payload: MakeCylinderPayload; result: ShapeResult };
  boolean: { payload: BooleanPayload; result: ShapeResult };
  fillet: { payload: FilletPayload; result: ShapeResult };
  measure: { payload: MeasurePayload; result: MeasureResult };
  bounds: { payload: BoundsPayload; result: BoundsResult };
  distance: { payload: DistancePayload; result: DistanceResult };
  classifyPoint: { payload: ClassifyPointPayload; result: ClassifyPointResult };
  tessellate: { payload: TessellatePayload; result: MeshBuffers };
  releaseShape: { payload: ReleaseShapePayload; result: ReleaseShapeResult };
  demoFailure: { payload: DemoFailurePayload; result: never };
}

export type OpName = keyof OpMap;
export type OpPayload<Op extends OpName> = OpMap[Op]['payload'];
export type OpResult<Op extends OpName> = OpMap[Op]['result'];

export const OP_NAMES = [
  'handshake',
  'kernelInfo',
  'echo',
  'makeBox',
  'makeCylinder',
  'boolean',
  'fillet',
  'measure',
  'bounds',
  'distance',
  'classifyPoint',
  'tessellate',
  'releaseShape',
  'demoFailure',
] as const satisfies readonly OpName[];

export function isOpName(value: string): value is OpName {
  return (OP_NAMES as readonly string[]).includes(value);
}
