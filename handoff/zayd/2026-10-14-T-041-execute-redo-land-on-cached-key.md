# T-041 — an execute or redo landing on a cached key never restores (B-20261014-01)

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-041-d29-r3-the-load-only-restore-substitutio` (PR #79), a returned fix (`agent_start.py --continue T-041`)
- task: `docs/BACKLOG.md` T-041 · risk: high · first body: `handoff/zayd/2026-10-12-T-041-d29-load-only-restore.md`

## Changed

- `tests/geometry-cache-restore-d29.test.ts`: new test "an execute or redo landing on a cached key still never
  restores", per `handoff/hmdnah/2026-10-14-T-041-review-step-2.md` notes. It opens `save(edited)` with wall C's
  `end` at `[45000, 0]` (off its record), `rebuildAll`, clears `imports`, executes `end: [44000, 0]` (back on the
  record's key) and asserts no import; then `undo`, `redo` and asserts again. The existing test still holds undo.
- Product code unchanged. `origin/main` moved one commit (`717c3f8`, BLOCKERS.md only); PR #79 reads `MERGEABLE`, so not merged in.

## Verified

Command: `pnpm exec vitest run tests/geometry-cache-restore-d29.test.ts`; mutants by `sed`, restored by `git checkout --`.

- Unmutated → 9 passed (9).
- `document.ts:384` (execute) → `this.#stage(next, affected, options, true, true)` → 1 failed | 8 passed,
  `execute imported a cached solid: expected [ …(2) ] to deeply equal []`.
- `document.ts:509` (redo) → `this.#stage(next, affected, {}, true, true)` → 1 failed | 8 passed,
  `redo imported a cached solid: expected [ …(2) ] to deeply equal []`.
- Restored (`git status --short` shows only the test) → 9 passed (9).
- `pnpm verify`: 104 files / 963 tests, `docs:check` 66.
