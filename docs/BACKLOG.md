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
reference. Branch: `task/T-014-versioned-entity-pattern`.

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
   both make `scripts/agent-finish.mjs` write `NEXT TURN: REVIEW ONLY`, naming the resolved reviewer seat;
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
> `risk: high`, which means a solo review that stops the loop for the owner, and T-011 is
> `contract-touching`, so the owner merges it as well. **T-010** still waits on T-009; **T-005** and
> **T-006** still wait on PR **#16**.
>
> ⚠ **#16 and #17 predate `T-nnn` and get no row** — they are claimed via `agent-start.mjs --review` off
> the open-PR list. Rows waiting on them use `blocked-by:`, not `depends-on:`, which `canClaim` reads
> mechanically and can only close over a `T-nnn`. ⚠⚠ **That claim is not true of the script yet** — see
> the `## Discovered` entry: `--review` only routes a PR whose title carries a `T-nnn`, so both are
> currently unclaimable by any reviewer seat.
>
> `current_state.md §5`'s "Later (post-freeze / v1.0.x)" list is not decomposed here — the freeze has not
> happened, and rows nobody may claim bury rows somebody must.

| ID    | Status  | Task                                                        | Area     | Machine | Risk   | Depends on |
| ----- | ------- | ----------------------------------------------------------- | -------- | ------- | ------ | ---------- |
| T-001 | ready   | The perpendicular-foot snap candidate                       | apps-web | pc      | normal | —          |
| T-002 | ready   | The two-candidate-line intersection snap                    | apps-web | pc      | normal | T-001      |
| T-003 | ready   | The in-app open-source licences screen                      | apps-web | pc      | normal | —          |
| T-004 | done    | Does per-element build cost stay flat from 54 to 10,000?    | document | box     | normal | —          |
| T-005 | blocked | D66 §3c — force-on-measure, and whether `save` reads built  | document | box     | normal | —          |
| T-006 | blocked | D66 §3a/b — the keep-live set and a lazy first paint        | apps-web | pc      | normal | T-005      |
| T-007 | done    | Q17c — a dangling `designOptionId` becomes a broken ref     | document | box     | normal | —          |
| T-008 | review  | Q19 — the belongs-to deletion reconciliation                | document | box     | high   | —          |
| T-009 | ready   | Q18 — a hosted void may only host on its host's base part   | document | box     | high   | —          |
| T-010 | blocked | Q18 — two doors on one wall, confirmed in the browser       | apps-web | pc      | normal | T-009      |
| T-011 | ready   | Q17a — `scene.designOptions` becomes a `SceneCollection`    | document | box     | high   | —          |
| T-012 | ready   | `--review` routes a PR whose title carries no `T-nnn`       | infra    | box     | high   | —          |
| T-013 | ready   | The seat identity guard — `gh api user` must match the seat | infra    | box     | high   | —          |

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
  - ⚠ **the unmeasured claim is measured FIRST:** does `save` read built state at all? Entry 90 wrote
    _"it should not — it writes the recipe — but that is a claim, not a measurement"_ and asked the next
    session to check before relying on the paragraph. Do that before choosing anything;
  - FORCE or DECLARE is chosen per aggregate (`projectQuantities`, schedules, the Clean Delta, `save`)
    and the choice is justified against the measurement above;
  - ⚠ **`save` is not a design call** — a save that silently omits unbuilt elements is data loss, not a
    reporting shortfall. If the measurement says `save` touches built state, it FORCES;
  - a test that fails in the absence of the fix, revert-verified.
- depends-on: —
- blocked-by: **PR #16** (Entry 90) must merge — `implements:` names a design document that is on that
  branch and not on `main`. `brahim`'s merged-PR sweep promotes this row.
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
    number against Entry 90's 64.5% deferrable figure;
  - ⚠ eviction is **not** built here — §3d rules it unnecessary at the measured 0.31 GB heap
    (_"build lazily; evict later, or never"_).
- depends-on: T-005
- blocked-by: **PR #16** (Entry 90), as T-005.
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
- area: document · machine: **box** · risk: **high**

### T-012 — `--review` routes a PR whose title carries no `T-nnn`

`scripts/agent-start.mjs` calls `reviewerFor` only when the PR title matches `^T-\d{3}`, so PRs **#16**
and **#17** print `reviewer: ?` and are unclaimable by any reviewer seat. This backlog's own header note
says they are claimed off the open-PR list, which the script does not implement.

- implements: `AGENTS.md` §0 (identity is role + machine) and §1.2 (review is routed by machine) ·
  `scripts/seats.mjs`'s `reviewerFor`/`machineOf` · this file's `## Discovered` entry of 2026-08-15
- verify: `pnpm verify`
- done-when:
  - a PR with no `T-nnn` in its title routes to the reviewer on **the machine its work was executed on**,
    derived from the branch's seat prefix (`zayd/…` ⇒ box ⇒ `hmdnah`, `amer/…` ⇒ pc ⇒ `khalihlna`);
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

## Discovered

_(unplanned findings land here — never claimed in the same turn that found them, per `AGENTS.md §3`)_

- **2026-08-15 — `current_state.md §3`/`§5` called the plan/section unit blocked on Q1–Q3 after it
  shipped** (Entry 77, PR #5; `tests/plan-section.test.ts`). Fixed this turn. ⚠ The class: rows phrased
  "blocked on a ruling" go stale because the ruling gets recorded elsewhere.
- **2026-08-15 — `scripts/state.mjs --rebaseline` crashes when `tests/` does not exist** (`writeFileSync`
  with no `mkdir`). Only reachable from a bare fixture, so recorded rather than fixed.
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
- **2026-08-15 — `agent-finish.mjs`'s `ready`→`review` status flip fails `format:check`, so every builder
  turn opens a red PR.** The longer word goes into a cell padded for `ready`, leaving one trailing space
  that `prettier --check` — CI step 3 — rejects; nothing else in the diff is at fault. Measured on **PR
  #20**, the first task row the script has ever flipped: `pnpm verify` was green in the finish run and CI
  failed naming `docs/BACKLOG.md` alone. ⚠ The fix belongs in the writer — re-align the row, or format the
  file it just edited — not in each branch, and not by widening the committed column. ✅ **FIXED at the
  writer in PR #20 by `hmdnah`**: `setRowStatus` is hoisted, exported and repads to the width it found,
  with a case in `tests/protocol/agent-finish.test.ts`. ⚠ Repadding the one branch would not have held —
  the same writer stamps `done` at the end of a review turn and would have re-broken it the other way.
