// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R4 — the lazy idle exporter and a save that never exports
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §5, §6 R4), real OCCT.
 *
 * The fixture is R3's (`geometry-cache-restore-d29.test.ts`): a wall hosting a door joined at a corner to
 * a second wall, an isolated two-layer wall, a curtain wall with D59 children and a round column.
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
  signedCacheIndex,
} from '@bunyan/document';
import type {
  CacheEnvelope,
  CacheRecord,
  ElementGeometry,
  GeometryCacheFiles,
  GeometryCacheIndex,
  GeometryGateway,
  ParamValue,
  Registries,
  Scene,
  UnsignedGeometryCache,
} from '@bunyan/document';
import {
  curtainWallColumnType,
  curtainWallMullionType,
  curtainWallPanelType,
  curtainWallType,
  openingType,
  wallType,
} from '@bunyan/types';
import { linearMemberType } from './fixtures/bim-types.js';

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';
const ENVELOPE: CacheEnvelope = {
  cache: CACHE_SCHEME,
  fingerprint: FINGERPRINT_SCHEME,
  kernelBuildId: KERNEL_BUILD_ID,
  codeId: 'test-bundle',
};
/** This install's secret, and another install's (R5). */
const SECRET = new Uint8Array(32).fill(7);
const OTHER = new Uint8Array(32).fill(9);

