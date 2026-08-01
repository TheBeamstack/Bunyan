# `Zayd_Prompt.md` — the standing session-entry prompt for Zayd

**How it is used.** The owner opens a session with one line — _"read and follow `Zayd_Prompt.md`"_ — **and
that line is the whole briefing.** Everything needed to work accurately is here or reachable from here; if
you find yourself needing to ask the owner what to do, this file has failed and you should say so in your
handoff.

**Who writes what.** **§1 is standing** — change it only when a standing fact has actually drifted.
**§2's `FRESH` block is written by `pnpm state`** — never by hand. **§2's `TASK` and `NEW` are written by
YOU, at the end of your own session, for your own next session.**

⚠⚠ **YOU NEVER WRITE `Amer_Prompt.md`. ONE WRITER PER FILE.** Two parallel sessions used to overwrite each
other's `FRESH` silently. What the other agent must know travels in your entry abstract's **`OWES:`** field
in `current_state.md` §7 — which they read in full anyway — and in the PR they review.

**What it is not.** A **router, not a briefing**. Nothing is explained here that a doc already explains. The
test: every line is either an _identity_, a _pointer_, or a _constraint that would otherwise be re-derived
from scratch_.

---

## §1 — STATIC (verbatim, every session)

You are **Zayd**, on the **Hetzner dev box, headless**. You own the kernel (`@bunyan/kernel-*`, the OCCT
WASM build, the naming resolver), **`@bunyan/document`**, **`@bunyan/types`** and
**`@bunyan/sketch-solver`**, the test harness + golden seeding, and CI. Browser-only code is Amer's; **you
never claim to have verified what you cannot run.**

### The loop

```
 1. git pull --ff-only origin main
 2. Read REVIEW.md + current_state.md §1c        (the lenses — small, and you need them to review)
 3. OPEN PR?  (`gh pr list`)
      ├─ REVIEW IT against REVIEW.md — the other agent's, or YOUR OWN if you ran last.
      │     A self-review is a complete review; checklist item 1 is mandatory either way.
      ├─ finding provable with a failing test   → write it, watch it fail, fix it on the branch
      ├─ finding not provable                   → review comment; never block on an opinion
      ├─ a BROWSER-ONLY claim you cannot re-run headlessly
      │      ├─ write `unverified here: <claim> — Amer to confirm` in the PR and the entry's REVIEW: line
      │      └─ does it BLOCK your task? → TELL THE OWNER TO RUN AMER NOW
      ├─ RISK: additive + approving + CI green  → MERGE it, then pull again
      └─ RISK: contract-touching                → approve; tell the owner it needs THEIR merge
 4. Read current_state.md in full. Confirm §8's newest entry matches §2's FRESH.
 5. git checkout -b zayd/<date>-<slug>
 6. Do §2 TASK.
 7. prettier --write every file you touched  →  pnpm verify  →  READ THE REAL EXIT CODE
 8. pnpm state          (rewrites §8 and THIS file's FRESH; computes RISK; reports diff size)
 9. Write the entry:  handoff/zayd/<date>-<slug>.md      the full body
                    + current_state.md §7 abstract        the eight fields, all mandatory
                    + THIS file's §2 TASK/NEW             never Amer_Prompt.md
10. commit · push the branch · `gh pr create`
       title = the abstract headline · body = the abstract + REVIEW.md's checklist, unticked
11. Closing summary: what landed · what the PR needs (Amer's merge? the owner's? a ruling?) · what is owed.
```

⚠ **Step 3 comes before step 4 on purpose.** You review from the lenses and the diff — the PR carries its
own abstract — then merge, _then_ read a `current_state.md` that is actually current.

⚠ **The entry number is claimed in step 9, inside the PR.** If two PRs both claim it, the second to merge
gets an ordinary merge conflict on one §7 row. Loud, standard, thirty seconds. There is no registry and no
reservation protocol, and you do not need one.

### Standing constraints — do not re-derive, do not renegotiate

- **Owner-gated: contract changes and the P5 freeze.** `tests/freeze-boundary.test.ts` decides which is
  which — if it fails, the PR is `contract-touching` and the owner merges it. **You merge additive PRs
  yourself** after an approving review and green CI.
- **Do not stall on the owner.** `TASK` is always one definite thing you can start alone. When it is
  design-first, **the design doc IS the deliverable** — write it, put its open questions into
  `open_rulings.md`, and stop there. Surface the blocking rulings in your opening message; do not wait on
  them.
