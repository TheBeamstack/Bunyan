# BACKLOG

**What it is, and who reads it when.** The forward-planning artifact: every claimable unit of work, its
readiness and its sequence. Read by a builder or reviewer at claim time (diwan's `agent_start.py`), and
maintained by `brahim`, who owns readiness and sequencing (D82, `AGENTS.md §1.3`). Seats decide what
they take. `T-nnn` succeeds `Entry N` as the working unit; a steward turn carries no `T-nnn` and titles
its PR `STEWARD: …`.

## Task IDs

Flat, monotonic, **allocated once and never reused**: re-planning must never invalidate a branch name, a
PR title, or a `depends-on:`. Branch: `task/T-nnn-<slug>`.

## What makes a task READY

All of the below, or it is not ready and **must not be claimed**:

1. a stable id and a one-sentence outcome;
2. **`implements:`** naming the exact section(s) it builds against — a `docs/contracts/*.md` section, a
   `docs/design/*.md` document, or a `D`-number. Without it a claiming seat reads everything or guesses,
   and `AGENTS.md §2`'s three-tier reading rule cannot work;
3. an explicit **`verify:`** command a cold session can run;
4. a **`done-when:`** list that is checkable, not aspirational;
5. **`depends-on:`**, even when empty (`—`);
6. an **`area:`** — `kernel | document | apps-web | infra | design`. A reading-profile hint and a
   grouping key. **Not an identity and not a claim filter** — package ownership is a separate standing
   fact in `docs/seats/README.md`;
7. a **`machine:`** — `any | box | pc`, informational (below);
8. a **`risk:`** flag (`normal` | `high`), set at decomposition and **auto-`high`** when a task touches
   persistent naming (D1), the kernel identity cache (D29), the frozen surface, or `dependency.ts`'s
   invalidator. ⚠ `risk: high` buys a **two-step review** (D88, `REVIEW.md`); a mechanically-detected
   `RISK: contract-touching` buys the **owner's merge** (`AGENTS.md §5`). Either makes
   diwan's `agent_finish.py` write `NEXT TURN: REVIEW ONLY`, naming the resolved reviewer seat;
9. small enough to reach a green `pnpm verify` in one turn.

A task's `machine:` is informational; what it needs is `requires:`, probed on the machine running the
turn (`diwan/AGENTS.md §0`).

## Status values

Four, and `done` means **merged** — nothing earlier in the list does.

- **`blocked`** — waiting on `depends-on:` or a `docs/OWNER-DECISIONS.md` answer.
- **`ready`** — every READY criterion is met, nobody has claimed it, and every `depends-on:` id is `done`.
- **`review`** — the builder finished and its PR is open. `agent_finish.py` sets this; a builder
  finishing with no open `done-when:` item is refused unless the row already reads `review`.
- **`done`** — the PR **merged**. Only a reviewer's `agent_finish.py --review` (additive risk) or
  `brahim`'s readiness sweep (confirming via `gh pr list --state merged`) ever writes this.

**Why the extra state.** A dependency is satisfied by `done`, never by `review` — diwan's
`can_claim` refuses mechanically on this. Collapsing `review` into `done` at build-finish time would let a
dependent start against unreviewed work. Only a row naming the pending PR's task waits.

---

## Backlog

> **Row order is the sequence, not the id order.** diwan's `ready_for` takes the first
> `ready` row a machine can satisfy, so this table's order is how the steward sequences work.
>
> ⚠ **PRs #16 and #17 predated `T-nnn` and were closed 2026-08-15 by owner ruling** — too stale against
> `main` to rebase without re-litigating design choices `main` has moved past. Their work is
> re-decomposed as **T-018** and **T-019**, against current `main` rather than ported.
>
> `docs/CURRENT_STATE.md §5`'s "Later (post-freeze / v1.0.x)" list is deliberately not decomposed here —
> the freeze has not happened, and rows nobody may claim bury rows somebody must.
>
> A `done` row's `### T-nnn` entry is sealed in `docs/backlog-phase-01.md`.

| ID    | Status  | Task                                                                    | Area     | Machine | Risk   | Depends on |
| ----- | ------- | ----------------------------------------------------------------------- | -------- | ------- | ------ | ---------- |
| T-001 | done    | The perpendicular-foot snap candidate                                   | apps-web | pc      | normal | —          |
| T-002 | done    | The two-candidate-line intersection snap                                | apps-web | pc      | normal | T-001      |
| T-003 | done    | The in-app open-source licences screen                                  | apps-web | pc      | normal | —          |
| T-004 | done    | Does per-element build cost stay flat from 54 to 10,000?                | document | box     | normal | —          |
| T-006 | done    | D66 §3a/b — the keep-live set and a lazy first paint                    | apps-web | box     | normal | T-005      |
| T-007 | done    | Q17c — a dangling `designOptionId` becomes a broken ref                 | document | box     | normal | —          |
| T-008 | done    | Q19 — the belongs-to deletion reconciliation                            | document | box     | high   | —          |
| T-009 | done    | Q18 — a hosted void may only host on its host's base part               | document | box     | high   | —          |
| T-010 | review  | Q18 — two doors on one wall, confirmed in the browser                   | apps-web | box     | normal | T-009      |
| T-011 | done    | Q17a — `scene.designOptions` becomes a `SceneCollection`                | document | box     | high   | —          |
| T-012 | done    | `--review` routes a PR whose title carries no `T-nnn`                   | infra    | box     | high   | —          |
| T-013 | done    | The seat identity guard — `gh api user` must match the seat             | infra    | box     | high   | —          |
| T-014 | done    | `--review` must read the task's `risk:`, not only the surface           | infra    | box     | high   | —          |
| T-015 | done    | `agent-start.mjs --continue` returns a branch to its builder            | infra    | box     | high   | —          |
| T-016 | done    | `§0b`'s baton carries the builder separately from the holder            | infra    | box     | high   | T-015      |
| T-017 | done    | `docs-budget.test.ts`'s newest-first check verifies itself              | infra    | box     | normal | —          |
| T-018 | done    | D66's lazy-build design doc + measurement, reproduced                   | document | box     | normal | —          |
| T-019 | ready   | The move-tool gizmo + corner-drag, redone against `main`                | apps-web | box     | normal | —          |
| T-032 | ready | Agent edits through `window.bunyan` wait on the same document lock as human edits and lazy builds | frontend | box | normal | — |
| T-020 | done    | The pinned vitest cannot collect `tests/protocol/*` on Windows          | infra    | box     | high   | —          |
| T-021 | done    | `pnpm verify` reaches green on the pc, confirmed there                  | infra    | pc      | normal | T-020      |
| T-024 | done    | `_baselinedAtEntry` names a position, so a cross-day §7 append goes red | infra    | box     | high   | —          |
| T-022 | done    | `kernel-occt`'s glue decodes from growable WASM memory                  | kernel   | box     | high   | —          |
| T-023 | ready   | The kernel boots on the pc's system Chrome, confirmed there             | apps-web | pc      | normal | T-022      |
| T-005 | done    | D66 §3c — force-on-measure, and whether `save` reads built              | document | box     | normal | T-018      |
| T-026 | blocked | The identity gate fires at approve/merge, not only at claim             | infra    | box     | high   | —          |
| T-025 | blocked | `--review` keeps an owner-gated row at `review`                         | infra    | box     | high   | —          |
| T-028 | blocked | `agent-finish.mjs` is resumable after an interrupted run                | infra    | box     | normal | —          |
| T-027 | ready   | §6's relink cap is measured, not guessed                                | infra    | box     | normal | —          |
| T-029 | blocked | `seats.mjs` collapses `machine: any` to `box` in two functions          | infra    | box     | high   | —          |
| T-030 | blocked | A steward cannot review, and its readiness view lists nothing           | infra    | box     | high   | —          |
| T-031 | blocked | `requires:` supersedes a task's `machine:`                              | infra    | box     | high   | T-029      |

---

### T-006 — D66 §3a/b — the keep-live set and a lazy first paint

- implements: `docs/design/P5_step9_D66_lazy_build_design.md` §3a (the keep-live set) · §3b (first paint
  = `rebuildOnly(visible)`)
- verify: `pnpm verify`
- done-when:
  - the keep-live set is computed from camera/selection/viewport and is **never persisted** — ⚠
    persisting it violates recipe-is-truth exactly as persisting a mesh would (`AGENTS.md §4.1`);
  - first paint calls `rebuildOnly(visible)`, ordered by container: the camera's level, then outward;
  - **no new API, and no frozen byte moves** — `rebuildOnly` already ships and `releaseShape` is frozen;
  - the first-paint improvement is measured **in the real browser**, on this machine, and reported as a
    number against T-018's deferrable-fraction figure;
  - ⚠ eviction is **not** built here — §3d rules it unnecessary at the measured 0.31 GB heap
    (_"build lazily; evict later, or never"_).
- depends-on: T-005
- requires: browser
- area: apps-web · machine: **box** · risk: **normal**

### T-010 — Q18 — two doors on one wall, confirmed in the browser

- implements: `open_rulings.md` **Q18** · T-009's document-layer rule
- verify: `pnpm verify`, plus the gesture in the real browser
- done-when:
  - click 1 and **click 2** on the same wall both come back `state: 'valid'` with `parts: [leaf, frame]`;
  - console-error-free boot;
  - ⚠ measured in a real browser on the machine running the turn (`requires: browser`).
- depends-on: T-009
- requires: browser
- area: apps-web · machine: **box** · risk: **normal**

> ⚠ Split from T-009 because the rule is headless and the gesture needs a browser (`requires: browser`);
> one row would let a seat with no browser tick a criterion it cannot run.

### T-019 — The move-tool gizmo + corner-drag, redone against `main`

Baseline-endpoint handles and single-corner drag (D80's move verbs, `unbuildable`-checked and
`transactionId`-atomic) shipped on closed PR #17 (9 commits stale, conflicts with the prompt-sync removal
D82 made). `docs/CURRENT_STATE.md §5` (Amer, item 3) still names this open.

