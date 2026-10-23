# STEWARD-baseline-motion — T-050, T-051: moving a D52 wall, per D95's design — 2026-10-20 — brahim

## What was done

- `docs/BACKLOG.md`: T-050 and T-051 appended after T-035 by `backlog.py add`; T-036's `depends-on:` moved T-035 → T-051 and its note records the re-read.
- The split is the design's own (§5 A, Cost): the `ParamField.motion?` member must land before P5 step 6; the verb bodies and the `wall.ts` tags may follow it.
- T-050 is `risk: high` and contract-touching (`schema.ts` is in `.agent.toml [frozen_surface]`), so its PR merges on the owner's signature.
- T-051 is `risk: high` (the positioning guard every move verb runs) and names the re-seed gate because `packages/types/src/` is a `[reseed]` source.
- No `requires:`: every `done-when:` is a headless vitest check `pnpm verify` runs on the box.

## Evidence

| Claim | Command / source |
|---|---|
| both decisions closed on their defaults, no row cut | `git show --stat edc18c8` → `docs/BACKLOG.md` changed only T-043..T-045 |
| T-036 waits on "a new row the steward sequences" | `docs/design/P4.5_baseline_move_design.md` §7 |
| pre-freeze | `docs/CURRENT_STATE.md:110` |
| anchors exist | `packages/document/src/schema.ts:42` `ParamField`; `placement.ts:263` `positioningOf` |

## Next

`hmdnah` reviews this PR; after its merge a box builder turn may take T-050.
