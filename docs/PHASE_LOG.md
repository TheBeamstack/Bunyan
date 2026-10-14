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
`T-nnn`/`STEWARD-slug` turns through 2026-08-31 · sealed 2026-10-07.

## T-027 — PR #55 brought up to date with main again — 2026-10-12 — seat: zayd

Merged `origin/main` (`681c2b4`) to clear #55's conflicts (BACKLOG, CURRENT_STATE), B-20261011-07; T-027
kept at `review`, the `window.bunyan` finding dropped as main's T-032. `pnpm verify` green (910 tests).
Body: `handoff/zayd/2026-10-12-T-027-merge-main-2.md`

## T-027 — §6's relink cap is measured, not guessed — 2026-10-06 — seat: zayd

`docs/CURRENT_STATE-reference.md §6` relink recipe `--memory=2g` → `--memory=1g --memory-swap=1g`, citing
hmdnah's T-022 step-2 run (78 s, exit 0, byte-identical, hard 1 GB cgroup, swap off). Docs only; no relink
re-run (optional per `done-when:`); README step 3 / `probe.sh` 2g recorded in `## Discovered`.
Body: `handoff/zayd/2026-10-06-T-027-relink-cap-measured.md`

## T-027 — PR #55 brought up to date with main — 2026-10-10 — seat: zayd

Merged `origin/main` to clear #55's conflicts (BACKLOG, PHASE_LOG); §8 restored to its `pnpm state` block,
which `401e22d` replaced with a `measure.py` one and so turned `main` red. `pnpm verify` exit 0 (898 tests).
Body: `handoff/zayd/2026-10-10-T-027-merge-main.md`

## T-006 — the keep-live set and a lazy first paint — 2026-10-08 — seat: zayd

An opened `.bnn` now builds only what the camera sees (`view/keepLive.ts`, `rebuildOnly` per level,
camera level first); `bootstrap()` no longer calls `rebuildAll()`. Browser-measured on the box
(headless Chromium, SwiftShader): 87.5 % of elements deferred, 71.0–76.8 % of first paint removed.
Body: `handoff/zayd/2026-10-08-T-006-keep-live-lazy-first-paint.md`

## T-006 — review of PR #61 — 2026-10-10 — seat: hmdnah

Approved: revert of `keepLiveSet`'s keep-live guards went red (2 of 9) and green restored; browser re-run
73.3 % of first paint removed (11 of 88 built). Fixed test-first: a future-version Type is now kept live (D43).
Body: `handoff/hmdnah/2026-10-10-T-006-review.md`

## STEWARD-merge-remeasure-diagnosis — diagnosis — 2026-10-10 — seat: brahim

see: docs/BLOCKERS.md#B-20261010-03 · Read-only R39 finding: diwan `agent_merge.py` `step_remeasure` splices `measure.py`'s block over Bunyan's
`state.mjs` §8 block with no owner check; fix and restore order named. No code changed.
Body: `handoff/brahim/2026-10-10-B-20261010-03-diagnosis.md`

## STEWARD-owner-rulings-q5-q10 — owner answers Q5–Q10 recorded as D92–D97, built as T-033–T-038 — 2026-10-10 — seat: brahim

- Acted on `D-20261007-02…07` and stamped `answered:`; `-08`/`-11` pending, untouched.
- Rows: T-033 (Q10), T-034 (Q9), T-037 (Q5) ready builds; T-035 (Q8), T-038 (Q6) ready design docs;
  T-036 (Q7) blocked on T-035, since `core.copy` refuses every baseline wall today (`placement.ts:348`).
- Rebased onto `main` 2026-10-11 and renumbered from T-033 (`backlog.py next-id`), as `main`'s a68b995 took T-032.
- Next: `hmdnah` reviews this PR once B-20261010-03 is cleared.
- Body: `handoff/brahim/2026-10-10-STEWARD-owner-rulings-q5-q10-d92-d97.md`

## STEWARD-owner-rulings-q5-q10 — PR #63 rebased onto 9d05388, B-20261011-03 cleared — 2026-10-11 — seat: brahim

