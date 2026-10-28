// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-059 — the app exports built assemblies in idle time, and a named save carries the geometry cache
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §5, R4/R7). Real OCCT, the app's `documentOptions`,
 * `createIdleCacheExporter` under a hand-driven idle scheduler and `createDocLock`, and the app's named
 * save (`namedSaveOptions` → `saveDocument`) reopened through T-057's `readInitial`.
 *
 * REVERT-VERIFY: `namedSaveOptions` without `cache` turns "carries a verified index" and "restores" red;
 * `run` calling `doc.exportCacheIdle(1)` outside `lock.run` turns "never alongside an edit" red.
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
  cacheInputKeys,
  createRegistries,
  loadBnn,
  verifyCacheIndex,
} from '@bunyan/document';
import type { GeometryGateway, GeometryCacheIndex, Registries } from '@bunyan/document';
import { wallType } from '@bunyan/types';

import { documentOptions } from '../apps/web/src/documentOptions';
import { createDocLock, type DocLock } from '../apps/web/src/edit/docLock';
import { createBnnZipper, handleZipRequest, type ZipPort } from '../apps/web/src/storage/bnnZip';
import {
  installSecret,
  namedSaveOptions,
  readInitial,
  saveDocument,
} from '../apps/web/src/storage/documentStorage';
import {
  createIdleCacheExporter,
  type IdleCacheExporter,
} from '../apps/web/src/storage/idleCacheExport';

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';

/** A worker stand-in running the worker's own handler on a later tick, as T-058's test does. */
const zipPort = (): ZipPort => {
  const listeners: ((event: { data: ReturnType<typeof handleZipRequest> }) => void)[] = [];
  return {
    postMessage(message): void {
      setTimeout(() => {
        const reply = handleZipRequest(structuredClone(message));
        for (const listener of listeners) listener({ data: reply });
      }, 0);
    },
    addEventListener(type: string, listener: (event: never) => void): void {
      if (type === 'message') listeners.push(listener as (typeof listeners)[number]);
    },
  };
};

/** Idle time, by hand: `pending` holds what the exporter scheduled; `runOne` fires the oldest. */
const fakeIdle = () => {
  const pending: (() => void)[] = [];
  return {
    pending,
    schedule: (task: () => void) => {
      pending.push(task);
      return () => {
        const i = pending.indexOf(task);
        if (i >= 0) pending.splice(i, 1);
      };
    },
    runOne: () => pending.shift()?.(),
  };
};

