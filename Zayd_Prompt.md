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
FRESH:  Newest entry in `current_state.md` §7 = **ENTRY 82**
        (Zayd, 2026-08-06) — the design-options question, walked — the two doors are a 50% silent under-report (Q17)

        ⇒ After `git pull`: §8's "newest entry" == 82  ⇒ you are current, start TASK.
          HIGHER than 82 ⇒ the other agent has merged: read every abstract after
          82 before starting, and re-check that TASK is still the right thing to do.

        ⚠⚠ THIS LINE NEVER PINS A COMMIT HASH, AND CANNOT. A commit's SHA is a hash of its own
        content, so any hash written in this file can only ever name an EARLIER commit than the
        one carrying it. A hash match is a check that CANNOT PASS. **The entry number is the
        check** — it moves only when real work lands. (Git answers "what is the tip?"; this
        answers "am I behind?", which git cannot.)

        Tree at generation: `zayd/2026-08-06-q17-designoptions` · `6a8acb3` · dirty · RISK: additive
```

<!-- END FRESH -->

```
TASK:   ⚠⚠ **YOUR STEP 3 IS ENTRY 82'S OWN PR, AND IT IS YOURS TO MERGE.** It is `RISK: additive` —
        design documents and `open_rulings.md` rows, no code in `packages/`, freeze-boundary green — so
        under step 3 the REVIEWING session merges it. **No owner gate.** ⚠ If Amer has opened one too,
        review BOTH; theirs is browser work and its browser-only claims are checklist item 1's named
        exception.
          ⚠ **Item 1 is mandatory and Entry 82 is a DESIGN entry, so its revert-verifications are the
          ones it inherited from reviewing Entry 81** — do that one: restore `scripts/state.mjs` to the
          pre-review body (measure `moved` from the WORKING-TREE snapshot instead of
          `git show <merge-base>:tests/frozen-surface.snapshot.json`) and watch
          **`tests/state-risk-e2e.test.ts` go RED** on *"the verdict was erased by re-baselining"* —
          **while `tests/freeze-boundary.test.ts` stays 10/10 GREEN.** That contrast is the finding.
          ⚠ **The thing to attack in the DESIGN half:** §1's numbers were taken with a scratch harness
          that was deleted. **Re-derive one of them** — two identical walls, one tagged with a
          `designOptionId` naming nothing, and a whole-model schedule — and check I have not quoted a
          number no committed test holds down. If it reproduces, say so; if the design doc's §5
          criterion 6 is the only thing that would ever hold it, say THAT.

        **THEN — and READ `open_rulings.md` FIRST, because the 🔴 BLOCKING table is NO LONGER EMPTY:**
        **`Q17a` is owner-blocked** (promote `scene.designOptions`, contract-touching, owner-merged), so
        the design-options unit CANNOT be started. Do not start it. **Your task is the BACKWARD SWEEP
        Entry 82's finding implies, and it needs no ruling at all:**

        ⚠⚠ **`core.createElement` HAS THREE RESERVED REFERENCE ARGS AND ENTRY 82 ONLY MEASURED ONE.**
        `designOptionId` was accepted while naming nothing, and a consumer rule written three days
        earlier then silently dropped the element from every table. The same door also writes
        **`systemId`** (D62, `scene.systems` has no CRUD either) and **`parentElementId`** — and the
        code's own comment groups them: *"the integrity check lands WITH those bodies (Parity-C/F), like
        `parentElementId`'s."* ⇒ **For each of the three, ENUMERATE every consumer that reads it and ask
        what each does with an unresolvable value.** §1c-8's two mechanical forms both apply: grep every
        read, and **COUNT the set** rather than reading one member. The question that matters is not
        *"is it validated?"* — it is **"does any consumer EXCLUDE, AGGREGATE or PUBLISH on it?"**, because
        that is what turned `designOptionId` from a dormant reservation into a 50% under-report.
          ⚠ Expect a real answer either way. *"All three are dormant except `designOptionId`"* is a
          finding worth writing down and closing, and it is cheap to establish. *"`systemId` has the same
          shape"* is Entry 82's defect again and is fixable in the same additive move.
          ⚠ **And there is one thing to FIX regardless, which needs no ruling** (design doc §2, §4.4):
          `core.createSchedule` and `core.createView` implement the SAME design-option check TWICE, in
          `commands.ts` and `view.ts`, with two failure codes. Collapse to one predicate. ⚠ **Preserve
          each door's OBSERVABLE failure code** — `CommandFailure`'s code is agent-visible surface, so
          share the predicate, not the throw.
          ⚠ Fallback if the owner rules in chat: **Q17c is the one piece that is additive AND
          direction-neutral** — make a dangling `designOptionId` a visible broken ref. Build it if ruled;
          it is the same fix Entry 80's review made for `hostRef`, in a new place.

        ⚠ **WHAT ENTRY 82 ALREADY DID — DO NOT REDO ANY OF IT:**
          • **Entry 81's PR was reviewed and merged** (the owner ran the merge; `gh pr merge` is refused
            by the harness's classifier here, as predicted). **One defect proven and fixed on its
            branch:** Q15's fix held for exactly ONE invocation — the verdict was read from the
            working-tree baseline `--rebaseline` had just overwritten, so the next plain `pnpm state`
            printed `RISK: additive` again on the same PR. Now measured at the merge base, and
            `tests/state-risk-e2e.test.ts` EXECUTES the generator.
          • **Q17 is WALKED, not built** — `docs/design/P5_step6D_design_options_crud_design.md` carries
            the measurements, the shape, the dependency edge and an 8-row test plan.
          • **Q17 is REPLACED by Q17a/Q17b/Q17c**, and Q17a is in 🔴 BLOCKING.
        **715 green, 84 files, six gates, exit 0.**

        ⚠ **STILL OWNER-ONLY AND UNCHANGED: Q11/Q12** (`CLA.md` ships `<LEGAL ENTITY>`; no lawyer has
        read it). ⚠ **Q18 is Amer's and still open** — the cut-face half of what a hosted void may host
        on. Entry 81 fixed only the edge half.

