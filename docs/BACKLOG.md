# BACKLOG

> **New at Entry 91 (D82).** Before this, "what's next" lived in each builder's own `§2 TASK` — a plan a
> seat wrote for its own successor, which is exactly the coupling `docs/design/handoff_system_design.md`
> found expensive (see `AGENTS.md §1.3`). `brahim` now owns readiness and sequencing here; seats decide
> what they take. `T-nnn` succeeds `Entry N` as the working unit for anything a builder or reviewer does;
> a steward turn carries no `T-nnn` and titles its PR `STEWARD: …` instead (`AGENTS.md §1.3`).

## Task IDs

Flat, monotonic, **allocated once and never reused** — the `PM-nnn`/`INV-nn` lesson mdo's own decisions
record applied to tasks: a stable id is never renumbered even when a task is re-sequenced, split, or
deferred, because re-planning must never invalidate a branch name, a PR title, or a `depends-on:`
reference. Branch: `task/T-nnn-<slug>`.

## What makes a task READY

All of the below, or it is not ready and **must not be claimed** — fix the entry or raise it in the log:

1. a stable id and a one-sentence outcome;
2. **`implements:`** naming the exact section(s) this task builds against — a `docs/contracts/*.md`
   section, a `docs/design/*.md` document, or a `D`-number in `docs/decisions.md`. Without this a claiming
   seat reads everything or guesses, and `AGENTS.md §2`'s three-tier reading rule cannot work;
3. an explicit **`verify:`** command a cold session can run (usually a `pnpm …` invocation);
4. a **`done-when:`** list that is checkable, not aspirational;
5. **`depends-on:`** listed, even when empty (`—`);
6. an **`area:`** — `kernel | document | apps-web | infra | design`. A reading-profile hint and a
   grouping key. **Not an identity, and not a claim filter** — ownership of a package tree (`apps/web` is
   `amer`'s; everything else is `zayd`'s, per `docs/seats/README.md`) is a separate, standing fact, not
   this field;
7. a **`machine:`** — `any | box | pc`. Where the task must be **executed**. The box is headless, so
   Playwright/WebGL/any browser-only measurement needs `pc`. A task with no `machine:` is refused at claim
   time — see the note below;
8. a **`risk:`** flag (`normal` | `high`) — set at decomposition, and **auto-`high`** when a task touches
   persistent naming (D1), the kernel identity cache (D29), the frozen surface itself, or the invalidator
   in `dependency.ts` (the class of defect `current_state.md §1c-8`'s sweep ledger keeps finding).
   `risk: high` **or** a mechanically-detected `RISK: contract-touching` (`tests/freeze-boundary.test.ts`)
   both make `scripts/agent-finish.mjs` write `NEXT TURN: REVIEW ONLY`, naming the resolved reviewer seat.
   ⚠ They differ in what happens next: `risk: high` buys a **two-step review** (D88, `REVIEW.md`),
   `contract-touching` buys the **owner's merge** (`AGENTS.md §5`);
9. small enough to reach a green `pnpm verify` in one turn.

### `machine:` — the one that is safety-critical

`any` — neither machine's absence changes the result. `box` — the Hetzner dev box (headless: no
Playwright, no WebGL, no browser-only measurement). `pc` — the owner's local PC, **the only machine here
with a real browser**.

`scripts/agent-start.mjs` refuses to claim a task whose `machine:` the current seat cannot satisfy, and
for `pc` it **probes for a real browser** instead of trusting the label
(`BUNYAN_BROWSER_CMD=/path` overrides by naming an executable, never a boolean bypass). Without the
field, a box session would tick a `done-when:` item it physically could not have checked — the exact
failure `current_state.md AGENTS.md §0`'s invariant 9 exists to prevent.

**A `done-when:` list that mixes machines is a task that needs splitting**, not a `machine:` value
chosen generously.

## Status values

Four, and `done` means **merged** — nothing earlier in the list does.

- **`blocked`** — waiting on `depends-on:` or an `open_rulings.md` answer.
- **`ready`** — every READY criterion above is met, nobody has claimed it, and every id in
  `depends-on:` is `done`.
- **`review`** — a builder finished the work and its PR is open. `scripts/agent-finish.mjs` sets this
  itself; a builder finishing a task with no open item left in its `done-when:` list is refused unless
  the row already reads `review`.
- **`done`** — the PR **merged**. Only a reviewer's `scripts/agent-finish.mjs --review` (additive risk)
  or `brahim`'s readiness sweep (confirming a merge via `gh pr list --state merged`, the backstop for a
  `contract-touching` PR the owner merged) ever writes this.

**Why the extra state.** A dependency is satisfied by `done`, never by `review` — an open PR is not a
merged dependency (`scripts/seats.mjs`'s `canClaim` refuses mechanically on this, not just by
convention). Collapsing `review` into `done` at build-finish time — which is what a plain two-state
`ready`/`done` model does — would let a dependent task start against work nobody has reviewed yet,
exactly the race this field exists to prevent. Independent `ready` rows are never held up by this: only
a row that actually names the pending PR's task in its own `depends-on:` waits.

---

## Backlog

> **Decomposed 2026-08-15 (Entry 91); the four owner rulings landed the same day.** Q17a, Q17c, Q18 and
> Q19 are ruled (**D83**–**D86**), so **T-007, T-008, T-009 and T-011 are `ready`** — three of them
> `risk: high`, which means a two-step review that never batches (D88), and T-011 is
> `contract-touching`, so the owner merges that one. **T-010** still waits on T-009; **T-005** now waits on
> **T-018**.
>
> ⚠ **PRs #16 and #17 predated `T-nnn` and were closed, 2026-08-15, by owner ruling** — both were stale
> enough against `main` (real merge conflicts, #17's including a modify/delete conflict on the
> `scripts/prompt-sync.mjs` D82 removed) that rebasing meant re-litigating design choices `main` has since
> moved past. Their work is re-decomposed fresh as **T-018** (D66 lazy-build design + measurement) and
> **T-019** (the move-tool gizmo + corner-drag), against current `main` rather than ported from either
> branch.
>
> `current_state.md §5`'s "Later (post-freeze / v1.0.x)" list is not decomposed here — the freeze has not
> happened, and rows nobody may claim bury rows somebody must.

> **Row order is the sequence, not the id order.** `scripts/seats.mjs`'s `readyFor` takes the first
> `ready` row a machine can satisfy, so this table's order is how the steward sequences work. **T-005
> sits below T-024 deliberately:** its only dependent is T-006, a `pc` row, and no `pc` turn can finish
> until T-020 lands — so building it first advances nothing, while T-020 unblocks that machine entirely.

| ID    | Status  | Task                                                                    | Area     | Machine | Risk   | Depends on |
| ----- | ------- | ----------------------------------------------------------------------- | -------- | ------- | ------ | ---------- |
| T-001 | ready   | The perpendicular-foot snap candidate                                   | apps-web | pc      | normal | —          |
| T-002 | ready   | The two-candidate-line intersection snap                                | apps-web | pc      | normal | T-001      |
| T-003 | ready   | The in-app open-source licences screen                                  | apps-web | pc      | normal | —          |
| T-004 | done    | Does per-element build cost stay flat from 54 to 10,000?                | document | box     | normal | —          |
| T-006 | blocked | D66 §3a/b — the keep-live set and a lazy first paint                    | apps-web | pc      | normal | T-005      |
| T-007 | done    | Q17c — a dangling `designOptionId` becomes a broken ref                 | document | box     | normal | —          |
| T-008 | done    | Q19 — the belongs-to deletion reconciliation                            | document | box     | high   | —          |
| T-009 | done    | Q18 — a hosted void may only host on its host's base part               | document | box     | high   | —          |
| T-010 | ready   | Q18 — two doors on one wall, confirmed in the browser                   | apps-web | pc      | normal | T-009      |
| T-011 | done    | Q17a — `scene.designOptions` becomes a `SceneCollection`                | document | box     | high   | —          |
| T-012 | done    | `--review` routes a PR whose title carries no `T-nnn`                   | infra    | box     | high   | —          |
| T-013 | done    | The seat identity guard — `gh api user` must match the seat             | infra    | box     | high   | —          |
| T-014 | done    | `--review` must read the task's `risk:`, not only the surface           | infra    | box     | high   | —          |
| T-015 | done    | `agent-start.mjs --continue` returns a branch to its builder            | infra    | box     | high   | —          |
| T-016 | done    | `§0b`'s baton carries the builder separately from the holder            | infra    | box     | high   | T-015      |
| T-017 | done    | `docs-budget.test.ts`'s newest-first check verifies itself              | infra    | box     | normal | —          |
| T-018 | done    | D66's lazy-build design doc + measurement, reproduced                   | document | box     | normal | —          |
| T-019 | ready   | The move-tool gizmo + corner-drag, redone against `main`                | apps-web | pc      | normal | —          |
| T-020 | review  | The pinned vitest cannot collect `tests/protocol/*` on Windows          | infra    | box     | high   | —          |
| T-021 | blocked | `pnpm verify` reaches green on the pc, confirmed there                  | infra    | pc      | normal | T-020      |
| T-022 | ready   | `kernel-occt`'s glue decodes from growable WASM memory                  | kernel   | box     | high   | —          |
| T-023 | blocked | The kernel boots on the pc's system Chrome, confirmed there             | apps-web | pc      | normal | T-022      |
| T-024 | ready   | `_baselinedAtEntry` names a position, so a cross-day §7 append goes red | infra    | box     | high   | —          |
| T-005 | ready   | D66 §3c — force-on-measure, and whether `save` reads built              | document | box     | normal | T-018      |

