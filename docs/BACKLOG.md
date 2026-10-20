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

| ID    | Status  | Task                                                                                              | Area     | Machine | Risk     | Depends on   |
| ----- | ------- | ------------------------------------------------------------------------------------------------- | -------- | ------- | -------- | ------------ |
| T-001 | done    | The perpendicular-foot snap candidate                                                             | apps-web | pc      | normal   | —            |
| T-002 | done    | The two-candidate-line intersection snap                                                          | apps-web | pc      | normal   | T-001        |
| T-003 | done    | The in-app open-source licences screen                                                            | apps-web | pc      | normal   | —            |
| T-004 | done    | Does per-element build cost stay flat from 54 to 10,000?                                          | document | box     | normal   | —            |
| T-006 | done    | D66 §3a/b — the keep-live set and a lazy first paint                                              | apps-web | box     | normal   | T-005        |
| T-007 | done    | Q17c — a dangling `designOptionId` becomes a broken ref                                           | document | box     | normal   | —            |
| T-008 | done    | Q19 — the belongs-to deletion reconciliation                                                      | document | box     | high     | —            |
| T-009 | done    | Q18 — a hosted void may only host on its host's base part                                         | document | box     | high     | —            |
| T-010 | done    | Q18 — two doors on one wall, confirmed in the browser                                             | apps-web | box     | normal   | T-009        |
| T-011 | done    | Q17a — `scene.designOptions` becomes a `SceneCollection`                                          | document | box     | high     | —            |
| T-012 | done    | `--review` routes a PR whose title carries no `T-nnn`                                             | infra    | box     | high     | —            |
| T-013 | done    | The seat identity guard — `gh api user` must match the seat                                       | infra    | box     | high     | —            |
| T-014 | done    | `--review` must read the task's `risk:`, not only the surface                                     | infra    | box     | high     | —            |
| T-015 | done    | `agent-start.mjs --continue` returns a branch to its builder                                      | infra    | box     | high     | —            |
| T-016 | done    | `§0b`'s baton carries the builder separately from the holder                                      | infra    | box     | high     | T-015        |
| T-017 | done    | `docs-budget.test.ts`'s newest-first check verifies itself                                        | infra    | box     | normal   | —            |
| T-018 | done    | D66's lazy-build design doc + measurement, reproduced                                             | document | box     | normal   | —            |
| T-019 | done    | The move-tool gizmo + corner-drag, redone against `main`                                          | apps-web | box     | normal   | —            |
| T-032 | done    | Agent edits through `window.bunyan` wait on the same document lock as human edits and lazy builds | frontend | box     | normal   | —            |
| T-020 | done    | The pinned vitest cannot collect `tests/protocol/*` on Windows                                    | infra    | box     | high     | —            |
| T-021 | done    | `pnpm verify` reaches green on the pc, confirmed there                                            | infra    | pc      | normal   | T-020        |
| T-024 | done    | `_baselinedAtEntry` names a position, so a cross-day §7 append goes red                           | infra    | box     | high     | —            |
| T-022 | done    | `kernel-occt`'s glue decodes from growable WASM memory                                            | kernel   | box     | high     | —            |
| T-023 | ready   | The kernel boots on the pc's system Chrome, confirmed there                                       | apps-web | pc      | normal   | T-022        |
| T-005 | done    | D66 §3c — force-on-measure, and whether `save` reads built                                        | document | box     | normal   | T-018        |
| T-026 | blocked | The identity gate fires at approve/merge, not only at claim                                       | infra    | box     | high     | —            |
| T-025 | blocked | `--review` keeps an owner-gated row at `review`                                                   | infra    | box     | high     | —            |
| T-028 | blocked | `agent-finish.mjs` is resumable after an interrupted run                                          | infra    | box     | normal   | —            |
| T-027 | done    | §6's relink cap is measured, not guessed                                                          | infra    | box     | normal   | —            |
| T-033 | ready   | Q10 — `Dimension.anchors` excludes the free `point` anchor                                        | document | box     | **high** | —            |
| T-034 | ready   | Q9 — `FamilyDefinition` reserves a way for data to name billable faces                            | document | box     | **high** | —            |
| T-035 | done    | Q8 — design: moving a D52 baseline wall, properly                                                 | design   | box     | normal   | —            |
| T-050 | ready   | Q8a — `ParamField.motion?` is reserved: a schema says which params a motion moves                 | backend  | box     | **high** | —            |
| T-051 | blocked | Q8a — `core.move`/`rotate`/`copy` move a D52 wall through its `motion` tags                       | backend  | box     | **high** | T-050        |
| T-036 | blocked | Q7 — `core.copy` deep-copies a host's openings                                                    | document | box     | **high** | T-051        |
| T-037 | ready   | Q5 — the section chord tolerance, chosen for Revit-class drawings and asserted                    | kernel   | box     | normal   | —            |
| T-038 | done    | Q6 — design: the D29 cache in the `.bnn`                                                          | design   | box     | **high** | —            |
| T-039 | done    | D29 R1 — the cache input key, one pass over the scene                                             | backend  | box     | **high** | —            |
| T-040 | done    | D29 R2 — `geometry-cache/` in the `.bnn`, optional and filtered on load                           | backend  | box     | **high** | T-039        |
| T-041 | done    | D29 R3 — the load-only restore substitution in `#stage`                                           | backend  | box     | **high** | T-039, T-040 |
| T-042 | done    | D29 R4 — the lazy idle exporter; a save never exports                                             | workers  | box     | **high** | T-041        |
| T-047 | done    | A `.bnn` saved twice from one scene is byte-identical whatever the wall clock reads               | backend  | box     | normal   | —            |
| T-043 | ready   | D29 R5 — the cache envelope is trusted per the owner answer to D-20261012-05                      | backend  | box     | **high** | T-040        |
| T-044 | ready   | D29 R6 — `codeId` is stamped per the owner answer to D-20261012-06                                | backend  | box     | **high** | T-040        |
| T-045 | done    | D29 R7 — autosave carries the cache or not, per D-20261012-07                                     | backend  | box     | **high** | T-042        |
| T-046 | done    | A hostile `.bnn` is refused before it inflates past an entry-count or size cap                    | backend  | box     | **high** | —            |
| T-048 | done    | A `.bnn` of many small high-ratio entries is refused by an aggregate ratio cap                    | backend  | box     | **high** | —            |
| T-049 | ready   | A cache restore reads each batch of roots' entries in one `readMany`, not one `read` per part     | backend  | box     | **high** | —            |
| T-052 | done    | A shared-table edit re-queues every live assembly whose cache key flipped                         | backend  | box     | **high** | T-042        |
| T-053 | review  | Wall auto-joins pair only walls whose vertical extents overlap                                    | backend  | box     | **high** | —            |
| T-029 | blocked | `seats.mjs` collapses `machine: any` to `box` in two functions                                    | infra    | box     | high     | —            |
| T-030 | blocked | A steward cannot review, and its readiness view lists nothing                                     | infra    | box     | high     | —            |
| T-031 | blocked | `requires:` supersedes a task's `machine:`                                                        | infra    | box     | high     | T-029        |

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

