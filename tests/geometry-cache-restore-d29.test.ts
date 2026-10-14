// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R3 — the load-only restore (`docs/design/P5_step9_D29_bnn_cache_design.md` §4), real OCCT.
 *
 * Every test opens a `.bnn` written with a cache exported from a fully built document and compares the
 * result with a cache-less rebuild of the same scene. Which assemblies were restored is read off the
 * `importBrep` calls a spying gateway sees, mapped to roots by the part node ids the build produced.
 *
 * The fixture is D66's shape (a wall hosting a door, a curtain wall with D59 children) plus a wall
 * joined to the first at a corner, an isolated two-layer wall, and a round column (curved faces).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { FINGERPRINT_SCHEME, createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CACHE_SCHEME,
  CORE_COMMANDS,
  DocumentContext,
  cacheInputKeys,
  createRegistries,
  hostedBy,
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import type {
  CacheEnvelope,
  CacheRecord,
  CachedGeometry,
  CachedPart,
  ElementGeometry,
  GeometryCacheFiles,
  GeometryCacheIndex,
  GeometryGateway,
  ParamValue,
  Registries,
  Scene,
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

interface Fixture {
  readonly scene: Scene;
  readonly wallA: string;
  readonly wallB: string;
  readonly wallC: string;
  readonly cw: string;
  readonly column: string;
}

describe('D29 R3 — the load-only restore: restored ≡ rebuilt, and any refusal rebuilds', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  let fixture: Fixture;
  /** The cache a fully built document exports, and the node id → assembly root it was built under. */
  let cache: Record<string, Uint8Array>;
  let rootOfNode: Map<string, string>;
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
    /** The node id of every `importBrep` forwarded, refused or not. */
    readonly imports: string[];
    /** The handles `importBrep` returned, and the handles `releaseShape` was handed. */
    readonly imported: Set<string>;
    readonly released: Set<string>;
  }

  const spying = (): Spy => {
    const imports: string[] = [];
    const imported = new Set<string>();
    const released = new Set<string>();
    const gateway: GeometryGateway = {
      request: async (op, payload, options) => {
        if (op === 'importBrep') imports.push((payload as { nodeId: string }).nodeId);
        if (op === 'releaseShape') released.add((payload as { handle: string }).handle);
        const result = await client.request(op, payload, options);
        if (op === 'importBrep') imported.add((result as { handle: string }).handle);
        return result;
      },
    };
    return { gateway, imports, imported, released };
  };

  const open = (
    bytes: Uint8Array,
    gateway: GeometryGateway,
    current: CacheEnvelope = ENVELOPE,
  ): DocumentContext => {
    const pkg = loadBnn(bytes);
    const doc = new DocumentContext({
      registries: registries(),
      geometry: gateway,
      scene: pkg.scene,
      ...(pkg.cache === undefined ? {} : { geometryCache: { files: pkg.cache, current } }),
    });
    live.push(doc);
    return doc;
  };

  const rebuilt = async (scene: Scene): Promise<DocumentContext> => {
    const doc = new DocumentContext({ registries: registries(), geometry: client, scene });
    live.push(doc);
    await doc.rebuildAll();
    return doc;
  };

  /**
   * The assembly roots whose live geometry came from the cache: every part handle of the root, its
   * children and its voids is one `importBrep` returned. ⚠ Read off the live handles, not the import
   * calls — a refused restore imports too, then releases. An assembly mixing imported and built
   * handles, or holding a released import, fails here.
   */
  const restoredRoots = (doc: DocumentContext, spy: Spy): string[] => {
    expect(
      [...spy.imported].filter((h) => spy.released.has(h)),
      'an imported solid was released (a refused restore)',
    ).toEqual([]);
    const restored: string[] = [];
    for (const root of Object.keys(indexOf(cache).records)) {
      const g = doc.geometryOf(root);
      if (g === undefined) continue;
      const handles: string[] = [];
      const walk = (n: ElementGeometry): void => {
        for (const p of n.parts) handles.push(p.handle);
        for (const c of n.children ?? []) walk(c);
      };
      walk(g);
      for (const v of hostedBy(doc.scene, root)) walk(doc.geometryOf(v.id)!);
      const fromCache = handles.filter((h) => spy.imported.has(h)).length;
      expect([0, handles.length], `${root} mixes imported and built solids`).toContain(fromCache);
      if (handles.length > 0 && fromCache === handles.length) restored.push(root);
    }
    return restored.sort();
  };

  /** Every element's parts (no handles) and quantities at D28 rounding — what restored ≡ rebuilt means. */
  const snapshot = async (doc: DocumentContext): Promise<unknown> => {
    const ids = [...collectIds(doc)].sort();
    const out: Record<string, unknown> = {};
    for (const id of ids) {
      const g = doc.geometryOf(id)!;
      const parts = g.parts.map((p) => ({ ...p, handle: undefined }));
      const q = g.parts.length === 0 ? undefined : await doc.quantities(id);
      out[id] = {
        state: g.state,
        parts,
        children: (g.children ?? []).map((c) => c.elementId),
        element: g.element,
        quantities: q?.parts.map((p) => ({
          ...p,
          volume: Math.round(p.volume),
          area: Math.round(p.area),
          ...(p.mass === undefined ? {} : { mass: Math.round(p.mass) }),
        })),
      };
    }
    return { elements: out, brokenRefs: doc.brokenRefs() };
  };

  const collectIds = (doc: DocumentContext): Set<string> => {
    const ids = new Set<string>();
    const walk = (g: ElementGeometry): void => {
      ids.add(g.elementId);
      for (const c of g.children ?? []) walk(c);
    };
    for (const id of Object.keys(doc.scene.elements)) {
      const g = doc.geometryOf(id);
      if (g !== undefined) walk(g);
    }
    return ids;
  };

  /** Writes `geometry-cache/` from a built document — R4's job in the product; a test helper here. */
  const exportCache = async (doc: DocumentContext): Promise<Record<string, Uint8Array>> => {
    const files: Record<string, Uint8Array> = {};
    const records: Record<string, CacheRecord> = {};
    const keys = cacheInputKeys(doc.scene);
    for (const [root, key] of keys) {
      const g = doc.geometryOf(root);
      const voids = hostedBy(doc.scene, root)
        .map((e) => e.id)
        .sort()
        .map((id) => doc.geometryOf(id)!);
      if (g === undefined || g.state !== 'valid' || voids.some((v) => v.state !== 'valid'))
        continue;
      let k = 0;
      const node = async (n: ElementGeometry): Promise<CachedGeometry> => {
        const parts: CachedPart[] = [];
        for (const { handle, ...part } of n.parts) {
          const exported = await client.request('exportBrep', { handle });
          const name = String(k++);
          files[`${root}/${name}.brep`] = exported.brep;
          parts.push({
            ...part,
            brep: { k: name, refs: exported.refs, fingerprint: exported.fingerprint },
          });
        }
        const children: CachedGeometry[] = [];
        for (const c of n.children ?? []) children.push(await node(c));
        return {
          elementId: n.elementId,
          parts,
          ...(children.length === 0 ? {} : { children }),
          ...(n.element === undefined ? {} : { element: n.element }),
        };
      };
      const cachedVoids: CachedGeometry[] = [];
      for (const v of voids) cachedVoids.push(await node(v));
      records[root] = { key, root: await node(g), voids: cachedVoids };
    }
    const index: GeometryCacheIndex = { envelope: ENVELOPE, records };
    files['index.json'] = new TextEncoder().encode(JSON.stringify(index));
    return files;
  };

  const save = (scene: Scene, files: GeometryCacheFiles = cache): Uint8Array =>
    saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, cache: files });

  const indexOf = (files: GeometryCacheFiles): GeometryCacheIndex =>
    JSON.parse(new TextDecoder().decode(files['index.json'])) as GeometryCacheIndex;

  const withIndex = (index: GeometryCacheIndex): GeometryCacheFiles => ({
    ...cache,
    'index.json': new TextEncoder().encode(JSON.stringify(index)),
  });

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
    fixture = { scene: doc.scene, wallA, wallB, wallC, cw, column };

    const built = await rebuilt(doc.scene);
    cache = await exportCache(built);
    rootOfNode = new Map();
    for (const [root, record] of Object.entries(indexOf(cache).records)) {
      const walk = (n: CachedGeometry): void => {
        for (const p of n.parts) rootOfNode.set(p.nodeId, root);
        for (const c of n.children ?? []) walk(c);
      };
      walk(record.root);
      for (const v of record.voids) walk(v);
    }
  }, 180_000);

  afterAll(async () => {
    for (const doc of live) await doc.dispose();
    client.dispose();
    kernel.dispose?.();
  });

  it('every assembly is cached, and a restored model is the rebuilt one: refs token for token, quantities at D28 rounding', async () => {
    const roots = [fixture.wallA, fixture.wallB, fixture.wallC, fixture.cw, fixture.column].sort();
    expect(Object.keys(indexOf(cache).records).sort()).toEqual(roots);

    const spy = spying();
    const restored = open(save(fixture.scene), spy.gateway);
    await restored.rebuildAll();
    expect(restoredRoots(restored, spy), 'every assembly came from the cache').toEqual(roots);

    expect(await snapshot(restored)).toEqual(await snapshot(await rebuilt(fixture.scene)));
  });

  it('rebuildOnly restores; the edit paths (execute, undo, redo) never do', async () => {
    const spy = spying();
    const { imports } = spy;
    const doc = open(save(fixture.scene), spy.gateway);
    await doc.rebuildOnly([fixture.wallC]);
    expect(restoredRoots(doc, spy)).toEqual([fixture.wallC]);

    imports.length = 0;
    await doc.execute('core.setParams', { elementId: fixture.wallC, params: { end: [45_000, 0] } });
    // ⚠ After the undo wallC's key matches its record again, so a restoring undo WOULD import here.
    await doc.undo();
    await doc.redo();
    await doc.undo();
    expect(imports, 'an edit path imported a cached solid').toEqual([]);
  });

  it('an execute or redo landing on a cached key still never restores', async () => {
    // Opened with wall C off its record, so execute (and redo) land back ON the record's key: a
    // restoring execute or redo would pass the key check and import here.
    const edited = structuredClone(fixture.scene) as Scene & {
      elements: Record<string, { params: Record<string, unknown> }>;
    };
    edited.elements[fixture.wallC]!.params['end'] = [45_000, 0];

    const spy = spying();
    const { imports } = spy;
    const doc = open(save(edited), spy.gateway);
    await doc.rebuildAll();

    imports.length = 0;
    await doc.execute('core.setParams', { elementId: fixture.wallC, params: { end: [44_000, 0] } });
    expect(imports, 'execute imported a cached solid').toEqual([]);
    await doc.undo();
    await doc.redo();
    expect(imports, 'redo imported a cached solid').toEqual([]);
  });

  it('a hand-edited value rebuilds exactly the assemblies whose key it flips, joined neighbour included', async () => {
    const edited = structuredClone(fixture.scene) as Scene & {
      elements: Record<string, { params: Record<string, unknown> }>;
    };
    // B's FAR end moves: B's own row changes, and A's resolved miter at the shared corner moves with it.
    edited.elements[fixture.wallB]!.params['end'] = [7000, 4000];

    const spy = spying();
    const doc = open(save(edited), spy.gateway);
    await doc.rebuildAll();
    expect(restoredRoots(doc, spy)).toEqual([fixture.wallC, fixture.cw, fixture.column].sort());
    expect(await snapshot(doc)).toEqual(await snapshot(await rebuilt(edited)));
  });

  it('a hand-edit to a whole-digested table rebuilds every assembly', async () => {
    const edited = structuredClone(fixture.scene) as Scene & {
      materials: Record<string, { density: number }>;
    };
    edited.materials['glass']!.density = 2600;

    const { gateway, imports } = spying();
    const doc = open(save(edited), gateway);
    await doc.rebuildAll();
    expect(imports).toEqual([]);
    expect(await snapshot(doc)).toEqual(await snapshot(await rebuilt(edited)));
  });

  it('a different envelope ignores the whole cache', async () => {
    const { gateway, imports } = spying();
    const doc = open(save(fixture.scene), gateway, { ...ENVELOPE, codeId: 'another-bundle' });
    await doc.rebuildAll();
    expect(imports).toEqual([]);
  });

  /** Live solids after a fresh open + rebuildAll + dispose: any leaked import stays on the heap. */
  const leaksAfter = async (files: GeometryCacheFiles): Promise<{ doc: DocumentContext }> => {
    const before = kernel.wasmLiveHandles();
    const doc = open(save(fixture.scene, files), client);
    await doc.rebuildAll();
    const snap = await snapshot(doc);
    await doc.dispose();
    expect(kernel.wasmLiveHandles(), 'a refused restore leaked a handle').toBe(before);
    const again = open(save(fixture.scene, files), client);
    await again.rebuildAll();
    expect(snap).toEqual(await snapshot(await rebuilt(fixture.scene)));
    return { doc: again };
  };

  it("a tampered .brep (wall C's second solid, after its first imported) rebuilds and leaks no handle", async () => {
    const part = indexOf(cache).records[fixture.wallC]!.root.parts[1]!;
    const entry = `${fixture.wallC}/${part.brep.k}.brep`;
    const text = new TextDecoder().decode(cache[entry]);
    const tampered = new TextEncoder().encode(text.replace('44000', '44001'));
    expect(tampered).not.toEqual(cache[entry]);
    // The kernel refuses it (CACHE_STALE) — so what follows exercises the fallback, not a lucky match.
    await expect(
      client.request('importBrep', { nodeId: part.nodeId, brep: tampered, ...part.brep }),
    ).rejects.toMatchObject({ failure: { code: 'CACHE_STALE' } });

    const files = { ...cache, [entry]: tampered };
    const { gateway, imports } = spying();
    const doc = open(save(fixture.scene, files), gateway);
    await doc.rebuildAll();
    expect(imports.filter((n) => rootOfNode.get(n) === fixture.wallC)).toHaveLength(2);
    await leaksAfter(files);
  });

  it('a Part.refs that is not a permutation of what importBrep returned is a refusal', async () => {
    const index = indexOf(cache);
    const part = index.records[fixture.wallC]!.root.parts[1]!;
    const refs = [...part.refs];
    refs[0] = refs[1]!; // same length, a token duplicated and one dropped
    const mutated: GeometryCacheIndex = {
      ...index,
      records: {
        ...index.records,
        [fixture.wallC]: {
          ...index.records[fixture.wallC]!,
          root: {
            ...index.records[fixture.wallC]!.root,
            parts: [index.records[fixture.wallC]!.root.parts[0]!, { ...part, refs }],
          },
        },
      },
    };
    await leaksAfter(withIndex(mutated));
  });

  it('measures the Clean Delta question: restored vs rebuilt volume on an unedited element', async () => {
    const spy = spying();
    const restored = open(save(fixture.scene), spy.gateway);
    await restored.rebuildAll();
    // ⚠ Without this the measurement can compare a rebuild with a rebuild and read 0.
    expect(restoredRoots(restored, spy), 'the measured model came from the cache').toEqual(
      Object.keys(indexOf(cache).records).sort(),
    );
    const fresh = await rebuilt(fixture.scene);
    let worst = 0;
    const rows: string[] = [];
    for (const id of [...collectIds(fresh)].sort()) {
      if (fresh.geometryOf(id)!.parts.length === 0) continue;
      const a = (await fresh.quantities(id)).parts.reduce((s, p) => s + p.volume, 0) / 1e9;
      const b = (await restored.quantities(id)).parts.reduce((s, p) => s + p.volume, 0) / 1e9;
      worst = Math.max(worst, Math.abs(a - b));
      if (a !== b) rows.push(`${id}: rebuilt ${String(a)} m3, restored ${String(b)} m3`);
    }
    console.log(
      `[D29 R3] Clean Delta: max |restored - rebuilt| = ${String(worst)} m3 over ${String(
        collectIds(fresh).size,
      )} elements; exportCleanDelta's modified_qty threshold is 1e-9 m3\n${rows.join('\n')}`,
    );
    expect(worst).toBeLessThan(1e-9);
  });
});
