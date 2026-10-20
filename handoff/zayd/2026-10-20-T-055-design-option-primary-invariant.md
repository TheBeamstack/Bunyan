# T-055 — a design-option set with no primary or two primaries surfaces in brokenRefs()

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-055-a-design-option-set-with-no-primary-or-t`
- task: `docs/BACKLOG.md` T-055 · risk: normal · implements: D65, D85, D86; P5_step6D §4.2, §7; P5_step5F §5.1

## Changed

- `packages/document/src/document.ts`: `primaryViolations(scene)`, spread into `brokenRefs()` beside
  `danglingDesignOptionRefs`; one entry per element tagged with an option whose set's primary count is not 1,
  `ref` the option id, `hostId` the element id. `isElementActive`, `designoptions.ts` and `entities.ts` untouched.
- `tests/design-option-primary-invariant.test.ts` (new, 7 tests, no kernel): two and zero primaries on the code
  and `loadBnn(saveBnn())` roads; one primary; a violating set with no tagged element; an untagged hosted element.

## Verified

- Test-first: before the fix, and again with only the spread line removed, `npx vitest run
  tests/design-option-primary-invariant.test.ts` → 5 failed, 2 passed; with it → 7 passed.
- `npx vitest run tests/design-option-primary-invariant.test.ts tests/design-option-refs.test.ts
  tests/design-option-crud.test.ts` → 30 passed.
- `pnpm verify` → 112 files, 1000 passed, 1 skipped; `docs:check` 66 passed.
- `git diff --name-only origin/main` → `docs/CURRENT_STATE.md`, `packages/document/src/document.ts`, plus this
  turn's new test, log and handoff; none is `[frozen_surface] watched`.

## done-when

- 1: yes. Two primaries, code road: `[['wA','opt-a','wA'],['wB','opt-b','wB']]`; red with the spread reverted.
- 2: yes. Same entries after `loadBnn(saveBnn(scene))`.
- 3: yes. Zero primaries reports both walls on both roads.
- 4: yes. One primary → `[]`; violating set with only an untagged wall → `[]`; `modelElements()` is both walls
  (two primaries), none (zero), `wA` (one), and `isElementActive` is unchanged on each.
- 5: yes. See the `git diff` line above; both named test files are unchanged and pass.

## notes

- hmdnah's PR #101 note: an untagged element hosted on a tagged one gets no entry; its activity is its host's (D67),
  so the host's entry names the cause. Pinned by the test's last case (hosted `wD` → entries only `wA`, `wB`).
