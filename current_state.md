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

## §0a — DISTANCE TO FREEZE ≠ DISTANCE TO REVIT (read this before you feel "almost done") *(2026-07-21 strategic review)*

**The freeze checklist being ~closed says NOTHING about competitiveness with Revit. They are different axes, years apart, and the docs used to conflate them.** A fresh agent reads "step 0 closed, gates discharged, ready to freeze" and absorbs "nearly a Revit competitor." That is the exact failure mode of §1's own history ("P2 declared done twice", "the whole modelling layer was missing") — *measuring against the checklist, never against the ambition.*

**Ground truth (verified by build, not prose — 2026-07-21):** the shipped product is **two element types** (`@bunyan/types`: `core.wall`, `core.opening`) on an exact kernel. What is genuinely excellent — the exact-B-Rep + persistent-naming + parametric-recipe core, the agent-native single command layer, the stable-PEI ecosystem substrate — is *the hard, rare part most Revit challengers never finish*, which is why it comes first. **But it is a foundation, not a Revit competitor.** What Bunyan is NOT yet: a documentation tool (Revit's actual product — one plan/section/schedule ships in v1.0.0, the rest is the largest parity item, D58), multi-user (D60), MEP (D62), families-by-users (D61), DWG-interoperable (D63); its 10k-element target is unproven on 3 of 4 axes (D66); and its taxonomy is almost entirely unbuilt (`core_logic.md` §9a).

**⇒ THE STANDING METHOD (added to §1b): measure the product against the Revit-parity ledger (`v1.0.0_imp_plan.md` "Road to Revit parity"), NOT against the phase's exit criteria.** The owner validated D58–D66 to make this measurable and to reserve the contracts these capabilities need before the freeze. *The distance to Revit is not what the momentum in these docs makes it feel like — and the freeze is the moment to reserve for it, because after it every gap is a three-product amendment.*

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
(auto-miter, anti-fuse gate green, the real D52 Wall in `@bunyan/types` — Entry 42). The types (steps 4–5)
+ the MVP-checklist gates are also done (ⓙ door-leaf, ⑥ Clean Delta, #4/⑧/⑨ — Entries 44–45).
**⚠⚠ REMAINING — AND THE FREEZE IS REOPENED (Entry 46):** the 2026-07-21 strategic review (the "will it beat
Revit, ecosystem built?" lens) added **pre-freeze rows Ⓐ–Ⓕ + the D66 scale measurement** (see §5 + imp_plan
"🟠 REOPENED"). These land **before** the FREEZE (step 6). The MVP checklist was closed; the parity/foreclosure
lens was not. See `v1.0.0_imp_plan.md` FREEZE GATE (🟠 REOPENED) + §0a + Entry 46.

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

> **⚠⚠ STRONGER CORRECTION (Entry 46, 2026-07-21 review — D66): "the one contract-bearing axis is measured and
> it FITS ⇒ scale is settled" is a measurement scoped to ITS input (the §2 trap turned on ourselves). Only ONE
> of the four scale axes (WASM heap) was measured; the other three — edit latency (~45 s/edit extrapolated),
> cold load (~6.3 min), draw calls (~16k, 10–20× a 60 fps budget) — extrapolate the WRONG way at target, and the
> O(N²) join scan below adds ~100 s on the REBUILD side. "It's all in the renderer / scale is settled" is false.**
> **The 4-axis measurement is now a BINDING PRE-FREEZE deliverable (D66)** because heap-eviction "touches contracts,
> must be known before P5 freezes" and a failed single-threaded target reopens D8 (multithreading). ⚠ Renderer
> batching + heap eviction are, by the plan's own words, "a rewrite not an optimisation" if found late.
>
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
| **`BimObjectType`** | **✅ WRITTEN (Entry 18), corrected (21), extended.** Carries `parameterSchema`, `styleSchema`, `defaultClassification`, `defaultDiscipline` (D45), `buildGeometry→Part[]` (D30), `buildVoid`, `migrate`, and (0g) `ifcMapping?`/`migrateStyle?`. ⚠⚠ `BuildContext.discard(handle)` — a Type running two ops per part MUST declare its intermediate or it leaks; **declare BEFORE the risky op.** ⚠⚠ `VoidBuildContext.hostFace.inward` (Entry 28) + `.frame` (Entry 30, from `faceFrame`) — a hosted void projects along the host's honest inward normal (correct for curved faces too). `BuildContext` gained `grid()`/base+top datums (0b). ✅ **ⓙ RESOLVED (Entry 44): a hosted type provides BOTH `buildVoid` AND the new additive `buildLeaf?(VoidBuildContext)` — a door builds a leaf+frame, not just a hole; the real `core.opening` ships it. PROVEN no new `VoidBuildContext`/`BuiltPart`/`hostFace` field (a `tsc` TS2322 proof); `buildLeaf`, not `buildGeometry`, because a door is a solid only when hosted.** ✅ **D59 COMPOSITION (Entry 48): gained the additive `buildChildren?(ctx)=>BuiltChild[]` (a parent owns child ELEMENTS, rule 18 — the real `core.curtainwall` ships it, Model A = children DERIVED by PEI `${parentId}:${slot}`, never stored). `Element` gained reserved `childOverrides?`/`ChildOverride`; `parentElementId` RE-PINNED to the group/manual-nest meaning.** | **P5** (freeze against the composite Wall + the real Opening + the composite Curtain Wall — all now exist) |
| **`Command`** | **✅ WRITTEN (Entry 18)** — `argsSchema` + `execute` returns its `UndoableEdit`. **The agent API** (§4f). CRUD verbs carry the D51 refuse-or-retarget args (`acknowledge`/`retargetMap`, 0e/0f); `createElement` carries the six reserved-metadata args + `core.setElementMetadata` (0g.2). **0d BUILT `core.createSketchConstraint`/`core.deleteSketchConstraint`** (Entry 40; datum verbs and sketch verbs each refuse the other's ids). **0c BUILT `core.setJoin`/`core.clearJoin`** (Entry 42 — override verbs; joins are AUTOMATIC on proximity, these only deviate a corner to butt/mitre/none). | **P5** (with its `argsSchema`) |
| **`ElementStyle`/`Part`/`Material`/`Section`/spatial tree/`Constraint`/`scene.json`** | **✅ WRITTEN.** `scene.json` = `packages/document/src/scene.ts`. **0b:** `scene.constraints` (discriminated-union `Constraint`, `SCENE_SCHEMA_VERSION` 1→2). **0d (Entry 40):** `SketchConstraint` is the union's SECOND member; the `Sketch` data model lives in `element.params` (Q1=A — no schema bump). **0c (Entry 42):** `JoinConstraint` is the union's THIRD member (`{element, other, kind:'join', resolution:'butt'|'mitre'|'none'}`) — an OVERRIDE of the auto-miter default; no schema bump. **0g:** reserved fields on `Element` (`phaseCreated?`/`phaseDemolished?`/`parentElementId?`/`properties?`/`classifications?`/`mark?`), `SpatialContainer`/`Grid` (IFC bags + Space extent inputs + `Grid.geometry?`), `Scene.georeference?`/`roomSeparators`, `ParamField.relevantWhen?`/`formula?`. **Ⓐ (Entry 47):** `Scene.views?`/`annotations?`/`schedules?`/`sheets?` (documentation, `documentation.ts`) — optional absent-defaulted, no bump. **Ⓓ (Entry 50, D61):** `Scene.families?` (`families.ts`) — a data-family DEFINITION embedded (self-contained per rule 15); a fully-shaped discriminated-union grammar; optional absent-defaulted, no bump; PROVEN to need no `BimObjectType` field. | **P5** |
| **Agent surface** (`window.bunyan`) | **✅ WRITTEN** — `createAgentSurface`, versioned separately (`agentApi: 1`, D22); does **not** inherit the P5 freeze. | evolves on its own clock |
| **`.bnn`** | **✅ WRITTEN + FINISHED (Entry 21).** Zip of `manifest.json` + `scene.json` + `history.json` (the JOURNAL — append-only `seq`; an undo appends a REVERSAL) + optional `thumbnail.png`. Ids are prefixed ULIDs (D44); unknown/future-typed elements round-trip VERBATIM (D43). `geometry-cache.brep` (D29) is purely additive — breaks no saved file when it lands. ✅ **D60 MERGE SEAM RESERVED (Entry 49): `manifest.documentLineage?` (a ULID doc id for un-issued files) + the journal's `UndoableEdit.origin?`/`lamport?` + `ModelRevision.frontier?` — all optional, absent in v1.0.0, round-trip additively; no `SCENE_SCHEMA_VERSION` bump.** | **P5** |

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
                    src/wall.ts             from the tests/ exercise fixtures. D52 baseline join-aware Wall (`core.wall`);
                    src/opening.ts          the ⓙ Door (`core.opening`, buildVoid+buildLeaf); and (D59, Entry 48) the
                    src/curtainwall.ts      composite Curtain Wall (`core.curtainwall` + column/panel/mullion child types
                                             — `buildChildren`, elements-of-elements, depth-2). D19: the document engine
                                             loads these, never depends on them.
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
                    enumerate.ts ★ 6A — THE MODEL ENUMERATION QUERY (Entry 58). The ONE walk three consumers share:
                                     children tree (D59) + option cascade (D67) + no-own-parts + unmeasured.
                                     `modelElements` / `projectQuantities` / totalsBy{Material,Discipline,Container,Type}
                    cleandelta.ts ★ ⑥ THE CLEAN DELTA EXPORTER (Entry 58) — journal + revN -> CleanDeltaPackage.
                                     `change_type` READ off the journal; `sceneAt` rewinds; prior priced on a
                                     throwaway doc. Schema: `schema/clean-delta-1.1.schema.json` (Planitor D11)
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
tests/            417 tests (all document tests run against the REAL OCCT kernel, never the mock) + goldens + harness
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
- ~~**No browser storage**~~ — ✅ **BUILT + BROWSER-VERIFIED (Entry 56):** `IndexedDbStore` (a real IndexedDB
  `StorageAdapter`) + Save/Open/Delete/Autosave/Recover wired into the app; opening `rebuildAll`s from the recipe. Verified
  by `storage-check.html` (8/8, incl. the cross-session Autosave gotcha) + an app save→open round-trip. No frozen contract
  touched. ⚠ `list()` MUST return keys already in the store (it does — `getAllKeys()`). A File System Access adapter (real
  files the user picks) is an additive second `StorageAdapter`, v1.0.x.
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
| **D58** | **2026-07-21 — Documentation is a live projection of the B-Rep (core_logic rule 17). v1.0.0 ships MINIMAL 2D (1 plan + 1 section + 1 schedule); full apparatus is post-v1.0.0. ⚠ PRE-FREEZE: the View/Schedule/Dimension/Tag/Sheet ANCHORING contracts freeze at P5 (row Ⓐ).** |
| **D59** | **2026-07-21 — An element may own child ELEMENTS, not only Parts (rule 18): curtain walls, stairs, groups. Nesting is mandatory for parity. ✅ DESIGNED + BUILT (Entry 48, Model A = children DERIVED, never stored): `BimObjectType.buildChildren?` + `ElementGeometry.children?` (a tree) + `Element.childOverrides?`; `parentElementId` re-pinned to groups. The real `core.curtainwall` (depth-2) validates it; anti-fuse held; 328 green.** |
| **D60** | **2026-07-21 — Multi-user co-authoring is Bunyan's (ecosystem apps are downstream consumers, not co-authors). ✅ SEAM RESERVED (Entry 49, row Ⓒ): four optional additive fields — `UndoableEdit.origin?`/`lamport?`, `ModelRevision.frontier?`, `Manifest.documentLineage?` — proven mergeable by a pure commutative `mergeOrdered()`; no `scene.json`/schema/verb/backend change (D37 stands). Found 3 foreclosures the D44-ULID prose missed (the edit id is `seq`-derived; the anchor is scalar; un-issued files have no doc identity).** |
| **D61** | **2026-07-21 — Data-driven family authoring (Revit Family Editor moat): families as DATA, not code. ⚠ PRE-FREEZE: reserve a family-definition data-format seam (row Ⓓ). Code-types stay for complex behaviour.** |
| **D62** | **2026-07-21 → ✅ DONE (Entry 53). MEP systems & connectors RESERVED** — `scene.systems?` (`systems.ts`) + `Element.systemId?`/`connectors?` + their `createElement` args. ⚠ **A connector is AUTHORED placement in the element's OWN BUILD FRAME (D25), never a `SubShapeRef`** ⇒ the naming path is untouched and a placed duct's ports survive the move. ⚠ **The sweep-along-path/loft OP needed NO reservation** — the protocol froze at P3 and `faceFrame` was added *after* it under D13 ⇒ additive, precedented. |
| **D63** | **2026-07-21 → ✅ DONE (Entry 53) — NOTHING WAS OWED.** The DWG seam **already exists**: `FormatCodec` + `registries.codecs`, and domain rule 5 makes a new format an **additive registration** (asserted in the test, not just written down). A DWG *underlay* is post-v1.0.0 documentation apparatus (recorded out of scope, owner-ruled). IFC export stays v1.0.x (D3); point-cloud/RVT recorded absent. |
| **D64** | **2026-07-21 → ✅ RULED 2026-07-23 (Entry 52). RE-OPEN gate ⑧'s "reserve nothing": on-element analytical-anchor for real Miqdar structural/energy analysis, or PEI-bound side-graph? (row Ⓔ).** **ANSWER, EARNED from the proper Miqdar spec's real-frame walk (`~/projects/Miqdar/Miqdar_v1.0.0_spec.md` §4, M19): the SIDE-GRAPH SUFFICES — reserve NOTHING analytical on the type/part** (idealization is many-valued per element — cracked stiffness is gross + 0.35EI at once ⇒ not an element property). **ONE exception, NOT an analytical anchor: `Material.thermal?` reserved for the energy north-star (M18, owner-ruled), `entities.ts`, revert-verified.** |
| **D65** | **2026-07-21 → ✅ DONE (Entry 53). Design Options RESERVED** — `scene.designOptions?` (`designoptions.ts`) + `Element.designOptionId?` + `ViewCommon.designOptionIds?` + the `createElement` arg. ⚠⚠ **AND THE INVARIANT IS IN THE FROZEN CONTRACT, NOT JUST THE STORAGE (owner-ruled):** a document with options deliberately holds **mutually-exclusive elements**, so `quantities()`/the roll-up/the Clean Delta/schedules — and Planitor/Miqdar — **MUST exclude non-active options** (`isElementActive`), or a schedule double-counts and work packages are published for a scheme nobody builds (rule 15's failure mode by a new road). The `Grid.geometry`/ⓥ precedent: the consumer-facing rule is written in **at reserve time.** ⚠ **Phase filters + area schemes needed NOTHING** — a phase filter is a view property over datums that already exist and an override is display (derived, never stored); an area was never *stored*, so gross/rentable are additional **derivations**, not fields. |
| **D66** | **2026-07-21 → ✅ CONTRACT HALF DONE (Entry 54). The 4-axis scale measurement.** ⚠ **The ONLY freeze-gating part was the heap-eviction CONTRACT hook, and it is RULED: reserve NOTHING — additive by construction.** Recipe-is-truth makes every solid disposable-and-rebuildable (proven by the D29 cold-load rebuild), the evicted state (`ElementState.stale`) and the release mechanism (`releaseShape`, kernel-client fires it) are ALREADY FROZEN, and the keep-live policy is runtime state never persisted. Measured fresh (2026-07-24): **heap 0.31 GB at 10k — FITS** (16.2 KB/solid); **cold load ~6.35 min single-thread/no-cache** (levers — D29 cache RULED SHIP, `instantiate` RESERVED, MT/D8 — all additive, none foreclose). ⚠ **Draw calls + edit latency are Amer's (browser-side, unmeasurable headless); the D8 single-thread verdict needs them and is additive either way** ⇒ **NOT contract-gating.** `P5_step9_D66_scale_design.md`. ✅ **AMER'S TWO AXES MEASURED (Entry 55, real browser, Intel UHD): draw calls ~30,700 / ~606 ms/frame (1.6 fps) at target; incremental edit ~23 ms compute (FLAT — 2b works) + ~570 ms post-edit render. BOTH collapse to the one-mesh-per-part redraw wall; the fix is renderer BATCHING/instancing (additive, no contract). D8 verdict: the interactive axes do NOT need multithreading (it attacks the kernel, not the redraw) ⇒ recommend MT stays v1.0.x — RAISED with the owner, additive either way. All four axes now have a number.** |

| **D67** | **2026-07-25 → ✅ RULED + BUILT (Entry 57, row Ⓖ, `P5_step5G_option_cascade_design.md`). THE DESIGN-OPTION EXCLUSION INVARIANT CASCADES OVER EVERY "BELONGS-TO" EDGE.** Found by the owner-authorised pre-freeze adversarial sweep. D65 put the invariant *inside the frozen contract* so three products would implement ONE rule — but it read only an element's **own** tag and its signature handed it **no model**, so it could not ask what the element hangs off. **Measured: a consumer counted 4 windows where 1 was correct, 3 of them hosted on the wall the same rule had just excluded** — D65's own failure mode by the hosting road. **Fix (owner-ruled): `isElementActive(element, scope, active?)` resolves against the MODEL and TRAVERSES `hostId` + `parentElementId`** (a traversal, not a chain walk — an element may hang off both). Missing ancestor ⇒ excluded (broken-ref precedent); cycle ⇒ excluded and terminates (cycle-guard precedent). ⚠ **Generated children (D59 Model A) needed nothing — not scene rows, excluded WITH their parent by construction.** No schema bump, no field, no verb. Revert-verified (`expected 4 to be 1`). |
| **D8** | **2026-07-25 → ✅ DECIDED (Entry 57): MULTITHREADING STAYS v1.0.x.** Raised by Amer (Entry 55) and confirmed by the owner. The two INTERACTIVE axes are a renderer-batching problem MT does not touch; cold load is MT's only real candidate and has additive levers of its own (D29 cache RULED SHIP, `instantiate` RESERVED). Additive either way (COOP/COEP + `SharedArrayBuffer` deploy config, not a `scene.json` contract) ⇒ never gated the freeze. |

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
- **4g — MIQDAR, a second product (M1–M22).** Bunyan models; Miqdar analyses & designs; **starts only
  after Bunyan v1.0.0 ships. M13: Miqdar is CLOSED SOURCE.** ⚠⚠ **THE LIVE MIQDAR SPEC NOW LIVES IN
  `~/projects/Miqdar/`** (spec + register + current_state + decisions, M22, 2026-07-23) — the Bunyan copies
  are **retained + `SUPERSEDED`-headed** (not deleted; the freeze gate references them). **THE P5 FREEZE
  HAS A MIQDAR GATE** (plan P5 step 6a): its rows are `~/projects/Miqdar/Miqdar_v1.0.0_spec.md` §3.5 (was
  §3.4). ✅ **The gate's hard row — the analytical-anchor D64/row Ⓔ — is RULED (Entry 52): the PEI-bound
  side-graph suffices; reserve nothing analytical on the type/part; one `Material.thermal?` reserved for
  the energy north-star (M18).** ⚠ Miqdar may never require of Bunyan: analysis code inside it, a second
  API, or coupled release schedules.
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

> ## ⚠⚠ THE FREEZE IS REOPENED (Entry 46, 2026-07-21) — THE MVP CHECKLIST WAS CLOSED; THE REVIT-PARITY LENS ADDED PRE-FREEZE WORK.
> **Entries 44–45 closed everything the *MVP's own checklist* owed (ⓙ door-leaf, ⑥ Clean Delta, #4, ⑧, ⑨ — 310 green).
> The 2026-07-21 strategic review then measured the product against *"will it beat Revit, with the ecosystem built?"* —
> the §1b method turned on the product itself — and the owner validated nine new decisions (D58–D66). Six add pre-freeze
> work, because the contract they lean on freezes at P5.** ⇒ **NOT ready to freeze.** Land first (imp_plan "🟠 REOPENED"):
> **Ⓐ** documentation anchoring contracts (D58 — ✅ DONE Entry 47) · **Ⓑ** element composition/nesting
> **DESIGNED + BUILT** (D59 — ✅ DONE Entry 48, the real `core.curtainwall`) · **Ⓒ** co-authoring concurrency seam on the journal+`.bnn`
> (D60 — ✅ DONE Entry 49) · **Ⓓ** family-definition data-format seam (D61) · **Ⓔ** reopen gate ⑧'s analytical-anchor (D64) · **Ⓕ** MEP/DWG/
> Design-Option reservations (D62/63/65) · **plus D66** the 4-axis scale measurement (pre-freeze). **THEN the owner-gated
> freeze (step 6).** See Entry 46 + `v1.0.0_imp_plan.md` "🟠 REOPENED" + "Road to Revit parity."
>
> ## ✅✅ ALL REOPENED PRE-FREEZE WORK IS NOW DONE (Ⓐ–Ⓕ + D66's contract half) — AND THE FREEZE IS HELD ON AMER (owner, 2026-07-24).
> **Ⓐ** docs anchors (D58, E47) · **Ⓑ** nesting (D59, E48) · **Ⓒ** merge seam (D60, E49) · **Ⓓ** family seam (D61, E50) ·
> **Ⓔ** analytical anchor ruled from the Miqdar spec (D64, E52 — side-graph suffices, `Material.thermal?` reserved) ·
> **Ⓕ** MEP/systems + Design-Options reservations (D62/63/65, E53) · **D66** the scale measurement (E54 — the
> heap-eviction CONTRACT hook needs nothing, additive by construction; heap FITS at 0.31 GB; cold load ~6.35 min).
> ⚠⚠ **THE OWNER RULED HOLD ON THE FREEZE (E54): it does NOT proceed until ALL FOUR scale axes have a number + the D8
> single-thread verdict is made. The two missing axes (draw calls, edit latency) are AMER'S browser scale page** — so for
> the first time **the last pre-freeze blocker is Amer's, not Zayd's.** The contracts are safe to freeze on scale grounds;
> the owner is holding the *act* until the *measurement* is complete. **⇒ NEXT is AMER's browser measurement, THEN the
> freeze.** See Entry 54 + `P5_step9_D66_scale_design.md` §5.
>
> ## ✅✅ AMER'S TWO AXES ARE NOW MEASURED (Entry 55, 2026-07-25) — THE HOLD CONDITION IS MET. THE FREEZE IS AN OWNER ACT.
> The browser scale page (`apps/web/src/scale/`, imp_plan P4 step 9b) ran on the real kernel + real three.js + a real GPU:
> **(b) ~30,700 draw calls / ~606 ms per frame (1.6 fps)** at the 10k-element target; **(d) incremental edit ~23 ms compute
> (FLAT vs scale — 2b works, only the 3 changed parts re-tessellate) + ~570 ms post-edit render.** BOTH axes collapse to the
> ONE-MESH-PER-PART redraw wall (~30k draw calls), which **multithreading (D8) does not touch** — the fix is renderer
> BATCHING/instancing (Amer's, additive, no contract change; `instantiate` already reserved). **D8 recommendation (RAISED,
> not decided): keep MT v1.0.x — the interactive axes don't need it; cold load is its only candidate and has additive levers.**
> **⇒ all four scale axes have a number + the D8 verdict is surfaced ⇒ the Entry-54 HOLD condition is satisfied; whether to
> FREEZE (step 6) is now the owner's act.** Nothing measured forecloses a contract. See Entry 55.
>
> ## ⚠⚠ THE SWEEP WAS TAKEN INSTEAD OF THE FREEZE — AND IT FOUND ONE (Entry 57, 2026-07-25). D67 FIXED; THE FREEZE IS AGAIN THE OWNER'S ACT.
> Offered FREEZE NOW vs one more adversarial sweep, **the owner chose the sweep** (*"fix it, and keep sweeping"*) and **decided
> D8 — multithreading STAYS v1.0.x.** The sweep found **D67**: D65's exclusion invariant — which D65 had deliberately placed
> *inside the frozen contract* so Bunyan, Planitor and Miqdar would share ONE rule — **read only an element's own option tag and
> was handed no model**, so a consumer counted **4 windows where 1 was correct**, three of them hosted on the wall the same rule
> had just excluded. Pre-freeze because the defect is in the **signature** of a helper three products will call. **Fixed +
> revert-verified** (`expected 4 to be 1`); 387 green. ⚠ **The sweep's second finding is NOT freeze-blocking but is the moat's
> critical path: THE MODEL CANNOT BE ENUMERATED** — `scene.elements` misses generated children (**1 row, 17 real elements**),
> includes non-active options, and includes voids (`quantities()` still throws on the first Opening, as measured 2026-07-14 —
> **§1c-7's disease, third occurrence**). One query serves the roll-up, schedules and the Clean Delta alike. **⇒ no contract
> foreclosure beyond D67; the contracts are safe to freeze, and the freeze is the owner's act.**
>
> ## ✅✅ THE ENUMERATION QUERY + THE CLEAN DELTA EXPORTER ARE BUILT (Entry 58, 2026-07-25) — 412 green. THE FREEZE IS STILL THE OWNER'S ACT.
> Entry 57's second finding is discharged: `modelElements()` / `projectQuantities()` walk the D59 children tree, apply the
> D67 option cascade, skip no-own-parts elements **by construction**, and report the unmeasurable rather than zeroing or
> dropping it (owner Q1). The 42-day-old crashing exit criterion answers — *"how much C25/30 is in this building?"* = **3.18 m³**.
> The **Clean Delta exporter** ships on top (`contract_version 1.1`, `source bunyan`, Planitor v2.2 §4 field-for-field) with
> the journal rewind + bounded prior rebuild (owner Q2) and a **published JSON Schema** (Planitor D11).
> ⚠⚠ **Building it found TWO real defects, and the second is on the moat's load-bearing sentence:** a generated child's Type
> was unrecoverable from the built tree (so a curtain-panel schedule had nothing to group by); and **the journal was not
> recording the associative cascade at all** — 13 commands declare `rebuilt: []`, so *"a Level moved and 400 walls
> re-quantified"* reached a consumer as **`unchanged`**. Both fixed + revert-verified. ⚠ **Nothing frozen moved.**
> **⇒ §1c-7's disease, FOURTH occurrence** — a design doc named a field and nobody read it against the code. See Entry 58.
>
> ## ✅✅ STEP 0 IS CLOSED — BOTH SOLVERS + 0c JOINS ARE BUILT + GREEN (0d E40, room-bounding E41, 0c E42).
> All of D50 step 0 is done: **0a–0g**, **0d (real planegcs, D26 revert-verified)**, the **room-bounding
> solver (D55, Entry 41)**, and now **0c wall-to-wall joins (Entry 42 — auto-miter, anti-fuse gate green,
> the real D52 Wall pulled forward into `@bunyan/types`).** ⚠⚠ THE ANTI-FUSE RULE HELD (a join reshapes only
> the cap; side faces keep their tokens, D26). The types (steps 4–5) + MVP gates are also DONE (Entries 44–45).

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
4. **✅ DONE — THE TYPES (steps 4–5) + the MVP-checklist gates** (Entries 44–45). ⓙ resolved (`core.opening`
   Door builds a leaf via `buildLeaf`, no new frozen field, revert-verified); ⑥ Clean Delta designed (no
   frozen change, `P5_step6_clean_delta_design.md`); #4 mid-span additivity confirmed; gates ⑧/⑨ discharged;
   the join-drift gap fixed (Entry 45, offsetU anchors to the baseline). 310 green.
5. **THE REOPENED PRE-FREEZE WORK (Entry 46, D58–D66). ⚠ THE FREEZE IS NOT READY UNTIL THESE LAND. Ⓐ + Ⓑ + Ⓒ + Ⓓ DONE
   (Entries 47–50); ⏭⏭ START HERE = Ⓔ.** Mostly reservations + one gate re-examination; the builds so far (Ⓐ anchors,
   Ⓑ nesting, Ⓒ merge seam, Ⓓ family seam) are done. All are contract-shaping and therefore genuinely pre-freeze. Order (see imp_plan "🟠 REOPENED"):
   - **Ⓐ D58 — documentation anchoring contracts. ✅ DONE + GREEN (Entry 47, `P5_step5A_documentation_
     anchoring_design.md`).** Reserved on `scene.json` as four OPTIONAL, absent-defaulted collections
     (`views`/`annotations`/`schedules`/`sheets`; `documentation.ts`): a `ViewDescriptor` (plan/section/
     elevation/3d union), an `AnnotationAnchor`-based Dimension/Tag (ref/vertex/element/point union), a
     `ScheduleDefinition` bound to type/param/quantity KEYS, a Sheet nesting Viewports. Gate ⑨ WIDENED
     (`tests/documentation-anchoring.test.ts`, +8, real OCCT): a Schedule's type/param/quantity keys
     re-derive across a resize (the row ⑨ never covered), a Dimension's `SubShapeRef`s stay byte-identical,
     the whole surface round-trips. No frozen byte moved, no `SCENE_SCHEMA_VERSION` bump, no verb owed (a
     documentation command is an additive registry entry, D19 — distinct from ⓣ). 319 green.
   - **Ⓑ D59 — element composition / nesting. ✅ DONE + GREEN (Entry 48, `P5_step5B_composition_nesting_
     design.md`).** Owner ruled Q1–Q5 (Model A = DERIVED children; curtain wall; a tree; reserve the override
     patch; `parentElementId` re-pinned to groups). Built the frozen surface (`BimObjectType.buildChildren?` +
     `BuiltChild`, `ElementGeometry.children?`, `Element.childOverrides?`/`ChildOverride`), the recursive engine
     (`buildChildrenTree`/`placeTree`, cycle guard, subtree supersede/sweep), and the real shipped
     `core.curtainwall` (4 types, genuinely depth-2: wall → columns → panels + mullions). **Anti-fuse held**
     (a panel token byte-identical across a `cols` change); quantities roll the tree up to glass m² + aluminium
     kg per child per material. No frozen byte moved, no `SCENE_SCHEMA_VERSION` bump. `tests/composition-
     nesting.test.ts` (9, real OCCT), revert-verified. 328 green.
   - **Ⓒ D60 — co-authoring concurrency/merge seam. ✅ DONE + GREEN (Entry 49, `P5_step5C_coauthoring_merge_
     seam_design.md`).** Owner ruled Q1–Q4 (all recommended): `(origin,id)` global key with `edit.id` unchanged;
     a Lamport scalar; a revision `frontier`; a manifest `documentLineage`. Reserved four optional absent-defaulted
     fields — `UndoableEdit.origin?`/`lamport?`, `ModelRevision.frontier?`, `Manifest`/`SaveOptions.documentLineage?`
     — proven additive by a pure commutative `mergeOrdered()` (`tests/coauthoring-merge-seam.test.ts`, 9). The §1b
     method found 3 foreclosures: `edit.id` is `seq`-derived not a ULID; `issued_at_seq` is a scalar cut; an
     un-issued `.bnn` has no doc identity. **No `scene.json` touch, no `SCENE_SCHEMA_VERSION` bump, no verb, no
     backend (D37 intact).** Revert-verified. 337 green.
   - **Ⓓ D61 — family-definition data-format seam. ✅ DONE + GREEN (Entry 50, `P5_step5D_family_seam_design.md`).**
     Owner ruled Q1–Q3 (Q1 embedded in `scene.json`; **Q2 = a FULLY-SHAPED grammar now**, not the recommended opaque
     envelope; Q3 prefixed ULID). Reserved `Scene.families?` (the `views`/documentation precedent — one optional
     absent-defaulted collection, no schema bump) + a fully-shaped, discriminated-union `FamilyDefinition` grammar
     (`families.ts`: params + `box`/`extrude`/`revolve` primitives + `chamfer`/`fillet` modifiers + `FamilyChildPlacement`
     nesting + `FamilyHosting` — a data door; every scalar a `FamilyValue`, a `formatVersion` for evolution). **The §1b
     finding, PROVEN not assumed: a data family needs NO new `BimObjectType` field** — it is a `BimObjectType` a loader
     produces by closing over the def. `tests/family-seam.test.ts` (4 — a fully-shaped def, built FROM the round-tripped
     `.bnn`, drives a real OCCT element with exact quantities; the whole grammar round-trips). No frozen byte moved, no
     `SCENE_SCHEMA_VERSION` bump, no verb, no backend. Revert-verified. 341 green.
   - **✅ Ⓔ D64 — DONE (Entry 52): RULED FROM EVIDENCE — the PEI-bound side-graph suffices; reserve NOTHING analytical
     on the type/part.** The proper Miqdar spec was built first (**`~/projects/Miqdar/`** — spec + register + current_state
     + decisions, Miqdar Entry 1); its **real-frame walk (§4)** earned the answer: every idealization datum is either
     already-readable from the frozen contract or **many-valued per physical element** (cracked stiffness is gross +
     0.35EI *at once* ⇒ not an element property, even in principle). The anchor is `physicalBinding` on **Miqdar's**
     entities, pointing in. **The ONE exception is NOT an analytical anchor: `Material.thermal?` (D64/M18, owner-ruled) —
     a physical material property reserved for the energy north-star**, landed in `entities.ts`, revert-verified
     (`tests/analytical-anchor-d64.test.ts`, 345 green). Gate repointed at the new spec (§4g); Bunyan copies retained +
     `SUPERSEDED`-headed (M22).
   - **✅ Ⓕ D62/63/65 — DONE (Entry 53, `P5_step5F_reservations_design.md`).** Owner ruled Q1/Q3/Q4/Q5.
     **RESERVED (owed):** `scene.systems?` + `Element.systemId?`/`connectors?` (D62, `systems.ts`);
     `scene.designOptions?` + `Element.designOptionId?` + `ViewCommon.designOptionIds?` (D65,
     `designoptions.ts`); the three `createElement` args + `refTo` widened to `'system'`/`'designOption'`
     (the **ⓣ lesson applied before it bit again**). **NOTHING OWED (the findings):** the MEP sweep op
     (additive under D13 — `faceFrame` already landed post-freeze); the **DWG seam ALREADY EXISTS**
     (`FormatCodec` + `registries.codecs`, domain rule 5); phase filters (a view property over existing
     datums); area schemes (a *derived-query* extension — an area was never stored). ⚠⚠ **The one thing
     HARDER than billed: the design-option EXCLUSION INVARIANT** — mutually-exclusive elements mean
     `quantities()`/Clean Delta/schedules **must exclude non-active options** or double-count; owner ruled
     it into the frozen contract (`isElementActive`, the ⓥ precedent). No schema bump; revert-verified.
   - **D66 — the 4-axis scale measurement** (pre-freeze): partly Amer's (renderer), but the **heap-eviction
     contract hook is Zayd's and is pre-freeze** — "must be known before P5 freezes." A failed single-thread
     target reopens D8.
   - **THEN the owner-gated FREEZE (step 6)** — now also tagging the Ⓐ–Ⓕ reservations frozen.
5b. **✅ DONE — THE ENUMERATION QUERY + THE CLEAN DELTA EXPORTER (Entry 58, `P5_step6A_enumeration_design.md`).**
   Owner ruled Q1 (`unmeasured[]` beside the totals) / Q2 (rewind the journal + rebuild only the delta) / Q3 (both units
   in one build). `enumerate.ts` = the ONE walk three consumers share; `cleandelta.ts` = `journal + revN →
   CleanDeltaPackage` (Planitor v2.2 §4, contract 1.1) + `schema/clean-delta-1.1.schema.json` (Planitor D11).
   ⚠⚠ **Two defects found by building it:** a generated child's Type was unrecoverable from the built tree; and **the
   journal recorded `rebuilt: []` for 13 commands, so the ASSOCIATIVE CASCADE — the moat's own example — reached a
   consumer as `unchanged`.** ⚠⚠ **A POST-BUILD ADVERSARIAL SWEEP OF THE EXPORTER THEN FOUND THREE MORE** — a non-active
   design option emitted as a GHOST ROW; an edit-then-undo reported as a spatial move that never happened; a generated
   child whose slot vanished silently absent from the package. All five fixed, **each revert-verified**, no frozen shape
   touched. **417 green.**
6. **Still owed, lower priority (post-freeze / v1.0.x):** the D29 cache bodies (§4j-2 — read first) · the
   join O(N²) endpoint index (`review_P5.md` #3 — no contract change) · housekeeping (`LICENSE` AGPL-3.0,
   the CLA, the OCCT + planegcs attribution notices — none blocks work, all block going public) · then the
   **"Road to Revit parity"** phase map (imp_plan appendix) — the taxonomy, full documentation, MEP,
   families, worksharing, DWG, scale. *That is the actual distance to beating Revit; v1.0.0 is its foundation.*

**✅ CLOSED, DO NOT REDO:** the op set (`transform`/`extrude`/`chamfer`/`revolve`/`faceFrame`) ·
`measure(ref)` + derived `capabilities` + `INVALID_RESULT` · the positional key (D28) · the protocol
freeze (D13) · CI (all five steps pass here) · the document model + agent surface + `.bnn` + undo +
broken-ref state + cascade delete (Entry 18) · all six P3 defects + D40–D46 (Entry 21, revert-verified) ·
`-O3`/LTO (MEASURED — no speed; do not re-run) · the heap ceiling (Entry 29 — it fits) · D50 step
0a/0b/0e/0f/0g (Entries 33–38) · **0d the sketch constraint solver (Entry 40 — real planegcs, green)** ·
the **room-bounding solver (Entry 41)** · **0c wall-to-wall joins (Entry 42 — auto-miter, anti-fuse gate
green, real Wall in `@bunyan/types`). ⇒ ALL OF D50 STEP 0 IS CLOSED.**

**For Amer (browser hot path):** ✅✅ **THE PRE-FREEZE BLOCKER IS DISCHARGED (Entry 55, 2026-07-25).** The owner held the
freeze until **all four D66 scale axes have a number + the D8 verdict is made**; the two headless axes were Zayd's (heap
FITS at 0.31 GB; cold load ~6.35 min) and **the two browser axes are now measured on a real GPU: (b) ~30,700 draw calls /
~606 ms per frame (1.6 fps) at target; (d) incremental edit ~23 ms compute (FLAT vs scale — 2b works) + ~570 ms post-edit
render.** Both collapse to the ONE-MESH-PER-PART redraw wall; the fix is renderer BATCHING/instancing (additive, no
contract). D8 verdict RAISED (not decided): the interactive axes don't need multithreading ⇒ recommend MT stays v1.0.x.
**⇒ the HOLD condition is met; the FREEZE (step 6) is now an owner act.** The scale page is `apps/web/src/scale/` +
`scale.html` (P4 step 9b, gated). ⚠ **The renderer batching/instancing rewrite is the next big Amer item, but it is
POST-FREEZE / parallel — additive, below every frozen contract, not a blocker.** — P4 steps done through Entry 27 (the
gate now sees `apps/web`; incremental redraw; sub-shape picking; the failure-state panels; the D19
equivalence test). ⚠ Build against
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

### Entry 46 — 2026-07-21 — **STRATEGIC REVIEW ("will Bunyan beat Revit?") + DOC REALIGNMENT. THE FREEZE IS REOPENED: 9 owner-validated decisions (D58–D66), 6 add pre-freeze work.**
**Task (owner):** review whether Bunyan is on a trajectory to a Revit competitor (assuming the ecosystem apps get
built as claimed), not believing the docs; then apply a validated slate of doc updates so the next agents aim at
parity, not just the freeze; then realign current_state; then hand off. Reviewer method per `review_prompt.md` —
verify against ARTIFACTS. `pnpm verify` re-run green (**310 tests**, real OCCT; typecheck/lint/format/reseed).

- **THE HEADLINE (verified by build, not prose):** the shipped product is **two element types** (`@bunyan/types`:
  `core.wall`, `core.opening`); the web app registers **one** (`scaffoldWallType`); `sectionCut`/IFC ops are
  **reserved, not implemented**. The docs measured progress against the *freeze checklist* (≈closed) and let that
  read as *≈Revit-competitive* (years away). **The freeze being ready is not the product being ready** — the exact
  §1 failure mode ("P2 done twice"; "the whole modelling layer was missing"), turned on the whole product.
- **WHAT IS GENUINELY EXCELLENT (and rare):** the exact-B-Rep + persistent-naming (D1/D24) + parametric-recipe core,
  the agent-native single command layer (D19–D23), the stable-PEI ecosystem substrate (D34). *This is the hard part
  most Revit challengers never finish — which is why it is the foundation and comes first.*
- **THE GAPS vs Revit (with the ecosystem assumed built):** no construction documentation (Revit's actual product —
  D58); no multi-user worksharing (D60); no MEP (D62); no user-authored families (D61); no DWG interop (D63); the
  taxonomy is almost entirely unbuilt (`core_logic.md` §9a); nesting/element-of-elements only reserved (D59); the
  10k-element target measured on 1 of 4 axes and the other 3 extrapolate the wrong way (D66).
- **OWNER VALIDATED THE FULL DOC SLATE + 4 DESIGN DECISIONS → D58–D66.** Co-authoring = **reserve seam now, build
  later** (D60); families = **data-driven** (D61); 2D docs = **minimal in v1.0.0** = 1 plan + 1 section + **1 schedule**
  (D58); nesting = **design the full composition model before freeze** (D59). ⚠⚠ **Two of these (D60 seam, D59 design)
  + D58's anchors + D61's seam are on the PRE-FREEZE CRITICAL PATH** ⇒ **the freeze is REOPENED** (Entries 44–45's
  "ready to freeze" was true only of the MVP checklist).
- **DOCS UPDATED THIS ENTRY (source unchanged — docs only):**
  - `core_logic.md`: rule 17 (drawing = projection of B-Rep), rule 18 (element owns child elements); sharpened the
    co-editing + families north-stars into reserved seams; **new §9a "The Revit-parity surface"** (taxonomy,
    documentation, MEP, collaboration, families, project-org, interop, analytical — with status).
  - `V1.0.0_spec.md`: **D58–D66** in §14; a **"⚠⚠ WHAT v1.0.0 IS NOT"** block at the head of §5; §5.3 non-goals
    reframed as the parity backlog with pre-freeze reservations.
  - `v1.0.0_imp_plan.md`: **"🟠 REOPENED"** freeze-gate block (rows Ⓐ–Ⓕ + D66); P6 objective marked minimal-2D +
    anchors-reserved; **new appendix "Road to Revit parity"** (the capability ledger + the post-v1.0.0 phase map).
  - `current_state.md`: **§0a** (distance-to-freeze ≠ distance-to-Revit) + the §1b method; §1 remaining-work +
    §1a scale narrative corrected (D66); §4a D58–D66; §5 close-order rewritten (reopened Ⓐ–Ⓕ); the §5 banner; this Entry.
- **⚠ NEXT SESSION = ZAYD.** Every reopened row is contract-shaping (journal/`.bnn`/`BimObjectType`/`scene.json`) —
  the pre-freeze window's priority is the irreversible work, and it is all Zayd's (D58 anchors, D59 nesting design,
  D60 seam, D61 seam, D64 gate re-examination, D62/63/65 reservations, D66's heap-eviction hook). Amer's parallel
  track: the renderer half of the D66 scale measurement + P4.5 interaction model (essential, improvable forever, not
  the pre-freeze bottleneck) — same reasoning as Entry 43.
- **⚠ NO COMMIT YET — commits/pushes are owner-gated.** ⚠ Box: installed nothing; no containers touched, no ports
  bound; `du -sh /tmp` clear.

**NEXT (Zayd):** land the reopened pre-freeze work in §5-step-5 order (Ⓐ documentation anchors → Ⓑ nesting design →
Ⓒ journal concurrency seam → Ⓓ family-format seam → Ⓔ analytical re-examination → Ⓕ MEP/DWG/Design-Option
reservations → D66 heap-eviction hook), each its own design doc + revert-verified where it lands code; **then** the
owner-gated FREEZE (step 6). Commits owner-gated.

### Entry 47 — 2026-07-21 — Zayd — **REOPENED ROW Ⓐ DONE: THE DOCUMENTATION ANCHORING CONTRACTS ARE RESERVED (D58) — GATE ⑨ WIDENED FROM ONE DIMENSION TO THE WHOLE SURFACE.**
**Task (owner):** land the reopened pre-freeze work in order, starting with Ⓐ; design-doc-first, reserve
SHAPES not bodies, revert-verify where code lands, verify against artifacts. `pnpm verify` fully green
(**319 tests, +8**; typecheck incl. apps/web, lint, format, reseed). ⚠ **No commit — owner-gated.**

- **DESIGNED FIRST (`P5_step5A_documentation_anchoring_design.md`).** The freeze question Ⓐ answers, and gate
  ⑨ did not: v1.0.0 now ships a MINIMAL 2D body in P6 (one plan + one section + **one schedule**, D58), so the
  freeze must not foreclose the WHOLE documentation surface. Gate ⑨ (Entry 44) proved only ONE dimension
  between two faces. Method: the freeze-forcing test + the three-consumers walk, per entity.
- **THE INVARIANT THAT MAKES IT SAFE TO RESERVE-NOW-BUILD-LATER (rule 17):** a drawing stores a DEFINITION
  (a cut plane / an anchor set / a filter + columns), NEVER the projected 2D geometry — which is DERIVED, like
  a mesh / a `Part` / a room boundary. ⇒ a documentation entity's value is a pure function of the frozen scene;
  a resize updates it with zero re-authoring. Its future `dependency.ts` edge is a declared "nothing" (a
  projection refresh, a query — the `roomMetrics`/`roomSeparators` precedent), so no rebuild to invalidate.
- **RESERVED SHAPES (`packages/document/src/documentation.ts`), all optional/additive, tagged-union-where-they-
  grow (the D53 discipline):** `AnnotationAnchor` = `ref | vertex | element | point` (the widened anchor
  vocabulary — each ref/vertex carries its OWN `elementId` so a CROSS-element dimension works; gate ⑨'s
  single-element case is the degenerate one) · `Annotation` = `Dimension | Tag` (store an anchor + a rule,
  never a value; the tag `subject` is a stable KEY — `mark`/`type`/`param:*`/`quantity:*`) · `ScheduleDefinition`
  = a filter (typeId/Classification/containerId) + `ScheduleColumn` union (`field | param | quantity | count`)
  — the anchor gate ⑨ never covered · `ViewDescriptor` = `plan | section | elevation | 3d` (stores HOW to
  project; the `sectionCut` op is ALREADY reserved in the frozen protocol — no new op) · `Sheet` nests
  `Viewport`s.
- **LANDED ON `scene.json` AS FOUR OPTIONAL, ABSENT-DEFAULTED COLLECTIONS** (`views`/`annotations`/`schedules`/
  `sheets`) — the **`georeference` precedent, NOT `roomSeparators`**: NOT in `emptyScene()`, NOT in
  `SceneCollection`, NOT in the hostile-`.bnn` guard, because no body authors/reads them yet (nothing to
  default, invalidate, or crash). ⚠ **TOP-LEVEL, not a nested `documentation?` bag**, so each is promotable to
  a full `SceneCollection` ADDITIVELY when its CRUD lands (the flat-key undo machinery indexes `scene[key]`; a
  nested collection would force a migration). **No `SCENE_SCHEMA_VERSION` bump** (folds into frozen v2 exactly
  as 0g's reservations).
- **⚠ NO VERB RESERVATION IS OWED (distinct from ⓣ, recorded so it is not re-opened):** documentation entities
  are NOT elements — their CRUD is NEW commands, and a new command is a purely additive registry entry (D19).
  ⓣ had to widen `createElement`'s frozen `argsSchema`; Ⓐ does not, because nothing here is born via
  `createElement`.
- **GATE ⑨ WIDENED (`tests/documentation-anchoring.test.ts`, +8; real OCCT + pure).** Part 1 (real OCCT): a
  `Dimension` (the reserved shape) keeps its `SubShapeRef` anchors byte-identical and re-derives 3000→5000
  across a `setParams{end}` resize; **a `Schedule` bound to type/param/quantity KEYS re-derives across a resize
  with an UNCHANGED definition** — the wall's `quantity:volume` column doubles on a 3000→6000 drag, the
  filter's frozen `typeId` selects exactly the two walls (a `core.opening` filter selects zero), the param/
  field/count keys are unchanged; a `Tag`'s element PEI anchor + `mark` subject survive. Part 2 (compile-time):
  every field optional/absent-able, every union grows by MEMBER. Part 3 (round-trip): the whole surface saves→
  loads byte-identical, and a `.bnn` with none defaults absent. **REVERT-VERIFIED:** stripping the `schedules?`
  reservation from `Scene` breaks compilation (its imports go dead, the test loses `.schedules`) — the reserved
  field is genuinely load-bearing, the reserve-shapes compile-time revert-check.
- **⚠ FOUR OWNER FRAMING QUESTIONS flagged in the design §9 (I built against the recommended defaults — all
  additive, reshape-cheap pre-commit):** Q1 top-level collections (vs nested bag) · Q2 per-anchor `elementId`
  (vs one per dimension) · Q3 `source`-tagged schedule columns (vs a fixed set) · Q4 a `titleblock` string id
  on `Sheet` now (vs defer). None blocks the remaining rows.

**NEXT (Zayd):** row **Ⓑ (D59 nesting)** — the heaviest reopened item: DESIGN the element-composition/hosting
model (its own doc + owner-ruled framing questions, the 0d/0c/room-solver rhythm), prove `parentElementId`/
groups carry it, **then BUILD one nested type (curtain wall or stair) end-to-end against the real kernel** (owner
ruled build, not just design; the anti-fuse rule D30 binds). Then Ⓒ (D60 journal concurrency seam) → Ⓓ (D61
family-format seam) → Ⓔ (D64 — read `Miqdar_v1.0.0_spec.md` §3.4, rule the analytical-anchor with evidence) →
Ⓕ (D62/63/65 reservations) → D66 (heap-eviction hook) → owner-gated FREEZE (step 6). ⚠ Box: installed nothing;
no containers touched, no ports bound; `du -sh /tmp` clear.

### Entry 48 — 2026-07-22 — Zayd — **REOPENED ROW Ⓑ DONE: ELEMENT COMPOSITION / NESTING (D59) — DESIGNED, OWNER-RULED, AND BUILT END-TO-END (a real curtain wall of child elements, real OCCT).**
**Task (owner):** resume implementing — land the reopened pre-freeze work in order; Ⓑ is next (design AND build).
Design-doc-first, owner rules the framing questions, build + revert-verify. `pnpm verify` fully green (**328
tests, +9**; typecheck incl. apps/web, lint, format, reseed). ⚠ **No commit — owner-gated.**

- **DESIGNED FIRST (`P5_step5B_composition_nesting_design.md`), then OWNER RULED Q1–Q5 (all as recommended):**
  **Q1 = Model A (DERIVED children)** — the freeze-critical fork. A curtain wall's panels/mullions are
  GENERATED from the parent's recipe, each a first-class element with its own PEI, but **never a stored
  `scene.elements` row** — recipe-is-truth (D30) + persistent-naming-by-derivation (D1) promoted one level
  (the `nodeId`/`lateral.k` discipline). **Rejected Model B (authored panels)** because it forces a rebuild to
  MUTATE the element set — a change to the D42/D19 rebuild contract itself, the expensive foreclosure. **Q2 =
  curtain wall** (the §9a canonical probe). **Q3 = a TREE** (`ElementGeometry.children?`). **Q4 = reserve the
  slot-keyed override patch** (`Element.childOverrides?`+`ChildOverride`, so Model C per-panel overrides are
  additive). **Q5 = `parentElementId` RE-PINNED** to the manual group/nest meaning (NOT generated children);
  a flat `groups` collection is proven purely-additive v1.0.x (not built).
- **THE FROZEN SURFACE — one optional Type method + one optional build-result field, all additive:**
  `BimObjectType.buildChildren?(ctx) => BuiltChild[]` (a `BuiltChild` = `slot`+`typeId`+`params`, the sibling of
  `buildLeaf`); `ElementGeometry.children?` (the tree); `Element.childOverrides?`/`ChildOverride` +
  `parentElementId` re-pinned (shape unchanged). **NO `SubShapeRef`/`Part`/`VoidBuildContext`/kernel-protocol/
  `SCENE_SCHEMA_VERSION` change.** A derived child PEI is `childElementId(parentId, slot)`.
- **THE ENGINE (`build.ts`):** `buildChildrenTree` generates children recursively (a child may itself be
  composite — depth > 1, "hosting deeper than one level"), `placeTree` rides the root's placement over the whole
  subtree (D25). Cycle guard (a self-nesting type refuses — a `geometry` failure, never a hang) + a depth
  backstop. `document.ts` registers every descendant FLAT by derived PEI for `quantities`/`geometryOf`/heap, and
  supersedes the root's whole prior subtree on rebuild (a vanished slot is freed AND deleted); `#commit` sweeps a
  deleted parent's subtree.
- **THE PROBE (`packages/types/src/curtainwall.ts`, 4 types — the real shipped `core.curtainwall`):** a pure
  composite (no own parts) → column children (composite) → panel children (leaf, glazing) + mullion children
  (leaf, aluminium). **Genuinely depth-2.** `quantities` reaches a panel by its derived PEI and rolls the tree
  up to glass m² + aluminium kg per material — the moat quantity a monolithic curtain wall could never answer.
- **⚠⚠ THE ANTI-FUSE RULE HELD (rule 11/§4h):** every panel/mullion is its OWN box, NO sibling boolean; a
  panel's face token is byte-identical across a `cols` change (`tests/composition-nesting.test.ts` §3, real OCCT).
- **THREE FINDINGS THE BUILD PRODUCED (the §1b method — building found what reading did not):** (1) **the
  derived-PEI separator is `:`, not `/`** — a nodeId is a `SubShapeRef` component whose grammar reserves `/` and
  `#` (`subshape.ts`), so `/` fails to encode; `:` is reserved by neither and absent from every authored PEI. (2)
  **a pure composite has no `buildGeometry`** — the `buildAssembly` guard had to widen to "neither solid nor
  children ⇒ unbuildable". (3) **a superseded generated child must be DELETED from the geometry map, not just
  freed** — else a vanished slot lingers with a dangling handle (`#commit`).
- **Tests (`tests/composition-nesting.test.ts`, 9, real OCCT):** the tree + derived PEIs · per-child + rolled-up
  quantities · the anti-fuse token gate · depth-2 nesting · placement rides the subtree · heap (rebuild leaks
  nothing, a shrunk grid frees vanished slots, delete sweeps the subtree) · a cycle is refused · round-trip from
  ONE authored row (children regenerate). **REVERT-VERIFIED:** neuter the recursive child build → 7 fail; remove
  the `#stage` subtree-supersede → the rebuild leaks (104 vs 26); remove the `#commit` subtree-sweep → delete leaks.

**NEXT (Zayd):** row **Ⓒ (D60 co-authoring concurrency/merge seam)** on the journal + `.bnn` — a merge-ordered
`seq`/lineage the single-user path ignores (a reservation, D40's own caveat). Then Ⓓ (D61 family-format seam) →
Ⓔ (D64 — read `Miqdar_v1.0.0_spec.md` §3.4, rule the analytical-anchor with evidence) → Ⓕ (D62/63/65
reservations) → D66 (heap-eviction hook) → owner-gated FREEZE (step 6). ⚠ Box: installed nothing; no containers
touched, no ports bound; `du -sh /tmp` clear.

### Entry 49 — 2026-07-22 — Zayd — **REOPENED ROW Ⓒ DONE: THE CO-AUTHORING CONCURRENCY / MERGE SEAM (D60) — RESERVED ON THE JOURNAL + `.bnn`, PROVEN ADDITIVE WITH A DETERMINISTIC MERGE, NO SCHEMA BUMP.**
**Task (owner):** resume the reopened pre-freeze work in order; Ⓒ is next (reserve, design-doc-first). Owner ruled the
framing questions; build/reserve + revert-verify. `pnpm verify` fully green (**337 tests, +9**; typecheck incl.
apps/web, lint, format, reseed-skip). ⚠ **No commit — owner-gated.**

- **DESIGNED FIRST (`P5_step5C_coauthoring_merge_seam_design.md`), then OWNER RULED Q1–Q4 (all as recommended):**
  **Q1 = `(origin, id)` global key, `edit.id` UNCHANGED** (document-scoped + human-readable; `reverses` stays
  replica-local — you undo your own edits; rejected the D44-symmetric "ULID-ify `edit.id` now" as a needless
  mint-behaviour change to a freezing field). **Q2 = a Lamport scalar `lamport?`** (order by `(lamport, origin)`;
  a version vector stays additive; rejected wall-clock `at` — clock skew makes a merge non-deterministic). **Q3 =
  reserve `ModelRevision.frontier?`** (a per-origin cut so "since revision N" survives merge). **Q4 = reserve
  `manifest.documentLineage?`** (a ULID doc id so two UN-issued `.bnn`s are recognizably the same document).
- **THE §1b METHOD FOUND THREE FORECLOSURES by reserving against the REAL code, not the prose.** `undo.ts`'s own
  header reassured co-editing "isn't foreclosed — the PEIs are ULIDs (D44)". True of *element* PEIs, **incomplete**
  for the journal: (1) **the EDIT's own `id` is `edit-${seq}-${command}`, NOT a ULID** (`document.ts:498`) — two
  replicas both mint `edit-42-…` and `reverses` matches by exact-string `id` equality, so the global key must be
  `(origin, id)`. (2) **`issued_at_seq` is a scalar cut point** — ambiguous across replicas; needs a `frontier`.
  (3) **an un-issued `.bnn` has NO document identity** (`lineage` only exists post-`issueRevision`, defaulting to
  `bnn-${Date.now()}`). Each is one optional field; each is a three-product amendment if the freeze lands without it.
- **THE RESERVED SURFACE — four optional, absent-defaulted fields, additive at every point:** `UndoableEdit.origin?`
  + `UndoableEdit.lamport?` (`undo.ts`); `ModelRevision.frontier?` (`revision.ts`); `Manifest.documentLineage?` +
  `SaveOptions.documentLineage?` with an additive `saveBnn` round-trip (`bnn.ts`). **The `Journal`/`UndoStack`
  classes get NO reservation** — a class is not a wire contract; its serialized form is the `UndoableEdit[]` array,
  and a `MergeJournal` ordering by `(lamport, origin)` is an additive subtype the transport phase adds.
- **⚠⚠ NOTHING TOUCHES `scene.json` — NO `SCENE_SCHEMA_VERSION` BUMP.** Merge metadata is journal + manifest, not
  scene; the parametric truth is identical whether authored by one peer or ten. No frozen field changed shape; every
  existing consumer (`since`, `issued_at_seq`, `restore`, `reverses`) is byte-identical when the fields are absent —
  which they always are in v1.0.0. **No verb owed** (a co-editing transport is new commands = additive registry
  entries, D19 — distinct from ⓣ). **No backend/allocator** (`origin`/`documentLineage` are ULIDs — D37 intact).
- **THE PROOF (`tests/coauthoring-merge-seam.test.ts`, 9, pure — no kernel):** a pure `mergeOrdered()` over the
  reserved fields is **commutative** (`merge(A,B) ≡ merge(B,A)` — the CRDT property), **causality-respecting** (a
  higher Lamport never sorts before what it followed), **degenerates to today's exact `seq` order for one origin**,
  and `(origin, id)` **disambiguates the `edit-42` collision** (keying by `id` alone visibly loses one edit — the
  foreclosure, demonstrated in-test). The `frontier` delta equals the scalar `issued_at_seq` delta for one origin and
  returns exactly the causally-later edits across a merged journal. `mergeOrdered` lives in the TEST only — the
  executable proof the frozen shapes are SUFFICIENT, not a shipped feature (no transport exists to feed it).
  **REVERT-VERIFIED:** neuter the `saveBnn` `documentLineage` line → 2 codec tests fail (the id vanishes on
  round-trip); restored + re-green.

**NEXT (Zayd):** row **Ⓓ (D61 family-definition data-format seam)** — families as DATA not code; touches type/registry.
Then Ⓔ (D64 — read `Miqdar_v1.0.0_spec.md` §3.4, rule the analytical-anchor with evidence) → Ⓕ (D62/63/65
reservations) → D66 (heap-eviction hook) → owner-gated FREEZE (step 6). ⚠ Box: installed nothing (pnpm via corepack
only); no containers touched, no ports bound; `/tmp` 102M (own scratchpads).

### Entry 50 — 2026-07-22 — Zayd — **REOPENED ROW Ⓓ DONE: THE FAMILY-DEFINITION DATA-FORMAT SEAM (D61) — A FULLY-SHAPED GRAMMAR EMBEDDED IN `scene.json`, PROVEN TO DRIVE A REAL ELEMENT vs OCCT WITH NO NEW `BimObjectType` FIELD, NO SCHEMA BUMP.**
**Task (owner):** resume the reopened pre-freeze work in order; Ⓓ is next (reserve, design-doc-first). Owner ruled Q1–Q3;
build/reserve + revert-verify. `pnpm verify` fully green (**341 tests, +4**; typecheck incl. apps/web, lint, format, reseed-skip).
⚠ **No commit — owner-gated.** (Ⓒ/Entry 49 is also still uncommitted in the working tree — both await the owner.)

- **DESIGNED FIRST (`P5_step5D_family_seam_design.md`), then OWNER RULED Q1–Q3:** **Q1 = embedded in `scene.json`**
  (recommended — self-contained per rule 15, the materials/sections dual: library = palette, the doc embeds copies it
  uses). **Q2 = a FULLY-SHAPED grammar now** (⚠ NOT the recommended opaque envelope — the owner chose to reserve the
  real recipe structure). **Q3 = prefixed ULID** (recommended — `FamilyId = mintPei('family')`, collision-impossible
  across the MANY authors who mint families, the D60 Q1 reasoning; a `TypeId` is namespaced because ONE vendor mints it).
- **THE §1b METHOD (reserve against the CODE, not the prose) FOUND THE REAL FORECLOSURES.** The registries header
  reassures "types are additive registrations." Incomplete for a DATA family: (F1) `Registry.register`
  (`registries.ts:44`) is process-global + throws on a duplicate id — but embedded families are PER-DOCUMENT, so two
  `.bnn`s sharing a family id can't both register; document-scoped resolution is an additive ENGINE change (Parity-D)
  *provided the definitions have a home in the frozen `scene.json`* — they didn't. (F2) rule 15: a `.bnn` with a
  family-typed element MUST carry the definition or the element can't build (worse than a lost density). (F3) — the
  finding I PROVED not assumed: **a data family needs NO new `BimObjectType` field** — it is a `BimObjectType` a loader
  CLOSES OVER the definition to produce; `buildGeometry(ctx)` reads `ctx.params` + the closed-over `def` and emits
  ordinary `BuiltPart`s. (F4) the grammar shape is genuinely unknown and nothing reads it in v1.0.0 — the Q2 fork.
- **THE RESERVED SURFACE — ONE frozen-contract touch + a fully-shaped grammar, all optional/additive:** `Scene.families?`
  (`scene.ts`) — a FIFTH optional absent-defaulted collection on the **`views`/documentation precedent** (NOT in
  `emptyScene()`/`SceneCollection`/the hostile-`.bnn` guard/the dependency graph — nothing authors/reads/invalidates/undoes
  a family in v1.0.0; promotable to a full `SceneCollection` additively when Parity-D's CRUD lands). The grammar
  (`families.ts`, new): `FamilyDefinition` = `parameterSchema` + `defaultClassification`/`defaultDiscipline` + `parts?`
  (each a discriminated `FamilyPrimitive` base — `box`/`extrude`/`revolve` — + ordered `FamilyModifier[]` — `chamfer`/
  `fillet`, edges by a SEMANTIC `FamilyEdgeSelector` never an index, D1) + `children?` (`FamilyChildPlacement`, D59) +
  `hosting?` (`FamilyHosting` — `voidPrimitive`+`leafParts`, a data-authored door). Every scalar is a `FamilyValue`
  (literal or param-ref → parametric; formula-driven via ⓜ). **Every recipe node is a discriminated union + a
  `formatVersion`** ⇒ the uncovered tail (loft/sweep, richer selectors) is an additive MEMBER, and wholesale grammar
  evolution migrates forward — a fully-shaped grammar that still can't foreclose.
- **⚠⚠ NO `BimObjectType` FIELD, NO `Registries` CHANGE, NO `scene.json` SCHEMA BUMP, NO VERB, NO BACKEND.** The only
  frozen-contract touch is the one optional `Scene.families?` key, which rides `{ ...emptyScene(), ...parsed }`
  (`bnn.ts:161`) verbatim — no `SCENE_SCHEMA_VERSION` bump (folds into frozen v2, the 0g/Ⓐ/Ⓒ precedent). The loader
  (`makeFamilyType`), the document-scoped resolver, the CRUD, the library are all Parity-D, additive over what freezes here.
- **THE PROOF (`tests/family-seam.test.ts`, 4 — 2 real OCCT, 2 pure):** ⭐ a fully-shaped `FamilyDefinition` (two box
  parts, every dim a param-ref) → embedded in a scene → **saved + reloaded** → a minimal in-test `makeFamilyType(def)`
  interpreter (closes over the RELOADED def) → an authored element builds a **real solid with EXACT `BRepGProp`
  quantities** (body/cap volume + mass per material, `basis:'exact'`) — proving R1 (the def travels) and F3 (it drives
  OCCT with zero frozen field) **in one shot**; a data family is ASSOCIATIVE (a `setParams` height edit re-derives the
  volume); the FULLY-SHAPED grammar (sketch+polygon profiles, revolve, a modifier, a nested child, the hosted half)
  round-trips byte-identical; absent ⇒ `families === undefined`, no schema bump. **REVERT-VERIFIED:** a probe that drops
  `families` in `loadBnn` fails BOTH the round-trip and the OCCT-build tests (the reloaded def vanishes → the interpreter
  throws); restored + re-green. The interpreter lives in the TEST only — the executable proof the frozen shapes suffice.

**NEXT (Zayd):** row **Ⓔ (D64)** — read `Miqdar_v1.0.0_spec.md` §3.4 and rule *with evidence* whether one optional
analytical field belongs on the frozen type/part for real structural/energy analysis or the PEI-bound side-graph
suffices (owner DELEGATED the call to Zayd). Then Ⓕ (D62/63/65 reservations) → D66 (heap-eviction hook) → owner-gated
FREEZE (step 6). ⚠ Box: installed nothing (pnpm via corepack only); no containers touched, no ports bound; `/tmp` 102M
(own scratchpads).

### Entry 51 — 2026-07-23 — Zayd — **Ⓒ + Ⓓ COMMITTED + PUSHED. OWNER REDIRECT: D64 (Ⓔ) IS GATED ON BUILDING A PROPER MIQDAR SPEC FIRST — new `~/projects/Miqdar` project seeded with the build prompt.**
**Task (owner):** commit + push Ⓒ/Ⓓ; then build a proper, accurate Miqdar spec that meets Bunyan + the BIM-ecosystem
goal, via a prompt for the next Zayd placed in a new `Miqdar` folder next to Bunyan; then continue Bunyan D64 using the
Miqdar spec as evidence.

- **COMMITTED + PUSHED (owner-gated, now authorized):** two commits on `main` (the project's linear direct-to-main
  convention) — `1a0e74b` row Ⓒ (Entry 49, co-authoring merge seam) + `aab5c8b` row Ⓓ (Entry 50, family seam). The
  handoff-log text for both entries rides in the Ⓓ commit (current_state.md carries both). Pushed to
  `origin` (`github.com:Davidian-Abdo/Bunyan`). `pnpm verify` was green (341) before the commits; docs prettier-clean.
- **⚠ OWNER REDIRECT ON D64 (Ⓔ).** D64 asks *with evidence* whether Bunyan must reserve an on-element analytical anchor
  or the PEI-bound side-graph suffices. The existing `Miqdar_v1.0.0_spec.md` is a **FIRST DRAFT** that *asserts* the
  answer (§3.4 row 5 "expected yes ⇒ reserve nothing") rather than *earning* it — the §0a trap. **The owner ruled the
  D64 call may NOT be made from that thin draft.** ⇒ **D64 is now gated on Phase 1: build a PROPER Miqdar v1.0.0 spec**
  (a real product spec, in its own project, sourced, meeting Bunyan's spec discipline), whose ecosystem-contract section
  (the two-graph principle §4.1 + the obligations-on-Bunyan §3.4) is rigorous enough to be the D64 evidence.
- **CREATED `~/projects/Miqdar/`** (a fresh git repo, next to Bunyan — NOT inside it). Seeded with **`START_HERE.md`**
  (the full two-phase build prompt: Phase 1 build the spec + surface the O-M open questions to the owner — esp. **energy
  scope**, code editions, who-can-sign; Phase 2 rule Bunyan D64 from the spec's evidence, record it as a Bunyan Entry,
  repoint Bunyan's Miqdar gate at the new spec, then continue Ⓕ → D66 → freeze) + a short `README.md`. The prompt points
  the next Zayd at the existing draft + normative register (in the Bunyan repo) as starting material to ELEVATE, not
  trust; the Bunyan copies stay put (referenced by the freeze gate + §4g) — migrating them out is an owner call the spec
  session surfaces. ⚠ **Miqdar is a separate location; the Bunyan `git push` does not include it** (no remote yet).
- **⚠⚠ THE NON-COUPLING INVARIANTS STILL BIND** (§4g/§4i): Miqdar may never require analysis code in Bunyan, a second
  Bunyan API, or coupled schedules; the binding is PEI + Clean Delta forever; BIMsync is off-box and untouched.

**NEXT (Zayd):** execute `~/projects/Miqdar/START_HERE.md` — Phase 1 (build the proper Miqdar spec) → Phase 2 (rule
Bunyan D64 with that evidence, record it, repoint the gate) → Bunyan Ⓕ → D66 → owner-gated FREEZE. ⚠ Box: created the
`Miqdar` folder + `git init` only; installed nothing; no containers touched, no ports bound.

### Entry 52 — 2026-07-23 — Zayd — **ROW Ⓔ / D64 RULED FROM EVIDENCE: THE PEI-BOUND SIDE-GRAPH SUFFICES — RESERVE NOTHING ANALYTICAL ON THE TYPE/PART. THE PROPER MIQDAR SPEC WAS BUILT FIRST (`~/projects/Miqdar`); ONE MATERIAL SLOT (`Material.thermal?`) RESERVED FOR THE ENERGY NORTH-STAR.**
**Task (owner, via `~/projects/Miqdar/START_HERE.md`).** Two phases. **Phase 1:** build a proper, sourced Miqdar v1.0.0
spec in its own project, meeting Bunyan's spec discipline, whose ecosystem-contract section is rigorous enough to be
**evidence** for D64 (the reopened freeze gate the owner refused to let be ruled from the thin sketch — the §0a trap).
**Phase 2:** rule Bunyan D64 from that evidence, record it, repoint the gate; then continue Ⓕ → D66 → freeze.
`pnpm verify` fully green (**345 tests, +4**; typecheck incl. apps/web, lint, format, reseed). ⚠ **No commit — owner-gated.**

- **PHASE 1 — THE PROPER MIQDAR SPEC EXISTS (`~/projects/Miqdar/`):** `Miqdar_v1.0.0_spec.md` (elevated from the sketch,
  restructured, sourced), `Miqdar_normative_register.md` (graded, three headline editions ruled), `current_state.md`
  (Miqdar Entry 1), `decisions.md` (M-series + O-M index), `README.md`. **Four owner rulings** via an AskUserQuestion
  round: **energy = structural-only + reserve the thermal slot (M18)**; **editions = Morocco RC BAEL 91-99 core / Algeria
  RPA 2024 / France 1st-gen + planned 2nd-gen (M20)**; **owner is sole tier-4 corpus signer, corpora shrink to fit,
  Morocco is the anchor (M21)**; **spec home = `~/projects/Miqdar`, Bunyan copies retained + repointed (M22)**.
- **⚠⚠ THE D64 RULING — EARNED, NOT ASSERTED (the whole point of the sequencing).** The spec's spine is a **real-frame
  walk (§4)**: a 5-storey RC frame-and-shear-wall building carried `.bnn` → idealization → code checks → *note de
  calcul* → write-back, walked against the **ACTUAL frozen Bunyan code contracts** (`entities.ts`/`room.ts`/`document.ts`/
  `revision.ts`), not the prose. The walk asks of every idealization datum: *could this be a single-valued property of
  the physical element?* **Answer: NO — every datum is either (a) already-readable from the frozen contract** (the
  `LinearMember` axis, `Section`/`Material` props, `loadBearing` (a READ, not a guess), the spatial tree, grids, opening
  positions via `SubShapeRef`, exact `quantities()` — each verified against code in §3.4) **or (b) many-valued per
  physical element.** The clean killer: **effective (cracked) stiffness — the SAME column carries gross EI (service) and
  0.35·EI (seismic drift) AT ONCE, in one project** ⇒ a function of (member, code, limit state, run), **not a property of
  the element, even in principle.** A one-to-many map (a wall → N shells) has the same shape. ⇒ **the analytical anchor
  is `physicalBinding` on MIQDAR's entities, pointing IN; nothing points from Bunyan out to Miqdar. THE SIDE-GRAPH
  SUFFICES; BUNYAN RESERVES NOTHING ANALYTICAL ON THE TYPE/PART.**
- **The two honest counter-probes resolve onto ALREADY-RESERVED lanes (no new field):** an analytical node needs no
  physical binding (derived from connectivity; and `SubShapeRef kind:'vertex'` is already reserved, D54a); a design
  verdict visible in Bunyan uses the reserved `Element.properties?` pset or a documentation Tag (Entry 47); physical
  rebar is Bunyan-native D59 nesting. **This is the §0a trap avoided — the sketch *asserted* "reserve nothing"; the walk
  *demonstrates* it.**
- **⚠ THE ONE EXCEPTION, AND IT IS NOT AN ANALYTICAL ANCHOR (M18, owner-ruled).** The *energy* half of D64 surfaced a
  single **material-property** gap: `core_logic.md` §3.11 prose promised *"thermal conductivity"* and §9 names energy a
  north-star (domain rule 8 forbids foreclosing one), but frozen `Material` had `density` + a `structural?` bag and **no
  thermal property.** ⇒ **RESERVED `Material.thermal?: Readonly<Record<string, number>>`** (`entities.ts`), sibling to
  `structural?`, optional/absent-defaulted, **no `SCENE_SCHEMA_VERSION` bump, no migration.** It is a PHYSICAL property
  single-valued per material (unlike cracked stiffness), so it lives cleanly on the physical graph — it *confirms* the
  two-graph split, it does not violate it. ⚠ **Deliberately NOT folded into `structural?`** (thermal is not structural; a
  sibling is the same cost and does not mislabel). `tests/analytical-anchor-d64.test.ts` (4): optional/additive
  (compile-time) + round-trips the real `.bnn` codec; **revert-verified — deleting the field breaks the root typecheck
  (TS2339 in the test), so the reservation is genuinely load-bearing.** 341 → **345 green.**
- **DOCS UPDATED (Bunyan):** FREEZE GATE row Ⓔ flipped ✅ + gate ⑧ re-examined-and-confirmed (`v1.0.0_imp_plan.md`); P5
  step 6a repointed at `~/projects/Miqdar/Miqdar_v1.0.0_spec.md` §3.5/§4; §4a D64 line + §4g gate + §5 close-order Ⓔ
  updated; the retained Bunyan `Miqdar_*.md` copies got a `SUPERSEDED → see ~/projects/Miqdar` header (M22 — **NOT
  deleted**, they are referenced by the freeze gate; migrating them out fully is a later owner call the header records).
- **⚠⚠ NON-COUPLING HELD.** The ruling adds **no** analysis code to Bunyan, no second API, no coupled schedule. The one
  reserved field is a material property justified by **Bunyan's own** energy north-star (domain rule 8) + owner ruling —
  not "on Miqdar's account." The binding stays PEI + Clean Delta.
- **⚠ NO COMMIT — owner-gated.** Box: pure spec/doc + one optional TS field; no containers touched, no ports bound,
  nothing installed; `du -sh /tmp` clear; live sites untouched. Miqdar is a separate location with no remote — the Bunyan
  push does not include it.

**NEXT (Zayd):** **Ⓕ (D62/63/65)** — the cheap reservations: MEP sweep-op + system/connector type contracts (D62), a DWG
codec seam (D63), Design-Options + phase filters/overrides + area schemes (D65). Design-first where contract-shaping
(the Ⓐ–Ⓓ rhythm — a design doc + owner framing questions before building). Then **D66** — the 4-axis scale measurement
(the heap-eviction contract hook is Zayd's, pre-freeze). Then the **owner-gated FREEZE (step 6)**. ⚠ **Owner-gated: the
Entry-52 work (Miqdar spec + the `Material.thermal?` reservation) is uncommitted; the owner authorizes the commit.**

### Entry 53 — 2026-07-24 — Zayd — **ROW Ⓕ DONE (D62/63/65): THREE OF THE SIX ITEMS NEEDED NO RESERVATION AT ALL, AND THE ONE NOBODY BILLED — THE DESIGN-OPTION EXCLUSION INVARIANT — IS THE ROW'S REAL CONTENT. Ⓐ–Ⓕ ARE NOW ALL CLOSED.**
**Task (owner):** continue Phase 2 — land the remaining reopened pre-freeze work. Row Ⓕ is contract-shaping, so the
Ⓐ–Ⓓ rhythm: design doc → owner framing questions → build + revert-verify. `pnpm verify` fully green (**364 tests,
+19**; typecheck incl. apps/web, lint, format, reseed; `EXIT=0`). ⚠ **No commit — owner-gated.**

- **DESIGNED FIRST (`P5_step5F_reservations_design.md`), then OWNER RULED Q1/Q3/Q4/Q5 (all as recommended).** The doc
  applied a **reservation test** rather than assuming the plan's "cheap reservations (mostly additive)" framing:
  a shape earns a reservation only if it (1) touches a P5-frozen contract, (2) could not be added additively later,
  and (3) is knowable now. ⚠ **Stated once and worth keeping: a reservation that isn't owed is NOT free — it is a
  frozen field nobody reads, and the freeze is the moment we stop being able to delete it.**
- **⚠⚠ THE HEADLINE: THREE OF THE SIX ITEMS THE PLAN LISTED NEEDED NOTHING RESERVED — found by walking, not reading.**
  - **The MEP sweep-along-path/loft OP (D62).** The plan said "kernel ops that do not exist and are reserved as
    additive." But **the protocol froze at the end of P3 and `faceFrame` was added AFTER it** (Entry 30) under **D13**
    (*"adding an op is additive and permitted"*). ⇒ a sweep op in v1.0.x is the **precedented path, not an amendment**.
    Row Ⓕ writes no C++ and touches no op envelope.
  - **The DWG codec seam (D63) — IT ALREADY EXISTS.** `FormatCodec` + `registries.codecs` (`registries.ts:82`) *is*
    the interchange contract, and **domain rule 5** makes a new format an **additive registration**. Nothing to
    reserve. **Asserted in the test** (a DWG codec is registered against the existing contract) so the finding cannot
    quietly rot into a re-opened question. The homeless part is a 2D **underlay** — documentation apparatus, which is
    post-v1.0.0 — **recorded out of scope (owner Q3)**.
  - **Phase filters/overrides + area schemes (D65).** A phase filter is a **view property** over datums that already
    exist (`phaseCreated`/`phaseDemolished`, D54b/D56) and a graphic override is **display** — derived, never stored
    (rule 1/17). And an area was **never stored** (`roomMetrics` derives it, D55), so gross/rentable are **additional
    derivations, not additional fields**: `footprintOf()` already has the centreline and both face-lines in scope, so
    a future `boundaryRule` on the query is purely additive. **Both recorded, nothing reserved (owner Q4).**
- **⚠⚠ THE THING NOBODY BILLED, AND IT IS THE ROW'S REAL CONTENT: THE DESIGN-OPTION EXCLUSION INVARIANT (D65).**
  Design Options' *storage* is cheap (a collection + an element field). But options mean **a document deliberately
  contains MUTUALLY-EXCLUSIVE elements** — Option A's wall and Option B's wall both sit in `scene.elements` and
  **exactly one is real.** Today `quantities()` and the Clean Delta enumerate elements with **no notion that some are
  hypothetical** ⇒ ship it naively and **a schedule silently double-counts** and **Planitor receives work packages for
  a scheme nobody is building.** That is **domain rule 15's failure mode** (a wrong number wearing the `exact` badge)
  reached by a new road, and **rule 16's** "one physical thing is one element" quietly broken. **Owner ruled the
  invariant be written INTO the frozen contract** — the **`Grid.geometry`/ⓥ precedent** (where a reserved field changes
  how an existing one must be read, the consumer-facing rule is written at reserve time, not found in the field). It
  ships as **tested behaviour** (`isElementActive`), not prose, so the three consumers implement one rule, not three.
- **RESERVED (the owed shapes), all optional + absent-defaulted, NO `SCENE_SCHEMA_VERSION` BUMP:**
  `scene.systems?` + `SystemDefinition` (`systems.ts`, D62) · `Element.systemId?`/`connectors?` · `scene.designOptions?`
  + `DesignOption`/`ActiveOptions`/`isElementActive` (`designoptions.ts`, D65) · `Element.designOptionId?` ·
  `ViewCommon.designOptionIds?` (additive twice over — it lands on a shape that is itself a row-Ⓐ reservation).
- **⚠ A CONNECTOR IS AUTHORED PLACEMENT, NOT A `SubShapeRef` — and its frame is load-bearing.** `Connector.at`/
  `.direction` are in the element's **OWN BUILD FRAME** (owner-confirmed): an element is authored in its own frame and
  *then* placed, and **`transform` mints no identities** (D25) ⇒ **moving or rotating a duct cannot invalidate its
  ports.** World coordinates would have re-introduced exactly the positional fragility the naming system exists to
  refuse. And because a connector is authored (not derived), **it never enters the naming path at all** — the identity
  system costs nothing. `Connector.name` is unique within its element, the `Part.name`/`StyleLayer.name` discipline.
- **⚠ THE ⓣ LESSON APPLIED *BEFORE* IT COULD BITE AGAIN (owner Q1 = full reserve).** 0g reserved NOUNS without ARGS and
  had to come back for `argsSchema` (0g.2). `Command.argsSchema` freezes at the **same** step 6 as `Element`, so row Ⓕ
  reserved both in ONE step: `createElement` gains `systemId`/`connectors`/`designOptionId`, and an element can be
  **born** with them. ⚠ **One level deeper, and it would have bitten a third time:** `ParamField.refTo` is a **closed
  string union** with no `'system'`/`'designOption'` member — typing the args as bare strings would have forced whoever
  builds MEP/Design-Options to widen a **frozen** union later. **Widened pre-freeze**; verified **no body switches on
  `refTo`** (it is declarative metadata driving a future picker + the generated tool-list), so the widening broke nothing.
- **`tests/step5F-reservations.test.ts` (19, pure).** Compile-time optional/additive · the exclusion invariant as
  behaviour (incl. *"exactly one variant of a set is ever active"* and *"an element naming an undefined option is
  EXCLUDED, not included"* — a broken ref must not double-count) · the two recorded-only findings asserted · real-`.bnn`
  round-trip · the verb half. **REVERT-VERIFIED:** stripping `connectors?`/`designOptionId?` breaks the root typecheck
  (11 errors). 345 → **364 green.**
- **⚠ PROCESS NOTE, RECORDED HONESTLY:** the first `verify` run **FAILED** at `format:check` (3 files) — I had read a
  piped `tail`'s exit code, which is the *pipeline's*, not pnpm's. Fixed with `prettier --write` and re-run capturing
  the real exit code (`EXIT=0`). **Check the step that actually failed, not the last line of a pipe.**
- **⚠ NO COMMIT — owner-gated.** Box: pure TS data shapes + docs; no containers touched, no ports bound, nothing
  installed; live sites untouched.

**NEXT (Zayd):** **D66 — the 4-axis scale measurement** (edit latency · cold load · draw calls · heap), the **last
pre-freeze item**. ⚠ Partly Amer's (the renderer half), but the **heap-eviction contract hook is Zayd's and is
pre-freeze** ("must be known before P5 freezes"); a failed single-threaded target **reopens D8** (multithreading). ⚠ And
`review_P5.md` #3 stands: **re-run the D29 5-storey measurement WITH the O(N²) join resolver in the path** — the headline
numbers predate joins. Then the **owner-gated FREEZE (step 6)**, which also tags the Ⓐ–Ⓕ reservations frozen.
⚠ **Uncommitted and owner-gated: Entries 52 + 53 + the Miqdar project.**

### Entry 54 — 2026-07-24 — Zayd — **D66 CONTRACT HALF DONE: THE HEAP-EVICTION HOOK NEEDS NOTHING RESERVED (additive by construction) — SO THE CONTRACT IS SAFE TO FREEZE ON SCALE GROUNDS. THE REMAINING SCALE WORK IS AMER'S AND BELOW THE FREEZE LINE.**
**Task (owner):** "commit then start D66." Committed Entries 52+53 (`origin/main` @ `e737aa9`) + Miqdar Entry 1 (local
`26b442c`, no remote), then started D66 — the last pre-freeze item. `P5_step9_D66_scale_design.md`. **No code change**
(an evidence-based contract ruling, like D64); the two headless scale harnesses re-run green as part of the suite.

- **⚠⚠ THE ONLY FREEZE-GATING PART OF D66 IS THE HEAP-EVICTION CONTRACT HOOK — and it is RULED: reserve NOTHING,
  ADDITIVE BY CONSTRUCTION.** The imp_plan feared heap-eviction/lazy-build might be a v1.0.0 requirement that *touches
  contracts*. Two findings retire it: **(i)** the heap FITS (below), so eviction is not required; **(ii)** even as a
  v1.0.x option, eviction FORECLOSES NOTHING — the same recipe-is-truth logic that earned D64. Verified against code:
  - *"any built solid may be dropped and rebuilt from the recipe"* = **the core invariant** (rule 1), and the D29
    cold-load test **proves it** (a fresh `DocumentContext` rebuilds every solid from `scene.json` alone, byte-identical,
    `brokenRefs()==0`; if the WHOLE model rebuilds, any SUBSET does — that IS lazy-build/eviction).
  - the evicted state already exists: **`ElementState.stale`** = recipe present, solid not built.
  - the release mechanism is **ALREADY FROZEN**: **`releaseShape`** is in the frozen protocol (P3), and the kernel-client
    **already fires it** for dropped handles (`kernel-client/src/client.ts:9`).
  - the keep-live POLICY (which solids to hold, by camera/selection/viewport) is **RUNTIME state, never `scene.json`**
    (persisting it would violate recipe-is-truth exactly as storing a mesh would) ⇒ **no frozen-type field.**
  - the build/evict-on-demand API is an **additive DocumentContext method** (D19/rule 5), not an edit to a frozen shape.
  ⇒ **The freeze does not — and could not — foreclose eviction, because eviction is recipe-is-truth exercised on a
  subset.** D64's finding in a second guise: a runtime concern binds to the recipe; nothing new on the frozen data shapes.
- **MEASURED FRESH (2026-07-24, this box, box healthy — 854 MB free / 2.28 GB avail; the heap harness is capped at ~310
  solids and extrapolates via a slope, never building 16k solids on a 3.7 GB box):**
  - **(a) HEAP: 16.2 KB/live-solid + 64 MB floor → 0.31 GB at 10,000 elements. FITS** (1.5 GB tab budget; 4 GB WASM32
    cap). Confirms Entry 29 on the current kernel. The harness's own verdict: eviction stays a v1.0.x option.
  - **(c) COLD LOAD: 38.1 ms/element → ~6.35 min at 10k, single-thread, NO cache.** Too slow for a good first-load UX —
    but every lever is already-ruled and **additive**: the D29 BREP cache (RULED SHIP; its ops reserved), `instantiate`
    (RESERVED), multithreading (D8, v1.0.x — deploy config, not a `scene.json` contract). **None touches a frozen shape.**
  - **(b) DRAW CALLS + (d) EDIT LATENCY: Amer's — browser-side, unmeasurable headless.**
- **⚠ THE O(N²) JOIN RESOLVER IS NOT IN THESE NUMBERS, AND THAT IS CORRECT.** The scale fixture's wall is
  `{length,height}`-parameterised, so `baselineOf` returns undefined and `resolveJoins` early-returns — the scan never
  fires. review_P5 #3 already measured it in isolation (~4.2 s at ~2,000 walls) and **ruled it a v1.0.x perf item, NOT a
  freeze item** (fixable with an endpoint spatial hash, no contract change). Re-deriving it is not the freeze-gating work.
- **⇒ THE CONTRACT IS SAFE TO FREEZE ON SCALE GROUNDS.** The only scale question that could foreclose a contract — the
  heap-eviction hook — is resolved (reserve nothing). Every remaining lever (cache, instantiate, MT, renderer batching)
  is additive.
- **⚠⚠ OWNER RULED THE FREEZE-READINESS QUESTION: HOLD (2026-07-24).** I put FREEZE NOW (recommended — contract safe,
  remaining perf additive) vs HOLD (wait for Amer's numbers). **The owner chose HOLD:** the freeze does NOT proceed until
  **all four scale axes have a number** and the **D8 single-thread verdict** is made. ⇒ **THE LAST PRE-FREEZE BLOCKER IS
  NOW AMER'S, NOT ZAYD'S** — the two missing axes (draw calls, edit latency) are the browser scale page (imp_plan P4 step
  9b), which a headless box cannot run. Nothing about the contracts changes; the owner is holding the *act* until the
  *measurement* is complete (a higher bar than "the contract is safe," and his to set).
- **⚠ Entry 54 = docs only; owner ruled COMMIT + PUSH.** Committed + pushed with this entry (see below). Box: read +
  measure only; nothing installed, no containers touched, no ports bound; the scale harnesses stayed within box limits.

**NEXT — ⚠ THE FREEZE IS BLOCKED ON AMER, FOR THE FIRST TIME:**
- **Amer (browser, THE pre-freeze blocker):** build the scale page (imp_plan P4 step 9b), produce **draw calls** +
  **edit latency** at ~10,000 elements with a written recommendation each — the two numbers the freeze now waits on.
  Then the **D8 single-thread verdict** (renderer wall vs kernel wall) can be made.
- **Zayd (headless):** the D66 contract half is done; nothing further owed until the freeze is called. Heap + cold-load
  stand (Entry 54 §1); the join O(N²) is a v1.0.x perf item (review_P5 #3).
- **The FREEZE (step 6)** unblocks only once those two axes exist + the D8 call is made — then the Architect signs off and
  the contracts freeze (tagging the Ⓐ–Ⓕ reservations + `Material.thermal?`). ⚠ **Committed + pushed: Entries 52+53+54.**

### Entry 55 — 2026-07-25 — Amer — **D66 AXES (b) + (d) MEASURED IN A REAL BROWSER: THE LAST TWO SCALE NUMBERS EXIST. BOTH COLLAPSE TO ONE WALL — THE ~30k-DRAW-CALL ONE-MESH-PER-PART REDRAW — WHICH MULTITHREADING (D8) DOES NOT TOUCH. THE FIX IS RENDERER BATCHING, ADDITIVE, NO CONTRACT CHANGE.**
**Task (owner, via the Entry-54 hold):** build the browser scale page (imp_plan P4 step 9b), load a ~10k-element model,
and produce a real number for **(b) draw calls / frame time** and **(d) edit latency** at ~10,000 elements, each with a
one-paragraph recommendation; **raise D8 (pull multithreading into v1.0.0?) with the owner — do not decide it.** Built the
page, ran it on the real OCCT kernel + real three.js on this box's real GPU. `pnpm verify` fully green (**370 tests, +6**;
typecheck incl. apps/web, lint, format, reseed). ⚠ **No commit — owner-gated.**

- **WHAT I BUILT (`apps/web/src/scale/` + `scale.html`, plan P4 step 9b — the browser half the headless box cannot run).**
  A dedicated scale page that boots the REAL kernel + document through `bootstrap()` (**D19 — the app never holds a
  `KernelClient`; it authors through `DocumentContext` and draws through `RenderGateway`**), builds a small REAL reference
  set of composite walls through the command layer (D30 — an element is its PARTS; each layer tessellated), then fills ONE
  three.js scene — mirroring the shipped `Viewport` byte-for-byte (I EXPORTED `toBufferGeometry`/`buildEdgeSegments`/
  `createPartMaterial`/`EDGE_COLOR` so the harness builds meshes with the *identical* code path, not a lookalike) — to the
  ~16,000-part target and measures. ⚠ **NO BATCHING (plan step 9b is explicit): measure the as-built one-mesh-per-part
  architecture FIRST; batching is the decision the number informs, not a thing to sneak in — "a rewrite, not an
  optimisation".**
- **⚠ METHOD — the same discipline the headless harnesses use, and box-safe (§6a: 3.7 GB RAM, live public sites).** The
  renderer axes are a function of what is IN the scene (draw calls + triangles), not of how the geometry was produced — a
  box the kernel built and a box cloned from it render identically. Building 16k real OCCT solids in a tab is ~10 min and
  strains the box (the heap harness caps at ~310 solids and EXTRAPOLATES for the same reason). So filler meshes SHARE a pool
  of ~36 real composite-wall layer geometries (one draw call each — three.js does not auto-instance a shared geometry),
  grid-spread with a fit camera (nearly all in-frustum — the honest worst case a CAD user hits zoomed-to-fit). **Draw calls
  = mesh count EXACTLY; frame time is draw-call-bound and faithful; memory stays a few pooled buffers.** The (d) edit runs
  the REAL kernel + document on a REAL wall (`core.setParams`) — only the filler is cloned.
- **⚠ THE HARDWARE, DISCLOSED (it is what makes the absolute number legible).** Real GPU, not a software rasterizer:
  **ANGLE / Intel UHD Graphics (Direct3D11)** — a genuine low-end INTEGRATED GPU, the most common class in laptops.
  Canvas 795×684, `devicePixelRatio` 1. The draw-call COUNT is hardware-independent; the frame TIME scales with the GPU, so
  **a discrete GPU would be materially faster** — Intel UHD is a fair "modest laptop" floor, not the best case.

**⚠⚠ (b) DRAW CALLS + FRAME TIME — measured, this box, Intel UHD:**
```
   parts   draw calls   tris    ms/frame   p95      fps
    1,000     2,036      12k       36.9     75.1    27.1
    2,000     4,016      24k       69.8    162.5    14.3
    4,000     7,948      48k      139.2    211.9     7.2
    8,000    15,762      95k      363.8    548.3     2.7
   12,000    23,398     140k      525.1   1009.4     1.9
►  16,000    30,746     184k      606.3    834.2     1.6   ← the 10,000-element target (~1.6 solids/el)
```
**At the target: ~30,700 draw calls, ~606 ms/frame (1.6 fps).** ~1.9 draw calls per part — because the Viewport draws a
face `Mesh` AND an edge `LineSegments` per part (2× the part count, as designed). Frame time is linear-to-slightly-
superlinear in parts (the slight super-linearity is `scene.updateMatrixWorld` over a growing graph — real, and part of the
honest cost). **~0.02 ms per draw call on this GPU.** This is the plan's own extrapolation (§1a: "~16k draw calls, 10–20×
a 60 fps budget"), now a MEASURED number and worse than the extrapolation because edges double the calls: **~30k calls is
~20× over a 16 ms frame budget.**

**⚠⚠ (d) EDIT LATENCY — one incremental edit (`setParams` on one wall), at rising resident scale:**
```
   resident   changed   total ms   rebuild   retess   install   next-frame
        0        3        46.6       29.4     16.7      0.4        0.9      ← cold JIT
    8,000        3        21.4        7.0     13.8      0.5      194.1
   16,000        3        23.4        5.0     18.1      0.3      568.5      ← the target
```
**THE INCREMENTAL EDIT COMPUTE IS ~23 ms AND FLAT vs SCALE — step 2b works.** Only **3 of 16,000 parts** re-tessellate
(the changed wall's 3 layers); the kernel rebuilds ONE element (~5 ms), the 3 parts tessellate (~18 ms), the mesh swap is
~0.3 ms. **The kernel is NOT the wall at edit time** (the redraw-not-kernel finding of §1a, now confirmed from the browser
side). **BUT the frame the user waits to SEE the edit is ~568 ms** — the (b) render cost, because after the swap the whole
30k-draw-call scene must render once. **⇒ end-to-end perceived edit latency at target ≈ 23 ms compute + ~570 ms render ≈
~590 ms.** The compute half is solved; the render half is the wall.

- **⚠⚠ THE FINDING: BOTH AXES COLLAPSE TO ONE WALL — the one-`THREE.Mesh`-per-part redraw at ~30k draw calls.** (b) IS that
  wall; (d)'s perceived latency is that wall plus a flat ~23 ms of kernel+tessellation. The incremental redraw (2b, Entry 26)
  already did its job — it made the edit COMPUTE flat and cheap, exactly as designed — so what remains is purely the
  per-frame *render* of 30k independent draw calls. **The fix is renderer BATCHING-BY-MATERIAL / GPU INSTANCING** (a real
  building has few DISTINCT part geometries per type; instancing collapses N identical meshes to ~1 draw call). It is
  Amer's browser-side work, **additive, below every frozen contract**, and its kernel partner `instantiate` is **already
  RESERVED in the frozen protocol** (§4j-3). The plan calls it "a rewrite not an optimisation" — a RENDERER rewrite, **not a
  contract change.**

- **⚠ RECOMMENDATION (b) — reachable single-threaded; multithreading is the wrong lever.** ~30k draw calls at ~606 ms is a
  renderer-ARCHITECTURE problem (too many draw calls), not a compute-throughput problem. **D8 / multithreading attacks the
  KERNEL rebuild (§1a — "not one of the three kernel levers touches the redraw"), so it would NOT move this number.** The
  unlock is batching/instancing on the three.js side, single-threaded: merge parts sharing a geometry+material into one
  instanced draw, batch edges, add frustum-culling/LOD. That drops ~30k calls toward the low hundreds and the frame back
  under budget — **no thread, no contract, no kernel change.**
- **⚠ RECOMMENDATION (d) — the kernel is already fast enough; this is the SAME renderer-batching fix.** The edit compute is
  ~23 ms and flat (2b + one-element rebuild) — the kernel does not need multithreading to make an EDIT interactive. The
  ~570 ms a user waits is the post-edit frame, i.e. (b). Once (b)'s batching lands, the post-edit frame is interactive and
  (d) becomes ~23 ms compute + one cheap frame. **⇒ neither interactive axis needs D8.**

- **⚠⚠ D8 (multithreading into v1.0.0?) — RAISED WITH THE OWNER, NOT DECIDED (as instructed; imp_plan step 9c: "raise it,
  do not re-decide it").** The evidence says the two INTERACTIVE axes (b)+(d) do **not** need multithreading — they are a
  single-threaded renderer-batching fix. The axis where D8 would actually help is **COLD LOAD** (Entry 54: ~6.35 min
  single-thread), which is Zayd's kernel wall and already has additive levers (D29 cache RULED SHIP, `instantiate`
  RESERVED). **My recommendation: do NOT pull D8 into v1.0.0 on the strength of the renderer axes — they don't need it; the
  renderer batching (additive) is the real unlock, and cold-load's own levers are additive too.** But **D8 is the owner's
  call and it is additive either way** (MT is COOP/COEP + `SharedArrayBuffer` deploy config, not a `scene.json` contract —
  Entry 54 §4), **so it does not gate the freeze.**
- **⇒ ALL FOUR SCALE AXES NOW HAVE A NUMBER** (heap 0.31 GB FITS · cold load ~6.35 min · **draw calls ~30k / ~606 ms · edit
  ~23 ms compute + ~570 ms render**), and the D8 verdict is made and surfaced. The Entry-54 owner HOLD condition ("all four
  axes + the D8 verdict") is **satisfied.** Nothing measured forecloses a frozen contract (confirms Entry 54 §2/§3): every
  remaining lever — renderer batching, `instantiate`, the D29 cache, MT — is additive. **On the evidence the contracts are
  safe to freeze on scale grounds; whether to FREEZE now is the owner's act (P5 step 6).**
- **VERIFICATION + fidelity notes.** `pnpm verify` green (**370 tests**; the pure `percentile` helper is unit-tested —
  `apps/web/src/scale/stats.test.ts`, 6 — the rest is a WebGL measurement, exercised only in a real browser). The page is
  gated: `scale.html` is a second vite build input, and apps/web's typecheck/lint/format cover the new files (the P4-step-0
  gate). ⚠ **Filler geometry is cloned from real composite-wall LAYER solids (rectangular prisms — the simplest real part),
  so per-part TRIANGLES are a conservative lower bound; the DRAW-CALL count — the axis's binding cost — is exact.** ⚠ A
  weak-GPU caveat is honest: the ~606 ms is Intel-UHD-integrated; a discrete GPU is faster, but the ~30k-draw-call COUNT and
  the "20× over budget" shape are hardware-independent and are the real finding.
- **⚠ NO COMMIT — owner-gated.** Box: dev server on :5173 during the run then STOPPED; the kernel WASM + up to ~30k meshes
  lived in the browser tab (peaked well within the tab, box stayed healthy); no containers touched, the two live public
  sites untouched, nothing installed beyond the existing workspace (`pnpm install` linked the two packages Zayd added —
  `@bunyan/types`, `@bunyan/sketch-solver`).

**NEXT:**
- **Owner:** the freeze's Entry-54 HOLD condition is met (four axes + D8 verdict). **The FREEZE (step 6) is now an owner
  act** — sign off and tag `SubShapeRef`/`BimObjectType`/`Command`/`scene.json`/`ParamSchema`/`UndoableEdit` frozen (with
  the Ⓐ–Ⓕ reservations + `Material.thermal?`). And the D8 call: my recommendation is to keep multithreading v1.0.x (the
  interactive axes don't need it); confirm or overrule.
- **Amer (post-freeze / parallel, NOT a freeze blocker):** the renderer-batching / instancing rewrite (the (b)+(d) unlock)
  · P4.5 interaction model · browser storage · WebGPU + fallback · service worker/PWA. All additive, all below the freeze.
- **Zayd:** nothing owed on scale; the join O(N²) endpoint index stays a v1.0.x perf item (review_P5 #3).

### Entry 56 — 2026-07-25 — Amer — **BROWSER STORAGE SHIPS: a real IndexedDB `StorageAdapter` + Autosave + Save/Open/Recover, wired into the app and verified in a real browser. The §3 "No browser storage" gap is closed. NO frozen contract touched.**
**Task (owner):** after the scale-page blocker was discharged (Entry 55, kept UNCOMMITTED — owner-gated), the owner chose
"another Amer track." Picked **browser storage** — the one entirely-missing foundation piece (§3 NOT-built: "No browser
storage — FSA/OPFS/IndexedDB behind `StorageAdapter` … **Amer's** (cannot be verified headless)"). It pairs with the
`.bnn` codec + `Autosave` Zayd already built, touches no frozen contract, and is fully verifiable in a real browser.
`pnpm verify` fully green (**375 tests, +5**; typecheck incl. apps/web, lint, format, reseed). ⚠ **No commit — owner-gated.**

- **WHAT I BUILT (`apps/web/src/storage/`).** The document layer defines the `StorageAdapter` SEAM (`read`/`write`/`remove`/
  `list` over `Uint8Array`) + `Autosave` + the `.bnn` codec, and keeps a `MemoryStore` so the round-trip is tested
  headlessly — but ships NO browser implementation on purpose ("code I cannot exercise is code I must not claim to have
  verified", `bnn.ts`). This is that implementation:
  - **`IndexedDbStore`** (`indexeddb.ts`) — a promisified IndexedDB `StorageAdapter`: one object store, string keys →
    `Uint8Array`, lazy shared connection, `write` COPIES the bytes (`.slice()`) so a subarray view never persists its whole
    backing buffer, `read` normalises back to `Uint8Array`. ⚠⚠ **`list()` returns EVERY key via `getAllKeys()` with no
    caching** — the property `Autosave`'s counter-seed depends on (the "saved 9999, recovered 1300" data-loss bug).
  - **The reload-based OPEN + Save/Delete/Autosave/Recover UI, wired into `App.tsx`.** A "Files" panel: name → **Save**
    (`saveBnn` → `store.write('doc/<name>.bnn')`), a list with **Open**/**Delete**, and a **Recover** banner on boot when a
    newer autosave exists. **Autosave** snapshots the whole `.bnn` into the ring 1.5 s after each edit. `bootstrap()` gained
    an optional `InitialDocument` — opening a file constructs the doc over the loaded scene and `rebuildAll()`s every solid
    from the recipe (the D29 cold-load path, now in the browser).
  - ⚠⚠ **THE MOAT RULE HONOURED: Save persists `doc.changeFeed()` (the journal) + `doc.revision`, NEVER `doc.history()`**
    (the capped undo stack — the moat-losing bug, plan step 10). Both the explicit Save and Autosave use `changeFeed()`.
  - **OPEN is reload-based (`documentStorage.ts`):** the shell is built around ONE `DocumentContext` from `bootstrap()`;
    swapping a loaded doc in place would thread a new doc + agent surface + reset all state. Instead Open parks the store key
    in `sessionStorage` and reloads — the boot path loads that file instead of seeding the demo. Robust, and a document
    switch IS a clean boot over the chosen scene.
- **⚠⚠ THE STRICTMODE BUG I HIT AND FIXED — the exact class Entry 23 already warned about.** First cut of the open path
  booted the DEMO, not the file: `takeOpenRequest()` read-and-CLEARED `sessionStorage`, and under StrictMode the effect
  double-mounts — the DISCARDED first mount consumed+cleared the key, so the SURVIVING mount saw `null`. **Fix: memoise the
  taken key at MODULE scope** (`takenOpenKey`), so both mounts of one page load read the SAME value, while a real reload
  (fresh page load, module re-evaluated) still returns to the demo. Same lesson as the `window.bunyan` StrictMode race:
  a consume-once action must survive the double-mount. **Verified fixed** (below).
- **VERIFIED IN A REAL BROWSER (the only place browser storage can be, the scale-harness precedent):**
  - **`storage-check.html`** — an asserting self-check (`storageCheck.ts`) that runs the adapter + `Autosave` contract
    against REAL IndexedDB (fresh throwaway DB, deleted after). **8/8 PASS**, including the two that matter: ⚠⚠ **a fresh
    `Autosave` over a store with 3 snapshots writes `autosave-4`, NOT `autosave-1`** (cross-session ring continuation — the
    data-loss gotcha, the case a same-instance test cannot see), and the ring prunes to depth keeping the newest. This is the
    browser-side "test" for browser-only code.
  - **The app, end to end:** saved a scene → `doc/house-b.bnn` landed in IndexedDB (1.6 KB, ZIP magic `PK\x03\x04`); edited
    the wall to a DISTINCT `length: 7000` (via `window.bunyan.execute` — the agent path, D19) and saved; **opened it via
    reload → booted "Open: house-b" with `length: 7000` (not the demo's 4000), state `valid`, geometry rebuilt, zero console
    errors** — proving Save → `loadBnn` → `rebuildAll` round-trips the real scene. The Autosave + Recover banner appeared on a
    fresh boot.
- **⚠ NO FROZEN CONTRACT TOUCHED, and it is not a freeze item.** `StorageAdapter`/`Autosave`/`saveBnn`/`loadBnn` all
  pre-exist; `IndexedDbStore` is an app-layer IMPLEMENTATION of the seam (D19-clean — no `KernelClient`, it only moves
  bytes); the `bootstrap()` `InitialDocument` param and the App UI are app-local. No `scene.json`/`SCENE_SCHEMA_VERSION`/
  verb/protocol change. Storage was always "Amer's, below the freeze" (§3) — this closes it without moving a frozen byte.
- **GATING.** `storage-check.html` is a third vite build input (built + gated). apps/web typecheck/lint/format cover the new
  files (the P4-step-0 gate). The pure helpers (`docKey`/`docName`/**`latestAutosaveKey`** — the recover-key selection, which
  must pick the highest counter NUMERICALLY not lexically, the `autosave-10 > autosave-2` trap) are unit-tested in Node
  (`documentStorage.test.ts`, 5) — the IndexedDB adapter itself is browser-verified. **375 green.**
- **⚠ NO COMMIT — owner-gated.** ⚠ **Still uncommitted and owner-gated: Entry 55 (the scale page) AND Entry 56 (storage).**
  Box: dev server on :5173 during verification then STOPPED; the app wrote a couple of throwaway docs into the local `bunyan`
  IndexedDB (dev-machine data, harmless); no containers touched, live public sites untouched, nothing installed.

**NEXT (Amer, all post-freeze / parallel — none blocks the freeze):** the renderer-batching / instancing rewrite (the (b)+(d)
unlock, Entry 55) · P4.5 interaction model (gated on the baseline-Wall) · a File System Access adapter behind the same seam
(save to real files the user picks — an additive second `StorageAdapter`) · WebGPU + WebGL2 fallback · service worker/PWA ·
Cloudflare deploy. **The freeze (step 6) remains the owner's act** (Entry 55: four axes + D8 verdict done).

### Entry 57 — 2026-07-25 — Zayd — **THE PRE-FREEZE ADVERSARIAL SWEEP (owner-authorised in place of freezing): IT FOUND A DEFECT IN A RULE D65 HAD ALREADY PUT INSIDE THE FROZEN CONTRACT — THE DESIGN-OPTION EXCLUSION DID NOT CASCADE OVER THE HOSTING EDGE, AND A CONSUMER COUNTED 4 WINDOWS WHERE 1 WAS CORRECT. FIXED (D67) + REVERT-VERIFIED. THE SWEEP'S SECOND FINDING IS THAT THE MODEL STILL CANNOT BE ENUMERATED.**
**Task (owner):** all pre-freeze rows Ⓐ–Ⓕ + D66's four axes were closed and the freeze was an owner act. Offered FREEZE NOW
(recommended) vs one more adversarial sweep; **the owner chose the sweep** — *"fix it, and keep sweeping"* — and separately
**DECIDED D8: multithreading STAYS v1.0.x** (Amer's Entry-55 recommendation confirmed; it was "raised, not decided" until now).
`pnpm verify` **387/387 green** (375 → +12), real exit code captured.

- **⚠⚠ THE FINDING (D67, new row Ⓖ — `P5_step5G_option_cascade_design.md`). D65 ruled the exclusion invariant INTO the frozen
  contract** — not merely into storage — *"so the three consumers implement the SAME rule instead of three slightly different
  ones."* It shipped as `isElementActive`, tested, revert-verified, 19 assertions. **It read only the element's OWN
  `designOptionId`, and its signature `(element, options, active)` handed it NO MODEL — so it was structurally incapable of
  asking what the element hangs off.** Measured against the real kernel, two real facade schemes, `brokenRefs()==0`:
  ```
  Scheme A (chosen):     1 wall, 1 window        Scheme B (not built):  1 wall, 3 windows
    active WALLS   = 1   ✓        active WINDOWS = 4   ✗ (correct: 1)
    ⇒ all 3 spurious windows are hosted on the wall THE SAME RULE JUST EXCLUDED — each a window with no wall
  ```
  **This is verbatim D65's own stated failure mode** (*"a schedule double-counts and publishes work packages for a scheme
  nobody is building"*), reached by the one road D65 did not walk: **the hosting edge.** The author tags the WALL — the natural
  authoring act, and the only one Revit asks for — and the windows follow it in the model but not in the rule.
  ⚠ **Why pre-freeze and not an ordinary bug: the defect is in the SIGNATURE, not the body.** Correcting it later changes a
  helper D65 deliberately froze **for three products to call** — the exact cross-product amendment the freeze exists to prevent.
- **THE EDGE INVENTORY (the §1b method turned on the rule itself — *which edges make one element's reality depend on another's?*):**
  **hosting (`hostId`) — BROKEN, measured.** **Generated children (D59 Model A) — ✅ SAFE BY CONSTRUCTION:** they are not
  `scene.elements` rows, so a consumer never enumerates them separately and they are excluded WITH their parent. **D59's
  derived-children ruling pays off a second time.** **Manual groups (`parentElementId`, reserved) — the same hole, dormant**;
  the rule is now written for that edge too, so v1.0.x groups land additively.
- **THE FIX (owner-ruled shape: "widen the rule to see the model").** `isElementActive(element, scope, active?)` where `scope`
  is the document (`Scene` satisfies it structurally). An element counts iff **its own option is active AND every element it
  hangs off is active.** ⚠ It is a **TRAVERSAL, not a chain walk** — an element may hang off `hostId` AND `parentElementId` at
  once, and following only one would silently ignore the other, which is the shape of the very defect being corrected. Edge
  semantics each match an existing precedent: **a missing ancestor ⇒ excluded** (the broken-reference precedent — counting it
  bills a window into thin air); **a cycle ⇒ excluded and it TERMINATES** (the `buildChildrenTree` cycle-guard precedent —
  a hostile `.bnn` must break predictably, never hang). New exported types `OptionedElement`/`OptionScope`.
  **No `SCENE_SCHEMA_VERSION` bump, no new field, no verb, no stored byte** — a correction to a frozen RULE.
- **⚠ REVERT-VERIFIED:** neuter the ancestor walk ⇒ **8 tests fail, the headline one reproducing the original defect exactly —
  `expected 4 to be 1`, `{ walls: 1, windows: 4 }`.** `tests/option-cascade-d67.test.ts` (12, real OCCT — the two-scheme
  building is real geometry, not hand-made objects; the §1b method is what found this). `tests/step5F-reservations.test.ts`
  updated to the new signature (19, still green).
- **⚠⚠ THE SWEEP'S SECOND FINDING — THE MODEL CANNOT BE ENUMERATED, AND THREE SEPARATE CONSUMERS ALL NEED THAT ONE QUERY.**
  Not freeze-blocking (a query is additive, D19/rule 5) — but it is on the moat's critical path and it is the design input for
  the Clean Delta exporter. `scene.elements` is the AUTHORED ROWS, which is **not** the set of real elements:
  - **it MISSES generated children** — a 3×2 curtain wall is **1 scene row and 17 real elements**; a schedule over
    `scene.elements` misses **16**. A curtain-panel schedule is completely standard in Revit.
  - **it INCLUDES non-active design options** — that is D67 above; the rule now exists but nothing applies it.
  - **it INCLUDES voids** — and `quantities()` on an Opening still **throws** (*"has no built geometry"*), so the naive
    project-wide loop still dies on the first window, exactly as `review_P4.md` measured on **2026-07-14**. Still zero code
    **42 days and 13 entries later**, while P5 was declared closed twice — **§1c-7's disease, third occurrence.**
  - **there is no LBS/ancestry API** (`DocumentContext` has no container-path method) and **`QuantityBreakdown` carries no
    container address** — so the per-container roll-up the plan demands (spec §7a, Planitor's Location Breakdown Structure)
    has nowhere to land. ⚠ Two towers themselves are fine — `Site → Tower A/B → Levels` builds correctly (probed).
  ⇒ **ONE missing query serves all of it:** enumerate every real element (walking generated children), excluding non-active
  options, skipping voids by construction. **This is the plan's own instruction** — *"MAKE IT A COMMAND/QUERY, NOT A LOOP EVERY
  CONSUMER REWRITES"* — and *"a producer that cannot enumerate the model's quantities cannot produce a Clean Delta."*
- **RECORDED, NOT DEFECTS:** hosting an opening on a generated child is **refused cleanly** (*"no element …/panel.r0c0 in this
  document"*) — a capability gap vs Revit, but predictable breakage beat silent wrongness and `hostId` can express it, so it is
  additive. The journal for a composite edit names only the **parent** row (`rebuilt: [curtainwall-…]`, before/after params) —
  **correct** under Model A (children re-derive from the recipe), but a panel-level delta requires the same enumeration query.
- **⇒ THE SWEEP FOUND NO CONTRACT FORECLOSURE BEYOND D67.** Every other gap is an additive query. **On the evidence the
  contracts are now safe to freeze** — and one real defect was caught in a rule that had already been declared frozen-contract,
  which is precisely what the sweep was authorised to find.
- **Box:** read/measure/build only; `pnpm verify` ×5; nothing installed, no containers touched, no ports bound; `/tmp` 10 MB;
  both live public sites up throughout. ⚠ **UNCOMMITTED — owner-gated.**

**NEXT:**
- **Owner:** **the FREEZE (step 6) is again the owner's act** — the sweep is discharged and D67 is fixed. Sign off and tag
  `SubShapeRef`/`BimObjectType`/`Command`(+`argsSchema`)/`scene.json`/`ParamSchema`/`UndoableEdit` frozen, carrying the Ⓐ–Ⓖ
  reservations + `Material.thermal?`. ⚠ Also owner-gated: **committing Entry 57.**
- **Zayd (next build, owner-chosen):** **the Clean Delta exporter** — and it opens with the enumeration query above, which is
  its stated prerequisite. The join O(N²) endpoint index stays a v1.0.x perf item (`review_P5.md` #3).
- **Amer:** unchanged and all post-freeze/parallel — renderer batching/instancing (the Entry-55 unlock), P4.5, FSA adapter,
  WebGPU, service worker/PWA, Cloudflare deploy.

### Entry 58 — 2026-07-25 — Zayd — **THE ENUMERATION QUERY + THE CLEAN DELTA EXPORTER SHIP (owner ruled "both in one unit"). THE 42-DAY-OLD CRASHING EXIT CRITERION IS CLOSED — AND FIVE REAL DEFECTS WERE FOUND: TWO BY BUILDING IT (ONE ON THE MOAT'S LOAD-BEARING SENTENCE — THE JOURNAL WAS NOT RECORDING THE ASSOCIATIVE CASCADE AT ALL) AND THREE MORE BY THEN SWEEPING MY OWN NEW CODE ADVERSARIALLY.**
**Task (owner):** Entry 57's chosen next build — the Clean Delta exporter, opening with the enumeration query it is gated on.
Design-doc-first (`P5_step6A_enumeration_design.md`), then an AskUserQuestion round: **Q1 unmeasurable ⇒ a separate
`unmeasured[]` list · Q2 `prior` ⇒ rewind the journal + rebuild ONLY the delta · Q3 scope ⇒ BOTH units in one build**
(the owner overrode the recommendation to split them). `pnpm verify` **417/417 green** (387 → +30), real exit code captured.

- **⚠ THE GAP, RE-MEASURED ON REAL GEOMETRY RATHER THAN QUOTED** (§1b). A Site → Tower A → Level 1 with one `core.wall`,
  one `core.opening` Door and one 3×2 `core.curtainwall`, against the real OCCT kernel:
  ```
    scene.elements (AUTHORED rows)      3        real elements    19    ⇒ 16 invisible to `scene.elements`
    with own parts                     15        with none         4    the curtain-wall parent + its 3 columns
    NAIVE LOOP  for (id of Object.keys(scene.elements)) await doc.quantities(id)
       ⇒ counted 2, then THREW: `element "curtainwall-01KYD7CYZ…" has no built geometry`
  ```
  **⚠⚠ AND THE THIRD FINDING IS NEW — "SKIP VOIDS" IS THE WRONG RULE.** `review_P4.md` (2026-07-14) and Entry 57 both named
  **the Opening** as what kills the loop (*"a void has no parts"*). On the SHIPPED types it dies on the **CURTAIN WALL** — a
  **pure composite**, which has no own parts *by design*. **A rule written to skip voids specifically would have shipped
  green and still crashed on the very element D59 was built to prove.** The honest rule is *"an element with no OWN parts
  yields no quantity rows"*, and it has **two** populations. *(The ⓙ door is in neither — leaf + frame, and it is measured.)*
- **BUILT — the enumeration query** (`enumerate.ts`, additive, nothing frozen moved): `modelElements()` (sync, kernel-free)
  applies the four filters **in one place so three products cannot each get them slightly wrong** — the D59 children TREE
  (not one level: a column is itself composite), the D65/D67 option cascade, no-own-parts, and the build state.
  `projectQuantities()` returns **flat per-part rows carrying the LBS address** + `totalsBy{Material,Discipline,Container,Type}`;
  `containerCodeOf()` exposes the LBS path Entry 57 found missing. **The exit criterion answers: *"how much C25/30 is in this
  building?"* = 3.18 m³**, one call, no throw.
- **⚠⚠ DEFECT 1, FOUND BY THE TYPECHECKER WHILE WIRING IT: A GENERATED CHILD'S TYPE WAS NOT RECOVERABLE FROM THE BUILT TREE.**
  The engine constructs a full `Element` for every D59 child (it must — `buildGeometry` takes one) and then **threw it away**,
  keeping only geometry. So a **curtain-panel schedule** — *"completely standard in Revit"*, Entry 57's own example — could not
  say what type its rows were, and the Clean Delta's `classification.ifc_class` / `type_name` were unproducible for **16 of the
  19** real elements. Fixed by carrying it (`ElementGeometry.element?`) — a build-output projection, never stored, not a frozen
  shape; the object already existed in the engine's hand. It also makes a derived child and an authored row the **same shape**,
  which is why the enumeration has one code path instead of two.
- **⚠⚠⚠ DEFECT 2 — AND IT IS ON THE MOAT'S LOAD-BEARING SENTENCE. THE JOURNAL WAS NOT RECORDING THE ASSOCIATIVE CASCADE.**
  `P5_step6_clean_delta_design.md` §3 rests `modified_qty` on *"whether the element's own params changed **OR it appears in
  some edit's `rebuilt`**"*, and calls it *"the case a naive two-model diff gets right only by luck; Bunyan reads it off
  `rebuilt`."* **It did not.** **Thirteen commands** — `updateContainer`, `updateGrid`, `updateMaterial`, `updateSection`
  among them — declare `rebuilt: []`, because the command layer legitimately does not KNOW what a container/grid/material edit
  reaches; the **typed dependency graph** does, and `#affected` had already resolved it to *do* the rebuild. **So the geometry
  was always right and the journal simply did not say so: moving a Level rebuilt every wall on it and recorded `rebuilt: []`** —
  and a Clean Delta consumer would have been told a storey of re-quantified walls was `unchanged`. **A wrong schedule, from a
  green suite.** Fixed at the one place both answers meet (`execute` now journals the RESOLVED set — the field is frozen and
  unchanged, only its content is now complete). **⚠ §1c-7's disease, FOURTH occurrence: the claim was written in a design doc
  and never read against the code.**
- **BUILT — the Clean Delta exporter** (`cleandelta.ts`): `journal + revN → CleanDeltaPackage`, `contract_version "1.1"`,
  `source "bunyan"`, mapped field-for-field onto the real on-box `../Planitor/v2.2_spec.md` §4. `change_type` derived from the
  journal slice; `sceneAt()` **rewinds** by inverting `SceneChange.before/after` (exact — the journal is append-only and an
  undo is a REVERSAL, D40); `prior` priced on a **throwaway document rebuilt over only the delta's elements** (owner Q2) via
  the new bounded `rebuildOnly()`. `reidentified` is declared and **never emitted**. The LBS zones/floors fall straight out of
  `scene.containers` — nothing minted, nothing mapped. **No frozen change, exactly as the ⑥ design proved pre-freeze.**
- **⚠ AND A HEAP CONSEQUENCE THE RULING CREATED: a throwaway document holds real OCCT solids.** Added `DocumentContext.dispose()`
  — without it every export would bleed the whole prior model into the tab the user is still modelling in (spec §6.2, the
  Entry-21 leak class one level up). Pinned by a `wasmLiveHandles()` before/after assertion.
- **BUILT — the JSON Schema** (`packages/document/schema/clean-delta-1.1.schema.json`), the artifact **Planitor D11** makes the
  contract itself (*"a contract maintained by remembering to edit N files WILL drift, and this one carries money"*). A real
  export is validated against it, and **the validator is itself revert-verified** against 8 deliberate mutations (a wrong
  `const`, a downgraded `basis`, an out-of-enum `change_type`, a nested bad part…) — a conformance test whose checker cannot
  fail is theatre. A third test asserts the schema uses **only** the draft-07 keywords the validator implements, so the subset
  cannot silently fall behind. ⚠ `ajv` is in the tree only as an eslint transitive (not importable under pnpm) — **nothing was
  installed**; cross-repo CI validation (Planitor D11's other half) is not this repo's to land.
- **⚠ REVERT-VERIFIED, all three:** remove the no-own-parts guard ⇒ the roll-up **throws on the curtain wall**; remove the
  children walk ⇒ the glass and aluminium totals **silently vanish** while the run stays green (*the* failure mode — a
  plausible, short number wearing `basis: 'exact'`); revert the journalled cascade ⇒ `expected [] to include 'wall-…'`.
  `tests/model-enumeration.test.ts` (12), `tests/clean-delta-export.test.ts` (9), `tests/clean-delta-schema.test.ts` (4) —
  all on real OCCT, real `@bunyan/types`, real buildings.
- **Box:** read/measure/build only; `pnpm verify` ×4 + targeted vitest runs; **nothing installed, no containers touched, no
  ports bound**; `/tmp` 11 MB; available RAM never below ~2.2 GB; **both live public sites up throughout**.
  ⚠ **UNCOMMITTED — owner-gated** (Entries 57 + 58 now both sit in the tree).

- **⚠⚠⚠ AND THEN THE SAME METHOD WAS TURNED ON THIS SESSION'S OWN CODE — A POST-BUILD ADVERSARIAL SWEEP OF THE EXPORTER,
  WHICH FOUND THREE MORE. Every one of them is a row Planitor would have ACTED on.**
  - **(a) A NON-ACTIVE DESIGN OPTION WAS EMITTED AS A GHOST ROW — D65's failure mode by a THIRD road.** `modelElements`
    applies the exclusion rule, but **the journal names element ids directly**, so an element in a non-active option
    arrived through `histories` with no match in the enumeration and was emitted as `modified_qty`, no quantity, empty
    `spatial_container_code`, `IfcBuildingElementProxy` — **a work-package row for a facade nobody will build.** D65's
    own stated failure mode, reached neither by the option tag (D65) nor by hosting (D67) but by the **exporter's
    journal path.** ⇒ not-active is neither a change nor a deletion: those elements are omitted entirely.
  - **(b) AN EDIT THAT WAS UNDONE WAS REPORTED AS A SPATIAL MOVE THAT NEVER HAPPENED.** The derivation read the **last
    change in the slice** — and an undo is a first-class journal entry (D40), so the last change is the REVERSAL, a
    `before → after` differing in `end`. Net effect since the baseline: nothing. Reported: `modified_move`. ⇒ rewritten
    to compare **the two ENDPOINTS** (state at revision N vs state now). ⚠ **This is still not "diffing two models":
    the journal decides WHICH elements are asked about — including the cascade nothing names — and only those elements'
    endpoints are read.** The moat is the SET, not the comparison.
  - **(c) A GENERATED CHILD WHOSE SLOT VANISHED FELL OUT OF THE PACKAGE SILENTLY.** Shrink a curtain wall from 3 columns
    to 2 and the dropped column is in no scene row and no current enumeration — so under Planitor's *"absence-from-
    `elements` ⇒ unchanged"* rule **it would have been billed forever.** ⇒ the prior model's enumeration is now walked
    too, and the authored root is derived **structurally from the PEI** (`${parentId}:${slot}`) rather than looked up —
    the lookup returned nothing for exactly the element that needed it most.
  - **✅ CHECKED AND CLEAN (don't re-probe):** the ⓣ reserved metadata args (`mark`/`phaseCreated`/`properties`/
    `classifications`) thread through `createElement` **and** survive a `.bnn` round-trip; and **the Clean Delta is
    computable from a reloaded `.bnn`** — save → load → export gives the exact prior (3.6 m³) and current (5.4 m³). That
    is the D40 headline end-to-end, and it is now a permanent test rather than a claim.
  - **⚠ THE PATTERN, AND IT IS THE SESSION'S REAL LESSON: five defects, and NOT ONE was on a happy path.** Each needed a
    question the build itself never asks — *what if the option is excluded? what if it was undone? what if the child is
    gone?* The sweep cost ~30 minutes and found three defects in code that was already green and already revert-verified.

**NEXT:**
- **Owner:** **the FREEZE (step 6) is still the owner's act** and is unblocked — nothing in this entry touched a frozen shape.
  ⚠ Also owner-gated: **committing Entries 57 + 58** (`origin/main` is still at `6ec5139`).
- **⚠⚠ A JUDGEMENT CALL, AND THIS SESSION STRENGTHENED IT RATHER THAN CLOSING IT.** Defect 2 means **every claim in a design
  doc that names a field should be read against the code before the freeze tags it** — four occurrences now. And the
  post-build sweep then found **three defects in code that was already green and already revert-verified**, in ~30 minutes,
  none of them on a happy path. ⇒ **the adversarial sweep is not a one-off pre-freeze ritual; it is the only method that has
  ever found anything** (§1b), and it should run against each new surface *after* it goes green, not instead of. A standing
  sweep of *"which asserted behaviours have no test that would fail without them?"* is cheap now; after the freeze a missing
  one is a three-product amendment.
- **Zayd:** the schedules body (D58 row Ⓐ — the enumeration query is now their input too) · the join O(N²) endpoint index
  (`review_P5.md` #3, v1.0.x perf, no contract change) · the D29 cache bodies.
- **Amer:** unchanged and all post-freeze/parallel — renderer batching/instancing (the Entry-55 unlock), P4.5, FSA adapter,
  WebGPU, service worker/PWA, Cloudflare deploy.
