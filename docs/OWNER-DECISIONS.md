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
- answered: 2026-10-10T18:37Z

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
- answered: 2026-10-10T18:37Z

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
- answered: 2026-10-10T18:37Z

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
- answered: 2026-10-10T18:37Z

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
- answered: 2026-10-10T18:37Z

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
- answered: 2026-10-10T18:37Z

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
- answered: 2026-10-18T03:10Z

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
- answered: 2026-10-18T03:10Z

## D-20261011-01 whether to restore the §8 marker by hand once, so `main` goes green before diwan's fix

- opened: 2026-10-11T01:20Z
- by: brahim-loop
- item: B-20261011-02
- asks: whether a steward may restore the `scripts/state.mjs` BEGIN marker of `docs/CURRENT_STATE.md` §8 by hand, once, so `pnpm state` can regenerate the block
- context: `main` has been red since 401e22d: a diwan merge script rewrote §8, the state section that `pnpm state`
  owns, with its own marker (B-20261010-03). `pnpm state` now refuses to run because its marker is gone, and the
  protocol forbids hand-editing a script-written block, so no seat can claim work (B-20261011-02).
  restore: a steward puts the one marker line back by hand, runs `pnpm state`, and `main` goes green now;
  the next merge through `agent_merge.py` breaks it again until diwan's fix lands.
  wait: nothing changes until diwan's `agent_merge.py` fix lands; box building stays stopped until then.
  The default (wait) keeps the no-hand-edit rule without exception.
- options: restore | wait
- default-if-silent: wait
- expires: 2026-10-18
- ANSWER:
- answered: 2026-10-19T10:34Z

## D-20261011-02 whether to turn on secret scanning, push protection and Dependabot for public Bunyan

- opened: 2026-10-11T22:10Z
- by: brahim-loop
- item: H-20261011-13
- asks: whether to enable Dependabot alerts, Dependabot security updates, secret scanning and push protection on TheBeamstack/Bunyan
- context: Bunyan is public and all four are off (`docs/HANDOVERS.md#H-20261011-13` carries the measurement).
  With them off, a credential pushed here is neither blocked nor reported, and no vulnerable dependency is
  flagged. Each is a repository admin setting under Settings → Code security; no seat changes repository settings.
  enabled: you switch them on, then write `enabled` here; nothing else changes.
  decline: they stay off and this record closes it; the Custodianship lane will keep reporting it.
  If silent, nothing is enabled and the item becomes a blocker naming the owner action.
- options: enabled | decline
- default-if-silent: none
- expires: 2026-10-18
- ANSWER:
- answered: 2026-10-19T10:34Z

## D-20261012-01 PR #69 (T-033) changes the frozen surface and needs an owner merge

- opened: 2026-10-12T02:10Z
- by: brahim-loop
- item: PR#69
- asks: whether to merge PR #69, which narrows `Dimension.anchors` to model anchors and re-baselines `tests/frozen-surface.snapshot.json`
- context: PR #69 implements your D97 ruling (Q10): a dimension may anchor only to the model, so its number
  re-derives on every edit; other annotations keep the free `point` anchor. It changes a frozen-surface
  declaration (`interface Dimension`, plus a new `type ModelAnchor`), so it carries the
  `needs-operator/contract-touching` and `needs-operator/freeze` labels and no seat may merge it alone.
  The builder reports `pnpm verify` green; CI is green on the head. It is `risk: high`, so a dedicated
  `hmdnah` review still runs before any merge.
  merge: a reviewer checks it and merges it with your sign-off. changes: it stays open for a fix. close: it is dropped.
  The default (changes) merges nothing without you.
- options: merge | changes | close
- default-if-silent: changes
- expires: 2026-10-19
- ANSWER:
- answered: 2026-10-20T00:33Z

## D-20261012-02 PR #70 (T-034) changes the frozen surface and needs an owner merge

- opened: 2026-10-12T02:40Z
- by: brahim-loop
- item: PR#70
- asks: whether to merge PR #70, which adds an optional `FamilyPart.exposedFaces` and re-baselines `tests/frozen-surface.snapshot.json`
- context: PR #70 implements your `reserve` answer to D-20261007-06 (Q9): a family part can name its billable
  faces by their role on the part's base shape, never by area or index; absent means the whole solid, `[]`
  means none, and nothing reads it in v1.0.0. It changes a frozen-surface declaration (`interface FamilyPart`,
  plus a new `type FamilyFaceSelector`), so it carries the `needs-operator/contract-touching` and
  `needs-operator/freeze` labels. It and PR #69 both rewrite the snapshot, so whichever merges second is
  rebased and re-baselined first. It is `risk: high`, so a dedicated `hmdnah` review still runs before any merge.
  merge: a reviewer checks it and merges it with your sign-off. changes: it stays open for a fix. close: it is dropped.
  The default (changes) merges nothing without you.
- options: merge | changes | close
- default-if-silent: changes
- expires: 2026-10-19
- ANSWER:
- answered: 2026-10-20T00:33Z

## D-20261012-03 Q8 follow-up: which mechanism moves a D52 wall

- opened: 2026-10-12T01:45Z
- by: zayd
- item: Q8a
- asks: which mechanism lets `core.move`, `core.rotate` and `core.copy` move a D52 wall without wall knowledge in the verbs (`docs/design/P4.5_baseline_move_design.md` §5)
- context: You ruled that walls must move without the general commands knowing what a wall is (D95). Today
  every move, copy and rotate of a wall refuses (8 of 8 on the demo scene, design §1).
  annotation: each parameter declares whether it is a position, and the commands move every declared
  position; a wall marks its two end points. Works for data-authored families too. Mirroring a wall stays
  refused. hook: each object type supplies its own "apply this movement" function, like Revit; it can
  mirror a wall, but a data-authored family cannot supply one. both: reserve the two. fold: keep a separate
  placement and make the wall's other calculations read it; nothing frozen changes, but the end points
  shown to users and agents would no longer be where the wall is.
  annotation, hook and both each add a field to a contract that freezes at P5 step 6, so they must land
  before it. The default (annotation) is the builder's recommendation.
