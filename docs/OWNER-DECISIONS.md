# Owner decisions

The register named by `.agent.toml [paths] decisions`, and the only file in this repo the owner
edits. Its grammar — the fields, their order, and the four states — is `diwan/AGENTS.md §3.2`.

This is **not** `docs/decisions.md`, which is the ratified-ruling register (`D1`–`D88`): a record
of rulings already made, in its own grammar, never read by the turn protocol. The name is not
`docs/DECISIONS.md` because the pc runs Windows, where that and `docs/decisions.md` are one file.

D-20261007-02…08 and -11 are `open_rulings.md`'s open rows, moved 2026-10-07; each row's
recommendation (the default) and cost-if-deferred: `git show 5a4b9aa:open_rulings.md`. Not moved:
Q4 (answered in `docs/design/P5_step6C_plan_section_design.md:362`), Q21 and Q22 (retired protocol).

## D-20261006-01 T-028 and T-030 fix scripts no entrypoint runs

- opened: 2026-10-06T01:20Z
- by: brahim-loop
- item: T-028
- asks: whether to retire T-028 and T-030, which fix `scripts/agent-finish.mjs` and `scripts/agent-start.mjs` while the live start/finish are diwan's `agent_start.py`/`agent_finish.py` (PR #54 step-1 finding F1; outside tests those two files are named only in a `ci.yml` comment)
- options: retire | keep
- default-if-silent: retire
- expires: 2026-10-13
- ANSWER: retire
- answered: 2026-10-08T14:16Z

## D-20261006-02 T-029 fixes seats.mjs functions only the dead agent-\*.mjs call

- opened: 2026-10-06T02:00Z
- by: brahim-loop
- item: T-029
- asks: whether to retire T-029, whose `reviewerFor`/`builderFor` are imported only by `scripts/agent-start.mjs` and `agent-finish.mjs` (see D-20261006-01); the live scripts `reserved-classes.mjs` and `pr-ready.mjs` import only `ghSpawn` and `titleRoutes`
- options: retire | keep
- default-if-silent: retire
- expires: 2026-10-13
- ANSWER: retire
- answered: 2026-10-08T14:16Z

## D-20261007-02 Q5: who chooses the section-curve discretisation tolerance

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q5
- asks: The discretisation tolerance for section curves — mine to choose and document?
- context: When the editor draws a cut through the building (a section), a curved edge is drawn as many short
  straight pieces. The tolerance is how far those pieces may stray from the true curve. It only changes
  how the drawing looks; no quantity is ever computed from it, and the exact edge's identity travels beside it.
  builder: the builder picks one fixed value, writes it in the section design doc and checks it in a test.
  owner: you choose the value. The default (builder) is the builder's recommendation; waiting costs little.
- options: builder | owner
- default-if-silent: builder
- expires: 2026-10-15
- ANSWER: builder
- free-text: the builder choses it but he must be aware that bunyan is meant to comprete with revit
- answered: -

