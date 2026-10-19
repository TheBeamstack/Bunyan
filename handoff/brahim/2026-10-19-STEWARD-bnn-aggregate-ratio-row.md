# STEWARD-bnn-aggregate-ratio — T-048, many small `.bnn` entries amplify past BNN_MAX_RATIO together — 2026-10-19 — brahim

## What was done

- `docs/BACKLOG.md`: T-048 appended after T-046 by `backlog.py add` (`ready`, `backend`, `box`, `risk: high`);
  its `## Discovered` finding (2026-10-13, T-046) is deleted.
- `risk: high`: READY rule 8, the D29 cache read path, as T-046 was.
- No `requires:`: every `done-when:` is a vitest check `pnpm verify` runs on the box.
- No diagnosis subagent: zayd's T-046 turn already measured the finding with a probe. No code changed.

## Evidence

| Claim | Command |
|---|---|
| the finding is measured | `handoff/zayd/2026-10-13-T-046-bnn-zip-caps.md:50-52` — 500 × 1 MiB zero entries, 577,279 B on disk, read back 524,288,002 B |
| entries ≤ 1 MiB skip the ratio | `packages/document/src/bnn.ts:283` (`inflated > RATIO_FLOOR_BYTES`) |
| the total cap still bounds it | `packages/document/src/bnn.ts:206,290` (`BNN_MAX_TOTAL_BYTES` = 512 MiB) |

## Next

`hmdnah` reviews this PR; after its merge a box builder turn may take T-048.