- options: annotation | hook | both | fold
- default-if-silent: annotation
- expires: 2026-10-19
- ANSWER:
- answered: 2026-10-20T00:33Z

## D-20261012-04 Q8 follow-up: whether moving a wall drags the walls joined to it

- opened: 2026-10-12T01:45Z
- by: zayd
- item: Q8b
- asks: whether `core.move` on a wall also moves the ends of the walls joined to it (`docs/design/P4.5_baseline_move_design.md` §7)
- context: When a wall moves, the walls meeting it at a corner can stay put (the corner opens) or stretch
  to follow it, which is what Revit does by default (unverified here).
  detach: the command moves only the wall asked for; the editor's drag gesture can still make neighbours
  follow, as its corner-drag does today, in one undo. follow: the command itself moves the neighbours'
  ends, which means the general command must know how walls join, the thing D95 ruled out.
  The default (detach) is the builder's recommendation; it changes no frozen contract either way.
- options: detach | follow
- default-if-silent: detach
- expires: 2026-10-19
- ANSWER:
- answered: 2026-10-20T00:33Z

## D-20261012-05 Q6 follow-up: whose saved geometry cache a file may restore

- opened: 2026-10-12T02:59Z
- by: zayd
- item: Q6a
- asks: which `.bnn` files may restore solids from their geometry cache (`docs/design/P5_step9_D29_bnn_cache_design.md` §2e)
- context: The cache stores built 3D shapes inside the saved file so it opens about twice as fast. Its check proves
  the shapes match their names, but anyone who writes a file can also write shapes that are not what the design
  would build, with a check that passes. A recipient would then see, and bill quantities from, a building that
  is not the one described.
  own: only files this browser installation wrote restore from the cache; a file someone sends you opens at
  today's speed, built from the design. any: every file's cache is used; fastest, and a sent file can show
  geometry its design does not describe. verify: every file's cache is used for the first view, then everything
  is rebuilt in the background and compared; correct, but the background rebuild competes with editing.
  The default (own) is the builder's recommendation; it changes no frozen contract either way.
- options: own | any | verify
- default-if-silent: own
- expires: 2026-10-19
- ANSWER:
- answered: 2026-10-20T00:33Z

## D-20261012-06 Q6 follow-up: what code change discards a saved geometry cache

- opened: 2026-10-12T02:59Z
- by: zayd
- item: Q6b
- asks: which identity of the app's code a geometry cache is tied to (`docs/design/P5_step9_D29_bnn_cache_design.md` §2d)
- context: A cached shape is only right if the code that built it is the code that would build it now. A fix to
  how a wall is built changes the shape without changing anything in the file.
  bundle: the cache records a fingerprint of the shipped app; every update discards every cache, so the first
  open after an update is today's full rebuild. version: the cache records each object type's version
  number; caches survive updates, but a fix shipped without a version bump keeps showing the old shape.
  The default (bundle) is the builder's recommendation; it changes no frozen contract either way.
- options: bundle | version
- default-if-silent: bundle
- expires: 2026-10-19
- ANSWER:
- answered: 2026-10-20T00:33Z

## D-20261012-07 Q6 follow-up: whether autosave snapshots carry the geometry cache

- opened: 2026-10-12T02:59Z
- by: zayd
- item: Q6c
- asks: whether autosave writes the geometry cache into its snapshots (spec §7; `docs/design/P5_step9_D29_bnn_cache_design.md` §5)
- context: Autosave keeps the last five snapshots of the open document in browser storage for crash recovery.
  At the 16,000-solid target the cache is about 61 MB uncompressed, so five snapshots carrying it are about
  305 MB of browser storage.
  omit: snapshots keep the design only; recovering after a crash rebuilds the model, as today. include:
  snapshots carry the cache, so a recovered session opens about twice as fast, at five times the storage.
  The default (omit) is the builder's recommendation; the spec says include today and is amended either way.
- options: omit | include
- default-if-silent: omit
- expires: 2026-10-19
- ANSWER:
- answered: 2026-10-20T00:33Z

## D-20261020-01 PR #69 (T-033) is merge-ready again and needs an owner merge

- opened: 2026-10-20T01:05Z
- by: brahim-loop
- item: PR#69
- asks: whether to merge PR #69 at head 7b089d0, which narrows `Dimension.anchors` to model anchors and re-baselines `tests/frozen-surface.snapshot.json`
- context: D-20261012-01 asked this and expired on its default `changes`, so the PR stayed open. Since then
  the builder merged `main` into it (it had conflicts, in docs only); `pnpm verify` is green on the new head
  and the frozen-surface snapshot did not need re-baselining. It still implements your D97 ruling (Q10) and
  still changes a frozen declaration, so it carries `needs-operator/contract-touching` and
  `needs-operator/freeze` and no seat may merge it without you. A dedicated `hmdnah` review runs either way.
  merge: a reviewer checks it and merges it with your sign-off. changes: it stays open for a fix. close: it is dropped.
  The default (changes) merges nothing without you.
- options: merge | changes | close
- default-if-silent: changes
- expires: 2026-10-27
- ANSWER:
- answered: -