- implements: `docs/decisions.md` D80 · `docs/design/P4.5_interaction_model_design.md` ·
  `docs/CURRENT_STATE.md §5` (Amer, item 3)
- verify: `pnpm verify` (headless half) + a browser run (the gesture, undo, orbit-suppression)
- done-when:
  - `baselineHandles` mints one handle per authored endpoint of the selection, pure (projection injected,
    asserted headlessly);
  - a corner-drag matches peers by the **full authored position, not a 2D coincidence** — two stacked
    walls sharing an x/y at different `containerId`s must not move together, a named regression case (the
    closed PR's own two-out-of-three-coordinates defect);
  - both endpoints move under **one `transactionId`**, one undo;
  - `brokenRefs()`/`unbuildable()` stay empty through drag, drop and undo;
  - browser-measured: `changeFeed()` growth during a drag is zero (no kernel call mid-gesture); a fixed
    world point's screen projection is byte-identical before/during/after (orbit suppression);
  - ⚠ **out of scope, named so it is not assumed shipped:** whole-element drag (`dragPlans()` + `dryRun`
    probe-and-route) is not wired to any gesture here — a later task.
- depends-on: —
- requires: browser
- area: apps-web · machine: **box** · risk: **normal**

### T-032 — Agent edits through `window.bunyan` wait on the same document lock as human edits and lazy builds
- outcome: `withUiRefresh` takes the `DocLock` and runs `execute`, `undo`, `redo` and `dryRun` through `lock.run`, so an agent call cannot commit or free the kernel heap while `buildKeepLive` or a human edit is in flight; `options` forwarding is unchanged
- implements: `docs/decisions.md` D66 · `docs/design/P5_step9_D66_lazy_build_design.md` §2 (the safety condition) and §3b · D19–D23 (D19, surface equivalence) · provenance: `## Discovered` 2026-10-08 (T-006)
- done-when: in `apps/web/src/edit/agentRefresh.test.ts`, with a lock task held open, the wrapped `execute`, `undo`, `redo` and `dryRun` do not call the inner agent until it settles — test-first, red against current `main`
- done-when: lock tasks and agent calls run in call order, and a rejected agent call does not jam the lock for the next task
- done-when: the existing `options`/`transactionId` forwarding test stays green and `notify` still fires only after a successful commit
- done-when: `App.tsx` passes its `docLock` into `withUiRefresh` (one line, checked by the reviewer — not reachable headlessly)
- verify: pnpm verify
- depends-on: — · area: frontend · machine: box · risk: normal
- note: diagnosed headless-only by a brahim R39 subagent, 2026-10-11: no browser needed, no `[frozen_surface]` file touched

### T-023 — The kernel boots on the pc's system Chrome, confirmed there

- implements: T-022's fix
- verify: a browser run on the pc
- done-when:
  - the app boots on that machine's system Chrome (151.x) with **no `BUNYAN_BROWSER_CMD` override**, and
    the `TextDecoder` error is gone by name;
  - console-error-free boot;
  - revert-verified: the pre-fix artifact still hangs on the same browser;
  - ⚠ **the workaround is removed once the fix is proven** — the persistent `BUNYAN_BROWSER_CMD` pinning
    Chromium 148 is unset and the removal recorded, so it cannot outlive what it works around.
- depends-on: T-022
- area: apps-web · machine: **pc** · risk: **normal**

### T-026 — The identity gate fires at approve/merge, not only at claim

D87's check lives in `agent-start.mjs`, but a reviewer approves and merges _after_ `agent-finish.mjs` has
returned, so any session reaching the merge without a fresh claim acts under whatever account `gh`
resolves to. `agent-finish --review` compounds it by writing the verdict as accomplished fact.

- implements: this file's `## Discovered` entry of 2026-08-21 (the identity gate guards the CLAIM) ·
  `scripts/agent-start.mjs`'s `identityGate` · `docs/RUNBOOK.md` §"Seat credentials" (D87) · `AGENTS.md §6`
- verify: `pnpm verify`
- done-when:
  - the identity gate is callable independently of a claim, and runs before any `gh pr review` or
    `gh pr merge` the harness prints or performs;
  - `agent-finish --review` states its verdict as **owed** rather than performed — no abstract or PR text
    asserts an approval or a merge that has not happened;
  - revert-verified: a seat whose resolved `gh` login is the PR's own author is refused, and the refusal
    names the account mismatch rather than failing generically;
  - ⚠ **the gate is added, not moved** — `agent-start.mjs`'s existing claim-time check keeps its behaviour.
- depends-on: —
- area: infra · machine: **box** · risk: **high**
- note: `blocked` 2026-10-08 (steward): superseded, not done (nothing merged for it). It fixes the node
  turn engine (`scripts/agent-*.mjs`, `scripts/seats.mjs`), retired on the owner's answer to D-20261006-01 and
  deleted by `STEWARD: retire the node turn engine`; the live start/finish are diwan's `agent_start.py`/
  `agent_finish.py`.

> `risk: high` — it is the crossed-account rule, which `AGENTS.md §6` says is not optional twice. Measured
> on PR #39: the box default resolved to the PR's author and only the seat's own reading of `AGENTS.md`
> stopped the merge.

### T-025 — `--review` keeps an owner-gated row at `review`

`seats.reviewFlipsToDone` reads `contractTouching` from §8's frozen-surface row alone, so a PR carrying
any other `needs-operator/*` class is stamped `done` and handed a `gh pr merge` command while the owner
has not merged. `done` is what satisfies a `depends-on:`, so this releases dependents on an unmerged PR.

- implements: this file's `## Discovered` entry of 2026-08-19 and its 2026-08-20 amendment
  (`agent-finish.mjs --review` stamps the row `done`) · `scripts/seats.mjs`'s `reviewFlipsToDone` · `scripts/reserved-classes.mjs` ·
  `AGENTS.md §5`
- verify: `pnpm verify`
- done-when:
  - `--review` resolves the reserved classes through `reserved-classes.mjs`, not §8's frozen-surface row,
    and keeps the row `review` when **any** of `AGENTS.md §5`'s three classes applies;
  - the printed next step names the owner's merge for all three, never `gh pr merge`;
  - revert-verified: a fixture PR carrying `needs-operator/freeze` at `RISK: additive` goes red without
    the fix;
  - ⚠ **this widens the class set; it does not re-decide the additive case**, which keeps merging on the
    reviewer's own account.
- depends-on: —
- area: infra · machine: **box** · risk: **high**
- note: `blocked` 2026-10-08 (steward): superseded, not done (nothing merged for it). It fixes the node
  turn engine (`scripts/agent-*.mjs`, `scripts/seats.mjs`), retired on the owner's answer to D-20261006-01 and
  deleted by `STEWARD: retire the node turn engine`; the live start/finish are diwan's `agent_start.py`/
  `agent_finish.py`.

> `risk: high` — it decides whether an owner-gated row is released to its dependents. Fired twice on PR
> #38, caught by hand both times.

### T-028 — `agent-finish.mjs` is resumable after an interrupted run

A finish interrupted during its multi-minute `pnpm verify` leaves work committed-but-unpushed or written
-but-uncommitted, and `agent-start.mjs` then refuses at its own `git checkout main`, so recovery needs a
hand-directed session that knows what the previous one was doing.

- implements: this file's `## Discovered` entry of 2026-08-23 · `scripts/agent-finish.mjs` steps 1–5 ·
  `scripts/agent-start.mjs`'s dirty-tree path · `AGENTS.md §1.1`
- verify: `pnpm verify`
- done-when:
  - re-running `agent-finish.mjs` after an interrupted run completes the turn rather than starting over
    or refusing, and is safe to run twice;
  - `agent-start.mjs` names an interrupted finish as such when it finds one, instead of failing at the
    pull with a message about resolving by hand;
  - revert-verified: a fixture whose finish is killed mid-`verify` is reproducibly recovered by re-running
    it, and is not recovered without the fix;
  - ⚠ **no `done-when:` item here claims a fix for the session ending** — this makes the interruption
    recoverable, not impossible.
- depends-on: —
- area: infra · machine: **box** · risk: **normal**
- note: `blocked` 2026-10-08 (steward): superseded, not done (nothing merged for it). It fixes the node
  turn engine (`scripts/agent-*.mjs`, `scripts/seats.mjs`), retired on the owner's answer to D-20261006-01 and
  deleted by `STEWARD: retire the node turn engine`; the live start/finish are diwan's `agent_start.py`/
  `agent_finish.py`.

### T-027 — §6's relink cap is measured, not guessed

`docs/CURRENT_STATE.md §6`'s relink recipe caps the container at `--memory=2g`; the link fits in 1 GB, and the
overstatement cost a box seat a verification it had to record as undischarged.

- implements: this file's `## Discovered` entry of 2026-08-21 (§6's relink recipe) · `docs/CURRENT_STATE.md §6` ·
  `docs/CURRENT_STATE.md §6a` (box discipline) · `AGENTS.md §4-11`
