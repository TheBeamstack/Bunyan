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

## T-037 — return of PR #72, incomplete — 2026-10-12 — seat: zayd

Not done: `uv run seed-goldens ../../tests/goldens` was refused again by this session's permissions ("requires approval").
B-20261012-01 stays uncleared; PR #72's re-seed gate stays red. Only the log, state and body changed.
Next on this branch: a session permitted to run the seeder performs B-20261012-01's `need:`.
Body: `handoff/zayd/2026-10-12-T-037-section-chord-tolerance.md`
