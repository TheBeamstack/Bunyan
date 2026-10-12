# T-040 — D29 R2 — `geometry-cache/` in the `.bnn`, optional and filtered on load

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-040-d29-r2-geometry-cache-in-the-bnn-optiona`
- task: `docs/BACKLOG.md` T-040 · risk: high · implements: design §3, §6 R2 · spec §6

## Changed

- `packages/document/src/bnn.ts`: optional `SaveOptions.cache` (`GeometryCacheFiles`, names relative to
  `geometry-cache/`, `index.json` required, a name with an empty/`.`/`..` segment or `\` refused); optional
  `BnnPackage.cache` (`GeometryCacheReader`: `names`, `read(name)`); `loadBnn` passes `unzipSync` a filter
  that skips `geometry-cache/`, and `read` inflates one entry from the retained bytes. `GEOMETRY_CACHE_DIR`.
- `docs/contracts/V1.0.0_spec.md` §6: the tree names `geometry-cache/` (`index.json` + `<rootId>/<k>.brep`),
  replacing the PROVISIONAL `geometry-cache.brep`; the box heading and the "undecided" bullet follow.
- `tests/bnn-geometry-cache-layout-d29.test.ts` (new, 7 tests); `tests/fixtures/loadBnnPreR2.ts` (new): `main`'s
  `loadBnn` at 600baab, comments stripped, as "the build that ignores it".

## Verified

- Test-first: `pnpm exec vitest run tests/bnn-geometry-cache-layout-d29.test.ts` before `bnn.ts` → 5 failed,
  2 passed (old-file and pre-R2 cases hold trivially today); after → 7 passed.
- Revert-verify: the filter's `return false` → `return true` (inflate everything), same command → 1 failed
  ("inflates nothing it does not read"), 6 passed; restored.
- `pnpm verify` green: `pnpm test` 102 files / 943 tests; `docs:check` 66 passed, `freeze-boundary` included.
- No changed path is in `.agent.toml [frozen_surface] watched` (`bnn.ts` is not; `git diff --name-only main`).

## done-when

- `SaveOptions.cache` optional; no required member added to `Manifest`, `BnnPackage`, `ElementGeometry`;
  no watched file changed: yes.
- `loadBnn` filters `geometry-cache/` and exposes an on-demand reader: yes.
- An old file opens; a cached file opens through the pre-R2 `loadBnn`, deep-equal to the cache-less file: yes.
- Spec §6 tree names `geometry-cache/` as a directory: yes.

## notes

- The "never inflates" test corrupts one entry's first DEFLATE byte: the pre-R2 loader refuses the whole file
  on it, the live loader opens and only `read` of that entry throws.
- `BNN_CODEC.read` does not pass `cache` through; `CodecReadResult` has no member for it, and R3 decides
  whether the restore reads via the codec or `loadBnn`.
- The reader re-scans the central directory per `read` (no inflation of other entries); whether that matters
  at ~16k entries is for R3/R4 to measure.
- Spec §7's autosave line and §9's hardening line still name `geometry-cache.brep`; T-045 owns §7.
