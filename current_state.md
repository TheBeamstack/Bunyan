# Bunyan — `current_state.md`

**What this file is.** The **cross-session, cross-agent, cross-machine handoff log** for Bunyan. It
lives in the repo and travels with the code between the local PC (Amer) and the Hetzner dev box
(Zayd), per `cross_projects_policy.md` §9.

**Why it exists.** So the next agent does **not** re-derive context, does **not** make false
assumptions about what is built, and does **not** redo verified work. If you are a fresh session:
read §0 → §1 → §2 → §3's traps → §5, then work.

**How to use it.**
- **Read** §0–§5 and the newest Entry before touching anything.
- **Append** a new Entry when you finish a meaningful unit of work. Never rewrite history — but
  **do compress it**: Entries 1–15 are archived as one-liners in §7 (their durable lessons were
  promoted into §1–§4, which is where a fresh agent actually reads them). Full narratives live in
  git history.
- **Record who validated what, and on which engine/environment.** A claim without a verification
  method is not done.
- Keep §2 (contract status), §3 (what exists) and §4 (decisions) **current** — those are the three
  things a new agent gets wrong most easily.

---

## §0 — Orientation (read this first)

**What Bunyan is:** a browser-native, serverless, parametric BIM/CAD authoring platform. An exact
B-Rep kernel (OpenCascade/OCCT compiled to WebAssembly) computes geometry; the design is stored as a
*parametric recipe*, and meshes/2D views are disposable projections of it.

**Document reading order** (repo root; they are the contract, this file is the status):
**1.** `core_logic.md` — the domain model. *What the app means.* · **2.** `architecture.md` — layers,
worker protocol, registries. *How it is built.* · **3.** `V1.0.0_spec.md` — scope, decisions **D1–D39**.
*What ships first.* · **4.** `v1.0.0_imp_plan.md` — the 7 phases and their exit criteria.

**5. `Miqdar_v1.0.0_spec.md`** (+ `Miqdar_normative_register.md`) — **the second product**, and **NOT
optional reading before a contract freeze** (§4g). ⚠ **It lives here for exactly one reason: Bunyan's
contract freezes must not foreclose it.** **P5 has a gate pointing at its §3.4.** It is **not** a Bunyan
work item — Miqdar starts only after **Bunyan v1.0.0** ships.

⚠ **Version strings: always "Bunyan v1.0.0" or "Miqdar v1.0.0" — never a bare "v1.0.0."** Two
independently-versioned products both have one. *(Miqdar M17.)*

**The one non-negotiable invariant:** B-Rep is the source of truth; the parametric recipe is the source
of truth for the B-Rep; meshes and 2D views are disposable. Everything else follows from it.

**The hardest idea (and the schedule risk):** persistent sub-shape naming (D1). Sub-shape identity is
*derived* from the operation DAG — a `SubShapeRef` is a derivation path (`nodeId` + `role` +
`occurrence`), **never a geometric index.** It is assigned when an op runs and propagated forward, never
recovered by matching geometry afterwards.

**Actors** (spec §12) — roles are by *environment*, not seniority:

| Actor | Where | Owns |
|---|---|---|
| **Architect** (the owner/human) | — | Contracts, scope, AEC correctness, merge arbitration. **All contract changes and all commits/pushes are owner-gated.** |
| **Amer** (agent) | Local PC, **real browser** | Browser hot path: three.js/WebGPU, tessellation consumer + picking, React shell, ribbon/property panels, persistence adapters, service worker/PWA, `window.bunyan` wiring. |
| **Zayd** (agent) | Hetzner dev box, **headless** | Kernel: OCCT WASM builds, worker API, naming resolver, regression harness + offline golden seeding, IFC importer, CI, release pipeline. **And (Entry 18) the document model — `@bunyan/document`.** |

Also read the box-local `../cross_projects_policy.md` and `../last_session_work.md` **if you are on
the dev box** (they are not in this repo and do not travel).

---

## §1 — Where the build is right now

**Phase: P2 is CLOSED. ✅ P3 — THE DOCUMENT MODEL — IS BUILT, CORRECTED AND CLOSED (Entry 21).**
**✅ THE PROTOCOL IS FROZEN** (P3 step 8). The type contracts freeze at P5.
**⚠⚠ P4 IS OPEN, REVIEWED, AND IT GREW A PHASE — SEE ENTRY 24 AND `review_P4.md`.**

> ## ⚠⚠ **THE P4 REVIEW (Entry 24, 2026-07-14, `review_P4.md`) — FOUR OWNER RULINGS, AND THE HEADLINE IS NOT A BUG.**
>
> **The owner found the UI primitive next to ArchiCAD/Revit. He was right, and the cause is NOT in Amer's React
> — it is in the DOCUMENTS.** There is **no interaction model in any of the four contract documents.** The only
> one ever written down is *"button/drag → Command"*, which describes how an action **reaches** the model, not
> how a human **authors a building**. **`snap` · `inference` · `preview` · `hover` · `gizmo` · `tool state`
> appear NOWHERE in the repo** (every "snap" hit is *"snapshot"*). ⇒ **Amer built, faithfully and well, exactly
> what the plan describes — and what the plan describes is a form over a command registry.** *To place a window
> today a human must hand-type `wall-01J8Z3….finish.interior/face/y-min#0` into a text box.*
>
> **⇒ THE DIAGNOSIS, IN ONE SENTENCE: `argsSchema` IS A MACHINE-READABLE CONTRACT FOR AN AGENT, AND THE APP IS
> USING IT AS A UI SPECIFICATION FOR A HUMAN.** D21 is right for the property panel and right for the agent tool
> list; **for the RIBBON it silently substituted a *form* for a *tool*.**
>
> **THE FOUR RULINGS (owner, 2026-07-14):**
> 1. **✅ A NEW PHASE — `P4.5 — THE INTERACTION MODEL` — LANDS BEFORE THE P5 FREEZE.** The tool state machine, snapping,
>    the preview, numeric entry, **the spatial-query seam none of the three existing seams provides** — and it
>    **reserves the command shapes** (`move`/`setPlacement`, the baseline-driven Wall) *while the contracts are still soft.*
>    ⚠ **`Command`/`BimObjectType` freeze at P5; a `Command` whose `argsSchema` has never been driven by a pointing
>    device is a `Command` frozen against a guess.**
> 2. **✅ THE INTERACTIVE TARGET IS `10,000+` ELEMENTS — a BINDING budget.** ⚠ **The current architecture misses it by
>    1–2 orders of magnitude on three measured axes, and the fourth is UNMEASURED (see §1a).**
> 3. **✅ DRAWINGS STAY v1.0.x — BUT THEIR CONTRACTS ARE RESERVED BEFORE THE FREEZE** (plan P5 step 6b). *"2D is additive"*
>    has been asserted in the spec for months and **never once checked against a contract.**
> 4. **✅ THE FIXES LIVE IN `v1.0.0_imp_plan.md`, NOT IN A SEPARATE CORRECTION DOC.** Unlike P3 (revert-verifiable bugs in
>    shipped code ⇒ it earned `P3_correction_plan.md`), **most of these findings are UNBUILT WORK, and unbuilt work belongs
>    in the plan as steps with exit criteria.** A parallel fixes list is a **second description of one body of work** —
>    exactly what rule 10 and D21 forbid. **`review_P4.md` is the EVIDENCE; the plan is the WORK.**

### §1a — ⚠⚠ THE FOUR NUMBERS THAT PRICE P4, AND WHY THE PERFORMANCE STRATEGY WAS AIMED AT THE WRONG HALF

**Measured against the real OCCT WASM on the same 5-storey building the D29 measurement uses (`review_P4.md` §4):**

```
                              rebuild 1 wall   REDRAW ALL (as built)   redraw only the changed wall   TOTAL/EDIT
  39 elements /  62 solids        102 ms              175 ms                    10.4 ms                 277 ms
 117 elements / 186 solids        124 ms              538 ms                    17.2 ms                 662 ms
 195 elements / 310 solids        100 ms              865 ms                    12.0 ms                 965 ms
```

**Read the columns, not the rows.** The **rebuild is FLAT** (it is always one wall). The **redraw grows LINEARLY with
the whole model** (~2.8 ms/solid), because `App.tsx` re-tessellates **every part of every element on every edit**.
At 195 elements, **865 of the 965 ms an edit costs is re-drawing 309 solids that did not change.**

> ## ⚠⚠ **AND THIS IS THE STRATEGIC FINDING, NOT THE PERFORMANCE ONE:**
> **All three of this project's performance levers — the D29 BREP cache (RULED SHIP), `instantiate` (RESERVED IN THE
> FROZEN PROTOCOL), and multithreading (v1.0.x) — attack the KERNEL REBUILD. NOT ONE OF THEM TOUCHES THIS.** After
> `instantiate` collapses 400 booleans to one, a single-element edit on a 195-element building **still costs ~865 ms**,
> and the temptation will be to conclude the kernel is *still* too slow and reach for threads. **The dominant interactive
> cost in the app as built is not in the kernel at all** — and it was invisible because **every measurement this project
> has ever taken was taken BELOW the renderer.**

**Extrapolated to the owner's 10,000-element target (~16,000 solids), from the measured linearity:**

```
  ONE PARAMETER EDIT (redraw all, as built) ......  ~45 SECONDS
  COLD LOAD from scene.json, no cache ............  ~6.3 MINUTES   (37.6 ms/element, D29 §4j)
  DRAW CALLS (one THREE.Mesh per part) ...........  ~16,000        (~10–20× a 60 fps budget)
  WASM HEAP (every solid stays live, nothing evicts) ⚠⚠ UNMEASURED — AND IT IS THE MOST DANGEROUS UNKNOWN IN THE PROJECT
```

⚠ **The heap number is a RELEASE GATE and a CONTRACT question, not a renderer one:** *what may be released and rebuilt on
demand* is a question about the recipe and the rebuild engine ⇒ **it touches the contracts, so it must be known BEFORE P5
FREEZES.** **Plan P4 step 9 (the scale harness) exists to produce all four numbers. Do not design the renderer without them.**

> ## ✅ **THE SIX P3 DEFECTS ARE FIXED, AND EVERY FIX WAS VERIFIED BY REVERTING IT** (Entry 21).
> The review (Entry 19, `review_P3.md`) found six defects behind a green suite; the owner ruled seven
> decisions on them (D40–D46, Entry 20); **Entry 21 executed all of `P3_correction_plan.md`.** The headline is
> closed: **the Clean Delta IS now computable from a `.bnn`** — the change feed is an **append-only JOURNAL**
> with a monotonic `seq`, and a Revision records its **`issued_at_seq`**, so *"what changed since revision N?"*
> is `journal.filter(e => e.seq > revN.issued_at_seq)` — **read, not inferred.**
>
> ⚠ **The method that made this real, and it is now standing policy:** *for every exit criterion, read the test
> that discharges it and ask what it would take for that test to pass while the criterion is FALSE.* **Two of the
> six defects existed because a green, well-named test asserted something weaker than its own title.** Both tests
> were **rewritten, not supplemented** — and **all eleven fixes were then re-verified by reverting the fix and
> watching the test fail.** *A fix without a test that fails in its absence is an assertion.*

```
pnpm verify  →  typecheck (strict) ✓   eslint ✓   186/186 tests ✓   prettier ✓     (was 169/169)
                └─ ALL FIVE CI STEPS PASS ON THIS BOX.
                   Kernel goldens run TWICE (mock + REAL OCCT 7.9.3): a cylinder, a window cut clean
                   through a wall, a fillet, a rotated wall, a mirrored wall, an L-shaped slab, a slab
                   with a CURVED EDGE, a revolved column, a hollow tube, a HEMISPHERE and a DUCT
                   DRILLED THROUGH A ROUND COLUMN — each against a NATIVE OCCT reference *and* an
                   independent closed form.
                   Document tests run against the REAL OCCT KERNEL, never the mock.
```

**What exists now, end to end:** the protocol seam (**FROZEN**: 18 live ops + **5 RESERVED**) · the OCCT WASM
kernel · the naming resolver · the golden harness · **the parametric truth layer `@bunyan/document`** —
parts-aware scene graph, ElementStyle, the six registries, the Command layer, **the append-only journal +
`core.issueRevision`**, the **transactional (staged) rebuild + universal `dryRun`**, undo as state deltas,
the broken-reference state, **the unbuildable-element state**, the agent surface, and the `.bnn` format.

**What does NOT exist:** browser storage (FSA/OPFS/IndexedDB — behind a `StorageAdapter` seam),
sub-shape picking, 2D views, IFC import, the Clean Delta exporter, **and the
`geometry-cache.brep` bodies (D29 is RULED SHIP and its ops are RESERVED — see §4j-2).** ⚠ **`apps/web`
EXISTS (Entry 22 foundation + Entry 23):** the D19 bootstrap, a read-only render seam, a WebGL2 three.js
viewport, **a registry-generated ribbon (`describeCommands`) + command dialog, and a schema-driven
property panel that makes the scaffold wall EDITABLE** — a param edit → `core.setParams` → OCCT rebuild
→ re-tessellate, `coalesceKey` on drags. All verified in a real browser on the REAL OCCT kernel. **The
rest of P4/P5 is still owed — see Entry 23 §5 (items 3–6).**

### ✅ THE FIVE THINGS THAT WERE OWED — ALL FIVE ARE DISCHARGED (Entry 21)

| | Was owed | Status |
|---|---|---|
| 1 | **D40 — the change feed / the moat** | ✅ **BUILT.** An append-only `Journal` (`seq`, never trimmed, an undo appends a **REVERSAL**); `ModelRevision` carries **`issued_at_seq`**; `doc.changeFeed()` and `doc.changesSince(rev)`. **Tested: 250+ edits, an undo, two revisions, save→reload — nothing dropped.** |
| 2 | **D41 — is issuing a Command?** | ✅ **BUILT.** `core.issueRevision` is in `CORE_COMMANDS`; **an agent can now release a building through `window.bunyan` alone.** `issue()` is deleted from `bnn.ts`. |
| 3 | **D29 — the BREP cache ruling** | ✅ **RULED BY THE OWNER, 2026-07-14: IT SHIPS.** Made *with* the number, exactly as the deferral intended. ⚠ **Ops RESERVED pre-freeze (`exportBrep`/`importBrep`/`CACHE_STALE`); bodies are the NEXT Zayd work item.** The identity trap it opens, and the design that closes it, are in **§4j-2 — read that before writing a line of it.** |
| 4 | **The style-edit performance cliff (~21 s)** | ✅ **RULED, 2026-07-14.** **`instantiate` is RESERVED** (the shape agreed while the protocol was soft — its whole point). **`-O3`/LTO authorised and measured** (§4j-3). Multithreading stays v1.0.x. |
| 5 | **The protocol freeze** | ✅ **FROZEN** (P3 step 8). **18 live ops + 5 RESERVED** (`sectionCut`, `importIfc`, `instantiate`, `exportBrep`, `importBrep`) + the `CACHE_STALE` failure code. Adding an op remains additive and permitted (D13); **changing an existing op's envelope now needs Architect sign-off.** |

### ⚠ SEVEN THINGS A FRESH AGENT MUST NOT REDISCOVER THE HARD WAY

1. **`opencascade.js` CANNOT be linked on this box — and we do not use it.** Its `-flto` object cache
   forces a whole-program-optimisation link that is **OOM-killed at a 2 GB cap even for a 6-symbol
   build** (Entry 3). **Do not retry it. Do not fork it.** We build **upstream OCCT 7.9.3** with
   **LTO off** — recipe in **`tools/kernel-build/`**, and it builds *here*, on this box.
