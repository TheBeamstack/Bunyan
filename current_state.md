# Bunyan — `current_state.md`

**What this file is.** The **cross-session, cross-agent, cross-machine handoff log** for Bunyan. It lives
in the repo and travels with the code between the local PC (Amer) and the Hetzner dev box (Zayd), per
`cross_projects_policy.md` §9.

**Why it exists.** So the next agent does **not** re-derive context, does **not** make false assumptions
about what is built, and does **not** redo verified work.

**⚠ IT IS READ IN FULL, BY BOTH AGENTS, ON EVERY SESSION — so its length is a cost paid on every run.**
That is why it is now a **router with a hot core** rather than an archive. It carries what you need to act
accurately; everything else is one hop away and named below.

| If you need… | Go to |
| --- | --- |
| the full text of a ruling (D1–D80) | **`docs/decisions.md`** |
| the session that earned a ruling — with its measurements | **`handoff/<agent>/`** (newest 10) or **`docs/history.md`** (older) |
| *"why is this shaped this way?"* · *"has this been tried?"* | **`docs/history.md`** |
| what the domain MEANS | **`docs/contracts/core_logic.md`** |
| how it is BUILT (layers, protocol, registries) | **`docs/contracts/architecture.md`** |
| what SHIPS first (scope, D1–D39) | **`docs/contracts/V1.0.0_spec.md`** |
| the phases, exit criteria, and **THE FREEZE GATE** | **`docs/contracts/v1.0.0_imp_plan.md`** |
| what the owner still owes a decision on | **`open_rulings.md`** |
| how to review a PR | **`REVIEW.md`** |
| how this handoff system works and why | **`docs/design/handoff_system_design.md`** |

**How to use it.**

- **Read this file in full before touching anything.** Reach for `docs/history.md` the moment you are
  missing something older.
- **Append an abstract to §7** when you finish a unit of work, and write the full body to
  `handoff/<agent>/<date>-<slug>.md`. The eight fields in §7 are mandatory and gate-enforced.
- **Record who validated what, and on which engine/environment.** A claim without a verification method
  is not done.
- Keep §2 (contract status), §3 (what exists) and §4 (the decision index) **current** — those are the
  three things a new agent gets wrong most easily. ⚠ **They are also what makes compression safe: a rule
  binds because it is in §1–§5, never because an old entry mentioned it.**
- **Never hand-edit §8.** It is written by `pnpm state`.

---

## §0 — Orientation (read this first)

**What Bunyan is:** a browser-native, serverless, parametric BIM/CAD authoring platform. An exact B-Rep
kernel (OpenCascade/OCCT compiled to WebAssembly) computes geometry; the design is stored as a
*parametric recipe*, and meshes/2D views are disposable projections of it.

**Document reading order** (they are the contract; this file is the status):
**1.** `docs/contracts/core_logic.md` — the domain model. *What the app means.* · **2.**
`docs/contracts/architecture.md` — layers, worker protocol, registries. *How it is built.* · **3.**
`docs/contracts/V1.0.0_spec.md` — scope, decisions **D1–D39**. *What ships first.* · **4.**
`docs/contracts/v1.0.0_imp_plan.md` — the phases, exit criteria, and **THE FREEZE GATE** at the head of P5.

**⚠ `docs/history.md` is NOT in the reading order, because it is a REFERENCE, not a briefing.** Open it
when you are stuck or missing older context — not at the start of every session.

**⚠ The MIQDAR gate.** Miqdar is **the second product**, and its spec is **not optional reading before a
contract freeze** (`docs/decisions.md` §4g). **P5 has a gate pointing at it.** ⚠⚠ **THE LIVE SPEC IS
`~/projects/Miqdar/Miqdar_v1.0.0_spec.md`** (owner ruling M22, 2026-07-23); the superseded Bunyan copies
are retained in `docs/archive/` **only** so the freeze gate still resolves. It is **not** a Bunyan work
item — Miqdar starts only after **Bunyan v1.0.0** ships.

**Design docs** — the design-first record, all in `docs/design/`. **Reviews** — `docs/reviews/`, including
**`review_prompt.md`**, the standing brief for a phase-level adversarial review (the seven hunts). That is
a different instrument from `REVIEW.md`, which is the per-PR checklist.

⚠ **Version strings: always "Bunyan v1.0.0" or "Miqdar v1.0.0" — never a bare "v1.0.0."** Two
independently-versioned products both have one. *(Miqdar M17.)*

**The one non-negotiable invariant:** B-Rep is the source of truth; the parametric recipe is the source of
truth for the B-Rep; meshes and 2D views are disposable. Everything else follows from it.

**The hardest idea (and the schedule risk):** persistent sub-shape naming (D1). Sub-shape identity is
*derived* from the operation DAG — a `SubShapeRef` is a derivation path (`nodeId` + `role` + `occurrence`),
**never a geometric index.** It is assigned when an op runs and propagated forward, never recovered by
matching geometry afterwards.

**Actors** — roles are by *environment*, not seniority:

| Actor | Where | Owns |
| --- | --- | --- |
| **Architect** (the owner/human) | — | Contracts, scope, AEC correctness, merge arbitration. **All contract changes are owner-gated**, and the owner merges any PR whose `RISK` is `contract-touching`. |
| **Amer** (agent) | Local PC, **real browser** | Browser hot path: three.js/WebGPU, tessellation consumer + picking, React shell, ribbon/property panels, persistence adapters, service worker/PWA, `window.bunyan` wiring. |
| **Zayd** (agent) | Hetzner dev box, **headless** | Kernel: OCCT WASM builds, worker API, naming resolver, regression harness + offline golden seeding, IFC importer, CI, release pipeline. **And the document model — `@bunyan/document`, `@bunyan/types`, `@bunyan/sketch-solver`.** |

Also read the box-local `../cross_projects_policy.md` and `../last_session_work.md` **if you are on the dev
box** (they are not in this repo and do not travel).

### §0a — DISTANCE TO FREEZE ≠ DISTANCE TO REVIT (read this before you feel "almost done")

**The freeze checklist being ~closed says NOTHING about competitiveness with Revit. They are different
axes, years apart, and the docs used to conflate them.** A fresh agent reads "step 0 closed, gates
discharged, ready to freeze" and absorbs "nearly a Revit competitor." That is the exact failure mode of
§1's own history (*"P2 declared done twice"*, *"the whole modelling layer was missing"*) — measuring
against the checklist, never against the ambition.

**Ground truth (verified by build, not prose):** the shipped product is **three element types**
(`@bunyan/types`: `core.wall`, `core.opening`, `core.curtainwall`) on an exact kernel. What is genuinely
excellent — the exact-B-Rep + persistent-naming + parametric-recipe core, the agent-native single command
layer, the stable-PEI ecosystem substrate — is *the hard, rare part most Revit challengers never finish*,
which is why it comes first. **But it is a foundation, not a Revit competitor.** What Bunyan is NOT yet: a
documentation tool (Revit's actual product — one plan/section/schedule ships in v1.0.0, the rest is the
largest parity item, D58), multi-user (D60), MEP (D62), families-by-users (D61), DWG-interoperable (D63);
and its taxonomy is almost entirely unbuilt (`docs/contracts/core_logic.md` §9a).

**⇒ THE STANDING METHOD: measure the product against the Revit-parity ledger
(`docs/contracts/v1.0.0_imp_plan.md` "Road to Revit parity"), NOT against the phase's exit criteria.**

---

## §1 — Where the build is right now

**Phases P1–P3 CLOSED; the kernel protocol is FROZEN (21 live ops + 3 reserved).** P4 + P4.5 (the
interaction model) and P5 (types) are the open work. **THE PROJECT IS IN THE PRE-FREEZE WINDOW:**
`SubShapeRef` / `BimObjectType` / `Command` / `scene.json` / `ParamSchema` / `UndoableEdit` are
**release-candidate** and freeze at **P5 step 6**. That freeze is the one irreversible act — after it a
wrong contract costs an amendment across three products (`.bnn` in the field, Miqdar, Planitor).

