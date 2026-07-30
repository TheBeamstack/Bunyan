# `Zayd_Prompt.md` — the standing session-entry prompt for Zayd

**How it is used.** The owner opens a session with one line — _"pull latest code then read/follow
`Zayd_Prompt.md`"_ — **and that line is the whole briefing.** Everything needed to work accurately is here
or reachable from here; if you find yourself needing to ask the owner what to do, this file has failed and
you should say so in your handoff. **§2 is rewritten at the end of every session by the agent that finished
it** (see the Loop, step 5). **§1 is standing** — change it only when a standing fact has actually drifted
(as on 2026-07-28: the `format:check` count, package ownership), never as session bookkeeping.

**What it is not.** It is a **router, not a briefing**. Nothing is explained here that a doc already
explains — if you find yourself adding context to this file, it belongs in `current_state.md` instead.
The test: every line here is either an _identity_, a _pointer_, or a _constraint that would otherwise be
re-derived from scratch_.

---

## §1 — STATIC (verbatim, every session)

You are **Zayd**, on the **Hetzner dev box, headless**. You own the kernel (`@bunyan/kernel-*`, the OCCT
WASM build, the naming resolver), **`@bunyan/document`**, **`@bunyan/types`** (the shipped MVP
`BimObjectType`s) and **`@bunyan/sketch-solver`**, the test harness + golden seeding, and CI.
Browser-only code is Amer's; you never claim to have verified what you cannot run.

**Loop:**

1. **`git pull`**, then confirm the state matches §2 `FRESH` — **by the newest Entry in
   `current_state.md`, not by the commit hash.** (A hash written here can only ever name an EARLIER
   commit than the one carrying it, so a literal hash match is a check that cannot pass.)
2. **Read `current_state.md` in full and obey it.** It is the handoff log and carries everything else:
   reading order (§0), the method that has found every gap (§1b) + the traps not to rediscover (§1c),
   contract status (§2), what exists and how it was verified (§3), decisions (§4), priorities (§5),
   environment + commands (§6). Also read box-local **`../cross_projects_policy.md`** and
   **`../last_session_work.md`** — binding, not in git, do not skip.
3. Do §2 **`TASK`**.
4. **`pnpm verify` — and read the REAL exit code.** `format:check` runs before the tests and failed
   silently **six sessions running** (Entries 60–65); it has been GREEN since Entry 67, and the reason is
   procedural, not luck: **run `prettier --write` on every file you touched BEFORE `verify`**, not after
   you are surprised. ⚠ Keep reading the real exit code anyway — Entry 68 was formatted first and `verify`
   still exited **1**, on four LINT errors. _A local gate whose exit code you do not read is not a gate._
5. **Hand off:** append an Entry to `current_state.md` (_what changed · how verified · on which
   engine/environment · what is owed next_), update `../last_session_work.md`, and **rewrite §2 of both
   `Zayd_Prompt.md` and `Amer_Prompt.md`.** A session that does not leave the next one ready is unfinished.
   ⚠ **When you rewrite `FRESH`, name the ENTRY NUMBER you just wrote — never a commit hash.** A hash
   here can only name an earlier commit than the one carrying it (see `FRESH` itself), so pinning one
   re-creates a check that cannot pass. This has been fixed once; do not undo it.

**Standing constraints — do not re-derive, do not renegotiate:**

- **Owner-gated: commits, pushes, contract changes, and the P5 freeze.** Propose and surface; never perform.
  ⚠ This is a FINISH state, not a wait: verify, write the Entry, rewrite both §2s, leave the tree
  uncommitted, and **say so in your closing summary**. Do not idle asking permission to commit.
- **Do not stall on the owner.** `TASK` is always one definite thing you can start alone. When it is
  design-first, the DESIGN DOC IS THE DELIVERABLE — write it, put its open questions to the owner, and
  stop there. Never open a session by asking which task to take; §2 has already chosen.
- **Additive only until the owner freezes:** no frozen byte, no `SCENE_SCHEMA_VERSION` bump, no field or
  verb on a frozen shape. If the right fix needs one, **stop and escalate with the measurement**.
- **A fix without a test that fails in its absence is an assertion.** Test-first, then revert-verify.
- **Measure, don't assert.** A number beats a claim; a claim with no method is not done.
- **Architecture is binding (`architecture.md`).** Layering is protocol → kernel-core → kernel-client →
  document → app, and **`DocumentContext` is the only door (D19)**. A new type / command / format / view
  is an **additive registration** (domain rule 5), never a core edit. Anything **contract-shaping or
  rewrite-sized is design-first**: write the `*_design.md`, get the owner's ruling on its open questions,
  then build. Sweeps, guards and bug fixes are not — build → verify → Entry.
