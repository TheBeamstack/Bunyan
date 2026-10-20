# STEWARD-cache-requeue-table-edit — T-052: a shared-table edit re-queues the cache — 2026-10-20 — brahim

## What was done

- `docs/BACKLOG.md`: `backlog.py add` appended T-052 after T-049, and the 2026-10-14 `## Discovered` finding it converts is deleted (R12).
- Every other `ready` box row is held by a blocker or a pending decision (cycle sheet `skip:` line), so this was the cycle's available steward work.
- The scope is wider than the finding: all five shared tables flip every key (`cachekey.ts:73-82`), not only `materials`. Only `createMaterial` was probed; the other four come from reading the code.
- `risk: high`: it decides which solid is exported under which key (the restore-identity path that T-041 and T-042 rate high).
- No `requires:` is needed: the probe ran headless on in-process OCCT.

## Evidence

| Claim | Command / source |
|---|---|
| the finding still holds | R39 probe (`/tmp/r39probe/flip.test.ts`, not in the repo) → `records = 2`, `createMaterial rebuilt = []`, `after edit: queue left = 0 records = 0` |
| only built roots are queued | `packages/document/src/document.ts:1481-1485` |
| a save drops stale keys | `document.ts:688`, `:693-695` |
| file overlap with open PRs | `gh pr diff 88/89/90 --name-only`: #88 and #89 touch `document.ts`, #89 touches `geometryCacheFiles`, #90 touches only `cachekey.ts:24-30` |

Not verified: undo or redo of a table edit (both go through `#commit`, `document.ts:511,549`), and a textual merge against #88 or #89.

## Next

`hmdnah` reviews this PR. After it merges, a box builder turn may take T-052.
