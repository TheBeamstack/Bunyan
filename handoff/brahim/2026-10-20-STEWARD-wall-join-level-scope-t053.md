# STEWARD-wall-join-level-scope — T-053: wall auto-joins are scoped by vertical extent — 2026-10-20 — brahim

## What was done

- `docs/BACKLOG.md`: `backlog.py add` appended T-053 after T-052, and the 2026-08-17 `## Discovered` finding it converts is deleted (R12).
- Every other `ready` box row and open PR is held by a blocker or a pending decision (cycle sheet `skip:` line), so this was the cycle's available steward work.
- The touching-extent rule (a top equal to the other's base does not join) is this row's reading of `P5_step0c_design.md` §2, "computed in the Level plane": stacked storeys meet at a plane, not within one.
- `risk: high`: `cachekey.ts:132` digests `resolveJoins`, so the fix changes the cache key and geometry of every stacked lower wall.
- No `requires:` is needed: the probe ran headless on in-process OCCT.

## Evidence

| Claim | Command / source |
|---|---|
| the finding still holds | R39 probe (`tests/zz-probe-level-joins.test.ts`, deleted after) via `npx vitest run` → one storey `["start"]`, `minX -99.99999999999999`; with l1's corner `[]`, `minX 0` |
| the scans ignore level | `packages/document/src/joins.ts:201-220`, `:343`, `:347`, `:379`, `:383` |
| the wall extent rule | `packages/types/src/wall.ts:77-78`; inputs `scene.ts:360`, `scene.ts:427`, wired at `build.ts:600-610` |
| no re-seed | `tests/goldens/geometry.golden.json` holds no containers or stacked walls (the probe subagent's read) |

Not verified: whether a fixture outside `tests/goldens/` pins a stacked lower wall's geometry.

## Next

`hmdnah` reviews this PR. After it merges, a box builder turn may take T-053.
