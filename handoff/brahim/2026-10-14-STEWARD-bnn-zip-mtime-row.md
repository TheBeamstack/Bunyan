# STEWARD-bnn-zip-mtime — T-047, a `.bnn` whose bytes depend on the wall clock — 2026-10-14 — brahim

## What was done

- `docs/BACKLOG.md`: T-047 appended after T-042 by `backlog.py add` (`ready`, `backend`, `box`, `risk: normal`).
- `risk: normal`: the change is the zip writer's timestamp; it touches no D1 naming, no D29 cache key, no
  `[frozen_surface]` file and not `dependency.ts` (READY rule 8).
- No `requires:`: every `done-when:` is a vitest check `pnpm verify` runs on the box.
- Diagnosis by a row-less subagent (R39); no code changed.

## Evidence

| Claim | Command |
|---|---|
| main went red once, same HEAD green before and after | `python3 $DIWAN/scripts/gates.py verify --root .` on 5ae192f → exit 7, `journal-transport-rule14.test.ts:305` "expected Uint8Array[…(1880)] to deeply equal Uint8Array[…(1880)]"; `pnpm verify` 10 min earlier and `pnpm exec vitest run tests/journal-transport-rule14.test.ts` after → all pass |
| no `mtime` given | `grep -n zipSync packages/document/src/bnn.ts` → 182, `{ level: 6 }` |
| fflate stamps `Date.now()` at 2 s resolution | `node_modules/fflate/esm/index.mjs:1902,1905` (fflate 0.8.3) |
| bytes differ only in timestamps | subagent `/tmp/zipmtime.mjs`, two zips 2.1 s apart → `diffOffsets [ 10, 57 ]`; fixed `mtime` → equal |
| same exposure elsewhere | `tests/format-codec-seam.test.ts:157-161`, `apps/web/src/view/keepLive.test.ts:172-175` |

## Next

`hmdnah` reviews this PR. A box builder turn stays held on T-037 (B-20261012-08, B-20261014-02).
