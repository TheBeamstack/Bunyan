# T-045 — D29 R7 — autosave carries the cache or not, per D-20261012-07

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-045-d29-r7-autosave-carries-the-cache-or-not`
- task: `docs/BACKLOG.md` T-045 · risk: high · implements: design §5 (Autosave), §6 R7 · D-20261012-07 · spec §7
- answer: `omit`, the expired default applied by `edc18c8` (`docs/OWNER-DECISIONS.md` D-20261012-07 `answered:`)

## Changed

- `packages/document/src/bnn.ts`: `Autosave.snapshotScene(scene, options)` writes `saveBnn(scene, { ...options,
  cache: undefined })` into the ring, so a snapshot never carries `geometry-cache/` whatever the caller passes.
- `apps/web/src/App.tsx`: the debounced autosave calls `snapshotScene` instead of `snapshot(saveBnn(...))`. It passed
  no cache before either, so the app's snapshots are unchanged; the guard keeps it that way when saves gain one.
- `tests/autosave-cache-d29.test.ts` (new, 2 tests): a snapshot given a cache reloads through a fresh `Autosave`
  with `cache` undefined and its scene intact, and its zip holds only `manifest.json` and `scene.json`.
- Spec §7 autosave line amended to state the answer; design §5's "Open: D-20261012-07" paragraph states it as settled.

## Verified

- Test-first: `npx vitest run tests/autosave-cache-d29.test.ts` before `snapshotScene` existed → 2 failed.
- Revert-verify: `snapshotScene` passing `options` unchanged → 2 failed; restored → 2 passed.
- `pnpm verify` green: 108 files, 978 passed and 1 skipped; `docs:check` 66 passed.

## done-when

- An autosave snapshot matches the D-20261012-07 answer (test): yes, `omit`, by the two tests above.
- Spec §7 autosave line amended to state the answer: yes.

## notes

- `snapshot(bytes)` stays public (`storageCheck.ts` writes tag bytes through it), so a caller that zips its own
  cache-carrying `.bnn` can still bypass the guard; `App.tsx` is the only caller in the app.
- The T-045 backlog row's note still says D-20261012-07 is pending; it is the steward's row, left unedited.
