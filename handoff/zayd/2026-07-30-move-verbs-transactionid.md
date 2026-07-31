### Entry 72 — 2026-07-30 — Zayd — **THE FIVE MOVE VERBS + `transactionId` ATOMICITY SHIP (P4.5 rows ⓑ/ⓘ, owner-ruled Q4/Q5) — AND BUILDING THEM MEASURED THE RULED SPLIT'S OWN EXAMPLE WRONG: ALL THREE SHIPPED TYPES ARE PARAMS-POSITIONED, AND A HOSTED ELEMENT'S `placement` IS NEVER READ AT ALL. 613 GREEN, ALL FIVE GATES 0.**

**Task (owner, `Zayd_Prompt.md` §2).** Amer's Entry 70 hand-off: the five owner-ruled move verbs
(`core.setPlacement`/`move`/`rotate`/`copy`/`array`) + making one `Ctrl+Z` reverse a multi-element
gesture — `packages/document`, pre-freeze, and **blocking Amer's last two P4.5 exit criteria.** Pulled
first: already at `af8fd48`, newest Entry **71** (my own), matching `FRESH`. Baseline `pnpm verify`
**590/590, real exit code 0, all five gates**; final **613/613** (+23 mine). **Nothing committed:
owner-gated.**

- **⚠⚠ MEASURED BEFORE A LINE WAS WRITTEN (§1b), AND IT CHANGED THE UNIT.** The ruling says *"an element
  whose position lives in its PARAMS moves by `core.setParams`; only an element whose position lives in
  its `placement` moves by these"*, and names **an Opening's offset, a GenericSolid and a placed family**
  as the placement half. Read against the shipped code:
  ```
    core.wall         {start,end}         the D52 baseline              PARAMS
    core.opening      {offsetU,offsetV}   along the host face           PARAMS
    core.curtainwall  {origin}            [x,y] min corner              PARAMS
    ⇒ of the three MVP Types, ZERO are positioned by `placement`.
  ```
  **So the ruling's "the commonest move never calls these verbs" is truer than it states: in the shipped
  MVP, NO shipped Type does.** (The genuinely placement-positioned elements are the GenericSolid-shaped
  ones — the test fixtures, and the placed family that is v1.0.x.) That is not an argument against the
  verbs, which are exactly right for what is coming; it is the reason the unit needed a guard.
- **⚠⚠⚠ FINDING 1 — A HOSTED ELEMENT'S OWN `placement` IS NEVER READ BY THE ENGINE, SO `core.move` ON A
  DOOR WOULD HAVE SUCCEEDED AND MOVED NOTHING.** `build.ts` cuts the void in the HOST's local frame and
  rides the leaf out on **the host's** placement (*"it is the HOST's placement the leaf rides, never the
  opening's"*). **Measured, not reasoned:** the same document, reopened with a 1000 mm placement written
  onto the door, builds the leaf at **byte-identical bounds** — while `core.setParams` with `offsetU +
  1000` moves it exactly 1000 mm. ⇒ the verb would have written a field nothing reads, **returned an
  `UndoableEdit`, journalled a move, and told Planitor's Clean Delta the door moved.** A refusal costs a
  user one message; this costs a wrong building that inspects clean. ⚠ *The ruling's example was the one
  case in it that cannot work — which is exactly what "drive the arg shapes before they freeze" was for.*
- **⚠⚠ FINDING 2 — A PLACED D52 BASELINE WALL IS IN TWO PLACES AT ONCE, AND BOTH WEAR `basis: 'exact'`.**
  Two walls mitred at a corner; wall B given a 5 m placement:
  ```
    the BUILT SOLID           moved by exactly 5000.000000 mm   (the kernel applies the placement)
    baselineOf(B)             byte-identical                    (joins/rooms read the PARAMS)
    builtAxisLength(B)        the SAME number, to the mm        (D72's billed length, clipped by a
                                                                 mitre against a corner B has left)
  ```
  So the model still miters B into A at a corner B's solid is now 5 m from, and bills a length clipped by
  that phantom join. **D72's own failure mode by a new road** (*"the two disagreeing about the same wall
  inside one `basis: 'exact'` block"*).
