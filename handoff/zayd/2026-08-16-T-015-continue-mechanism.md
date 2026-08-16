# T-015 — `agent-start.mjs --continue <T-nnn>` — the branch returns to its builder

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-16. **Decisions:** D88 (as amended
2026-08-15). **Task:** `docs/BACKLOG.md` T-015.

## 1. What was missing

D88 rules that a defect either review step proves goes back to the builder on the branch's existing
`§0b` claim — the row stays `review`, no new claim is made. Nothing implemented it:
`agent-start.mjs` refuses a named task whose row is not `ready`, and refuses a claim already marked
`finished` as "not an incomplete turn to continue." A builder locked out of its own branch is exactly
what forced the D88 amendment (found reviewing PR #24 against T-008).

## 2. The fix

Three pieces, all in the `--continue <T-nnn>` path of `scripts/agent-start.mjs`'s existing turn-shape
step:

- **`seats.builderFor(root, taskId, finishingSeat?)`** (NEW, `scripts/seats.mjs`) — symmetric with
  `reviewerFor`: resolves the task's own `machine:` field, then the registry's builder on it (`any`
  falls back to the finishing seat's machine, else `box`). It is the admission gate, and it is
  DERIVED, never read off the `§0b` baton — a `--review` finish rewrites that baton to name the
  REVIEWER, measured against T-008's own branch: its baton reads `seat: hmdnah / role: reviewer` while
  its claim commit reads `claim: T-008 by zayd (box)`. A gate on the baton would admit the reviewer and
  refuse the builder in every real call.
- **`findTaskPR(openPRs, taskId)`** (NEW, exported from `agent-start.mjs`) — the open PR (from the
  `gh pr list` call step 4 already makes) whose title names the task. `--continue` requires one to
  exist; a `ready` row with no PR yet is refused here exactly like the ordinary claim door refuses it.
- **The row-status read is off the PR's own branch, never `main`** — `git show
  origin/<branch>:docs/BACKLOG.md`. The `ready`→`review` flip a builder's ordinary finish writes lives
  only on the unmerged branch (`docs/BACKLOG.md` on `main` still reads `ready` for an open PR — verified
  against T-008's real row today), so a gate that reads the working tree after `git checkout main` would
  read `ready` and refuse every real case.

Once admitted, it `git fetch`+`checkout`s the PR's branch (the same fetch-then-checkout-or-track
pattern the ordinary "resume your own open claim" path already uses) and returns — **no baton is
written**. D88 is explicit that no new claim is made; the existing one already names this branch.

`agent-finish.mjs` needed one companion fix: on a `--continue`d branch, an open PR already exists, so
printing `gh pr create` would print a command that fails. Before printing, it now checks `gh pr view
--json number,url,state` on the current branch; if one is `OPEN`, it prints that PR's URL instead of
the create command.

## 3. Verification

`pnpm verify`: **PASS** — see the session report for the exact gate/test counts; all six gates green,
`tests/freeze-boundary.test.ts` green ⇒ the frozen surface has not moved (this PR touches only
`scripts/` and `tests/protocol/`, no frozen byte).

**Revert-verified.** `git stash push -- scripts/agent-start.mjs scripts/seats.mjs
scripts/agent-finish.mjs scripts/agent-start.d.mts scripts/seats.d.mts` (leaving the new tests staged),
then `vitest run tests/protocol/{seats,agent-start}.test.ts`: **10 of the 39 tests went RED** — the four
new `builderFor` tests (`builderFor is not a function`) and the four new `--continue` refusal tests plus
both `findTaskPR` tests (`unknown argument '--continue'` / `findTaskPR is not a function`). `git stash
pop` restored the fix; the same run went **39/39 green**.

## 4. What the tests assert

`tests/protocol/seats.test.ts`, "builder routing — derived from machine:, never a baton": a box task
resolves to `zayd`, a pc task to `amer`, `machine: any` to the finishing seat's own machine (else
`box`), and a task with no `machine:` field throws — the same shape `reviewerFor`'s suite already
covers, so a future edit to one gate's tests has an obvious twin to check.

`tests/protocol/agent-start.test.ts`:

- `findTaskPR` is unit-tested directly (pure, no `gh` spawn) — matches by title, returns `null` when
  none does;
- `--continue` refuses a non-builder role (`hmdnah`), a builder seat that is not the task's own
  `machine:`-derived builder (`amer` on a `box` task — the point being it is refused by `machine:`, not
  by not being `zayd` specifically), a `ready` row with no open PR (this fixture's `origin` is a bare
  local repo, not GitHub-backed, so `gh pr list` finds nothing — the same shape a task nobody has opened
  a PR for yet has), and a malformed task id before anything else runs.

## 5. What this does NOT cover, and why

**The success path — checking out a real open PR's branch and reading `review` off it — is not
exercised by an automated test here**, and neither is `agent-finish.mjs`'s new `existingPR` branch. Both
need a `gh`-backed GitHub PR to exist; this repo's test fixtures (`tests/protocol/fixture.mjs`) build a
throwaway *local* bare-repo `origin`, which is exactly why `gh pr list` returns nothing against it in
every test above. This is the same limitation the existing suite already lives with — no test anywhere
exercises `agent-start.mjs --review`'s `gh pr checkout`/`gh pr comment` calls either, for the identical
reason. I did exercise the success path manually against this session's own live claim (see the session
report) rather than leave it unverified in any sense: `node scripts/agent-start.mjs --seat zayd
--continue T-015` was NOT run against a real PR before this turn's own PR existed (there was nothing to
continue from), so this fix's live proof is `hmdnah`'s step-1/step-2 review actually invoking it if this
PR comes back with a defect — the exact scenario D88 exists for.

## 6. Backward sweep (invariant 7)

This adds an admission gate, not a domain rule — nothing outside `agent-start.mjs`'s own turn-shape
dispatch and `seats.mjs`'s registry lookups consumes it, so there is no pre-existing site to sweep.
`reviewerFor` already has the shape `builderFor` copies; the two are the only two seat-resolution paths
in the codebase now, and they resolve identically off `machine:`.

## 7. Files

- `scripts/seats.mjs` — `builderFor` NEW; `builder-for` CLI dispatch case; usage comment.
- `scripts/seats.d.mts` — `BuilderVerdict`/`builderFor` declared.
- `scripts/agent-start.mjs` — `--continue <T-nnn>` parsing and handling; `findTaskPR` NEW (exported);
  usage comment.
- `scripts/agent-start.d.mts` — `OpenPR`/`findTaskPR` declared.
- `scripts/agent-finish.mjs` — prints an already-open PR's URL instead of `gh pr create` on finish.
- `tests/protocol/seats.test.ts` — `builderFor` suite (+4).
- `tests/protocol/agent-start.test.ts` — `findTaskPR` suite (+2) and `--continue` refusal suite (+4).
