# STEWARD-decompose-harness-defects — review (PR #41)

**Seat:** `hmdnah` (reviewer on box) · **Date:** 2026-08-23 · **PR:** #41 · **Branch:**
`brahim/2026-08-23-decompose-harness-defects`

**Verdict: APPROVED and MERGED.** `RISK: additive`, no `needs-operator/*` label, both required checks
green, and the four new rows meet every READY criterion in `docs/BACKLOG.md`. Four findings below, none
red, so `REVIEW.md`'s table makes them findings rather than a block. One was provable and is fixed on the
branch.

## 1. Item 1 — revert-verification, twice (docs-only form)

The diff moves no code, so item 1 takes the form a prior steward review used: mutate what the diff
asserts, show it goes red, restore, show green.

**(A) The rows' `machine:` field.** Removed `machine: **box**` from the new T-026 entry —
`npx vitest run tests/protocol/seats.test.ts` → **2 failed | 44 passed (46)**, both naming T-026 by id:

- `the real docs/BACKLOG.md, as prettier formats it > gives every task a machine a seat can satisfy` —
  `TypeError: .toMatch() expects to receive a string, but got undefined` at `seats.test.ts:407`.
- `… > exposes every ready row to at least one seat` — `T-026 is ready but no seat can claim it:
  expected false to be true` at `seats.test.ts:401`.

Restored → **46 passed (46)**.

**(B) The §7 abstract the diff appends.** Re-dated its heading `2026-08-23` → `2026-08-21`, putting it
below the newer T-005 entry — `npx vitest run tests/docs-budget.test.ts` → **1 failed | 22 passed (23)**:
`is written newest-first, judged by each entry's own date` —
`["T-005 (2026-08-22) is below STEWARD-decompose-harness-defects (2026-08-21)"]` at
`docs-budget.test.ts:165`. Restored → **23 passed (23)**.

Both halves of the diff are therefore load-bearing against the committed protocol tests, not inert prose.

## 2. The steward's own VERIFIED claims, re-executed

| claim | re-executed here |
| --- | --- |
| `docs:check` **163 passed** (8 files) | **163 passed (8 files)**, and again **163** after my merge + fix |
| `seats.mjs ready-for zayd` → `T-026 T-025 T-028 T-027` | identical, in that order, exit 0 |

Both reproduce exactly. Also checked independently: **28** `### T-nnn` sections against **28** table
rows, no duplicate id on either side, T-025–T-028 freshly allocated above the previous high-water T-024
(`## Task IDs` — allocated once, never reused).

## 3. READY criteria, per row

Criteria 1, 2, 3, 5, 6, 7, 8 hold for all four rows on a direct read. What I attacked:

**Criterion 7 (`machine: box`) is right for all four, and no `done-when:` smuggles in a browser check.**
T-026 and T-025 are `scripts/*.mjs` plus fixture work; T-028 is `agent-finish.mjs`/`agent-start.mjs`;
T-027 is one figure in `current_state.md` §6, which is a Docker relink recipe executed on the box. Nothing
in any of the twelve `done-when:` items needs Playwright, WebGL, a draw call or a console-error-free boot.
`box` rather than `any` is the conservative choice given T-021 (`pnpm verify` reaches green on the pc) is
still `ready`, i.e. unconfirmed.

**Criterion 4 — F2 and F3 below are where it is weakest.**

**Criterion 9 — see F1.**

## 4. Findings

### F1 — the T-026/T-025 split is right, but its stated justification is an assertion, not a measurement

The abstract and the body both say T-026 and T-025 must stay separate because *"one row carrying both
cannot reach green in a turn (READY criterion 9)"*. That is a claim with no method, which `REVIEW.md`
item 5 exists to catch. Measured against the code, the facts point the other way:

- `seats.reviewFlipsToDone` (`scripts/seats.mjs:286`) is a **four-line pure function** with no branching
  beyond two `if`s.
- `identityGate` (`scripts/agent-start.mjs:155`) **already exists and is already `export`ed**, together
  with `resolveGhLogin` beside it. T-026 wires an existing, tested function into a second call site — it
  does not author a new gate, whatever *"adds a gate where none exists"* suggests.
- Both fixes land in **the same `if`/`else` block of the same file**: `agent-finish.mjs:572–592`, where
  the contract-touching branch and the additive branch each print their approve/merge line. T-025 changes
  which branch is taken and what it prints; T-026 adds the gate call in front of it.
- `scripts/agent-finish.mjs` does not import `reserved-classes.mjs` at all today, so that import is
  T-025's work either way and is shared, not doubled, if the rows were combined.

Combining them would also **halve the review cost**: both are `risk: high`, so as two rows they buy four
review turns (D88 two-step, twice) where one row buys two — in a batch that just lost three turns to
stranded finishes, that is not nothing.

**Not blocking, and I am not asking for the rows to be merged.** Splitting when unsure is the direction
`AGENTS.md §6` prefers (*"a task that cannot reach green CI in one turn is split before starting"*), each
row is individually well within criterion 9, and I cannot prove a combined row *would* reach green without
building it. The finding is that the *reason given* is unmeasured, and the file states it as fact twice.

