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


## Return from step 1 (supersedes note 1: the resolvers are last-wins in scene order, not id order)

- `cachekey.ts`: indexes keep scene order; own and child rows are keyed via the build's own resolvers run on a
  scene of just those rows (original keys), so no second resolver; `scene.ts` (`WATCHED`) untouched.
- Four reorder tests (two `base`, two same-axis `grid`, two sketch rows re-key; `base`/`top` re-keys nothing):
  `vitest run tests/cache-input-key-d29.test.ts` → before `3 failed | 23 passed`, after `26 passed`; `git stash
  push -- packages/document/src/cachekey.ts` → same 3 red, `pop` → 26. Keys 1k/4k/16k: 97/320/1209 ms.
- `pnpm verify` ran to `docs:check` (66 passed), 936 tests. Hosted elements now key in `hostedBy` (cut) order;
  whether that order changes the solid was not measured.
