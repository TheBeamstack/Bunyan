// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-063 — opening a file inflates its geometry-cache index in the worker and parses it root by root
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §2e, §3, §4). `doc.openGeometryCache()` posts the loaded
 * `.bnn`'s bytes; the cache-open worker inflates `index.json` under the leaf cap check, opens it, and
 * transfers back one buffer of per-root record JSON, which `#stage` parses one root at a time.
 *
 * REVERT-VERIFY: `openIndexOf` reading `source.files.read('index.json')` on the caller again (the T-061
 * line, `cacherestore.ts:92` at 624b5ba) turns "no inflate of index.json on the caller" red.
 */

import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
  emptyScene,
  saveBnn,
  signedCacheIndex,
} from '@bunyan/document';
import type {
  CacheIndexOpenRequest,
  CacheRecord,
  Element,
  GeometryGateway,
  Scene,
} from '@bunyan/document';
import { wallType } from '@bunyan/types';

import { documentOptions } from '../apps/web/src/documentOptions';
import {
  cacheIndexOpenerOn,
  cacheOpenTransfer,
  handleCacheOpenRequest,
  type CacheOpenPort,
  type CacheOpenReply,
} from '../apps/web/src/storage/cacheOpen';
import { cacheEnvelope } from '../apps/web/src/storage/cacheEnvelope';
import { installSecret, readInitial } from '../apps/web/src/storage/documentStorage';

/** What ran outside the fake worker: inflates that produced `index.json`, and whole-index parses. */
const caller = vi.hoisted(() => ({ inWorker: false, indexInflates: 0, wholeIndexParses: 0 }));

vi.mock('fflate', async (importOriginal) => {
  const real = await importOriginal<typeof import('fflate')>();
  return {
    ...real,
    unzipSync: (...args: Parameters<typeof real.unzipSync>) => {
      const out = real.unzipSync(...args);
      if (!caller.inWorker && Object.hasOwn(out, 'geometry-cache/index.json'))
        caller.indexInflates++;
      return out;
    },
  };
});

/** A worker stand-in: the request is cloned, the reply crosses with `cacheOpenTransfer`'s list. */
const fakeWorker = (): CacheOpenPort & {
  posted: number;
  transfers: ArrayBuffer[][];
  sent: CacheOpenReply[];
  received: CacheOpenReply[];
} => {
  const listeners: ((event: { data: CacheOpenReply }) => void)[] = [];
  const port = {
    posted: 0,
    transfers: [] as ArrayBuffer[][],
    sent: [] as CacheOpenReply[],
    received: [] as CacheOpenReply[],
    postMessage(message: CacheIndexOpenRequest): void {
      port.posted++;
      const request = structuredClone(message);
      setTimeout(() => {
        caller.inWorker = true;
        try {
          const reply = handleCacheOpenRequest(request);
          const transfer = cacheOpenTransfer(reply);
          const received = structuredClone(reply, { transfer });
          port.transfers.push(transfer);
          port.sent.push(reply);
          port.received.push(received);
          for (const listener of listeners) listener({ data: received });
        } finally {
          caller.inWorker = false;
        }
      }, 0);
    },
    addEventListener(type: string, listener: (event: never) => void): void {
      if (type === 'message') listeners.push(listener as (event: { data: CacheOpenReply }) => void);
    },
  };
  return port;
};

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';
const encoder = new TextEncoder();
const CACHED = 'cached-';

function walls(n: number): Scene {
  const elements: Record<string, Element> = {};
  for (let i = 0; i < n; i++) {
    const id = `W${String(i).padStart(3, '0')}`;
    elements[id] = {
      id,
      typeId: wallType.id,
      typeVersion: 1,
      params: { start: [0, i * 1000], end: [4000, i * 1000], thickness: 200, height: 2400 },
      classification: { ifcClass: 'IfcWall', loadBearing: false },
    };
  }
  return { ...emptyScene(), elements };
}

function cacheFor(scene: Scene, secret: Uint8Array): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const records: Record<string, CacheRecord> = {};
  for (const [root, key] of cacheInputKeys(scene)) {
    const refs = [`${root}#0/a`, `${root}#0/b`];
    files[`${root}/0.brep`] = encoder.encode(`brep ${root}\n`);
    records[root] = {
      key,
      root: {
        elementId: root,
        parts: [
          {
            name: 'structure',
            materialId: 'concrete',
            discipline: 'structural',
            nodeId: `${root}#0`,
            refs,
            brep: { k: '0', refs, fingerprint: 'f' },
          },
        ],
      },
      voids: [],
    };
  }
  files['index.json'] = signedCacheIndex(cacheEnvelope(KERNEL_BUILD_ID), records, secret);
  return files;
}

describe('T-063 — the worker side is leaf code', () => {
  const imports = (path: string): string[] =>
    [
      ...readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').matchAll(
        /^import[^;]*?from '([^']+)'/gms,
      ),
    ].map((m) => m[1]!);

  it('the cap check imports only fflate; the open imports only it, cachesign and fflate', () => {
    expect(imports('packages/document/src/bnncaps.ts')).toEqual(['fflate']);
    expect(imports('packages/document/src/cachesign.ts')).toEqual([]);
    expect(imports('packages/document/src/cacheindexfile.ts')).toEqual([
      'fflate',
      './bnncaps.js',
      './cachesign.js',
    ]);
    expect(imports('apps/web/src/storage/cacheOpen.ts')).toEqual([
      '@bunyan/document/cacheindexfile',
      '@bunyan/document/cachesign',
    ]);
    expect(imports('apps/web/src/storage/cacheOpenWorker.ts')).toEqual(['./cacheOpen']);
  });
});

