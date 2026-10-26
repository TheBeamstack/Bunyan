// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The named save's zip worker (T-058, design `P5_step9_D29_bnn_cache_design.md` §5): the main thread posts
 * `assembleUnsignedBnnEntries` output and gets back the `zipBnnEntries` bytes, so neither deflating a full
 * cache (~4.1 s at 16k) nor signing its index (~2 s, T-060) blocks it. Not the kernel worker: a save there
 * would stall OCCT. The install secret crosses to this same-origin worker with the records it signs.
 *
 * ⚠ Imports only the leaves `@bunyan/document/bnnzip` (fflate) and `/cachesign` (nothing), so the worker
 * bundle carries no document code.
 */

import { readZipEntries, zipBnnEntries, type BnnEntries } from '@bunyan/document/bnnzip';
import {
  CACHE_INDEX_ENTRY,
  carriedFrom,
  deserializeRecords,
  recordJsonChunks,
  signBnnEntries,
  type CacheSigning,
  type PostedCacheSigning,
} from '@bunyan/document/cachesign';

/**
 * A save's entries as one buffer (T-065): `names[i]`'s bytes are `bytes[offsets[i], offsets[i + 1])`, in the
 * entries' key order, which is the zip's order.
 */
export interface PackedEntries {
  readonly names: readonly string[];
  readonly offsets: readonly number[];
  readonly bytes: Uint8Array;
}

/**
 * What a save carries from the file it opened (T-067), by name: each named entry's and root's slice in the
 * packed buffers is empty, and the worker reads it from `file` (cloned, since the document retains it).
 */
export interface CarriedNames {
  readonly file: Uint8Array;
  /** Zip paths of carried `.brep` entries. */
  readonly entries: readonly string[];
  /** Roots whose record is read from `file`'s `index.json`. */
  readonly records: readonly string[];
}

export interface ZipRequest {
  readonly id: number;
  readonly entries: PackedEntries;
  /**
   * Present ⇒ `entries` holds a placeholder index, signed here before the zip (T-060). Its records are one
   * transferred buffer (T-064), parsed here.
   */
  readonly signing?: PostedCacheSigning;
  readonly carried?: CarriedNames;
}

export type ZipReply =
  | { readonly id: number; readonly bytes: Uint8Array }
  | { readonly id: number; readonly error: string };

/** The worker side: one request, one reply. Equal entries give bytes equal to `saveBnn`. */
export function handleZipRequest(request: ZipRequest): ZipReply {
  try {
    const { signing, carried } = request;
    const packedNames = new Set(request.entries.names);
    for (const name of carried?.entries ?? []) {
      if (!packedNames.has(name)) throw new Error(`carried entry "${name}" has no place in the zip`);
    }
    const fromFile = readCarried(carried);
    const entries = { ...unpackEntries(request.entries), ...fromFile.entries };
    const signed =
      signing === undefined
        ? entries
        : signBnnEntries(entries, {
            ...signing,
            records: deserializeRecords(signing.records, fromFile.record),
          });
    return { id: request.id, bytes: zipBnnEntries(signed) };
  } catch (error) {
    return { id: request.id, error: String(error) };
  }
}

/**
 * The carried entries and records, read from the opened file in one pass under its caps (T-067). They were
 * read from these same bytes when the save was assembled, and the records were verified there, so what is
 * read equals what was carried; a name the file does not hold throws, and the save rejects.
 */
function readCarried(carried: CarriedNames | undefined): {
  readonly entries: BnnEntries;
  readonly record?: (root: string) => unknown;
} {
  if (carried === undefined) return { entries: {} };
  const withIndex = carried.records.length > 0;
  const read = readZipEntries(carried.file, [
    ...carried.entries,
    ...(withIndex ? [CACHE_INDEX_ENTRY] : []),
  ]);
  const entries = Object.fromEntries(carried.entries.map((name) => [name, read[name]!]));
  if (!withIndex) return { entries };
  const index = JSON.parse(new TextDecoder().decode(read[CACHE_INDEX_ENTRY])) as {
    records?: Record<string, unknown>;
  };
  const records = index.records ?? {};
  const named = new Set(carried.records);
  for (const root of named) {
    if (!Object.hasOwn(records, root)) throw new Error(`the opened file has no record "${root}"`);
  }
  return { entries, record: (root) => (named.has(root) ? records[root] : undefined) };
}

/** The entries back, views of the one buffer, in `names` order: equal to the entries packed. */
export function unpackEntries({ names, offsets, bytes }: PackedEntries): BnnEntries {
  return Object.fromEntries(
    names.map((name, i) => [name, bytes.subarray(offsets[i], offsets[i + 1])]),
  );
}

const NO_BYTES = new Uint8Array(0);

/** The posting side's steps, timed for `save-check` (T-065). */
export type ZipStep = 'serializeRecords' | 'pack' | 'post';

