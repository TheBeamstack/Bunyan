// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-060 — a named save signs its geometry-cache index in the zip worker, not on the main thread
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §2e, §5; spec §6.5, T-047). `doc.geometryCacheFiles()`
 * returns the records, envelope and secret unsigned; the app's `saveDocument` posts them, and the worker's
 * `handleZipRequest` computes the HMAC, writes `index.json` and zips — bytes equal to `saveBnn`.
 *
 * REVERT-VERIFY: `saveDocument` posting `assembleBnnEntries(scene, options)` (signing on the caller again)
 * turns "no HMAC runs on the caller" red.
 *
 * `BUNYAN_T060_BNN_OUT=<path>` also writes the fixture replicated to 16,000 solids — scene AND cache, every
 * record keyed against the replicated scene — so `tools/browser-check/named-save.mjs` can save it through
 * `doc.geometryCacheFiles()`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MemoryStore,
  cacheInputKey,
  cacheKeyTables,
  emptyScene,
  saveBnn,
  signGeometryCache,
  type Element,
  type SaveOptions,
  type Scene,
  type UnsignedGeometryCache,
} from '@bunyan/document';
import * as cachesign from '@bunyan/document/cachesign';

import {
  createBnnZipper,
  handleZipRequest,
  type ZipPort,
  type ZipReply,
  type ZipRequest,
} from '../apps/web/src/storage/bnnZip';
import { saveDocument } from '../apps/web/src/storage/documentStorage';
import { KERNEL_BUILD_ID, buildD29CacheFixture } from './fixtures/d29-cache-fixture.js';

// Every exported signing function, spied: a call from any other module (bnn.ts, the app) is counted.
vi.mock('@bunyan/document/cachesign', async (importOriginal) => {
  const real = await importOriginal<typeof import('@bunyan/document/cachesign')>();
  return {
    ...real,
    hmacSha256Hex: vi.fn(real.hmacSha256Hex),
    signedCacheIndex: vi.fn(real.signedCacheIndex),
    signGeometryCache: vi.fn(real.signGeometryCache),
    signBnnEntries: vi.fn(real.signBnnEntries),
  };
});

const signingCalls = (): number =>
  [
    cachesign.hmacSha256Hex,
    cachesign.signedCacheIndex,
    cachesign.signGeometryCache,
    cachesign.signBnnEntries,
  ].reduce((n, f) => n + vi.mocked(f).mock.calls.length, 0);

/** A worker stand-in: messages cross `structuredClone`; records the caller's signing count at post time. */
const fakeWorker = (): ZipPort & { posted: number; signedBeforePost: number[] } => {
  const listeners: ((event: { data: ZipReply }) => void)[] = [];
  const port = {
    posted: 0,
    signedBeforePost: [] as number[],
    postMessage(message: ZipRequest): void {
      port.posted++;
      port.signedBeforePost.push(signingCalls());
      const request = structuredClone(message);
      setTimeout(() => {
        const reply = structuredClone(handleZipRequest(request));
        for (const listener of listeners) listener({ data: reply });
      }, 0);
    },
    addEventListener(type: string, listener: (event: never) => void): void {
      if (type === 'message') listeners.push(listener as (event: { data: ZipReply }) => void);
    },
  };
  return port;
};

const namedSave = async (
  scene: Scene,
  options: SaveOptions,
): Promise<{ stored: Uint8Array; worker: ReturnType<typeof fakeWorker> }> => {
  const store = new MemoryStore();
  const worker = fakeWorker();
  const key = await saveDocument(store, 'Tower A', scene, options, createBnnZipper(worker));
  return { stored: (await store.read(key))!, worker };
};

const same = (a: Uint8Array, b: Uint8Array): boolean => Buffer.from(a).equals(Buffer.from(b));

describe('T-060 — the signing code is a leaf the zip worker can import', () => {
  const source = (path: string): string =>
    readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const imports = (path: string): string[] =>
    [...source(path).matchAll(/^import[^;]*?from '([^']+)'/gms)].map((m) => m[1]!);

  it('cachesign.ts imports nothing; it is exported beside ./bnnzip', () => {
    expect(imports('packages/document/src/cachesign.ts')).toEqual([]);
    const pkg = JSON.parse(source('packages/document/package.json')) as {
      exports: Record<string, string>;
    };
    expect(pkg.exports['./cachesign']).toBe('./src/cachesign.ts');
    expect(pkg.exports['./bnnzip']).toBe('./src/bnnzip.ts');
  });

  it('the zip worker imports only the two leaf subpaths', () => {
    expect(imports('apps/web/src/storage/bnnZip.ts').sort()).toEqual([
      '@bunyan/document/bnnzip',
      '@bunyan/document/cachesign',
    ]);
    expect(imports('apps/web/src/storage/bnnZipWorker.ts')).toEqual(['./bnnZip']);
  });
});

