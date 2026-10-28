// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-052 — a shared-table edit re-keys every assembly (`docs/design/P5_step9_D29_bnn_cache_design.md` §2b), so
 * it must re-queue every live root for `exportCacheIdle` (§5), or a save after draining writes no record for
 * the roots it did not rebuild. Real OCCT: three isolated walls, two wearing `EXT`, one wearing `TWO`.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { FINGERPRINT_SCHEME, createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CACHE_SCHEME,
  CORE_COMMANDS,
  DocumentContext,
  GEOMETRY_CACHE_DIR,
  cacheInputKeys,
  createRegistries,
  loadBnn,
  saveBnn,
  isUnsignedGeometryCache,
  signGeometryCache,
} from '@bunyan/document';
import type {
  CacheEnvelope,
  DocumentOptions,
  GeometryCacheFiles,
  GeometryCacheIndex,
  GeometryGateway,
  Registries,
  Scene,
  UnsignedGeometryCache,
} from '@bunyan/document';
import { wallType } from '@bunyan/types';

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';
const ENVELOPE: CacheEnvelope = {
  cache: CACHE_SCHEME,
  fingerprint: FINGERPRINT_SCHEME,
  kernelBuildId: KERNEL_BUILD_ID,
  codeId: 'test-bundle',
};
const SECRET = new Uint8Array(32).fill(7);
const STEEL = { id: 'steel', name: 'S355', category: 'steel', density: 7850 };

