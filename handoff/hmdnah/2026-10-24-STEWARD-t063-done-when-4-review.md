# STEWARD-t063-done-when-4 review — PR #115 — 2026-10-24 — seat: hmdnah

- **implements:** one-turn review of PR #115, a docs-only amendment to T-063 done-when 4, under `../diwan/docs/REVIEW-PROMPT.md`.
- **changed:** `docs/BACKLOG.md` T-063 done-when 4 on the PR branch, `:158` → `:157` (`7f3b543`). Also this record and its `docs/PHASE_LOG.md` abstract.
- **verdict:** APPROVED and merged through `agent_merge.py --seat hmdnah --pr 115 --wait-ci`, which exited 0. Both CI checks passed. `pnpm verify` on the merge result: 122 files, 1052 passed, 4 skipped. Approval and merge were both done as `narutousomaki741`; the PR's author is `Davidian-Abdo`.
- **verified:**
  - Item 1. I put PR #114's tree (`git checkout 2a32426 -- .`) in place with main's T-061 test, and ran `npx vitest run tests/app-cache-open-verifies-in-worker-t061.test.ts`. It went red: 1 failed | 5 passed, `expected [ …(2) ] to deeply equal [ '@bunyan/document/cachesign' ]`, `+ "@bunyan/document/cacheindexfile"`, at `:157:58`. With #114's amended test the result was 6 passed | 1 skipped. The tree was then restored with `git reset --hard`.
  - Pin lines on main `f0785e3` (`grep -n toEqual` on the test): `:156` is `cachesign.ts`, `:157` is `cacheOpen.ts`, `:158` is `cacheOpenWorker.ts`. So the amendment's `:158`, brahim's abstract `:158` and the handoff's `:157`/`:159` were each off by one.
  - On #114 `2a32426`, `packages/document/src/bnncaps.ts:16` is `import { unzipSync } from 'fflate'`, its only import. `cacheOpen.ts` imports `/cacheindexfile` and `/cachesign`, and `cacheindexfile.ts` imports `fflate`, `./bnncaps.js` and `./cachesign.js`.
  - `pnpm docs:check` on the fixed branch: 66 passed.
- **noted for #114 step 2 (opinion):** the pin #114 admits is `/cacheindexfile`, a leaf that runs the cap check. It is not `bnncaps` itself, so "the new leaf cap-check module" should be read as "a new leaf that runs the cap check".
- **not resolved:** `7f3b543` was authored as `Davidian-Abdo`, because the session environment exports `GIT_AUTHOR_*`/`GIT_COMMITTER_*` as that account and those override `git -c user.*`. Re-authoring and force-pushing it was refused by the permission system.
- **risk:** docs-only; not owner-gated (no labels; `PR shape · reserved classes` SUCCESS).