2. **`/tmp` is a tmpfs — it costs RAM, not disk.** A dead session's scratchpad once held **1.1 GB of
   RAM** hostage. Before invoking §6a to pause another project's containers, run `du -sh /tmp` — our
   own tooling is usually the hog. (All other projects' containers **combined** use ~77 MB.)
3. **You do NOT need a 2.5 h rebuild to change the kernel's C++.** OCCT's static libs are already
   built at `/home/devuser/occt-wasm-spike/install` (18 libs, 119 MB). Changing `src/kernel.cpp` is a
   **single-file compile + link — about 60 seconds** (§6). Only an *OCCT version bump* costs 2.5 h.
4. **OCCT's `Left/Right/Front/Back` do NOT mean what they sound like.** Measured:
   **`BackFace()` = x-min, `FrontFace()` = x-max, `LeftFace()` = y-min, `RightFace()` = y-max.**
   Guessing that table mislabels four of a box's six faces, and **nothing fails**: the geometry is
   perfect and only the *names* are wrong. `occt-kernel.test.ts` re-measures it every run.
5. **The naming literature is WRONG about OCCT 7.9.3, and we MEASURED it (D24).** Boolean history is
   **complete** — zero orphans. The weak spot is the **fillet**. And the relation everyone misses is
   **identity**: `Modified()` reports only *splits*, so an untouched face appears in **no history list
   at all** — that silence means *"unchanged"*, not *"unknown"*. **Do not re-derive this from the
   docs; re-run the probe** (`tools/kernel-build/probe.cpp`, ~60 s).
6. **⚠⚠ THE PROBE ONLY MEASURES THE SHAPES YOU THINK TO CUT — and this has now cost us FIVE times.**
   Entry 9 declared naming done; Entry 11 cut a **groove** across a wall (a chase — an utterly
   ordinary BIM operation) and the kernel **REFUSED IT**. Entry 14 said the symmetric tie was "the
   duct's two rims" — true only if the duct **misses the cylinder's seam** (OCCT puts it on the +X
   meridian, so a duct along X splits the rim and yields *three* edges; Entry 14's own test cut along
   X and pinned the wrong pair). **Even a measured, written-down finding describes only the shape
   someone actually cut.** Before trusting naming on a shape class nobody has cut yet, **cut it.**
7. **⚠⚠ A PHASE'S EXIT CRITERIA ARE A SPECIFICATION, NOT A SUMMARY OF WHAT GOT DONE.** P2 step 1 said,
   in writing: *"make box/cylinder/**prism**, **extrude a profile**, **revolve**, boolean,
   **fillet/chamfer**"*. **`extrude`, `chamfer` and `revolve` were never built** — and P2 was declared
   complete **twice**, by two sessions, with a green suite each time. Nothing caught it because
   **every test built its walls out of boxes**, and a box needs no `extrude`. It surfaced only when
   Entry 12 sat down to **model an actual building** and could not build the **floor plate**.
   ⇒ **Before declaring a phase done, read its own step list against the code.** It takes a minute.
   This one went unread for a month.

**⚠ AND THE METHOD THAT FOUND EVERY GAP THIS PROJECT HAS EVER HAD — it is not reading:**

| Gap | Found by |
|---|---|
| **`at`** (placement) | a boolean could otherwise only bite a *corner* off a wall — a window in the middle was unreachable |
| **the split-face naming bug** | cutting a **groove** across a wall, because that is what buildings have |
| **`extrude` / `chamfer`** | trying to model a **floor plate**, and finding a Slab cannot be a rectangle |
| **the SYMMETRIC-TIE hole** (D28) | cutting a duct through a **round column**. Reachable since Entry 9; five sessions missed it, because **every boolean ever tested cut a BOX** |
| **our `bounds` was LOOSE on curves** (`Add` bounds a spline by its CONTROL POLYGON) | gating that round column against the native-OCCT oracle. Invisible for seven entries: on a box/cylinder/plane, `Add` and `AddOptimal` agree exactly |
| **the whole modelling layer** (D30–D33) | reading the product **against its own ambition** instead of against its own spec |
| **the ecosystem joint** (D34–D38) | reading the product **against its neighbours** (Planitor, BIMsync) |
| **the STYLE-EDIT PERFORMANCE CLIFF** (§4j) | building a real 195-element building and **timing it** |
| **THE SIX P3 DEFECTS** (Entry 19, §4k) — the change feed, the reused PEI, the half-rolled-back rebuild, the unopenable file, the stale autosave, the `exact` 0 kg | **driving the document API at its FAILURE boundaries** — deleting then reloading; crashing *twice*; failing a rebuild *midway*; loading a file with a type we do not have. ⚠ **Every happy path was already green.** |
| **⚠ THE `BuildContext` HEAP-LEAK HOLE** (Entry 21) — a Type that runs **two** kernel ops per part had **no way to declare its intermediate**, and leaked one OCCT solid per part per rebuild | **writing ONE new fixture type that does what a real type does** (a wall with a rounded corner: box → fillet). **Every fixture until then ran exactly ONE op per part**, so nothing had ever needed it. ⚠ **`BimObjectType` freezes at P5, and P5's real Wall/Slab/Opening will ALL run two or more ops.** |

**⇒ Keep modelling real buildings with the API. The next gap is out there. (It has found NINE.)**

**⚠⚠ AND ENTRY 19 ADDS A SECOND METHOD, BECAUSE IT FOUND WHAT MODELLING WOULD NOT HAVE:**

> **A GREEN TEST PROVES ONLY WHAT IT ASSERTS — AND TWO OF OURS ASSERT SOMETHING WEAKER THAN THEIR OWN TITLE.**
> The *"reject + keep last-good"* test failed in the **schema**, before the kernel was ever called — so the
> geometry-failure path, *the one the rule is about*, was never exercised (and it was broken). The *autosave*
> test called `latest()` on **the same instance that wrote the snapshots** — so the second session, *the only
> situation autosave exists for*, was never opened (and it recovered stale work). **Both would have passed
> forever.** ⇒ **For every exit criterion, read the test that discharges it and ask: what would it take for
> this test to pass while the criterion is FALSE?**
>
> **✅ Both were rewritten in Entry 21 — and then EVERY fix was reverted, one at a time, to watch its test
> fail. All eleven did.** ⚠ **Make that the habit, not the ceremony:** *a fix without a test that fails in
> its absence is an assertion.*

**⚠⚠ AND ENTRY 21 ADDS A THIRD, WHICH IS ABOUT DECISIONS RATHER THAN CODE:**

> **WHEN A DECISION IS FRAMED AS A TRADE-OFF, CHECK WHAT IT COSTS THE *INVARIANT* — NOT JUST THE SCHEDULE.**
> "Ship the BREP cache" read as a pure performance call. It is not: **a `.brep` stores shapes and not their
> names**, so a cached load must re-attach every `SubShapeRef` — **a persisted name→shape index, which is
> precisely the "token map" D1 forbids and the spec had just deleted.** Nobody asked for a token map; it
> arrived as a *consequence*, and it would have been written quietly by whoever picked the cache up as a
> serialization ticket. **The performance question was answerable in an afternoon. The identity question it
> dragged in behind it could have repealed D1.** *(Design: §4j-2. It survives only because a cache that
> cannot verify itself now REFUSES rather than guesses.)*

---

## §2 — Contract status (get this wrong and you break the build model)

The **split contract-freeze** (D13) is the rule that lets Amer and Zayd work in parallel.

| Contract | Status | Freezes |
|---|---|---|
| **Kernel message protocol** (`@bunyan/protocol`) | **✅ FROZEN, v1 (Entry 21, P3 step 8)** — **18 live ops + 5 RESERVED** + the `CACHE_STALE` failure code. Reserved (declared, typed, deliberately unimplemented, so a later phase never opens by amending a frozen contract): **`sectionCut`** · **`importIfc`** (P6) · **`instantiate`** (the ~21 s style-edit answer — §4j-3) · **`exportBrep`** + **`importBrep`** (the D29 geometry cache — **RULED SHIP**, §4j-2). Pre-freeze debt from P2 is **ZERO**. ⚠ **The document model (P3) needed NO protocol change** — the proof D30–D38 were as cheap as claimed; **every one of P3's six defects was fixed without touching it either.** | **✅ FROZEN.** Changing an existing op's envelope now needs **Architect sign-off**; **adding a new op stays additive and permitted** (D13, as re-worded Entry 15). |
| **`SubShapeRef`** | **Release-candidate** — now exercised by the real kernel **and by the document model** (a window survives a save→load→rebuild, and a 30° rotation) | **P5** |
| **`BimObjectType`** | **✅ WRITTEN (Entry 18), CORRECTED (Entry 21)** — `packages/document/src/types.ts`. Carries `parameterSchema`, `styleSchema`, `defaultClassification`, **`defaultDiscipline` (D45)**, `buildGeometry → Part[]` (D30), `buildVoid` (hosted), `migrate`. ⚠⚠ **AND `BuildContext.discard(handle)` — NEW, and it is a REAL FIX:** every fixture type ran exactly **one** kernel op per part, so nothing had ever needed to declare an intermediate — and **the first Type to run two (box → fillet) leaked four OCCT solids per rebuild.** **P5's real Wall/Slab/Opening will all run two or more** (extrude→chamfer, box→fillet). ⚠ **Declare BEFORE the risky op**, never after: `discard` only *declares* (the engine frees at the end of the rebuild), so the handle is still a valid operand — declare it afterwards and a kernel refusal throws straight past the declaration, leaking on exactly the path where a leak is hardest to see. Release-candidate. | **P5** (⚠ freeze it against a **composite, styled** wall — a single-solid wall would validate a contract the product cannot use) |
| **`Command`** | **✅ WRITTEN (Entry 18)** — carries an **`argsSchema`** and `execute` **returns** its `UndoableEdit`. It is **the agent API** (§4f). | **P5** (**with** its `argsSchema`) |
| **`ElementStyle` / `Part` / `Material` / `Section` / spatial tree** | **✅ WRITTEN (Entry 18)** — `scene.json` is `packages/document/src/scene.ts`. | **P5** |
| **Agent surface** (`window.bunyan`) | **✅ WRITTEN (Entry 18)** as a pure module (`createAgentSurface`). **Versioned separately** (`agentApi: 1`) — does **not** inherit the P5 freeze (D22). Amer wires `window.bunyan = createAgentSurface(doc)`. | Never frozen with the type contracts; evolves on its own clock. |
| **`.bnn`** | **✅ WRITTEN (Entry 18) AND FINISHED (Entry 21) — every ruling D40–D45 is now code.** Zip of `manifest.json` + `scene.json` + `history.json` + optional `thumbnail.png`. **`history.json` IS THE JOURNAL** (append-only, `seq`, never trimmed — **not** the undo stack; an undo appends a **REVERSAL**); `manifest.revision` carries **`issued_at_seq`**; element ids are **prefixed ULIDs** (D44); the layer stack carries **`discipline`** and `classification` has lost it (D45); an **unknown or FUTURE-typed element round-trips VERBATIM** (D43); a **future `schemaVersion` is a typed refusal naming the version**; the hostile guard validates **shapes, not `typeof`** (`typeof null === 'object'`). ⚠ **The spec's `token map` claim is DELETED** (there was never any code). ⚠ **`geometry-cache.brep` — D29 RULED SHIP (2026-07-14); ops RESERVED, bodies NOT written. It is purely additive to the zip, so it breaks no saved file when it lands.** | **P5** |

---

## §3 — What exists, and how it was verified

```
packages/
  protocol/       @bunyan/protocol      the flat versioned message contract (zero deps). 18 ops + 2 reserved.
  kernel-core/    @bunyan/kernel-core   KernelHost (dispatch + failure marshalling) + ShapeRegistry
  kernel-mock/    @bunyan/kernel-mock   protocol-conformant fake kernel + Worker entry
                    ⚠ NO booleans — it says so in `capabilities` rather than faking one.
  kernel-occt/    @bunyan/kernel-occt   ★ THE REAL KERNEL — OCCT 7.9.3 in WASM + Worker entry
                    src/kernel.ts         the adapter: C++ STRUCTURE -> Bunyan IDENTITIES
                    src/naming.ts       ★ THE RESOLVER (D1/D24): 4 relations, no geometry, ever
                    wasm/bunyan-kernel.*  the COMMITTED artifact (14.59 MB / 4.19 MB gzip, -O3) + its .d.ts
  kernel-client/  @bunyan/kernel-client KernelClient + WorkerTransport / InProcessTransport
  document/     ★ @bunyan/document      THE PARAMETRIC TRUTH LAYER (Entry 18; CORRECTED Entry 21)
                    entities.ts    Element/Part/ElementStyle/Material/Section/spatial tree/Grid (D30-D36)
                                     ⚠ Part carries `discipline` (D45). Classification = {ifcClass,loadBearing}.
                    scene.ts       ★ THIS OBJECT *IS* scene.json. Plus SceneChange (the undo delta).
                    schema.ts      ParamSchema — ONE language, THREE consumers: property panel,
                                     ribbon, AGENT TOOL LIST (D21)
                    registries.ts  the SIX registries + the GENERATED capability projection
                                     ⚠ SIX, not seven — the 7th ("naming resolver") is the KERNEL's.
                    types.ts       BimObjectType (buildGeometry -> Part[], buildVoid, migrate,
                                     defaultDiscipline) ⚠ + BuildContext.discard() — a Type that runs
                                     TWO ops per part MUST declare its intermediate, or it leaks (Entry 21).
                    ulid.ts      ★ D44 — the PEI is a prefixed, monotonic ULID. No counter, ever.
                    revision.ts  ★ ModelRevision + issued_at_seq (D34/D40). Minted ONLY by the command.
                    commands.ts    the Command layer — THE agent API (D19). 12 core commands
                                     (⚠ + core.issueRevision, D41).
                    build.ts       ★ the rebuild engine: base parts -> resolve hostRef -> cut EVERY
                                     layer -> PLACE LAST. Broken refs. UNBUILDABLE types (D43).
                    document.ts    ★ DocumentContext — THE ONLY DOOR (D19). Owns scene + heap + undo +
                                     ⚠ THE JOURNAL + the revision. STAGED, all-or-nothing rebuild + dryRun (D42).
                    undo.ts        UndoableEdit (STATE DELTAS, never replay) + ⚠ THE JOURNAL — append-only,
                                     `seq`, never trimmed, an undo appends a REVERSAL. NOT the undo stack (D40).
                    agent.ts       createAgentSurface() — `agentApi: 1`, a thin shim, no browser
                    bnn.ts         the .bnn codec + migration + StorageAdapter + Autosave
                    geometry.ts    ★ GeometryGateway — the narrow seam that makes D19 STRUCTURAL
tests/            186 tests + tests/goldens/geometry.golden.json + tests/harness/measure.ts
                  [kernel]   golden-box · golden-hard-geometry · golden-extrude · golden-revolve ·
                             golden-transform · naming-{hard-topology,extrude,revolve,transform} ·
                             geometry-queries · occt-kernel · quantities-and-contract · protocol ·
                             provenance · kernel-host · kernel-client
                  [document — ⚠ ALL AGAINST THE REAL OCCT KERNEL, never the mock]
                  document-model         ★ the composite wall; the style edit that rebuilds every
                                           instance; "HOW MUCH PLASTER IS ON THIS WALL?"
                  document-openings      ★ a window through ALL THREE LAYERS of a wall ROTATED 30°;
                                           cascade delete (D39); THE BROKEN-REF STATE; no heap leak
                  document-agent         ★ an agent builds a building through the SURFACE ALONE
                  document-persistence   ★ save→reload→identical geometry; issue != save; migration;
                                           autosave recovery; a hostile .bnn
                  document-scale         ★ THE D29 MEASUREMENT — a 5-storey building
                  document-integrity     ★ NEW (Entry 21) — THE INTEGRITY GATES. ⚠ Not one of these was a
                                           CRASH: every one produced a plausible, confident, WRONG answer
                                           (a wall on the wrong floor; 0 kg stamped `exact`; two faces
                                           answering to one token; a dead element's id on a living one).
                  d19-boundary           ★ the MACHINE check: the kernel has exactly one door
                  fixtures/bim-types.ts    the fixture Wall/Slab/LinearMember/Opening
                                           ⚠ NOT the shipped types — those are P5. These exercise the
                                             registry contract and give D29 a building to measure.
tools/kernel-build/ the OCCT->WASM recipe (README + configure.sh + src/kernel.cpp + link.sh + verify.mjs)
                    src/probe.cpp + probe.sh + probe-history.mjs  ★ THE NAMING PROBE. Re-run it before
                    changing any naming rule — ~60 s.
tools/oracle/     Python (uv): offline golden seeding — analytic + native-OCCT cross-check
scripts/          check-reseed.mjs (the re-seed CI gate)
.github/workflows/ci.yml
```

### The architectural decision that shapes everything

**The kernel is transport-agnostic.** `KernelHost.handle(request) → response` is a pure function that
knows nothing about Workers, `postMessage` or the DOM. The Worker file is a ~10-line shim. Payoffs:
the whole seam is **testable headlessly in Node** (which is why 169 tests run on a box with no
browser, and why CI needs none); the **headless/server-side kernel north-star** is a change of
`Transport` and nothing else; and the mock and the real kernel are the **same interface**.

### ⚠ FOUR MORE OCCT TRAPS — ALL SILENT, ALL CAUGHT BY THE HARNESS *(plus §1's trap 4)*

Every one was **OUR misuse of an OCCT API, never an OCCT defect** — exactly the class §9.0 says the
harness exists for. ⚠ **§4j breaks that streak: the boolean's cost is real OCCT work.**

1. **OCCT's bounding box is TOLERANT, not tight.** `BRepBndLib::Add` enlarges by the shape tolerance,
   so a box on the origin reports `xMin = -1e-7`. The spec wants the tight box ⇒ `box.SetGap(0.0)`.
2. **`LinearProperties` on a *solid* sums each edge once per adjoining face** — reporting 45,600 mm of
   edge for a box whose edges total 22,800. A test pins that number and explicitly asserts it is not
   the double-count.
3. **`BRepBndLib::Add` bounds a curve by its CONTROL POLYGON** — a spline's control points lie
   *outside* the curve, so a column of radius 400 reported `x-min = -400.0071`. Now `AddOptimal`.
4. **A full 360° revolve has NO CAPS — and `FirstShape()`/`LastShape()` do not return null**, they
   return a face **that is not in the result**. So the check is *"is it in the result"*, never *"is it
   null"*. And **a segment perpendicular to the axis reports NO HISTORY AT ALL while its face sits in
   the result** — the flat bottom of every column. Those faces are named from the circles their
   endpoint vertices sweep.

### Verified — the kernel (Zayd, dev box, headless)

- **Protocol v1**: envelope, 15 typed failure codes, `SubShapeRef` encode/decode/compare, mesh +
  provenance channel, op map. **A malformed `scene.json` cannot yield a valid ref** (hostile-token test).
- **Typed failures (D10)**: `handle()` **never throws** — including on a **non-Error throw** (OCCT throws
  bare integers; the naive `catch (e: Error)` would drop it).
- **Persistent naming (D1) on real topology.** Faces named from the operation's **own semantic
  accessors**, never coordinates; edges named **structurally**, as the canonical pair of the two faces
  that generate them; sub-shapes **canonically re-sorted before identities are assigned** (D8). Survives
  two windows + a resize, and a fillet on an edge a boolean created.
- **⚠ The mock and the real kernel emit BYTE-IDENTICAL refs.** Pinned by a test — this is what makes the
  mock→OCCT swap a one-line change for Amer.
- **`measure` is exact** (`BRepGProp`, not the mesh) and takes an optional **`ref`** (the paint area of a
  wall face). **`capabilities` is DERIVED** from the handler map. **`INVALID_RESULT`** is emitted:
  `BRepCheck_Analyzer` gates the *output* of boolean/fillet/chamfer/revolve.
- **The WASM heap does not leak**: the test asserts our registry against **`wasmLiveHandles()`, the WASM
  side's own independent count** (a registry agreeing with itself proves nothing).
- **One JS↔WASM crossing per op, not per element** — `tessellate` hands JS zero-copy `typed_memory_view`s
  (~1.8 M crossings/tessellation avoided). ⚠ They die on the next call; the adapter copies them out.
- **D28 — the bounded positional key.** A duct cuts **clean through a round column**. The key **orders**
  two sub-shapes structure has already proven interchangeable, by their **mm-rounded centroid**; it
  **never identifies** one. Third sort term, after derivation and structural signature have both tied.
  **The only place geometry touches the identity path.** A grid collision is still **refused**.
  ⚠ **Bounded structurally: `transform` mints no identities ⇒ the key runs in the element's OWN BUILD
  FRAME — moving a column in the world cannot re-rank anything.**

### Verified — the document model (Zayd, dev box, headless, 2026-07-13, Entry 18) — ALL vs REAL OCCT

- **D30 — an element is its PARTS.** A wall is 3 solids, ordered, each with its own material and its
  own DAG node (`wall-1.structure`). **"How much plaster is on this wall?"** returns 135 kg, from the
  B-Rep and the material's own density.
- **D31 — a style edit rebuilds every instance.** One `core.updateStyle` → all walls wearing it are
  genuinely thicker **in the B-Rep**, and the returned edit *knows* which ones it touched.
- **An opening cuts through EVERY layer** — each of the 3 loses exactly `w × h × its own thickness`.
- **⚠ A window through all three layers of a wall ROTATED 30°** — volumes **identical** to the
  straight wall, host-face token **byte-identical**. Because the wall is built and cut in its **own
  frame** and **placed last** (`transform` mints no identities, D25). *(This was "the shape nobody had
  cut". It worked. No new gap — the first time that has happened.)*
- **D39 — cascade delete.** Deleting a wall deletes its windows in **ONE** undoable edit; undo brings
  back all three. ⚠ **`planDelete()` is now DELETED (D42)** — the warn-first answer is
  `execute('core.deleteElement', args, { dryRun: true })`, whose would-be edit already lists the cascade.
- **⚠ THE BROKEN-REFERENCE STATE EXISTS AT LAST (domain rule 3).** A ref whose target is gone is
  **marked, visible, and never auto-healed**; **the host still builds** (without the hole); **the
  document still loads and still edits** while carrying it; and the **only** way out is manual
  retargeting, which is itself an `UndoableEdit`.
- **Reject + keep last-good (rule 4)**: a failed command returns **no** edit and the geometry is
  untouched — not half-rebuilt.
- **No heap leak through the document**: 20 parameter edits on a 3-layer wall with a window leave
  **exactly** the same number of live OCCT solids.
- **Save → reload in a fresh session → identical parametric state AND identical geometry**, from
  `scene.json` **alone, with no cache**. The window survives. The document is still **editable**.
- **Saving is not issuing** (D34); the revision chain links snapshots on one lineage.
- **Migration**: a type-version bump rewrites old params on load and the old file still **builds**.
- **Autosave** recovers a crashed session — and recovery is an **ordinary load of an ordinary `.bnn`**,
  not a second, lesser format.
- **D19 is a MACHINE check**: `packages/document` does not even **depend** on `@bunyan/kernel-client`
  (it takes a narrow `GeometryGateway`), and a grep gate covers `apps/` where a package boundary cannot.

### NOT verified / NOT built (do not assume otherwise)

- **No browser app.** `apps/web` does not exist. Deliberate: the browser hot path is Amer's, and it
  cannot be verified headlessly.
- **No browser storage.** File System Access API / OPFS / IndexedDB are behind `StorageAdapter`
  (`bnn.ts`), with a `MemoryStore` keeping the seam honest and tested here. **Amer implements them
  where they can actually be exercised.**
- **No `geometry-cache.brep`** — zero code, never had any. **D29, §4j. The measurement is in; the
  ruling is not.**
- **No sweep along a path, no loft.** Not in Bunyan v1.0.0 scope.
- **No 2D views, no IFC import** (P6; both ops are RESERVED in the protocol).
- **No Clean Delta exporter** (D34/D36, P6) and **no Clean Delta JSON Schema agreed across the three
  repos** — Entry 17 called this "the contract that carries money."
- **No LICENSE / CLA / OCCT attribution file yet** (§4e — must land before the repo goes public).
- **No service worker / PWA, no Cloudflare Pages deploy** (P1 steps 6–7, Amer's).

---

## §4 — Decisions

### 4a — The decision index (D1–D39)

| # | Ruling (one line) |
|---|---|
| D1 | **Persistent naming**: identity is a derivation path from the op DAG, never a geometric index. The #1 risk. |
| D3 | IFC **import** only in v1.0.0; export v1.0.x. |
| D8 | Canonical re-sort before identities are assigned. *(Deferred with MT — still required when MT lands.)* |
| D9 | **We trust OCCT; we verify our own code.** See 4b. |
| D10 | Typed-failure contract: the kernel never throws; a failed op yields no edit. |
| D11 | Offline-first; the service worker caches the kernel once. |
| D13 | **The freeze's meaning**: *adding* an op is additive and permitted; *changing an existing op's envelope* needs sign-off. And `sectionCut`/`importIfc` are **RESERVED**. |
| D14 | The WASM module *is* the kernel — JS never touches OCCT. |
| D15 | **Bunyan is open source: AGPL-3.0 + commercial.** See 4e. |
| D16 | IFC import via **IfcOpenShell** → exact B-Rep solids. `web-ifc` (mesh-only) **rejected**. |
| D19–D23 | **Bunyan is agent-native.** See 4f. |
| D24 | Measured OCCT history behaviour (boolean complete; fillet weak; silence = unchanged). |
| D25 | **`transform` mints NO identities** — a rigid motion is a topological isomorphism. Load-bearing. |
| D26 | `extrude`/`revolve` name `lateral.k` after the **authored segment** — drag a corner, re-target nothing. |
| D27 | `revolve` — GenericSolid's other half. |
| D28 | **The bounded positional key.** See §3. |
| D29 | **✅ RULED (2026-07-14): THE BREP CACHE SHIPS.** ⚠⚠ **And it is an IDENTITY task, not a serializer task** — a `.brep` has no names in it. Bind by CANONICAL ORDER, VERIFY a fingerprint, refuse with `CACHE_STALE` rather than mis-name. **Ops RESERVED; bodies NOT written. READ §4j-2 BEFORE IMPLEMENTING.** |
| D30–D33 | **The modelling layer.** See 4h. |
| D34–D38 | **The ecosystem.** See 4i. |
| **D39** | **⚠ NEW — cascade delete.** See 4j. |
| **D40** | **✅ RULED — THE CHANGE FEED IS AN APPEND-ONLY JOURNAL, NOT THE UNDO STACK.** `seq` per edit · `issued_at_seq` per revision · never trimmed · an undo appends a **REVERSAL**. *The delta is `journal.filter(e => e.seq > revN.issued_at_seq)` — read, not inferred, by construction.* See 4k. |
| **D41** | **✅ RULED — `core.issueRevision` IS A COMMAND.** An actor that can author a building can release one (rule 9). `DocumentContext` owns the revision. |
| **D42** | **✅ RULED — rule 4 is ALL-OR-NOTHING by construction + a UNIVERSAL `dryRun` on the executor** (full fidelity, real kernel, result discarded, returns the would-be `UndoableEdit` or the failure naming the offender). ⚠ **`planDelete()` is DELETED** — a hand-written `plan…()` beside every verb is a second description of one behaviour (D21). |
| **D43** | **✅ RULED — an unknown OR FUTURE type/schema: the document OPENS, the element is `failed` + visible + PRESERVED VERBATIM through save.** Never built, never edited, never a host. *Dropping it would delete Miqdar's columns on a round-trip.* |
| **D44** | **✅ RULED — the PEI is a PREFIXED ULID** (`wall-01J8Z3K7Q2`). A counter needs an allocator = a backend (D37 forbids) ⇒ it **forecloses co-editing** (rule 8). And it makes id-reuse **impossible by construction**. |
| **D45** | **✅ RULED — `discipline` lives on the PART, not the element** (not even derived). `Classification` = `{ifcClass, loadBearing}`. A void has none. **Miqdar filters on `loadBearing`**; **the Clean Delta carries discipline PER PART.** A quantity that cannot be measured is **omitted, never zeroed**. |
| **D47** | **✅ RULED (2026-07-14) — THE TOOL / INTERACTION LAYER IS A FIRST-CLASS LAYER, AND IT IS MISSING.** A ribbon button **activates a TOOL** (collect input from the viewport → snap → preview → numeric override → commit **ONE** Command); it does **not** open a form over an `argsSchema`. ⚠ *`argsSchema` is a machine-readable contract for an AGENT; the app used it as a UI spec for a HUMAN.* **New phase `P4.5`, BEFORE the freeze.** |
| **D48** | **✅ RULED (2026-07-14) — THE INTERACTIVE TARGET IS `10,000+` ELEMENTS. BINDING.** ⚠ The current architecture misses it by 1–2 orders of magnitude on three **measured** axes, and the fourth (**WASM heap** — every solid stays live all session, nothing evicts) **is unmeasured and is a CONTRACT question** ⇒ it must be answered **before P5 freezes**. Plan **P4 step 9**. |
| **D49** | **✅ RULED (2026-07-14) — 2D DOCUMENTATION STAYS v1.0.x, BUT ITS ANCHORING CONTRACTS ARE RESERVED PRE-FREEZE** (plan P5 step 6b). An annotation is a **persistent reference to `SubShapeRef`s and element ids**; *"2D is additive"* has been asserted in the spec for months and **never checked against a contract.** |
| **D50** | **✅✅ RULED (2026-07-14) — ⚠⚠⚠ THE FULL CONSTRAINT MODEL IS IN v1.0.0. THE LARGEST SCOPE RULING THIS PROJECT HAS MADE.** *Found by review:* **Bunyan has exactly ONE associative relationship — `opening → host face`. Everything else is absolute.** A **Level cannot be moved** (no `updateContainer`; floor-to-floor height is **immutable**); a **Grid hosts nothing** (`gridRefs` is validated and **never read by the build** — D32 is half-built); joins do nothing; **containers/materials/sections/grids are CREATE-ONLY** and **no command moves an element.** ⇒ *"Parametric" has meant **"each element has a recipe"**; in Revit it means **"elements are constrained to each other"** — and the second is what people mean by BIM.* **⇒ Plan P5 step 0: the TYPED DEPENDENCY GRAPH + hosting (Level/Grid as active datums) + base/top constraints + wall joins + a SKETCH CONSTRAINT SOLVER.** ⚠⚠ **THE ANTI-FUSE RULE (§4h) STILL BINDS ABSOLUTELY — a join is a display/quantities cleanup, NEVER a fuse. A CONSTRAINT IS NOT A BOOLEAN.** ⚠ **`core_logic.md` §9 lists the constraint solver as a north-star HOOK (explicitly not v1.0.0) — D50 moves it in, and THE SCHEDULE MUST BE RE-CUT.** |
| **D51** | **✅ RULED (2026-07-14) — A COMMAND MAY NEVER SILENTLY RE-IDENTIFY.** *Reproduced:* `core.updateStyle` **accepts a layer rename** and **silently orphans every opening hosted on it** — the wall rebuilds at **full volume with no hole**, `brokenRefs` 0 → 1, **no refusal, no warning.** ⚠ **D26 already stated this rule** for the analogous case (*"a document command must never do it silently"*) — **the rule existed; the guard did not.** ⇒ **Refuse**, with a typed failure naming the refs it would break, unless explicitly acknowledged or given a retarget map. ⚠⚠ **AND WRITE DOWN WHAT NO DOCUMENT SAYS: A STYLE LAYER'S NAME IS IDENTITY-BEARING** (it is *inside* the `SubShapeRef` token) **while the UI renders it as ordinary editable text.** |
| **D46** | **✅ RULED — one physical thing = one element, one PEI.** Superposition rules **PROVISIONAL**: MEP never collides; arch/struct may; **structural always wins**. ⚠ The MEP-vs-structure *clash* question is **open and named**. |

**⚠ D40–D46 are ALL BUILT as of Entry 21** — they are no longer rulings awaiting code. The code is
`packages/document/`, and every one has a test that **fails if the fix is reverted** (verified, not assumed).

### 4b — Verification scope: WE TRUST OCCT; WE VERIFY OUR OWN CODE (D9)

This *narrows* the job. Validating OpenCascade is **out of scope** — auditing it would need a second
independent geometry engine we are not going to adopt. The harness exists solely to catch **our** bugs:

- **Reference-build oracle (primary)** — committed values from a **native OCCT build** (`cadquery-ocp`,
  seeded offline). Same kernel, *different binding, build and code path*, so a disagreement means **our**
  code is wrong. ⚠ **It is also a measuring instrument** — §4j used it to prove the boolean's cost is
  real OCCT work and not our `BRepCheck` gate.
- **Closed-form sanity check** — **demoted and re-purposed**: it guards the one layer the oracle cannot,
  **our own measurement code**, which can ask the kernel the wrong question and get a confidently wrong
  answer. It earned this on its first run (the `LinearProperties` double-count). Where no closed form
  exists (a fillet on a boolean edge) the oracle stands alone — explicitly acceptable.
- **Regression snapshots** — drift only.

*(Toolchain: **`cadquery-ocp`**, not `pythonocc-core` — the latter is not installable from PyPI. Needs
the `libgl1` system package, installed on this box.)*

### 4e–4i — THE FIVE BIG RULINGS. **Full text: `V1.0.0_spec.md` §14 (D15, D19–D23, D30–D38) and
`core_logic.md`.** What a fresh agent must know *before* opening them, plus the caveats that exist
nowhere else:

| | Ruling | The one thing you must not get wrong |
|---|---|---|
| **4e** | **BUNYAN IS OPEN SOURCE — AGPL-3.0 + a commercial option (D15).** AGPL closes the *SaaS loophole*: **the moat was never the client code, it is hosted collaboration.** | ⚠ **THE LGPL SIDE-MODULE TASK IS CANCELLED** — public buildable source discharges the relink obligation, so **the static link STANDS.** ⚠⚠ **THE CLA IS A HARD PREREQUISITE AND IS NOW DOUBLY LOAD-BEARING:** the moment one external PR merges without one, that contributor owns those lines — it can never be commercially licensed, **and the owner's freedom to build a CLOSED Miqdar against his own AGPL codebase gets murky.** **CLA, not DCO** (a DCO grants no relicensing right). **Before the first external PR.** *(Repo goes public later, at a milestone.)* |
| **4f** | **BUNYAN IS AGENT-NATIVE (D19–D23).** **One command layer; humans and agents both act through it.** `argsSchema` ⇒ the agent's tool list is **generated, never maintained**. `window.bunyan` **ships with the app: zero install**; MCP is v1.0.x, *another transport over the same verbs*. Every command **returns its `UndoableEdit`**. | ⚠ **TWO LAYERS EXIST AND ONLY ONE IS THE AGENT'S.** Kernel ops (`makeBox`) freeze at **P3** and are callable by **`DocumentContext` alone**. Document commands (`createElement`) freeze at **P5** and are callable by **everyone**. An agent calling `makeBox` would create a solid **no entity owns, no undo can remove, and no `SubShapeRef` names.** *The kernel is not an API surface; it is an implementation of one.* ⚠ Agent commands **opt out of edit-coalescing**; transaction grouping is **reserved, not built**. |
| **4g** | **MIQDAR — a second product (M1–M13).** Bunyan **models**; Miqdar **analyses & designs**. **Starts only after Bunyan v1.0.0 ships.** ⚠ **M13: MIQDAR IS CLOSED SOURCE** — *Bunyan open = the wedge; Miqdar proprietary = the moat.* | ⚠ **THE P5 FREEZE HAS A MIQDAR GATE** (plan P5 step 6a): before the type contracts freeze, clear `Miqdar_v1.0.0_spec.md` **§3.4** — chiefly, does `BimObjectType`'s version+migration suffice to add *optional analytical-hint fields* later? (Expected **yes ⇒ reserve nothing**.) **Cost: minutes. Cost of skipping: a frozen contract that forecloses a declared north-star. ⚠ It RECURS at every future freeze.** ⚠ **Miqdar may never require of Bunyan:** analysis code inside it · a second API · **coupled release schedules**. |
| **4h** | **THE MODELLING LAYER (D30–D33).** **D30** an element owns ordered **PARTS**, not one solid *(a wall is blockwork + insulation + plaster; "how much plaster?" was unanswerable **at any price**, foreclosing the quantities north-star in breach of **domain rule 8** — and silently foreclosing stairs, railings, curtain walls)*. **D31** **`ElementStyle`** — the shared named parameter set; without it there is no *"change one wall type, update 400 walls"*, **no scheduling by type**, and **nothing for Miqdar's `DesignGroup` to write into**. **D32** **`LinearMember`** (Beam · Column are ONE concept — **there was NO BEAM**) + **`Grid`** (Level's missing twin). **D33** **`Material`/`Section` are REGISTRIES, not strings** — a string cannot carry `f_ck`, be grouped by a schedule, or be read by an analysis engine. | ⚠⚠ **THE ANTI-FUSE RULE — ***NEVER FUSE TWO ELEMENTS.*** Fusing two walls at a corner **re-owns 4 of the first wall's 6 faces to the fuse node** ⇒ **every window hosted on that wall breaks the moment a neighbour is joined to it** — retroactively, on a wall nobody edited *(measured, Entry 12)*. **A part is not a second element**: it belongs to one element, is built by its recipe, dies with it. An Opening cutting every layer of its host is an ordinary ***intra*-element** boolean. **Corner joins are a QUANTITIES/DISPLAY problem and they are v1.0.x — do not reach for a fuse.** ⚠ All four were cheap because **`nodeId` is an OPAQUE STRING ⇒ a Part is just its own DAG node.** *(Entry 18 built them and proved it: the protocol did not move.)* |
| **4i** | **THE ECOSYSTEM (D34–D38).** **Bunyan** authors → **Miqdar** engineers → **Planitor** builds, with **BIMsync** as the on-ramp for foreign models. **D34** Bunyan becomes a **third producer of the Clean Delta Package** *(which already existed)*; **`.bnn` = the model, Clean Delta = the change feed, IFC = the door for outsiders** — IFC *cannot* be the internal transport (no recipe, no `SubShapeRef`, no stable id). Cost: **ONE** new concept, the **Model Revision** — ⚠ **saving is not issuing.** **D35** the spatial tree `Site→Building→Level→Space` *(**a two-tower project was unmodellable**; and **the tree IS Planitor's LBS**)*. **D36** every element carries **`loadBearing`** *(⚠ **and `discipline` — WHICH D45 MOVED TO THE PART**: an RC wall is a structural core with architectural plaster on it, so an element-level discipline is false about the parts that matter, and nothing needed one — IFC has no such attribute, **Miqdar filters on `loadBearing`**, **Planitor routes by trade**)* *(**Miqdar imports "the structural elements" and nothing could say which those were** — a shear wall vs a partition is a **property, not a type**, and **Miqdar must never guess**)*. **D37** **Bunyan does not build a backend.** **D38** the format is **`.bnn`**. | ⚠⚠ **THE MOAT IS A STRUCTURAL FACT, NOT A SLOGAN.** Everyone's GlobalIds **churn on revision**, breaking every schedule binding and quantity. **BIMsync is an ENTIRE PLATFORM built to manufacture, for foreign models, the property Bunyan has by construction** — it mints a PEI, *fingerprints* elements to re-link them after churn, and where it cannot be sure it puts a human in front of a **"confusing-change resolution queue" that Planitor BLOCKS on.** ⇒ **For a Bunyan model that queue is EMPTY, ALWAYS, BY CONSTRUCTION.** *Someone built a platform to fake what we get for free — that is the measure of what D1 is worth.* ⚠⚠ **AND THE BINDING CAVEAT: `BIMsync_cloude` IS NOT ON THIS BOX AND ITS SPEC HAS NOT BEEN READ.** Everything about BIMsync is **inferred from `Planitor/v2.2_spec.md`.** **No BIMsync doc may be edited until its spec is here.** What is safe to act on: **do not start building a Bunyan backend.** |

⚠ **The other payoff of D30/D33, and nobody saw it coming:** Planitor reconstructs a steel column's
weight through a fallback ladder that **hardcodes `density: 7850`**, because IFC so often will not say.
**Bunyan holds every input exactly** — the Section, the Material's density, the axis length, the part's
true volume — and emits **`basis: "exact"`, per part, per material.** **The estimate becomes a
measurement**, and a task can bind to *the part it actually builds* (*the plasterer bills plaster*)
rather than to `factor × element_qty`. *(Built, Entry 18: `DocumentContext.quantities()`.)*

### 4j — ⚠⚠ THE OPEN ITEMS. **THE OWNER'S DESK. READ THIS BEFORE ANYTHING ELSE.**

#### (1) D39 — CASCADE DELETE. **RULED by the owner, 2026-07-13. ✅ BUILT.**

**Deleting a wall deletes the windows hosted in it — in ONE undoable edit, so undo restores both.**

*The question it settles:* P3's exit criteria demanded that *"deleting a wall that hosts a window has a
defined, tested outcome"* — and **no document said which outcome.** Domain rule 3 ("a broken reference
is a first-class state awaiting manual retargeting, never auto-healed") plainly governs a ref whose
**sub-shape** vanished; it does **not** settle what happens when the **host itself** is deleted, and
reading it as though it did would make "broken" the *normal* state of the document after any delete.

*The reasoning the owner accepted:* an Opening is **defined by** its host — a window floating in space
is not a thing, and its geometry is a boolean against a solid that no longer exists. Revit and ArchiCAD
both cascade, with a warning. ⇒ **cascade, in one edit, undoably**; the caller **warns first**
(⚠ **as of D42 this is `dryRun`, NOT `planDelete()` — which is deleted**); and **broken-ref stays reserved for its real case**,
which keeps domain rule 3 sharp instead of making it the routine outcome of a routine action.

#### (2) D29 — THE BREP CACHE. **✅ RULED BY THE OWNER, 2026-07-14: IT SHIPS. ⚠⚠ READ THE IDENTITY TRAP BELOW BEFORE IMPLEMENTING IT.**

The owner deferred this ship/drop call to **P3 step 4, to be decided WITH the measured rebuild cost**.
Here is the cost. *(`tests/document-scale.test.ts`; dev box, headless, real OCCT WASM.)*

```
  A 5-STOREY BUILDING — 195 elements, 310 solids, .bnn = 4.4 KB zipped
    COLD LOAD (every solid rebuilt from scene.json, NO cache) ......  7,334 ms   (37.6 ms/element)

  WHERE THOSE SECONDS GO  (profiled, 40 walls / 20 windows)
    boolean       60 calls   2,102 ms   35.0 ms/call    73%
    transform    120 calls     675 ms    5.6 ms/call    24%
    makeBox      140 calls      79 ms    0.6 ms/call     3%
    releaseShape 200 calls       3 ms                    0%
    ─────────────────────────────────────────────────────────
    100% OF THE TIME IS INSIDE OCCT. Our plumbing (client, transport, registry, release) is ~0.2%.

  IS THE BOOLEAN OUR FAULT?  NO — cross-checked against NATIVE OCCT 7.9.3 (cadquery-ocp):
    the boolean itself ............ 11.28 ms   ← genuinely this expensive. Irreducible.
    our INVALID_RESULT gate ....... 1.16 ms    ← only 9%. KEEP IT.
    our AddOptimal bounds ......... 0.03 ms    ← noise. KEEP IT.
  ⇒ Our WASM boolean (35 ms) is ~3x native (11 ms) — exactly what LTO-off + single-threaded predicts.
  ⇒ THE PATTERN BREAKS: for the first time the cost is REAL OCCT WORK, not our misuse of an API.
```

**⚠⚠ AND THE MEASUREMENT SURFACED SOMETHING BIGGER THAN D29, WHICH IS WHY THE RULING SHOULD NOT BE
MADE IN ISOLATION:**

```
    one wall, one param edit (a drag frame) ............   127 ms   → a drag runs at ~8 fps
    ONE STYLE EDIT, 50 walls rebuilt ................... 2,677 ms   (54 ms/wall)
    → extrapolated to Revit's "400 walls" ..............  ~21 s
```

**A disk cache cannot help either of those.** They are in the **interactive** path. And "change one
wall type, update 400 walls" is **D31's headline feature** — the single largest modelling gap we just
closed, and it currently takes 21 seconds.

**The trade, stated honestly:**
- **FOR the cache:** 7.3 s for a *modest* 195-element building is already past a splash screen, and it
  scales linearly — a 2,000-element project would be ~75 s. `BRepTools::Read` would very likely be
  10–30× cheaper than re-running the booleans.
- **AGAINST:** it optimizes the **wrong axis** — the same OCCT cost hits every edit, and if the rebuild
  path gets faster the cold load falls with it. It adds an **attack surface** (a `.bnn` is a file a
  user can be *sent*, and the `.brep` is the one part fed as **binary** to OCCT's deserializer). It adds
  a staleness path. **Miqdar cannot produce one even in principle** (it has a solver, not an OCCT
  kernel), so the no-cache path must work forever regardless. And it is **purely additive to a zip** —
  **v1.0.x can add it without breaking one saved file.**

> ## ✅✅ **THE RULING — OWNER, 2026-07-14: THE CACHE SHIPS IN v1.0.0.**
>
> *(Zayd recommended **dropping** it — on the grounds that it hides a cost the interactive path pays anyway.
> The owner ruled to ship: **a 75-second open is a product failure regardless of what else is also slow.**
> That is the call, and it is the right kind of call — the deferral existed to be made **with the number**,
> and it was.)*
>
> ### ⚠⚠ AND THEN THE RULING OPENED A TRAP THAT IS NOT ABOUT PERFORMANCE AT ALL — IT IS ABOUT **D1**.
>
> **A `.brep` file stores SHAPES. It does not store their NAMES.** Every `SubShapeRef` in Bunyan is
> **derived by re-running the recipe** — *identity is assigned by the operation that mints it, never
> recovered afterwards* (D1, the one non-negotiable invariant). **Load a solid from a cache and the recipe
> never runs** ⇒ no identities are minted ⇒ the window hosted on `wall-7.plaster/face/y-min#0` **has nothing
> to attach to.**
>
> ⇒ **the cache must carry the tokens too — which is a persisted name→shape index, i.e. precisely the
> "identity token map" that the spec DELETED one session ago and that D1 forbids.** *(Surfaced to the owner
> before a line was written, because it changes what "ship" costs. He ruled the design below.)*
>
> **THE RULED DESIGN — it keeps D1 intact rather than quietly repealing it:**
>
> 1. **BIND BY CANONICAL ORDER, NEVER BY A RAW OCCT INDEX.** Store each part's tokens in the order of the
>    **same deterministic canonical re-sort the resolver already applies before assigning identities** (D8).
>    A token is re-attached by a rule **derived from the shape itself**, not by trusting a number in a file.
> 2. **VERIFY, THEN TRUST.** `exportBrep` also emits a **`fingerprint`** — a digest over each named
>    sub-shape's measured geometry (area / mm-rounded centroid, the D28 basis). `importBrep` **recomputes it
>    from the shape it actually read** and refuses with **`CACHE_STALE`** on any disagreement.
> 3. **⚠⚠ A REFUSAL IS FREE, AND THAT IS THE ENTIRE SAFETY ARGUMENT.** The recipe is truth and can always
>    rebuild. A stale, re-ordered, corrupted or **hostile** cache therefore costs **a rebuild — never a wrong
>    name.** ⇒ **The cache is a bet the document is always free to abandon.** *(A silently mis-attached token
>    is a window that moves to a different wall and nobody ever finds out. That is the failure this design
>    makes structurally impossible, rather than merely unlikely.)*
>
> **✅ RESERVED IN THE PROTOCOL BEFORE THE FREEZE:** `exportBrep` · `importBrep` · failure code
> **`CACHE_STALE`**. ⚠⚠ **THE BODIES ARE NOT WRITTEN. THIS IS THE NEXT ZAYD WORK ITEM** — and it does **NOT**
> block Amer. **Read this box before writing a line of it.**
>
> **And the invariants that do not move:** the **no-cache path stays PRIMARY** and must be supported forever
> (it is the only path **Miqdar** can ever take — it has a solver, not an OCCT kernel, so it **cannot**
> produce a cache even in principle) · a stale cache is **never truth** · the cache is **purely additive to
> the zip**, so it breaks not one saved file when it lands · ⚠ **the untrusted-binary attack surface is now
> owned DELIBERATELY** — a `.bnn` is a file a user can be **SENT**, and the `.brep` is the one part fed as
> **binary** to OCCT's deserializer, so the **hostile-BREP hardening test is a REQUIRED deliverable**, not a
> conditional one.

#### (3) ✅ THE PERFORMANCE QUESTION — **RULED, 2026-07-14, AND THE PROTOCOL LEVER WAS TAKEN IN TIME**

**Three levers. The third touched the protocol and was free only before the freeze — it was taken.**

- **(a) Multithreading.** Stays **v1.0.x** (D8: nail naming determinism on one core first). A bulk rebuild
  is embarrassingly parallel across elements — **still the biggest single win**, and it needs no protocol
  change, which is exactly why it could wait.
- **(b) `-O3` / LTO in the WASM build — ✅ MEASURED (Entry 21), AND THE RESULT IS A NEGATIVE ONE WORTH
  HAVING.**
  ```
    -O2 (shipped)   cold load 7,334 ms    artifact 15.37 MB
    -O3             cold load 7,283 ms    artifact 14.59 MB   ← 0.7% faster = NOISE. 5% smaller = real.
  ```
  ⇒ **`-O3` buys NO speed.** *(It is kept anyway, for the 5% smaller artifact — which feeds the open
  download-size question in §4j-5.)* **The 3× gap to native OCCT is not something the optimiser can close**;
  it is single-threading and the WASM boundary. ⚠ **Do not re-run this experiment. It is done, and the
  answer is no.** *(LTO itself: see the Entry 21 note — it was attempted under a hard 2 GB Docker cap,
  because an uncapped OOM on this box can take the owner's live public sites down.)*
- **(c) ✅ `instantiate` — RESERVED IN THE PROTOCOL (owner, 2026-07-14).**
  400 walls sharing a style *and* their params have **byte-identical local geometry** — they differ only in
  `placement`, and the rebuild engine deliberately **builds in the local frame and places last** (D25). So
  the base solid can be built **once** and re-owned by each element. **The blocker was identity: two
  elements sharing a solid would share its `SubShapeRef`s, which is catastrophic** — a window hosted on
  wall A's face would be hosted on wall B's too. `instantiate` says *"this shape, under a NEW `nodeId`"*,
  minting a **fresh, independent** identity set; in OCCT a `TopoDS_Shape` copy is **cheap** (it shares the
  underlying `TShape`). **Collapses a style edit from 400 booleans to 1 boolean + 400 re-owns.**
  ⚠ **RESERVED, NOT BUILT, AND STILL UNMEASURED — a hypothesis, not a plan.** It was reserved *now* because
  **the expensive thing to get wrong is the payload shape, not the body** — the same argument that reserved
  `sectionCut` and `importIfc`, and the whole reason the question had a deadline.

#### (4) ⚠⚠ **§4k — THE P3 DEFECTS (Entry 19), AND THE SEVEN RULINGS THAT CLOSED THEM (D40–D46, Entry 20).**

> ## ✅ **THE DECISIONS ARE MADE. THE DOCS ARE UPDATED. WHAT IS LEFT IS EXECUTION: `P3_correction_plan.md` §1.**
> **D40** the change feed is an **append-only JOURNAL** (`seq` / `issued_at_seq`; an undo appends a
> **reversal**) · **D41** **`core.issueRevision` is a Command** · **D42** rule 4 is **all-or-nothing by
> construction** + a **universal `dryRun`** on the executor, and **`planDelete()` is deleted** · **D43** an
> unknown **or future** type → **open, `failed`, PRESERVED VERBATIM through save** · **D44** the PEI is a
> **prefixed ULID** · **D45** **`discipline` lives on the PART** (`Classification` = `{ifcClass,
> loadBearing}`; the Clean Delta carries it **per part**; an unmeasurable quantity is **omitted, never
> zeroed**) · **D46** **one physical thing = one element** (superposition rules *provisional*).
> **Full text: `V1.0.0_spec.md` §14. Domain: `core_logic.md` §3.3a, §3.12a, §4, §7, rules 9/14/15/16.**

**Every defect below was reproduced against the real OCCT kernel. Every one is in the document layer. None
touches the protocol.** Ordered by cost of delay:

| # | The defect (each one *measured*, not read) | Freeze economics |
|---|---|---|
| **1** | **⚠⚠ THE CLEAN DELTA CANNOT BE COMPUTED FROM A `.bnn`.** `ModelRevision` has **no pointer into the log**; no `UndoableEdit` carries a revision/seq/timestamp; the log **is** the undo stack (**200-deep**, `shift()`ed, and `undo()` **pops entries out of it**); `DocumentContext` **does not know its own revision**. ⇒ *"what changed since revision N?"* **has no answer in the file**, and a P6 producer must **diff two models** — the guessing BIMsync exists to do and that §4i says we never do *"by construction."* **⇒ D40 IS OWED.** | **Free today** (schema not yet agreed, nothing ever issued). **Three-repo amendment + a migration of every issued `.bnn`** later. |
| **2** | **⚠ ELEMENT IDS ARE REUSED.** `#idCounter` is rebuilt on load from the **surviving** ids. Delete `wall-3` → save → reload → create → **the new element is `wall-3`.** Planitor's progress records and Miqdar's model bind to **the wrong element, silently** — and **§4i told them that reconciliation queue is empty, so nobody is looking.** *(Rule 13: not a refactor — a breaking change to three products.)* | Free today (persist `nextId` in `scene.json`). A migration **+ silent mis-binding in the field** later. |
| **3** | **⚠ "REJECT + KEEP LAST-GOOD" IS FALSE FOR MULTI-ELEMENT EDITS.** The **scene** rolls back; the **geometry** does not. Measured: a style edit one wall refuses leaves a **sibling** rebuilt at the **rejected** thickness (`vol 1.5e9 → 3.0e9`), and `quantities()` reports **double the true volume** with **`basis: 'exact'`**. `document.ts:15-19` claims this is *"true **by construction**."* It is not. | Cheap now (stage the rebuild, commit atomically). **P5's real types WILL trigger it** — the spec itself calls a failing fillet/extrude/boolean *normal*. |
| **4** | **ONE UNREGISTERED TYPE BRICKS THE FILE.** `rebuildAll()` **throws**. A `.bnn` from **Miqdar**, a plugin type, a newer file — the document is unopenable. *`build.ts:21-24` states the very principle it breaks.* | Cheap now. A *"your file won't open"* support class later. |
| **5** | **AUTOSAVE RECOVERS STALE WORK.** `#counter` resets to **0** every session ⇒ session 2 **overwrites the ring** and `latest()` returns **session 1's** snapshot. Measured: saved `9999`, recovered `1300`. **Data loss, in the feature that exists to prevent data loss.** | Trivial now. |
| **6** | **A QUANTITY THAT IS `exact` AND WRONG.** A dangling `materialId` → **`0 kg`, `basis: 'exact'`** — and **`createStyle` does not validate materials though `updateStyle` does.** Rule 15 forbids an *estimate* dressed as a measurement; this is worse — **a wrong number wearing the badge that says trust me.** | Trivial now. A wrong bill of quantities later. |

**Plus:** duplicate style-layer names mint **colliding `SubShapeRef`s** (the `checkIdSafe` guard is on the
*minted* id — which can never be unsafe — and absent from the **layer names**, which are agent-authored); a
mistyped `containerId` silently puts a wall on the **ground floor** (and `containerId` *is* the LBS address);
`loadBnn`'s hostile guard is `typeof x !== 'object'` and **`typeof null === 'object'`**.

**⚠ AND THE 7th, WHICH THE RULINGS ADDED (D45):** `discipline` was on the **ELEMENT** — so an RC wall had to be
*entirely* structural or *entirely* architectural, though **its core is structural and its plaster is
architectural.** ⇒ **Miqdar could not ask which PART is structural** (though `core_logic.md` §3.3a says it
idealizes exactly that) and **Planitor could not route the concreter and the plasterer to different work
packages on one wall** (though §4i claims *"a task binds to the part it actually builds"*). **Two written
ecosystem claims were false as built.** Found by the owner, from the domain, not from the code.

**✅ AND THE SPEC EDIT THAT WAS OWED IS DONE:** `V1.0.0_spec.md` §4.5/§6 promised *"the identity **token map** is
persisted in `scene.json`."* **There was no token map and there never was** — refs are re-derived
deterministically on rebuild. **Entry 13's bug exactly** (promised in five places, zero code) — except **here the
code was right and the prose was wrong.** ⇒ **The claim is deleted, not built** (spec §4.5, architecture ×4,
core_logic §2), and the one real question under it — *can a kernel-less consumer (Miqdar) name a sub-shape from a
`.bnn`?* — is **recorded as deferred**, because it is an additive optional key that P5 does not make expensive.

#### (5) Awareness, not a decision yet

- **The kernel is 4.19 MB gzip** (was 4.24 at -O2; -O3 shaved 5%, Entry 21). An owner call is due **before P4**. Levers: **(a)** accept
  it (the service worker caches it once; D11); **(b)** lazy-load it behind the app shell; **(c)** split
  it into core + booleans/fillet. `-Os` saves only 1.5%.
- **Multi-threading** drags COOP/COEP headers and `SharedArrayBuffer` behind it, and non-deterministic
  boolean ordering the canonical re-sort (D8) must neutralise.

---

## §5 — Next actions (in priority order)

**For Zayd (kernel / document / headless):**

> ## ✅ **P3 IS CLOSED AND THE PROTOCOL IS FROZEN. THE NEXT ZAYD ITEM IS THE D29 CACHE — AND §4j-2 IS ITS SPEC.**
> Nothing is owed to the owner. `P3_correction_plan.md` is **fully executed** (Entry 21), all eleven fixes are
> **revert-verified**, and the protocol carries the five reserved ops. **Amer is unblocked** — see his section
> below.

1. **⚠⚠ THE `geometry-cache.brep` BODIES (D29 — RULED SHIP, 2026-07-14). ⚠ READ §4j-2 FIRST, IN FULL.**
   The ops are reserved (`exportBrep` / `importBrep` / `CACHE_STALE`); the bodies are not written.
   **⚠⚠ THIS IS NOT A SERIALIZER TASK — IT IS AN IDENTITY TASK.** A `.brep` stores shapes and **not their
   names**, so a cached load must **re-attach every `SubShapeRef`**. Get that wrong and a window silently
   moves to a different wall. **The ruled design: bind by CANONICAL ORDER (D8), VERIFY a fingerprint, and
   refuse with `CACHE_STALE` rather than mis-name — the cache is a bet the document is always free to
   abandon.** Deliverables: the two C++ ops (~60 s to rebuild the kernel, §6), the document-layer write/read
   path, **a hostile-BREP hardening test (now REQUIRED, not conditional)**, and a test that **corrupts the
   cache and proves the document still opens, correctly, from the recipe.**
2. **⚠ KEEP MODELLING REAL BUILDINGS WITH THE API — STILL OWED, AND STILL THE BEST METHOD WE HAVE.**
   It has found **nine** gaps now and it is the only method that ever has (§1's table). **Walls that meet.
   A stair. A roof. A duct through a beam.** ⚠ Entries 19 and 21 drove the API at its **failure** boundaries
   — a *different* hunt finding a *different* class. **Both are owed; only one is done.**
   *(⚠ Entry 21 adds a data point in favour: writing ONE new fixture type that ran two kernel ops instead of
   one immediately exposed a heap leak in `BuildContext` that four fixture types had never triggered.)*
3. **The Clean Delta JSON Schema (D36b)** — agree it across the three repos **before anyone writes a
   producer.** Entry 17: *"It is the contract that carries money."* ✅ **Its hard prerequisite is now MET:
   D40 is built, so `change_type` is genuinely computable** (`doc.changesSince(rev)` — read, not inferred).
   ⚠ **Still blocked on reading BIMsync's spec, which is not on this box (D37).**
4. **P4/P5 proper.** ⚠ **P5 freezes `BimObjectType` — against a COMPOSITE, STYLED wall** (a single-solid wall
   would validate a contract the product cannot use), **and P5 step 6a is the Miqdar gate** (§4g). ⚠ **The
   `BuildContext.discard` rule (§2) is new since Entry 18 — P5's real types all need it.**
5. **Housekeeping, when convenient:** `LICENSE` (AGPL-3.0), the CLA, the **OCCT attribution notice**
   LGPL requires (§4e). None of it blocks work; all of it blocks going public.

> **✅ CLOSED, DO NOT REDO** — the op set (`transform`, `extrude`, `chamfer`, `revolve`) · `measure(ref)`
> + derived `capabilities` + `INVALID_RESULT` · the positional key (D28) · the freeze's meaning +
> reserved ops (D13) · CI (all five steps pass here) · **the document model, the agent surface, `.bnn`, undo,
> the broken-reference state and cascade delete (Entry 18)** · **✅ AND ALL SIX P3 DEFECTS + the seven rulings
> D40–D46 (Entry 21) — `P3_correction_plan.md` is fully executed and every fix is revert-verified.**
> ⚠ **`-O3`/LTO is MEASURED AND ANSWERED (§4j-3b): `-O3` buys NO speed. Do not re-run that experiment.**

**For Amer (browser hot path):**

> ## ⚠⚠⚠ **STOP. READ ENTRY 24 AND `review_P4.md` BEFORE WRITING A LINE OF UI. THE ORDER OF WORK HAS CHANGED.**
>
> **Your Entry 22–23 work is good and none of it is being thrown away** — the D19 bootstrap, the generated ribbon,
> the schema-driven panel and the single-flight runner all stand. **But the phase around it moved.**
>
> **1. ⚠⚠ PLAN P4 STEP 0 COMES FIRST, AND NOTHING ELSE IS VERIFIABLE UNTIL IT PASSES: THE GATES CANNOT SEE `apps/web`.**
> `pnpm typecheck` and `pnpm lint` **both exit 0** with `export const X: number = "not a number"` sitting in `App.tsx`
> (reproduced). The root `typecheck` never invokes `apps/web/tsconfig.json`, and **`vitest.config.ts` includes only
> `tests/**` — so `pnpm test` cannot collect an `apps/` test even if you wrote one.** ⇒ **Add the tsconfig to the
> `typecheck` script; add `apps/**/*.test.ts?(x)` to the vitest `include`; then PROVE it with a mutation test.**
> *(This is Entry 14's bug in a new place. It is not housekeeping — it is why the rest of this list went unnoticed.)*
>
> **2. THE REDRAW IS 90% WASTE, AND THE FIX IS ALREADY IN YOUR HAND.** `App.tsx` re-tessellates **every part of every
> element on every edit** — **865 of the 965 ms an edit costs at 195 elements** (measured; §1a). **`doc.execute` RETURNS
> the `UndoableEdit`, and `edit.changes` already names exactly which elements changed** — you read it for selection and
> then throw it away. **Key a mesh cache by part `nodeId` and re-tessellate only the dirty parts.** ⚠ **And widen
> `RenderPart` — `{handle, color}` carries no identity, and that one type blocks picking, incremental redraw, hover AND
> render coalescing at once.**
>
> **3. ⚠ `P4.5 — THE INTERACTION MODEL` IS A NEW PHASE AND IT IS YOURS (with the Architect).** The owner found the UI
> primitive; **the review found the cause is that no document ever described a tool.** You will build the tool state
> machine, snapping, the preview and numeric entry — and **reserve `move`/`setPlacement` and the baseline-Wall shape
> BEFORE P5 freezes them.** ⚠ **Do not design a private path to the kernel for snapping** — the spatial seam is
> read-only and mints nothing, exactly like your `RenderGateway` (which was the right call, and is the precedent).
>
> **4. THE INTERACTIVE TARGET IS NOW `10,000+` ELEMENTS (binding).** ⇒ **plan P4 step 9: the scale harness.** Four
> numbers — heap/solid, draw calls, cold load, edit latency. ⚠ **The WASM-heap number does not exist and is the most
> dangerous unknown in the project.** *Do not design the renderer without them; ~16,000 draw calls at target is 10–20×
> a 60 fps budget, and one `THREE.Mesh` per part will not get there.*
>
> **5. Small, cheap, and all now plan steps:** the failure states are **invisible, not merely absent** (`if (parts ===
> undefined) continue` silently hides an unbuildable element — the one thing D43 forbids) · **stop regexing
> `/superseded/i`** — the frozen protocol has a typed `SUPERSEDED` code, and `CommandFailure`'s codes **freeze at P5** ·
> **the provenance map is promised in three of your comments and retained by none of your code.**

> ## ⚠⚠ THE DOCUMENT MODEL EXISTS NOW. **BUILD AGAINST `@bunyan/document`, NOT AGAINST THE KERNEL.**
>
> ```
>   button / drag ─┐
>   agent verb ────┼──►  Command registry ──►  DocumentContext  ──► KernelClient ──► OCCT
>   MCP [v1.0.x] ──┘                          the only door (D19)
> ```
>
> **No React component may hold a `KernelClient`.** This is now enforced by a **machine check**
> (`tests/d19-boundary.test.ts`) and by a **package boundary** — `@bunyan/document` does not even
> *depend* on `@bunyan/kernel-client`. The one allowed exception is a file called
> `apps/<app>/src/bootstrap.ts`, which constructs the client and hands it to `DocumentContext`. It is
> allowlisted **in advance**, so the rule lands before your code does.

```ts
// apps/web/src/bootstrap.ts — THE ONLY FILE THAT MAY DO THIS.
import { KernelClient, WorkerTransport } from '@bunyan/kernel-client';
import { DocumentContext, createRegistries, createAgentSurface, CORE_COMMANDS } from '@bunyan/document';

const worker = new Worker(new URL('@bunyan/kernel-occt/worker', import.meta.url), { type: 'module' });
const kernel = new KernelClient(new WorkerTransport(worker));       // a KernelClient IS a GeometryGateway
await kernel.handshake();                                            // → { name: 'occt', kernelVersion: '7.9.3' }

const registries = createRegistries();
for (const command of CORE_COMMANDS) registries.commands.register(command);
// …register the BIM object types (P5 ships the real ones; tests/fixtures/bim-types.ts shows the shape)

// Opening a file? Hand over the JOURNAL and the REVISION too — they are part of the model (D40).
const doc = new DocumentContext({ registries, geometry: kernel /*, scene, journal, revision */ });
window.bunyan = createAgentSurface(doc);                             // D22. Zero install. One line.

// Everything else goes through doc.execute(...) — the ribbon, the property panel, the agent.
const edit = await doc.execute('core.createElement', { typeId: 'core.wall.v1', styleId: 'EXT-295',
                                                       params: { length: 3000, height: 2500 } });
const parts = doc.partsOf(edit.changes[0].id);   // ⚠ AN ELEMENT IS ITS PARTS (D30) — render EACH solid,
                                                 //   each with its own material. A wall is not one mesh.
```

### ⚠⚠ EIGHT THINGS TO KNOW — **AND FOUR OF THEM CHANGED IN ENTRY 21, AFTER THE LAST HANDOFF**

**⚠ THE FOUR THAT CHANGED. If you already wrote code against the Entry-18 API, these are the diffs:**

1. **⚠⚠ `doc.planDelete()` IS DELETED. Use `execute(id, args, { dryRun: true })`** (D42).
   It runs the **real** command against the **real** kernel, then throws the result away and hands back the
   `UndoableEdit` it *would* have produced — or a typed failure **naming the element that refused**. So the
   "3 elements will also be deleted" warning is the *verb itself, run dry*, not a second function that can
   drift from it. `window.bunyan.dryRun(cmd, args)` is the agent's form. **It applies to EVERY command, not
   just delete** — you can dry-run a style edit across 400 walls and get back the exact failure, with the
   offending element named, before the user commits to anything.
2. **⚠⚠ `discipline` MOVED FROM THE ELEMENT TO THE PART** (D45). `element.classification` is now
   `{ ifcClass, loadBearing }` — **there is no `classification.discipline` any more.** Each **part** carries
   its own (`part.discipline`), because *an RC wall is a structural core with architectural plaster on it.*
   A discipline filter in the UI must therefore match **any part** of an element:
   `bunyan.query({ discipline: 'architectural' })` returns that wall **through its plaster**, and
   `{ discipline: 'structural' }` returns **the same wall** through its core. **That is not a bug — it is
   what the wall is.**
3. **⚠⚠ ELEMENT IDS ARE PREFIXED ULIDS** — `wall-01J8Z3K7Q2…`, not `wall-1` (D44). **Never parse them, never
   sort on them, never render them as a user-facing name** (use `element.name`). They are the PEI that
   Planitor and Miqdar bind to.
4. **⚠ `part.mass` MAY BE ABSENT** (D45). It is **omitted, never zeroed**, when a material's density cannot
   be resolved — `volume` and `area` are still exact. **Render "—", never "0 kg".** *(A missing density is
   an unknown, not a nought, and `0 kg` stamped `basis: 'exact'` is a wrong number wearing the badge that
   says trust me.)*

**AND THE FOUR THAT STAND:**

5. **⚠ An element has N solids, not one** (D30). `partsOf(id)` returns them, in order, each with a
   `materialId`, a `discipline` and its own `SubShapeRef`s. **Tessellate each.**
6. **`measure` is exact; the mesh is not.** Quantities come from `doc.quantities(id)` (per part, per
   material, `basis: 'exact'`). Measuring triangles under-reports every curved solid by its chord error.
7. **Booting the real kernel is async** — it instantiates a **4.19 MB gzip** `.wasm`. The worker queues
   messages during boot, so post immediately; just don't expect a synchronous first reply.
8. **Use `coalesceKey` on drags** (`doc.execute(..., { coalesceKey: 'rebuild:wall-1' })`) — the client
   supersedes stale rebuilds and **releases the orphaned handles for you.** ⚠ **Agent commands must NOT
   coalesce** (D23) — `createAgentSurface` already omits it.

### ⚠ AND TWO NEW THINGS THE UI NOW HAS TO SHOW

- **⚠⚠ `doc.unbuildable()` — THE UNBUILDABLE-ELEMENT STATE (D43), and it is a UI surface.** An element whose
  Type this app does not have (a plugin, a Miqdar column, a file from a newer Bunyan) **no longer bricks the
  document**: it opens, the element is `failed`, it is **visible**, it is **never built and never edited** —
  and **it round-trips through save byte for byte.** ⇒ **Show it** (greyed, with its reason), and **never
  offer to "fix" or drop it**. Dropping it deletes somebody's columns from a file they only opened to look
  at. It sits beside `doc.brokenRefs()`, which is the *other* first-class visible failure state (rule 3).
- **`doc.changeFeed()` / `doc.changesSince(rev)` — the ecosystem's change feed (D40).** ⚠ **It is NOT
  `doc.history()`**, which is the bounded undo stack. When you **save**, persist
  `saveBnn(scene, { journal: doc.changeFeed(), revision: doc.revision })` — **passing `doc.history()` there
  is the exact bug that cost this project the moat for a whole phase.** And **`core.issueRevision` is an
  ordinary command** (D41), so *"Issue revision"* is just another ribbon button.

**You own the browser storage.** `bnn.ts` defines `StorageAdapter` (`read`/`write`/`remove`/`list`) and an
`Autosave` ring built on it. Implement it over **File System Access API / OPFS / IndexedDB** — it is yours
because it cannot be verified on a headless box, and a `MemoryStore` keeps the seam tested here.
⚠ **`Autosave` seeds its counter from `store.list()`** — so your adapter's `list()` **must return the keys
that already exist in the store**, including from a previous session. Return an empty list from a populated
store and autosave will silently overwrite the user's last session (that was the bug; there is now a
three-session test for it).

Amer still owns: `apps/web` (Vite/React), the renderer + picking, the ribbon/property panels, the
service worker + PWA (D11), the Cloudflare Pages deploy, and `window.bunyan`'s wiring.
*(No COOP/COEP `_headers` — v1.0.0 is single-threaded, D8.)*
⚠ **The `geometry-cache.brep` (D29) is Zayd's and is not written yet — do not wait for it, and do not
assume it.** Loading from `scene.json` alone is the primary path and always will be.

---

## §6a — BOX DISCIPLINE (owner ruling, 2026-07-11 — binding)

**Full text: box-local `cross_projects_policy.md` §6/§6a. Read it before any heavy run.** The two facts
that matter, restated here because getting them wrong is unrecoverable:

**The dev box is small (~3.7 GiB RAM + 2 GiB swap) AND it is the production host for two live public
websites.** An OOM here does not merely fail a build — **it can take the owner's public sites offline.**

1. **Never run anything that would overload the box.** Constrain at the source (cap Docker memory, cap
   `-j`). If a run cannot be made safe, **do not run it — escalate** with the memory numbers.
2. **PRE-AUTHORIZED to pause** (graceful `docker stop` only; never `kill`/`rm`; never remove a volume;
   check that project's `current_state.md` for active work; **restore + verify afterwards**):
   **Planitor** (`planitor-pg`), **Chantier_Manager** (`chantier_test_pg`, `chantier_test_redis`),
   **Portique_Designer**, **SmartBar**. ⚠ The Chantier containers are `restart=no` — they will **not**
   come back on their own.
3. **⚠⚠ HARD LIMIT — NEVER, under any circumstance, including box strain:** **`portfolio-caddy-1`**
   (Caddy on :80/:443 — the **live** `beam-stack.com` + `daoudi.beam-stack.com`) and
   **`beamstack-contact`** (**real inbound leads**, sends visitor-facing email). These light apps use
   this dev box **as their production box**. *The owner's rule of thumb: stop anything belonging to an
   app he isn't using right now; never stop anything that is somebody's production.*
4. ⚠ **Before pausing anything, run `du -sh /tmp`** — it is a **tmpfs (RAM-backed)**, and our own dead
   scratchpads are usually the hog. All other projects' containers **combined** use ~77 MB.
5. **Record any pause + restore** in the box-local `last_session_work.md`.

---

## §6 — Environment & commands (dev box)

```bash
# ⚠ pnpm is NOT on PATH and is NOT at ~/.npm-global/bin (that line was wrong for 17 entries).
#   It exists ONLY via corepack. Either prefix every call:
corepack pnpm verify
#   …or drop a shim on PATH for the session (the `verify` script calls `pnpm` internally, so a bare
#   `corepack pnpm verify` fails at the first sub-script without one):
mkdir -p ~/bin && printf '#!/bin/sh\nexec corepack pnpm "$@"\n' > ~/bin/pnpm && chmod +x ~/bin/pnpm
export PATH="$HOME/bin:$PATH"

pnpm install
pnpm verify          # typecheck + lint + test — the one command that must stay green (169 tests, ~45 s)
pnpm format:check    # ⚠ CI runs this BEFORE the tests. It is what silently failed every push for 7 entries.

# Change the kernel's C++ and re-test: ~60 SECONDS, not 2.5 h. OCCT's static libs are already built.
SPIKE=$HOME/occt-wasm-spike   # box-local; holds occt/ source + build/ + install/ (18 libs, 119 MB)
REPO=$HOME/projects/Bunyan/tools/kernel-build
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$SPIKE/install:/install:ro" \
  emscripten/emsdk:latest bash /work/link.sh          # compiles src/kernel.cpp + links
cp $REPO/dist/bunyan-kernel.{js,wasm} $HOME/projects/Bunyan/packages/kernel-occt/wasm/
pnpm verify                                            # the real gate

# Offline golden seeding (NEVER in CI) — needs uv at ~/.local/bin/uv:
cd tools/oracle && VIRTUAL_ENV=$PWD/.venv uv run seed-goldens ../../tests/goldens

# The native-OCCT oracle is also a MEASURING INSTRUMENT, not just a seeder — it is how §4j proved the
# boolean's 35 ms is real OCCT cost and not our BRepCheck gate. `.venv/bin/python`, `from OCP.… import …`.
```

⚠ **Only an OCCT *version bump* costs 2.5 h.** Editing our own `src/kernel.cpp` never does.

- **Node** 20.20.2, **pnpm** 10.34.5 **(corepack only — see above)**, **uv** 0.11.20 (`~/.local/bin/uv`).
- **`libgl1` is installed** (apt) — OCP pulls in VTK, which links `libGL.so.1`; without it `import OCP`
  fails on a headless box.
- No ports bound, no containers created, no other project touched by this work.
- Python: **no system pip/venv on this box** — always `uv` (`cross_projects_policy.md` §8).

---

## §7 — Entry archive (1–15). Compressed 2026-07-13; full narratives are in git history.

**Their durable lessons have all been promoted into §1–§4 — that is where a fresh agent reads them.
This table exists so nothing is lost and nothing is repeated.**

| # | Date | What happened | The durable lesson (now in §1–§4) |
|---|---|---|---|
| 1 | 07-11 | P1 ground work: pnpm workspace, TS strict, protocol v1, kernel mock, client dispatcher, golden harness, CI. | The kernel is **transport-agnostic** ⇒ the whole seam is testable headlessly. |
| 2 | 07-11 | Owner rulings applied to the docs (`cadquery-ocp`; verification scope). | **We trust OCCT; we verify our own code** (§4b). |
| 3 | 07-11/12 | Pushed to GitHub. The OCCT→WASM build investigated **to a hard stop**. | **`opencascade.js` cannot be linked here — OOM at a 2 GB cap even for a 6-symbol build.** Build **upstream OCCT**, LTO off. §1 trap 1. |
| 4 | 07-12 | **REAL OCCT GEOMETRY IN WASM.** The spike is green. | The build links **TKOffset** — recorded then as *"wall layers"*, and **D30 would not need it for another 12 entries.** |
| 5 | 07-12 | Four owner rulings; kernel + recipe committed. | Threading: **v1.0.0 ships single-threaded** (nail naming on one core). The `.wasm` **is committed**. IFC via **IfcOpenShell**, not `web-ifc`. |
| 6 | 07-12 | **Owner ruling: BUNYAN IS OPEN SOURCE (AGPL-3.0 + commercial).** | §4e. **The LGPL side-module task is CANCELLED.** The CLA is a hard prerequisite. |
| 7 | 07-12 | The kernel is **wired in** (`@bunyan/kernel-occt`); `measure` lands. | **`Left/Right/Front/Back` are not the axes you think** — four of six faces were mislabelled and **nothing failed** (§1 trap 4). |
| 8 | 07-12 | **Owner ruling: BUNYAN IS AGENT-NATIVE (D19–D23).** | §4f. **The agent API *is* the Command registry.** There is no agent phase, and there must never be one. |
| 9 | 07-12 | **Persistent naming on hard topology. The #1 risk retired.** Cylinder, boolean, fillet + the D23 query ops. | **The naming literature is wrong about OCCT 7.9.3, and we measured it** (D24). §1 trap 5. |
| 10 | 07-12/13 | **MIQDAR: the second product is specified.** | §4g. **The P5 freeze now has a Miqdar gate.** |
| 11 | 07-13 | **`transform` lands — and exposes a naming hole Entry 9 shipped: a wall with a GROOVE could not be modelled.** | **`transform` mints NO identities** (D25). And: **"the #1 risk is retired" was true only of the cases we had measured.** §1 trap 6. |
| 12 | 07-13 | **The protocol could not build a FLOOR PLATE.** `extrude` + `chamfer` were in P2's own step list, unbuilt, for a month. | **A phase's exit criteria are a specification, not a summary** (§1 trap 7). And **NEVER FUSE TWO ELEMENTS** (§4h) — measured here. |
| 13 | 07-13 | **Deep audit: what the entries CLAIM vs what is wired.** Six gaps, three serious. | The BREP cache had **zero code** and was promised in five places. `measure` could not take a `ref`. `capabilities` had drifted. |
| 14 | 07-13 | **`revolve` lands** (P2's op set complete). A **round column** finds the naming hole the spec reserved the positional key for. **And the CI mystery is solved.** | **CI was never green because it *could not be*** — `format:check` runs **before** the tests and failed on the committed tree. *Nobody needed the Actions tab: CI's steps are commands, and they run on this box.* |
| 15 | 07-13 | **Three owner rulings land: the positional key (D28), the freeze's meaning (D13), the BREP cache deferred (D29).** Entries 11–14 pushed. | **D28 is bounded by a structural fact:** `transform` mints no identities ⇒ the key runs in the element's **own build frame**. And **our `bounds` was loose on curves** (§3, trap 4). |

---

## Entry 16 — 2026-07-13 — Zayd — **THE MODELLING LAYER (D30–D33).** *Full ruling text: §4h.*

**Task (owner):** *"remember the goal is to beat Revit/ArchiCAD, and Miqdar makes it an ECOSYSTEM, not
a 3D app. Study deeply, find the needed improvements — for example beams are not supported, and this is
unacceptable — and the existing inconsistencies."*

**He was right, and the beam was the tip of it.** Studied against **what the product says it is for**
rather than against its own spec ⇒ **four gaps, all inside the freeze window (§4h).** No code changed
(139/139) — **which is the point: none of it touched the kernel.**

- **Miqdar: three obligations discharged.** Its §3.4 row 6's *"lossy but correct… ACCEPTED"* beam
  round-trip is **void** — full fidelity at launch. ⚠ **One caveat owed and recorded:** D28 is a
  *bounded* exception to the D1 guarantee Miqdar's binding contract leans on. ⚠ **And Miqdar is a
  stakeholder in D29: it has a solver, not an OCCT kernel ⇒ it cannot produce a BREP cache even in
  principle.**
- **⚠ Beam is NOT in "on Miqdar's account."** The plan explicitly forbade that; **the caution was right
  and the conclusion was wrong.** *A BIM authoring tool without a beam is not a BIM authoring tool* —
  Bunyan would have needed it had Miqdar never existed. **The no-schedule-coupling rule stands unamended.**
- **⚠ The method is the entry's real content:** *a spec cannot audit itself.*

---

## Entry 17 — 2026-07-13 — Zayd — **THE ECOSYSTEM (D34–D38).** *Full ruling text: §4i.*

**Task (owner):** *"study Planitor… then think deeply about how all apps can be linked"* — then,
mid-analysis: *"look for a doc mentioning **BIMsync**."* **That pointer changed the answer.**

**Bunyan was IFC-import-only ⇒ the authoring head of the ecosystem could not hand its model to the PM
product that already exists** — while Planitor + BIMsync had **already defined** the Clean Delta
Package. So Bunyan does not invent a transport; it becomes a **third producer** of the existing one
(§4i). No code changed.

**Three convergences — the evidence the domain model is right.** Planitor's `ElementType` /
**`ConstructionVariant`** / `ElementInstance` / *section × length × density* landed **exactly** on
Bunyan's `BimObjectType` / **`ElementStyle` (D31)** / element instance / **`Section` + `Material`
registries (D33)** — derived independently, months apart, from Revit-parity and Miqdar's `DesignGroup`.
**Three products, different people, different years, same model.**

**⚠ THE LIMIT OF THAT ENTRY, STATED PLAINLY: `BIMsync_cloude` is not on this box and its spec has not
been read.** Everything about BIMsync is inferred from `Planitor/v2.2_spec.md`. **No BIMsync document
was edited, and none may be until its spec is here.**

**Docs updated (Entries 16+17):** `core_logic.md` (Part, ElementStyle, LinearMember, Grid, spatial tree,
Material/Section/Quantity, the ecosystem, **domain rules 11–15**), `V1.0.0_spec.md` (**§4.4a/§4.4b** the
two new registries, **§5.4** the element model, §6 `scene.json` + manifest, **§7a The Ecosystem**,
**D30–D38**), `architecture.md` (seven registries), `v1.0.0_imp_plan.md` (P3/P5/P6),
`Miqdar_v1.0.0_spec.md`, and — in Planitor — `v2.2_spec.md` (**Bunyan as a third producer**, contract
**v1.1**, **D9–D11**) + `General_description.md`.

---

## Entry 18 — 2026-07-13 — Zayd (dev box) — **P3: THE DOCUMENT MODEL IS BUILT. Every ruling from D19 to D38 is now CODE, and the D29 measurement is in.**

**Task (owner):** continue the implementation; ask about important design decisions. **Three were
asked and ruled** before a line was written (below). **The build is complete and green: 169/169, all
five CI steps pass on this box.**

### 1. The three owner rulings this session opened with

| Ruling | Owner's call |
|---|---|
| **How far to take P3** | **Build the full headless core, then measure D29.** Browser storage stays behind a seam for Amer. |
| **⚠ D39 — deleting a wall that hosts a window** | **CASCADE-DELETE, warn first, one undoable edit.** *P3's exit criteria demanded a "defined, tested outcome" and no document said which. Full reasoning: §4j-1.* |
| **The seam with Amer** | **Zayd owns the document core; Amer stays on the browser.** Each of us can then actually *verify* what he wrote. |

### 2. What was built — `@bunyan/document` (P3 steps 1–5, 7)

**Every one of D19–D38 is now executable code, and none of it touched the kernel or the protocol —
which is the proof the "it costs the kernel nothing" claim was true and not a hope.**

- **The parts-aware scene graph** (D30) — `scene.ts` **IS** `scene.json`. Parts are **not stored**:
  they are built from params + style, exactly as geometry is.
- **`ElementStyle`** (D31), the **Material** + **Section** registries (D33), the **spatial tree**
  (D35), **Grid** (D32), **classification** (D36).
- **The seven registries** + the **generated** capability projection (D21).
- **The Command layer** (D19) — 11 core commands, each with an **`argsSchema`**, each **returning its
  `UndoableEdit`** (D23).
- **Undo as state deltas** (spec §6.1), never command replay — *replaying commands backwards would
  re-run the booleans, and boolean topology is not guaranteed identical across runs.*
- **The rebuild engine** — base parts → resolve each opening's `hostRef` → **cut through EVERY layer**
  → **place last**. Plus the heap discipline (intermediates freed at the end of every rebuild).
- **The broken-reference state** (domain rule 3) — **it did not exist anywhere in the codebase before
  today.**
- **The agent surface** (D22) — `createAgentSurface(doc)`, `agentApi: 1`, no browser, no back door.
- **`.bnn`** (D38) + the **Model Revision** chain (D34) + load-time **migration** + **autosave**.

### 3. ⚠ Three things I did that the plan did not literally ask for, and why

- **D19 is a PACKAGE BOUNDARY, not a lint rule.** `@bunyan/document` **does not depend on
  `@bunyan/kernel-client` at all** — `DocumentContext` takes a narrow `GeometryGateway`, which a
  `KernelClient` satisfies structurally. **A package that does not have the dependency cannot import it
  — not by accident, not under a deadline.** The grep gate (`d19-boundary.test.ts`) then covers `apps/`,
  where a package boundary cannot reach, and **allowlists `apps/<app>/src/bootstrap.ts` in advance so
  the rule lands before Amer's code does.**
- **An element is built in its OWN FRAME and PLACED LAST.** `placement` (a `RigidMotion[]`) is applied
  **after** the openings are cut. This is not a style choice: `transform` mints no identities (D25), so
  **the openings are cut in local space and moving a wall in the world cannot re-target a single
  reference** — and it is exactly the structural fact that bounds **D28**'s residual risk. *(It also
  turns out to be the enabling condition for the `instantiate` idea in §4j-3c.)*
- **The fixture BIM types live in `tests/`, not in a package** — the real MVP types are **P5**. These
  exist to exercise the registry contract and to give D29 a real building to measure. **Do not mistake
  them for the shipped types.**

### 4. ⚠ THE SHAPE NOBODY HAD CUT — and, for the first time, it was clean

Following §1's own advice, I cut **a window through all three layers of a wall rotated 30°**. It
worked: volumes **identical** to the straight wall, host-face token **byte-identical**, no broken refs.
**No new gap.** *That is one data point, not a trend — the method has found eight gaps and this is the
first clean run.*

### 5. ⚠⚠ THE MEASUREMENT — AND IT FOUND SOMETHING BIGGER THAN THE THING IT WAS MEASURING

**D29's number is in (§4j-2): a 195-element building cold-loads in 7.3 s, and 100% of that is inside
OCCT** — our plumbing is 0.2%. Cross-checked against **native OCCT**: the boolean genuinely costs
11 ms (35 ms in our WASM ≈ 3× native, exactly what LTO-off + single-threaded predicts), our
`INVALID_RESULT` gate costs only 9%, and `AddOptimal` costs nothing. **⇒ For the first time the cost is
REAL OCCT WORK and not our misuse of an API** — the five-for-five pattern breaks.

**But the same profile says a STYLE EDIT ACROSS 400 WALLS TAKES ~21 SECONDS** — and **a disk cache
cannot help that**, because it is in the interactive path. **That is D31's headline feature**, the
largest modelling gap we just closed. **The D29 ruling should not be made without it in view (§4j-2,
§4j-3).**

### 6. ⚠ WHAT IS OWED — and one item is time-critical

1. **The D29 ruling** (§4j-2). The owner deferred it *to this step*; the evidence is in hand.
2. **The performance decision** (§4j-3) — ⚠ **§4j-3(c), an `instantiate` op, is free only until the
   protocol freezes at the end of P3, which is NOW.**
3. **Then freeze the protocol** (P3 step 8).

### 7. Also fixed, and it had been wrong for 17 entries

**§6's `pnpm` line.** pnpm is **not** at `~/.npm-global/bin` and is **not** on PATH — it exists **only
via corepack**, and `pnpm verify` dies at its first sub-script without a shim. Every doc in the repo
says `pnpm verify`. §6 now says how to make that true.

### 8. Next

1. **§4j. All three items, in order.** Do not start new construction first.
2. **P5 freezes `BimObjectType` — against a COMPOSITE, STYLED wall.** A single-solid wall would validate
   a contract the product cannot use. *(And P5 step 6a is the Miqdar gate — §4g.)*
3. **Keep cutting shapes nobody has cut.** A stair. A roof. Two walls that meet. A duct through a beam.

---

## Entry 19 — 2026-07-13 — Zayd (dev box) — **THE P3 REVIEW: SIX DEFECTS, A GREEN SUITE, AND THE MOAT DOES NOT WORK.**

**Task (owner):** review P3 and everything before it, per `review_prompt.md`. **Reviewer, not implementer —
no `src/` file was touched.** Probes were written in `tests/`, run against the **real OCCT kernel**, and
**deleted**; the tree is byte-identical to how it was found (169/169 before, 169/169 after).
**Full evidence: `review_P3.md`. The work: `P3_correction_plan.md`. The findings: §4k.**

### 1. ⚠⚠ THE HEADLINE — THE CLEAN DELTA CANNOT BE COMPUTED FROM A `.bnn`

`core_logic.md` rule 14 and D34 stake the entire ecosystem argument on one sentence: *"`change_type` is
**READ** off the `UndoableEdit` log, never inferred by diffing two models."* **It is not true.**

- `ModelRevision` carries **no pointer into the log**; **no `UndoableEdit` carries a revision, a seq or a
  timestamp**; the log **is the undo stack** (**200-deep**, `shift()`ed, and **`undo()` pops entries out of
  it**); and `DocumentContext` **does not know its own revision** — it is a field the *caller* hands to
  `saveBnn`.
- **Measured:** issue rev1 → edit → issue rev2 → save → reload. The consumer sees six edits and **cannot say
  which happened after rev1.** 250 edits pushed → the first 50 are **gone**.

⇒ **A P6 Clean Delta producer would have to DIFF TWO MODELS** — which is exactly what BIMsync is an entire
platform built to do *for foreign models*, and exactly what §4i says Bunyan never has to do *"by
construction."* **The property we sell is the property we did not build.** ⇒ **D40 is owed.**

### 2. THE OTHER FIVE (all reproduced; all in §4k)

**Ids are REUSED** (delete `wall-3` → save → reload → create → **`wall-3`** — rule 13: *"a breaking change to
three other products"*) · **"reject + keep last-good" is FALSE for multi-element edits** (the scene rolls
back, the **geometry does not**; a sibling is left at the **rejected** thickness and `quantities()` reports
**double** the true volume with **`basis: 'exact'`**) · **one unregistered type BRICKS the file** ·
**autosave recovers STALE work** (saved `9999`, recovered `1300`) · **a dangling material gives `0 kg`,
`basis: 'exact'`**.

### 3. ⚠⚠ THE METHOD, AND IT IS THE ENTRY'S REAL CONTENT

**§1's table says every gap was found by *using* the thing. Entry 19 adds the second half of that sentence:**

> **A GREEN TEST PROVES ONLY WHAT IT ASSERTS — AND TWO OF OURS ASSERT SOMETHING WEAKER THAN THEIR OWN TITLE.**

- The **rule-4 test** (*"a failed command… leaves the document at last-good"*) uses `params: { length: -1 }` —
  which the **schema** rejects *inside the command, before the kernel is ever called*. **The geometry-failure
  path, the one the rule is about, was never exercised. And it is broken.**
- The **autosave test** calls `latest()` on **the same `Autosave` instance that wrote the snapshots** — it
  **never opens a second session**, which is *the only situation autosave exists for*. **And it is broken.**

**Both would have passed forever.** ⇒ **Added to the standing brief and to P3's exit criteria: for every
criterion, read the test that discharges it and ask what it would take for that test to pass while the
criterion is FALSE.** *(The review prompt did not ask this. It does now.)*

### 4. WHAT IS GENUINELY FINE — and how it was checked

**D30's composite wall and D31's style edit are MEASURED IN THE B-REP, not asserted** (each layer loses
exactly `w × h × its own thickness` — an assertion that fails if the feature is absent). **The
broken-reference state is the best-executed part of P3** — marked, visible, never auto-healed, still
loadable, still editable, repairable only by an `UndoableEdit`. **The heap discipline holds** (asserted
against `wasmLiveHandles()`, the WASM side's own count — and it held through the failure probes: 26 → 26).
**D19 is structural:** `packages/document` depends on `@bunyan/protocol` + `fflate` and **cannot import the
kernel client**. **The protocol did not move for any of D30–D38** — that claim is true.

### 5. COVERAGE — what this review would NOT have caught

**No browser half** (Amer's; does not exist). **D29's numbers were taken as given, not re-derived** — no
finding depends on them. **The kernel's C++ and the naming resolver were not audited** (P2 scope; §4b's
oracle is better at it). **⚠ AND NO NEW BUILDING WAS MODELLED** — §5's *"cut the shapes nobody has cut"* is
**still owed**: a stair, a roof, two walls that meet, a duct through a beam. This review drove the document
API at its **failure** boundaries, which is a **different hunt** finding a **different class**. Both are
needed; only one was done.

### 6. NEXT

1. **⚠⚠ D40 + D41 — the owner's, and nothing should be built before them** (`P3_correction_plan.md` §0).
2. **Then `P3_correction_plan.md` §1, in its order** — including the **two test rewrites, which are the
   deliverable, not tidying.**
3. **The protocol freeze is NOT blocked** by any of it — nothing here touches the kernel. **Closing P3 is.**

---

## Entry 20 — 2026-07-13 — Zayd (dev box) + **THE ARCHITECT** — **SEVEN RULINGS CLOSE THE P3 REVIEW (D40–D46). THE DOCS ARE THE CONTRACT AGAIN.**

**Task (owner):** *"ask me about all relevant design decisions with rich and clear options so I can close
this matter, then update all relevant docs."* **Seven were put to him; seven were ruled. No code changed —
`169/169` still green. What changed is the CONTRACT, and it is now ahead of the code, which is the right way
round.** The work is `P3_correction_plan.md` §1.

### 1. The rulings

| | Ruling |
|---|---|
| **D40** | **The change feed is an APPEND-ONLY JOURNAL, not the undo stack.** `seq` per edit · `issued_at_seq` per revision · never trimmed · **an undo appends a REVERSAL** (a consumer may already hold the state being reversed *from*). ⇒ the delta is `journal.filter(e => e.seq > revN.issued_at_seq)` — **read, not inferred, BY CONSTRUCTION.** |
| **D41** | **`core.issueRevision` is a Command.** An actor that can author a building can **release** one (rule 9). |
| **D42** | **Rule 4 is ALL-OR-NOTHING by construction + a UNIVERSAL `dryRun` on the executor** — full fidelity, real kernel, staged, discarded; returns the would-be `UndoableEdit` or the failure **naming the offender** (a UI highlights it; an agent reads it). ⚠ **`planDelete()` is DELETED**, and no `plan…()` verb is ever written again. |
| **D43** | **An unknown OR FUTURE type/schema: the document OPENS**, the element is `failed`, visible, and **PRESERVED VERBATIM THROUGH SAVE.** |
| **D44** | **The PEI is a PREFIXED ULID** — `wall-01J8Z3K7Q2`. |
| **D45** | **`discipline` lives on the PART, not the element** — not even derived. `Classification` = `{ifcClass, loadBearing}`. |
| **D46** | **One physical thing = one element, one PEI.** Superposition rules **PROVISIONAL**, with the open question **named**. |

### 2. ⚠⚠ THE OWNER FOUND ONE THE REVIEW DID NOT — AND IT IS THE BEST FINDING OF THE SESSION

Asked where `discipline` should live, he refused the question and asked a better one: ***"why do we need a
per-element discipline at all? A slab is structural and the ceiling is architectural — filter by
architectural and the slab must disappear."*** He was right, and the review had **conceded too little**: I had
proposed keeping a *derived* element-level value. There is no need for one at all.

**I went looking for every consumer of an element-level discipline. All three evaporate:**
**IFC** has **no discipline attribute** on an `IfcWall` (it is an MVD/property-set concern) · **Miqdar**
filters on **`loadBearing`** (his own ruling: *everything Miqdar returns is structural by definition — it
would never have modelled a non-load-bearing partition in the first place*) · **Planitor** routes **by trade**,
and *the plasterer bills plaster* — which is **per part**.

⇒ **An element is almost never of ONE discipline** (an RC wall is a *structural core with architectural
plaster on it*), so declaring one on it says something **false about exactly the parts that matter**. And
**two written ecosystem claims were therefore false as built**: `core_logic.md` §3.3a says Miqdar *"idealizes
the structural layer of a wall, not its finishes"* — **it could not**; §4i says *"a task binds to the part it
actually builds"* — **it could not.** ⇒ **`discipline` is authored on the Style's LAYER, carried by every
PART, and the Clean Delta carries it PER PART.** *The method that found it was neither reading nor probing —
it was **the owner reading the product against the trade that builds it**.*

### 3. What the docs now say (and they are ahead of the code — by design)

**`core_logic.md`**: §2 (no token map) · §3.3 · §3.3a (Part carries `discipline`; part names unique) · §3.4
(`defaultDiscipline`; migration is **forward-only**) · §3.4a · §3.6 (**a void has no discipline**) ·
**§3.12a — THE JOURNAL (new section)** · §3.15 (`issued_at_seq`; per-part delta) · §4 (**the PEI is a ULID**) ·
§6 · §7 (**the unbuildable element**; reject means the **whole edit**; `dryRun`) · **rules 9, 14, 15 amended;
rule 16 added.**
**`V1.0.0_spec.md`**: §4.5 (**the token map deleted**; the kernel-less-consumer question **deferred, named**) ·
§5 (the D45 box) · §6 (`.bnn`: ULID, `issued_at_seq`, the journal) · **§6.1 (the two-structures box — the
self-contradiction that caused the whole bug)** · §7a · **§14: D40–D46.**
**`architecture.md`**: the token map (×4) · the save path · `.bnn` · the untrusted-recipe rule.
**`v1.0.0_imp_plan.md`**: P3 status + exit criteria; **P5** (types carry `defaultDiscipline`); **P6** (the IFC
importer registers **a Type per IFC class** — else a consultant's file lands as one undifferentiated
discipline and D45's routing is dead on the import path).

### 4. ⚠ THE THREE THINGS TO CARRY FORWARD

1. **The spec contradicted itself for months and the code built the wrong half** (§6.1 vs §7a on
   `history.json`). **Nobody read the two sentences side by side.** ⇒ *When a doc states a fact twice, one
   copy is already stale — and the code will implement whichever one it read first.*
2. **`seq` is document-scoped** — right for single-user v1.0.0. **Co-editing needs a merge-ordered journal**
   (Lamport / CRDT). **Not solved, not foreclosed** (the PEIs are globally unique ULIDs). **Recorded, not
   silently skipped.**
3. **The MEP-vs-structure question is OPEN and named** (`core_logic.md` rule 16): a duct occupying a beam's
   space is almost certainly a **CLASH** (report + resolve — `distance` answers it) and **not** a collision of
   disciplines. **Do not implement past that line.**

### 5. Next

**`P3_correction_plan.md` §1, in order.** Then the D29 ruling + the performance decision (§4j — *still owed,
untouched by all of this*), then **freeze the protocol** (P3 step 8), then close P3.

---

## Entry 21 — 2026-07-14 — Zayd (dev box) — **P3 IS CLOSED. THE SIX DEFECTS ARE FIXED, THE PROTOCOL IS FROZEN, AND EVERY FIX WAS VERIFIED BY REVERTING IT.**

**Task (owner):** *"finalize implementation of P3 and ensure previous work is consistent and finalized
correctly so that you can hand over to Amer."* **Done. `pnpm verify` → 186/186, all five CI steps green on
this box.** Three owner rulings were taken mid-session (below). **`P3_correction_plan.md` is fully executed.**

### 1. The corrections — all seven items, and **eleven fixes, each revert-verified**

| Ruling | What landed |
|---|---|
| **D44** | The PEI is a **prefixed ULID** (`ulid.ts`, monotonic within a millisecond). `#idCounter` and `highestSuffix()` are **deleted**. |
| **D40** | **`Journal`** — append-only, monotonic `seq`, **never trimmed**; `undo()` appends a **REVERSAL**. `ModelRevision` carries **`issued_at_seq`**. `doc.changeFeed()` / `doc.changesSince(rev)`. ⚠ `history()` still returns the (bounded) undo stack — **the two are deliberately not merged**. |
| **D41** | **`core.issueRevision` is a Command.** `issue()` is deleted from `bnn.ts`; the minting lives in `revision.ts`. ⚠ **It is journalled but NOT undoable** — you cannot recall a revision you already handed downstream. |
| **D42** | The rebuild is **STAGED, then COMMITTED**. Nothing live is touched until every element succeeds. **`execute(…, { dryRun: true })`** on the executor. **`planDelete()` DELETED**, on the document *and* the agent surface. |
| **D45** | `discipline` moved to the **PART** (`StyleLayer` → `BuiltPart` → `Part`); `BimObjectType.defaultDiscipline`; `Classification` = `{ifcClass, loadBearing}`; `query({discipline})` is **part-scoped**; **`mass` is OMITTED, never zeroed**, when a density will not resolve. |
| **D43** | An unknown **or future** type is `unbuildable`: the document **opens**, the element is visible via `doc.unbuildable()`, is never built, **and round-trips VERBATIM**. A future `schemaVersion` is a typed refusal naming the version. |
| **§1[7]** | `createStyle` validates materials · **duplicate layer names refused** (they minted identical `SubShapeRef`s) · **`containerId`/`gridRefs` validated** (a typo silently put a wall on the ground floor) · **`typeof null === 'object'`** fixed · **ONE derivation of "what must rebuild"**, used by execute/undo/redo alike · autosave **seeds its counter from the store** · six registries, not seven (the 7th is the *kernel's* naming resolver — **stop saying seven**). |

### 2. ⚠⚠ THE TWO WEAK TESTS WERE REWRITTEN — AND THE REWRITE WAS THE HARD PART

- **Rule 4** now fails **in the kernel**, on a **multi-element** edit. ⚠ **Today's fixtures could not produce
  that failure** — the plan said so, and it was right: a style edit that fails *every* instance is
  *accidentally safe*. So the test registers a **wall with a rounded corner** whose **fillet radius is an
  INSTANCE param while the layer thickness is on the STYLE** — thin the style and **one** wall becomes
  unfilletable while its sibling rebuilds perfectly. **That asymmetry is the whole bug**, and it is exactly
  what P5's real types will do (§6.4 calls it *normal*).
- **Autosave** now **opens three sessions** over one store. The old test called `latest()` on the same
  instance that wrote the snapshots — *the only situation autosave exists for was never entered.*

**⚠ AND THEN EVERY FIX WAS REVERTED, ONE AT A TIME, TO WATCH ITS TEST FAIL.** All eleven did.
*A fix without a test that fails in its absence is an assertion, and this project has watched assertions
pass for a month.*

### 3. ⚠⚠ THE GAP THE NEW TEST FOUND — AND IT IS A `BimObjectType` CONTRACT HOLE, FOUND WITH ONE MONTH TO SPARE

Writing that rounded-wall type — **the first Type in this project to run TWO kernel ops for one part** —
immediately leaked **four OCCT solids per rebuild**. `BuildContext` gave a Type **no way to declare an
intermediate**: the engine only tracks handles *it* creates. Every fixture until now ran exactly **one** op
per part (a box, an extrude), so the hole was invisible.

⇒ **`BuildContext.discard(handle)` is new, and `BimObjectType` freezes at P5 — so this landed just in time.
P5's real Wall/Slab/Opening will ALL run two or more ops** (extrude→chamfer, box→fillet).

⚠ **And the authoring rule, which cost a second measurement to find: DECLARE *BEFORE* THE RISKY OP.**
`discard` only *declares* — the engine frees at the end of the rebuild — so the handle **is still a valid
operand** after you declare it. Declare it *afterwards* and a kernel refusal throws straight past the
declaration: **the solid leaks on precisely the path where a leak is hardest to see.** (Measured: the happy
path was clean; only the *refused* rebuild leaked.)

**⇒ The method's ninth gap — and it was found the way all nine were: by *using* the API to build something a
building actually has, not by reading the code.**

### 4. The three owner rulings this session took

| | Ruling |
|---|---|
| **D29 — the BREP cache** | **SHIP IT in v1.0.0.** *(Zayd recommended dropping it. The owner: a 75-second open on a 2,000-element project is a product failure regardless of what else is also slow.)* ⚠⚠ **AND THEN THE RULING OPENED A TRAP THAT IS NOT ABOUT PERFORMANCE AT ALL** — see §5 below. |
| **Performance** | **Reserve `instantiate`** (the ~21 s style edit) **and try `-O3`/LTO.** Multithreading stays v1.0.x. |
| **The cache's identity design** | **Bind by CANONICAL ORDER, verify a fingerprint, refuse with `CACHE_STALE` rather than mis-name.** (Put to the owner *before* a line was written, because it changed what "ship" costs.) |

### 5. ⚠⚠ THE THING WORTH CARRYING FORWARD: **"SHIP THE CACHE" WAS A D1 QUESTION WEARING A PERFORMANCE COSTUME**

A `.brep` stores **shapes**. It does not store their **names**. Every `SubShapeRef` is **derived by re-running
the recipe** — *identity is assigned by the operation that mints it* (D1). **Load from a cache and the recipe
never runs**, so no identities are minted, and the window hosted on `wall-7.plaster/face/y-min#0` **has
nothing to attach to.** ⇒ the cache must carry the tokens — **a persisted name→shape index, i.e. exactly the
"token map" the spec DELETED one session ago and that D1 forbids.**

**Nobody asked for a token map. It arrived as a *consequence* of a decision that looked purely like a
performance trade-off** — and it would have been written, quietly, by whoever picked up "implement the
cache" as a serialization ticket. ⇒ **THE DESIGN THAT KEEPS D1 INTACT (owner-ruled, §4j-2):** bind by
**canonical order** (D8 — a rule *derived from the shape*, never a raw index) · **verify a fingerprint**
recomputed from the shape actually read · **refuse (`CACHE_STALE`) rather than mis-name.** ⇒ **the cache is
a bet the document is always free to abandon**, because the recipe can always rebuild. A stale, corrupt or
**hostile** cache costs *a rebuild* — **never a wrong name.**

> **The lesson, and it generalises: when a decision is framed as a trade-off, check what it costs the
> INVARIANT — not just the schedule. The performance question was answerable in an afternoon. The identity
> question it dragged in behind it is the one that could have quietly repealed D1.**

### 6. `-O3` / LTO — **MEASURED, AND THE ANSWER IS NO. DO NOT RE-RUN IT.**

```
  -O2 (was)     7,334 ms   15.37 MB
  -O3 (SHIPS)   7,283 ms   14.59 MB   ← speed is NOISE. 5% smaller is real, so we keep it. 186/186 pass on it.
  -O3 -flto     7,235 ms   14.59 MB   ← also noise, at 2x the link time.
```

⚠ **LTO LINKS FINE HERE — it does NOT OOM.** Entry 3's hard stop was **opencascade.js's** whole-program graph,
not ours, and **that distinction had never been tested.** **But it buys nothing, and the reason is
structural: our OCCT static libs are PLAIN OBJECT FILES, not LLVM bitcode** (`ar t libTKMath.a` →
`math.cxx.o`). So `-flto` can only optimise `kernel.cpp` — **it cannot see into OCCT, where 100% of the
runtime is.** It is optimising the 0.2%. The only way LTO could ever pay is **rebuilding OCCT itself with
`-flto`** — a 2.5 h run, and *precisely* the whole-program link that OOM-killed opencascade.js. **Not
attempted, not recommended: multithreading (v1.0.x) is the lever that actually closes the 3× gap to native.**

*(Run under a hard `--memory=2g` Docker cap throughout — the box is the production host for two live public
sites, and an uncapped OOM here does not merely fail a build. §6a. No container was paused; none needed to be.)*

### 7. The protocol is FROZEN (P3 step 8)

**18 live ops + 5 RESERVED** + the `CACHE_STALE` failure code. Reserved: `sectionCut` · `importIfc` (P6) ·
**`instantiate`** · **`exportBrep`** + **`importBrep`**. ⚠ **Every reserved op is declared, typed, and
deliberately unimplemented** — a test pins that they answer `UNKNOWN_OP` and never appear in `capabilities`.
**Changing an existing op's envelope now needs Architect sign-off; adding an op stays additive (D13).**

### 8. Next

1. **⚠⚠ THE D29 CACHE BODIES — and §4j-2 is its spec. It is an IDENTITY task, not a serializer task.**
2. **Keep modelling real buildings with the API.** A stair. A roof. Two walls that meet. A duct through a beam.
3. **Amer is unblocked** — §5's handoff lists the four API changes since Entry 18 (`planDelete` is gone;
   `discipline` is on the part; ids are ULIDs; `mass` may be absent) and the two new UI surfaces
   (`unbuildable()`, `changeFeed()`).

---

## Entry 22 — 2026-07-14 — Amer (local PC, Windows, real browser) — **THE BROWSER APP EXISTS. `apps/web` BOOTS THE REAL OCCT KERNEL AND AUTHORS A COMPOSITE WALL THROUGH THE COMMAND LAYER — VERIFIED IN A REAL BROWSER.**

**Task (owner):** *"resume implementation."* Picked up Zayd's Entry-21 handoff. **P3 is closed and the protocol
is frozen, so the next work is mine: `apps/web`, which did not exist.** This is the **first browser code in
the project** — the whole hot path Amer owns. Built the FOUNDATION and verified the entire seam end to end
against the **real OCCT WASM**, not the mock.

### 1. What was built (`apps/web` — Vite + React 18 + three.js)

- **`src/bootstrap.ts` — THE ONE ALLOWED `KernelClient` HOLDER (D19).** Constructs the OCCT worker
  (`new Worker(new URL('@bunyan/kernel-occt/worker', import.meta.url), { type: 'module' })`), wraps it in
  `KernelClient`/`WorkerTransport`, handshakes, registers `CORE_COMMANDS` + the scaffold type, builds
  `DocumentContext` on the narrow `GeometryGateway`, and wires `window.bunyan = createAgentSurface(doc)`.
  `tests/d19-boundary.test.ts` allowlisted this path in advance; **the rule landed before the code, exactly
  as intended.**
- **`src/render/RenderGateway.ts` — the render seam, and a real D19 decision.** The renderer needs
  `tessellate`; `GeometryGateway` **deliberately omits it** (the document is parametric truth, never
  triangles). So the bootstrap derives a **narrow, read-only `RenderGateway` (just `tessellate`)** from the
  same client and hands it to the viewport. ⚠ **The document AUTHORS geometry (the only door); the renderer
  only DRAWS.** A component has no `KernelClient` to reach past this with — it cannot `makeBox`, cannot mint
  an identity. *This is how the browser renders without breaking "no component holds a KernelClient."*
- **`src/render/Viewport.ts` + `ViewportCanvas.tsx` — the three.js scene** (WebGL2). `MeshBuffers` →
  `BufferGeometry`, orbit camera, Z-up mm world, grid/axes. **An element is its PARTS (D30): each part is
  tessellated and drawn as its own mesh** — a wall is three solids, not one. The provenance map is carried
  through `MeshBuffers` for sub-shape picking (P4 step 4, not yet wired).
- **`src/scaffold/` — a placeholder Wall type + demo seed.** ⚠ **NOT the shipped types** (those are P5);
  app-local (not imported from `tests/`) and clearly marked. The seed drives materials → style → wall
  **entirely through `doc.execute`** — every call is one an agent could issue verbatim.

### 2. ⚠ VERIFIED IN A REAL BROWSER (the thing a headless box could never check)

`corepack pnpm --filter @bunyan/web dev`, opened in the browser:
- **The real OCCT 7.9.3 WASM booted** — status bar reads `occt 7.9.3 · occt-7.9.3-emcc-6.0.2` from the
  handshake (the build id that will key the service-worker cache, D11).
- **A composite 3-layer wall was authored through the command layer and quantities came back EXACT from the
  B-Rep, per part, per material (D30/D45):** structure (blockwork, structural) 2.24e9 mm³ → **3136 kg**;
  insulation (EPS, architectural) 896e6 mm³ → **26.9 kg**; finish (plaster) 168e6 mm³ → **201.6 kg**. All
  hand-checked against `L×t×h × density`.
- **`window.bunyan` exposes 12 commands + the type** (agent surface live, D22). **Zero console errors.**
- **Gates green:** `apps/web` typecheck (strict) ✓, eslint ✓, prettier ✓. `d19-boundary` ✓.

### 3. ⚠⚠ A CROSS-PLATFORM TEST BUG THE HANDOFF TO WINDOWS SURFACED — AND IT HAD BEEN RED ALL ALONG

`tests/d19-boundary.test.ts` matched an allowlist of **forward-slash** regexes (`/^tests\//`,
`/^apps\/…bootstrap\.ts$/`) against `path.relative()` output — which is **backslashes on Windows.** So on
**any Windows checkout the whole test was red**, flagging every legitimately-allowed file (all of `tests/`)
as a D19 offender. **CI (Linux) never saw it; Amer's box hit it on the first `vitest` run.** Fixed by
normalising separators (`.replaceAll('\\\\', '/')`) — intent unchanged, and now green on both OSes.
⚠ **The lesson: the harness had never run on Amer's OS.** More of it may assume POSIX; watch for it.

### 4. One toolchain note for the local PC (Windows)

`pnpm` is corepack-only here too (`corepack pnpm …`). pnpm 10 blocks build scripts by default, so **esbuild's
postinstall was skipped and Vite could not start** until allowlisted — added `pnpm.onlyBuiltDependencies:
["esbuild"]` to the root `package.json` and `corepack pnpm rebuild esbuild`.

### 5. NOT done (the rest of P4/P5/P6 that is mine), roughly in order

1. **The ribbon generated from the Command registry** (`describeCommands`) — a button per verb, zero hand-wiring.
2. **The auto property panel from each type's `parameterSchema`** — editing a param dispatches
   `core.setParams` (debounced, `coalesceKey` on drags).
3. **Sub-shape picking** — picked triangle → `SubShapeRef` via the provenance map already carried.
4. **Browser storage** — implement `StorageAdapter` (`bnn.ts`) over **IndexedDB / OPFS / File System Access**,
   wire `Autosave`. ⚠ **`list()` MUST return keys already in the store** or autosave overwrites the last
   session (there is a three-session test for exactly this).
5. **The two failure-state UI surfaces** — `doc.unbuildable()` (greyed, never "fix"/drop — it round-trips
   verbatim, D43) and `doc.brokenRefs()`; and the **change feed**: on save persist
   `saveBnn(scene, { journal: doc.changeFeed(), revision: doc.revision })` — **`doc.history()` there is the
   moat-losing bug.**
6. **WebGPURenderer + WebGL2 fallback + TSL** (foundation is WebGL2 only), service worker/PWA (D11),
   Cloudflare Pages deploy.

⚠ **Nothing is committed — commits/pushes are owner-gated.** The working tree carries `apps/web/`, the root
`package.json` pnpm key, the `.claude/launch.json` (a `web` dev-server config), and the one-line
`d19-boundary` cross-platform fix. **The scaffold types are placeholders; delete them when P5's real types land.**

---

## Entry 23 — 2026-07-14 — Amer (local PC, Windows, real browser) — **THE WALL IS EDITABLE. THE RIBBON AND THE PROPERTY PANEL ARE BOTH GENERATED FROM THE SAME SCHEMA — D21 MADE VISIBLE — AND DRIVING `window.bunyan` AT THE RUNNING APP CAUGHT A STRICTMODE BUG EVERY HAPPY-PATH CHECK MISSED.**

**Task (owner):** *"resume implementation."* Continued Entry 22's foundation with the next two items from its §5:
the **registry-generated ribbon** and the **auto property panel**. The wall now edits: a param change → `core.setParams`
→ OCCT rebuild → viewport re-tessellates → exact quantities. Verified in a real browser against the **real OCCT WASM**.

### 1. What was built (`apps/web/src/ui/` + `edit/`)

- **`ui/SchemaForm.tsx` — ONE renderer, TWO consumers (D21 made visible).** A `ParamSchema` → a form: number/integer
  (a **slider when bounded**, else a typed input), boolean, enum (`<select>`), point, ref/subShapeRef (text), object/array
  (JSON textarea that only emits once it parses). ⚠⚠ **The property panel and the ribbon's command dialog are the SAME
  component** — one over a Type's `parameterSchema`, one over a Command's `argsSchema`. Register a type or a command and its
  editing UI exists for free, the exact mirror of the generated agent tool list.
- **`ui/PropertyPanel.tsx` — the wall becomes editable (D19).** Every edit dispatches `core.setParams` through the one door.
  ⚠ **Dispatch discipline (`edit/runner.ts`):** a **single-flight, trailing-latest runner** collapses a drag to one
  in-flight `execute` — the app-level analogue of the kernel's `coalesceKey`, and it is what keeps two commits from
  interleaving their heap frees (reject+keep-last-good protects a FAILED command, not two that succeed at once). A live
  slider drag ALSO carries `coalesceKey: setParams:${id}` so the kernel discards superseded frames. The panel keeps a local
  `draft` so inputs stay at 60 fps, and resyncs from the document only when NOT mid-gesture (so undo shows, a drag is never
  snapped back).
- **`ui/Ribbon.tsx` — a button per verb from `describeCommands`, zero hand-wiring.** Clicking opens a dialog whose form is
  `SchemaForm` over the command's `argsSchema`; submit dispatches through the one door. **A button press and an agent's
  `window.bunyan` call are the identical operation.** Undo/redo sit alongside — deliberately NOT commands (`describeCommands`
  omits them; they drive `doc.undo()`/`redo()`).
- **`App.tsx` rewritten as the orchestrator.** Holds a `DocumentContext` (author) + `RenderGateway` (draw), never a
  `KernelClient`. `dispatch` = the one door as a bound fn: on success bump `version` (the signal a non-reactive doc changed
  under React), on real failure raise a header banner, on a superseded drag frame swallow silently. Renders **every** built
  element's parts (D30), quantities for the selected one, an element picker when there is more than one.

### 2. ⚠ VERIFIED IN A REAL BROWSER (port 5185 — see §4 for why not 5173)

- **12 command buttons, generated** (createContainer…updateStyle, alphabetically) + Undo/Redo. `window.bunyan` lists the same 12.
- **Property panel edit — exact rebuild.** Length 4000→6000: structure **4704 kg** (6000·200·2800·1400/1e9), insulation 40.3,
  finish 302.4 — all hand-checked. **Undo reverted to 3136 kg** and the panel resynced.
- **The ribbon dispatches through `doc.execute`.** Filled the generated `createMaterial` dialog (id/name/**category enum**/density/
  `structural` JSON), Run → committed, modal closed, no banner.
- **The live slider path (coalesceKey).** Dragged Height to 3500.6 → structure **3920.7 kg** (4000·200·3500.6·1400/1e9), exact,
  length preserved, **zero console errors** across the whole session.
- **Gates green:** `apps/web` typecheck (strict) ✓ · eslint ✓ · prettier ✓ · `d19-boundary` (3/3) ✓. The new UI files import
  only `@bunyan/document` + `@bunyan/protocol` + React — never the kernel client, so the D19 machine check stays green.

### 3. ⚠⚠ THE BUG THE METHOD FOUND — `window.bunyan` RACED ITS OWN DEAD DOCUMENT ONTO THE GLOBAL (StrictMode)

`bootstrap()` set `window.bunyan = agent` **unconditionally**, inside itself. Under React StrictMode the boot effect mounts
**twice**; the first app is **disposed before it is ever seeded** (`seedDemoScene` runs in App, only on the survivor). So the
global ended up pointing at mount-1's document — **empty scene, kernel already terminated** — while the UI used mount-2's live
one. **Symptom that exposed it:** `window.bunyan.listMaterials()` returned `[]` even though the wall's quantities resolved real
material names, and a duplicate `createMaterial` was **not refused** (the guard only fires against a scene that HAS the id).
Every visible-in-the-DOM check was green; only *driving the agent surface itself* caught it. **Fix:** `bootstrap()` no longer
touches `window`; **App wires `window.bunyan = bunyan.agent` on the surviving mount alone** (after the `if (!live)` guard). Now
`listMaterials()` = `[blockwork, eps-80, plaster-15]` and `query()` returns the wall. ⚠ **A data point for §1's second method:
the agent surface is a first-class actor, and only exercising it AS one found this. A UI-only pass never would have.**

### 4. Toolchain notes (local PC, Windows)

- **Another chat holds port 5173.** ⚠ Vite's default `strictPort:false` silently moves to 5174, which desynced the preview
  harness (it expected the declared port). Passed `--port 5185 --strictPort` via `runtimeArgs` — ⚠ **and pnpm forwards trailing
  args to the `dev` script directly; adding a `--` separator makes Vite receive the literal `--` and IGNORE the port.**
  `.claude/launch.json` is left at the canonical `dev` on **5173** (what a clean box uses); the verify server ran on 5185.
- **Scaffold change:** the wall's `length`/`height` params gained `min`+`max` — so the panel renders a **drag slider** (the
  live/coalesce path has something to drive). Ordinary wall bounds, not a UI hack. Still a placeholder; delete with P5's types.

### 5. NOT done (the rest of P4/P5/P6 that is mine) — Entry 22 §5 items 3–6 remain

1. ✅ **Ribbon from `describeCommands`** — done (Entry 23).
2. ✅ **Auto property panel from `parameterSchema`** (setParams, single-flight runner, `coalesceKey` on drags) — done (Entry 23).
3. **Sub-shape picking** — picked triangle → `SubShapeRef` via the provenance map `MeshBuffers` already carries.
4. **Browser storage** — `StorageAdapter` (`bnn.ts`) over IndexedDB / OPFS / File System Access, wire `Autosave`. ⚠ **`list()`
   MUST return keys already in the store** (three-session test).
5. **The two failure-state UI surfaces** — `doc.unbuildable()` (greyed, never fix/drop — round-trips verbatim, D43) and
   `doc.brokenRefs()`; and the change feed on save: `saveBnn(scene, { journal: doc.changeFeed(), revision: doc.revision })`
   — ⚠ **`doc.history()` there is the moat-losing bug.**
6. **WebGPURenderer + WebGL2 fallback + TSL**, service worker/PWA (D11), Cloudflare Pages deploy.

⚠ **Nothing is committed — commits/pushes are owner-gated.** The working tree now also carries `apps/web/src/ui/*`,
`apps/web/src/edit/*`, the rewritten `App.tsx`/`App.css`, the `window.bunyan` wiring moved to App (`bootstrap.ts`, `vite-env.d.ts`),
and the scaffold param bounds. **`.claude/launch.json` is unchanged from Entry 22.**

---

## Entry 24 — 2026-07-14 — Zayd (dev box, headless) — **THE P4 REVIEW. THE UI IS PRIMITIVE BECAUSE THE SPECIFICATION IS PRIMITIVE — AND THE GATES CANNOT SEE THE APP.**

**Task (owner):** review Amer's `apps/web` (Entries 22–23) and all prior work, per `review_prompt.md`; the owner
supplied one insight to act on — *the UI is very primitive next to ArchiCAD/Revit.* Then: **fix while it is cheap,
ask the owner the design questions, and fold the work into the plan.** Full evidence: **`review_P4.md`**.
⚠ **I implemented nothing.** Three throwaway probes, run and deleted; one injected type error, reverted. Tree clean.

### 1. ⚠⚠ THE HEADLINE — AND IT IS NOT AMER'S BUG

**There is no interaction model in any of the four contract documents.** Only *"button/drag → Command"*, which is
**how an action reaches the model, not how a human authors a building.** `snap` · `inference` · `preview` · `hover` ·
`gizmo` · `context menu` · `tool state` appear **nowhere in the repo.** Sixteen domain rules, **every one about the
model**; five north-stars, and **the one about authoring is the *agent's*.** ⇒ **Amer built exactly what the plan says.
The plan says: a form over a command registry.** *(To place a window a human must hand-type a `SubShapeRef` derivation
token — while D44 forbids ever showing an element id to a user as a name.)*
⇒ **`argsSchema` is a machine-readable contract for an AGENT, and the app used it as a UI spec for a HUMAN.**
**D21 is right for the property panel and the agent tool list; for the RIBBON it substituted a *form* for a *tool*.**

### 2. ⚠⚠ THE FINDING THAT LET ALL THE OTHERS HAPPEN — **THE GATES ARE BLIND TO `apps/web`**

**Reproduced:** append `export const X: number = "not a number";` to `App.tsx` → **`pnpm typecheck` EXITS 0. `pnpm lint`
EXITS 0.** Only `tsc -p apps/web/tsconfig.json` — **which no script and no CI step ever runs** — catches it. The root
`typecheck` never invokes the app's tsconfig; root `tsconfig.json` includes only `packages/*/src/**/*.ts` + `tests/**`
(and only `.ts`, never `.tsx`); **`vitest.config.ts` includes only `tests/**`, so `pnpm test` CANNOT collect a test in
`apps/web`** — and **none exists.** **1,458 lines of the only surface a user touches are covered by eslint and prettier
and nothing else.**
⚠⚠ **THIS IS ENTRY 14'S BUG IN A NEW PLACE** (*"CI had never been green and could not be"*): **a gate everyone believes
covers something it structurally cannot.** It is **why every other finding could happen at once, in good faith, with
every gate green** — and it is **plan P4 step 0**, ahead of everything.

### 2a. ⚠⚠⚠ AND WHILE CHECKING THAT, I FOUND CI IS **RED ON `main` RIGHT NOW** — **ENTRY 14'S BUG, LITERALLY, FOR THE THIRD TIME**

**`pnpm verify` = `typecheck && lint && test`. CI runs FIVE steps: typecheck · lint · `format:check` · test · re-seed gate.**
⇒ **`pnpm verify` can be green while CI is red — and it is.** **`pnpm format:check` FAILS on the committed tree:**
`package.json`'s `"onlyBuiltDependencies": ["esbuild"]` (added in Entry 22 to make Vite start) must be expanded across
lines by prettier. **Verified: the same file at `03ed47c` PASSES; at `3a6d068` it FAILS.** *Nobody needed the Actions tab —
**CI's steps are commands, and they run on this box.** That is Entry 14's own sentence, and it went unrun again.*

> ## ⇒ **THE RULE THAT SHOULD HAVE EXISTED SINCE ENTRY 14, AND NOW MUST: `verify` IS THE CI STEP LIST, EXACTLY.**
> **A local gate that is a strict SUBSET of the remote gate is not a gate — it is a false-negative generator.** Three
> sessions have now been told "green" by a command that does not run everything CI runs. *(Plan P4 step 0.)*

### 3. ⚠⚠ THE MEASUREMENT, AND IT RE-AIMS THE WHOLE PERFORMANCE STRATEGY — **§1a HAS THE TABLE**

**One parameter edit re-tessellates the ENTIRE model.** At 195 elements: **865 of 965 ms is redrawing 309 solids that
did not change** (redrawing only the changed wall: **12 ms**). The rebuild is **flat**; the redraw is **linear in the
whole model**. ⇒ **The D29 cache, `instantiate` and multithreading ALL attack the kernel rebuild. NOT ONE TOUCHES THIS.**
**The dominant interactive cost is not in the kernel** — and it was invisible because **every measurement this project
ever took was taken BELOW the renderer.** *(A fourth data point for §1's method table: found by TIMING it, not reading it.)*

### 4. THE OTHER FINDINGS (all reproduced; all now plan steps)

| | Finding | Where it lands |
|---|---|---|
| 1 | **P4's own named enforcement mechanism — the D19 EQUIVALENCE TEST — DOES NOT EXIST.** The plan says *"without it, D19 is a good intention."* ⚠ **And the two surfaces have already diverged once in a way only agent-driving caught** (Entry 23's StrictMode bug). **That one was found by hand.** | P4 exit criteria |
| 2 | **The provenance map is promised in THREE comments and an Entry, with ZERO code.** `toBufferGeometry` drops `provenance`, `edgePositions` and `bounds` on the floor. ⚠ **The BREP-cache signature, exactly** (Entry 13). *(`edgePositions` dropped ⇒ **no rendered edges at all** — much of why the viewport reads as a toy.)* | P4 step 2c |
| 3 | **`RenderPart` is `{handle, color}` — it carries NO identity.** That one narrow type simultaneously blocks **picking, incremental redraw, hover, and render coalescing.** Cheapest high-leverage fix in the review. | P4 step 2a |
| 4 | **The app matches superseded drag frames by GREPPING ENGLISH PROSE** (`/superseded/i` on the message) **while the FROZEN protocol carries a typed `SUPERSEDED` code** the document layer discards. Reword one string ⇒ **every drag frame raises a red banner at the user.** ⚠ `CommandFailure`'s codes **freeze at P5.** | P4 step 11 |
| 5 | **`GeometryGateway` says *"`tessellate` is absent"*. It is not** — `OpName = keyof OpMap` and `tessellate` is in it; a call **typechecks** (proved). **Two files build the D19 render-seam argument on a false premise.** One line: `Exclude<OpName,'tessellate'>`. | P4 step 12 |
| 6 | **The two failure states are INVISIBLE — and worse than "not built".** `App.tsx` does `if (parts === undefined) continue`, so an **unbuildable element is silently skipped and simply does not appear.** A Miqdar column in a file you opened to look at **is not there**, with no indication. **That is the one outcome D43 was ruled to prevent.** | P4 step 10 |
| 7 | **⚠⚠ `quantities()` THROWS ON A VOID** — *"element has no built geometry"* — so **the obvious implementation of P5's own exit criterion (*"how much C25/30 is in this building?"*) CRASHES on the first Opening.** There is **no project-wide roll-up at all.** ⚠ **Planitor and Miqdar both consume this, and the Clean Delta carries quantities per part** ⇒ **it is on the moat's critical path, not beside it.** | P5 exit criteria |
| 8 | **No hide / isolate / selection set / view filter anywhere.** At 10,000 elements this is not optional. | P4.5 step 7 |

### 5. THE FOUR OWNER RULINGS (2026-07-14) — **all four are now in `v1.0.0_imp_plan.md`**

1. **`P4.5 — THE INTERACTION MODEL` is a NEW PHASE, and it lands BEFORE the P5 freeze.** Tool state machine · snapping ·
   **the spatial-query seam** (⚠ *no actor in the app can ask a geometric question in world space today — the agent
   surface returns semantics, the render seam returns triangles, and **every snap is a geometric question***) · the
   **baseline-driven Wall** (*"drag the wall's end" is a compound change to `length` AND `placement` — **which no Command
   expresses***) · and **reserving `move`/`setPlacement` before they freeze.**
2. **The interactive target is `10,000+` elements — BINDING.** ⇒ **plan P4 step 9: the scale harness.** ⚠ **The WASM-heap
   number does not exist and it is the most dangerous unknown in the project** (every solid stays live all session,
   nothing evicts) — **and it is a CONTRACT question, so it must be answered before P5 freezes.**
3. **Drawings stay v1.0.x — but their contracts are RESERVED before the freeze** (plan P5 step 6b). An annotation is a
   **persistent reference to `SubShapeRef`s**; *"2D is additive"* has been asserted for months and **never checked.**
4. **The fixes live in the PLAN, not in a separate correction doc.** *(P3 earned `P3_correction_plan.md` because its six
   defects were revert-verifiable bugs in **shipped** code. **These are mostly UNBUILT WORK** ⇒ they belong in the plan as
   steps. A parallel list is a **second description of one body of work** — rule 10, D21.)* **`review_P4.md` is the
   evidence; the plan is the work.**

### 6. ⚠ WHAT IS GENUINELY FINE — and how I checked

`pnpm verify` **is** green (186/186 — my first red was my own missing `pnpm install`; **Amer's claim holds**). **D19 is
real and genuinely machine-checked**, and `d19-boundary.test.ts` **does** cover `apps/` — it is the one gate that does.
**The ribbon and property panel really are generated** (`describeCommands` / `parameterSchema`), not hand-wired. **The
single-flight edit runner is correct reasoning** (two concurrent `execute`s interleaving heap frees is a race that
reject-and-keep-last-good does *not* cover). **And Amer's method — driving `window.bunyan` AS an agent — caught a
StrictMode bug every DOM-level check passed.** That is exactly the right instinct and it should not be lost in a review
that is otherwise about gaps.

### 7. ⚠ COVERAGE — what this review would NOT have caught

**I never ran the app** (this box is headless — no browser, no GPU). Everything about three.js is read from the code or
measured at the kernel seam **beneath** it: **if the renderer is wrong in a way that only shows on screen, I did not see
it.** Amer's browser verification is complementary and is **not** superseded by this. My scale numbers are Node +
`InProcessTransport`, not browser + Worker — **the redundancy ratio is architectural and holds anywhere; the absolute
milliseconds will differ.** I did **not** re-verify the document layer or the kernel (Entries 19/21 did, thoroughly), did
**not** audit `SchemaForm`'s JSON textarea for hostile input, and did **not** read `Miqdar_v1.0.0_spec.md` §3.4 — ⚠ **which
is now entangled with ruling 1: if the interaction model changes the type contracts, the Miqdar gate must be cleared
against the CHANGED ones.**

### 8. Next
**Amer:** plan **P4 step 0 first** (the gate — nothing else is verifiable until it passes), then 2a/2b/2c, then the rest of P4.
**Zayd:** the D29 cache bodies still stand (§4j-2) — **but P4 step 9's heap number now outranks it**, because it can change
the contracts and the cache cannot. **Architect:** the **baseline-Wall parameterisation call** (P4.5 step 4) is the one
decision the freeze waits on.

---

## Entry 24b — 2026-07-14 — Zayd (dev box) — **THE SECOND SWEEP: THE MODEL IS NOT ASSOCIATIVE, AND A COMMAND SILENTLY RE-IDENTIFIES. TWO MORE OWNER RULINGS (D50, D51).**

**Task (owner):** *"is there a pending decision, a design not 100% fixed, a design that wouldn't fulfil our goal, or something just not right?"* ⇒ a second hunt, aimed at **Hunt 5** (*what does the domain demand that nobody has written down?*). **It found the deepest thing in the review.** ⚠ I implemented nothing; one probe, run and deleted.

### 1. ⚠⚠⚠ THE FINDING — **BUNYAN HAS EXACTLY ONE ASSOCIATIVE RELATIONSHIP**

**`opening → host face`. Everything else in the model is ABSOLUTE.** All reproduced against the real kernel:

| What a BIM tool does every day | What Bunyan does |
|---|---|
| **Move a level; the storey follows.** | ⚠ **A LEVEL CANNOT BE MOVED AT ALL.** There is **no `core.updateContainer`**; re-creating the id is refused. **Floor-to-floor height is immutable after creation.** |
| **Bind a column to grid A-3; move the grid; the column follows.** | ⚠ **`gridRefs` IS STORED, VALIDATED — AND NEVER READ BY THE BUILD.** **Grid hosts nothing.** *D32 says "named axes and intersections as **placement hosts**." It is decoration.* |
| **Join two walls at a corner.** | Nothing. *(Deferred to v1.0.x as a "display concern" — which is only true if a baseline exists to join.)* |
| **Fix a material's density typo.** | ⚠ **NO `updateMaterial`.** Containers, materials, sections and grids are **CREATE-ONLY.** |
| **Move an element.** | ⚠ **NO COMMAND MOVES AN ELEMENT.** `placement` is set at creation and can **never** change. |

> ## ⇒ **"PARAMETRIC" HAS MEANT "EACH ELEMENT HAS A RECIPE." IN REVIT IT MEANS "ELEMENTS ARE CONSTRAINED TO EACH OTHER."**
> **Those are different products, and the second is what people mean by BIM.** *This is why the product reads as a 3D modeller with BIM metadata rather than as BIM — and it is the same root as the primitive-UI finding: **nobody ever wrote down how the pieces relate, only what each piece is.***

### 2. ⚠⚠ THE LATENT BUG THAT APPEARS THE DAY SOMEBODY FIXES IT — **AN EDGE THE BUILD READS AND THE INVALIDATOR DOES NOT KNOW**

**`build.ts:379` ALREADY reads `elevationOf(scene, element.containerId)`** — so an element's geometry **already depends on its container's elevation.** **And `DocumentContext.#touched()` — the rebuild invalidator — does not handle the `containers` collection at all** (it has exactly three hard-coded cases: element self, `hostId`, style→instances).
⇒ **The moment `core.updateContainer` lands, every wall on that level will silently keep its old Z** — correct-looking, passing, wrong. **⚠ `#touched()` is not a dependency graph; it is a lookup that happens to be right for the three edges that exist.** **D50 replaces it with declared, typed edges. An edge the build READS must be an edge the invalidator KNOWS.**

### 3. ⚠⚠ D51 — A COMMAND SILENTLY RE-IDENTIFIES, **AND THE RULE FORBIDDING IT WAS ALREADY WRITTEN**

**Reproduced:** `core.updateStyle` with a **renamed layer** → **ACCEPTED**. The wall rebuilds at **full volume with no hole in it** (`structure = 2.8e9 = 5000×200×2800`, uncut); `brokenRefs` **0 → 1**; **no refusal, no warning.** ⇒ **One rename orphans every opening on every wall wearing that style — which, per D31, is 400 of them.**

> **⚠⚠ AND D26 ALREADY SAYS THIS, IN THE SPEC, IN THESE WORDS:** *"reordering the segment array re-targets every reference into the shape, exactly as renaming a wall would: editing a vertex is safe, permuting the list is not, and **a document command must never do it silently.**"*
> **THE RULE EXISTED. THE GUARD WAS NEVER BUILT.** *(A new species for §1's table: not "we never thought of it" — **"we wrote it down and never enforced it."** Grep the docs for other rules stated as prose with no gate behind them.)*
>
> **⚠⚠ AND THE THING NO DOCUMENT SAYS AT ALL: A STYLE LAYER'S NAME IS IDENTITY-BEARING.** It is *inside* the `SubShapeRef` token — `wall-X.**finish.interior**/face/y-min#0` — **while the UI renders it as ordinary editable text.** A user renaming a layer in a dialog **has no idea they are re-minting identities across 400 walls.**

### 4. THE TWO RULINGS (owner, 2026-07-14) — **both are now in `v1.0.0_imp_plan.md` P5 step 0**

- **D50 — THE FULL CONSTRAINT MODEL IS IN v1.0.0.** The typed dependency graph · Level and Grid as **active datums** · **base/top constraints** (a wall spans L1→L2 and its height is *derived*) · wall joins · **a sketch constraint solver** · and the missing CRUD. ⚠⚠ **THE ANTI-FUSE RULE STILL BINDS: a join is a display/quantities cleanup, NEVER a fuse — fusing re-owns 4 of 6 faces and retroactively breaks every hosted window (measured, Entry 12). A CONSTRAINT IS NOT A BOOLEAN.**
  ⚠⚠ **SCHEDULE: `core_logic.md` §9 lists the constraint solver as a north-star HOOK — explicitly NOT v1.0.0 scope. D50 moves it in. THE RELEASE DATE MUST BE RE-CUT, AND THE ARCHITECT HAS BEEN TOLD SO.** *(Zayd's recommendation on record: adopt an existing solver — FreeCAD's `planegcs`, LGPL — rather than write one; and stage it so the **dependency graph + hosting** land first, since they are what the freeze actually waits on, while the sketch solver does not touch the type contracts.)*
- **D51 — `updateStyle` MUST REFUSE AN ORPHANING RENAME** unless explicitly acknowledged or given a retarget map, and **layer names must be documented as identity-bearing.**

### 5. Next
**The freeze now waits on THREE Architect decisions, not one:** the **baseline-Wall parameterisation** (P4.5 step 4) · the **base/top constraint shape** (P5 step 0b — *same question from the other side; answer them together and freeze once*) · and the **WASM-heap ceiling** (P4 step 9, D48 — it decides whether the recipe must support eviction, which is a contract).
