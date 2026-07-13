/**
 * @bunyan/protocol — the kernel message contract.
 *
 * This package has ZERO dependencies and no runtime environment assumptions (no DOM, no Worker,
 * no OCCT). That is deliberate: it is the seam that both the browser client and any future
 * server-side/native kernel implement, so it must be importable from anywhere.
 */

export { PROTOCOL_VERSION, isCompatibleProtocol } from './version.js';

export {
  KERNEL_FAILURE_CODES,
  KernelFailureError,
  isKernelFailureError,
  kernelFailure,
  toKernelFailure,
} from './failures.js';
export type { KernelFailure, KernelFailureCode } from './failures.js';

export {
  compareSubShapeRefs,
  decodeSubShapeRef,
  encodeSubShapeRef,
  subShapeRefsEqual,
} from './subshape.js';
export type { SubShapeKind, SubShapeRef } from './subshape.js';

export { faceRefForTriangle, meshTransferables, triangleCount } from './mesh.js';
export type { Bounds, EdgePolyline, MeshBuffers, MeshProvenance, Vec3 } from './mesh.js';

export { OP_NAMES, INFRASTRUCTURE_OPS, capabilitiesOf, isOpName } from './ops.js';
export type {
  BooleanKind,
  BooleanPayload,
  BoundsPayload,
  BoundsResult,
  ChamferPayload,
  ClassifyPointPayload,
  ClassifyPointResult,
  DemoFailurePayload,
  DistancePayload,
  DistanceResult,
  EchoPayload,
  ExtrudePayload,
  FilletPayload,
  HandshakeResult,
  KernelInfo,
  MakeBoxPayload,
  MakeCylinderPayload,
  MeasurePayload,
  MeasureResult,
  OpMap,
  OpName,
  OpPayload,
  OpResult,
  Profile,
  ProfileSegment,
  ReleaseShapePayload,
  ReleaseShapeResult,
  RevolvePayload,
  RigidMotion,
  ShapeHandle,
  ShapeResult,
  TransformPayload,
  TessellatePayload,
  Vec2,
} from './ops.js';

export { isFail, isKernelRequest, isKernelResponse, isOk } from './envelope.js';
export type {
  AnyKernelOk,
  KernelFail,
  KernelOk,
  KernelRequest,
  KernelResponse,
  RawKernelRequest,
} from './envelope.js';
