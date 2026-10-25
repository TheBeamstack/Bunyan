# T-065 — a named save posts its entries to the zip worker as one transferred buffer

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-065-a-named-save-posts-its-entries-to-the-zi` · built on `task/T-064-…`, merged first (`381fe3d`)
- task: `docs/BACKLOG.md` T-065 · risk: high · implements: design §5, §6 R4 · spec §6.5
- status: **incomplete** (B-20261025-03, B-20261025-04)

## Changed

- `packages/document/src/cachesign.ts`: NEW `recordJsonChunks`, which `serializeRecords` now uses.
- `apps/web/src/storage/bnnZip.ts`: NEW `PackedEntries`, `packZipRequest`, `unpackEntries`, `ZipStep`. One fresh
  buffer holds the entries, the records' JSON and a copy of the secret, and it is the request's only transfer.
  The worker unpacks views in `names` order. `createBnnZipper(port, observe?)` times serializeRecords, pack and post.
- `documentStorage.ts`: `spawnBnnZipper(observe?)` and `saveDocument(…, observe?)` (assemble).
- `saveCheckMain.ts`: each worker save reports `split`, its five main-thread steps timed inside it. The
  after-the-save timings are removed.
- NEW `tests/app-named-save-transfers-entries-t065.test.ts`: the 20-solid fixture with a cache, the same scene and
  an empty scene cache-less, and a 5-wall file opened through the worker (carried `.brep`s).
- Merge of T-064: the `docs/BACKLOG.md` table and `## Discovered` take main's side, and the 2026-10-24
  finding T-065 converts is deleted. `BLOCKERS.md` keeps all three records, and BLOCKED is re-rendered
  by `blocked.py`. Design §5 has a T-065 paragraph.

## Verified

- Before the fix `npx vitest run tests/app-named-save-transfers-entries-t065.test.ts` failed 4 of 4 ("no
  Uint8Array outside the transferred buffers"); after, 4 passed. Revert-verify: posting `{ ...message, entries }`
  failed 4 of 4 on that assertion; restored, 4 passed.
- `pnpm verify`: 1 failed, 1064 passed, 4 skipped. The failure is T-064's "a scene without a cache posts
  no signing and transfers nothing", whose `:141` `expect(posted.transfer).toEqual([])` contradicts done-when 1
  for a cache-less save (B-20261025-03). The T-047, T-058, T-060 and T-064 cached-save tests pass.
- `node tools/browser-check/named-save.mjs --playwright <playwright-core 1.60.0 index.mjs> --browser
  ~/.cache/ms-playwright/chromium-1243/chrome-linux-arm64/chrome`, Chromium 153.0.8010.12. Run 1 used the
  tree committed as `a3ebb93` (only prettier on the test changed after it), and runs 2 and 3 used `a3ebb93`.

| Run | held per save (ms) | exit | assemble (ms) | pack (ms) |
|---|---|---|---|---|
| 1 | 200.2 / 121.6 / 194.1 | 1 | 57.3 / 51.8 / 65.4 | 123.3 / 55.6 / 108.5 |
| 2 | 211.2 / 204.1 / 125.0 | 1 | 97.5 / 82.7 / 54.0 | 72.6 / 99.5 / 55.2 |
| 3 | 143.6 / 141.3 / 136.6 | 0 | 63.9 / 52.8 / 56.6 | 59.6 / 63.0 / 63.6 |

The other steps were `geometryCacheFiles()` 5.3–23.8 ms, `serializeRecords` 5.2–6.9 ms and post 2.7–6.9 ms.
The control `saveBnn` held 7,823–9,117 ms, and every save had the control's size. Held ≈ the five steps' sum
(run 1 save 1: 199.2 against 200.2).

- No `[frozen_surface] watched` file changed: `git diff --name-only origin/main...HEAD`.

## Not done

- Done-when 2 is red on one assertion (B-20261025-03). Done-when 4 holds in 1 of 3 runs (B-20261025-04).
- B-20261024-02's `need:` was performed by brahim's PR #119 (T-065 sequenced, T-064 depends on it), but its
  `cleared:` is still `-`.

## Next

`brahim`: resolve B-20261025-03 and B-20261025-04, then route T-065 back to `zayd`.
