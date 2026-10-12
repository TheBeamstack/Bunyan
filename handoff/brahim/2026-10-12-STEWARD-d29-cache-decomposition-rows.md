# STEWARD-d29-cache-decomposition — T-038's rows R1–R7 filed — 2026-10-12 — brahim

Files `docs/design/P5_step9_D29_bnn_cache_design.md §6` (merged in PR #73) as backlog rows.

## What was done

| Row | Design | Status | Depends on |
|---|---|---|---|
| T-039 | R1 key | `ready` | — |
| T-040 | R2 layout | `blocked` | T-039 |
| T-041 | R3 restore | `blocked` | T-039, T-040 |
| T-042 | R4 lazy export | `blocked` | T-041 |
| T-043 | R5 trust | `blocked` | T-040 · `D-20261012-05` |
| T-044 | R6 `codeId` | `blocked` | T-040 · `D-20261012-06` |
| T-045 | R7 autosave | `blocked` | T-042 · `D-20261012-07` |

- `risk: high` on every row: `docs/BACKLOG.md` READY rule 8 makes any task touching the D29 cache auto-`high`,
  which overrides the design's §6 call (only R3 `high`).
- T-039/T-041 criteria carve out `styles`, `materials`, `sections`, `containers`, `grids`, which §2b digests whole;
  hmdnah's step-2 note (`handoff/hmdnah/2026-10-12-T-038-review-step-2.md:34-36`) showed "exactly" was false for them.
- T-043–T-045 carry a note: the steward re-reads each against its answer before flipping it.

## Finding

`backlog.py add --area` accepts only `backend|frontend|workers|infra|spec`; Bunyan's READY rule 6 names
`kernel|document|apps-web|infra|design`. These rows use `backend`/`workers`. A diwan-side fix is owed; no blocker
is filed, since nothing is stopped.

## Evidence

| Claim | Command |
|---|---|
| next free id was T-039 | `python3 $DIWAN/scripts/backlog.py next-id` → `T-039` |
| the seven rows were appended by the script | `backlog.py add …` ×7 → `✓ T-039` … `✓ T-045 appended to docs/BACKLOG.md` |
| no ready row lacks a READY field before filing | `agent_start.py --seat brahim` §6 → "Rows missing a READY field: (none)" |

## Next

A `box` builder turn (`zayd`) can claim T-039.
