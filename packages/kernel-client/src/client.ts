// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `KernelClient` — the main thread's view of the kernel (spec §3).
 *
 * Responsibilities:
 *   - correlation ids and promise plumbing over a flat message protocol;
 *   - EDIT COALESCING: a newer request on the same `coalesceKey` supersedes an older in-flight one.
 *     OCCT calls are not interruptible mid-flight, so we cannot cancel the work — we settle the old
 *     promise as SUPERSEDED and DISCARD its result when it eventually arrives;
 *   - discarding a superseded result must not leak the shape it produced. Because the worker owns
 *     the WASM heap (spec §6.2), the client fires a `releaseShape` for any handle it drops on the
 *     floor. Without this, dragging a slider would leak one solid per intermediate frame.
 *   - typed failures: every rejection is a `KernelFailureError`, never a raw Error.
 */

import {
  KernelFailureError,
  PROTOCOL_VERSION,
  isCompatibleProtocol,
  kernelFailure,
} from '@bunyan/protocol';
import type {
  HandshakeResult,
  KernelResponse,
  OpName,
  OpPayload,
  OpResult,
} from '@bunyan/protocol';

import type { Transport } from './transport.js';

export interface RequestOptions {
  /** Requests sharing a key supersede one another (e.g. `"rebuild:wall-7"` while dragging). */
  readonly coalesceKey?: string;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
  readonly transfer?: Transferable[];
}

interface Pending {
  readonly op: OpName;
  readonly coalesceKey: string | undefined;
  readonly resolve: (value: never) => void;
  readonly reject: (reason: KernelFailureError) => void;
  timer: ReturnType<typeof setTimeout> | undefined;
  cleanup: (() => void) | undefined;
}

export interface KernelClientOptions {
  /** Default per-request timeout. A hostile IFC file or a pathological boolean must not hang the UI. */
  readonly defaultTimeoutMs?: number;
}

export class KernelClient {
  readonly #transport: Transport;
  readonly #pending = new Map<string, Pending>();
  /** correlationId -> in-flight request we no longer want the result of. */
  readonly #abandoned = new Set<string>();
  /** coalesceKey -> correlationId of the request currently in flight for that key. */
  readonly #inFlightByKey = new Map<string, string>();
  readonly #defaultTimeoutMs: number;
  #nextId = 0;
  #disposed = false;

