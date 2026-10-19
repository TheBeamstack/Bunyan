# T-047 — A `.bnn` saved twice from one scene is byte-identical whatever the wall clock reads

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-047-a-bnn-saved-twice-from-one-scene-is-byte`
- task: `docs/BACKLOG.md` T-047 · risk: normal · implements: spec §6.5 (determinism) · D71 · D76

## Changed

- `packages/document/src/bnn.ts`: `saveBnn` passes `zipSync` `mtime: BNN_ZIP_MTIME`, a module constant
  `new Date(1980, 0, 1)` (local time, the earliest DOS date fflate 0.8.3 accepts, `esm/index.mjs:1902-1904`).
- `tests/bnn-save-deterministic-t047.test.ts` (new, 1 test): one scene saved at 2026-10-19 10:00:00 and at
  2031-03-07 23:41:37 under `vi.setSystemTime` gives identical bytes.

## Verified

- Test-first: `pnpm exec vitest run tests/bnn-save-deterministic-t047.test.ts` before the `bnn.ts` change →
  1 failed; after → 1 passed.
- Revert-verify: `{ level: 6, mtime: BNN_ZIP_MTIME }` → `{ level: 6 }` → 1 failed; restored → 1 passed.
- The three named tests pass unchanged: `pnpm exec vitest run` over the new test,
  `tests/journal-transport-rule14.test.ts`, `tests/format-codec-seam.test.ts`, `apps/web/src/view/keepLive.test.ts`
  → 4 files, 24 passed. No test file other than the new one changed.
- `pnpm verify` green: 105 files / 964 tests; `docs:check` 5 files / 66 passed.

## done-when

- `bnn.ts` passes `zipSync` a constant local-time `mtime` ≥ 1980 with a comment naming why: yes.
- Test-first, system clock moved > 2 s, revert-verified on dropping `mtime`: yes.
- `journal-transport-rule14.test.ts:305`, `format-codec-seam.test.ts:157-161`, `keepLive.test.ts:172-175` pass
  unchanged: yes.
- No `[frozen_surface]` watched file changes: yes (`git diff --stat main` names only `bnn.ts` among sources).

## notes

- The bytes do not vary by time zone: a local-time `Date` reads back the same local fields fflate encodes
  in every zone. Not measured across zones; follows from `new Date(y, m, d)` semantics.