### T-033 — Q10 — `Dimension.anchors` excludes the free `point` anchor

- outcome: A `Dimension` can be anchored only to the model, so its number re-derives on every edit (rule 17).
- implements: `docs/decisions.md` D97 · D58 · `docs/design/P5_step5A_documentation_anchoring_design.md`
- done-when: `Dimension.anchors` in `packages/document/src/documentation.ts` admits only the `ref`, `vertex` and `element` anchors; `AnnotationAnchor` keeps `point` for every other annotation
- done-when: a test holding `@ts-expect-error` on a `point` anchor in a `Dimension` fails `pnpm verify` when the narrowing is reverted (revert-verified)
- done-when: every reader of `Dimension.anchors` under `packages/` is swept for a `point` branch, and each one found is named in the PR
- done-when: `tests/freeze-boundary.test.ts`'s verdict is reported as measured, and a `contract-touching` verdict goes to the owner's merge (`docs/INVARIANTS.md §2.1`)
- verify: pnpm verify
- depends-on: — · area: document · machine: box · risk: **high**

### T-034 — Q9 — `FamilyDefinition` reserves a way for data to name billable faces

- outcome: A data-authored family (D61) can name the faces that bill, as D72's `exposedRefs` does for a code Type.
- implements: `docs/decisions.md` D96 · D72 · D61 · `docs/design/P5_step5D_family_seam_design.md`
- done-when: an optional field in `packages/document/src/families.ts` lets a family's data name its billable faces by role on a primitive, never by area or geometric index (D1, rule 15)
- done-when: `docs/design/P5_step5D_family_seam_design.md` records the shape, and that no interpreter reads it in v1.0.0
- done-when: a family carrying the field round-trips through `scene.json` save and load unchanged, asserted in a test that fails when the field is removed (revert-verified)
- done-when: `tests/freeze-boundary.test.ts`'s verdict is reported as measured, and a `contract-touching` verdict goes to the owner's merge (`docs/INVARIANTS.md §2.1`)
- verify: pnpm verify
- depends-on: — · area: document · machine: box · risk: **high**

### T-035 — Q8 — design: moving a D52 baseline wall, properly

