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
from 2026-10-06 through T-053's step-2 review · sealed 2026-10-20. `docs/phase-log-03.md` — the turns
from 2026-10-19 through T-034's step-2 review, plus T-034's 2026-10-12 build · sealed 2026-11-05.

## T-050 — `ParamField.motion?` is reserved — 2026-10-20 — seat: zayd

`ParamField` has `motion?: 'planPoint' | 'point' | 'direction'` (D95, design §5 A); nothing tags or reads it.
A `Record<motion, true>` test fails `tsc` (TS2353) with `'direction'` removed. The freeze boundary flagged
`interface ParamField` alone ⇒ RISK: contract-touching (re-baselined), owner merges. `pnpm verify` green.
Body: `handoff/zayd/2026-10-20-T-050-paramfield-motion.md`

## T-050 — review step 1 of PR #93 — 2026-10-20 — seat: hmdnah

Step 1 passes with no defect proven. Item 1: `'direction'` removed → `tsc` TS2353 red, restored → green.
`pnpm verify` reproduced 979 passed | 1 skipped. The labeller ran at `91ac825`: contract-touching + freeze, so it is
owner-gated and `D-20261020-03` is pending. Not approved, not merged; the row stays `review`.
Body: `handoff/hmdnah/2026-10-20-T-050-review-step-1.md`

## T-050 — merge origin/main into PR #93 (flow F1) — 2026-10-28 — seat: zayd

Merged `origin/main`; no code changed. Conflicts in `BACKLOG.md` (main's rows, T-050 `review`), `PHASE_LOG.md` (both
sides' abstracts) and `CURRENT_STATE.md` (this branch's baton). The frozen-surface snapshot did not conflict and was
not re-baselined. `pnpm verify` green (1059 passed, 4 skipped). PR #93 stays owner-gated.
Body: `handoff/zayd/2026-10-28-T-050-merge-main.md`

## T-050 — merge origin/main into PR #93 after PR #70 — 2026-11-05 — seat: zayd

Merged `origin/main` at `132f758`; no code changed. Conflicts: `PHASE_LOG.md` (both sides' abstracts kept),
`CURRENT_STATE.md` (this branch's baton), `frozen-surface.snapshot.json` (main's side, then `pnpm state --rebaseline`:
215 declarations, #70's `FamilyPart`/`FamilyFaceSelector` and #93's `ParamField`). `pnpm verify` green (1061 passed).
Body: `handoff/zayd/2026-11-05-T-050-merge-main.md`

## T-050 — review step 2 of PR #93 — 2026-11-05 — seat: hmdnah

No defect proven; approved for an owner-signed merge (D-20261028-03). Item 1: `schema.ts` reverted → 4 tsc errors, freeze-boundary 1 red; restored → 41 passed.
Item 6: the new case's runtime asserts pass with the member removed, but `pnpm typecheck` (verify, CI) rejects that. Items 2/3: nothing reads `motion`, and `checkField` dispatches on `kind`.
The snapshot differs from main only in `interface ParamField`.
Body: `handoff/hmdnah/2026-11-05-T-050-review-step-2.md`

## STEWARD-log-roll-03-d02-stamp — PR #122 redone from current `main`: log rolled, D-20261028-02 stamped — 2026-11-05 — seat: brahim

PR #122 closed: it conflicted with `main` and no entrypoint continues a steward PR. Log rolled at 43593 bytes to
`docs/phase-log-03.md` (PR #122's 74 entries); PR #93's five T-050 entries stay live.
D-20261028-02 stamped: PR #70 merged as `132f758`.
Body: `handoff/brahim/2026-11-05-STEWARD-log-roll-03-d02-stamp-redo.md`

## STEWARD-log-roll-03-d02-stamp — review of PR #123 — 2026-11-05 — seat: hmdnah

APPROVED, merged via `agent_merge.py --seat hmdnah --pr 123`. Item 1: `main`'s log restored beside the volume → `gates.py docs` exit 1, 74 live-and-sealed; restored → ✓.
The 79 entries on `main` are byte-exact: 5 stay live and 74 are sealed, in order. The decisions diff is only D-20261028-02's `answered:`. Fixed the volume-03 pointer: it also seals T-034's 10-12 entry. Not owner-gated.
Body: `handoff/hmdnah/2026-11-05-STEWARD-log-roll-03-d02-stamp-review.md`

## STEWARD-backstop-t034-t050 — T-034 and T-050 flipped `done`, T-051 promoted `ready` — 2026-11-05 — seat: brahim

PR #70 (T-034) and PR #93 (T-050) are MERGED, yet their rows still read `review` and the start sheet printed "backstop: nothing to flip".
Cause: `agent_start.py:790` lists 20 merged PRs ordered by creation, which leaves out these two older PRs.
T-051 promoted: its depends-on T-050 is `done`, and its note's seeder hold B-20261012-03 is cleared.
Body: `handoff/brahim/2026-11-05-STEWARD-backstop-t034-t050-flips.md`

## T-051 — `core.move`/`rotate`/`copy` move a D52 wall through its `motion` tags — 2026-11-05 — seat: zayd

`core.wall` tags `start`/`end` `planPoint`, and `positioningOf` reads the tags rather than `baselineOf`. The verbs move the tagged params and leave `placement` alone.
The §A probe passes on both demo walls, 6 of 6. dz ≠ 0, a tilt, a mirror and `setPlacement` refuse with named reasons. Removing the tags turns 5 of 8 tests red.
`pnpm verify` 1069 passed. The box re-seed moved values only by aarch64 floating-point noise, so the seed is kept with a `Re-seed-unchanged:` trailer.
Body: `handoff/zayd/2026-11-05-T-051-wall-motion-tags.md`

## T-051 — review step 1 of PR #124 — 2026-11-05 — seat: hmdnah

DEFECT PROVEN: done-when 6 is unmet. `wall.ts` is a re-seed path and no golden is committed, so `check-reseed.mjs:55-61` exits 1 before the trailer is read (CI run 42010045830).
Item 1: with the tags removed, `tests/wall-motion.test.ts` → 5 failed | 3 passed; restored → green. Reserved-class scan: additive, not owner-gated. Filed B-20261105-02 for zayd; changes requested, the row stays `review`.
Body: `handoff/hmdnah/2026-11-05-T-051-review-step-1.md`

## T-051 — re-seed committed for PR #124's gate (B-20261105-02) — 2026-11-05 — seat: zayd

`uv run seed-goldens` re-ran on the aarch64 box and was committed. Of 19 moved values, the largest is 1.9e-12 relative (`column-through-duct`); the other 18 are at most 1.0e-15.
`check-reseed.mjs` against `main` → exit 0, "golden VALUES moved". The golden and re-seed tests pass, 60 of 60.
The grid-bound test now asserts a rotate refusal that names `grid`; with the tags removed it goes red.
Body: `handoff/zayd/2026-11-05-T-051-wall-motion-tags.md`
