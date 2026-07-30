# `amer_entry_70.md` — Entry 70, held OUT of `current_state.md` on purpose

**⚠⚠ WHY THIS FILE EXISTS, AND WHAT TO DO WITH IT.** The owner ran Amer and Zayd **in parallel** on
2026-07-30, rather than the usual take-turns arrangement that `current_state.md`'s append-only §7 assumes.
Two agents appending an Entry to the same file in the same window is a guaranteed conflict in the one file
whose job is to be the shared truth. **So this entry is parked here instead. When Zayd's next push has
landed, the owner will ask for it to be moved into `current_state.md` §7 verbatim, after his** — at which
point this file is deleted and the entry number is confirmed.

⚠ **The entry is numbered 70 because Zayd took 69** (the plan/section design, pushed 2026-07-30). If his
next push lands before this is merged, **renumber to whatever follows** — the number is bookkeeping, the
content is not.

⚠ **`Zayd_Prompt.md` §2 was deliberately NOT rewritten**, for the same reason: it is his live briefing and
he is working from it right now. The text the Loop would have had me write into it is at the bottom of this
file, under "PROPOSED `Zayd_Prompt.md` §2". `Amer_Prompt.md` §2 **was** rewritten — it is mine, so there is
no conflict.

---

### Entry 70 — 2026-07-30 — Amer — **P4.5's SIX RULINGS TAKEN, AND THE TOOL LAYER SHIPS: THE SNAP SEAM + THE TOOL STATE MACHINE + NUMERIC ENTRY + HOVER + MULTI-SELECT. A WALL IS NOW DRAWN WITH A POINTING DEVICE, AND ITS LENGTH IS EXACT. DOMAIN RULE 19 ADOPTED. 578 GREEN, ALL FIVE GATES 0.**