### F2 — T-027's `verify:` cannot discharge its own `done-when:`, and it has no revert-verifiable item

T-027's premise checks out: `current_state.md:583` really does read `docker run --rm --memory=2g …`, and
the 1 GB/78 s measurement really is in the 2026-08-21 `## Discovered` row and in T-022's step-2 abstract.

But its single `done-when:` item is *"§6's recipe carries the measured cap"*, and **nothing in
`pnpm verify` reads that figure** — `grep -rn "memory=2g" tests/ scripts/` returns nothing. So `verify:
pnpm verify` is decorative for this row: it will be green before the edit and green after it, and green if
the edit writes the wrong number.

It is also the only one of the four rows with **no `revert-verified:` item**. `REVIEW.md` item 1 is
mandatory on every PR, so T-027's reviewer will arrive with no author claim to re-execute. Recommend the
builder either add a `done-when:` item a test can hold (assert §6's figure against the recorded
measurement) or state explicitly in the row that revert-verification does not apply because the change is
a prose correction — so the next reviewer is not left inventing one.

### F3 — T-028's `revert-verified:` item needs harness work the row does not name

T-028 asks for *"a fixture whose finish is killed mid-`verify` … reproducibly recovered by re-running
it"*. Today that is not reachable:

- `agent-finish.mjs:211` runs `execFileSync('pnpm', ['verify'], …)` — the command is **hardcoded**, with
  no injection seam.
- `tests/protocol/fixture.mjs` stubs a task's `verify:` field as `` `echo ok` ``, but nothing reads it for
  step 1 — that field is not what step 1 runs.
- Consequently **every one of `agent-finish.test.ts`'s 17 tests asserts a refusal that fires *before*
  step 1**, or asserts only that a gate cleared *"through to the verify step"*. Step 1 has no coverage at
  all.

So the builder must first add a seam (read the verify command from the environment or from the task row)
before the revert-verification is even expressible. That is small, but it is unstated — and it is a
criterion-9 question on the one row that got no criterion-9 analysis, while the two rows that got it are
the four-line ones. Not blocking: the row is coherent and correctly scoped, and this is a prerequisite a
builder will find in its first ten minutes.

### F4 — fixed on the branch: T-025 cited a `## Discovered` entry that does not exist

T-025's `implements:` read *"this file's `## Discovered` entries of 2026-08-19 **and 2026-08-21**
(`agent-finish.mjs --review` stamps the row `done`)"*. There is no such 2026-08-21 entry. The seven rows
of that date are the identity gate, the §6 relink cap, the kernel-glue patch step, the `frozen-surface.mjs`
legacy half, the collision-gate tautology, prose rot, and the overstated `frozen-surface.d.mts:44` line —
none about `reviewFlipsToDone`. The second firing is dated **2026-08-20** and is a ⚠-marked amendment
*inside* the 2026-08-19 row.

Criterion 2 exists so a claiming seat can find what it must read without guessing; a pointer to a
non-existent entry defeats exactly that. Provable by reading, one line, so fixed on the branch per
`REVIEW.md`'s "latency zero" rule → *"entry of 2026-08-19 and its 2026-08-20 amendment"*.

## 5. The two questions I was asked to settle

### Is `AGENTS.md §3` violated by decomposing a finding in the turn that found it?

**No.** The rule as written in the repo is about *claiming* — `## Discovered`'s own header says
*"never claimed in the same turn that found them"*, and `docs/BACKLOG.md`'s status list defines `ready` as
a row **nobody has claimed**. Three independent reasons it is not the same act:

1. `AGENTS.md §1.3` makes deciding readiness the steward's *defining* act, and the steward **never
   builds** — `brahim` is structurally incapable of claiming what it decomposed.
2. The rule's purpose is to stop a finder from implementing its own finding with no independent party in
   between. Decomposition **inserts** that party rather than bypassing it: the row is written down, it is
   reviewed here, and it will be built by a different seat and reviewed again.
3. The alternative — record now, decompose next turn — leaves the box idle for a turn, which is the
   condition this turn existed to end.

The safeguard it relies on is that the finder is sole author of the row's `done-when:`, so a framing error
propagates unreviewed. That review is this one, and F2/F3 are its output.

### Do the rows being `ready` contradict *"no builder starts on T-025–T-028 until the owner says so"*?

