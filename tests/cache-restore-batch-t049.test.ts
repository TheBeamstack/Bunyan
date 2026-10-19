// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-049 — a cache restore reads each batch of roots' entries in one `readMany`, not one `read` per part
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §4, §5). A 16k-part restore made 16k zip passes at
 * ~22.56 ms each; one `readMany` of 16k names measured 694 ms.
 *
 * The cache here is synthetic: records keyed by `cacheInputKeys`, and a gateway that answers `importBrep`
 * itself with the refs it was handed, so a restore runs with no kernel. A root that is built goes to
 * real OCCT.
 *
 * REVERT-VERIFY: restoring the per-part `files.read` in `restoreAssembly` turns the first test red
 * (recorded in the T-049 handoff).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CACHE_SCHEME,
  CORE_COMMANDS,
  DocumentContext,
  GEOMETRY_CACHE_DIR,
  RESTORE_BATCH_ROOTS,
  cacheInputKeys,
  createRegistries,
  emptyScene,
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import type {
  CacheEnvelope,
  CacheRecord,
  Element,
  GeometryCacheIndex,
  GeometryCacheReader,
  GeometryGateway,
  Scene,
} from '@bunyan/document';
import { wallType } from '@bunyan/types';

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';
const ENVELOPE: CacheEnvelope = {
  cache: CACHE_SCHEME,
  fingerprint: 'bnn1',
  kernelBuildId: KERNEL_BUILD_ID,
  codeId: 'test-bundle',
};
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MiB = 1024 * 1024;

