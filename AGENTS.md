# AGENTS.md — read this first, every turn, before anything else

**What this repo is.** _Bunyan_ — a browser-native, serverless, parametric BIM/CAD authoring platform. An
exact B-Rep kernel (OpenCascade/OCCT compiled to WebAssembly) computes geometry; the design is stored as a
_parametric recipe_, and meshes/2D views are disposable projections of it. **The one non-negotiable
invariant:** B-Rep is the source of truth; the parametric recipe is the source of truth for the B-Rep;
meshes and 2D views are disposable. Everything else follows from it.

**State:** not here — read `current_state.md`, which is the router with the hot core, and is read in full,
every session, by whichever seat is running.

**Adopted 2026-08-14, brahim's first steward turn (D82; Entry 91).** This file, the five-seat registry,
`docs/BACKLOG.md`, the three new seat prompts, and `scripts/{seats,agent-start,agent-finish}.mjs` all
landed together — the identity layer and the mechanics that enforce it, in the same turn, rather than a
protocol written down and trusted to prose. Nothing that already worked was rebuilt: `REVIEW.md`'s lens
checklist, `open_rulings.md`, the frozen-surface auto-classifier, `docs/decisions.md`'s `D`-numbering, the
`§1c` trap list and the whole engineering method stay exactly as they were. What was missing was the
coordination layer around them — see `docs/decisions.md` entry **D82** for the reasoning and the defects
this closes.

## 0. Who you are — before anything else

Five seats. **Identity is role + machine, and nothing else.** Capability comes from the task's `machine:`
field, your reading list from its `implements:` field. There are **no work-area agents** — ownership of
`apps/web` vs. everything else is a property of the seat's standing prompt, not something a task grants.

| Seat        | Role     | Machine                  | GitHub account     | Scope                                                                                                                            |
| ----------- | -------- | ------------------------ | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `brahim`    | steward  | box (Hetzner, headless)  | `davidian-abdo`    | readiness, decomposition, sequencing, spec integrity, `docs/decisions.md`, the owner interface. **Never builds**                 |
| `zayd`      | builder  | box (Hetzner, headless)  | `davidian-abdo`    | kernel (`@bunyan/kernel-*`), `@bunyan/document`, `@bunyan/types`, `@bunyan/sketch-solver`, the test harness + golden seeding, CI |
| `hmdnah`    | reviewer | box (Hetzner, headless)  | `narutousomaki741` | adversarial review of box-verifiable claims — kernel, document model, CI                                                         |
| `amer`      | builder  | pc (local, real browser) | `narutousomaki741` | `apps/web` — rendering, tools, ribbon/property panels, persistence adapters, `window.bunyan`                                     |
| `khalihlna` | reviewer | pc (local, real browser) | `davidian-abdo`    | review of anything only a browser can verify — `apps/web` PRs                                                                    |

**The GitHub accounts are deliberately crossed, not assigned per machine.** `zayd` (box) and `khalihlna`
(pc) share `davidian-abdo`; `amer` (pc) and `hmdnah` (box) share `narutousomaki741`. The pairing that
matters is never same-machine — it is _builder vs. the seat that reviews that builder's work_ — and on
that pairing the accounts always differ. `hmdnah` reviewing a `zayd` PR is therefore a genuine
different-account approval, and so is `khalihlna` reviewing an `amer` PR, even though each pair sits on
the same physical machine. This is a real improvement over the single-account self-review Bunyan ran under
through Entry 90 (`docs/design/handoff_system_design.md` §§3, 7 — the Entry 74/75 self-merge incident) —
GitHub's own self-approval refusal now backs the rule instead of a checklist item substituting for it.

Say who you are at session start — the owner's prompt is one line: _"read and follow `<Seat>_Prompt.md`."_
Your four-fact prompt is `<Seat>_Prompt.md` at the repo root (`Brahim_Prompt.md`, `Zayd_Prompt.md`,
`Hmdnah_Prompt.md`, `Amer_Prompt.md`, `Khalihlna_Prompt.md`); the registry is `docs/seats/README.md`.

**The box is headless.** Playwright, WebGL rendering and any browser-only measurement (draw calls, frame
time, a console-error-free boot) cannot be _executed_ on `box`. Every task therefore carries `machine:`
(`any | box | pc`); a seat must not claim, or tick a `done-when:` item on, a task whose machine it cannot
satisfy. **If a criterion needs a machine you are not on: stop and say so.** Do not tick it, and do not
reword it into something you can check.

