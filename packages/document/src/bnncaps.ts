// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/*
 * ⚠⚠ THE ZIP CAPS (spec §9 import hardening, T-046). Each is checked against what the central directory
 * DECLARES, before `unzipSync` inflates anything: fflate inflates a DEFLATE entry into a buffer of exactly
 * its declared `originalSize` (fflate 0.8.3 `unzipSync`), so bounding the declaration bounds the
 * allocation, and a stored entry copies only bytes the file really holds. Sized against design §5's 16k
 * target: 16,003 zip entries (T-046), and a 105 MB inflated cache whose largest entry is `index.json` at
 * 61.3 MB (R4, T-042), plus `scene.json` at 6.1 MB.
 *
 * ⚠ A leaf (T-063): it imports only `fflate`, so the cache-open worker runs the same check `loadBnn` does
 * without carrying scene, joins or document code.
 */

import { unzipSync } from 'fflate';

/** 16k solids, one `.brep` each, plus one directory entry per root at worst: 32,005; ~25% headroom. */
export const BNN_MAX_ENTRIES = 40_000;
/** The largest entry at 16k is the cache's `index.json`, 61.3 MB; ~4.4× headroom. */
export const BNN_MAX_ENTRY_BYTES = 256 * 1024 * 1024;
/** 16k inflates to ~111 MB (the 105 MB cache plus `scene.json`); ~4.8× headroom, still survivable in a tab. */
export const BNN_MAX_TOTAL_BYTES = 512 * 1024 * 1024;
/**
 * `scene.json` at 16k deflates 33:1 and the T-046 test's synthetic `.brep` 12.1:1; DEFLATE's ceiling is
 * ~1032:1, a bomb's ratio. Measured against the bytes the file holds for the entry (`entryRoom`).
 */
export const BNN_MAX_RATIO = 200;
/** Below this an entry's ratio is not checked: its size alone bounds what it can cost. */
const RATIO_FLOOR_BYTES = 1024 * 1024;

interface ZipEntryInfo {
  readonly name: string;
  readonly size: number;
  readonly originalSize: number;
  readonly compression: number;
}

export class BnnCapError extends Error {}

const refuse = (what: string): never => {
  throw new BnnCapError(`.bnn refused before inflating: ${what}`);
};

/**
 * Per central-directory entry, in order: the bytes the file holds for its data, from its local data start
 * to the next local header or the central directory. ⚠ The ratio is measured against this, never the
 * declared compressed size: the writer chooses that, and raising it let a 1024:1 entry pass (hmdnah, T-046
 * step 1). Two entries on one local header would count its bytes twice, so they are refused, as is zip64,
 * which `saveBnn` never writes and no file under the caps needs.
 */
function entryRoom(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (at: number): number =>
    at >= 0 && at + 2 <= bytes.length ? view.getUint16(at, true) : 0;
  const u32 = (at: number): number =>
    at >= 0 && at + 4 <= bytes.length ? view.getUint32(at, true) : 0;
  // The same end-of-central-directory search as fflate's `unzipSync`.
  let eocd = bytes.length - 22;
  while (eocd > 0 && u32(eocd) !== 0x06054b50 && bytes.length - eocd <= 65558) eocd--;
  if (u32(eocd) !== 0x06054b50) return [];
  if (u32(eocd - 20) === 0x07064b50) refuse('zip64 is not a .bnn layout');
  const centralDir = u32(eocd + 16);
  const offsets: number[] = [];
  for (let i = 0, at = centralDir; i < u16(eocd + 8); i++) {
    offsets.push(u32(at + 42));
    at += 46 + u16(at + 28) + u16(at + 30) + u16(at + 32);
  }
  const bounds = [...new Set([...offsets, centralDir, bytes.length])].sort((a, b) => a - b);
  if (bounds.length < offsets.length + 2) refuse('two entries share one local header');
  const next = new Map(bounds.map((bound, k) => [bound, bounds[k + 1] ?? bytes.length]));
  return offsets.map((off) => {
    const start = off + 30 + u16(off + 26) + u16(off + 28);
    return Math.max(0, (next.get(off) ?? bytes.length) - start);
  });
}

/**
 * Throws naming the cap `entry` passes; `index` is its position, `total` the inflated bytes so far, `room`
 * the bytes the file holds for it (`entryRoom`).
 */
function checkEntry(
  entry: ZipEntryInfo,
  index: number,
  total: number,
  room: number | undefined,
): number {
  if (index >= BNN_MAX_ENTRIES) {
    refuse(`more than BNN_MAX_ENTRIES (${String(BNN_MAX_ENTRIES)}) entries`);
  }
  const inflated = entry.compression === 0 ? entry.size : entry.originalSize;
  if (inflated > BNN_MAX_ENTRY_BYTES) {
    refuse(
      `"${entry.name}" declares ${String(inflated)} bytes, past BNN_MAX_ENTRY_BYTES (${String(BNN_MAX_ENTRY_BYTES)})`,
    );
  }
  const compressed = Math.min(entry.size, room ?? 0);
  if (
    entry.compression !== 0 &&
    inflated > RATIO_FLOOR_BYTES &&
    inflated > compressed * BNN_MAX_RATIO
  ) {
    refuse(
      `"${entry.name}" inflates ${String(inflated)}:${String(compressed)}, past BNN_MAX_RATIO (${String(BNN_MAX_RATIO)}:1)`,
    );
  }
  if (total + inflated > BNN_MAX_TOTAL_BYTES) {
    refuse(
      `the entries declare more than BNN_MAX_TOTAL_BYTES (${String(BNN_MAX_TOTAL_BYTES)}) bytes`,
    );
  }
  return total + inflated;
}

/**
 * A pass over the central directory that inflates nothing and throws at the first cap passed. Only the
 * entries `wanted` names are measured (all, without it), since only they will be inflated. ⚠ The
 * aggregate ratio is what bounds entries at or under `RATIO_FLOOR_BYTES`: 500 of 1 MiB zeros inflate
 * ~1016:1 together while no single one is ratio-checked (T-046 probe, T-048).
 */
export function checkCaps(bytes: Uint8Array, wanted?: (name: string) => boolean): void {
  const room = entryRoom(bytes);
  let index = 0;
  let total = 0;
  let held = 0;
  unzipSync(bytes, {
    filter: (file) => {
      const entry =
        wanted === undefined || wanted(file.name) ? file : { ...file, size: 0, originalSize: 0 };
      total = checkEntry(entry, index, total, room[index]);
      held += Math.min(entry.size, room[index] ?? 0);
      index++;
      return false;
    },
  });
  if (total > RATIO_FLOOR_BYTES && total > held * BNN_MAX_RATIO) {
    refuse(
      `the entries inflate ${String(total)}:${String(held)} together, past the aggregate BNN_MAX_RATIO (${String(BNN_MAX_RATIO)}:1)`,
    );
  }
}
