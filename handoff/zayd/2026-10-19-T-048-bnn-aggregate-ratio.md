# T-048 — A `.bnn` of many small high-ratio entries is refused by an aggregate ratio cap

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-048-a-bnn-of-many-small-high-ratio-entries-i`
- task: `docs/BACKLOG.md` T-048 · risk: high · implements: spec §9 (Import hardening) · design §3, §5 · D29

## Changed

- `packages/document/src/bnn.ts` `checkCaps(bytes, wanted?)`: the inflate-nothing pass also sums each measured
  entry's `min(size, entryRoom)`; after the pass it refuses when the summed inflated bytes pass `RATIO_FLOOR_BYTES`
  and `BNN_MAX_RATIO` × that sum, naming "the aggregate BNN_MAX_RATIO". `wanted` zeroes unwanted entries, as the
  reader's inline pass did.
- `geometryCacheReader.readMany` now calls `checkCaps(bytes, wanted)` and then a plain filtered `unzipSync`,
  replacing its inline `checkEntry` pass: the aggregate needs every wanted entry summed before fflate allocates
  for one, and fflate inflates inside the filter loop. Both passes run synchronously over the same bytes.
- `tests/bnn-aggregate-ratio-t048.test.ts` (new, 3 tests): the T-046 probe; a post-load `readMany` of 500 entries
  whose declared sizes were raised to 1 MiB; a 16k full-cache `.bnn` opens and `readMany` reads all 16,001 names.

## Verified

- Test-first: `pnpm vitest run tests/bnn-aggregate-ratio-t048.test.ts` before the `bnn.ts` change → 2 failed
  (the probe got "not a readable .bnn package: invalid block type", so it had inflated; `readMany` did not
  throw), 1 passed (16k).
- Revert-verify: aggregate condition prefixed with `false &&` → the same 2 failed; restored → 3 passed.
- The four `.bnn` test files (`bnn-aggregate-ratio-t048`, `bnn-zip-caps-t046`, `bnn-save-deterministic-t047`,
  `bnn-geometry-cache-layout-d29`) → 22 passed; none but the new file changed.
- `pnpm verify` green: 107 files, 975 passed and 1 skipped; `docs:check` 66 passed.
- Probe, measured with a throwaway vitest file (deleted): 579,153 B, 524,288,482 B declared inflated over
  516,153 B declared compressed, 1016:1. The T-046 handoff's 577,279 B used a different manifest and scene.
- 16k fixture, measured with a throwaway `node` + fflate `deflateSync` level 6 script (deleted): `.brep`
  2,747 B → 694 B per solid (3.96:1); `index.json` 61,298,663 B → 4,111,117 B (14.9:1). That is ~105.3 MB
  from ~15.2 MB, against design §5's 105 MB from ~14.6 MB. The test asserts > 105e6 inflated and 14e6–16e6 held.

## done-when

- `checkCaps` and the reader path refuse before inflating, naming the cap: yes.
- Test-first probe, nothing inflated, revert-verified: yes.
- The T-046 and T-042/T-047 tests pass unchanged, and the 16k full cache opens: yes. The fixture is synthetic
  text tuned to R4's per-solid figures, not R4's real exported cache, which needs the kernel.
- No `[frozen_surface]` watched file changes: yes (`git diff --stat main` names `bnn.ts` as the only source file).

## notes

- Stored entries count at their held bytes on both sides, so they can only lower the aggregate ratio.
- The new file's three tests took 14.45 s together on box (vitest's report); the 16k test has a 120 s timeout.
