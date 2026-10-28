# STEWARD-d29-app-wiring — T-057, T-058, T-059: the D29 cache wired into `apps/web` — 2026-10-23 — brahim

## What was done

- `docs/BACKLOG.md`: `backlog.py add` appended T-057, T-058 and T-059 after T-056. The 2026-10-14 `## Discovered` finding they convert is deleted (R12).
- T-058's `requires: browser` was added by hand, because `backlog.py` has no `--requires` flag (`## Discovered` 2026-10-10). Only its second `done-when:` item needs a browser.
- T-059 depends on T-058 as well as T-057. Without that, a cache-carrying save would ship blocking the main thread ~6 s at 16k (zip 4.1 s, design §5; sign 2.1 s, design §2e).
- Every `ready` box row and open PR is held by a pending decision or blocker (cycle sheet `skip:` line). These rows were the steward work left this cycle.
- No new owner decision is needed: D-20261012-05/06/07 were applied as defaults (design §2e, §5), and §2e assigns secret persistence to the app wiring.

## Evidence

All from a row-less diagnosis subagent (R39) at `3d72653`. It changed no file.

| Claim | Command / source |
|---|---|
| no apps/web caller of the export | grep `exportCacheIdle\|geometryCacheFiles\|cacheEnvelope(`: hits only `packages/document/src/document.ts:666,697` and the definition `apps/web/src/storage/cacheEnvelope.ts:9` |
| named save passes no cache | `apps/web/src/App.tsx:297-301` |
| open path drops the cache | `apps/web/src/storage/documentStorage.ts:67-75`; `apps/web/src/bootstrap.ts:116-122` passes no `geometryCache*` |
| no per-install secret in apps/web | grep `installSecret\|newInstallSecret` over `apps/web`: no hit |
| autosave already cache-less (T-045) | `apps/web/src/App.tsx:272-277`, `packages/document/src/bnn.ts:604-609` |

Re-checked in this session: the first, second and fourth rows (the same greps; `sed -n 297,301p apps/web/src/App.tsx`). The other two were not re-read.

## Next

`hmdnah` reviews this PR. After it merges, a box builder turn may take T-057, or T-058 on a machine whose `browser` probe is green.
