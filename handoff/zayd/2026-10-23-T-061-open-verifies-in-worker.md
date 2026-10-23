# T-061 — opening a file verifies its geometry-cache index off the main thread

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-061-opening-a-file-verifies-its-geometry-cac`
- task: `docs/BACKLOG.md` T-061 · risk: high · implements: design §2e, §4, §6 R3/R5 · D29

## Changed

- `packages/document/src/cachesign.ts` (the T-060 leaf) gains `sameCacheEnvelope` (from `cachekey.ts`),
  `SignedCacheEnvelope` and `verifyCacheIndex` (from `cachetrust.ts`), and the new `openSignedCacheIndex`,
  `OpenedCacheIndex`, `CacheIndexOpenRequest` and `CacheIndexOpener`. It still imports nothing.
- `cacherestore.ts`: `GeometryCacheSource.openIndex?`. `openCacheIndex` delegates to `openSignedCacheIndex`, and
  the new `openIndexOf` posts the stored bytes to `openIndex` and turns a failing opener into "restore nothing".
- `DocumentContext.openGeometryCache()` is NEW and runs once per document. `rebuildAll` and `rebuildOnly` await
  it, and `#stage` reads `#cacheIndex` without parsing or verifying. `geometryCacheFiles()` reuses the opened
  index; with none opened it still opens in process, as before.
- App: `storage/cacheOpen.ts` (`handleCacheOpenRequest`, `cacheIndexOpenerOn`) and `cacheOpenWorker.ts` are NEW,
  and both import only the leaf. `documentOptions` takes an optional `openIndex`. `bootstrap` passes
  `openCacheIndexInWorker` (`documentStorage.ts`, one worker per open) and awaits `doc.openGeometryCache()`.
- `tests/app-cache-open-verifies-in-worker-t061.test.ts` is NEW. Design §2e has the verify figure, and
  `## Discovered` has one line.

## Verified

- `npx vitest run tests/app-cache-open-verifies-in-worker-t061.test.ts` → 6 passed, 1 skipped.
  Revert-verify: `#stage` calling `openCacheIndex(this.#cacheSource)` again → "no parse or verify runs on the
  caller: expected 1 to be +0", and 3 tests failed; restored → green.
- T-043/T-049/T-052/T-057/T-060 and every `tests/*-d29.test.ts`, plus `apps/web/src/storage` → 13 files,
  111 passed, 3 skipped, none edited.
- 16k under node (`BUNYAN_T061_MEASURE=1`, R4 fixture replicated as T-060 does, 16,000 solids, 4,000 roots,
  64,232,159 B index), two runs: open 2,462 / 2,433 ms, of which parse 227 / 231 ms and verify 2,195 / 2,229 ms.
  The reply's `structuredClone` took 337 / 343 ms. Recorded in design §2e.
- No `[frozen_surface] watched` file changed (`git diff --name-only origin/main`).

## notes

- Not measured in a browser. `save-check.html` builds its doc without an opener, so its `openMs` still times
  the in-process open, and no page times `bootstrap`'s worker open.
- The install secret now also crosses to the same-origin cache-open worker.
- Next: hmdnah, step 1 (risk high, D88).