- verify: `pnpm verify`
- done-when:
  - §6's recipe carries the measured cap, stated with the measurement behind it, so the next seat can tell
    a measurement from a guess;
  - ⚠ **no relink is required to close this** — T-022's step-2 abstract carries the figure (78 s, exit 0,
    output byte-identical to the committed pair); re-running it is optional and box-discipline-gated.
- depends-on: —
- area: infra · machine: **box** · risk: **normal**

### T-029 — `seats.mjs` collapses `machine: any` to `box` in two functions

`reviewerFor` and `builderFor` resolve a `machine: any` task by silently defaulting to `box` when no
finishing seat is passed, so an `any` task run on the pc routes its review to `hmdnah` and its branch
ownership to `zayd` — a machine nothing on the task proves the work ran on. **Two functions, not the three
ADR-0001 §0.1 ratified**; `reviewerForBranch` has no `any` branch of its own (see `done-when`).

- implements: `TheBeamstack/diwan` `docs/adr/0001-seven-seat-architecture.md` §0.1 defect 3 (ratified
  2026-09-01) · §3.2's ratified "a seat's `machine:` is never `any`" · `docs/seats/README.md`
- verify: `pnpm verify`
- ⚠ **re-measure the line numbers before you start.** Pinned to `seats.mjs` blob `509b299` (`9b792e6`,
  2026-08-31): `reviewerFor` declared `439`, collapse `449`/`450`; `builderFor` declared `514`, collapse
  `519`/`520`; `reviewerForBranch` declared `489`, **no `any` branch**. These numbers have already moved
  twice under people who cited them. **A bare line number is a claim with a shelf life** — `grep -n`,
  then cite the blob you measured.
