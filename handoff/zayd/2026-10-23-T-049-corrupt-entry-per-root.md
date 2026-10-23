# T-049 — one corrupt cache entry costs its root, not its batch (B-20261019-04)

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-049-a-cache-restore-reads-each-batch-of-root` · PR #88, returned from step 2 (continue mode)
- task: `docs/BACKLOG.md` T-049 · risk: high · implements: design §3, §4 · fixes: B-20261019-04

## Changed

- Merged `origin/main` (flow F1). Conflicts: `document.ts` imports (both kept), `BACKLOG.md` (main's rows, T-049
  `review`), `PHASE_LOG.md` (main's plus this branch's three T-049 abstracts), `CURRENT_STATE.md` (main's side).
- `cacherestore.ts` `readRestoreBatch`: a cap refusal (message prefix `.bnn refused before inflating:`, since
  `BnnCapError` is not exported and `bnn.ts` stays unchanged) still empties the batch. Any other throw re-reads each
  root with its own `readMany`, and only the roots whose own read succeeds are kept.
- `tests/cache-restore-batch-t049.test.ts`: the synthetic index is now signed (`signedCacheIndex`, `installSecret`),
  as main's T-043 requires. New test 3 runs hmdnah's step-2 probe: 3 walls, two DEFLATE bytes of `W00001/0.brep`
  set to `0xff` after load.

## Verified

- Test-first: after the merge and before the fix, `pnpm exec vitest run tests/cache-restore-batch-t049.test.ts` →
  test 3 red, `expected [] to deeply equal [ 'W00000', 'W00002' ]`. After the fix → 3 passed.
- Revert-verify of the cap branch (condition forced false) → test 2 red; restored → green.
- The same file plus `geometry-cache-{restore,trust,export}-d29` → 38 passed, 1 skipped.
- `git diff --stat origin/main` over `bnn.ts` and the t046, t048, restore-d29 and export-d29 tests → empty.
- `pnpm verify`: the result is in this turn's finish output.

## notes

- Worst case after a non-cap throw is one zip pass per root of that batch (≤ 1,024), which is main's per-root cost.
  It is paid only on a corrupt file.
- A root whose own re-read trips a cap builds. Caps run over the whole wanted set before inflating, so a non-cap
  throw means the batch already passed them.
- Not re-measured: the 16,000-entry figures. The healthy path is unchanged.