---

### T-001 — The perpendicular-foot snap candidate

The `'perpendicular'` snap kind, which `SnapKind` already declares and nothing produces.

- implements: `docs/design/P4.5_interaction_model_design.md` §4.3 (snap kinds, Tier-1 candidates) ·
  its Q3-ruled priority order `endpoint > intersection > midpoint > grid > perpendicular/extension >
face-plane > free point`
- verify: `pnpm verify`
- done-when:
  - `tool/align.ts` produces a perpendicular-foot candidate from the gesture anchor to a reference edge;
  - it sorts at the Q3-ruled position — **asserted against the ruled order, not against observed output**;
  - ⚠ it carries **no `ref`/`elementId`**, exactly as Entry 84 ruled for the guide: a point reached
    perpendicular to a reference is on no sub-shape, so a hosted-void tool must decline it;
  - **no `SnapKind` is added** — `'perpendicular'` is already declared, so this moves no frozen byte;
  - revert-verified in the real browser: candidate off ⇒ the raw ground point, on ⇒ the foot.
- depends-on: —
- area: apps-web · machine: **pc** · risk: **normal**

### T-002 — The two-candidate-line intersection snap

The second of the two derived kinds §4.3 lists and Entry 84 did not build.

- implements: `docs/design/P4.5_interaction_model_design.md` §4.3 · the same identity rule T-001 applies
- verify: `pnpm verify`
- done-when:
  - the intersection of two candidate lines is produced as an `'intersection'` candidate;
  - ⚠ it owns nothing either — same rule as T-001, and for the same reason;
  - it sorts directly below `endpoint` per the Q3 order;
  - revert-verified in the real browser.
- depends-on: T-001
- area: apps-web · machine: **pc** · risk: **normal**

> ⚠ T-002 depends on T-001 for sequencing, not logic — both land in `tool/align.ts`.

### T-003 — The in-app open-source licences screen

`current_state.md §5` records this as unbuilt and Amer's, in the middle of a row that is otherwise ✅ DONE
— which is how it has stayed invisible since Entry 74.

- implements: `NOTICE` · `licenses/` · `docs/decisions.md` D15 (AGPL-3.0 + commercial)
- verify: `pnpm verify`
- done-when:
  - a reachable screen in `apps/web` renders `NOTICE` and the `licenses/` texts;
  - ⚠ **OCCT's exception is CONDITIONAL on a prominent notice and we ship its binary** — the screen is
    the discharge of that condition, so OCCT's text is present, not summarised;
  - console-error-free boot with the screen open, verified in the real browser;
  - ⚠ it touches **nothing** in `CLA.md` — Q11/Q12 are owner-gated and this task must not appear to
    answer them.
- depends-on: —
- area: apps-web · machine: **pc** · risk: **normal**

### T-004 — Does per-element build cost stay flat from 54 to 10,000?

Entry 90 measured D66's lazy build on **54 elements** and said so explicitly: _"flatness at 54 is not
flatness at 10,000."_ D48's target is 10,000+ and is BINDING, so the extrapolation is the number that
decides whether lazy build helps at the size that matters.

- implements: `docs/decisions.md` D66 · `current_state.md §1a` (the four-axis scale numbers) ·
  `tests/document-heap-scale.test.ts` — **its least-squares approach is the pattern to copy**, per
  Entry 90's own note
- verify: `pnpm test -- document-heap-scale` and `pnpm verify`
- done-when:
  - build cost is measured across at least three element counts, not two, and fitted;
  - the fit is reported as a number in the entry, with the method — **a claim with no method is not
    done** (`AGENTS.md §4.4`);
  - ⚠ if it is **not** flat, that is the result and it is written down as the result. This task is a
    measurement, and a measurement that may only come back one way is not one;
  - `current_state.md §1a`'s cold-load row is updated with what was measured — ⚠ **and not
    re-coloured**, which Entry 90 flagged in advance as the thing a later session would get wrong.
- depends-on: —
- area: document · machine: **box** · risk: **normal**

> ⚠ Ready where T-005/T-006 are not: this names only what is on `main` today.

### T-005 — D66 §3c — force-on-measure, and whether `save` reads built state

The half of D66 that Entry 90 named _"the part that must not be forgotten"_: every aggregate that
quantifies over the model must build what it is about to report, or declare it.

- implements: `docs/design/P5_step9_D66_lazy_build_design.md` §3c (FORCE vs DECLARE) · `§2` (the
  prediction that was wrong) · `docs/decisions.md` D66
- verify: `pnpm verify`
- done-when:
  - ✅ **DISCHARGED BY T-018 — `save` reads no built state.** The partial and the full document
    serialise to byte-identical `Scene` JSON, and `saveBnn` takes a `Scene`, never a `DocumentContext`
    (`tests/d66-lazy-build-measure.test.ts`). This bullet asked the claiming session to measure that
    first; it is measured, so start from it. ⚠ The FORCE/DECLARE choice below is untouched;
  - FORCE or DECLARE is chosen per aggregate (`projectQuantities`, schedules, the Clean Delta, `save`)
    and the choice is justified against the measurement above;
  - ⚠ **`save` is not a design call** — a save that silently omits unbuilt elements is data loss, not a
    reporting shortfall. If the measurement says `save` touches built state, it FORCES;
  - a test that fails in the absence of the fix, revert-verified.
- depends-on: T-018
- area: document · machine: **box** · risk: **normal**

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
- area: apps-web · machine: **pc** · risk: **normal**

### T-007 — Q17c — a dangling `designOptionId` becomes a broken reference

- implements: `open_rulings.md` **Q17c** · `docs/design/P5_step6D_design_options_crud_design.md` ·
  `isElementActive`'s own comment (_"a BROKEN REFERENCE, not a licence to include it … a future body
  surfaces it (domain rule 3)"_ — **that body was never written**)
- verify: `pnpm verify`
- done-when:
  - a dangling `designOptionId` is reported by `brokenRefs()`, which today returns `[]` for it;
  - a test reproduces the silence first — the document accepting a reference it cannot resolve while
    `brokenRefs()` and `unbuildable()` both come back EMPTY — then the fix, revert-verified;
  - ⚠ it **refuses nothing and permits nothing**. Q17c is the one piece that is additive AND
    direction-neutral; widening it into a refusal would pre-empt Q17b.
- depends-on: —
- ✅ **RULED 2026-08-15 — `D86`, as recommended.** ⚠ **D83's (c) half is the same body** — T-008 builds it
  over the `hostId`/`parentElementId` edges and this row builds it over `designOptionId`; whichever lands
  second reuses the first's surfacing path rather than adding a second one.
- area: document · machine: **box** · risk: **normal**

### T-008 — Q19 — the belongs-to deletion reconciliation

⚠⚠ The worst-measured defect open: **a document can report ZERO total volume with `basis: 'exact'` and
every diagnostic empty**, reached by deleting a parent element. Needs no reserved-arg misuse.

- implements: `docs/decisions.md` **D83** (the ruling) · D39 (cascade) and D67 (exclusion) — ⚠ **both
  owner-ruled, and the gap between them is the defect** · Entry 85's `hostId` half
