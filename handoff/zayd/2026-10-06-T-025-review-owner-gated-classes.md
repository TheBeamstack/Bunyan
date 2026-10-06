# T-025 — `--review` keeps an owner-gated row at `review`

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-025-review-keeps-an-owner-gated-row-at-revie`
- task: `docs/BACKLOG.md` T-025 · risk: high

## Changed

- `scripts/agent-finish.mjs`: new export `reviewOwnerClasses(root, { base })` returns
  `detectReservedClasses(root, { base }).classes`; the `--review` path uses it instead of matching §8's
  `| **frozen surface** | **RISK: …` row, and refuses (dies) if detection throws rather than defaulting
  to additive. The two hand-written next-step branches are replaced by `seats.reviewNextStep`.
- `scripts/seats.mjs`: `reviewFlipsToDone(risk, step, ownerGated)` takes a class-id array and tests
  `.length` (an empty array is truthy); new `reviewNextStep(prNumber, ownerGated, labelOf)`.
- `scripts/seats.d.mts`, `scripts/agent-finish.d.mts`: signatures.
- `tests/protocol/seats.test.ts`: existing `reviewFlipsToDone` cases moved to arrays; each of the three
  classes keeps the row `review`; `reviewNextStep` never carries `gh pr merge` for any class.
- `tests/protocol/reserved-classes.test.ts`: fixture PR re-baselines the snapshot (metadata only) with a
  §8 row reading `RISK: additive`; asserts classes `['freeze']`, no flip, no `gh pr merge`.

## Verified

- `pnpm verify` exit 0: 100 files / 990 tests, `docs:check` 8 files / 169 tests.
- Revert: `reviewOwnerClasses` body replaced with the pre-fix §8-row regex →
  `pnpm exec vitest run tests/protocol/reserved-classes.test.ts` fails 1/10,
  `AssertionError: expected [] to deeply equal [ 'freeze' ]`; restored, green.

## done-when

- resolves through `reserved-classes.mjs`, any of three classes keeps `review`: yes (above).
- printed next step names the owner's merge for all three: `reviewNextStep` tests.
- revert-verified fixture `needs-operator/freeze` at `RISK: additive`: yes (above).
- additive case unchanged: `reviewNextStep(38, [])` still prints approve + `gh pr merge 38 --squash`.

## notes

- `reviewNextStep`'s `labelOf` defaults to identity because `seats.mjs` cannot import
  `reserved-classes.mjs` (which imports `seats.mjs`); `agent-finish.mjs` passes the label mapper.
- Not exercised end-to-end: the `--review` path past `pnpm verify` in a fixture (same limit
  `tests/protocol/agent-finish.test.ts` states in its header).
- The start entrypoint's default pick was T-026 (refused: stale claim; skipped per B-20260906-01);
  T-025 was claimed by name.