- **⇒ WHAT SHIPS: THE VERBS, PLUS A REFUSAL DERIVED FROM ENGINE BEHAVIOUR RATHER THAN FROM A TYPE LIST**
  (`packages/document/src/placement.ts`, new). Three rungs, each naming a place the *recipe* already
  decides the position — and each naming the road that does work, because a refusal nobody can act on has
  stopped being a refusal (rule 3):
  ```
    host       build.ts (the host's frame)      the verb is a NO-OP, which is worse than wrong
    baseline   joins.ts / room.ts / D72         joins, room bounding, the billed axis length
    datum      scene.ts's constraint resolver   the grid intersection (XY) / the Level span (Z)
  ```
  ⚠ **The `datum` rung is PER-AXIS, deliberately:** a Level-constrained member may still be slid sideways
  and a grid-constrained one may still be raised. Refusing the whole element was simpler and would have
  blocked ordinary correct gestures. ⚠ **`containerId` is deliberately NOT a rung** — the product's own
  established idiom is *container + an explicit vertical placement* (that is how the 5-storey scale
  fixtures put a column on storey N, and have since P4), so a container is an ADDRESS (D35), not a datum.
  Named in the code so nobody re-derives it.
- **⚠⚠ FINDING 3 — THE FRAME-ORIGIN TEST IS EXACT FOR A TRANSLATION AND WORTHLESS FOR A ROTATION, AND I
  HAD TO BE SHOWN.** The guard measures where the element's own frame origin goes. For a pure translation
  that is *provably* the displacement of every point of the solid — including when the edited translation
  sits BEFORE a rotation, where both move by `R(Δ)`. **But a rotation about the frame origin displaces the
  origin by zero while carrying the SOLID anywhere**: the grid-placed member builds itself centred on the
  grid POINT, 6 m from the origin it would spin about, so it swings clean off its own grid line and the
  frame-origin test says *nothing moved*. Only the Type knows where it builds its solid relative to its own
  origin, so a reorientation of a datum-positioned element is **refused rather than measured** — the honest
  answer, since the number that would justify it does not exist in this layer (`reorients`).
- **⚠ FINDING 4 — THE GUARD BELONGS ON BOTH DOORS.** `core.createElement` has always been able to write
  `placement`, on the same elements, with the same consequence. Guarding only the new verbs would be
  **`checkNameSafe`'s own lesson repeated — *a guard on the safe path is not a guard*.** It is on the
  AUTHORING doors only: `rebuildAll` does not pass through them, so a `.bnn` written before today still
  opens and still builds (D43's discipline; D79's *"the verbs carry the refusal the body will not"*), and
  the test that proves it is the same one that MEASURES Findings 1 and 2 — they can only be constructed
  through the load path now.
- **⚠ `core.rotate`'s `about` DEFAULTS TO THE ELEMENT'S OWN FRAME ORIGIN, AND THAT DEFAULT IS THE COMMAND.**
  The protocol's `RigidMotion` defaults its origin to the WORLD origin, so the obvious implementation makes
  an element placed 5 m out **orbit across the site** — a perfectly valid solid in a perfectly wrong place.
  Measured on both sides: with the default it spins in place (centre stays `[5000, 0]`, section turns
  400 × 1000 → 1000 × 400); with an explicit `about: [0,0,0]` it orbits to `[0, 5000]`, so the default is a
  default and not a hardcode.
- **⚠ CONSECUTIVE TRANSLATIONS MERGE** (`translate(a)` then `translate(b)` IS `translate(a+b)`, exactly).
  Without it a gizmo committing per frame leaves a hundred motions in `scene.json`, saved into every `.bnn`
  forever and re-applied on every rebuild. It is what makes `core.move` safe to dispatch as often as a
  pointing device produces one.
- **⚠ `core.copy` IS EXACT OR IT REFUSES.** It carries params, style, container, classification, the
  reserved metadata **and the source's datum constraints** (a copy of a Level-spanning member that did not
  span the Level would be a different kind of thing wearing the same recipe). A source that anything else
  points at — **a hosted opening**, a sketch constraint, a join override — is REFUSED and named. ⚠ The
  hosted case is a D1 question, not laziness: an opening's `hostRef` is a `SubShapeRef` **token containing
  the host's element id**, so copying the door means rewriting an identity token, and *a command never
  silently re-identifies* (D51). **Surfaced as an owner ruling, below.**
