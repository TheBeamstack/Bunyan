// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The message envelope (architecture §3).
 *
 * `{ protocolVersion, correlationId, op, payload }` → `{ correlationId, ok, result | failure }`.
 * Flat and engine-agnostic on purpose: an object-reference API would couple the UI to the
 * kernel's process, language and memory. This shape can be implemented unchanged by a future
 * server-side or native C++ kernel — that is the headless-kernel north-star.
 */

import type { KernelFailure } from './failures.js';
import type { OpName, OpPayload, OpResult } from './ops.js';

export interface KernelRequest<Op extends OpName = OpName> {
  readonly protocolVersion: number;
  readonly correlationId: string;
  readonly op: Op;
  readonly payload: OpPayload<Op>;
  /**
   * Requests sharing a coalesce key supersede one another: a newer edit on the same key makes an
   * older in-flight request's result stale, and the dispatcher DISCARDS it (spec §3). OCCT calls
   * are not interruptible mid-flight, so we drop the stale output rather than block.
   */
  readonly coalesceKey?: string;
}

export interface KernelOk<Op extends OpName = OpName> {
  readonly protocolVersion: number;
  readonly correlationId: string;
  readonly op: Op;
  readonly ok: true;
  readonly result: OpResult<Op>;
}

export interface KernelFail {
  readonly protocolVersion: number;
  readonly correlationId: string;
  readonly op: string;
  readonly ok: false;
  readonly failure: KernelFailure;
}

/**
 * Distributing over `OpName` makes `op` a real discriminant, so `res.op === 'tessellate'` narrows
 * `res.result` to `MeshBuffers`. Without this, every consumer that needs the concrete result type
 * (the worker's transfer list, the client's handle bookkeeping) has to cast — and a cast at the
 * message boundary is exactly where a protocol bug would hide.
 */
export type AnyKernelOk = { [Op in OpName]: KernelOk<Op> }[OpName];

export type KernelResponse = AnyKernelOk | KernelFail;

export function isOk(res: KernelResponse): res is AnyKernelOk {
  return res.ok;
}

export function isFail(res: KernelResponse): res is KernelFail {
  return !res.ok;
}

/**
 * A message that is structurally an envelope but whose `op` and `payload` are still UNTRUSTED.
 *
 * Deliberately distinct from `KernelRequest`: anything can arrive at the worker boundary, so the
 * type must not pretend the op is one we support until `isOpName` has actually said so.
 */
export interface RawKernelRequest {
  readonly protocolVersion: number;
  readonly correlationId: string;
  readonly op: string;
  readonly payload: unknown;
  readonly coalesceKey?: string;
}

/** Structural check on an inbound message. The worker boundary treats input as untrusted. */
export function isKernelRequest(value: unknown): value is RawKernelRequest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['protocolVersion'] === 'number' &&
    typeof v['correlationId'] === 'string' &&
    typeof v['op'] === 'string' &&
    'payload' in v
  );
}

export function isKernelResponse(value: unknown): value is KernelResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['protocolVersion'] === 'number' &&
    typeof v['correlationId'] === 'string' &&
    typeof v['ok'] === 'boolean'
  );
}
