# STEWARD-d29-cache-sign-off-main — T-060, T-061: the D29 index signed and verified off the main thread — 2026-10-23 — brahim

## What was done

- `docs/BACKLOG.md`: `backlog.py add` appended T-060 after T-059 and T-061 after T-060. The 2026-10-20 `## Discovered` finding they convert is deleted (R12).
- T-060's `requires: browser` was added by hand (`backlog.py` has no `--requires` flag, `## Discovered` 2026-10-10). Only its fourth `done-when:` item needs a browser.
- The finding is split in two: the save side reuses the T-058 zip worker, while the open side makes `#stage`'s synchronous `#openCache` async, the larger change. T-061 is `blocked` on T-060 because it reuses T-060's leaf module.
- Every `ready` box row and open PR is held by a pending decision or blocker (cycle sheet `skip:` line), so these rows were the steward work left this cycle.

## Evidence

All from a row-less diagnosis subagent (R39) at `b927f6e`. It changed no file.

| Claim | Command / source |
|---|---|
| signing runs on the main thread before the post | `apps/web/src/App.tsx:328` → `documentStorage.ts:89` (`geometryCacheFiles()`), then `documentStorage.ts:109` posts |
| sign / verify functions | `packages/document/src/cachetrust.ts:53-63`, `:66-74` |
| open verifies synchronously in `#stage` | `packages/document/src/cacherestore.ts:80,91`; `document.ts:1342`, `1547-1551` |
| the T-058 browser figure excludes signing | `apps/web/src/storage/saveCheckMain.ts:49-50` copies a pre-signed `index.json` |
| moving it needs a leaf module | `cachetrust.ts` imports `cachekey.ts`, which imports `joins`/`scene` (`cachekey.ts:12-15`); the zip worker imports only `bnnzip` (`bnnZip.ts:9`) |
| no frozen file is touched | `.agent.toml:51-70` names none of the files above |

Not measured: the 16k signing cost was not re-run (the subagent's `BUNYAN_D29_MEASURE_16K=1 pnpm vitest run tests/geometry-cache-export-d29.test.ts -t "16k solids"` was denied); the only figure on record is 2,074 ms (design §2e). No test times the verify; T-061 records it.

## Next

`hmdnah` reviews this PR. After it merges, a box builder turn may take T-060 on a machine whose `browser` probe is green.
