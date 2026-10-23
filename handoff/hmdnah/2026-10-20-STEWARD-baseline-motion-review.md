# STEWARD-baseline-motion review — PR #92 — 2026-10-20 — seat: hmdnah

- **implements:** one-turn review (`../diwan/docs/REVIEW-PROMPT.md`) of PR #92 at head `c669b89`, a docs-only
  steward decomposition: T-050, T-051 from `docs/design/P4.5_baseline_move_design.md`; T-036 re-pointed to T-051.
- **changed:** `docs/BACKLOG.md` T-051, where the re-seed `done-when:` now states the gate's real condition and the
  note names B-20261012-03; this record; `docs/PHASE_LOG.md`.
- **verdict:** approved with one proven fix landed on the branch.
- **verified:**
  - item 1 (T-050 item 2): T-050's `motion?` member added to `ParamField`, `pnpm exec vitest run
    tests/freeze-boundary.test.ts` → `1 failed | 18 passed`, `CHANGED (1): packages/document/src/schema.ts ::
    interface ParamField`. After `git checkout -- packages/document/src/schema.ts` → `19 passed`. The
    contract-touching class is therefore right (`docs/INVARIANTS.md §2.1`).
  - item 1 (T-051 re-seed item, the defect): `wall.ts` edited (description only, no geometry), committed locally
    and never pushed. Then `node -e "process.env.BASE_REF='origin/main'; await import('./scripts/check-reseed.mjs')"`
    → `re-seed gate FAILED — geometry changed but no goldens were re-seeded`, exit 1. After the reset to `c669b89` →
    `no geometry touched — OK`, exit 0. `check-reseed.mjs:55` fails before the trailer is read, so the row's
    "if the wall build's goldens move" was false: tagging `start`/`end` alone forces a seeder run.
  - T-051's probe item: design §A run as a scratch `tests/t035-probe.test.ts` (deleted after) gave move/copy/rotate
    `REFUSED baseline-rung` on both demo walls, 6 of 6, and `setParams` `ACCEPTED`. This matches the row's figure
    and shows the item runs headless on this box.
  - anchors: `schema.ts:42` `ParamField`, `placement.ts:263` `positioningOf`, `:348` the `baseline` case,
    `applyMotions` `placement.ts:201`, `families.ts:180` `parameterSchema` exist. D95 is `docs/decisions.md:104`.
    `D-20261012-03`/`-04` are stamped `answered: 2026-10-20T00:33Z` with defaults, per `git show edc18c8`.
  - split and classification: T-050 is the only frozen-surface change (design §5 A, Cost). T-051 touches
    `placement.ts`, `commands.ts` and `wall.ts`, none of them in `.agent.toml [frozen_surface]`, so it is not
    owner-gated. Its `risk: high` is the steward's call.
  - item 7: `node scripts/reserved-classes.mjs --base origin/main` → `none — RISK: additive`. CI `PR shape ·
    reserved classes` passed.
  - identity: `agent_start.py` → `✓ gh identity: narutousomaki741`. The PR is authored by `Davidian-Abdo`.
- **requires:** none needed. Every item of both rows runs headless here (vitest, OCCT wasm present). The seeder
  is a session permission (B-20261012-03), not an R79 capability, so it is a note and not a `requires:`.
- **notes (opinion, non-blocking):** the handoff's "every `done-when:` is a headless vitest check `pnpm verify`
  runs" did not hold for the re-seed item. T-050's union-pinning test can only go red as a type check
  (`expectTypeOf` under `pnpm verify`'s typecheck), not at vitest runtime.
- **not verified:** nothing this machine could not run.
- **risk:** none (docs-only); not owner-gated.
