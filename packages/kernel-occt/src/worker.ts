// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Worker entry point for the REAL OCCT kernel.
 *
 * Compare it to `@bunyan/kernel-mock/worker`: same shape, one import different. That is the promise
 * the transport-agnostic design made, kept — to move the browser off the mock and onto real geometry,
 * Amer changes the Worker URL and nothing else.
 *
 * The one real difference: booting the kernel means instantiating a 4 MB WebAssembly module, which is
 * asynchronous. Messages that arrive during boot are queued behind `ready` rather than dropped — a
 * dropped handshake would look exactly like a hung kernel.
 */

import { meshTransferables } from '@bunyan/protocol';
import type { KernelResponse } from '@bunyan/protocol';

import { createOcctKernelHost } from './kernel.js';

const ready = createOcctKernelHost();

/** Mesh buffers are MOVED, not copied — a multi-MB tessellation must not be cloned. */
function transferablesFor(res: KernelResponse): Transferable[] {
  if (!res.ok || res.op !== 'tessellate') return [];
  return meshTransferables(res.result);
}

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  void ready
    .then((host) => host.handle(event.data))
    .then((res) => {
      self.postMessage(res, { transfer: transferablesFor(res) });
    });
});