- verify: `pnpm verify`
- done-when:
  - **(a) cascade** — `cascadeOf` extends to the `parentElementId` edge, so deleting a parent deletes its
    members;
  - **(c) surface** — a dangling ancestor becomes a visible broken reference; ⚠ **(b) refuse is ruled
    OUT** and must not be built, so `core.deleteElement`'s `argsSchema` does not move;
  - ⚠ **BOTH edges are covered**, `parentElementId` AND `hostId`. Entry 85 found the same hole on
    `hostId` with a narrower population; a reconciliation covering one _fixes half the defect_;
  - ⚠ `tests/belongs-to-cycle-guard.test.ts` **is supposed to fail when this lands** — it pins D39
    cascading `hostId` only. Come past it deliberately, and update it in the same PR;
  - the zero-volume walk is reproduced as a red test first, then closed.
- depends-on: —
- ✅ **RULED 2026-08-15 — `D83`, (a) + (c) as recommended.** ⚠ (a) is ruled **on the condition that groups
  stay a v1.0.x reservation**; if group authoring ever ships, this comes back to the owner.
- area: document · machine: **box** · risk: **high**

> `risk: high` — it edits the cascade walk and the exclusion predicate (the auto-`high` list above).

### T-009 — Q18 — a hosted void may only host on its host's base part

The second door placed on a wall by clicking comes back `broken-ref`, because the pick hands the tool a
face of the wall _as already cut_.

- implements: `docs/decisions.md` **D84** (the ruling) · D12 (opening anchoring), D51 (refuse-or-retarget)
- verify: `pnpm verify`
- done-when:
  - the rule is enforced **where the meaning lives** — the document layer, which knows which node is a
    base part. ⚠ **Not in the tool**: every fix available to `apps/web` is a token-parse, and _"ids are
    opaque — never parse them"_ is standing;
  - ⚠ it is **not tool-specific** — an agent calling `core.createElement` with the same ref gets the
    same broken element, so the test goes through the verb, not through the gesture;
  - revert-verified headlessly on the document layer.
- depends-on: —
- ✅ **RULED 2026-08-15 — `D84`, as recommended: the document-layer rule.** ⚠ The louder
  `core.createElement` refusal was the named alternative and is **not** what was ruled — do not build it.
- area: document · machine: **box** · risk: **high**

### T-010 — Q18 — two doors on one wall, confirmed in the browser

- implements: `open_rulings.md` **Q18** · T-009's document-layer rule
- verify: `pnpm verify`, plus the gesture in the real browser
- done-when:
  - click 1 and **click 2** on the same wall both come back `state: 'valid'` with `parts: [leaf, frame]`;
  - console-error-free boot;
  - ⚠ measured **in the browser on this machine** — `AGENTS.md §4.9`: only `amer`/`khalihlna` may report
    this as passing.
- depends-on: T-009
- area: apps-web · machine: **pc** · risk: **normal**

> ⚠ Split from T-009 because the rule is headless (box) and the gesture is browser-only (pc); one row
> would let a box seat tick a criterion it cannot run.

### T-011 — Q17a — `scene.designOptions` becomes a `SceneCollection`

⚠⚠ `RISK: contract-touching` **before it is written** — `type SceneCollection` is a watched declaration,
so the owner merges this one as well as ruling it.

- implements: `docs/decisions.md` **D85** (the ruling) ·
  `docs/design/P5_step6D_design_options_crud_design.md` §1 (the walk), §3 (data-additive YES,
  freeze-additive NO) · `docs/decisions.md` D65, D79 (materialise-on-first-authoring)
