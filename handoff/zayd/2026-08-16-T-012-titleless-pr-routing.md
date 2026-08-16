# T-012 — `--review` routes a PR whose title carries no `T-nnn`

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-16. **Task:** `docs/BACKLOG.md` T-012.

## 1. What was missing

`scripts/agent-start.mjs --review`'s routing loop resolved a reviewer only when the PR title matched
`^T-\d{3}` — narrower than `seats.mjs`'s own `titleRoutes`/`PR_TITLE_RE`, which also accepts `STEWARD: `.
Every `STEWARD:`-titled PR fell through the gap: the loop set `r = '?'`, no seat ever matched, and the
run stopped at "No open PR routes to this seat" — routing to nobody, silently. PR #25 needed `hmdnah` to
hand-claim it twice because of this. A `STEWARD:` turn is the routine case (`AGENTS.md §1.3`), not an
edge case, so this recurs on every steward turn until fixed.

## 2. The fix

Two new pure functions in `scripts/seats.mjs`, plus one call site in `agent-start.mjs`'s existing
routing loop — no new step, no new CLI flag:

- **`seatFromBranchPrefix(root, branchName)`** (NEW, exported) — the seat a branch's own `<seat>/…`
  prefix names (`brahim/2026-08-15-step-routing-and-continue` is the real shape every live `STEWARD:`
  branch already has). `null` when the prefix names no registered seat.
- **`reviewerForBranch(root, branchName, finishingSeat)`** (NEW, exported) — for a titleless PR: resolves
  the branch's seat, then `machineOf` that seat, then hands the machine to the SAME `reviewerFor` a
  `T-nnn` PR already uses — never a separate routing path, so there is only one place that can disagree
  with itself. `{ seat: null, solo: false, reason }` when the prefix names no seat — explicit, not a
  default.
