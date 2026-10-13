// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-046 — a hostile `.bnn` is refused before it inflates past an entry-count or size cap (spec §9 import
 * hardening; `docs/design/P5_step9_D29_bnn_cache_design.md` §3, §5). Headless; no kernel.
 *
 * "Inflates nothing past it" is proved by order: each hostile zip leads with a corrupt DEFLATE entry, so a
 * loader that inflated anything before checking the caps throws "not a readable .bnn package" instead of
 * the cap's name.
 *
 * REVERT-VERIFY: drop the `BNN_MAX_ENTRIES` check in `bnn.ts` `checkEntry` and the entry-count test goes red
 * (recorded in the T-046 handoff).
 */

import { describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import {
  BNN_MAX_ENTRIES,
  BNN_MAX_ENTRY_BYTES,
  BNN_MAX_RATIO,
  BNN_MAX_TOTAL_BYTES,
  emptyScene,
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import type { Element, Scene } from '@bunyan/document';

const KERNEL_BUILD_ID = 'occt-7.9.3-emcc-6.0.2';
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const MiB = 1024 * 1024;

const wall = (id: string, x: number): Element => ({
  id,
  typeId: 'core.wall',
  typeVersion: 1,
  params: { start: [x, 0], end: [x + 5000, 0], thickness: 200, height: 2400 },
  classification: { ifcClass: 'IfcWall', loadBearing: false },
});

/** A valid manifest and scene, preceded by a `manifest.json` whose DEFLATE data is invalid. */
function hostile(extra: Record<string, Uint8Array>): Uint8Array {
  const zip = zipSync({
    'manifest.json': encoder.encode(JSON.stringify({ kernelBuildId: KERNEL_BUILD_ID }).repeat(8)),
    'scene.json': encoder.encode(JSON.stringify(emptyScene())),
    ...extra,
  });
  return corruptData(zip, 'manifest.json');
}

/** Offsets of `name`'s local header and central-directory header. */
function headers(zip: Uint8Array, name: string): { local: number; central: number } {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let local = -1;
  let central = -1;
  for (let i = 0; i + 46 <= zip.length; i++) {
    const sig = view.getUint32(i, true);
    if (sig === 0x04034b50 && local < 0) {
      const n = view.getUint16(i + 26, true);
      if (decoder.decode(zip.subarray(i + 30, i + 30 + n)) === name) local = i;
    } else if (sig === 0x02014b50) {
      const n = view.getUint16(i + 28, true);
      if (decoder.decode(zip.subarray(i + 46, i + 46 + n)) === name) central = i;
    }
  }
  if (local < 0 || central < 0) throw new Error(`no headers for ${name}`);
  return { local, central };
}

function corruptData(zip: Uint8Array, name: string): Uint8Array {
  const out = zip.slice();
  const view = new DataView(out.buffer);
  const { local } = headers(out, name);
  expect(view.getUint16(local + 8, true)).toBe(8); // DEFLATE, or the corruption proves nothing
  out[local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)] = 0xff;
  return out;
}

/** Rewrites the sizes `name` DECLARES in the central directory — what a hostile writer controls. */
function declare(
  zip: Uint8Array,
  name: string,
  sizes: { compressed?: number; original: number },
): void {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const { central } = headers(zip, name);
  if (sizes.compressed !== undefined) view.setUint32(central + 20, sizes.compressed, true);
  view.setUint32(central + 24, sizes.original, true);
}

describe('T-046 — a hostile .bnn is refused before it inflates past a cap', () => {
  it('the leading corrupt entry is what an eager loader would trip on', () => {
    expect(() => loadBnn(hostile({}))).toThrow(/not a readable \.bnn package/);
  });

  it('refuses a zip over the entry cap, naming it', () => {
    const many: Record<string, Uint8Array> = {};
    for (let i = 0; i <= BNN_MAX_ENTRIES; i++)
      many[`geometry-cache/R/${String(i)}.brep`] = new Uint8Array(0);
    expect(() => loadBnn(hostile(many))).toThrow(/BNN_MAX_ENTRIES/);
  });

  it('refuses an entry that declares more than the per-entry cap, naming it', () => {
    const zip = hostile({ 'history.json': encoder.encode('[]'.repeat(64)) });
    declare(zip, 'history.json', { compressed: 64 * MiB, original: BNN_MAX_ENTRY_BYTES + 1 });
    expect(() => loadBnn(zip)).toThrow(/BNN_MAX_ENTRY_BYTES/);
  });

  it('refuses a high-ratio entry under the size cap, naming the ratio cap', () => {
    const zeros = new Uint8Array(8 * MiB); // deflates ~1000:1, deflate's ceiling
    expect(zeros.length).toBeLessThan(BNN_MAX_ENTRY_BYTES);
    expect(() => loadBnn(hostile({ 'thumbnail.png': zeros }))).toThrow(/BNN_MAX_RATIO/);
  });

  // hmdnah step-1 probe: the declared compressed size is the writer's to choose, so it is not the ratio's.
  it('refuses a high-ratio entry whose declared compressed size was raised past its bytes', () => {
    const zeros = new Uint8Array(8 * MiB);
    const zip = hostile({ 'thumbnail.png': zeros });
    declare(zip, 'thumbnail.png', {
      compressed: Math.ceil(zeros.length / 100),
      original: zeros.length,
    });
    expect(() => loadBnn(zip)).toThrow(/BNN_MAX_RATIO/);
  });

  it('refuses two entries that share one local header, which would count its bytes twice', () => {
    const bytes = saveBnn(emptyScene(), {
      kernelBuildId: KERNEL_BUILD_ID,
      cache: {
        'index.json': encoder.encode('{}'),
        'a.brep': encoder.encode('a\n'.repeat(64)),
        'b.brep': encoder.encode('b\n'.repeat(64)),
      },
    });
    expect(() => loadBnn(bytes.slice())).not.toThrow();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const a = headers(bytes, 'geometry-cache/a.brep');
    const b = headers(bytes, 'geometry-cache/b.brep');
    view.setUint32(b.central + 42, a.local, true);
    expect(() => loadBnn(bytes)).toThrow(/share one local header/);
  });

  it('refuses entries that together pass the total cap, each under the entry and ratio caps', () => {
    // Incompressible bytes, so each entry's real compressed size keeps its declared ratio under the cap.
    let seed = 1;
    const noiseBytes = Math.ceil(1.2 * MiB);
    const noise = (): Uint8Array =>
      Uint8Array.from({ length: noiseBytes }, () => {
        seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
        return seed >>> 24;
      });
    const names = ['a', 'b', 'c'].map((n) => `geometry-cache/${n}.brep`);
    const zip = hostile(Object.fromEntries(names.map((n) => [n, noise()])));
    const original = Math.floor(BNN_MAX_TOTAL_BYTES / 2.5);
    expect(original).toBeLessThan(BNN_MAX_ENTRY_BYTES);
    expect(original).toBeLessThan(noiseBytes * BNN_MAX_RATIO);
    for (const name of names) declare(zip, name, { original });
    expect(() => loadBnn(zip)).toThrow(/BNN_MAX_TOTAL_BYTES/);
  });

  it('cache.read refuses an entry that grew past the caps after load', () => {
    const bytes = saveBnn(emptyScene(), {
      kernelBuildId: KERNEL_BUILD_ID,
      cache: { 'index.json': encoder.encode('{}'), 'W1/0.brep': encoder.encode('x\n'.repeat(64)) },
    });
    const reader = loadBnn(bytes).cache;
    expect(reader?.read('W1/0.brep')).toEqual(encoder.encode('x\n'.repeat(64)));
    declare(bytes, 'geometry-cache/W1/0.brep', { original: BNN_MAX_ENTRY_BYTES + 1 });
    expect(() => reader?.read('W1/0.brep')).toThrow(/BNN_MAX_ENTRY_BYTES/);
  });

  it('a .bnn at the 16k target size still opens (design §5: 16k solids, 3,817 B each)', () => {
    const elements: Record<string, Element> = {};
    const cache: Record<string, Uint8Array> = { 'index.json': encoder.encode('{}') };
    for (let i = 0; i < 16_000; i++) {
      const id = `W${String(i)}`;
      elements[id] = wall(id, i * 10);
      let text = '';
      for (let k = 0; text.length < 3817; k++) text += `${(i * 31 + k).toFixed(15)} 0.5 0\n`;
      cache[`${id}/0.brep`] = encoder.encode(text.slice(0, 3817));
    }
    const scene: Scene = { ...emptyScene(), elements };
    const pkg = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD_ID, cache }));
    expect(Object.keys(pkg.scene.elements)).toHaveLength(16_000);
    expect(pkg.cache?.names).toHaveLength(16_001);
    expect(pkg.cache?.read('W15999/0.brep')).toEqual(cache['W15999/0.brep']);
  });
});
