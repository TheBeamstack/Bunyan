# T-059 — the app exports built assemblies in idle time, and a named save carries the geometry cache

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-059-the-app-exports-built-assemblies-in-idle`
- task: `docs/BACKLOG.md` T-059 · risk: high · implements: design §5, §6 R4/R7 · spec §6 · D29

## Changed

- `apps/web/src/storage/idleCacheExport.ts` NEW: `createIdleCacheExporter(doc, lock, schedule, onError)`. `kick()`
  schedules one idle run; each run is `lock.run(() => doc.exportCacheIdle(1))` and re-schedules while roots wait, or
  when a kick arrived during the run (a commit queued behind it lands after the count). `browserIdleScheduler` uses
  `requestIdleCallback`, else a 50 ms timer (Safari).
- `apps/web/src/storage/documentStorage.ts`: `namedSaveOptions(doc, kernelBuildId)` — journal, revision and
  `cache: doc.geometryCacheFiles()` when the doc writes one.
- `apps/web/src/App.tsx`: one exporter per `app`, disposed on unmount; kicked on `app`, `version` (edits) and `built`
  (lazy builds, which also queue roots); `saveDoc` uses `namedSaveOptions`. Autosave still calls `snapshotScene`.
- `tests/app-idle-cache-export-t059.test.ts` NEW: real OCCT, `documentOptions` with a secret, a hand-driven idle scheduler.

## Verified

- `pnpm vitest run tests/app-idle-cache-export-t059.test.ts` → 3 passed: (1) two walls drain in two idle runs
  (`exportCacheIdle` returns 1, 0); one `core.setParams` re-queues that wall alone (one run, returns 0, `exportBrep` sent);
  the named save's `index.json` verifies under the install secret, not under another, and carries both walls at
  `cacheInputKeys` of the saved scene. (2) with an edit holding the lock, an idle run sends no `exportBrep`; the first
  `exportBrep` follows the edit. (3) a save with the edited wall's export still pending sends no kernel op while
  assembling, writes only the unedited wall, and reopened via `readInitial` + `documentOptions` restores it with
  `importBrep` only while the edited wall builds.
- Revert-verify: `namedSaveOptions` without `cache` → tests 1 and 3 red (`expected undefined to be defined`);
  `run` calling `exportCacheIdle` outside `lock.run` → test 2 red (`expected [ 'exportBrep' ] to not include`). Restored → green.
- `pnpm verify` → green: 119 files, 1039 passed, 2 skipped; includes `tests/autosave-cache-d29.test.ts` and the T-047
  byte-identity tests, unchanged; `docs:check` (freeze-boundary) passed. No `[frozen_surface] watched` file is touched.

## notes

- Test-first was not literal: the code was written first, then each half was reverted to see its test red.
- The `App.tsx` effects have no test of their own (nothing renders `App`); not measured in a browser this turn.