/**
 * One request in ONE fresh buffer, always transferred (T-064, T-065): the entries, then the records' JSON
 * slices, then a copy of the secret. A `.brep` or record read unchanged from the opened file is not copied:
 * its slice is empty and `carried` names it, with that file (T-067). Every other `Uint8Array` the message
 * holds is a view of the buffer, so `postMessage` clones no entry, and the doc's own buffers stay attached.
 */
export function packZipRequest(
  id: number,
  entries: BnnEntries,
  signing?: CacheSigning,
  observe?: (step: ZipStep, ms: number) => void,
): { readonly message: ZipRequest; readonly transfer: ArrayBuffer[] } {
  let at = performance.now();
  const lap = (step: ZipStep): void => {
    const now = performance.now();
    observe?.(step, now - at);
    at = now;
  };
  const names = Object.keys(entries);
  // T-067: what was read unchanged from one opened file crosses by name, read there again by the worker.
  let file: Uint8Array | undefined;
  const fromFile = (value: unknown, name: string): boolean => {
    const mark = carriedFrom(value);
    if (mark === undefined || mark.name !== name) return false;
    file ??= mark.file;
    return mark.file === file;
  };
  const carriedEntries = names.filter((name) => fromFile(entries[name], name));
  const carriedRoots =
    signing === undefined
      ? []
      : Object.keys(signing.records).filter((root) => fromFile(signing.records[root], root));
  const skipEntries = new Set(carriedEntries);
  const skipRoots = new Set(carriedRoots);
  const chunks = names.map((name) => (skipEntries.has(name) ? NO_BYTES : entries[name]!));
  const recordChunks =
    signing === undefined
      ? undefined
      : recordJsonChunks(signing.records, (root) => skipRoots.has(root));
  lap('serializeRecords');
  const all = [...chunks, ...(recordChunks?.chunks ?? []), ...(signing ? [signing.secret] : [])];
  const offsets = [0];
  for (const chunk of all) offsets.push(offsets[offsets.length - 1]! + chunk.length);
  const buffer = new ArrayBuffer(offsets[offsets.length - 1]!);
  const whole = new Uint8Array(buffer);
  for (const [i, chunk] of all.entries()) whole.set(chunk, offsets[i]);
  const end = offsets[names.length]!;
  const packed: PackedEntries = {
    names,
    offsets: offsets.slice(0, names.length + 1),
    bytes: whole.subarray(0, end),
  };
  let message: ZipRequest = { id, entries: packed };
  if (signing !== undefined && recordChunks !== undefined) {
    const records = recordChunks.roots.length;
    const recordsEnd = offsets[names.length + records]!;
    message = {
      id,
      entries: packed,
      signing: {
        envelope: signing.envelope,
        records: {
          roots: recordChunks.roots,
          offsets: offsets.slice(names.length, names.length + records + 1).map((o) => o - end),
          json: whole.subarray(end, recordsEnd),
        },
        secret: whole.subarray(recordsEnd),
      },
    };
  }
  if (file !== undefined) {
    message = { ...message, carried: { file, entries: carriedEntries, records: carriedRoots } };
  }
  lap('pack');
  return { message, transfer: [buffer] };
}

/** What the zipper needs of a `Worker`, so a node test can stand in for one. */
export interface ZipPort {
  postMessage(message: ZipRequest, transfer: ArrayBuffer[]): void;
  addEventListener(type: 'message', listener: (event: { data: ZipReply }) => void): void;
  addEventListener(type: 'error', listener: (event: { message?: string }) => void): void;
}

export interface BnnZipper {
  zip(entries: BnnEntries, signing?: CacheSigning): Promise<Uint8Array>;
  /** True once the worker fired `error`: every later `zip()` rejects, so the caller spawns a new zipper. */
  readonly failed: boolean;
}

/**
 * The posting side: each request is packed and its one buffer transferred (`packZipRequest`). `observe`
 * receives each posting step's duration.
 */
export function createBnnZipper(
  port: ZipPort,
  observe?: (step: ZipStep, ms: number) => void,
): BnnZipper {
  const pending = new Map<
    number,
    { resolve: (bytes: Uint8Array) => void; reject: (error: Error) => void }
  >();
  let next = 0;
  let failure: Error | undefined;
  port.addEventListener('message', ({ data }) => {
    const waiter = pending.get(data.id);
    if (waiter === undefined) return;
    pending.delete(data.id);
    if ('bytes' in data) waiter.resolve(data.bytes);
    else waiter.reject(new Error(`zip worker: ${data.error}`));
  });
  port.addEventListener('error', (event) => {
    failure = new Error(`zip worker failed: ${event.message ?? 'unknown error'}`);
    for (const waiter of pending.values()) waiter.reject(failure);
    pending.clear();
  });
  return {
    get failed() {
      return failure !== undefined;
    },
    zip: (entries, signing) =>
      new Promise((resolve, reject) => {
        if (failure !== undefined) {
          reject(failure);
          return;
        }
        const id = next++;
        pending.set(id, { resolve, reject });
        const { message, transfer } = packZipRequest(id, entries, signing, observe);
        const posting = performance.now();
        port.postMessage(message, transfer);
        observe?.('post', performance.now() - posting);
      }),
  };
}