**P5 STEP 0 (the D50 constraint model) is COMPLETE**, and so is every reopened pre-freeze row Ⓐ–Ⓕ plus
D66's contract half. **The freeze is unblocked and is the owner's act.** The full narrative of how it got
there — which sweep was taken instead of freezing, and why — is `docs/history.md` §D.

> **⚠⚠ THE P4 REVIEW HEADLINE (Entry 24) — STILL THE FRAME:** there was **no interaction model in any
> contract document** — only *"button/drag → Command"*, which is how an action *reaches* the model, not how
> a human *authors a building*. ⇒ new phase **P4.5**, which lands before the freeze. And the second sweep
> found the deeper one: **Bunyan had exactly ONE associative relationship (`opening → host face`);
> everything else was absolute.** **D50 moved the full constraint model into v1.0.0.**

### §1a — THE SCALE NUMBERS (D48: the interactive target is 10,000+ elements, BINDING)

All four axes now have a number. **Two are closed; two remain open and are named.**

| Axis | Status |
| --- | --- |
| **WASM heap** | ✅ **FITS** — 16.2 KB/live-solid, dead-linear ⇒ **0.31 GB at 10k**, inside a tab (Entry 29, re-measured Entry 54). |
| **Draw calls / frame time** | ✅ **CLOSED (Entry 63)** — renderer batching: **~30,700 draw calls → 2** at the 10k target (606 ms → ~10–14 ms; 1.6 → ~80 fps). |
| **Edit latency** | ✅ incremental edit ~23 ms compute, **FLAT vs scale**; the ~570 ms post-edit render went with the batching rewrite. |
| **Cold load** | ⚠ **OPEN — ~3 min at the 10k target, STILL UNUSABLE.** The D29 cache buys **2.07×** (24.86 → 12.00 ms/solid), not an order of magnitude. The levers that could close it are `instantiate` (RESERVED), lazy build/eviction (D66 — additive) and MT (D8, ruled v1.0.x). |
| **Join resolution** | ✅ **CLOSED (D73)** — the O(N²) scan is an O(N) spatial index: **4757.7 ms → 27.2 ms at 1984 walls**, per-wall cost FLAT (14–17 µs) from 1k to 10k. |

⚠ *Verification is most of a cached load's cost — re-measuring every sub-shape to prove the tokens belong
to the shape is the price of shipping identity in a file — so no amount of serializer tuning changes this.*
⚠⚠ **NOW MEASURED RATHER THAN ASSERTED (Entry 73), and it closes off the tempting lever:** of a cached
import, `shapeSignature`'s own `GProp` work is **7.9 ms** and **all 345 embind boundary crossings together
are 0.073–0.133 ms (0.21–0.39 µs each, ~1%)**. The boundary is not the cost and never was; the
**verification** is. ⇒ **the remaining cold-load levers are still only `instantiate` (RESERVED), lazy
build/eviction (D66) and MT (D8)** — there is no serializer or marshalling win hiding here.

### §1b — THE METHOD THAT HAS FOUND EVERY GAP — it is not reading; it is USING the API

**Keep modelling real buildings against the real kernel, and measure.** It has found **twelve** gaps; no
other method ever has. A written finding describes only the shape someone actually cut.

| Gap | Found by |
| --- | --- |
| `at` (placement) | a boolean could otherwise only bite a *corner* off a wall |
| the split-face naming bug | cutting a **groove** across a wall |
| `extrude` / `chamfer` | trying to model a **floor plate** (a Slab is not a rectangle) |
| the SYMMETRIC-TIE hole (D28) | cutting a duct through a **round column** — five sessions missed it; every boolean tested had cut a BOX |
| our `bounds` LOOSE on curves | gating that column vs the native-OCCT oracle |
| the modelling layer (D30–D33) | reading the product **against its own ambition** |
| the ecosystem joint (D34–D38) | reading the product **against its neighbours** (Planitor, BIMsync) |
| the STYLE-EDIT PERF CLIFF | building a real 195-element building and **timing** it |
| the six P3 defects | driving the document API at its **FAILURE** boundaries — every happy path was already green |
| the `BuildContext` HEAP-LEAK | writing the first fixture that ran **two** kernel ops per part |
| the VOID INWARD-DIRECTION gap | cutting a duct through a **beam** |
| the CURVED-FACE HOSTING gap | a duct through a **round column** |

**⇒ Keep cutting shapes nobody has cut.** The kernel-level gaps are nearly mined out; the next foreclosure
is likelier in a **type's contract** than in the kernel.

**⚠ AND THE SECOND METHOD:** a green test proves only what it ASSERTS — two of P3's asserted something
weaker than their own title. ⇒ **For every exit criterion, read the test that discharges it and ask what
it would take for that test to pass while the criterion is FALSE.** And the standing rule: **a fix without
a test that fails in its absence is an assertion** — revert every fix and watch its test fail.

**⚠ THE THIRD:** when a decision is framed as a trade-off, check what it costs the **INVARIANT**, not just
the schedule. *"Ship the BREP cache"* read as a perf call; it dragged in a persisted name→shape index —
the "token map" D1 forbids. The perf question was an afternoon; the identity question it hid could have
repealed D1.

### §1c — NINE THINGS A FRESH AGENT MUST NOT REDISCOVER THE HARD WAY

1. **`opencascade.js` CANNOT be linked on this box — and we do not use it.** Its `-flto` whole-program
   link OOMs at a 2 GB cap even for a 6-symbol build. Do not retry it. We build **upstream OCCT 7.9.3,
   LTO off** — recipe in `tools/kernel-build/`; it builds here.
2. **`/tmp` is a tmpfs — it costs RAM, not disk.** Before invoking §6a to pause another project's
   containers, run `du -sh /tmp` — our own scratchpads are usually the hog.
3. **You do NOT need a 2.5 h rebuild to change the kernel's C++.** OCCT's static libs are prebuilt at
   `~/occt-wasm-spike/install`. Changing `src/kernel.cpp` is a **~60–74 s single-file compile + link**
   (§6). Only an *OCCT version bump* costs 2.5 h.
4. **OCCT's `Left/Right/Front/Back` do NOT mean what they sound like.** `BackFace()`=x-min,
   `FrontFace()`=x-max, `LeftFace()`=y-min, `RightFace()`=y-max. Guessing mislabels four faces and nothing
   fails (geometry perfect, names wrong). `occt-kernel.test.ts` re-measures it.
5. **The naming literature is WRONG about OCCT 7.9.3, and we MEASURED it (D24).** Boolean history is
   complete (zero orphans); the weak spot is the fillet; and `Modified()` reports only *splits*, so an
   untouched face appears in **no** history list — that silence means *"unchanged"*, not *"unknown"*.
   Re-run the probe (`tools/kernel-build/probe.cpp`, ~60 s) before trusting naming on a new shape class.
6. **⚠⚠ THE PROBE ONLY MEASURES THE SHAPES YOU THINK TO CUT — this has cost us repeatedly.** Even a
   measured, written-down finding describes only the shape someone actually cut. Before trusting naming on
   a shape class nobody has cut, **cut it.**
7. **⚠⚠ A PHASE'S EXIT CRITERIA ARE A SPECIFICATION, NOT A SUMMARY OF WHAT GOT DONE.**
   `extrude`/`chamfer` sat unbuilt in P2's step list while P2 was declared "complete" twice, because every
   test built walls out of boxes. **Read a phase's own step list against the code before declaring it
   done.** *(This disease has recurred four times. Its worst form: the misleading artifact was a PASSING
   TEST, not prose — Entry 65.)*
8. **⚠⚠ A NEW RULE BINDS THE NEXT CONSUMER AND NOTHING ELSE — SWEEP IT *BACKWARD*.** The inverse of trap
   7, and it has cost real defects repeatedly. A rule written into the contract guarantees that code
   written **after** it obeys, and does **nothing whatever** about code written before. **⇒ When you add a
   correctness rule to a mature codebase, enumerate every existing site that could violate it and check
   each one.** Two mechanical forms work: **grep** every iteration over the collection the rule governs,
   then ask of each *"does this aggregate or publish?"*; and — when a rule quantifies over a SET —
   **COUNT the set** rather than reading the code that implements one member of it.
