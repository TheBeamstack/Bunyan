// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The named save's zip worker (T-058, design `P5_step9_D29_bnn_cache_design.md` §5): the main thread posts
 * `assembleBnnEntries` output and gets back the `zipBnnEntries` bytes, so deflating a full cache (~4.1 s at
 * 16k) never blocks it. Not the kernel worker: a save there would stall OCCT.
 *
 * ⚠ Imports only `@bunyan/document/bnnzip` (fflate), so the worker bundle carries no document code.
 */

import { zipBnnEntries, type BnnEntries } from '@bunyan/document/bnnzip';

export interface ZipRequest {
  readonly id: number;
  readonly entries: BnnEntries;
}

export type ZipReply =
  | { readonly id: number; readonly bytes: Uint8Array }
  | { readonly id: number; readonly error: string };

/** The worker side: one request, one reply. Equal entries give bytes equal to `saveBnn`. */
export function handleZipRequest(request: ZipRequest): ZipReply {
  try {
    return { id: request.id, bytes: zipBnnEntries(request.entries) };
  } catch (error) {
    return { id: request.id, error: String(error) };
  }
}

/** What the zipper needs of a `Worker`, so a node test can stand in for one. */
export interface ZipPort {
  postMessage(message: ZipRequest): void;
  addEventListener(type: 'message', listener: (event: { data: ZipReply }) => void): void;
  addEventListener(type: 'error', listener: (event: { message?: string }) => void): void;
}

export interface BnnZipper {
  zip(entries: BnnEntries): Promise<Uint8Array>;
  /** True once the worker fired `error`: every later `zip()` rejects, so the caller spawns a new zipper. */
  readonly failed: boolean;
}

/** The posting side. ⚠ Entries are cloned, never transferred: a carried cache entry is the doc's own buffer. */
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
    zip: (entries) =>
      new Promise((resolve, reject) => {
        if (failure !== undefined) {
          reject(failure);
          return;
        }
        const id = next++;
        pending.set(id, { resolve, reject });
        port.postMessage({ id, entries });
      }),
  };
}
