# `hmdnah` review — PR #24, `STEWARD: two-step-high-risk-review`

**Seat:** `hmdnah` (reviewer, box). **Date:** 2026-08-15. **Author account:** `Davidian-Abdo`
(`brahim`). **Reviewed and merged on:** `narutousomaki741`.

**Verdict:** APPROVED and MERGED, `RISK: additive`, one review turn — the PR is itself `risk: normal`
and additive, so D88's two-step split does not apply to it.

## 0. Identity

`gh api user --jq .login` under `GH_TOKEN=$(cat ~/.config/bunyan/hmdnah.token)` returns
`narutousomaki741` (D87). The box's ambient `gh` identity is `Davidian-Abdo`, which opened this PR;
every write in this turn used the per-turn token.

⚠ `agent-start.mjs --seat hmdnah --review` printed `PR #24 (no T-nnn in title) reviewer: ?` and claimed
PR #23 instead. That is `T-012`, already filed. This review was therefore driven by hand off the open-PR
list, and `agent-finish.mjs --seat hmdnah STEWARD-two-step-high-risk-review --review` closed it.

## 1. Revert-verification

**Nothing to revert.** The diff touches six markdown files and one new handoff body; no `packages/`, no
`apps/`, no script, no test. The entry makes no revert-verification claim, so item 1 has no claim to
re-execute — stated rather than ticked.

What was re-executed instead: `pnpm verify` in full (green), and the two script claims the diff rests on,
read against `scripts/agent-finish.mjs` and `scripts/seats.mjs` at this commit.

## 2. Backward sweep — the finding that mattered

D88 is a new rule about `risk: high`, so every pre-existing site that already stated a `risk: high`
policy had to be swept. Three were not:

1. `docs/prompts/brahim-orchestrator.md`'s own header blockquote still read _"even a
   `risk: high`/`contract-touching` review is a pre-review only — merging one of those always waits for
   the operator"_, contradicting the §4c the same PR rewrote 70 lines below it. **Fixed on the branch.**
2. `docs/prompts/light-brahim-orchestrator.md` — the pc twin — still routed `risk: high` to a
   pre-review-only `khalihlna` subagent, stopped the loop, and waited for the operator (§4 and
   `## Never`). The ruling therefore did not bind the pc machine at all. **Fixed on the branch**, mirroring
   the box twin's new wording.
3. `Hmdnah_Prompt.md` and `Khalihlna_Prompt.md` summarise the one-step turn shape. Both point at
   `REVIEW.md` for the checklist, which now carries the split, so they are a second copy of a fact
   (`AGENTS.md §7.2`) rather than a contradiction. **Not changed** — the fix is to trim them to pointers,
   which is `brahim`'s call.

## 3. New kind of thing

The new kind is a review *step*. Its consumers: `agent-finish.mjs --review` (T-014), `agent-start.mjs`'s
reviewer routing, the two orchestrator loops, `brahim`'s merged-PR sweep, and CI's labeller. Each was
read. The labeller is clean: `scripts/reserved-classes.mjs` declares exactly the three owner-gated
classes and never reads a task's `risk:`, so `AGENTS.md §5`'s new sentence matches what CI does.

## 4. Claims vs code

Every claim the diff makes about the scripts holds at this commit:

- `--review` reads only the frozen-surface verdict and flips the row to `done`
  (`agent-finish.mjs` lines 298–311) and prints `gh pr review <n> --approve && gh pr merge <n> --squash`
  (lines 424–434). True, and filed as `T-014`.
- `risk: high` **or** `contract-touching` writes `NEXT TURN: REVIEW ONLY` naming the resolved reviewer
  seat (lines 313–341). True.
- `--review` clears that banner unconditionally (lines 281–291). True, and covered by `T-014`.
- `khalihlna` holds `davidian-abdo`, the account `zayd` opens from (`docs/seats/README.md`), so it cannot
  be the second approver on a box builder PR. True.
- T-014's measurement re-read at source: T-008's summary row is `review` on its own branch, and
  `handoff/hmdnah/2026-08-15-T-008-review.md` records the printed
  `gh pr review 23 --approve && gh pr merge 23 --squash`.

**Two claims the scripts contradict, neither covered by `T-014`** — both recorded in
`docs/BACKLOG.md`'s `## Discovered`, not fixed here, because they are script changes and this is a
docs PR:

- **"A defect goes back to the builder on the existing claim, row still `review`"** (`AGENTS.md §1.2`,
  `REVIEW.md`, D88, the orchestrator's new §4c) has no scripted route. `agent-start.mjs` refuses a named
  task whose row is not `ready` (line 517); `seats.readyFor` enumerates `ready` rows only; and a claim
  whose status is `finished — PR open, awaiting review` is refused as _"not an incomplete turn to
  continue"_ (line 576). A builder that reaches the branch by hand then finishes on the non-`--review`
  path, which prints a `gh pr create` line for a PR that is already open (line 493).
- **"The banner is what routes step 2"** (`T-014`'s second `done-when:`, and the handoff body's §5) is
  false. `agent-finish.mjs` writes the banner into the *task branch's* `current_state.md` and clears it
  there on the `--review` run; `agent-start.mjs` reads it only after `git checkout main`. It has never
  existed on `main` — `git log -S'## NEXT TURN: REVIEW ONLY' origin/main -- current_state.md` returns
  nothing — and reviewer routing comes from the PR title through `reviewerFor`. Leaving the banner
  standing on the branch, as `T-014` specifies, changes nothing on its own.

One more, mechanical: the new §7 abstract was appended in the middle of §7 rather than prepended, so the
§8 block this PR regenerated named `T-007` as the newest entry. `docs-state.mjs` assigns each new-scheme
abstract `n = 1000 - i` from array position, so "newest" is whatever sits first. **Fixed on the branch**
by moving the entry to the head of §7. ⚠ `tests/docs-budget.test.ts`'s _"abstracts must be newest-first"_
assertion cannot catch this: it sorts the same positional numbers it was given, so the check is a
tautology for every `T-nnn`/`STEWARD-` entry. Recorded here rather than rewritten — a real gate would be
a date/position cross-check, which is a change to a layer this seat does not own.

## 5. Numbers

The only figures are `pnpm state`'s generated §8 row (`836 green · 94 files · 264 suites`) and T-014's
"measured on T-008", which names its branch, its row and its printed command. Both carry a method.

## 6. Weak green

No new tests. The audit above of `docs-budget.test.ts`'s newest-first assertion is the one weak green
found, and it is pre-existing.

## 7. Risk

`pnpm state` reports **`RISK: additive` — unchanged vs baseline**, which matches a diff with no
`packages/`, no schema bump and no frozen byte. CI's `PR shape · reserved classes` job **ran** and applied
no `needs-operator/*` label; `gh pr view 24 --json labels` is empty. Full CI green before the merge.