- **⚠ `core.array` IS REGISTERED AND REFUSES.** Owner-ruled *"SHAPE ONLY — body is v1.0.x"*. It is in the
  registry rather than merely written down because **`argsSchema` freezes at step 6**: a verb absent at the
  freeze has no reserved arg shape, and adding one later is an amendment across three products plus the
  generated agent tool-list (the ⓣ trap, row Ⓕ's precedent). Its args are still VALIDATED before the
  refusal — *"your call was well-formed and the verb is not built"* and *"your arguments were wrong"* are
  two different facts, and only one is worth waiting for v1.0.x over.
- **⚠⚠ `transactionId` NOW HAS A READER — ONE `Ctrl+Z` REVERSES THE GESTURE (row ⓘ, Q5).** Measured before:
  three `core.setParams` for a three-wall corner-drag produced **three edits and three undos**, which is
  why Amer declined to ship a gesture that only looked transactional. Built: `ExecuteOptions.transactionId`
  (the executor stamps it — a command stays passive and knows nothing of transactional state, exactly like
  `dryRun`), `UndoStack.takeUndoGroup`/`takeRedoGroup`, and **ONE stage + ONE commit for the whole unit**,
  so D42's all-or-nothing covers the transaction and not merely each edit in it (undoing three of four
  walls and refusing on the fourth would leave a room nobody drew). ⚠ **The grouping is CONSECUTIVE, not
  "every edit with this id"**: an undo restores state DELTAS, and a delta is only valid against the state
  that produced it, so reversing across a foreign edit would corrupt the scene rather than refuse. ⚠ The
  journal gets **one reversal per edit** (each naming what it `reverses`, all wearing the transaction id) —
  the model records events, never a summary entry no original corresponds to.
- **⚠ AND THE AGENT GETS TRANSACTIONS TOO, BECAUSE OF D19 AND NOT BECAUSE ANYONE ASKED.** Grouping is a
  real capability, and *"every capability reachable only through the UI is a capability an agent can never
  have"* is the command layer's whole reason to exist. `AgentSurface.execute` takes an optional
  `{transactionId}` and passes it straight through (no second implementation of anything); `agentApi` does
  not move — it is additive, and D22 versions that surface on its own clock.
- **⚠ ONE THING THE REVERT SWEEP TAUGHT ABOUT MY OWN CODE:** `takeUndoGroup`'s early return for an
  ungrouped edit is **load-bearing, not a fast path**. An exhausted stack reports `undefined` for the edit
  beneath it, so a loop entered with `transaction === undefined` matches forever and pushes `undefined`
  until the process dies — **it OOM'd a vitest worker in 14 s** when a mutation produced exactly that. An
  ungrouped edit is a unit of one BEFORE the loop, never by the loop's own test. Commented in place.
- **WHAT WAS BUILT.** `packages/document/src/placement.ts` (**new**, ~300 lines): the rigid-motion algebra
  (translation merge, rotation, `applyMotions` on a point, `frameOriginOf`), the motion validator, and
  **the positioning rule + its ONE refusal wording, shared by all four verbs** (rule 10's discipline — a
  refusal three products will meet should not be four differently-worded guesses at one cause). ·
  `commands.ts` (+~330): the five registry entries + the `createElement` guard. · `undo.ts`: the group
  take/redo + `reversalOf` inheriting the transaction. · `document.ts`: `ExecuteOptions.transactionId`, the
  stamp, and group-atomic `undo`/`redo`. · `agent.ts`: the D19 passthrough. ⚠ **No kernel change, no WASM
  rebuild** — this unit is pure `packages/document`.
- **⚠ ENTRY 64's RULE-7 ENFORCEMENT TEST CAUGHT MY OWN NEW SCHEMA, ON ITS FIRST OUTING.** `core.array`'s
  `count`/`count2` shipped without a `unit` and `tests/units-rule7.test.ts` went red — *"a clean rule with
  no enforcement is a dirty rule that has not happened yet"*, working as designed on the first numeric
  fields added since it was written. They are genuine counts (its `step`/`step2` ARE mm and say so), so
  they join the enumerated allow-list with the reason written beside them.
- **REVERT-VERIFIED FIFTEEN WAYS, each firing exactly what it should and nothing else:**
  ```
    core.rotate's `about` default -> the world origin   "spins in place" fails (the element orbits)
    the consecutive-translate merge removed             the merge test fails
    the HOST rung removed                               the 4-verb hosted refusal fails
    the BASELINE rung removed                           2 fail (the verb AND the createElement door)
    the DATUM rung removed                              3 fail (grid, level, rotate)
    the PER-AXIS test -> refuse the whole element       the "allows one straight up" half fails
    `reorients` -> always false                         the datum-rotation refusal fails
    the createElement guard removed                     the both-doors test fails
    `motionIssues` -> accept anything                   the malformed-motion test fails
    takeUndoGroup -> pop ONE edit (the pre-Q5 code)     4 fail, incl. the corner-drag
    the transactionId stamp removed                     3 fail
    the reversal's inherited transaction id removed     the journal test fails
    core.copy's refusal removed                         the hosted-source test fails
    core.copy's datum constraints removed               the copy test's span assertion fails
    the agent's transactionId passthrough removed       the D19 test fails
  ```
  ⚠ **Stated honestly rather than padded: the group ROLLBACK on a refused undo has no end-to-end test** —
  an undo whose rebuild refuses needs a state that was valid when built and invalid when reverted, which I
  could not construct without inventing a Type that exists to fail. The *mechanism* is tested where it
  lives (`UndoStack`: take a group, then one `takeRedo` per edit, and the stack comes back byte-identical),
  and the gap is recorded rather than counted as coverage.
