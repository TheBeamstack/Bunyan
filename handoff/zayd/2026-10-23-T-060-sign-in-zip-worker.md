# T-060 — a named save signs its geometry-cache index in the zip worker, not on the main thread

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-060-a-named-save-signs-its-geometry-cache-in`
- task: `docs/BACKLOG.md` T-060 · risk: high · implements: design §2e, §5 (the T-058 paragraph), §6 R4/R5 · spec §6.5

## Changed

- `packages/document/src/cachesign.ts` NEW, exported as `@bunyan/document/cachesign` (plus its `vitest.config.ts`
  alias). It imports nothing and holds `canonicalJson`, `sha256`, `sha256Utf8Hex`, `toHex`, `hmacSha256Hex`,
  `CacheEnvelope`, `cacheIndexMac`, `signedCacheIndex`, `UnsignedGeometryCache`, `signGeometryCache` and
  `signBnnEntries`. These moved out of `cachekey.ts` and `cachetrust.ts`, which now import them; the root index
  re-exports them, so every existing import still resolves.
- `DocumentContext.geometryCacheFiles()` returns `{ envelope, records, secret, files }` with no `index.json`.
- `bnn.ts`: `SaveOptions.cache` takes signed files or an `UnsignedGeometryCache`, which `assembleBnnEntries` signs.
  `assembleUnsignedBnnEntries` NEW: it leaves a placeholder `index.json` at its zip position and returns the `signing`.
- `apps/web/src/storage/bnnZip.ts`: `ZipRequest.signing?`; `handleZipRequest` signs in place, then zips.
  `documentStorage.ts` `saveDocument` posts `assembleUnsignedBnnEntries` output.
- `saveCheckMain.ts` and `named-save.mjs`: the page builds a `DocumentContext` over the opened file, saves through
  `namedSaveOptions` (so through `doc.geometryCacheFiles()`), and times `geometryCacheFiles()` and the `signing` clone.
- `tests/fixtures/d29-cache-fixture.ts` also returns `unsigned`. Its `cache` is `signGeometryCache(unsigned)`, the
  same bytes as before. `indexOf` helpers in `geometry-cache-export-d29` and `cache-requeue-table-edit`, plus one
  assertion in `app-cache-open-t057`, now read the unsigned shape.
- `tests/app-named-save-signs-in-worker-t060.test.ts` NEW, design §5's T-060 paragraph, and one `## Discovered` line.

## Verified

- `npx vitest run tests/app-named-save-signs-in-worker-t060.test.ts` before `cachesign.ts` existed → failed to import.
  After → 3 passed, 1 skipped. Revert-verify: `saveDocument` zipping `assembleBnnEntries(scene, options)` →
  "no HMAC runs on the caller: expected [ 1 ] to deeply equal [ +0 ]"; restored → green.
- The 14 D29/zip files, including `geometry-cache-trust-d29`, `bnn-save-deterministic-t047` and
  `app-named-save-zip-worker-t058` (none edited) → 14 passed, 95 tests passed, 3 skipped.
- `node tools/browser-check/named-save.mjs --playwright <Chantier_Manager playwright-core 1.60.0> --browser <chromium-1243>`
  → **exit 1** on Chromium 153.0.8010.12, linux-arm64, with 16,000 solids in 4,000 roots and 18,024,869 B.
  Three worker saves held the main thread 1,476.6 / 1,467.1 / 1,431.6 ms and took 9.29 / 9.25 / 9.26 s end to end.
  The `saveBnn`-on-main control took 8,515 ms; every save was the same size.
  Timed alone after each save: `geometryCacheFiles()` 1,178–1,433 ms and `structuredClone(signing)` 318–426 ms.
  The first `geometryCacheFiles()`, which opens and verifies the index (T-061's side), took 4,004 ms.
- `git diff --name-only origin/main` touches no `[frozen_surface] watched` file.
- `pnpm verify` → green: 120 files, 1043 passed, 3 skipped; docs:check 66 passed.

## notes

- `named-save.mjs`'s exit 1 is its own 200 ms bar from T-058. I left the bar where it was. T-058's 124–133 ms page
  posted a pre-signed cache and never called `geometryCacheFiles()`. T-060's done-when asks for the hold to be
  measured, not for it to stay under 200 ms. The remaining main-thread costs are in `## Discovered` (2026-10-23).
- The install secret is now posted to the same-origin zip worker along with the records it signs.
- Next: hmdnah, step 1 (risk high, D88).
