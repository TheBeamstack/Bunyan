/**
 * The dispatcher contract (spec §3, §6.2): correlation, coalescing, cancellation, and the
 * memory discipline that keeps a superseded edit from leaking a solid on the WASM heap.
 */

import { describe, expect, it, vi } from 'vitest';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createMockKernelHost } from '@bunyan/kernel-mock';
import { PROTOCOL_VERSION, isKernelFailureError } from '@bunyan/protocol';
import type { Transport } from '@bunyan/kernel-client';

function connect(): KernelClient {
  return new KernelClient(new InProcessTransport(createMockKernelHost()));
}

describe('KernelClient round-trip', () => {
  it('handshakes and reports the kernel identity', async () => {
    const client = connect();
    const info = await client.handshake();

    expect(info.protocolVersion).toBe(PROTOCOL_VERSION);
    expect(info.kernel.name).toBe('mock');
    client.dispose();
  });

  it('builds a solid and gets back a handle plus its assigned identities', async () => {
    const client = connect();
    const box = await client.request('makeBox', { nodeId: 'wall-1', dx: 3000, dy: 200, dz: 2500 });

    expect(box.handle).toMatch(/^mock:/);
    expect(box.bounds).toEqual({ min: [0, 0, 0], max: [3000, 200, 2500] });
    expect(box.refs).toHaveLength(18); // 6 faces + 12 edges
    client.dispose();
  });

  it('rejects with a typed KernelFailureError, not a bare Error', async () => {
    const client = connect();
    await expect(client.request('demoFailure', { code: 'EMPTY_BOOLEAN_RESULT' })).rejects.toSatisfy(
      (e: unknown) => isKernelFailureError(e) && e.failure.code === 'EMPTY_BOOLEAN_RESULT',
    );
    client.dispose();
  });

  it('leaves no pending requests behind after settling', async () => {
    const client = connect();
    await client.request('echo', { note: 'hello' });
    expect(client.pendingCount).toBe(0);
    client.dispose();
  });
});

describe('edit coalescing (spec §3)', () => {
  it('supersedes an older in-flight request on the same coalesce key', async () => {
    const client = connect();

    const stale = client.request(
      'makeBox',
      { nodeId: 'w', dx: 100, dy: 100, dz: 100 },
      {
        coalesceKey: 'rebuild:w',
      },
    );
    const fresh = client.request(
      'makeBox',
      { nodeId: 'w', dx: 3000, dy: 200, dz: 2500 },
      {
        coalesceKey: 'rebuild:w',
      },
    );

    await expect(stale).rejects.toSatisfy(
      (e: unknown) => isKernelFailureError(e) && e.failure.code === 'SUPERSEDED',
    );
    const winner = await fresh;
    expect(winner.bounds.max).toEqual([3000, 200, 2500]);

    client.dispose();
  });

  it('does NOT leak the superseded result: its shape handle is released in the worker', async () => {
    // This is spec §6.2 made testable. Drag a slider and every intermediate solid the kernel
    // finished building is a solid nobody wants — if the client just drops the message, the WASM
    // heap grows for the whole drag. The client must hand the orphaned handle back.
    const host = createMockKernelHost();
    const client = new KernelClient(new InProcessTransport(host));

    const stale = client.request(
      'makeBox',
      { nodeId: 'w', dx: 100, dy: 100, dz: 100 },
      {
        coalesceKey: 'rebuild:w',
      },
    );
    const fresh = client.request(
      'makeBox',
      { nodeId: 'w', dx: 3000, dy: 200, dz: 2500 },
      {
        coalesceKey: 'rebuild:w',
      },
    );

    await expect(stale).rejects.toThrow();
    await fresh;

    // Let the discard-and-release round-trip flush.
    await new Promise((resolve) => setTimeout(resolve, 10));

    const release = await host.handle({
      protocolVersion: PROTOCOL_VERSION,
      correlationId: 'probe',
      op: 'releaseShape',
      payload: { handle: 'does-not-exist' },
    });

    expect(release.ok).toBe(true);
    if (!release.ok) return;
    // Only the winner's shape is still alive; the superseded one was collected.
    expect((release.result as { liveHandles: number }).liveHandles).toBe(1);

    client.dispose();
  });
});

describe('cancellation & timeouts', () => {
  it('rejects as CANCELLED when the caller aborts', async () => {
    const client = connect();
    const controller = new AbortController();
    const pending = client.request('echo', { note: 'x' }, { signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toSatisfy(
      (e: unknown) => isKernelFailureError(e) && e.failure.code === 'CANCELLED',
    );
    client.dispose();
  });

  it('rejects as TIMEOUT when the kernel never answers', async () => {
    vi.useFakeTimers();
    // A transport that swallows everything: the kernel has hung (a pathological boolean, a
    // hostile IFC file). The UI must not hang with it.
    const silent: Transport = {
      send: () => {},
      onMessage: () => {},
      dispose: () => {},
    };
    const client = new KernelClient(silent, { defaultTimeoutMs: 5_000 });

    const pending = client.request('echo', { note: 'x' });
    const assertion = expect(pending).rejects.toSatisfy(
      (e: unknown) => isKernelFailureError(e) && e.failure.code === 'TIMEOUT',
    );
    await vi.advanceTimersByTimeAsync(5_001);
    await assertion;

    vi.useRealTimers();
  });
});