**⚠ COMMITTED AND PUSHED (owner-authorised, 2026-07-30): `origin/main` `45109d5 → 57765b0`** — Entry 70
alone, one commit, fast-forwarded from the branch `amer/p4.5-interaction-model` (`origin/main` had not
moved, so no merge commit and nothing of Zayd's was rebased or replayed).
⚠⚠ **ZAYD IS ONE ENTRY BEHIND AND THE ENTRY IS NOT WHERE HE WILL LOOK FOR IT.** `current_state.md`'s newest
Entry is still **69** — Entry 70 is in **this file**, because the owner ran both agents in parallel (see the
header). That is expected, not a sync failure. The code is `apps/web` only, plus three appended lines in
`core_logic.md` §8 (domain rule 19); nothing he owns moved.

**Task (owner, `Amer_Prompt.md` §2):** P4.5, the RULED branch. Pulled first: `b53a8bf → d596142`, then
mid-session `d596142 → 45109d5` at the owner's instruction (_"pull Zayd's edits to merge now while you are
still at the beginning"_) — newest Entry **69**, so I read 68 and 69 before continuing and re-checked that
TASK still stood. It did.

- **⚠⚠ THE SIX RULINGS WERE TAKEN FIRST, AND ONE OF THEM CORRECTED ME MID-ANSWER.** Q1–Q6 (design §12) were
  put to the owner with each ruling point explained before the question, per his instruction. All six ruled:
  **Q1** adopt the tool rule · **Q2** the two-tier snap seam as designed · **Q3** the proposed snap priority ·
  **Q4** reserve all five move verbs including the `setParams`-vs-`move` split · **Q5** exercise
  `transactionId` via the corner-drag · **Q6** spine **plus hover and multi-select** in the exit criteria.
  ⚠ **Q1's PREMISE WAS WRONG AND IT WAS MY ERROR.** I told the owner the "rule 17" collision was with a
  `schedule.ts` _code-comment_ convention and that the domain list ran to sixteen. **`core_logic.md` §8
  already has a numbered rule 17 (a drawing is a projection, D58) and a rule 18 (child elements, D59)** —
  §1c-8's ledger says _"ALL EIGHTEEN RULES SWEPT"_ in as many words. Adopting the tool rule as 17 would have
  shadowed a live three-product rule with a UI one. Surfaced immediately, **numbered 19** (the owner's own
  second option), recorded in the design doc as a correction rather than silently fixed. _The claim was
  written from memory of the rule list instead of from the list; the check cost one grep._
- **⚠⚠ AND THE RULINGS REVEALED WHAT THE QUESTIONS COULD NOT: TWO OF THE SIX LAND IN A PACKAGE I DO NOT OWN.**
  Q4 (the five move verbs) and Q5 (`transactionId` atomicity) both read as _"rule a shape, then build it"_ —
  and both are `packages/document`. A new verb is a **contract change** the standing constraint tells me to
  escalate rather than perform; this ruling **is** that escalation resolved, so the shapes are now owner-ruled
  and recorded, and **the implementation is owed to Zayd as one additive unit.** ⚠ Measured, not assumed:
  `transactionId` is declared at `undo.ts:109` and mentioned in exactly one comment (`document.ts:802`,
  _"RESERVED, not built"_) — **zero readers**, so a corner-drag dispatching three `setParams` today would
  produce three edits and three undos however the tool labelled it. **I did not ship a gesture that LOOKS
  transactional and undoes in three steps**, which would be worse than not shipping it: it would read as the
  reserved field working. ⇒ **rows ⓑ and ⓘ stay OPEN.** Entry 45's freeze-SAFE judgement stands and I do not
  claim either blocks the freeze.
- **⚠⚠ THE §1b FINDING OF THE SESSION, AND IT IS THE REASON THE PHASE WAS BUILDABLE AT ALL: THE APP HAD NEVER
  REGISTERED THE WALL THIS DESIGN REASONS ABOUT.** `bootstrap.ts` registered `SCAFFOLD_TYPES` —
  `core.wall.v1`, a `{length, height}` box-layer wall whose own header has said _"when P5's types arrive,
  delete this file and register those instead"_ since P4. **P5's types arrived in Entry 42** (the real D52
  baseline `core.wall`) and nobody switched; `apps/web/package.json` did not even depend on `@bunyan/types`.
  ⚠ **Not cosmetic:** "click a start point, click an end point" is expressible **only** against a baseline
  `{start, end}` wall — `core.wall.v1` has no baseline, so the wall tool could not have been written against
  what the app runs. Every §9/§10 sentence about _"a D52 baseline wall moves by `setParams`"_ was true of the
  package and **false of the running app**. Fixed (app-layer, no contract): `@bunyan/types` is a workspace
  dep, `wallType`/`openingType`/the four curtain-wall types are registered, and the demo seeds **two real
  `core.wall`s meeting at a corner** (so the snap index has a real endpoint and 0c has a join to resolve).
  ⚠ The scaffold Type stays registered and is **relabelled "Wall (legacy v1 scaffold)"** — dropping it would
  make every pre-Entry-70 saved document `unbuildable` (D43: correct behaviour, pointless demotion). _§1c-7:
  a phase's exit criteria are a specification, and this one silently depended on a swap nobody had made._
