# T-064 — a named save posts its geometry-cache records to the zip worker as one transferred buffer

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-064-a-named-save-posts-its-geometry-cache-re`
- task: `docs/BACKLOG.md` T-064 · risk: high · implements: design §2e, §5, §6 R4/R5 · spec §6.5

## Changed

- `packages/document/src/cachesign.ts` (still imports nothing):
  - `SerializedCacheRecords` is NEW. `OpenedCacheRecords` now extends it.
  - `PostedCacheSigning` is NEW.
  - `keepRecordJson` is NEW. It is a `WeakMap` from a record object to its `JSON.stringify` bytes.
  - `serializeRecords` is NEW. It copies kept bytes and stringifies any other record.
  - `deserializeRecords` is NEW. It uses `Object.fromEntries`, in `roots` order.
  - `serializeCacheRecords` now delegates to `serializeRecords`.
- `document.ts` `exportCacheIdle` keeps each exported record's JSON, at idle time.
- `cacherestore.ts` `lazyRecordLookup` keeps each parsed slice as its record's JSON.
- `apps/web/src/storage/bnnZip.ts`:
  - `createBnnZipper` serializes `signing.records` into one buffer and posts it with that buffer as the
    transfer list.
  - `handleZipRequest` deserializes the buffer and calls `signBnnEntries`.
  - `ZipPort.postMessage` takes a transfer list.
- `saveCheckMain.ts`:
  - The page now opens the index through `openCacheIndexInWorker`, as `bootstrap.ts:141` does.
  - `cloneSigningMs` is replaced by `serializeRecordsMs`. `assembleMs` and `cloneEntriesMs` are NEW.
- `tests/app-named-save-transfers-records-t064.test.ts` is NEW. It has three tests: the 20-solid fixture, a
  cache-less scene, and a 5-wall file opened through the worker.
- Design §5 has a T-064 paragraph. `BACKLOG.md ## Discovered` has one finding.

## Verified

- Before the fix, `pnpm exec vitest run tests/app-named-save-transfers-records-t064.test.ts` failed 2 of 3.
  After the fix, 3 passed.
- Revert-verify: posting `{ id, entries, signing }` again makes 2 of 3 fail. The message is "one transferred
  ArrayBuffer: expected [] to have a length of 1 but got +0". Restored, 3 passed.
- The test also checks four other things. The caller's buffer is detached after the post. The roots and
  offsets match. The caller calls `JSON.stringify` on no record. The stored bytes equal `saveBnn`.
- `pnpm verify` is green: 124 files, 1061 passed, 4 skipped. `docs:check` passed 66. That run includes the
  T-047, T-056, T-058, T-060, T-061, T-062 and T-063 tests and `geometry-cache-trust-d29`, none of them edited.
- I ran `node tools/browser-check/named-save.mjs --playwright <Chantier_Manager playwright-core 1.60.0> --browser
  <chromium-1243>` five times, on headless Chromium 153 on the box.
  - Run 1 opened the index in process. It held 380–563 ms and failed.
  - Run 2 opened through the worker. It held 210–255 ms and failed.
  - Runs 3–5 opened through the worker. They held 154–181 ms, and each exited 0 (PASS).
  - The save code was the same in runs 2–5. Runs 3–5 only add timings that run after the measured window.
- Every save in every run is the size `saveBnn` writes.
- No `[frozen_surface] watched` file changed (`git status --short`).

## notes

- ⚠ The 200 ms bar holds in 3 of the 4 worker-open runs, with 19–46 ms of headroom.
- The biggest remaining main-thread cost is `postMessage` cloning the entries. Timed alone, it takes
  144–206 ms. It is out of this row's scope and is recorded in `## Discovered`.
- The first save after an open is not in the bar. The page's first `geometryCacheFiles()` keys and parses
  every root before the saves start, as the row's note foresaw.
- A record is never mutated after it is kept, so the `WeakMap` cannot go stale. A record object that was not
  kept, such as the T-060 16k generator's, is stringified at the post, so its bytes are still correct.
- This turn also changes the check page's open path, from in process to the worker. Without that change
  nothing is kept, and the bar fails (run 1).
- Next: hmdnah, step 1 (risk high, D88).
