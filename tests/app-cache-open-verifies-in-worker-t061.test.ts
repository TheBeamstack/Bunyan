// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-061 — opening a file verifies its geometry-cache index off the main thread
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §2e, §4). `doc.openGeometryCache()` posts the stored
 * `index.json` to the app's cache-open worker, whose `handleCacheOpenRequest` parses it and checks its
 * envelope and MAC through the leaf `@bunyan/document/cachesign`; `rebuildAll` then restores from the
 * opened result, and `#stage` neither parses nor verifies.
 *
 * REVERT-VERIFY: `#stage` opening the index itself again (`openCacheIndex(this.#cacheSource)`, which calls
 * `verifyCacheIndex`) turns "no parse or verify runs on the caller" red.
 *
 * `BUNYAN_T061_MEASURE=1` also times opening R4's fixture replicated to 16,000 solids under node (design §2e).
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
import * as cachesign from '@bunyan/document/cachesign';
import { wallType } from '@bunyan/types';

import { documentOptions } from '../apps/web/src/documentOptions';
import {
  cacheIndexOpenerOn,
  handleCacheOpenRequest,
  type CacheOpenPort,
  type CacheOpenReply,
} from '../apps/web/src/storage/cacheOpen';
import { cacheEnvelope } from '../apps/web/src/storage/cacheEnvelope';
import { installSecret, readInitial } from '../apps/web/src/storage/documentStorage';
import { SECRET, buildD29CacheFixture } from './fixtures/d29-cache-fixture.js';

// Every exported parse/verify function, spied: a call from any other module (document.ts, cacherestore.ts,
// cachetrust.ts, the app) is counted.
vi.mock('@bunyan/document/cachesign', async (importOriginal) => {
  const real = await importOriginal<typeof import('@bunyan/document/cachesign')>();
  return {
    ...real,
    openSignedCacheIndex: vi.fn(real.openSignedCacheIndex),
    verifyCacheIndex: vi.fn(real.verifyCacheIndex),
    cacheIndexMac: vi.fn(real.cacheIndexMac),
    hmacSha256Hex: vi.fn(real.hmacSha256Hex),
  };
});

const verifyCalls = (): number =>
  [
    cachesign.openSignedCacheIndex,
    cachesign.verifyCacheIndex,
    cachesign.cacheIndexMac,
    cachesign.hmacSha256Hex,
  ].reduce((n, f) => n + vi.mocked(f).mock.calls.length, 0);

