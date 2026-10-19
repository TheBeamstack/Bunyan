# STEWARD-bnn-aggregate-ratio review — PR #85 — 2026-10-19 — seat: hmdnah

- **implements:** single review turn (`../diwan/docs/REVIEW-PROMPT.md` items 1–7) of PR #85 at head `603309c`
  (brahim; files T-048 from `## Discovered` via `backlog.py add`; docs only, 4 files).
- **changed:** nothing in the PR's content; this record and `docs/PHASE_LOG.md`.
- **verdict:** approved; no defect proven.
- **verified:**
  - item 1: T-048's `- implements:` line deleted → `python3 ../diwan/scripts/gates.py docs` → exit 1,
    `BACKLOG: T-048 has no 'implements:' — a cold agent cannot act on it.`; `git checkout docs/BACKLOG.md`
    → `✓ documentation integrity`, exit 0 (baseline before the revert: exit 0). `pnpm docs:check` → 66 passed.
  - item 4: `sed -n 50,52p handoff/zayd/2026-10-13-T-046-bnn-zip-caps.md` → 500 × 1 MiB zero entries,
    577,279 B, 524,288,002 B — the row and log quote these exactly. `grep -n` on `bnn.ts` → `RATIO_FLOOR_BYTES`
    1 MiB (`:213`), the floor test `:283`, `BNN_MAX_TOTAL_BYTES` 512 MiB (`:206`, `:290`), `checkCaps` `:299`,
    the cache reader's `entryRoom`/`unzipSync` `:434-437`. The `## Discovered` finding is deleted and moved nowhere else.
  - item 5: 524,288,002 / 577,279 = 908:1 ("~900:1"); design §5 `.brep` 43.9 + `index.json` 61.3 = 105.2 MB
    inflated from 11.0 + 3.6 = 14.6 MB, aggregate 7.2:1, under `BNN_MAX_RATIO` 200 (`python3 -c`).
  - done-when checkability: all four are vitest / `[frozen_surface]` checks `pnpm verify` runs on the box, so no
    `requires:` is right; T-046, T-042 and T-047 all exist. `bnn.ts` is not in `[frozen_surface] watched`.
  - item 7: `gates.py reserved-classes --pr 85` → `none`; CI `PR shape · reserved classes` → pass. Not owner-gated.
  - items 2, 3, 6: not applicable — no rule, entity kind or test lands (docs only).
  - identity: `agent_start.py` → `✓ gh identity: narutousomaki741`; a bare `gh api user` in this shell
    answers `Davidian-Abdo`, so only the entrypoints act as the seat.
- **notes:**
  - Non-blocking: the existing 16k test (`tests/bnn-zip-caps-t046.test.ts:200`) is the 3,817 B/solid fixture, not
    design §5's 105 MB cache; done-when 3 needs a fixture at that mix, which the builder must build.
  - The baton keeps hmdnah's T-042 `claimed-at` (11:11:41Z) under brahim's claim; cosmetic, as on PR #80.
- **risk:** normal (STEWARD PR); T-048 itself is `risk: high`.
