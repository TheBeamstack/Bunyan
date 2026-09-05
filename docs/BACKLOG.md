# BACKLOG

**What it is, and who reads it when.** The forward-planning artifact: every claimable unit of work, its
readiness and its sequence. Read by a builder or reviewer at claim time (`scripts/agent-start.mjs`), and
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
7. a **`machine:`** — `any | box | pc`. Where the task must be **executed**;
8. a **`risk:`** flag (`normal` | `high`), set at decomposition and **auto-`high`** when a task touches
   persistent naming (D1), the kernel identity cache (D29), the frozen surface, or `dependency.ts`'s
   invalidator. ⚠ `risk: high` buys a **two-step review** (D88, `REVIEW.md`); a mechanically-detected
   `RISK: contract-touching` buys the **owner's merge** (`AGENTS.md §5`). Either makes
   `scripts/agent-finish.mjs` write `NEXT TURN: REVIEW ONLY`, naming the resolved reviewer seat;
9. small enough to reach a green `pnpm verify` in one turn.

### `machine:` — the one that is safety-critical

`any` — neither machine's absence changes the result. `box` — the Hetzner dev box, headless: no
Playwright, no WebGL, no browser-only measurement. `pc` — the owner's local PC, **the only machine here
with a real browser**.

`scripts/agent-start.mjs` refuses a task whose `machine:` the seat cannot satisfy, and for `pc` it
**probes for a real browser** rather than trusting the label (`BUNYAN_BROWSER_CMD=/path` overrides by
naming an executable, never a boolean bypass). Without the field a box session would tick a `done-when:`
item it could not have checked — the failure `AGENTS.md §0`'s invariant 9 exists to prevent.

**A `done-when:` list that mixes machines is a task that needs splitting**, not a `machine:` value chosen
generously.

## Status values

Four, and `done` means **merged** — nothing earlier in the list does.

- **`blocked`** — waiting on `depends-on:` or an `open_rulings.md` answer.
- **`ready`** — every READY criterion is met, nobody has claimed it, and every `depends-on:` id is `done`.
- **`review`** — the builder finished and its PR is open. `agent-finish.mjs` sets this; a builder
  finishing with no open `done-when:` item is refused unless the row already reads `review`.
- **`done`** — the PR **merged**. Only a reviewer's `agent-finish.mjs --review` (additive risk) or
  `brahim`'s readiness sweep (confirming via `gh pr list --state merged`) ever writes this.

**Why the extra state.** A dependency is satisfied by `done`, never by `review` — `seats.mjs`'s
`canClaim` refuses mechanically on this. Collapsing `review` into `done` at build-finish time would let a
dependent start against unreviewed work. Only a row naming the pending PR's task waits.

---

## Backlog

> **Row order is the sequence, not the id order.** `scripts/seats.mjs`'s `readyFor` takes the first
> `ready` row a machine can satisfy, so this table's order is how the steward sequences work.
>
> ⚠ **PRs #16 and #17 predated `T-nnn` and were closed 2026-08-15 by owner ruling** — too stale against
> `main` to rebase without re-litigating design choices `main` has moved past. Their work is
> re-decomposed as **T-018** and **T-019**, against current `main` rather than ported.
>
> `docs/CURRENT_STATE.md §5`'s "Later (post-freeze / v1.0.x)" list is deliberately not decomposed here —
> the freeze has not happened, and rows nobody may claim bury rows somebody must.

| ID    | Status  | Task                                                                    | Area     | Machine | Risk   | Depends on |
| ----- | ------- | ----------------------------------------------------------------------- | -------- | ------- | ------ | ---------- |
| T-001 | done    | The perpendicular-foot snap candidate                                   | apps-web | pc      | normal | —          |
| T-002 | review  | The two-candidate-line intersection snap                                | apps-web | pc      | normal | T-001      |
| T-003 | review  | The in-app open-source licences screen                                  | apps-web | pc      | normal | —          |
| T-004 | done    | Does per-element build cost stay flat from 54 to 10,000?                | document | box     | normal | —          |
| T-006 | ready   | D66 §3a/b — the keep-live set and a lazy first paint                    | apps-web | pc      | normal | T-005      |
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
| T-020 | done    | The pinned vitest cannot collect `tests/protocol/*` on Windows          | infra    | box     | high   | —          |
| T-021 | review  | `pnpm verify` reaches green on the pc, confirmed there                  | infra    | pc      | normal | T-020      |
| T-024 | done    | `_baselinedAtEntry` names a position, so a cross-day §7 append goes red | infra    | box     | high   | —          |
| T-022 | done    | `kernel-occt`'s glue decodes from growable WASM memory                  | kernel   | box     | high   | —          |
| T-023 | ready   | The kernel boots on the pc's system Chrome, confirmed there             | apps-web | pc      | normal | T-022      |
| T-005 | done    | D66 §3c — force-on-measure, and whether `save` reads built              | document | box     | normal | T-018      |
| T-026 | ready   | The identity gate fires at approve/merge, not only at claim             | infra    | box     | high   | —          |
| T-025 | ready   | `--review` keeps an owner-gated row at `review`                         | infra    | box     | high   | —          |
| T-028 | ready   | `agent-finish.mjs` is resumable after an interrupted run                | infra    | box     | normal | —          |
| T-027 | ready   | §6's relink cap is measured, not guessed                                | infra    | box     | normal | —          |
| T-029 | ready   | `seats.mjs` collapses `machine: any` to `box` in two functions          | infra    | box     | high   | —          |
| T-030 | ready   | A steward cannot review, and its readiness view lists nothing           | infra    | box     | high   | —          |
| T-031 | blocked | `requires:` supersedes a task's `machine:`                              | infra    | box     | high   | T-029      |

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

