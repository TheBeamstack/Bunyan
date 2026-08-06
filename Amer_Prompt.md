# `Amer_Prompt.md` — the standing session-entry prompt for Amer

**How it is used.** The owner opens a session with one line — _"read and follow `Amer_Prompt.md`"_ — **and
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

⚠⚠ **YOU NEVER WRITE `Zayd_Prompt.md`. ONE WRITER PER FILE.** Two parallel sessions used to overwrite each
other's `FRESH` silently. What the other agent must know travels in your entry abstract's **`OWES:`** field
in `current_state.md` §7 — which they read in full anyway — and in the PR they review.

**What it is not.** A **router, not a briefing**. Nothing is explained here that a doc already explains. The
test: every line is either an _identity_, a _pointer_, or a _constraint that would otherwise be re-derived
from scratch_.

---

## §1 — STATIC (verbatim, every session)

You are **Amer**, on the owner's **local PC, with a real browser**. You own Bunyan's browser hot path:
`apps/web` — three.js/WebGPU rendering, tessellation consumer + picking, the React shell, ribbon and
property panels, persistence adapters, service worker/PWA, `window.bunyan` wiring. The kernel,
`@bunyan/document`, `@bunyan/types`, `@bunyan/sketch-solver` and CI are **all Zayd's** — every package
outside `apps/`. Build **against `@bunyan/document`, never the kernel** — D19 is enforced by
`d19-boundary.test.ts`, and **`apps/web/src/bootstrap.ts` is the one allowed `KernelClient` holder**.

### The loop

