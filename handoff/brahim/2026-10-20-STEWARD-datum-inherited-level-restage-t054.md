# STEWARD-datum-inherited-level-restage — T-054: a container move re-stages datums beneath it — 2026-10-20 — brahim

## What was done

- `docs/BACKLOG.md`: `backlog.py add` appended T-054 after T-053, and the 2026-10-20 `## Discovered` finding it converts is deleted (R12).
- Every other `ready` box row and open PR is held by a blocker or a pending decision (cycle sheet `skip:` line), so this was the cycle's available steward work.
- No new probe: the finding was measured this session by `hmdnah`'s PR #98 step-2 review, whose body holds the probe.
- The note points the fix at `dependency.ts`, because `scene.ts` is in `[frozen_surface] watched` and `elementsConstrainedToLevel` lives there.
- `risk: high`: it changes `dependency.ts`'s invalidator, an auto-high class (`docs/BACKLOG.md` READY criterion 8).
- No `requires:` is needed: step 2's probe ran headless on in-process OCCT.

## Evidence

| Claim | Command / source |
|---|---|
| the finding holds on main | `handoff/hmdnah/2026-10-20-T-053-review-step-2.md`: C's lowest point 3000 incrementally, 2000 after `rebuildAll`, on main too |
| the edge matches the direct target only | `packages/document/src/dependency.ts:104-116`, `packages/document/src/scene.ts:393-398` |
| the build walks the container path | `scene.ts:360-365` (`elevationOf`) |
| Z is up, so the assertion reads `min[2]` | `tests/crud-and-guard.test.ts:77` |

Not verified: whether a `top` datum on an inheriting Level shows the same staleness (only `base` was probed).

## Next

`hmdnah` reviews this PR. After it merges, a box builder turn may take T-054.
