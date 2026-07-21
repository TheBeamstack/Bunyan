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
  **do compress it**: **Entries 1–32 are archived as one-liners in §7** (their durable lessons were
  promoted into §1–§4, which is where a fresh agent actually reads them); **33–39 are kept fuller**
  because they are the live step-0 work in progress. Full narratives live in git history.
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
*What ships first.* · **4.** `v1.0.0_imp_plan.md` — the phases, exit criteria, and **THE FREEZE GATE**
(the authoritative pre-freeze checklist at the head of P5) + **"NEXT AGENT — START HERE."**

**5. `Miqdar_v1.0.0_spec.md`** (+ `Miqdar_normative_register.md`) — **the second product**, and **NOT
optional reading before a contract freeze** (§4g). ⚠ **It lives here for exactly one reason: Bunyan's
contract freezes must not foreclose it.** **P5 has a gate pointing at its §3.4.** It is **not** a Bunyan
work item — Miqdar starts only after **Bunyan v1.0.0** ships.

**Design docs** (the design-first record for step 0): `P5_step0b_design.md` (associativity/constraints),
`P5_step0e_design.md` (CRUD + guard), `P5_step0g_design.md` (reserve-the-shapes + Space extent),
**`P5_step0d_design.md` (the sketch solver — ✅ BUILT + green, Entry 40).** Reviews:
`review_P3.md`, `review_P4.md`, **`review_P5.md` (the pre-freeze review, Entry 43).** `P3_correction_plan.md` is fully executed.

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

**Phases P1–P3 CLOSED; the kernel protocol is FROZEN (18→now 19 live ops + 5 reserved).** P4 + P4.5
(the interaction model) and P5 (types) are the open work. **THE PROJECT IS IN THE PRE-FREEZE WINDOW:**
`SubShapeRef` / `BimObjectType` / `Command` / `scene.json` / `ParamSchema` / `UndoableEdit` are
**release-candidate** and freeze at **P5 step 6**. That freeze is the one irreversible act — after it a
wrong contract costs an amendment across three products (`.bnn` in the field, Miqdar, Planitor).

**P5 STEP 0 (the D50 constraint model — the largest scope ruling this project made) is COMPLETE.** Done and
green: **0a** typed dependency graph · **0b** associativity/hosting (datums, base/top constraints,
grid-hosting) · **0e/0f** the missing CRUD + the generalised no-silent-re-identify guard · **0g** the
reserve-the-shapes pass + the verb half · **0d** the sketch constraint solver (real planegcs, D26
revert-verified — Entry 40) · **the room-bounding solver** (D55 — Entry 41) · **0c wall-to-wall joins**
(auto-miter, anti-fuse gate green, the real D52 Wall in `@bunyan/types` — Entry 42). **Remaining:** the
**types (steps 4–5)** — freeze `BimObjectType` against a composite styled Wall (step 5/Opening resolves
ⓙ) — the gates ⑧/⑨, and the FREEZE (step 6). See `v1.0.0_imp_plan.md` FREEZE GATE + Entry 42.

> **⚠⚠ THE P4 REVIEW HEADLINE (Entry 24) — STILL THE FRAME:** there was **no interaction model in any
> contract document** — only *"button/drag → Command"*, which is how an action *reaches* the model, not
> how a human *authors a building.* `snap`/`inference`/`preview`/`hover`/`gizmo`/`tool state` appear
> nowhere. **`argsSchema` is a machine-readable contract for an AGENT; the app used it as a UI spec for a
> HUMAN.** ⇒ new phase **P4.5** (the tool state machine, snapping, preview, numeric entry, the
> spatial-query seam) lands **before** the freeze. And the second sweep (Entry 24b) found the deeper one:
> **Bunyan had exactly ONE associative relationship (`opening → host face`); everything else was
> absolute** — a Level could not be moved, a Grid hosted nothing, no command moved an element. **D50 moved
> the full constraint model into v1.0.0.**

### §1a — THE SCALE NUMBERS (D48: the interactive target is 10,000+ elements, BINDING)

Measured against the real OCCT WASM (`review_P4.md` §4; a 5-storey building). **Read the columns:** the
kernel **rebuild is FLAT** (always one wall); the **redraw grows LINEARLY with the whole model** because
`App.tsx` re-tessellates every part of every element on every edit (~2.8 ms/solid).

```
                              rebuild 1 wall   REDRAW ALL (as built)   redraw only changed wall
  195 elements / 310 solids        100 ms              865 ms                    12.0 ms
```

**Extrapolated to ~16,000 solids:** one edit ~45 s · cold load ~6.3 min · draw calls ~16,000 (10–20× a
60 fps budget). ✅ **The one contract-bearing axis — WASM heap — is MEASURED and FITS (Entry 29):**
~16.2 KB/live-solid, dead-linear ⇒ ~0.3 GB at target, inside a tab. **⇒ heap-eviction / lazy-build stays
a v1.0.x OPTION, not a v1.0.0 requirement; it does not force a pre-freeze contract change.** The other
three axes (draw calls, cold load, edit latency) are **all in the renderer — Amer's, in the browser.**