- verify: `pnpm verify`
- done-when:
  - `core.createDesignOption`/`update`/`delete` ship, and 0-of-40-commands-can-author-an-option is closed;
  - ⚠ **D79's materialise-on-first-authoring trick transfers verbatim** — no `emptyScene()` entry, **no
    `SCENE_SCHEMA_VERSION` bump**, and a document with no options stays **byte-identical**;
  - ⚠ the edge is **not** the "nothing" `schedules`/`views` declared — an option edit changes which walls
    the join resolver can see (D68's ambiguity flip), so a "nothing" here reproduces D68 from the
    authoring side;
  - the compiler's `TS2345` in `dependency.ts`'s exhaustive switch is closed (Entry 33's mechanism);
  - the 50% under-report walk is reproduced red first, then closed.
- depends-on: —
- ✅ **RULED 2026-08-15 — `D85`, as recommended: ship the unit.** ⚠ Ruling it did **not** make it
  mergeable by a seat — it is still `RISK: contract-touching`, so the owner merges the PR too.
- ✅ **MERGED 2026-08-17 — PR #32, `c18ae8e`, by `brahim` under the owner's explicit one-off
  authorization**, recorded because `AGENTS.md §5` reserves this merge to the owner: they closed the PR
  by mistake from the GitHub UI, then authorized the reopen and merge in their place. Re-confirmed first
  on the conflict-resolved tip `40859fd` — `hmdnah`'s approval intact, both CI jobs green, and
  `packages/` plus every T-011 test byte-identical to the approved `0a641b3`, so only bookkeeping files
  moved after approval. The frozen-surface re-baseline this carries is pre-freeze under D85; **the P5
  freeze itself is untouched and remains the owner's separate act.**
- area: document · machine: **box** · risk: **high**

### T-012 — `--review` routes a PR whose title carries no `T-nnn`

`scripts/agent-start.mjs --review` calls `reviewerFor` only when the PR title matches `^T-\d{3}` (line 395) — narrower than `seats.mjs`'s own `titleRoutes`/`PR_TITLE_RE`, which also accepts `STEWARD: `.
**Every `STEWARD:`-titled PR recurs into this gap, not only the two PRs that first found it** — PR #25
needed `hmdnah` to hand-claim it twice, because a steward turn is never a `T-nnn`, and a steward turn is
the routine case, not an edge case (`AGENTS.md §1.3`). #16 and #17 predate the scaffolding that enforces
`titleRoutes` at PR-creation time (`793a1f0`) and were closed, 2026-08-15, stale enough (real conflicts
against `main`) that the owner chose re-decomposition over rebasing through this mechanism (T-018,
T-019) — they no longer motivate the fix; recurring `STEWARD:` review-routing does.

- implements: `AGENTS.md` §0 (identity is role + machine) and §1.2 (review is routed by machine) ·
  `scripts/seats.mjs`'s `reviewerFor`/`machineOf` · this file's `## Discovered` entry of 2026-08-15
- verify: `pnpm verify`
- done-when:
  - a PR with no `T-nnn` in its title routes to the reviewer on **the machine its work was executed on**,
    derived from the branch's seat prefix (`zayd/…` ⇒ box ⇒ `hmdnah`, `amer/…` ⇒ pc ⇒ `khalihlna`,
    `brahim/…` ⇒ box ⇒ `hmdnah`) — this is the `STEWARD:` case, not only the legacy one;
  - ⚠ **the fallback derives the machine, never widens it** — a browser-only PR must not become claimable
    by a headless seat, which is the failure `machine:` exists to prevent;
  - a branch prefix naming no known seat routes to nobody and says so, rather than defaulting;
  - ⚠ a `T-nnn` in the title still wins — the fallback is only for its absence;
  - tested against real fixture git histories, as `tests/protocol/` already does, not by grepping the
    script;
  - revert-verified: without the fix, a fixture PR titled without a `T-nnn` routes to nobody.
- depends-on: —
- area: infra · machine: **box** · risk: **high**

> `risk: high` — it decides which machine reviews a claim, which `Brahim_Prompt.md` names the
> safety-critical act.

### T-013 — The seat identity guard — `gh api user` must match the seat

⚠⚠ Measured 2026-08-15: `gh` on box held only `Davidian-Abdo`, so `hmdnah` could not approve at all —
GitHub refused with _"Can not approve your own pull request"_ — while `gh pr merge` was **not** blocked
for a repo admin. A seat that has just been refused a review can still merge.

- implements: `docs/decisions.md` **D87** · `AGENTS.md` §0 (crossed accounts) and §6 (the author never
  merges their own entry) · `scripts/seats.mjs`'s `accountOf`
- verify: `pnpm verify`
- done-when:
  - `scripts/agent-start.mjs` resolves `gh api user --jq .login` and **refuses the turn** when it does not
    equal `accountOf(seat)`;
  - ⚠ the refusal names both accounts — a guard that says only "wrong account" sends the reader to the
    wrong file;
  - ⚠ **an unresolvable identity is a REFUSAL, never a skip** — `current_state.md §1d`'s standing lesson
    that a gate's hard part is the skip, and Entry 88 shipped three defects of exactly this shape;
  - the per-seat token file convention is documented in `docs/RUNBOOK.md`, with the file mode;
  - revert-verified: with the guard removed, a fixture seat carrying the wrong account starts its turn.
- depends-on: —
- area: infra · machine: **box** · risk: **high**

> `risk: high` — with Q13 ruled _neither public nor Pro_ (D87), branch protection is unavailable, so this
> guard is the **only** thing preventing a self-approving merge.

### T-014 — `--review` must read the task's `risk:`, not only the frozen surface

⚠⚠ Measured 2026-08-15 on **T-008** (`risk: high`, mechanically `RISK: additive`): `agent-finish.mjs
--review` flipped the row to `done` and printed `gh pr review 23 --approve && gh pr merge 23 --squash`
for a PR that had had one review turn of the two D88 requires. The reviewer corrected the row by hand.

- implements: `docs/decisions.md` **D88** · `AGENTS.md` §1.2 · `REVIEW.md` §"Two steps" ·
  `scripts/agent-finish.mjs`'s `--review` path
- verify: `pnpm verify`
- done-when:
  - `--review` resolves the claimed task's `risk:` field from `docs/BACKLOG.md` and takes a `--step 1|2`,
    refusing a `risk: high` PR that names no step;
  - on step 1 the row stays `review`, no approve/merge command is printed, and the PR gets a
    **`review/step-1` label** — that label is what routes step 2 (D88 as amended);
  - `agent-start.mjs --review` reads the label and tells the reviewer which step it is running, refusing
    to guess when a `risk: high` PR carries none;
  - ⚠ **the label is created if absent** — `gh pr edit --add-label` fails on a label the repo does not
    define, and `review/step-1` does not exist today;
  - on step 2 the row goes `done` and the two commands print as they do today;
  - a `risk: normal` PR is unchanged, and `--step` on one is refused rather than ignored;
  - ⚠ **an unreadable or absent `risk:` field is a REFUSAL, never a default to `normal`** — the same skip
    that `T-013` guards against, and the shape Entry 88 shipped three of;
  - revert-verified on the step-1 path: with the fix removed, a `risk: high` step 1 stamps `done` again.
- depends-on: —
- area: infra · machine: **box** · risk: **high**

> `risk: high` — this is the gate that decides whether other gates run. ⚠ Its own review runs under the
> **old** script, so step 1 must check the row's status by hand.

### T-015 — `agent-start.mjs --continue <T-nnn>` — the branch returns to its builder

D88 says a defect either review step proves goes back to the builder on the existing `§0b` claim. Nothing
implements it: `agent-start.mjs` refuses a named task whose row is not `ready`, `seats.readyFor`
enumerates `ready` rows only, and a claim reading `finished — PR open, awaiting review` is refused as
_"not an incomplete turn to continue"_.

- implements: `docs/decisions.md` **D88** (as amended) · `REVIEW.md` §"Two steps" ·
  `scripts/agent-start.mjs`'s claim path · `scripts/seats.mjs`'s `canClaim`
- verify: `pnpm verify`
- done-when:
  - `--continue <T-nnn>` checks the task's branch out and leaves the row at `review`;
  - ⚠⚠ **the admitted seat is DERIVED from the task row, never read from the `§0b` baton** — a new
    `builderFor(root, taskId)` in `seats.mjs`, symmetric with `reviewerFor`: resolve the task's
    `machine:`, then `registry.find(r => r.role === 'builder' && r.machine === m)`, with the same `any`
    fallback shape `reviewerFor` already carries. Not `area:` — this file's own definition of that field
    (above) says it is a reading-profile hint, never a claim filter, and hardcoding `apps-web ⇒ amer,
else zayd` would diverge from `canClaim`'s machine gate the moment a row's `area:` and `machine:`
    disagree. **Measured 2026-08-15: the baton names the last seat to FINISH, not the builder** — T-008's
    reads `seat: hmdnah / role: reviewer` while its claim commit reads `claim: T-008 by zayd (box)`,
    because `agent-finish.mjs` rewrites the baton on the `--review` path too. A gate on the baton admits
    the reviewer and refuses the builder in every intended invocation;
  - ⚠ **it refuses for any other seat** — `--continue` must not become a second door onto work someone
    else is holding;
  - **it requires an open PR whose title names the task, and reads the row status from that PR's
    branch** — the `ready`→`review` flip lives on the unmerged branch, so a gate reading the working tree
    after `git checkout main` reads `ready` and refuses every real case;
  - the finish path prints no `gh pr create` line when the PR is already open — it prints the PR's own
    URL instead;
  - ⚠ **`--continue` never widens what a plain claim may take** — revert-verified that a `ready` row
    belonging to another seat is still refused through both doors;
  - revert-verified: without the fix, resuming a finished claim on a `review` row is refused.
- depends-on: —
- area: infra · machine: **box** · risk: **high**

> ⚠ **T-008 is waiting on this** — its two review defects go back to `zayd` through this route, by owner
> ruling, rather than being fixed off-protocol first.

### T-016 — `§0b`'s baton carries the builder separately from the current holder

Owner ruling 2026-08-15: fix the baton itself, not only route around it (T-015). `current_state.md §0b`
names only the seat that finished the CURRENT turn — after any review turn that is the reviewer, and the
builder's identity survives only in the claim commit message, never in `§0b` (`## Discovered`,
2026-08-15).

- implements: `current_state.md §0b` · `scripts/agent-finish.mjs`'s baton-write step
- verify: `pnpm verify`
- done-when:
  - the baton block carries a `builder` field distinct from `seat`/`role`, written once at the claim
    (`agent-start.mjs`) and never overwritten by a later `--review` finish;
  - `agent-finish.mjs`'s `--review` path updates `seat`/`role`/`status` and leaves `builder` as the
    claiming turn wrote it;
  - a plain (non-`--review`) finish sets `builder` to the finishing seat, matching a first-time build's
    current behaviour;
  - revert-verified: without the fix, a review-turn finish on a fixture reproduces the measured defect —
    `builder` overwritten with the reviewer's seat.
- depends-on: T-015
- area: infra · machine: **box** · risk: **high**

> Sequenced after T-015 because both write `agent-finish.mjs`'s baton step; running them in parallel
> branches would conflict there.

### T-017 — `docs-budget.test.ts`'s "newest-first" check verifies its own construction, not order

`parseAbstracts` assigns `n = 1000 - i` to every new-scheme (`T-nnn`/`STEWARD-slug`) entry by its
position in the walk alone (`docs-state.mjs`, "SYNTHETIC SORT KEYS"). `docs-budget.test.ts`'s "numbers
entries uniquely and monotonically" case then asserts those same positionally-derived numbers are
descending — true by construction, whatever §7's real order is. Not filed until now
(`current_state.md`, 2026-08-15).

- implements: `tests/docs-budget.test.ts`'s "numbers entries uniquely and monotonically" case
- verify: `pnpm verify`
- done-when:
  - the newest-first check compares an independently-authored signal — each entry's own `date:` field —
    never the positional `n` derived from the same walk;
  - two same-date entries pass in either relative order — the field has day granularity, not enough to
    order same-day entries;
  - revert-verified: a fixture with an out-of-date-order new-scheme entry (an older date above a newer
    one) fails the check today's version passes.
- depends-on: —
- area: infra · machine: **box** · risk: **normal**

### T-018 — D66's lazy-build design doc + measurement, reproduced against `main`

`docs/design/P5_step9_D66_lazy_build_design.md` and `tests/d66-lazy-build-measure.test.ts` existed only on
closed PR #16 (14 commits stale, real conflicts) and never landed on `main`. `T-005`/`T-006` both
`implements:` this doc.

