// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Worker entry point for the mock kernel.
 *
 * Note how thin this is. All the kernel logic lives in the transport-agnostic `KernelHost`; this
 * file is only the `postMessage` transport. The real OCCT worker will be the same few lines with a
 * different `KernelImplementation` — which is what keeps the kernel relocatable to a server or to
 * native code without touching the UI (architecture §3).
 */

import { meshTransferables } from '@bunyan/protocol';
import type { KernelResponse } from '@bunyan/protocol';

import { createMockKernelHost } from './kernel.js';

const host = createMockKernelHost();

/** Mesh buffers are MOVED, not copied — a multi-MB tessellation must not be cloned. */
function transferablesFor(res: KernelResponse): Transferable[] {
  if (!res.ok || res.op !== 'tessellate') return [];
  return meshTransferables(res.result);
}

self.addEventListener('message', (event: MessageEvent<unknown>) => {
  void host.handle(event.data).then((res) => {
    self.postMessage(res, { transfer: transferablesFor(res) });
  });
});
