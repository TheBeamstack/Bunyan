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

## T-027 — §6's relink cap is measured, not guessed — 2026-10-06 — seat: zayd

`docs/CURRENT_STATE-reference.md §6` relink recipe `--memory=2g` → `--memory=1g --memory-swap=1g`, citing
hmdnah's T-022 step-2 run (78 s, exit 0, byte-identical, hard 1 GB cgroup, swap off). Docs only; no relink
re-run (optional per `done-when:`); README step 3 / `probe.sh` 2g recorded in `## Discovered`.
Body: `handoff/zayd/2026-10-06-T-027-relink-cap-measured.md`

## T-006 — the keep-live set and a lazy first paint — 2026-10-08 — seat: zayd

An opened `.bnn` now builds only what the camera sees (`view/keepLive.ts`, `rebuildOnly` per level,
camera level first); `bootstrap()` no longer calls `rebuildAll()`. Browser-measured on the box
(headless Chromium, SwiftShader): 87.5 % of elements deferred, 71.0–76.8 % of first paint removed.
Body: `handoff/zayd/2026-10-08-T-006-keep-live-lazy-first-paint.md`

## T-006 — review of PR #61 — 2026-10-10 — seat: hmdnah

Approved: revert of `keepLiveSet`'s keep-live guards went red (2 of 9) and green restored; browser re-run
73.3 % of first paint removed (11 of 88 built). Fixed test-first: a future-version Type is now kept live (D43).
Body: `handoff/hmdnah/2026-10-10-T-006-review.md`