## 1. The turn protocol — three shapes, one per role

**A turn is one unit of work.** Not a phase, not "whatever seems related." The mechanics of a turn — pull,
measure, claim, work, verify, hand off, push — are `scripts/agent-start.mjs`/`scripts/agent-finish.mjs`
(identical for every builder and reviewer seat; run them, they are not re-described here). What differs by
**role**:

### 1.1 Builder — `zayd`, `amer`

**Review is no longer your first act** — that job is `hmdnah`'s or `khalihlna`'s alone: a builder reviewing
before building would be reading its own predecessor's work with no independent account behind it, the
exact single-account weakness §0 exists to close. `scripts/agent-start.mjs` pulls, **measures the
repository and refuses to start if what it finds disagrees with `current_state.md §8` as committed** —
_"trust the previous session's prose"_ becomes _"trust the repository."_ It then claims **one** task — the
first `ready` row in `docs/BACKLOG.md` your machine can satisfy and nobody has already claimed — and
**pushes that claim before any work begins** (§0b; a claim visible only on your machine is invisible to
the other one). Do the task. `prettier --write` the files you touched, then `scripts/agent-finish.mjs`,
which runs `pnpm verify` in full, regenerates §8, refuses without a `§7` abstract and a linked
`handoff/<seat>/` body, and prints the exact `gh pr create` command. Open the PR with exactly that, and
**stop**. You never merge the PR you just opened, and you never merge anyone else's either.

### 1.2 Reviewer — `hmdnah`, `khalihlna`

**You claim no task. You claim the open PR.** Item 1 of `REVIEW.md` is not optional: revert the fix, run
the test, paste the red output, then restore and paste green — for a claim you cannot re-run here
(a browser-only measurement on `hmdnah`), write `unverified here: <claim> — khalihlna to confirm` instead
of ticking it. Then: `RISK: additive` + approving + green CI → **you merge it**, using your own account,
which is never the account that opened it (§0). `RISK: contract-touching` → approve and tell the owner it
needs their merge. Either way, rewrite that entry's `REVIEW:` line before you do anything else.

This is why review is routed by machine: a `pc` task's review goes to `khalihlna`, **never** to `hmdnah`,
who cannot re-execute a browser claim.

### 1.3 Steward/orchestrator — `brahim`

**Never builds. Closes the loop.** With four seats each running one turn and no seat able to see past its
own session, nothing threads them into a cycle unless something does that on purpose — that is `brahim`'s
job, and the reason a fifth seat exists rather than `zayd`/`amer` planning their own succession (the
coupling `docs/design/handoff_system_design.md` found expensive). A `brahim` turn **decides what is
`ready`** and which `machine:` it needs, and keeps `docs/decisions.md`/`open_rulings.md` honest. **Seats
decide what they take**; the steward never claims on another seat's behalf. A pure bookkeeping act
(flipping a `blocked` row to `ready`) is a direct commit to `main`; decomposition or a spec fix is a
`STEWARD:`-titled PR, reviewed by whoever runs next.

**The default mode is not the owner invoking a steward turn per cycle.** It is two persistent sessions,
one per machine, each running the `loop` skill so it keeps itself alive: `brahim` on box (decides
readiness, spawns `zayd`/`hmdnah`) and `light_brahim` on pc (decides nothing, spawns `amer`/`khalihlna`
from what `brahim` already committed). Full instructions, including the dependency-closure and
review-batching policy (small `RISK: additive` PRs may review together; `risk: high`/`contract-touching`
never batches): `docs/prompts/brahim-orchestrator.md` and `docs/prompts/light-brahim-orchestrator.md`.
Start either by opening a session on that machine and saying _"read `docs/prompts/<file>.md` in full and
begin exactly as it instructs."_ `touch docs/.loop-stop` halts both loops at their next cycle boundary.

## 2. What you read, and when _(do not read everything)_

`current_state.md` is the router and is read in full, every session — that has not changed, and its own
`§0` orientation table says which document answers which question. This file, your own `<Seat>_Prompt.md`,
and `current_state.md §1c` (the trap list) are the standing always-read set.

