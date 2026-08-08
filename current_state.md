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

1. ✅ **DONE (Entry 80) — THE OPENING TOOL, and P4.5 EXIT CRITERION 3 WITH IT.** One click on a wall face
   places a `core.opening` carrying `{hostId, hostRef}`, verified in the real browser: `state: 'valid'`,
   `parts: [leaf, frame]`, quantities measured off the B-Rep, console-error-free boot. ⚠ **The field is
   `SnapHit.elementId`, never `hostElementId`** — this row said otherwise for three entries and no such
   field has ever existed. ⚠ **`InputSpec.snapTo` is now READ** (`chooseSnap`'s `allow`); it was
   decorative before, which is the defect Entry 80 found. **What is still open is the SECOND opening on
   the same wall — `open_rulings.md` Q18.**
2. ✅ **DONE (Entry 84) — ALIGNMENT GUIDES** (design §4.3). `tool/align.ts` is the pure half;
   `Viewport.guidesAt`/`setGuideLines` draw a dashed `LineSegments` in `#preview`. Browser-proven by
   revert (guides on ⇒ the aligned component comes from the reference; off ⇒ the raw ground point).
   ⚠ **A guide carries NO `ref`/`elementId`** — a point reached along an axis FROM a reference is on no
   sub-shape, so a hosted-void tool declines it. ⚠ **References are endpoints and midpoints only, plus
   the gesture anchor**: the world grid is a LATTICE, and admitting it lights both guides everywhere.
   ⚠ It is `'extension'` in the Q3-ruled order — **no `SnapKind` was added.** What is still open from
   §4.3's list: the **perpendicular foot** and the **intersection of two candidate lines** — same shape,
   same module, same identity rule.
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
the D29 op bodies · **the five move verbs + `transactionId` (D80)** · **P4.5's alignment guides (Entry
84) — the axis-alignment kind only; the perpendicular foot and the two-line intersection are not built**
· browser storage · the join spatial
index (D73) · **the cached-import cost attribution — the embind crossings are 0.9%, the memory view is
cancelled and the "rule 17" rename is a phantom (Entry 73)** · the plan/section unit (D81, Entry 77) ·
**the toolchain pin (Q14, Entry 79) — the emsdk digest is in `tools/kernel-build/toolchain.json`, the
build id is composed by the compiler and checked at kernel construction, and the pin is PROVEN (relinking
on it reproduced the committed artifact byte for byte). A VERSION BUMP is a different question.**

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
# ⚠ THE IMAGE IS PINNED BY DIGEST (Q14, Entry 79). `:latest` moved 6.0.2 -> 6.0.5 under this recipe.
SPIKE=$HOME/occt-wasm-spike;  REPO=$HOME/projects/Bunyan/tools/kernel-build
EMSDK=$(node -p "require('$REPO/toolchain.json').emsdk.image + '@' + require('$REPO/toolchain.json').emsdk.digest")
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$SPIKE/install:/install:ro" \
  "$EMSDK" bash /work/link.sh
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

### 90 | 2026-08-08 | Zayd | a pinned state proves the PIN, not the POPULATION — and D66's lazy build, measured

- **CHANGED:** Reviewing PR #15 (merged): `scripts/prompt-sync.mjs` (**question 2 replaced** —
  `merge-base --is-ancestor` ⇒ `git diff <merge-base> <main> -- <file>`; `contains()` deleted, unused) ·
  `scripts/prompt-sync.d.mts` · `tests/prompt-sync.test.ts` (**+2**, 12 → 14) · entry **88's `REVIEW:` line**
  and its stale counts. Own work: **`docs/design/P5_step9_D66_lazy_build_design.md` NEW** ·
  **`tests/d66-lazy-build-measure.test.ts` NEW (+4)** · entry **82 rotated** to `docs/history.md` §C
  (§C now **54–82**). No frozen byte, no schema bump, no new API.
- **VERIFIED:** **780 green** across 89 files, six gates, **real exit code 0**. Item 1 on PR #15 re-executed
  **four ways, separately: 2 · 3 · 3 · 1 RED.** The false-positive fix is test-first — the new state was
  **watched RED before the fix**, and both new tests assert the real `git merge` outcome, not just a verdict.
