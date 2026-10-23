// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * R4's 20-solid fixture (`geometry-cache-export-d29.test.ts`) on real OCCT, with its exported cache: walls,
 * a hosted opening, a curtain wall and a round column. Shared by the T-056 and T-058 zip tests.
 */

import { expect } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { FINGERPRINT_SCHEME, createOcctKernel } from '@bunyan/kernel-occt';
import {
  CACHE_SCHEME,
  CORE_COMMANDS,
  DocumentContext,
  createRegistries,
  signGeometryCache,
} from '@bunyan/document';
import type {
  CacheEnvelope,
  GeometryCacheFiles,
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
import { linearMemberType } from './bim-types.js';

export const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';
export const ENVELOPE: CacheEnvelope = {
  cache: CACHE_SCHEME,
  fingerprint: FINGERPRINT_SCHEME,
  kernelBuildId: KERNEL_BUILD_ID,
  codeId: 'test-bundle',
};
export const SECRET = new Uint8Array(32).fill(7);

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

/**
 * The authored scene and its fully exported cache, signed with `SECRET` under `ENVELOPE`, and the same
 * cache unsigned as `geometryCacheFiles()` returns it (T-060).
 */
export async function buildD29CacheFixture(): Promise<{
  scene: Scene;
  cache: GeometryCacheFiles;
  unsigned: UnsignedGeometryCache;
}> {
  const client = new KernelClient(new InProcessTransport(new KernelHost(await createOcctKernel())));
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
  const scene = doc.scene;

  const built = new DocumentContext({
    registries: registries(),
    geometry: client,
    scene,
    geometryCacheEnvelope: ENVELOPE,
    geometryCacheSecret: SECRET,
  });
  await built.rebuildAll();
  while ((await built.exportCacheIdle(8)) > 0);
  const unsigned = built.geometryCacheFiles()!;
  return { scene, cache: signGeometryCache(unsigned), unsigned };
}
