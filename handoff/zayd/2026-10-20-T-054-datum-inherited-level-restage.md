# T-054 — a container move re-stages every datum on a Level beneath it

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-054-a-container-move-re-stages-every-datum-o`
- task: `docs/BACKLOG.md` T-054 · risk: high · implements: P5_step0b_design §5, §6; D50

## Changed

- `packages/document/src/dependency.ts`: `case 'containers'` also re-stages elements with a `base`/`top` datum on
  every container beneath the changed one that inherits through it (`levelsInheritingFrom`: none on the path from
  that container up to, excluding, the changed one sets an elevation). Its join neighbours follow via the existing
  `joinNeighboursOf` hop. `scene.ts` untouched.
- `tests/datum-inherited-level-restage.test.ts` (new, 3 tests, real OCCT): a `base` datum and a `top` datum on `u`
  (Level, no elevation, under Building `b2` at 3000), each through `core.updateContainer b2 → 2000` and its undo.

## Verified

- Test-first: before the fix `npx vitest run tests/datum-inherited-level-restage.test.ts` → 2 failed, 1 passed
  (base: C `min[2]` 3000 vs 2000; top: C `max[2]` 3000 vs 2000); after → 3 passed.
- `npx vitest run tests/datum-inherited-level-restage.test.ts tests/wall-join-level-scope.test.ts` → 10 passed.
- `pnpm verify` → 111 files, 993 passed, 1 skipped; `docs:check` 66 passed.

## done-when

- 1: yes. C (base→`u`) `min[2]` incremental equals the `rebuildAll` value, 2000; red without the fix.
- 2: yes. A on `l0` (corner with C) `min[0]` incremental equals `rebuildAll` (−100) after the move, and (0) after undo.
- 3: yes. With Level `v` (elevation 6000) under `b2`, `dependents` for the `b2` move is `[]` before and after the
  fix; no existing test file changed and the full suite is green.

## notes

- Beyond the done-whens, the `top` case is covered (reviewer request): C top→`u`, A on `l1` at 2500 loses its
  miter after the move and regains it on undo, incremental equal to `rebuildAll` each time.
- The predicate ignores the changed container's own elevation, so setting or clearing it is covered either way.