- outcome: A design doc proposes how a D52 wall is moved, copied and rotated without putting wall knowledge in the general command layer, for the owner to rule on.
- implements: `docs/decisions.md` D95 · D52 · D80 · `docs/design/P4.5_interaction_model_design.md` §9
- done-when: `docs/design/P4.5_baseline_move_design.md` exists, is under 400 lines, and quotes D95's owner free-text verbatim
- done-when: it measures today's refusal with a named command (`core.move`/`copy`/`rotate` on every baseline element of the demo scene) and names every derivation that reads the baseline (`joins.ts`, `room.ts`, D72's billed length)
- done-when: it recommends a mechanism that is neither framed option D95 rejects (keep refusing; wall knowledge in `core.move`), compares at least two candidates with each one's frozen-surface cost and whether it must land before P5 step 6, and says how Revit, Archicad and Rhino move a wall, citing a source or marking it unverified
- done-when: it says how D94's deep-copy (T-036) and `D-20261007-08` depend on its answer
- done-when: its open questions are `D-` records in `docs/OWNER-DECISIONS.md`, each with options and a default; no code changes
- verify: pnpm verify
- depends-on: — · area: design · machine: box · risk: normal

### T-050 — Q8a — `ParamField.motion?` is reserved: a schema says which params a motion moves

- outcome: A `ParamField` can declare how a rigid motion acts on it, the member `D-20261012-03` (`annotation`) chose, landed before P5 step 6 freezes `schema.ts`.
- implements: `docs/design/P4.5_baseline_move_design.md` §5 A · `docs/decisions.md` D95 · `D-20261012-03` (default `annotation`, applied 2026-10-20)
- done-when: `ParamField` in `packages/document/src/schema.ts` has `readonly motion?: 'planPoint' | 'point' | 'direction'`, documented as: absent means a motion never touches the param
- done-when: `tests/freeze-boundary.test.ts` flags this member and nothing else, so the PR is `RISK: contract-touching` and merges only on the owner's signature (`docs/INVARIANTS.md §2.1`)
- done-when: no param of any shipped type carries `motion` yet and no code reads it; the `core.wall` tags and the verbs are the next row
- done-when: a test pins the three members of the union, and goes red when one is removed (revert-verified)
- verify: pnpm verify
- depends-on: — · area: backend · machine: box · risk: **high**

### T-051 — Q8a — `core.move`/`rotate`/`copy` move a D52 wall through its `motion` tags

- outcome: A wall moves, rotates and copies through the general verbs, which read `motion` from the schema and name no wall (D95).
- implements: `docs/design/P4.5_baseline_move_design.md` §5 A, §6, §7 · `docs/decisions.md` D95 · D80 · `D-20261012-03` (`annotation`) · `D-20261012-04` (`detach`)
- done-when: `core.wall` tags `start` and `end` `motion: 'planPoint'`; `positioningOf`'s `baseline` rung reads the schema's tags, not `baselineOf`, and no verb body names `start`, `end` or `core.wall` (the grep is in the handoff)
- done-when: the design's §A probe, re-run on the demo scene: `core.move` `by: [1000, 0, 0]`, `core.rotate` `axis: [0, 0, 1]` `angle: 90` and `core.copy` `by: [1000, 0, 0]` succeed on both walls (§1 measured 6 of 6 refused), each one edit and one undo, writing the tagged params and leaving `placement` untouched
- done-when: refused, each with a named reason: a `planPoint` under a non-vertical rotation axis or a translation with `dz ≠ 0` (the message names `core.updateContainer`), any mirror of a tagged element (§6), `core.setPlacement` on a params-positioned element (the message names `core.move`)
- done-when: `core.rotate`'s default `about` on a params-positioned element is the centroid of its tagged points
- done-when: moving a wall leaves the walls joined to it unmoved (`detach`); `core.copy` of a wall that hosts an opening still refuses at the hosted check, which T-036 lifts
- done-when: `tests/goldens/` is re-seeded, since any edit under `packages/types/src/` trips the re-seed gate whether or not geometry moves; if no value moved, a `Re-seed-unchanged:` trailer gives the reason (`docs/INVARIANTS.md §5`)
- done-when: revert-verified: removing the tags from `core.wall` turns the move test red
- verify: pnpm verify
- depends-on: T-050 · area: backend · machine: box · risk: **high**
- note: `blocked` 2026-10-20 (steward): on T-050, whose member it reads; promoted by step 4 once T-050 is `done`. The box loop's seeder run is refused while B-20261012-03 stands.

### T-036 — Q7 — `core.copy` deep-copies a host's openings

