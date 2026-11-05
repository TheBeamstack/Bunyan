# T-034 — Q9 — `FamilyDefinition` reserves a way for data to name billable faces

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-034-q9-familydefinition-reserves-a-way-for-d`
- task: `docs/BACKLOG.md` T-034 · risk: high · implements: D96 · D72 · D61 · `P5_step5D` design

## Changed

- `packages/document/src/families.ts`: new `FamilyFaceSelector = { by: 'role'; role: string }`; optional
  `FamilyPart.exposedFaces?: readonly FamilyFaceSelector[]` (absent ⇒ whole-solid, `[]` ⇒ zero, as D72).
  `FamilyPart` covers `parts` and `hosting.leafParts`.
- `tests/family-seam.test.ts`: the in-test interpreter resolves each role to `${nodeId}/face/${role}#…` refs;
  two tests — `exposedFaces` round-trips through `saveBnn`/`loadBnn` (`[]` kept distinct from absent), and
  an OCCT build measures billed = 2·W·H, buried = 0, undeclared = whole-solid area.
- `docs/design/P5_step5D_family_seam_design.md §4 R2`: the shape, and that no interpreter reads it in v1.0.0.
- `tests/frozen-surface.snapshot.json`, `docs/CURRENT_STATE.md §8`: `pnpm state --rebaseline` (D96 is the ruling).

## Verified

- Test-first: `pnpm exec tsc -p tsconfig.json --noEmit` before the field → TS2339/TS2353 on `exposedFaces`
  (6 errors, `tests/family-seam.test.ts`).
- Revert-verify: `git stash push packages/document/src/families.ts` → the same 6 errors; `git stash pop` → clean.
- `pnpm exec vitest run tests/family-seam.test.ts` → 6 passed.
- `pnpm verify` → test 100 files / 912 passed; `docs:check` 5 files / 66 passed; no ELIFECYCLE.
- Freeze verdict, measured: before re-baselining `tests/freeze-boundary.test.ts` failed with
  `CHANGED families.ts :: interface FamilyPart`, `ADDED families.ts :: type FamilyFaceSelector`.

## done-when

- Optional field naming billable faces by role on a primitive, never area/index: yes (`exposedFaces`).
- Design doc records the shape and that no interpreter reads it in v1.0.0: yes.
- Round-trip test that fails when the field is removed (revert-verified): yes — fails `pnpm typecheck`.
- Freeze verdict reported as measured: contract-touching ⇒ owner merges (`docs/INVARIANTS.md §2.1`).

## notes

- The selector names roles of the part's BASE primitive; faces created by a modifier (chamfer/fillet) are
  not nameable yet — a future additive member of the union.
- The removal failure is a typecheck failure, not a runtime one: the codec round-trips any key verbatim.
- The snapshot's `_baselinedAtEntry` reads `STEWARD-x001`, not this turn — the defect T-033 recorded in
  PR #69's `## Discovered`; not re-filed. PR #69 also edits the snapshot: whichever merges second rebases.
