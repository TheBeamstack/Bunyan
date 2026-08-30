// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Transports — the only place that knows *where* the kernel lives.
 *
 * `KernelClient` talks to a `Transport`, never to a Worker directly. Swapping a Web Worker for an
 * in-process kernel (headless tests, CI) or — later — an HTTP/WebSocket connection to a server-side
 * kernel is a change of Transport and nothing else.
 */

import type { KernelRequest, KernelResponse } from '@bunyan/protocol';

export interface Transport {
  send(request: KernelRequest, transfer?: Transferable[]): void;
  onMessage(handler: (response: KernelResponse) => void): void;
  dispose(): void;
}

/** Structural shape of a `KernelHost`, so this package needn't depend on `@bunyan/kernel-core`. */
export interface KernelLike {
  handle(raw: unknown): Promise<KernelResponse>;
  dispose?(): void;
}

export class WorkerTransport implements Transport {
  readonly #worker: Worker;
  #handler: ((response: KernelResponse) => void) | undefined;

  constructor(worker: Worker) {
    this.#worker = worker;
    this.#worker.addEventListener('message', (event: MessageEvent<KernelResponse>) => {
      this.#handler?.(event.data);
    });
  }

  send(request: KernelRequest, transfer: Transferable[] = []): void {
    this.#worker.postMessage(request, transfer);
  }

  onMessage(handler: (response: KernelResponse) => void): void {
    this.#handler = handler;
  }

  dispose(): void {
    this.#worker.terminate();
  }
}

/**
 * Runs the kernel in the calling process. Used by the headless test suite and CI (no browser on
 * the build box) — and it is the same code path a server-side kernel would use.
 */
export class InProcessTransport implements Transport {
  readonly #kernel: KernelLike;
  #handler: ((response: KernelResponse) => void) | undefined;

  constructor(kernel: KernelLike) {
    this.#kernel = kernel;
  }

  send(request: KernelRequest): void {
    void this.#kernel.handle(request).then((response) => {
      // Stay asynchronous even in-process: the client's coalescing/cancellation logic must not
      // accidentally depend on a synchronous reply that the real Worker transport can never give.
      queueMicrotask(() => this.#handler?.(response));
    });
  }

  onMessage(handler: (response: KernelResponse) => void): void {
    this.#handler = handler;
  }

  dispose(): void {
    this.#kernel.dispose?.();
  }
}
