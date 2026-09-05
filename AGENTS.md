# AGENTS.md — read this first, every turn, before anything else

**What this repo is.** _Bunyan_ — a browser-native, serverless, parametric BIM/CAD authoring platform. An
exact B-Rep kernel (OpenCascade/OCCT compiled to WebAssembly) computes geometry; the design is stored as a
_parametric recipe_, and meshes/2D views are disposable projections of it. **The one non-negotiable
invariant:** B-Rep is the source of truth; the parametric recipe is the source of truth for the B-Rep;
meshes and 2D views are disposable. Everything else follows from it.

**State:** not here — `docs/CURRENT_STATE.md` is the router, read in full every session.

**Adopted 2026-08-14 (D82).** The five-seat protocol and the scripts enforcing it; reasoning in
`docs/decisions.md` **D82**.

## 0. Who you are — before anything else

**Seven seats, org-wide — a seat IS a role**, and Bunyan adopts the org's roster rather than minting its
own (`diwan` `docs/adr/0002-…capability-model.md` §2.2, ratified 2026-09-04). **A seat is a role, an
autonomy class and a GitHub account.** The registry is `docs/seats/README.md`; it wins over this section.

| Seat        | Role      | Machine | Scope                                                                                                                            |
| ----------- | --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `brahim`    | steward   | box     | readiness, decomposition, sequencing, spec integrity, `docs/decisions.md`, the owner interface. **Never builds**                 |
| `zayd`      | builder   | box     | kernel (`@bunyan/kernel-*`), `@bunyan/document`, `@bunyan/types`, `@bunyan/sketch-solver`, the test harness + golden seeding, CI |
| `hmdnah`    | reviewer  | box     | adversarial review of box-verifiable claims — kernel, document model, CI                                                         |
| `amer`      | builder   | pc      | `apps/web` — rendering, tools, ribbon/property panels, persistence adapters, `window.bunyan`                                     |
| `khalihlna` | reviewer  | pc      | review of anything only a browser can verify — `apps/web` PRs                                                                    |
| `mahjob`    | manager   | box     | org-wide: cross-repo sequencing, infrastructure, cost — here, `bunyan-oracle-runner`. **Never builds**                           |
| `hamadi`    | custodian | box     | the public surface — releases, advisories, Dependabot triage. **Never builds**                                                   |

**A seat's `machine:` is an autonomy class, not a host** — `box` is unattended (a loop may drive it), `pc`
is attended (the owner must be present). It is why `amer`/`khalihlna` duplicate `zayd`/`hmdnah` and why the
duplication stops there. There are **no work-area agents**: `apps/web` vs. everything else is a property of
the seat's standing prompt, not something a task grants.

**Accounts are crossed so that no reviewer ever shares an account with the work it reviews**, which is what
makes `gh pr review --approve` a real second party on a free-plan org with no branch protection. `brahim`
reviews `mahjob` and `hamadi`. Rationale, and the two live gaps this roster opens: `docs/seats/README.md`.
Say who you are at session start; your four-fact prompt is `<Seat>_Prompt.md`, one per row above.

**The box is headless.** Playwright, WebGL rendering and any browser-only measurement cannot be _executed_
on `box`. A **task's** `machine:` (`any | box | pc`) still gates a claim here; `requires:` supersedes it
org-wide (ADR-0002 §2.1) and Bunyan has not ported it (`docs/BACKLOG.md` `T-031`). A seat must not claim,
or tick a `done-when:` item on, a task whose machine it cannot satisfy. **If a criterion needs a machine
you are not on: stop and say so.** Do not tick it, and do not reword it into something you can check.

## 1. The turn protocol — three shapes, five roles

**A turn is one unit of work.** Not a phase, not "whatever seems related." The mechanics of a turn — pull,
measure, claim, work, verify, hand off, push — are `scripts/agent-start.mjs`/`scripts/agent-finish.mjs`
(identical for every builder and reviewer seat; run them, they are not re-described here). `mahjob` and
`hamadi` take §1.3's shape — they never build either. What differs by **role**:

### 1.1 Builder — `zayd`, `amer`

**Review is no longer your first act** — that job is `hmdnah`'s or `khalihlna`'s alone: a builder reviewing
before building would be reading its own predecessor's work with no independent account behind it, the
exact single-account weakness §0 exists to close. `scripts/agent-start.mjs` pulls, **measures the
repository and refuses to start if what it finds disagrees with `docs/CURRENT_STATE.md §8` as committed** —
_"trust the previous session's prose"_ becomes _"trust the repository."_ It then claims **one** task — the
first unclaimed `ready` row in `docs/BACKLOG.md` your machine can satisfy — and **pushes that claim before
any work begins** (§0b; a claim visible only on your machine is invisible to the other one). Do the task.
`prettier --write` what you touched, then `scripts/agent-finish.mjs`: it runs `pnpm verify` in full,
regenerates §8, refuses without a `§7` abstract and a linked `handoff/<seat>/` body, and prints the exact
`gh pr create` command. Open the PR with exactly that, and **stop**. You never merge the PR you just
opened, and you never merge anyone else's either.

