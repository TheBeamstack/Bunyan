# STEWARD-owner-rulings-q5-q10 — six owner answers acted on: D92–D97, T-033–T-038

- seat: brahim (steward, box) · date: 2026-10-10 · branch: `steward/owner-rulings-q5-q10`
- start: `python3 $DIWAN/scripts/agent_start.py --seat brahim` rc=0; step 4 listed D-20261007-02…07 ANSWERED, -08/-11 pending (skipped, untouched)

## Rulings recorded (`docs/decisions.md`, one-line index in `docs/CURRENT_STATE-reference.md §4`)

| Owner record | Answer | Ruling | Backlog |
| --- | --- | --- | --- |
| D-20261007-02 (Q5) | builder + free-text | D92 | T-037 ready (kernel, normal) |
| D-20261007-03 (Q6) | yes | D93 | T-038 ready (design doc, high — D29) |
| D-20261007-04 (Q7) | deep-copy | D94 | T-036 blocked on T-035 (document, high — D1) |
| D-20261007-05 (Q8) | translate + free-text | D95 | T-035 ready (design doc, normal) |
| D-20261007-06 (Q9) | reserve | D96 | T-034 ready (document, high — frozen surface) |
| D-20261007-07 (Q10) | narrow | D97 | T-033 ready (document, high — frozen surface) |

Each record's `answered:` stamped 2026-10-10T18:37Z; no other owner field edited. Free-texts are carried
verbatim in D92 and D95.

## Measured, with the command

- Q5: the tolerance already exists as `SECTION_DEFLECTION = 0.5` (`packages/kernel-occt/src/kernel.ts:71`),
  argued from 1:100 only; Grep for `SECTION_DEFLECTION` under `tests/` finds nothing, so no test holds it.
- Q5: `SectionCutPayload` (`packages/protocol/src/ops.ts:640`, frozen) has no tolerance field, so a
  per-view tolerance would be a protocol change; T-037 records it rather than makes it.
- Q7: `core.copy` runs `checkPositioning` before its hosted check (`commands.ts:3101` vs `:3107`) and
  `positioningRefusal` refuses every `baseline` element (`placement.ts:348`), so no D52 wall can be
  deep-copied until Q8's design lands. Hence T-036 `blocked`, `depends-on: T-035`.
- Q6: §4j-2 of `docs/decisions.md` makes the cache's invalidation design-first, so Q6 is a design row.
- Q8: the owner's free-text rejects both framed options, so Q8 is a design row whose open questions go back
  to the owner as `D-` records.

## Rows

All six written by `python3 $DIWAN/scripts/backlog.py add --after …` (rc=0 each, ids T-032…T-037 then), then
`pnpm exec prettier --write docs/BACKLOG.md`. None needs `requires:`: every `done-when:` is headless.

- rebase 2026-10-11 (B-20261011-03): `main`'s a68b995 took T-032, so on `origin/main` (bdc74bb)
  `backlog.py next-id` printed `T-033` and the six rows were renumbered T-033…T-038 in order, every
  reference with them; D92–D97 are unchanged (`main` holds none). T-035's design `done-when:` was tightened
  to D95's free-text: it may recommend neither framed option, and must compare Revit, Archicad and Rhino.

- notes: `backlog.py` refuses this repo's `area:` vocabulary (its `AREAS` is mdo's) and has no `--requires`;
  each row was written with `--area spec` and that token corrected by hand. Recorded in `## Discovered`.
  Sequence after T-027: T-033, T-034 (pre-freeze contract shapes), T-035, T-036, T-037, T-038.
  `D-20261007-08` (Q20) depends on T-035's answer about `core.move`; left pending as instructed.

## Not verified here

- `tests/freeze-boundary.test.ts`'s verdict for T-033/T-034 is the builder's to measure; the rows say so.

## Next

`hmdnah` reviews this PR once B-20261010-03 is cleared; until then it must not merge, since `agent_merge.py` re-breaks §8.
