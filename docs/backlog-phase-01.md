# BACKLOG — volume 01 (sealed)

> **Sealed volume.** The `### T-nnn` entries of every `done` row, moved verbatim out of
> `docs/BACKLOG.md` on 2026-10-07. **Never edited again** — a correction goes in a later
> `docs/BACKLOG.md` entry or `docs/PHASE_LOG.md`. The summary-table rows stay live in `docs/BACKLOG.md`.
>
> Covers: `T-001`, `T-002`, `T-003`, `T-004`, `T-007`, `T-008`, `T-009`, `T-011`, `T-012`, `T-013`, `T-014`, `T-015`, `T-016`, `T-017`, `T-018`, `T-020`, `T-021`, `T-024`, `T-022`, `T-005` (20 entries) · all `done` · sealed 2026-10-07.

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