- **WHAT LANDED (all `apps/web`, below every frozen contract):**
  - `tool/QueryGateway.ts` — **the spatial-query seam the plan said was missing** (Tier 2). Read-only,
    derived in `bootstrap.ts` (the one allowed `KernelClient` holder), exposing `faceFrame`/`classifyPoint`/
    `distance`/`bounds` and nothing else. ⚠ The four ops are named as **explicit overloads** rather than a
    generic `request<R>(op: string, …)`: a string op would not typecheck against `KernelClient`'s op map
    **and** would make the seam a hole any op could pass through. **The overload list IS the allowlist** —
    `makeBox` does not typecheck here. That is D19 made structural, not commented.
  - `tool/snap.ts` — **Tier 1, pure, no three.js.** Candidate extraction from the `MeshBuffers` the viewport
    ALREADY retains (edge endpoints + midpoints, carrying each edge's `SubShapeRef`), exact grid candidates,
    a uniform spatial hash, and `chooseSnap` under the ruled priority. The world→pixel projection is
    **injected**, which is what keeps the whole module headless-verifiable — only the camera lives in GL.
  - `tool/toolMachine.ts` + `tool/tools.ts` — the state machine and the registry. A `ToolSession` is an
    immutable value with **no reference to the document, the dispatch or the kernel**, and a commit is an
    inert `{commandId, args}` DESCRIPTION. **Rule 19 is enforced by shape, not by discipline:** a half-drawn
    wall cannot be written to the scene even by a caller who wants to.
  - `tool/numeric.ts` — parse/`pointAtLength`/`applyNumericKey`. `tool/useToolController.ts` — the single
    active-tool slot, the keyboard, numeric entry.
  - `render/Viewport.ts` — the **preview layer** (rubber band + snap marker) as a group OUTSIDE `#sceneGroup`,
    so it is structurally excluded from picking and from the snap index (**a preview can never be snapped to
    by the cursor drawing it**); `project`, `snapAt`, `groundPointAt`; and the index dropped on any change to
    the drawn set. ⚠ A **recolour does not invalidate** it — an instance-colour swap cannot move a vertex.
  - `render/ViewportCanvas.tsx` — the **pointer-move path**, which is the plumbing hover, snapping and the
    rubber band all ride on; before this the canvas heard only `pointerdown`/`pointerup`, which is why hover
    could not exist however cheap the recolour was.
  - `App.tsx` — the selection **SET** (Ctrl/Cmd/Shift-click), hover, the ToolBar, the tool status line, and
    the tool getting **first refusal** on clicks and keys ahead of the app's own keyboard owner.
- **⚠⚠ ONE REAL BUG, FOUND BY DRIVING THE TOOL IN A REAL BROWSER AND NOT BY READING THE CODE — AND IT IS THE
  ENTRY'S BEST LESSON.** Typing `5`,`0`,`0`,`0` into the numeric field produced **`0`**. The accumulation
  lived in a `useCallback` that closed over `numericText`; **React batches**, so all four keystrokes read the
  same stale value and each overwrote the last. A wall would have been committed at 0 mm had `parseLengthMm`
  not refused it. ⚠ **Slow human typing hides it completely** — a render lands between keys — so it is
  invisible to exactly the manual test one would perform, and visible to a key-repeat or a fast typist.
  **FIXED TWICE, DELIBERATELY:** (a) every handler now reads a **ref**, never the closed-over render value,
  with the writes going through `putSession`/`putNumeric` so ref and state move together; and (b) the field's
  key handling was **extracted into a pure reducer** `applyNumericKey(current, key, {allowed})`, so the state
  is an explicit argument and the accumulation is a **sequence the suite can thread values through**. ⚠ The
  extraction is the part that matters: _the bug was not in the arithmetic, it was in who owned the state, so
  a test that guards it must be one that feeds the state in._
- **HEADLESS-VERIFIED (the logic half of the standing split): 40 new tests (538 → 578)**, hostile to the two things that
  can be wrong while looking right — **the index** (a candidate 0.2 mm away across a bucket boundary; a sweep
  that must cover every bucket the search sphere touches, not a fixed 3×3 — **D73's lesson, that an index buys
  speed by changing WHO IS ASKED**) and **the ruled priority** (a FARTHER endpoint must beat a NEARER grid
  point; the full order asserted pairwise in both argument orders). **REVERT-VERIFIED both:** neutering the
  bucket sweep to the centre cell fired exactly the 2 index tests and nothing else; replacing the priority
  comparison with nearest-wins fired exactly the 2 ordering tests and nothing else.
- **BROWSER-VERIFIED (the GL half), on the real Vite dev server + real OCCT + real GPU, and MEASURED THROUGH
  THE DOM/`window` PATH RATHER THAN CLAIMED FROM A PICTURE** — ⚠ the standing rule was right and I hit it:
  `computer{screenshot}` **timed out after 30 s** on the continuously-animating WebGL canvas, exactly as
  `Amer_Prompt.md` §1 warns.
  ```
    a wall DRAWN with a pointing device       activate -> click -> click -> ONE core.createElement
    the document DURING the gesture           elements 3 -> 3, journal 7 -> 7   (rule 19: no model state)
    an ABANDONED gesture (Esc)                elements + journal byte-identical before and after
    both clicks landed on grid intersections  start [3000,-1000]  end [-3000,1000]   (exact, not measured)
    numeric entry: type 5000 + Enter          |end - start| = 5000.000000 mm exactly
    numeric entry on a cold boot: 3500        |end - start| = 3500.000000 mm exactly
    hover                                     27 of 120 probe positions resolved, Wall 1 vs Wall 2 correctly
    multi-select                              1 -> 2 (Ctrl) -> 1 (Ctrl again), document untouched
    console errors, COLD tab, full gesture    ZERO
  ```
  ⚠ **The exactness result is the one worth reading twice:** the tool's clicks committed **round grid
  coordinates**, because a grid candidate is computed from `scene.json` numbers rather than measured off a
  chord-approximated mesh — which is precisely §4.4's _"the approximate point chooses the target, never
  records the coordinate"_ working on its first day.
- **⚠ THE P4 EQUIVALENCE TEST, RUN AGAINST A TOOL-AUTHORED EDIT (§11 criterion 2 — the machine proof that the
  tool layer smuggled in no private path):** the same args re-issued through `window.bunyan.execute` gave the
  **same `command`, the same change count, the same collections and byte-identical `params`.** The one
  difference is `rebuilt` 2 vs 3 — and I checked rather than hand-waved it: the agent's wall is **coincident**
  with the tool's, so it re-stages one more element, and `agentEdit.rebuilt` **contains the tool's wall id**.
  _Same authoring path, different scene state._
- **⚠ A CONSOLE-ERROR SCARE THAT WAS NOT ONE, CHECKED RATHER THAN ASSUMED:** the dev tab showed React
  hook-order errors (`43. useMemo → useRef`). Those are **HMR artifacts** from adding hooks to a mounted
  component; every stack trace carried a pre-reload `?t=` HMR timestamp. A **fresh tab** boots and runs the
  full gesture with **zero** console output. Recorded because _"there were errors in the console but I decided
  they were fine"_ is exactly the shape of a missed defect.
- **VERIFICATION: all five gates, real exit codes — typecheck 0 · lint 0 · format:check 0 · test 0 (578
  passed, was 538, +40 mine) · reseed:check 0.** ⚠ `prettier --write` on every touched file **BEFORE**
  `verify`, per Entry 67's procedural fix; `format:check` stays green. ⚠ `pnpm` is not on this box's PATH —
  `corepack pnpm install` for the new workspace dep, `npm run <step>` for the gates (each sub-script is plain
  tsc/eslint/prettier/vitest/node, so they run identically).
- **Environment:** local PC, real browser. Vite dev server started + stopped; `corepack pnpm install` once
  (the `@bunyan/types` workspace dep); no kernel rebuild (every change is TS/CSS/MD); no other project
  touched; no ports left bound.

**NEXT:**

- **Owner:** **the FREEZE (step 6) is still yours and still unblocked** — Entry 70 moved no frozen byte and
  bumped no `SCENE_SCHEMA_VERSION`. ⚠⚠ **The one thing this entry hands you is that Q4 and Q5 are RULED but
  NOT BUILT, and they are `packages/document` work** — five additive verbs (`core.setPlacement`/`move`/
  `rotate`/`copy`/`array`) and `transactionId` atomicity in the undo stack. **The pointing device that would
  validate them now exists and is waiting**, which is the opposite of the risk row ⓑ was written to catch —
  but they are worth nothing after the freeze, so they want doing before it. ⚠ Your older owed rulings still
  stand: rule 8 (`FamilyDefinition` billable faces) · rule 17 (`Dimension.anchors` free `point`) · undo/redo
  as Commands · and Zayd's Entry-68/69 question on widening `ParamField.refTo` to
  `view`/`sheet`/`annotation`/`family`.
- **Amer:** the spine is in. Remaining P4.5, in order: **the move tool + gizmo** (blocked on Q4's verbs) and
  **the corner-drag** (blocked on Q5's atomicity) — both `packages/document`-gated, so do not start them by
  faking either. Non-blocked and next: **the opening tool** (click a face → `core.createElement` with
  `{hostId, hostRef}`; the snap already carries the `SubShapeRef`, so exit criterion 3 is one tool away) and
  **alignment guides** (design §4.3 — pure overlay over Tier-1 candidates). Deferred and unchanged: material
  appearance, WebGPU + fallback, FSA adapter, TSL, PWA/deploy, the optional `codecFor` wiring, a schedules UI.
- **Zayd:** ⚠ **THREE THINGS, AND THE FIRST TWO ARE NEW WORK THIS ENTRY HANDS YOU.** (1) **The five ruled move
  verbs** (design §9's table, owner-ruled 2026-07-30) as additive registry entries in `commands.ts` — the
  `setParams`-vs-`move` split is ruled: params-positioned elements move by `core.setParams`, placement-
  positioned ones by `core.move`/`core.setPlacement`. (2) **`transactionId` atomicity** — it currently has
  **zero readers**, so one `Ctrl+Z` cannot reverse a multi-element gesture; Q5 rules that it be exercised.
  (3) **One-word housekeeping:** `schedule.ts`'s comments call their own convention "rule 17", which now
  collides with D58's numbered rule 17 in `core_logic.md` §8 — this project's method is grep, so two things
  called "rule 17" is a real cost. ⚠ Nothing in this entry touches the kernel, the document or any frozen
  contract; it is pure `apps/web` plus one line in `core_logic.md` §8 (domain rule 19).

---

## PROPOSED `Zayd_Prompt.md` §2 — for the owner to paste after Zayd's next push

```
FRESH:  Newest Entry in `current_state.md` = **ENTRY 70** (Amer — P4.5's tool layer: the snap seam,
        the tool state machine, numeric entry, hover, multi-select; domain rule 19 adopted).
        Your own last work is Entry 69 (the plan/section design, blocked on your five rulings).

        ⚠ Entry 70 is `apps/web` ONLY, plus ONE line in `core_logic.md` §8 (domain rule 19: a tool
        collects input, only a command changes the model). It touches no package you own and no
        frozen contract. 578 green, all five gates 0.

        ⇒ After `git pull`: newest Entry = 70 ⇒ you are current, start TASK.

TASK:   **THE FIVE MOVE VERBS + `transactionId` ATOMICITY — owner-ruled 2026-07-30 (P4.5 design §9/§10,
        Q4/Q5), PRE-FREEZE, and now BLOCKING Amer's move tool and corner-drag.**

        The owner ruled the arg shapes; the implementation is yours because a verb is
        `packages/document`. Build them as ordinary additive registry entries (D19, domain rule 5):

          core.setPlacement { elementId, placement: Transform[] }   absolute; paste-in-place, the gizmo
          core.move         { elementId, by: Vec3 }                 delta; composes under undo
          core.rotate       { elementId, axis, angle, about }       `about` defaults to the element frame
          core.copy         { elementId, by: Vec3 }  -> new id in its UndoableEdit
          core.array        { elementId, mode:'linear'|'grid', count, step, step2? }   SHAPE ONLY, body v1.0.x

        ⚠⚠ THE RULED SPLIT IS THE PART TO GET RIGHT: an element whose position lives in its PARAMS
        moves by `core.setParams` (a D52 baseline wall translates BOTH endpoints; dragging one end is
        `setParams` on that endpoint alone). An element whose position lives in `placement` — an
        Opening's offset, a GenericSolid, a placed family — moves by `move`/`setPlacement`. So the
        commonest "move" in the product never calls these verbs, and that is correct.

        ⚠⚠ Q5: `UndoableEdit.transactionId` has ZERO READERS today (measured Entry 70: declared at
        `undo.ts:109`, one comment at `document.ts:802`). A corner-drag dispatching three `setParams`
        therefore produces three edits and THREE undos. Amer deliberately did not ship a gesture that
        looks transactional and undoes in three steps. Make one `Ctrl+Z` reverse the unit.

        ⚠ Amer's pointing device is BUILT AND WAITING — the wall tool already drives `createElement`
        and `setParams` through the snap seam, so these verbs can be validated with a real gesture the
        day they land. That is what row ⓑ asked for and it is worth nothing after the freeze.

        Also owed, one word: `schedule.ts`'s comments call their convention "rule 17", which collides
        with `core_logic.md` §8's numbered rule 17 (D58, a drawing is a projection). Grep is this
        project's method; two things called "rule 17" is a real cost.
```
