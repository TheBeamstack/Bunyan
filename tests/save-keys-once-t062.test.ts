// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-062 — `geometryCacheFiles()` keys each root at most once per save (it used to re-key every carried
 * root through `usableRecord`), and a second save of the same scene object keys nothing and inflates no
 * carried entry again, while writing the same bytes (`docs/design/P5_step9_D29_bnn_cache_design.md` §5).
 * Real OCCT: three isolated walls, restored from a `.bnn` whose cache holds all three.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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
  signGeometryCache,
} from '@bunyan/document';
import type {
  CacheEnvelope,
  DocumentOptions,
  GeometryCacheReader,
  Registries,
  Scene,
  UnsignedGeometryCache,
} from '@bunyan/document';
import * as cachekey from '../packages/document/src/cachekey.ts';
import { wallType } from '@bunyan/types';

vi.mock('../packages/document/src/cachekey.ts', async (importOriginal) => {
  const original = await importOriginal<typeof cachekey>();
  return { ...original, cacheInputKey: vi.fn(original.cacheInputKey) };
});
const keyed = vi.mocked(cachekey.cacheInputKey);

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';
const ENVELOPE: CacheEnvelope = {
  cache: CACHE_SCHEME,
  fingerprint: FINGERPRINT_SCHEME,
  kernelBuildId: KERNEL_BUILD_ID,
  codeId: 'test-bundle',
};
const SECRET = new Uint8Array(32).fill(7);

describe('T-062 — a named save keys each cached root once, and not at all for an unchanged scene', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let scene: Scene;
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
  const drain = async (doc: DocumentContext): Promise<void> => {
    while ((await doc.exportCacheIdle(8)) > 0);
  };
  const cacheOfBnn = (bytes: Uint8Array): Record<string, Uint8Array> => {
    const out: Record<string, Uint8Array> = {};
    for (const [name, data] of Object.entries(unzipSync(bytes))) {
      if (name.startsWith(GEOMETRY_CACHE_DIR) && !name.endsWith('/'))
        out[name.slice(GEOMETRY_CACHE_DIR.length)] = data;
    }
    return out;
  };
  /** `cacheInputKey` calls per root while `run` runs. */
  const keysDuring = <T>(run: () => T): { result: T; perRoot: Map<string, number> } => {
    keyed.mockClear();
    const result = run();
    const perRoot = new Map<string, number>();
    for (const [, root] of keyed.mock.calls) perRoot.set(root, (perRoot.get(root) ?? 0) + 1);
    return { result, perRoot };
  };
  const bnnOf = (s: Scene, cache: UnsignedGeometryCache | undefined): Uint8Array =>
    saveBnn(s, { kernelBuildId: KERNEL_BUILD_ID, cache: signGeometryCache(cache!) });

  /** A restored document over `full`, counting every `.brep` name its cache reader inflates. */
  const restoredDoc = async (): Promise<{ doc: DocumentContext; inflated: string[] }> => {
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
      scene: pkg.scene,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
      geometryCache: { files, current: ENVELOPE, installSecret: SECRET },
    });
    await doc.rebuildAll();
    return { doc, inflated };
  };

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
    roots = Object.keys(scene.elements).sort();
    const built = make({
      geometry: client,
      scene,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
    });
    await built.rebuildAll();
    await drain(built);
    full = bnnOf(scene, built.geometryCacheFiles() as UnsignedGeometryCache);
    expect(Object.keys(cacheOfBnn(full)).filter((n) => n.endsWith('.brep')).length).toBe(3);
  }, 180_000);

  afterAll(async () => {
    for (const doc of live) await doc.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  it('a save of carried roots keys each once; a second save keys none, inflates none, writes the same bytes', async () => {
    const { doc, inflated } = await restoredDoc();
    inflated.length = 0;

    const first = keysDuring(() => doc.geometryCacheFiles());
    expect(Object.keys(first.result!.records).sort(), 'every root is carried').toEqual(roots);
    expect([...first.perRoot.keys()].sort()).toEqual(roots);
    expect(Math.max(...first.perRoot.values()), 'at most one key per root').toBe(1);
    const inflatedFirst = inflated.length;
    expect(inflatedFirst).toBeGreaterThan(0);

    const second = keysDuring(() => doc.geometryCacheFiles());
    expect(second.perRoot.size, 'an unchanged scene is not keyed again').toBe(0);
    expect(inflated.length, 'no carried entry is inflated again').toBe(inflatedFirst);
    expect(bnnOf(doc.scene, second.result)).toEqual(bnnOf(doc.scene, first.result));
    expect(bnnOf(doc.scene, second.result)).toEqual(full);
  });

  it('a save after the idle exporter drained keys each root once, and none again', async () => {
    const doc = make({
      geometry: client,
      scene,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
    });
    await doc.rebuildAll();
    await drain(doc);
    const first = keysDuring(() => doc.geometryCacheFiles());
    expect(Object.keys(first.result!.records).sort()).toEqual(roots);
    expect(Math.max(0, ...first.perRoot.values())).toBeLessThanOrEqual(1);
    expect(keysDuring(() => doc.geometryCacheFiles()).perRoot.size).toBe(0);
  });

  it('an edit re-keys the new scene: the kept keys are its keys, never the last commit', async () => {
    const { doc } = await restoredDoc();
    doc.geometryCacheFiles();
    await doc.execute('core.createMaterial', {
      id: 'steel',
      name: 'S355',
      category: 'steel',
      density: 7850,
    });
    const after = keysDuring(() => doc.geometryCacheFiles());
    expect([...after.perRoot.keys()].sort(), 'a shared-table edit re-keys every root').toEqual(
      roots,
    );
    expect(after.result!.records, 'no root carried under its old key').toEqual({});
    expect(doc.cacheKeys()).toEqual(cacheInputKeys(doc.scene));
  });
});