describe('T-052 — a shared-table edit re-queues every live assembly whose cache key flipped', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let scene: Scene;
  let ids: { a: string; b: string; c: string };
  let roots: string[];
  /** A `.bnn` of `scene` whose cache holds every assembly. */
  let full: Uint8Array;
  const live: DocumentContext[] = [];

  const registries = (): Registries => {
    const r = createRegistries();
    r.types.register(wallType);
    for (const command of CORE_COMMANDS) r.commands.register(command);
    return r;
  };

  const make = (options: Omit<DocumentOptions, 'registries'>): DocumentContext => {
    const doc = new DocumentContext({ registries: registries(), ...options });
    live.push(doc);
    return doc;
  };

  /** Records `exportBrep` calls and every `importBrep` handle (the R4 test's spy). */
  const spying = (): { gateway: GeometryGateway; ops: string[]; imported: Set<string> } => {
    const spy = { ops: [] as string[], imported: new Set<string>() };
    const gateway: GeometryGateway = {
      request: async (op, payload, options) => {
        spy.ops.push(op);
        const result = await client.request(op, payload, options);
        if (op === 'importBrep') spy.imported.add((result as { handle: string }).handle);
        return result;
      },
    };
    return { ...spy, gateway };
  };

  const drain = async (doc: DocumentContext): Promise<void> => {
    while ((await doc.exportCacheIdle(8)) > 0);
  };

  /** A saved cache's index, or the one `geometryCacheFiles()`'s unsigned cache is signed into. */
  const indexOf = (
    cache: GeometryCacheFiles | UnsignedGeometryCache | undefined,
  ): GeometryCacheIndex => {
    const files = isUnsignedGeometryCache(cache!) ? signGeometryCache(cache) : cache!;
    return JSON.parse(new TextDecoder().decode(files['index.json'])) as GeometryCacheIndex;
  };

  /** Each root's written key, which must be its key against the document's current scene. */
  const writtenKeys = (doc: DocumentContext): Record<string, string> =>
    Object.fromEntries(
      Object.entries(indexOf(doc.geometryCacheFiles()).records).map(([root, r]) => [root, r.key]),
    );
  const currentKeys = (doc: DocumentContext): Record<string, string> =>
    Object.fromEntries(cacheInputKeys(doc.scene));

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));

    const doc = make({ geometry: client });
    await doc.execute('core.createMaterial', {
      id: 'concrete',
      name: 'C25/30',
      category: 'concrete',
      density: 2400,
    });
    await doc.execute('core.createMaterial', {
      id: 'plaster',
      name: 'Plaster',
      category: 'other',
      density: 1200,
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
    await doc.execute('core.createStyle', {
      id: 'TWO',
      name: 'TWO',
      typeId: wallType.id,
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
        { name: 'finish', materialId: 'plaster', thickness: 15, discipline: 'architectural' },
      ],
    });
    const wall = async (x: number, styleId: string): Promise<string> =>
      (
        await doc.execute('core.createElement', {
          typeId: wallType.id,
          styleId,
          containerId: 'l1',
          params: { start: [x, 0], end: [x + 4000, 0], height: 3000 },
        })
      ).changes[0]!.id;
    ids = { a: await wall(0, 'EXT'), b: await wall(10_000, 'EXT'), c: await wall(20_000, 'TWO') };
    roots = Object.values(ids).sort();
    scene = doc.scene;

    const built = make({
      geometry: client,
      scene,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
    });
    await built.rebuildAll();
    await drain(built);
    full = saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, cache: built.geometryCacheFiles() });
    expect(Object.keys(indexOf(cacheOfBnn(full)).records).sort()).toEqual(roots);
  }, 180_000);

  const cacheOfBnn = (bytes: Uint8Array): Record<string, Uint8Array> => {
    const out: Record<string, Uint8Array> = {};
    for (const [name, data] of Object.entries(unzipSync(bytes))) {
      if (name.startsWith(GEOMETRY_CACHE_DIR) && !name.endsWith('/'))
        out[name.slice(GEOMETRY_CACHE_DIR.length)] = data;
    }
    return out;
  };

  afterAll(async () => {
    for (const doc of live) await doc.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  it('a material edit rebuilds nothing, queues every root, and draining writes each under its current key', async () => {
    const doc = make({
      geometry: client,
      scene,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
    });
    await doc.rebuildAll();
    await drain(doc);
    expect(Object.keys(writtenKeys(doc)).sort()).toEqual(roots);

    const edit = await doc.execute('core.createMaterial', STEEL);
    expect(edit.rebuilt).toEqual([]);
    expect(await doc.exportCacheIdle(), 'one exported, the rest wait').toBeGreaterThan(0);
    await drain(doc);
    expect(writtenKeys(doc)).toEqual(currentKeys(doc));
    expect(Object.fromEntries(doc.cacheKeys()), 'the kept keys (T-062)').toEqual(currentKeys(doc));
    expect(Object.keys(writtenKeys(doc)).sort()).toEqual(roots);
  });

  it('a style edit that rebuilds only its instances re-queues the roots that do not use it', async () => {
    const doc = make({
      geometry: client,
      scene,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
    });
    await doc.rebuildAll();
    await drain(doc);

    const edit = await doc.execute('core.updateStyle', {
      styleId: 'TWO',
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
        { name: 'finish', materialId: 'plaster', thickness: 25, discipline: 'architectural' },
      ],
    });
    expect([...edit.rebuilt].sort()).toEqual([ids.c]);
    await drain(doc);
    expect(writtenKeys(doc)).toEqual(currentKeys(doc));
    expect(Object.fromEntries(doc.cacheKeys()), 'the kept keys (T-062)').toEqual(currentKeys(doc));
    expect(Object.keys(writtenKeys(doc)).sort()).toEqual(roots);
  });

  it('a restored document re-exports its restored roots after a material edit without rebuilding one', async () => {
    const pkg = loadBnn(full);
    const spy = spying();
    const doc = make({
      geometry: spy.gateway,
      scene: pkg.scene,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
      geometryCache: { files: pkg.cache!, current: ENVELOPE, installSecret: SECRET },
    });
    await doc.rebuildAll();
    const restored = (): string[] =>
      roots.filter((root) => doc.partsOf(root)!.every((p) => spy.imported.has(p.handle)));
    expect(restored(), 'every root came from the cache').toEqual(roots);

    spy.ops.length = 0;
    expect((await doc.execute('core.createMaterial', STEEL)).rebuilt).toEqual([]);
    await drain(doc);
    expect(restored(), 'no restored root was built from its recipe').toEqual(roots);
    expect(spy.ops.filter((op) => op === 'exportBrep').length).toBeGreaterThan(0);
    expect(writtenKeys(doc)).toEqual(currentKeys(doc));
    expect(Object.fromEntries(doc.cacheKeys()), 'the kept keys (T-062)').toEqual(currentKeys(doc));
    expect(Object.keys(writtenKeys(doc)).sort()).toEqual(roots);
  });

  it('a drained table edit, undone, carries the restored roots from the file again', async () => {
    const pkg = loadBnn(full);
    const doc = make({
      geometry: client,
      scene: pkg.scene,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
      geometryCache: { files: pkg.cache!, current: ENVELOPE, installSecret: SECRET },
    });
    await doc.rebuildAll();
    await doc.execute('core.createMaterial', STEEL);
    await drain(doc);
    await doc.undo();
    // A save before the re-drain: each root's stale export must not block its file carry.
    expect(writtenKeys(doc)).toEqual(currentKeys(doc));
    expect(Object.fromEntries(doc.cacheKeys()), 'the kept keys (T-062)').toEqual(currentKeys(doc));
  });

  it('with no geometryCacheEnvelope a material edit queues nothing', async () => {
    const doc = make({ geometry: client, scene });
    await doc.rebuildAll();
    await doc.execute('core.createMaterial', STEEL);
    expect(await doc.exportCacheIdle()).toBe(0);
    expect(doc.geometryCacheFiles()).toBeUndefined();
  });
});
