# STEWARD — the harness defects the 2026-08-21/23 batch measured, decomposed

**Seat:** `brahim` (steward on box) · **Date:** 2026-08-23 · **Branch:** `task/STEWARD-decompose-harness-defects`

## 1. Why this turn exists

Every `box` row in `docs/BACKLOG.md` reached `done` with T-005's merge (`01b6142`), leaving eight `ready`
rows, all `pc`. The box had no claimable work while its own `## Discovered` ledger carried five recorded
harness defects, three of which had already cost turns. The owner ruled decomposition over idling.

## 2. What was decomposed, and the evidence behind each

Four rows, all `area: infra · machine: box`. Each implements a `## Discovered` entry that records a
measurement, not an impression.

| id | risk | measured occurrences |
| --- | --- | --- |
| **T-026** — identity gate at approve/merge | high | once, PR #39 — reached the merge command under the PR's own author account |
| **T-025** — `--review` keeps an owner-gated row at `review` | high | twice, PR #38 — row stamped `done` while the owner had not merged |
| **T-028** — resumable `agent-finish.mjs` | normal | three times in one batch — T-024 step 2, T-022 step 1, T-022 step 2 |
| **T-027** — §6's relink cap | normal | once, PR #39 — cost step 1 a verification it recorded as undischarged |

**T-026 and T-025 are the same failure at two altitudes** and are deliberately not merged into one row:
T-025 is a class-resolution bug in `reviewFlipsToDone`, fixable in `seats.mjs` alone; T-026 adds a gate
where none exists, in `agent-start.mjs` and `agent-finish.mjs`. Combining them would produce a task that
cannot reach green in one turn (READY criterion 9).

**T-028's `## Discovered` row is written in this turn**, because the finding is the orchestrator's own and
had never been recorded — three stranded turns were repaired conversationally and would have left no trace.
`AGENTS.md §3` forbids claiming a finding in the turn that found it; this turn records and decomposes it,
and claims nothing.

## 3. Sequencing

Row order is the sequence (`seats.mjs`'s `readyFor` takes the first row a machine can satisfy), and
`ready-for zayd` returns `T-026 T-025 T-028 T-027` in that order.

**T-026 leads** because it is the only one of the four with a live path to an act that cannot be undone:
`gh pr merge` under the wrong account. GitHub's self-approval refusal does not extend to merge
(`agent-start.mjs`'s own ⚠⚠ block, measured 2026-08-15), and on PR #39 nothing mechanical stopped it — the
seat's own reading of `AGENTS.md §6` did. T-025 follows because its damage is bounded: it releases
dependents early, and on PR #38 nothing depended on T-024. T-028 and T-027 are `normal` and cost turns
rather than correctness.

## 4. What was verified here

- `docs:check` **163 passed** (8 files) after the decomposition, so every new row satisfies the protocol
  tests that read this file.
- `node scripts/seats.mjs ready-for zayd` → `T-026 T-025 T-028 T-027`, confirming the rows are claimable
  by the box builder and in the intended order.
- No row was widened to make it claimable: all four are genuinely box-executable, being script and
  document changes with no browser measurement in any `done-when:`.

## 5. What this turn does not do

- **It rules nothing.** `open_rulings.md` **Q22** (no defined turn for a branch returned by step 2) and
  **Q23** (`agent.query` FORCE/DECLARE/recipe-only) both remain unruled and are the owner's.
- **It claims nothing.** Per `AGENTS.md §1.3` the steward never claims on another seat's behalf, and per
  the orchestrator's phase-boundary rule no builder starts on newly-decomposed rows until the owner says so.
- **It fixes no defect.** Every fix shape named in a `done-when:` is the one already recorded in the
  `## Discovered` row it implements; this turn moved no script byte.