- implements: `docs/decisions.md` D66 · `current_state.md §1a`'s open cold-load row
- verify: `pnpm verify`
- done-when:
  - the design doc answers, measured fresh against `main` rather than ported from the closed PR: what
    fraction of a cold load is FORCED vs. deferrable; whether a partially-built document agrees with a
    fully-built one on `nodeId`s/`refs`/quantities, including across a join (a wall whose corner partner
    is never built — `resolveJoins` must read the recipe, never the built set, or the doc says so and why
    that is unsafe); whether the build half needs a new API, or `rebuildOnly` already suffices;
  - the measurement instrument is a committed test file, not a one-off script;
  - §3a (keep-live set) / §3b (first paint) / §3c (force vs. declare) are each named as a section T-005
    and T-006 can cite by number;
  - revert-verified: the instrument's identity-comparison assertion fails if `Part.nodeId` is read
    instead of `Part.refs` — a weak-green shape the closed PR's own review caught once already, worth
    keeping as a tripwire. ⚠ This read `Part.node` when written, a field that has never existed
    (`entities.ts:683`); corrected by `brahim` after the merge, and the tripwire was built against
    `nodeId`.
- depends-on: —
- area: document · machine: **box** · risk: **normal**

### T-019 — The move-tool gizmo + corner-drag, redone against `main`

Baseline-endpoint handles and single-corner drag (D80's move verbs, `unbuildable`-checked and
`transactionId`-atomic) shipped on closed PR #17 (9 commits stale, conflicts with the prompt-sync removal
D82 made). `current_state.md §5` (Amer, item 3) still names this open.

- implements: `docs/decisions.md` D80 · `docs/design/P4.5_interaction_model_design.md` ·
  `current_state.md §5` (Amer, item 3)
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
- area: apps-web · machine: **pc** · risk: **normal**

### T-020 — The pinned vitest cannot collect `tests/protocol/*` on Windows

`pnpm verify` cannot reach green on the pc for **any** task, so `agent-finish.mjs` refuses every
`amer`/`khalihlna` turn. Measured there: `vitest run` (pinned `^2.1.8`, installed `2.1.9`) throws
`SyntaxError: Invalid or unexpected token` collecting five `tests/protocol/*.test.ts` files, while `tsc`,
esbuild, Vite's transform, `vite-node` and `npx vitest@latest` (4.1.10) all parse the same files cleanly
and CI's Linux runner is green on the identical command.

- implements: this file's `## Discovered` entry of 2026-08-17 · `current_state.md §6` (`verify` **is** the
  CI step list, exactly) · `AGENTS.md §1.1` (a finish requires unconditional green)
- verify: `pnpm verify`
- done-when:
  - the runner is moved to a major the pc measured green, and `package.json`'s pin and the lockfile move
    together;
  - ⚠ **the suite count is reported before and after, and is unchanged** — a major bump that silently
    stops collecting a file reports _fewer_ tests and a green run, which is this defect's own shape
    (`current_state.md §1c-7`);
  - every vitest API the suite and `vitest.config.ts` use that changed between the two majors is
    enumerated and each call site checked — invariant 7's backward sweep, over the config too;
  - CI green on the self-hosted runner (D89);
  - ⚠ **no item here claims the pc is fixed.** The box cannot reproduce a Windows-only collection
    failure, so the entry writes `unverified here: the five protocol files collect on Windows — the pc
seats to confirm`, and T-021 is what closes it.
- depends-on: —
- area: infra · machine: **box** · risk: **high**

> `risk: high` — it replaces the runner every gate in `pnpm verify` depends on, including the gates that
> would catch its own regressions.

### T-021 — `pnpm verify` reaches green on the pc, confirmed there

- implements: T-020's bump · `AGENTS.md §4.9` (only a pc seat may report a pc-only claim)
- verify: `pnpm verify`, on the pc
- done-when:
  - the five `tests/protocol/*.test.ts` files collect and pass on the pc;
  - `pnpm verify` exits 0 there — which it has never done;
  - revert-verified: restoring the `^2.1.8` pin reproduces the collection `SyntaxError`;
  - ⚠ measured **on this machine**, and it is the first turn that may tick T-020's deferred claim.
- depends-on: T-020
- area: infra · machine: **pc** · risk: **normal**

> Split from T-020 because the fix is a dependency bump the box and CI must verify, and the failure it
> closes reproduces only on Windows — one row would let a box seat tick a criterion it cannot run.

### T-022 — `kernel-occt`'s glue decodes from growable WASM memory

The shipped kernel does not boot on Chrome 149+: `TextDecoder.decode` now refuses a view whose backing
`ArrayBuffer` is resizable, which is how Chrome exposes growable WASM memory, and
`packages/kernel-occt/wasm/bunyan-kernel.js` decodes UTF-8 straight off `HEAPU8`. Measured on the pc —
Chromium 145 and 148 boot, 151 hangs on "Booting OCCT kernel…" — and reproduced against unmodified `main`,
so it is pre-existing and not `apps/web`'s.

- implements: this file's `## Discovered` entry of 2026-08-17 · `current_state.md §1c-9` (**measure the
  artifact, not the manual**) · `§6` (the link recipe) · Q14/Entry 79 (the proven toolchain pin)
- verify: `pnpm verify`
- done-when:
  - the emitted `bunyan-kernel.js` no longer decodes from a view of growable memory — asserted against
    **the artifact**, because its doc-comments and its emitted bytes have disagreed before (§1c-9);
  - a committed test pins that, so a later relink cannot reintroduce it silently;
  - ⚠ **the pin is re-proved or deliberately moved.** Entry 79 proved relinking on the pinned emsdk digest
    reproduces the committed artifact byte for byte. An emsdk bump moves `tools/kernel-build/toolchain.json`
    and re-proves it the same way; a post-link patch leaves the pin alone and belongs in the recipe, never
    as a hand edit to a generated file;
  - ⚠ **measure the cost before choosing.** An emsdk bump may invalidate the OCCT static libs prebuilt
    under the current pin at `~/occt-wasm-spike/install`, turning a ~60–74 s link into a 2.5 h rebuild
    (`current_state.md §6`); if it does, the patch path is preferred and the entry says so with the number;
  - the suite stays green, count reported;
  - ⚠ **no item here claims a browser boot.** Measured on box: Node 20.20.2 decodes a resizable-backed
    view without complaint, so the runtime here cannot reproduce Chrome's refusal. The entry writes
    `unverified here: the kernel boots on Chrome 151 — the pc seats to confirm`, and T-023 closes it;
  - ⚠ box discipline (`§6a`): the container stays capped, and an OCCT **version** bump is out of scope.
- depends-on: —
- area: kernel · machine: **box** · risk: **high**

> `risk: high` — it changes the committed WASM artifact and touches the toolchain pin, the two things
> every geometric claim in the repo is measured against.

### T-023 — The kernel boots on the pc's system Chrome, confirmed there

- implements: T-022's fix · `AGENTS.md §4.9`
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

### T-024 — `_baselinedAtEntry` names a position, so a cross-day §7 append goes red

`docs-state.mjs` mints new-scheme entry numbers as `1000 - i` over §7's array order, so `1000` means
"whatever is newest" rather than a fixed turn. `baselineEntryIssues` then compares `_baselinedAt` against
that moving entry's date, and any turn that appends a §7 abstract on a later day than the baseline fails
`tests/freeze-boundary.test.ts` having moved no declaration.

- implements: this file's `## Discovered` entry of 2026-08-17 · `scripts/frozen-surface.mjs`'s
  `baselineEntryIssues` · `scripts/docs-state.mjs` ("SYNTHETIC SORT KEYS") · Q15
- verify: `pnpm verify`
- done-when:
  - a new-scheme abstract carries a **stable identity** — its `T-nnn`/`STEWARD-slug` with its date, or a
    minted monotonic number — and `_baselinedAtEntry` records that, not a position;
  - appending a §7 abstract on a later day leaves `freeze-boundary` green when no declaration moved,
    measured on the one turn that hit it, `STEWARD-unblock-pc-and-chrome-boot`;
  - ⚠ **the gate is repaired, not removed** — a baseline whose recorded date genuinely disagrees with the
    entry that authorised it must still fail;
  - ⚠ **this lands before the P5 freeze.** After it the baseline may not be rewritten without an owner
    ruling, so today's only remedy — `pnpm state --rebaseline` to record nothing — stops being available
    and the gate has no green path at all;
  - revert-verified: the pre-fix scheme reproduces the red on a fixture whose newest abstract postdates
    the baseline.
- depends-on: —
- area: infra · machine: **box** · risk: **high**

> `risk: high` — it is the freeze gate itself, and `AGENTS.md §5` makes the P5 freeze the one
> irreversible act.

## Discovered

