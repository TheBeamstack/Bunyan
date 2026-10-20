# T-052 — a shared-table edit re-queues every live assembly whose cache key flipped

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-052-a-shared-table-edit-re-queues-every-live`
- task: `docs/BACKLOG.md` T-052 · risk: high · implements: design §2b, §5, §6 R4 · spec §6 `geometry-cache/`

## Changed

- `packages/document/src/cachekey.ts`: `cacheTablesDigest(scene)`, the §2b five-table digest, factored out of
  `cacheKeyTables` (same bytes, so no key moves).
- `packages/document/src/document.ts`: a document that exports keeps `#tablesDigest` (set at construction). `#commit`
  recomputes it, and on a change it queues every live root (an element with no host and live geometry) for
  `exportCacheIdle`, in addition to `staged.built`. Restored roots re-export their live, imported solids, and none
  is rebuilt. A D66-unbuilt root has no live geometry, so it is not queued and its stale record is dropped at save, as before.
- `tests/cache-requeue-table-edit.test.ts` (new, 4 tests, real OCCT, three isolated walls: two `EXT`, one `TWO`),
  one test per done-when item.
- `tests/geometry-cache-export-d29.test.ts`: the R4 test that pinned `exportCacheIdle(0) === 0` after a
  `createMaterial` (the defect) now expects `roots.length`; its `records === {}` assertion (stale exports unwritten) stays.
- Design §5 "After each commit" bullet amended (spec defect, AGENTS.md §4): it said only rebuilt assemblies are queued.

## Verified

- Test-first: `npx vitest run tests/cache-requeue-table-edit.test.ts` on main's `document.ts` → 3 failed, 1 passed
  (done-when 4 holds already).
- Revert-verify: `git stash push packages/document/src/document.ts` → same 3 failed; `git stash pop` → 4 passed.
- `npx vitest run tests/cache-requeue-table-edit.test.ts tests/geometry-cache-export-d29.test.ts
  tests/geometry-cache-restore-d29.test.ts` → 3 files, 21 passed, 1 skipped.
- `pnpm verify` → exit 0: 109 files, 982 passed, 1 skipped; `docs:check` 66 passed.

## done-when

- 1: yes. `edit.rebuilt` is `[]`, `exportCacheIdle()` returns > 0, and after draining every root's written key equals
  `cacheInputKeys(doc.scene)`. `exportCacheIdle(maxAssemblies = 1)` returns the queue size after one export, so
  the three-root fixture returns 2. Red with the fix reverted.
- 2: yes. `core.updateStyle` on `TWO` has `rebuilt` = [wall C], and after draining all three roots have current-key records.
- 3: yes. Opened from the cached `.bnn` with all roots restored, `createMaterial` has `rebuilt` = `[]`, and after draining
  every root's live parts are still `importBrep` handles. `exportBrep` ran, and all three records hold current keys.
- 4: yes. With no envelope, `exportCacheIdle()` returns 0 and `geometryCacheFiles()` returns `undefined`.

## notes

- An undo of a table edit flips the digest back and re-queues again, which is correct because the keys flip back too.
- Same file as open PRs #88 (`#stage`) and #89 (`geometryCacheFiles`). This diff touches only the constructor, `#commit` and one doc comment.