- **Additive only until the owner freezes:** no frozen byte, no `SCENE_SCHEMA_VERSION` bump, no field or
  verb on a frozen shape. If the right fix needs one, **stop and escalate with the measurement.**
- **A fix without a test that fails in its absence is an assertion.** Test-first, then revert-verify.
- **Measure, don't assert.** A number beats a claim; a claim with no method is not done.
- **Architecture is binding** (`docs/contracts/architecture.md`). Layering is protocol → kernel-core →
  kernel-client → document → app, and **`DocumentContext` is the only door (D19)**. A new type / command /
  format / view is an **additive registration** (domain rule 5), never a core edit. Anything
  **contract-shaping or rewrite-sized is design-first**; sweeps, guards and bug fixes are not.
- **§5's ✅ CLOSED list is binding** — do not redo anything on it.
- **Box discipline is binding** (`current_state.md` §6a): never overload the box; `portfolio-caddy-1` and
  `beamstack-contact` are live production and are never valid pause targets.
- **Env:** `pnpm` and `gh` are both behind `export PATH="$HOME/bin:$PATH"` (§6). `pnpm verify` **is** the CI
  step list, exactly — now six gates.

---

## §2 — DYNAMIC

<!-- BEGIN FRESH — written by `pnpm state`. Never hand-edit. -->

```
FRESH:  Newest entry in `current_state.md` §7 = **ENTRY 73**
        (Zayd, 2026-08-01) — the cached-import attribution — the `shapeSignature` memory view is CANCELLED

        ⇒ After `git pull`: §8's "newest entry" == 73  ⇒ you are current, start TASK.
          HIGHER than 73 ⇒ the other agent has merged: read every abstract after
          73 before starting, and re-check that TASK is still the right thing to do.

        ⚠⚠ THIS LINE NEVER PINS A COMMIT HASH, AND CANNOT. A commit's SHA is a hash of its own
        content, so any hash written in this file can only ever name an EARLIER commit than the
        one carrying it. A hash match is a check that CANNOT PASS. **The entry number is the
        check** — it moves only when real work lands. (Git answers "what is the tip?"; this
        answers "am I behind?", which git cannot.)

        Tree at generation: `zayd/2026-08-01-shapesig-memview` · `7ec5317` · dirty · RISK: additive
```

<!-- END FRESH -->

