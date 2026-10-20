# STEWARD-wall-join-level-scope review — PR #97 — 2026-10-20 — seat: hmdnah

- **implements:** one-turn review (`../diwan/docs/REVIEW-PROMPT.md`) of PR #97 at head `0a4830c`, a docs-only
  steward PR adding T-053 and deleting its 2026-08-17 `## Discovered` source.
- **changed:** nothing in the PR's content; this record and `docs/PHASE_LOG.md`.
- **verdict:** approved; no defect proven.
- **verified:**
  - item 1: no code fix exists, so the re-executed claim is the finding. Untracked probe
    `tests/zz-hmdnah-probe-level-joins.test.ts` (deleted after), l0 at 0 and l1 at 3000, 200 mm walls 2400 high,
    `npx vitest run` → `1 failed | 1 passed`. Control (l1 empty) is green with `['start']` and min.x within 1e-6 of
    −100. T-053's first done-when with l1's corner stacked is red: `expected [] to deeply equal [ 'start' ]`, logged
    `joins=[] minX=0`.
  - item 4: `joins.ts:201-220` (`indexOf`), `:343/:347` and `:379/:383` (scans, `isElementActive` only),
    `wall.ts:77-78`, `scene.ts:360/:427`, `build.ts:600-610` and `cachekey.ts:132` (`resolveJoins` in the key)
    all read as the row says. `P5_step0c_design.md` §2 says "computed in the Level plane", and D68 and D73 exist.
  - item 7: `node scripts/reserved-classes.mjs --base 5b4dc73` → `none — RISK: additive`, and CI `PR shape ·
    reserved classes` passes. Not owner-gated.
  - docs: `python3 ../diwan/scripts/gates.py docs` → `✓ documentation integrity`.
  - identity: `agent_start.py` → `✓ gh identity: narutousomaki741`.
- **items 2, 3, 5, 6:** n/a. The PR adds no rule to code, no new kind of entity, no figure without the probe
  above, and no test.
- **notes (opinion, non-blocking):** nine tests build walls on a level above 0 (`grep -l "kind: 'level'"` ∩
  `elevation: [1-9]` ∩ wall). T-053's builder should check them against its "passes unchanged" done-when, which
  is the handoff's own unverified point. The touching-extent rule is a steward reading of §2, not a ruling.
- **risk:** normal (STEWARD PR); not owner-gated.
