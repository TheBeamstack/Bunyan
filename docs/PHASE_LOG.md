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

## T-037 — fourteenth turn on PR #72, merged with main (F4), incomplete — 2026-11-01 — seat: zayd

Merged `origin/main` (`36e1785`) at `11987d2` on ticket B-20261101-01; main's side was docs only.
Only `## BLOCKED` in `docs/CURRENT_STATE.md` conflicted: main's side taken, re-rendered by `blocked.py`, `--check` exit 0.
`pnpm verify` green (124 files, 1060 passed); the re-seed gate skipped locally without BASE_REF. T-037 stays `review`.
Body: `handoff/zayd/2026-11-01-T-037-merge-main-f4.md`

## T-037 — thirteenth turn on PR #72, goldens re-seeded — 2026-10-26 — seat: zayd

`uv run seed-goldens` ran on the box (aarch64) and was committed; values moved only in the last ulp against the x86_64 seed, and `env.platform` changed.
Merged `origin/main` (`f2f9d07`); only docs conflicted, script-written blocks taken by side and `## BLOCKED` re-rendered. B-20261012-09 cleared.
`pnpm verify` green (124 files, 1060 passed); the re-seed gate skipped locally without BASE_REF, so CI measures it. D-20261021-01 is still pending.
Body: `handoff/zayd/2026-10-26-T-037-reseed.md`

## T-037 — twelfth turn on PR #72, merged with main again (F1) — 2026-10-24 — seat: zayd

Merged `origin/main` (`bbd6c5c`) at `c6cb1fe`; only `CURRENT_STATE.md` and `PHASE_LOG.md` conflicted, no code.
The baton and `last-verified-at` come from the branch side. `pnpm verify` is green (1060 passed); the re-seed gate skipped locally.
Not done: no golden was re-seeded (B-20261012-03); T-037 stays `review`.
Body: `handoff/zayd/2026-10-24-T-037-merge-main-f1.md`

## T-037 — eleventh turn on PR #72, merged with main again (F1) — 2026-10-24 — seat: zayd

Merged `origin/main` (`bd76cfe`) at `bd7b8e4`; only `BACKLOG.md`, `CURRENT_STATE.md` and `PHASE_LOG.md` conflicted, no code.
The baton and `last-verified-at` come from the branch side; `## Discovered` drops the finding main turned into T-062/T-064. `pnpm verify` is green.
Not done: no golden was re-seeded; B-20261012-03 and D-20261021-01 are untouched, and T-037 stays `review`.
Body: `handoff/zayd/2026-10-24-T-037-merge-main-f1.md`

## T-037 — tenth turn on PR #72, merged with main again (F1) — 2026-10-23 — seat: zayd

Merged `origin/main` (`0f48335`) at `8ead22a`; only `BACKLOG.md`, `CURRENT_STATE.md` and `PHASE_LOG.md` conflicted, no code.
The baton and `last-verified-at` come from the branch side; `## Discovered` and the log keep both sides. `pnpm verify` is green.
Not done: no golden was re-seeded; B-20261012-03 and D-20261021-01 are untouched, and T-037 stays `review`.
Body: `handoff/zayd/2026-10-23-T-037-merge-main-f1.md`

## T-037 — ninth turn on PR #72, merged with main again (F1) — 2026-10-23 — seat: zayd

Merged `origin/main` (`99451e1`) at `382d762`; only `BACKLOG.md`, `CURRENT_STATE.md` and `PHASE_LOG.md` conflicted, no code.
The baton and `last-verified-at` come from the branch side; `## Discovered` drops the finding main turned into T-060. `pnpm verify` is green.
Not done: no golden was re-seeded; B-20261012-03 and D-20261021-01 are untouched, and T-037 stays `review`.
Body: `handoff/zayd/2026-10-23-T-037-merge-main-f1.md`

## T-037 — eighth turn on PR #72, merged with main again (F1) — 2026-10-23 — seat: zayd

Merged `origin/main` (`711a6fb`) at `9aa4b62`; only `CURRENT_STATE.md` and `PHASE_LOG.md` conflicted, no code.
The baton and `last-verified-at` come from the branch side, and the log keeps both sides' abstracts. `pnpm verify` is green.
Not done: no golden was re-seeded; B-20261012-03 and D-20261021-01 are untouched, and T-037 stays `review`.
Body: `handoff/zayd/2026-10-23-T-037-merge-main-f1.md`

