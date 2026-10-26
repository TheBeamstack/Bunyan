// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-067 — a named save names its carried cache entries and records, and the zip worker reads them from the
 * opened file (`docs/design/P5_step9_D29_bnn_cache_design.md` §3, §5; spec §6.5, T-047). The caller packs no
 * carried root's `.brep` or record JSON: it posts their names with the file, and the worker checks the
 * file's caps, inflates them and signs; the stored bytes equal `saveBnn`.
 *
 * REVERT-VERIFY: `packZipRequest` packing the carried bytes again turns "no carried bytes packed" red.
 */

import { describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import {
  DocumentContext,
  MemoryStore,
  assembleUnsignedBnnEntries,
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
  packZipRequest,
  type ZipPort,
  type ZipReply,
  type ZipRequest,
} from '../apps/web/src/storage/bnnZip';
import { handleCacheOpenRequest } from '../apps/web/src/storage/cacheOpen';
import { saveDocument } from '../apps/web/src/storage/documentStorage';
import { ENVELOPE, KERNEL_BUILD_ID, SECRET } from './fixtures/d29-cache-fixture.js';

const encoder = new TextEncoder();

interface Posted {
  readonly message: ZipRequest;
  readonly transfer: readonly ArrayBuffer[];
  /** The transferred bytes as the caller packed them, read before `postMessage` detaches them. */
  readonly packed: string;
}

/** A worker stand-in: the request crosses `structuredClone` WITH the caller's transfer list, as `postMessage`. */
const fakeWorker = (): ZipPort & { posts: Posted[] } => {
  const listeners: ((event: { data: ZipReply }) => void)[] = [];
  const port = {
    posts: [] as Posted[],
    postMessage(message: ZipRequest, transfer: ArrayBuffer[]): void {
      const packed = transfer.map((b) => Buffer.from(b).toString('latin1')).join('');
      const request = structuredClone(message, { transfer });
      port.posts.push({ message, transfer, packed });
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

/** A root's one-part record and its `.brep`, keyed `key`; the bytes name the root so a scan finds them. */
const entryFor = (root: string, key: string): { record: CacheRecord; brep: Uint8Array } => {
  const refs = [`${root}#0/a`];
  return {
    brep: encoder.encode(`brep-bytes-of-${root}\n`),
    record: {
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
    },
  };
};

/**
 * The 5-wall cached file of the T-064 and T-065 tests, its cache covering `cached` of the walls, opened
 * through the cache-open worker as `bootstrap` opens it.
 */
const openCachedFile = async (
  cached: number,
): Promise<{ scene: Scene; doc: DocumentContext; keys: Map<string, string> }> => {
  const elements: Record<string, Element> = {};
  for (let i = 0; i < 5; i++) elements[wall(i).id] = wall(i);
  const scene: Scene = { ...emptyScene(), elements };
  const keys = new Map(cacheInputKeys(scene));
  const files: Record<string, Uint8Array> = {};
  const records: Record<string, CacheRecord> = {};
  for (const [root, key] of [...keys].slice(0, cached)) {
    const { record, brep } = entryFor(root, key);
    files[`${root}/0.brep`] = brep;
    records[root] = record;
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
  return { scene: pkg.scene, doc, keys };
};

/** The carried roots' `.brep` bytes and record JSON, none of which may be in the packed buffer. */
const expectNoCarriedBytes = (posted: Posted, cache: UnsignedGeometryCache, carried: string[]) => {
  for (const root of carried) {
    expect(posted.packed.includes(`brep-bytes-of-${root}`), `${root}'s .brep packed`).toBe(false);
    expect(posted.packed.includes(`fingerprint-of-${root}`), `${root}'s record JSON packed`).toBe(
      false,
    );
    expect(cache.records[root], `${root} is in the save`).toBeDefined();
  }
  expect(posted.message.carried?.records, 'carried roots posted by name').toEqual(carried);
  expect(posted.message.carried?.entries, 'carried .breps posted by name').toEqual(
    carried.map((root) => `geometry-cache/${root}/0.brep`),
  );
};

/** Two consecutive saves through one zipper, each storing `saveBnn`'s bytes; returns the posts. */
const twoSaves = async (scene: Scene, options: SaveOptions): Promise<Posted[]> => {
  const worker = fakeWorker();
  const zipper = createBnnZipper(worker);
  const store = new MemoryStore();
  const expected = saveBnn(scene, options);
  for (let i = 0; i < 2; i++) {
    const key = saveDocument(store, `Tower ${String(i)}`, scene, options, zipper);
    expect(worker.posts).toHaveLength(i + 1);
    expect(same(await store.read(await key), expected), `save ${String(i + 1)} bytes`).toBe(true);
  }
  return worker.posts;
};

describe('T-067 — carried roots cross by name and are read from the opened file', () => {
  it('every root carried: no carried .brep or record JSON is packed, two saves equal saveBnn', async () => {
    const { scene, doc, keys } = await openCachedFile(5);
    const cache = doc.geometryCacheFiles()!;
    const carried = [...keys.keys()];
    expect(Object.keys(cache.records), 'every root carried').toEqual(carried);
    const posts = await twoSaves(scene, { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache });
    for (const posted of posts) expectNoCarriedBytes(posted, cache, carried);
  });

  it('some roots carried and others exported: only the exported bytes are packed, saveBnn bytes', async () => {
    const { scene, doc, keys } = await openCachedFile(3);
    const fromFile = doc.geometryCacheFiles()!;
    const carried = [...keys.keys()].slice(0, 3);
    expect(Object.keys(fromFile.records)).toEqual(carried);
    // The other two stand in for `exportCacheIdle` exports: bytes the file does not hold, posted packed.
    const records: Record<string, unknown> = {};
    const files: Record<string, Uint8Array> = {};
    for (const [root, key] of [...keys].slice(3)) {
      const { record, brep } = entryFor(root, key);
      records[root] = record;
      files[`${root}/0.brep`] = brep;
    }
    const cache: UnsignedGeometryCache = {
      ...fromFile,
      records: { ...records, ...fromFile.records },
      files: { ...files, ...fromFile.files },
    };
    const posts = await twoSaves(scene, { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache });
    for (const posted of posts) {
      expectNoCarriedBytes(posted, cache, carried);
      for (const root of Object.keys(records)) {
        expect(posted.packed.includes(`brep-bytes-of-${root}`), `${root}'s .brep packed`).toBe(
          true,
        );
      }
    }
  });
});

describe('T-067 — the worker reads carried names under the leaf cap check', () => {
  it('a carried name the file does not hold rejects the save', async () => {
    const { scene, doc } = await openCachedFile(5);
    const options = { kernelBuildId: KERNEL_BUILD_ID, cache: doc.geometryCacheFiles()! };
    const { entries, signing } = assembleUnsignedBnnEntries(scene, options);
    const { message } = packZipRequest(0, entries, signing);
    const ok = handleZipRequest(structuredClone(message));
    expect('bytes' in ok && same(ok.bytes, saveBnn(scene, options)), 'the request as built').toBe(
      true,
    );
    const { message: again } = packZipRequest(1, entries, signing);
    const missing: ZipRequest = {
      ...again,
      entries: {
        names: [...again.entries.names, 'geometry-cache/W999/0.brep'],
        offsets: [...again.entries.offsets, again.entries.offsets.at(-1)!],
        bytes: again.entries.bytes,
      },
      carried: {
        ...again.carried!,
        entries: [...again.carried!.entries, 'geometry-cache/W999/0.brep'],
      },
    };
    const reply = handleZipRequest(missing);
    expect('error' in reply ? reply.error : 'stored', 'the save rejects').toMatch(/W999/);
  });

  it("a carried entry past the file's caps is refused before it is inflated", () => {
    // 4 MiB of zeros deflates ~1000:1, past BNN_MAX_RATIO; the cap check refuses it from the directory.
    const file = zipSync(
      { 'geometry-cache/R/0.brep': new Uint8Array(4 * 1024 * 1024) },
      { level: 9 },
    );
    const request: ZipRequest = {
      id: 1,
      entries: { names: ['geometry-cache/R/0.brep'], offsets: [0, 0], bytes: new Uint8Array(0) },
      carried: { file, entries: ['geometry-cache/R/0.brep'], records: [] },
    };
    const reply = handleZipRequest(request);
    expect('error' in reply ? reply.error : 'stored').toMatch(/refused before inflating/);
  });
});
