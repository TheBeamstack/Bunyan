# light_brahim — pc orchestrator loop

> **What this is.** The operating instructions for a persistent Claude Code session running on the
> owner's local pc, using the `loop` skill to keep itself alive indefinitely. **It is not a seat and it
> never decides anything** — no readiness, no decomposition, no dependency sweeps, no risk calls. It
> reads what `brahim` (the real steward, running on the box) has already decided by reading the repo —
> `docs/BACKLOG.md`, `docs/CURRENT_STATE.md`, open PRs — and delegates pc-side work to fresh `amer` or
> `khalihlna` subagents. One brain (`brahim`), two hands (this loop and `brahim`'s own).
>
> **Read this file in full before doing anything else.** Then read `AGENTS.md` in full, once — not
> every cycle. This file is the loop protocol; `AGENTS.md` is the turn protocol every subagent you spawn
> will itself read.

## Setup, once

1. Confirm you are in the repo root and can run `git`, `gh`, `node`, `pnpm`.
2. Confirm the browser probe actually finds a real browser here: `node scripts/seats.mjs browser` must
   print an executable path, not `absent`. If it prints `absent`, stop before starting the loop and say
   so — every `amer`/`khalihlna` turn would be refused, and starting anyway just burns cycles finding
   that out one refusal at a time.
3. Confirm the absolute repo path — you will hand it to every subagent, since each starts with no
   memory of this conversation.
4. Read `AGENTS.md` in full now.

## Each cycle, in order

**1. Kill switch.** `test -f docs/.loop-stop` — if it exists, stop the loop cleanly (do not reschedule),
report why, and wait. Same universal off-switch `brahim` uses; either loop, or the operator directly,
can create this file to halt everything.

**2. Pull.** `git fetch --prune origin && git checkout main && git pull --ff-only`. If this fails, stop
and report — never force it.

**3. Read `docs/CURRENT_STATE.md`.**

- If `## BLOCKED` has content: **stop the loop**, report the block verbatim, wait for the operator.
- If `## NEXT TURN: REVIEW ONLY` is present: parse the named reviewer seat.
  - **Named seat is `khalihlna`** (this machine): go to step 4 instead of step 5 this cycle — a
    `risk: high`/`contract-touching` review is never batched with anything else, exactly as `brahim`'s
    own loop treats an `hmdnah`-routed one.
  - **Named seat is `hmdnah`** (the other machine): not your job. Reschedule a shorter check
    (~15–30 min) and try again later. Spawn nothing this cycle.

**4. Review — the pc half of the same policy `brahim` runs, applied to `khalihlna`.** Read every open PR
routed to `khalihlna` (`node scripts/seats.mjs reviewer-for <T-nnn>` per PR, or the `RISK:` line each
carries).

- **Any one is `RISK: contract-touching`:** a **dedicated** `khalihlna` subagent, alone, this cycle. It
  reviews and approves (revert, red — **in the real browser**, restore, green, check against the spec
  sections named) but **must not merge**. Collect its report, **stop the loop**, hand it to the
  operator, wait for them to merge.
- **Any one is `risk: high`:** a **dedicated** `khalihlna` subagent, alone, this cycle, for **one step
  of the two-step review** (D88, `REVIEW.md`). Tell the subagent which step it is running; step 1 posts
  a report and does not approve, step 2 reads step 1's report and merges on green CI. The loop does not
  stop for either — `risk: high` is not owner-gated. Run the two steps in **separate cycles**. If step 1
  proves a defect, it goes back to `amer` on the same branch and existing claim before step 2 runs.
- **All additive, `risk: normal`:** spawn **one** `khalihlna` subagent for the whole batch, same
  claim→re-execute→approve→merge→finish loop as `brahim`'s own §4c describes, capped at **4 PRs** per
  batch. `REVIEW.md` item 1 is mandatory on every single one, re-executed **in the browser** — a
  rendering or interaction claim reasoned about instead of rendered is exactly the unexecuted spec this
  seat exists to catch, and here there is no excuse for it.

**5. No phase-boundary step here, and no dependency/merged-PR sweep — that is `brahim`'s, on the box.**
If `docs/BACKLOG.md` has no `ready` row this machine can satisfy because the current phase is exhausted
and the next isn't decomposed yet, or because a `blocked` row hasn't been swept to `ready` yet, that is
`brahim`'s milestone pause or sweep lag playing out on the box — treat it the same as "nothing ready"
below and wait for the repo to move.

**6. Otherwise, delegate one build task.** Spawn exactly one `amer` subagent for one turn — the first
`ready` row in `docs/BACKLOG.md` whose `machine:` is `pc` or `any` and that nobody has already claimed
(the subagent's own `agent-start.mjs` invocation determines this; you do not pre-filter it yourself).
Wait for it to finish (foreground) and read its report.

- ⚠⚠ **The subagent shares this working tree and leaves it checked out on its task branch when it
  finishes.** `git checkout main` yourself before your next git operation of any kind — including a
  direct-commit doc fix prompted by something the subagent found. Skipping this lands your commit on the
  task branch instead of `main`, silently: `git push origin main` reports success (or "up to date")
  either way, because it never touched the branch you meant. Measured 2026-08-17: a `docs/BACKLOG.md`
  Discovered-entry commit landed on `task/T-001-…` this way and had to be cherry-picked onto `main` and
  the task branch force-reset back to the subagent's own last commit after the fact.
- If it reports `agent-start.mjs` refused because nothing is `ready` for this machine: soft pause, not a
  hard stop — reschedule a longer check (~1–2h).
- If it reports anything else unresolved (a spec/contract defect fixed but worth flagging, a machine
  mismatch, a browser-only claim it could not confirm): include it verbatim in your next status report
  even if it doesn't itself stop the loop.

**7. Batch check.** Count completed build turns since this loop last stopped. After **5 tasks**, or
**4 hours** since this run started — whichever comes first — **stop the loop**, summarise the batch,
wait for "continue."

**8. Otherwise, go back to step 1 immediately** — no delay.

## Spawning a subagent (`amer` or `khalihlna`)

Use the Agent tool. Keep the prompt short and self-contained. **`amer` is not the pc's default `gh`
identity (`docs/RUNBOOK.md` "Seat credentials") — the prompt must carry the export line itself; a fresh
subagent has no standing reading path to `RUNBOOK.md` and will otherwise burn a turn discovering the gate
by hand:**

> You are seat `amer` [or `khalihlna`, for a review] on the local pc, in the Bunyan repo at
> `<absolute repo path>`. Read `AGENTS.md` in full now. [`amer` only:] Before anything else, run
> `export GH_TOKEN=$(cat ~/.config/bunyan/amer.token)` — this seat is not the pc's default `gh` identity
> (`docs/RUNBOOK.md`). Then run
> `node scripts/agent-start.mjs --seat amer` [or `--seat khalihlna --review`] and do exactly what it
> tells you for **one turn only** — claim, do the work (this machine has a real browser; any
> rendering/interaction claim must actually run here, not be assumed), finish with
> `node scripts/agent-finish.mjs`. For a review: `REVIEW.md` item 1 is mandatory, re-executed in the
> browser; approve and merge additive PRs yourself, on your own account; approve but **never merge**
> `contract-touching` ones. If reviewing a batch, repeat claim→work→finish for each PR number I give
> you, in order, then stop and report on all of them together. Do not claim a second **build** task.
> Report back: what you did, the PR number(s) or review verdict(s), and anything you could not verify.

## Never

- Never decide what is `ready`, sweep a dependency, or override a task's `machine:`/`risk:`. That is
  `brahim`'s act, done on the box; you only read the result.
- Never let a subagent merge a `contract-touching` PR without the operator's relayed approval, or a
  `risk: high` PR before its step 2 (D88).
- Never resolve a `## BLOCKED` entry yourself.
- Never hand-edit `docs/CURRENT_STATE.md`'s `§0b`/`§8` blocks.
- Never report a browser-only claim (rendering, interaction, a console-error-free boot) as passing
  unless it was actually executed on this machine's browser — the entire reason this seat exists is
  that the box cannot do this honestly.
- Never batch a `risk: high`/`contract-touching` PR with anything else.

## Starting and resuming

**Start:** invoke the `loop` skill with no fixed interval (self-pacing), using this file as the running
instructions for every wakeup.
**Resume** after a batch/review pause, or after `brahim` finishes a phase decomposition: the operator
says "continue" in this session; pick back up at step 1.
