// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-065 — a named save posts its entries to the zip worker as one transferred buffer
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §5; spec §6.5, T-047). The caller copies every entry into
 * one fresh buffer with names and offsets and transfers it, so `postMessage` clones no entry `Uint8Array`;
 * the document's exported and carried `.brep` buffers stay attached, and the stored bytes equal `saveBnn`.
 *
 * REVERT-VERIFY: `createBnnZipper` posting the entries object again turns "no Uint8Array outside the
 * transferred buffers" red.
 */

import { beforeAll, describe, expect, it } from 'vitest';
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
  type BnnZipper,
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

interface Posted {
  readonly message: ZipRequest;
  readonly transfer: readonly ArrayBuffer[];
}

/** A worker stand-in: the request crosses `structuredClone` WITH the caller's transfer list, as `postMessage`. */
const fakeWorker = (): ZipPort & { posts: Posted[] } => {
  const listeners: ((event: { data: ZipReply }) => void)[] = [];
  const port = {
    posts: [] as Posted[],
    postMessage(message: ZipRequest, transfer: ArrayBuffer[]): void {
      const request = structuredClone(message, { transfer });
      port.posts.push({ message, transfer });
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

/** Every typed-array view and `ArrayBuffer` reachable from `value`. */
const buffersIn = (value: unknown, found: (ArrayBuffer | ArrayBufferView)[] = []) => {
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) found.push(value);
  else if (Array.isArray(value)) for (const v of value) buffersIn(v, found);
  else if (typeof value === 'object' && value !== null)
    for (const v of Object.values(value)) buffersIn(v, found);
  return found;
};

/** `carriedFile`: the opened file a save carries from, the one view cloned by design (T-067). */
const expectNoClonedBuffer = (posted: Posted, carriedFile?: Uint8Array): void => {
  const outside = buffersIn(posted.message).filter((b) => {
    if (carriedFile !== undefined && b === carriedFile) return false;
    const buffer = b instanceof ArrayBuffer ? b : b.buffer;
    return !posted.transfer.includes(buffer as ArrayBuffer);
  });
  expect(outside, 'no Uint8Array outside the transferred buffers').toEqual([]);
  expect(posted.transfer.length, 'the packed buffer is transferred').toBeGreaterThan(0);
  for (const buffer of posted.transfer) {
    expect(buffer.byteLength, "the caller's packed buffer is detached").toBe(0);
  }
};

const same = (a: Uint8Array | undefined, b: Uint8Array): boolean =>
  a !== undefined && Buffer.from(a).equals(Buffer.from(b));

/**
 * Two consecutive saves through one zipper: each posts once, inside the `saveDocument` call, with no entry
 * cloned, and stores `saveBnn`'s bytes.
 */
const twoSaves = async (
  scene: Scene,
  options: SaveOptions,
  carriedFile?: Uint8Array,
): Promise<void> => {
  const worker = fakeWorker();
  const zipper: BnnZipper = createBnnZipper(worker);
  const store = new MemoryStore();
  const expected = saveBnn(scene, options);
  for (let i = 0; i < 2; i++) {
    const key = saveDocument(store, `Tower ${String(i)}`, scene, options, zipper);
    expect(worker.posts).toHaveLength(i + 1);
    expectNoClonedBuffer(worker.posts[i]!, carriedFile);
    if (carriedFile !== undefined) {
      expect(worker.posts[i]!.message.carried?.entries, 'carried roots by name').toEqual(
        Object.keys(scene.elements).map((root) => `geometry-cache/${root}/0.brep`),
      );
    }
    expect(same(await store.read(await key), expected), `save ${String(i + 1)} bytes`).toBe(true);
  }
};

/** Each `.brep` buffer's `byteLength`, so a detach is visible after the saves. */
const brepLengths = (files: Readonly<Record<string, Uint8Array>>): Map<string, number> =>
  new Map(
    Object.entries(files)
      .filter(([name]) => name.endsWith('.brep'))
      .map(([name, bytes]) => [name, bytes.buffer.byteLength]),
  );

describe('T-065 — the 20-solid fixture: entries packed into one transferred buffer', () => {
  let scene: Scene;
  let unsigned: UnsignedGeometryCache;

  beforeAll(async () => {
    ({ scene, unsigned } = await buildD29CacheFixture());
  }, 180_000);

  it('with a cache: no entry is cloned, every exported .brep stays attached, two saves equal saveBnn', async () => {
    const before = brepLengths(unsigned.files);
    expect(before.size).toBeGreaterThan(0);
    const options: SaveOptions = { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache: unsigned };
    await twoSaves(scene, options);
    expect(brepLengths(unsigned.files), 'every exported .brep keeps its byteLength').toEqual(
      before,
    );
  });

  it('cache-less: no entry is cloned, two saves equal saveBnn', async () => {
    const options: SaveOptions = { kernelBuildId: KERNEL_BUILD_ID, journal: [] };
    await twoSaves(scene, options);
  });

  it('an empty cache-less scene: no entry is cloned, two saves equal saveBnn', async () => {
    const options: SaveOptions = { kernelBuildId: KERNEL_BUILD_ID, journal: [] };
    await twoSaves(emptyScene(), options);
  });
});

describe('T-065 — entries carried from an opened file stay attached', () => {
  const encoder = new TextEncoder();

  it('every carried .brep keeps its byteLength over two saves of saveBnn bytes', async () => {
    const elements: Record<string, Element> = {};
    for (let i = 0; i < 5; i++) {
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
      const refs = [`${root}#0/a`];
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
    const pkg = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, cache: files }));
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
    const before = brepLengths(cache.files);
    expect([...before.keys()], 'every root carried').toHaveLength(5);
    const options: SaveOptions = { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache };
    // Amended by T-067: carried roots cross by name, with the opened file the worker reads them from.
    await twoSaves(pkg.scene, options, pkg.cache!.file);
    expect(brepLengths(cache.files), 'every carried .brep keeps its byteLength').toEqual(before);
    expect(brepLengths(doc.geometryCacheFiles()!.files)).toEqual(before);
  });
});
