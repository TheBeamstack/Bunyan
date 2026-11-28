// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-070 — a named save builds `scene.json` in the zip worker, off the main thread
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §5; spec §6, §6.5, T-047). The caller assembles the entries
 * with an empty `scene.json` and posts the scene; the worker stringifies it, and the stored bytes equal
 * `saveBnn`.
 *
 * REVERT-VERIFY: `saveDocument` assembling with `scene.json` built on the main thread again turns "no
 * stringify of the scene before the post" and "no scene.json bytes posted" red.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
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
import { ENVELOPE, KERNEL_BUILD_ID, SECRET } from './fixtures/d29-cache-fixture.js';

const encoder = new TextEncoder();

afterEach(() => {
  vi.restoreAllMocks();
});

interface Posted {
  readonly message: ZipRequest;
  /** `JSON.stringify` calls on the saved scene itself, made on the caller before this post. */
  readonly sceneStringified: number;
  /** The transferred bytes as the caller packed them, read before `postMessage` detaches them. */
  readonly packed: string;
}

/** A worker stand-in: the request crosses `structuredClone` with the transfer list, as `postMessage`. */
const fakeWorker = (scene: Scene): ZipPort & { posts: Posted[] } => {
  const stringify = vi.spyOn(JSON, 'stringify');
  const listeners: ((event: { data: ZipReply }) => void)[] = [];
  const port = {
    posts: [] as Posted[],
    postMessage(message: ZipRequest, transfer: ArrayBuffer[]): void {
      const sceneStringified = stringify.mock.calls.filter(([value]) => value === scene).length;
      const packed = transfer.map((b) => Buffer.from(b).toString('latin1')).join('');
      port.posts.push({ message, sceneStringified, packed });
      const request = structuredClone(message, { transfer });
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

const same = (a: Uint8Array | undefined, b: Uint8Array): boolean =>
  a !== undefined && Buffer.from(a).equals(Buffer.from(b));

const wall = (i: number): Element => ({
  id: `W${String(i).padStart(3, '0')}`,
  typeId: wallType.id,
  typeVersion: 1,
  params: { start: [0, i * 1000], end: [4000, i * 1000], thickness: 200, height: 2400 },
  classification: { ifcClass: 'IfcWall', loadBearing: false },
});

const fiveWalls = (): Scene => {
  const elements: Record<string, Element> = {};
  for (let i = 0; i < 5; i++) elements[wall(i).id] = wall(i);
  return { ...emptyScene(), elements };
};

/** The 5-wall cached file of the T-064, T-065 and T-067 tests, every root cached, opened as `bootstrap` does. */
const openCachedFile = async (): Promise<{ scene: Scene; options: SaveOptions }> => {
  const scene = fiveWalls();
  const files: Record<string, Uint8Array> = {};
  const records: Record<string, CacheRecord> = {};
  for (const [root, key] of cacheInputKeys(scene)) {
    const refs = [`${root}#0/a`];
    files[`${root}/0.brep`] = encoder.encode(`brep-bytes-of-${root}\n`);
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
            brep: { k: '0', refs, fingerprint: `fingerprint-of-${root}` },
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
  expect(Object.keys(cache.records), 'every root carried').toHaveLength(5);
  return { scene: pkg.scene, options: { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache } };
};

/** Two consecutive saves through one zipper, each storing `saveBnn`'s bytes; returns the posts. */
const twoSaves = async (scene: Scene, options: SaveOptions): Promise<Posted[]> => {
  const expected = saveBnn(scene, options);
  const worker = fakeWorker(scene);
  const zipper = createBnnZipper(worker);
  const store = new MemoryStore();
  for (let i = 0; i < 2; i++) {
    const key = await saveDocument(store, `Tower ${String(i)}`, scene, options, zipper);
    expect(same(await store.read(key), expected), `save ${String(i + 1)} bytes`).toBe(true);
  }
  expect(worker.posts).toHaveLength(2);
  return worker.posts;
};

const expectNoSceneOnCaller = (posted: Posted): void => {
  expect(posted.packed.includes('"elements": {'), 'no scene.json bytes posted').toBe(false);
  expect(posted.packed.includes('"thickness": 200'), 'no wall params posted as bytes').toBe(false);
  const { names, offsets } = posted.message.entries;
  const at = names.indexOf('scene.json');
  expect(at, 'scene.json keeps its zip place').toBeGreaterThanOrEqual(0);
  expect(offsets[at + 1]! - offsets[at]!, 'scene.json slice').toBe(0);
  expect(posted.sceneStringified, 'no stringify of the scene before the post').toBe(0);
};

describe('T-070 — scene.json is built in the zip worker', () => {
  it('the 5-wall cached file: no scene stringified or packed on the caller, two saves equal saveBnn', async () => {
    const { scene, options } = await openCachedFile();
    for (const posted of await twoSaves(scene, options)) expectNoSceneOnCaller(posted);
  });

  it('a cache-less save: no scene stringified or packed on the caller, two saves equal saveBnn', async () => {
    const scene = fiveWalls();
    const options: SaveOptions = { kernelBuildId: KERNEL_BUILD_ID, journal: [] };
    for (const posted of await twoSaves(scene, options)) expectNoSceneOnCaller(posted);
  });
});

describe('T-070 — a scene the worker cannot serialise rejects the save', () => {
  it('a scene with a BigInt rejects, and nothing is stored', async () => {
    // A BigInt survives structuredClone (the post) and makes JSON.stringify throw (the worker).
    const scene = { ...fiveWalls(), meta: 1n } as unknown as Scene;
    const store = new MemoryStore();
    const zipper = createBnnZipper(fakeWorker(scene));
    const options: SaveOptions = { kernelBuildId: KERNEL_BUILD_ID };
    await expect(saveDocument(store, 'Bad', scene, options, zipper)).rejects.toThrow(/BigInt/);
    expect(await store.list()).toEqual([]);
  });

  it('an empty scene.json with no scene posted rejects in the worker', () => {
    const reply = handleZipRequest({
      id: 0,
      entries: {
        names: ['manifest.json', 'scene.json'],
        offsets: [0, 2, 2],
        bytes: encoder.encode('{}'),
      },
    });
    expect('error' in reply ? reply.error : 'stored').toMatch(/scene\.json is a placeholder/);
  });

  it('a scene posted with no scene.json place rejects in the worker', () => {
    const reply = handleZipRequest({
      id: 0,
      entries: { names: ['manifest.json'], offsets: [0, 2], bytes: encoder.encode('{}') },
      scene: emptyScene(),
    });
    expect('error' in reply ? reply.error : 'stored').toMatch(/no place/);
  });
});