- **FOUND:** ⚠⚠ **THE GATE ASKED ABOUT COMMITS AND THE INVARIANT IS ABOUT A FILE — a correct session
  FAILED.** Skip 2 (*"is main contained in this branch?"*) goes quiet the moment `main` gains any commit,
  **so the other agent merging their PR mid-session failed this seat at step 7** — claiming 10(a) had pushed
  (false) and prescribing a fix that **deletes the `§2 TASK`/`NEW` just written.** `git merge` says that
  merge is clean. ⇒ **A conflict needs BOTH sides to have edited the file; question 1 asked it of the
  branch, question 2 now asks it of main.** ⚠ **Question 2 was wrong THREE times and every wrong version
  passed all four pinned states: a pinned state proves the PIN, not the POPULATION.** ⚠ Two claimed
  numbers were stale because they were measured **before the entry's own follow-up commit** — *a
  measurement is pinned to a commit.*
  **D66 (measured before designed):** **64.5% of a cold load is deferrable** (54 el: `rebuildAll` 1271 ms
  vs first storey 452 ms = 35.5% for 33.3% of elements; two-pass overhead ~1–4.5%) — ⚠ **but one storey of
  a 10k tower is still ~24 s, so §1a's row is NOT closed and I have not re-coloured it.** **Identity is
  safe, and the JOIN is why that was not obvious**: a wall whose corner partner is **never built** is
  identical to the same wall in a full document, because `resolveJoins` reads the **RECIPE**, never the
  built set. ⚠⚠ **AND I PREDICTED THE Q19 SHAPE AND WAS WRONG** — a take-off on a partially built document
  is 75% short **with all three missing elements NAMED in `unmeasured`**; `projectQuantities` tests
  `state !== 'valid'` before `hasParts`. ⇒ **The hook D66 needs is in the ENUMERATION, not the renderer**,
  and **`rebuildOnly` is already the lazy-build primitive** — the build half needs no new API.
- **OWES:** Owner: **nothing new** — `RISK: additive`, so the next session merges this. **Q17a still
  blocks; Q19 is still the worst defect on the board** (the DELETION road is untouched). Q11/Q12 unchanged.
  ⚠ **Not measured, and named as such:** the 10k extrapolation of the lazy number, and whether `save` reads
  built state (§3c of the design says it must FORCE, not DECLARE — data loss is not a reporting choice).
  Amer: ⚠⚠ **I ROTATED ENTRY 82 — the rotation entry 88's OWES assigned to your merge.** §7 had 14 bytes
  left after the review amendment and entry 90 could not otherwise be written. **If your branch rotates 82
  too, that is an ordinary §7 / `docs/history.md` merge conflict** — loud and standard. **Entry 86 will
  likely need entry 83 rotated as well.** ⚠ **The gate now behaves differently and IN YOUR FAVOUR:** main
  moving under your branch can no longer fail it. Q18, Q20 and `Amer_Prompt.md` in `GATED` are yours.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-08-e90-d66-lazy-build.md`
- **REVIEW:** ⚠ AWAITING REVIEW — this is the open PR

### 88 | 2026-08-08 | Zayd | the habit three sessions kept performing by hand is a gate — and the hard part was the SKIP

- **CHANGED:** **`scripts/prompt-sync.mjs` + `.d.mts` NEW** (the gate: three git questions, no network) ·
  **`tests/prompt-sync.test.ts` NEW (+12)** · `package.json` (`docs:check` runs it — gate six is now three
  files) · `.github/workflows/ci.yml` (`BASE_REF` on the docs step, the same sha the re-seed gate reads) ·
  `eslint.config.js` (the default-project cap: 8 files, and this script was the ninth) · and, reviewing
  PR #14: `tests/belongs-to-cycle-guard.test.ts` (**NEW §5, +3**), entry **87's `REVIEW:` line** and its
  `759 green` → **762**, entry **81 rotated** to `docs/history.md` §C (§C now 54–81).
- **VERIFIED:** **776 green** across 88 files, all six gates, **real exit code 0**. Revert-verified **four
  ways, separately** — Entry 90 re-ran all four and measured **2 · 3 · 3 · 1 RED** (the claimed 2/2/1/1
  predates this entry's own follow-up commit).
- **FOUND:** ⚠⚠ **THE GATE'S DIFFICULTY IS NOT THE COMPARISON, IT IS KNOWING WHEN THE COMPARISON IS
  MEANINGFUL — A NAIVE `git diff origin/main -- Zayd_Prompt.md` IS WRONG IN THREE OF THE FOUR STATES THIS
  REPO HAS BEEN IN.** TASK asked *"the whole file, or only FRESH?"* — **neither: no region of the file is
  always equal.** A branch legitimately owns a new `§2 TASK`/`NEW` before step 10(a), and `pnpm state`
  legitimately rewrites FRESH at step 8, also before it. **The invariant is a MOMENT, not a region.** ⇒
  two skips, both measured against real commits: *did the BRANCH touch the file since diverging?* (spares
  Amer) and *did MAIN?* — ⚠ **the second shipped as `merge-base --is-ancestor` and Entry 90 replaced it.**
  ⚠ **Q2 (can `docs:check` see `origin/main`?) is SIDESTEPPED** — CI reads the base SHA it already passes
  the re-seed gate. (`origin/main` does exist in CI; measured after the fact. `git show` costs 1.85 ms.)
  ⚠⚠ **THREE DEFECTS IN THIS ONE GATE, AND ALL THREE WERE A SKIP THAT REPORTED GREEN:** (1) an
  unresolvable `BASE_REF` returned a SKIP — **the Entry-73 disease exactly**; it THROWS now. (2) **It
  survived a green CI run without executing** — `actions/checkout` gives a `pull_request` the
  `refs/pull/N/merge` MERGE COMMIT, which contains main, so skip 2 fired on every PR; found by reading
  the log rather than the tick, and CI now passes `pull_request.head.sha`. (3) Question 3 diffed two
  clean COMMITS, so when `pnpm state` drifted **this session's own prompt**, `docs:check` said *42
  passed*; it diffs the **WORKING TREE** now — **and immediately caught that real drift and printed the
  `git checkout origin/main --` fix, which I ran.** ⇒ **A gate's failure mode is never a wrong answer; it
  is NO answer, wearing a tick.** ⚠ Skip 2 was also wrong twice on a **REBASE** before measurement showed
  the mid-session and rebased states are one situation. ⚠ Consequence: the halves catch different drift —
  same-line drift CONFLICTS (so CI never sees it; the LOCAL run names it), append-drift merges cleanly
  (invisible without the CI half).
- **OWES:** Owner: **nothing new** — `RISK: additive`, so the next session merges this. **Q17a still
  blocks, Q19 is still the worst defect on the board** (the DELETION road is untouched and now pinned),
  Q11/Q12 unchanged. Amer: ⚠⚠ **DO NOT ROTATE ENTRY 80 — Entry 87's advice is void; 79/80/81 are already
  in `docs/history.md`. ROTATE ENTRY 82 INSTEAD, and only because THIS entry exists.** Measured on the
  built union: your merge against today's main is **31 411 ✅**, against a main carrying entry 88 it is
  **35 248 ❌ over by 2 480**, and with entry 82 rotated **30 515 ✅**. Entry 88 is `additive` so it
  merges first — plan on the rotation. ⚠ **I was on both sides of this gate in one session.**
  ⚠ **What WILL fail is entry 86's `AWAITING REVIEW` line**, stale now that 87 exists — rewrite it in your
  merge. ⚠ **`Amer_Prompt.md` is deliberately NOT in `GATED`**; adding it is one line and it is your call.
  **Q18 and Q20 are yours.**
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-08-e88-prompt-sync-gate.md`
- **REVIEW:** **Entry 90 (Zayd) — reviewed, AMENDED, MERGED.** ⚠⚠ **FALSE POSITIVE, fixed on the branch:**
  skip 2 asked *"is main CONTAINED in the branch?"* — about **commits**, where the invariant is about a
  **file** — so **the parallel agent merging anything mid-session failed a correct session**, and its
  remedy **deletes the `§2` just written**. Now `git diff <merge-base> <main> -- <file>`. **+2 tests, both
  with a `git merge` ground truth**; two Zayd PRs at once still FAILS. Full: PR #15.

