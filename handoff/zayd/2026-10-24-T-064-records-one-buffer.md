# T-064 — a named save posts its geometry-cache records to the zip worker as one transferred buffer

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-064-a-named-save-posts-its-geometry-cache-re`
- task: `docs/BACKLOG.md` T-064 · risk: high · implements: design §2e, §5, §6 R4/R5 · spec §6.5

## Changed

- `packages/document/src/cachesign.ts` (still imports nothing): NEW `SerializedCacheRecords` (now extended by
  `OpenedCacheRecords`), `PostedCacheSigning`, `keepRecordJson` (a `WeakMap` from a record object to its
  `JSON.stringify` bytes), `serializeRecords` (copies kept bytes, stringifies any other record) and
  `deserializeRecords` (`Object.fromEntries`, in `roots` order). `serializeCacheRecords` delegates to `serializeRecords`.
- `document.ts` `exportCacheIdle` keeps each exported record's JSON, at idle time; `cacherestore.ts`
  `lazyRecordLookup` keeps each parsed slice as its record's JSON.
- `apps/web/src/storage/bnnZip.ts`: `createBnnZipper` serializes `signing.records` into one buffer and posts it
  as the transfer list; `handleZipRequest` deserializes it and calls `signBnnEntries`; `ZipPort.postMessage` takes a transfer list.
- `saveCheckMain.ts` opens the index through `openCacheIndexInWorker`, as `bootstrap.ts:141` does;
  `cloneSigningMs` → `serializeRecordsMs`; NEW `assembleMs`, `cloneEntriesMs`.
- NEW `tests/app-named-save-transfers-records-t064.test.ts`: the 20-solid fixture, a cache-less scene, and a
  5-wall file opened through the worker.
- Design §5 has a T-064 paragraph. `BACKLOG.md ## Discovered` has one finding.

## Verified

- Before the fix `pnpm exec vitest run tests/app-named-save-transfers-records-t064.test.ts` failed 2 of 3;
  after, 3 passed. Revert-verify: posting `{ id, entries, signing }` again fails 2 of 3 ("one transferred
  ArrayBuffer: expected [] to have a length of 1 but got +0"); restored, 3 passed.
- The test also checks the caller's buffer is detached after the post, the roots and offsets match, the
  caller stringifies no record, and the stored bytes equal `saveBnn`.
- `pnpm verify` green: 124 files, 1061 passed, 4 skipped; `docs:check` passed 66. It includes the T-047,
  T-056, T-058, T-060, T-061, T-062 and T-063 tests and `geometry-cache-trust-d29`, none edited.
- `node tools/browser-check/named-save.mjs --playwright <Chantier_Manager playwright-core 1.60.0> --browser
  <chromium-1243>`, five runs, headless Chromium 153: run 1 opened in process, held 380–563 ms, FAIL; run 2
  opened through the worker, 210–255 ms, FAIL; runs 3–5 through the worker, 154–181 ms, PASS. Same save code
  in runs 2–5. Every save is the size `saveBnn` writes. No `[frozen_surface] watched` file changed.

## notes

- The biggest remaining main-thread cost is `postMessage` cloning the entries (144–206 ms alone), out of
  this row's scope and recorded in `## Discovered`.
- The page's first `geometryCacheFiles()` keys and parses every root before the timed saves, so the first
  save after an open is not in the bar, as the row's note foresaw.
- A record is never mutated after it is kept, so the `WeakMap` cannot go stale; an unkept record (the T-060
  16k generator's) is stringified at the post, so its bytes are still correct.
- Without the check page's switch to the worker open, nothing is kept and the bar fails (run 1).

## Continue turn after step 1: the bar is unmet (B-20261024-02)

- Changed: design §5:242 ("The bar holds with little headroom") → the measured figures; the `## Discovered`
  entry is corrected to match; B-20261024-02 is filed. No code changed, and no bar or done-when item was reworded.
- Verified: three unmodified `named-save.mjs` runs (same arguments) at `4f43dea`, Chromium 153.0.8010.12, give
  max(longest task, widest gap) per worker save, in ms: 165.2/181.5/161.1 PASS, 220.6/164.8/160.1 FAIL (longest
  task 155), 246.2/162.4/148.7 FAIL. Control `saveBnn` held 7068.8–7116.7. The entries clone alone is
  187.3/202.0/216.1 on the first iteration, 142.7–210.5 later. With hmdnah's A–C: the first save is 165–246 ms,
  over 200 in 4 of 6, and later saves are 149–182 ms. `pnpm verify` (finish): 124 files, 1061 passed, 4 skipped.
- Not verified: why the first save is the slow one (GC after the open, cold IndexedDB, or JIT). No probe was run.
- The bar is not made to hold here: the clone T-064 does not touch reaches 216 ms on its own, so no task split
  brings it under 200 ms. Next: a steward sequences B-20261024-02's row, and T-064 stays `review`, incomplete.
