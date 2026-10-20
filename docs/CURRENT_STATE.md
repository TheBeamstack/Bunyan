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
| what the owner still owes a decision on | **`docs/OWNER-DECISIONS.md`** |
| how to review a PR | **`REVIEW.md`** |
| the GitHub-side controls (labels, credentials, runner) | **`docs/RUNBOOK.md`** |

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
every live branch is `git ls-remote --heads origin 'refs/heads/task/*'`, which diwan's
`scripts/agent_start.py` reads (each branch carries its own copy of this block) before deciding what a
builder may claim.

<!-- BEGIN BATON — written by agent_start.py; pushed before work begins -->

| Field | Value |
|---|---|
| seat | `hmdnah` |
| builder | `zayd` |
| role | reviewer |
| machine | box |
| task | `STEWARD-cache-requeue-table-edit` |
| branch | `steward/cache-requeue-table-edit` |
| claimed-at | 2026-10-20T02:45:32Z |
| status | reviewed by `hmdnah` — ready to merge |

<!-- END BATON -->

<!-- BEGIN BLOCKED — rendered from docs/BLOCKERS.md by blocked.py; a hand-edit fails `gates.py docs` (RULINGS.md R15) -->

## BLOCKED

- **B-20261011-06** — `scope: item` · `item: PR#65` — PR #65's merge refuses: its branch's Custodianship task id T-007 is read as Bunyan's T-007
  - need: make diwan `agent_merge.py` resolve a task id only from a branch or title in this repo's own namespace (not `custodianship/`), then re-run hmdnah's merge of PR #65
  - opened 2026-10-11T22:00Z by hmdnah · recorded in `docs/BLOCKERS.md`
- **B-20261012-03** — `scope: item` · `item: T-037` — the box loop cannot run the golden seeder, so every zayd turn is held on T-037
  - need: allow `uv run seed-goldens` in the box loop's session permissions, or run it on `task/T-037-q5-the-section-chord-tolerance-chosen-fo` and push `tests/goldens/`
  - opened 2026-10-12T07:19Z by brahim-loop · recorded in `docs/BLOCKERS.md`
- **B-20261019-01** — `scope: item` · `item: H-20261011-13` — secret scanning, push protection and Dependabot stay off on public Bunyan
  - need: enable Dependabot alerts, Dependabot security updates, secret scanning and push protection under TheBeamstack/Bunyan Settings → Code security
  - opened 2026-10-19T10:34Z by brahim-loop · recorded in `docs/BLOCKERS.md`
- **B-20261019-03** — `scope: item` · `item: PR#72` — PR #72's conflict fix cannot reach zayd: start refuses T-037 while B-20261012-03 holds it
  - need: perform B-20261012-03's `need:` and clear it, or make diwan `agent_start.py --continue` admit a flow-routed conflict merge on a blocker-held claim
  - opened 2026-10-19T16:04Z by brahim-loop · recorded in `docs/BLOCKERS.md`
- **B-20261019-04** — `scope: item` · `item: PR#88` — PR #88's step 2 proved one corrupt cache entry rebuilds its whole batch, so it is not merged
  - need: make `readRestoreBatch` re-read each root alone after a non-cap `readMany` throw (fix in `handoff/hmdnah/2026-10-19-T-049-review-step-2.md`) in a zayd turn on `task/T-049-a-cache-restore-reads-each-batch-of-root`, then route PR #88 to hmdnah for step 2
  - opened 2026-10-19T17:30Z by hmdnah · recorded in `docs/BLOCKERS.md`
- **B-20261019-05** — `scope: item` · `item: PR#88` — PR #88's returned fix cannot reach zayd: start refuses T-049 while B-20261019-04 holds it
  - need: make diwan `agent_start.py --continue` admit the seat a blocker's own `need:` routes to its item, then run B-20261019-04's zayd fix
  - opened 2026-10-19T17:31Z by brahim-loop · recorded in `docs/BLOCKERS.md`
- **B-20261020-01** — `scope: item` · `item: PR#89` — PR #89's step 2 proved a hostile cache index throws out of openCacheIndex, so the file does not open
  - need: make `openCacheIndex` return `undefined` when `verifyCacheIndex` throws (fix in `handoff/hmdnah/2026-10-20-T-043-review-step-2.md`) in a zayd turn on `task/T-043-d29-r5-the-cache-envelope-is-trusted-per`, then route PR #89 to hmdnah for step 2
  - opened 2026-10-20T02:08Z by hmdnah · recorded in `docs/BLOCKERS.md`
- **B-20261020-02** — `scope: item` · `item: PR#90` — PR #90's step 1 proved the CODE_ID chunk keeps its content-hash name after the stamp, so a stale codeId can be served
  - need: make the shipped `CODE_ID` unservable stale under an unchanged URL (fix shape in `handoff/hmdnah/2026-10-20-T-044-review-step-1.md`) in a zayd turn on `task/T-044-d29-r6-codeid-is-stamped-per-the-owner-a`, land the probe test, then route PR #90 to hmdnah for step 2
  - opened 2026-10-20T02:44Z by hmdnah · recorded in `docs/BLOCKERS.md`

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
`docs/OWNER-DECISIONS.md`; the narrative of finished work is `docs/PHASE_LOG.md`. Neither of the last two is a
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
- **FULL:** `handoff/archive/brahim/2026-09-04-STEWARD-x001-seven-seat-roster.md`
- **REVIEW:** pending — `diwan` `CROSS.md` `X-001`'s Bunyan child.


## §8 — Generated

<!-- BEGIN GENERATED by scripts/state.mjs — `pnpm state`. Never hand-edit. -->

| | |
| --- | --- |
| **newest entry** | **STEWARD-x001-seven-seat-roster (brahim, 2026-09-04)** |
| branch · tip · tree | `task/T-027-6-s-relink-cap-is-measured-not-guessed` · `d6666b0` · clean |
| open PRs | #65 custodianship/T-007-descriptions · #55 task/T-027-6-s-relink-cap-is-measured-not-guessed |
| suite | **910 green** · 100 files · 279 suites |
| protocol | 22 live ops · 2 reserved (of 24 declared) |
| shipped source | 6 `BimObjectType`s in `@bunyan/types` · 43 command ids in `commands.ts` · 1 `FormatCodec` |
| schema | `SCENE_SCHEMA_VERSION` 2 |
| **frozen surface** | **RISK: additive** — unchanged vs baseline |
| diff vs origin/main | 5 files changed, 83 insertions(+), 3 deletions(-) (5 files) |
| docs budget | current_state 13.1/96.0 KB · §7 4.6/32.0 KB · abstracts 1/10 · bodies 108 |

_Generated 2026-10-12 by `pnpm state`._

<!-- END GENERATED -->

last-verified-at: 12369ffb3680747910d3e83c5451794e783fe613