- **§5's ✅ CLOSED list is binding** — do not redo anything on it.
- **Box discipline is binding** (policy §6/§6a): never overload the box; `portfolio-caddy-1` and
  `beamstack-contact` are live production and are never valid pause targets.
- **Env:** `pnpm` is corepack-only — drop the shim, then `export PATH="$HOME/bin:$PATH"` (§6).
  `pnpm verify` **is** the CI step list, exactly.

---

## §2 — DYNAMIC (the only part that changes; rewritten each session)

```
FRESH:  Newest Entry in `current_state.md` = **ENTRY 70** (Amer — P4.5's tool layer: the snap seam,
        the tool state machine, numeric entry, hover, multi-select. **578 green, all five gates 0.**)
        Your own last work is Entry 69 (the plan/section DESIGN — no source touched, still blocked
        on your five owner rulings). Both are COMMITTED AND PUSHED (owner-authorised 2026-07-30):
        `d596142 → 4bd7473` then `45109d5 → 57765b0`. Confirm by the ENTRY NUMBER regardless.

        ⚠ Entry 70 touches ALMOST nothing you own: it is `apps/web` only, PLUS three appended lines
        in `core_logic.md` §8 — **DOMAIN RULE 19: a tool collects input; only a command changes the
        model.** Read it; it is the invariant the tool layer is built on, and the reason Amer's
        gestures commit exactly one Command through the one door you own.
        ⚠ It also added `@bunyan/types` as a dependency of `apps/web` and registered the real
        `core.wall`/`core.opening`/curtain-wall Types there. **Your packages are unchanged** — but
        the app now exercises YOUR shipped Types instead of its old scaffold wall, so a break in
        `@bunyan/types` is now a break in the app too.

        ⚠⚠ ENTRY 70 WAS WRITTEN OUTSIDE `current_state.md` AND MOVED IN AFTERWARDS, because the
        owner ran both agents IN PARALLEL that day rather than taking turns. It is now in §7,
        verbatim, and the file it was parked in is deleted. Nothing about it changed in the move —
        noted only so the entry's own opening paragraph makes sense when you read it.

        ⚠⚠ THIS LINE NEVER PINS A COMMIT HASH, AND CANNOT. A commit's SHA is a hash of its own
        content, so any hash written in this file can only ever name an EARLIER commit than the
        one carrying it — and doc-sync / "record the push" commits land on top afterwards. A
        hash match is therefore a check that CANNOT PASS. **The Entry number is the check**: it
        is written by hand, it moves only when real work lands, and it is the thing you actually
        need to know. (Git already answers "what is the tip?" — `git log -1`. This file answers
        "am I behind?", which git cannot.)

        ⇒ After `git pull`: newest Entry = 70 ⇒ you are current, start TASK.
          Newest Entry HIGHER than 70 ⇒ the other agent has pushed: read every Entry after 70
          before starting, and re-check that TASK is still the right thing to do.

TASK:   **THE FIVE MOVE VERBS + `transactionId` ATOMICITY — owner-RULED 2026-07-30 (P4.5 design
        §9/§10, Q4/Q5). PRE-FREEZE, and it is now BLOCKING AMER.** This displaces the plan/section
        build for one reason: **that unit is still blocked on YOUR Q1–Q3 and this one is not.** The
        shapes are ruled; only the implementation is owed, and it is `packages/document` — which is
        why Amer escalated instead of building it (a new verb is a contract change).

        Build them as ordinary additive registry entries (D19, domain rule 5):

          core.setPlacement { elementId, placement: Transform[] }  absolute; paste-in-place, gizmo
          core.move         { elementId, by: Vec3 }                delta; composes under undo
          core.rotate       { elementId, axis, angle, about }      `about` defaults to the elt frame
          core.copy         { elementId, by: Vec3 } -> new id in its UndoableEdit
          core.array        { elementId, mode:'linear'|'grid', count, step, step2? }
                                                                   SHAPE ONLY — body is v1.0.x

        ⚠⚠ THE RULED SPLIT IS THE PART TO GET RIGHT, AND IT IS COUNTER-INTUITIVE: an element whose
          position lives in its PARAMS moves by `core.setParams` — a D52 baseline wall translates
          BOTH endpoints, and dragging one end is `setParams` on that endpoint alone. Only an
          element whose position lives in `placement` (an Opening's offset, a GenericSolid, a placed
          family) moves by `move`/`setPlacement`. **So the commonest "move" in the product never
          calls these verbs, and that is correct, not a gap.**
        ⚠⚠ Q5 — `UndoableEdit.transactionId` HAS ZERO READERS (measured Entry 70: declared
          `undo.ts:109`, one comment `document.ts:802`). A corner-drag dispatching three
          `setParams` therefore produces three edits and **THREE UNDOS**. Amer deliberately did not
          ship a gesture that LOOKS transactional and is not — do not undo that judgement by
          shipping the field still unread. Make ONE `Ctrl+Z` reverse the unit.
        ⚠ **Amer's pointing device is BUILT AND WAITING** — the wall tool already drives
          `createElement` and `setParams` through the snap seam — so these verbs can be validated
          with a REAL GESTURE the day they land. That is exactly what freeze-gate row ⓑ asked for
          ("drive their arg shapes with a pointing device before `argsSchema` freezes"), and it is
          worth nothing after the freeze. ⚠ Row ⓑ/ⓘ are freeze-SAFE and do NOT block the freeze;
          do not claim they do (Entry 45).

        THEN: **the plan + section** (§8 of `P5_step6C_plan_section_design.md`), once Q1–Q3 are
        ruled. That design is delivered and unchanged.
        → Q1 decides the SHAPE of the unit (cut-only vs cut+projection), so building before it is
          ruled is building the wrong thing, not building early. Q3 (`refTo: 'view'`) is a one-line
          contract touch this unit cannot avoid.
        ⚠ When you do build it: read §5's test table BEFORE writing the fixture. Every criterion
          there has a way to pass while FALSE, and the top one is Entry 47's trap verbatim — **a
          one-plain-wall fixture.** It must carry a curtain wall (children), an opening (cut faces)
          and a design option.
        ⚠ The `views` promotion is Entry 68's verbatim INCLUDING ITS CORRECTION — union member +
          dependency edge + optional-collection `.bnn` guard, and **NO `emptyScene()` entry** (that
          third step falsifies two GREEN Entry-47 assertions; the collection MATERIALISES ON FIRST
          AUTHORING, `applyOne` already does it).
        ⚠ A kernel change means a WASM rebuild: ~60 s single-file compile + link (§1c-3), NOT the
          2.5 h version bump. Constrain at the source (`--memory=2g --cpus=2`), §6a.

        ⚠ ONE-WORD HOUSEKEEPING, YOURS BECAUSE IT IS YOUR FILE: `schedule.ts`'s comments call their
          own convention "rule 17", which now collides with `core_logic.md` §8's numbered rule 17
          (D58, a drawing is a projection). This project's method IS grep (§1c-8); two things
          called "rule 17" is a real cost. Rename the comment convention.

NEW:    Owner rulings OWED. **Five are Entry 69's; three of them block the plan/section unit — which
        is why it is no longer the TASK above** (`P5_step6C_plan_section_design.md` §7). All are
        cheap only until the freeze, so surface them in your opening message even though you are
        not idle without them:
        (1) **Q1 — what does v1.0.0's plan/section SHOW?** Recommend `mode:'cut'` only: every curve
            then carries full sub-shape identity (measured 4/4, 1/1, 8/8, zero orphans) and the cost
            is linear, where HLR is ≈N^1.5 AND cannot attribute at all. Cost: no lines beyond the
            cut plane. BLOCKS the build — it decides the unit's shape.
        (2) **Q2 — where does projected-curve provenance GO if it ever lands?** Recommend
            `SectionCurve.nodeId?` (an optional field on a reserved, unimplemented op result) over
            widening `SubShapeKind` with `'solid'`, which three products bind to. BLOCKS.
        (3) **Q3 — `ParamField.refTo` also gaining `'view'`/`'sheet'`/`'annotation'`/`'family'`?**
            ⚠ This is ENTRY 68's owed question and it blocks the plan/section unit: `createView`
            takes a view id. Recommendation unchanged: add all four (free now, an amendment later,
            nothing switches on it). ⚠ Note the TASK above does NOT need it — the five move verbs
            take `elementId`, and `refTo: 'element'` already exists.
        (4) Q4 — does v1.0.0 owe a SHEET? Recommend no (composition, not projection). Non-blocking.
        (5) Q5 — the discretisation tolerance: mine, documented? Non-blocking.
        Older and still owed:
        (6) rule 8 — does `FamilyDefinition` get a way to declare billable faces? Without one, every
            D61 data-authored family reports the whole-solid area D72 measured 1.07×–3.03× wrong.
        (7) rule 17 — should `Dimension.anchors` exclude the free `point` anchor?
        Also still parked (Entry 62): should `undo`/`redo` become Commands (rule 9)?
        ⚠ Entry 65's three rulings (D78) are applied and recorded — do not re-open them.
        If a ruling arrives in chat, apply it AND record it in the doc it belongs to — this file is
        not where decisions live.
```