- outcome: Copying a host also copies its hosted openings, each under a fresh PEI with its `hostRef` on the copy, in one undoable edit.
- implements: `docs/decisions.md` D94 · D51 · D80 · D44 · T-035's design, once ruled
- done-when: copying a host with N hosted openings yields N new openings with fresh PEIs (D44), each `hostRef` naming the copy's corresponding face and every new element `state: 'valid'` after build; the source and its openings are unchanged
- done-when: each new `hostRef` is built from the `SubShapeRef`'s structure (`nodeId`, `role`, `occurrence`), never by string substitution or geometric matching (D1)
- done-when: one edit, one undo; `dryRun` names the openings it would copy; `brokenRefs()` is empty after the copy and after its undo
- done-when: a sketch constraint or join override pointing at the source still refuses, unchanged
- done-when: revert-verified: removing the deep-copy turns the new test red
- verify: pnpm verify
- depends-on: T-051 · area: document · machine: box · risk: **high**
- note: `blocked` 2026-10-10 (steward): `positioningRefusal` refuses every D52 baseline element (`packages/document/src/placement.ts:348`) before `core.copy`'s hosted check, so no wall reaches this until T-035's design is ruled and built. 2026-10-20: ruled (`D-20261012-03` `annotation`, `-04` `detach`), built by T-050 then T-051; re-read against design §7, this row's items stand as written.

### T-037 — Q5 — the section chord tolerance, chosen for Revit-class drawings and asserted

- outcome: The section chord tolerance is chosen against the drawing scales a Revit-class tool prints, documented, and held by a test.
- implements: `docs/decisions.md` D92 · `docs/design/P5_step6C_plan_section_design.md` §4.1
- done-when: §4.1 states the value, the smallest drawing scale it is chosen for (detail scales included), its on-paper error at that scale, and D92's owner free-text verbatim
- done-when: `SECTION_DEFLECTION` in `packages/kernel-occt/src/kernel.ts` carries that value, and its comment no longer argues from 1:100 alone
- done-when: a real-OCCT test cuts a circular column and asserts every polyline point lies within the tolerance of the exact radius, and fails when the constant is loosened (revert-verified)
- done-when: no quantity reads the polyline (rule 15) and `SectionCutPayload` is unchanged; if the chosen value needs a per-view tolerance, that frozen-protocol change is recorded as a finding, not made
- done-when: if the value changes, the re-seed gate is discharged (`docs/INVARIANTS.md §5`)
- verify: pnpm verify
- depends-on: — · area: kernel · machine: box · risk: normal
- note: steward ruling 2026-10-12: merging `main` into this branch, take `main`'s `docs/BLOCKERS.md` and re-append the branch's two unmerged records as `B-20261012-05`/`-06` — they were never on `main`, so this edits no record; `main`'s `B-20261012-03` already carries the re-seed need.

### T-038 — Q6 — design: the D29 cache in the `.bnn`

- outcome: A design doc says how the D29 cache is stored in a `.bnn` and what invalidates it, so its build can be decomposed.
- implements: `docs/decisions.md` D93 · D29 · `docs/decisions.md` §4j-2
- done-when: `docs/design/P5_step9_D29_bnn_cache_design.md` exists and is under 400 lines
- done-when: it names the invalidation key that catches a hand-edited `scene.json` (§4j-2: neither `kernelBuildId` nor `typeVersions` moves for one), and shows a stale entry costs a rebuild, never a wrong name
- done-when: it places the cache in the `.bnn` additively (an old file opens; a file with a cache opens in a build that ignores it) and says whether any frozen shape moves
- done-when: it budgets the measured 2.07×, 6.64 ms/solid per save and ~61 MB at 16k, and says whether a save writes the cache always, lazily or by option
- done-when: it decomposes the build into rows a steward can file, and opens `D-` records for its open questions; no code changes
- verify: pnpm verify
- depends-on: — · area: design · machine: box · risk: **high**

### T-039 — D29 R1 — the cache input key, one pass over the scene

- outcome: Each cached assembly root has an input key that moves exactly when an input its build reads moves, hand-edits of scene.json included.
- implements: docs/design/P5_step9_D29_bnn_cache_design.md §2a–§2c, §6 R1 · docs/decisions.md D93 · D29
- done-when: cacheInputKey(scene, root, tables), its envelope, canonical JSON and the one-pass index exist in packages/document
- done-when: test-first: each per-element §2b input class, hand-edited in scene.json, flips exactly the keys of the assemblies that read it; an edit to any of the five whole-digested tables (`styles`, `materials`, `sections`, `containers`, `grids`) flips every key, a style only a D59 child reads included; a whitespace/key-order reformat flips none
- done-when: revert-verified: dropping one §2b input class from the key turns its test red
- done-when: key time at 1k/4k/16k elements is printed by a test and recorded in the handoff
- verify: pnpm verify
- depends-on: — · area: backend · machine: box · risk: **high**
- note: risk high by READY rule 8 (touches the D29 cache); area is the backlog.py enum, which has no `document`

### T-040 — D29 R2 — `geometry-cache/` in the `.bnn`, optional and filtered on load

