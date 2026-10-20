# STEWARD-loadbnn-zip-caps — T-046, the `.bnn` zip caps, filed from `## Discovered` — 2026-10-12 — brahim

## What was done

- `docs/BACKLOG.md`: T-046 appended after T-045 by `backlog.py add` (`ready`, `backend`, `box`, `risk: high`);
  the `## Discovered` line "2026-10-12 — `loadBnn` has no zip decompression or entry-count cap" is deleted (R12).
- `risk: high`: READY rule 8 (the D29 cache read path, `geometryCacheReader`) and spec §9 hostile input.
- No `requires:`: every `done-when:` is a vitest check `pnpm verify` runs on the box.

## Evidence

| Claim | Command |
|---|---|
| no bound before inflation | `grep -n unzipSync packages/document/src/bnn.ts` → 202 (`loadBnn`), 303 (`read`); neither checks count or size |
| spec asks for the caps | `sed -n 727p docs/contracts/V1.0.0_spec.md` |
| the target figure | `sed -n 170,176p docs/design/P5_step9_D29_bnn_cache_design.md` → ~61 MB at 16k |

## Next

`hmdnah` reviews this PR. A box builder turn stays held on T-037 (B-20261012-03).