- done-when:
  - **measured before the fix**: `reviewerFor(root,'any')` and `builderFor(root,'<any task>')` with no
    finishing seat each return the `box` seat, and the returned value carries nothing saying it was a
    default — paste both outputs;
  - an `any` task with no finishing seat no longer resolves to a machine: the caller is told the machine is
    unresolved, in the shape `reviewerForBranch` already uses for an unroutable branch
    (`seat: null` plus a `reason`), never by picking one;
  - `reviewerForBranch` is checked rather than assumed — its `m` comes from a **seat's** machine and is
    therefore never `any`, so state in the diff whether it needed a change at all;
  - `readRegistry` refuses a seat row whose machine is not `box` or `pc`, naming the row — the Bunyan half
    of ADR-0001 §0.1 defect 2 (`seat.sh` never validates a seat's own machine);
  - `tests/protocol/seats.test.ts` covers each, and its fixture registry gains the two seats
    `docs/seats/README.md` now carries so the fixture stops describing a roster that no longer exists;
  - ⚠ **two existing tests currently bless the defect and must be rewritten, not deleted** —
    `seats.test.ts`'s _"`machine: any` resolves to the builder sharing the FINISHING seat's machine, **else
    box**"_ asserts the hardcoded default as intended behaviour, and `agent-start.test.ts`'s _"a
    `machine: any` task admits the caller's OWN builder, never a hardcoded box default"_ covers only the
    case where a finishing seat **is** given, so it passes while its own title is false for the case that
    matters (`REVIEW.md` §6);
  - ⚠ **no `requires:` parsing** — that is T-031, and ADR-0002 §5 orders it after `maitre_d_ouvrage`.
- depends-on: —
- area: infra · machine: **box** · risk: **high**
- note: `blocked` 2026-10-08 (steward): superseded, not done (nothing merged for it). It fixes the node
  turn engine (`scripts/agent-*.mjs`, `scripts/seats.mjs`), retired on the owner's answer to D-20261006-02 and
  deleted by `STEWARD: retire the node turn engine`; the live start/finish are diwan's `agent_start.py`/
  `agent_finish.py`.

### T-030 — A steward cannot review, and its readiness view lists nothing

Two defects in `scripts/agent-start.mjs`, both measured 2026-09-04, both consequences of prose that already
ships. `:576` dies with _"A steward does not review build work"_ for any `--review` by a steward — but
`docs/seats/README.md` now routes `mahjob`'s and `hamadi`'s PRs to `brahim`, and that routing cannot
execute. `:755`'s `/^\| (T-\d{3}) \| ready \|/gm` matches **0** of the 8 ready rows, because prettier pads
the status cell (`| ready  |`, two spaces) — so the steward's whole readiness view is silently empty. That
is the defect PR #19 fixed in `seats.mjs` and did not sweep back into `agent-start.mjs` (`AGENTS.md §4-7`).

- implements: `TheBeamstack/diwan` `docs/adr/0001-seven-seat-architecture.md` §0.1 defect 1 (the same
  refusal, found in `maitre_d_ouvrage`'s `agent-start.sh:482`) · `docs/seats/README.md` · `AGENTS.md §4-7`
- verify: `pnpm verify`
- done-when:
  - **measured before the fix, both pasted**: `node -e` over the committed `docs/BACKLOG.md` showing
    `:755`'s regex returning **0** while `seats.readyFor`'s returns every `ready` row in the same file
    (8 when this row was written, and the count moves); and `--seat brahim --review` dying;
  - a steward may take the review limb for a `manager` or `custodian` PR **and for nothing else** — the
    `T-028` reasoning behind the original refusal is preserved for builder work, not deleted;
  - the ready-row regex tolerates the padding the committed table actually has, asserted against a
    **padded** fixture — `tests/protocol/fixture.mjs` already pads for exactly this reason;
  - both are covered in `tests/protocol/agent-start.test.ts`.
- depends-on: —
- area: infra · machine: **box** · risk: **high**
- note: `blocked` 2026-10-08 (steward): superseded, not done (nothing merged for it). It fixes the node
  turn engine (`scripts/agent-*.mjs`, `scripts/seats.mjs`), retired on the owner's answer to D-20261006-01 and
  deleted by `STEWARD: retire the node turn engine`; the live start/finish are diwan's `agent_start.py`/
  `agent_finish.py`.

### T-031 — `requires:` supersedes a task's `machine:`

A task declares the capabilities it needs and each is probed at turn start; a seat lacking one refuses the
turn and **leaves the task claimable**, never re-routing it. A task's `machine:` is retained as
informational provenance.

- implements: `TheBeamstack/diwan` `docs/adr/0002-two-box-topology-and-the-capability-model.md` §2.1, §2.3
  and §5 step E · `CROSS.md` `X-001`
- verify: `pnpm verify`
- done-when:
  - `docs/BACKLOG.md`'s grammar carries `requires:`, every row has one, and `machine:` is documented as
    provenance;
  - `canClaim` probes each declared capability instead of comparing the seat's machine to the task's;
  - a refused turn prints what was asked for, what was found, and that the row stays `ready` (§2.3);
  - review routing is **unchanged** — role + account crossing, never capability (§2.3);
  - the whole thing lands as **one** PR, after a builder turn and never mid-turn.
- depends-on: T-029 · ⚠ **and `maitre_d_ouvrage`'s `T-106`, which is not a Bunyan row.** ADR-0002 §5 orders
  Bunyan's port at step **E**, after mdo's step **D**, and says explicitly "the proven diff, ported — never
  simultaneously with D". `T-106` is in flight now; porting a mechanism whose shape is not yet proven is
  what this row is blocked on. `brahim` flips it to `ready` when mdo's PR has merged.
- area: infra · machine: **box** · risk: **high**
- note: `blocked` 2026-10-08 (steward): superseded, not done (nothing merged for it). `requires:` is
  diwan's job, in `scripts/protocol.py` (owner, 2026-10-08), not a port into this repo; T-029, which it
  depends on, fixed `scripts/seats.mjs`, deleted with the node turn engine.

## Discovered

_(unplanned findings; never claimed in the same turn that found them, per `AGENTS.md §3`. Each line: the
finding, the fix shape where one is known, and its disposition.)_

**A finding becomes a task through a mechanism, not by hand** (R12): the steward runs
`$DIWAN/scripts/backlog.py add --after T-nnn …`, which allocates the id and refuses a row missing any
READY field, then deletes the finding. The provenance travels in `implements:`, as the rows below already do.

- **2026-10-08 — a deferred element's broken `hostRef` surfaces only once it is built** (T-006). The
  keep-live set keeps an unregistered Type and a missing host live, both decidable from the recipe; a
  `hostRef` naming a face the host no longer has is measured by the build, so an out-of-view one is
  absent from the Problems panel until the camera reaches it (domain rule 3). Recorded, not claimed.
- **2026-10-08 — T-006 makes D-20261007-11 (Q23) reachable from the app.** An opened file now boots
  with only the keep-live set built, so `agent.query({discipline})` drops deferred elements in the
  shipped app, not only in a test. Recorded for the owner's answer; not claimed.

- **2026-09-04 — a GitHub Actions job's `runner_name` reads `""` even after it completes successfully**,
  so it is not evidence that nothing picked the job up. PR #47's run 33877624825 sat `queued` 55.6 min
  while the runner reported `online busy=false`; two readers diagnosed a wedged listener. It was queue
  latency. A null read as a negative (§1c-7). **The only sound liveness check is whether a job eventually
  starts.** Recorded, not claimed.
- **2026-09-04 — the single-runner queue delay is measured on two repos and Bunyan is the worse.** 55.6
  min of queue for ~11 min of work here, against `maitre_d_ouvrage`'s 39 min for 23 min. One VM
  serialising every job. Evidence for `OWNER-ACTIONS.md` **OA-008**. ⚠ Not a Bunyan work item — the
  runner is `mahjob`'s, and ADR-0002 §2.10 puts this VM on the deletion path once Bunyan goes public.
- **2026-09-04 — `REVIEW.md`'s "GitHub itself refuses the Entry 74 self-merge" is false, and
  `.github/workflows/ci.yml:91` names a test that does not exist.** GitHub refuses an approval from the
  PR's own author, not the _merge_, which is what Entry 74 did; what refuses it here is
  `agent-start.mjs`'s `identityGate` (T-013). ci.yml's comment describes `tests/prompt-sync.test.ts`,
  which no longer exists, so `HEAD_REF` is set for a gate that no longer runs. `diwan` ADR-0001 §8 names
  the `REVIEW.md` correction as Bunyan's; not part of `X-001`. Recorded, not claimed.
- **2026-08-30 — the re-seed gate's `Re-seed-unchanged:` trailer has no effect when zero goldens were
  touched.** A comment-only header on a `GEOMETRY_PATHS` file trips `check-reseed.mjs`'s FIRST branch
  (`touchedGoldens.length === 0` ⇒ exit 1, no trailer read); the trailer is consulted only in the SECOND.
  A genuinely no-op change to a watched path has no sanctioned way to pass short of running the seeder.
  Worked around for D90 by excluding the 14 affected files. Fix shape: a third branch — or the design may
  be intentional. Found by `khalihlna` on PR #44. Recorded, not claimed.
- **2026-08-23 — two real pc-only defects found and fixed (not the em-dash T-020 blamed).** **(1) A
  leading shebang collides with Vite's SSR import-hoist** — the hoisted-imports line is spliced with
  `…;#!/usr/bin/env node` on one line, a bare `#` mid-statement, which V8 reports as a position-less
  "Invalid or unexpected token". All five failing `tests/protocol/*` files import a shebang script; the
  two passing ones do not; CRLF and the em-dash are present in all of them and are not the cause. None of
  the six scripts is git-executable and every invocation is `node scripts/x.mjs` — shebangs removed.
  **(2) The fake-`gh` test stand-in cannot run on Windows at all**, by two independent mechanisms: a
  `chmod`-ed bash script is never interpreted by `CreateProcess`, the `PATH` join used a literal `:`, and
  since CVE-2024-27980 `execFileSync` will not spawn a `.bat`/`.cmd` without `shell: true`. Fixed by
  `seats.mjs`'s `ghSpawn` (honouring `BUNYAN_GH_CMD`) plus a plain `.cjs` stand-in spawned as
  `[process.execPath, scriptPath]`. `agent-start.test.ts`: 13 failures → 4. **What is left is resource
  contention, not correctness** — the remaining failures are timeouts under full-suite concurrency, plus
  one bare `execFileSync('node', …)` PATH-search failure of defect 2's shape at a different call site.
  Found and fixed by `light_brahim` continuing `amer`'s T-001 turn.
- **2026-08-23 — an interrupted `agent-finish.mjs` strands the turn, and nothing recovers it.** The
  multi-minute `pnpm verify` leaves the branch committed-but-unpushed or written-but-uncommitted, after
  which `agent-start.mjs` refuses at its own `git checkout main` reporting only "pull failed — resolve by
  hand". Three turns in one batch (T-024 step 2, T-022 steps 1 and 2), each needing a hand-directed
  session. Running the finish detached (`nohup`) worked every time, but that is a workaround. **⇒ T-028.**
- **2026-08-22 — `ModelElement.hasParts` cannot be read without `state`, and nothing enforces that.** A
  `stale` element carries `hasParts: false` for the same reason a pure void does, so the field alone
  cannot separate _nothing to measure_ from _not measured yet_. Unreachable today because all five
  consumers test `state !== 'valid'` first — a convention, which §1c-8 calls a dirty rule that has not
  happened yet. Fix shape: make the field tri-state, or gate it in the enumeration's own test. Recorded,
  not claimed.
- **2026-08-22 — FORCE is whole-model where only the composite parents need it.** The only population the
  enumeration loses is a deferred parent's D59 children, so a schedule filtered to `core.wall` could
  build only the Types declaring `buildChildren`. Pure optimisation, no correctness content, unmeasured
  at the 10 000-element target. Recorded, not claimed.
- **2026-08-21 — the seat identity gate guards the CLAIM, and the merge happens outside it.** A reviewer
  approves and merges after `agent-finish.mjs` has returned, so a session reaching the merge without a
  fresh claim is unguarded; measured on PR #39, where the box `gh` default resolved to the PR's own
  author and only the seat reading `AGENTS.md §6` stopped it. `gh pr merge` would have succeeded — the
  self-approval refusal does not extend to merge. Compounding it, `--review` writes the verdict as
  accomplished fact (PR #39 said "APPROVED, and merged by me" with **zero** reviews). **⇒ T-026.**
- **2026-08-21 — `docs/CURRENT_STATE.md §6`'s relink recipe caps memory at `--memory=2g`, and the link
  fits in 1 GB** — 78 s, exit 0, output byte-identical to the committed pair under a hard 1 GB cgroup cap
  with swap off. The overstatement cost step 1 of the same PR its relink, recorded as an `unverified
here:`. **⇒ T-027.**
- **2026-08-21 — the shipped kernel glue now has a patch step, so relinking means running `link.sh`.**
  T-022 added `tools/kernel-build/postlink.mjs`; `em++` invoked by hand emits unpatched glue and
  reintroduces the growable-memory decode. §6's recipe already runs `link.sh`. Recorded, not claimed.
- **2026-08-21 — `frozen-surface.mjs`'s legacy half documents a skip that can no longer happen.** T-024
  pointed `abstracts` at `recordedAbstracts`, so the legacy set never empties (13 legacy headings in the
  record against 0 in §7), making the `:315` bound always live and `:252`'s "SKIPS once it rotates" false.
  Two edges follow: `:327` reports a disagreement as "in §7" for an entry resolved outside it, and
  `newestLegacy` is 88 while entries 89 and 90 carry no `### N |` heading. Unreachable through the
  writer. Recorded, not claimed.
- **2026-08-21 — `docs-budget.test.ts`'s collision gate asserts a tautology in its second half.** `key`
  _is_ `<id> — <date> — <seat>`, so grouping by it partitions by exactly those three fields and the three
  `size === 1` checks cannot fail; they would bite only on a legacy collision, of which there are 0. The
  half that measures, `collisions.length > 0`, is sound. Recorded, not claimed.
- **2026-08-21 — every count and line number written into `## Discovered` prose rots, and one row's has
  twice.** The uniqueness row's collision count moved 5 → 6 of 51 across 56 → 58 headings, and its line
  numbers for the T-015 duplicate moved twice. The code is immune because the tests measure; the prose is
  not. **⇒ Cite a heading, never a line number, and date any count.**
- **2026-08-21 — `frozen-surface.d.mts:44`'s "never the §7 parse alone" is overstated.**
  `state-risk-e2e.test.ts` passes the §7 parse alone, legitimately, on fixtures carrying no
  `docs/PHASE_LOG.md` where `recordedAbstracts` throws by design. A doc line, not a defect.
- **2026-08-19 — an abstract's stable key `<id> — <date> — <seat>` is not unique, and §7 is not the scope
  that decides.** Measured over §7 **plus `docs/PHASE_LOG.md`** — the population invariant 10 makes
  permanent. The generator is **any two turns by one seat on one task on one day**, with two live routes:
  D88's two review steps, and `--continue` returning a defect to its builder. T-024's fix does not depend
  on uniqueness: the date is in the key, so a reference resolves to a turn-PAIR carrying one date, which
  is the half `baselineEntryIssues` reads. **No uniqueness gate:** at §7 scope it would be green on most
  days and red on a _correct_ turn. Fix shape, if ever worth one: a step marker in the heading, which is
  a §7 schema change. Recorded, not claimed.
- **2026-08-19 — `docs/PHASE_LOG.md` §E holds `T-015 — review: the fix holds… — 2026-08-16 — seat:
hmdnah` TWICE** — same heading, same `FULL:` path, bodies differing only in the `REVIEW:` wording: a
  rotation that copied instead of moving, across two compactions. Invariant 10 makes the archive
  append-only, so it is not `zayd`'s to edit. It is the one colliding key in the record that is **not** a
  turn-pair, and it is why the collision gate asserts one task/seat/day rather than distinct headlines.
- **2026-08-19 — `reserved-classes.mjs` classes ANY diff to `tests/frozen-surface.snapshot.json` as
  `freeze`, including a metadata-only one.** T-024's own PR moved `_baselinedAtEntry` and 0 of 214
  declarations, so `state.mjs` returned `RISK: additive` while CI labelled it `needs-operator/freeze`.
  Third occurrence of the same cry-wolf shape, and the one the `_README` policy makes load-bearing after
  the freeze. Fix shape: class `freeze` on a `surface` diff and report an audit-field-only edit as a
  separate, non-gating class. Recorded, not claimed.
- **2026-08-19 — `agent-finish.mjs --review` stamps the backlog row `done` on an owner-gated PR.**
  `reviewFlipsToDone` reads `contractTouching` from §8's frozen-surface row, so `('high', 2, false)` is
  `true` on a PR carrying `needs-operator/freeze`: measured on PR #38, which wrote `T-024 → done` while
  the owner had not merged. `done` is what satisfies a `depends-on:`, so this releases dependents on an
  unmerged PR. `AGENTS.md §5` names three owner-gated classes; `reviewFlipsToDone` knows only one. ⚠
  **Fired a second time 2026-08-20** on the step-2 re-run; row reset by hand both times. **⇒ T-025.**
- **2026-08-19 — the stable key is not the identity `agent-finish.mjs` uses, and T-024 did not sweep it.**
  `agent-finish.mjs:280`'s handoff gate stays on `find(a => a.id === task && a.seat === seat)` — a subset
  of the key, and exactly the tuple whose collisions the same PR records; that is why a D88 step 2 passes
  on step 1's abstract. Two smaller sites: the seven `docs-budget` messages moved `.n` → `.id`, the one
  field that is never unique; and `isSyntheticEntryNumber` guards `(990, 1000]` while a turn appends
  before rotating, so §7's transient 11th index mints `990` and is reported as a legacy number. Recorded,
  not claimed.
- **2026-08-19 — `--review --step 2` accepts step 1's abstract and body as step 2's handoff artifacts,
  and prints the merge commands.** Its gate checks only that _some_ §7 abstract names the task and seat,
  and step 1 has already written one. Every prior step 2 wrote its own by hand — convention, not gate.
  Fix shape: key the gate on the step. Recorded, not claimed.
- **2026-08-19 — T-024 has cost a real turn its §7 abstract.** Step 2 of PR #37 could not append an
  abstract dated 2026-08-19 at all: `_baselinedAtEntry` is the positional key `1000`, so its date
  disagreed with `_baselinedAt`, reddening `freeze-boundary` having moved no declaration. The only
  alternatives were falsifying the date or an owner-gated re-baseline, so the abstract went straight into
  `docs/PHASE_LOG.md` §E and §7 carries none for that turn (body
  `handoff/hmdnah/2026-08-19-T-020-review-step2.md`). Recorded against **T-024**.
- **2026-08-18 — `--review` prints `gh pr merge` on an owner-gated PR**, because it reads `pnpm state`'s
  risk verdict and not `reserved-classes.mjs`'s class; the two disagree by construction on a re-baseline.
  Only `REVIEW.md` item 7's ⚠ stands between the printed command and a seat merging an owner-gated PR —
  an instruction where T-014 established a gate belongs. Fix shape: suppress the merge commands whenever
  a reserved class is present. Recorded, not claimed.
- **2026-08-18 — every merge lands a branch-shaped `§8` on `main`, so the next builder's
  `agent-start.mjs` measures a disagreement and refuses.** `§8` is regenerated on the task branch, where
  its `branch · tip · tree`, `open PRs` and `diff vs origin/main` rows describe that branch; the merge
  commits them verbatim onto `main`, where they are false. Worked around twice by a bare `pnpm state`
  regen of `main`. The refusal is correct; what is wrong is that a clean merge guarantees the
  disagreement. Fix shape: the reviewer's `--review` regenerates `§8` from `main` after merging, or the
  branch-scoped rows leave the committed `§8` altogether. Recorded, not claimed.
- **2026-08-17 — the pc's system Chrome (151) cannot boot the OCCT kernel** — `Failed to execute 'decode'
on 'TextDecoder': The provided ArrayBuffer value must not be resizable`, from `kernel-occt`'s boot
  path, pre-existing on unmodified `main`. A/B: 145 and 148 boot, 151 does not ⇒ the window is Chrome
  149–151. ⚠ **Worked around, not fixed**: `BUNYAN_BROWSER_CMD` is a persistent Windows user env var
  pinned to cached Chromium 148. The real fix is **T-022**, confirmed by **T-023**.
- **2026-08-17 — ⚠⚠ wall joins are not level-scoped, so stacking an ordinary building's storeys drops the
  miter on the storey below.** `partnersAt`/`throughWallsAt` match baselines in 2D and index every
  element with a baseline; neither consults `containerId`, the level's elevation, or the wall's datums.
  Measured: one storey with a 90° corner gives `resolveJoins(a) = ['start']` and `min.x = -100 mm`;
  authoring the same corner one level up takes the lower wall to `[]` and `min.x = 0` — the crowd of
  coincident endpoints reads as ambiguous and the auto-miter falls back to a plain cap. **Two walls
  stacked at the same plan position on different storeys is the ordinary case**, so this is not an edge
  case; it is D68's ambiguity flip arriving through elevation, changing geometry on a storey nobody
  edited. Fix shape: scope the endpoint and segment scans to walls sharing a vertical extent. Recorded,
  not claimed.
- **2026-08-17 — `NEXT TURN: REVIEW ONLY` is cleared only on a `--review` finish**, so a PR merged any
  other way strands the banner and halts every builder turn on both machines (`agent-finish.mjs:335`
  gates the clear on `if (review)`; `agent-start.mjs:789` refuses a builder claim while it stands).
  T-011's banner outlived PR #32; cleared by direct commit. Fix shape: clear it on every finish whose
  task the banner names. Recorded, not claimed.
- **2026-08-17 — `agent-finish.mjs` runs `pnpm verify` (step 1) before regenerating §8 (step 2)**, so
  every turn that edits §7 burns a full verify (~9 min) before failing on "§8 agrees with §7". Step
  ordering in the writer, not a protocol question.
- **2026-08-17 — the orchestrator loop and its subagents contend for one working tree.** The loop's step
  2 runs `git checkout main` every cycle while a spawned subagent holds the same checkout on its task
  branch. Git refuses cleanly and it self-resolves, so it is an isolation/wording question (a worktree
  per subagent, or "skip step 2 while a subagent holds the tree"). ⚠ Step 2 currently calls a failed pull
  a stop-and-report, which would report a healthy state as a fault.
- **2026-08-17 — T-017's review left two `OWES: brahim` follow-ups**, recorded here so they outlive §7's
  rotation: `docs-state.mjs`'s "SYNTHETIC SORT KEYS" comment cites a gate that holds only to day
  granularity without saying so, and `frozen-surface.mjs:269` resolves `_baselinedAtEntry` through `.n`.
- **2026-08-17 — `agent-start.mjs`'s named-task claim path never consults `liveClaims`, so a finished
  task is claimable by name.** The auto-select path skips a held row on both disjuncts; the `wantTask`
  path above it checks only `rowStatus === 'ready'` and `canClaim`. Measured on T-011. Reachable only by
  naming the task explicitly — the loop's builder turns pass no task and are safe. Recorded, not claimed.
- **2026-08-17 — T-016 step 2 left two `OWES: brahim` follow-ups.** (1) An end-to-end test of
  `agent-finish.mjs`'s baton write — closable, but a 113-test blast radius on `zayd`'s harness. (2) Four
  copies of one rationale, all stale since T-016 merged; wants one copy and three pointers per
  `AGENTS.md §7.2`. Neither decomposed: (1) is a builder-harness call, (2) spans files outside any one
  task's diff.
- **2026-08-17 — a step-1 review's `review/step-1` label can land while its findings comment does not,
  and the §7 abstract still claims the comment was posted.** Measured on PR #33: label applied, no report
  among the PR's six comments; step 1's findings survive only on the branch. The opposite direction of
  T-014's OWES note, which named a report with no label; nothing checks either way. Step 2 reads the
  branch body instead. Recorded, not decomposed.
- **2026-08-17 — `agent-finish.mjs` resolves a turn's handoff body by ALPHABETICAL order, so a second
  turn on the same task and date cannot finish.** It takes the last of
  `readdirSync(handoff/<seat>).filter(f => f.includes(task)).sort()` and requires the newest abstract's
  `FULL:` to name it — correct only while the date prefix separates candidates, which a D88 defect return
  breaks. Worked around by naming the body so it sorts last. Fix shape: resolve the body **by the
  abstract's own `FULL:` field** and check the file exists — the entry is the authority on which body it
  has. Recorded, not claimed.
- **2026-08-17 — the "exactly one primary per set" invariant is enforced at the CRUD doors only, and two
  of the three roads onto `scene.designOptions` bypass it.** A loaded `.bnn` and a `Scene` assembled in
  code go through none of them, and `loadBnn`'s guard checks only that the value is an object. Measured:
  two `isPrimary: true` options make `isElementActive` return `true` for **both** mutually exclusive
  walls — D65's own stated double-count. ⚠ Not a regression; what changed is that the invariant now has
  an enforcement site, which invariant 7 asks to be swept backward. Fix shape: check it on the load path,
  or surface a violating set through `brokenRefs()`/`unbuildable()`. Recorded, not claimed.
- **2026-08-17 — the `--review` wrong-PR claim recurred a third time, and there is still no flag to name
  a PR.** With #32 (due step 2) and #33 (due step 1) both routed to `hmdnah`, `--review` claimed #33 and
  posted a claim comment on it while the session's assignment was #32. ⚠ The 2026-08-16 row judged this
  self-correctable and recorded it; three occurrences say that judgement was wrong. Fix shape: a `--pr
<n>` flag, or order candidates by review-pipeline position rather than `gh pr list` order.
- **2026-08-17 — `_baselinedAtEntry` names a POSITION, not an entry, under the `T-nnn` scheme**, so every
  new §7 abstract silently re-points the frozen-surface baseline's audit trail and `baselineEntryIssues`
  goes red on a PR that touched no frozen shape. Cleared by `--rebaseline`, i.e. the gate demanded a
  re-baseline to record nothing. ⚠ **Post-freeze it is worse than cry-wolf**, because the baseline may
  not be rewritten without an owner ruling, so the gate would have no green path. **⇒ T-024.**
- **2026-08-17 — ⚠⚠ `pnpm state` does not measure the suite; it reads `.vitest-summary.json`**, which is
  untracked, branch-agnostic and written by whichever `pnpm test` ran last anywhere in the worktree. §8's
  suite line therefore reports the last branch tested, as green. Measured: the same commit reads `915
green · 96 files` committed and `907 · 95` on an uncommitted regen, the latter being the **T-016**
  branch's suite left in the file. **This defeats `agent-start.mjs`'s measured-vs-claimed refusal** —
  both numbers come from the same stale file, so they agree while being wrong. Fix shape: refuse a
  summary whose mtime predates the newest source file, or record the commit the run measured. Recorded,
  not claimed.
- **2026-08-16 — `--review`'s reviewer-claim loop takes the first PR in `gh pr list` order
  (newest-first), not the one furthest along its own review pipeline.** Measured on #31 (past step 1,
  labelled) and #32 (just opened): both route to `hmdnah`, and the script claimed #32. Worked around by
  hand. Recorded rather than decomposed — superseded by the 2026-08-17 row above.
- **2026-08-15 — `docs/CURRENT_STATE.md §3`/`§5` called the plan/section unit blocked on Q1–Q3 after it
  shipped** (Entry 77). Fixed. ⚠ The class: rows phrased "blocked on a ruling" go stale because the
  ruling gets recorded elsewhere.
- **2026-08-15 — `state.mjs --rebaseline` crashes when `tests/` does not exist** (`writeFileSync` with no
  `mkdir`). Only reachable from a bare fixture, so recorded rather than fixed.
- **2026-08-15 — ⚠⚠ the `§0b` baton names the last seat to FINISH, not the seat that claimed.**
  `agent-finish.mjs` rewrites it with the finishing seat on the `--review` path too, so a reviewed branch
  claims its reviewer built it; the builder's identity then survives only in the claim commit message.
  Found reviewing PR #25, where a T-015 criterion written against the baton would have admitted the
  reviewer and refused the builder. ⇒ T-015 derives the seat from the task row (a route-around) and
  **T-016** fixes the baton itself.
- **2026-08-15 — `--review` cannot route a PR whose title carries no `T-nnn`**, so neither open PR was
  claimable by any reviewer seat: `reviewerFor` is called only when `^T-\d{3}` matches. The mechanical
  fallback is the branch's seat prefix, which derives the reviewer from the machine the work ran on. ⚠⚠
  Safety-critical routing, so a `STEWARD:` PR carrying a test, not a direct commit — ✅ **promoted to
  `T-012`.**
- **2026-08-15 — ⚠⚠ `hmdnah` HAS NO GITHUB CREDENTIAL ON THE BOX**, so the crossed-account approval
  `AGENTS.md §0` is built on does not exist here: `gh auth status` lists only `Davidian-Abdo`, and
  `gh pr review 20 --approve` returned `GraphQL: Review Can not approve your own pull request`. ⚠
  GitHub's refusal is the only thing that caught it, and **`gh pr merge` is not similarly blocked for a
  repo admin**. ✅ **RESOLVED same day by owner ruling `D87`**; the durable rule it leaves is **T-013** —
  a seat confirms `gh api user` is its own account before approving or merging.
- **2026-08-15 — ⚠⚠ `--review` reads the frozen surface and never the task's `risk:` field**, so a
  `risk: high` task is stamped `done` and its reviewer told to merge it. The two gates disagree by
  construction: the builder half writes `NEXT TURN: REVIEW ONLY` on `risk: high` **or**
  `contract-touching`, the review half holds the row for `contract-touching` alone. Measured on T-008;
  row corrected by hand. ⇒ **T-014**, and the fix must honour the stricter of the two.
- **2026-08-15 — the `ready`→`review` status flip fails `format:check`, so every builder turn opens a red
  PR.** The longer word goes into a cell padded for `ready`, leaving one trailing space prettier rejects.
  ✅ **FIXED at the writer in PR #20** — `setRowStatus` is hoisted, exported and repads to the width it
  found, with a case in `tests/protocol/agent-finish.test.ts`. ⚠ Repadding one branch would not have
  held: the same writer stamps `done` at the end of a review turn.
- **2026-08-15 — D88's "a proven defect goes back to the builder on the existing claim" has no scripted
  route** — a claim reading `finished — PR open, awaiting review` is refused as "not an incomplete turn
  to continue". ✅ **RULED `D88` as amended: the route is `agent-start.mjs --continue <T-nnn>`, promoted
  to `T-015`.**
- **2026-08-15 — the `NEXT TURN: REVIEW ONLY` banner cannot route a review turn.** It is written into the
  task branch and read after `git checkout main`, so it has never existed on `main` and routing comes
  from the PR title. ✅ **RULED `D88` as amended: a `review/step-1` PR label routes step 2**, and T-014's
  criterion is rewritten to it. The banner keeps its existing job of telling the next session on that
  branch that the turn is review-only.