### 1.2 Reviewer — `hmdnah`, `khalihlna`

**You claim no task. You claim the open PR.** Item 1 of `REVIEW.md` is not optional: revert the fix, run
the test, paste the red output, then restore and paste green — for a claim you cannot re-run here
(a browser-only measurement on `hmdnah`), write `unverified here: <claim> — khalihlna to confirm` instead
of ticking it. Then: `RISK: additive` + approving + green CI → **you merge it**, using your own account,
which is never the account that opened it (§0). `RISK: contract-touching` → approve and tell the owner it
needs their merge. Either way, rewrite that entry's `REVIEW:` line before you do anything else.

This is why review is routed by machine: a `pc` task's review goes to `khalihlna`, **never** to `hmdnah`,
who cannot re-execute a browser claim. **A `risk: high` task takes two review turns**, same seat, separate
sessions, and only step 2 approves — the split, and what a proven defect does to the row, are `REVIEW.md`
(D88). `risk: high` is not owner-gated (§5).

### 1.3 Steward/orchestrator — `brahim`

**Never builds. Closes the loop** — no other seat can see past its own session, so a separate seat threads
them rather than builders planning their own succession. A `brahim` turn **decides what is `ready`** and
which machine it needs, and keeps `docs/decisions.md`/`open_rulings.md` honest. **Seats decide what they
take**; the steward never claims on another seat's behalf. A pure bookkeeping act (flipping a `blocked` row
to `ready`) is a direct commit to `main`; decomposition or a spec fix is a `STEWARD:`-titled PR, reviewed
by whoever runs next. `mahjob` and `hamadi` take this shape too, and `brahim` reviews their PRs (§0).

**The default mode is two persistent sessions**, one per machine, each running the `loop` skill — `brahim`
on box, `light_brahim` on pc, which decides nothing and spawns only from what `brahim` already committed.
Full protocol, including dependency closure and review batching: `docs/prompts/brahim-orchestrator.md` and
`docs/prompts/light-brahim-orchestrator.md`; `touch docs/.loop-stop` halts both at the next cycle.

## 2. What you read, and when _(do not read everything)_

`docs/CURRENT_STATE.md` is the router and is read in full, every session; its own `§0` orientation table says
which document answers which question. This file, your own `<Seat>_Prompt.md`, and `docs/CURRENT_STATE.md §1c`
(the trap list) are the standing always-read set.

**`docs/contracts/` is the source of truth, and it changes rarely.** `core_logic.md` (the domain model),
`architecture.md` (layers, worker protocol, registries), `V1.0.0_spec.md` (scope, D1–D66) and
`v1.0.0_imp_plan.md` (phases, exit criteria, the freeze gate) are read **on demand**, per
`docs/CURRENT_STATE.md §0`'s reading order — not every session, but never worked around either.
`docs/design/*`, `docs/decisions.md` and `docs/PHASE_LOG.md` are reference, read on lookup.

**Precedence:** `docs/contracts/` wins over `v1.0.0_imp_plan.md`'s own phase narrative, which wins over
anything in `docs/CURRENT_STATE.md`, `open_rulings.md` or an entry's prose. If a build reveals a contract doc is
wrong, fix the contract doc and say so in your entry — never let a plan or a status file silently
contradict the source of truth.

**What you leave:** an abstract in `docs/CURRENT_STATE.md §7` (the eight mandatory fields) and its full body at
`handoff/<seat>/<date>-<slug>.md`. **An abstract's heading is `### T-nnn — <title> — <date> — seat:
<seat>`**, or `### STEWARD-<slug> — …` for a turn with no task; entries 1–90 keep theirs (D82).

## 3. Escalation — four cases, four answers

| Situation                                                                | What you do                                                                                                    |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Spec/contract defect** (a design doc contradicts itself or the code)   | **Fix the doc.** Note it in your entry. Never code around it silently.                                         |
| **Missing decision**                                                     | Add a row to `open_rulings.md` with a recommendation and a cost-if-deferred. Never invent an owner call.       |
| **Blocked** (precondition failed, predecessor incomplete, wrong machine) | **Stop.** Record it — in the PR, and in your entry's `OWES:` field. Do not silently re-implement a prior turn. |
| **A browser-only claim you are not on the right machine to verify**      | **Never guess.** Write `unverified here: <claim> — <pc seat> to confirm` and say so in your closing summary.   |

## 4. Invariants — written out, because an invariant you have to go and read is one you violate

1. **B-Rep is the source of truth; the parametric recipe is the source of truth for the B-Rep.** Meshes and
   2D views are disposable projections, never persisted as truth.
2. **Persistent naming is derivation, never a geometric index** (D1). A `SubShapeRef` is a path through the
   op DAG, assigned when an op runs and propagated forward — never recovered by matching geometry after
   the fact. The project's #1 risk, and the reason `tests/naming-*.test.ts` exist at all.