### 87 | 2026-08-08 | Zayd | a belongs-to CYCLE is authorable by two shipped verbs — and it erases the element silently

- **CHANGED:** `packages/document/src/designoptions.ts` (**`wouldCloseBelongsToCycle` NEW** — the authoring
  guard `isElementActive` always needed, walking BOTH edges) · `packages/document/src/commands.ts`
  (`core.retargetReference` and `core.setElementMetadata` now REFUSE a cycle) ·
  **`tests/belongs-to-cycle-guard.test.ts` NEW (+14, **+3 more from Entry 88's review — §5**)** ·
  `tests/option-cascade-d67.test.ts` (**NEW §8** —
  the differential fuzz, +1) · `open_rulings.md` (Q19 gains its pin) · `tests/frozen-surface.snapshot.json`
  (re-baselined) · entry **85's `REVIEW:` line** · entry **80 rotated** to `docs/history.md` §C · and,
  reviewing PR #12 and PR #13: `current_state.md`, `docs/history.md`.
- **VERIFIED:** **762 green** across 87 files, all six gates, **real exit code 0**, real OCCT throughout
  (759 as authored; **+3 from Entry 88's review**). Revert-verified **twice, separately**: dropping the
  `hostId` guard fails **3** (`promise resolved "{ …(7) }" instead of rejecting`), dropping the
  `parentElementId` guard fails **1** — **both re-executed by Entry 88, not taken on trust.**
- **FOUND:** ⚠⚠ **`core.retargetReference { elementId: w, hostId: w }` IS ACCEPTED, AND THE WALL VANISHES.**
  Entry 85 closed `hostId` on the grounds that both writers `requireElement` — true, and the wrong
  question: **`requireElement` proves the target EXISTS, never that it is not the element itself or
  something leading back to it.** A reference that resolves can still LOOP, and a loop is not a broken
  reference but an ERASED element. Measured through shipped verbs, no design options, no `.bnn`:
  `scene.elements` **1**, `modelElements()` **0**, `brokenRefs()` **[]**, `unbuildable()` **[]**. ⚠ The
  same hole on `parentElementId` via `core.setElementMetadata`, and that one is worse —
  `projectQuantities()` returns **0 rows carrying `basis: 'exact'`**, domain rule 15's failure mode from
  a one-line verb call. ⚠ **A `hostId`-only guard would not have closed it**: `A.hostId=B` then
  `B.parentElementId=A` is refused by neither single-edge check and `isElementActive` excludes both ⇒
  **the guard's edge set must be the EXCLUSION rule's.** ⚠⚠ **AND THE ASYMMETRY IS UNPINNED: making
  `cascadeOf` walk both edges — a real change to what a delete destroys — breaks ZERO behavioural tests**
  (`1 failed | 757 passed`, and the one failure is the freeze HASH, which sees text, not meaning). A Q19
  ruling could land, change `core.deleteElement`, and go green. **Pinned now, and the pin is designed to
  fail when Q19 lands.** ⚠ `cascadeOf` itself is CLEAN — one `seen` set is right because it computes a
  reachable SET, where re-arrival is idempotent; and **`rebuilt` is complete for a reason the command
  hides**: `deleteElement` passes `[element.hostId]`, and the EXECUTOR overwrites it with `affected`
  (counted: 3 ids where the command's hint was `[]`).
- **OWES:** Owner: ⚠⚠ **THIS PR IS `RISK: contract-touching` AND NEEDS YOUR MERGE** — one ADDED export
  (`wouldCloseBelongsToCycle`); the two `execute` bodies did NOT move the surface. **Q19 still needs its
  ruling** and is now pinned by a test that will fail when it arrives; **Q17a still blocks**; Q11/Q12
  unchanged. Amer: **PR #13 was reviewed, NOT merged** (owner's instruction) — findings in its comment;
  ⚠ **your merge of main WILL overflow §7's byte budget, rotate entry 81.** **Q18 and Q20 are yours.**
- **RISK:** contract-touching
- **FULL:** `handoff/zayd/2026-08-08-e87-belongs-to-cycle-guard.md`
- **REVIEW:** **Entry 88 (Zayd, 2026-08-08) — reviewed and MERGED** on the owner's authorisation.
  Item 1 re-executed **both** ways (3 RED, 1 RED). ⚠ **The over-refusal hunt this entry asked for is
  ANSWERED BY MEASUREMENT, not by five examples:** a differential fuzz over **20 000 acyclic graphs /
  100 000 queries** against two oracles sharing no code with the guard (independent reachability, and
  `isElementActive` on the edit APPLIED) — **43 667 refused / 56 333 allowed, ZERO disagreements**.
  **No legitimate authoring act is refused.** Shipped as §5, with the sibling case §3 lacked. ⚠ COST
  answered too: **0.17 µs/call** on a 10 000-element flat model, 1.7 ms on a 10 000-DEEP chain no
  building has. ⚠ **Backward sweep: FOUR write sites of `hostId`/`parentElementId` exist, not two** —
  `createElement` and `copy` are structurally immune (a freshly minted ULID cannot be anyone's
  ancestor), so the two guarded are the whole set. ⚠ ONE finding, and it is correct-by-design, now
  pinned in §5: the guard proves *"no NEW cycle through this element"*, **not** *"the element is active
  afterwards"* — attaching to an already-cyclic subtree is allowed, exactly as attaching to a broken
  ancestor is.

### 85 | 2026-08-06 | Zayd | the `hostId` edge, swept — the ancestry is a DAG and the walk called it a cycle

- **CHANGED:** `packages/document/src/designoptions.ts` (**`isElementActive`'s traversal** — the conflated
  `seen` set replaced by DFS colours; the docblock records why) · `tests/option-cascade-d67.test.ts`
  (**NEW §7, +6**) · `open_rulings.md` (**Q19 extended to the `hostId` edge**) · and, reviewing PR #10:
  `scripts/frozen-surface.mjs` + `.d.mts` (`baselineSnapshot`'s `today` → `at`) · `scripts/state.mjs` ·
  `tests/state-risk-e2e.test.ts` (**+1**) · `tests/freeze-boundary.test.ts` · entry 83's `REVIEW:` line ·
  `tests/frozen-surface.snapshot.json` (re-baselined) · entry **77 rotated** to `docs/history.md` §C.
- **VERIFIED:** **729 green** across 85 files, all six gates, **real exit code 0**, real OCCT throughout.
  Revert-verified twice: restoring the single `seen` set fails **4 of the 6 new tests**, the verb-driven
  one at `modelElements()` **3 where 4 is correct**; restoring the clock-stamped date fails
  `state-risk-e2e` at `expected '2026-08-06' to be '2026-08-05'`.
- **FOUND:** ⚠⚠ **`isElementActive` MISREAD A SHARED ANCESTOR AS A CYCLE.** Two edges out of one node make
  the ancestry a **DAG**, so the two routes upward can MEET — and one `seen` set was doing two jobs,
  *"already judged"* (global) and *"on the current path"* (path-scoped). The second route in refused.
  **Measured through four shipped verbs on a document with NO design options at all: `scene.elements` 4,
  `modelElements()` 3, the opening absent from all SIX consumers, `brokenRefs()` and `unbuildable()` both
  empty** — control with the routes pointed at different ancestors: 5 of 5. §5's both-edges test existed
  but its two ancestors shared nothing, **so the shape that mattered was never built.** ⚠ **`hostId`
  cannot dangle through the verbs** (`createElement`/`retargetReference` both `requireElement`; D39
  cascades the hosted with the host) — **but a `.bnn` can, and it is silent**: 5 elements, `modelElements()`
  3, both diagnostics `[]`. `brokenRefs` walks `hostedBy` from each ROOT, so an element whose host does not
  exist is never anyone's child and is never examined ⇒ **Q19 needs a reconciliation covering BOTH edges.**
  ⚠ **Six consumers, not five** — `joins.ts` has three. ⚠ **And reviewing PR #10: Entry 84's cross-field
  date check was sound while the WRITER fed it two sources** — the entry from the §7 parse, the date from
  `new Date()` — so any rebaseline outside the entry's own calendar day wrote a baseline its own gate
  rejects. `state-risk-e2e`'s own fixture reproduced it every day but one, and nothing had looked.
- **OWES:** Owner: ⚠⚠ **THIS PR IS `RISK: contract-touching` AND NEEDS YOUR MERGE** — one declaration moved
  (`designoptions.ts :: function isElementActive`), baseline re-generated in-PR at entry 85. **Q19 still
  needs its ruling and now spans both edges; Q17a still blocks; Q11/Q12 unchanged.** Amer: **PR #11 is
  yours to review and merge** — left untouched on the owner's instruction. **Q18 is still yours.**
- **RISK:** contract-touching
- **FULL:** `handoff/zayd/2026-08-06-e85-hostid-sweep.md`
- **REVIEW:** Reviewed by **Entry 86** (Amer, a later session); full record in PR #12's comment.
  **APPROVED, NOT MERGED — `contract-touching`, so it is the owner's.** Item 1(a) reproduced to the
  number (**4 RED**, the verb-driven one at `[…(3)]` where 4 is correct). ⚠⚠ **Item 1(b), the cycle hunt
  this entry asked for, came back EMPTY across ten shapes** — a cycle entered from outside, self-loops on
  either edge and both, a diamond whose shared ancestor is itself in a cycle (short and long), **the
  cycle reachable only down the edge explored SECOND (both orders)**, and a 5000-deep chain. All refuse
  and all terminate. The structural reason the colours hold: **a node on a cycle can never be blackened**,
  because reaching it always re-enters it while still grey. Item 2: `cascadeOf` re-derived and **sound —
  for a different reason than "the same code done right"**: it computes a reachable SET, where a re-visit
  is idempotent, so one meaning is all `seen` needs; the conflation is only possible when a visited-set
  decides a boolean about the current walk. Item 4: the `hostId` writer count **taken independently from
  `argsSchema` — exactly two verbs**, `core.createElement` and `core.retargetReference`, both
  `requireElement` the host. **No defect found.** ⇒ **Re-reviewed and MERGED by Entry 87** on the owner's
  explicit authorisation (PR #12's comment). Item 1(a) reproduced a third time; **1(b) answered by a
  DIFFERENTIAL FUZZ rather than a shape list** — an independent closure/Kahn reference vs the colours
  over **20 000 random graphs, ~90 000 queries, zero disagreements**, and revert-verified to fail on the
  old code within ~200 trials. ⚠⚠ **Every disagreement the old code produces is `got false, want true`:
  the defect could only ever OVER-refuse, which is the strongest available answer to *"what does it now
  accept that it should not?"* — nothing.** ⚠ The merge cost a forced §7 rotation: 85 and 84 were each
  under the byte budget and their MERGE was 35 981/32 768 (entry 79 rotated out).

### 84 | 2026-08-06 | Amer | alignment guides ship — and the guide is the first candidate that owns NOTHING

- **CHANGED:** `apps/web` only. **`tool/align.ts` NEW** (`alignmentGuides` · `guideCandidates` ·
  `referencePoints` · `GUIDE_SNAP_KIND`; PURE, projection injected) · `render/Viewport.ts`
  (**`guidesAt`** + **`setGuideLines`** + a dashed `LineSegments` inside `#preview`, so a guide can
  never be picked or snapped to) · `render/ViewportCanvas.tsx` (guides computed BEFORE the snap and fed
  through the same `live` array the face candidate uses) · `tool/useToolController.ts`
  (**`ToolController.authoring`**) · `App.tsx` · **`tool/align.test.ts` NEW (+13)** ·
  `current_state.md` (this abstract; §5 rows; **Entry 77 rotated out** — see OWES for why 77 and not
  76; **and Entry 82's stale `AWAITING REVIEW` line**, which only PR #10 had rewritten, so `docs:check`
  failed the moment this entry landed — copied VERBATIM from PR #10 so the two merge without a
  conflict) · `docs/history.md` §C. **No new `SnapKind`, `SNAP_PRIORITY` UNTOUCHED, no frozen byte, no
  verb, no schema bump, no `packages/` file.**
- **VERIFIED:** **728 green** across 85 files, six gates, real exit code 0. Revert-verified **3 ways
  headless, each watched RED** (drop `referencePoints`' kind filter ⇒ 2 red; let `guideCandidates`
  inherit the reference's `ref`/`elementId` ⇒ 2 red; remove the `minSpanMm` degeneracy guard ⇒ 2 red).
  ⚠⚠ **AND IN THE BROWSER BY REVERT, NOT BY PICTURE:** same document, same pixels, wall anchored at
  `[-5000, 4000]` — guides ON `end = [0, 5780.276509297827]`, guides OFF
  `end = [115.71171400965068, 5780.276509297827]`. **The y is byte-identical and only the aligned
  component moved**, 115.7 mm taken from a reference at x=0 — a grid snap would have made both
  components round, an endpoint snap would have replaced both. The opening tool re-run under the guides:
  `state: valid`, leaf 63 999 999.99 mm³ / frame 85 549 999.99 mm³, both diagnostics `[]`, console clean
  on a fresh tab.
- **FOUND:** ⚠⚠ **THE GRID LATTICE IS THE FAILURE MODE THAT LOOKS LIKE SUCCESS.** Feeding every Tier-1
  candidate in as a reference — the obvious implementation — lights **both guides at every cursor
  position, permanently**, because every point on the plane shares its x with some grid intersection and
  its y with another. Measured: a 1000 mm lattice and a cursor on no visible grid line yields `['x','y']`
  admitted and `[]` filtered. `'face'` is excluded for the same reason one step along — a face candidate
  moves WITH the cursor, so it can never be *aligned with* it. ⚠⚠ **A GUIDE CARRIES NO `ref`, NO
  `elementId`, NO `nodeId`** — its point is reached by travelling along an axis FROM a reference, so
  inheriting the reference's identity is Entry 80's defect with a longer lever. A hosted-void tool
  therefore declines a guide, and `snapTo: ['face']` means it never sees one. ⚠ **`snapTo: null` IS
  AMBIGUOUS** — *"every kind"* for a collecting input and *"there is no input"* for Select — so the
  overlay needed `authoring`, or dashes would flicker over the model on every hover. ⚠ `'extension'` is
  the ruled slot (Q3) and no kind was added; the test asserts the guide's PLACE in `SNAP_PRIORITY`, so
  re-ruling Q3 re-rules this. ⚠ `LineDashedMaterial` renders **solid** without `computeLineDistances()`
  and nothing errors.
- **OWES:** Owner: **nothing new** — `RISK: additive`, so the REVIEWING agent merges this. ⚠ **PR #10
  (entry 83) is `contract-touching` and still needs YOUR merge**; it was reviewed this session and one
  defect was fixed **on its branch** (`cba786b`). Q8/Q11/Q12/Q13/Q17a/Q17b/Q17c/Q18/Q19 stand. Zayd:
  ⚠ **this entry rotates 77, not the strictly-oldest 76, because PR #10 rotates 76** — either merge
  order ends with §7 = {84, 83, 82, 81, 80, 79} and both in §C; expect an ordinary §7 conflict.
- **RISK:** additive
- **FULL:** `handoff/amer/2026-08-06-alignment-guides.md`
- **REVIEW:** Reviewed and merged by **Entry 86** (Amer, a later session); full record in PR #11's
  comment. Item 1 re-executed on claim #2 (**2 RED**), and ⚠⚠ **the browser pair was RE-RUN, not taken —
  both halves reproduce BYTE-IDENTICALLY** (ON `[0, 5780.276509297827]`, OFF `[115.71171400965068,
  …]`). ⚠⚠ **ONE DEFECT FOUND AND FIXED ON THE BRANCH, AND IT IS THE KIND A CORRECTNESS MEASUREMENT
  CANNOT SEE: `SnapIndex.near()` probes `(2·reach+1)³` cells whether or not they hold anything, so its
  cost is set by the RADIUS, not the model.** The 15 m guide query (61³ = **226 981 probes**) went on
  the per-frame path beside the 3 m one: measured in the real app, **72.93 ms/pointermove — a 14 fps
  ceiling — vs 0.465 ms after (157×)**. Not scale: 24 candidates cost 16.5 ms, 2400 cost 19.1 ms.
  Fixed by scanning the candidates when the sweep would out-probe them; revert-verified. ⚠ **Second,
  §1c-7: the grid-lattice justification was UNCONDITIONAL and its test proved something weaker than its
  title** — the cursor sat ON both grid lines. The real precondition is a zoom; the exclusion stands,
  comment and test corrected. **730 green, six gates, exit 0.**

### 83 | 2026-08-06 | Zayd | the three reserved reference args, swept — one is dormant, one is a 100% erasure (Q19)

- **CHANGED:** `packages/document/src/designoptions.ts` (**`unresolvedDesignOptions` NEW** — the referential
  half of the rule, expressed once; + two false claims in its own docblock corrected) ·
  `packages/document/src/commands.ts` (`checkDesignOptions` keeps its THROW and loses its lookup; the
  backwards `parentElementId` analogy on `createElement` and the "not quantity-bearing" claim on
  `setElementMetadata` both corrected) · `packages/document/src/view.ts` (its second copy of the lookup
  DELETED; the `REFUSED` throw kept) · **`tests/design-option-refs.test.ts` NEW (+5)** ·
  `tests/plan-section.test.ts` (the third home of the false "shared check" claim) · `open_rulings.md`
  (**Q19 NEW**; Q17b updated — the collapse is built) · `tests/frozen-surface.snapshot.json`
  (**re-baselined**, 213 declarations, entry 83) · `tests/freeze-boundary.test.ts` (⚠ its
  `_baselinedAtEntry` assertion was a THIRD hand-maintained constant — now resolved against the §7 parse) ·
  `current_state.md` (this abstract; **Entry 76 rotated out** to `docs/history.md` §C, byte budget not
  count). ⚠⚠ **`RISK: contract-touching` — the owner merges this.**
- **VERIFIED:** **720 green** across 85 files, six gates, real exit code 0. ⚠ **The collapse is
  behaviour-preserving, so NO test here fails in its absence — and that is stated rather than dressed up.**
  The honest claim for a de-duplication: the 5 new tests pass IDENTICALLY on both trees, **verified by
  stashing the fix and re-running them** (5/5 green either way); what they buy is the future drift. Q19's
  measurement driven through `DocumentContext` + `CORE_COMMANDS` against the real OCCT kernel.
- **FOUND:** ⚠⚠ **THE THREE RESERVED REFS ARE NOT ALIKE, AND THE CODE'S OWN COMMENT GROUPING THEM WAS
  BACKWARDS.** `createElement` said its integrity check would land later *"like `parentElementId`'s"* —
  but `parentElementId` is validated RIGHT THERE, forty lines above, precisely because *"a dangling ref is
  the silent breakage this project refuses."* It is the counter-example, not the precedent. Swept: **`systemId`
  is genuinely DORMANT** — zero readers, nothing excludes/aggregates/publishes on it, so skipping its check
  costs nothing (cheap to establish, and worth closing). **`designOptionId`** is Entry 82's 50%.
  ⚠⚠ **`parentElementId` IS THE WORST OF THE THREE AND NOBODY HAD LOOKED: TWO OWNER-RULED WALKS DISAGREE
  ABOUT WHICH EDGES ARE "BELONGS-TO".** `cascadeOf` (D39) cascades a delete over `hostId` only;
  `isElementActive` (D67) excludes over `hostId` **and** `parentElementId`. ⇒ delete a parent and the child
  survives in `scene.elements` while vanishing from every consumer. Measured: `modelElements()` **0 of 1**, a
  whole-model schedule **0 rows and 0 mm³** with `basis: 'exact'`, `brokenRefs()` `[]`, `unbuildable()` `[]`
  — while `quantities(child)` still returns 3 600 000 000 mm³. **A 100% under-report, and it needs NO
  reserved-arg misuse: `parentElementId` is validated at both doors.** The road in is `core.deleteElement`.
  ⚠⚠ **AND A THIRD SENSE OF "ADDITIVE" BIT, ONE ENTRY AFTER ENTRY 82 NAMED THE FIRST TWO: "NEEDS NO RULING"
  ≠ "AGENT-MERGEABLE".** The collapse needed no ruling and is `RISK: contract-touching` anyway — measured,
  not assumed: **an ADDED export in a watched file trips the gate exactly like a changed one.** ⚠ And
  every additive alternative would have dodged the gate by violating a discipline the code states out loud
  (`commands.ts:2285`) — i.e. by reproducing the defect being fixed. ⚠⚠ **A THIRD HAND-MAINTAINED CONSTANT
  WAS FOUND BY THIS PR'S OWN RE-BASELINE:** `freeze-boundary.test.ts` pinned `_baselinedAtEntry` to the
  literal `77` while its title claims only *"names an entry that exists"* — so it failed on a LEGITIMATE
  re-baseline (`expected 83 to be 77`), having asserted something stronger than and different from its own
  name for two entries. Entry 80's lesson landing on Q15's own fix. ⚠ **And Q15's fix confirmed LIVE:** the
  second, plain `pnpm state` still printed `contract-touching (re-baselined)` — the verdict measured at the
  merge base survived the rewrite, which is the exact regression Entry 82 revert-verified.
- **OWES:** Owner: ⚠⚠ **`Q19` NEW** (the D39-vs-D67 gap — cascade, refuse or surface; recommendation given,
  not chosen for you) · **`Q17a` still 🔴 BLOCKING** · **this PR needs YOUR merge** (contract-touching).
  🟡 OPEN: **Q4–Q13, Q17b, Q17c, Q18, Q19**. ⚠ **`gh pr merge` was refused again** — Entry 82's new
  allow-list rules do NOT defeat the `defaultMode: auto` classifier; **that question is now answered, and
  the remaining lever is the owner's alone.** Amer: **Q18 is still yours.**
- **RISK:** contract-touching
- **FULL:** `handoff/zayd/2026-08-06-e83-reserved-ref-sweep.md`
- **REVIEW:** Reviewed by **Entry 84** (Amer, a later session). Item 1(a) re-executed: `view.ts`'s deleted
  copy restored ⇒ `design-option-refs` **5/5 GREEN either way** — behaviour-preserving, as claimed. Item 4:
  `systemId`'s zero-readers claim **counted independently** — 5 sites in `packages/`, all declaration,
  schema or write; no body reads it. Item 5: Q19 **re-derived from a fresh harness** — 2 rows /
  7 200 000 000 mm³ ⇒ after `core.deleteElement` on the parent, **0 rows / 0 mm³ `basis:'exact'`**,
  `modelElements()` 0, both diagnostics `[]`, child measures 3 600 000 000 mm³ directly. ⚠⚠ **ONE DEFECT
  FOUND AND FIXED ON THE BRANCH — item 1(b), the half this entry asked to be attacked: the replacement
  assertion resolved `_baselinedAtEntry` against §7, which is a ROTATING TEN-ENTRY WINDOW, so it tests
  "has not rotated out" and not "exists" — and the `_README` policy this file enforces GUARANTEES the
  baseline sits still post-freeze, so the gate would go red for obeying the freeze.** Now
  `baselineEntryIssues` in `frozen-surface.mjs`, checked against what does not rot, plus the cross-field
  date check that would have caught Q15 itself; revert-verified (`76 is not in §7`). **APPROVED — and it
  is `contract-touching`.** ⇒ **Re-reviewed by Entry 85** (Zayd, 2026-08-06), since Entry 84's own fix had
  never been read by a second party. Item 1 re-executed both halves (15/15 either way; membership
  restored ⇒ RED). ⚠⚠ **ONE FURTHER DEFECT FIXED: Entry 84's cross-field date check is sound, but the
  writer fed it TWO SOURCES** — the entry from the §7 parse, the date from `new Date()` — **so any
  rebaseline outside the entry's own calendar day wrote a baseline its own gate rejects** (a session
  crossing UTC midnight; Amer's `+0100` box before 01:00). Proven by running the real generator in
  `state-risk-e2e`; fixed by stamping the entry's date. **723 green, exit 0. MERGED on owner authority.**

---

## §8 — Generated

<!-- BEGIN GENERATED — written by `pnpm state`. Never hand-edit. -->

| | |
| --- | --- |
| **newest entry** | **90 (Zayd, 2026-08-08)** |
| branch · tip · tree | `zayd/2026-08-08-e90-d66-lazy-build` · `8c1aa79` · dirty |
| open PRs | #13 amer/2026-08-07-move-tool-corner-drag |
| suite | **780 green** · 89 files · 241 suites |
| protocol | 22 live ops · 2 reserved (of 24 declared) |
| shipped source | 6 `BimObjectType`s in `@bunyan/types` · 40 command ids in `commands.ts` · 1 `FormatCodec` |
| schema | `SCENE_SCHEMA_VERSION` 2 |
| **frozen surface** | **RISK: additive** — unchanged vs baseline |
| diff vs origin/main | 3 files changed, 209 insertions(+), 168 deletions(-) (3 files) |
| docs budget | current_state 76.4/96.0 KB · §7 30.6/32.0 KB · abstracts 6/10 · bodies 34 |

_Generated 2026-08-08 by `pnpm state`._

<!-- END GENERATED -->