describe('T-060 — a named save signs in the worker and stores saveBnn bytes', () => {
  let scene: Scene;
  let unsigned: UnsignedGeometryCache;

  beforeAll(async () => {
    ({ scene, unsigned } = await buildD29CacheFixture());
  }, 180_000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('the 20-solid fixture: geometryCacheFiles() is unsigned, and the bytes equal saveBnn', async () => {
    expect(Object.keys(unsigned.files).filter((n) => n.endsWith('.brep'))).toHaveLength(20);
    expect(unsigned.files['index.json'], 'no index on the caller').toBeUndefined();
    const options: SaveOptions = { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache: unsigned };
    const { stored, worker } = await namedSave(scene, options);
    expect(worker.posted).toBe(1);
    expect(worker.signedBeforePost, 'no HMAC runs on the caller').toEqual([0]);
    expect(signingCalls(), 'the worker signed').toBeGreaterThan(0);
    expect(same(stored, saveBnn(scene, options)), 'bytes').toBe(true);
    // ...and equal to the pre-T-060 path, which signed first and saved the signed files.
    const signed = saveBnn(scene, { ...options, cache: signGeometryCache(unsigned) });
    expect(same(stored, signed), 'bytes, signed on the caller').toBe(true);
  });

  it('a scene without a cache', async () => {
    const options: SaveOptions = { kernelBuildId: KERNEL_BUILD_ID, journal: [] };
    const { stored, worker } = await namedSave(emptyScene(), options);
    expect(worker.signedBeforePost).toEqual([0]);
    expect(same(stored, saveBnn(emptyScene(), options))).toBe(true);
  });

  it.runIf(process.env['BUNYAN_T060_BNN_OUT'] !== undefined)(
    'writes the 16k-solid .bnn, scene and cache, for the browser check',
    () => {
      const ids = Object.keys(scene.elements);
      const copyOf = (text: string, copy: number): string =>
        ids.reduce((t, id) => t.replaceAll(id, `x${String(copy)}-${id}`), text);
      // Each copy 100 m east of the last, so no wall joins a wall of another copy.
      const shift = (e: Element, dx: number): Element => {
        const params = { ...e.params } as Record<string, unknown>;
        for (const name of ['start', 'end', 'origin']) {
          const p = params[name];
          if (Array.isArray(p)) params[name] = [(p[0] as number) + dx, ...p.slice(1)];
        }
        const placement = e.placement?.map((step) =>
          step.kind === 'translate'
            ? { ...step, by: [step.by[0] + dx, step.by[1], step.by[2]] }
            : step,
        );
        return {
          ...e,
          params,
          ...(placement === undefined ? {} : { placement }),
        } as Element;
      };
      const solids = Object.keys(unsigned.files).length;
      const copies = Math.ceil(16_000 / solids);
      const elements: Record<string, Element> = {};
      const records: Record<string, unknown> = {};
      const files: Record<string, Uint8Array> = {};
      for (let copy = 0; copy < copies; copy++) {
        for (const e of Object.values(scene.elements)) {
          const row = shift(JSON.parse(copyOf(JSON.stringify(e), copy)) as Element, copy * 100_000);
          elements[row.id] = row;
        }
        for (const [root, record] of Object.entries(unsigned.records)) {
          const id = `x${String(copy)}-${root}`;
          records[id] = JSON.parse(copyOf(JSON.stringify(record), copy));
          for (const [name, bytes] of Object.entries(unsigned.files)) {
            if (name.startsWith(`${root}/`)) files[`${id}/${name.slice(root.length + 1)}`] = bytes;
          }
        }
      }
      expect(Object.keys(scene.constraints), 'no constraint rows to replicate').toEqual([]);
      const big: Scene = { ...scene, elements };
      const tables = cacheKeyTables(big);
      for (const [root, record] of Object.entries(records)) {
        records[root] = { ...(record as object), key: cacheInputKey(big, root, tables) };
      }
      const cache = signGeometryCache({ ...unsigned, records, files });
      const bytes = saveBnn(big, { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache });
      writeFileSync(process.env['BUNYAN_T060_BNN_OUT']!, bytes);
      console.log(
        `[T-060] ${String(Object.keys(files).length)} solids, ${String(Object.keys(records).length)} roots, ${String(bytes.length)} B`,
      );
    },
    600_000,
  );
});
