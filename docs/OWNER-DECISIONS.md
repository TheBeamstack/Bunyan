# Owner decisions

The register named by `.agent.toml [paths] decisions`, and the only file in this repo the owner
edits. Its grammar — the fields, their order, and the four states — is `diwan/AGENTS.md §3.2`.

This is **not** `docs/decisions.md`, which is the ratified-ruling register (`D1`–`D88`): a record
of rulings already made, in its own grammar, never read by the turn protocol. The name is not
`docs/DECISIONS.md` because the pc runs Windows, where that and `docs/decisions.md` are one file.

D-20261007-01…11 are `open_rulings.md`'s open rows, moved 2026-10-07; each row's recommendation
(the default) and cost-if-deferred: `git show 5a4b9aa:open_rulings.md`.

## D-20261006-01 T-028 and T-030 fix scripts no entrypoint runs

- opened: 2026-10-06T01:20Z
- by: brahim-loop
- item: T-028
- asks: whether to retire T-028 and T-030, which fix `scripts/agent-finish.mjs` and `scripts/agent-start.mjs` while the live start/finish are diwan's `agent_start.py`/`agent_finish.py` (PR #54 step-1 finding F1; outside tests those two files are named only in a `ci.yml` comment)
- options: retire | keep
- default-if-silent: retire
- expires: 2026-10-13
- ANSWER:
- answered: -

## D-20261006-02 T-029 fixes seats.mjs functions only the dead agent-\*.mjs call

- opened: 2026-10-06T02:00Z
- by: brahim-loop
- item: T-029
- asks: whether to retire T-029, whose `reviewerFor`/`builderFor` are imported only by `scripts/agent-start.mjs` and `agent-finish.mjs` (see D-20261006-01); the live scripts `reserved-classes.mjs` and `pr-ready.mjs` import only `ghSpawn` and `titleRoutes`
- options: retire | keep
- default-if-silent: retire
- expires: 2026-10-13
- ANSWER:
- answered: -

## D-20261007-01 Q4: whether v1.0.0 owes a sheet

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q4
- asks: Does v1.0.0 owe a SHEET?
- options: no | yes
- default-if-silent: no
- expires: 2026-10-14
- ANSWER:
- answered: -

## D-20261007-02 Q5: who chooses the section-curve discretisation tolerance

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q5
- asks: The discretisation tolerance for section curves — mine to choose and document?
- options: builder | owner
- default-if-silent: builder
- expires: 2026-10-14
- ANSWER:
- answered: -

## D-20261007-03 Q6: whether to wire the D29 `.bnn` half for v1.0.0

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q6
- asks: Is the D29 `.bnn` half worth wiring at the measured 2.07×? A scheduling call, not a contract one.
- options: no | yes
- default-if-silent: no
- expires: 2026-10-14
- ANSWER:
- answered: -

## D-20261007-04 Q7: whether `core.copy` deep-copies a host's openings

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q7
- asks: Does `core.copy` deep-copy a host's openings?
- options: refuse | deep-copy
- default-if-silent: refuse
- expires: 2026-10-14
- ANSWER:
- answered: -

## D-20261007-05 Q8: whether the BASELINE refusal is the right strictness

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q8
- asks: Is the BASELINE refusal the right strictness? A user sliding a D52 wall must `core.setParams` both endpoints.
- options: keep | translate
- default-if-silent: keep
- expires: 2026-10-14
- ANSWER:
- answered: -

## D-20261007-06 Q9: whether `FamilyDefinition` gets a way to declare billable faces

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q9
- asks: rule 8 — does `FamilyDefinition` get a way to declare billable faces? Without one, every D61 data-authored family reports the whole-solid area, which D72 measured 1.07×–3.03× wrong.
- options: reserve | no
- default-if-silent: reserve
- expires: 2026-10-14
- ANSWER:
- answered: -

## D-20261007-07 Q10: whether `Dimension.anchors` excludes the free `point` anchor

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q10
- asks: rule 17 — should `Dimension.anchors` exclude the free `point` anchor? Two paper anchors give a number no model edit will ever update — this rule's own _"drifts and lies"_, on the one annotation a builder reads AS a measurement.
- options: narrow | keep
- default-if-silent: narrow
- expires: 2026-10-14
- ANSWER:
- answered: -

## D-20261007-08 Q20: which verbs get a button in the generated ribbon

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q20
- asks: Which verbs deserve a button in the GENERATED ribbon, given that some commands refuse by design? The ribbon is generated from `describeCommands` (D47: _"the ribbon rendered a FORM over `argsSchema` where it should have activated a TOOL"_), so every registered command becomes a control. Two already should not be: `core.array` refuses by design, and `core.move` refuses on every element the demo scene contains (Q8, measured). A button whose every press is a typed failure teaches a user that the ribbon lies.
- options: app-list | descriptor-flag
- default-if-silent: app-list
- expires: 2026-10-14
- ANSWER:
- answered: -

## D-20261007-09 Q21: whether a correction to a live BACKLOG instruction is silent

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q21
- asks: When a live instruction in `docs/BACKLOG.md` is found factually wrong, is the correction silent or does it carry an inline note of what it said before? `AGENTS.md §7.3` forbids narration in the file that changed; invariant 10 says nothing is deleted from the record and a correction is a new entry, not an edit. In a planning file the two genuinely conflict.
- options: silent | inline-note
- default-if-silent: silent
- expires: 2026-10-14
- ANSWER:
- answered: -

## D-20261007-10 Q22: what reviews a branch returned by D88 step 2

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q22
- asks: What reviews the branch a D88 defect return leaves behind, when the return is made by step 2? `REVIEW.md` says a defect either step proves goes back to the builder on the existing claim and that step 2 "reviews what the fix left behind" — which describes a return made by step 1. T-024 is the first return made by step 2, so the repaired branch has no reviewing turn defined at all: both of the task's two review turns are spent.
- options: step-2 | step-1
- default-if-silent: step-2
- expires: 2026-10-14
- ANSWER:
- answered: -

## D-20261007-11 Q23: whether `agent.query`'s part-scoped filter forces, declares or stays recipe-only

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q23
- asks: Does `agent.query`'s part-scoped filter FORCE, DECLARE, or stay recipe-only? D66 §3c binds _every aggregate that quantifies over the model_, and T-005 ruled the five it enumerated. `QueryFilter.discipline`/`.materialId` are PART-scoped (D45), so they read built parts and a deferred element is dropped from the result with no signal — measured here: `query({discipline:'structural'})` returns the wall from a full document and 0 rows from a document that built nothing, while the same element is present with `state: 'stale'` in an unfiltered query.
- options: recipe-only | force | declare
- default-if-silent: recipe-only
- expires: 2026-10-14
- ANSWER:
- answered: -
