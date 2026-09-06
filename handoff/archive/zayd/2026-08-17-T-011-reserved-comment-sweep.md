# T-011 (defect return) — the "no authoring verb" comments, swept — 2026-08-17 — seat: `zayd`

**Shape of the turn.** D88 defect return onto the existing claim for PR #32 (`AGENTS.md §1.2`): the row
stays `review`, no new `§0b` claim, no new PR, no merge.

## 1. The defect

PR #32 ships `core.createDesignOption`/`updateDesignOption`/`deleteDesignOption`, and inside the same diff
five source files and two test files still told the reader that `scene.designOptions` has no authoring verb
in v1.0.0. `AGENTS.md §3` row 1: fix the doc, never code around it.

The PR's author had already swept `scene.ts`, `bnn.ts` and `commands.ts` (each correctly names the CRUD).
What was left is the set below — found by grepping the tree for the claim itself rather than for the files
the PR touched, which is `AGENTS.md` invariant 7's backward sweep.

| Site | What it said | What is true |
| --- | --- | --- |
| `designoptions.ts` :2 | "DESIGN OPTIONS — RESERVED shapes" | the collection has a CRUD (D85/Q17a) |
| `designoptions.ts` :141 | "RESERVED HELPER … Nothing calls it in v1.0.0" | `enumerate.ts`, `cleandelta.ts`, `joins.ts` and `room.ts` all call `isElementActive` |
| `designoptions.ts` :338 | "`scene.designOptions` is RESERVED with no authoring verb in v1.0.0" | `override` is the caller-supplied arm; the fallback arm is the document's own collection |
| `enumerate.ts` :112 | same claim, plus "undefined today ⇒ the invariant is vacuously satisfied" | both halves false |
| `entities.ts` :658 | "RESERVED … Absent ⇒ main model (v1.0.0's only case)" | `core.createElement` writes `designOptionId`; the catalogue it names is authorable |
| `documentation.ts` :143 | `ScheduleDefinition.designOptionIds` "RESERVED" | `core.createSchedule`/`updateSchedule` take it |
| `documentation.ts` :220 | `ViewCommon.designOptionIds` "RESERVED … no element carries a `designOptionId` yet" | `core.createView`/`updateView` take it; Entry 82 measured the element tag being written |
| `documentation.ts` :225 | `ViewCommon` "is ITSELF an optional reservation that no body reads yet" | `core.createView` and `projectView` (D81) read it since Entry 77 |
| `option-cascade-d67.test.ts` :132, :137 | "until the catalogue CRUD lands (T-011)"; "no authoring verb … nothing writes the collection itself yet" | it landed in this PR; the fixture exercises the `override` arm deliberately |
| `plan-section.test.ts` :288 | "**v1.0.0 ships no command that can author one** … the ONLY ROAD THAT EXISTS" | three roads now: the CRUD, a loaded `.bnn`, a Scene assembled in code |

