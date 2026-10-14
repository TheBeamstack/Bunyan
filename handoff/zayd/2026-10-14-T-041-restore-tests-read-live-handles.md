# T-041 — restore tests read live handles, not import calls (B-20261012-06)

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-041-d29-r3-the-load-only-restore-substitutio` (PR #79), a returned fix (`agent_start.py --continue T-041`)
- task: `docs/BACKLOG.md` T-041 · risk: high · first body: `handoff/zayd/2026-10-12-T-041-d29-load-only-restore.md`

## Changed

- `tests/geometry-cache-restore-d29.test.ts`: the spy records the handles `importBrep` returns and those
  `releaseShape` is handed; `restoredRoots(doc, spy)` fails on any released import or an assembly mixing
  imported and built solids, and counts a root only when every live part handle (children, voids) was imported.
  The three restore tests and the Clean Delta test assert it, so done-when 2 and 4 are held by a test.
- Merged `origin/main` (PR #81): `docs/BLOCKERS.md` is main's file + B-20261012-05/-06 re-appended (no id
  collision); `## BLOCKED` re-rendered by `blocked.py`; the baton and generated block taken from this branch.

## Verified

- Mutant 1, B-20261012-06 `evidence:` (`if (result.parts.length < 2) throw new Refusal();` after
  `restore(cachedRoot)`): `pnpm exec vitest run tests/geometry-cache-restore-d29.test.ts --disable-console-intercept`
  → 3 failed, 5 passed ("an imported solid was released"). `rebuildOnly` stays green, correctly: wall C has two parts.
  Restored (`git checkout --`) → 8 passed.
- Mutant 2 (`isPermutation` returns `false`) → 5 failed, 3 passed; restored → 8 passed.
- Unmutated Clean Delta: 4.44e-16 m³ over 22 elements, unchanged.
- `pnpm verify`: 104 files / 962 tests, `docs:check` 66.
- Not addressed: the step-2 record's R5-scope opinion (a repeated child `elementId` leaks one import).
