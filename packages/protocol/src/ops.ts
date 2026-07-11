/**
 * The operation set of protocol v1.
 *
 * P1 scope: enough to prove the seam end to end (handshake, echo/transferables, a real solid,
 * tessellation with provenance, handle lifecycle, and a deliberately-failing op). P2 grows this
 * with the rest of the primitives, booleans and fillets — additively, without reshaping the envelope.
 */

import type { Bounds, MeshBuffers } from './mesh.js';
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
  'tessellate',
  'releaseShape',
  'demoFailure',
] as const satisfies readonly OpName[];

export function isOpName(value: string): value is OpName {
  return (OP_NAMES as readonly string[]).includes(value);
}