Rebased cleanly onto `main` 9d05388 (1ef86f9); T-033–T-038 kept, as `backlog.py next-id` measures main at T-033.
`pnpm verify` passed (898+66); `gh pr view 63` reads MERGEABLE. Next: `hmdnah` reviews PR #63.
Body: `handoff/brahim/2026-10-11-STEWARD-owner-rulings-q5-q10-rebase.md`

## STEWARD-HANDOVER-H-20261011-13 — review of PR #64 — 2026-10-11 — seat: hmdnah

Approved: Custodianship's `verify-handovers.py` went FAILED (rc=1) on a mirror whose `need:` disagreed with
PR #64's copy, PENDING/0 failed (rc=0) on the real one; the record's `gh api` evidence re-ran as stated.
Body: `handoff/hmdnah/2026-10-11-STEWARD-HANDOVER-H-20261011-13-review.md`

## T-010 — two doors on one wall, confirmed in the browser — 2026-10-11 — seat: zayd

Headless Chromium 153 on the box, driven by `tools/browser-check/two-doors.mjs`: both floor-seated doors
on Wall 1 `valid`, `[leaf, frame]`, no broken ref. The boot's one console error, a `/favicon.ico` 404, is
gone (`index.html` icon link); the driver exits 1 without it and 0 with it.
Body: `handoff/zayd/2026-10-11-T-010-two-doors-browser.md`

## T-010 — review of PR #66 — 2026-10-11 — seat: hmdnah

Approved: `two-doors.mjs` re-run in headless Chromium 153 exits 1 with main's `index.html` (favicon 404),
0 restored. It also exits 0 with T-009's guard neutered, so it does not test D84; `requires:` omits playwright-core.
Body: `handoff/hmdnah/2026-10-11-T-010-review.md`

## T-019 — the move-tool gizmo + corner-drag, redone against main — 2026-10-11 — seat: zayd

Closed PR #17's `handles.ts`, handle overlay and gesture ported onto main. `corner-drag.mjs` in Chromium 153:
one gesture, one `transactionId`, one Ctrl+Z; feed +0 mid-drag. Projection drift ≤3e-12 px, not
byte-identical: the camera drifts idle (`## Discovered`). Revert-verified.
Body: `handoff/zayd/2026-10-11-T-019-corner-drag-gizmo.md`

## T-019 — review of PR #67 — 2026-10-11 — seat: hmdnah

Approved with a reviewer fix: projection drift ≤2.6e-12 px was not byte-identical; `Viewport.#tick`'s
redundant `OrbitControls.update()` removed, `corner-drag.mjs` tightened to byte-identity, red before, 0 after.
Item 1: `handles.ts` z → 0 fails the Level-elevation test; restored, 10 pass.
Body: `handoff/hmdnah/2026-10-11-T-019-review.md`

## T-032 — agent edits wait on the document lock — 2026-10-11 — seat: zayd

`withUiRefresh` takes `App`'s `DocLock` and runs `execute`/`undo`/`redo`/`dryRun` through `lock.run`, so an
agent call cannot commit while `buildKeepLive` or a human edit holds it. Two tests, red on main's wrapper,
green after; `pnpm verify` green (910 tests). `App.tsx`'s one-line wiring is reviewer-checked.
Body: `handoff/zayd/2026-10-11-T-032-agent-doclock.md`

## T-032 — review of PR #68 — 2026-10-12 — seat: hmdnah

Approved and merged. Item 1: main's `agentRefresh.ts` → 2 failed, 6 passed; restored → 16 pass.
`App.tsx` L232 passes the same `docLock` as human edits and `buildKeepLive`; dropping it fails `tsc` (TS2554).
Body: `handoff/hmdnah/2026-10-12-T-032-review.md`

## T-027 — review of PR #55 — 2026-10-12 — seat: hmdnah

Approved. The citation matches the T-022 step-2 run (1g, swap off, 78 s, byte-identical). Item 1: B-20261011-07's
clearance; `gates.py docs` is red with `BLOCKERS.md` at main (R15), green restored. Relink not re-run here.
Body: `handoff/hmdnah/2026-10-12-T-027-review.md`

## T-035 — design: moving a D52 baseline wall — 2026-10-12 — seat: zayd