Every edit is comment-only. `tests/freeze-boundary.test.ts` is green and unmoved (12/12) — its own
`reserved-classes` suite has a case for exactly this ("does NOT flag a comment-only change to a watched
file"), so the PR's `RISK: contract-touching` is still the one `SceneCollection` declaration and nothing
more.

Two of these (`documentation.ts` :225 and `designoptions.ts` :141) were false *before* this PR rather than
falsified *by* it. They are in the sweep because invariant 7 asks for every site the rule governs, not
every site the diff touched.

## 2. The test strengthening, revert-verified

`tests/design-option-crud.test.ts`'s "`acknowledge:true` lets it dangle" case asserted only that the option
row was gone — a test titled after a dangle that never read the referrer back. Two assertions added:

```ts
expect(acked.scene.views?.[view]?.designOptionIds).toEqual([b]);
expect(acked.scene.schedules?.[schedule]?.designOptionIds).toEqual([b]);
```

**Revert-verified by mutation** (`REVIEW.md` item 1). Made `guardReferences` redirect on the `acknowledge`
path instead of leaving the reference broken:

```
} else if (!acknowledge) blocked.push(r.describe);
else if (r.redirect !== undefined) extra.push(r.redirect('MUTANT'));
```

Result — red at the first of the two new lines, and the pre-existing assertions stayed green:

```
FAIL tests/design-option-crud.test.ts > ⚠⚠ deleting an option a VIEW or SCHEDULE shows is REFUSED; acknowledge:true lets it dangle
AssertionError: expected [ 'MUTANT' ] to deeply equal [ 'option-01M06K7H5G3N96T1Y00D9P3SN0' ]
 ❯ tests/design-option-crud.test.ts:268:56
```

`commands.ts` restored, `git diff` on it empty, 13/13 green again.

## 3. `§8`'s unexplained 8-test movement — every number accounted for

Four different suite figures were in circulation for one branch. **`pnpm state` never runs the suite**: it
reads `.vitest-summary.json`, an untracked file written by whichever `pnpm test` ran last *anywhere in the
worktree*, and there is one worktree for every branch on this box (`git worktree list`).

| Figure | Where it appears | What it actually measures |
| --- | --- | --- |
| `913 green · 96 files` | the zayd entry's `VERIFIED:` field | the branch **before** `e05c35a` merged `origin/main`; T-009's merge (`71cfc02`) added exactly 2 tests to `tests/document-openings.test.ts` |
| `902 green · 95 files · 281 suites` | PR #32's step-1 review comment, quoted into the hmdnah entry | **`main`** — that session ran two test files, not the suite, so `pnpm state` read the summary `main` had left |
| `907 green · 95 files · 283 suites` | the uncommitted `§8` regen | **`task/T-016-…`** — `main`'s 902/95/281 plus T-016's +5 tests and +2 describes across `tests/protocol/agent-{start,finish}.test.ts`; the reflog has the branch switch back to T-011 at 23:19:13, between T-016's `pnpm verify` and the regen |
| `915 green · 96 files · 283 suites` | `§8` as committed at `fb4d4e6` | **this branch, and it is correct** — reproduced by a fresh `pnpm verify` on 2026-08-17 (`902 + 13` = the 13 tests in `tests/design-option-crud.test.ts`) |

So `fb4d4e6`'s committed number was right and the uncommitted regen was wrong, which is the opposite of the
order the two were written in. The regen was discarded; `agent-finish.mjs` rewrote `§8` from this turn's own
`pnpm verify`.

**Why this matters beyond one stale line.** `agent-start.mjs` refuses to start when the measured repository
disagrees with `§8` as committed — *"trust the repository, not the previous session's prose."* Both sides of
that comparison read the same untracked file, so a stale summary makes them agree while both are wrong; the
refusal cannot fire. Recorded in `docs/BACKLOG.md ## Discovered` with a fix shape (refuse a summary older
than the newest source file, or stamp the commit it measured), not claimed — `AGENTS.md §3`.

## 4. `_baselinedAtEntry` names a position, not an entry

Appending §3's abstract to `§7` turned `tests/freeze-boundary.test.ts` red on a turn that moved no
declaration:

```
_baselinedAtEntry 1000 is dated 2026-08-17 in §7, but _baselinedAt says 2026-08-16
```

`docs-state.mjs` mints new-scheme (`T-nnn`/`STEWARD-`) entry numbers as `1000 - i` over §7's array order,
so `1000` does not name a turn — it names *whatever is newest*. `baselineEntryIssues`'s cross-field check
then compares `_baselinedAt` against a moving entry's date, and any new abstract written on a later
calendar day than the last rebaseline fails it. Cleared with `pnpm state --rebaseline`; the diff against
the previous snapshot is one line:

```
-  "_baselinedAt": "2026-08-16",
+  "_baselinedAt": "2026-08-17",
```

All **214** declarations and `_declarationCount` are byte-identical, i.e. the gate demanded a re-baseline
in order to record nothing. This is the cry-wolf shape `baselineEntryIssues`'s own comment says it avoids,
arriving through D82's entry-id scheme rather than through §7 rotation — and **post-freeze it has no green
path at all**, since `_README` forbids rewriting the file without an owner ruling while §7 keeps gaining
entries. Recorded in `docs/BACKLOG.md ## Discovered`, not claimed.

## 5. Verification

`pnpm verify` in full, foreground, real OCCT kernel, exit 0:

- main suite **915 green · 96 files · 283 suites**, 0 failing (`.vitest-summary.json`, `success: true`);
- `docs:check` **146 passed · 8 files**;
- `tests/freeze-boundary.test.ts` 12/12, after §4's re-baseline;
- `prettier --write` on the seven touched source/test files reported all seven unchanged.

## 6. What is still owed

- `hmdnah` — **step 2** of D88 (`REVIEW.md` items 2, 3, 6) on the existing claim; step 1 is done and
  labelled, and this return does not consume it.
- The **owner** — `RISK: contract-touching`, so the owner merges PR #32 whatever step 2 concludes.
- Nothing here needed a browser, so this turn leaves no `unverified here` debt.
