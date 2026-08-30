// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The operation-failure contract (spec §6.4, decision D10).
 *
 * The single most important property of the kernel boundary: `handle()` NEVER throws and NEVER
 * rejects. Every failure — malformed message, unknown op, version skew, an OCCT exception that
 * Emscripten surfaces as a bare integer — comes back as a typed `Fail`.
 */

import { describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { createMockKernel, createMockKernelHost } from '@bunyan/kernel-mock';
import { PROTOCOL_VERSION } from '@bunyan/protocol';
import type { KernelImplementation } from '@bunyan/kernel-core';

const req = (op: string, payload: unknown, overrides: Record<string, unknown> = {}): unknown => ({
  protocolVersion: PROTOCOL_VERSION,
  correlationId: 'c1',
  op,
  payload,
  ...overrides,
});

describe('KernelHost failure marshalling', () => {
  it('answers a handshake with its identity and protocol version', async () => {
    const host = createMockKernelHost();
    const res = await host.handle(req('handshake', { clientProtocolVersion: PROTOCOL_VERSION }));

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result).toMatchObject({
      protocolVersion: PROTOCOL_VERSION,
      kernel: { name: 'mock', threading: 'single' },
    });
  });

  it('returns a typed failure for a malformed message instead of throwing', async () => {
    const host = createMockKernelHost();
    const res = await host.handle({ nonsense: true });

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe('INVALID_PAYLOAD');
  });

  it('rejects a protocol version it does not speak', async () => {
    const host = createMockKernelHost();
    const res = await host.handle(req('echo', { note: 'hi' }, { protocolVersion: 999 }));

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe('PROTOCOL_VERSION_MISMATCH');
    expect(res.failure.detail).toMatchObject({ kernel: PROTOCOL_VERSION, client: 999 });
  });

  it('rejects an unknown op', async () => {
    const host = createMockKernelHost();
    const res = await host.handle(req('launchMissiles', {}));

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe('UNKNOWN_OP');
  });

  it('marshals a typed OCCT-style failure raised inside a handler', async () => {
    const host = createMockKernelHost();
    const res = await host.handle(req('demoFailure', { code: 'FILLET_RADIUS_TOO_LARGE' }));

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe('FILLET_RADIUS_TOO_LARGE');
    expect(res.failure.op).toBe('demoFailure');
  });

  it('marshals a NON-Error throw — OCCT/Emscripten throws bare pointers, not Errors', async () => {
    const hostile: KernelImplementation = {
      ...createMockKernel(),
      handlers: {
        echo: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 4294967296; // what an unhandled Standard_Failure actually looks like from WASM
        },
      },
    };
    const res = await new KernelHost(hostile).handle(req('echo', { note: 'x' }));

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe('OCCT_STANDARD_FAILURE');
    expect(res.failure.message).toBe('4294967296');
  });

  it('rejects invalid geometry parameters before touching the kernel', async () => {
    const host = createMockKernelHost();
    const res = await host.handle(req('makeBox', { nodeId: 'n1', dx: 0, dy: 100, dz: 100 }));

    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.code).toBe('INVALID_PAYLOAD');
  });
});