**`docs/contracts/` is the source of truth, and it changes rarely.** `core_logic.md` (the domain model —
what the app _means_), `architecture.md` (layers, worker protocol, registries — how it is _built_),
`V1.0.0_spec.md` (scope, decisions D1–D66 — what _ships first_)
and `v1.0.0_imp_plan.md` (phases, exit criteria, the freeze gate) are read **on demand**, per
`current_state.md §0`'s reading order — not every session, but never worked around either.
`docs/design/*`, `docs/decisions.md` and `docs/history.md` are reference, read on lookup.

**Precedence, stated because it was never written down before:** `docs/contracts/` wins over
`v1.0.0_imp_plan.md`'s own phase narrative, which wins over anything in `current_state.md`,
`open_rulings.md` or an entry's prose. If a build reveals a contract doc is wrong, fix the contract doc and
say so in your entry — never let a plan or a status file silently contradict the source of truth.

**What you leave:** an abstract in `current_state.md §7` (the eight mandatory fields) and its full body at
`handoff/<seat>/<date>-<slug>.md`. **An abstract's heading is `### T-nnn — <title> — <date> — seat:
<seat>`** (or `### STEWARD-<slug> — …`, no task), replacing the legacy `### N | date | agent | headline`
form — same heading level. Entries 1–90 keep their original heading, never renumbered or rewritten.

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
   rule governs, and check each one (`current_state.md §1c-8`; nine of eighteen domain rules came back
   dirty the one time this was done exhaustively).
8. **A green test proves only what it asserts.** For every exit criterion, read the test that discharges it
   and ask what it would take to pass while the criterion is false (`REVIEW.md` §6, "weak green").
9. **The verification split is real, and it is a debt that accumulates.** GL-only code is browser-verified;
   everything with logic in it is headless-verified. Only `amer`/`khalihlna` may report a browser claim as
   passing — `zayd`/`hmdnah` write `unverified here` and it is `amer`'s or `khalihlna`'s first action, next
   session, to clear it.
10. **Nothing is deleted from the record.** Entries roll to `docs/history.md`, decisions live in
    `docs/decisions.md`, handoff bodies live in `handoff/<seat>/` — never overwritten, never rewritten
    after the fact. A correction is a new entry saying what is now wrong, not an edit to the old one.
11. **Box discipline is binding** (`current_state.md §6a`). `zayd` and `hmdnah` never overload the Hetzner
    box; `portfolio-caddy-1` and `beamstack-contact` are live production and are never valid pause targets.

## 5. Owner-gated — three classes, and only three

Everything else merges on an approving cross-account review and green CI. CI labels each of these
`needs-operator/*` mechanically (`scripts/reserved-classes.mjs`; `docs/RUNBOOK.md`). They need the owner:

1. **`RISK: contract-touching`** — any diff `tests/freeze-boundary.test.ts` flags against the frozen
   surface. Decided by a machine, not by a reviewer's judgement; the reviewer approves, the owner merges.
2. **A legal/contractual figure** — today exactly `CLA.md`'s `<LEGAL ENTITY>` (`open_rulings.md` Q11/Q12).
3. **The P5 freeze itself** — the one irreversible act. Once it happens, `tests/frozen-surface.snapshot.json`
   may not move without an owner ruling, full stop.

## 6. Rules that are easy to get wrong

- **The claim is pushed before work begins; a live claim on YOUR machine is a full stop**, on the
  _other_ machine it is not (two machines work in parallel; `agent-start.mjs` reads every `task/*`
  branch's own `§0b`, not just this one's).
- **The author never merges their own entry** — the reviewer is by construction a later session, on the
  crossed account (§0). This had to be learned the expensive way once (Entry 74's self-merge, fixed in
  Entry 75 — `docs/design/handoff_system_design.md` §7); it is not optional twice.
- **A task that cannot reach green CI in one turn is split before starting**, never abandoned half-done.
- **`docs/BACKLOG.md`'s `ready` rows are the steward's act.** A builder that finds nothing ready for its
  machine says so and stops — `scripts/agent-start.mjs` refuses the claim rather than let a seat widen a
  `machine:` field to make something claimable.
- **Five prompt files, each carrying no state.** `zayd` never writes `Amer_Prompt.md` — there is nothing
  left in either to write. What the other seat needs to know travels in the entry's `OWES:` field and the
  PR it reviews.

## 7. Keeping this file true

**Maintained, not frozen.** When a protocol step or an invariant changes, update it in the same PR as the
change. Hard cap **200 lines**; if something new must go in, something else becomes a pointer.
