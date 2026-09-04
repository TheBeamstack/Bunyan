# T-026 — The identity gate fires at approve/merge, not only at claim

**Seat:** `zayd` (builder on box) · **Date:** 2026-09-04 · **Branch:**
`task/T-026-the-identity-gate-fires-at-approve-merge` · **Risk (task):** high · **Risk (mechanical,
frozen surface):** additive

---

## 1. What the task owed

`docs/BACKLOG.md`'s `## Discovered` row of 2026-08-21: `agent-start.mjs`'s `identityGate` (D87, T-013)
guards the CLAIM, but a reviewer approves and merges well after that call returns — in a session that may
not even be the one that claimed it (`--continue`, T-015), or one instructed to skip `agent-start.mjs`
altogether, exactly what happened on PR #39. Measured there: the box's default `gh` identity **was** the
PR's own author, nothing between the claim and `gh pr merge` re-checked it, and the reviewer's handoff
body recorded *"Verdict: APPROVED, and merged by me"* for a PR that carried **zero** reviews. Three
done-when items: the gate must be callable independently of a claim and run before any `gh pr
review`/`gh pr merge` the harness prints or performs; `agent-finish --review` must state its verdict as
OWED, never performed; and a seat whose resolved `gh` login is wrong must be refused, naming the mismatch.
A fourth: the existing claim-time gate keeps its behaviour — this is an addition, not a move.

## 2. The fix — reuse `identityGate`, re-run it independently, in `agent-finish.mjs`

`agent-start.mjs`'s `resolveGhLogin` was private; it is now exported (`scripts/agent-start.mjs`,
`scripts/agent-start.d.mts`) so `agent-finish.mjs` can call the exact same pure check
`agent-start.mjs`'s own claim-time gate uses — one function, two call sites, never two copies that could
disagree.

`agent-finish.mjs` now runs it at the very top of `main()`, immediately after seat/role/machine resolve
and before EVERYTHING a `--review` turn does: the machine gate, the risk/step gate, `pnpm verify`, the
backlog status flip, and the push. `--seat hmdnah T-nnn --review` with `gh` authenticated as anything
other than `hmdnah`'s own account (`narutousomaki741`) is refused immediately, naming both accounts
(`docs/RUNBOOK.md` "Seat credentials"). A plain (non-`--review`) finish never calls this at all — the
guard is scoped to the identity risk the task names, not moved onto every finish.

Why this specific placement discharges "a seat whose resolved `gh` login is the PR's own author is
refused": on this repo's crossed-account roster, a reviewer's own registered account is by construction
never the same as the account that could have authored the PR it is reviewing (`docs/seats/README.md`
"Why the GitHub accounts are crossed"). So "gh's login differs from the reviewing seat's own account" and
"gh's login is [some other seat's, therefore possibly the PR author's] account" are the same fact from two
angles — PR #39 is the concrete case: `hmdnah` (`narutousomaki741`) needed `GH_TOKEN` exported and didn't
get it, so `gh` silently reported `davidian-abdo` — `zayd`/`khalihlna`'s account, and in that instance the
PR's actual author. Reusing `identityGate` against the seat's OWN account catches it without a second `gh
pr view --json author` round trip.

## 3. The verdict, stated as OWED — `reviewClosingLines`

The script never calls `gh pr review`/`gh pr merge` itself; it prints the exact command for the seat to
run next. The three inline `console.log` blocks that used to say **"Review complete"** — read, on PR #39's
evidence, as "done" rather than "the mechanical review turn is complete, the GitHub actions are not" — are
now one pure, exported function, `reviewClosingLines({ task, seat, role, machine, riskHighStep1,
reviewContractTouching, prNumber })`, returning the message lines. Every branch now says **approval/merge
are OWED, not yet performed** before naming the command. Extracting it to a pure function makes the wording
itself unit-testable without a fixture that reaches `pnpm verify` — this suite's own stated scope limit
(its header comment already says so).

## 4. Shared test infrastructure — `tests/protocol/gh-stub.mjs`

