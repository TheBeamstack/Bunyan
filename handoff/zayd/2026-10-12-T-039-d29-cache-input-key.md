# T-039 — D29 R1 — the cache input key, one pass over the scene

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-039-d29-r1-the-cache-input-key-one-pass-over`
- task: `docs/BACKLOG.md` T-039 · risk: high · implements: design §2a–§2c, §6 R1 · D93 · D29

## Changed

- `packages/document/src/cachekey.ts` (new): `cacheInputKey(scene, root, tables)`, `cacheInputKeys(scene)`,
  `cacheKeyTables(scene)` (the one pass: the five-table digest, `hostId` and constraint-subject indexes),
  `canonicalJson`, `sha256Utf8Hex`, `CACHE_SCHEME = 'bnnc1'`, `CacheEnvelope` + `sameCacheEnvelope`.
- `packages/document/src/joins.ts`: `joinOverridesOf` reads a per-`scene.constraints` index (same order as the
  old filter); the filter-per-wall made the 16k key pass O(n²).
- `packages/document/src/index.ts`: exports `cachekey.js`.
- `tests/cache-input-key-d29.test.ts` (new, 22 tests).

## Verified

- Test-first: `npx vitest run tests/cache-input-key-d29.test.ts` before the module → 22 failed; after → 22 passed.
- Revert-verify (`python3 /tmp/t039_revert_verify.py`, drops one class, runs the file, restores): row → 3 red,
  owned constraints → 3, child `<root>:` rows → 1, resolved joins → 2, hosted members → 1, table digest → 6.
- Key time, `vitest … -t "key time" --silent=false --reporter=verbose`, three runs: 1k 145–153 ms, 4k 287–304
  ms, 16k 1173–1186 ms. Before the `joins.ts` index: 372 ms / 5320 ms / 113 571 ms.
- `sha256Utf8Hex` equals `node:crypto` on five inputs, Arabic and an astral emoji included.
- `pnpm verify`: ran to its last step (`docs:check`, 66 passed); `pnpm test` 101 files / 932 tests passed.
- No changed path is in `.agent.toml [frozen_surface] watched` or `[reseed] sources`
  (`git diff --name-only origin/main...HEAD`).

## done-when

- `cacheInputKey`, envelope, canonical JSON, one-pass index in `packages/document`: yes.
- Each per-element §2b class hand-edited flips exactly its readers; each of the five tables flips every key,
  `PANEL` (read only by a D59 child) included; a tab-indented, key-reversed reformat flips none: yes.
- Revert-verified per class: yes (above). Key time at 1k/4k/16k printed and recorded: yes (above).

## notes

- §2b lists `elevationOf(containerId)`; it is not a separate key field, since `row.containerId` and the whole
  `containers` digest determine it, so dropping it could turn nothing red. Same for `datumElevations`,
  `gridPointOf`, `sketchConstraintsOf`: the owned rows are digested raw, which with `containers`/`grids`
  determine them.
- Not `kernel-occt`'s `sha256Hex`: it masks input to ASCII, and `packages/document` may not import a kernel
  package (D19). Moving it to a shared package would touch a `[reseed] sources` path.
- The envelope's `fingerprint` is passed in (`FINGERPRINT_SCHEME` lives in `kernel-occt`); `codeId` is a plain
  string until `D-20261012-06` is answered.
- The 16k figure is 1.2 s of pure TypeScript, per full key pass; R2/R4 decide when it runs.

## Return from step 1 — `scene.constraints` order keyed (`--continue T-039`)

Answers `handoff/hmdnah/2026-10-12-T-039-review-step-1.md`; it supersedes the first note above, whose claim
that id-sorted raw rows determine the resolvers was false (they are last-wins in scene order).

- `cachekey.ts`: the indexes keep `scene.constraints` / `scene.elements` order (the id sort is gone). An
  element's own rows, and each generated child's, are digested RESOLVED: `datumElevations`, `gridPointOf` and
  `sketchConstraintsOf` run on a scene whose `constraints` holds only those rows under their original keys, so
  the build's own resolvers decide and no second resolver exists. `scene.ts` (frozen-surface `WATCHED`) is
  untouched.
- Tests: four reorder cases — two `base` rows, two same-axis `grid` rows, two sketch rows (each re-keys its
  element), and a `base`/`top` pair (re-keys nothing).
- Test-first: `pnpm exec vitest run tests/cache-input-key-d29.test.ts` before the fix → `3 failed | 23
  passed` (`expected [] to deeply equal [ 'col' ]` / `[ 'sk' ]`); after → `26 passed`.
- Revert-verify: `git stash push -- packages/document/src/cachekey.ts`, same run → the same 3 red; `git stash
  pop` → 26 passed.
- Key time, `--reporter=verbose`, one run: 1k 97.3 / 4k 320.1 / 16k 1208.9 ms.
- `pnpm verify`: ran to its last step (`docs:check`, 66 passed); `pnpm test` 101 files / 936 tests passed.
- Hosted elements were id-sorted too; `build.ts` cuts them in `hostedBy` (scene) order, so they now key in that
  order. No test pins it: whether cut order changes the solid was not measured.
- A row retargeted to another level of equal elevation no longer re-keys: the build reads only the number.
