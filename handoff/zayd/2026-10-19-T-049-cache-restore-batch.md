# T-049 — A cache restore reads each batch of roots' entries in one `readMany`

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-049-a-cache-restore-reads-each-batch-of-root`
- task: `docs/BACKLOG.md` T-049 · risk: high · implements: design §4, §5 · spec §6 (D29), §14 D66 · D29

## Changed

- `packages/document/src/cacherestore.ts`: new `RESTORE_BATCH_ROOTS = 1024` and `readRestoreBatch(scene, roots,
  tables, index, files)`, which takes each root's usable record (design §4 step 1) and reads every `.brep` they
  name in one `files.readMany`. If `readMany` throws (a T-046/T-048 cap, a corrupt entry), the batch comes back
  empty and each of its roots builds. `restoreAssembly(root, batch, geometry)` reads bytes from the batch map;
  a missing entry is still a `Refusal`.
- `packages/document/src/document.ts` `#stage`: on the restore path, reads one batch per `RESTORE_BATCH_ROOTS`
  roots, lazily, at the root that opens it. A batch's bytes are dropped when the next batch is read.
- `tests/cache-restore-batch-t049.test.ts` (new, 2 tests). The cache is synthetic and `importBrep` is answered by
  the test gateway. Any root that builds goes to real OCCT.

## Verified

- Call count: restoring `2B+5` roots, at 1 part per root and at 1–4 parts per root → `{ brepReads: 0, readMany: 3 }`.
- Cap error: with `B+3` roots, raising one last-batch entry's declared size to 2 MiB after load makes the
  reader throw `BNN_MAX_RATIO`. The first `B` roots restore, and the last 3 build `valid`.
- Red on main: `git checkout main -- packages/document/src/{cacherestore,document}.ts` → both tests failed.
  The reason is weak, though: `RESTORE_BATCH_ROOTS` is absent there, so `n` is `NaN`.
- Revert-verify: replacing the batch `readMany` with a per-name `files.read` → the call-count test fails, `expected
  { brepReads: 2053, readMany: 0 } to deeply equal { brepReads: 0, readMany: 3 }`. Restored → green.
- `vitest run` over `geometry-cache-restore-d29`, `bnn-zip-caps-t046`, `bnn-aggregate-ratio-t048`, `geometry-cache-export-d29`
  and the new file → 34 passed, 1 skipped. None of those files changed, and neither did `bnn.ts` (`git diff --stat main`).
- `pnpm verify` green: 108 files, 978 passed and 1 skipped; `docs:check` 66 passed.

## Measured — restoring 16,000 cached entries, headless, box (aarch64)

Measured with a throwaway vitest file (deleted): 16,000 free-standing walls, one 2,747 B `.brep` each, in a real
`saveBnn` → `loadBnn` zip. `importBrep` is answered in-process, so the kernel's import cost is excluded.

| run | `readMany` calls | `readMany` total | `rebuildAll` total | one `read` | one `readMany` of 16,000 |
| --- | --- | --- | --- | --- | --- |
| 1 | 16 | 1,059 ms | 2,284 ms | 22.17 ms | 572 ms |
| 2 | 16 | 1,088 ms | 2,374 ms | 24.08 ms | 594 ms |
| 3 | 16 | 1,122 ms | 2,395 ms | 26.58 ms | 567 ms |

Before this change, 16,000 per-part `read`s at the row's baseline of 22.56 ms add up to ~361 s. Under the same fixture
that is ~355–425 s at this run's 22–27 ms. The row's other baseline, one 694 ms `readMany`, compares with 567–594 ms here.

## done-when

- Counting reader, 0 `.brep` reads, ≤ ceil(N/B) `readMany`, B named: yes.
- A batch cap error rebuilds that batch, with a test: yes.
- The three named tests pass unmodified and `bnn.ts` is unchanged: yes.
- Revert-verified: yes. The revert is per-name `read` inside the batch reader, since `restoreAssembly` no longer holds `files`.
- Handoff records 16,000-entry ms against the baselines: yes (table above).
- No `[frozen_surface]` watched file changes: yes (`cacherestore.ts` and `document.ts` are not watched).

## notes

- `restoreAssembly`'s exported signature changed. Its only caller is `#stage`.
- A cap error now rebuilds up to 1,024 roots instead of 1. Such an error only happens on a file whose bytes passed `loadBnn`'s caps and then changed, or one that is hostile.