/** `n` free-standing walls 1 m apart, so no two join and every one is its own assembly root. */
function walls(n: number): Scene {
  const elements: Record<string, Element> = {};
  for (let i = 0; i < n; i++) {
    const id = `W${String(i).padStart(5, '0')}`;
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

/** A cache whose root `i` carries `partsOf(i)` solids, each `.brep` an arbitrary byte string. */
function cacheFor(scene: Scene, partsOf: (i: number) => number): Record<string, Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  const records: Record<string, CacheRecord> = {};
  let i = 0;
  for (const [root, key] of cacheInputKeys(scene)) {
    const parts = [];
    for (let k = 0; k < partsOf(i); k++) {
      const refs = [`${root}#${String(k)}/a`, `${root}#${String(k)}/b`];
      files[`${root}/${String(k)}.brep`] = encoder.encode(`brep ${root} ${String(k)}\n`.repeat(8));
      parts.push({
        name: `layer${String(k)}`,
        materialId: 'concrete',
        discipline: 'structural',
        nodeId: `${root}#${String(k)}`,
        refs,
        brep: { k: String(k), refs, fingerprint: 'f' },
      });
    }
    records[root] = { key, root: { elementId: root, parts }, voids: [] };
    i++;
  }
  const index: GeometryCacheIndex = { envelope: ENVELOPE, records };
  files['index.json'] = encoder.encode(JSON.stringify(index));
  return files;
}

interface Counts {
  brepReads: number;
  readMany: number;
}

/** Counts what a restore asks of the file; `inner` does the reading. */
function counting(inner: GeometryCacheReader, counts: Counts): GeometryCacheReader {
  return {
    names: inner.names,
    read: (name) => {
      if (name.endsWith('.brep')) counts.brepReads++;
      return inner.read(name);
    },
    readMany: (names) => {
      counts.readMany++;
      return inner.readMany(names);
    },
  };
}

/** An in-memory `GeometryCacheReader` over `files`. */
function memoryReader(files: Record<string, Uint8Array>): GeometryCacheReader {
  const readMany = (wanted: Iterable<string>): Map<string, Uint8Array> => {
    const out = new Map<string, Uint8Array>();
    for (const name of wanted) if (Object.hasOwn(files, name)) out.set(name, files[name]!);
    return out;
  };
  return { names: Object.keys(files), read: (name) => readMany([name]).get(name), readMany };
}

/** The central-directory header of `name` (bnn-aggregate-ratio-t048.test.ts's helper). */
function centralHeader(zip: Uint8Array, name: string): number {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  for (let i = 0; i + 46 <= zip.length; i++) {
    if (view.getUint32(i, true) !== 0x02014b50) continue;
    const n = view.getUint16(i + 28, true);
    if (decoder.decode(zip.subarray(i + 46, i + 46 + n)) === name) return i;
  }
  throw new Error(`no header for ${name}`);
}

const CACHED = 'cached-';

describe('T-049 — a cache restore reads each batch of roots in one readMany', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  const live: DocumentContext[] = [];

  /** `importBrep` answered here (handle `cached-<n>`, the refs it was handed); everything else to OCCT. */
  const gateway: GeometryGateway = {
    request: async (op, payload, options) => {
      if (op === 'importBrep') {
        const { refs } = payload as { refs: readonly string[] };
        return {
          handle: `${CACHED}${String(live.length)}-${String(Math.random())}`,
          refs,
        } as never;
      }
      if (op === 'releaseShape' && (payload as { handle: string }).handle.startsWith(CACHED)) {
        return { released: true, liveHandles: 0 } as never;
      }
      return client.request(op, payload, options);
    },
  };

  const open = async (scene: Scene, files: GeometryCacheReader): Promise<DocumentContext> => {
    const registries = createRegistries();
    registries.types.register(wallType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({
      registries,
      geometry: gateway,
      scene,
      geometryCache: { files, current: ENVELOPE },
    });
    live.push(doc);
    await doc.rebuildAll();
    return doc;
  };

  const restored = (doc: DocumentContext, scene: Scene): string[] =>
    Object.keys(scene.elements).filter((id) =>
      (doc.geometryOf(id)?.parts ?? []).every((p) => p.handle.startsWith(CACHED)),
    );

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  }, 120_000);
  afterAll(async () => {
    for (const doc of live) await doc.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  it('restoring N roots makes 0 .brep reads and ceil(N/B) readMany calls, whatever the part count', async () => {
    const n = 2 * RESTORE_BATCH_ROOTS + 5;
    const scene = walls(n);
    for (const partsOf of [() => 1, (i: number) => 1 + (i % 4)]) {
      const counts: Counts = { brepReads: 0, readMany: 0 };
      const doc = await open(scene, counting(memoryReader(cacheFor(scene, partsOf)), counts));
      expect(restored(doc, scene)).toHaveLength(n);
      expect(counts).toEqual({ brepReads: 0, readMany: Math.ceil(n / RESTORE_BATCH_ROOTS) });
    }
  }, 120_000);

  it("a batch whose readMany throws a cap error rebuilds that batch's roots, and only those", async () => {
    const n = RESTORE_BATCH_ROOTS + 3;
    const scene = walls(n);
    const bytes = saveBnn(scene, {
      kernelBuildId: KERNEL_BUILD_ID,
      cache: cacheFor(scene, () => 2),
    });
    const pkg = loadBnn(bytes);
    const ids = Object.keys(scene.elements);
    const target = ids[n - 1]!;
    // After load, as in T-048: the reader retains these bytes, so the cap trips at the batch's readMany.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    view.setUint32(
      centralHeader(bytes, `${GEOMETRY_CACHE_DIR}${target}/1.brep`) + 24,
      2 * MiB,
      true,
    );
    expect(() => pkg.cache!.read(`${target}/1.brep`)).toThrow(/BNN_MAX_RATIO/);

    const doc = await open(pkg.scene, pkg.cache!);
    const fromCache = restored(doc, scene);
    expect(fromCache).toEqual(ids.slice(0, RESTORE_BATCH_ROOTS));
    for (const id of ids.slice(RESTORE_BATCH_ROOTS)) {
      expect(doc.geometryOf(id)?.state).toBe('valid');
    }
  }, 120_000);
});