9. **⚠ MEASURE THE ARTIFACT, NOT THE MANUAL.** OCCT's `BRepTools::Write` doc comment disagrees with what
   the code beside it actually emits, and its file and stream overloads differ — so a validity guard
   written from the format's documentation **refused every file the exporter beside it produces.** Both
   errors were caught in minutes by printing the actual bytes. *Before writing a check against an external
   format, dump what the code on the other side of the check actually emits.*

> **⚠⚠ THE SWEEP LEDGER — ALL EIGHTEEN DOMAIN RULES SWEPT, NINE DIRTY.** Dirty: 1, 3, 4, 5, 8, 12, 14, 15,
> 16, 18 (+ the D68 option invariant), counting 8 as a SURFACED foreclosure rather than a fix. Clean: 2, 6,
> 7, 9, 10, 11, 13, 17. **THE BASE RATE IS 1-IN-2.** The transferable finding: **the rules that came back
> clean are the ones a violation could not have been written silently** (`validateParams` refuses an
> undeclared arg; `dryRun` lives in the executor where a command cannot opt out). *A clean rule with no
> enforcement is a dirty rule that has not happened yet* — which is why rule 7 was given
> `tests/units-rule7.test.ts`. Full per-rule detail: `docs/contracts/core_logic.md` §8 (each rule carries
> its own sweep note) and `docs/history.md`.

---

## §2 — Contract status (get this wrong and you break the build model)

The **split contract-freeze** (D13) is what lets Amer and Zayd work in parallel: *adding* an op is
additive and permitted; *changing an existing op's envelope* needs Architect sign-off.

⚠ **THIS IS NOW MACHINE-CHECKED.** `tests/freeze-boundary.test.ts` holds a snapshot of every frozen
surface. Any change to it fails the build and marks the PR `RISK: contract-touching`, which routes the
merge to the owner. **The status table below is the summary; the test is the authority.**

| Contract | Status | Freezes |
| --- | --- | --- |
| **Kernel message protocol** (`@bunyan/protocol`) | **✅ FROZEN, v1** — **21 live ops + 3 RESERVED** + `CACHE_STALE`. Reserved: `sectionCut` · `importIfc` (P6) · `instantiate`. ⚠ `faceFrame` is the first post-freeze op, explicitly permitted under D13. ⚠ `exportBrep`+`importBrep` left `RESERVED_OPS` on 2026-07-30 — the D29 cache bodies are built, so the real kernel advertises them because it *implements* them (`capabilities` is generated from the handler map). **The MOCK implements neither, and that is correct rather than incomplete.** | **✅ FROZEN.** |
| **`SubShapeRef`** | RC — exercised by the real kernel + the document model (a window survives save→load→rebuild + a 30° rotation). ⚠ `kind:'vertex'` **reserved** (D54a). | **P5** |
| **`BimObjectType`** | ✅ WRITTEN + extended. Carries `parameterSchema`, `styleSchema`, `defaultClassification`, `defaultDiscipline`, `buildGeometry→Part[]` (D30), `buildVoid`, `buildLeaf?`, `buildChildren?` (D59), `migrate`, `ifcMapping?`/`migrateStyle?`. ⚠ `BuiltPart.exposedRefs?` RESERVED (D72) and **every shipped Type now declares** (D74). ⚠⚠ `BuildContext.discard(handle)` — a Type running two ops per part MUST declare its intermediate or it leaks. | **P5** |
| **`Command`** | ✅ WRITTEN — `argsSchema` + `execute` returns its `UndoableEdit`. **The agent API.** CRUD carries the D51 refuse-or-retarget args. ⚠⚠ **The five move verbs landed 2026-07-30 (D80)**: `core.setPlacement`/`move`/`rotate`/`copy` live, `core.array` a registered shape that REFUSES. **They are GUARDED** — a placement verb refuses an element whose position the recipe already derives (host / D52 baseline / datum, per-axis), and `core.createElement` carries the same refusal. | **P5** (with its `argsSchema`) |
| **`scene.json` + entities** | ✅ WRITTEN (`packages/document/src/scene.ts`). `SCENE_SCHEMA_VERSION` **2**. Constraints are a first-class collection (D53) with three union members (base/top, sketch, join). Optional absent-defaulted reservations: `views`/`annotations`/`schedules`/`sheets` (D58), `families` (D61), `systems` (D62), `designOptions` (D65), `georeference`, `roomSeparators`. ⚠ **`scene.schedules` is promoted to a full `SceneCollection`** (D79) — it materialises on first authoring, so a document with no schedules stays byte-identical. | **P5** |
| **`UndoableEdit`** | ✅ WRITTEN — **STATE DELTAS, never replay** + the append-only JOURNAL (D40). ⚠ **`transactionId` has its first READER (D80)**: one `Ctrl+Z` reverses a multi-element gesture, stamped by the executor, ONE stage and ONE commit for the whole unit. | **P5** |
| **Agent surface** (`window.bunyan`) | ✅ WRITTEN — `createAgentSurface`, versioned separately (`agentApi: 1`, D22); does **not** inherit the P5 freeze. | evolves on its own clock |
| **`.bnn`** | ✅ WRITTEN + FINISHED. Zip of `manifest.json` + `scene.json` + `history.json` (the JOURNAL) + optional `thumbnail.png`. Ids are prefixed ULIDs (D44); unknown/future-typed elements round-trip VERBATIM (D43). ⚠ **D60 merge seam reserved** (four optional fields, absent in v1.0.0). ⚠ `geometry-cache.brep` is **not** in the format and is an open owner call. | **P5** |

---

## §3 — What exists, and how it was verified

```
packages/
  protocol/       @bunyan/protocol      flat versioned message contract (zero deps). 21 ops + 3 reserved.
  kernel-core/    @bunyan/kernel-core   KernelHost (dispatch + failure marshalling) + ShapeRegistry
  kernel-mock/    @bunyan/kernel-mock   protocol-conformant fake kernel (NO booleans — says so in
                                          `capabilities` rather than faking one)
  kernel-occt/    @bunyan/kernel-occt   ★ THE REAL KERNEL — OCCT 7.9.3 in WASM + Worker entry
                    src/kernel.ts         adapter: C++ STRUCTURE -> Bunyan IDENTITIES
                    src/naming.ts       ★ THE RESOLVER (D1/D24): 4 relations, no geometry, ever
                    src/cache.ts        ★ D29 — the geometry cache's VERIFICATION half. C++ measures;
                                          this DIGESTS, COMPARES and REFUSES. ⚠ ONE file on purpose — the
                                          only place a wrong answer produces a PLAUSIBLE wrong building.
                    wasm/bunyan-kernel.*  the COMMITTED artifact (~14.6 MB / 4.19 MB gzip, -O3)
  kernel-client/  @bunyan/kernel-client KernelClient + WorkerTransport / InProcessTransport
  sketch-solver/  @bunyan/sketch-solver THE 2D SKETCH SOLVER — planegcs behind the SketchSolver seam.
                                          The ONLY package that imports @salusoft89/planegcs.
  types/        ★ @bunyan/types         THE SHIPPED MVP BimObjectTypes — D52 baseline join-aware Wall
                                          (`core.wall`), the Door (`core.opening`, buildVoid+buildLeaf),
                                          and the composite Curtain Wall (`core.curtainwall`, depth-2).
  document/     ★ @bunyan/document      THE PARAMETRIC TRUTH LAYER
                    entities.ts    Element/Part/ElementStyle/Material/Section/spatial tree/Grid/Constraint
                    scene.ts       ★ THIS OBJECT *IS* scene.json. + SceneChange + constraints resolver
                    schema.ts      ParamSchema — ONE language, THREE consumers: panel, ribbon, AGENT TOOLS
                    registries.ts  the SIX registries + the GENERATED capability projection
                    types.ts       BimObjectType (+BuildContext.discard, grid/datum accessors)
                    ulid.ts      ★ D44 — the PEI is a prefixed, monotonic ULID. No counter, ever.
                    revision.ts  ★ ModelRevision + issued_at_seq. Minted ONLY by the command.
                    commands.ts    the Command layer — THE agent API (D19). 44 verbs.
                    dependency.ts  ★ the TYPED dependency graph (exhaustive over SceneCollection)
                    enumerate.ts ★ THE MODEL ENUMERATION QUERY. The ONE walk three consumers share.
                    schedule.ts  ★ the SCHEDULES body + the authoring grammar. ⚠ NO enumeration loop of
                                     its own — that IS its correctness.
                    cleandelta.ts ★ THE CLEAN DELTA EXPORTER — journal + revN -> CleanDeltaPackage
                    build.ts       ★ base parts -> resolve hostRef -> cut EVERY layer -> PLACE LAST
                    document.ts    ★ DocumentContext — THE ONLY DOOR (D19). STAGED, all-or-nothing
                                     rebuild + universal dryRun (D42)
                    undo.ts        UndoableEdit (STATE DELTAS) + THE JOURNAL + the TRANSACTION unit (D80)
                    placement.ts ★ D80 — the rigid-motion ALGEBRA and the ONE rule the move verbs turn on:
                                     WHERE THE RECIPE ALREADY DECIDES THE POSITION. Pure.
                    agent.ts       createAgentSurface() — agentApi:1, thin shim, no browser
                    bnn.ts         the .bnn codec + migration + StorageAdapter + Autosave
                    geometry.ts  ★ GeometryGateway — the narrow seam that makes D19 STRUCTURAL
                    sketch.ts    ★ the SketchSolver SEAM + solver-neutral IR + the D26 guard
                    designoptions.ts ★ the exclusion INVARIANT as code (D65/D67/D68)
                    joins.ts     ★ the WALL-JOIN resolver — auto-miter + butt, O(N) spatial index (D73)
apps/web/        ★ Amer's Vite/React shell — bootstrap (the one KernelClient holder), WebGL2 three.js
                    viewport with BatchedMesh, generated ribbon + property panel, sub-shape picking,
                    tool/ (snap · QueryGateway · toolMachine · numeric · useToolController)
tests/            613 tests (all document tests run against the REAL OCCT kernel, never the mock)
tools/kernel-build/ the OCCT->WASM recipe + src/probe.cpp (THE NAMING PROBE, ~60 s)
tools/oracle/     Python (uv): offline golden seeding — also a MEASURING instrument
```

