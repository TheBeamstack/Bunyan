/**
 * apps/web/src/bootstrap.ts — ⚠⚠ THE ONLY FILE IN THE PRODUCT THAT MAY CONSTRUCT A `KernelClient` (D19).
 *
 * `tests/d19-boundary.test.ts` allowlists exactly `apps/<app>/src/bootstrap.ts` for the kernel-client
 * import, and `@bunyan/document` does not even *depend* on the kernel client — so this rule is
 * structural, not a convention. Everything downstream receives narrow seams:
 *   • `DocumentContext` gets a `GeometryGateway` (a `KernelClient` satisfies it structurally) — for
 *     AUTHORING geometry, the only door (D19).
 *   • the renderer gets a `RenderGateway` — a read-only `tessellate`, for DISPLAY.
 *   • agents get `window.bunyan` — the command layer, versioned separately (D22).
 *
 * If you find yourself importing `@bunyan/kernel-client` anywhere else, stop: the capability you are
 * reaching for belongs behind a command (if it authors) or behind the render seam (if it only draws).
 */

import { KernelClient, WorkerTransport } from '@bunyan/kernel-client';
import {
  CORE_COMMANDS,
  DocumentContext,
  createAgentSurface,
  createRegistries,
} from '@bunyan/document';
import type { AgentSurface } from '@bunyan/document';

import { SCAFFOLD_TYPES } from './scaffold/types';
import { createRenderGateway } from './render/RenderGateway';
import type { RenderGateway } from './render/RenderGateway';

export interface KernelMeta {
  readonly name: string;
  readonly kernelVersion: string;
  readonly buildId: string;
}

export interface BunyanApp {
  readonly doc: DocumentContext;
  /** The read-only tessellation seam for the renderer. */
  readonly render: RenderGateway;
  /** What the kernel reported at handshake — build id feeds the service-worker cache key (D11). */
  readonly kernel: KernelMeta;
  readonly agent: AgentSurface;
  dispose(): void;
}

export async function bootstrap(): Promise<BunyanApp> {
  // The real OCCT kernel. Swapping it for the mock is this one URL (the transport-agnostic promise).
  const worker = new Worker(new URL('@bunyan/kernel-occt/worker', import.meta.url), {
    type: 'module',
  });
  const client = new KernelClient(new WorkerTransport(worker));

  // Booting instantiates a ~14 MB `.wasm`; the worker queues messages behind `ready`, so this awaits
  // the first real reply rather than a dropped one.
  const handshake = await client.handshake();

  const registries = createRegistries();
  for (const command of CORE_COMMANDS) registries.commands.register(command);
  for (const type of SCAFFOLD_TYPES) registries.types.register(type);

  const doc = new DocumentContext({ registries, geometry: client });

  // ⚠ The agent surface is CREATED here but NOT wired to `window` here. Under React StrictMode the boot
  // effect mounts twice, and the first (discarded) app is disposed before it is ever seeded — so wiring
  // `window.bunyan` inside `bootstrap()` would race the dead document onto the global (its scene empty,
  // its kernel already terminated). App wires `window.bunyan` on the SURVIVING app alone (D22).
  const agent = createAgentSurface(doc);

  const render = createRenderGateway(client);

  return {
    doc,
    render,
    kernel: {
      name: handshake.kernel.name,
      kernelVersion: handshake.kernel.kernelVersion,
      buildId: handshake.kernel.buildId,
    },
    agent,
    dispose(): void {
      client.dispose();
      worker.terminate();
    },
  };
}
