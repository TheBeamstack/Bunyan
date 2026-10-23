# T-057 — opening a stored `.bnn` in the app restores its geometry cache, under a per-install secret

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-057-opening-a-stored-bnn-in-the-app-restores`
- task: `docs/BACKLOG.md` T-057 · risk: high · implements: design §2a, §2d, §2e, §4, §6 R3/R5/R6

## Changed

- `apps/web/src/storage/documentStorage.ts`: `readInitial` keeps `pkg.cache`; `INSTALL_SECRET_KEY`
  (`bunyan:install-secret`) and `installSecret(store)`, which returns the stored 32 bytes or writes a fresh
  `newInstallSecret()` once and returns what the store kept (read back, for StrictMode's two racing mounts).
- `apps/web/src/documentOptions.ts` NEW: the pure options builder. With a secret it sets `geometryCacheEnvelope`
  (`cacheEnvelope(buildId)`), `geometryCacheSecret`, and, when the file has a cache, `geometryCache`.
- `apps/web/src/bootstrap.ts`: `InitialDocument.cache?`; `bootstrap(initial, installSecret?)` builds through it.
- `apps/web/src/App.tsx`: the boot effect reads the secret (a storage failure boots without a cache).
- `docs/BACKLOG.md` T-057, spec defect (AGENTS.md §4): the third `done-when:` read `tests/_d29_`, prettier's mangling
  of `tests/*-d29*`; now `` `tests/*-d29.test.ts` `` in backticks, which prettier leaves alone. Requirement unchanged.

## Verified

- `npx vitest run apps/web/src/storage/documentStorage.test.ts` → 7 passed. Revert-verify: the stored-secret early
  return disabled → "returns the same 32 bytes…" red; restored → green.
- `npx vitest run tests/app-cache-open-t057.test.ts` (real OCCT, two walls, `MemoryStore`) → 3 passed: own secret,
  `rebuildOnly` sends only `importBrep`; another secret, no `importBrep`; a cache-less file, `initial.cache`
  undefined and every root builds. Revert-verify: `geometryCache` dropped from `documentOptions` → the restore
  test red; restored → green.
- `npx vitest run tests/*-d29.test.ts tests/cache-restore-batch-t049.test.ts tests/cache-requeue-table-edit.test.ts`
  → 9 files, 91 passed, 1 skipped; none of those files changed.
- `git diff --name-only origin/main` touches no `[frozen_surface] watched` file.
- `pnpm verify`: the result is in this turn's finish output.

## notes

- Test-first was not literal: the helper and builder were written before their tests ran; the revert-verify
  runs above are the evidence that each test fails without the change.
- Nothing in the app writes a cache yet (`saveDoc` passes no `cache`); that is T-059. The test produces its cached
  file the way T-059 will, through `exportCacheIdle` and `geometryCacheFiles`.
- The `installSecret` read-back narrows but does not prove away a StrictMode race between two first boots on an
  empty store; a lost race costs one later open its restore, never a wrong solid (the MAC refuses).
- Not measured: main-thread verify cost at 16k (`## Discovered` 2026-10-20), unchanged by this row.

## review fix — B-20261023-01 (second zayd turn, same day)

- **changed:** `apps/web/src/storage/documentStorage.ts`, `installSecret`'s doc comment only. It no longer claims racing
  first boots settle on one secret; it says they can differ and the loser's cache is refused by `verifyCacheIndex`,
  matching step 1's delayed-store probe (`AeqB=false`). Step 2's reword option; `navigator.locks` was not chosen.
- **verified:** `npx vitest run apps/web/src/storage/documentStorage.test.ts tests/app-cache-open-t057.test.ts` → 10 passed;
  `pnpm verify` (via `agent_finish.py`) → 117 files, 1032 passed, 1 skipped; `docs:check` 66 passed.
- **next:** hmdnah, step 2 of PR #106.
