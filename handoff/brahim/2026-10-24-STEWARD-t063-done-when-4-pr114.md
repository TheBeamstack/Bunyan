# STEWARD-t063-done-when-4 — T-063's done-when 4 admits the leaf its outcome requires — 2026-10-24 — brahim

## What was done

- `docs/BACKLOG.md` T-063 done-when 4: "… and T-061 tests pass unchanged" → adds "except the one T-061
  import pin on cacheOpen.ts (tests/app-cache-open-verifies-in-worker-t061.test.ts:158), which T-063 amends
  to admit the new leaf cap-check module". No other line of the row changed.
- Why (`AGENTS.md §4`, ruled by hmdnah's PR #114 step-1 review, comment 6381560781): the outcome (`:685`),
  implements (`:686`) and done-when 2 (`:688`) put a leaf cap check in the worker, and that check calls
  fflate's `unzipSync`. The T-061 pin `expect(imports('apps/web/src/storage/cacheOpen.ts')).toEqual(['@bunyan/document/cachesign'])`
  forbids any second import, so no build met both.
- The pins `cachesign.ts → []` (`:157`) and `cacheOpenWorker.ts → ['./cacheOpen']` (`:159`) stay unchanged.
  PR #114's branch and code are untouched.

## Evidence

| Claim | Command |
|---|---|
| the pin admits only `/cachesign` | `sed -n 155-160p tests/app-cache-open-verifies-in-worker-t061.test.ts` on `main` `f0785e3` |
| the row required both | `sed -n 683-694p docs/BACKLOG.md` on `main` `f0785e3` |
| the ruling | `gh api repos/TheBeamstack/Bunyan/issues/comments/6381560781 --jq .body` |

## Next

`hmdnah` reviews this PR, then runs PR #114's step 2 (risk high) against the amended row.