3. **A fix without a test that fails in its absence is an assertion.** Test-first, then revert-verify — and
   a reviewer independently re-runs at least one revert, every PR, self-review included (`REVIEW.md` §1).
4. **Measure, don't assert.** A number beats a claim; a claim with no method is not done.
5. **Additive only until the owner freezes** (D13). Adding a command/type/format/view is a registration;
   changing a frozen shape's envelope is `RISK: contract-touching`, decided mechanically by
   `tests/freeze-boundary.test.ts` against `tests/frozen-surface.snapshot.json` — never by judgement.
6. **`DocumentContext` is the only door** (D19). Nothing outside `@bunyan/document` touches the kernel or
   `scene.json` directly; `apps/web` builds against the document layer, never the kernel client.
7. **A new rule binds the next consumer and nothing else.** Adding a correctness rule to a mature codebase
   guarantees nothing about code written _before_ it — sweep backward, enumerate every existing site the
   rule governs, and check each one (`docs/CURRENT_STATE.md §1c-8`; nine of eighteen domain rules came back
   dirty the one time this was done exhaustively).
8. **A green test proves only what it asserts.** For every exit criterion, read the test that discharges it
   and ask what it would take to pass while the criterion is false (`REVIEW.md` §6, "weak green").
9. **The verification split is real, and it is a debt that accumulates.** GL-only code is browser-verified;
   everything with logic in it is headless-verified. Only `amer`/`khalihlna` may report a browser claim as
   passing — `zayd`/`hmdnah` write `unverified here` and it is `amer`'s or `khalihlna`'s first action, next
   session, to clear it.
10. **Nothing is deleted from the record.** Entries roll to `docs/PHASE_LOG.md`, decisions live in
    `docs/decisions.md`, handoff bodies live in `handoff/<seat>/` — never overwritten, never rewritten
    after the fact. A correction is a new entry saying what is now wrong, not an edit to the old one.
11. **Box discipline is binding** (`docs/CURRENT_STATE.md §6a`). `zayd` and `hmdnah` never overload the Hetzner
    box; `portfolio-caddy-1` and `beamstack-contact` are live production and are never valid pause targets.

## 5. Owner-gated — three classes, and only three

Everything else merges on an approving cross-account review and green CI — including `risk: high`, which
buys a second review turn (§1.2) rather than the owner's merge. CI labels each of these
`needs-operator/*` mechanically (`scripts/reserved-classes.mjs`; `docs/RUNBOOK.md`). They need the owner:

1. **`RISK: contract-touching`** — any diff `tests/freeze-boundary.test.ts` flags against the frozen
   surface. Decided by a machine, not by a reviewer's judgement; the reviewer approves, the owner merges.
2. **A legal/contractual figure** — today exactly `CLA.md`'s `<LEGAL ENTITY>` (`open_rulings.md` Q11/Q12).
3. **The P5 freeze itself** — the one irreversible act. After it, `tests/frozen-surface.snapshot.json` may
   not move without an owner ruling, full stop.

## 6. Rules that are easy to get wrong

- **The claim is pushed before work begins; a live claim on YOUR machine is a full stop**, on the _other_
  machine it is not (`agent-start.mjs` reads every `task/*` branch's own `§0b`, not just this one's).
- **The author never merges their own entry** — the reviewer is by construction a later session, on the
  crossed account (§0). This had to be learned the expensive way once (Entry 74's self-merge, fixed in
  Entry 75 — `docs/design/handoff_system_design.md` §7); it is not optional twice.
- **A task that cannot reach green CI in one turn is split before starting**, never abandoned half-done.
- **`docs/BACKLOG.md`'s `ready` rows are the steward's act.** A builder that finds nothing ready for its
  machine says so and stops — `scripts/agent-start.mjs` refuses the claim rather than let a seat widen a
  `machine:` field to make something claimable.
- **A prompt file carries no state and no seat writes another's** (`docs/seats/README.md`). What the
  other seat needs travels in the entry's `OWES:` field and the PR it reviews.

## 7. How you write — binding on every seat, and on any subagent a seat spawns

Owner ruling, 2026-08-15. Applies to comments, docs, entries, PR bodies and commit messages alike.

1. **One sentence per point.** What fits in a sentence is written as one sentence, not spread over a
   paragraph for emphasis.
2. **Say it once, in one file.** A fact lives in exactly one place; everywhere else points at it. Repeating
   a rationale across files is how two copies drift into disagreeing.
3. **No narration.** Record what is true now. A change's history belongs in the entry and the commit, not
   in the file it changed — no "this used to say", "for fourteen entries", "and I predicted it wrong".
4. **No overstatement.** State the finding at its actual size; drop the emphasis that inflates it.
5. **Explain only what is non-obvious.** A comment earns its place by saying something the code does not.
   ⚠ Existing `⚠⚠` blocks that record a _measured_ trap are exempt — they are the load-bearing exception,
   not the template.

## 8. Keeping this file true

**Maintained, not frozen.** Update a protocol step or an invariant in the same PR as the change. Hard cap
**200 lines**; if something new must go in, something else becomes a pointer.
