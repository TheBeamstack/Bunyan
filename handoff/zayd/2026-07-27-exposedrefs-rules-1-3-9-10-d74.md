### Entry 62 — 2026-07-27 — Zayd — **THE OWED `exposedRefs` DECLARATIONS ARE CLOSED (D72's debt), AND RULES 1/3/9/10 SWEPT BACKWARD — 1 AND 3 CAME BACK DIRTY (D74). 470 GREEN.**
**Task (owner): "continue development, a significant amount of work."** Taken from Entry 61's own NEXT list (the owed `exposedRefs`) plus §1c-8's standing ledger (rules 1–4, 7–11, 14, 17, 18 unswept). Chosen over the schedules body because both are bounded and need at most one ruling, where a schedules build opens with a design doc + a ruling round. `pnpm verify` **470/470**, real exit code captured (458 → +12).

- **⚠⚠ PART 1 — THE `exposedRefs` DEBT IS PAID, AND MEASURING IT FIRST IS WHY IT WAS WORTH PAYING.** Entry 60 recorded that every shipped Type but `core.wall` still owed its declaration and meanwhile reported the solid's TOTAL ENCLOSING SURFACE. Measured on real OCCT before touching anything:
  ```
    part                          reported     exposed     over-report
    door leaf   800×2000×40        3.4240      3.2000        1.07×
    door frame  (lining)           2.9000      1.7000        1.71×
    curtain panel 1950×1450        5.8182      5.6550        2.06×   (vs one pane face)
    mullion     50×100×3000        0.9100      0.3000        3.03×
    whole façade (6 + 7 children)  43.9792     36.9300       1.19×
  ```
  - **⚠ THE ROLL-UP IS THE LEAST WRONG NUMBER IN THAT TABLE, AND THAT IS THE POINT.** A mullion is out by 3.03× and the façade total by 1.19×, because the panels dominate the sum and the panels were the least wrong. **A total that looks plausible is exactly how a per-part defect survives inspection** — the same shape as D69's fixed-per-junction over-report, seen from the aggregate end.
  - **THE OWNER RULED ONE RULE, NOT A PER-TYPE CONVENTION (2026-07-27): *exposed = every face that is a surface of the assembled thing.*** The glazing case was the one that could legitimately have gone either way — a QS bills glass by the single pane — and the owner chose the assembly rule (the sentence `core.wall` already obeyed), so a panel reports both faces and pane supply stays derivable as half of it. **One sentence now governs every Type**, which is worth more than any single number in the table.
  - **BUILT:** `core.opening`'s leaf (its two door-sized faces — the extrude's CAPS, since a leaf is extruded along the wall's inward normal) and frame (the four reveal faces + the two visible rings); `core.curtainwall`'s panel/mullion/transom (the `y` pair — the façade's local frame is X-along / Y-depth / Z-up for every bar, so **one declaration covers both orientations**). `core.curtainwall.column` is a pure composite and owes nothing.
  - **⚠⚠ AND THE `node` QUALIFIER IS NOT POLISH — A PART BUILT FROM TWO OPS OWNS ONE ROLE TWICE.** The door frame is `outer − inner`, so it carries **both** `frame:outer/face/lateral.0` (buried in the wall's opening) and `frame:inner/face/lateral.0` (the visible lining). Matching on the role alone returns whichever the canonical order put first and would have billed **1.20 m² of buried surface**, silently, wearing `exact`. `facesWithRoles(refs, roles, {node})` exists for that, and a test asserts the declaration names the inner node rather than merely counting to six.
  - **⚠ ONE SHARED HELPER, NOT A THIRD COPY:** `packages/types/src/exposed.ts` holds the role→ref lookup and `core.wall` now uses it too. **What stays per-Type is the only part that is a Type's own knowledge — WHICH faces — which is the whole reason D72 put the member on the Type.** The lookup never was.
- **⚠⚠ AND BUILDING IT FOUND A DEFECT IN D72's OWN PLUMBING, ONE LAYER BELOW WHERE ANY TYPE AUTHOR COULD SEE IT.** The first declaration on `core.opening` arrived at `quantities()` as **`undefined`**: `exposedRefs` reached **three of the four `BuiltPart → Part` construction sites** and not the `buildLeaf` one. **A door leaf could not have carried a billable area even when its Type declared one.**
  - **⚠ WHY EXACTLY THAT SITE, and it generalises:** the four are the base-part loop, the child-tree loop, `placeTree`, and the leaf loop. **`placeTree` rebuilds a part with `{...part}` and inherited the new member for free; the three that ENUMERATE fields had to be edited by hand, and D72 edited the two in front of it.** §1c-8 inside a single commit — *a new field binds the sites its author was looking at.* ⇒ **when a member is added to `Part`, count its construction sites; only the spread one maintains itself.**
- **⚠⚠ PART 2 — RULES 1 AND 3 SWEPT BACKWARD, AND THEY ARE DIRTY TOGETHER (D74): A BROKEN REFERENCE OUTLIVED THE ELEMENT IT NAMED.** The sweep's mechanical form for rule 1 is *enumerate everything persisted and ask of each "is this a RESULT?"* — and `scene.brokenRefs` is the one field in `scene.json` that is a result rather than a recipe, persisted deliberately so that closing a file cannot "fix" a model by forgetting its problem. It is re-derived on every rebuild… **for the assemblies being rebuilt.** `affectedAssemblies` deliberately skips any id no longer in the scene, so **a deleted element is never a rebuild root and its entry passed the filter untouched, forever.** Measured on both roads: deleting the orphaned opening, and deleting the host whose D39 cascade took it.
  - **⚠⚠ IT IS RULE 3's SENTENCE THAT BREAKS, NOT A COSMETIC LEAK.** Rule 3 says a broken ref is a first-class visible state **awaiting manual retargeting**. This one awaited nothing — `core.retargetReference` cannot act on an element that does not exist — and it is **saved into the `.bnn`**, so it was permanent: `brokenRefs()` never emptied, a UI showed a fault the user was given no way to clear, and any consumer asking *"is this model clean?"* read dirty for the life of the file. ***A refusal nobody can act on has stopped being a refusal and become a lie about the model's state.***
  - **⚠ AND RULE 1 IS THE DEEPER HALF: it survived `rebuildAll`** — the primary load path, which rebuilds every element there is — precisely because the element it names is not among the elements there are to rebuild. **A derived value that outlives its subject is no longer derived; it is stored.**
  - **FIX: one clause — drop an entry whose `elementId` is no longer in `scene.elements`.** Safe because there is **exactly one producer** and it reads the scene's own rows (`buildAssembly` → `hostedBy`), so no entry can legitimately name something absent; in particular a **D59 generated child is not a scene row and cannot be the subject of one** (it is not a hosted void). That was the trap worth checking before writing the clause, and it is recorded where the clause lives.
  - **⚠⚠ THE TEST THAT PROVES IT IS A DROP AND NOT A SUPPRESSION: undo the delete and THE BROKEN REF COMES BACK** — the recipe is the source of truth, the rebuild re-derives it, nothing was remembered. Had the fix hidden the symptom, that assertion would stay clean and be wrong. Plus the additivity gate (§5): a broken ref on an element that still exists is untouched. **Revert-verified — four of the five measured failing first.**
- **⚠ PART 3 — RULES 9 AND 10 SWEPT, AND BOTH CAME BACK CLEAN. They are the first rules to be swept and found clean WITHOUT needing a fix**, and the method was the count, not the read:
  - **Rule 10, mechanically:** a script extracted, per command, the keys declared in `argsSchema` versus the keys `execute` actually reads — **29 commands, zero mismatches** (the two flagged were a shared helper between blocks). Same over the shipped Types' `parameterSchema` versus what `buildGeometry`/`buildChildren` read — clean. `validateParams` refuses an undeclared arg, so a drifted schema would be a hard refusal rather than silence, which is why this one held.
  - **Rule 9's two mechanical halves are sound BY CONSTRUCTION, which is the strongest form:** *"every Command returns the state delta it produced"* holds because `applyChanges(scene, edit.changes)` is the **only** way the scene moves; *"every Command can be run as a `dryRun`"* holds because `dryRun` is one branch in the **executor**, returning before `#scene` is assigned, before `#record`, before the undo push — a command cannot opt out of it because a command never knew about it.
  - **⚠ ONE HONEST FINDING, RECORDED AND NOT ACTED ON: `undo()`/`redo()` are things an actor does to the Document and are NOT Commands** — no `argsSchema`, absent from `listCommands()`, though exposed as members of the agent surface. That is D41's exact argument shape (*"an agent could author a building but could not release one"*). **It is NOT freeze-gating: a `core.undo`/`core.redo` verb is an additive registration (rule 5), so nothing forecloses it** — and there is a real counter-argument (undo moves the undo STACK, session state, and a `dryRun` of an undo is close to meaningless). ⇒ **an owner call, at leisure, not before the freeze.**
- **⚠ THE `format:check` TRAP BIT AGAIN, TWICE, AND WAS AGAIN CAUGHT ONLY BY CAPTURING THE REAL EXIT CODE** — once on formatting and once on a `saveBnn` arity error that typecheck caught. **Fourth session running.** A local gate whose exit code you do not read is not a gate.
- **Box:** read/measure/build only; `pnpm verify` ×4 + targeted vitest + two throwaway probes (deleted); **nothing installed, no containers touched, no ports bound, no kernel rebuild** (every change is TS); `/tmp` 11 MB; available RAM never below ~2.3 GB; **both live public sites up throughout**.

**NEXT:**
- **Owner:** **the FREEZE (step 6) is still the owner's act and still unblocked.** D74 and D75 moved no frozen byte, bumped no `SCENE_SCHEMA_VERSION`, added no field or verb; the `exposedRefs` work is Type-local population of a member D72 already reserved. ✅ **Entry 62 was owner-authorised and PUSHED: `origin/main` `d045f10 → 2534e10` (2026-07-28).** ⚠ Amer was two entries behind at Entry 61 and is now current. ⚠ **One question parked for you, not blocking: should `undo`/`redo` become Commands (rule 9)?** Additive either way.
- **Zayd:** the schedules body (D58 row Ⓐ) — now the largest remaining v1.0.0 item, and it wants a design doc + a ruling round · the D29 cache bodies (§4j-2 FIRST — it is an identity task, not a serializer task).
- **⚠ STILL UNSWEPT (§1c-8's ledger): rules 7, 8, 14, 17, 18.** Thirteen swept, seven dirty — and of the five that remain, **14 (a model is ISSUED; `change_type` is READ from the log) has by far the most consumers and the most to lose**, since three products bind to it. ⚠ It is also the one currently enforced by MEMORY ALONE: nothing stops a caller handing `saveBnn` the 200-deep, undo-popped `doc.history()` in place of `doc.changeFeed()` — the docs warn about it in prose, which this session's own lesson says is the condition under which every swept rule was found dirty.
- **Amer:** unchanged — renderer batching/instancing (Entry 55's wall), P4.5, FSA adapter, WebGPU, service worker/PWA, Cloudflare deploy; plus the optional `codecFor` wiring (D71). ⚠ **`brokenRefs()` emptying on delete is a behaviour change the UI will see** — a panel that never cleared now clears; nothing to do, but do not read it as a regression.

**➕ SAME SESSION, CONTINUED — RULES 2, 4 AND 11 SWEPT (D75). 4 DIRTY; 2 AND 11 CLEAN. 475 GREEN.**
- **⚠ RULES 2 AND 11 — CLEAN, and both by COUNTING rather than reading.** Rule 2 (*a sub-shape reference is
  never a positional index*): grepped every positional read of a `refs` array in production code — **one hit,
  and it is `protocol/src/mesh.ts` mapping a triangle to a ref INDEX inside one tessellation message**, a wire
  format, not an identity derivation. Rule 11 (*never fuse two elements*): counted the `boolean` op call sites
  that actually build — **exactly two**, `build.ts` cutting a hosted void through its host's parts (the
  sanctioned intra-assembly case, §4h) and `core.opening` building its frame as `outer − inner` (intra-element).
  **No boolean anywhere takes two elements' solids as operands.**
- **⚠⚠ RULE 4 — DIRTY (D75): ONE ELEMENT THAT COULD NOT BE MEASURED KILLED THE WHOLE BUILDING'S TAKE-OFF.**
  `projectQuantities` called `quantities(id)` **unguarded**, so a single `measure` refusal threw out of the
  loop and the export returned **nothing** — no rows, no totals, **not even the `unmeasured` list that exists
  for exactly this case.** ⚠ **The owner had already ruled the opposite** (Entry 58, Q1: *an element that
  cannot be measured is reported in `unmeasured`, never zeroed and never silently dropped*) — **aborting was a
  third behaviour nobody sanctioned**, and it is D43's shape one level up: *one unregistered type must not
  brick a file* becomes *one unmeasurable element must not brick an export*. At the 10k target D48 makes
  BINDING, that is a whole building's quantities lost to one box.
  - **⚠⚠ AND THIS SESSION'S OWN WORK WIDENED IT, WHICH IS WHY IT WAS SWEPT NOW.** D72 made `quantities()` issue
    a `measure(ref)` **per declared exposed face**, and Entry 62 put a declaration on every shipped Type — so
    the number of kernel calls a take-off makes, and with it the surface on which one can refuse, grew by
    roughly the number of faces declared. *Entry 58's standing lesson turned on my own work for the second
    time this session: a surface going green is when the sweep should START.*
  - **THE REACHABLE CAUSE, and nothing validated it: `BuiltPart.exposedRefs` was never checked to be a SUBSET
    of the part's own `refs`.** A Type naming a face it does not have produced an element that built
    **`valid`**, looked perfect, and refused only when somebody priced the building. Measured end to end: three
    good walls plus one such element ⇒ `projectQuantities` threw `[UNRESOLVED_SUBSHAPE_REF]` and the three
    walls were lost with it. ⚠ **On a member that FREEZES at P5, and D61 data-families make third-party Types
    a v1.0.x reality.**
  - **FIXED TWICE, AND THE TWO ARE NOT REDUNDANT.** **(a) At the source:** a declaration naming a face the part
    does not have is now REFUSED at build time — one shared `badExposedRef()` wired into all **three**
    part-producing sites (base, D59 child, `buildLeaf`), in the same idiom and two lines from the check that
    already refuses a Type minting two parts on one DAG node. ⚠ Silently SKIPPING the bad ref was the tempting
    alternative and is worse: it under-reports an area while still wearing `basis: 'exact'` — **rule 15's own
    failure mode by a new road.** **(b) As a backstop:** `projectQuantities` reports a measure failure in
    `unmeasured` instead of throwing, which honours the ruling for every cause nobody can name in advance (a
    degenerate solid, an `INVALID_RESULT`). Tested with a gateway that refuses one measurement — the only
    honest way left to reach it once (a) exists.
  - **⚠ A DIRECT `quantities(id)` STILL THROWS, deliberately.** Rule 4 is about *which* last-good state is
    preserved: for one element that is nothing, for an aggregate it is **every other element**. Asserted.
  - **⚠ AND THE TEST WAS WRONG BEFORE THE CODE WAS: I first asserted D43 semantics** (carry the element as
    `failed`) and the build correctly REJECTED the command instead. **The existing idiom is right and the
    distinction is worth writing down: D43 is for a type this session does not KNOW** — a plugin, a Miqdar
    file, one from the future — which is `failure: 'unbuildable'`, carried and preserved verbatim; **a type
    that is simply WRONG is `failure: 'geometry'`, and rule 4 rejects it and keeps last-good.** On the LOAD
    path both are carried (`rebuildAll` never rejects), which is the road the backstop test takes — author
    with a correct Type, save, reopen against a registry whose same type id now declares a face it lacks (an
    app upgrade, a plugin version, a `.bnn` authored elsewhere).
  - **Revert-verified test-first: 3 of the 5 measured failing**, the other two being the additivity gates (a
    correctly-declaring Type is untouched; a direct query still refuses).
- **⇒ SWEEP LEDGER AFTER THIS SESSION: THIRTEEN RULES SWEPT, SEVEN DIRTY.** Dirty: 1, 3, 4, 5, 12, 15, 16 (+ the
  D68 option invariant). Clean: 2, 6, 9, 10, 11, 13. **⚠ STILL UNSWEPT: 7, 8, 14, 17, 18.**