_(unplanned findings land here — never claimed in the same turn that found them, per `AGENTS.md §3`)_

- **2026-08-18 — `agent-finish.mjs --review` prints `gh pr merge` on an owner-gated PR, because it reads
  `pnpm state`'s risk verdict and not `reserved-classes.mjs`'s class.** The two disagree by construction
  on a re-baseline: PR #36 moved 0 of 214 declarations, so `state.mjs` returns `RISK: additive`, while
  `reserved-classes.mjs` returns `⇒ OWNER-GATED` on `needs-operator/freeze` and CI applies that label.
  Measured on #36 — both commands printed, neither run. Only `REVIEW.md` item 7's ⚠ (_"any
  `needs-operator/*` label ⇒ you do not merge"_) stands between the printed command and a seat merging an
  owner-gated PR, which is an instruction where `T-014` established a gate belongs — the same shape, in the
  same script, for the freeze class instead of `risk: high`. Fix shape: `--review` resolves the reserved
  classes it already has a module for, and suppresses the merge commands whenever one is present, rather
  than deriving merge-ability from the frozen-surface diff alone. Found by `hmdnah` reviewing #36.
  Recorded, not claimed.
- **2026-08-18 — every merge lands a branch-shaped `§8` on `main`, so the next builder's
  `agent-start.mjs` measures a disagreement and refuses.** `§8` is regenerated on the task branch, where
  its `branch · tip · tree`, `open PRs` and `diff vs origin/main` rows describe that branch; the merge
  commits those rows verbatim onto `main`, where they are false. Measured by `zayd` opening T-018:
  `main`'s committed `§8` still read `RISK: contract-touching (re-baselined)` from the T-011 branch while
  the repo measured `additive`, and the turn was refused at step 3. Already worked around twice by hand —
  `faf7d31` is a bare `pnpm state` regen of `main` for this reason. The refusal itself is correct and is
  the mechanism `AGENTS.md §1.1` wants (_trust the repository_); what is wrong is that a clean merge
  guarantees the disagreement. Fix shape: either the reviewer's `--review` finish regenerates `§8` from
  `main` after merging, or the branch-scoped rows leave the committed `§8` altogether — they describe a
  branch, and `§8` on `main` is read as describing `main`. Found by `zayd` on T-018. Recorded, not claimed.

- **2026-08-17 — ⚠⚠ `pnpm verify`'s test step cannot collect five `tests/protocol/*.test.ts` files on
  this pc (Windows), so `pnpm verify` cannot go green here regardless of task.** `vitest run` (pinned
  `^2.1.8`, installed `2.1.9`) throws `SyntaxError: Invalid or unexpected token` parsing an em-dash
  (U+2014) inside each file's header block comment — reproduced independently on `pr-ready`, `agent-finish`,
  `agent-start`, `reserved-classes` and `seats`. Not the file content: `tsc`, raw `esbuild` (two versions),
  Vite's own transform, and `vite-node` all parse each file cleanly; `npx vitest@latest` (4.1.10) runs the
  same file 8/8 green; CI's Linux runner is green on the identical command (PR #18). Reproduces on two
  Node builds (24.11.0, a portable 20.18.1) — narrows to the pinned vitest/esbuild pair on Windows, not
  Node version. Since these five files landed on `main` at Entry 91 (D82) and every branch descends from
  it, **this blocks `agent-finish.mjs` — which requires unconditional green `pnpm verify` — for every
  future `amer`/`khalihlna` turn on this machine**, independent of what the task touches. Fix shape: a
  vitest major bump (2→4, per the working `@latest` run) or an esbuild-level workaround; either is
  infra/box territory and needs cross-platform (CI) verification before landing, not a pc-side patch.
  Found by `amer` on T-001, whose branch has real, tested, browser-verified work but no PR because of
  this. Recorded, not claimed.
- **2026-08-17 — this pc's system Chrome (151.0.7922.138) cannot boot the OCCT kernel at all** — hangs on
  "Booting OCCT kernel…", throwing `Failed to execute 'decode' on 'TextDecoder': The provided ArrayBuffer
value must not be resizable` from the kernel worker's boot path (`packages/kernel-occt/wasm/bunyan-kernel.js`).
  Confirmed pre-existing (reproduces against unmodified `main`). A/B against cached Playwright Chromium
  builds: 145.0.7632.6 and 148.0.7778.96 boot cleanly, 151.0.7922.34 does not — the regression window is
  Chrome 149–151, and it is in `kernel-occt`'s boot path, not `apps/web`. ⚠ **Worked around for this
  machine, not fixed**: `BUNYAN_BROWSER_CMD` (`scripts/seats.mjs`'s documented override) is now set as a
  persistent Windows user env var, pinned to the cached
  `%LOCALAPPDATA%\ms-playwright\chromium-1223\chrome-win64\chrome.exe` (148.0.7778.96) — takes effect on
  the next fresh session/process, not the one that set it. A real fix (kernel-occt boot path handling a
  non-resizable `ArrayBuffer`) is `zayd`'s, and needed before this machine can trust its default browser
  again. Found by `amer` on T-001; env var set by `light_brahim` the same cycle. Recorded, not claimed.
- **2026-08-17 — ⚠⚠ wall joins are not level-scoped, so stacking an ordinary building's storeys drops the
  miter on the storey below.** `partnersAt`/`throughWallsAt` match baselines in 2D and `indexOf` indexes
  every element in the scene with a baseline; neither consults `containerId`, the level's elevation, or the
  wall's own base/top datums. Measured through the shipped verbs on the real kernel: one storey with a 90°
  corner gives `resolveJoins(a) = ['start']` and the wall's solid reaching `min.x = -100 mm` (the miter);
  authoring the SAME corner one level up takes the lower wall to `resolveJoins(a) = []` and `min.x = 0` —
  the crowd of coincident endpoints reads as ambiguous and the auto-miter falls back to the plain cap. Two
  walls stacked at the same plan position on different storeys is the ordinary case in any multi-storey
  building, so this is not an edge case; it is D68's ambiguity flip arriving through elevation instead of
  through design options, and it changes geometry on a storey nobody edited. Fix shape: scope the endpoint
  and segment scans to walls that share a vertical extent — the datums `baselineOf`/`elevationOf` already
  resolve — rather than to every wall in plan. Found by `zayd` building T-018's fixture (which offsets each
  storey in plan to work around it). Recorded, not claimed.
- **2026-08-17 — `NEXT TURN: REVIEW ONLY` is cleared only on a `--review` finish, so a PR merged any other
  way strands the banner and halts every builder turn on both machines.** `agent-finish.mjs:335` gates the
  clear on `if (review)`; `agent-start.mjs:789` refuses a builder claim while it stands. T-011's banner
  reached `main` with PR #32 and outlived it — the owner-authorized merge ran no `--review` finish — leaving
  no script path to clear it: a builder turn is refused by the banner, `--review` refuses with no open PR,
  and a steward finish does not touch it. Cleared by direct commit, as the merged-PR backstop
  (`docs/prompts/brahim-orchestrator.md` step 4a) repairs the same omission's other half. Fix shape: clear
  the banner on every finish whose task the banner names, not only `--review` — the banner addresses the
  next session, and which finish retires it is not the banner's business. Found by `brahim` delegating the
  first builder turn after #32. Recorded, not claimed.
- **2026-08-17 — `agent-finish.mjs` runs `pnpm verify` (step 1) before regenerating §8 (step 2), so every
  turn that edits §7 burns a full verify before failing.** Seen twice today: the run dies red on
  `§8 agrees with §7 about which entry is newest` after ~9 minutes, and the seat must run `pnpm state` and
  verify again. Costs ~9 minutes on most turns; the fix is step ordering in the writer, not a protocol
  question.
