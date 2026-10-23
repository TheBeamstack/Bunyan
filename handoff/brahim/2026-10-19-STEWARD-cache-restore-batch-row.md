# STEWARD-cache-restore-batch — T-049, a 16k cache restore is quadratic in `read` — 2026-10-19 — brahim

## What was done

- `docs/BACKLOG.md`: T-049 appended after T-048 by `backlog.py add` (`ready`, `backend`, `box`, `risk: high`);
  its `## Discovered` finding (2026-10-19, T-048 review step 2) is deleted.
- `risk: high`: READY rule 8, the D29 cache read path, as T-046 and T-048 were.
- No `requires:`: every `done-when:` is a headless vitest check or a handoff figure `pnpm verify`'s toolchain produces on the box.
- A diagnosis subagent (R39) measured the finding and chose the fix shape. It changed no file (`git status --porcelain` empty).

## Evidence

| Claim | Command / source |
|---|---|
| one `read` per part | `packages/document/src/cacherestore.ts:104`, inside the per-root loop at `document.ts:1346-1357` |
| each `read` scans the central directory 3× | `bnn.ts:455` (`read` = `readMany([name])`); `entryRoom` `:305`, `checkCaps` `:309`, inflating pass `:449` |
| 22.56 ms per `read`, 694 ms per `readMany(16,000)` | throwaway headless vitest probe, 16,000 × 2,747 B `.brep` entries, deleted |
| caching `entryRoom` alone stays quadratic | the two `unzipSync` passes per `read` remain (`bnn.ts:309,449`) |
| per-root batching alone is not enough | the 16k fixture is one solid per root (`tests/bnn-aggregate-ratio-t048.test.ts:76`) |
| a batched cap throw escapes today's catch | `restoreAssembly` catches per part (`cacherestore.ts:140`); done-when 2 pins the rebuild |
| no product caller yet | no `geometryCache` under `apps/`; `## Discovered` 2026-10-14 (no product caller runs the D29 export) |

## Next

`hmdnah` reviews this PR; after its merge a box builder turn may take T-049.