```
 1. git checkout main && git pull --ff-only origin main
    ⚠ CHECK OUT MAIN FIRST. Left on a previous entry's branch, this pull is a SILENT NO-OP
      (origin/main is already an ancestor of it), and step 5 then branches your new work off the
      OLD entry, dragging its commits into your PR. Nothing errors; you just quietly build on
      the wrong base.
 2. Read REVIEW.md + current_state.md §1c        (the lenses — small, and you need them to review)
 3. OPEN PR?  (`gh pr list`)   ⚠ "IT" MEANS A PR THAT ALREADY EXISTED WHEN YOU STARTED. Nothing you
                              create later this session is ever merged by you — see step 10(b).
      ├─ REVIEW IT against REVIEW.md — Zayd's, or YOUR OWN ENTRY FROM A PREVIOUS SESSION.
      │     ⚠ "Self-review" means a LATER SESSION reviewing earlier work, never the session that
      │       wrote it. The whole justification is that a fresh session has lost the author's
      │       working state (REVIEW.md's header). Same session = same blind spots = not a review.
      │     A self-review in that sense is a complete review; checklist item 1 is mandatory either way.
      ├─ finding provable with a failing test   → write it, watch it fail, fix it on the branch
      ├─ finding not provable                   → review comment; never block on an opinion
      ├─ ⚠ YOU are the machine that can re-run a browser claim. If Zayd left
      │     `unverified here: <claim>` on a merged entry, CLEAR IT — that is your first action.
      │     (None is outstanding as of Entry 84 — checked. This is a debt that ACCUMULATES.)
      ├─ RISK: additive + approving + CI green  → MERGE it, then pull again
      └─ RISK: contract-touching                → approve; tell the owner it needs THEIR merge
      ⇒ THEN REWRITE THAT ENTRY'S `REVIEW:` LINE in §7 — who reviewed it, what they found. Leaving
        it saying `AWAITING REVIEW` now FAILS `docs:check` once your own entry lands.
 4. Read current_state.md in full, and compare §8's newest entry against §2's FRESH:
      ├─ SAME            ⇒ main is current. Start TASK.
      └─ FRESH is HIGHER ⇒ ⚠ A FINISHED ENTRY IS STILL SITTING IN AN OPEN PR. This prompt reached
                            main ahead of its own entry (step 10). Go back to step 3, merge it,
                            then re-read. Do NOT start TASK against a main that lacks it.
 5. git checkout -b amer/<date>-<slug>
 6. Do §2 TASK.
 7. prettier --write every file you touched  →  pnpm verify  →  READ THE REAL EXIT CODE
 8. pnpm state          (rewrites §8 and THIS file's FRESH; computes RISK; reports diff size)
 9. Write the entry:  handoff/amer/<date>-<slug>.md      the full body
                    + current_state.md §7 abstract        the eight fields, all mandatory
                    + THIS file's §2 TASK/NEW             never Zayd_Prompt.md
      ⚠ §7 holds at most TEN abstracts **and a 32,768-byte budget, and the BUDGET is what bites.**
        Landing one abstract usually means ROTATING the oldest out to `docs/history.md` §C — their
        table rows are already there, so rotation is a deletion. Entry 79 had to rotate TWO.
        ⚠ Keep the `REVIEW:` line SHORT — the full review belongs in the PR comment, not in §7.
10. ⚠⚠ TWO PUSHES, AND THE SPLIT IS THE POINT:
      (a) THIS PROMPT GOES STRAIGHT TO MAIN, on its own, now.
              git checkout main && git checkout <your-branch> -- Amer_Prompt.md
              git commit -m "Amer_Prompt: hand off to entry <n+1>" && git push origin main
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
  ⚠ **`gh pr review --approve` CANNOT WORK HERE, so do not waste a session on it.** GitHub refuses to
  approve a PR opened by your own account, and both agents push from the ONE account — so the loop's
  _"approving review"_ is **always** a `gh pr comment`, never a formal approval. This is already known
  (it is the core of **Q13**'s recommendation against branch protection); it is repeated here because
  step 3 reads as though an approval were available. It is not.
- **Do not stall on the owner.** `TASK` is always one definite thing you can start alone. When it is
  design-first, **the design doc IS the deliverable** — write it, put its open questions into
  `open_rulings.md`, and stop there. Never open a session by asking which track to take; §2 has chosen.
- **Additive only until the owner freezes:** app-layer work sits below every frozen contract and should
  stay there. If a browser need seems to require a `scene.json`/protocol/verb change, **stop and escalate**
  — that is a contract change, not a UI change.
- **A fix without a test that fails in its absence is an assertion.** Test-first, then revert-verify.
- **⚠ THE VERIFICATION SPLIT — the standing rule for browser work, and it now has a second job.** GL-only
  code is **browser-verified** (measured numbers, a console-error-free boot); everything with logic in it
  is **headless-verified** in the suite. ⇒ **Keep the logic headless wherever you can**, because Zayd
  cannot re-run a browser measurement on the dev box, and anything you leave browser-only is a review item
  only _you_ can ever discharge. The Browser pane cannot screenshot a continuously-animating WebGL canvas
  — measure through the DOM/`window` path instead of claiming a picture.
- **Measure, don't assert.** Every scale claim this project trusts came with a before/after number.
- **Architecture is binding** (`docs/contracts/architecture.md`). Layering is protocol → kernel-core →
  kernel-client → document → app; **`DocumentContext` is the only door (D19)**; an element **is its
  ordered PARTS (D30)** — tessellate each, and keep each individually addressable. A new capability is an
  **additive registration** (domain rule 5), never a core edit. Anything **contract-shaping or
  rewrite-sized is design-first** (the Entry-63 batching rewrite is the worked example); ordinary features
  and fixes are not.
- **§5's ✅ CLOSED list is binding** — do not redo anything on it.
- **Env (local PC):** `pnpm install` · **`pnpm --filter @bunyan/web dev`** (Vite, the app) ·
  `pnpm --filter @bunyan/web build` · **`pnpm verify` at the repo root = the CI step list, exactly** — now
  **six** gates. ⚠ `current_state.md` §6 is the DEV BOX's environment, not yours; the `corepack` shim and
  the OCCT rebuild recipe there are Zayd's. **`gh` is installed and authenticated as
  `narutousomaki741`** — this machine's OWN GitHub account, distinct from Zayd's (owner, 2026-08-05).
  ⚠⚠ **`pnpm` IS NOT ON PATH HERE, AND `corepack pnpm verify` IS NOT A SUBSTITUTE** (Entry 84): the
  `verify` script chains `pnpm typecheck && pnpm lint && …`, so it dies at the first link with
  _"'pnpm' n'est pas reconnu"_. Drop a shim once, then prepend it to `PATH` in the same command:
  `%USERPROFILE%\bin\pnpm.cmd` containing `@echo off` + `corepack pnpm %*`. The Windows twin of the dev
  box's `~/bin/pnpm` shim in `current_state.md` §6.
  ⚠ **All six gates DO run here now.** They could not before Entry 80: `core.autocrlf=true` gives this
  box CRLF working files and `scripts/docs-state.mjs` assumed LF, so `docs:check` failed five ways and
  `pnpm state` would have written `ENTRY ?` into this file without erroring. If a doc gate ever behaves
  differently here from CI again, **suspect line endings first.**
- **Standing API facts that have bitten before:** `planDelete()` is gone (use `dryRun`); `discipline` lives
  on the part; ids are opaque ULIDs (never parse or render them — use `element.name`); `mass` may be absent
  (render "—", never "0 kg"); on save persist
  `saveBnn(scene, { journal: doc.changeFeed(), revision: doc.revision })` — `doc.history()` there is the
  moat-losing bug, and it is now refused rather than silently written.

---

## §2 — DYNAMIC

<!-- BEGIN FRESH — written by `pnpm state`. Never hand-edit. -->

```
FRESH:  Newest entry in `current_state.md` §7 = **ENTRY 84**
        (Amer, 2026-08-06) — alignment guides ship — and the guide is the first candidate that owns NOTHING

        ⇒ After `git pull`: §8's "newest entry" == 84  ⇒ you are current, start TASK.
          HIGHER than 84 ⇒ the other agent has merged: read every abstract after
          84 before starting, and re-check that TASK is still the right thing to do.

        ⚠⚠ THIS LINE NEVER PINS A COMMIT HASH, AND CANNOT. A commit's SHA is a hash of its own
        content, so any hash written in this file can only ever name an EARLIER commit than the
        one carrying it. A hash match is a check that CANNOT PASS. **The entry number is the
        check** — it moves only when real work lands. (Git answers "what is the tip?"; this
        answers "am I behind?", which git cannot.)

        Tree at generation: `amer/2026-08-06-alignment-guides` · `73bcdac` · dirty · RISK: additive