NEW:    **⚠⚠ THE LESSON OF ENTRY 82: "ADDITIVE" IS TWO WORDS IN THIS REPO, AND THEY PART COMPANY.**
        Promoting `scene.designOptions` to a `SceneCollection` is **data-additive** — D79's
        materialise-on-first-authoring means no `SCENE_SCHEMA_VERSION` bump and a document with no
        options stays byte-identical — and it is **NOT freeze-additive**: `type SceneCollection` is one of
        21 watched declarations in `scene.ts`, so widening it moves the frozen surface **by
        construction**, measured (`+ packages/document/src/scene.ts :: type SceneCollection`).
        ⇒ **Never write "additive" without saying WHICH.** The `.bnn` in the field and the freeze boundary
        are different questions, and only the second decides who merges — so conflating them is how a
        contract-touching PR gets agent-merged with a true-sounding sentence behind it.

        **⚠⚠ SECOND: A ROW IN `open_rulings.md` IS A CLAIM ABOUT THE CODE, AND GETS READ AGAINST IT.**
        Q17's row said `checkDesignOptions` was *"shared by `core.createSchedule` and now
        `core.createView`."* It is not — the view door has its own second copy in `view.ts` with a
        different failure code. The row had been quoted forward through two entries. ⇒ §1c-7 has a home
        nobody was checking: **the decision queue is prose about code, and REVIEW.md item 4 covers it.**

        **⚠ THIRD, FROM REVIEWING ENTRY 81: A FIX SCOPED TO ONE INVOCATION IS NOT A FIX — ASK WHAT THE
        SECOND RUN PRINTS.** `--rebaseline` was correctly demoted to a qualifier, and the very next plain
        `pnpm state` undid it, because the verdict was measured against a file the first run had
        rewritten. **The last run is the one whose output survives.** ⇒ when a fix depends on ordering
        *within* a run, ask what happens when the run happens twice — this loop asks for exactly that
        (gate six before every commit, step 10(a) again after).
          ⚠ And its sharp half: **a wiring grep that asserts the CALL'S ARGUMENT LIST fails on the fix and
          passes on the bug.** `/riskVerdict\(moved, rebaselining\)/` was green throughout the defect and
          red on its correction. Match the call; **execute** the artifact for the rest.

        (Entry 81's lesson, still standing and now with a second worked example:)
        **⚠⚠ A TEST THAT GREPS THE SOURCE FOR A CALL PROVES THE CALL IS WRITTEN, NOT THAT IT RUNS.**
        Where the artifact can be executed, EXECUTE it — `tests/reseed-gate-e2e.test.ts` and
        `tests/state-risk-e2e.test.ts` both build a throwaway git repo and assert what the real script
        prints. **AND AN UNTESTED GATE DRIFTS TOWARDS FAILING OPEN**, because it is written by someone who
        wants their own PR to pass. ⇒ **ask what a check's POPULATION actually is;** a rule whose exception
        covers all of it is not a rule.

        (Entry 80's lesson, still standing:)
        **⚠⚠ YOU CANNOT FIX A HAND-MAINTAINED CONSTANT BY ADDING ANOTHER HAND-MAINTAINED CONSTANT** —
        ask WHO COMPUTES IT.

        (Entry 78's lesson, still standing:)
        **⚠⚠ DEAD CODE IN A DIFF IS A MISSING TEST, AND A MISSING TEST IS USUALLY A MISSING *CRITERION*.**
        ⚠ **`grep` for your own new exports' call sites before you ship**, and ask *"if this drew
        EVERYTHING, would my test still pass?"*

        (Entry 75's lesson, still standing, kept for an eighth entry running:)
        **⚠⚠ IF YOU ARE ABOUT TO MERGE SOMETHING YOU WROTE TODAY, THAT IS THE BUG.** Push it, mark it
        `AWAITING REVIEW`, stop. ⇒ **A constraint that lives only in a design doc is not a constraint.**

        (Standing, on the handoff system itself:)
        `pnpm state` before every commit (gate six, `docs:check`) · it writes §8 and THIS file's FRESH,
        never `Amer_Prompt.md` · §7 holds at most **ten** abstracts **and a 32,768-byte budget, and the
        BUDGET is what bites** — Entry 82 landed one abstract and rotated **75** out to `docs/history.md`
        §C (its row was already there, so rotation was a deletion; ⚠ it also carries the `---` before
        `## §8`, so put that back) · ⚠ **`pnpm state` reads `.vitest-summary.json`, so run it AFTER a green
        `pnpm verify`** — and if §8 quotes a FAILING suite, re-run the suite and `pnpm state` again ·
        `tests/freeze-boundary.test.ts` decides `RISK`, and the verdict is now measured **at the merge
        base**, so re-baselining cannot erase it · ⚠ **`gh pr review --approve` CANNOT WORK HERE** — the
        loop's *"approving review"* is **always** a `gh pr comment`; this is Q13's core. ⚠⚠ **AND THE
        MERGE ITSELF IS BLOCKED BY THE HARNESS'S PERMISSION CLASSIFIER** — refused again in Entry 82, as
        in Entry 81, and a settings permission rule did not help earlier. Do the whole review, post the
        comment, then **ask the owner to run the merge** and carry on. It is not a protocol failure and it
        is not something to work around.

        ⚠ **THE 🔴 BLOCKING TABLE IS NO LONGER EMPTY — `Q17a`, after five sessions of empty.** Twelve
        owner rulings are owed. *(Counted, not remembered — `open_rulings.md` holds Q4–Q13, Q17a, Q17b,
        Q17c, Q18.)* The live ones are **Q17a** (blocking, contract-touching, owner-merged), **Q17b/Q17c**
        (its siblings, blocking nothing), **Q18** (Amer's question, my layer's fix) and **Q11/Q12** (the
        CLA). If a ruling arrives in chat, apply it AND record it in the doc it belongs to, then strike
        the row. This file is not where decisions live.
```
