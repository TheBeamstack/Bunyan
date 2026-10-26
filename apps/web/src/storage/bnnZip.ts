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

import { zipBnnEntries, type BnnEntries } from '@bunyan/document/bnnzip';
import {
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

export interface ZipRequest {
  readonly id: number;
  readonly entries: PackedEntries;
  /**
   * Present ⇒ `entries` holds a placeholder index, signed here before the zip (T-060). Its records are one
   * transferred buffer (T-064), parsed here.
   */
  readonly signing?: PostedCacheSigning;
}

export type ZipReply =
  | { readonly id: number; readonly bytes: Uint8Array }
  | { readonly id: number; readonly error: string };

/** The worker side: one request, one reply. Equal entries give bytes equal to `saveBnn`. */
export function handleZipRequest(request: ZipRequest): ZipReply {
  try {
    const { signing } = request;
    const entries = unpackEntries(request.entries);
    const signed =
      signing === undefined
        ? entries
        : signBnnEntries(entries, { ...signing, records: deserializeRecords(signing.records) });
    return { id: request.id, bytes: zipBnnEntries(signed) };
  } catch (error) {
    return { id: request.id, error: String(error) };
  }
}

/** The entries back, views of the one buffer, in `names` order: equal to the entries packed. */
export function unpackEntries({ names, offsets, bytes }: PackedEntries): BnnEntries {
  return Object.fromEntries(
    names.map((name, i) => [name, bytes.subarray(offsets[i], offsets[i + 1])]),
  );
}

/** The posting side's steps, timed for `save-check` (T-065). */
export type ZipStep = 'serializeRecords' | 'pack' | 'post';

/**
 * One request in ONE fresh buffer, transferred with a cache (T-064, T-065): the entries, then the records'
 * JSON slices, then a copy of the secret. Every `Uint8Array` the message holds is a view of it, so
 * `postMessage` clones no entry, and the doc's own buffers (carried and exported `.brep`s) stay attached.
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
  const chunks = names.map((name) => entries[name]!);
  const recordChunks = signing === undefined ? undefined : recordJsonChunks(signing.records);
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
  lap('pack');
  // ⚠ A cache-less save's buffer is cloned, not transferred: T-064's test asserts it transfers nothing,
  // which contradicts T-065's done-when 1 (B-20261025-03). It holds only the manifest, scene and journal.
  return { message, transfer: signing === undefined ? [] : [buffer] };
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