  constructor(transport: Transport, options: KernelClientOptions = {}) {
    this.#transport = transport;
    this.#defaultTimeoutMs = options.defaultTimeoutMs ?? 30_000;
    this.#transport.onMessage((response) => {
      this.#onResponse(response);
    });
  }

  async request<Op extends OpName>(
    op: Op,
    payload: OpPayload<Op>,
    options: RequestOptions = {},
  ): Promise<OpResult<Op>> {
    if (this.#disposed) {
      throw new KernelFailureError(
        kernelFailure('KERNEL_NOT_READY', 'KernelClient is disposed', { op }),
      );
    }

    const correlationId = `c${this.#nextId++}`;
    const { coalesceKey } = options;

    if (coalesceKey !== undefined) {
      const previous = this.#inFlightByKey.get(coalesceKey);
      if (previous !== undefined) {
        this.#supersede(previous, coalesceKey);
      }
      this.#inFlightByKey.set(coalesceKey, correlationId);
    }

    return await new Promise<OpResult<Op>>((resolve, reject) => {
      const entry: Pending = {
        op,
        coalesceKey,
        resolve,
        reject,
        timer: undefined,
        cleanup: undefined,
      };

      const timeoutMs = options.timeoutMs ?? this.#defaultTimeoutMs;
      if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
        entry.timer = setTimeout(() => {
          this.#settleFailure(
            correlationId,
            kernelFailure('TIMEOUT', `Op "${op}" exceeded ${timeoutMs}ms`, { op }),
          );
        }, timeoutMs);
      }

      const { signal } = options;
      if (signal !== undefined) {
        const cancel = (): void => {
          this.#settleFailure(
            correlationId,
            kernelFailure('CANCELLED', `Op "${op}" was cancelled`, { op }),
          );
        };
        if (signal.aborted) {
          queueMicrotask(cancel);
        } else {
          signal.addEventListener('abort', cancel, { once: true });
          entry.cleanup = (): void => {
            signal.removeEventListener('abort', cancel);
          };
        }
      }

      this.#pending.set(correlationId, entry);

      this.#transport.send(
        {
          protocolVersion: PROTOCOL_VERSION,
          correlationId,
          op,
          payload,
          ...(coalesceKey !== undefined ? { coalesceKey } : {}),
        },
        options.transfer ?? [],
      );
    });
  }

  /** Verifies the kernel speaks our protocol before anything else is attempted. */
  async handshake(options: RequestOptions = {}): Promise<HandshakeResult> {
    const result = await this.request(
      'handshake',
      { clientProtocolVersion: PROTOCOL_VERSION },
      options,
    );
    if (!isCompatibleProtocol(result.protocolVersion)) {
      throw new KernelFailureError(
        kernelFailure(
          'PROTOCOL_VERSION_MISMATCH',
          `Client speaks protocol v${PROTOCOL_VERSION}, kernel speaks v${result.protocolVersion}`,
          { op: 'handshake' },
        ),
      );
    }
    return result;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    for (const correlationId of [...this.#pending.keys()]) {
      this.#settleFailure(
        correlationId,
        kernelFailure('CANCELLED', 'KernelClient disposed while op was in flight'),
      );
    }
    this.#transport.dispose();
  }

  get pendingCount(): number {
    return this.#pending.size;
  }

  #supersede(correlationId: string, coalesceKey: string): void {
    this.#settleFailure(
      correlationId,
      kernelFailure('SUPERSEDED', `Superseded by a newer edit on "${coalesceKey}"`),
    );
  }

  /**
   * Settles a pending request as failed and marks it abandoned, so the kernel's eventual reply is
   * dropped rather than delivered to a promise that has already rejected.
   */
  #settleFailure(correlationId: string, failure: ReturnType<typeof kernelFailure>): void {
    const entry = this.#pending.get(correlationId);
    if (entry === undefined) return;

    this.#forget(correlationId, entry);
    this.#abandoned.add(correlationId);
    entry.reject(new KernelFailureError(failure));
  }

  #forget(correlationId: string, entry: Pending): void {
    if (entry.timer !== undefined) clearTimeout(entry.timer);
    entry.cleanup?.();
    this.#pending.delete(correlationId);
    if (
      entry.coalesceKey !== undefined &&
      this.#inFlightByKey.get(entry.coalesceKey) === correlationId
    ) {
      this.#inFlightByKey.delete(entry.coalesceKey);
    }
  }

  #onResponse(response: KernelResponse): void {
    const { correlationId } = response;

    if (this.#abandoned.delete(correlationId)) {
      this.#discard(response);
      return;
    }

    const entry = this.#pending.get(correlationId);
    if (entry === undefined) return; // Unknown or already-settled correlation id: ignore.

    this.#forget(correlationId, entry);

    if (response.ok) {
      entry.resolve(response.result as never);
    } else {
      entry.reject(new KernelFailureError(response.failure));
    }
  }

  /**
   * A result nobody is waiting for. If it carries a `ShapeHandle`, the worker is holding WASM heap
   * for a solid that will never be used — release it (spec §6.2).
   */
  #discard(response: KernelResponse): void {
    if (!response.ok || this.#disposed) return;

    const result = response.result as { handle?: unknown };
    if (typeof result?.handle !== 'string') return;

    this.#transport.send({
      protocolVersion: PROTOCOL_VERSION,
      correlationId: `gc${this.#nextId++}`,
      op: 'releaseShape',
      payload: { handle: result.handle },
    });
  }
}