- **2026-08-17 — the orchestrator loop and its subagents contend for one working tree.**
  `docs/prompts/brahim-orchestrator.md` step 2 runs `git checkout main` every cycle, but a spawned subagent
  holds the same checkout on its task branch for the length of its turn, so any cycle overlapping a running
  subagent aborts there. Git refuses cleanly and it self-resolves when the subagent finishes, so it is a
  protocol wording/isolation question (a worktree per subagent, or "skip step 2 while a subagent holds the
  tree"), not a repo fault. ⚠ Step 2 currently says a failed pull is a stop-and-report, which would report
  a healthy state as a fault.
- **2026-08-17 — T-017's review left two `OWES: brahim` follow-ups**, recorded here so they outlive §7's
  rotation; detail is in that entry's abstract and body. `docs-state.mjs`'s "SYNTHETIC SORT KEYS" comment
  now cites a gate that holds only to day granularity without saying so, and `frozen-surface.mjs:269`
  resolves `_baselinedAtEntry` through `.n` — a position rather than an identity for a new-scheme entry, so
  `1000` always finds whatever sits on top of §7 (pre-existing, guarded by the date cross-check beside it).
- **2026-08-17 — `agent-start.mjs`'s named-task claim path never consults `liveClaims`, so a finished task
  is claimable by name.** The auto-select path skips a held row on both disjuncts (`agent-start.mjs:809-825`
  — another seat's claim, or a `finished` status); the `wantTask` path above it (`:796-806`) checks only
  `rowStatus === 'ready'` and `canClaim`. Measured on T-011, whose row on `main` reads `ready` while PR #32
  is open and approved: `node scripts/seats.mjs can-claim zayd T-011` answers `yes`, and `ready-for zayd`
  lists it first. Reachable only by naming the task explicitly — the loop's own builder turns pass no task
  and are therefore safe — so recorded rather than decomposed. ⚠ The `ready`-on-`main` half is by design
  (the `ready`→`review` flip lives on the unmerged branch, T-015), which is why the live-claim check is the
  only thing standing here.
- **2026-08-17 — T-016 step 2 left two `OWES: brahim` follow-ups**, recorded here so they outlive §7's
  rotation; the measurement and reasoning are in that entry's abstract and body, not restated. (1) An
  end-to-end test of `agent-finish.mjs`'s baton write — closable, but it changes `zayd`'s harness with a
  113-test blast radius. (2) Four copies of one rationale, all stale since T-016 merged
  (`agent-start.mjs` `~48`/`~499`, `seats.mjs` `~459`, `tests/protocol/seats.test.ts` `~306`) — wants one
  copy and three pointers per `AGENTS.md §7.2`, not a fourth rewrite. Neither is decomposed: (1) is a
  builder-harness call and (2) spans files outside any one task's diff.
- **2026-08-17 — a step-1 review's `review/step-1` label can land while its findings comment does not, and
  the §7 abstract still claims the comment was posted.** Measured on PR #33 (T-016): the label was applied
  at 11:33:05Z and the abstract reads _"Findings posted as a PR comment on #33"_, but the PR's six comments
  are three auto-claims and two housekeeping notes — no report. Step 1's findings survive only on the
  branch (`handoff/hmdnah/2026-08-17-T-016-review-step1.md` and its §7 abstract), so a step-2 session
  reconciling against the PR alone finds nothing to reconcile against. The opposite direction of `T-014`'s
  OWES note, which named a report with no label; nothing checks either way. Recorded rather than
  decomposed — step 2 reads the branch body instead.
- **2026-08-17 — `agent-finish.mjs` resolves a turn's handoff body by ALPHABETICAL order, so a second turn
  on the same task and the same date cannot finish.** Step 3 takes
  `readdirSync(handoff/<seat>).filter(f => f.includes(task)).sort().at(-1)` and requires the newest §7
  abstract's `FULL:` to name it — correct only while the date prefix separates the candidates. A D88
  defect return is exactly the case it does not: `zayd` wrote two `2026-08-17-T-011-*` bodies, and the
  gate demanded the _earlier_ one (`…-reserved-comment-sweep`, which sorts after `…-invalidator-…`) be
  linked from the entry describing the _later_ one. Worked around by naming the new body so it sorts last;
  the next same-day return will hit it again. Fix shape: resolve the body by the abstract's own `FULL:`
  field and check that the file exists, rather than deriving the filename and checking the field — the
  entry is the authority on which body it has, and the derivation adds nothing the check needs. Found by
  `zayd` finishing the T-011 defect return. Recorded, not claimed.
- **2026-08-17 — the "exactly one primary per set" invariant is enforced at the CRUD doors only, and two
  of the three roads onto `scene.designOptions` bypass it.** `checkPrimaryInvariant` (T-011/D85) guards
  `core.createDesignOption`/`update`/`delete`; a loaded `.bnn` and a `Scene` assembled in code do not go
  through any of them, and `loadBnn`'s new `designOptions` guard checks only that the value is an object.
  Measured: with `{option-a: isPrimary:true, option-b: isPrimary:true}` in one `setName`,
  `isElementActive` returns `true` for **both** mutually exclusive walls, because `ownTagActive` answers
  `option.isPrimary` when the set is unlisted in `active` — D65's own stated double-count, and zero
  primaries under-reports the same way. ⚠ Not a regression: the state was reachable before T-011 too.
  What changed is that the invariant now has an enforcement site, which is what `AGENTS.md` invariant 7
  asks to be swept backward. Fix shape: check it on the load path (`loadBnn`) beside the null-guard, or
  surface a violating set through `brokenRefs()`/`unbuildable()` rather than resolving it silently.
  Found by `hmdnah`'s T-011 step-2 review. Recorded, not claimed.
- **2026-08-17 — the `--review` wrong-PR claim recurred a third time, and there is still no flag to name
  a PR.** Same root cause as the 2026-08-16 row below: with #32 (T-011, due step 2) and #33 (T-016, due
  step 1) both routed to `hmdnah`, `agent-start.mjs --seat hmdnah --review` claimed **#33** — posting a
  review-claim comment on it and checking its branch out — while the session's actual assignment was #32.
  Worked around by hand again (`gh pr checkout 32`), leaving a spurious claim comment on #33, which the
  next session must not read as a live claim. ⚠ The 2026-08-16 row judged this "low-frequency and always
  self-correctable by hand" and recorded rather than decomposed; three occurrences say the frequency
  judgement was wrong. Fix shape: a `--pr <n>` flag, or order the candidates by review-pipeline position
  (`review/step-1` label present ⇒ ahead of an unlabelled PR) instead of `gh pr list` order.
- **2026-08-17 — `_baselinedAtEntry` names a POSITION, not an entry, under the `T-nnn` scheme (D82), so
  every new §7 abstract silently re-points the frozen-surface baseline's audit trail.**
  `docs-state.mjs` mints new-scheme entry numbers as `1000 - i` over §7's array order, so `1000` always
  means "whatever is newest" rather than a fixed turn. `baselineEntryIssues`'s cross-field check then
  compares `_baselinedAt` against that moving entry's date, and goes red on a PR that touched no frozen
  shape: measured here, where appending this turn's abstract (2026-08-17) beside a baseline written
  2026-08-16 failed `tests/freeze-boundary.test.ts` with `_baselinedAtEntry 1000 is dated 2026-08-17 in
§7, but _baselinedAt says 2026-08-16`. Cleared by `pnpm state --rebaseline`, which moved exactly one
  byte-range (`_baselinedAt`) and left all 214 declarations identical — i.e. the gate demanded a
  re-baseline to record nothing. ⚠ This is the cry-wolf shape `baselineEntryIssues`'s own comment says it
  avoids, reappearing through the entry-id scheme rather than through rotation; **post-freeze it is worse
  than cry-wolf**, because the baseline may not be rewritten at all without an owner ruling, so the gate
  would have no green path. Fix shape: give a new-scheme abstract a stable identity (its `T-nnn` plus
  date, or a minted monotonic number) instead of its index. Recorded, not claimed.
- **2026-08-17 — ⚠⚠ `pnpm state` does not measure the suite; it reads `.vitest-summary.json`, which is
  untracked, branch-agnostic and written by whichever `pnpm test` ran last anywhere in the worktree.**
  `§8`'s suite line therefore reports the last branch tested, not the branch checked out, and it reports
  it as green. Measured on this branch: `§8` at `fb4d4e6` reads `915 green · 96 files · 283 suites`
  (correct — verified by a fresh `pnpm verify` on 2026-08-17), while an uncommitted regen of the same
  commit reads `907 green · 95 files · 283 suites`, which is the **T-016** branch's suite (`main`'s
  `902 · 95 · 281` plus T-016's 5 tests and 2 describes), left in the file by the T-016 session's
  `pnpm verify` and read back after `git checkout` returned to T-011. The same mechanism put `main`'s
  `902 green · 95 files` into PR #32's step-1 review comment and into that entry's `VERIFIED:` field —
  the reviewer ran two test files, not the suite. **This defeats `agent-start.mjs`'s measured-vs-claimed
  refusal**, whose whole purpose is trusting the repository over the previous session's prose: both
  numbers come from the same stale file, so they agree while being wrong. Fix shape: `state.mjs` refuses
  a summary whose mtime predates the working tree's newest source file, or records the commit the run
  measured and refuses on mismatch. Recorded, not claimed.
- **2026-08-16 — `agent-start.mjs --review`'s reviewer-claim loop takes the first PR in `gh pr list`
  order (newest-first), not the one furthest along its own review pipeline.** Measured on PRs #31
  (T-009, past step 1, `review/step-1` label, CI green — actually due for step 2) and #32 (T-011, just
  opened, unlabeled, step 1): both route to `hmdnah`, and the script claimed #32, the newer and less
  advanced of the two, ahead of #31. Session worked around it by hand (`gh pr checkout 31` directly,
  `agent-finish.mjs` is branch-driven so this was safe); the script itself is unchanged. Not yet a T-nnn
  — low-frequency (needs two open PRs routed to the same reviewer at once) and always self-correctable
  by hand, so recorded rather than decomposed.