- outcome: A .bnn may carry an optional geometry-cache/ directory that old builds ignore and the cache-aware loader never inflates unless it reads it.
- implements: docs/design/P5_step9_D29_bnn_cache_design.md §3, §6 R2 · docs/contracts/V1.0.0_spec.md §6
- done-when: SaveOptions gains an optional cache member; no required member is added to Manifest, BnnPackage or ElementGeometry, and no [frozen_surface] watched file changes
- done-when: loadBnn passes unzipSync a filter that skips geometry-cache/ and exposes an on-demand reader over the retained bytes
- done-when: test: an old file (no geometry-cache/) opens; a file with a cache opens through the pre-R2 loadBnn on the fixture
- done-when: spec §6 tree names geometry-cache/ as a directory (index.json + <rootId>/<k>.brep), replacing the single PROVISIONAL geometry-cache.brep
- verify: pnpm verify
- depends-on: T-039 · area: backend · machine: box · risk: **high**
- note: risk high by READY rule 8 (touches the D29 cache); area is the backlog.py enum, which has no `document`

### T-041 — D29 R3 — the load-only restore substitution in `#stage`

- outcome: On load, an assembly whose input key matches its cache record is restored by importBrep instead of rebuilt, and any refusal falls back to a rebuild with no handle leaked.
- implements: docs/design/P5_step9_D29_bnn_cache_design.md §4, §6 R3 · D1 · D66 · D28
- done-when: only rebuildAll and rebuildOnly pass restore; the edit paths in document.ts never do (asserted by a test)
- done-when: restored ≡ rebuilt on the D66 fixture: refs token for token, quantities at D28 rounding
- done-when: a hand-edited per-element value rebuilds exactly the assemblies whose input key it flips (its own, plus any joined neighbour via `resolveJoins`; a whole-digested table edit rebuilds all); a tampered .brep rebuilds and leaks no handle; a Part.refs that is not a permutation of importBrep output is treated as a refusal
- done-when: the §4 Clean Delta question is answered by a measurement recorded in the handoff
- done-when: revert-verified: removing the refusal fallback turns the tampered-brep test red
- verify: pnpm verify
- depends-on: T-039, T-040 · area: backend · machine: box · risk: **high**
- note: risk high: design §6 names R3 as where a wrong name would come from; area is the backlog.py enum

### T-042 — D29 R4 — the lazy idle exporter; a save never exports

- outcome: The cache is written lazily from idle worker time and carried through saves, and a save writes only entries whose key matches the scene it writes.
- implements: docs/design/P5_step9_D29_bnn_cache_design.md §5, §6 R4
- done-when: a save calls no exportBrep (asserted by a spy)
- done-when: restored and D66-deferred assemblies are carried from the retained bytes when their key still matches
- done-when: an unbuilt assembly whose neighbour moved is not written (test)
- done-when: compressed cache size and zipSync save time are measured and recorded in the design §5 and the handoff
- verify: pnpm verify
- depends-on: T-041 · area: workers · machine: box · risk: **high**
- note: risk high by READY rule 8 (touches the D29 cache); area is the backlog.py enum, which has no `document`

### T-047 — A `.bnn` saved twice from one scene is byte-identical whatever the wall clock reads

- outcome: saveBnn writes every zip entry with one constant timestamp, so its bytes depend on the document alone, never on when it was saved.
- implements: docs/contracts/V1.0.0_spec.md §6.5 (determinism) · D71 (the codec write equals saveBnn) · D76; provenance: brahim cycle 2026-10-14, tests/journal-transport-rule14.test.ts:305 red once under gates.py verify on main 5ae192f
- done-when: packages/document/src/bnn.ts:182 passes zipSync a constant `mtime` built from a local-time date no earlier than 1980 (fflate 0.8.3 throws below it in the local year, esm/index.mjs:1903), with a comment naming why
- done-when: test-first: a test saves one scene twice with the system clock moved more than 2 s between the saves (vi.setSystemTime) and asserts identical bytes; revert-verified: dropping the `mtime` option turns it red
- done-when: tests/journal-transport-rule14.test.ts:305, tests/format-codec-seam.test.ts:157-161 and apps/web/src/view/keepLive.test.ts:172-175 pass unchanged
- done-when: no [frozen_surface] watched file changes
- verify: pnpm verify
- depends-on: — · area: backend · machine: box · risk: normal
- note: fflate stamps Date.now() as a 2 s DOS time when no mtime is given (esm/index.mjs:1902,1905), so two saves straddling a tick differ in local and central header bytes only; bnn.ts:182 is the only zipSync call in packages/ and apps/; area is the backlog.py enum

### T-043 — D29 R5 — the cache envelope is trusted per the owner answer to D-20261012-05