> **⚠⚠ THE STRATEGIC FINDING:** all three kernel performance levers (D29 BREP cache, `instantiate`,
> multithreading) attack the **kernel rebuild**. **NOT ONE touches the redraw**, which is the dominant
> interactive cost — and it was invisible because **every measurement this project ever took was taken
> BELOW the renderer.** (Amer's incremental-redraw work in Entries 26–27 addresses it browser-side.)

> **⚠ CORRECTION (Entry 43, `review_P5.md` finding #3): "the other three axes are ALL in the renderer" is
> no longer true.** 0c joins (Entry 42) added a NEW cost to the **rebuild path** (Zayd's layer): the
> wall-join resolver is **O(N²)** in element count — `partnersAt`/`wallsJoinedTo` scan every element, and
> `resolveJoins` runs per element in the build (`build.ts:404`), even when nothing joins. **Measured** (pure
> TS, no kernel): ~97 µs/wall at 40 walls → 2113 µs/wall at 1984 walls (**4.2 s of join scan alone at
> ~2000 walls**; quadratic). Negligible at a house's few-hundred walls; ~100 s at the 10k BINDING target,
> on top of the kernel. **NOT a freeze item** — fixable anytime with an endpoint spatial hash, no contract
> change — so it is a **v1.0.x perf item**, but the D48 "scale is settled / it's all Amer's" narrative must
> account for it. ⚠ **Re-run the D29 5-storey measurement WITH joins in the path** — the headline number
> above predates them.

### §1b — THE METHOD THAT HAS FOUND EVERY GAP — it is not reading; it is USING the API

**Keep modelling real buildings against the real kernel, and measure.** It has found **eleven** gaps; no
other method ever has. A written finding describes only the shape someone actually cut.

| Gap | Found by |
|---|---|
| `at` (placement) | a boolean could otherwise only bite a *corner* off a wall |
| the split-face naming bug | cutting a **groove** across a wall |
| `extrude` / `chamfer` | trying to model a **floor plate** (a Slab is not a rectangle) |
| the SYMMETRIC-TIE hole (D28) | cutting a duct through a **round column** — five sessions missed it; every boolean tested had cut a BOX |
| our `bounds` LOOSE on curves | gating that column vs the native-OCCT oracle (`Add` bounds a spline by its control polygon) |
| the modelling layer (D30–D33) | reading the product **against its own ambition** |
| the ecosystem joint (D34–D38) | reading the product **against its neighbours** (Planitor, BIMsync) |
| the STYLE-EDIT PERF CLIFF (§4j) | building a real 195-element building and **timing** it |
| the six P3 defects (Entry 19) | driving the document API at its **FAILURE** boundaries — every happy path was already green |
| the `BuildContext` HEAP-LEAK (Entry 21) | writing the first fixture that ran **two** kernel ops per part |
| the VOID INWARD-DIRECTION gap (Entry 28) | cutting a duct through a **beam** (a void had only ever been cut on a wall's `y-min` face) |
| the CURVED-FACE HOSTING gap (Entry 30) | a duct through a **round column** — every void before had been on a planar axis-aligned face |

**⇒ Keep cutting shapes nobody has cut** — now aimed at the shapes D50 introduces (grid-hosted columns,
base/top walls, joins, a Space). The kernel-level gaps are nearly mined out; the next foreclosure is
likelier in a **type's contract** than in the kernel.

**⚠ AND THE SECOND METHOD (Entry 19):** a green test proves only what it ASSERTS — and two of P3's
asserted something weaker than their own title (the rule-4 test failed in the *schema*, before the kernel
ran; the autosave test never opened a second session). ⇒ **For every exit criterion, read the test that
discharges it and ask what it would take for that test to pass while the criterion is FALSE.** And the
standing rule since Entry 21: **a fix without a test that fails in its absence is an assertion** —
revert every fix and watch its test fail.

**⚠ THE THIRD (Entry 21):** when a decision is framed as a trade-off, check what it costs the
**INVARIANT**, not just the schedule. "Ship the BREP cache" read as a perf call; it dragged in a
persisted name→shape index — the "token map" D1 forbids. The perf question was an afternoon; the identity
question it hid could have repealed D1.

### §1c — SEVEN THINGS A FRESH AGENT MUST NOT REDISCOVER THE HARD WAY

1. **`opencascade.js` CANNOT be linked on this box — and we do not use it.** Its `-flto` whole-program
   link OOMs at a 2 GB cap even for a 6-symbol build (Entry 3). Do not retry it. We build **upstream OCCT
   7.9.3, LTO off** — recipe in `tools/kernel-build/`; it builds here.
2. **`/tmp` is a tmpfs — it costs RAM, not disk.** Before invoking §6a to pause another project's
   containers, run `du -sh /tmp` — our own scratchpads are usually the hog.
3. **You do NOT need a 2.5 h rebuild to change the kernel's C++.** OCCT's static libs are prebuilt at
   `~/occt-wasm-spike/install`. Changing `src/kernel.cpp` is a **~60 s single-file compile + link** (§6).
   Only an *OCCT version bump* costs 2.5 h.
4. **OCCT's `Left/Right/Front/Back` do NOT mean what they sound like.** `BackFace()`=x-min,
   `FrontFace()`=x-max, `LeftFace()`=y-min, `RightFace()`=y-max. Guessing mislabels four faces and
   nothing fails (geometry perfect, names wrong). `occt-kernel.test.ts` re-measures it.
5. **The naming literature is WRONG about OCCT 7.9.3, and we MEASURED it (D24).** Boolean history is
   complete (zero orphans); the weak spot is the fillet; and `Modified()` reports only *splits*, so an
   untouched face appears in **no** history list — that silence means *"unchanged"*, not *"unknown"*.
   Re-run the probe (`tools/kernel-build/probe.cpp`, ~60 s) before trusting naming on a new shape class.
6. **⚠⚠ THE PROBE ONLY MEASURES THE SHAPES YOU THINK TO CUT — this has cost us repeatedly.** Even a
   measured, written-down finding describes only the shape someone actually cut. Before trusting naming on
   a shape class nobody has cut, **cut it.**
7. **⚠⚠ A PHASE'S EXIT CRITERIA ARE A SPECIFICATION, NOT A SUMMARY OF WHAT GOT DONE.** `extrude`/`chamfer`
   sat unbuilt in P2's step list while P2 was declared "complete" twice, because every test built walls
   out of boxes. **Read a phase's own step list against the code before declaring it done.**

---

## §2 — Contract status (get this wrong and you break the build model)

The **split contract-freeze** (D13) is the rule that lets Amer and Zayd work in parallel: *adding* an op
is additive and permitted; *changing an existing op's envelope* needs Architect sign-off.

| Contract | Status | Freezes |
|---|---|---|
| **Kernel message protocol** (`@bunyan/protocol`) | **✅ FROZEN, v1 (Entry 21)** — **19 live ops + 5 RESERVED** + `CACHE_STALE`. ⚠ `faceFrame` is the FIRST post-freeze op (Entry 30) — a face's frame from the B-Rep surface, explicitly permitted (D13). Reserved: `sectionCut` · `importIfc` (P6) · `instantiate` (the ~21 s style-edit answer, §4j) · `exportBrep`+`importBrep` (the D29 cache — RULED SHIP, §4j). | **✅ FROZEN.** |
| **`SubShapeRef`** | RC — exercised by the real kernel + the document model (a window survives save→load→rebuild + a 30° rotation). ⚠ `kind:'vertex'` **reserved** (D54a, 0g). | **P5** |
| **`BimObjectType`** | **✅ WRITTEN (Entry 18), corrected (21), extended.** Carries `parameterSchema`, `styleSchema`, `defaultClassification`, `defaultDiscipline` (D45), `buildGeometry→Part[]` (D30), `buildVoid`, `migrate`, and (0g) `ifcMapping?`/`migrateStyle?`. ⚠⚠ `BuildContext.discard(handle)` — a Type running two ops per part MUST declare its intermediate or it leaks; **declare BEFORE the risky op.** ⚠⚠ `VoidBuildContext.hostFace.inward` (Entry 28) + `.frame` (Entry 30, from `faceFrame`) — a hosted void projects along the host's honest inward normal (correct for curved faces too). `BuildContext` gained `grid()`/base+top datums (0b). ✅ **ⓙ RESOLVED (Entry 44): a hosted type provides BOTH `buildVoid` AND the new additive `buildLeaf?(VoidBuildContext)` — a door builds a leaf+frame, not just a hole; the real `core.opening` ships it. PROVEN no new `VoidBuildContext`/`BuiltPart`/`hostFace` field (a `tsc` TS2322 proof); `buildLeaf`, not `buildGeometry`, because a door is a solid only when hosted.** | **P5** (freeze against the composite Wall + the real Opening — both now exist) |
| **`Command`** | **✅ WRITTEN (Entry 18)** — `argsSchema` + `execute` returns its `UndoableEdit`. **The agent API** (§4f). CRUD verbs carry the D51 refuse-or-retarget args (`acknowledge`/`retargetMap`, 0e/0f); `createElement` carries the six reserved-metadata args + `core.setElementMetadata` (0g.2). **0d BUILT `core.createSketchConstraint`/`core.deleteSketchConstraint`** (Entry 40; datum verbs and sketch verbs each refuse the other's ids). **0c BUILT `core.setJoin`/`core.clearJoin`** (Entry 42 — override verbs; joins are AUTOMATIC on proximity, these only deviate a corner to butt/mitre/none). | **P5** (with its `argsSchema`) |
| **`ElementStyle`/`Part`/`Material`/`Section`/spatial tree/`Constraint`/`scene.json`** | **✅ WRITTEN.** `scene.json` = `packages/document/src/scene.ts`. **0b:** `scene.constraints` (discriminated-union `Constraint`, `SCENE_SCHEMA_VERSION` 1→2). **0d (Entry 40):** `SketchConstraint` is the union's SECOND member; the `Sketch` data model lives in `element.params` (Q1=A — no schema bump). **0c (Entry 42):** `JoinConstraint` is the union's THIRD member (`{element, other, kind:'join', resolution:'butt'|'mitre'|'none'}`) — an OVERRIDE of the auto-miter default; no schema bump. **0g:** reserved fields on `Element` (`phaseCreated?`/`phaseDemolished?`/`parentElementId?`/`properties?`/`classifications?`/`mark?`), `SpatialContainer`/`Grid` (IFC bags + Space extent inputs + `Grid.geometry?`), `Scene.georeference?`/`roomSeparators`, `ParamField.relevantWhen?`/`formula?`. | **P5** |
| **Agent surface** (`window.bunyan`) | **✅ WRITTEN** — `createAgentSurface`, versioned separately (`agentApi: 1`, D22); does **not** inherit the P5 freeze. | evolves on its own clock |
| **`.bnn`** | **✅ WRITTEN + FINISHED (Entry 21).** Zip of `manifest.json` + `scene.json` + `history.json` (the JOURNAL — append-only `seq`; an undo appends a REVERSAL) + optional `thumbnail.png`. Ids are prefixed ULIDs (D44); unknown/future-typed elements round-trip VERBATIM (D43). `geometry-cache.brep` (D29) is purely additive — breaks no saved file when it lands. | **P5** |

---

## §3 — What exists, and how it was verified

```
packages/
  protocol/       @bunyan/protocol      flat versioned message contract (zero deps). 19 ops + 5 reserved.
  kernel-core/    @bunyan/kernel-core   KernelHost (dispatch + failure marshalling) + ShapeRegistry
  kernel-mock/    @bunyan/kernel-mock   protocol-conformant fake kernel + Worker entry (NO booleans — says so
                                          in `capabilities` rather than faking one; answers faceFrame in closed form)
  kernel-occt/    @bunyan/kernel-occt   ★ THE REAL KERNEL — OCCT 7.9.3 in WASM + Worker entry
                    src/kernel.ts         adapter: C++ STRUCTURE -> Bunyan IDENTITIES
                    src/naming.ts       ★ THE RESOLVER (D1/D24): 4 relations, no geometry, ever
                    wasm/bunyan-kernel.*  the COMMITTED artifact (14.59 MB / 4.19 MB gzip, -O3) + .d.ts
  kernel-client/  @bunyan/kernel-client KernelClient + WorkerTransport / InProcessTransport
  sketch-solver/  ★ @bunyan/sketch-solver  THE 2D SKETCH SOLVER (0d) — planegcs (FreeCAD GCS/WASM) behind the
                    src/planegcs-solver.ts  SketchSolver seam. THE ONLY package that imports @salusoft89/planegcs;
                                             injected at construction (like the kernel client). Lines + 7 point/line
                                             constraints; arc/tangent frozen in the CONTRACT but v1.0.x in the impl.
  types/        ★ @bunyan/types           THE SHIPPED MVP BimObjectTypes (P5) — the REAL registered elements, distinct
                    src/wall.ts             from the tests/ exercise fixtures. So far: the D52 baseline, join-aware Wall
                                             (`core.wall`, 0c/step 3). Opening/Slab/etc. join it in steps 4–5. D19: the
                                             document engine loads these, never depends on them.
  document/     ★ @bunyan/document      THE PARAMETRIC TRUTH LAYER (Entry 18; corrected 21; D50 step-0 33–38)
                    entities.ts    Element/Part/ElementStyle/Material/Section/spatial tree/Grid/Constraint/
                                     RoomSeparator (Part carries `discipline`, D45; Classification={ifcClass,loadBearing})
                    scene.ts       ★ THIS OBJECT *IS* scene.json. + SceneChange (the undo delta) + constraints resolver
                    schema.ts      ParamSchema — ONE language, THREE consumers: property panel, ribbon, AGENT TOOLS (D21)
                    registries.ts  the SIX registries + the GENERATED capability projection (the 7th, naming, is the KERNEL's)
                    types.ts       BimObjectType (+BuildContext.discard, grid/datum accessors, hostFace.inward/frame)
                    ulid.ts      ★ D44 — the PEI is a prefixed, monotonic ULID. No counter, ever.
                    revision.ts  ★ ModelRevision + issued_at_seq. Minted ONLY by the command.
                    commands.ts    the Command layer — THE agent API (D19). core commands + issueRevision + CRUD + guard
                    dependency.ts  ★ 0a — the TYPED dependency graph (exhaustive over SceneCollection; container edge closed)
                    build.ts       ★ base parts -> resolve hostRef -> cut EVERY layer -> PLACE LAST. Broken refs. UNBUILDABLE (D43)
                    document.ts    ★ DocumentContext — THE ONLY DOOR (D19). scene + heap + undo + JOURNAL + revision.
                                     STAGED, all-or-nothing rebuild + universal dryRun (D42)
                    undo.ts        UndoableEdit (STATE DELTAS, never replay) + THE JOURNAL (D40)
                    agent.ts       createAgentSurface() — agentApi:1, thin shim, no browser
                    bnn.ts         the .bnn codec + migration + StorageAdapter + Autosave
                    geometry.ts    ★ GeometryGateway — the narrow seam that makes D19 STRUCTURAL (excludes `tessellate`)
                    sketch.ts    ★ 0d — the SketchSolver SEAM + solver-neutral IR + MockSketchSolver + readSketch +
                                     solveSketch (the D26 guard). @bunyan/document stays pure (no planegcs dep).
                    joins.ts     ★ 0c — the WALL-JOIN resolver (Entry 42): auto-miter on proximity + butt near-face,
                                     all plane geometry from the {start,end} params (recipe = truth, D1-safe). Feeds
                                     BuildContext.joins (cap-lines). The bidirectional wall↔wall dependency edge lives here.
apps/web/        ★ Amer's Vite/React shell — bootstrap (the one KernelClient holder), WebGL2 three.js viewport,
                    generated ribbon + property panel, incremental redraw, sub-shape picking, failure-state panels
tests/            268 tests (all document tests run against the REAL OCCT kernel, never the mock) + goldens + harness
tools/kernel-build/ the OCCT->WASM recipe + src/probe.cpp (THE NAMING PROBE, ~60 s)
tools/oracle/     Python (uv): offline golden seeding — analytic + native-OCCT cross-check (also a MEASURING instrument)
```

**The architectural decision that shapes everything: the kernel is transport-agnostic.**
`KernelHost.handle(request) → response` is a pure function knowing nothing about Workers/`postMessage`/DOM.
⇒ the whole seam is testable headlessly in Node (why the suite runs on a browserless box), the headless
server-side north-star is a `Transport` swap, and mock and real kernel are the same interface.

**⚠ FOUR SILENT OCCT TRAPS, all caught by the harness (plus §1c trap 4) — all OUR misuse, never an OCCT
defect:** (1) `BRepBndLib::Add` is TOLERANT not tight ⇒ `box.SetGap(0.0)`. (2) `LinearProperties` on a
solid sums each edge once per adjoining face (double-counts). (3) `Add` bounds a curve by its CONTROL
POLYGON ⇒ use `AddOptimal`. (4) a full 360° revolve has NO caps and cap accessors don't return null; a
segment perpendicular to the axis reports NO history while its face sits in the result. ⚠ §4j breaks the
streak: the boolean's cost is **real OCCT work**, not our misuse.

### Verified — the kernel (Zayd, dev box, headless)

Protocol v1 (envelope, 15 typed failure codes, ref encode/decode/compare, provenance channel) · typed
failures never throw (even on a non-Error throw — OCCT throws bare ints) · **persistent naming (D1) on
real topology** (faces from semantic accessors, edges as the canonical pair of generating faces,
canonical re-sort before IDs — D8; survives two windows + a resize + a fillet on a boolean edge) · **mock
and real emit BYTE-IDENTICAL refs** (the swap is one line for Amer) · `measure` exact (`BRepGProp`, not
the mesh) + optional `ref` + derived `capabilities` + `INVALID_RESULT` gate · **no WASM heap leak**
(asserted vs `wasmLiveHandles()`, the WASM side's own count) · one JS↔WASM crossing per op · **D28 the
bounded positional key** (a duct cuts clean through a round column; orders two structurally-tied
sub-shapes by mm-rounded centroid, never identifies; runs in the element's OWN build frame so moving a
column can't re-rank; a grid collision is refused) · **query ops** `bounds`/`distance`/`classifyPoint`
+ `faceFrame` (read the B-Rep, never the mesh; return mm + identities).

### Verified — the document model (Zayd, headless, ALL vs REAL OCCT)

D30 an element IS its ordered PARTS ("how much plaster on this wall?" → 135 kg from the B-Rep + density)
· D31 a style edit rebuilds every instance (in the B-Rep) · an opening cuts EVERY layer · a window
through all three layers of a wall ROTATED 30° (volumes identical, host token byte-identical — built in
its own frame, placed last, D25) · D39 cascade delete in ONE undoable edit (warn-first = `dryRun`, D42;
`planDelete()` DELETED) · **the broken-reference state** (marked, visible, never auto-healed; host still
builds; document still loads + edits; retarget is itself an `UndoableEdit`) · reject+keep-last-good
(all-or-nothing, D42) · save→reload in a fresh session → identical parametric state AND geometry from
`scene.json` alone · migration (forward-only) · autosave recovers a crashed session (an ordinary `.bnn`)
· **D19 is a MACHINE check** (`packages/document` does not even depend on `@bunyan/kernel-client`).
**D50 step 0 (Entries 33–38):** the model is **associative** (move a Level/Grid → the building follows),
**editable** (the full CRUD), and **guarded** (no command silently re-identifies, D51 generalised).
**0d (Entry 40):** a 2D profile is **solved** (real planegcs, headless) and extruded — a rough rectangle +
constraints → an exact solid; `lateral.k` = authored segment k across a dimensional re-solve (D26,
revert-verified); an over-constrained sketch refuses at build time (D42), under-constrained solves (`dof>0`).

### NOT verified / NOT built (do not assume otherwise)

- **No `geometry-cache.brep`** — D29 RULED SHIP, ops reserved, **bodies NOT written** (§4j; read it first
  — it is an IDENTITY task, not a serializer task). Deprioritised behind step-0 work.
- **0d the sketch constraint solver — ✅ BUILT + GREEN (Entry 40).** **The room-bounding solver** (D55) —
  **designed/ruled, NOT built** (§5). v1.0.0, its own design doc next.
- **No browser storage** (FSA/OPFS/IndexedDB behind `StorageAdapter`, a `MemoryStore` keeps the seam
  tested) — **Amer's** (cannot be verified headless). ⚠ `list()` MUST return keys already in the store.
- No sweep-along-path, no loft (out of scope). **No 2D views, no IFC import** (P6; both ops reserved).
- No Clean Delta exporter / **no Clean Delta JSON Schema yet** (⑥). ⚠ **NOT blocked (D57):** Bunyan
  designs it on its own terms for **Planitor + Miqdar** (on-box consumers); BIMsync is unbuilt and adapts.
  Headless-closable design work, must be right before the `UndoableEdit`/`SceneChange`/journal freeze.
- No `LICENSE`/CLA/OCCT attribution yet (§4e; must land before public). No service worker/PWA/Cloudflare
  deploy (Amer's).
- ~~0c wall-to-wall joins~~ — **✅ BUILT + GREEN (Entry 42).** Auto-miter on proximity + butt/none overrides,
  the real D52 Wall in `@bunyan/types`, anti-fuse gate + associativity edge revert-verified.

---

## §4 — Decisions

### 4a — The decision index (D1–D56)

| # | Ruling (one line) |
|---|---|
| D1 | **Persistent naming**: identity is a derivation path from the op DAG, never a geometric index. The #1 risk. |
| D3 | IFC **import** only in v1.0.0; export v1.0.x. |
| D8 | Canonical re-sort before identities are assigned (still required when MT lands, v1.0.x). |
| D9 | **We trust OCCT; we verify our own code** (§4b). |
| D10 | Typed-failure contract: the kernel never throws; a failed op yields no edit. |
| D11 | Offline-first; the service worker caches the kernel once. |
| D12 | Anchoring/validation of a hosted opening (a `fixed` opening off its host contributes no hole — a P5 item). |
| D13 | **The freeze's meaning**: *adding* an op is additive; *changing* an op's envelope needs sign-off. |
| D14 | The WASM module *is* the kernel — JS never touches OCCT; `opencascade.js` rejected. |
| D15 | **Bunyan is open source: AGPL-3.0 + commercial** (§4e). |
| D16 | IFC import via **IfcOpenShell** → exact B-Rep solids. `web-ifc` (mesh-only) rejected. |
| D19–D23 | **Bunyan is agent-native** (§4f). |
| D24 | Measured OCCT history (boolean complete; fillet weak; silence = unchanged). |
| D25 | **`transform` mints NO identities** — a rigid motion is a topological isomorphism. Load-bearing. |
| D26 | `extrude`/`revolve` name `lateral.k` after the **authored** segment; **never permute the array** (re-targets every ref). |
| D27 | `revolve` — GenericSolid's other half. |
| D28 | **The bounded positional key** (§3). |
| D29 | **✅ RULED: THE BREP CACHE SHIPS.** An IDENTITY task — bind by CANONICAL ORDER, VERIFY a fingerprint, refuse with `CACHE_STALE`. Ops reserved; bodies NOT written (§4j). |
| D30–D33 | **The modelling layer** (§4h): element owns ordered PARTS · ElementStyle · LinearMember+Grid · Material/Section are REGISTRIES. |
| D34–D38 | **The ecosystem** (§4i): Bunyan is a third producer of the Clean Delta · spatial tree · loadBearing · no backend · `.bnn`. |
| D39 | Cascade delete: deleting a wall deletes its windows in ONE undoable edit; warn-first is `dryRun`. |
| D40 | **The change feed is an APPEND-ONLY JOURNAL** (`seq`/`issued_at_seq`; undo appends a REVERSAL). Delta = read, not inferred. |
| D41 | **`core.issueRevision` is a Command.** |
| D42 | Rule 4 is ALL-OR-NOTHING + a universal `dryRun`; `planDelete()` DELETED. |
| D43 | An unknown OR FUTURE type: the document OPENS, the element is `failed`+visible+PRESERVED VERBATIM through save. |
| D44 | The PEI is a **PREFIXED ULID** (`wall-01J8Z3K7Q2`). No allocator, id-reuse impossible by construction. |
| D45 | **`discipline` lives on the PART**, not the element. Classification={ifcClass,loadBearing}. An unmeasurable quantity is omitted, never zeroed. |
| D46 | One physical thing = one element, one PEI. Superposition PROVISIONAL; the MEP-vs-structure clash question is OPEN and named. |
| D47 | **The tool/interaction layer is a first-class layer, and it was missing.** A ribbon button activates a TOOL, not a form over `argsSchema`. New phase P4.5, before the freeze. |
| D48 | **The interactive target is 10,000+ elements. BINDING.** The WASM-heap sub-question is CLOSED (Entry 29: it fits). |
| D49 | 2D documentation stays v1.0.x, but its anchoring contracts are RESERVED pre-freeze (P5 step 6b). |
| D50 | **✅✅ THE FULL CONSTRAINT MODEL IS IN v1.0.0** — the largest scope ruling. Typed dependency graph + hosting (Level/Grid as active datums) + base/top constraints + wall joins + a SKETCH SOLVER + the missing CRUD. ⚠⚠ **THE ANTI-FUSE RULE STILL BINDS: a join is display/quantities cleanup, NEVER a fuse. A constraint is not a boolean.** |
| D51 | **A command may never silently re-identify.** `updateStyle` must REFUSE an orphaning layer rename (a layer name is identity-bearing — inside the `SubShapeRef` token) unless acknowledged or given a retarget map. Generalised to every reference (0f). |
| D52 | **A WALL IS A BASELINE `{start,end}`; length + height are DERIVED** (params: `start`,`end`,`baseLevel`,`topLevel`). The only parameterisation on which joins + grid-hosting are expressible. |
| D53 | **Constraints live in a first-class `scene.json` `constraints` collection**, orthogonal to `params`. `ParamSchema` stays a value schema. |
| D54 | Reserve three optional shapes (a/b/c): `SubShapeRef kind:'vertex'` · `Element.phase` · `ParamField.relevantWhen`. |
| D55 | **Space extent = Option B (room-bounding).** Boundary DERIVED from bounding walls (+ separators), never stored. **The room-bounding solver ships in v1.0.0.** |
| D56 | The pre-freeze reservation set (0g): phasing = TWO datums; `ifcMapping`/`migrateStyle`/`georeference`/`formula`/`parentElementId` + the Revit-parity sweep (`properties`/`classifications`/`mark`/`Grid.geometry`). |
| D57 | **The Clean Delta is designed on BUNYAN's terms; BIMsync is UNBUILT and adapts (owner, 2026-07-20).** ⑥ was mis-filed as an external blocker on an off-box BIMsync spec. BIMsync is built from scratch *after* Bunyan v1.0.0; its spec conforms to Bunyan. ⇒ Design the change-feed payload for **Planitor + Miqdar** (the on-box, known consumers); never wait on or infer from BIMsync. ⑥ is headless-closable design work, not an escalation. |

**⚠ D40–D46 are ALL BUILT (Entry 21), each with a test that fails if the fix is reverted. D50 STEP 0 IS
NOW FULLY BUILT — 0a/0b/0e/0f/0g (Entries 33–38), 0d (Entry 40), room-bounding (Entry 41), 0c (Entry 42).**

### 4b — Verification scope: WE TRUST OCCT; WE VERIFY OUR OWN CODE (D9)

Validating OpenCascade is out of scope. The harness catches **our** bugs via: **(1) the reference-build
oracle** (committed values from a native OCCT build — `cadquery-ocp`, seeded offline; same kernel,
different binding/build/path ⇒ a disagreement means *our* code is wrong; also a MEASURING instrument —
§4j used it to prove the boolean's cost is real OCCT work). **(2) closed-form sanity checks** (guard our
own measurement code — it earned this on the `LinearProperties` double-count). **(3) regression
snapshots** (drift). *(Toolchain: `cadquery-ocp`, not `pythonocc-core`; needs `libgl1`.)*

### 4e–4i — THE FIVE BIG RULINGS. **Full text: `V1.0.0_spec.md` §14 + `core_logic.md`.** The one thing you must not get wrong:

- **4e — OPEN SOURCE, AGPL-3.0 + commercial (D15).** The moat was never the client code, it is hosted
  collaboration. ⚠ The LGPL side-module task is CANCELLED (public source discharges relink; the static
  link STANDS). ⚠⚠ **The CLA is a hard prerequisite before the first external PR** (a merged PR without
  one can never be commercially licensed, and murkies a closed Miqdar). CLA, not DCO.
- **4f — AGENT-NATIVE (D19–D23).** One command layer; humans and agents both act through it. `argsSchema`
  ⇒ the agent's tool list is **generated, never maintained**. `window.bunyan` ships with the app (zero
  install); MCP is v1.0.x. ⚠ **TWO LAYERS, ONE IS THE AGENT'S:** kernel ops (`makeBox`) froze at P3,
  callable by `DocumentContext` alone; document commands (`createElement`) freeze at P5, callable by
  everyone. *The kernel is not an API surface; it is an implementation of one.*
- **4g — MIQDAR, a second product (M1–M13).** Bunyan models; Miqdar analyses & designs; **starts only
  after Bunyan v1.0.0 ships. M13: Miqdar is CLOSED SOURCE.** ⚠ **THE P5 FREEZE HAS A MIQDAR GATE** (plan
  P5 step 6a): before freezing, clear `Miqdar_v1.0.0_spec.md` §3.4 (does `BimObjectType`'s
  version+migration suffice for later optional analytical-hint fields? expected yes ⇒ reserve nothing).
  ⚠ Miqdar may never require of Bunyan: analysis code inside it, a second API, or coupled release
  schedules.
- **4h — THE MODELLING LAYER (D30–D33).** An element owns ordered PARTS (a wall is
  blockwork+insulation+plaster; "how much plaster?" was unanswerable at any price). ElementStyle = the
  shared named param set (change one type → update 400 walls). LinearMember (Beam+Column are ONE concept)
  + Grid. Material/Section are REGISTRIES not strings. ⚠⚠ **THE ANTI-FUSE RULE — NEVER FUSE TWO
  ELEMENTS.** Fusing two walls at a corner re-owns 4 of the first wall's 6 faces to the fuse ⇒ **every
  window hosted on it breaks the moment a neighbour is joined, retroactively** (measured, Entry 12).
  Corner joins are a QUANTITIES/DISPLAY problem (D50's 0c — a constraint, never a boolean). All four were
  cheap because `nodeId` is an opaque string ⇒ a Part is just its own DAG node.
- **4i — THE ECOSYSTEM (D34–D38).** Bunyan authors → Miqdar engineers → Planitor builds, BIMsync the
  on-ramp for foreign models. Bunyan is a **third producer** of the existing Clean Delta Package (`.bnn`
  = the model, Clean Delta = the change feed, IFC = the door for outsiders — IFC can't be the internal
  transport: no recipe, no `SubShapeRef`, no stable id). ⚠ **saving is not issuing** (D34). ⚠⚠ **THE MOAT
  IS STRUCTURAL:** everyone's GlobalIds churn on revision, breaking every schedule binding; BIMsync is an
  entire platform built to *manufacture* the property Bunyan has by construction (a PEI + a
  confusing-change queue Planitor blocks on). For a Bunyan model that queue is EMPTY, ALWAYS. ⚠⚠ **BUT
  `BIMsync_cloude` IS NOT ON THIS BOX and its spec has not been read** — everything about BIMsync is
  inferred from `Planitor/v2.2_spec.md`. No BIMsync doc may be edited until its spec is here. Safe to act
  on: **do not build a Bunyan backend.**

⚠ **The payoff nobody saw (D30/D33):** Planitor reconstructs a steel column's weight through a fallback
ladder that hardcodes `density: 7850`; **Bunyan holds every input exactly and emits `basis: "exact"`, per
part, per material** — the estimate becomes a measurement, and a task binds to *the part it builds* (the
plasterer bills plaster). *(Built: `DocumentContext.quantities()`.)*

### 4j — THE OPEN ITEMS ON THE OWNER'S DESK

**(1) D39 cascade delete — ✅ RULED + BUILT** (§3).

**(2) D29 — THE BREP CACHE — ✅ RULED SHIP; bodies NOT written. READ BEFORE IMPLEMENTING.**
The measurement (5-storey building): **cold load 7.3 s (37.6 ms/element), 100% inside OCCT** (our
plumbing 0.2%); the boolean genuinely costs 11 ms native (35 ms in our WASM ≈ 3× native, exactly
LTO-off + single-threaded). ⚠⚠ **A `.brep` stores SHAPES, not their NAMES** — a cached load must
re-attach every `SubShapeRef`, which is the "token map" D1 forbids. **THE RULED DESIGN (keeps D1
intact):** bind by CANONICAL ORDER (D8, a rule derived from the shape, never a raw index) · emit a
`fingerprint` over each named sub-shape's measured geometry, recompute it on load, refuse with
`CACHE_STALE` on any disagreement · **a refusal costs a rebuild, never a wrong name** — the cache is a bet
the document is always free to abandon. The no-cache path stays PRIMARY forever (Miqdar has a solver, not
an OCCT kernel — it can't produce a cache even in principle). ⚠ **The hostile-BREP hardening test is a
REQUIRED deliverable** (a `.bnn` is a file a user can be SENT; the `.brep` is the one part fed as binary
to OCCT's deserializer).

**(3) Performance — ✅ RULED.** `instantiate` RESERVED (collapses a 400-wall style edit from 400 booleans
to 1 boolean + 400 cheap re-owns; the payload shape was the expensive thing to get wrong, so reserved
before the freeze). `-O3` ships (5% smaller) but **`-O3`/LTO buy NO SPEED — measured, answered, do not
re-run it** (our OCCT static libs are plain objects, not LTO bitcode, so LTO can't reach where the time
is). Multithreading (v1.0.x) is the lever that closes the 3× gap to native. ⚠ **These three levers all
attack the KERNEL REBUILD, not the renderer redraw** (§1a).

**(4) The P3 defects (Entry 19) — ✅ ALL SIX FIXED (Entry 21, revert-verified).** The Clean Delta could
not be computed from a `.bnn` (D40 fixed it) · ids were reused (D44 ULID) · reject+keep-last-good was
false for multi-element edits (D42 staged rebuild) · one unregistered type bricked the file (D43) ·
autosave recovered stale work (seeds from the store) · a dangling material gave `0 kg basis:exact`
(omitted now, D45). The spec's "token map" claim was DELETED (there was never any code).

**(5) Awareness:** the kernel is **4.19 MB gzip** — an owner call on download size is due (accept /
lazy-load / split). planegcs adds a **second ~150 KB gzip WASM** (0d — lazy-loadable behind the sketch
tool). Multithreading drags COOP/COEP + `SharedArrayBuffer` (v1.0.x).

---

## §5 — Next actions (in priority order)

> ## ✅✅ THE PRE-FREEZE GATE IS CLOSED (Entry 44) — ⓙ RESOLVED, ⑥ DESIGNED, #4/⑧/⑨ DISCHARGED. NEXT: THE OWNER-GATED FREEZE (step 6).
> Everything owed *before* the freeze is now closed and green (309 tests). **ⓙ** — a hosted type builds a leaf
> (`buildLeaf`, the real `core.opening` Door), no new frozen field, revert-verified · **⑥** — the Clean Delta
> designed against on-box Planitor v2.2 §4, needs no frozen change (`P5_step6_clean_delta_design.md`) · **#4**
> mid-span additivity confirmed · **⑧** Miqdar §3.4 reserve-nothing · **⑨** annotation anchoring survives resize.
> **⇒ The only thing left is the FREEZE itself — Architect signs off + tags the contracts frozen (step 6), and
> the commit. Both owner-gated. See Entry 44.**
>
> ## ✅✅ STEP 0 IS CLOSED — BOTH SOLVERS + 0c JOINS ARE BUILT + GREEN (0d E40, room-bounding E41, 0c E42).
> All of D50 step 0 is done: **0a–0g**, **0d (real planegcs, D26 revert-verified)**, the **room-bounding
> solver (D55, Entry 41)**, and now **0c wall-to-wall joins (Entry 42 — auto-miter, anti-fuse gate green,
> the real D52 Wall pulled forward into `@bunyan/types`).** ⚠⚠ THE ANTI-FUSE RULE HELD (a join reshapes only
> the cap; side faces keep their tokens, D26). **NEXT: the types (steps 4–5) — freeze `BimObjectType`
> against a composite styled Wall; step 5 (Opening) MUST resolve ⓙ — then the gates ⑧/⑨, then FREEZE.**

**For Zayd (kernel / document / headless) — the close-order:**

1. **✅ DONE — 0d THE SKETCH CONSTRAINT SOLVER** (Entry 40). Real `@salusoft89/planegcs` behind a
   `SketchSolver` seam (`@bunyan/document` stays pure; `MockSketchSolver` tests the seam; `PlanegcsSolver`
   in the new `@bunyan/sketch-solver` package). Sketch geometry on `params` (Q1=A, no `.bnn` bump);
   `SketchConstraint` a union member (Q2) via dedicated `create/deleteSketchConstraint`; the full named set
   (Q3). **D26 held + revert-verified**; over-constrained refuses at build time (D42). ⚠ `tangent`/arc are
   frozen in the CONTRACT but the solver impl is lines + the 7 point/line constraints — a swappable v1.0.x
   extension, no freeze risk. Feeds step 2 (2D sketching). Did NOT touch the frozen kernel protocol.
2. **✅ DONE — THE ROOM-BOUNDING SOLVER** (Space extent Option B, D55 — Entry 41). Designed
   (`P5_step1_room_bounding_design.md`), owner ruled Q1–Q5, built pure-TS document-layer 2D behind a
   `RoomSolver` seam (`packages/document/src/room.ts` + `DocumentContext.roomMetrics`). Inner-finish-face area
   + perimeter + prismatic volume, derived on demand (never stored/cached). **Freeze-Gate ⓞ resolved**
   (openings don't leak rooms). No frozen byte moved. **Estimate re-inverted: ~1 session, not 5–8.**
3. **✅ DONE — 0c — WALL-TO-WALL JOINS** (Entry 42). Auto-miter on proximity (owner Q3) + `core.setJoin`/
   `core.clearJoin` overrides (butt/mitre/none); the real D52 Wall pulled forward into `@bunyan/types`
   (`core.wall`). ⚠⚠ **THE ANTI-FUSE RULE HELD** — the wall builds as an extruded plan polygon in fixed
   segment order, a join reshapes only the CAP, side faces keep byte-identical `lateral.k` tokens (D26).
   The anti-fuse gate + the bidirectional join edge are revert-verified. Did NOT touch the frozen kernel
   protocol; `JoinConstraint` is the `Constraint` union's additive third member.
4. **⏭ START HERE — THE TYPES (steps 4–5).** Freeze `BimObjectType` against a COMPOSITE, STYLED wall (the
   real `@bunyan/types` Wall now exists — freeze validates against it + its Opening). ⚠⚠ **STEP 5
   (Opening) MUST RESOLVE ⓙ** — a hosted type providing BOTH `buildVoid` AND `buildGeometry` (a real
   door/window is a hole *plus* a leaf/frame); the build engine calls only `buildVoid` today (`build.ts`
   §2, verified `review_P5.md` #2). ⚠ **Prove the ⓙ fix needs NO new frozen field** (a leaf placed in the
   opening frame via the existing `VoidBuildContext.hostFace`); if it needs a new `VoidBuildContext`/
   `BuiltPart` field, that field is itself pre-freeze. Then the gates (⑧ Miqdar §3.4, ⑨ 2D-annotation
   anchoring), then **FREEZE (step 6).**
   - ⚠ **`review_P5.md` #4 — a cheap pre-freeze check:** confirm the frozen `JoinConstraint`
     (`{element, other, resolution}`) can carry a **mid-span / T-junction** join later — today both
     auto-join and `setJoin` require **endpoint-to-endpoint** corners (`wallsShareCorner`), so a partition
     butting a wall's mid-span (the commonest interior condition) is unreachable. Likely additive; **record
     a reservation or a proof it is additive** before step 6.
5. **⑥ THE CLEAN DELTA — DESIGN IT (D57), promoted from "blocked/lower-priority."** ⚠ **NOT an escalation
   any more:** Bunyan owns the change-feed payload; design it on its own terms for **Planitor + Miqdar**
   (on-box consumers), BIMsync adapts. Headless-closable; must be right before the journal freeze. Best done
   alongside the types (it freezes the same step).
6. **Still owed, lower priority:** the D29 cache bodies (§4j-2 — read first) · the join O(N²) endpoint index
   (`review_P5.md` #3 — a v1.0.x perf item, no contract change) · housekeeping (`LICENSE` AGPL-3.0, the CLA,
   the OCCT + planegcs attribution notices — none blocks work, all block going public).

**✅ CLOSED, DO NOT REDO:** the op set (`transform`/`extrude`/`chamfer`/`revolve`/`faceFrame`) ·
`measure(ref)` + derived `capabilities` + `INVALID_RESULT` · the positional key (D28) · the protocol
freeze (D13) · CI (all five steps pass here) · the document model + agent surface + `.bnn` + undo +
broken-ref state + cascade delete (Entry 18) · all six P3 defects + D40–D46 (Entry 21, revert-verified) ·
`-O3`/LTO (MEASURED — no speed; do not re-run) · the heap ceiling (Entry 29 — it fits) · D50 step
0a/0b/0e/0f/0g (Entries 33–38) · **0d the sketch constraint solver (Entry 40 — real planegcs, green)** ·
the **room-bounding solver (Entry 41)** · **0c wall-to-wall joins (Entry 42 — auto-miter, anti-fuse gate
green, real Wall in `@bunyan/types`). ⇒ ALL OF D50 STEP 0 IS CLOSED.**

**For Amer (browser hot path):** P4 steps done through Entry 27 (the gate now sees `apps/web`; incremental
redraw; sub-shape picking; the failure-state panels; the D19 equivalence test). ⚠ Build against
`@bunyan/document`, never the kernel (D19 — enforced by `d19-boundary.test.ts` + the package boundary;
the one allowed `KernelClient` holder is `apps/web/src/bootstrap.ts`). **An element is its PARTS (D30) —
tessellate each.** Remaining: **P4.5** (the interaction model — the tool state machine, snapping, preview,
numeric entry; do not start the wall tool before the baseline-Wall parameterisation is in — D52 rules
it) · browser storage (`StorageAdapter` over FSA/OPFS/IndexedDB; `list()` MUST return existing keys) ·
WebGPU + fallback, service worker/PWA, Cloudflare deploy · the typed-`SUPERSEDED` propagation (Zayd's
package, coordinate). ⚠ Key changes since Entry 18: `planDelete()` gone (use `dryRun`); `discipline` on
the part; ids are ULIDs (never parse/render them — use `element.name`); `mass` may be absent (render "—",
never "0 kg"); on save persist `saveBnn(scene, { journal: doc.changeFeed(), revision: doc.revision })` —
`doc.history()` there is the moat-losing bug.

---

## §6a — BOX DISCIPLINE (owner ruling, 2026-07-11 — binding)

**Full text: box-local `cross_projects_policy.md` §6/§6a.** The dev box is small (~3.7 GiB RAM + 2 GiB
swap) AND it is the production host for two live public sites — **an OOM here can take the owner's public
sites offline.**

1. **Never run anything that would overload the box.** Constrain at the source (cap Docker memory, cap
   `-j`). If a run can't be made safe, **escalate** with the numbers.
2. **PRE-AUTHORIZED to pause** (graceful `docker stop` only; never `kill`/`rm`/remove a volume; check that
   project's `current_state.md` for active work; restore + verify after): **Planitor** (`planitor-pg`),
   **Chantier_Manager** (`chantier_test_pg`/`chantier_test_redis` — `restart=no`, won't come back on their
   own), **Portique_Designer**, **SmartBar**.
3. **⚠⚠ HARD LIMIT — NEVER, including box strain:** `portfolio-caddy-1` (live `beam-stack.com` +
   `daoudi.beam-stack.com` on :80/:443) and `beamstack-contact` (real inbound leads). This box is their
   production box.
4. **Before pausing anything, `du -sh /tmp`** — it is tmpfs (RAM); our own dead scratchpads are usually
   the hog. All other projects' containers combined use ~77 MB.
5. **Record any pause + restore** in the box-local `last_session_work.md`.

---

## §6 — Environment & commands (dev box)

```bash
# ⚠ pnpm is corepack-only — NOT on PATH, NOT at ~/.npm-global/bin. Drop a shim for the session:
mkdir -p ~/bin && printf '#!/bin/sh\nexec corepack pnpm "$@"\n' > ~/bin/pnpm && chmod +x ~/bin/pnpm
export PATH="$HOME/bin:$PATH"

pnpm install
pnpm verify          # THE CI STEP LIST EXACTLY: typecheck (incl. apps/web) + lint + format:check + test + reseed:check
pnpm format:check    # ⚠ CI runs this BEFORE the tests — it silently failed every push for 7 entries

# Change the kernel's C++ and re-test: ~60 s (OCCT's static libs are prebuilt). Only a VERSION bump costs 2.5 h.
SPIKE=$HOME/occt-wasm-spike;  REPO=$HOME/projects/Bunyan/tools/kernel-build
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$SPIKE/install:/install:ro" \
  emscripten/emsdk:latest bash /work/link.sh
cp $REPO/dist/bunyan-kernel.{js,wasm} $HOME/projects/Bunyan/packages/kernel-occt/wasm/ && pnpm verify

# Offline golden seeding (NEVER in CI): cd tools/oracle && VIRTUAL_ENV=$PWD/.venv uv run seed-goldens ../../tests/goldens
# The native-OCCT oracle is also a MEASURING instrument (`.venv/bin/python`, `from OCP.… import …`).
```

- **Node** 20.20.2, **pnpm** 10.34.5 (corepack only), **uv** 0.11.20 (`~/.local/bin/uv`). **`libgl1`**
  installed (OCP → VTK → `libGL.so.1`). No system pip/venv — always `uv` (policy §8).
- ⚠ **`verify` = the CI step list, EXACTLY** (Entry 24/25): a local gate that is a strict SUBSET of CI is
  a false-negative generator. `.prettierrc` has `endOfLine:"auto"` so `format:check` is green on both
  Windows (CRLF) and CI (LF).
- No ports bound, no containers created, no other project touched by this work.

---

## §7 — Entry archive

**Entries 1–32 are one-liners here; their durable lessons are promoted into §1–§4. Entries 33–39 are the
live step-0 work, kept fuller. Full narratives: git history.**

| # | Date | What happened / the durable lesson (now in §1–§4) |
|---|---|---|
| 1 | 07-11 | P1: pnpm workspace, TS strict, protocol v1, mock, client, golden harness, CI. The kernel is **transport-agnostic**. |
| 2 | 07-11 | Verification scope ruled: **we trust OCCT; we verify our own code** (§4b). |
| 3 | 07-11/12 | OCCT→WASM to a hard stop: **`opencascade.js` cannot link here (OOM); build upstream OCCT, LTO off** (§1c-1). |
| 4 | 07-12 | Real OCCT geometry in WASM — the spike is green. Links `TKOffset` (wall layers). |
| 5 | 07-12 | Rulings: **single-threaded v1.0.0**; the `.wasm` is committed; IFC via IfcOpenShell. |
| 6 | 07-12 | **BUNYAN IS OPEN SOURCE (AGPL-3.0 + commercial)** (§4e). The LGPL side-module task cancelled; CLA is a hard prereq. |
| 7 | 07-12 | Kernel wired in; `measure` lands. **`Left/Right/Front/Back` are not the axes you think** (§1c-4). |
| 8 | 07-12 | **BUNYAN IS AGENT-NATIVE (D19–D23)** (§4f). The agent API *is* the Command registry. |
| 9 | 07-12 | **Persistent naming on hard topology — the #1 risk retired.** The literature is wrong about OCCT 7.9.3 (D24). |
| 10 | 07-12/13 | **MIQDAR specified.** The P5 freeze gains a Miqdar gate (§4g). |
| 11 | 07-13 | `transform` lands + exposes a groove-naming hole. **`transform` mints NO identities (D25).** |
| 12 | 07-13 | The protocol could not build a FLOOR PLATE (`extrude`/`chamfer` unbuilt for a month). **Exit criteria are a spec, not a summary** (§1c-7). **NEVER FUSE** (§4h). |
| 13 | 07-13 | Deep audit: claims vs wiring. The BREP cache had zero code; `measure` couldn't take a `ref`. |
| 14 | 07-13 | `revolve` lands. **CI was never green — `format:check` runs before tests.** CI's steps are commands; they run on this box. |
| 15 | 07-13 | Rulings: the positional key (D28), the freeze's meaning (D13), the BREP cache deferred (D29). |
| 16 | 07-13 | **THE MODELLING LAYER (D30–D33)** — beams unsupported, "how much plaster?" unanswerable. No code changed (§4h). |
| 17 | 07-13 | **THE ECOSYSTEM (D34–D38)** — Bunyan a third producer of the Clean Delta. Three products converged on one model (§4i). |
| 18 | 07-13 | **P3 BUILT: `@bunyan/document`** — every ruling D19–D38 is code; none touched the kernel. D29 measured (7.3 s / 195 elems). |
| 19 | 07-13 | **P3 REVIEW: six defects behind a green suite** (the moat didn't work). A green test proves only what it asserts (§1b). |
| 20 | 07-13 | **D40–D46 ruled** — the journal, `issueRevision`, all-or-nothing+`dryRun`, verbatim unknown types, ULID, discipline-on-the-part. |
| 21 | 07-14 | **P3 CLOSED; the six defects fixed + revert-verified; PROTOCOL FROZEN** (18+5). `BuildContext.discard` landed just in time. D29 ruled SHIP (the identity trap, §4j-2). `-O3` no speed. |
| 22 | 07-14 | **`apps/web` EXISTS** (Amer) — boots the real OCCT kernel, authors a composite wall through the command layer. |
| 23 | 07-14 | The wall is EDITABLE — ribbon + property panel both generated from the schema (D21 made visible). |
| 24 | 07-14 | **P4 REVIEW: the UI is primitive because the SPEC is (no interaction model)** — D47/D48/D49; P4.5 is new; the gates were blind to `apps/web`; the redraw is 90% waste (§1/§1a). |
| 24b | 07-14 | **The model is NOT associative (D50) and a command silently re-identifies (D51).** The largest scope ruling. |
| 25 | 07-14 | P4 step 0 (Amer): the gate now sees `apps/web`; `verify` = the CI step list exactly; CI green again, proven by mutation. |
| 26 | 07-14 | P4 2a/2b (Amer): the redraw is INCREMENTAL — an edit re-tessellates only what changed (3 parts, not 6). |
| 27 | 07-14 | P4 2c/2d/4/10/11/12 + the D19 equivalence test (Amer): edges, sub-shape picking, failure-state panels; an agent edit refreshes the view. |
| 28 | 07-15 | **Gap #10: a hosted void couldn't tell which way is INTO its host** (found by a duct through a beam). `hostFace.inward` added; revert-verified. |
| 29 | 07-15 | **The WASM heap is priced: ~16 KB/solid ⇒ ~0.3 GB at target. IT FITS.** The one contract-bearing scale axis is unblocked (D48; §1a). |
| 30 | 07-16 | **Gap #11: a duct through a ROUND COLUMN was bored down its own axis** (a bbox can't describe a curved face). New op `faceFrame` (first post-freeze op, D13); `hostFace.frame`; revert-verified. |
| 31 | 07-16 | **THE PRE-FREEZE AUDIT (Entry 31): seven new points → THE FREEZE GATE** (the authoritative checklist at the head of P5) + five methods. |
| 32 | 07-16 | **D52–D54 ruled** — baseline Wall `{start,end}`; constraints as a first-class collection; reserve vertex/phase/relevantWhen. The Freeze Gate unblocked. |

### Entry 33 — 2026-07-16 — Zayd — **D50 STEP 0a: THE REBUILD INVALIDATOR IS A TYPED DEPENDENCY GRAPH.**
The old `#touched()` was three hard-coded cases and was **already wrong for a fourth**: `build.ts` reads
`elevationOf(element.containerId)` but `#touched` didn't handle `containers` at all ⇒ the moment
`updateContainer` lands, every wall on a moved level silently keeps its old Z. Built
`packages/document/src/dependency.ts` — `dependents(scene, change)` resolves each `SceneChange` to the
elements whose geometry depends on it, via a switch **exhaustive over `SceneCollection`** (a new
collection is a compile error until its edge is declared — the structural fix). The once-missing
`container→element` edge is closed; grid→element declared but dormant (0b activates it);
material/section a declared explicit "nothing". `#touched` now feeds the graph. Test:
`dependency-graph.test.ts` (7, pure, revert-verified). 224 green.

### Entry 34 — 2026-07-16 — Zayd — **D50 STEP 0b: THE MODEL IS ASSOCIATIVE (design-first reshaped the contract).**
A design + a competitive reanalysis vs 9 real Revit/ArchiCAD operations found two freeze-fatal gaps: (1)
**`offset` is mandatory** (a parapet is top+1100, a footing is base−300); (2) **a constraint is not always
`{one element, one string target}`** ⇒ `Constraint` is now a **discriminated union on `kind`**, and
`ConstraintTarget` a **tagged union** (`level`/`grid` now; `element`/`ref` reserved) so new constraint
classes are additive MEMBERS, never edits. Built: `scene.constraints` (`SCENE_SCHEMA_VERSION` 1→2, a v1
`.bnn` still loads); `BuildContext` gained `elevationOf`/`grid`/`baseElevation?`/`topElevation?`/
`gridPoint?` (row ⓐ) — the build resolves them from constraints so a Type stays pure; `element.gridRefs`
REMOVED (one mechanism); the grid edge is no longer dormant; `createElement` folds base/top/grid into one
atomic edit; +`createConstraint`/`deleteConstraint`. `constraint-model.test.ts` (8, real kernel —
height derived, parapet/footing, grid placement, **rebind a datum → the solid follows**, refusal,
freeze-safety). 234 green.

### Entry 35 — 2026-07-17 — Zayd — **D50 STEP 0e/0f: THE MODEL IS EDITABLE, AND D51's GUARD IS FINALLY BUILT.**
The registries were create-only (a density typo couldn't be fixed, a Level couldn't be moved), and D51's
rule (D26) had never been enforced (`updateStyle` renamed a layer and silently orphaned every opening —
`brokenRefs` 0→1, no warning). Built: `updateContainer`/`updateGrid`/`updateMaterial`/`updateSection`/
`updateConstraint` + `deleteStyle`/`deleteMaterial`/`deleteSection`/`deleteContainer`/`deleteGrid`
(`move`/`setPlacement` deferred to P4.5). Each passes `rebuilt: []` — the 0a/0b graph derives the
re-stage set, so `updateContainer`/`updateGrid` make "move a Level/Grid, the building follows" true END
TO END. `updateSection` made the `sections` edge REAL. **The refuse-or-retarget guard (0f, row ⓓ, the
frozen part):** one shared `guardReferences` helper + the two-arg shape **`acknowledge?`/`retargetMap?`**
on every destructive/repointing command — RESTRICT by default (a typed `REFUSED` failure NAMING every
ref it would break), `retargetMap` to redirect-then-act atomically, `acknowledge` to proceed-and-break.
Generalised to `materialId`/`sectionId`/`styleId`/`containerId`/grid targets. `crud-and-guard.test.ts`
(12, real kernel, revert-verified). 247 green.

### Entry 36 — 2026-07-17 — Zayd — **PAUSE + HANDOFF: PRE-FREEZE AUDIT ROUND 2 (the Revit-beating lens) FOUND SIX MORE.**
Rows ⓙ–ⓞ. **⚠⚠ ⓙ is the one true foreclosure, VERIFIED IN THE BUILD:** `build.ts` builds a hosted
element via `buildVoid` ONLY (`voidResults` always `parts:[]`; its `buildGeometry` is never called) ⇒ a
Door/Window is a hole with **no leaf/frame/sill/mullions.** Freezing `BimObjectType` + the build wire now
makes real doors/windows impossible. **Step 5 MUST let a hosted type provide BOTH `buildVoid` AND
`buildGeometry` and wire the engine to call both — before the freeze.** ⓚ–ⓝ (project georeference,
phasing = two datums, formula params, element nesting/groups) are cheap additive reservations for 0g; ⓞ
(Space extent) folds into ⓖ. None blocks 0g/0d/0c. No source changed — audit + handoff. 247 green.

### Entry 37 — 2026-07-17 — Zayd — **D50 STEP 0g: THE "RESERVE THE SHAPES" PASS + SPACE EXTENT RULED (Option B → a SECOND solver).**
Designed first (`P5_step0g_design.md`, owner-ruled in two rounds → **D55/D56**). All reservations landed
as optional/additive fields (no `SCENE_SCHEMA_VERSION` bump): ③ vertex grammar · ④+ⓛ phasing as **two**
datums `phaseCreated?`/`phaseDemolished?` · ⑤ `relevantWhen?` · ⓜ `formula?` · ⓒ `ifcMapping?` · ⓕ
`migrateStyle?` · ⓚ `georeference` · ⓝ `parentElementId?` · ⓟ `properties?` (Pset/agent bag) · ⓠ
`classifications?` · ⓡ `mark?` · ⓢ `Grid.geometry?` (`line`|`arc` union) · **Space extent = Option B**
(`SpatialContainer.location?`/`baseOffset?`/`upperLevelId?`/`limitOffset?` — boundary DERIVED, never
stored) + `Scene.roomSeparators` (a first-class polyline collection). Hardened the hostile-`.bnn` guard
for `constraints` + `roomSeparators`. `reserve-shapes.test.ts` (15, pure). ⚠⚠ **D55: the room-bounding
solver ships in v1.0.0 — a SECOND heavy solver (owned by step 1); the schedule must be re-cut.** 262 green.

### Entry 38 — 2026-07-18 — Zayd — **0g.2: THE VERB HALF (ⓣ). THE RESERVED METADATA NOW HAS AN AUTHORING PATH.**
The nouns had no verb: the six reserved `Element` fields couldn't be authored, and `Command.argsSchema`
freezes at step 6. Built: the six landed as **optional args on `createElement.argsSchema`** (an element is
born with its mark/phase/properties in one atomic edit; `parentElementId` is a validated ref — a dangling
parent refuses); new verb **`core.setElementMetadata`** (provided sets, absent leaves unchanged, clearing
is a future additive arg — never a `null` overload; no guard/rebuild — none is identity- or
quantity-bearing). ⓤ RESERVED: `properties?`/`classifications?` on `SpatialContainer` + `Grid` (P6 IFC
psets). ⓥ RECORDED: the `Grid.geometry` supersession invariant. `reserve-shapes.test.ts` +6 → 21,
revert-verified. 268 green.

### Entry 39 — 2026-07-18 — Zayd — **THE HARD GATE IS CLOSED: THE TWO SOLVERS PRICED, THE CUT CONFIRMED, planegcs PROVEN. 0d DESIGNED, SIGNED OFF.**
**Task (owner):** resume implementing. The 🔴 HARD GATE stood before step 1: price the two v1.0.0 solvers
and state the number to the Architect, because D55 pulled both into scope **without the number**.

- **The estimate — and it inverts the plan's assumption.** **0d ~4–6 sessions** — DE-RISKED to an
  integration by `@salusoft89/planegcs` (FreeCAD's GCS in WASM), **PROVEN headless on this box** (solved a
  rough L-corner to exact `|AB|=3000`/`|BC|=2000`/perpendicular dot 0; **497 KB**; **LGPL-2.1** → links
  into AGPL; v1.2.0, current; JSON primitives keyed by stable id ⇒ the D26 no-permute invariant is nearly
  free). **Room-bounding ~5–8 sessions, higher variance — NO drop-in exists; the HEAVIER of the two.**
  ⚠ **Neither touches a frozen contract** (0d adds `Constraint`-union members; room-bounding derives from
  reserved Space inputs) ⇒ the schedule risk is ship-date, not freeze-correctness.
- **✅ OWNER RULED THE CUT (with the number):** both ship in v1.0.0 (D55 stands), built NOW before the
  types, serial — **0d first → room-bounding → types.**
- **0d DESIGNED** (`P5_step0d_design.md`) and **signed off (Q1–Q3):** sketch geometry on the element's
  `params` (no `.bnn` migration) · dedicated `createSketchConstraint`/`deleteSketchConstraint` verbs · the
  full constraint set (coincident/parallel/perpendicular/horizontal/vertical/distance/equal/tangent+arcs).
  Architecture: a `SketchSolver` seam (the sketch analogue of `GeometryGateway`, D19 precedent — keeps
  `@bunyan/document` pure + a `MockSketchSolver`); planegcs impl in a new `@bunyan/sketch-solver` package;
  document-layer, in-process, single-threaded; feeds the frozen `extrude`/`revolve` ops.
- **Two strings, recorded, neither a blocker:** a second WASM module (+~150 KB gzip; lazy-loadable behind
  the sketch tool; §4j-5) and an LGPL attribution obligation (joins the OCCT one, §4e). planegcs's own
  non-driving-constraint bug does not bite v1.0.0 (driving-only).

**NEXT:** build 0d per the signed-off design + test plan (real planegcs, headless, revert-verified D26
guard); then the room-bounding solver (its own design doc); then 0c joins and the types. **No source
changed this entry — pricing gate + design + planegcs proof. Commit is owner-gated.**

### Entry 40 — 2026-07-18 — Zayd — **D50 STEP 0d BUILT + GREEN: THE SKETCH CONSTRAINT SOLVER SHIPS (real planegcs, headless).**
**Task (owner):** resume implementing — build 0d per the signed-off design. Done, `pnpm verify` fully
green (**275 tests, +7**; typecheck incl. the new package + apps/web, lint, format, reseed).

- **The frozen contract shapes landed (Q1=A / Q2=dedicated verbs / Q3=full named set), all additive:**
  `Constraint = DatumConstraint | SketchConstraint` (the union's **second member**, exactly as reserved);
  the **sketch data model** `Sketch`/`SketchPoint`/`SketchSegment` lives in `element.params` (Q1=A — **no
  `SCENE_SCHEMA_VERSION` bump, no `.bnn` migration**, round-trip proven); `SketchConstraintKind` (the full
  eight: coincident/parallel/perpendicular/tangent/horizontal/vertical/distance/equal) + `SketchOperands`
  (points by id, **segments by INDEX** — D26) + `driving?` reserved. `isDatumConstraint`/`isSketchConstraint`
  guards narrow the union everywhere it is read (`scene.ts`, `commands.ts` referrers). **Two new verbs:**
  `core.createSketchConstraint` / `core.deleteSketchConstraint` (datum verbs refuse a sketch id and vice-versa).
- **The seam (D19 precedent, exactly like the kernel):** `SketchSolver` interface + the solver-neutral IR
  (`SolvableSketch`) + `MockSketchSolver` (identity solve) live in **`@bunyan/document`** (pure — no planegcs
  dep); the real **`PlanegcsSolver` is a NEW package `@bunyan/sketch-solver`** (the only thing that imports
  `@salusoft89/planegcs`), injected at construction (`DocumentOptions.sketchSolver`, defaults to the mock).
  `BuildContext.solveSketch(sketch)` is the one accessor — the engine attaches the element's constraints from
  the scene (the 0b move, keeps a Type pure) and runs the solver; `build.ts` threads the solver through.
- **The pipeline works end to end:** a `sketchProfile` fixture Type does **solve → Profile → extrude** — a
  rough rectangle + 6 constraints solves to an exact 3000×2000 and extrudes to the exact solid.
- **⚠⚠ D26 HELD AND IS REVERT-VERIFIED:** `lateral.k` names the face swept from **authored segment k**; a
  dimensional re-solve (2000→2600) moves the geometry while the `lateral.2` token stays **byte-identical**
  (associativity — the sketch analogue of 0b's rebind-a-datum). Reverted by permuting the segment array →
  the naming test breaks (5 fails), restored → green.
- **The refusal path is ONE, at build time:** an over-constrained sketch (two conflicting `distance`s) makes
  the solve throw → a `geometry` failure → **D42 rejects the command, document at last-good** (constraint
  never lands, solid unchanged). Under-constrained is **allowed** (`dof > 0`, CAD-normal, not an error).
- **⚠ SOLVER-IMPL SCOPE (owner FYI — a v1.0.x follow-up, NOT a contract gap):** the `tangent` kind and arc
  `SketchSegment`s are in the **frozen contract** but not in this planegcs adapter build (lines + the 7
  point/line constraints only). The solver is **swappable behind the seam**, so extending it costs no contract
  change and no freeze risk. An arc/tangent input yields a typed `failed` result, never wrong geometry.
- **Two strings, both recorded (design §1), neither a blocker:** a second WASM module rides along
  (`@salusoft89/planegcs` — installed from npm, ~497 KB; `optimizeDeps.exclude`d in vitest like the kernel;
  lazy-loadable behind the sketch tool) and an **LGPL-2.1 attribution obligation** joins the OCCT one (§4e,
  before public).

**NEXT (unchanged order):** the **room-bounding solver** (Space extent Option B, D55 — its own design doc
first; the heavier of the two, ~5–8 sessions) → **0c wall-to-wall joins** → the **types (steps 1–5)** →
the gates → **FREEZE**. **No commit yet — commits are owner-gated.** ⚠ Box: installed planegcs (npm reach
confirmed); no containers touched, no ports bound.

### Entry 41 — 2026-07-18 — Zayd — **D50 §Space-extent B / D55 BUILT + GREEN: THE ROOM-BOUNDING SOLVER SHIPS (the second heavy solver — de-risked to ~1 session, not 5–8).**
**Task (owner):** resume implementing — build the next item, the room-bounding solver, its own design doc
first. Designed (`P5_step1_room_bounding_design.md`), owner ruled all five framing questions, built, `pnpm
verify` fully green (**294 tests, +19**; typecheck incl. apps/web, lint, format, reseed).

- **✅ OWNER RULED Q1–Q5 (design §9):** Q1 boundary rule = **INNER FINISH FACE** (the honest usable area) ·
  Q2 = **DOCUMENT-LAYER 2D, pure TS** (settles §8.4 — no kernel op, headless) · Q3 = the **`footprintOf`
  provider seam** (build+test now, before the real D52 Wall) · Q4 = a not-enclosed seed → typed
  `{ enclosed: false }`, **area UNAVAILABLE never 0** (D45) · Q5 = **prismatic** volume (sloped-soffit v1.0.x).
- **⚠⚠ THE ESTIMATE INVERTED AGAIN.** Priced at ~5–8 sessions (Entry 39, "the heavier of the two, no
  drop-in"); the actual body was **one session.** The planar-arrangement + face-trace is standard, bounded
  2D work (~380 lines, `packages/document/src/room.ts`), and the two hard worries **dissolved**: (a) the
  seed makes finish-face free (the arrangement's face containing the seed is bounded by the inner faces);
  (b) **openings DON'T leak rooms** — a door is a `buildVoid` cutting the 3D wall, but the wall's Level-plane
  FOOTPRINT is continuous, so the solver never sees the doorway (Revit-consistent — **this resolves
  Freeze-Gate row ⓞ**, revert-verified). Both v1.0.0 solvers are now built.
- **The pipeline (`room.ts`):** `RoomSolver` seam (D19 precedent — `PlanarRoomSolver` default, `MockRoomSolver`
  for the seam; pure TS ⇒ **no WASM to quarantine, so the default IS the real one**, unlike planegcs) →
  `footprintOf(element, scene)` (the only piece that knows a wall — offsets the `{start,end}` baseline by
  ±thickness/2 into its two face-lines; an element with no baseline contributes nothing) → `assembleRoomInput`
  → the arrangement (split-at-intersections, half-edges, clockwise-most `next()` for CCW faces, smallest face
  containing the seed) → `DocumentContext.roomMetrics(spaceId)`: **area (inner finish face) + perimeter +
  prismatic volume**, derived height from the 0g-frozen vertical inputs (`baseOffset`/`upperLevelId`/
  `limitOffset`, else next Level up). **A QUERY — never stored, never cached, reads the live scene** (the
  `dependency.ts` "nothing" edge, design §1).
- **⚠⚠ NO FROZEN BYTE MOVED.** 0g already froze every Space input; `dependency.ts` already declared the edge.
  No `scene.json` field, no `SCENE_SCHEMA_VERSION` bump, no `Command`/`argsSchema`/kernel-protocol change —
  the pass writes the BODY behind shapes reserved in Entry 37. `roomMetrics` is the only new surface (a query,
  not a verb).
- **Tests (`tests/room-bounding.test.ts`, 19, pure/headless):** rectangle + L (non-convex, both legs → one
  room) vs closed form · not-enclosed → `{ enclosed: false }` (no `area`) · a separator closes an open plan
  (revert-verified load-bearing) · coincident duplicate walls don't break the trace · **a door leaves the
  area byte-identical (ⓞ)** · **associativity** (move a wall, area follows — derived, no rebuild, no cache) ·
  volume omitted when no top Level (D45) · the `MockRoomSolver` injection seam. **Revert-verified:** forcing
  centerline (drop the finish-face) → 4 fails; flipping the face-trace turn rule → 7 fails.
- **⚠ SCOPE (v1.0.x, recorded, no freeze cost):** curved-wall arc edges (v1.0.0 walls are straight),
  auto-seed when `location` absent, room islands/holes, sloped-soffit volume, and column/other footprints
  (v1.0.0 bounds with walls + separators — Revit's default set). All additive behind the same seam.

**NEXT:** **0c wall-to-wall joins** (with the real Wall — ⚠⚠ the ANTI-FUSE rule is absolute; a join is
display/quantities cleanup, NEVER a boolean) → the **types (steps 1–5)**, ⚠⚠ step 5 (Opening) must resolve
ⓙ (a hosted type providing BOTH `buildVoid` AND `buildGeometry`) → the gates (⑧ Miqdar §3.4, ⑨ 2D anchoring)
→ **FREEZE.** **No commit yet — commits are owner-gated.** ⚠ Box: no containers touched, no ports bound.

### Entry 42 — 2026-07-20 — Zayd — **D50 STEP 0c BUILT + GREEN: WALL-TO-WALL JOINS SHIP — AUTO-MITER, ANTI-FUSE, AND THE REAL WALL PULLED FORWARD. STEP 0 IS CLOSED.**
**Task (owner):** resume implementing — build the next item, 0c, its own design doc first. Designed
(`P5_step0c_design.md`), owner ruled Q1–Q5 **and two follow-ups §9a-A/§9a-B**, built, `pnpm verify` fully
green (**302 tests, +8**; typecheck incl. the new package + apps/web, lint, format, reseed).

- **✅ OWNER RULED Q1–Q5 + §9a (design §9/§9a). ⚠ TWO RULINGS OVERRODE THE RECOMMENDATIONS and reshaped the
  frozen contract — recorded because a future agent will assume the recommendation held:** Q1 = **butt +
  mitre** (per-layer priority v1.0.x) · Q2 = a **dedicated `JoinConstraint`** union member · **Q3 =
  AUTOMATIC ON PROXIMITY** (not the recommended explicit command) · **Q4 = PULL THE REAL WALL FORWARD** (not
  a fixture — build the shipped D52 Wall and join on it) · §9a-A = **`JoinConstraint` is an OVERRIDE-ONLY
  record, auto-default = mitre, `resolution ∈ {butt,mitre,none}`** · §9a-B = **MINIMAL** (just the real Wall
  this session; home = my call → a new `@bunyan/types` package).
- **⚠⚠ THE ANTI-FUSE RULE HELD, STRUCTURALLY AND BY GATE (§4h, measured Entry 12).** A join is a
  DISPLAY/QUANTITIES cleanup, NEVER a boolean fuse. The wall builds as an **extruded plan polygon** in a
  FIXED segment order (`start-cap → a-side → end-cap → b-side`); a join reshapes ONLY the two CAP segments,
  so the window-hosting **side faces `lateral.1`/`lateral.3` keep byte-identical tokens (D26)**. **The gate
  (`tests/wall-joins.test.ts` §7.1): a window on a wall's side face survives the corner being joined —
  token byte-identical, void volume unchanged.** If green, the join is not a fuse.
- **⚠ AUTOMATIC-ON-PROXIMITY IS D1-SAFE (design §0a — write this down).** "Do two ends meet?" is decided
  from the `{start,end}` PARAMS (the recipe, the same inputs `footprintOf` reads), never from a built
  solid — a pure function of truth, like room-bounding. A stored `JoinConstraint` is only an OVERRIDE
  (butt / explicit mitre / `none` = Disallow Join); absent ⇒ auto-mitre. No stored row per plain corner.
- **The pipeline:** `packages/document/src/joins.ts` (engine-side resolver — auto-join detection + miter
  bisector + butt near-face, all plane geometry, headless) → `BuildContext.joins` (resolved cap-lines, the
  0b "Type reads scalars, never the scene" move) → the shipped **`@bunyan/types` `wallType`** clips each
  layer's side-lines to the two cap-lines and extrudes. `core.setJoin`/`core.clearJoin` author overrides;
  wall-delete cascades dangling overrides. **Bidirectional dependency edge** (`dependency.ts`): move a
  wall → its joined neighbours re-stage (proximity over old+new endpoints), and a `JoinConstraint` change
  re-stages both walls. **REVERT-VERIFIED:** disabling the join edge → the associativity + auto-miter +
  composite tests go red (3 fail).
- **Tests (`tests/wall-joins.test.ts`, 8, real OCCT):** the anti-fuse gate · auto-miter geometry (cap
  reaches past the corner) · butt lands on the through wall's face · `none` disallows · **associativity**
  (move a wall, the neighbour's miter follows) · deletion reverts the neighbour + clears the override ·
  **composite wall miters EVERY layer** + window pierces all · save→load round-trip (the override is in
  the recipe).
- **⚠⚠ NO FROZEN BYTE BROKEN, ONLY ADDED.** `JoinConstraint` is the `Constraint` union's THIRD member
  (D53's growth path); `BuildContext.joins`, `core.setJoin`/`core.clearJoin` are additive; **no
  `SCENE_SCHEMA_VERSION` bump, frozen kernel protocol untouched.** New package `@bunyan/types` (the shipped
  MVP types' home; the legacy `length/height` fixture `core.wall.v1` stays for the 14 tests that use it).

**NEXT:** **BOTH v1.0.0 solvers AND joins are done — STEP 0 IS CLOSED.** The **types (steps 4–5)** are next:
freeze `BimObjectType` against a composite, styled wall; ⚠⚠ **step 5 (Opening) MUST RESOLVE ⓙ** (a hosted
type providing BOTH `buildVoid` AND `buildGeometry`) → the gates (⑧ Miqdar §3.4, ⑨ 2D anchoring) → **FREEZE
(step 6).** ⚠ The real Wall is now a shipped `@bunyan/types` type — the freeze validates against it (and its
Opening). **No commit yet — commits are owner-gated.** ⚠ Box: installed nothing new (workspace-only link);
no containers touched, no ports bound.

### Entry 43 — 2026-07-20 — Zayd — **PRE-FREEZE REVIEW (`review_P5.md`) + ENTRY 42 COMMITTED/PUSHED + THE BIMsync REFRAME (D57). ZAYD IS THE NEXT SESSION.**
**Task (owner):** review whether Bunyan will fulfil its promise (the competitive BIM ecosystem) and
recommend corrective actions; then commit+push; then pick the next agent; then correct the docs. Reviewer
method per `review_prompt.md` — verify against ARTIFACTS, not prose. Full report: **`review_P5.md`**.

- **Ground truth:** `pnpm verify` fully green (**302 tests**, real OCCT kernel; typecheck/lint/format/reseed).
- **Finding #1 (headline):** *"STEP 0 CLOSED" outran the artifacts* — all of Entry 42 (0c joins, the new
  `@bunyan/types` package, `wall-joins.test.ts`) was **uncommitted**, existing only in the working tree.
  ✅ **RESOLVED THIS ENTRY: committed + pushed** (`8e16b8a` step 0c; also pushed the stranded `cb5833f`
  Entry 40/41; review is `824de8f`). Step 0 is now genuinely safe in git.
- **Finding #2 — ⓙ verified still OPEN.** `build.ts:218–300` builds a hosted element via `buildVoid` ONLY
  (`parts:[]`, `:298`); the opening's own `buildGeometry` is never called. A door is a hole. **Must be
  resolved at step 5 before the type freeze** — and prove the fix needs no new frozen field (§5.4).
- **Finding #3 — the wall-join resolver is O(N²), MEASURED, undocumented.** Runs on every rebuild; ~4.2 s
  of pure-TS join scan at ~2000 walls, quadratic. Corrects the §1a "it's all in the renderer" claim. NOT a
  freeze item — a v1.0.x endpoint-index fix. See §1a correction + `review_P5.md` #3.
- **Finding #4 — mid-span / T-junction joins can't be expressed** (endpoint-only `wallsShareCorner`). A
  cheap pre-freeze check: confirm `JoinConstraint` survives adding them (§5.4).
- **✅ WHAT IS FINE (checked):** suite real + green vs the real kernel; the **anti-fuse rule genuinely
  holds** (joins compute cap-lines from `{start,end}` params, never fuse solids; the byte-identical
  host-token gate is real); the dependency graph is exhaustive-over-collections; the journal delivers
  read-not-inferred deltas via `issued_at_seq`. Coverage NOT earned: Amer's renderer at scale, gates ⑧/⑨,
  hostile-`.bnn` BREP, IFC.
- **⚠⚠ THE STRATEGIC REFRAME — OWNER RULING D57 (2026-07-20):** ⑥ was mis-filed as *blocked on an off-box
  BIMsync spec*. **BIMsync is UNBUILT — built from scratch after Bunyan v1.0.0, its spec ADAPTS to Bunyan.**
  ⇒ the Clean Delta is a **design Bunyan owns**, shaped for **Planitor + Miqdar** (on-box, known); ⑥ is
  headless-closable design work, NOT an escalation. This DE-blocks the freeze path and puts the once-and-
  forever ecosystem-contract work squarely in Zayd's lap. Docs corrected: imp_plan ⑥ row + close-order,
  current_state §1a/§3/§4a-D57/§5.
- **✅ NEXT SESSION = ZAYD (owner asked; reasoning recorded).** The pre-freeze window's priority is the
  IRREVERSIBLE work, and it is all Zayd's: the **types (steps 4–5)**, **ⓙ**, and the **⑥ Clean Delta design
  on Bunyan's terms**. Amer's renderer/interaction (P4.5, storage, WebGPU) is essential to the product but
  improvable forever — it is the PARALLEL track, not the pre-freeze bottleneck. (Amer's own pre-freeze
  obligation: drive `move`/`setPlacement`/`array` arg shapes with a real pointing device — ⓑ/ⓘ — and close
  the D48 renderer-at-scale coverage gap `review_P5.md` names.)

**NEXT (Zayd):** the **types (steps 4–5)** — freeze `BimObjectType` against a composite styled Wall + a
real Opening; **resolve ⓙ first** (door builds a leaf, not just a void; prove no new frozen field); **design
the ⑥ Clean Delta on Bunyan's terms** (Planitor + Miqdar); confirm the mid-span-join reservation (#4); then
gates ⑧/⑨ → **FREEZE**. Commits owner-gated. ⚠ Box: no containers touched, no ports bound.

### Entry 44 — 2026-07-20 — Zayd — **THE PRE-FREEZE GATE IS CLOSED: ⓙ RESOLVED (door builds a leaf), ⑥ DESIGNED, #4/⑧/⑨ DISCHARGED. READY TO FREEZE (owner-gated).**
**Task (owner):** close the pre-freeze gate on the type contracts — resolve ⓙ first, design the ⑥ Clean
Delta, confirm the #4 mid-span reservation, clear gates ⑧/⑨, then freeze. `pnpm verify` fully green
(**309 tests, +7**; typecheck incl. apps/web, lint, format, reseed). ⚠ **The FREEZE itself (step 6, tagging
the contracts frozen) is owner-gated and NOT done — everything owed *before* it is now closed.**

- **ⓙ RESOLVED — a hosted element now builds a SOLID, not only a hole (the one true foreclosure).** The build
  engine called `buildVoid` only and pushed `parts: []`; a door was a hole. Fixed in three parts, each
  revert-verified against the REAL kernel:
  - **Contract (additive, pre-freeze):** one new optional method on `BimObjectType` — **`buildLeaf?(ctx:
    VoidBuildContext) => Promise<readonly BuiltPart[]>`** (`types.ts`). ⚠⚠ **THE FROZEN-FIELD PROOF (owed by
    `review_P5.md` #2) IS AIRTIGHT, NOT ASSERTED:** a leaf must sit in the opening frame ⇒ its builder needs
    `hostFace` ⇒ it must take a `VoidBuildContext`; and under `strictFunctionTypes` (on via `strict:true`) a
    `(VoidBuildContext)⇒…` is **NOT** assignable to `buildGeometry`'s `(BuildContext)⇒…` (demonstrated with a
    `tsc` probe → **TS2322**). So `buildGeometry` cannot be reused; a new entry point is required. ⚠ **BUT NO
    new field on `VoidBuildContext` / `BuiltPart` / `hostFace`** — the review's specific worry: `hostFace.frame`
    already places a leaf, a leaf is an ordinary `BuiltPart`. The additive surface is exactly ONE optional
    method. **`buildLeaf` (not reusing `buildGeometry`) is also MORE correct:** a door builds a solid ONLY when
    hosted, so an un-hosted door is correctly `unbuildable` (tested) — reusing `buildGeometry` would wrongly
    permit it standalone.
  - **Engine wire (`build.ts`):** after `buildVoid`, call `buildLeaf` with the SAME void context; the leaf is
    built in the host's local frame and rides the HOST's placement (a door moves with its wall). Leaf-nodeId
    uniqueness checked (identity, like base parts); a leaf failure marks the opening `failed` (wall + hole
    survive), all handles handed back — no leak on the failure path.
  - **Lifecycle (`document.ts`) — the leak the fix would have introduced:** a void element now carries its own
    parts, so it must be marked **superseded** on rebuild or each re-stage LEAKS the old leaf (the Entry-21
    pattern). Added one line; **revert-verified it leaks exactly 2 handles/rebuild without it (14→28).**
  - **The real shipped Door (`packages/types/src/opening.ts`, `core.opening`):** provides BOTH `buildVoid`
    (hole) AND `buildLeaf` (a `leaf` panel + a `frame` lining — two Parts, two Materials; the frame is
    outer−inner ⇒ exercises `ctx.discard` on the leaf path). Both halves position from `hostFace.frame`, so the
    leaf lands in the hole on any wall orientation. **`quantities(door)` now returns per-part-per-material mass**
    (the plan's ⓙ note about project roll-up crashing on openings is dissolved — a door has parts).
  - **Tests (`tests/opening-leaf.test.ts`, 4, real OCCT):** the door has leaf+frame measured per part per
    material · the leaf sits inside the hole (one frame) · **no heap leak across rebuilds** · an un-hosted door
    is `unbuildable`. **Revert-verified:** remove the wire → §1/§2 fail; remove the supersede → §3 leaks.
- **#4 MID-SPAN / T-JUNCTION — additivity CONFIRMED and recorded (`tests/wall-join-midspan.test.ts`, 2, real
  OCCT).** Modelled a partition meeting a wall's mid-span: it does not auto-join and `setJoin` refuses (the
  current limit, now locked in). ⚠ **PROOF IT IS ADDITIVE:** two STRAIGHT baselines meet at ≤1 point, so the
  frozen `JoinConstraint {element, other, resolution}` is an unambiguous key and the landing point is DERIVED
  from the baselines (recipe-is-truth) — exactly like the mitre bisector today. A future mid-span relaxes the
  `wallsShareCorner` precondition and adds resolver geometry; **no new frozen field.**
- **⑥ THE CLEAN DELTA — DESIGNED, and it needs NO frozen change (`P5_step6_clean_delta_design.md`).** Designed
  against the **real, on-box** consumer contract — `../Planitor/v2.2_spec.md` §4 (`source:"bunyan"`,
  `contract_version:"1.1"`), per D57 (Planitor is on-box; BIMsync adapts later). ⚠⚠ **Field-by-field mapping
  proves every Clean Delta field maps to a frozen shape or is exporter-derived from the frozen journal
  (`UndoableEdit.command`/`rebuilt` + `SceneChange.before/after` + `ModelRevision.issued_at_seq`).** `change_type`
  (incl. `modified_move` vs `modified_qty` and the associative-cascade case via `rebuilt`), `prior`-state, and
  per-part quantities all DERIVE — read, not inferred. **Freeze-Gate ⓗ (length/count) is discharged:** the
  schedule's length is a semantic axis PARAM, not `measure.edgeLength` — exporter-derived, no field. ⇒ **the
  exporter + JSON Schema is a v1.0.x deliverable; the transport freezes clean. `review_P5.md` Finding 1 is
  retired against the real consumer, not a guess.**
- **GATE ⑧ (Miqdar §3.4) DISCHARGED — reserve nothing.** `BimObjectType.version`+`migrate` suffice for optional
  analytical-hint fields later: hints live in Miqdar's own graph bound by PEI (not on the type); and the
  reservation pattern (`ifcMapping?`/`migrateStyle?`/now `buildLeaf?`) proves an optional field is additive.
  Rows 1–4/6 already satisfied.
- **GATE ⑨ (2D-annotation anchoring) DISCHARGED (`tests/annotation-anchoring.test.ts`, 1, real OCCT).** A
  dimension = `{elementId, [refA, refB]}`; after a resize both `SubShapeRef`s stay byte-identical (D1) and the
  value re-derives. A v1.0.x annotation collection is additive over the frozen refs — no new field.
- **⇒ EVERYTHING OWED BEFORE THE FREEZE IS CLOSED.** Remaining: the **owner-gated FREEZE** (step 6 — Architect
  signs off, tag `SubShapeRef`/`BimObjectType`(+`buildLeaf`)/`Command`/`scene.json`/`ParamSchema`/`UndoableEdit`
  frozen) and the commit of this session's work. **No commit yet — owner-gated.** ⚠ Box: installed nothing;
  no containers touched, no ports bound.

### Entry 45 — 2026-07-21 — Zayd — **PRE-FREEZE GAP-HUNT: ONE REAL GAP FOUND + FIXED (a join silently moved a hosted door). NO FORECLOSURE — FREEZE-READY CONFIRMED. Entry 44 COMMITTED + PUSHED.**
**Task (owner):** commit Entry 44's design, then run tests to find unconsidered points/gaps that must be handled
before the freeze; on the door finding, adopt Revit's model, then commit + push. `pnpm verify` fully green
(**310 tests, +1**; typecheck incl. apps/web, lint, format, reseed).

- **Entry 44 committed + pushed** (`4f91344`) — the ⓙ door-leaf fix, ⑥ Clean Delta design, gates ⑧/⑨. It no
  longer "outruns the artifacts" (the exact `review_P5` Finding-1 trap). Verified green on the working tree first.
- **THE GAP (measured, real kernel):** composing the two NEWEST surfaces for the first time — the `buildLeaf`
  door (Entry 44) + 0c wall joins (Entry 42) — a centred door on a wall **drifted +T/4 (50 mm) when a NEIGHBOUR
  wall arrived at the far corner.** Nobody touched the door or its wall. Cause: `core.opening` anchored `offsetU`
  to the host face's PARAMETRIC CENTRE (`hostFace.frame.origin`), and an auto-mitre extends the joined side-face
  (`wall-joins` §7.2), moving that centre. ⚠ Entry 42's anti-fuse gate never caught it — it checked the host
  TOKEN + void VOLUME, not the door's POSITION, and drove the LEGACY fixture opening, not the shipped one.
- **⚠⚠ NOT A FORECLOSURE — the freeze is SAFE.** `core.opening` is a registry type (additive, D19), not a frozen
  contract; and the frozen `VoidBuildContext` ALREADY carries the host wall's `{start,end}` baseline (`hostParams`),
  a stable anchor a join never touches. So the fix needed **no frozen-contract change** — freeze-positive evidence.
- **✅ OWNER RULED: Revit's model.** `offsetU` is now the door centre's distance FROM THE WALL START along the
  baseline (oriented start→end, orientation-independent anchor), not from the face centre. Both `buildVoid` and
  `buildLeaf` share the one `faceBasis`, so hole + leaf co-move (never drift apart). A slab/column host with no
  baseline falls back to the face centre (today's behaviour). **REVERT-VERIFIED:** anchor back to `frame.origin`
  → `tests/opening-join-drift` fails (door at 5000, not 3000; the 50 mm drift returns).
- **Tests:** new `tests/opening-join-drift.test.ts` (1, real OCCT) — a neighbour join does NOT move the door;
  `tests/opening-leaf.test.ts` updated (`offsetU: 2000` = centred on the 4000 baseline, was `0`).
- **THE FREEZE-FORCING / THREE-CONSUMERS SWEEP (recorded, all freeze-safe, so a future agent doesn't re-derive):**
  mirror is already in `RigidMotion` + ruled (a mirror is a new element); length/count deliberately omitted from
  `QuantityBreakdown` (ⓗ, exporter-derived); **raked/gable + curved walls** are additive (a new type or an optional
  `BuildContext` field — today's wall extrudes by ONE scalar height); a multi-floor **shaft** is N openings today /
  a future additive type; **ⓑ/ⓘ** — no `core.move`/`setPlacement`/`rotate`/`copy`/`array` exists and `transactionId`
  is reserved-but-unused, but adding a move verb later is additive (D19), `transactionId` is reserved, and D52 folds
  "drag the wall's end" into `setParams` (one edit) — freeze-safe, though the plan's pointing-device validation
  (Amer's track) is still unrecorded. **⇒ No hard foreclosure found; the contracts are freeze-ready.**

**NEXT:** unchanged — the **owner-gated FREEZE (step 6)** is the only remaining step. ⚠ Box: installed nothing;
no containers touched, no ports bound.
