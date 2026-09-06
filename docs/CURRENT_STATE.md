# Bunyan — `docs/CURRENT_STATE.md`

**What it is, and who reads it when.** The cross-session, cross-seat, cross-machine handoff router,
read **in full by every seat at the start of every session** — so its length is a cost paid on every
run. It carries what you need to act accurately; everything else is one hop away and named below.

| If you need… | Go to |
| --- | --- |
| the full text of a ruling (D1–D90) | **`docs/decisions.md`** (§4 here is the one-line index) |
| who am I, and what may I claim? | **`AGENTS.md`** + `docs/seats/README.md` (the Prompt column points at `../diwan/docs/seats/`) |
| what is ready to claim, and what depends on what | **`docs/BACKLOG.md`** |
| the session that earned a ruling, with its measurements | **`handoff/<seat>/`**, or **`docs/PHASE_LOG.md`** for older |
| *"why is this shaped this way?"* · *"has this been tried?"* | **`docs/PHASE_LOG.md`** |
| what the domain MEANS | **`docs/contracts/core_logic.md`** |
| how it is BUILT (layers, protocol, registries) | **`docs/contracts/architecture.md`** |
| what SHIPS first (scope, D1–D66) | **`docs/contracts/V1.0.0_spec.md`** |
| the phases, exit criteria, and **THE FREEZE GATE** | **`docs/contracts/v1.0.0_imp_plan.md`** |
| what the owner still owes a decision on | **`open_rulings.md`** |
| how to review a PR | **`REVIEW.md`** |
| the GitHub-side controls (labels, credentials, runner) | **`docs/RUNBOOK.md`** |
| how this handoff system works and why | **`docs/design/handoff_system_design.md`** |

**How to use it.**

- **Read it in full before touching anything**; reach for `docs/PHASE_LOG.md` the moment you are
  missing something older.
- **Append an abstract to §7** when you finish a unit of work, full body to
  `handoff/<seat>/<date>-<slug>.md`. The eight fields are mandatory and gate-enforced.
- **Record who validated what, on which engine.** A claim with no verification method is not done.
- Keep §2, §3 and §4 **current**. ⚠ They are also what makes compression safe: **a rule binds because
  it is in §1–§5, never because an old entry mentioned it.**
- **Never hand-edit §8.** It is written by `pnpm state`.

---

## §0 — Orientation (read this first)

**What Bunyan is:** a browser-native, serverless, parametric BIM/CAD authoring platform. An exact B-Rep
kernel (OpenCascade/OCCT in WebAssembly) computes geometry; the design is stored as a *parametric
recipe*, and meshes/2D views are disposable projections of it.

**The one non-negotiable invariant:** B-Rep is the source of truth; the parametric recipe is the source
of truth for the B-Rep; meshes and 2D views are disposable. Everything else follows.

**The hardest idea (and the schedule risk):** persistent sub-shape naming (D1). A `SubShapeRef` is a
derivation path (`nodeId` + `role` + `occurrence`), assigned when an op runs and propagated forward —
**never a geometric index, never recovered by matching geometry afterwards.**

**The reading order, the actor table, the MIQDAR gate and the version-string rule are `docs/CURRENT_STATE-reference.md`.**


### §0b — Live claim (this branch)

**The claim is pushed before work begins.** An unpushed claim is invisible across machines, and two
sessions can start the same `T-nnn`. This block is the claim on **this branch only**; the picture across
every live branch is `git ls-remote --heads origin 'refs/heads/task/*'`, which `scripts/agent-start.mjs`
prints and reads (each branch carries its own copy of this block) before deciding what a builder may
claim. `scripts/agent-finish.mjs` writes the final `status` line and pushes it as the last act of a turn.

<!-- BEGIN BATON — written by agent-start.mjs; pushed before work begins -->

| Field | Value |
|---|---|
| seat | `brahim` |
| builder | `brahim` |
| role | steward |
| machine | box |
| task | `STEWARD-x001-seven-seat-roster` |
| branch | `brahim/2026-09-04-x001-seven-seat-roster` |
| claimed-at | 2026-08-31T12:17:24Z |
| status | finished — PR open, awaiting review |

<!-- END BATON -->

<!-- BEGIN BLOCKED — rendered from docs/BLOCKERS.md by blocked.py; a hand-edit fails `gates.py docs` (RULINGS.md R15) -->

## BLOCKED

- **B-20260906-01** — `scope: item` · `item: T-026` — hmdnah's review credential is named by seat and stored by account
  - need: resolve a seat's token from `~/.config/beamstack/<account>.token` as well as `~/.config/bunyan/<seat>.token` in `scripts/agent-start.mjs`, correct `docs/RUNBOOK.md` "Seat credentials" to state both, and carry the change on its own `T-nnn` row
  - opened 2026-09-06T21:00Z by brahim · recorded in `docs/BLOCKERS.md`