- **Wired into `agent-start.mjs`'s routing loop**: a `T-nnn` title still resolves via `reviewerFor(root,
  id, undefined)` exactly as before (unchanged — the title wins when present). Only the `else` branch (no
  `T-nnn`) now calls `reviewerForBranch(root, pr.headRefName, undefined)` instead of leaving `r = '?'`.
  When the branch names no known seat, `r` is printed literally as `NOBODY` with the reason appended, so
  a human reading the routing table sees why, rather than a bare `?` that looks like a bug in the script
  itself.
- **Cosmetic, same commit:** the trailing `Finish with: … <T-nnn> --review` hint now prints `mineId ??
  '<STEWARD-slug>'` — the old text always said `<T-nnn>`, which was wrong for exactly the PRs this task
  is about.

⚠ **Derives, never widens** — `reviewerForBranch` only ever calls the machine through `machineOf`, read
from the seat registry; it cannot resolve to `pc` unless the branch prefix names a seat whose registry
row says `pc`. A browser-only PR opened under a headless seat's branch prefix still routes to that
seat's own (headless) reviewer, never to `khalihlna` by coincidence.

## 3. Verification

`pnpm verify` (foreground): **PASS**, exit 0. Main suite: **900 tests, 95 files, 0 failed**.
`docs:check`: **146 tests, 8 files, 0 failed** (includes `tests/protocol/seats.test.ts`,
`tests/protocol/agent-start.test.ts`). `tests/freeze-boundary.test.ts` green ⇒ frozen surface unmoved —
**RISK: additive** (only `scripts/`, `scripts/*.d.mts` and `tests/protocol/` touched, no `packages/`, no
`apps/web`).

**Revert-verified, live**, two ways:

1. `git stash` on `scripts/{agent-start.mjs,seats.mjs,seats.d.mts}` (tests left in place, exactly what a
   real revert of the fix looks like) and re-ran the two protocol suites: **10 of 77 tests RED** —
   `seatFromBranchPrefix is not a function` / `reviewerForBranch is not a function` (6, `seats.test.ts`)
   and the new end-to-end `agent-start.test.ts` cases. The end-to-end one is the literal shape the task's
   own `done-when:` names: with the fix reverted, a real spawn of `agent-start.mjs --review` against a
   fixture PR titled `STEWARD: mystery turn` on a real pushed branch printed
   `reviewer: ?` and stopped at `No open PR routes to this seat.` — routes to nobody. `git stash pop`
   restored **77/77 green**.
2. `tests/protocol/seats.test.ts`'s own `REVERT-VERIFIED` case reproduces the exact pre-fix formula
   inline (`id ? reviewerFor(...).seat : '?'`) and asserts it returns `'?'` for a `STEWARD:` title, next
   to the fixed `reviewerForBranch` call returning the real seat — same pattern
   `reviewFlipsToDone`'s existing revert test uses (T-014).

## 4. What the tests assert

`tests/protocol/seats.test.ts` (`titleless PR routing — the STEWARD case (T-012)`, pure, no `gh` spawn):

- `seatFromBranchPrefix` resolves each of `zayd/…`, `amer/…`, `brahim/…` to their own seat; is `null` for
  an unregistered prefix and for a plain `task/T-nnn-…` branch (which never reaches this path anyway,
  since it always carries a `T-nnn` in its PR title).
- `reviewerForBranch` routes a `zayd/…`/`brahim/…` branch (both `box`) to `hmdnah`, an `amer/…` branch
  (`pc`) to `khalihlna` — **never** the box reviewer, proving the fallback derives rather than widens.
  An unregistered prefix returns `seat: null` with a reason naming NOBODY, not a default.

`tests/protocol/agent-start.test.ts` (`--review routing — a titleless (STEWARD:) PR, end to end (T-012)`,
spawns the real CLI, hermetic against `gh` identity via a new `fakeGhForReview` helper — extends the
existing `fakeGhReporting` stand-in to also stub `gh pr list`/`pr comment`/`pr checkout`, so `pr checkout`
resolves to a REAL `git checkout` of a branch the test itself pushed, never touching actual GitHub or
ambient `gh` auth):

- A `STEWARD:`-titled PR on a real `brahim/…` branch routes to `hmdnah` (`→ YOURS`), checks out, and
  reaches `Reviewing: PR #99`.
- A titleless PR whose branch has no registered-seat prefix prints `reviewer: NOBODY` with the reason,
  and the run stops at "No open PR routes to this seat" — same observable failure as before the fix, but
  now explicit rather than a bare `?`.
- A `T-nnn`-titled PR pushed under a DELIBERATELY mismatched `amer/…` prefix still routes by title
  (`hmdnah`, `machine: box`) — proves the branch fallback never overrides a present `T-nnn`.

This closes the gap `tests/protocol/agent-start.test.ts` had never covered before (noted as a known
limitation in T-015's own handoff, `handoff/zayd/2026-08-16-T-015-continue-mechanism.md` §"OWES" —
`gh pr checkout`/`gh pr comment` were previously exercised only against a bare local `origin`, where
`gh pr list` returns nothing). `fakeGhForReview` is new test-only infrastructure; nothing in
`scripts/agent-start.mjs` itself gained a test-only branch.

## 5. What this does NOT cover

- `reviewerForBranch`'s `finishingSeat` parameter is accepted for symmetry with `reviewerFor` but is
  inert here: `machineOf` always resolves to `box`/`pc` directly from the registry row, so the `machine:
  any` fallback `reviewerFor` itself implements never triggers through this path. Not a defect — a
  branch's own seat prefix already names a concrete machine, unlike a task's `machine: any` field.
- The `Finish with: … <STEWARD-slug>` hint is cosmetic guidance printed to the terminal, not enforced;
  `agent-finish.mjs` already accepts any non-`T-nnn` string as a STEWARD identifier and was not touched.

## 6. Backward sweep (invariant 7)

The routing loop had exactly one call site for reviewer resolution (`agent-start.mjs`'s `--review`
branch); this is the only place `T-nnn`-less PR routing could recur. `agent-finish.mjs`'s own
`reviewerFor` calls (finish-time routing, and the `NEXT TURN: REVIEW ONLY` banner) already pass
`isTask ? task : machine` — the finishing seat's OWN machine, known directly, never parsed from a PR
title — so they were never exposed to this gap and needed no change.

## 7. Files

- `scripts/seats.mjs` — `seatFromBranchPrefix` NEW (exported), `reviewerForBranch` NEW (exported).
- `scripts/seats.d.mts` — both declared.
- `scripts/agent-start.mjs` — routing loop's `else` branch now calls `reviewerForBranch` instead of
  leaving `'?'`; the trailing `Finish with:` hint is STEWARD-aware.
- `tests/protocol/seats.test.ts` — `titleless PR routing — the STEWARD case (T-012)` suite, +9.
- `tests/protocol/agent-start.test.ts` — `fakeGhForReview`/`pushSteward` helpers NEW;
  `--review routing — a titleless (STEWARD:) PR, end to end (T-012)` suite, +3.