- outcome: A geometry cache restores only under the trust rule the owner chose in D-20261012-05.
- implements: docs/design/P5_step9_D29_bnn_cache_design.md §2e, §6 R5 · docs/OWNER-DECISIONS.md D-20261012-05
- done-when: the envelope carries the trust mark D-20261012-05 answered (recommended: an HMAC keyed by a per-install secret)
- done-when: revert-verified: a file from another install restores nothing and opens at rebuild speed
- verify: pnpm verify
- depends-on: T-040 · area: backend · machine: box · risk: **high**
- note: blocked also on D-20261012-05 (pending); the steward re-reads this row against the answer before flipping it; area is the backlog.py enum

### T-044 — D29 R6 — `codeId` is stamped per the owner answer to D-20261012-06

- outcome: A change to the code that builds geometry discards the cache, under the codeId the owner chose in D-20261012-06.
- implements: docs/design/P5_step9_D29_bnn_cache_design.md §2d, §6 R6 · docs/OWNER-DECISIONS.md D-20261012-06
- done-when: the envelope codeId is stamped as D-20261012-06 answered
- done-when: revert-verified: a changed bundle (or changed codeId) discards the cache
- verify: pnpm verify
- depends-on: T-040 · area: backend · machine: box · risk: **high**
- note: blocked also on D-20261012-06 (pending); the steward re-reads this row against the answer before flipping it; area is the backlog.py enum

### T-045 — D29 R7 — autosave carries the cache or not, per D-20261012-07

- outcome: Autosave snapshots carry or omit the geometry cache exactly as the owner chose in D-20261012-07.
- implements: docs/design/P5_step9_D29_bnn_cache_design.md §5 (Autosave), §6 R7 · docs/OWNER-DECISIONS.md D-20261012-07 · spec §7
- done-when: an autosave snapshot matches the D-20261012-07 answer (test)
- done-when: spec §7 autosave line is amended to state the answer
- verify: pnpm verify
- depends-on: T-042 · area: backend · machine: box · risk: **high**
- note: blocked also on D-20261012-07 (pending); the steward re-reads this row against the answer before flipping it; area is the backlog.py enum

### T-046 — A hostile `.bnn` is refused before it inflates past an entry-count or size cap

- outcome: loadBnn and the geometry-cache reader refuse a zip whose entry count or inflated size passes a named cap, with a message, before inflating it.
- implements: docs/contracts/V1.0.0_spec.md §9 (Import hardening tests) · docs/design/P5_step9_D29_bnn_cache_design.md §3, §5 · D29
- done-when: packages/document/src/bnn.ts bounds the entry count and the total and per-entry inflated size before unzipSync inflates anything, in loadBnn (line 202) and in geometryCacheReader.read (line 303); each cap is a named constant whose comment states the figure it is sized against (design §5: 16k solids, ~61 MB uncompressed cache)
- done-when: test-first: a zip over the entry cap, an entry over the size cap and a high-ratio entry each make loadBnn throw an Error naming the cap, and inflate nothing past it; a .bnn at the 16k target size still opens
- done-when: revert-verified: removing the entry-count bound turns its test red
- done-when: no [frozen_surface] watched file changes
- verify: pnpm verify
- depends-on: — · area: backend · machine: box · risk: **high**
- note: risk high by READY rule 8 (the D29 cache read path) and spec §9 hostile input; from ## Discovered 2026-10-12 (T-038); area is the backlog.py enum

### T-048 — A `.bnn` of many small high-ratio entries is refused by an aggregate ratio cap

- outcome: loadBnn and the geometry-cache reader refuse a zip whose summed inflated size passes BNN_MAX_RATIO times the summed bytes the file holds for its entries, so entries at or under RATIO_FLOOR_BYTES can no longer amplify ~900:1 together.
- implements: docs/contracts/V1.0.0_spec.md §9 (Import hardening tests) · docs/design/P5_step9_D29_bnn_cache_design.md §3, §5 · D29; provenance: ## Discovered 2026-10-13 (T-046), probe in handoff/zayd/2026-10-13-T-046-bnn-zip-caps.md
- done-when: packages/document/src/bnn.ts checkCaps (and the geometry-cache reader path that shares checkEntry) refuses, before unzipSync inflates anything, when the summed inflated bytes pass RATIO_FLOOR_BYTES and BNN_MAX_RATIO times the summed `entryRoom` bytes; the error names the cap
- done-when: test-first: the T-046 handoff probe (500 zero entries, each <= 1 MiB, 577,279 B on disk) makes loadBnn throw naming the aggregate cap and inflate nothing; revert-verified: removing the aggregate check turns it red
- done-when: the existing T-046 and T-042/T-047 .bnn tests pass unchanged, and a .bnn at the 16k target with a full cache (design §5: 105 MB inflated from ~14.6 MB) still opens
- done-when: no [frozen_surface] watched file changes
- verify: pnpm verify
- depends-on: — · area: backend · machine: box · risk: **high**
- note: risk high by READY rule 8 (the D29 cache read path) and spec §9 hostile input; BNN_MAX_TOTAL_BYTES already bounds the probe at 512 MiB, so this is defence in depth; area is the backlog.py enum

