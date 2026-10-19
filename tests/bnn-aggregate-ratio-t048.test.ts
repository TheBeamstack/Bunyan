// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-048 — many entries at or under `RATIO_FLOOR_BYTES` are refused by an aggregate ratio cap (spec §9
 * import hardening; `docs/design/P5_step9_D29_bnn_cache_design.md` §3, §5). Headless; no kernel.
 *
 * "Inflates nothing" is proved as in T-046: the hostile zip leads with a corrupt DEFLATE entry, so a loader
 * that inflated anything first throws "not a readable .bnn package" instead of the cap's name.
 *
 * REVERT-VERIFY: drop the aggregate check in `bnn.ts` `checkCaps` and the first two tests go red
 * (recorded in the T-048 handoff).
 */

import { describe, expect, it } from 'vitest';
import { unzipSync, zipSync } from 'fflate';
import { BNN_MAX_RATIO, GEOMETRY_CACHE_DIR, emptyScene, loadBnn, saveBnn } from '@bunyan/document';
import type { Element, Scene } from '@bunyan/document';

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MiB = 1024 * 1024;

/** Offset of `name`'s local header, or of its central-directory header. */
function header(zip: Uint8Array, name: string, central: boolean): number {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const [sig, nameAt] = central ? [0x02014b50, 46] : [0x04034b50, 30];
  for (let i = 0; i + 46 <= zip.length; i++) {
    if (view.getUint32(i, true) !== sig) continue;
    const n = view.getUint16(i + 28 - (central ? 0 : 2), true);
    if (decoder.decode(zip.subarray(i + nameAt, i + nameAt + n)) === name) return i;
  }
  throw new Error(`no header for ${name}`);
}

/** The T-046 handoff probe: 500 cache entries of 1 MiB zeros behind a corrupt `manifest.json`. */
function probe(): Uint8Array {
  const zeros = new Uint8Array(MiB); // one buffer, 500 names: the zip deflates each name alone
  const files: Record<string, Uint8Array> = {
    'manifest.json': encoder.encode(JSON.stringify({ kernelBuildId: KERNEL_BUILD_ID }).repeat(8)),
    'scene.json': encoder.encode(JSON.stringify(emptyScene())),
  };
  for (let i = 0; i < 500; i++) files[`geometry-cache/R/${String(i)}.brep`] = zeros;
  const zip = zipSync(files);
  const view = new DataView(zip.buffer);
  const local = header(zip, 'manifest.json', false);
  expect(view.getUint16(local + 8, true)).toBe(8); // DEFLATE, or the corruption proves nothing
  zip[local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)] = 0xff;
  return zip;
}

/** Design §5's R4 mix: per solid a 2,747 B `.brep` at ~4:1, and 3,830 B of `index.json` at ~15:1. */
function fullCache16k(): { scene: Scene; cache: Record<string, Uint8Array> } {
  let seed = 7;
  const next = (): number => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return seed >>> 8;
  };
  const roles = ['face', 'edge', 'vertex', 'top', 'bottom', 'start', 'end'];
  const elements: Record<string, Element> = {};
  const cache: Record<string, Uint8Array> = {};
  const records: string[] = [];
  for (let i = 0; i < 16_000; i++) {
    const id = `W${String(i)}`;
    elements[id] = {
      id,
      typeId: 'core.wall',
      typeVersion: 1,
      params: { start: [i * 10, 0], end: [i * 10 + 5000, 0], thickness: 200, height: 2400 },
      classification: { ifcClass: 'IfcWall', loadBearing: false },
    };
    let brep = '';
    while (brep.length < 2747)
      brep += `${(next() / 16777216).toFixed(15)} 0 1 0 0 1 0 0 0 1 ${String(i % 97)}\n`;
    cache[`${id}/0.brep`] = encoder.encode(brep.slice(0, 2747));
    let refs = '';
    for (let k = 0; refs.length < 3830 - 90; k++)
      refs += `{"nodeId":"${id}","role":"${roles[k % 7] ?? ''}","occurrence":${String(k % 13)}},`;
    const fingerprint = next().toString(16) + next().toString(16);
    records.push(
      `"${id}":{"k":0,"element":"${id}","fingerprint":"${fingerprint}","refs":[${refs}]}`,
    );
  }
  cache['index.json'] = encoder.encode(`{"records":{${records.join(',')}}}`);
  return { scene: { ...emptyScene(), elements }, cache };
}

describe('T-048 — an aggregate ratio cap over the entries a pass would inflate', () => {
  it('refuses the T-046 probe, naming the aggregate cap, before inflating anything', () => {
    const zip = probe();
    expect(zip.length).toBeLessThan(600_000); // the handoff measured 577,279 B
    expect(() => loadBnn(zip)).toThrow(/aggregate BNN_MAX_RATIO/);
  });

  it('cache.read refuses a read whose entries together grew past the ratio after load', () => {
    const cache: Record<string, Uint8Array> = { 'index.json': encoder.encode('{}') };
    for (let i = 0; i < 500; i++) cache[`R/${String(i)}.brep`] = encoder.encode('x\n'.repeat(64));
    const bytes = saveBnn(emptyScene(), { kernelBuildId: KERNEL_BUILD_ID, cache });
    const reader = loadBnn(bytes).cache;
    const names = Object.keys(cache).filter((n) => n.endsWith('.brep'));
    expect(reader?.readMany(names).size).toBe(500);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (const name of names)
      view.setUint32(header(bytes, GEOMETRY_CACHE_DIR + name, true) + 24, MiB, true);
    expect(() => reader?.readMany(names)).toThrow(/aggregate BNN_MAX_RATIO/);
  });

  it('a .bnn at the 16k target with a full cache still opens (design §5: 105 MB from ~14.6 MB)', () => {
    const { scene, cache } = fullCache16k();
    const bytes = saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, cache });
    let inflated = 0;
    let held = 0;
    unzipSync(bytes, {
      filter: (f) => {
        if (f.name.startsWith(GEOMETRY_CACHE_DIR)) {
          inflated += f.originalSize;
          held += f.size;
        }
        return false;
      },
    });
    expect(inflated).toBeGreaterThan(105e6);
    expect(held).toBeGreaterThan(14e6);
    expect(held).toBeLessThan(16e6);
    expect(inflated / held).toBeLessThan(BNN_MAX_RATIO);
    const pkg = loadBnn(bytes);
    expect(Object.keys(pkg.scene.elements)).toHaveLength(16_000);
    expect(pkg.cache?.names).toHaveLength(16_001);
    expect(pkg.cache?.read('W15999/0.brep')).toEqual(cache['W15999/0.brep']);
    expect(pkg.cache?.readMany(pkg.cache.names).size).toBe(16_001);
  }, 120_000);
});
