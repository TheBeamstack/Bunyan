// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-056 — a save's zip step can run in a worker and write the bytes `saveBnn` writes
 * (`docs/design/P5_step9_D29_bnn_cache_design.md` §5; spec §6.5, T-047). The entries cross a
 * `structuredClone`, as a `postMessage` to a worker would carry them. The cached case is R4's 20-solid
 * fixture (`geometry-cache-export-d29.test.ts`), built here on real OCCT.
 *
 * REVERT-VERIFY: in `bnnzip.ts` `zipBnnEntries`, level 5 turns the cached case red and a 1980-01-02 mtime both
 * cases, against the independent `zipSync` reference (the cache-less entries deflate alike at 5 and 6).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { FINGERPRINT_SCHEME, createOcctKernel } from '@bunyan/kernel-occt';
import {
  CACHE_SCHEME,
  CORE_COMMANDS,
  DocumentContext,
  assembleBnnEntries,
  createRegistries,
  emptyScene,
  saveBnn,
  zipBnnEntries,
} from '@bunyan/document';
import type {
  CacheEnvelope,
  GeometryCacheFiles,
  ParamValue,
  Registries,
  SaveOptions,
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

/** The worker path, and an independent reference: `zipSync` at level 6 with the 1980 local-time mtime. */
const expectWorkerBytesEqualSave = (scene: Scene, options: SaveOptions): void => {
  const entries = structuredClone(assembleBnnEntries(scene, options));
  const fromWorker = zipBnnEntries(entries);
  const saved = Buffer.from(saveBnn(scene, options));
  expect(Buffer.from(fromWorker).equals(saved), 'worker bytes equal saveBnn').toBe(true);
  const reference = zipSync(entries, { level: 6, mtime: new Date(1980, 0, 1) });
  expect(Buffer.from(reference).equals(saved), 'saveBnn equals the reference zip').toBe(true);
};

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

describe('T-056 — the zip step a worker runs writes saveBnn bytes', () => {
  let scene: Scene;
  let cache: GeometryCacheFiles;

  beforeAll(async () => {
    const client = new KernelClient(
      new InProcessTransport(new KernelHost(await createOcctKernel())),
    );
    const doc = new DocumentContext({ registries: registries(), geometry: client });
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
    await wall([6000, 0], [6000, 4000]);
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
    await wall([40_000, 0], [44_000, 0], 'TWO');
    await create({
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
    await create({
      typeId: linearMemberType.id,
      styleId: 'COL',
      containerId: 'l1',
      params: { length: 3000, direction: 'z' },
      placement: [{ kind: 'translate', by: [20_000, 20_000, 0] }],
    });
    expect(doc.brokenRefs(), 'the authored fixture is clean').toHaveLength(0);
    scene = doc.scene;

    const built = new DocumentContext({
      registries: registries(),
      geometry: client,
      scene,
      geometryCacheEnvelope: ENVELOPE,
      geometryCacheSecret: new Uint8Array(32).fill(7),
    });
    await built.rebuildAll();
    while ((await built.exportCacheIdle(8)) > 0);
    cache = await Promise.resolve(built.geometryCacheFiles()!);
  }, 180_000);

  it('the 20-solid fixture with its cache', () => {
    const solids = Object.keys(cache).filter((name) => name.endsWith('.brep'));
    expect(solids).toHaveLength(20);
    expectWorkerBytesEqualSave(scene, { kernelBuildId: KERNEL_BUILD_ID, journal: [], cache });
  });

  it('a scene without a cache', () => {
    expectWorkerBytesEqualSave(emptyScene(), { kernelBuildId: KERNEL_BUILD_ID, journal: [] });
  });
});