/** Let every queued lock task and its `.then` settle. */
const settle = async (lock: DocLock): Promise<void> => {
  await lock.run(() => Promise.resolve());
  await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('T-059 — idle export in the app, and a named save that carries the cache', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let store: MemoryStore;
  let secret: Uint8Array;
  const ops: string[] = [];
  const live: DocumentContext[] = [];

  const registries = (): Registries => {
    const r = createRegistries();
    r.types.register(wallType);
    for (const command of CORE_COMMANDS) r.commands.register(command);
    return r;
  };
  const gateway: GeometryGateway = {
    request: (op, payload, options) => {
      ops.push(op);
      return client.request(op, payload, options);
    },
  };

  /** A booted app's doc with two walls, every commit built and queued for export. */
  const twoWalls = async (): Promise<{ doc: DocumentContext; walls: string[] }> => {
    const doc = new DocumentContext(
      documentOptions(registries(), gateway, KERNEL_BUILD_ID, undefined, secret),
    );
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
    return { doc, walls: Object.keys(doc.scene.elements).sort() };
  };

  /** Drive idle time until the exporter schedules nothing more; returns how many idle runs fired. */
  const drain = async (idle: ReturnType<typeof fakeIdle>, lock: DocLock): Promise<number> => {
    let runs = 0;
    while (idle.pending.length > 0) {
      idle.runOne();
      runs++;
      await settle(lock);
    }
    return runs;
  };

  const save = async (doc: DocumentContext, name: string): Promise<string> =>
    saveDocument(
      store,
      name,
      doc.scene,
      namedSaveOptions(doc, KERNEL_BUILD_ID),
      createBnnZipper(zipPort()),
    );

  /** A stored file's `index.json` as parsed JSON, the shape `verifyCacheIndex` reads. */
  type ParsedIndex = Pick<GeometryCacheIndex, 'records'> & { envelope: Record<string, unknown> };
  const indexOf = async (key: string): Promise<ParsedIndex | undefined> => {
    const pkg = loadBnn((await store.read(key))!);
    const bytes = pkg.cache?.read('index.json');
    return bytes === undefined
      ? undefined
      : (JSON.parse(new TextDecoder().decode(bytes)) as ParsedIndex);
  };

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
    store = new MemoryStore();
    secret = await installSecret(store);
  }, 180_000);

  afterAll(async () => {
    for (const doc of live) await doc.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  let exporter: IdleCacheExporter | undefined;
  const exporterFor = (doc: DocumentContext, lock: DocLock, idle: ReturnType<typeof fakeIdle>) => {
    const counted: number[] = [];
    exporter?.dispose();
    exporter = createIdleCacheExporter(
      {
        exportCacheIdle: async (n) => {
          const waiting = await doc.exportCacheIdle(n);
          counted.push(waiting);
          return waiting;
        },
      },
      lock,
      idle.schedule,
    );
    return counted;
  };

  it('one edit queues that root, the idle runs drain it, and a save carries a verified index', async () => {
    const { doc, walls } = await twoWalls();
    const lock = createDocLock();
    const idle = fakeIdle();
    const counted = exporterFor(doc, lock, idle);
    exporter!.kick();
    expect(idle.pending.length, 'one idle run scheduled, not one per kick').toBe(1);
    exporter!.kick();
    expect(idle.pending.length).toBe(1);
    expect(await drain(idle, lock), 'both walls, one per idle run').toBe(2);
    expect(counted).toEqual([1, 0]);

    await lock.run(() =>
      doc.execute('core.setParams', { elementId: walls[0]!, params: { height: 3200 } }),
    );
    exporter!.kick();
    ops.length = 0;
    expect(await drain(idle, lock), 'the edited wall alone').toBe(1);
    expect(counted.slice(2)).toEqual([0]);
    expect(ops).toContain('exportBrep');

    const key = await save(doc, 'idle');
    const index = await indexOf(key);
    expect(index, 'the save carries geometry-cache/index.json').toBeDefined();
    expect(verifyCacheIndex(index!.envelope, index!.records, secret), 'verifies here').toBe(true);
    expect(verifyCacheIndex(index!.envelope, index!.records, new Uint8Array(32).fill(9))).toBe(
      false,
    );
    const keys = cacheInputKeys(doc.scene);
    expect(Object.keys(index!.records).sort()).toEqual(walls);
    for (const wall of walls) expect(index!.records[wall]!.key).toBe(keys.get(wall));
  }, 180_000);

  it('the export takes the doc lock and never runs alongside an edit', async () => {
    const { doc, walls } = await twoWalls();
    const lock = createDocLock();
    const idle = fakeIdle();
    exporterFor(doc, lock, idle);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    ops.length = 0;
    const edit = lock.run(async () => {
      await gate;
      await doc.execute('core.setParams', { elementId: walls[1]!, params: { height: 3300 } });
      ops.push('edit-done');
    });
    exporter!.kick();
    idle.runOne();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(ops, 'no export while the edit holds the lock').not.toContain('exportBrep');
    release();
    await edit;
    await drain(idle, lock);
    const first = ops.indexOf('exportBrep');
    expect(first).toBeGreaterThan(ops.indexOf('edit-done'));
  }, 180_000);

  it('a save before the export finishes writes only matching keys, calls no exportBrep, and reopens restored', async () => {
    const { doc, walls } = await twoWalls();
    const [edited, kept] = [walls[0]!, walls[1]!];
    const lock = createDocLock();
    const idle = fakeIdle();
    exporterFor(doc, lock, idle);
    exporter!.kick();
    await drain(idle, lock);
    await lock.run(() =>
      doc.execute('core.setParams', { elementId: edited, params: { height: 3400 } }),
    );
    exporter!.kick();
    idle.runOne(); // the edited wall's export is now queued behind the lock, not finished

    ops.length = 0;
    const options = namedSaveOptions(doc, KERNEL_BUILD_ID);
    expect(ops, 'assembling the save sent nothing to the kernel').toEqual([]);
    const key = await saveDocument(store, 'early', doc.scene, options, createBnnZipper(zipPort()));
    await settle(lock);
    const index = (await indexOf(key))!;
    expect(Object.keys(index.records), 'the stale export is not written').toEqual([kept]);
    expect(index.records[kept]!.key).toBe(cacheInputKeys(doc.scene).get(kept));

    const reopened = new DocumentContext(
      documentOptions(
        registries(),
        gateway,
        KERNEL_BUILD_ID,
        await readInitial(store, key),
        secret,
      ),
    );
    live.push(reopened);
    ops.length = 0;
    await reopened.rebuildOnly([kept]);
    expect(new Set(ops), 'the exported wall restores').toEqual(new Set(['importBrep']));
    ops.length = 0;
    await reopened.rebuildOnly([edited]);
    expect(ops, 'the unexported wall builds').not.toContain('importBrep');
    for (const wall of walls) expect(reopened.geometryOf(wall)?.state).toBe('valid');
  }, 180_000);
});
