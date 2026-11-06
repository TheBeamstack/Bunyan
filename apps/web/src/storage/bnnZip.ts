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
  serializeRecords,
  signBnnEntries,
  type CacheSigning,
  type PostedCacheSigning,
} from '@bunyan/document/cachesign';

export interface ZipRequest {
  readonly id: number;
  readonly entries: BnnEntries;
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
    const { entries, signing } = request;
    const signed =
      signing === undefined
        ? entries
        : signBnnEntries(entries, { ...signing, records: deserializeRecords(signing.records) });
    return { id: request.id, bytes: zipBnnEntries(signed) };
  } catch (error) {
    return { id: request.id, error: String(error) };
  }
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
 * The posting side. ⚠ Entries are cloned, never transferred: a carried cache entry is the doc's own buffer.
 * The records are serialized into one fresh buffer, which is transferred (T-064).
 */
export function createBnnZipper(port: ZipPort): BnnZipper {
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
        if (signing === undefined) {
          port.postMessage({ id, entries }, []);
          return;
        }
        const { envelope, secret } = signing;
        const records = serializeRecords(signing.records);
        port.postMessage({ id, entries, signing: { envelope, records, secret } }, [
          records.json.buffer as ArrayBuffer,
        ]);
      }),
  };
}