**The architectural decision that shapes everything: the kernel is transport-agnostic.**
`KernelHost.handle(request) → response` is a pure function knowing nothing about Workers/`postMessage`/DOM.
⇒ the whole seam is testable headlessly in Node (why the suite runs on a browserless box), and mock and
real kernel are the same interface.

**⚠ FOUR SILENT OCCT TRAPS, all caught by the harness (plus §1c trap 4) — all OUR misuse, never an OCCT
defect:** (1) `BRepBndLib::Add` is TOLERANT not tight ⇒ `box.SetGap(0.0)`. (2) `LinearProperties` on a
solid sums each edge once per adjoining face (double-counts). (3) `Add` bounds a curve by its CONTROL
POLYGON ⇒ use `AddOptimal`. (4) a full 360° revolve has NO caps and cap accessors don't return null.

**Verified — the kernel** (Zayd, dev box, headless): protocol v1 (envelope, 15 typed failure codes) ·
typed failures never throw · **persistent naming (D1) on real topology** · **mock and real emit
BYTE-IDENTICAL refs** · `measure` exact (`BRepGProp`, not the mesh) · **no WASM heap leak** · **D28 the
bounded positional key** · query ops `bounds`/`distance`/`classifyPoint`/`faceFrame`.

**Verified — the document model** (Zayd, headless, vs REAL OCCT): D30 an element IS its ordered PARTS ·
D31 a style edit rebuilds every instance · an opening cuts EVERY layer · a window through a wall ROTATED
30° (host token byte-identical) · D39 cascade delete in ONE undoable edit · **the broken-reference state**
(marked, visible, never auto-healed) · reject+keep-last-good · save→reload → identical parametric state
AND geometry from `scene.json` alone · **D19 is a MACHINE check** · the model is **associative**,
**editable** and **guarded** · a 2D profile is **solved** (real planegcs) and extruded.

### NOT verified / NOT built (do not assume otherwise)

- **`geometry-cache.brep` — HALF BUILT, AND THE HALVES MUST NOT BE CONFLATED.** ✅ The OP BODIES are built
  and green. ❌ **There is still NO `geometry-cache.brep` inside a `.bnn` and NO document loads from one.**
  That second half is a separate, owner-gated unit with real design surface (what INVALIDATES a cache).
  ⚠⚠ **The measured payoff is 2.07×, not an order of magnitude** — recommendation on the desk: **do not
  wire it for v1.0.0** (`open_rulings.md` Q6).
- **No 2D views** — the plan/section unit is designed and **blocked on rulings Q1–Q3** (`open_rulings.md`).
- **No IFC import** (P6; the op is reserved).
- ✅ **`LICENSE`/CLA/attribution — DONE (Entry 74), and going public is no longer blocked BY THE REPO.**
  AGPL-3.0 verbatim · `NOTICE` (OCCT's exception is CONDITIONAL on a prominent notice, and we ship its
  binary; planegcs is an npm dep we do not redistribute) · `licenses/` · `CLA.md` · all ten manifests.
  ⚠ **Two owner items remain inside `CLA.md` — Q11 `<LEGAL ENTITY>`, Q12 a lawyer's read.** They block
  the first EXTERNAL PR, not publication.
- No service worker/PWA/Cloudflare deploy; no WebGPU (WebGL2 ships); no File System Access adapter.
- No sweep-along-path, no loft (out of scope).

---

## §4 — Decision index

**⚠ ONE LINE EACH. THE FULL TEXT OF EVERY RULING IS `docs/decisions.md`** — including the five big rulings
(4e–4i), the verification-scope rule (4b) and the open items (4j). If the index and the ruling disagree,
**the ruling wins and the index is the bug.**

