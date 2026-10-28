# STEWARD-d29-cache-sign-off-main review — PR #109 — 2026-10-23 — seat: hmdnah

- **implements:** one-turn review (all of `../diwan/docs/REVIEW-PROMPT.md`) of PR #109 at `5203ad3`, a docs-only steward decomposition adding T-060 and T-061.
- **changed:** nothing in the PR's rows; this record and `docs/PHASE_LOG.md`.
- **verdict:** APPROVED, no defect proven. Merge goes through `agent_merge.py --seat hmdnah --pr 109 --wait-ci`.
- **verified:**
  - item 1, docs-only form: the PR's checkable claim is that both rows are READY, held by `gates.py docs`. Deleting T-060's
    `- implements:` line gave exit 1, `BACKLOG: T-060 has no 'implements:' — a cold agent cannot act on it.`; after
    `git checkout -- docs/BACKLOG.md` it gave exit 0, `✓ documentation integrity`. `pnpm docs:check`: 66 passed.
  - provenance, read at `5203ad3`: `App.tsx:328` calls `namedSaveOptions`, whose `documentStorage.ts:89` calls
    `geometryCacheFiles()`, which signs at `document.ts:742`, before `documentStorage.ts:109` posts to the zipper.
    `cachetrust.ts:53-63`/`66-74` are `signedCacheIndex`/`verifyCacheIndex`. `cacherestore.ts:80,91` parse and verify.
    `document.ts:1342` is `#stage`'s `#openCache()`, and `1547-1551` is that memoised `#openCache`. `saveCheckMain.ts:49-50` copies a
    pre-signed cache. `cachekey.ts:13-14` import `joins`/`scene`. `bnnZip.ts:12` imports only `@bunyan/document/bnnzip`.
  - `implements:` sections exist: design §2e, §4, §5 (T-058 paragraph, line 213), §6 R3/R4/R5. `V1.0.0_spec.md` §6.5 is the
    same citation T-047 and T-058 carry.
  - every test and tool the done-when items name exists in `tests/` and `tools/browser-check/` (T-052's is `cache-requeue-table-edit.test.ts`).
  - `requires: browser` on T-060 is correct: done-when 4 runs `tools/browser-check/named-save.mjs` (headless Chromium).
    T-061 has none and none of its items needs one. T-060's deps T-058 and T-059 are `done`.
  - identity: `agent_start.py` → `✓ gh identity: narutousomaki741 — matches seat 'hmdnah'`.
- **items 2, 3, 5, 6:** not applicable. The PR adds no rule, entity, figure or test (the 2,074 ms it quotes is design §2e's).
- **notes (opinion, not blocking):** T-060 done-when 1 cites `bnnZip.ts:9`, the comment. The import is line 12.
  T-061's `document.ts:709` scope clause is moot because `#openCache` memoises.
- **risk:** normal (steward PR); not owner-gated. No labels on `5203ad3`, and `PR shape · reserved classes` passed.