### T-049 — A cache restore reads each batch of roots' entries in one `readMany`, not one `read` per part

- outcome: Restoring N cached roots costs one central-directory pass per batch of roots instead of one per part, so a 16k-part restore no longer spends ~6 min in zip scans.
- implements: docs/design/P5_step9_D29_bnn_cache_design.md §4, §5 (cold open, cache: 12.00 ms/solid) · docs/contracts/V1.0.0_spec.md §6 (D29), §14 D66 (cold-load axis) · D29
- done-when: test-first: a counting GeometryCacheReader passed as `geometryCache.files` shows a full restore of N roots makes 0 `.brep` `read` calls and at most ceil(N/B) `readMany` calls whatever the part count (B a named constant); red on main, where cacherestore.ts:104 calls `read` once per part
- done-when: a batch `readMany` that throws a cap error (T-046, T-048) rebuilds the roots of that batch, as a per-part throw does today inside restoreAssembly (cacherestore.ts:140), and a test shows it
- done-when: tests/geometry-cache-restore-d29.test.ts, tests/bnn-zip-caps-t046.test.ts and tests/bnn-aggregate-ratio-t048.test.ts pass unmodified, and packages/document/src/bnn.ts is unchanged
- done-when: revert-verified: restoring the per-part `files.read` at cacherestore.ts:104 turns the call-count test red
- done-when: the handoff records headless ms for restoring 16,000 cached entries, against the baseline 22.56 ms per `read` and 694 ms for one `readMany` of 16,000 names
- done-when: no [frozen_surface] watched file changes
- verify: pnpm verify
- depends-on: — · area: backend · machine: box · risk: **high**
- note: risk high by READY rule 8 (the D29 cache read path); not reachable from apps/ today (no product caller passes geometryCache); from ## Discovered 2026-10-19 (T-048 review step 2); area is the backlog.py enum

### T-052 — A shared-table edit re-queues every live assembly whose cache key flipped

- outcome: An edit to `styles`, `materials`, `sections`, `containers` or `grids` queues every live root whose cache key changed for `exportCacheIdle`, whether it was rebuilt, restored or untouched, so a save after draining writes a record for every live root instead of none.
- implements: `docs/design/P5_step9_D29_bnn_cache_design.md` §2b ("And the shared tables, whole"), §5 (the commit-queue and save-filter bullets), §6 row R4; `docs/contracts/V1.0.0_spec.md` §6, the `geometry-cache/` box. Provenance: the 2026-10-14 `## Discovered` finding from T-042.
- done-when: On a built, drained document, one `core.createMaterial` leaves `edit.rebuilt` `[]`, `exportCacheIdle()` returns more than 0, and after draining `geometryCacheFiles()` holds a record for every root under its current key; the test is red with the fix reverted
- done-when: A style edit that rebuilds only that style's instances also re-queues the roots that do not use it; after draining every root has a record
- done-when: In a document opened from a cached `.bnn` and restored, a material edit yields a full record set after draining with no restored root built from its recipe (a build/`exportBrep` spy, as `tests/geometry-cache-export-d29.test.ts:92-110`)
- done-when: With no `geometryCacheEnvelope`, a material edit queues nothing: `exportCacheIdle()` returns 0
- verify: npx vitest run tests/cache-requeue-table-edit.test.ts tests/geometry-cache-export-d29.test.ts tests/geometry-cache-restore-d29.test.ts && pnpm verify
- depends-on: T-042 · area: backend · machine: box · risk: **high**
- note: Mechanism (main ba7dc72): `cacheKeyTables` digests the five tables whole into every key (`cachekey.ts:73-82,136-142`), but `#commit` queues only `staged.built` (`document.ts:1481-1485`) and `geometryCacheFiles` drops stale keys (`:688,:693-695`). Fix shape: in `#commit`, when the shared digest changed and `#writeEnvelope` is set, queue every live root not already built. Same file as open PRs #88 (`#stage`) and #89 (`geometryCacheFiles`); put the test in `tests/cache-requeue-table-edit.test.ts`. risk high: it decides which solid is written under which key.

### T-053 — Wall auto-joins pair only walls whose vertical extents overlap

