// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-064 — a named save posts its geometry-cache records to the zip worker as one transferred buffer
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §2e, §5; spec §6.5, T-047). Each record's JSON is kept
 * when it is exported and when the file's index is opened, so the caller stringifies no record and clones
 * no object graph; the worker parses the slices, signs and zips — bytes equal to `saveBnn`.
 *
 * REVERT-VERIFY: `createBnnZipper` posting `signing` as it gets it (the record objects) turns "one
 * transferred ArrayBuffer" red.
 */

import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  DocumentContext,
  MemoryStore,
  cacheInputKeys,
  createRegistries,
  emptyScene,
  loadBnn,
  saveBnn,
  signedCacheIndex,
  type CacheRecord,
  type Element,
  type GeometryGateway,
  type SaveOptions,
  type Scene,
  type UnsignedGeometryCache,
} from '@bunyan/document';
import { wallType } from '@bunyan/types';

import {
  createBnnZipper,
  handleZipRequest,
  type ZipPort,
  type ZipReply,
  type ZipRequest,
} from '../apps/web/src/storage/bnnZip';
import { handleCacheOpenRequest } from '../apps/web/src/storage/cacheOpen';
import { saveDocument } from '../apps/web/src/storage/documentStorage';
import {
  ENVELOPE,
  KERNEL_BUILD_ID,
  SECRET,
  buildD29CacheFixture,
} from './fixtures/d29-cache-fixture.js';

/** What the caller posted, the transfer list, and the caller's own view of the buffer after the post. */
interface Posted {
  readonly message: ZipRequest;
  readonly transfer: readonly ArrayBuffer[];
  /** Every value the caller handed `JSON.stringify` before it posted. */
  readonly stringified: readonly unknown[];
}

/** A worker stand-in: the request crosses `structuredClone` WITH the caller's transfer list, as `postMessage`. */
const fakeWorker = (stringify: { mock: { calls: unknown[][] } }): ZipPort & { posts: Posted[] } => {
  const listeners: ((event: { data: ZipReply }) => void)[] = [];
  const port = {
    posts: [] as Posted[],
    postMessage(message: ZipRequest, transfer: ArrayBuffer[]): void {
      const stringified = stringify.mock.calls.map((args) => args[0]);
      const request = structuredClone(message, { transfer });
      port.posts.push({ message, transfer, stringified });
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

/** The post happens inside the `saveDocument` call; the stored bytes arrive once the worker replies. */
const namedSave = (
  scene: Scene,
  options: SaveOptions,
): { posted: Posted; stored: Promise<Uint8Array | undefined> } => {
  const stringify = vi.spyOn(JSON, 'stringify');
  try {
    const store = new MemoryStore();
    const worker = fakeWorker(stringify);
    const key = saveDocument(store, 'Tower A', scene, options, createBnnZipper(worker));
    expect(worker.posts).toHaveLength(1);
    return { posted: worker.posts[0]!, stored: key.then((k) => store.read(k)) };
  } finally {
    stringify.mockRestore();
  }
};

const same = (a: Uint8Array | undefined, b: Uint8Array): boolean =>
  a !== undefined && Buffer.from(a).equals(Buffer.from(b));

/** The records cross as one buffer, transferred, and no record was stringified by the caller. */
const expectOneTransferredBuffer = (posted: Posted, records: Readonly<Record<string, unknown>>) => {
  expect(posted.transfer, 'one transferred ArrayBuffer').toHaveLength(1);
  const signing = posted.message.signing!;
  expect(Object.keys(signing).sort()).toEqual(['envelope', 'records', 'secret']);
  const sent = signing.records;
  expect(Object.keys(sent).sort(), 'one buffer, not an object graph').toEqual([
    'json',
    'offsets',
    'roots',
  ]);
  expect(sent.json, 'one buffer, not an object graph').toBeInstanceOf(Uint8Array);
  expect(posted.transfer[0], 'one transferred ArrayBuffer').toBe(sent.json.buffer);
  expect(sent.json.buffer.byteLength, 'transferred: the caller keeps a detached buffer').toBe(0);
  expect(sent.roots).toEqual(Object.keys(records));
  expect(sent.offsets).toHaveLength(sent.roots.length + 1);
  const values = new Set(Object.values(records));
  expect(
    posted.stringified.filter((v) => values.has(v)),
    'the caller stringifies no record',
  ).toEqual([]);
};

describe('T-064 — the 20-solid fixture: records kept at export, posted as one transferred buffer', () => {
  let scene: Scene;
  let unsigned: UnsignedGeometryCache;

  beforeAll(async () => {
    ({ scene, unsigned } = await buildD29CacheFixture());
  }, 180_000);

  it('posts one transferred ArrayBuffer and stores saveBnn bytes', async () => {
    expect(Object.keys(unsigned.records).length).toBeGreaterThan(0);
    const options: SaveOptions = { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache: unsigned };
    const { stored, posted } = namedSave(scene, options);
    expectOneTransferredBuffer(posted, unsigned.records);
    expect(same(await stored, saveBnn(scene, options)), 'bytes').toBe(true);
  });

  it('a scene without a cache posts no signing and transfers nothing', async () => {
    const options: SaveOptions = { kernelBuildId: KERNEL_BUILD_ID, journal: [] };
    const { stored, posted } = namedSave(emptyScene(), options);
    expect(posted.message.signing).toBeUndefined();
    expect(posted.transfer).toEqual([]);
    expect(same(await stored, saveBnn(emptyScene(), options))).toBe(true);
  });
});

describe('T-064 — records carried from an opened file are posted as the slices the open kept', () => {
  const encoder = new TextEncoder();

  /** `n` walls, and a `.bnn` carrying a cache for every one, signed with `SECRET` under `ENVELOPE`. */
  const cachedFile = (n: number): { scene: Scene; file: Uint8Array } => {
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
    const scene: Scene = { ...emptyScene(), elements };
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
    files['index.json'] = signedCacheIndex(ENVELOPE, records, SECRET);
    return { scene, file: saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, cache: files }) };
  };

  it('opened through the worker, the first save posts one transferred buffer of saveBnn bytes', async () => {
    const { scene, file } = cachedFile(5);
    const pkg = loadBnn(file);
    const registries = createRegistries();
    registries.types.register(wallType);
    const doc = new DocumentContext({
      registries,
      geometry: {} as GeometryGateway, // a save calls no kernel op (design §5)
      scene: pkg.scene,
      geometryCache: {
        files: pkg.cache!,
        current: ENVELOPE,
        installSecret: SECRET,
        openIndex: (request) =>
          Promise.resolve(structuredClone(handleCacheOpenRequest(structuredClone(request)).index)),
      },
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
    });
    await doc.openGeometryCache();
    const cache = doc.geometryCacheFiles()!;
    expect(Object.keys(cache.records), 'every root carried').toEqual(Object.keys(scene.elements));
    const options: SaveOptions = { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache };
    const { stored, posted } = namedSave(pkg.scene, options);
    expectOneTransferredBuffer(posted, cache.records);
    expect(same(await stored, saveBnn(pkg.scene, options)), 'bytes').toBe(true);
  });
});
