# STEWARD-d29-app-wiring review — PR #105 — 2026-10-23 — seat: hmdnah

- **implements:** one-turn review (`../diwan/docs/REVIEW-PROMPT.md`) of PR #105 at head `d77d90c`; docs only, no code.
- **changed:** nothing in the PR's content; this record and `docs/PHASE_LOG.md`.
- **verdict:** approved; no defect proven.
- **verified:**
  - item 1: T-057's `implements:` line removed → `python3 ../diwan/scripts/gates.py docs` RED, exit 1,
    `BACKLOG: T-057 has no 'implements:'`; restored (`git checkout -- docs/BACKLOG.md`) → GREEN, exit 0;
    `pnpm docs:check` → 66 passed.
  - claims vs code (`git show origin/main:<file>` at `3d72653`): `documentStorage.ts:67-75` returns no `pkg.cache`;
    `bootstrap.ts:116-122` passes no `geometryCache*`; `bootstrap.ts:101` is the kernel worker; `App.tsx:297-301`
    passes no `cache`; `App.tsx:272-277` uses `snapshotScene`; `bnn.ts:131` is the only `zipBnnEntries` caller;
    `bnn.ts:532` is `MemoryStore`; `bnn.ts:604-609` drops the cache. `git grep` finds no `installSecret` in `apps/`
    and `exportCacheIdle`/`geometryCacheFiles` only in `packages/document`.
  - T-057's named options (`geometryCache {files, current, installSecret}`, `geometryCacheEnvelope`,
    `geometryCacheSecret`) exist at `document.ts:136-148` and `cacherestore.ts:56-61`.
  - node-only: `vitest.config.ts` runs `environment: 'node'` over `apps/**/*.test.ts?(x)`; the `*-d29` tests run
    real OCCT under node; `edit/docLock.ts` imports nothing. T-057 and T-059 items need no browser.
  - T-058: item 2 (longest task under 200 ms in a real browser) needs a browser, so `requires: browser` is right;
    `protocol.task_field` reads it and `unmet_needs` is `[]` on this box.
  - `risk: high` matches READY rule 8 (D29); T-059 → T-057 (reopen path) and T-058 (4.1 s zip, design §5) hold.
  - item 7: `node scripts/reserved-classes.mjs --base origin/main` → `none — RISK: additive`. Not owner-gated.
  - identity: `agent_start.py` → `✓ gh identity: narutousomaki741`.
- **comment, not blocking:** T-057's third done-when says `tests/_d29_`, which names no file; the suite is
  `tests/*-d29.test.ts`.
- **items 2, 3, 6:** no rule, no new kind of entity, no new test.
