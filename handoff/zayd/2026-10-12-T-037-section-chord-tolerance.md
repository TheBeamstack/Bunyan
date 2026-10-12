# T-037 — Q5 — the section chord tolerance, chosen for Revit-class drawings and asserted

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-037-q5-the-section-chord-tolerance-chosen-fo`
- task: `docs/BACKLOG.md` T-037 · risk: normal · implements: D92 · `P5_step6C_plan_section_design.md` §4.1

## Changed

- `packages/kernel-occt/src/kernel.ts`: `SECTION_DEFLECTION` 0.5 → 0.01 mm; comment argues from 1:1, not 1:100.
- `docs/design/P5_step6C_plan_section_design.md` §4.1: the value, smallest scale (1:1, detail scales above
  it), on-paper error (0.01 mm), measured cost, float32 limit, D92's free-text verbatim.
- `tests/section-chord-tolerance.test.ts` (new): real OCCT, cylinders r150 and r600 centred at
  (2500, -1700), cut at z=1200; every vertex and every chord midpoint (closing chord included) within
  0.01 mm + one float32 ulp of the exact radius. The budget is a literal, not imported.
- `docs/BACKLOG.md` `## Discovered`: the float32 point-transfer finding.

## Verified

- Test-first: `npx vitest run tests/section-chord-tolerance.test.ts` at 0.5 → red (worst 0.486 / 0.499 mm).
- At 0.01 → green; measured worst 0.01004 / 0.01009 mm (the excess is float32 rounding at ~3100 mm),
  274 / 546 points.
- Revert-verify: 0.02 → red (0.01997 / 0.02010 > 0.01024); 0.5 → red; restored 0.01 → green.
- `npx vitest run tests/section-chord-tolerance.test.ts tests/plan-section.test.ts`: 12 passed at 0.01.
- Rule 15: `grep -rn "\.points\b" packages/*/src` finds no reader of `SectionCurve.points` outside the
  kernel adapter; `view.ts` only passes curves through. `git diff --stat packages/protocol` is empty.
- `pnpm verify` green locally (101 files, 912 tests; the re-seed gate skips without `BASE_REF`).

## done-when

- §4.1 states value, smallest scale with detail scales, on-paper error, D92 verbatim: yes.
- Constant carries the value; comment no longer argues from 1:100 alone: yes.
- Real-OCCT circular-column test, red when loosened (revert-verified at 0.02 and 0.5): yes.
- No quantity reads the polyline; `SectionCutPayload` unchanged; no per-view tolerance needed: yes.
- Re-seed gate: the oracle (`tools/oracle`, native OCCT) never runs `kernel.ts` or `sectionCut`, so no
  golden value can move; claimed by a `Re-seed-unchanged:` trailer. The seeder was not run:
  `uv run seed-goldens` was denied permission on this box.

## notes

- The test allows one float32 ulp because the WASM adapter returns `Float32Array` points; see `## Discovered`.
- ISO 128's thinnest line (0.13 mm) and Revit printing at 1:1 are from the author's knowledge, not a
  fetched source: `unverified here: §4.1's ISO 128 and Revit 1:1 claims — hmdnah to confirm`.

## Return turn (PR #72 changes requested) — incomplete

- `cd tools/oracle && uv run seed-goldens ../../tests/goldens` was refused by the session's permission
  layer: "The following part requires approval: uv run seed-goldens ../../tests/goldens". Not worked around.
- Not done: no golden re-seeded; B-20261012-01 `cleared: -`; CI's re-seed gate stays red.
- Next: a session permitted to run the seeder performs B-20261012-01's `need:` on this branch, then stamps `cleared:`.

## Third turn — incomplete

- `cd tools/oracle && uv run seed-goldens ../../tests/goldens` refused again: "The following part requires
  approval: uv run seed-goldens ../../tests/goldens". Not worked around.
- `git merge-tree --write-tree --name-only HEAD origin/main` conflicts in BACKLOG, BLOCKERS, CURRENT_STATE and
  PHASE_LOG. BLOCKERS is a duplicate id: `origin/main:docs/BLOCKERS.md:217` is a different B-20261012-01 (PR #74).
  Not hand-resolved (blocker records are immutable); filed to BACKLOG `## Discovered`.
- Next: a steward rules which B-20261012-01 is renumbered; then a permitted session runs the seeder.
