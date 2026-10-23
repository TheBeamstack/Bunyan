// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-057 — the app's open path restores a stored `.bnn`'s geometry cache under this install's secret
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §2e, §4). Real OCCT, the app's own `readInitial` and
 * `documentOptions` (what `bootstrap.ts` hands `DocumentContext`), over a `MemoryStore`.
 *
 * REVERT-VERIFY: drop `geometryCache` from `documentOptions` and "restores" goes red (T-057 handoff).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  MemoryStore,
  createRegistries,
  saveBnn,
} from '@bunyan/document';
import type { GeometryGateway, Registries, Scene } from '@bunyan/document';
import { wallType } from '@bunyan/types';

import { documentOptions } from '../apps/web/src/documentOptions';
import { installSecret, readInitial } from '../apps/web/src/storage/documentStorage';

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';

describe('T-057 — opening a stored .bnn through the app path restores its geometry cache', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let scene: Scene;
  let roots: string[];
  let store: MemoryStore;
  let secret: Uint8Array;
  const live: DocumentContext[] = [];

  const registries = (): Registries => {
    const r = createRegistries();
    r.types.register(wallType);
    for (const command of CORE_COMMANDS) r.commands.register(command);
    return r;
  };

  /** Every op the doc sends the kernel. */
  const spying = (): { gateway: GeometryGateway; ops: string[] } => {
    const ops: string[] = [];
    return {
      ops,
      gateway: {
        request: (op, payload, options) => {
          ops.push(op);
          return client.request(op, payload, options);
        },
      },
    };
  };

  /** The app's open: `readInitial` from the store, then the options `bootstrap` builds. */
  const open = async (
    key: string,
    gateway: GeometryGateway,
    withSecret: Uint8Array,
  ): Promise<DocumentContext> => {
    const initial = await readInitial(store, key);
    const doc = new DocumentContext(
      documentOptions(registries(), gateway, KERNEL_BUILD_ID, initial, withSecret),
    );
    live.push(doc);
    return doc;
  };

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
    store = new MemoryStore();
    secret = await installSecret(store);

    const doc = new DocumentContext(documentOptions(registries(), client, KERNEL_BUILD_ID));
    live.push(doc);
    await doc.execute('core.createMaterial', {
      id: 'concrete',
      name: 'C25/30',
      category: 'concrete',
      density: 2400,
    });
    await doc.execute('core.createContainer', {
      id: 'l1',
      kind: 'level',
      name: 'L1',
      elevation: 0,
    });
    await doc.execute('core.createStyle', {
      id: 'EXT',
      name: 'EXT',
      typeId: wallType.id,
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
      ],
    });
    for (const x of [0, 10_000]) {
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        styleId: 'EXT',
        containerId: 'l1',
        params: { start: [x, 0], end: [x + 4000, 0], height: 3000 },
      });
    }
    scene = doc.scene;
    roots = Object.keys(scene.elements).sort();

    // A booted app's doc: built, exported in idle time, saved with its cache (T-059's job in the app).
    const built = new DocumentContext(
      documentOptions(registries(), client, KERNEL_BUILD_ID, { scene }, secret),
    );
    live.push(built);
    await built.rebuildAll();
    while ((await built.exportCacheIdle(8)) > 0);
    const cache = built.geometryCacheFiles();
    expect(cache?.['index.json']).toBeDefined();
    await store.write('doc/cached.bnn', saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, cache }));
    await store.write('doc/plain.bnn', saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID }));
  }, 180_000);

  afterAll(async () => {
    for (const doc of live) await doc.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  it('a file signed with the stored secret restores: rebuildOnly sends only importBrep', async () => {
    const spy = spying();
    const doc = await open('doc/cached.bnn', spy.gateway, await installSecret(store));
    await doc.rebuildOnly(roots);
    expect(spy.ops.length).toBeGreaterThan(0);
    expect(new Set(spy.ops)).toEqual(new Set(['importBrep']));
    for (const root of roots) expect(doc.geometryOf(root)?.state).toBe('valid');
  });

  it("another install's secret restores nothing: every root builds", async () => {
    const spy = spying();
    const doc = await open('doc/cached.bnn', spy.gateway, new Uint8Array(32).fill(9));
    await doc.rebuildOnly(roots);
    expect(spy.ops).not.toContain('importBrep');
    for (const root of roots) expect(doc.geometryOf(root)?.state).toBe('valid');
  });

  it('a file without geometry-cache/ opens as today: no cache, every root builds', async () => {
    const initial = await readInitial(store, 'doc/plain.bnn');
    expect(initial?.cache).toBeUndefined();
    const spy = spying();
    const doc = await open('doc/plain.bnn', spy.gateway, secret);
    await doc.rebuildOnly(roots);
    expect(spy.ops).not.toContain('importBrep');
    for (const root of roots) expect(doc.geometryOf(root)?.state).toBe('valid');
  });
});