| # | Ruling (one line) | # | Ruling (one line) |
| --- | --- | --- | --- |
| D1 | **Persistent naming**: identity is a derivation path, never a geometric index. The #1 risk. | D44 | The PEI is a **PREFIXED ULID**. No allocator; id-reuse impossible by construction. |
| D3 | IFC **import** only in v1.0.0; export v1.0.x. | D45 | **`discipline` lives on the PART.** An unmeasurable quantity is omitted, never zeroed. |
| D8 | Canonical re-sort before identities are assigned. **MT stays v1.0.x.** | D46 | One physical thing = one element, one PEI. The MEP-vs-structure clash question is OPEN. |
| D9 | **We trust OCCT; we verify our own code.** | D47 | **The tool/interaction layer is a first-class layer, and it was missing.** ⇒ P4.5. |
| D10 | Typed-failure contract: the kernel never throws; a failed op yields no edit. | D48 | **The interactive target is 10,000+ elements. BINDING.** |
| D11 | Offline-first; the service worker caches the kernel once. | D49 | 2D documentation stays v1.0.x; its anchoring contracts are RESERVED pre-freeze. |
| D12 | Anchoring/validation of a hosted opening. | D50 | **✅ THE FULL CONSTRAINT MODEL IS IN v1.0.0** — the largest scope ruling. ⚠⚠ **THE ANTI-FUSE RULE STILL BINDS.** |
| D13 | **The freeze's meaning**: *adding* an op is additive; *changing* an envelope needs sign-off. | D51 | **A command may never silently re-identify.** Refuse-or-retarget, generalised to every reference. |
| D14 | The WASM module *is* the kernel; `opencascade.js` rejected. | D52 | **A WALL IS A BASELINE `{start,end}`**; length + height are DERIVED. |
| D15 | **Bunyan is open source: AGPL-3.0 + commercial.** ⚠ The CLA is a hard prerequisite before the first external PR. | D53 | Constraints live in a first-class `scene.json` collection, orthogonal to `params`. |
| D16 | IFC import via **IfcOpenShell** → exact B-Rep. `web-ifc` (mesh-only) rejected. | D54 | Reserve `SubShapeRef kind:'vertex'` · `Element.phase` · `ParamField.relevantWhen`. |
| D19–D23 | **Bunyan is agent-native.** One command layer; `argsSchema` ⇒ the agent's tool list is **generated, never maintained**. | D55 | **Space extent = room-bounding**, DERIVED from bounding walls, never stored. |
| D24 | Measured OCCT history (boolean complete; fillet weak; **silence = unchanged**). | D56 | The pre-freeze reservation set (phasing = TWO datums, `ifcMapping`, `formula`, …). |
| D25 | **`transform` mints NO identities** — a rigid motion is a topological isomorphism. Load-bearing. | D57 | **The Clean Delta is designed on BUNYAN's terms; BIMsync is UNBUILT and adapts.** |
| D26 | `extrude`/`revolve` name `lateral.k` after the **authored** segment; **never permute the array**. | D58 | **Documentation is a live projection of the B-Rep.** v1.0.0 ships MINIMAL 2D (1 plan + 1 section + 1 schedule). |
| D27 | `revolve` — GenericSolid's other half. | D59 | **An element may own child ELEMENTS, not only Parts.** Children are DERIVED, never stored. |
| D28 | **The bounded positional key** — orders two structurally-tied sub-shapes, never identifies. | D60 | Multi-user co-authoring is Bunyan's. **Seam RESERVED**; no backend in v1.0.0. |
| D29 | **✅ THE BREP CACHE SHIPS** — an IDENTITY task. **Op bodies BUILT; the `.bnn` half is an OWNER CALL at the measured 2.07×.** | D61 | Data-driven family authoring. **Grammar RESERVED.** ⚠ rule 8 found it has no slot for `exposedRefs`. |
| D30–D33 | **The modelling layer**: element owns ordered PARTS · ElementStyle · LinearMember+Grid · Material/Section are REGISTRIES. | D62 | MEP systems & connectors RESERVED. A connector is AUTHORED placement, never a `SubShapeRef`. |
| D34–D38 | **The ecosystem**: Bunyan is a third producer of the Clean Delta · spatial tree · loadBearing · **no backend** · `.bnn`. | D63 | The DWG seam **already exists** (`FormatCodec` + `registries.codecs`). |
| D39 | Cascade delete in ONE undoable edit; warn-first is `dryRun`. | D64 | **The PEI-bound side-graph suffices** — reserve NOTHING analytical. One exception: `Material.thermal?`. |
| D40 | **The change feed is an APPEND-ONLY JOURNAL.** Delta = read, not inferred. | D65 | Design Options RESERVED — **and the EXCLUSION INVARIANT is in the frozen contract.** |
| D41 | **`core.issueRevision` is a Command.** | D66 | The 4-axis scale measurement. The heap-eviction hook needs **nothing reserved** — additive by construction. |
| D42 | Rule 4 is ALL-OR-NOTHING + a universal `dryRun`; `planDelete()` DELETED. | D67–D77 | **The backward-sweep rulings** — nine dirty rules found and fixed. Each is a separate ruling; see `docs/decisions.md`. |
| D43 | An unknown OR FUTURE type: the document OPENS, the element is `failed`+visible+PRESERVED VERBATIM. | D78–D80 | The schedules body · the schedule CRUD · **the five move verbs + `transactionId` atomicity.** |

---

## §5 — Live priorities

**⚠ THIS SECTION IS LIVE WORK ONLY.** The chronological narrative of how the freeze was approached is
`docs/history.md` §D. The owner's open questions are `open_rulings.md`. Neither is a task list.

### The freeze

