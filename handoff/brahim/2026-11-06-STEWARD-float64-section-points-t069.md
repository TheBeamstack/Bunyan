# STEWARD-float64-section-points — T-069 cut from `## Discovered`, `core_logic.md:372` annotated — 2026-11-06 — brahim

## What was done

- **T-069 added** (`backlog.py add --after T-037`, `ready`), and the 2026-10-12 float32 finding deleted from `## Discovered` (R12).
  `area: kernel` and `requires: docker` were hand-set: `backlog.py add` accepts neither (`--area` choices, no `--requires`).
- **`docs/contracts/core_logic.md:372`** no longer calls the `Dimension.anchors` narrowing "NOT FIXED": D97 / T-033 (PR #69)
  made it `ModelAnchor[]` (`packages/document/src/documentation.ts:60,86`). Owed since `2026-11-06-STEWARD-backstop-t033-flip.md`.

## The finding, re-measured at `0f62778` (row-less diagnosis subagent)

| Claim | Source |
|---|---|
| points are cast to float | `tools/kernel-build/src/kernel.cpp:2434,2541-2542` |
| TS reads a Float32Array | `packages/kernel-occt/src/kernel.ts:799`, `wasm/bunyan-kernel.d.ts:52` |
| §4.1 already states the limit | `docs/design/P5_step6C_plan_section_design.md:222` |
| protocol shape unchanged by the fix | `SectionCurve.points` is `readonly number[]`, `packages/protocol/src/ops.ts` |
| goldens hold no section case | `grep -c section tests/goldens/geometry.golden.json` = 0 |

Correction to the finding's figure: rounding costs half an ulp per coordinate, 0.0078 mm in [131, 262) m and 0.0156 mm beyond,
so the 0.01 mm budget is exceeded past 131 m only with both coordinates that far out; any rounding leaves the chord no margin.

## Why a PR

`risk: high` (T-022's rationale: the committed WASM artefact and `toolchain.json` `verifiedBy` change) and `requires: docker`
put the row outside the bookkeeping paths (`agent_finish.py` `not_bookkeeping`); the spec fix rides in the same PR.

## Unverified here

Whether this box holds the pinned emsdk image and the prebuilt OCCT 7.9.3 libs; start's `docker` probe decides claimability.

## Next

`hmdnah` reviews this `STEWARD:` PR; a box builder takes T-069 once it merges.
