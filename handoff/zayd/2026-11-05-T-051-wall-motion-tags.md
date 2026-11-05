# T-051 — `core.move`/`rotate`/`copy` move a D52 wall through its `motion` tags

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-051-q8a-core-move-rotate-copy-move-a-d52-wal`
- task: `docs/BACKLOG.md` T-051 · risk: high · implements: design `P4.5_baseline_move_design.md` §5 A, §6, §7 · D95 · D80 · `D-20261012-03` (`annotation`) · `D-20261012-04` (`detach`)

## Changed

- `packages/types/src/wall.ts`: `start` and `end` carry `motion: 'planPoint'`; `buildGeometry` is untouched.
- `packages/document/src/placement.ts`: `positioningOf` takes the Type's `parameterSchema`, and its second rung is
  `{ kind: 'params', fields }`, read through `motionFieldsOf` and no longer through `baselineOf`. New: `moveParams`
  (applies a motion to the tagged params and refuses with a named reason), `motionCentroid`, and a mirror refusal (§6).
- `packages/document/src/commands.ts`: `core.move`, `core.rotate` and `core.copy` take the params road when the
  element's schema tags any param, and leave `placement` untouched. `core.setPlacement` and `core.createElement`
  refuse a params-positioned element, naming `core.move`. A grid-bound params-positioned element refuses any plan motion.
- `tests/wall-motion.test.ts` (new, 8 tests); `tests/move-verbs-and-transactions.test.ts`: the "placed baseline wall"
  test's tail now asserts that `core.move` moves the baseline and the solid together, where it used to assert the refusal.

## Verified

- `pnpm verify` → 124 files, 1069 passed, 4 skipped; `docs:check` 5 files, 66 passed.
- Revert-verify: deleting both `motion: 'planPoint'` lines from `wall.ts` → `pnpm exec vitest run tests/wall-motion.test.ts`
  gives 5 failed and 3 passed; restored → 8 passed.
- No verb body names `start`, `end` or `core.wall`: `awk '/^function movableElement/{on=1} /^export const arrayCommand/{on=0} on' packages/document/src/commands.ts | grep -cE "'start'|'end'|core\.wall|baselineOf|start, end"` → `0`.
- Re-seed: `cd tools/oracle && uv run seed-goldens ../../tests/goldens` ran on this box (aarch64, Python 3.12.3, 15
  cases). Against the committed x86_64 seed, the only changes were in the last floating-point digit (for example
  `4000.0000000000005` → `4000.0`). The committed seed is kept, and the commit carries `Re-seed-unchanged:` with that reason.

## done-when

1. Tags, the schema-read rung, and no wall names in the verbs: yes (grep above).
2. §A probe: move `[1000,0,0]`, rotate `[0,0,1]` 90° and copy `[1000,0,0]` succeed on both demo walls. Each is one
   element change, and one `undo()` restores a scene that `toEqual`s the one before. Each writes `start`/`end` and leaves `placement` equal.
3. Refused with a named reason: dz ≠ 0 and a non-vertical axis (both name `core.updateContainer`), a mirror (§6 text),
   and `core.setPlacement` (names `core.move`).
4. Rotate's default `about` is the centroid of the tagged points: wall `[0,0]→[4000,0]` → `[2000,-2000]→[2000,2000]`.
5. Detach: moving wall 1 leaves wall 2's params byte-identical. A copy of a hosting wall refuses at the hosted check.
6. Goldens: re-seeded with no value moved beyond oracle-platform noise ⇒ `Re-seed-unchanged:` trailer.
7. Revert-verified: yes.

## notes

- `unverified here: the re-seed gate accepts this branch's trailer` — `env BASE_REF=main node scripts/check-reseed.mjs`
  was refused by this session's permission layer. The PR's CI runs it.
- `apps/web/src/tool/drag.ts` and `cleandelta.ts` `MOVE_PARAMS` still read `start`/`end` by name. The design (§5 A)
  calls making them schema-derived a follow-up that is not part of the mechanism.
