# T-014 — `--review` must read the task's `risk:`, not only the frozen surface

seat: zayd (builder on box) — 2026-08-16

## What this closes

Measured 2026-08-15 on T-008 (`risk: high`, mechanically `RISK: additive`): `agent-finish.mjs --review`
flipped the row to `done` and printed the approve-and-merge pair for a PR that had had one review turn of
D88's required two. `AGENTS.md §1.2` and `REVIEW.md`'s "Two steps" section already describe the intended
mechanism in full (written ahead of the code, by the two `STEWARD-two-step-high-risk-review*` turns) —
this PR is the implementation, not a design decision.

## What changed

**`scripts/seats.mjs`** — four new pure exports, the shared vocabulary both scripts below use so the
decision is made once:

- `STEP1_LABEL` (`'review/step-1'`), `STEP1_LABEL_COLOR`, `STEP1_LABEL_DESCRIPTION` — the label that
  routes a `risk: high` task's second review turn.
- `reviewStepFor(risk, labelNames)` — `null` for anything but `risk: high` (one ordinary turn); else `1`
  when the PR carries no `review/step-1` label yet, `2` once it does.
- `reviewStepGate(risk, step)` — `{ ok, reason }`, whether `--review --step N` is legal for a task
  carrying `risk`. Refuses an unreadable/absent `risk:` **as a hard refusal, never a default to
  'normal'** — the same shape `T-013` guards against for seat identity, and what Entry 88 shipped three
  of. Refuses `risk: high` with no step, and refuses `--step` on anything else.
- `reviewFlipsToDone(risk, step, contractTouching)` — the exact decision this task exists to correct:
  `contractTouching` never flips (unchanged); `risk: high` flips only on `step === 2`; everything else
  flips, same as before this task. Pure, so the pre-T-014 defect and its fix are both one-line-testable
  — see `tests/protocol/seats.test.ts`'s `reviewFlipsToDone` suite, which runs the OLD formula
  (`!contractTouching`) against the fix's own test cases and shows it returning `true` (the bug) where
  the fix returns `false`.

**`scripts/agent-finish.mjs`** — `--step 1|2` parsing (refuses an out-of-range value immediately, before
anything else runs). A new gate, placed right after the existing machine gate and **before `pnpm
verify`** (same "fail cheap before the expensive step" reasoning as the machine gate): resolves the
claimed task's `risk:` and calls `seats.reviewStepGate`, dying on any refusal. Section 4 ("risk & review
routing") now branches on `risk`/`step`:

- **`risk: high`, `step: 1`** — resolves the open PR (`gh pr view --json number`), creates the
  `review/step-1` label if the repo does not define it yet (`gh label create`, tolerating "already
  exists"), then `gh pr edit <n> --add-label review/step-1`. The row is **not** flipped. The final
  message is new: "MECHANICAL REVIEW ONLY — no approval, no merge", explicitly not the approve/merge
  pair the old code printed unconditionally.
- **`risk: high`, `step: 2`** — reads the PR's own labels (`gh pr view --json labels`) and refuses,
  hard, if `review/step-1` is absent **or unreadable** — the literal defect this task exists to close,
  now impossible to skip by naming `--step 2` first. Only once confirmed does it fall through to the
  same `seats.reviewFlipsToDone`-gated flip every other review takes, and the existing approve/merge
  messages print unchanged.
- **everything else** — unchanged behavior, now routed through `seats.reviewFlipsToDone` instead of an
  inline `!reviewContractTouching`, so there is one formula instead of two copies that could drift.

**`scripts/agent-start.mjs`** — the reviewer branch, once it has picked which open PR routes to this
seat, resolves the task's `risk:` from `docs/BACKLOG.md` (already merged to `main`; needs no branch
content) and, for `risk: high`, reads the PR's labels via `gh pr view --json labels` to call
`seats.reviewStepFor`. **A failed label read is a refusal**, not a guess at step 1. Prints which step
(1 mechanical / 2 adversarial, with the REVIEW.md item numbers each covers) and the exact finish command
with `--step N` baked in, so the reviewing seat never has to work out which turn it is on by hand — the
thing the owner has been doing manually for two review cycles, per the task's own framing.

