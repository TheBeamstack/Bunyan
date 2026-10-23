# T-058 — a named save in the app zips in a dedicated worker, byte-identical to saveBnn

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-058-a-named-save-in-the-app-zips-in-a-dedica`
- task: `docs/BACKLOG.md` T-058 · risk: high · implements: design §5 (the T-056 paragraph), §6 R4 · spec §6.5

## Changed

- `apps/web/src/storage/bnnZip.ts` NEW: `handleZipRequest` (the worker side, `zipBnnEntries`) and `createBnnZipper(port)`
  (the posting side; entries cloned, never transferred, since a carried cache entry is the doc's own buffer).
  Imports only `@bunyan/document/bnnzip`, a new `packages/document` subpath export (plus its `vitest.config.ts` alias).
- `apps/web/src/storage/bnnZipWorker.ts` NEW: the worker entry; the reply's bytes are transferred.
- `apps/web/src/storage/documentStorage.ts`: `saveDocument(store, name, scene, options, zipper)` (assemble on the main
  thread, so every `saveBnn` refusal is made there; zip in the worker; store under `docKey`) and `spawnBnnZipper()`.
- `apps/web/src/App.tsx`: `saveDoc` calls `saveDocument` with a zipper spawned on the first save.
- `apps/web/save-check.html` + `src/storage/saveCheckMain.ts` NEW (also a Vite build input), and
  `tools/browser-check/named-save.mjs` NEW: the browser measurement, one foreground command.
- `tests/fixtures/d29-cache-fixture.ts` NEW: R4's 20-solid fixture moved out of `tests/bnn-zip-worker-t056.test.ts`,
  which now imports it (same cases, same assertions); `tests/app-named-save-zip-worker-t058.test.ts` NEW.
- design §5: the T-058 paragraph and figure.

## Verified

- `npx vitest run tests/app-named-save-zip-worker-t058.test.ts`: with `documentStorage.ts`/`App.tsx` stashed → 3 failed
  (no `saveDocument`); restored → 3 passed, 1 skipped (the opt-in 16k writer). Revert-verify: `saveDocument` storing
  `saveBnn(scene, options)` instead → both byte cases red on "posts to the worker: expected +0 to be 1"; restored → green.
- `npx vitest run tests/app-named-save-zip-worker-t058.test.ts tests/bnn-zip-worker-t056.test.ts` → 5 passed, 1 skipped.
- `node tools/browser-check/named-save.mjs --playwright <Chantier_Manager playwright-core 1.60.0> --browser <chromium-1243>`
  → exit 0, headless Chromium 153.0.8010.12, linux-arm64: 16,000 solids, 17,890,315 B; three worker saves held the main
  thread 129.7 / 133.4 / 124.9 ms (Long Tasks 129 / 132 / 124 ms), each ~4.9–5.4 s end to end; the `saveBnn`-on-main
  control 4,940 ms, and every save the same size. The first run's Long Tasks observer reported nothing for the control
  (entries read before delivery), so the page now also takes `takeRecords()` and a 0 ms timer-chain gap.
- `git diff --name-only origin/main` touches no `[frozen_surface] watched` file.
- `pnpm verify`: the result is in this turn's finish output.

## Fix — B-20261023-02 (second turn, same day)

- `bnnZip.ts`: on `error`, `createBnnZipper` keeps the failure, rejects every later `zip()` with it and reports `failed`.
  `App.tsx` `saveDoc`: spawns a new zipper when none is held or the held one `failed`, so the next save respawns.
- `npx vitest run tests/app-named-save-zip-worker-t058.test.ts`: new test first → red (`expected undefined to be false`);
  fixed → 4 passed, 1 skipped. Revert-verify, early reject removed → red, `promise resolved "'pending'" instead of
  rejecting` (the hang); restored → 4 passed, 1 skipped. The `App.tsx` respawn line has no test of its own (no App render).

## notes

- Test-first was not literal: the code was written first, then stashed to see the test red before it went green.
- The browser check saves the app's `saveDocument` path into IndexedDB from a harness page, not the app's Save button:
  the app's save carries no cache until T-059.
- The ~130 ms that remains is main-thread work before the post (`assembleBnnEntries` plus the ~105 MB structured clone);
  not split further.
