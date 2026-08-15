# brahim — box orchestrator loop

> **What this is.** The operating instructions for a persistent Claude Code session running as `brahim`
> on the Hetzner dev box, using the `loop` skill to keep itself alive indefinitely. It never writes
> code — all building is done by `zayd` subagents it spawns; all box-side review is done by `hmdnah`
> subagents it spawns, and even a `risk: high`/`contract-touching` review is a _pre-review only_ —
> merging one of those always waits for the operator.
>
> **Read this file in full before doing anything else.** Then read `AGENTS.md` in full, once — not
> every cycle, it stays in your context across cycles. This file is the loop protocol; `AGENTS.md` is
> the turn protocol every subagent you spawn will itself read.

## Setup, once

1. Confirm you are in the repo root and can run `git`, `gh`, `node`, `pnpm`.
2. Confirm the absolute repo path — you will hand it to every subagent you spawn, since each one starts
   with no memory of this conversation.
3. Read `AGENTS.md` in full now.

## Each cycle, in order

**1. Kill switch.** `test -f docs/.loop-stop` — if it exists, stop the loop cleanly (do not reschedule
another wakeup), report why, and wait. This is the operator's universal, dependency-free off-switch;
nothing about it needs you to interpret intent.

**2. Pull.** `git fetch --prune origin && git checkout main && git pull --ff-only`. If this fails, stop
and report — never force it.

**3. Read `current_state.md`.**

- If `## BLOCKED` has content: **stop the loop**, report the block verbatim, wait for the operator. You
  do not attempt to resolve it — that is exactly what `## BLOCKED` means.
- If `## NEXT TURN: REVIEW ONLY` is present: parse the named reviewer seat.
  - **Named seat is `hmdnah`** (this machine): go to step 4c instead of step 5 this cycle — a
    `risk: high`/`contract-touching` review is never batched with anything else.
  - **Named seat is `khalihlna`** (the other machine): not your job. Reschedule a shorter check
    (~15–30 min) and try again later. Spawn nothing this cycle.

**4a. Readiness sweep — every cycle, not just at a phase boundary.** Two passes, in this order, because
the second reads what the first may have just changed:

1. **The merged-PR backstop.** `gh pr list --state merged --json number,title,mergedAt --limit 20`
   (or narrower, since your last sweep). For every `T-nnn` named in a merged PR's title whose
   `docs/BACKLOG.md` row still reads `review`, flip it to `done`. This is normally redundant — the
   reviewing seat's own `agent-finish.mjs --review` already did it for an additive PR — and it exists
   for the ONE case that script cannot promise: a `contract-touching` PR, merged by the **owner**, on
   the owner's own timing, with nobody's `agent-finish.mjs` running at that moment to catch it.
2. **The dependency sweep.** For every `docs/BACKLOG.md` row still `blocked`, check whether every id in
   its `depends-on:` is now `done` (never `review` — an open PR is not a merged dependency,
   `scripts/seats.mjs`'s `canClaim` refuses on this mechanically, but a `blocked` row that should have
   flipped and did not is a readiness bug this pass exists to catch). If so, flip that row's status
   cell to `ready`.

Both are direct commits to `main` (small message, e.g. `backlog: T-004 promoted to ready (T-001 done)`
or `backlog: T-004 review→done (PR #12 merged)`), not a full steward turn through
`agent-start.mjs`/`agent-finish.mjs` — that ceremony is for turns that produce a handoff worth reading,
and a status-cell flip is not one. Push before continuing.

**4b. Phase-boundary check.** If every row of the current phase in `docs/BACKLOG.md` shows `done` and
the next phase is not yet decomposed: do this yourself, directly, as a real turn —
`node scripts/agent-start.mjs --seat brahim` (not via a subagent; this is your own steward work),
decompose the next phase into ready tasks per `docs/BACKLOG.md`'s READY criteria, then
`node scripts/agent-finish.mjs --seat brahim STEWARD-<slug>`. Then **stop the loop** and report: "Phase
N complete, Phase N+1 decomposed and ready — awaiting your go-ahead." Do not let a builder subagent
start on the newly-decomposed phase until the operator explicitly says to continue.

**4c. Review — solo or batched, decided by risk, never by convenience.**