**No, though it reads like it.** I checked `docs/prompts/brahim-orchestrator.md` §4b: the hold binds the
**orchestrator** (*"Do not let a builder subagent start on the newly-decomposed phase until the operator
explicitly says to continue"*), not the row status. `ready` is what makes the rows claimable *once the
operator says go*; the hold lives in the stopped loop. `light_brahim` is not running either. Nothing
mechanical will auto-claim them, and a hand-directed seat claiming one *is* the operator saying go. Not a
defect.

## 6. Items 2, 3, 5, 6

**Item 2 — backward sweep.** The PR adds no rule, invariant or correctness guarantee; it adds backlog
rows. The one pre-existing site the rows do change is `readyFor('zayd')`, which was empty before this turn
(every `box` row `done`, all eight `ready` rows `pc` — I confirmed that against the table). The gate that
quantifies over all rows, `seats.test.ts`'s *"exposes every ready row to at least one seat"*, is green,
and mutation (A) above proves it is the gate that would catch a bad row.

**Item 3 — new kind of thing.** Four rows are not a new kind of entity. The `## Discovered` row is a new
member of an existing collection, and nothing quantifies over that collection — no test reads
`## Discovered` at all. Pre-existing and out of this PR's scope; noted, not charged here.

**Item 5 — numbers.** F1 is the finding. One more, minor and not fixed: the abstract's headline and body
§1 both say **five** measured defects, and the PR decomposes **four**, one of which (T-028) implements a
row written *this* turn — so only three of the five pre-existing findings became rows. Which two were left
and why is not stated. The ledger plainly holds more than five undecomposed harness defects (the
2026-08-19 stable-key sweep, the 2026-08-19 step-2-accepts-step-1's-abstract row, the 2026-08-18
branch-shaped-§8 row, the 2026-08-17 verify-before-§8 row). "Five" has no method behind it. Cosmetic — it
changes no row — so recorded, not fixed, since I cannot recover the intended set.

**Item 6 — weak green.** No new tests. The relevant weak-green question is what `docs:check` **163
passed** actually proves about the rows: only that they *parse* and carry a valid `machine:` and status.
**No test checks READY criteria 1–6, 8 or 9** — criterion 9 in particular is unfalsifiable by machine,
which is why F1 and F3 had to be read rather than run. The abstract's wording is honest about this
(*"satisfies the protocol tests that read this file"*, not *"is READY"*), so this is a note on the limit of
the evidence, not a claim-vs-code defect.

## 7. Item 7 — RISK, on the exact tip

- `node scripts/reserved-classes.mjs` → *"none — RISK: additive, merges on a cross-account approval"*.
- `pnpm state` → `RISK: additive`, frozen surface unchanged vs baseline. Regenerating §8 moved only the
  branch/tip/open-PR/diff-size rows; every verdict row (frozen surface, suite, schema, protocol) was
  byte-identical to what is committed.
- **The labeller ran, so "no label" is a verdict and not a silence** — the distinction `REVIEW.md` item 7
  warns is invisible from here. On `0f66aac`: `PR shape · reserved classes` **success**, completed
  `2026-08-23T11:15:39Z`; `typecheck · lint · geometry harness` **success**, completed `11:15:24Z`. Both
  re-confirmed on the tip I actually merged.
- No `needs-operator/*` label. `RISK: additive` + approving cross-account review + green CI ⇒ **I merge
  it, on `narutousomaki741`**, which is not `davidian-abdo` that opened it (`AGENTS.md §0`).

## 8. What I changed on the branch

1. **Merged `origin/main`** (the PR was 2 commits behind; protection is `strict`). Picked up `2a79036`
   (shebang/import-hoist collection fix) and `76e4aa1` (T-021 falsified). One conflict — both sides append
   a 2026-08-23 `## Discovered` row — resolved by **keeping both**, `origin/main`'s first.
2. **F4's one-line citation fix.**
3. **Rotated the two oldest §7 abstracts** into `docs/history.md` §E as a move. §7 stood at **32320 of
   32768** characters with only 448 free, and this review's abstract does not fit. First
   `T-024 — 2026-08-19 — hmdnah`; that left **2** characters spare, which is not a margin, so
   `T-022 — 2026-08-21 — zayd` followed. §7 now **28836 of 32768**, 6 abstracts, **3932** free.

   Per §7's rotation rule I checked each one's durable lessons survive outside §7 before dropping it.
   T-024: H1–H4 are all four present as 2026-08-21 `## Discovered` rows, and Q22 is live at
   `open_rulings.md:40`. T-022: the relink recipe and its `postlink.mjs` patch step are in
   `current_state.md` §6 and in the 2026-08-21 `## Discovered` row, and T-023 carries the browser
   confirmation forward as a `ready` row. Both bodies stay in `handoff/` forever
   (`handoff/hmdnah/2026-08-19-T-024-review-step2b-rerun.md`,
   `handoff/zayd/2026-08-21-T-022-glue-growable-decode.md`). Compaction is maintenance and gets no entry
   of its own.

## 9. Could not verify here

- **Branch protection settings.** `gh api repos/Davidian-Abdo/Bunyan/branches/main/protection` returns
  **404** on this seat's token — it is a `push`-level collaborator token without admin read, so I could not
  confirm `strict`/`contexts`/`required_approving_review_count` against `docs/RUNBOOK.md`'s documented
  block. I merged the branch up to `main` anyway, so `strict` is satisfied either way. Nothing browser-only
  arose in this review, so there is no `unverified here:` owed to `khalihlna`.