`docs/CURRENT_STATE.md §5` records this as unbuilt and Amer's, in the middle of a row that is otherwise ✅ DONE
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

- implements: `docs/decisions.md` D66 · `docs/CURRENT_STATE.md §1a` (the four-axis scale numbers) ·
  `tests/document-heap-scale.test.ts` — **its least-squares approach is the pattern to copy**, per
  Entry 90's own note
- verify: `pnpm test -- document-heap-scale` and `pnpm verify`
- done-when:
  - build cost is measured across at least three element counts, not two, and fitted;
  - the fit is reported as a number in the entry, with the method — **a claim with no method is not
    done** (`AGENTS.md §4.4`);
  - ⚠ if it is **not** flat, that is the result and it is written down as the result. This task is a
    measurement, and a measurement that may only come back one way is not one;
  - `docs/CURRENT_STATE.md §1a`'s cold-load row is updated with what was measured — ⚠ **and not
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
  authorization** (`AGENTS.md §5` reserves this merge to the owner; they closed the PR by mistake from
  the UI, then authorized the reopen and merge in their place). Re-confirmed on the conflict-resolved tip
  `40859fd`: approval intact, both CI jobs green, `packages/` and every T-011 test byte-identical to the
  approved `0a641b3`. The re-baseline is pre-freeze under D85; **the P5 freeze is untouched and remains
  the owner's separate act.**
- area: document · machine: **box** · risk: **high**

### T-012 — `--review` routes a PR whose title carries no `T-nnn`

`--review` calls `reviewerFor` only when the PR title matches `^T-\d{3}`, narrower than `seats.mjs`'s own
`titleRoutes`, which also accepts `STEWARD: `. **Every `STEWARD:`-titled PR recurs into this gap** —
`hmdnah` had to hand-claim PR #25 twice — and a steward turn is the routine case, not an edge one.

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
  - ⚠ **an unresolvable identity is a REFUSAL, never a skip** — `docs/CURRENT_STATE.md §1d`'s standing lesson
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

Owner ruling 2026-08-15: fix the baton itself, not only route around it (T-015). `docs/CURRENT_STATE.md §0b`
names only the seat that finished the CURRENT turn — after any review turn that is the reviewer, and the
builder's identity survives only in the claim commit message, never in `§0b` (`## Discovered`,
2026-08-15).

- implements: `docs/CURRENT_STATE.md §0b` · `scripts/agent-finish.mjs`'s baton-write step
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
(`docs/CURRENT_STATE.md`, 2026-08-15).

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

- implements: `docs/decisions.md` D66 · `docs/CURRENT_STATE.md §1a`'s open cold-load row
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
- area: apps-web · machine: **pc** · risk: **normal**

### T-020 — The pinned vitest cannot collect `tests/protocol/*` on Windows

`pnpm verify` cannot reach green on the pc for **any** task, so `agent-finish.mjs` refuses every
`amer`/`khalihlna` turn. Measured there: `vitest run` (pinned `^2.1.8`, installed `2.1.9`) throws
`SyntaxError: Invalid or unexpected token` collecting five `tests/protocol/*.test.ts` files, while `tsc`,
esbuild, Vite's transform, `vite-node` and `npx vitest@latest` (4.1.10) all parse the same files cleanly
and CI's Linux runner is green on the identical command.

- implements: this file's `## Discovered` entry of 2026-08-17 · `docs/CURRENT_STATE.md §6` (`verify` **is** the
  CI step list, exactly) · `AGENTS.md §1.1` (a finish requires unconditional green)
- verify: `pnpm verify`
- done-when:
  - the runner is moved to a major the pc measured green, and `package.json`'s pin and the lockfile move
    together;
  - ⚠ **the suite count is reported before and after, and is unchanged** — a major bump that silently
    stops collecting a file reports _fewer_ tests and a green run, which is this defect's own shape
    (`docs/CURRENT_STATE.md §1c-7`);
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

- implements: this file's `## Discovered` entry of 2026-08-17 · `docs/CURRENT_STATE.md §1c-9` (**measure the
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
    (`docs/CURRENT_STATE.md §6`); if it does, the patch path is preferred and the entry says so with the number;
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

## Discovered

_(unplanned findings; never claimed in the same turn that found them, per `AGENTS.md §3`. Each line: the
finding, the fix shape where one is known, and its disposition.)_

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