- **VERIFICATION: all five gates, real exit codes — typecheck 0 · lint 0 · format:check 0 · test 0 (613
  passed, was 590, +23 mine) · reseed:check 0.** ⚠ `prettier --write` on every touched file BEFORE
  `verify`, per Entry 67 — **and `verify` still exited 1 twice anyway**: first on 19 lint errors, then on
  the rule-7 test above. *A local gate whose exit code you do not read is not a gate* — fourth entry
  running, and the second failure was a real finding rather than a formality.
- **Box:** read/measure/build only; `pnpm verify` ×4 with the real exit code captured every time +
  targeted vitest ×~10 + a 15-way revert sweep (each patch applied, run, restored); no kernel rebuild, no
  containers touched, no ports bound, nothing installed; `/tmp` 6.8 MB, RAM ~2.5 GB available throughout;
  both live public sites up (`portfolio-caddy-1`, `beamstack-contact` untouched, as were Planitor's and
  Chantier's containers).

**NEXT:**

- **Owner:** **the FREEZE (step 6) is still yours and still unblocked** — this entry moved **no frozen
  byte, no `SCENE_SCHEMA_VERSION`, no field.** It adds five `Command` registry entries and gives a
  RESERVED field (`UndoableEdit.transactionId`) its first reader, which is what Q5 ruled. ⚠⚠ **TWO NEW
  QUESTIONS, both cheap only until the freeze:** **(1) does `core.copy` deep-copy a host's openings?**
  Today it REFUSES a source anything points at, because copying a door means rewriting a `hostRef` token
  that contains the host's element id — a re-identification, which is a D1/D51 ruling and not a body
  decision. My recommendation: **leave it refusing for v1.0.0** and add a ruled `retargetMap`-shaped answer
  in v1.0.x. **(2) is the BASELINE refusal the right strictness?** A user who genuinely wants to slide a
  D52 wall must `core.setParams` both endpoints; the alternative is for `core.move` to translate the
  baseline params itself — which is Type knowledge in the command layer, and the ruled split says no.
  Recommendation: **keep the refusal; revisit if the move tool finds it hostile in the hand.** ⚠ Q1–Q3
  (Entry 69) still block the plan/section unit; Q6 (the D29 document half), rule 8, rule 17 and the parked
  `undo`/`redo`-as-Commands are unchanged.
- **Amer:** ⚠⚠ **YOU ARE UNBLOCKED — both remaining P4.5 exit criteria are now buildable.** Criterion 4
  (the move tool + gizmo) has its verbs, and the corner-drag has its atomicity: dispatch each
  `core.setParams` of the gesture with `doc.execute(id, args, { transactionId })` and one `Ctrl+Z` reverses
  the unit. ⚠⚠ **READ THE SPLIT BEFORE BUILDING THE GIZMO, because it is the opposite of the intuition and
  it is now ENFORCED, not merely documented:** dragging a wall is `core.setParams` on both endpoints,
  dragging a door is `core.setParams` on `offsetU` — and `core.move` **REFUSES** both, with a message
  naming the road that works. `core.move`/`setPlacement`/`rotate` are for GenericSolid-shaped elements.
  ⚠ `core.array` refuses by design (reserved shape, v1.0.x body) — do not put it in the ribbon.
- **Zayd:** the plan/section unit is still blocked on Q1–Q3. Ruling-free work, in order: the
  **`shapeSignature` MEMORY VIEW** (170 embind crossings per cached import — `tessellate`'s own fix on the
  same documented trap; no contract, pure win) · the `schedule.ts` **"rule 17" comment rename** (Entry 70's
  hand-off — it collides with `core_logic.md` §8's numbered rule 17, and this project's method is grep) ·
  the **housekeeping that blocks going public** (`LICENSE` AGPL-3.0, the CLA, the OCCT + planegcs
  attribution notices — ⚠ **its own commit**, Entries 64+65's lesson). ⚠ **Do NOT start the D29 document
  half unasked** (Entry 71's Q6).