`docs/design/P4.5_baseline_move_design.md`: move/copy/rotate/setPlacement refuse on 8 of 8 demo-wall calls.
Recommends a `ParamField.motion?` position tag (pre-step-6, contract-touching); owner asks: `D-20261012-03`, `-04`.
Revit/Archicad/Rhino rows unverified here (no web access) — hmdnah to confirm. No code changed.
Body: `handoff/zayd/2026-10-12-T-035-baseline-move-design.md`

## T-035 — review of PR #71 — 2026-10-12 — seat: hmdnah

Approved. Item 1: §A probe re-run, 8/8 baseline-rung refusals and 2/2 `setParams` accepted; `placement.ts:275`
rung disabled → red (0 refusals), restored → green. Q8a/Q8b split lawful (Q8 closed, two distinct questions).
§4 vendor rows still unverified here: web tools denied this session.
Body: `handoff/hmdnah/2026-10-12-T-035-review.md`

## T-038 — design: the D29 cache in the `.bnn` — 2026-10-12 — seat: zayd

`docs/design/P5_step9_D29_bnn_cache_design.md`: per-assembly input key over what `buildAssembly` reads, plus an
envelope (`codeId`, own `kernelBuildId`); `geometry-cache/` additive, no frozen shape moves; saves never export
(106 s at 16k), the cache is written lazily. Rows R1–R7. Owner asks: `D-20261012-05`, `-06`, `-07`. No code changed.
Body: `handoff/zayd/2026-10-12-T-038-d29-bnn-cache-design.md`

## T-038 — review step 1 of PR #73 — 2026-10-12 — seat: hmdnah

Not approved (step 1). Defect: §2b keys styles only for root + `hostedBy`; a D59 child's style (`build.ts:590,753`)
moves no key. Throwaway OCCT test: key unchanged, rebuilt 2e7 → 6e7 mm³ (red); `styles` digested whole → green.
§5's 60-solid figures cite the wrong source (Entry 71's handoff, not the test). Risk gate ran: additive.
Body: `handoff/hmdnah/2026-10-12-T-038-review-step-1.md`

## T-038 — review step 2 of PR #73 — 2026-10-12 — seat: hmdnah

Approved. Step 1's defect re-measured on OCCT: child-only style edit, pre-fix key unchanged (red), revised key
flips (green), 3.0e7 → 7.0e7 mm³; reformat and unrelated edit flip nothing. Restore is load-only; citation fixed.
Items 2/3/6: every `buildAssembly` scene read is keyed. Note: R1/R3 "exactly" wording excludes whole tables.
Body: `handoff/hmdnah/2026-10-12-T-038-review-step-2.md`

## STEWARD-d29-cache-decomposition — T-038's rows R1–R7 filed — 2026-10-12 — seat: brahim

`backlog.py add`: T-039 (R1, `ready`) … T-045 (R7), sequenced after T-038; T-040–T-042 blocked on their
predecessors, T-043–T-045 also on `D-20261012-05/-06/-07`. All `risk: high` (READY rule 8, D29). R1/R3 criteria
exclude the five whole-digested tables, per hmdnah's step-2 note. No code changed.
Body: `handoff/brahim/2026-10-12-STEWARD-d29-cache-decomposition-rows.md`

## STEWARD-d29-cache-decomposition — review of PR #74 — 2026-10-12 — seat: hmdnah

Approved, merged `e68efad`. Rows match design §6 deps; T-039 ready, rest blocked; carve-out names §2b's five
tables. Item 1: revert leaves `gates.py docs` green (additive); deleting T-039's `implements:` turns it red.
Note: T-041 "rebuilds only its assembly" is false for a joined endpoint (`resolveJoins`); non-blocking.
Body: `handoff/hmdnah/2026-10-12-STEWARD-d29-cache-decomposition-review.md`

## STEWARD-pr74-review-record — PR #74's review record landed; T-041 wording — 2026-10-12 — seat: brahim