<!-- END BLOCKED -->

---

## §1 — Where the build is right now

**P1–P3 CLOSED; the kernel protocol is FROZEN (21 live ops + 3 reserved).** P4/P4.5 (interaction) and
P5 (types) are the open work. **THE PROJECT IS IN THE PRE-FREEZE WINDOW:** `SubShapeRef` /
`BimObjectType` / `Command` / `scene.json` / `ParamSchema` / `UndoableEdit` are release-candidate and
freeze at **P5 step 6** — the one irreversible act, after which a wrong contract costs an amendment
across three products.

**P5 step 0 (the D50 constraint model) is COMPLETE**, as is every reopened pre-freeze row Ⓐ–Ⓕ plus
D66's contract half. **The freeze is unblocked and is the owner's act.** How it got there —
which sweep was taken instead of freezing, and why — is `docs/PHASE_LOG.md` §D.

> **⚠⚠ THE P4 REVIEW HEADLINE (Entry 24) — STILL THE FRAME:** there was **no interaction model in any
> contract document**, only *"button/drag → Command"*, which is how an action reaches the model, not how
> a human authors a building ⇒ phase **P4.5**, before the freeze. The second sweep found the deeper one:
> **Bunyan had exactly ONE associative relationship (`opening → host face`); everything else was
> absolute** ⇒ **D50 moved the full constraint model into v1.0.0.**


**§0a (distance to freeze), §1a–§1d (the scale numbers, the method that has found every gap, the nine things, the tooling traps), §2 (contract status), §3 (what exists and how it was verified) and §4 (the decision index) are `docs/CURRENT_STATE-reference.md`.** They are reference: read on lookup.
---

## §5 — Live priorities

**⚠ LIVE WORK ONLY.** Open, claimable work is `docs/BACKLOG.md`; the owner's open questions are
`open_rulings.md`; the narrative of finished work is `docs/PHASE_LOG.md`. Neither of the last two is a
task list.

### The freeze