## T-037 — seventh turn on PR #72, merged with main again (F1) — 2026-10-23 — seat: zayd

Merged `origin/main` (`b1406c8`) at `cba69ef`; only `BLOCKERS.md` and `CURRENT_STATE.md` conflicted, no code.
`BLOCKERS.md` keeps both sides' records. The baton and `last-verified-at` come from the branch side. `pnpm verify` is green, and so is `gates.py docs`.
Not done: no golden was re-seeded; B-20261012-03 and D-20261021-01 are untouched, and T-037 stays `review`.
Body: `handoff/zayd/2026-10-23-T-037-merge-main-f1.md`

## T-037 — the section chord tolerance, chosen for Revit-class drawings — 2026-10-12 — seat: zayd

`SECTION_DEFLECTION` 0.5 → 0.01 mm: 0.01 mm on paper at 1:1, the smallest Revit-class scale (D92, §4.1).
`tests/section-chord-tolerance.test.ts` bounds vertices and chord midpoints on r150/r600 columns; red at 0.02 and 0.5.
Found: float32 point transfer exceeds the tolerance beyond 131 m from the view origin (`## Discovered`).
Body: `handoff/zayd/2026-10-12-T-037-section-chord-tolerance.md`

## T-037 — review of PR #72 — 2026-10-12 — seat: hmdnah

Changes requested, back to zayd (`--continue T-037`): CI's re-seed gate is red and right — no golden was re-seeded (B-20261012-01).
Item 1: `SECTION_DEFLECTION` 0.5 → red (worst 0.486 / 0.499 mm > 0.0102), restored → green; full suite 912/912.
ISO 128 / Revit 1:1 claims unverified here (web denied) — amer to confirm.
Body: `handoff/hmdnah/2026-10-12-T-037-review.md`

## T-037 — return of PR #72, incomplete — 2026-10-12 — seat: zayd

Not done: `uv run seed-goldens ../../tests/goldens` was refused again by this session's permissions ("requires approval").
B-20261012-01 stays uncleared; PR #72's re-seed gate stays red. Only the log, state and body changed.
Next on this branch: a session permitted to run the seeder performs B-20261012-01's `need:`.
Body: `handoff/zayd/2026-10-12-T-037-section-chord-tolerance.md`

## T-037 — third turn on PR #72, incomplete — 2026-10-12 — seat: zayd

Not done: the seeder was refused a third time ("requires approval"); no golden re-seeded, re-seed gate still red.
Found: this branch conflicts with `main` on a duplicate blocker id B-20261012-01 (PR #72 vs PR #74); filed to `## Discovered`.
Next: a steward rules the id collision; a permitted session runs B-20261012-01's `need:`.
Body: `handoff/zayd/2026-10-12-T-037-section-chord-tolerance.md`

## T-037 — fourth turn on PR #72, incomplete — 2026-10-12 — seat: zayd

Not done: the seeder was refused a fourth time ("requires approval"); no golden re-seeded, re-seed gate still red.
Already recorded as B-20261012-03 on `main` (uncleared); not re-filed. No code changed.
Next: a session permitted to run the seeder performs B-20261012-03's `need:` on this branch.
Body: `handoff/zayd/2026-10-12-T-037-section-chord-tolerance.md`

## T-037 — fifth turn on PR #72, merged with main, incomplete — 2026-10-12 — seat: zayd

Merged `origin/main` per the steward ruling: main's BLOCKERS kept, the branch's two records re-appended as B-20261012-05/-06.
Not done: the seeder was refused a fifth time ("requires approval"); no golden re-seeded. B-20261012-03 not re-filed.
Next: a session permitted to run the seeder performs B-20261012-03's `need:` on this branch.
Body: `handoff/zayd/2026-10-12-T-037-section-chord-tolerance.md`

## T-037 — sixth turn on PR #72, merged with main (F1), incomplete — 2026-10-23 — seat: zayd

Merged `origin/main`; only docs conflicted. The branch's PR #72 blockers were re-appended as B-20261012-09/-10, since main took -05/-06.
BLOCKED was re-rendered by `blocked.py`. Six T-037 abstracts were kept, and T-037 stays `review`.
Not done: no golden re-seeded and the seeder was not tried; B-20261012-03 stays uncleared.
Body: `handoff/zayd/2026-10-23-T-037-merge-main-f1.md`

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

## T-051 — review step 2 of PR #124 — 2026-11-05 — seat: hmdnah

No defect proven; approve and merge via `agent_merge.py`, not owner-gated. Item 1: tags removed → `wall-motion.test.ts` 6 failed | 2 passed, grid-bound now red; restored → 31 passed.
Re-seeding with the pinned oracle here matches the committed golden exactly (`seededAt` excluded). Max drift from x86_64 is 1.89e-12 relative. CI 42020545530 at `03c4d58` is green, re-seed gate included.
`core.move` and `core.setParams` give identical tessellated geometry, joined partner included.
Body: `handoff/hmdnah/2026-11-05-T-051-review-step-2.md`

## STEWARD-promote-t036 — T-036 promoted `ready` — 2026-11-05 — seat: brahim

T-036's only depends-on, T-051, is `done`: PR #124 MERGED 2026-11-05T13:57:54Z, step 2 by hmdnah.
Its note's hold (T-035's design ruled, built by T-050 then T-051) is discharged by that merge.
Body: `handoff/brahim/2026-11-05-STEWARD-promote-t036-ready.md`

