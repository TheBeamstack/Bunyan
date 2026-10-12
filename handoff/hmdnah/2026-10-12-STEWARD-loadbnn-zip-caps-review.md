# STEWARD-loadbnn-zip-caps review — PR #80 — 2026-10-12 — seat: hmdnah

- **implements:** single review turn (`../diwan/docs/REVIEW-PROMPT.md` items 1–7) of PR #80 at head `5cfbf59`
  (brahim; files T-046 from `## Discovered` via `backlog.py add`; `risk: normal`).
- **changed:** nothing in the PR's content; this record and `docs/PHASE_LOG.md`.
- **verdict:** approved; no defect proven.
- **verified:**
  - item 1: T-046's `- implements:` line deleted → `python3 ../diwan/scripts/gates.py docs` → exit 1,
    `BACKLOG: T-046 has no 'implements:' — a cold agent cannot act on it.`; `git checkout -- docs/BACKLOG.md`
    → `✓ documentation integrity`, exit 0 (baseline before the revert: exit 0).
  - item 4: `grep -n unzipSync packages/document/src/bnn.ts` → 202 (`loadBnn`), 303 (`geometryCacheReader.read`),
    neither bounded; `sed -n 727p docs/contracts/V1.0.0_spec.md` → "Import hardening tests … decompression
    size/ratio caps, entry-count limits"; design §5 (lines 165–176) → 16,000 solids, 3,817 B/solid, ~61 MB.
    The `## Discovered` finding is deleted and nowhere else in `docs/` (`grep -rn "loadBnn has no zip" docs/`).
  - item 5: 3,817 B × 16,000 = 61.07 MB (`python3 -c "print(3817*16000/1e6)"`), matching "~61 MB".
  - done-when checkability: all four items are vitest / `[frozen_surface]` checks `pnpm verify` and
    `gates.py` run on the box; no browser or other probe needed, so no `requires:` is correct. fflate 0.8.3's
    `UnzipFileInfo` exposes `size` and `originalSize` to the `filter`, so "bound before inflating" is buildable.
    `bnn.ts` is not in `[frozen_surface] watched`.
  - item 7: `gates.py reserved-classes --pr 80` → `none`; CI `PR shape · reserved classes` → pass. Not owner-gated.
  - items 2, 3, 6: not applicable — no rule, entity kind or test lands in this PR (docs only, 4 files).
  - identity: `agent_start.py` → `✓ gh identity: narutousomaki741`.
- **not verified:** whether declared `originalSize` can be trusted against a lying header; that is T-046's
  high-ratio done-when, for its builder.
- **notes:**
  - Non-blocking: T-046's test done-when exercises `loadBnn` only; `read`'s cap (done-when 1) has no test of its own.
  - The PR's baton carries hmdnah's T-040 `claimed-at` (13:03:17Z) under brahim's claim; cosmetic.
- **risk:** normal (STEWARD PR); T-046 itself is `risk: high`.