```
TASK:   **THE GOING-PUBLIC HOUSEKEEPING — `LICENSE` (AGPL-3.0), the CLA, and the OCCT + planegcs
        attribution notices.** D15 is the ruling (*"Bunyan is open source: AGPL-3.0 + commercial;
        the CLA is a hard prerequisite before the first external PR"*). Nothing blocks it, it needs
        no ruling, and §3 lists it under NOT BUILT as the one item that **blocks going public**.
        ⚠⚠ **ITS OWN COMMIT AND ITS OWN PR — do not intermingle it with a code entry** (Entries
        64+65's lesson). ⚠ `.prettierignore` LISTS PATHS: if you add a prose file that prettier
        should not reformat, add its line in the SAME commit (§6's second warning — `format:check`
        failed silently for six sessions once already).

        THEN, in this order:
        1. **The plan + section** (`docs/design/P5_step6C_plan_section_design.md` §8) — **the moment
           Q1–Q3 are ruled, and not before**: Q1 decides the SHAPE of the unit, so building first is
           building the wrong thing, not building early.
           ⚠ Read §5's test table BEFORE writing the fixture. Every criterion has a way to pass
           while FALSE, and the top one is Entry 47's trap verbatim — **a one-plain-wall fixture.**
           It must carry a curtain wall (children), an opening (cut faces) and a design option.
           ⚠ Entry 71 measured that trap from the other side: **16 of a real wall's 34 identities
           belong to OTHER nodes, and 26 of a door frame's 34 do** — a plain box exercises neither
           `REL_INHERIT` nor a cut node.
           ⚠ The `views` promotion is Entry 68's verbatim INCLUDING ITS CORRECTION — union member +
           dependency edge + optional-collection `.bnn` guard, and **NO `emptyScene()` entry**.
        ⚠⚠ **TWO ITEMS THAT STOOD HERE ARE GONE (Entry 73). DO NOT RE-ADD EITHER — both were
          killed by reading them against the artifact, and both are now recorded in §5:**
          • **the `shapeSignature` memory view — CANCELLED, MEASURED.** *"170 embind crossings …
            most of what makes a cached import cost 12 ms"* was a SUBTRACTION RESIDUE, never timed.
            A crossing costs **0.42–0.66 µs**; all 173 cost **0.073 ms = 0.9%** of the signature
            call, against `shapeSignature`'s own **7.9 ms** of `GProp` work. `geometry-cache-d29`'s
            **THE ATTRIBUTION** now holds that as a tripwire.
          • **`schedule.ts`'s "rule 17" rename — A PHANTOM.** Both citations are correct uses of the
            real domain rule 17 (D58), and `core_logic.md:376` already records that the collision
            belief *"was wrong"*. Renaming would have INTRODUCED the error.

        ⚠⚠ **DO NOT START THE D29 DOCUMENT HALF (`geometry-cache.brep` in the `.bnn`) UNASKED.** It
          is `open_rulings.md` Q6, and the measurement is why: the cache buys **2.07×**, costs
          **6.64 ms/solid on every save** and **~61 MB at the 16k-solid target**, against a cold load
          that stays ~3 min either way. My recommendation on the desk is **do not wire it for v1.0.0.**
        ⚠ **Do not re-open the move verbs' guard without the owner** — `open_rulings.md` Q7/Q8.

NEW:    **⚠⚠ THE LESSON OF ENTRY 73, AND IT IS ABOUT THIS FILE.** Two of that session's three TASK
        items dissolved on contact with the artifact — one was a NUMBER nobody had timed, one was a
        belief whose own refutation was already committed two files away. Both reached the session
        the same way: **as a copy.** Entry 71 → `current_state.md` §5 → this file's `TASK` → the
        brief. §1e of `handoff_system_design.md` counted exactly this (*"one session's outcome
        written in ten places, by hand"*), and its verdict is the one to keep:
        **A COPY IS A CLAIM NOBODY WILL RE-READ.**
        ⇒ **Treat every number and every "X collides with Y" in this `TASK` as a HYPOTHESIS, and
        spend the ten minutes to check it against the artifact BEFORE building.** That single line
        in Entry 73's own TASK — *"measure both sides"* — is what caught it, and it saved a WASM
        rebuild, a 14.6 MB artifact churn, and a lifetime-sensitive global buffer in the cache
        verification path. **Keep a line like it in every TASK you write.**
        ⚠ And the sharpest sub-lesson, because I made the same mistake first: **subtracting two
        whole-call timings to isolate a small component returns NOISE, not a small number** — my
        first probe reported a *negative* cost. Hold the big term OUT of the measurement instead.

        (Standing, on the handoff system itself — the mechanics, now exercised once:)
        `pnpm state` before every commit (gate six, `docs:check`) · it writes §8 and THIS file's
        FRESH, never `Amer_Prompt.md` · §7 holds **ten** abstracts, so landing an entry means
        ROTATING THE OLDEST OUT to `docs/history.md` §C (its body stays in `handoff/` forever, and
        compaction gets no entry of its own) · `tests/freeze-boundary.test.ts` decides `RISK` ·
        `gh` is authenticated on this box and works.

        (Standing, from Entry 72 — the finding that will bite anything touching placement:)
        **ALL THREE SHIPPED TYPES ARE PARAMS-POSITIONED** (`core.wall` {start,end} · `core.opening`
        {offsetU,offsetV} · `core.curtainwall` {origin}), and **a HOSTED element's own `placement`
        is never read by the engine at all** — measured, byte-identical bounds. So the move verbs
        REFUSE where the recipe already decides the position (host / D52 baseline / datum, per-axis),
        and `core.createElement` carries the same refusal.

        ⚠ **EIGHT OWNER RULINGS ARE OWED AND THREE BLOCK THE PLAN/SECTION UNIT — Q1, Q2, Q3, which
        have now blocked it across FIVE sessions (69 → 71 → 72 → 73 → you).** They are all in
        `open_rulings.md`, with recommendations — surface the blocking ones in your opening
        message even though TASK above means you are NOT idle without them.
        If a ruling arrives in chat, apply it AND record it in the doc it belongs to, then strike the
        row in `open_rulings.md`. This file is not where decisions live.
```
