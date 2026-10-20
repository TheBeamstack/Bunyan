# Bunyan — `docs/PHASE_LOG.md`

**What it is, and who reads it when.** The complete entry registry — every session this project has
had, oldest first — read on lookup by any seat that is stuck or missing older context, never as part of
a session briefing.

**Why it exists.** `docs/CURRENT_STATE.md` is read in full on every session, so its length is a cost
paid every run; an entry's value does not go to zero when it scrolls off it. Entries are compressed
here, never discarded. It answers: *why is this shaped this way* · *has this been tried* · *what did
that D-number cost to learn* · *where did this trap come from*.

⚠ **This file is a POINTER, not the source.** Every entry's durable lessons were promoted into
`docs/CURRENT_STATE.md` §1–§5 — that promotion is what makes compression safe — and its full,
uncompressed body is either in `handoff/<seat>/` (named in each entry below) or in git history on the
commit that wrote it.

---

## THE ROTATION RULE (binding — this is how the two files stay in balance)

**§7's budget is the authority: a BYTE budget** (`docs/CURRENT_STATE.md` §7's header;
`BUDGET.maxAbstracts` in `scripts/docs-state.mjs` caps the count at 10). Whenever §7 is at or over it,
the agent that notices compacts:

1. Keep the newest abstracts §7's budget allows, in full.
2. **Summarize each older entry into this file**, in order, keeping its id, date, seat, headline, the
   measured numbers, the decisions it took (with D-numbers), its `handoff/` body path and its review
   status. Drop only session bookkeeping (verify counts, box notes, commit hashes).
3. Before dropping an entry, **check its durable lessons are already in `docs/CURRENT_STATE.md`
   §1–§5**; promote first if not. *The summary here is a pointer; §1–§5 is where a rule binds.*
4. Leave `docs/CURRENT_STATE.md`'s pointer to this file intact.

⚠ **An entry's `###` heading is verbatim and permanent** (invariant 10). `recordedAbstracts` resolves a
durable reference against §7 **plus this file and its sealed volumes**, reading headings only — so a summarised entry keeps its
identity fields, and compressing a body never moves the population a reference resolves against.

*Compaction is maintenance, not work: it does not get an entry of its own.*

**Sealed volumes** (never edited again): `docs/phase-log-01.md` — §A–§E, Entries 1–88 and the
`T-nnn`/`STEWARD-slug` turns through 2026-08-31 · sealed 2026-10-07. `docs/phase-log-02.md` — the turns
from 2026-10-06 through T-053's step-2 review · sealed 2026-10-20.

## T-055 — review of PR #102 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: the `primaryViolations` spread removed → the new test RED (5 failed, 2 passed);
restored → GREEN with both design-option test files (30 passed). No watched path; `isElementActive` and
`modelElements()` unchanged. The hosted-element choice matches D67 and the two existing bodies. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-T-055-review.md`

## T-055 — a design-option set with no primary or two primaries surfaces in brokenRefs() — 2026-10-20 — seat: zayd

`document.ts` `primaryViolations` reports one `brokenRefs()` entry per element tagged in a set whose primary
count is not 1; nothing healed, `isElementActive` untouched. New test: 7 cases, both roads; red with the spread
reverted (5 failed). `pnpm verify` → 1000 passed, 1 skipped. An untagged hosted element is covered by its host's entry.
Body: `handoff/zayd/2026-10-20-T-055-design-option-primary-invariant.md`

## STEWARD-design-option-primary-invariant — T-055 from the 2026-08-17 finding — 2026-10-20 — seat: brahim

T-055 (`ready`, `risk: normal`, `depends-on: —`) makes a design-option set with zero or two primaries surface
in `brokenRefs()`. A diagnosis subagent re-measured it at `a7c903e`: both roads bypass the check, and both
counts are silent. The fix stays in `document.ts`, off the frozen surface. The `## Discovered` line is deleted. No code changed.
Body: `handoff/brahim/2026-10-20-STEWARD-design-option-primary-invariant-t055.md`

## STEWARD-design-option-primary-invariant — review of PR #101 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: a probe of T-055's done-when went RED on both roads (`brokenRefs()` [],
`isElementActive` both true / both false); the row's fix shape in `document.ts` turned it GREEN (28 passed), then
removed. Cited lines read as T-055 says; `document.ts` is not watched. Reserved classes: none. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-STEWARD-design-option-primary-invariant-review.md`

## STEWARD-datum-inherited-level-restage — T-054 from PR #98's step-2 finding — 2026-10-20 — seat: brahim

T-054 (`ready`, `risk: high`, `depends-on: —`) makes a container move re-stage every datum on a Level beneath it
and those elements' join neighbours. Evidence is step 2's probe: C's low point 3000 incrementally, 2000 after
`rebuildAll`. The fix stays in `dependency.ts` (`scene.ts` is frozen). The `## Discovered` line is deleted. No code changed.
Body: `handoff/brahim/2026-10-20-STEWARD-datum-inherited-level-restage-t054.md`

## STEWARD-datum-inherited-level-restage — review of PR #99 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: un-rolling the log made the steward roll gate red (41054 > 40960) and a
copy-not-move roll made `gates.py docs` red (82 duplicates); both restored green. All 82 entry headings moved
exactly once, byte-identical. Cited lines read as T-054 says. Reserved classes: none. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-STEWARD-datum-inherited-level-restage-review.md`

## T-054 — a container move re-stages every datum on a Level beneath it — 2026-10-20 — seat: zayd

`dependency.ts` `case 'containers'` now also re-stages datums on every Level beneath the moved container that
inherits its elevation, plus their join neighbours. New test covers `base` and `top`, move and undo; red before the
fix (C 3000 vs 2000). `pnpm verify` → 993 passed, 1 skipped. `scene.ts` untouched.
Body: `handoff/zayd/2026-10-20-T-054-datum-inherited-level-restage.md`

## T-054 — review step 1 of PR #100 — 2026-10-20 — seat: hmdnah

Step 1 passes with no defect proven; no approval, no merge, and the row stays `review`. Item 1: `dependency.ts`
reverted → 2 red (`expected 3000 to be 2000`), restored → 10 green. `pnpm verify` → 993 passed, 1 skipped.
Reserved classes: none (`RISK: additive`). Items 2, 3, 6 are step 2's.
Body: `handoff/hmdnah/2026-10-20-T-054-review-step-1.md`

## T-054 — review step 2 of PR #100 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: `dependency.ts` reverted → 2 red (`expected 3000 to be 2000`), restored → 3
green. Probes show the edge also covers `deleteContainer` and its undo. Two mutations (neighbour hop, elevation
shield) each go red. Reserved classes: none. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-T-054-review-step-2.md`