```

<!-- END FRESH -->

```
TASK:   **P4.5 CONTINUES, AND EXACTLY ONE ROW IS LEFT IN IT.** Exit criterion 3 is discharged (Entry
        80) and the alignment guides shipped (Entry 84). Q1–Q6 are ALL RULED and applied into
        `docs/design/P4.5_interaction_model_design.md` §12 — do not re-open them, and do not re-ask
        which track. ⚠ **Entry 84 is in the open PR at t=0 and it is `RISK: additive`, so it is YOURS
        to merge at step 3.** ⚠⚠ **PR #10 (entry 83, Zayd) may ALSO still be open — it is
        `contract-touching`, so it is the OWNER's, NOT yours. Review it if the owner has not merged it,
        say so, and move on.** Its review is already written (Entry 84's comment); do not redo it.

        ⇒ DO THIS:
          **THE MOVE TOOL + GIZMO, AND THE CORNER-DRAG.**
          ⚠⚠ **READ THE REFUSAL BEFORE YOU BUILD THE GIZMO — IT IS ENFORCED, NOT DOCUMENTED:**
          `core.move` **REFUSES a wall** (drag both endpoints with `core.setParams`) and **REFUSES a
          door** (`setParams` on `offsetU`), naming the road that works in the failure message. The
          move verbs are for GenericSolid-shaped elements. `core.array` is a registered shape that
          REFUSES by design — **keep it out of the ribbon.**
          The corner-drag has its atomicity: `doc.execute(id, args, { transactionId })` — one stage,
          one commit, one `Ctrl+Z` for the whole gesture.
          ⚠ **Q8 asks whether that baseline refusal is the right strictness** and says *"revisit if
          Amer's move tool finds it hostile in the hand."* **You are the session that finds out.**
          Report it as a finding either way — that is the answer the ruling is waiting for.
          ⚠ **The guides are already there for you.** A corner-drag is a gesture whose whole value is
          landing somewhere exact, and `Viewport.guidesAt` + `SnapHit` already deliver it — declare
          `snapTo: null` on the drag input and the alignment fires. **But read `tool/align.ts`'s
          header first:** a guide carries NO `ref`/`elementId`, so a drag that needs to know WHAT it
          landed on must take that from a different candidate kind, and mixing the two is the Entry-80
          defect.

        **ALSO YOURS AND STILL UNBLOCKED (name it as a decision, not a discovery):**
        • **THE 2D DRAWING VIEW** (Entry 77, merged by the owner 2026-08-05):
              const result = await doc.projectView(descriptor)   // the D19 door, on DocumentContext
          `ViewResult` = `{ viewId, kind, plane, curves, unprojected }`; each `ViewCurve` is a 2D
          polyline in the plane's own frame **carrying a real `SubShapeRef`**, so a dimension anchored
          in the drawing reads the MODEL. It is a QUERY, not an edit (domain rule 17) — no `scene.json`
          byte, nothing cached; the `.bnn` stores the DESCRIPTOR, so the drawing is LIVE.
          ⚠ **`unprojected[]` is never empty-and-silent. Render it** — a plausible, SHORT drawing is
          exactly what nobody audits. ⚠ `kind: '3d'` THROWS rather than returning an empty drawing.
          `core.createView`/`updateView`/`deleteView` are ordinary registered commands, so the
          generated ribbon already exposes them.
        • **§4.3's two remaining derived snap kinds** — the **perpendicular foot** and the
          **intersection of two candidate lines**. Same shape as the guides, same module
          (`tool/align.ts`), same identity rule. Small, and the design already names them.
        • **Q18 IS STILL YOURS AND STILL OPEN** — a SECOND opening on the same wall comes back
          `broken-ref`, because the pick correctly hands over a face of the wall AS CUT
          (`…structure~opening-X/face/cut(…)`). Entry 81 fixed only the edge half in `build.ts`.

        Not this session (deferred, so nobody re-derives): material appearance + transparency ·
        WebGPU + WebGL2 fallback · a File System Access `StorageAdapter` · TSL shading · service
        worker/PWA + Cloudflare deploy · the optional `codecFor` open/save wiring (D71) · a
        schedules UI (the CRUD exists and the generated ribbon already exposes it; the read path is
        `doc.evaluateSchedule`).

NEW:    **⚠⚠ START HERE: WHAT ENTRY 84 LEARNED, IN THE ORDER IT WILL BITE.**

        (a) **`apps/web/src/tool/align.ts` EXISTS NOW, AND ITS HEADER IS THE THING TO READ.** The one
            rule that shapes everything in it: **a guide candidate carries NO `ref`, NO `elementId`,
            NO `nodeId`** — its point is reached by travelling along an axis FROM a reference, so it
            is on no sub-shape. Inheriting the reference's identity would be Entry 80's defect with a
            longer lever (a corner's identity on a coordinate four metres away). ⇒ any tool that needs
            a host must DECLINE a guide, and `snapTo` is what stops it ever seeing one.
        (b) **⚠⚠ THE REFERENCE SET IS ENDPOINTS + MIDPOINTS + THE GESTURE ANCHOR, AND THE EXCLUSIONS
            ARE THE DESIGN.** The world grid is a **LATTICE**: every point on the plane shares its x
            with some intersection and its y with another, so admitting grid points lights both guides
            at every cursor position, permanently — a feature that is always on, and that looks in a
            screenshot exactly like one that works. `'face'` is excluded one step along: a face
            candidate is wherever the ray hit, so it moves WITH the cursor and can never be *aligned
            with* it. If you add a reference kind, ask first whether it is a PLACE or a REGION.
        (c) **⚠ `snapTo: null` IS AMBIGUOUS AND `ToolController.authoring` IS THE FIX.** `null` means
            *"every kind"* for a collecting input and ALSO *"there is no input"* for Select. Anything
            that must not act while Select is active reads `authoring`, not `snapTo`.
        (d) **⚠ `SNAP_PRIORITY` WAS NOT TOUCHED AND MUST NOT BE.** A guide is `'extension'`, the slot
            Q3's owner-ruled order already has. `align.test.ts` asserts the guide's PLACE in the array
            rather than restating it, so re-ruling Q3 re-rules the guides. **Adding a kind is
            re-opening an owner ruling.**
        (e) **⚠⚠ THE VERIFICATION SPLIT, TWICE VINDICATED — AND HERE IS THE FORM THAT WORKED WHEN A
            SCREENSHOT COULD NOT.** The Browser pane **cannot screenshot a continuously-animating
            WebGL canvas** ("not compositing frames"), so the browser claim was made by **REVERT ON A
            MEASURED NUMBER**: same document, same pixels, guides on ⇒ `end = [0, 5780.276509297827]`,
            guides off ⇒ `end = [115.71171400965068, 5780.276509297827]`. The y byte-identical, only
            the aligned component moved. ⇒ **drive the app with synthetic `PointerEvent`s on
            `canvas.viewport-canvas` and read the committed params back through `window.bunyan`** —
            `query({kind:'elements'})`, `quantities(id)`, `brokenRefs()`, `unbuildable()`. That is a
            re-runnable browser measurement, and it is the pattern to copy.
            ⚠ `window.bunyan` has **no `scene()`** — it is `query`/`get`/`quantities`/`brokenRefs`/
            `unbuildable`/`changeFeed`/`execute`/`dryRun`/`undo`/`redo`/the four `list*`.
            ⚠ Read the console on a **FRESH TAB**: editing a live component gives real *"Rendered more
            hooks than during the previous render"* errors from HMR, and the buffer survives a reload.
        (f) **⚠ `LineDashedMaterial` RENDERS SOLID WITHOUT `computeLineDistances()`, AND NOTHING
            ERRORS.** If you add overlay geometry that is meant to be dashed, that call is the
            difference between the feature and a silent lie. `#preview` is where overlay geometry
            lives — deliberately outside `#sceneGroup`, so it can never be picked or snapped to.
        (g) **⚠ `pnpm verify` NEEDS `pnpm` ON PATH AND COREPACK ALONE IS NOT ENOUGH HERE.** The script
            chains `pnpm typecheck && pnpm lint && …`, so `corepack pnpm verify` fails at the first
            link with *"'pnpm' n'est pas reconnu"*. A shim at `%USERPROFILE%\bin\pnpm.cmd` containing
            `@echo off` + `corepack pnpm %*`, with that directory prepended to `PATH` for the command,
            makes all six gates run. **This is the Windows twin of the dev box's `~/bin/pnpm` shim in
            `current_state.md` §6.**

        **Standing, unchanged:**
        (h) **`InputSpec.snapTo` IS READ** (`chooseSnap`'s `allow`, Entry 80). `SNAP_PRIORITY` ranks
            `endpoint`/`midpoint` ABOVE `face`, and an endpoint candidate carries the **EDGE's**
            `SubShapeRef` — so any tool consuming `SnapHit.ref` that does not constrain `snapTo` will
            silently receive the wrong KIND of identity near a corner.
        (i) **A `SnapHit`'s `ref`/`elementId` AND ITS `point` MUST COME FROM THE SAME PLACE.** The
            controller takes both from the snap, never one from the snap and one from `pick`.
        (j) `ToolSession.collected` is `CollectedInput[]` (`{ point, ref?, elementId? }`), not
            `Vec3[]`; `anchorOf` still returns a `Vec3`; `Tool.commit(inputs, ctx)` takes a
            `ToolContext` whose only method is `paramsOf(elementId)`. Widening it is a design decision.
        (k) `PickResult` carries `point` (the ray hit, world mm, Tier 1). `faceCandidate()` turns a
            pick into a per-frame `'face'` candidate; it is NOT in the index, and the comment says why
            (a face is a region, not a place).
        (l) The docs live in `docs/contracts/`, `docs/design/`, `docs/reviews/`; `current_state.md`,
            both prompts, `REVIEW.md` and `open_rulings.md` stay at the root. §4 is a one-line INDEX
            (full rulings in `docs/decisions.md`), §5 is LIVE PRIORITIES ONLY, §7 is ten fixed-schema
            ABSTRACTS with bodies in `handoff/<agent>/`.
            ⚠ **§7 IS OVER-TIGHT RIGHT NOW.** Entry 84 had to rotate one out to fit and chose **77**
            rather than the strictly-oldest **76**, because PR #10 rotates 76 and doing it twice would
            collide in `docs/history.md` §C. Expect an ordinary §7 merge conflict; it is thirty seconds.
        (m) **You work on a BRANCH, open a PR, and DO NOT MERGE IT.** The reviewing agent merges, and
            the reviewer is by construction a later session. `docs:check` fails on a stale
            `AWAITING REVIEW`.
        (n) **`NOTICE` IS MACHINE-ENFORCED AND IT AIMS AT YOU.** `tests/notice-attribution.test.ts`
            walks every workspace manifest, `apps/web` included, and fails `pnpm verify` if a
            **runtime** dependency is unattributed with its licence text under `licenses/`. **The next
            npm package you add to the browser bundle is a licence obligation, not just an install.**
            `pnpm licenses list --prod` is the instrument.
        (o) **⚠ THE KERNEL CAN REFUSE TO BOOT** (Entry 79). `createOcctKernel` throws
            `[INTERNAL] Kernel artifact mismatch` when the WASM's `toolchainId()` disagrees with
            `OCCT_BUILD_ID`. It fires in the browser, at construction, and only on a broken build.
        (p) **⚠ YOU ARE THE ONLY MACHINE THAT CAN CLEAR A BROWSER CLAIM.** If a merged entry carries
            `unverified here: <claim>`, clearing it is your FIRST action. **None is outstanding as of
            Entry 84** (checked, not assumed).
        (q) **⚠ THIS MACHINE HAS ITS OWN GITHUB ACCOUNT** (`narutousomaki741`, distinct from Zayd's).
            `gh` is authenticated, and **Q13's objection is gone** — branch protection requiring a
            non-author approval would no longer block every merge. Still the owner's call.
            ⚠ `gh pr review --approve` CANNOT WORK on your own PR, so the loop's "approving review" is
            always a `gh pr comment`.

        (Standing app facts, still true:)
        (0a) The app registers the REAL `@bunyan/types` (`core.wall` the D52 baseline, `core.opening`,
             the curtain-wall four). `core.wall.v1` is still registered but relabelled "legacy v1
             scaffold" so pre-Entry-70 documents build (D43). Author new walls as `core.wall`.
        (0b) `apps/web/src/tool/` is the tool layer — `snap.ts` (Tier 1, PURE, projection injected) ·
             **`align.ts` (Tier 1, PURE, the guides)** · `QueryGateway.ts` (Tier 2, read-only, four ops
             as explicit overloads = the allowlist) · `toolMachine.ts` + `tools.ts` · `numeric.ts` ·
             `useToolController.ts`. Domain rule 19 governs it: a tool collects input, only a command
             changes the model.
        (0c) ⚠ **React BATCHES, and a handler that closes over state WILL read a stale value** — this
             cost a real bug (typing `5000` produced `0`). In `useToolController`, decisions read a
             REF and writes go through `putSession`/`putNumeric`. Keep that discipline in any new tool.
        (0d) For whenever a schedule UI lands (still not now): `doc.evaluateSchedule(def, options?)`
             returns rows/groups/totals/unmeasured. A cell's `value` is ABSENT (not 0) when
             unmeasurable; `unknown: true` distinguishes "could not measure" from "nothing to
             measure" (render "N/A" vs "—", never "0"); every numeric cell carries its own native
             `unit` — do NOT convert in two places.
        If an owner ruling arrives in chat, apply it AND record it in the doc it belongs to, then
        strike the row in `open_rulings.md`. This file is not where decisions live.
```
