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

## T-044 — review step 2 of PR #90 (on the fix) — 2026-10-23 — seat: hmdnah

Approved; no defect proven. Item 1 at `24a0cc3`: pre-fix plugin and `codeId.ts` restored → 2 red (step 1's probe); restored →
4 green. Two real app builds: only the 4 HTML entries change bytes; `PartBatch-*.js` keeps name and bytes. Chromium reads the
meta. Reserved classes: none; CI green. Not owner-gated. Body: `handoff/hmdnah/2026-10-23-T-044-review-step-2.md`

## T-044 — `CODE_ID` is stamped into the HTML, never a hashed chunk (B-20261020-02) — 2026-10-23 — seat: zayd

`codeIdPlugin` stamps the bundle digest into each HTML entry's meta tag; `CODE_ID` reads it at runtime. hmdnah's
probe is landed; pre-fix code → 2 red (probe: `assets/id-GK_lKDOT.js`), restored → 4 green. Merged `origin/main`
(PR #90 conflicted). `pnpm verify` → 1024 passed, 1 skipped. Body: `handoff/zayd/2026-10-23-T-044-codeid-in-html.md`

## T-043 — review step 2 of PR #89 (on the fix) — 2026-10-23 — seat: hmdnah

Approved; no defect proven. Item 1 at `f840309`: the `openCacheIndex` try/catch reverted → 1 red (`RangeError`); restored →
green. An e2e `rebuildAll` probe on the hostile index: red reverted, green restored. `pnpm verify` → 1020 passed, 1 skipped.
Reserved classes: none; CI green. Not owner-gated. Body: `handoff/hmdnah/2026-10-23-T-043-review-step-2.md`

## T-043 — a hostile cache index is refused, not thrown (B-20261020-01) — 2026-10-23 — seat: zayd

`openCacheIndex` returns `undefined` when `verifyCacheIndex` throws; hmdnah's 200,000-deep probe is a test, red before.
Merged `origin/main` (PR #89 conflicted); main's T-052/T-056 tests now pass a secret. `pnpm verify` → 1020 passed, 1 skipped.
Body: `handoff/zayd/2026-10-23-T-043-hostile-index-refused.md`

## T-044 — review step 1 of PR #90 — 2026-10-20 — seat: hmdnah

Changes requested (step 1): the stamped chunk keeps its pre-stamp content-hash name, so a URL-keyed cache can serve
a stale `CODE_ID` (B-20261020-02). Proof: two app builds give `PartBatch-C8aMdl36.js` the same name and different
bytes, and a probe test reads 1 red. Item 1: assets dropped from the digest → 1 red, restored 3 green. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-T-044-review-step-1.md`

## T-044 — D29 R6 — `codeId` is the shipped bundle's sha256 (D-20261012-06 `bundle`) — 2026-10-20 — seat: zayd

`vite build` stamps `CODE_ID` (`apps/web/src/codeId.ts`) with sha256 over every chunk and asset (`codeIdPlugin.ts`).
`cacheEnvelope(kernelBuildId)` carries it; nothing calls it yet (`## Discovered`). A real fixture build: a changed
main or worker moves the id. Revert-verified twice, 1 red then 3 green each. `pnpm verify` green (979).
Body: `handoff/zayd/2026-10-20-T-044-d29-codeid-bundle.md`

## T-056 — review step 2 of PR #104 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: mtime 1980-01-02 → 2 red; `saveBnn` inlining level 5 → 1 red (worker ≠ save); restored
→ 2 passed. One production `zipSync` remains, at `bnnzip.ts:26`. Step 1's item-6 flag holds the done-when: the reference
catches it. `pnpm verify` → 1002 passed, 1 skipped. Not owner-gated. Body: `handoff/hmdnah/2026-10-20-T-056-review-step-2.md`

## T-056 — review step 1 of PR #104 — 2026-10-20 — seat: hmdnah

No defect proven; no approval, no merge, and the row stays `review`. Item 1: `level` 5 → 1 red, and a 1980-01-02 mtime → 2 red;
restored → 2 passed. The 16k re-run is discharged through a /tmp vitest config: `saveBnn` 4075.8 ms with the cache, now in
design §5. `pnpm verify` → 1002 passed, 1 skipped. Not owner-gated. Body: `handoff/hmdnah/2026-10-20-T-056-review-step-1.md`

## T-056 — a save carrying the D29 cache can zip off the main thread — 2026-10-20 — seat: zayd

`saveBnn` is `zipBnnEntries(assembleBnnEntries(...))`; the zip step is `bnnzip.ts`, fflate only, for a worker.
New test: worker bytes equal `saveBnn` and an independent `zipSync` reference, 20-solid cache and cache-less;
level 5 and a 1980-01-02 mtime each turn it red. `pnpm verify` → 1002 passed, 1 skipped. Unverified here: the 16k
re-run (env-prefixed command refused) — hmdnah to confirm. Body: `handoff/zayd/2026-10-20-T-056-bnn-zip-worker.md`

## STEWARD-cache-save-zip-worker — review of PR #103 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: T-056's `implements:` and `risk:` removed → `gates.py docs` RED (exit 1, both
named); restored → GREEN, `pnpm docs:check` 66 passed. Cited sites (`bnn.ts:189`, fflate `:2287`, `App.tsx:297-301`)
read and match. Unverified here: the 16k timings, not re-run — zayd to confirm in T-056. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-STEWARD-cache-save-zip-worker-review.md`

## STEWARD-cache-save-zip-worker — T-056 from the 2026-10-14 finding — 2026-10-20 — seat: brahim

T-056 (`ready`, `risk: high`, `depends-on: —`) splits `saveBnn` so its level-6 zip can run in a worker with identical bytes.
A diagnosis subagent re-measured at `12fa699`: 4076–4249 ms at 16k. Level 1 is ~3.0 s, and level 0 is ~0.4 s at 6x the bytes,
so a lower level is not the fix. Wiring the worker into `apps/web` needs a browser and T-044, so it is left for a later row. No code changed.
Body: `handoff/brahim/2026-10-20-STEWARD-cache-save-zip-worker-t056.md`

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

## T-043 — review step 2 of PR #89 — 2026-10-20 — seat: hmdnah

DEFECT; not approved, not merged, row stays `review` (B-20261020-01). A hostile `index.json` with deeply nested `records`
makes `verifyCacheIndex`'s recursive `canonicalJson` throw `RangeError`, so `rebuildAll` rejects and the file does not open;
with the verify call removed it opens. Item 1: `true ||` before `sameInstallSecret` → 1 red; restored → 34 green.
Body: `handoff/hmdnah/2026-10-20-T-043-review-step-2.md`

## T-043 — review step 1 of PR #89 — 2026-10-20 — seat: hmdnah

No defect proven; not approved (step 1). Item 1: `verifyCacheIndex` check removed → 7 red across the three d29 files;
restored → 34 green. 16k signing re-measured 2073.6 ms, foreign open 92 ops; a 0.4 mm `.brep` edit is refused.
Reserved classes: none; CI green on `9cf35b6`. Items 2, 3, 6 are step 2's.
Body: `handoff/hmdnah/2026-10-20-T-043-review-step-1.md`

## T-043 — D29 R5 — the cache envelope is trusted per the owner answer to D-20261012-05 — 2026-10-20 — seat: zayd

`own` built: `envelope.mac` is an HMAC-SHA-256 keyed by a per-install secret over the canonical index; `openCacheIndex`
refuses any other, so a foreign or edited file opens with 0 imports and a cache-less open's op sequence (real OCCT).
Test-first (12 red); MAC check reverted → 7 red, carry guard → 1 red. 16k signing: 2,074 ms, one run.
Body: `handoff/zayd/2026-10-20-T-043-d29-cache-trust.md`

## T-049 — A cache restore reads each batch of roots' entries in one `readMany` — 2026-10-19 — seat: zayd

`#stage` reads one `readMany` per `RESTORE_BATCH_ROOTS` (1024) roots; a throw from it rebuilds that batch. New test:
2B+5 roots → 0 `.brep` reads, 3 `readMany`; per-name `read` restored → 2053 reads, red. 16,000 entries restore in
16 calls, 1,059–1,122 ms of `readMany`, 2.28–2.40 s `rebuildAll` (kernel import excluded). `pnpm verify` green (978).
Body: `handoff/zayd/2026-10-19-T-049-cache-restore-batch.md`

## T-049 — review step 1 of PR #88 — 2026-10-19 — seat: hmdnah

No defect proven; not approved (step 1). Item 1: main's per-part `read` restored with `RESTORE_BATCH_ROOTS` kept →
2 red (`brepReads: 2053, readMany: 0`); restored → 26 green over the four files. 16k re-measured: 16 `readMany`,
1,157–1,208 ms, `rebuildAll` 2.39–2.51 s. Reserved classes: none; CI green on `54b7c62`. Items 2, 3, 6 are step 2's.
Body: `handoff/hmdnah/2026-10-19-T-049-review-step-1.md`

## T-049 — review step 2 of PR #88 — 2026-10-19 — seat: hmdnah

DEFECT; not approved, not merged, row stays `review` (B-20261019-04). One corrupt `.brep` (DEFLATE `invalid block type`)
rebuilds its whole batch: a 3-root probe restores 0 at `355d4cd` and 2 on main, against design §4's per-root restore.
Item 1: per-name `read` at `cacherestore.ts:118` → red (`brepReads: 2053`); restored → 26 green. Items 2, 3, 6 are clean otherwise.
Body: `handoff/hmdnah/2026-10-19-T-049-review-step-2.md`