- outcome: partnersAt and throughWallsAt consider only candidate walls whose [base, top] extent overlaps the queried wall's by a positive length, so authoring the same corner on the storey above leaves the lower storey's joins and geometry unchanged.
- implements: docs/design/P5_step0c_design.md §2 (joins computed in the Level plane), §0a and §4; docs/decisions.md D68 (the ambiguity flip) and D73 (filter at query time, the index stays unfiltered). Provenance: the 2026-08-17 ## Discovered finding, re-measured at main 5b4dc73.
- done-when: In a two-level scene (l0 at 0, l1 at 3000) with the same 200 mm 90-degree corner on each level, the l0 wall [0,0]->[4000,0] has resolveJoins ['start'] and built bbox min[0] within 1e-6 of -100, as it does with l1 empty; the test is red with the extent filter reverted
- done-when: Two walls whose extents only touch (one's top equals the other's base) or are disjoint get no auto-miter or auto-butt; a corner whose extents overlap still miters, including one whose top is set by a datum
- done-when: indexOf still indexes every wall unfiltered (D73) and the filter is applied in both scans at query time; every existing test under tests/ that exercises joins passes unchanged
- verify: npx vitest run tests/wall-join-level-scope.test.ts tests/wall-joins.test.ts tests/join-option-cascade.test.ts && pnpm verify
- depends-on: — · area: backend · machine: box · risk: **high**
- note: Mechanism (main 5b4dc73): indexOf adds every element with a baseline (packages/document/src/joins.ts:201-220); partnersAt (:333, scan :343) and throughWallsAt (:369, scan :379) filter only by isElementActive (:347, :383); nothing reads containerId or datums. A wall's extent is base = baseElevation ?? elevation, top = topElevation ?? base + height (packages/types/src/wall.ts:77-78), fed by elevationOf (scene.ts:360) and datumElevations (scene.ts:427) as build.ts:600-610 wires them; add a document-side wallExtentOf rather than editing packages/types/src (a [reseed] source). No golden holds stacked walls. risk high: cachekey.ts:132 digests resolveJoins, so every stacked lower wall's cache key and geometry change.

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

- **2026-10-14 — no product caller runs the D29 export** (T-042). `exportCacheIdle` and `geometryCacheFiles`
  are document-layer only: `apps/web` schedules no idle export and its saves pass no `cache`, because the
  envelope needs a `codeId` (T-044, `D-20261012-06`). Fix shape: wire both when T-044 lands. Recorded, not claimed.
- **2026-10-14 — a save with a full 16k cache blocks ~4.1 s in `zipSync`** (T-042, design §5). Fix shape: zip
  in a worker, or a lower level for `geometry-cache/`. Recorded, not claimed.

- **2026-10-11 — a `requires: browser` row's check can need more than a browser** (PR #66). T-010's
  `tools/browser-check/two-doors.mjs` imports `playwright-core`, which is not a Bunyan dependency; both
  turns borrowed `Chantier_Manager`'s copy. `browser` probes green on a Chromium binary alone. Fix shape:
  a root devDependency, or a need. Recorded, not claimed.
- **2026-10-10 — the merge entrypoint's re-measure overwrites `pnpm state`'s §8 block, turning `main` red.**
  `401e22d` stamped `BEGIN GENERATED by measure.py` over the `scripts/state.mjs` block;
  `tests/docs-budget.test.ts` then fails 2 tests (CI run 38092485883) and `pnpm state` refuses. PR #55
  restores the block; the next merge re-stamps it. Fix belongs in diwan (B-20260930-01's shape). Recorded, not claimed.
- **2026-10-10 — diwan `scripts/backlog.py add` cannot write this repo's `area:` vocabulary, nor `requires:`.**
  Its `AREAS` is `backend|frontend|workers|infra|spec` (`backlog.py:73`), against this file's
  `kernel|document|apps-web|infra|design`, and it has no `--requires` flag. T-033…T-038 were written by it
  with `--area spec`, then that one token was corrected by hand (and the ids renumbered by hand on the
  2026-10-11 rebase, from `next-id`). Fix shape: read the area set from the
  repo, add `--requires`. A diwan item, not a Bunyan row.
- **2026-10-08 — a deferred element's broken `hostRef` surfaces only once it is built** (T-006). The
  keep-live set keeps an unregistered Type and a missing host live, both decidable from the recipe; a
  `hostRef` naming a face the host no longer has is measured by the build, so an out-of-view one is
  absent from the Problems panel until the camera reaches it (domain rule 3). Recorded, not claimed.
- **2026-10-08 — T-006 makes D-20261007-11 (Q23) reachable from the app.** An opened file now boots
  with only the keep-live set built, so `agent.query({discipline})` drops deferred elements in the
  shipped app, not only in a test. Recorded for the owner's answer; not claimed.
- **2026-10-06 — `tools/kernel-build/README.md` step 3 still links at `--memory=2g`** after T-027 set
  `docs/CURRENT_STATE-reference.md §6` to the measured 1 GB; the same unmeasured 2g caps `probe.sh` and
  README's probe/configure/compile steps, whose own footprints nobody has measured. Recorded, not claimed.
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
