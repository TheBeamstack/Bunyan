# T-062 — a named save keys each cached root once, and not at all for an unchanged scene

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-062-a-named-save-keys-each-cached-root-once-`
- task: `docs/BACKLOG.md` T-062 · risk: high · implements: design §2b, §5, §6 R1/R4 · spec §6.5

## Changed

- `packages/document/src/document.ts`: `#keyTables` becomes `#keyed` (`KeyedScene`), which holds one scene
  object's key tables, each root's key (filled on first use by `#keyOf`) and each carried root's record and
  `.brep` bytes, or `null` when the file has none usable. `geometryCacheFiles()` and `exportCacheIdle` key
  through it. A carried root is read and inflated once per scene object. Carried entries are still written
  after every export, in scene order, so `index.json` and the zip keep their order.
- `DocumentContext.cacheKeys()` is NEW: the kept keys for the current scene, used by the tests below.
- `cacherestore.ts`: `usableRecord` takes an optional `key`, which defaults to `cacheInputKey(...)`, so
  `readRestoreBatch` is unchanged.
- `tests/save-keys-once-t062.test.ts` is NEW (real OCCT). It spies on `cacheInputKey` via `vi.mock` of
  `cachekey.js` and wraps the cache reader's `readMany`.
- `tests/cache-requeue-table-edit.test.ts` (4 sites) and `tests/geometry-cache-export-d29.test.ts` (3 sites)
  each gain one assertion after their edits: `doc.cacheKeys()` equals `cacheInputKeys(doc.scene)`. No existing
  assertion changed.

## Verified

- `pnpm exec vitest run tests/save-keys-once-t062.test.ts` → 3 passed. Before the fix it failed with "at most
  one key per root: expected 2 to be 1" (carried roots) and "expected 3 to be +0" (second save).
- Revert-verify: putting back `cacheInputKey(...)` in the save loop and `usableRecord` without `key` (the old
  `document.ts:740,749`) → 2 of 3 failed with the same two messages. Restored → 3 passed.
- The second save's signed `.bnn` equals the first's and equals `full`, byte for byte (test 1).
- `pnpm verify` → green: 122 files, 1052 passed, 4 skipped, then `docs:check` 66 passed. That covers the
  T-047/T-058/T-060 tests, all unedited.
- No `[frozen_surface] watched` file changed (`git diff --name-only origin/main...HEAD`).

## notes

- The carried `.brep` bytes stay referenced until the next commit replaces the scene, about 44 MB raw at 16k
  per design §5. A save returns those same bytes anyway.
- This turn timed nothing. The 1,178–1,433 ms `geometryCacheFiles()` figure (design §5, T-060) is re-measured
  in a browser by T-064.
- Done-when 2 says "both files pass unchanged". I read that as no existing assertion changed. The new assertion
  had to go in those files, since it checks state after their edits.
- Next: hmdnah, step 1 (risk high, D88).