**All reopened pre-freeze work is DONE (rows Ⓐ–Ⓕ + D66's contract half), nothing measured forecloses a
contract, and every subsequent entry has moved no frozen byte. ⇒ THE FREEZE (P5 step 6) IS THE OWNER'S
ACT.** ⚠ It is now also **mechanically available**: `tests/freeze-boundary.test.ts` holds the frozen
surface, so freezing is the policy change *"the baseline may no longer be updated without an owner
ruling"* — with a machine holding the line afterwards.

### Zayd (kernel / document / headless)

1. **The plan + section** (`docs/design/P5_step6C_plan_section_design.md` §8) — **the moment Q1–Q3 are
   ruled, and not before**: Q1 decides the SHAPE of the unit, so building first is building the wrong
   thing. ⚠ Read §5's test table BEFORE writing the fixture — every criterion has a way to pass while
   FALSE, and the top one is a one-plain-wall fixture. It must carry a curtain wall, an opening and a
   design option. ⚠ The `views` promotion is Entry 68's verbatim **including its correction — no
   `emptyScene()` entry.**
2. ✅ **DONE (Entry 74) — the going-public housekeeping.** `LICENSE` AGPL-3.0, `CLA.md`, `NOTICE` +
   `licenses/`, and the `license` field in all ten manifests. What is left is not repo work: **Q11
   (`<LEGAL ENTITY>`) and Q12 (a lawyer's read of the CLA)**, both owner-only, both blocking the first
   external PR rather than publication. An in-app "open source licences" screen is unbuilt — Amer's.

⚠ **TWO ITEMS THAT STOOD HERE ARE GONE, BOTH KILLED BY READING THEM AGAINST THE ARTIFACT (Entry 73).
DO NOT RE-ADD EITHER.**

- **The `shapeSignature` memory view — CANCELLED, MEASURED NOT WORTH IT.** *"170 embind crossings per
  solid … most of what makes a cached import cost 12 ms"* was a **subtraction residue**, never measured.
  A crossing costs **0.21–0.39 µs**, so all **345** cost **0.073–0.133 ms — ~1% of the signature call**,
  against `shapeSignature`'s own **7.9 ms** of `GProp` work. A memory view removes ~0.1 ms/solid and no
  more, and would put a *"valid until the next call"* global buffer in the one file where a wrong answer
  builds a plausible wrong building. `tessellate`'s payoff is ~1.8M crossings **per frame**; this is 345
  **per solid, once**. Now a permanent tripwire: `geometry-cache-d29.test.ts` **THE ATTRIBUTION**.
  ⚠ **345, not the "170" Entry 71 quoted** — the self-review COUNTED it instead of deriving it, and a
  drain is **2N+1** crossings (`drainDoubles` re-calls `size()` in the loop condition), not N+1. It
  halves the per-crossing figure and leaves the total — the number the cancellation rests on — unmoved.
- **`schedule.ts`'s "rule 17" rename — A PHANTOM. There is no collision.** Both citations in
  `schedule.ts` are correct uses of the real numbered domain rule 17 (*a drawing is a projection*, D58,
  which names schedules explicitly). The collision was already resolved by numbering the interaction
  rule **19**, and `core_logic.md:376` records that the *"`schedule.ts` code-comment convention"* belief
  **was itself wrong.** Renaming would have INTRODUCED the error.

⚠⚠ **DO NOT START THE D29 DOCUMENT HALF UNASKED** — it is `open_rulings.md` Q6, and the measurement is
why: 2.07×, **6.64 ms/solid on every save**, **~61 MB at the 16k-solid target**, against a cold load that
stays ~3 min either way.

### Amer (browser hot path)

1. **THE OPENING TOOL.** P4.5 exit criterion 3 (*a window is placed by CLICKING A FACE and no human types
   a derivation token*) is ONE TOOL AWAY: `SnapHit.ref` already carries the `SubShapeRef` and
   `SnapHit.hostElementId` the element, so the tool is a two-input registry entry committing
   `core.createElement` with `{hostId, hostRef}`. Model it on `WALL_TOOL`; the face-snap candidate is the
   piece to add to `tool/snap.ts`.
2. **ALIGNMENT GUIDES** (design §4.3) — dashed overlay when the cursor lines up with a live reference
   point. Pure `PreviewLayer` geometry; no model state, no contract.
3. **THE MOVE TOOL + GIZMO and THE CORNER-DRAG are now UNBLOCKED (D80).** ⚠⚠ **READ THE SPLIT BEFORE THE
   GIZMO — IT IS ENFORCED, NOT MERELY DOCUMENTED: `core.move` REFUSES a wall** (drag both endpoints with
   `core.setParams`) **and REFUSES a door** (`setParams` on `offsetU`), naming the road that works. The
   move verbs are for GenericSolid-shaped elements. `core.array` refuses by design — keep it out of the
   ribbon. The corner-drag has its atomicity via `doc.execute(id, args, { transactionId })`.

**Standing API facts that have bitten before:** `planDelete()` is gone (use `dryRun`) · `discipline` lives
on the part · ids are opaque ULIDs (never parse or render them — use `element.name`) · `mass` may be absent
(render "—", never "0 kg") · on save persist
`saveBnn(scene, { journal: doc.changeFeed(), revision: doc.revision })` — `doc.history()` there is the
moat-losing bug, and it is now **refused** rather than silently written.

### Later (post-freeze / v1.0.x)

The D29 `.bnn` half (owner call) · `instantiate` · lazy build + heap eviction (D66) · multithreading (D8) ·
a File System Access `StorageAdapter` · WebGPU + WebGL2 fallback · service worker/PWA + Cloudflare deploy ·
material appearance + transparency · the optional `codecFor` open/save wiring (D71) · then the **"Road to
Revit parity"** phase map. *That is the actual distance to beating Revit; v1.0.0 is its foundation.*

### ✅ CLOSED — DO NOT REDO

The op set (`transform`/`extrude`/`chamfer`/`revolve`/`faceFrame`) · `measure(ref)` + derived
`capabilities` · the positional key (D28) · the protocol freeze · CI · the document model + agent surface +
`.bnn` + undo + broken-ref state + cascade delete · all six P3 defects + D40–D46 · `-O3`/LTO (**MEASURED —
no speed; do not re-run**) · the heap ceiling · **all of D50 step 0** (0a–0g, the sketch solver, the room
solver, 0c joins) · **all eighteen backward sweeps** (D67–D77) · the enumeration query + Clean Delta
exporter · the schedules body (D78) + its CRUD (D79) · the renderer batching rewrite · P4.5's tool layer ·
the D29 op bodies · **the five move verbs + `transactionId` (D80)** · browser storage · the join spatial
index (D73) · **the cached-import cost attribution — the embind crossings are 0.9%, the memory view is
cancelled and the "rule 17" rename is a phantom (Entry 73).**

---

## §6 — Environment & commands (dev box)

```bash
# ⚠ pnpm is corepack-only — NOT on PATH. Drop a shim for the session:
mkdir -p ~/bin && printf '#!/bin/sh\nexec corepack pnpm "$@"\n' > ~/bin/pnpm && chmod +x ~/bin/pnpm
export PATH="$HOME/bin:$PATH"        # ⚠ this also puts `gh` on PATH (installed 2026-07-31)

pnpm install
pnpm verify          # THE CI STEP LIST EXACTLY: typecheck (incl. apps/web) + lint + format:check
                     #                           + test + reseed:check + docs:check
pnpm state           # regenerate §8 and YOUR OWN prompt's FRESH. Never hand-edit §8.
pnpm docs:check      # the doc gates alone (budget · abstract schema · §8 freshness)

# Change the kernel's C++ and re-test: ~60-74 s (OCCT's static libs are prebuilt). A VERSION bump = 2.5 h.
SPIKE=$HOME/occt-wasm-spike;  REPO=$HOME/projects/Bunyan/tools/kernel-build
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$SPIKE/install:/install:ro" \
  emscripten/emsdk:latest bash /work/link.sh
cp $REPO/dist/bunyan-kernel.{js,wasm} $HOME/projects/Bunyan/packages/kernel-occt/wasm/ && pnpm verify

# Offline golden seeding (NEVER in CI): cd tools/oracle && VIRTUAL_ENV=$PWD/.venv uv run seed-goldens ../../tests/goldens
```

- **Node** 20.20.2, **pnpm** 10.34.5 (corepack only), **uv** 0.11.20, **gh** 2.97.0 (`~/bin/gh`).
  **`libgl1`** installed (OCP → VTK). No system pip/venv — always `uv`.
- ⚠ **`verify` = the CI step list, EXACTLY**: a local gate that is a strict SUBSET of CI is a
  false-negative generator. `.prettierrc` has `endOfLine:"auto"` so `format:check` is green on both
  Windows (CRLF) and CI (LF).
- ⚠⚠ **`.prettierignore` LISTS PATHS, AND THE PROSE DOCS MOVED.** A stale entry there does not error — it
  silently stops exempting a file, and `format:check` is CI step 3, which failed silently for six sessions
  once already. **Move a prose doc, move its line, same commit.**

### §6a — BOX DISCIPLINE (owner ruling — binding)

**Full text: box-local `cross_projects_policy.md` §6/§6a.** The dev box is small (~3.7 GiB RAM + 2 GiB
swap) AND it is the production host for two live public sites — **an OOM here can take the owner's public
sites offline.**

1. **Never run anything that would overload the box.** Constrain at the source (cap Docker memory, cap
   `-j`). If a run can't be made safe, **escalate** with the numbers.
2. **PRE-AUTHORIZED to pause** (graceful `docker stop` only; never `kill`/`rm`/remove a volume; check that
   project's `current_state.md` for active work; restore + verify after): **Planitor**, **Chantier_Manager**
   (`restart=no` — they won't come back on their own), **Portique_Designer**, **SmartBar**.
3. **⚠⚠ HARD LIMIT — NEVER, including box strain:** `portfolio-caddy-1` (live `beam-stack.com` +
   `daoudi.beam-stack.com`) and `beamstack-contact` (real inbound leads). This box is their production box.
4. **Before pausing anything, `du -sh /tmp`** — it is tmpfs (RAM); our own dead scratchpads are usually the
   hog.
5. **Record any pause + restore** in the box-local `last_session_work.md`.

---

## §7 — Entry abstracts (newest 10)

**⚠ THE FULL BODIES ARE IN `handoff/<agent>/`, ONE FILE EACH. Nothing was summarized away.** Older entries
are indexed in `docs/history.md` §C with their paths, and entries 1–53 are summarized there.

**The eight fields are MANDATORY and gate-enforced** (`tests/docs-budget.test.ts`). Write the abstract
first, then the body. **Open a full body only when an abstract line touches your task.**

**⚠ THE ROTATION RULE — it is a BYTE BUDGET, not a count.** `pnpm docs:check` fails when this file or §7
exceeds budget. When it does: move the oldest abstracts' summaries into `docs/history.md`, **after
checking their durable lessons are already in §1–§5.** The bodies stay in `handoff/` forever. **Compaction
is maintenance and does NOT get an entry of its own.**

### 74 | 2026-08-02 | Zayd | the going-public housekeeping — `LICENSE` (AGPL-3.0), the CLA, the attribution notices

- **CHANGED:** `LICENSE` (AGPL-3.0, verbatim, sha256 `0d96a4ff…9abcb0`) · `NOTICE` · `licenses/` (the
  OCCT LGPL-2.1 text + the Open CASCADE exception + planegcs's, all copied from the artifacts we
  actually build and install, never from a web page) · `CLA.md` · `.prettierignore` · and
  **`"license": "AGPL-3.0-only"` in all TEN workspace manifests, none of which declared one.**
  **No source package, no test, no contract byte.** Its own commit, its own PR (Entries 64+65's lesson).
- **VERIFIED:** 630 green · all six gates 0 (exit code read) · `freeze-boundary` green. ⚠ No
  revert-verification, correctly: §1b governs *fixes*, and there is no behaviour here to revert.
- **FOUND:** ⚠⚠ **THE TWO LICENCE OBLIGATIONS ARE NOT SYMMETRIC, and writing them as one job would have
  been wrong in both directions.** OCCT is **statically linked** and its binary **is committed**
  (`bunyan-kernel.wasm`) ⇒ the Open CASCADE exception's relief is *conditional on a prominent notice*,
  so `NOTICE` states that sentence in the exception's own terms rather than listing OCCT in a table,
  and it writes down how D15's *"public source discharges relink"* is actually discharged (upstream
  unmodified at `V7_9_3`, our kernel source in-repo, the recipe in `tools/kernel-build/`, build id
  `occt-7.9.3-emcc-6.0.2`). planegcs is the opposite: an unmodified npm dependency whose binary **we do
  not redistribute** — claiming we do would have been a false statement about our own distribution.
  ⚠ **AND I REPEATED ENTRY 73'S MISTAKE ONE ENTRY LATER:** I wrote in `.prettierignore` that prettier
  "would reflow" `CLA.md`, then measured with `--ignore-path /dev/null` and found **all four new lines
  are no-ops today** — `.txt`/extensionless files get no parser, and `CLA.md` already conforms. The
  comment now carries the command and says they are defensive, not load-bearing. Cost of checking: 90 s.
- **OWES:** Owner: **Q11 + Q12, both inside `CLA.md` and both marked in the file** — `<LEGAL ENTITY>` is
  a placeholder only you can fill, and no lawyer has read it (it is the Apache ICLA shape, sound as a
  draft, and §2 grants what D15's dual-licensing model needs). Neither blocks anything until the first
  external PR, which is exactly when both must be closed. **Q1–Q3 still BLOCK plan/section, now a sixth
  session (69→71→72→73→74).** Amer: an "open source licences" screen is unbuilt and is his layer.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-02-going-public-housekeeping.md`
- **REVIEW:** ⚠ **UNREVIEWED — this is the open PR.** Next session reviews it at step 3.

### 73 | 2026-08-01 | Zayd | the cached-import attribution — the `shapeSignature` memory view is CANCELLED

- **CHANGED:** `tests/geometry-cache-d29.test.ts` (+`THE ATTRIBUTION`) · `.github/workflows/ci.yml`
  (`fetch-depth: 0`) + `scripts/check-reseed.mjs` · `current_state.md` §1a/§5 + `docs/decisions.md` D29
  and §4j-2 (the false number, four sites) · `Zayd_Prompt.md` §1 (the box-local read/write restored).
  **No kernel C++, no WASM rebuild, no artifact churn, no source package touched** — the TASK's own
  *"measure both sides"* line cancelled its own unit. `schedule.ts` untouched (FOUND, below).
- **VERIFIED:** 630 green · all six gates 0 (exit code read) · real OCCT · dev box headless ·
  revert-verified 1 way — Entry 71's belief asserted goes RED at the measured value.
- **FOUND:** ⚠⚠ **THE "170 EMBIND CROSSINGS" WERE NEVER MEASURED — a subtraction residue** (a native
  breakdown ×3, *"and the rest is"*). Measured: a crossing costs **0.21–0.39 µs**, so all **345** cost
  **0.073–0.133 ms = ~1%** of the signature call, against `shapeSignature`'s own **7.9 ms** of `GProp` work
  (**46%** of the kernel-side import). ⚠ My first probe repeated Entry 71's error — subtracting two
  ~10 ms timings to find a 0.073 ms signal returned a **negative** cost; the compute must be held OUT.
  ⚠⚠ **And TASK item 2 was a PHANTOM:** both `schedule.ts` "rule 17" citations are correct uses of the
  real domain rule 17 (D58), and `core_logic.md:376` already records that the collision belief *"was
  wrong"* — renaming would have INTRODUCED the error.
  ⚠⚠ **AND CI'S RE-SEED GATE HAD NEVER RUN ITS REAL PATH ONCE IN 73 ENTRIES.** `actions/checkout`
  defaults to a SHALLOW clone, so `git diff <base>...<head>` died with *"Invalid symmetric difference
  expression"* and PR #1 went RED for a reason unrelated to its diff. Invisible because the repo had
  never had a PR: on a `push` the gate reads no `BASE_REF` and prints *"skipping"* — the only path it
  had ever taken. **The gate whose own comment says it exists so the check is "impossible to quietly
  skip" had itself never executed.** Fixed (`fetch-depth: 0`). §1c-7, fifth occurrence.
  ⚠ **The 2026-07-31 migration also silently DROPPED two box-local steps from Zayd's loop** — the
  binding read of `../cross_projects_policy.md` + `../last_session_work.md`, and the write-back at
  hand-off. Not deliberate (§1 changes only when a standing fact has drifted). **Consequence, measured:
  the 2026-07-31 session left NO record on the box at all.** Both restored; the missing record
  reconstructed box-locally.
- **OWES:** Owner: **Q1–Q3 still BLOCK plan/section — now across four sessions (69→71→72→73)**; the freeze
  is still yours and still unblocked. Amer: nothing. Next Zayd: the going-public housekeeping (its own
  commit), then plan/section the moment Q1–Q3 land.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-01-cached-import-attribution.md`
- **REVIEW:** self-review by the NEXT session (Entry 74's step 3), not by the author — a fresh session,
  which is the point of the rule. Item 1 executed independently: the ATTRIBUTION reproduced at
  **7.345 ms compute vs 0.121 ms drain (1.6%)**, then Entry 71's belief asserted (`drainShare > 0.5`)
  went **RED at 0.0138**. ⚠ **ONE FINDING, PROVEN AND FIXED ON THE BRANCH: the crossing COUNT was
  itself derived rather than counted, and was ~2× low** — a drain is **2N+1** crossings, not N+1
  (`drainDoubles` re-calls `size()` in the loop condition), so **345, not 173**, at **0.21–0.39 µs**
  each. The total, and therefore the cancellation, is unchanged; the count is now OBSERVED in the test
  by a counting wrapper around the production loop. *An entry whose whole subject is "a number nobody
  measured" shipped one more derived number — which is exactly the base rate §1c-8 predicts.*

### 72 | 2026-07-30 | Zayd | the five move verbs + `transactionId` atomicity (D80, P4.5 rows ⓑ/ⓘ)

- **CHANGED:** `packages/document` only — `placement.ts` (NEW: rigid-motion algebra + the positioning
  rule), five registry entries + a guard on `createElement`, the transaction unit in `undo.ts`/`document.ts`.
  `core.array` registered but REFUSES. No kernel, no WASM, no frozen byte, no schema bump, no field.
- **VERIFIED:** 613 green · all five gates 0 · real OCCT · dev box headless · revert-verified 15 ways.
- **FOUND:** ⚠⚠ **ALL THREE SHIPPED TYPES ARE PARAMS-POSITIONED** (`core.wall` {start,end} ·
  `core.opening` {offsetU,offsetV} · `core.curtainwall` {origin}), and **a hosted element's own
  `placement` is never read by the engine at all** — measured, byte-identical bounds. So the ruled split's
  own example was wrong, and `core.move` on a door would have succeeded, moved nothing, and journalled a
  move to the Clean Delta.
- **OWES:** Amer: the move tool + gizmo and the corner-drag are unblocked — **read the refusal first**.
  Owner: Q7 (`core.copy` of a host's openings) and Q8 (is the baseline refusal the right strictness) —
  both in `open_rulings.md`.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-07-30-move-verbs-transactionid.md`
- **REVIEW:** pre-dates the PR flow — merged directly to `main` 2026-07-31, `pnpm verify` re-run green
  before commit. ⚠ Not independently reviewed.

### 71 | 2026-07-30 | Zayd | the D29 geometry-cache bodies — `exportBrep` / `importBrep`

- **CHANGED:** `tools/kernel-build` + `packages/kernel-occt` (`src/cache.ts` NEW) + `packages/protocol` +
  tests. The committed WASM artifact changed (+12,631 B). Two false COMMENTS on frozen shapes corrected;
  the wire contract is byte-identical.
- **VERIFIED:** 590 green · all five gates 0 · real OCCT · revert-verified 7 ways.
- **FOUND:** ⚠⚠ **The ruled design was wrong in two places.** Step 1 cannot be implemented as written (a
  cached shape has no derivations, because the recipe never ran) ⇒ bind by the read shape's own sub-shape
  order, pinned by the fingerprint. Step 2 left the TOKEN LIST unguarded — over the geometry alone a
  permuted `refs` array mis-names two faces and still verifies. **THE PRIZE IS 2.07×, NOT AN ORDER OF
  MAGNITUDE** (24.86 → 12.00 ms/solid; export costs 6.64 ms/solid on every save; ~61 MB at 16k solids).
- **OWES:** Owner: Q6 — is the `.bnn` half worth wiring at 2.07×? Recommendation on the desk: **no** for
  v1.0.0. Next: the `shapeSignature` memory view (170 embind crossings/solid). ⚠⚠ **THAT "NEXT" IS
  CANCELLED — Entry 73 measured the crossings at 0.9%, and the claim was never measured here.**
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-07-30-d29-cache-bodies.md`
- **REVIEW:** pre-dates the PR flow. ⚠ Not independently reviewed.

### 70 | 2026-07-30 | Amer | P4.5's six rulings taken, and the tool layer ships

- **CHANGED:** all `apps/web` — `tool/QueryGateway.ts` (Tier 2, read-only, four ops as explicit OVERLOADS
  so *the type signature is the allowlist*), `tool/snap.ts` (Tier 1, PURE, projection injected),
  `toolMachine.ts` + `tools.ts`, `numeric.ts`, the preview layer, hover, multi-select. **Domain rule 19**
  adopted into `core_logic.md` §8.
- **VERIFIED:** 578 green · all five gates 0 · browser-verified (real OCCT + real GPU, through the
  DOM/`window` path) + headless.
- **FOUND:** ⚠⚠ **The app had NEVER registered the wall this design reasons about** — `bootstrap.ts` was
  still on the scaffold `core.wall.v1` while P5's D52 baseline `core.wall` shipped in Entry 42, so
  registering the real types was a PRECONDITION, not a tidy-up. And **React BATCHES**: typing `5000`
  produced `0` because four keystrokes in one tick each read the same stale closed-over value — invisible
  to slow manual typing.
- **OWES:** Zayd: rows ⓑ/ⓘ (the move verbs and a `transactionId` reader) — **discharged by Entry 72**.
- **RISK:** additive
- **FULL:** `handoff/amer/2026-07-30-p45-tool-layer.md`
- **REVIEW:** pre-dates the PR flow. ⚠ Not independently reviewed.

### 69 | 2026-07-30 | Zayd | the plan/section design, design-first

- **CHANGED:** nothing — the deliverable is `docs/design/P5_step6C_plan_section_design.md`. No source
  touched.
- **VERIFIED:** measured against native OCCT via seven probes (all deleted afterwards).
- **FOUND:** ⚠⚠ **The frozen `SectionCurve.ref` comment is FALSE about the projected half.** Cut curves
  attribute perfectly (**4/4, 1/1, 8/8, zero orphans**) via OCCT's own history; projected curves cannot
  attribute at all (HLR output shares **0 of 4** `IsSame()` with the input, and its finest granularity is
  the whole solid). Scale: the cut is FLAT at 1.28–1.31 ms/solid; **HLR RISES ≈N^1.5.**
- **OWES:** Owner: Q1–Q5 — **Q1–Q3 BLOCK the build.** Recommend `mode:'cut'` only for v1.0.0.
- **RISK:** additive (no source touched)
- **FULL:** `handoff/zayd/2026-07-30-plan-section-design.md`
- **REVIEW:** pre-dates the PR flow. ⚠ Not independently reviewed.

### 68 | 2026-07-29 | Zayd | the schedule CRUD — `scene.schedules` becomes a first-class collection (D79)

- **CHANGED:** `core.createSchedule`/`updateSchedule`/`deleteSchedule` as additive registry entries;
  `scene.schedules` promoted to a full `SceneCollection` with undo + a declared "nothing" dependency edge.
  One contract-touching line: `ParamField.refTo` gained `'schedule'`. No frozen byte, no schema bump.
- **VERIFIED:** 538 green · all five gates 0 · revert-verified ten ways.
- **FOUND:** ⚠⚠ **The verbs carry the refusal the body deliberately will not.** Measured before they
  existed: a `groupBy` naming a missing column collapses 2 groups into 1 keyed `[""]`; an out-of-grammar
  quantity key makes every cell **and the TOTAL** NaN, which JSON-stringifies to `null`. Also: the design
  doc's own prediction was wrong — an `emptyScene()` entry turned two GREEN reservation assertions RED, so
  **the collection materialises on first authoring** instead. And `schedule.ts` carried a raw **NUL byte**
  that made the file invisible to `grep`, on a project whose method is grep.
- **OWES:** Owner: should `refTo` also gain `'view'`/`'sheet'`/`'annotation'`/`'family'`? (Q3 —
  now BLOCKING the plan/section unit.)
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-07-29-schedule-crud-d79.md`
- **REVIEW:** pre-dates the PR flow. ⚠ Not independently reviewed.

### 67 | 2026-07-28 | Amer | P4.5's non-gating half — selection, view filter, the first keyboard owner

- **CHANGED:** `apps/web` only — new pure `view/viewFilter.ts` (+7 headless tests), wired into `App.tsx`
  with a View panel. Selection highlight, hide/isolate, type + discipline filters, the app's first-ever
  `keydown` handler (Esc/undo/redo).
- **VERIFIED:** 524 green · **all five gates 0 including `format:check`** · browser-verified (clean boot,
  filter/isolate/Esc exercised live, zero console errors).
- **FOUND:** the whole feature is a **pure predicate over the existing `renderParts` array** — dropping a
  part IS hide, a changed colour IS selection — so `Viewport`/`PartBatch`/`pick` are untouched.
  ⚠⚠ `format:check` passed for the first time since Entry 59 **by formatting BEFORE verify, not by luck.**
- **OWES:** nothing.
- **RISK:** additive
- **FULL:** `handoff/amer/2026-07-28-p45-selection-view-filter.md`
- **REVIEW:** pre-dates the PR flow. ⚠ Not independently reviewed.

### 66 | 2026-07-28 | Amer | P4.5 the interaction model, design-first

- **CHANGED:** nothing — the deliverable is `docs/design/P4.5_interaction_model_design.md`, grounded
  against the real `apps/web` seams by file name.
- **VERIFIED:** re-verified against the code that no move verb exists (row ⓑ) and that the kernel has the
  exact spatial ops but **no seam lets the UI reach them**.
- **FOUND:** the read-only two-tier snap seam is the phase's real work; the renderer already retains the
  `MeshBuffers` a snap needs.
- **OWES:** Owner: Q1–Q6 — **all six ruled 2026-07-30** and applied into §12, which is now the phase's
  decision record rather than its open questions.
- **RISK:** additive (no source touched)
- **FULL:** `handoff/amer/2026-07-28-p45-interaction-model-design.md`
- **REVIEW:** pre-dates the PR flow. ⚠ Not independently reviewed.

### 65 | 2026-07-28 | Zayd | the schedules body ships (D58 row Ⓐ's first body, D78)

- **CHANGED:** `schedule.ts` + `DocumentContext.evaluateSchedule`. Three reservations corrected
  (`groupBy` names STABLE COLUMN KEYS; `ScheduleDefinition.designOptionIds?` and `ChildOverride.mark?`
  reserved). No frozen byte, no schema bump, no verb.
- **VERIFIED:** 517 green · revert-verified five ways.
- **FOUND:** ⚠⚠ **The wrong loop it replaces was living inside the reservation's own PASSING TEST** —
  green from the day it was written because its fixture is two plain walls. Measured on a real model: a
  curtain-panel schedule returned **0 rows where 6 is correct**; a no-filter schedule **THREW** on the pure
  composite; one non-active design option produced a **2.0000× over-report**. ⇒ **the body consumes
  `modelElements()` and has no enumeration loop of its own, which IS its correctness.**
- **OWES:** nothing — the CRUD was owner-split into its own unit (Entry 68).
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-07-28-schedules-body-d78.md`
- **REVIEW:** pre-dates the PR flow. ⚠ Not independently reviewed.

---

## §8 — Generated

<!-- BEGIN GENERATED — written by `pnpm state`. Never hand-edit. -->

| | |
| --- | --- |
| **newest entry** | **74 (Zayd, 2026-08-02)** |
| branch · tip · tree | `zayd/2026-08-02-going-public-housekeeping` · `47d3035` · dirty |
| open PRs | none — main is the tip of the work |
| suite | **630 green** · 78 files · 206 suites |
| protocol | 21 live ops · 3 reserved (of 24 declared) |
| shipped source | 6 `BimObjectType`s in `@bunyan/types` · 37 command ids in `commands.ts` · 1 `FormatCodec` |
| schema | `SCENE_SCHEMA_VERSION` 2 |
| **frozen surface** | **RISK: additive** — unchanged vs baseline |
| diff vs origin/main | 15 files changed, 139 insertions(+), 52 deletions(-) (15 files) |
| docs budget | current_state 60.2/96.0 KB · §7 16.3/32.0 KB · abstracts 10/10 · bodies 21 |

_Generated 2026-08-02 by `pnpm state`._

<!-- END GENERATED -->
