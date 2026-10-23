// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/** The zip worker's entry (T-058): `handleZipRequest` per message; the reply's bytes are transferred. */

import { handleZipRequest, type ZipRequest } from './bnnZip';

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.addEventListener('message', (event: MessageEvent<ZipRequest>) => {
  const reply = handleZipRequest(event.data);
  scope.postMessage(reply, 'bytes' in reply ? [reply.bytes.buffer] : []);
});