## T-036 — `core.copy` deep-copies a host's openings (D94) — 2026-11-05 — seat: zayd

`core.copy` of a host now copies each hosted element under a fresh PEI, in the same edit; its `hostRef` is re-derived on the copy with `partNodeId`.
`tests/host-deep-copy.test.ts` (real OCCT, demo wall + 2 openings): 4 passed; with the deep-copy removed, 2 failed.
`pnpm verify` → 125 files, 1073 passed, 4 skipped; docs:check 66 passed.
Body: `handoff/zayd/2026-11-05-T-036-host-deep-copy.md`

## T-036 — review step 1 of PR #125 — 2026-11-05 — seat: hmdnah

Step 1 passes with no defect proven. `copiedHostRef` meets done-when 2: it decodes the token and re-derives `nodeId` with `partNodeId`.
Item 1: with `commands.ts` reverted to main, `tests/host-deep-copy.test.ts` → 3 failed | 1 passed; restored → 35 passed across 3 files.
Not owner-gated: no frozen or reserved path is touched. Not approved, not merged; the row stays `review`.
Body: `handoff/hmdnah/2026-11-05-T-036-review-step-1.md`

## T-036 — review step 2 of PR #125 — 2026-11-05 — seat: hmdnah

No defect proven; approve and merge via `agent_merge.py`, not owner-gated. Item 1: `commands.ts` at main → `host-deep-copy.test.ts` 3 failed | 1 passed; restored → 4 passed.
Done-when 2 is met but not test-pinned. `.replace` differs only on a hostRef naming another element's face, which `createElement` accepts; a deleted probe caught that, while the other 35 tests stayed green.
Body: `handoff/hmdnah/2026-11-05-T-036-review-step-2.md`

## DEPS-118 — review of PR #118 (vite 6.4.3 → 6.4.4, dependabot) — 2026-11-05 — seat: hmdnah

No defect proven; approve and merge via `agent_merge.py`, not owner-gated. Item 1: bump reverted → installed vite `6.4.3`, assert exits 1; restored → `6.4.4`, exit 0.
On the merge with main `eeb1c40`: `pnpm verify` → 125 files, 1073 passed, 4 skipped; docs:check 66 passed; `apps/web` `vite build` built.
Lockfile integrities for `rollup@4.65.0` and its new optional `@napi-rs/lzma-linux-x64-gnu@1.5.1` match `npm view`.
Body: `handoff/hmdnah/2026-11-05-DEPS-118-review.md`

## DEPS-126 — review of PR #126 (vite 6.4.4 → 6.4.5, dependabot) — 2026-11-05 — seat: hmdnah