## D-20261007-03 Q6: whether to wire the D29 `.bnn` half for v1.0.0

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q6
- asks: Is the D29 `.bnn` half worth wiring at the measured 2.07×? A scheduling call, not a contract one.
- context: A `.bnn` file is a saved Bunyan document. D29 is a cache of the built 3D shapes; its operations are
  built, but storing it inside the `.bnn` file is not. Measured payoff: 2.07x. Its price: every save costs
  6.64 ms per solid and about 61 MB at the 16,000-solid target, and a cold open of that model stays about
  3 minutes either way.
  no: not wired for v1.0.0; the effort goes to other speed work (instancing, lazy build, multithreading).
  yes: the builder wires it into the file now. It can be added later without breaking saved files, so the
  default (no, the builder's recommendation) closes nothing off.
- options: no | yes
- default-if-silent: no
- expires: 2026-10-15
- ANSWER: yes
- answered: -

## D-20261007-04 Q7: whether `core.copy` deep-copies a host's openings

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q7
- asks: Does `core.copy` deep-copy a host's openings?
- context: `core.copy` is the command that duplicates an element. Today it refuses to copy a wall that has a door
  or window in it: each opening names its wall by a token containing the wall's id, so copying the
  openings means giving them new identities, which is a ruling (D51) and not a coding detail.
  refuse: copy keeps refusing such walls in v1.0.0. deep-copy: copy also duplicates the openings and
  re-points them at the new wall.
  Why now: this command's arguments freeze at P5 step 6. The default (refuse) is the builder's recommendation.
- options: refuse | deep-copy
- default-if-silent: refuse
- expires: 2026-10-15
- ANSWER: deep-copy
- answered: -

## D-20261007-05 Q8: whether the BASELINE refusal is the right strictness

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q8
- asks: Is the BASELINE refusal the right strictness? A user sliding a D52 wall must `core.setParams` both endpoints.
- context: A wall is defined by its two end points (D52). The move command refuses to move a wall, because it would
  shift the drawn wall but not those end points, so corners and the billed length would go wrong. To slide
  a wall today, a user edits both end points (`core.setParams`). Measured: move refuses on every element in
  the demo scene, which is why its ribbon button only ever fails (D-20261007-08).
  keep: move keeps refusing walls. translate: move learns to shift a wall's end points itself, which puts
  wall-specific knowledge into the general command layer.
  Cheap to change either way. The default (keep) is the builder's recommendation, to revisit if the move
  tool proves awkward in use.
- options: keep | translate
- default-if-silent: keep
- expires: 2026-10-15
- ANSWER: translate
- free-text: a propre solution myst be found not limited to just either drop moving wals or make a general comand have wal specific knowledge in order to builde a bunyan that can rival Revit,Arhcicad and Rhino
- answered: -

## D-20261007-06 Q9: whether `FamilyDefinition` gets a way to declare billable faces

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q9
- asks: rule 8 — does `FamilyDefinition` get a way to declare billable faces? Without one, every D61 data-authored family reports the whole-solid area, which D72 measured 1.07×–3.03× wrong.
- context: A family is a reusable kind of object, such as a door type. D61 lets families be written as data instead
  of code. Quantities used for costing need to know which faces of an object count; a data family has no
  way to say so, so it reports the whole solid's area, measured 1.07x to 3.03x wrong (D72).
  reserve: add to the family format a way for data to name the faces that count. no: leave the format as
  it is; data families keep reporting the whole-solid area and could never bill correctly.
  Why now: the family format freezes at P5 step 6; after that this is an amendment across three products.
  The default (reserve) is the builder's recommendation.
- options: reserve | no
- default-if-silent: reserve
- expires: 2026-10-15
- ANSWER: reserve
- answered: -

## D-20261007-07 Q10: whether `Dimension.anchors` excludes the free `point` anchor

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q10
- asks: rule 17 — should `Dimension.anchors` exclude the free `point` anchor? Two paper anchors give a number no model edit will ever update — this rule's own _"drifts and lies"_, on the one annotation a builder reads AS a measurement.
- context: A dimension is the length label drawn on a plan. Each of its two ends is anchored either to part of the
  model or to a free point on the paper. With two free points the number never updates when the model
  changes, so it can show a wrong length while looking like a measurement.
  narrow: a dimension may only be anchored to the model. keep: free points stay allowed.
  Why now: a one-line change while the shape is a release candidate; after the P5 freeze it is an amendment
  across three products. The default (narrow) is the builder's recommendation.
- options: narrow | keep
- default-if-silent: narrow
- expires: 2026-10-15
- ANSWER: narrow
- answered: -

## D-20261007-08 Q20: which verbs get a button in the generated ribbon

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q20
- asks: Which verbs deserve a button in the GENERATED ribbon, given that some commands refuse by design? The ribbon is generated from `describeCommands` (D47: _"the ribbon rendered a FORM over `argsSchema` where it should have activated a TOOL"_), so every registered command becomes a control. Two already should not be: `core.array` refuses by design, and `core.move` refuses on every element the demo scene contains (Q8, measured). A button whose every press is a typed failure teaches a user that the ribbon lies.
- context: The ribbon is the row of buttons in the editor. It is generated from the list of commands, so every
  command gets a button. Two should not: `core.array` always refuses (its body comes in v1.0.x), and
  `core.move` refuses on every element of the demo scene (D-20261007-05). Today the app hides
  `core.array` with its own short list (`RIBBON_WITHHELD` in `apps/web/src/App.tsx`).
  app-list: keep that list in the app; cheap and reversible, but it can drift from the commands.
  descriptor-flag: each command declares whether it gets a button; this adds a field to a surface that
  freezes at P5 and that three products read.
  The default (app-list) is the builder's recommendation, to revisit if a third command needs hiding.
- options: app-list | descriptor-flag
- default-if-silent: app-list
- expires: 2026-10-15
- ANSWER:
- answered: -

## D-20261007-11 Q23: whether `agent.query`'s part-scoped filter forces, declares or stays recipe-only

- opened: 2026-10-07T19:25Z
- by: brahim
- item: Q23
- asks: Does `agent.query`'s part-scoped filter FORCE, DECLARE, or stay recipe-only? D66 §3c binds _every aggregate that quantifies over the model_, and T-005 ruled the five it enumerated. `QueryFilter.discipline`/`.materialId` are PART-scoped (D45), so they read built parts and a deferred element is dropped from the result with no signal — measured here: `query({discipline:'structural'})` returns the wall from a full document and 0 rows from a document that built nothing, while the same element is present with `state: 'stale'` in an unfiltered query.
- context: `agent.query` is how an AI agent asks the model questions such as "which elements are structural?".
  To stay fast, the model builds 3D shapes only when needed (D66). The discipline and material filters
  read built shapes, so an element not yet built is left out without any signal. Measured: the same query
  returns the wall from a fully built document and 0 rows from one that built nothing.
  recipe-only: queries never build; the filters are documented as depending on what is built, and narrowed
  to what they can answer. force: the query builds what it needs first, making a cheap call expensive.
  declare: the answer gains a field saying what it could not see.
  Why now: the agent surface freezes at P5; after that a new field is an amendment across three products.
  The default (recipe-only) is the reviewer's recommendation.
- options: recipe-only | force | declare
- default-if-silent: recipe-only
- expires: 2026-10-15
- ANSWER:
- answered: -
