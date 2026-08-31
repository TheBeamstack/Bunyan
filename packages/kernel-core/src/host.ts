// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `KernelHost` — the operation-failure marshaller and op dispatcher (architecture §2, §7).
 *
 * The host is deliberately TRANSPORT-AGNOSTIC: it maps a `KernelRequest` to a `KernelResponse`
 * and knows nothing about `postMessage`, Workers or the DOM. Three consequences that matter:
 *
 *   1. The same host runs inside a Web Worker (production), in-process (tests), or — later —
 *      on a server or in native code. That is the headless-kernel north-star, made concrete.
 *   2. It can be exercised headlessly in CI on a box with no browser.
 *   3. `handle()` NEVER throws and never rejects. Every failure path — bad payload, unknown op,
 *      an OCCT `Standard_Failure` marshalled by Emscripten as a bare pointer — comes back as a
 *      typed `Fail` (spec §6.4, decision D10).
 */

import {
  KernelFailureError,
  PROTOCOL_VERSION,
  isCompatibleProtocol,
  isKernelRequest,
  isOpName,
  kernelFailure,
  toKernelFailure,
} from '@bunyan/protocol';
import type {
  KernelFail,
  KernelInfo,
  KernelResponse,
  OpName,
  OpPayload,
  OpResult,
} from '@bunyan/protocol';

export type OpHandler<Op extends OpName> = (
  payload: OpPayload<Op>,
) => OpResult<Op> | Promise<OpResult<Op>>;

/** A kernel implements the ops it supports; the host supplies dispatch, validation and marshalling. */
export type OpHandlers = {
  [Op in OpName]?: OpHandler<Op>;
};

export interface KernelImplementation {
  readonly info: KernelInfo;
  readonly handlers: OpHandlers;
  dispose?(): void;
}

export class KernelHost {
  readonly #impl: KernelImplementation;

  constructor(impl: KernelImplementation) {
    this.#impl = impl;
  }

  get info(): KernelInfo {
    return this.#impl.info;
  }

  async handle(raw: unknown): Promise<KernelResponse> {
    if (!isKernelRequest(raw)) {
      return this.#fail(
        'unknown',
        'unknown',
        kernelFailure('INVALID_PAYLOAD', 'Message is not a well-formed KernelRequest'),
      );
    }

    const { correlationId, op } = raw;

    if (!isCompatibleProtocol(raw.protocolVersion)) {
      return this.#fail(
        correlationId,
        op,
        kernelFailure(
          'PROTOCOL_VERSION_MISMATCH',
          `Kernel speaks protocol v${PROTOCOL_VERSION}, client sent v${raw.protocolVersion}`,
          { op, detail: { kernel: PROTOCOL_VERSION, client: raw.protocolVersion } },
        ),
      );
    }

    if (!isOpName(op)) {
      return this.#fail(
        correlationId,
        op,
        kernelFailure('UNKNOWN_OP', `Unknown op "${op}"`, { op }),
      );
    }

    try {
      // The payload is untrusted until the handler validates it — each handler owns its own
      // payload check and raises INVALID_PAYLOAD (see the mock's `requireFinitePositive`).
      const result = await this.#invoke(op, raw.payload as OpPayload<OpName>);
      // Dispatch erases the op↔result correlation that `AnyKernelOk` encodes; the handler map in
      // `OpHandlers` is what actually enforces it. This is the one place the assertion is earned.
      return {
        protocolVersion: PROTOCOL_VERSION,
        correlationId,
        op,
        ok: true,
        result,
      } as KernelResponse;
    } catch (thrown) {
      // The one place that guarantees no exception escapes the kernel boundary.
      return this.#fail(correlationId, op, toKernelFailure(thrown, op));
    }
  }

  dispose(): void {
    this.#impl.dispose?.();
  }

  async #invoke(op: OpName, payload: OpPayload<OpName>): Promise<OpResult<OpName>> {
    // `handshake` and `kernelInfo` are answered by the host itself: a kernel must be able to
    // report who it is before it can do anything else, including when it failed to boot.
    if (op === 'handshake') {
      return { protocolVersion: PROTOCOL_VERSION, kernel: this.#impl.info };
    }
    if (op === 'kernelInfo') {
      return this.#impl.info;
    }

    const handler = this.#impl.handlers[op] as OpHandler<OpName> | undefined;
    if (handler === undefined) {
      throw new KernelFailureError(
        kernelFailure(
          'UNKNOWN_OP',
          `Op "${op}" is not implemented by kernel "${this.#impl.info.name}"`,
          {
            op,
          },
        ),
      );
    }
    return await handler(payload);
  }

  #fail(correlationId: string, op: string, failure: ReturnType<typeof kernelFailure>): KernelFail {
    return { protocolVersion: PROTOCOL_VERSION, correlationId, op, ok: false, failure };
  }
}