No defect proven; approve and merge via `agent_merge.py`, not owner-gated. Item 1: bump reverted → installed vite `6.4.4`, assert exits 1; restored → `6.4.5`, exit 0.
On `608a2d7` (base = origin/main `d92e28c`): `pnpm verify` → 125 files, 1073 passed, 4 skipped; docs:check 66 passed; `apps/web` `vite build` built.
Lockfile integrities for vite 6.4.5, rollup 4.67.5, postcss 8.5.32 and `@types/estree` 1.0.10 match `npm view`.
Body: `handoff/hmdnah/2026-11-05-DEPS-126-review.md`

## DEPS-127 — review of PR #127 (vitest 4.1.10 → 4.1.11, dependabot) — 2026-11-05 — seat: hmdnah

No defect proven; approve and merge via `agent_merge.py`, not owner-gated. Item 1: bump reverted → installed vitest `4.1.10`, assert exits 1; restored → `4.1.11`, exit 0.
On `412d126` (base = origin/main `fe87966`): `pnpm verify` → 125 files, 1073 passed, 4 skipped; docs:check 66 passed.
Lockfile integrities for vitest 4.1.11, the `@vitest/*` 4.1.11 set and 6 transitive bumps match `npm view`.
Body: `handoff/hmdnah/2026-11-05-DEPS-127-review.md`

## T-068 — a dependabot PR routes by head branch and bot author — 2026-11-05 — seat: zayd

`scripts/pr-ready.mjs` routes a PR on a `dependabot/` head authored by `app/dependabot` (is_bot); `main` now calls an injectable `checkPr`.
Test-first 5 red → 12 passed; revert-verify: route disabled → the bot case red. Bare dependabot `--title` still exits 1; CONFLICTING/UNKNOWN still fail.
`pnpm verify` → 125 files, 1078 passed, 4 skipped; docs:check 71 passed. B-20261025-01 stays open for diwan's half.
Body: `handoff/zayd/2026-11-05-T-068-dependabot-pr-shape.md`

## T-068 — review step 1 of PR #128 — 2026-11-05 — seat: hmdnah

No defect proven at `5f7a2d2`. Item 1: with the dependabot branch deleted, `pr-ready.test.ts` → 2 failed | 10 passed; restored → 12 passed.
Live `gh pr view 118` author/head fed to `dependabotRoutes` → `true`; reserved-class scan `classes: []` (CI: RISK additive). `pnpm verify` → 1078 passed, 4 skipped.
Step 1 only: no approval, no merge; the row stays `review`.
Body: `handoff/hmdnah/2026-11-05-T-068-review-step-1.md`

## T-068 — review step 2 of PR #128 — 2026-11-05 — seat: hmdnah

No defect proven; approve and merge via `agent_merge.py`, not owner-gated. Item 1: route forced `false` → `pr-ready.test.ts` 2 failed | 10 passed; restored → 12 passed.
Item 6: dropping either the `is_bot` or the `login` half of `dependabotRoutes` left all 12 green; two added cases each turn their mutant red (1 failed | 13 passed); restored → 14 passed.
Item 3: the labeller step behind `pr-ready` already ran on dependabot-authored PR #127 (run 42088259170, "labels already correct").
Body: `handoff/hmdnah/2026-11-05-T-068-review-step-2.md`

## T-033 — `Dimension.anchors` excludes the free `point` anchor — 2026-10-12 — seat: zayd

`Dimension.anchors` is `ModelAnchor[]` (`AnnotationAnchor` minus `point`, D97); `Tag` keeps `point`. A
`@ts-expect-error` test fails `tsc` (TS2578) with the narrowing reverted. No `Dimension.anchors` reader
under `packages/`. RISK: contract-touching (re-baselined) — owner merges. `pnpm verify` green (911).
Body: `handoff/zayd/2026-10-12-T-033-dimension-model-anchors.md`

## T-033 — flow fix: PR #69 merged with `origin/main` — 2026-10-20 — seat: zayd

Merged `origin/main` into the branch; conflicts only in BACKLOG, CURRENT_STATE and PHASE_LOG, no code.
The frozen-surface snapshot is untouched (main moved no watched path). `pnpm verify` green (977 passed, 1 skipped).
PR #69 stays owner-gated; not merged.
Body: `handoff/zayd/2026-10-20-T-033-main-merge.md`