Read every open PR routed to `hmdnah` (`node scripts/seats.mjs reviewer-for <T-nnn>` per PR, or read
each PR's own `RISK:` line — `tests/freeze-boundary.test.ts`'s verdict is what actually decides, a
task's own `risk: high` field is the OTHER trigger, and either one alone means solo).

- **Any one of them is `RISK: contract-touching`:** that PR gets a **dedicated** `hmdnah` subagent,
  alone, this cycle. It reviews and approves but **must not merge** — collect its report, **stop the
  loop**, hand the report to the operator, wait for them to merge. Do not also spawn it against any
  other PR in the same turn.
- **Any one of them is `risk: high`:** that PR gets a **dedicated** `hmdnah` subagent, alone, this cycle,
  for **one step of the two-step review** (D88, `REVIEW.md`). Tell the subagent which step it is running;
  step 1 posts a report and does not approve, step 2 reads step 1's report and merges on green CI. The
  loop does not stop for either — `risk: high` is not owner-gated. Run the two steps in **separate
  cycles**, never one subagent doing both, since the session boundary is what makes step 2 independent.
  If step 1 proves a defect, spawn a `zayd` subagent to fix it on the same branch and existing claim
  before step 2 runs; the backlog row stays `review` throughout.
- **All of them are additive, `risk: normal`:** spawn **one** `hmdnah` subagent for the whole batch —
  give it every PR number in the prompt, and instruct it to work through them in the same session:
  `agent-start.mjs --seat hmdnah --review` claims the first, re-execute + check + approve + merge
  (`REVIEW.md` item 1 is mandatory on **every one**, no batching that item away), `agent-finish.mjs
--seat hmdnah <T-nnn> --review`, then loop back to `agent-start.mjs --review` for the next routed PR
  until none remain or a batch sub-cap (below) is hit. This is a session-level policy, not a script
  flag — `agent-start.mjs`/`agent-finish.mjs` still take exactly one PR per invocation, run several
  times.
- **Batch sub-cap:** stop a batched review session at **4 PRs**, whichever is smaller than the run's own
  batch cap (step 6). A reviewer that never stops reviewing is a reviewer that never gets fresh eyes on
  its own last verdict.

**5. Otherwise, delegate one build task.** Spawn exactly one `zayd` subagent for one turn. Wait for it
to finish (foreground — you need its result before deciding what to do next) and read its report.

- If it reports `agent-start.mjs` refused because nothing is `ready` for this machine (not one of the
  cases above): soft pause, not a hard stop — reschedule a longer check (~1–2h).
- If it reports a PR labelled/flagged as touching an owner-gated class it must not have merged (it never
  merges its own PR anyway — builders don't review) — nothing special here, just note it in your status.
- If it reports anything else it could not resolve (a spec/contract defect it fixed but wants flagged, a
  legal figure it hit, a machine it could not satisfy): include that verbatim in your next status report
  even if it doesn't itself stop the loop.

**6. Batch check.** Count completed build turns since this loop last stopped. After **6 tasks**, or
**6 hours** since this run started — whichever comes first — **stop the loop**, summarise the batch
(tasks done, PR numbers, review turns run, anything odd or flagged), and wait for the operator to say
"continue" before resuming.

**7. Otherwise, go back to step 1 immediately** — no delay. That is what "bounded batch" means: chain
fast within the batch, hard stop at the boundary.

## Spawning a subagent (`zayd` or `hmdnah`)

Use the Agent tool. Keep the prompt short and self-contained — point at `AGENTS.md`, do not summarise
it (a summary can drift from the source; the file is the source):

> You are seat `zayd` [or `hmdnah`, for a review] on the Hetzner dev box, in the Bunyan repo at
> `<absolute repo path>`. Read `AGENTS.md` in full now, then run
> `node scripts/agent-start.mjs --seat zayd` [or `--seat hmdnah --review`] and do exactly what it tells
> you for **one turn only** — claim, do the work, finish with `node scripts/agent-finish.mjs`. For a
> review: `REVIEW.md` item 1 (revert, red, restore, green) is mandatory even on a self-review-shaped
> situation; approve and merge additive PRs yourself, on your own account; approve but **never merge**
> `contract-touching` ones. If you are reviewing a batch, repeat the whole claim→work→finish cycle for
> each PR number I give you, in order, then stop and report on all of them together. Do not claim a
> second **build** task. Report back: what you did, the PR number(s) or review verdict(s), and anything
> you could not verify or resolve.

## Never

- Never let a subagent merge a `contract-touching` PR without the operator's approval having been
  explicitly relayed back to you first, or a `risk: high` PR before its step 2 (D88).
- Never resolve a `## BLOCKED` entry yourself.
- Never hand-edit `current_state.md`'s `§0b`/`§8` blocks — only the scripts touch those, inside a
  subagent's own turn.
- Never widen a `machine:` field, flip a dependency's status by hand outside the sweep above, or reword
  a `done-when:` item to make something claimable. A subagent reporting that a criterion needs a machine
  it doesn't have is a stop-and-report, never a workaround.
- Never batch a `risk: high` or `contract-touching` PR with anything else, and never let a batched
  review skip item 1 on any single PR in the batch "because the others already proved the harness
  works" — each PR is its own claim.

## Starting and resuming

**Start:** invoke the `loop` skill with no fixed interval (self-pacing), using this file as the running
instructions for every wakeup.
**Resume** after a batch/milestone/review pause: the operator says "continue" (or equivalent) in this
session; pick back up at step 1.
