// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-058 — the app's named save zips in a dedicated worker and stores `saveBnn`'s bytes
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §5; spec §6.5, T-047). The app's own `saveDocument`
 * drives `createBnnZipper` over a fake worker port that runs the worker's `handleZipRequest` on
 * structured clones, as `postMessage` would.
 *
 * REVERT-VERIFY: `saveDocument` storing `saveBnn(scene, options)` instead turns "posts to the worker" red;
 * dropping `createBnnZipper`'s `failure` early reject turns B-20261023-02's test red (the second zip hangs).
 *
 * `BUNYAN_T058_BNN_OUT=<path>` also writes the fixture's cache replicated to 16,000 solids as a `.bnn`
 * there: `tools/browser-check/named-save.mjs` sets it, then saves that file in a real browser.
 */

import { writeFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  MemoryStore,
  emptyScene,
  saveBnn,
  signedCacheIndex,
  type CacheRecord,
  type GeometryCacheFiles,
  type GeometryCacheIndex,
  type SaveOptions,
  type Scene,
} from '@bunyan/document';

import {
  createBnnZipper,
  handleZipRequest,
  type ZipPort,
  type ZipReply,
  type ZipRequest,
} from '../apps/web/src/storage/bnnZip';
import { docKey, saveDocument } from '../apps/web/src/storage/documentStorage';
import {
  ENVELOPE,
  KERNEL_BUILD_ID,
  SECRET,
  buildD29CacheFixture,
} from './fixtures/d29-cache-fixture.js';

/** A worker stand-in: every message crosses `structuredClone` both ways, and is counted. */
const fakeWorker = (): ZipPort & { posted: number } => {
  const listeners: ((event: { data: ZipReply }) => void)[] = [];
  const port = {
    posted: 0,
    postMessage(message: ZipRequest): void {
      port.posted++;
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

const expectNamedSaveEqualsSaveBnn = async (scene: Scene, options: SaveOptions): Promise<void> => {
  const store = new MemoryStore();
  const worker = fakeWorker();
  const key = await saveDocument(store, 'Tower A', scene, options, createBnnZipper(worker));
  expect(key).toBe(docKey('Tower A'));
  expect(worker.posted, 'posts to the worker').toBe(1);
  const stored = await store.read(key);
  expect(Buffer.from(stored!).equals(Buffer.from(saveBnn(scene, options))), 'bytes').toBe(true);
};

describe('T-058 — a named save zips in the worker and stores saveBnn bytes', () => {
  let scene: Scene;
  let cache: GeometryCacheFiles;

  beforeAll(async () => {
    ({ scene, cache } = await buildD29CacheFixture());
  }, 180_000);

  it('the 20-solid fixture with its cache', async () => {
    expect(Object.keys(cache).filter((name) => name.endsWith('.brep'))).toHaveLength(20);
    await expectNamedSaveEqualsSaveBnn(scene, {
      kernelBuildId: KERNEL_BUILD_ID,
      journal: [],
      cache,
    });
  });

  it('a scene without a cache', async () => {
    await expectNamedSaveEqualsSaveBnn(emptyScene(), {
      kernelBuildId: KERNEL_BUILD_ID,
      journal: [],
    });
  });

  it('a refusal saveBnn makes is made before anything is posted', async () => {
    const worker = fakeWorker();
    const options = {
      kernelBuildId: KERNEL_BUILD_ID,
      journal: [],
      revision: { issued_at_seq: 1, snapshot_number: 1 }, // no journal entry anchors it
    } as unknown as SaveOptions;
    expect(() => saveBnn(scene, options)).toThrow();
    await expect(
      saveDocument(new MemoryStore(), 'x', scene, options, createBnnZipper(worker)),
    ).rejects.toThrow();
    expect(worker.posted).toBe(0);
  });

  it('after the worker fails, a later zip rejects at once and the zipper reports failed (B-20261023-02)', async () => {
    let fail: (event: { message?: string }) => void = () => undefined;
    const dead: ZipPort = {
      postMessage: () => undefined, // a dead worker never replies
      addEventListener(type: string, listener: (event: never) => void): void {
        if (type === 'error') fail = listener as (event: { message?: string }) => void;
      },
    };
    const zipper = createBnnZipper(dead);
    expect(zipper.failed).toBe(false);
    const first = zipper.zip({});
    fail({ message: 'load failed' });
    await expect(first).rejects.toThrow('load failed');
    expect(zipper.failed).toBe(true);
    const timeout = new Promise((resolve) => {
      setTimeout(() => {
        resolve('pending');
      }, 500);
    });
    await expect(Promise.race([zipper.zip({}), timeout])).rejects.toThrow('load failed');
  });

  it.runIf(process.env['BUNYAN_T058_BNN_OUT'] !== undefined)(
    'writes the 16k-solid .bnn for the browser check',
    () => {
      const index = JSON.parse(new TextDecoder().decode(cache['index.json'])) as GeometryCacheIndex;
      const files: Record<string, Uint8Array> = {};
      const records: Record<string, CacheRecord> = {};
      let n = 0;
      for (let copy = 0; n < 16_000; copy++) {
        for (const [root, record] of Object.entries(index.records)) {
          const id = `x${String(copy)}-${root}`;
          records[id] = record;
          for (const [name, bytes] of Object.entries(cache)) {
            if (name.startsWith(`${root}/`)) {
              files[`${id}/${name.slice(root.length + 1)}`] = bytes;
              n++;
            }
          }
        }
      }
      files['index.json'] = signedCacheIndex(ENVELOPE, records, SECRET);
      const bytes = saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache: files });
      writeFileSync(process.env['BUNYAN_T058_BNN_OUT']!, bytes);
      console.log(`[T-058] ${String(n)} solids, ${String(bytes.length)} B`);
    },
    300_000,
  );
});