`agent-start.test.ts` already had a `gh` stand-in (`fakeGhReporting`/`fakeGhForReview`/`ghCmdIn`) for
exactly this identity guard. Every `--review` invocation in `agent-finish.test.ts` now needs the SAME
stand-in — this box's real ambient `gh` is `davidian-abdo`, and `hmdnah`'s own account is
`narutousomaki741`, so every existing `--review` test in that suite would otherwise newly refuse at the
new gate before reaching whatever it meant to exercise. Rather than duplicate the stand-in in a second
file (`AGENTS.md §7.2` — say it once), it is factored out to `tests/protocol/gh-stub.mjs` (+
`gh-stub.d.mts`), and both test files import it. `agent-start.test.ts` itself is otherwise unchanged
behaviourally — only the stand-in's location moved.

## 5. What changed, file by file

- `scripts/agent-start.mjs` — `resolveGhLogin` exported (was private); one doc comment line explaining why.
- `scripts/agent-start.d.mts` — declares the newly-exported `resolveGhLogin`.
- `scripts/agent-finish.mjs` — imports `identityGate`/`resolveGhLogin`; the new identity-guard block
  (`if (review) { … }`) right after seat/role/machine resolve; the closing-message block replaced by a call
  to the new `reviewClosingLines`; header doc comment's step list updated.
- `scripts/agent-finish.d.mts` — declares `reviewClosingLines`.
- `tests/protocol/gh-stub.mjs`, `tests/protocol/gh-stub.d.mts` — NEW, the shared `gh` stand-in.
- `tests/protocol/agent-start.test.ts` — imports the stand-in from `gh-stub.mjs` instead of defining it
  locally; no behavioural change, 33/33 still pass.
- `tests/protocol/agent-finish.test.ts` — new `describe` block for the identity guard (4 tests); every
  pre-existing `--review` test that used `hmdnah` now passes a `gh` stand-in reporting
  `narutousomaki741`; new `describe` block for `reviewClosingLines` (4 tests, pure, no fixture).

## 6. Revert-verification (`AGENTS.md §4-3`)

`git stash push -- scripts/agent-finish.mjs` (reverting only the production file, keeping the new tests),
then re-ran `tests/protocol/agent-finish.test.ts`:

| State | Result |
| --- | --- |
| reverted (pre-fix) | **7 failed \| 18 passed (25)** — the 4 new identity-guard tests plus the 4 `reviewClosingLines` tests (the latter: `TypeError: reviewClosingLines is not a function`) |
| restored | **25 passed (25)** |

The 18 tests that stayed green on the reverted file are exactly the pre-existing ones, now carrying a `gh`
stand-in they did not need before — proof the stand-in addition alone changes nothing, and the 7 failures
are precisely what this task's own fix discharges.

## 7. Verification

- `pnpm verify` — full CI step list, green: **typecheck** (incl. `apps/web`) · **lint** · **format:check**
  · **test — 995 passed (100 files)** · **reseed:check** (no `BASE_REF`, skips — not a PR here) ·
  **docs:check — 174 passed (8 files)**.
- `tests/protocol/agent-start.test.ts` — **33 passed (33)**, unchanged behaviourally after the stand-in
  extraction.
- `tests/protocol/agent-finish.test.ts` — **25 passed (25)**.
- `tests/freeze-boundary.test.ts` is inside `docs:check`'s 174 and green — nothing here touches
  `WATCHED`; every changed file is under `scripts/`/`tests/`. Mechanical `RISK: additive`.

## 8. What is NOT verified here

- **The two-step `risk: high` review itself (D88)** — this task's own row carries `risk: high`, so this PR
  needs two review turns, same seat, before it may merge. Nothing here can self-certify that; it is the
  next seat's act.
- **A live PR's `gh pr view --json author` was not separately exercised** — the fix relies on the crossed-
  account invariant (§2 above) rather than fetching the PR's actual author, which is faster and does not
  need network access in the test fixture, but is a structural argument, not an independent measurement
  against a real GitHub PR. Worth a reviewer's own read of `docs/seats/README.md`'s crossing table to
  confirm no seat pair is exempt.

## 9. OWES

- **`hmdnah`** — this is `risk: high`; both review turns land here, same seat, per D88
  (`REVIEW.md` "Two steps"). Item 1's revert-verification is already done above and reproducible with the
  same `git stash` recipe.
- **No `pc` seat is owed anything by this turn** — nothing here touches `apps/web`.