**All reopened pre-freeze work is DONE (rows Ⓐ–Ⓕ + D66's contract half), nothing measured forecloses a
contract, and every subsequent entry has moved no frozen byte. ⇒ THE FREEZE (P5 step 6) IS THE OWNER'S
ACT.** It is mechanically available: `tests/freeze-boundary.test.ts` holds the frozen surface, so
freezing is the policy change *"the baseline may no longer be updated without an owner ruling"*, with a
machine holding the line afterwards.


**Per-seat standing facts, the two items killed by measurement, the later/post-freeze list, the CLOSED list, and §6/§6a (environment, commands, box discipline) are `docs/CURRENT_STATE-reference.md`.**
---

## §7 — Entry abstracts (newest, in full)

**⚠ THE FULL BODIES ARE IN `handoff/<seat>/`, ONE FILE EACH. Nothing was summarized away.** Older
entries are in `docs/PHASE_LOG.md` §C/§E with their body paths.

**The eight fields are MANDATORY and gate-enforced** (`tests/docs-budget.test.ts`). Write the abstract
first, then the body. **Open a full body only when an abstract line touches your task.**

**⚠ THE ROTATION RULE — a BYTE BUDGET, not a count.** `pnpm docs:check` fails when this file or §7
exceeds budget. When it does: move the oldest abstracts into `docs/PHASE_LOG.md`, **after checking their
durable lessons are already in §1–§5.** The bodies stay in `handoff/` forever. **Compaction is
maintenance and does NOT get an entry of its own.**

### STEWARD-x001-seven-seat-roster — the seven-seat roster adopted, and the two gaps adopting it opens — 2026-09-04 — seat: brahim

- **CHANGED:** `docs/seats/README.md` — **seven rows**, `mahjob` (manager) and `hamadi` (custodian) added,
  and a seat's `machine:` restated as an **autonomy class** (`box` unattended, `pc` attended) rather than a
  host. `AGENTS.md §0` (the roster it must agree with), §1's stale *"three shapes, one per role"*, §6's
  *"Five prompt files"*; `docs/CURRENT_STATE.md §0`'s Actors table and its two "five seats" sentences.
  `Mahjob_Prompt.md`/`Hamadi_Prompt.md` NEW, four standing facts each. `docs/BACKLOG.md` — **T-029, T-030
  NEW and `ready`; T-031 NEW and `blocked`**, plus one `## Discovered` row. **No `scripts/`, no
  `packages/`, no snapshot byte, no code** — `brahim` never builds.
- **VERIFIED:** `pnpm docs:check` **166 passed (8 files)** with the seven-seat table, so the roster change
  is inert against every gate reading it. `seats.mjs list` returns all seven rows — its header's claim that
  nothing hardcodes a seat name, measured rather than believed. **The `any` collapse, on the CLI:**
  `seats.mjs reviewer-for any` (no finishing seat) → **`hmdnah`**, a `box` reviewer picked by a hardcoded
  default and reported as an answer; `reviewer-for any amer` → `khalihlna`. **The collapse is in TWO
  functions, not the three ADR-0001 §0.1 ratified** — measured against `seats.mjs` blob `509b299`
  (`9b792e6`, 2026-08-31): `reviewerFor` declared `439`, collapse `449`/`450`; `builderFor` declared `514`,
  collapse `519`/`520`; **`reviewerForBranch` (`489`) has none** — its `500` is
  `const m = machineOf(root, fromSeat)`, a *seat's* machine, so never `any`. ⚠ ADR-0001's `403`/`454`/`471`
  and ADR-0002's `392`/`442`/`467` were accurate when written and have drifted; this entry's own first
  draft repeated the stale set, measured minutes before `agent-start.mjs`'s pull moved the file ~47 lines.
- **FOUND:** **Two defects, both measured, neither fixed here (`AGENTS.md §3`) — they are T-030.**
  **(a)** `agent-start.mjs:576` dies *"A steward does not review build work"* (exit 1, run here), so
  `docs/seats/README.md`'s new routing of `mahjob`/`hamadi` PRs to `brahim` cannot execute — Bunyan's copy
  of `diwan` ADR-0001 §0.1 defect 1, found there at mdo's `agent-start.sh:482`. **(b)**
  `agent-start.mjs:755`'s `/^\| (T-\d{3}) \| ready \|/gm` matches **0** ready rows where
  `seats.readyFor` matches **8**, because prettier pads the status cell — **the steward's entire readiness
  view has been silently empty**, printing its heading and no rows, which reads exactly like "nothing is
  ready". PR #19 fixed that same padded-table defect in `seats.mjs` and never swept it back into
  `agent-start.mjs`: invariant 7 caught in the script that enforces the protocol.
- **OWES:** The **next seat** — `T-029` and `T-030` are `ready` for the box builder; `T-029` carries its
  own pre-fix measurements so the claim starts from evidence. **`T-031` (`requires:`) is deliberately
  `blocked`** on `maitre_d_ouvrage`'s `T-106`, which is not a Bunyan row: ADR-0002 §5 orders Bunyan's port
  at step **E** after mdo's step **D** — *"the proven diff, ported — never simultaneously with D"* — and
  `T-106` is in flight now. `brahim` flips it when mdo's PR merges. ⚠ `unverified here: a mahjob or hamadi
  turn starts cleanly` — `identityGate` needs `narutousomaki741` and this session holds `davidian-abdo`;
  a `narutousomaki741` session to confirm. `diwan/scripts/roster-check.sh` was not run (`diwan` is not
  cloned here); the table was compared row by row against `diwan/docs/seats/README.md` read via `gh api`.
- **RISK:** additive — prose and backlog rows only; no declaration moved, no code, no snapshot byte.
- **FULL:** `handoff/brahim/2026-09-04-STEWARD-x001-seven-seat-roster.md`
- **REVIEW:** pending — `diwan` `CROSS.md` `X-001`'s Bunyan child.


## §8 — Generated


<!-- BEGIN GENERATED by scripts/state.mjs — `pnpm state`. Never hand-edit. -->

| | |
| --- | --- |
| **newest entry** | **STEWARD-x001-seven-seat-roster (brahim, 2026-09-04)** |
| branch · tip · tree | `brahim/2026-09-04-x001-seven-seat-roster` · `1be9f2b` · clean |
| open PRs | none — main is the tip of the work |
| suite | **987 green** · 100 files · 301 suites |
| protocol | 22 live ops · 2 reserved (of 24 declared) |
| shipped source | 6 `BimObjectType`s in `@bunyan/types` · 43 command ids in `commands.ts` · 1 `FormatCodec` |
| schema | `SCENE_SCHEMA_VERSION` 2 |
| **frozen surface** | **RISK: additive** — unchanged vs baseline |
| diff vs origin/main | 8 files changed, 689 insertions(+), 259 deletions(-) (8 files) |
| docs budget | current_state 78.5/96.0 KB · §7 25.4/32.0 KB · abstracts 9/10 · bodies 94 |

_Generated 2026-09-04 by `pnpm state`._

<!-- END GENERATED -->
