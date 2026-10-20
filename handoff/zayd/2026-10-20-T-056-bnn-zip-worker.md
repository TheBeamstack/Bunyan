# T-056 — a save carrying the D29 cache can zip off the main thread, byte-identical to saveBnn

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-056-a-save-carrying-the-d29-cache-can-zip-of`
- task: `docs/BACKLOG.md` T-056 · risk: high · implements: D29 design §5, §6 R4; spec §6.5

## Changed

- `packages/document/src/bnnzip.ts` (new): `zipBnnEntries(entries)` — `zipSync` level 6, `mtime` 1980-01-01 local,
  moved verbatim from `bnn.ts`; imports only `fflate`, so a worker bundle can import it without document code.
- `packages/document/src/bnn.ts`: `assembleBnnEntries(scene, options)` holds every former `saveBnn` refusal and
  entry; `saveBnn` is their composition. `index.ts` re-exports `bnnzip.js`.
- `tests/bnn-zip-worker-t056.test.ts` (new, real OCCT): R4's fixture built as in `geometry-cache-export-d29.test.ts`;
  entries pass through `structuredClone`, then `zipBnnEntries` must equal `saveBnn` and `zipSync(entries,
  { level: 6, mtime: new Date(1980, 0, 1) })`; cases: the 20-`.brep` cache, and `emptyScene()` without one.
- Design §5: a T-056 paragraph after the 4.1 s figure, carrying the unverified 16k re-run.

## Verified

- Test-first: before the split, `npx vitest run tests/bnn-zip-worker-t056.test.ts` → 2 failed
  (`assembleBnnEntries is not a function`); after → 2 passed.
- Revert-verify: `level: 5` → 1 failed (the cached case; cache-less entries deflate alike at 5 and 6);
  `new Date(1980, 0, 2)` → 2 failed; both restored.
- `npx vitest run tests/geometry-cache-export-d29.test.ts tests/autosave-cache-d29.test.ts
  tests/bnn-save-deterministic-t047.test.ts tests/bnn-zip-worker-t056.test.ts tests/freeze-boundary.test.ts` →
  5 files, 32 passed, 1 skipped (the 16k measure).
- `pnpm verify` → 113 files, 1002 passed, 1 skipped; `docs:check` 66 passed.

## done-when

- 1: yes. Two pure steps exported; `saveBnn` is `zipBnnEntries(assembleBnnEntries(...))`.
- 2: yes. See test-first and revert-verify above.
- 3: yes. The three named files are unchanged and pass; `tests/bnn-save-deterministic-t047.test.ts` is the only
  other T-047 test (`grep -l T-047 tests/*.ts`).
- 4: unverified here: `BUNYAN_D29_MEASURE_16K=1 npx vitest run tests/geometry-cache-export-d29.test.ts` re-run
  after the split, numbers into design §5 — hmdnah to confirm. This session refused the command twice
  (`VAR=1 npx …` and `env VAR=1 npx …`). The zip call is unchanged, so ~4.1 s is expected, not measured.
- 5: yes. `git status --short`: `bnn.ts`, `bnnzip.ts`, `index.ts`, the test, design §5, log, handoff; none watched.

## notes

- `tests/bnn-save-deterministic-t047.test.ts`'s REVERT-VERIFY comment still names `bnn.ts` `saveBnn` for the
  `mtime` option, now in `bnnzip.ts`; left unchanged per done-when 3.
- Wiring a dedicated worker into `apps/web` is the separate row the task's note names.
