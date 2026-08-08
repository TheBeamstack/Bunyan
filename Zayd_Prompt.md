# `Zayd_Prompt.md` — the standing session-entry prompt for Zayd

**How it is used.** The owner opens a session with one line — _"read and follow `Zayd_Prompt.md`"_ — **and
that line is the whole briefing.** Everything needed to work accurately is here or reachable from here; if
you find yourself needing to ask the owner what to do, this file has failed and you should say so in your
handoff.

**Who writes what.** **§1 is standing** — change it only when a standing fact has actually drifted.
**§2's `FRESH` block is written by `pnpm state`** — never by hand. **§2's `TASK` and `NEW` are written by
YOU, at the end of your own session, for your own next session.**

⚠⚠ **AND THIS FILE MERGES TO MAIN ON ITS OWN, AHEAD OF ITS PR (loop step 10a).** It is the only document
read at t=0 — before step 3 can merge anything — so if it travelled in the PR the next session would be
briefed by a stale copy. It is safe to merge early because it makes **no claim about code state**: §1 is
constraints, §2 is a plan. Everything that describes the code stays in the PR.

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
 1. git checkout main && git pull --ff-only origin main
    ⚠ CHECK OUT MAIN FIRST. Left on a previous entry's branch, this pull is a SILENT NO-OP
      (origin/main is already an ancestor of it), and step 5 then branches your new work off the
      OLD entry, dragging its commits into your PR. Nothing errors; you just quietly build on
      the wrong base.
 2. Read REVIEW.md + current_state.md §1c        (the lenses — small, and you need them to review)
      ⚠ AND, because you are on the dev box: box-local `../cross_projects_policy.md` +
        `../last_session_work.md`. BINDING, not in git, and NO test in this repo can enforce them.
        §6a is a SUMMARY — the live ports table, the standing-container list and the pause/restore
        log exist ONLY there. Do not skip: an OOM here can take the owner's live public sites offline.
 3. OPEN PR?  (`gh pr list`)   ⚠ "IT" MEANS A PR THAT ALREADY EXISTED WHEN YOU STARTED. Nothing you
                              create later this session is ever merged by you — see step 10(b).
      ├─ REVIEW IT against REVIEW.md — the other agent's, or YOUR OWN ENTRY FROM A PREVIOUS SESSION.
      │     ⚠ "Self-review" means a LATER SESSION reviewing earlier work, never the session that
      │       wrote it. The whole justification is that a fresh session has lost the author's
      │       working state (REVIEW.md's header). Same session = same blind spots = not a review.
      │     A self-review in that sense is a complete review; checklist item 1 is mandatory either way.
      ├─ finding provable with a failing test   → write it, watch it fail, fix it on the branch
      ├─ finding not provable                   → review comment; never block on an opinion
      ├─ a BROWSER-ONLY claim you cannot re-run headlessly
      │      ├─ write `unverified here: <claim> — Amer to confirm` in the PR and the entry's REVIEW: line
      │      └─ does it BLOCK your task? → TELL THE OWNER TO RUN AMER NOW
      ├─ RISK: additive + approving + CI green  → MERGE it, then pull again
      └─ RISK: contract-touching                → approve; tell the owner it needs THEIR merge
      ⇒ THEN REWRITE THAT ENTRY'S `REVIEW:` LINE in §7 — who reviewed it, what they found. Leaving
        it saying `AWAITING REVIEW` now FAILS `docs:check` once your own entry lands.
 4. Read current_state.md in full, and compare §8's newest entry against §2's FRESH:
      ├─ SAME            ⇒ main is current. Start TASK.
      └─ FRESH is HIGHER ⇒ ⚠ A FINISHED ENTRY IS STILL SITTING IN AN OPEN PR. This prompt reached
                            main ahead of its own entry (step 10). Go back to step 3, merge it,
                            then re-read. Do NOT start TASK against a main that lacks it.
 5. git checkout -b zayd/<date>-<slug>
 6. Do §2 TASK.
 7. prettier --write every file you touched  →  pnpm verify  →  READ THE REAL EXIT CODE
 8. pnpm state          (rewrites §8 and THIS file's FRESH; computes RISK; reports diff size)
 9. Write the entry:  handoff/zayd/<date>-<slug>.md      the full body
                    + current_state.md §7 abstract        the eight fields, all mandatory
                    + THIS file's §2 TASK/NEW             never Amer_Prompt.md
                    + ../last_session_work.md            BOX-LOCAL, not in git — infra changes,
                                                          any pause/restore, what you installed.
                                                          ⚠ Dropped by the migration too; the
                                                          2026-07-31 session left no record at all.
10. ⚠⚠ TWO PUSHES, AND THE SPLIT IS THE POINT:
      (a) THIS PROMPT GOES STRAIGHT TO MAIN, on its own, now.
              git checkout main && git checkout <your-branch> -- Zayd_Prompt.md
              git commit -m "Zayd_Prompt: hand off to entry <n+1>" && git push origin main
          WHY: this file is the ONLY document read at t=0, BEFORE step 3 can merge anything. If it
          waits in the PR, the next session is briefed by a stale copy — and that is not
          hypothetical: Entry 73 CANCELLED the task main's prompt was still handing out. Merging it
          early is what makes the next session start correct.
          ⚠ It is SAFE to merge early precisely because it makes NO claim about code state: §1 is
          standing constraints and §2 is a plan. Everything that DESCRIBES the code —
          `current_state.md`, `docs/decisions.md`, the handoff body — stays in the PR, because a
          claim about code that is not on main yet is §1c-7 by policy instead of by accident.
      (b) EVERYTHING ELSE goes to the branch: git push · `gh pr create`
              title = the abstract headline · body = the abstract + REVIEW.md's checklist, unticked
          The PR now contains only work that is worth reviewing.
          ⚠⚠ **AND THEN YOU STOP. YOU DO NOT MERGE IT. THIS IS WHERE YOUR SESSION ENDS.**
          Your entry's `REVIEW:` line reads `⚠ AWAITING REVIEW — this is the open PR`, and the NEXT
          session merges it at its step 3. Owner-ruled decision 5: **the REVIEWING agent merges**,
          and the reviewer is by construction a later session.
          ⚠ Entry 74 got this wrong — opened its PR and merged it minutes later, so it is on `main`
          having never been read by a second party. Step 3's *"MERGE it"* is about the PR you found
          at t=0; it was never about the one you just created. `docs:check` now enforces this: a
          stale `AWAITING REVIEW` on any non-newest entry FAILS.
      ⚠ Push (a) BEFORE (b), and put the identical file on the branch too (it already is, if you
        edited it there) — same content both sides means the PR merges without a conflict.
        ⚠ `pnpm state` rewrites FRESH's tree line, so if you run it again after (a), re-sync (a).
11. Closing summary: what landed · **what the OPEN PR is waiting for** (the next session's review is
    the normal answer; the owner's merge only if contract-touching; a ruling?) · what is owed.
```

⚠ **Step 3 comes before step 4 on purpose.** You review from the lenses and the diff — the PR carries its
own abstract — then merge, _then_ read a `current_state.md` that is actually current.

⚠ **The entry number is claimed in step 9, inside the PR.** If two PRs both claim it, the second to merge
gets an ordinary merge conflict on one §7 row. Loud, standard, thirty seconds. There is no registry and no
reservation protocol, and you do not need one.

⚠⚠ **THE ONE ASYMMETRY TO HOLD IN YOUR HEAD: THIS FILE RUNS AHEAD OF THE REPO.** Step 10(a) puts it on
main while its entry is still in review, so between a hand-off and its merge, **`FRESH` names an entry
that main's code does not yet contain.** That is deliberate, and step 4 turns it into a signal rather
than a trap: a FRESH _higher_ than §8 means *"go merge the open PR first."_ It is never a reason to
start work. ⚠ And do not run `pnpm state` on a main in that condition — it reads `current_state.md`,
would find the older entry, and would quietly rewrite `FRESH` backwards.

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
FRESH:  Newest entry in `current_state.md` §7 = **ENTRY 90**
        (Zayd, 2026-08-08) — a pinned state proves the PIN, not the POPULATION — and D66's lazy build, measured

        ⇒ After `git pull`: §8's "newest entry" == 90  ⇒ you are current, start TASK.
          HIGHER than 90 ⇒ the other agent has merged: read every abstract after
          90 before starting, and re-check that TASK is still the right thing to do.

        ⚠⚠ THIS LINE NEVER PINS A COMMIT HASH, AND CANNOT. A commit's SHA is a hash of its own
        content, so any hash written in this file can only ever name an EARLIER commit than the
        one carrying it. A hash match is a check that CANNOT PASS. **The entry number is the
        check** — it moves only when real work lands. (Git answers "what is the tip?"; this
        answers "am I behind?", which git cannot.)

        Tree at generation: `zayd/2026-08-08-e90-d66-lazy-build` · `8c1aa79` · dirty · RISK: additive
```

<!-- END FRESH -->

```
TASK:   ⚠⚠ **YOUR STEP 3 IS ENTRY 90'S OWN PR, AND IT IS `RISK: additive` — SO YOU MERGE IT YOURSELF**
        after an approving review and green CI. ⚠ `gh pr merge` is not categorically blocked — it went
        through in Entries 85, 87, 88 and 90 **when the owner authorised it in the opening instruction**;
        absent that, `additive` is yours by policy anyway.
        ⚠ **PR #13 (Amer, Entry 86 — the corner-drag) MAY STILL BE OPEN AND IS *NOT* YOURS.** Reviewed by
        Entry 87, re-checked by Entry 88, and Entry 89 is Amer merging it. **Do not review it a fourth
        time. Say it is Amer's and move on.**
          ⚠ **Item 1 is mandatory and cheap here — TWO reverts, each with a named RED:** in
            `scripts/prompt-sync.mjs`, put question 2 back to `contains(main, head)` ⇒ **1 RED** (the
            false-positive test); delete question 2 entirely ⇒ **3 RED**. ⚠ **And re-measure the counts
            rather than copying mine** — Entry 88's were stale because a follow-up commit added tests
            under them, and that is the single most repeatable mistake in this file's history.
          ⚠⚠ **THE HALF WORTH YOUR TIME — I CLAIMED IDENTITY IS SAFE UNDER A PARTIAL BUILD. ATTACK IT.**
            `tests/d66-lazy-build-measure.test.ts` proves it for walls, a wall with a WINDOW (the CUT node
            mints names) and the JOIN (a mitre against a neighbour that is never built). **That is three
            shapes, not a population.** §1b's own warning: *the probe only measures the shapes you think
            to cut.* **Still untried: a CURTAIN WALL (D59 composition — generated children with derived
            PEIs, the one place a build produces elements that are not scene rows), a hosted void through
            a CURVED face, and an element whose host is built in a LATER pass than the host itself.** ⚠ If
            a partial build disagrees with a full one anywhere, **D66 is a correctness change wearing a
            performance change's clothes** and the design doc is wrong.

        **THEN — READ `open_rulings.md` FIRST. `Q17a` STILL BLOCKS AND `Q19` IS STILL THE WORST DEFECT ON
        THE BOARD.** Entry 87 closed the AUTHORING road into a belongs-to cycle and Entry 88 proved that
        guard refuses nothing legitimate (100 000 queries, zero disagreements). **The DELETION road is
        untouched.** Delete an element another names via `parentElementId` and the child survives in
        `scene.elements` while vanishing from every consumer (`modelElements()` 0 of 1, a whole-model
        schedule **0 rows with `basis: 'exact'`**, both diagnostics empty). ⇒ **SURFACE closes both edges
        and is the same body as Q17c. If the owner rules Q19 or Q17c in chat, BUILD IT** — and note
        `tests/belongs-to-cycle-guard.test.ts` **pins the current edge set on purpose**, so the ruling has
        to come past it deliberately. **That pin failing is success, not a regression.**

        **YOUR TASK IF NOTHING IS RULED — and it needs no ruling at all:**
        ⚠⚠ **BUILD D66's LAZY FIRST PAINT. THE DESIGN IS WRITTEN AND MEASURED
        (`docs/design/P5_step9_D66_lazy_build_design.md`); WHAT IS MISSING IS THE CALLER.**
        **`rebuildOnly` IS the primitive and has shipped since 2026-07-25** — the build half is additive
        and needs no new API. ⇒ **Three things, in this order:**
          (1) ⚠ **THE ONE I FLAGGED AND DID NOT MEASURE: does `save` read BUILT state?** It must not — it
              writes the recipe — **but that is a claim, not a measurement.** If a lazily-loaded document
              saves short, that is **data loss, not a reporting choice**, and it outranks everything else
              in this list. **Measure it first: load, build one element of four, `saveBnn`, reload, count.**
          (2) **FORCE-ON-MEASURE** (design §3c): every aggregate that quantifies over the model
              (`projectQuantities`, schedules, the Clean Delta) builds its own subject first. ⚠ The
              honest channel already exists — a partially built take-off names every unbuilt element in
              `unmeasured` — so this is about making the number RIGHT, not about making it loud.
          (3) **The 10k extrapolation.** Mine is 54 elements and the per-element cost was flat across two
              passes; **flat at 54 is not flat at 10 000.** Copy `document-heap-scale.test.ts`'s
              least-squares approach rather than building 10 000 solids on a 3.7 GB box.
        ⚠ **DO NOT RE-COLOUR §1a's COLD-LOAD ROW.** Lazy build takes 64.5% off the first paint and one
        storey of a 10k tower is still ~24 s. **The row closes with `instantiate` (RESERVED) or MT (D8),
        not with this.** Writing "closed" there would be exactly the §0a disease.

        ⚠ **WHAT ENTRY 90 ALREADY DID — DO NOT REDO ANY OF IT:**
          • **PR #15 (Entry 88) reviewed, amended and MERGED.** The gate's question 2 was a FALSE POSITIVE
            and is replaced; four previously untried states are pinned.
          • **D66 measured on three axes** — the forced fraction, identity, and what a take-off says.
          • **Entry 82 rotated** to `docs/history.md` §C (§C's header reads 54–82).
        **780 green, 89 files, six gates, exit 0.**

        ⚠ **STILL OWNER-ONLY AND UNCHANGED: Q11/Q12** (`CLA.md` ships `<LEGAL ENTITY>`). ⚠ **Q18 and Q20
        are Amer's**, as is adding `Amer_Prompt.md` to the gate's `GATED` list.

NEW:    **⚠⚠ THE LESSON OF ENTRY 90: A PINNED STATE PROVES THE PIN, NOT THE POPULATION.** Entry 88's gate
        pinned four real commits from this repo's history, and **three successive wrong implementations of
        its question 2 passed all four.** The fourth wrong version shipped, and it failed a CORRECT session:
        *"is main contained in this branch?"* is a question about **COMMITS**, and the invariant is about a
        **FILE** — so the other agent merging anything mid-session made the skip go quiet and the gate
        compared a `§2` that main had not been shown yet. ⇒ **When a check keeps needing exceptions, ask
        whether it is even about the same NOUN as the thing it protects.** The fix asks git's own
        three-way-merge criterion (both sides must have edited the file) and **subsumes** what it replaced.
        ⚠ **The corollary for pins: a test that pins states is only as good as your enumeration of them.
        Ask what the pins do not contain** — for a gate, "what did the OTHER agent just do?" is the cheap
        one nobody asks.

        **⚠⚠ SECOND: A MEASUREMENT IS PINNED TO A COMMIT, AND A FOLLOW-UP COMMIT UN-MEASURES IT.** Entry
        88's `2/2/1/1 RED` and its `771 green` were both honest when written and both wrong when I read
        them — measured at `4a9cd10`, never re-measured after `0018acb` added three tests. **This is the
        THIRD variant of the same disease in three entries** (E88 posted an inferred table; E87's merge
        advice went stale under it). ⇒ **After any follow-up commit, re-run the numbers in your own PR
        body.** They are the cheapest thing in the entry to refresh and the most quoted.

        **⚠ THIRD: PREDICT, THEN MEASURE — AND SAY SO WHEN THE MEASUREMENT SAYS NO.** I expected a
        partially built document to under-report a take-off in the Q19 shape (short, `basis: 'exact'`,
        diagnostics empty). **It does not** — `projectQuantities` tests `state !== 'valid'` before
        `hasParts`, so every unbuilt element is NAMED in `unmeasured`. Writing the prediction down first is
        what made the negative result worth having, **and the negative result is what makes D66 shippable.**

        **⚠ FOURTH, ON DESIGNING A PERFORMANCE FEATURE:** §1b's third method held again. The interesting
        question was never *"how much faster?"* but *"what does a partially built document TELL people?"* —
        and the answer moved the hook **out of the renderer and into the ENUMERATION**. ⚠ And the one that
        nearly slipped past: a wall's geometry is **not** a function of the wall alone (`resolveJoins`
        clips against neighbours), so lazy build could have shipped D68's silent plain-cap. It does not,
        **because the pipeline reads the RECIPE and never the built set** — measured, not assumed, on the
        real D52 wall, because the scale fixture's `{length,height}` walls cannot see joins at all.

        (Entry 88's lesson, still standing:)
        **⚠⚠ WHEN YOU BUILD A GATE, THE HARD PART IS THE *SKIP*, NOT THE CHECK** — and **a gate that
        disables itself on a broken input reports GREEN, which is worse than no gate.** For every skip
        branch, ask which BROKEN state also takes it. ⚠ **A green tick means the job exited 0, not that
        your step ran: grep the run log for your gate's name** (`gh run view <id> --log | grep -i <gate>`).

        (Entry 87's, still standing:)
        **⚠⚠ ASK WHAT A VALIDATOR *PROVES*, NOT WHAT IT IS *FOR*.** *"Both writers `requireElement` the
        host"* proves the target **EXISTS** — never that it is not the element itself. **A reference that
        resolves can still LOOP**, and a loop is an ERASED element.

        (Standing, on the handoff system itself:)
        `pnpm state` before every commit (gate six, `docs:check`) · it writes §8 and THIS file's FRESH,
        never `Amer_Prompt.md` · ⚠ **importing `scripts/state.mjs` EXECUTES it** — use
        `scripts/docs-state.mjs` for constants · §7 holds at most **ten** abstracts **and a 32,768-byte
        budget, and the BUDGET is what bites** — Entry 90 rotated **82**; §C's header now reads **54–82**,
        and **entry 86 landing will likely need 83 rotated too** · ⚠ **`pnpm state` reads
        `.vitest-summary.json`, so run it AFTER a green `pnpm verify`** · ⚠ **A RE-BASELINE IS A THREE-STEP
        DANCE AND ITS ORDER IS LOAD-BEARING:** **write your §7 abstract FIRST**, then `pnpm state
        --rebaseline` → `pnpm verify` (green) → `pnpm state` (plain) · `tests/freeze-boundary.test.ts`
        decides `RISK`, measured **at the merge base** · ⚠ **`gh pr review --approve` CANNOT WORK HERE** —
        GitHub refuses self-approval from the one account, so the loop's *"approving review"* is **always**
        a `gh pr comment`; this is Q13's core.
        ⚠⚠ **THE MERGE ITSELF: THE HARNESS CLASSIFIER REFUSES `gh pr merge` BY DEFAULT, BUT NOT WHEN THE
        OWNER AUTHORISES IT IN THE SESSION PROMPT** — went through first try in Entries 85, 87, 88 and 90.
        **The protocol is unchanged** (`contract-touching` is the owner's merge *by policy*); do not tell
        the owner it is technically impossible, and stop adding permission rules for it. *(The classifier
        also refuses `sed` and some `grep` forms; re-phrase once or use the Read tool, then move on.)*
        ⚠ **THE `Zayd_Prompt.md` DRIFT IS GATED — `tests/prompt-sync.test.ts`, inside `docs:check`** — and
        after Entry 90 it no longer fires when main merely moves. **It still skips locally until you
        `git fetch` after 10(a)**, so if you want the local check to bite, fetch.

        ⚠ **THE 🔴 BLOCKING TABLE STILL HOLDS `Q17a`.** Fourteen owner rulings are owed. *(Counted, not
        remembered — `open_rulings.md` holds Q4–Q13, Q17a, Q17b, Q17c, Q18, Q19, Q20.)* The live ones are
        **Q17a** (blocking, contract-touching, owner-merged), **Q19** (the silent erasure — the authoring
        road is closed and PROVEN not over-tight, the DELETION road is not, and it is now pinned),
        **Q17b/Q17c** (blocking nothing), **Q18/Q20** (Amer's) and **Q11/Q12** (the CLA). If a ruling
        arrives in chat, apply it AND record it in the doc it belongs to, then strike the row. This file
        is not where decisions live.
```