- **2026-08-15 — `current_state.md §3`/`§5` called the plan/section unit blocked on Q1–Q3 after it
  shipped** (Entry 77, PR #5; `tests/plan-section.test.ts`). Fixed this turn. ⚠ The class: rows phrased
  "blocked on a ruling" go stale because the ruling gets recorded elsewhere.
- **2026-08-15 — `scripts/state.mjs --rebaseline` crashes when `tests/` does not exist** (`writeFileSync`
  with no `mkdir`). Only reachable from a bare fixture, so recorded rather than fixed.
- **2026-08-15 — ⚠⚠ the `§0b` baton names the last seat to FINISH, not the seat that claimed.**
  `agent-finish.mjs` rewrites it with the finishing seat on the `--review` path too, so a reviewed branch
  ends up claiming its reviewer built it: T-008's baton reads `seat: hmdnah / role: reviewer` while
  `git log` reads `claim: T-008 by zayd (box)`. After any review turn, the builder's identity survives
  only in the claim commit message, not in `§0b`. Found reviewing PR #25, where a `T-015` criterion had
  been written against the baton and would have admitted the reviewer while refusing the builder. ⚠
  **`T-015` now derives the
  seat from the task row instead**, which routes around this rather than fixing it; whether the baton
  should carry the builder separately from the current holder is a steward decision not yet taken.
- **2026-08-15 — `agent-start.mjs --review` cannot route a PR whose title carries no `T-nnn`, so neither
  open PR is claimable by any reviewer seat.** Measured: `--seat hmdnah --review` prints
  `reviewer: ?` for both #16 and #17 and stops at _"No open PR routes to this seat"_, because
  `reviewerFor` is only called when `^T-\d{3}` matches the title. ⚠ The note at the head of this backlog
  says these two "are claimed via `agent-start.mjs --review` off the open-PR list", which the script does
  not implement. ⚠ It went unnoticed because PRs #18 and #19 were merged by the owner, so no reviewer seat
  has yet claimed a `T-nnn`-less PR. The mechanical fallback available is the branch's seat prefix
  (`zayd/…` ⇒ box ⇒ `hmdnah`, `amer/…` ⇒ pc ⇒ `khalihlna`), which derives the reviewer from the machine
  the work was executed on rather than from the title. ⚠⚠ **That is safety-critical routing, so it is a
  `STEWARD:` PR carrying a test, not a direct commit** — ✅ **promoted to `T-012`, 2026-08-15.**
- **2026-08-15 — ⚠⚠ `hmdnah` HAS NO GITHUB CREDENTIAL ON THE BOX, so the crossed-account approval
  `AGENTS.md §0` is built on does not exist here.** `gh auth status` lists exactly one account,
  `Davidian-Abdo` — the account `zayd` authors from — and `narutousomaki741` is present only as a git
  `user.name`/`user.email` (`@example.com`), which is authorship, never GitHub identity. Measured on
  **PR #20**: `gh pr review 20 --approve` returned
  `GraphQL: Review Can not approve your own pull request`. ⚠ GitHub's own refusal is the only thing that
  caught it; `gh pr merge` is **not** similarly blocked for a repo admin, so the next reviewer turn that
  does not check first will land the Entry 74 self-merge (`AGENTS.md §6`) believing it is a crossed
  approval. ⚠ It went unnoticed because #18/#19 were merged by the owner and no reviewer seat had yet
  reached the approve step. ✅ **RESOLVED same day by owner ruling — `D87`**, which is where the
  credential model is recorded;
  the durable rule it leaves is `T-013`: **a seat confirms `gh api user` is its own account before
  approving or merging**, because GitHub blocks a self-approval but **not** a self-merge.
- **2026-08-15 — ⚠⚠ `agent-finish.mjs --review` reads the frozen surface and never the task's `risk:`
  field, so a `risk: high` task is stamped `done` and its reviewer is told to merge it.** The two gates
  disagree by construction: the builder half writes `NEXT TURN: REVIEW ONLY` on `risk: high` **or**
  `contract-touching`, while the review half holds the row at `review` for `contract-touching` alone.
  Measured on **T-008** (`risk: high`, mechanically `RISK: additive`, no `needs-operator/*` label): the
  finish run flipped the row to `done` and printed
  `gh pr review 23 --approve && gh pr merge 23 --squash`, for a PR the owner merges. ⚠ The row was
  corrected back to `review` in the same turn, which is the evidence rather than the fix. ⚠ The fix
  belongs in the writer and must honour **the stricter of the two** — `AGENTS.md §5` lists three
  owner-gated classes and `risk: high` is not one of them, so either the field stops implying an owner
  gate or `§5` gains it; that part is the owner's call, not the script's.
- **2026-08-15 — `agent-finish.mjs`'s `ready`→`review` status flip fails `format:check`, so every builder
  turn opens a red PR.** The longer word goes into a cell padded for `ready`, leaving one trailing space
  that `prettier --check` — CI step 3 — rejects; nothing else in the diff is at fault. Measured on **PR
  #20**, the first task row the script has ever flipped: `pnpm verify` was green in the finish run and CI
  failed naming `docs/BACKLOG.md` alone. ⚠ The fix belongs in the writer — re-align the row, or format the
  file it just edited — not in each branch, and not by widening the committed column. ✅ **FIXED at the
  writer in PR #20 by `hmdnah`**: `setRowStatus` is hoisted, exported and repads to the width it found,
  with a case in `tests/protocol/agent-finish.test.ts`. ⚠ Repadding the one branch would not have held —
  the same writer stamps `done` at the end of a review turn and would have re-broken it the other way.
- **2026-08-15 — D88's "a proven defect goes back to the builder on the existing claim" has no scripted
  route.** `agent-start.mjs` refuses a named task whose row is not `ready` (line 517), `seats.readyFor`
  enumerates `ready` rows only, and a claim whose status is `finished — PR open, awaiting review` is
  refused as _"not an incomplete turn to continue"_ (line 576) — so a builder cannot re-enter a row left
  at `review`. A builder that reaches the branch by hand then finishes on the non-`--review` path, which
  prints a `gh pr create` line for a PR that is already open. ⚠ Not covered by `T-014`, whose
  `done-when:` items are all on the `--review` path. ✅ **RULED 2026-08-15 — `D88` as amended: the route
  is `agent-start.mjs --continue <T-nnn>`, promoted to `T-015`.** T-008 waits for it.
- **2026-08-15 — the `NEXT TURN: REVIEW ONLY` banner cannot route a review turn.** `agent-finish.mjs`
  writes it into the task branch's `current_state.md` and clears it there on the `--review` run, while
  `agent-start.mjs` reads it after `git checkout main` — so it has never existed on `main`
  (`git log -S` over `origin/main -- current_state.md` returns nothing) and routing comes from the PR
  title via `reviewerFor`. ⚠ `T-014`'s second `done-when:` rests on the banner being _"what routes step
  2"_, which it is not; leaving it standing on the branch changes nothing until the banner reaches a
  session that starts on `main`. ✅ **RULED 2026-08-15 — `D88` as amended: a `review/step-1` PR label
  routes step 2, and `T-014`'s criterion is rewritten to it.** The banner keeps its existing job of
  telling the next session on that branch that the turn is review-only.