/** A worker stand-in: messages cross `structuredClone`; counts the verify calls made on the port. */
const fakeWorker = (): CacheOpenPort & { posted: number; onPort: number } => {
  const listeners: ((event: { data: CacheOpenReply }) => void)[] = [];
  const port = {
    posted: 0,
    onPort: 0,
    postMessage(message: CacheIndexOpenRequest): void {
      port.posted++;
      const request = structuredClone(message);
      setTimeout(() => {
        const before = verifyCalls();
        const reply = structuredClone(handleCacheOpenRequest(request));
        port.onPort += verifyCalls() - before;
        for (const listener of listeners) listener({ data: reply });
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

/** `n` free-standing walls 1 m apart, so every one is its own assembly root. */
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

/** One solid per root, signed with `secret` under the app's envelope. */
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

describe('T-061 — the open-side code is a leaf the cache-open worker can import', () => {
  const imports = (path: string): string[] =>
    [
      ...readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').matchAll(
        /^import[^;]*?from '([^']+)'/gms,
      ),
    ].map((m) => m[1]!);

  it('cacheOpen.ts imports only /cachesign, and its worker only cacheOpen.ts', () => {
    expect(imports('packages/document/src/cachesign.ts')).toEqual([]);
    expect(imports('apps/web/src/storage/cacheOpen.ts')).toEqual(['@bunyan/document/cachesign']);
    expect(imports('apps/web/src/storage/cacheOpenWorker.ts')).toEqual(['./cacheOpen']);
  });
});

describe('T-061 — opening a stored .bnn parses and verifies its index on the worker port', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let store: MemoryStore;
  let secret: Uint8Array;
  const scene = walls(6);
  const roots = Object.keys(scene.elements).sort();
  const live: DocumentContext[] = [];

  /** `importBrep` answered here with the refs it was handed; every other op to OCCT. */
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
          if (op === 'releaseShape' && (payload as { handle: string }).handle.startsWith(CACHED)) {
            return { released: true, liveHandles: 0 } as never;
          }
          return client.request(op, payload, options);
        },
      },
    };
  };

  /** The app's open: `readInitial`, then the options `bootstrap` builds, with the worker's opener. */
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
    await store.write('doc/cached.bnn', saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, cache }));
    await store.write('doc/plain.bnn', saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID }));
  }, 120_000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(async () => {
    for (const doc of live) await doc.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  it('no parse or verify runs on the caller: the port opens it, rebuildAll restores from it', async () => {
    const spy = spying();
    const { doc, worker } = await open('doc/cached.bnn', spy.gateway, secret);
    await doc.openGeometryCache();
    expect(worker.posted, 'opened before rebuildAll').toBe(1);
    await doc.rebuildAll();
    expect(worker.posted, 'opened once').toBe(1);
    expect(worker.onPort, 'the port verified').toBeGreaterThan(0);
    expect(verifyCalls() - worker.onPort, 'no parse or verify runs on the caller').toBe(0);
    expect(new Set(spy.ops)).toEqual(new Set(['importBrep']));
    for (const root of roots) expect(doc.geometryOf(root)?.state).toBe('valid');
    // A save carries the opened records without verifying them again.
    expect(Object.keys(doc.geometryCacheFiles()?.records ?? {}).sort()).toEqual(roots);
    expect(verifyCalls() - worker.onPort, 'the save re-verifies nothing').toBe(0);
  });

  it('rebuildOnly with no explicit open opens on the port first', async () => {
    const spy = spying();
    const { doc, worker } = await open('doc/cached.bnn', spy.gateway, secret);
    await doc.rebuildOnly(roots);
    expect(worker.posted).toBe(1);
    expect(verifyCalls() - worker.onPort).toBe(0);
    expect(new Set(spy.ops)).toEqual(new Set(['importBrep']));
  });

  it("a file signed with another install's secret restores nothing: every root builds", async () => {
    const spy = spying();
    const { doc, worker } = await open('doc/cached.bnn', spy.gateway, new Uint8Array(32).fill(9));
    await doc.rebuildAll();
    expect(worker.posted).toBe(1);
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

  it('a worker that fails restores nothing rather than throwing', async () => {
    const spy = spying();
    const initial = await readInitial(store, 'doc/cached.bnn');
    let onError: ((event: { message?: string }) => void) | undefined;
    const broken: CacheOpenPort = {
      postMessage: () => setTimeout(() => onError?.({ message: 'boom' }), 0),
      addEventListener: (type: string, listener: (event: never) => void) => {
        if (type === 'error') onError = listener as (event: { message?: string }) => void;
      },
    };
    const registries = createRegistries();
    registries.types.register(wallType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext(
      documentOptions(
        registries,
        spy.gateway,
        KERNEL_BUILD_ID,
        initial,
        secret,
        cacheIndexOpenerOn(broken),
      ),
    );
    live.push(doc);
    await doc.rebuildAll();
    expect(spy.ops).not.toContain('importBrep');
    for (const root of roots) expect(doc.geometryOf(root)?.state).toBe('valid');
  });
});

describe.runIf(process.env['BUNYAN_T061_MEASURE'] !== undefined)(
  'T-061 — the 16k open, timed under node',
  () => {
    it('R4 fixture replicated to 16,000 solids: parse, verify, and the reply clone', async () => {
      const { unsigned } = await buildD29CacheFixture();
      const records: Record<string, unknown> = {};
      // T-060's replication: copies of the whole fixture until it holds 16,000 solids.
      const copies = Math.ceil(16_000 / Object.keys(unsigned.files).length);
      for (let copy = 0; copy < copies; copy++) {
        for (const [root, record] of Object.entries(unsigned.records)) {
          const id = `x${String(copy)}-${root}`;
          records[id] = JSON.parse(JSON.stringify(record).replaceAll(root, id));
        }
      }
      const bytes = cachesign.signedCacheIndex(unsigned.envelope, records, SECRET);
      const time = <T>(f: () => T): [T, number] => {
        const at = performance.now();
        const value = f();
        return [value, performance.now() - at];
      };
      const [opened, openMs] = time(() =>
        cachesign.openSignedCacheIndex(bytes, unsigned.envelope, SECRET),
      );
      expect(opened).toBeDefined();
      const [parsed, parseMs] = time(
        () =>
          JSON.parse(new TextDecoder().decode(bytes)) as {
            envelope: Record<string, unknown>;
            records: unknown;
          },
      );
      const [ok, verifyMs] = time(() =>
        cachesign.verifyCacheIndex(parsed.envelope, parsed.records, SECRET),
      );
      expect(ok).toBe(true);
      const [, cloneMs] = time(() => structuredClone({ index: opened }));
      console.log(
        `[T-061] ${String(copies * Object.keys(unsigned.files).length)} solids, ${String(Object.keys(records).length)} roots, index ${String(bytes.length)} B: open ${openMs.toFixed(0)} ms (parse ${parseMs.toFixed(0)} ms, verify ${verifyMs.toFixed(0)} ms), reply clone ${cloneMs.toFixed(0)} ms`,
      );
    }, 600_000);
  },
);
