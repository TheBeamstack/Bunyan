# T-053 — wall auto-joins pair only walls whose vertical extents overlap

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-053-wall-auto-joins-pair-only-walls-whose-ve`
- task: `docs/BACKLOG.md` T-053 · risk: high · implements: P5_step0c_design §2, §0a, §4; D68, D73

## Changed

- `packages/document/src/joins.ts`: `wallExtentOf` (not exported) resolves `[base, top]` as `build.ts` feeds
  `wall.ts`, through `datumElevations` handed only the element's own datum constraints (indexed once per
  constraints record). `partnersAt` and `throughWallsAt` skip a candidate whose extent does not overlap the
  queried wall's by more than `EPS`; `indexOf` is untouched. Overrides and `wallsJoinedTo` are not filtered.
- `tests/wall-join-level-scope.test.ts` (new, 5 tests, real OCCT).

## Verified

- Revert-verify: `git stash push packages/document/src/joins.ts` →
  `npx vitest run tests/wall-join-level-scope.test.ts` 5 failed; `git stash pop` → 5 passed.
- `npx vitest run tests/wall-join-level-scope.test.ts tests/wall-joins.test.ts tests/join-option-cascade.test.ts` → 19 passed.
- `pnpm verify` → 110 files, 988 passed, 1 skipped; `docs:check` 66 passed.

## done-when

- 1: yes. Stacked l0/l1 corners: l0 wall `resolveJoins` `['start']`, bbox `min[0]` within 1e-6 of −100 and equal
  to the l1-empty value; red with the filter reverted.
- 2: yes. Touching (3000 = 3000) and disjoint (2400 < 3000) extents get no miter and no mid-span butt; an
  overlapping corner miters, including one whose overlap exists only through a `top` datum to l1.
- 3: yes. `indexOf` unchanged; the l1 corner in the same scene object still resolves `['start']`. Full suite green.

## notes

- Reviewer's question (nine tests with raised-level walls): with the filter applied strictly, the full
  `npx vitest run` failed only 3 tests, all in `tests/join-option-cascade.test.ts`, whose walls carry no
  `height` and no top datum (extent `[0, 0]`). No test pins cross-level joins.
- ⚠ Spec gap, resolved in code and flagged here: the outcome's "overlaps by a positive length" cannot hold for
  a zero-extent wall, so read literally it breaks done-when 3. A wall with no positive extent is not filtered
  (it cannot build anyway); the 3 tests above fail without that line. brahim to confirm or reword the outcome.
- Perf: the first cut called `datumElevations` per candidate, which filters all constraints per call;
  `cache-input-key-d29`'s 16k-element timing test then ran 366 s and failed. Editing `constraintsOf` in
  `scene.ts` trips `freeze-boundary.test.ts`, so the per-element index lives in `joins.ts`.
- As the row says, every stacked lower wall's cache key and geometry change (`cachekey.ts` digests `resolveJoins`).