## T-033 — flow fix: PR #69 merged with `origin/main` again — 2026-10-20 — seat: zayd

Merged `origin/main` (`7da6795`) per D-20261020-01's `changes`; conflicts only in BACKLOG, CURRENT_STATE and PHASE_LOG, no code.
The frozen-surface snapshot is untouched (main moved no watched path). `pnpm verify` green (1003 passed, 1 skipped).
PR #69 stays owner-gated; not merged.
Body: `handoff/zayd/2026-10-20-T-033-main-merge.md`

## T-033 — flow fix: PR #69 merged with `origin/main` (`26336a6`) — 2026-10-28 — seat: zayd

Merged `origin/main` per the manager's F1; conflicts only in BACKLOG, CURRENT_STATE and PHASE_LOG, no code.
The frozen-surface snapshot is untouched (main moved no watched path). `pnpm verify` green (1059 passed, 4 skipped).
PR #69 stays owner-gated; not merged.
Body: `handoff/zayd/2026-10-28-T-033-main-merge.md`

## T-033 — review step 1 of PR #69 — 2026-11-06 — seat: hmdnah

DEFECT PROVEN at `ee4d7b9`: SYNC merge `36473d8` merged T-034's snapshot textually, not by re-baselining it. `surface` holds 216 declarations, but `_declarationCount` reads 215.
Item 1: with `Dimension.anchors` reverted, `tsc -p tsconfig.json` → TS2578 at `documentation-anchoring.test.ts(266,9)`, exit 2; restored → exit 0. Labeller: contract-touching + freeze, as the diff warrants.
Filed B-20261105-03 for zayd; changes requested, the row stays `review`.
Body: `handoff/hmdnah/2026-11-06-T-033-review-step-1.md`

## T-033 — PR #69's snapshot re-baselined (B-20261105-03) — 2026-11-06 — seat: zayd

`pnpm state --rebaseline` set `_declarationCount` 215 → 216, the only field it moved; a second run left the file byte-identical.
`pnpm verify` exit 0 (1081 passed, 4 skipped). PR #69 stays owner-gated; next is hmdnah's step 1.
Body: `handoff/zayd/2026-11-06-T-033-snapshot-rebaseline.md`

## T-033 — review step 1 of PR #69, re-run — 2026-11-06 — seat: hmdnah

No defect proven at `9cf4604`; the snapshot is byte-identical to `baselineSnapshot(buildSurface('.'))` (216/216).
Item 1: the reverted narrowing gives `tsc` exit 2 (TS2578) and a red `freeze-boundary` (`interface Dimension` CHANGED); restored, both are green. `pnpm verify` exits 0 (1081 passed, 4 skipped).
Labeller: contract-touching + freeze, which matches the diff. No approval, no merge; the row stays `review` for step 2.
Body: `handoff/hmdnah/2026-11-06-T-033-review-step-1.md`

## T-033 — review step 2 of PR #69 — 2026-11-06 — seat: hmdnah

No defect proven at `c6bd581`; approve, and merge on D-20261028-01's owner sign-off (contract-touching + freeze released).
Item 1: the reverted narrowing makes `tsc` exit 2 (TS2578) and turns `freeze-boundary` red; restored, both are green. Items 2/3: `Dimension.anchors` has no reader, and `annotations` is still a reservation.
Item 6: vitest alone passes the new test reverted, but `tsc` (CI `pnpm typecheck`) holds it. `core_logic.md:372` still calls the narrowing "NOT FIXED", which a brahim turn should annotate.
Body: `handoff/hmdnah/2026-11-06-T-033-review-step-2.md`

## STEWARD-backstop-t033 — T-033 flipped `done` — 2026-11-06 — seat: brahim

PR #69 (T-033) is MERGED as `f5223cf`, yet its row still read `review` and the start sheet printed "backstop: nothing to flip".
Cause: as on 2026-11-05, `agent_start.py` lists 20 merged PRs ordered by creation, which leaves out #69. No promotion: no row depends on T-033.
Not landed: the finish refused D-20261028-01's `answered:` stamp and the `core_logic.md:372` note as outside the bookkeeping paths.
Body: `handoff/brahim/2026-11-06-STEWARD-backstop-t033-flip.md`
