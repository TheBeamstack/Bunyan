// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R2 — `geometry-cache/` in the `.bnn` (`docs/design/P5_step9_D29_bnn_cache_design.md` §3, T-040).
 *
 * The cache is an optional directory: an old file opens, a cached file opens in the pre-R2 loader, and
 * the live loader inflates no cache entry until one is read. Headless; no kernel.
 *
 * REVERT-VERIFY: drop the `unzipSync` filter in `loadBnn` and "inflates nothing it does not read" goes
 * red (recorded in the T-040 handoff).
 */

import { describe, expect, it } from 'vitest';
import { unzipSync, zipSync } from 'fflate';
import { GEOMETRY_CACHE_DIR, emptyScene, loadBnn, saveBnn } from '@bunyan/document';
import type { Element, GeometryCacheFiles, Scene } from '@bunyan/document';
import { loadBnnPreR2 } from './fixtures/loadBnnPreR2.js';

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function fixture(): Scene {
  const wall = (id: string, start: [number, number], end: [number, number]): Element => ({
    id,
    typeId: 'core.wall',
    typeVersion: 1,
    params: { start, end, thickness: 200, height: 2400 },
    classification: { ifcClass: 'IfcWall', loadBearing: false },
  });
  return {
    ...emptyScene(),
    elements: { W1: wall('W1', [0, 0], [5000, 0]), W2: wall('W2', [5000, 0], [5000, 5000]) },
  };
}

/** Compressible bytes, so the entry is DEFLATEd and corrupting it breaks inflation. */
const brep = (seed: string): Uint8Array =>
  encoder.encode(`DBRep_DrawableShape ${seed}\n`.repeat(64));

function cache(): GeometryCacheFiles {
  return {
    'index.json': encoder.encode(JSON.stringify({ envelope: { cache: 'bnnc1' }, roots: {} })),
    'W1/0.brep': brep('W1'),
    'W2/0.brep': brep('W2'),
  };
}

/** Overwrites the first byte of `name`'s compressed data with an invalid DEFLATE block type. */
function corruptEntry(zip: Uint8Array, name: string): Uint8Array {
  const out = zip.slice();
  const nameBytes = encoder.encode(name);
  for (let i = 0; i + 30 + nameBytes.length <= out.length; i++) {
    const view = new DataView(out.buffer, out.byteOffset + i);
    if (view.getUint32(0, true) !== 0x04034b50) continue;
    const nameLength = view.getUint16(26, true);
    const extraLength = view.getUint16(28, true);
    const found = decoder.decode(out.subarray(i + 30, i + 30 + nameLength));
    if (found !== name) continue;
    expect(view.getUint16(8, true)).toBe(8); // DEFLATE, or the corruption proves nothing
    out[i + 30 + nameLength + extraLength] = 0xff;
    return out;
  }
  throw new Error(`no local header for ${name}`);
}

describe('D29 R2 — geometry-cache/ in the .bnn', () => {
  it('writes the cache under geometry-cache/ only when SaveOptions.cache is given', () => {
    const plain = unzipSync(saveBnn(fixture(), { kernelBuildId: KERNEL_BUILD_ID }));
    expect(Object.keys(plain).sort()).toEqual(['manifest.json', 'scene.json']);

    const cached = unzipSync(
      saveBnn(fixture(), { kernelBuildId: KERNEL_BUILD_ID, cache: cache() }),
    );
    expect(Object.keys(cached).sort()).toEqual([
      'geometry-cache/W1/0.brep',
      'geometry-cache/W2/0.brep',
      'geometry-cache/index.json',
      'manifest.json',
      'scene.json',
    ]);
    expect(GEOMETRY_CACHE_DIR).toBe('geometry-cache/');
  });

  it('an old file (no geometry-cache/) opens, and carries no cache reader', () => {
    const pkg = loadBnn(saveBnn(fixture(), { kernelBuildId: KERNEL_BUILD_ID }));
    expect(pkg.scene.elements).toEqual(fixture().elements);
    expect(pkg.cache).toBeUndefined();
  });

  it('a file with a cache opens through the pre-R2 loadBnn, identically to one without', () => {
    const plain = loadBnnPreR2(saveBnn(fixture(), { kernelBuildId: KERNEL_BUILD_ID }));
    const cached = loadBnnPreR2(
      saveBnn(fixture(), { kernelBuildId: KERNEL_BUILD_ID, cache: cache() }),
    );
    expect(cached).toEqual(plain);
  });

  it('the live loader lists the cache and reads each entry on demand', () => {
    const pkg = loadBnn(saveBnn(fixture(), { kernelBuildId: KERNEL_BUILD_ID, cache: cache() }));
    expect(pkg.scene.elements).toEqual(fixture().elements);
    const reader = pkg.cache;
    expect(reader).toBeDefined();
    expect([...(reader?.names ?? [])].sort()).toEqual(['W1/0.brep', 'W2/0.brep', 'index.json']);
    expect(reader?.read('W2/0.brep')).toEqual(brep('W2'));
    expect(reader?.read('index.json')).toEqual(cache()['index.json']);
    expect(reader?.read('W3/0.brep')).toBeUndefined();
  });

  it('inflates nothing it does not read: a corrupt cache entry costs only that entry', () => {
    const zip = corruptEntry(
      saveBnn(fixture(), { kernelBuildId: KERNEL_BUILD_ID, cache: cache() }),
      'geometry-cache/W1/0.brep',
    );
    // The pre-R2 loader inflates everything, so the same bytes refuse the whole file there.
    expect(() => loadBnnPreR2(zip)).toThrow(/not a readable \.bnn package/);

    const pkg = loadBnn(zip);
    expect(pkg.scene.elements).toEqual(fixture().elements);
    expect(pkg.cache?.read('W2/0.brep')).toEqual(brep('W2'));
    expect(() => pkg.cache?.read('W1/0.brep')).toThrow();
  });

  it('refuses a cache without index.json, or an entry name that escapes geometry-cache/', () => {
    const save = (files: GeometryCacheFiles): Uint8Array =>
      saveBnn(fixture(), { kernelBuildId: KERNEL_BUILD_ID, cache: files });
    expect(() => save({ 'W1/0.brep': brep('W1') })).toThrow(/index\.json/);
    for (const name of ['../scene.json', '/abs.brep', 'W1//0.brep', 'W1\\0.brep', 'W1/', '']) {
      expect(() => save({ ...cache(), [name]: brep('x') }), name).toThrow(/cache entry name/);
    }
  });

  it('a hand-zipped cache directory with a directory entry lists only files', () => {
    const zip = zipSync({
      'manifest.json': encoder.encode(JSON.stringify({ kernelBuildId: KERNEL_BUILD_ID })),
      'scene.json': encoder.encode(JSON.stringify(fixture())),
      'geometry-cache/': new Uint8Array(0),
      'geometry-cache/index.json': encoder.encode('{}'),
    });
    expect(loadBnn(zip).cache?.names).toEqual(['index.json']);
  });
});
