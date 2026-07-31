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
FRESH:  Newest Entry in `current_state.md` = **ENTRY 72** (YOUR OWN — THE FIVE MOVE VERBS +
        `transactionId` ATOMICITY, P4.5 rows ⓑ/ⓘ, D80: `core.setPlacement`/`move`/`rotate`/`copy`
        live, `core.array` a registered shape that refuses, and one `Ctrl+Z` now reverses a
        multi-element gesture. **613 green, all five gates 0**, revert-verified 15 ways).
        Entry 71 (yours) is the D29 cache bodies; Entry 70 (Amer's) is P4.5's tool layer.

        ⚠⚠ **ENTRY 72 IS UNCOMMITTED — the tree is dirty and that is the FINISH state, not a
        wait.** Owner-gated: verify ran, the Entry is written, both §2s are rewritten, nothing was
        committed. Surface it and move on; do not idle asking permission.

        ⚠ WHAT ENTRY 72 CHANGED THAT REACHES YOU: `packages/document` only —
        `src/placement.ts` (NEW: the rigid-motion algebra + the positioning rule), five registry
        entries + a guard on `createElement` in `commands.ts`, the transaction unit in
        `undo.ts`/`document.ts`, and one optional option on the agent surface. **No kernel, no WASM
        rebuild, no frozen byte, no `SCENE_SCHEMA_VERSION`, no field.**

        ⚠⚠ THE FINDING TO CARRY FORWARD, because it will bite anything that touches placement:
        **ALL THREE SHIPPED TYPES ARE PARAMS-POSITIONED** (`core.wall` {start,end} · `core.opening`
        {offsetU,offsetV} · `core.curtainwall` {origin}), and **a HOSTED element's own `placement`
        is never read by the engine at all** — measured, byte-identical bounds. So the move verbs
        REFUSE where the recipe already decides the position (host / D52 baseline / datum,
        per-axis), and `core.createElement` carries the same refusal.

        ⚠⚠ THIS LINE NEVER PINS A COMMIT HASH, AND CANNOT. A commit's SHA is a hash of its own
        content, so any hash written in this file can only ever name an EARLIER commit than the
        one carrying it — and doc-sync / "record the push" commits land on top afterwards. A
        hash match is therefore a check that CANNOT PASS. **The Entry number is the check**: it
        is written by hand, it moves only when real work lands, and it is the thing you actually
        need to know. (Git already answers "what is the tip?" — `git log -1`. This file answers
        "am I behind?", which git cannot.)

        ⇒ After `git pull`: newest Entry = 72 ⇒ you are current, start TASK.
          Newest Entry HIGHER than 72 ⇒ the other agent has pushed: read every Entry after 72
          before starting, and re-check that TASK is still the right thing to do.

TASK:   **THE `shapeSignature` MEMORY VIEW — ruling-free, no contract, pure win, and it is most of
        what makes a cached import cost 12 ms.** Measured in Entry 71: a cached import pays **170
        embind boundary crossings per solid** (5 numbers × 34 sub-shapes) draining the signature
        vector, which is `kernel.cpp`'s OWN documented trap (*"an embind vector costs ONE crossing
        PER ELEMENT"*). `tessellate` already solves exactly this with a typed-array memory view;
        this is the same fix applied to the same trap. ⚠ It is a kernel C++ change ⇒ a WASM rebuild:
        **~74 s measured** single-file compile + link, NOT the 2.5 h version bump (§1c-3), capped at
        the source (`--memory=2g --cpus=2`, §6a). ⚠ **Measure both sides** — the 12.00 ms/solid
        import is the number to beat, and §1c-9 says measure the artifact, not the manual.

        THEN, in this order:
        1. **The plan + section** (§8 of `P5_step6C_plan_section_design.md`) — **the moment Q1–Q3
           are ruled, and not before**: Q1 decides the SHAPE of the unit (cut-only vs
           cut+projection), so building first is building the wrong thing, not building early.
           ⚠ Read §5's test table BEFORE writing the fixture. Every criterion has a way to pass
           while FALSE, and the top one is Entry 47's trap verbatim — **a one-plain-wall fixture.**
           It must carry a curtain wall (children), an opening (cut faces) and a design option.
           ⚠ Entry 71 measured that trap from the other side: **16 of a real wall's 34 identities
           belong to OTHER nodes, and 26 of a door frame's 34 do** — a plain box exercises neither
           `REL_INHERIT` nor a cut node.
           ⚠ The `views` promotion is Entry 68's verbatim INCLUDING ITS CORRECTION — union member +
           dependency edge + optional-collection `.bnn` guard, and **NO `emptyScene()` entry**.
        2. **`schedule.ts`'s "rule 17" comment rename** (owed since Entry 70) — its comments name
           their own convention "rule 17", which collides with `core_logic.md` §8's numbered rule 17
           (D58). This project's method IS grep (§1c-8); two things called "rule 17" is a real cost.
        3. **The housekeeping that blocks going public** — `LICENSE` AGPL-3.0, the CLA, the OCCT +
           planegcs attribution notices. ⚠ **Its own commit**; do not intermingle it with a code
           entry (Entries 64+65's lesson).

        ⚠⚠ **DO NOT START THE D29 DOCUMENT HALF (`geometry-cache.brep` in the `.bnn`) UNASKED.** It
          is owner Q6, and the measurement is why: the cache buys **2.07×**, costs **6.64 ms/solid
          on every save** and **~61 MB at the 16k-solid target**, against a cold load that stays
          ~3 min either way. My recommendation on the desk is **do not wire it for v1.0.0**.
        ⚠ **Do not re-open the move verbs' guard without the owner** — it is Entry 72's Q7/Q8 below.

NEW:    Owner rulings OWED — **EIGHT**, and three of them still block the plan/section unit. Full
        text: `P5_step6C_plan_section_design.md` §7 (Q1–Q5), Entry 71's NEXT (Q6), Entry 72's NEXT
        (Q7–Q8). All cheap only until the freeze, so surface them in your opening message even
        though the TASK above means you are NOT idle without them.
        (1) **Q1 — what does v1.0.0's plan/section SHOW?** Recommend `mode:'cut'` only: every curve
            then carries full sub-shape identity (measured 4/4, 1/1, 8/8, zero orphans) and the cost
            is linear, where HLR is ≈N^1.5 AND cannot attribute at all. BLOCKS the build.
        (2) **Q2 — where does projected-curve provenance GO if it ever lands?** Recommend
            `SectionCurve.nodeId?` over widening `SubShapeKind` with `'solid'`. BLOCKS.
        (3) **Q3 — `ParamField.refTo` also gaining `'view'`/`'sheet'`/`'annotation'`/`'family'`?**
            ⚠ Entry 68's owed question; it blocks the plan/section unit (`createView` takes a view
            id). Recommend all four (free now, an amendment later, nothing switches on it).
        (4) Q4 — does v1.0.0 owe a SHEET? Recommend no (composition, not projection). Non-blocking.
        (5) Q5 — the discretisation tolerance: mine, documented? Non-blocking.
        (6) **Q6 — is the D29 DOCUMENT half worth wiring at the measured 2.07×?** A SCHEDULING call,
            not a contract one. Recommend **no** for v1.0.0; spend the effort on `instantiate`
            (reserved), lazy build (D66) and MT (D8) instead.
        (7) **Q7 — NEW (Entry 72): does `core.copy` deep-copy a host's openings?** Today it REFUSES
            a source anything points at, because copying a door means rewriting a `hostRef` token
            that CONTAINS the host's element id — a re-identification (D1/D51), which is a ruling
            and not a body decision. Recommend **leave it refusing for v1.0.0**.
        (8) **Q8 — NEW (Entry 72): is the BASELINE refusal the right strictness?** A user sliding a
            D52 wall must `core.setParams` both endpoints; the alternative is `core.move`
            translating the baseline params itself, which is Type knowledge in the command layer and
            what the ruled split says no to. Recommend **keep the refusal**; revisit if Amer's move
            tool finds it hostile in the hand.
        Older and still owed:
        (9) rule 8 — does `FamilyDefinition` get a way to declare billable faces? Without one, every
            D61 data-authored family reports the whole-solid area D72 measured 1.07×–3.03× wrong.
        (10) rule 17 — should `Dimension.anchors` exclude the free `point` anchor?
        Also still parked (Entry 62): should `undo`/`redo` become Commands (rule 9)?
        ⚠ Entry 65's three rulings (D78) are applied and recorded — do not re-open them.
        ⚠ Entry 70's Q1–Q6 (P4.5) are RULED, recorded AND NOW BUILT (Entry 72) — do not re-open
          them either.
        If a ruling arrives in chat, apply it AND record it in the doc it belongs to — this file is
        not where decisions live.
```
