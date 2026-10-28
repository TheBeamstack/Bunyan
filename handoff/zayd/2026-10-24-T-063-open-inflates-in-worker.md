# T-063 — opening a file inflates its geometry-cache index in the worker and parses it root by root

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-063-opening-a-file-inflates-its-geometry-cac`
- task: `docs/BACKLOG.md` T-063 · risk: high · implements: design §2e, §3, §4, §6 R3/R5 · D29

## Changed

- `packages/document/src/bnncaps.ts` NEW (leaf, imports only `fflate`): the zip caps moved verbatim from
  `bnn.ts`, with `checkCaps`/`BnnCapError` exported. `bnn.ts` imports them and re-exports the four
  `BNN_MAX_*` constants.
- `packages/document/src/cacheindexfile.ts` NEW (leaf: `fflate`, `bnncaps`, `cachesign`), subpath
  `@bunyan/document/cacheindexfile`. `openCacheIndexFile` caps-checks `index.json` in the posted file, inflates
  it, opens it (envelope and MAC), and returns `serializeCacheRecords`' output.
- `cachesign.ts`: `CacheIndexOpenRequest.bytes` becomes `file` (the whole `.bnn`). The new `OpenedCacheRecords`
  holds `roots`, `offsets` and one `json` buffer. `CacheIndexOpener` resolves to that.
- `GeometryCacheReader.file?` (bnn.ts) exposes the retained file bytes, which are posted cloned.
- `cacherestore.ts`: the new `CacheRecordLookup` (`record(root)`) is what `usableRecord`/`readRestoreBatch`
  read. `openIndexOf` posts `file` and wraps the reply in `lazyRecordLookup`, which parses one slice per call.
  A reader without `file` opens in process. `openCacheIndex` is unchanged, and `document.ts`'s in-process
  save fallback wraps it with `recordLookupOf`.
- App: `cacheOpen.ts` calls `openCacheIndexFile` and adds `cacheOpenTransfer`. `cacheOpenWorker.ts` posts the
  reply with that transfer list.
- Design §2e and §3 each gained a sentence on this path.

## Verified

- `pnpm exec vitest run tests/app-cache-open-lazy-records-t063.test.ts` → 6 passed. Revert-verify: putting
  `source.files.read('index.json')` back on the caller in `openIndexOf` (the T-061 line) gives "no inflate of
  index.json on the caller: expected 1 to be +0". A caller-side `JSON.parse` of an envelope-bearing string gives
  "no JSON.parse of the whole index on the caller: expected 1 to be +0". Both pass again once restored.
- The reply test checks the transfer list is `[ArrayBuffer]` and that the worker's copy is detached
  (`byteLength 0`). It also checks the received `json` is the only view of its buffer.
- The other-install file restores nothing, the cache-less file posts nothing, and a 4 MiB zero `index.json`
  is refused before any inflate (same test file).
- `pnpm verify` → green: 123 files, 1058 passed, 4 skipped. `docs:check` → 66 passed.
- `vite build` (apps/web, probe output deleted): `cacheOpenWorker` is 10.66 kB. It contains the cap message and
  `geometry-cache/index.json`, and neither `DocumentContext` nor `cacheInputKey`.
- No `[frozen_surface] watched` file changed (`git status --short`).

## notes

- ⚠ **Spec defect, not resolved by rewording.** Done-when 4 says the T-061 tests pass unchanged. One of them
  pins `cacheOpen.ts`'s imports to exactly `['@bunyan/document/cachesign']`, and `cachesign.ts`'s to `[]`. This
  row requires the worker to inflate `index.json`, which needs `fflate`, so the pin cannot hold. That one
  assertion now lists `/cacheindexfile` too, and its title changed to match. Every other T-061 assertion is
  unedited and passes. A re-export through `cachesign.ts` would have slipped past that test's `import` regex,
  so I did not use one. The reviewer decides whether this meets done-when 4.
- The per-root JSON is re-stringified in the worker, so the reply is about the size of the records minus the
  envelope. On the main thread a root is parsed again at its first save. Records are not memoized, so restored
  records are not kept alive.
- Nothing was timed: a browser open timing is out of scope per the row.
- Next: hmdnah, step 1 (risk high, D88).