describe('T-063 — the caller inflates and parses no index; the worker transfers one buffer', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let store: MemoryStore;
  let secret: Uint8Array;
  let indexBytes = 0;
  const scene = walls(6);
  const roots = Object.keys(scene.elements).sort();
  const live: DocumentContext[] = [];
  const realParse = JSON.parse;
  let parseSpy: { mockRestore: () => void } | undefined;

  const spying = (): { gateway: GeometryGateway; ops: string[] } => {
    const ops: string[] = [];
    return {
      ops,
      gateway: {
        request: async (op, payload, options) => {
          ops.push(op);
          if (op === 'importBrep') {
            const { refs } = payload as { refs: readonly string[] };
            return { handle: `${CACHED}${String(Math.random())}`, refs } as never;
          }
          return client.request(op, payload, options);
        },
      },
    };
  };

  const open = async (
    key: string,
    gateway: GeometryGateway,
    withSecret: Uint8Array,
  ): Promise<{ doc: DocumentContext; worker: ReturnType<typeof fakeWorker> }> => {
    const initial = await readInitial(store, key);
    const worker = fakeWorker();
    const registries = createRegistries();
    registries.types.register(wallType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext(
      documentOptions(
        registries,
        gateway,
        KERNEL_BUILD_ID,
        initial,
        withSecret,
        cacheIndexOpenerOn(worker),
      ),
    );
    live.push(doc);
    return { doc, worker };
  };

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
    store = new MemoryStore();
    secret = await installSecret(store);
    const cache = cacheFor(scene, secret);
    indexBytes = cache['index.json']!.length;
    await store.write('doc/cached.bnn', saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, cache }));
    await store.write('doc/plain.bnn', saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID }));
  }, 120_000);

  beforeEach(() => {
    caller.indexInflates = 0;
    caller.wholeIndexParses = 0;
    parseSpy?.mockRestore();
    // A whole index is the only JSON carrying the envelope's MAC; a per-root record never does.
    parseSpy = vi.spyOn(JSON, 'parse').mockImplementation((text, reviver) => {
      if (!caller.inWorker && typeof text === 'string' && text.includes('"mac"')) {
        caller.wholeIndexParses++;
      }
      return realParse(text, reviver) as unknown;
    });
  });

  afterAll(async () => {
    parseSpy?.mockRestore();
    for (const doc of live) await doc.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  it('open + rebuildAll: no inflate of index.json and no whole-index parse on the caller', async () => {
    const spy = spying();
    const { doc, worker } = await open('doc/cached.bnn', spy.gateway, secret);
    await doc.openGeometryCache();
    await doc.rebuildAll();
    expect(worker.posted).toBe(1);
    expect(caller.indexInflates, 'no inflate of index.json on the caller').toBe(0);
    expect(caller.wholeIndexParses, 'no JSON.parse of the whole index on the caller').toBe(0);
    expect(new Set(spy.ops), 'every root restored').toEqual(new Set(['importBrep']));
    for (const root of roots) expect(doc.geometryOf(root)?.state).toBe('valid');
    // The save carries every record, parsed root by root, still with no whole-index parse.
    expect(Object.keys(doc.geometryCacheFiles()?.records ?? {}).sort()).toEqual(roots);
    expect(caller.wholeIndexParses).toBe(0);
    expect(caller.indexInflates).toBe(0);
  });

  it('the reply is one transferred ArrayBuffer of per-root JSON, not an object graph', async () => {
    const spy = spying();
    const { doc, worker } = await open('doc/cached.bnn', spy.gateway, secret);
    await doc.openGeometryCache();
    const [transfer] = worker.transfers;
    const [sent] = worker.sent;
    const [received] = worker.received;
    expect(transfer).toHaveLength(1);
    expect(transfer![0]).toBeInstanceOf(ArrayBuffer);
    expect(sent!.index!.json.byteLength, 'the worker no longer holds it: moved, not cloned').toBe(
      0,
    );
    const index = received!.index!;
    expect(index.json.buffer.byteLength, 'the only view of its buffer').toBe(index.json.byteLength);
    expect(index.json.byteLength).toBeGreaterThan(0);
    expect(index.json.byteLength).toBeLessThan(indexBytes);
    expect([...index.roots].sort()).toEqual(roots);
    expect(index.offsets).toHaveLength(roots.length + 1);
  });

  it("a file signed with another install's secret restores nothing: every root builds", async () => {
    const spy = spying();
    const { doc, worker } = await open('doc/cached.bnn', spy.gateway, new Uint8Array(32).fill(9));
    await doc.rebuildAll();
    expect(worker.posted).toBe(1);
    expect(worker.received[0]?.index).toBeUndefined();
    expect(spy.ops).not.toContain('importBrep');
    for (const root of roots) expect(doc.geometryOf(root)?.state).toBe('valid');
  });

  it('a file without geometry-cache/ opens as today: nothing is posted, every root builds', async () => {
    const spy = spying();
    const { doc, worker } = await open('doc/plain.bnn', spy.gateway, secret);
    await doc.rebuildAll();
    expect(worker.posted).toBe(0);
    expect(spy.ops).not.toContain('importBrep');
    for (const root of roots) expect(doc.geometryOf(root)?.state).toBe('valid');
  });

  it('the worker refuses an index past a cap (4 MiB of zeros, ~1000:1) rather than inflating it', () => {
    const bomb = saveBnn(scene, {
      kernelBuildId: KERNEL_BUILD_ID,
      cache: { 'index.json': new Uint8Array(4 * 1024 * 1024) },
    });
    // Run outside the fake worker, so any inflate of index.json is counted.
    const reply = handleCacheOpenRequest({
      file: bomb,
      current: cacheEnvelope(KERNEL_BUILD_ID),
      secret,
    });
    expect(reply.index).toBeUndefined();
    expect(caller.indexInflates, 'refused before inflating').toBe(0);
  });
});
