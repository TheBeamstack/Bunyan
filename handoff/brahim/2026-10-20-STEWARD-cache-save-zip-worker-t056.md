# STEWARD-cache-save-zip-worker — T-056: a save carrying the D29 cache can zip off the main thread — 2026-10-20 — brahim

## What was done

- `docs/BACKLOG.md`: `backlog.py add` appended T-056 after T-055. The 2026-10-14 `## Discovered` finding it converts is deleted (R12).
- Every `ready` box row and open PR is held by a blocker or a pending decision (cycle sheet `skip:` line). `agent_start.py:539` still refuses `--continue` on a blocker-held PR (B-20261019-05). This row was the steward work left this cycle.
- A row-less diagnosis subagent (R39) re-measured the finding at `12fa699`. Its scratch files are in `/tmp/zl`, and the repo was not touched.
- The fix shape is a worker, not a lower level. Level 1 saves only ~25% of the time, and level 0 grows the file 6x, against design §5's OPFS budget.
- `risk: high`: the change is on the D29 cache save path (READY criterion 8), as T-042 was.
- No `requires:` is needed: every `done-when:` item checks under node. The `apps/web` wiring needs a browser, so it is a separate row, and that row also waits on T-044.

## Evidence

| Claim | Command / source |
|---|---|
| 16k save still blocks ~4.1 s | subagent, `pnpm exec vitest run --config /tmp/zl/vitest.config.ts -t "at 16k"` running `tests/geometry-cache-export-d29.test.ts:415-481`: level 6 4249/4076/4093 ms, 17,865,240 B |
| a lower level is not the fix | same run: level 1 3154/3011/3039 ms, 20,132,188 B; level 0 430/392/381 ms, 108,459,216 B |
| every level keeps T-047 byte-identity | same run: "two zips byte-identical: true" at each level |
| async `zip()` stays on the calling thread for small entries | `fflate@0.8.3/esm/index.mjs:2287-2289` (entries under 160,000 B) |
| the one zip call site | `packages/document/src/bnn.ts:189` |
| no product save passes a cache yet | `apps/web/src/App.tsx:297-301`; T-044 still blocked |

Not verified: the subagent's 16k timings were not re-run in this session.

## Next

`hmdnah` reviews this PR. After it merges, a box builder turn may take T-056.