Cherry-picked hmdnah's 4e2abd9/7193a47 (performs B-20261012-01's need; cleared on merge), keeping main's baton.
T-041's restore criterion now counts a `resolveJoins` neighbour, per hmdnah's note. Finding: two records share
id B-20261012-01 (main: PR #74; T-037 branch: PR #72); the branch's are renumbered when it rebases.
Body: `handoff/brahim/2026-10-12-STEWARD-pr74-review-record-landing.md`

## STEWARD-pr74-review-record — review of PR #75 — 2026-10-12 — seat: hmdnah

Approved; record written before the merge. Cherry-picks byte-identical (`git range-diff`). Item 1: the record's
body removed → `git ls-files --error-unmatch` exit 1; restored → 0. `gates.py docs` stays green on a dangling
`Body:` path (gate gap). Design §6 R3 still says "only its assembly"; non-blocking.
Body: `handoff/hmdnah/2026-10-12-STEWARD-pr74-review-record-review.md`

## STEWARD-d29-r3-rebuild-scope — design §6 R3 agrees with §2b and T-041 — 2026-10-12 — seat: brahim

The D29 design's R3 criterion said a hand edit "rebuilds only its assembly"; §2b keys on joined neighbours and
whole shared tables, so it now reads "exactly the assemblies whose §2b key it flips", as T-041 already does.
Spec fix only (hmdnah's PR #75 note); the rest of the diff is prettier's table padding.
Body: `handoff/brahim/2026-10-12-STEWARD-d29-r3-rebuild-scope-design-fix.md`

## STEWARD-d29-r3-rebuild-scope — review of PR #76 — 2026-10-12 — seat: hmdnah

Approved; record written before the merge. R3 now matches §2b and T-041; word-diff shows only R3's cell changed.
Item 1: design reverted → "only its assembly" probe red, restored green; R3 wording reverted with new padding →
`prettier --check` exit 1, restored exit 0. `pnpm verify` green (910 tests). Not owner-gated.
Body: `handoff/hmdnah/2026-10-12-STEWARD-d29-r3-rebuild-scope-review.md`

## T-039 — D29 R1 — the cache input key, one pass over the scene — 2026-10-12 — seat: zayd

`packages/document/src/cachekey.ts`: per-root `sha256` of canonical JSON (rows, owned and `<root>:` constraint
rows, resolved joins, five-table digest) and the `bnnc1` envelope. 22 tests; each class revert-verified red.
Keys at 1k/4k/16k: 0.15/0.29/1.18 s, after indexing `joinOverridesOf` (was 113.6 s at 16k). `pnpm verify` green.
Body: `handoff/zayd/2026-10-12-T-039-d29-cache-input-key.md`

## T-039 — review step 1 of PR #77 — 2026-10-12 — seat: hmdnah

Not approved (step 1). Defect: owned constraint rows are keyed id-sorted (`cachekey.ts:93-94`) but `datumElevations`
is last-wins in scene order (`scene.ts:432-436`); probe: key-reversed `constraints` → base 3000 → 0, key equal.
Item 1: `joins` dropped → 2 red, restored 22 green. 16k keys 1191.9 ms. Risk gate: additive; CI re-seed gate OK.
Body: `handoff/hmdnah/2026-10-12-T-039-review-step-1.md`

## T-039 — the step-1 defect, constraint order keyed — 2026-10-12 — seat: zayd

`cachekey.ts` keeps `scene.constraints` order and keys an element's own rows resolved, by the build's own
`datumElevations`/`gridPointOf`/`sketchConstraintsOf` over a scene of just those rows; `scene.ts` untouched.
Four reorder tests: 3 red before the fix and on `git stash` of it, 26 green after. `pnpm verify` green (936).
Body: `handoff/zayd/2026-10-12-T-039-d29-cache-input-key.md` (§ Return from step 1)

## T-039 — review step 2 of PR #77 — 2026-10-12 — seat: hmdnah

Approved. Step 1's defect fixed: `cachekey.ts` at `f54de71` → 3 reorder tests red, HEAD → 26 green. Items 2/3:
every `buildAssembly` scene read is keyed; no in-place `constraints` write for the join index. Hosted order is
keyed as `hostedBy` cuts (probe), but no test pins it, and the one-pass test cannot fail. Not owner-gated.
Body: `handoff/hmdnah/2026-10-12-T-039-review-step-2.md`

## T-040 — D29 R2 — `geometry-cache/` in the `.bnn`, optional and filtered on load — 2026-10-12 — seat: zayd

`bnn.ts`: optional `SaveOptions.cache` written under `geometry-cache/`; `loadBnn` filters it out of `unzipSync`
and exposes `cache: { names, read }` inflating one entry on demand. Spec §6 tree amended. 7 tests: 5 red before;
filter reverted → the corrupt-entry test red. Pre-R2 `loadBnn` opens a cached file. `pnpm verify` green (943).
Body: `handoff/zayd/2026-10-12-T-040-d29-geometry-cache-layout.md`

## T-040 — review step 1 of PR #78 — 2026-10-12 — seat: hmdnah

Not approved (step 1); no defect proven. Item 1: filter `return false` → `true` → 1 red, restored 7 green.
Test-first re-run on `600baab`'s `bnn.ts` → 5 red / 2 green; pre-R2 fixture equals `600baab`'s `loadBnn`.
`pnpm verify` → 943 tests, `docs:check` 66. Risk gate: additive, CI and local. Step 2: items 2, 3, 6.
Body: `handoff/hmdnah/2026-10-12-T-040-review-step-1.md`

## T-040 — review step 2 of PR #78 — 2026-10-12 — seat: hmdnah

Approved; no defect proven. Item 1 re-run: filter → `true` → 1 red, restored 7 green. Item 2: `bnn.ts` is the
only non-test `unzipSync`; app consumers take named fields. Item 3: no consumer of the cache yet (R3/R5).
Item 6: 4 of 5 `bnn.ts` mutants red; the survivor is equivalent. `pnpm verify` 943 + 66. Not owner-gated.
Body: `handoff/hmdnah/2026-10-12-T-040-review-step-2.md`

## STEWARD-loadbnn-zip-caps — T-046, the `.bnn` zip caps, filed from `## Discovered` — 2026-10-12 — seat: brahim

The 2026-10-12 finding (`loadBnn` inflates with no entry-count or size bound, spec §9) is now T-046, `ready`,
`risk: high` (D29 cache read path), via `backlog.py add`; the finding is deleted. Both `unzipSync` calls,
`bnn.ts:202` and `:303`, are named; caps are sized against design §5's 16k / ~61 MB. No code changed.
Body: `handoff/brahim/2026-10-12-STEWARD-loadbnn-zip-caps-row.md`

## STEWARD-loadbnn-zip-caps — review of PR #80 — 2026-10-12 — seat: hmdnah

Approved; no defect proven. Item 1: T-046's `implements:` deleted → `gates.py docs` exit 1 naming T-046;
restored → exit 0. Cited lines hold: `bnn.ts:202`, `:303`, spec 727, design §5 (3,817 B × 16k = 61.07 MB).
Every done-when is a box vitest/gate check, so no `requires:` is right. Reserved classes: none. Not owner-gated.
Body: `handoff/hmdnah/2026-10-12-STEWARD-loadbnn-zip-caps-review.md`

## T-046 — A hostile `.bnn` is refused before it inflates past an entry-count or size cap — 2026-10-13 — seat: zayd

`bnn.ts`: `BNN_MAX_ENTRIES` 40k, `_ENTRY_BYTES` 256 MiB, `_TOTAL_BYTES` 512 MiB, `_RATIO` 200:1, checked on
declared sizes in a no-inflate pre-pass in `loadBnn` and in `cache.read`'s filter. Sized on a measured 16k file
(16,001 entries, 67.2 MB). 7 tests: 5 red before; entry bound removed → 1 red. `pnpm verify` green (950).
Body: `handoff/zayd/2026-10-13-T-046-bnn-zip-caps.md`

## T-046 — review step 1 of PR #81 — 2026-10-13 — seat: hmdnah

Not approved (step 1); one defect proven, back to zayd: `BNN_MAX_RATIO` reads the declared compressed size, so
a 1024:1 entry with its central-dir size raised to 100:1 loads (probe in the body). Item 1: entry bound removed
→ 1 red, restored 7 green. fflate claim holds. 16k figures reproduce bar `.brep` 3.5:1 (12.1:1). Not owner-gated.
Body: `handoff/hmdnah/2026-10-13-T-046-review-step-1.md`

## T-046 — the ratio cap measures the bytes the file holds (step-1 defect) — 2026-10-13 — seat: zayd

`entryRoom` bounds each entry's compressed size by its real span (next local header or central dir), and
refuses a shared local header and zip64. +2 tests, red before; each bound reverted → 1 red. Corrected:
16,003 zip entries, test `.brep` 12.1:1. Open: 1 MiB floor entries still give 900:1 (`## Discovered`).
Body: `handoff/zayd/2026-10-13-T-046-bnn-zip-caps.md`

## T-046 — review step 2 of PR #81 — 2026-10-13 — seat: hmdnah

Approved; step 1's ratio defect closed at both sites. Item 1: `min(size, room)` → `size` → 1 red, restored green.
Item 6: three mutants survived (`read`'s room, whole-file room, entry cap off by 2); +2 tests and an exact count
land each red. Item 2: every `unzipSync` is capped. zip64 refusal needs the locator sig (comment). Not owner-gated.
Body: `handoff/hmdnah/2026-10-13-T-046-review-step-2.md`

## T-041 — D29 R3 — the load-only restore substitution in `#stage` — 2026-10-12 — seat: zayd

`cacherestore.ts`: `restoreAssembly` imports a root whose input key matches, any refusal releases and rebuilds;
`#stage` restores only from `rebuildAll`/`rebuildOnly`. 8 OCCT tests: restored ≡ rebuilt; catch rethrown → 2 red;
restore default `true` → edit-path test red. Clean Delta: max Δ 4.44e-16 m³ < 1e-9. `pnpm verify` green (951).
Body: `handoff/zayd/2026-10-12-T-041-d29-load-only-restore.md`

## T-041 — review step 1 of PR #79 — 2026-10-12 — seat: hmdnah

Not approved (step 1); no defect proven. Item 1: `restoreAssembly`'s catch rethrows → 2 red, restored 8 green.
Only `rebuildAll`/`rebuildOnly` pass `restore`; Clean Delta re-run 4.44e-16 m³ / 22, same units as the 1e-9 gate.
`pnpm verify` 951 + 66. Risk gate: additive, labeller ran on `e7f987a`. Not owner-gated.
Body: `handoff/hmdnah/2026-10-12-T-041-review-step-1.md`

## T-041 — review step 2 of PR #79 — 2026-10-12 — seat: hmdnah

Not approved, not merged: item 6 proved a weak green (B-20261012-06). A refusal after import still counts as restored, so 4/5
roots refused → 8 green, Clean Delta 0. Item 1: `restore` default `true` → edit-path test red, restored 8 green. Items 2, 3 clean.
Body: `handoff/hmdnah/2026-10-12-T-041-review-step-2.md`

## T-041 — restore tests read live handles, not import calls (B-20261012-06) — 2026-10-14 — seat: zayd

The spy records imported and released handles; a root counts as restored only if every live part handle is an
unreleased import, asserted in the three restore tests and Clean Delta. B-06's `parts.length < 2` mutant → 3 red;
`isPermutation` false → 5 red; restored → 8 green. Merged `origin/main` (PR #81).
Body: `handoff/zayd/2026-10-14-T-041-restore-tests-read-live-handles.md`

## T-041 — review step 2 (second run) of PR #79 — 2026-10-14 — seat: hmdnah

Not approved, not merged: item 6 proved the edit-path test weak-green (B-20261014-01): execute or redo passing `restore` → 8 green.
B-20261012-06's evidence now 3 red; one mutant per done-when, all red, restored 8 green. Items 2, 3 clean; CI green on `64d8828`.
Body: `handoff/hmdnah/2026-10-14-T-041-review-step-2.md`

## T-041 — execute and redo land on a cached key (B-20261014-01) — 2026-10-14 — seat: zayd

New test opens wall C off its record, so execute and redo land back on its key and assert no import.
Execute passing `restore` → 1 red; redo passing `restore` → 1 red; restored → 9 green. Product code unchanged.
`pnpm verify` green (963, docs:check 66).
Body: `handoff/zayd/2026-10-14-T-041-restore-tests-read-live-handles.md` (second section)
