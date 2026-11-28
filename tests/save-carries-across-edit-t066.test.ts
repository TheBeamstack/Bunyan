// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-066 — a carried root's `.brep` bytes survive a new scene value while its key is unchanged
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §5; spec §6.5, T-047). After an open and one save, a
 * further save and a save after an edit to another root inflate none of the unchanged roots' entries, and
 * write the bytes a fresh document over the same file writes for that scene. Keys are still recomputed per
 * scene value (T-062). Real OCCT: three isolated walls, restored from a `.bnn` whose cache holds all three.
 *
 * REVERT-VERIFY: `geometryCacheFiles` ignoring the kept carry (`#carriedKept`) turns "no unchanged root
 * inflated after the edit" red.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  cacheInputKeys,
  createRegistries,
  loadBnn,
  saveBnn,
  signGeometryCache,
} from '@bunyan/document';
import type {
  DocumentOptions,
  GeometryCacheReader,
  Registries,
  Scene,
  UnsignedGeometryCache,
} from '@bunyan/document';
import { wallType } from '@bunyan/types';
import { ENVELOPE, KERNEL_BUILD_ID, SECRET } from './fixtures/d29-cache-fixture.js';

describe('T-066 — carried bytes survive a new scene value for every root whose key is unchanged', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let scene: Scene;
  let walls: string[];
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
  const bnnOf = (s: Scene, cache: UnsignedGeometryCache | undefined): Uint8Array =>
    saveBnn(s, { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache: signGeometryCache(cache!) });
  const same = (a: Uint8Array, b: Uint8Array): boolean => Buffer.from(a).equals(Buffer.from(b));

  /** A document over `full` with `options`, counting every `.brep` name its cache reader inflates. */
  const opened = (s: Scene): { doc: DocumentContext; inflated: string[] } => {
    const pkg = loadBnn(full);
    const inflated: string[] = [];
    const files: GeometryCacheReader = {
      ...pkg.cache!,
      readMany: (names) => {
        const wanted = [...names];
        inflated.push(...wanted);
        return pkg.cache!.readMany(wanted);
      },
    };
    const doc = make({
      geometry: client,
      scene: s,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
      geometryCache: { files, current: ENVELOPE, installSecret: SECRET },
    });
    return { doc, inflated };
  };
  const ofRoot = (names: readonly string[], root: string): string[] =>
    names.filter((n) => n.startsWith(`${root}/`));

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
    for (const x of [0, 10_000, 20_000]) {
      await doc.execute('core.createElement', {
        typeId: wallType.id,
        styleId: 'EXT',
        containerId: 'l1',
        params: { start: [x, 0], end: [x + 4000, 0], height: 3000 },
      });
    }
    scene = doc.scene;
    walls = Object.keys(scene.elements).sort();
    const built = make({
      geometry: client,
      scene,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
    });
    await built.rebuildAll();
    while ((await built.exportCacheIdle(8)) > 0);
    full = bnnOf(scene, built.geometryCacheFiles());
  }, 180_000);

  afterAll(async () => {
    for (const doc of live) await doc.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  it('after an open and one save, a further save and a save after an edit inflate no unchanged root', async () => {
    const { doc, inflated } = opened(scene);
    await doc.rebuildAll();
    const first = doc.geometryCacheFiles()!;
    expect(Object.keys(first.records).sort(), 'every root is carried').toEqual(walls);
    expect(same(bnnOf(doc.scene, first), full)).toBe(true);
    inflated.length = 0;

    const again = doc.geometryCacheFiles()!;
    expect(inflated, 'a further save of the same scene inflates nothing').toEqual([]);
    expect(same(bnnOf(doc.scene, again), full)).toBe(true);

    const [edited, ...kept] = walls as [string, ...string[]];
    const before = cacheInputKeys(doc.scene);
    await doc.execute('core.setParams', { elementId: edited, params: { height: 3200 } });
    const after = cacheInputKeys(doc.scene);
    expect(after.get(edited), 'the edit flips its own root').not.toBe(before.get(edited));
    for (const root of kept)
      expect(after.get(root), `${root} keeps its key`).toBe(before.get(root));

    const saved = doc.geometryCacheFiles()!;
    for (const root of kept)
      expect(ofRoot(inflated, root), 'no unchanged root inflated after the edit').toEqual([]);
    expect(Object.keys(saved.records).sort(), 'the edited root is built, not yet exported').toEqual(
      kept,
    );
    expect(doc.cacheKeys(), 'keys are the new scene value').toEqual(after);

    // The bytes a document with no kept carry writes for the edited scene, over the same file.
    const fresh = opened(doc.scene).doc;
    await fresh.openGeometryCache();
    expect(
      same(bnnOf(doc.scene, saved), bnnOf(doc.scene, fresh.geometryCacheFiles())),
      'bytes',
    ).toBe(true);
  });

  it('a root whose key flips is not carried under its old bytes', async () => {
    const { doc } = opened(scene);
    await doc.openGeometryCache();
    expect(Object.keys(doc.geometryCacheFiles()!.records).sort()).toEqual(walls);
    // A shared-table edit flips every key and rebuilds no wall (none reads the new row).
    await doc.execute('core.createMaterial', {
      id: 'steel',
      name: 'S355',
      category: 'steel',
      density: 7850,
    });
    expect(doc.geometryCacheFiles()!.records).toEqual({});
    expect(doc.cacheKeys()).toEqual(cacheInputKeys(doc.scene));
  });
});
