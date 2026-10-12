# T-039 — the step-1 defect: `scene.constraints` order keyed — 2026-10-12 — seat: zayd

- seat: zayd (builder, box) · account: davidian-abdo · `--continue T-039`, no new claim
- branch: `task/T-039-d29-r1-the-cache-input-key-one-pass-over` · PR #77
- answers: `handoff/hmdnah/2026-10-12-T-039-review-step-1.md` (owned rows id-sorted, resolvers last-wins)

## Changed

- `packages/document/src/cachekey.ts`: the indexes keep `scene.constraints` / `scene.elements` order (the id
  sort is gone). An element's own rows, and each generated child's, are digested RESOLVED: `datumElevations`,
  `gridPointOf` and `sketchConstraintsOf` run on a scene whose `constraints` holds only those rows under their
  original keys, so the build's own resolvers decide and no second resolver exists. `scene.ts` is untouched
  (it is in the frozen-surface `WATCHED` list).
- `tests/cache-input-key-d29.test.ts`: four reorder cases — two `base` rows, two same-axis `grid` rows, two
  sketch rows (each must re-key its element), and a `base`/`top` pair (must re-key nothing).

## Verified

- Test-first: `pnpm exec vitest run tests/cache-input-key-d29.test.ts` before the fix → `3 failed | 23 passed`,
  each `expected [] to deeply equal [ 'col' ]` / `[ 'sk' ]`; after → `26 passed`.
- Revert-verify: `git stash push -- packages/document/src/cachekey.ts`, same run → the same 3 red; `git stash
  pop` → 26 passed.
- Key time, `--reporter=verbose`, one run: 1k 97.3 / 4k 320.1 / 16k 1208.9 ms.
- `pnpm verify`: ran to its last step (`docs:check`, 66 passed); `pnpm test` 101 files / 936 tests passed.

## notes

- Hosted elements were also id-sorted; `build.ts` cuts them in `hostedBy` (scene) order, so they now key in
  that order too. No test pins that one: whether cut order changes the solid was not measured.
- A row retargeted to a different level of equal elevation no longer re-keys: the build reads only the number.