describe('D29 R4 — the cache is exported in idle time and carried; a save never exports', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let scene: Scene;
  let ids: { wallA: string; wallB: string; wallC: string; cw: string; column: string };
  let roots: string[];
  /** A `.bnn` of `scene` whose cache holds every assembly, written through the product path. */
  let full: Uint8Array;
  const live: DocumentContext[] = [];

  const registries = (): Registries => {
    const r = createRegistries();
    for (const type of [
      wallType,
      openingType,
      curtainWallType,
      curtainWallColumnType,
      curtainWallPanelType,
      curtainWallMullionType,
      linearMemberType,
    ]) {
      r.types.register(type);
    }
    for (const command of CORE_COMMANDS) r.commands.register(command);
    return r;
  };

  interface Spy {
    readonly gateway: GeometryGateway;
    readonly ops: string[];
    readonly imported: Set<string>;
    /** When set, an `exportBrep` result is held until the promise resolves (the request itself runs). */
    hold?: Promise<void>;
    /** Resolved once a held `exportBrep` has run in the kernel. */
    held?: () => void;
  }

  const spying = (): Spy => {
    const spy: Spy = {
      ops: [],
      imported: new Set(),
      gateway: {
        request: async (op, payload, options) => {
          spy.ops.push(op);
          const result = await client.request(op, payload, options);
          if (op === 'importBrep') spy.imported.add((result as { handle: string }).handle);
          if (op === 'exportBrep' && spy.hold !== undefined) {
            spy.held?.();
            await spy.hold;
          }
          return result;
        },
      },
    };
    return spy;
  };

  const open = (
    bytes: Uint8Array,
    gateway: GeometryGateway,
    installSecret: Uint8Array = SECRET,
  ): DocumentContext => {
    const pkg = loadBnn(bytes);
    const doc = new DocumentContext({
      registries: registries(),
      geometry: gateway,
      scene: pkg.scene,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: installSecret,
      ...(pkg.cache === undefined
        ? {}
        : { geometryCache: { files: pkg.cache, current: ENVELOPE, installSecret } }),
    });
    live.push(doc);
    return doc;
  };

  const fresh = (s: Scene, gateway: GeometryGateway = client): DocumentContext => {
    const doc = new DocumentContext({
      registries: registries(),
      geometry: gateway,
      scene: s,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: SECRET,
    });
    live.push(doc);
    return doc;
  };

  /** The product save: `geometryCacheFiles` straight into `saveBnn`. */
  const save = async (doc: DocumentContext): Promise<Uint8Array> =>
    saveBnn(doc.scene, {
      kernelBuildId: KERNEL_BUILD_ID,
      cache: await Promise.resolve(doc.geometryCacheFiles()),
    });

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

  const cacheOf = (bytes: Uint8Array): Record<string, Uint8Array> => {
    const out: Record<string, Uint8Array> = {};
    for (const [name, data] of Object.entries(unzipSync(bytes))) {
      if (name.startsWith(GEOMETRY_CACHE_DIR) && !name.endsWith('/')) {
        out[name.slice(GEOMETRY_CACHE_DIR.length)] = data;
      }
    }
    return out;
  };

  /** Roots whose every live part handle is an `importBrep` result (R3's test reads it the same way). */
  const restoredRoots = (doc: DocumentContext, spy: Spy): string[] => {
    const out: string[] = [];
    for (const root of roots) {
      const handles: string[] = [];
      const walk = (n: ElementGeometry): void => {
        for (const p of n.parts) handles.push(p.handle);
        for (const c of n.children ?? []) walk(c);
      };
      const g = doc.geometryOf(root);
      if (g === undefined) continue;
      walk(g);
      for (const e of Object.values(doc.scene.elements)) {
        if (e.hostId === root) walk(doc.geometryOf(e.id)!);
      }
      if (handles.length > 0 && handles.every((h) => spy.imported.has(h))) out.push(root);
    }
    return out.sort();
  };

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));

    const doc = new DocumentContext({ registries: registries(), geometry: client });
    live.push(doc);
    for (const m of [
      { id: 'concrete', name: 'C25/30', category: 'concrete', density: 2400 },
      { id: 'plaster', name: 'Plaster', category: 'other', density: 1200 },
      { id: 'glass', name: 'Glass', category: 'other', density: 2500 },
      { id: 'alu', name: 'Aluminium', category: 'steel', density: 2700 },
      { id: 'timber', name: 'Timber', category: 'timber', density: 600 },
    ]) {
      await doc.execute('core.createMaterial', m);
    }
    await doc.execute('core.createSection', {
      id: 'ROUND-300',
      name: 'ROUND-300',
      shape: 'circle',
      dimensions: { radius: 300 },
    });
    await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
    await doc.execute('core.createContainer', {
      id: 'bldg',
      kind: 'building',
      name: 'Tower A',
      parentId: 'site',
    });
    await doc.execute('core.createContainer', {
      id: 'l1',
      kind: 'level',
      name: 'Level 1',
      parentId: 'bldg',
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
    await doc.execute('core.createStyle', {
      id: 'COL',
      name: 'COL',
      typeId: linearMemberType.id,
      sectionId: 'ROUND-300',
      params: { materialId: 'concrete' },
    });

    const create = async (args: Readonly<Record<string, ParamValue>>): Promise<string> =>
      (await doc.execute('core.createElement', args)).changes[0]!.id;
    const wall = (start: number[], end: number[], styleId = 'EXT'): Promise<string> =>
      create({
        typeId: wallType.id,
        styleId,
        containerId: 'l1',
        params: { start, end, height: 3000 },
      });

    const wallA = await wall([0, 0], [6000, 0]);
    const wallB = await wall([6000, 0], [6000, 4000]); // joins A at (6000, 0)
    const structure = doc.partsOf(wallA)!.find((p) => p.name === 'structure')!;
    await create({
      typeId: openingType.id,
      hostId: wallA,
      hostRef: structure.refs.find((r) => r.includes('/face/lateral.1'))!,
      containerId: 'l1',
      params: {
        width: 1000,
        height: 2100,
        offsetU: 1000,
        offsetV: 0,
        leafMaterialId: 'timber',
        frameMaterialId: 'timber',
      },
    });
    const wallC = await wall([40_000, 0], [44_000, 0], 'TWO');
    const cw = await create({
      typeId: curtainWallType.id,
      containerId: 'l1',
      params: {
        origin: [10_000, 20_000],
        width: 3000,
        height: 2400,
        cols: 3,
        rows: 2,
        panelMaterialId: 'glass',
        mullionMaterialId: 'alu',
      },
    });
    const column = await create({
      typeId: linearMemberType.id,
      styleId: 'COL',
      containerId: 'l1',
      params: { length: 3000, direction: 'z' },
      placement: [{ kind: 'translate', by: [20_000, 20_000, 0] }],
    });
    expect(doc.brokenRefs(), 'the authored fixture is clean').toHaveLength(0);
    scene = doc.scene;
    ids = { wallA, wallB, wallC, cw, column };
    roots = [wallA, wallB, wallC, cw, column].sort();

    const built = fresh(scene);
    await built.rebuildAll();
    await drain(built);
    full = await save(built);
  }, 180_000);

  afterAll(async () => {
    for (const doc of live) await doc.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  it('a save calls no exportBrep: before idle export it writes no record, after it every one', async () => {
    const spy = spying();
    const doc = fresh(scene, spy.gateway);
    await doc.rebuildAll();
    spy.ops.length = 0;
    const early = await save(doc);
    expect(spy.ops, 'the save reached the kernel').toEqual([]);
    expect(Object.keys(indexOf(cacheOf(early)).records), 'unexported, so absent').toEqual([]);

    expect(await doc.exportCacheIdle(2), 'two of five exported, three wait').toBe(3);
    expect(spy.ops.filter((op) => op === 'exportBrep').length).toBeGreaterThan(0);
    await drain(doc);
    spy.ops.length = 0;
    const late = await save(doc);
    expect(spy.ops, 'the save reached the kernel').toEqual([]);
    expect(Object.keys(indexOf(cacheOf(late)).records).sort()).toEqual(roots);

    // What the idle exporter wrote restores: every root comes from the cache on reopen.
    const reopen = spying();
    const back = open(late, reopen.gateway);
    await back.rebuildAll();
    expect(restoredRoots(back, reopen)).toEqual(roots);
  });

  it('restored and D66-deferred assemblies are carried byte for byte when their key still matches', async () => {
    const original = cacheOf(full);
    const spy = spying();
    const doc = open(full, spy.gateway);
    await doc.rebuildOnly([ids.wallC]); // D66 first paint: wall C restored, the other four never built
    expect(restoredRoots(doc, spy)).toEqual([ids.wallC]);

    spy.ops.length = 0;
    const saved = cacheOf(await save(doc));
    expect(spy.ops, 'the save reached the kernel').toEqual([]);
    expect(Object.keys(indexOf(saved).records).sort()).toEqual(roots);
    const breps = (files: Record<string, Uint8Array>): Record<string, Uint8Array> =>
      Object.fromEntries(Object.entries(files).filter(([name]) => name !== 'index.json'));
    expect(breps(saved)).toEqual(breps(original));
    expect(indexOf(saved).records).toEqual(indexOf(original).records);
  });

  it("R5: another install's records are never carried into this install's signed save", async () => {
    const spy = spying();
    const doc = open(full, spy.gateway, OTHER);
    await doc.rebuildOnly([ids.wallC]); // D66 first paint; the other four stay unbuilt
    expect(restoredRoots(doc, spy), 'nothing restored from a foreign file').toEqual([]);
    expect(indexOf(doc.geometryCacheFiles()).records).toEqual({});
    await drain(doc);
    expect(Object.keys(indexOf(doc.geometryCacheFiles()).records)).toEqual([ids.wallC]);
  });

  it('R5: records verified under one secret are not re-signed under another', async () => {
    const pkg = loadBnn(full);
    const doc = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene: pkg.scene,
      geometryCache: { files: pkg.cache!, current: ENVELOPE, installSecret: SECRET },
      geometryCacheSecret: OTHER,
    });
    live.push(doc);
    await doc.rebuildOnly([ids.wallC]);
    expect(indexOf(doc.geometryCacheFiles()).records).toEqual({});
  });

  it('a write envelope with no install secret is refused at construction', () => {
    expect(
      () =>
        new DocumentContext({
          registries: registries(),
          geometry: client,
          scene,
          geometryCacheEnvelope: ENVELOPE,
        }),
    ).toThrow(/geometryCacheSecret/);
  });

  it('a built assembly is not carried: absent until exported, then written under its new key', async () => {
    const doc = open(full, client);
    await doc.rebuildOnly([ids.wallC]);
    await doc.execute('core.setParams', { elementId: ids.column, params: { length: 3500 } });

    const before = indexOf(doc.geometryCacheFiles()).records;
    expect(Object.keys(before).sort()).toEqual(roots.filter((r) => r !== ids.column));
    expect(await doc.exportCacheIdle(5)).toBe(0);
    const after = indexOf(doc.geometryCacheFiles()).records;
    expect(Object.keys(after).sort()).toEqual(roots);
    expect(after[ids.column]!.key).not.toBe(indexOf(cacheOf(full)).records[ids.column]!.key);
    expect(doc.cacheKeys(), "the kept keys are this scene's (T-062)").toEqual(
      cacheInputKeys(doc.scene),
    );
  });

  it('a restore refused and rebuilt under a matching key does not carry the refused bytes', async () => {
    const files = cacheOf(full);
    const part = indexOf(files).records[ids.wallC]!.root.parts[1]!;
    const entry = `${ids.wallC}/${part.brep.k}.brep`;
    const text = new TextDecoder().decode(files[entry]);
    files[entry] = new TextEncoder().encode(text.replace('44000', '44001'));
    expect(files[entry]).not.toEqual(cacheOf(full)[entry]);

    const spy = spying();
    const doc = open(saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, cache: files }), spy.gateway);
    await doc.rebuildAll();
    expect(restoredRoots(doc, spy)).toEqual(roots.filter((r) => r !== ids.wallC));
    const written = indexOf(doc.geometryCacheFiles()).records;
    expect(Object.keys(written).sort()).toEqual(roots.filter((r) => r !== ids.wallC));
    await doc.exportCacheIdle(1);
    expect(cacheOf(await save(doc))[entry]).toEqual(cacheOf(full)[entry]);
  });

  it('an unbuilt assembly whose neighbour moved is not written', async () => {
    const edited = structuredClone(scene) as Scene & {
      elements: Record<string, { params: Record<string, unknown> }>;
    };
    // B's far end moves in the file: B's own key flips, and A's (its resolved miter at the corner).
    edited.elements[ids.wallB]!.params['end'] = [7000, 4000];
    const moved = saveBnn(edited, { kernelBuildId: KERNEL_BUILD_ID, cache: cacheOf(full) });

    const doc = open(moved, client);
    await doc.rebuildOnly([ids.wallC]); // A and B stay unbuilt
    expect(doc.geometryOf(ids.wallA)).toBeUndefined();
    const written = Object.keys(indexOf(doc.geometryCacheFiles()).records).sort();
    expect(written).toEqual([ids.wallC, ids.cw, ids.column].sort());
  });

  it('an exported entry whose key a later edit flipped is not written', async () => {
    const doc = fresh(scene);
    await doc.rebuildAll();
    await drain(doc);
    expect(Object.keys(indexOf(doc.geometryCacheFiles()).records).sort()).toEqual(roots);
    // A new material re-keys every assembly (the shared-table digest) and rebuilds none; T-052 re-queues all.
    await doc.execute('core.createMaterial', {
      id: 'steel',
      name: 'S355',
      category: 'steel',
      density: 7850,
    });
    expect(await doc.exportCacheIdle(0)).toBe(roots.length);
    expect(indexOf(doc.geometryCacheFiles()).records).toEqual({});
    expect(doc.cacheKeys(), "the kept keys are this scene's (T-062)").toEqual(
      cacheInputKeys(doc.scene),
    );
  });

  /**
   * Design §5's two unmeasured figures. The fixture's real exported cache is replicated, assembly by
   * assembly under fresh root ids, to `solids` `.brep` entries: DEFLATE compresses each zip entry alone,
   * so a replicated entry costs what the original does. Printed; asserted only for sanity.
   */
  const measure = (solids: number): string => {
    const source = cacheOf(full);
    const records = indexOf(source).records;
    const files: Record<string, Uint8Array> = {};
    const out: Record<string, CacheRecord> = {};
    let n = 0;
    for (let copy = 0; n < solids; copy++) {
      for (const [root, record] of Object.entries(records)) {
        const id = `x${String(copy)}-${root}`;
        out[id] = record;
        for (const [name, bytes] of Object.entries(source)) {
          if (name.startsWith(`${root}/`)) {
            files[`${id}/${name.slice(root.length + 1)}`] = bytes;
            n++;
          }
        }
      }
    }
    const signStart = performance.now();
    files['index.json'] = signedCacheIndex(ENVELOPE, out, SECRET);
    const signMs = performance.now() - signStart;

    const time = (cache?: GeometryCacheFiles): { ms: number; bytes: Uint8Array } => {
      let best = Infinity;
      let bytes: Uint8Array = new Uint8Array();
      for (let i = 0; i < 3; i++) {
        const t = performance.now();
        bytes = saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, ...(cache ? { cache } : {}) });
        best = Math.min(best, performance.now() - t);
      }
      return { ms: best, bytes };
    };
    const without = time();
    const withCache = time(files);
    const size = { brep: { raw: 0, packed: 0 }, index: { raw: 0, packed: 0 } };
    unzipSync(withCache.bytes, {
      filter: (f) => {
        if (f.name.startsWith(GEOMETRY_CACHE_DIR)) {
          const bucket = f.name.endsWith('.brep') ? size.brep : size.index;
          bucket.raw += f.originalSize;
          bucket.packed += f.size;
        }
        return false;
      },
    });
    expect(size.brep.packed).toBeGreaterThan(0);
    expect(size.brep.packed).toBeLessThan(size.brep.raw);
    const line = (what: string, { raw, packed }: { raw: number; packed: number }): string =>
      `${what} ${String(raw)} B raw (${(raw / n).toFixed(0)} B/solid), ${String(packed)} B ` +
      `compressed (${(packed / n).toFixed(0)} B/solid, ${(raw / packed).toFixed(2)}:1)`;
    return (
      `[D29 R4] ${String(n)} solids: ${line('.brep', size.brep)}; ${line('index.json', size.index)}; ` +
      `saveBnn ${without.ms.toFixed(1)} ms without the cache, ${withCache.ms.toFixed(1)} ms with it; ` +
      `signing index.json (R5) ${signMs.toFixed(1)} ms`
    );
  };

  it('measures the compressed cache and the save time at the fixture', () => {
    console.log(measure(1));
  });

  it.runIf(process.env['BUNYAN_D29_MEASURE_16K'] === '1')(
    'measures the compressed cache and the save time at 16k solids',
    () => {
      console.log(measure(16_000));
    },
    300_000,
  );

  it('an export overtaken by an edit to its assembly is dropped, and the root exports again', async () => {
    const spy = spying();
    const doc = fresh(scene, spy.gateway);
    await doc.rebuildAll();
    await drain(doc);
    await doc.execute('core.setParams', { elementId: ids.column, params: { length: 3200 } });

    let release!: () => void;
    spy.hold = new Promise((resolve) => (release = resolve));
    const ran = new Promise<void>((resolve) => (spy.held = resolve));
    const exporting = doc.exportCacheIdle(1); // the column: one solid, exported then held
    await ran;
    delete spy.hold;
    await doc.execute('core.setParams', { elementId: ids.column, params: { length: 3400 } });
    release();
    expect(await exporting, 'the edit queued the column again').toBe(1);
    expect(indexOf(doc.geometryCacheFiles()).records[ids.column]).toBeUndefined();
    expect(doc.cacheKeys(), "the kept keys are this scene's (T-062)").toEqual(
      cacheInputKeys(doc.scene),
    );

    expect(await doc.exportCacheIdle(1)).toBe(0);
    const reopen = spying();
    const back = open(await save(doc), reopen.gateway);
    await back.rebuildAll();
    expect(restoredRoots(back, reopen)).toEqual(roots);
    // The restored column is the 3400 mm one, not the solid the overtaken export held.
    const rebuilt = fresh(back.scene);
    await rebuilt.rebuildAll();
    const volume = async (d: DocumentContext): Promise<number> =>
      Math.round((await d.quantities(ids.column)).parts[0]!.volume);
    expect(await volume(back)).toBe(await volume(rebuilt));
  });
});