**`scripts/seats.d.mts`** — the four new exports declared (`pnpm typecheck` resolves `tests/**/*.ts`
against these, and `tests/protocol/seats.test.ts` imports them directly).

**Tests** — `tests/protocol/seats.test.ts`: a `reviewStepFor`/`reviewStepGate`/`reviewFlipsToDone` suite,
19 cases, including the revert-verification pair described above. `tests/protocol/agent-finish.test.ts`:
7 cases on the new pre-verify gate (invalid `--step`, `--step` without `--review`, `risk: high` with no
step, `--step` on `risk: normal`, an unreadable `risk:` field, and the two legal shapes reaching the gate
message). No `packages/`, no `apps/web`, no frozen byte.

## What is NOT covered by an automated test, and why

The `gh`-touching halves — label creation, `gh pr edit --add-label`, and the label-presence read that
gates step 2 — are exercised only in real use, never by the fixture suite. This repo's test fixtures
build a throwaway *local* bare `origin` (`tests/protocol/fixture.mjs`); `gh pr view`/`gh label create`
against it fail exactly the way they would against no GitHub repo at all, which is why every existing `gh`
call in `agent-start.mjs`/`agent-finish.mjs`/`reserved-classes.mjs` is either wrapped to degrade
gracefully or, like `syncLabels` in `reserved-classes.mjs`, left untested for the identical reason (see
that file's own test suite, which only tests `detectReservedClasses`, never `syncLabels`). This PR follows
the same precedent: the DECISION is pure and directly tested (`reviewStepFor`, `reviewStepGate`,
`reviewFlipsToDone`); the `gh` plumbing around it is not, and gets its first real exercise when `hmdnah`
reviews this very PR — which is `risk: high`, so it runs step 1 for real, creating the label live.

## Revert-verification

Reverted `seats.mjs`'s `reviewFlipsToDone` to the pre-fix formula (`return !contractTouching;`, discarding
`risk`/`step` entirely — literally the old inline expression this task replaces) and ran
`pnpm vitest run tests/protocol/seats.test.ts -t reviewFlipsToDone`:

```
× risk: high step 1 does NOT flip to done — the T-008/PR #23 defect this task closes
  → expected true to be false
× REVERT-VERIFIED: the pre-T-014 formula stamps a risk: high step 1 `done` — this is the bug
  → expected true to be false
Test Files  1 failed (1)
     Tests  2 failed | 3 passed | 32 skipped (37)
```

Restored the fix and re-ran the same command:

```
Test Files  1 passed (1)
     Tests  5 passed | 32 skipped (37)
```

The RED reproduces T-008/PR #23's own defect exactly: a `risk: high`, non-contract-touching PR flips to
`done` on the OLD formula regardless of step.

## Verification

`pnpm verify` — green, exit 0. `typecheck`: 7 project builds, clean. `lint`: clean. `format:check`:
clean (files formatted with `prettier --write` before this run). `test`: **868/868** across 94 files.
`reseed:check`: skipped (no `BASE_REF` — not a PR context locally). `docs:check`
(`docs-budget`/`freeze-boundary`/`protocol`): **123/123** across 8 files; `freeze-boundary` green ⇒ the
frozen surface has not moved (confirmed separately with `node scripts/reserved-classes.mjs --base
origin/main` → `none — RISK: additive`).

## What the next session (review) needs to know

This task is itself `risk: high` (D88's own gate decides whether other gates run), so its own review is
the two-step kind — the first real, live exercise of the label-creation code path this PR adds.

`hmdnah`'s step 1 on `T-008`/PR #23 predates this mechanism (it ran by hand, before `review/step-1`
existed) — that PR's `review/step-1` label needs to be applied **manually** (`gh pr edit 23 --add-label
review/step-1`, creating the label first if this PR's own step 1 has not already done so) before
`agent-start.mjs --review` will route its step 2 correctly. Once labeled, `agent-finish.mjs --seat hmdnah
T-008 --review --step 2` runs the normal path.
