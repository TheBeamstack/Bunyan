# Bunyan — Core Logic & Domain Model

**Purpose.** This is the durable reference for *what Bunyan is* — its domain concepts, their identities, the relationships and rules that hold between them, and the states they move through. It is deliberately **not tied to v1.0.0**: it describes the conceptual model the product grows within, and it is written to be aware of the long-term directions (the "north-stars" in §9) so the model does not dead-end.

**Scope boundary.** This document owns *domain meaning*. It carries only the **minimum** architecture needed to make the domain unambiguous; the full architecture (layers, worker protocol, data flow, security, determinism mechanics) lives in `architecture.md`. Version-specific scope, decisions, and acceptance criteria live in `V1.0.0_spec.md`.

**Reading order.** `core_logic.md` (this) → `architecture.md` → `V1.0.0_spec.md` → `v1.0.0_imp_plan.md`.

---

## 1. What Bunyan is (one paragraph)

Bunyan is a browser-native, serverless parametric **BIM/CAD authoring platform for building design**. A user assembles a building out of parametric objects (walls, slabs, columns, openings…) whose shapes are computed by an exact **B-Rep solid-geometry kernel** (OpenCascade / OCCT). The design is stored as a *parametric description* — objects, their parameters, and the references between them — from which exact geometry is regenerated on demand. Everything the user sees on screen (meshes, 2D cut lines) is a **disposable projection** of that description. The product is designed to grow **additively**: new object types, tools, views, and file formats are registered against stable contracts rather than changing a core.

---

## 2. The one non-negotiable invariant

> **B-Rep solid geometry is the source of truth. Meshes and 2D views are disposable display artifacts, regenerated on demand. The parametric description is the source of truth for the B-Rep.**

Two consequences that shape the entire domain model:

1. **Geometry is derived, not stored as truth.** A saved project is primarily a *recipe* (`scene.json`): object types, parameters, references, and the identity token map. A cached B-Rep may accompany it for speed, but losing the cache never loses the design — it is rebuilt from the recipe.
2. **Identity must survive regeneration.** Because geometry is rebuilt, any reference to a *piece* of geometry (a face, an edge) cannot be a positional index — it must be an identity that is stable across rebuilds. This is the hardest and most important idea in the domain: **persistent sub-shape naming** (§5).

---

## 3. Domain entities

The domain is a small set of concepts. Each has an **identity**, a **state**, and **relationships**. (Types below are conceptual, not the literal wire format — see `architecture.md`.)

### 3.1 Project / Document
The whole design. A container of BIM Objects plus organizational scaffolding (levels), settings, and the derived caches. Persisted as a self-contained local package (`.bimproj`). Identity: a project id. A Document is the unit of open/save/undo.

### 3.2 Level / Story
An elevation datum that organizes objects vertically (ground floor, first floor…). Objects reference a Level; a Level has an elevation. Levels are the primary *organizational* relationship in a building model and are scaffolding that everything BIM-shaped depends on. Identity: `levelId`.

### 3.3 BIM Object (instance)
A single modeled thing in the project — *this* wall, *that* column. It is an **instance of a BIM Object Type** carrying:
- `id` — stable instance identity.
- `typeId` — which Type governs it (§3.4).
- `params` — the parameters that drive its geometry (length, height, thickness, profile…).
- `levelId` — its organizing Level.
- `transform` — placement in world space (millimetre coordinates).
- `subShapeRefs[]` — references this object holds into *other* objects' geometry (§5), e.g. an Opening's reference to its host wall's face.

An object's exact geometry is **not** stored on the instance as truth — it is produced by its Type's `buildGeometry(params)` and cached.

### 3.4 BIM Object Type (the governing contract)
A *kind* of thing (Wall, Slab, Column, Opening, GenericSolid, and — later — Door, Window, Roof, Stair…). A Type is a registered contract, not a hard-coded class list. It defines:
- how to build geometry from parameters (`buildGeometry`),
- the parameter schema (which drives an auto-generated property UI),
- how it maps to/from interchange formats (IFC),
- optional **typed quantities** (for future schedules/analysis, §9),
- a **version** and migration path so old projects keep loading as the Type evolves.

**Domain rule:** adding a new kind of building element is adding a new Type, never editing the core. This is the mechanism by which Bunyan reaches toward Revit-class breadth incrementally.

### 3.5 GenericSolid (the escape hatch)
A Type whose "parameters" are a free sketch plus an operation (extrude/revolve). It exists so the modeller is never blocked by the absence of a named Type, and it is the **import target for any geometry that does not map to a known Type** (e.g. unrecognized IFC entities import as GenericSolid with geometry preserved but non-parametric). It keeps the product useful at every stage of its growth.

**⚠ "Geometry preserved" means an exact B-Rep solid — never a mesh.** This is a *domain* rule, not an implementation preference, and it follows directly from §2: an imported thing that is only triangles cannot be measured, sectioned, booleaned or edited. It would be a **backdrop, not a building** — present on screen but outside the model's rules. An importer that cannot produce solids is therefore not an acceptable importer, whatever its convenience. *(This is why IFC import is IfcOpenShell and not `web-ifc` — spec D16.)*

### 3.6 Opening & Host (the canonical parametric relationship)
An **Opening** is a void subtracted from a **Host** (a Wall or Slab). It is the archetype of a *reference-carrying* object and the reason persistent naming exists:
- The Opening references a **face of the host** via a `SubShapeRef` (§5), plus a position and size.
- When the host's parameters change and its geometry is rebuilt, the referenced face must still be found so the Opening re-cuts correctly.
- **Anchoring semantics (a domain decision, not an implementation detail).** How an Opening repositions when its host is resized is governed by an **anchoring parameter** on the Opening:
  - `fixed` — the Opening holds an **absolute offset from a datum edge/corner** of the host (the safe, predictable default). Growing the wall does not move the opening.
  - `proportional` — the Opening's position scales with the host, so it "floats" as a fraction of the host's extent.
  - `centered` — the Opening stays centred on the host face.
  This anchoring model is the seed of the general **constraint** concept the product grows toward (a real geometric constraint solver is a future direction; the anchoring parameter is the domain-level down-payment on it).

The Opening→Host pattern generalizes: a future Door/Window is "Opening + inserted family"; a future hosted fixture is the same reference-carrying shape. Getting this relationship right is getting the domain right.

### 3.7 Sketch & Profile
2D geometry (lines, rectangles, circles, arcs) that feeds 3D operations (extrude/revolve). A Profile handed to the kernel must be **valid** (closed, non-self-intersecting). Sketches are dimensioned **numerically** today; a **geometric constraint solver** (the general form of "this dimension equals that") is a north-star the Sketch concept is designed to accept later.

### 3.8 Operation & the Operation DAG
Every geometric result is produced by **operations** (make-box, extrude, boolean, fillet…). Operations form a **directed acyclic graph**: an operation's inputs are the outputs of earlier operations. This DAG is the backbone of identity (§5) and of incremental rebuild (only the affected subgraph re-runs on an edit). The DAG has **two granularities**:
- **Coarse (feature-level)** — what the user sees as model history ("added wall", "cut opening").
- **Fine (primitive-op level)** — the internal steps the identity system propagates through.

### 3.9 Sub-shape & SubShapeRef
A **sub-shape** is a face, edge, or vertex of an object's B-Rep. A **`SubShapeRef`** is the *stable, opaque identity* of a sub-shape — a structured path through the Operation DAG (which operation produced it, from which inputs, in which **role** and **occurrence**), **never a raw geometric index**. `SubShapeRef` is the currency of every parametric reference. (§5 is entirely about how this identity is defined and kept stable.)

A **role** is the semantic slot an operation gives one of its outputs — *"the face this box calls its x-min face"*, *"the edge where those two faces meet"*. The role comes from **the operation** (and, for edges, from **topology**); the **occurrence** disambiguates repeats of the same role. Together with the owning node they form the identity. **A role is never a position**: the identity of a wall's face must not change because the wall moved.

### 3.10 Representation / View
A **derived projection** of the document graph: the 3D view, a 2D plan cut, a 2D elevation, and — later — schedules and sheets. Views are registered independently and are **always regenerated from the truth**, never authored as separate drawings. A 2D plan is a *real section cut of the real B-Rep*, which is itself a proof that the kernel is the source of truth. This is why "add 2D documentation" or "add a quantities schedule" is an additive View, not a new source of truth.

**A projection need not be visual.** The **semantic projection** an actor reads in order to *reason* about the model — ids, types, parameters, levels, quantities, relationships, expressed as data rather than pixels — is a Representation like any other (§3.13). The 3D view is the projection *for eyes*; this is the projection *for reasoning*. Both are derived, disposable, and never truth.

### 3.11 Material & Quantity (declared now, realized later)
The domain reserves two concepts so the model does not dead-end:
- **Material** — a property of an object/type carrying appearance and (future) physical properties.
- **Quantity** — typed measurable properties (length, area, volume, count) a Type can expose.
These back the **analysis & quantities** north-star (§9); a Type may declare them before any consumer exists.

### 3.12 Command & UndoableEdit
A **Command** is an *actor's* action (draw, extrude, boolean, move, array, retarget…) — where the actor may be a human at the UI **or an AI agent** (§3.13). Executing a Command against the Document produces an **UndoableEdit** — a *state delta*, not a recorded command to replay. Undo/redo moves the parametric state backward/forward and **re-resolves references**; because identity is stable and geometry is deterministically rebuildable, this avoids the classic "replay produces different topology" hazard. A Command whose kernel work fails produces **no** UndoableEdit (§7).

Two domain-level properties of an UndoableEdit, both load-bearing for §3.13:

- **The delta *is* the diff.** The state delta undo needs in order to reverse an action, and the answer an actor needs in order to **verify what its action actually did**, are the *same object*. A Command therefore **returns** its UndoableEdit; it does not merely push it onto a stack. This is what makes an action *verifiable* rather than merely *issued* — and it is the difference between an agent that can check its own work and one that must guess.
- **Edits may be grouped into a transaction.** An UndoableEdit may declare membership in a transaction; edits sharing one transaction undo and redo as **a single all-or-nothing unit**. v1.0.0 emits exactly one edit per Command (every edit is its own transaction), but the concept is **reserved in the model** because every *composite* action the product grows toward — "add a room", "import and place" — is a set of edits that must never be left half-applied.

### 3.13 Actor (human or agent) — the one command layer *(decision D19)*
The domain recognizes **two kinds of actor** and gives them **one way to act.**

> **Domain rule: anything an actor can do to the Document is a Command. There is no second path.** The UI has no private channel to the geometry kernel, and neither does an agent.

This is a *domain* statement, not a transport detail, because it defines what the product **guarantees about its own operability.** If the UI can do something the Command layer cannot express, then an agent — and a script, a macro, and a future collaborator's replayed edit — simply **cannot do it**, and the gap stays invisible until someone is asked to. One layer, one vocabulary, one set of failure modes, one undo stack, for every actor.

Three consequences the model carries:

- **Commands are semantic, not mechanical.** The primary verb is *"create a Wall with these parameters"*, not *"draw a rectangle, then extrude it"*. This falls out of §3.4 for free: a **BIM Object Type already *is* the recipe from parameters to geometry**, so a parametric type registry makes high-level verbs the natural default — and leaves sketch-level primitives as the **GenericSolid escape hatch** (§3.5) rather than the main road.
- **The model must be able to describe itself.** An actor that must be *told* what verbs exist will eventually be told something stale. Both **Types** (their parameter schemas, §3.4) and **Commands** (their argument schemas) are therefore **self-describing at runtime**: the registry that *governs* a thing is the same registry that *explains* it. There is no second, hand-written description of the model, because a second description is a description that drifts.
- **An actor explores before it acts.** A read/query **projection** of the Document — ids, types, parameters, levels, quantities, relationships; *not* triangles — is how an actor sees state. It is a **Representation** (§3.10), regenerated from truth like any other: the 3D view is the projection *for eyes*, and this is the projection *for reasoning*. Both are disposable; neither is truth.

**Why this belongs in the domain and not merely in the architecture:** it is the same argument as §2. A mesh is not the truth, and a *button* is not the action. The action is the Command, and the Document is the only thing it acts on.

---

## 4. Identity — the rules that make the model coherent

Identity is where BIM/CAD domains usually break. Bunyan's rules:

- **Instance identity** (`id`, `levelId`, `typeId`) is assigned on creation and never reused.
- **Sub-shape identity** (`SubShapeRef`) is **derived, not recovered**: a sub-shape *is* its derivation path through the Operation DAG. It is assigned when the operation runs and carried forward, never re-matched geometrically after the fact.
- **No positional identity on the resolve path.** The single sanctioned exception is a genuinely symmetric split where structural data cannot distinguish children — then, and only then, a bounded, grid-rounded positional key breaks the tie. Everywhere else, geometry never determines identity.
  - **✅ THE EXCEPTION IS NOW REAL, AND IT IS EXACTLY ONE PLACE (D28, owner ruling 2026-07-13).** It was withheld for six entries because nothing needed it; it was built when an ordinary shape did — **a service duct drilled clean through a ROUND column**, whose two rims are topologically indistinguishable (one lateral face wraps 360°, so the duct enters and leaves through *the same face*). The key **orders** those two rims by their mm-rounded centroid; it **never names** anything, and it runs only after every structural test has tied. A collision on the grid is still **refused**. *(`kernel-occt/src/kernel.cpp`, `centroidKey` — and the resolver in `naming.ts` still reads no coordinate at all.)*
- **Identity is deterministic.** Given the same parametric input, identity assignment is reproducible — **including across machines, and across any parallel execution of the kernel** — because the identity system **normalizes ordering before assigning IDs**. (Mechanics in `architecture.md` §5.4.) *This is a rule about what identity may depend on, not a claim about how the kernel currently runs: a given release may ship the kernel single-threaded (v1.0.0 does), but the rule is what makes it safe to turn parallelism **on** later without invalidating a single saved file. **Identity may never depend on the order the kernel happened to walk the shape.***

These rules are what let a reference (an Opening on a wall, a fillet on an edge) **survive a rebuild**, which is the whole point.

---

## 5. Persistent naming — the domain's hardest idea, stated plainly

**The problem.** When a host changes and its geometry is rebuilt, the kernel does not promise that "the same face" keeps the same index. Any reference stored as an index would silently point at the wrong face. This is the *topological naming problem* that has historically plagued parametric CAD.

**The domain's answer: functional / generative naming.**
- Identity is **assigned at creation and propagated forward** as operations build on operations. Each operation, as it runs, labels its output sub-shapes in terms of the operation and the identities of its inputs (e.g. "the lateral face generated by extruding edge *k* of this profile", "the face modified by this boolean").
- Resolving a `SubShapeRef` after a rebuild is **replaying the derivation**, not searching geometry.
- If a change makes a referenced sub-shape genuinely cease to exist, the dependent is marked **broken** and surfaced for **manual retargeting** — it is **never** silently reattached to a different piece of geometry. Predictable breakage beats silent wrongness.
- **The same rule applies at *naming* time, not just at resolve time.** If an operation produces a sub-shape whose identity cannot be derived structurally, the operation **fails loudly** rather than inventing a name for it. A wrong-but-plausible identity is worse than a refusal: a refusal is visible immediately, whereas a bad name stays silent until it re-targets someone's window onto the wrong wall. *(Learned the hard way — see the caveat below.)*

**Why this is a domain concept and not just an implementation detail:** it defines what a *reference* means in Bunyan, and therefore what parametric behaviour users can rely on. Every reference-carrying relationship in the product (openings, fillets, and every future hosted element) inherits its guarantees and its failure mode from this model.

**Honest caveat (belongs in the domain because it bounds behaviour):** the propagation relies on the kernel's history being complete down to edges and vertices — historically the weakest area. Where a needed reference's history is inadequate, that reference class is either explicitly reconstructed or deferred; it does **not** degrade into geometric guessing. The set of reference classes the product supports therefore grows with verified history coverage, not by relaxing the identity rules.

**A second caveat, learned by building it:** deriving a name from the operation is necessary but **not sufficient** — you must also *translate the kernel's vocabulary into yours*, and that translation is a place to be silently wrong. A first implementation of the box asked OCCT which face was which (correct in principle) and then **mislabelled four of the six**, because OCCT's `LeftFace()` is not the face a reader would guess. **Every geometric check still passed** — the shape was exact; only the *names* were lies. The lesson is domain-level, not incidental: **a naming bug does not look like a geometry bug.** It cannot be caught by measuring volumes, and it surfaces only much later, as a reference pointing at the wrong thing. Naming must therefore be **verified as naming** — which is why the harness re-measures what each name actually refers to (`architecture.md` §11).

---

## 6. Relationships (how entities connect)

- **Object → Type** (`typeId`): governs how it builds and maps.
- **Object → Level** (`levelId`): organizes it vertically.
- **Object → Object via SubShapeRef** (host/dependent): the parametric backbone — Opening→Wall, Fillet→edge, future hosted families. Directed; drives dependency tracking and incremental rebuild.
- **Operation → Operation** (DAG): input/output derivation; the substrate of identity and rebuild.
- **Document → View** (derivation): views are projections, always regenerated.
- **Type → Codec** (via `ifcMapping`): how a kind of object crosses the interchange boundary.
- **Object → Material / Quantity** (declared, future-realized): the analysis substrate.

**Domain invariant:** the reference graph among objects is a DAG (no cyclic hosting). Dependency direction defines rebuild order.

---

## 7. States & lifecycle

**Document:** `new → dirty ↔ saved`, with an orthogonal `recovered` (from autosave after a crash).

**BIM Object geometry:** `valid` (built and cached) · `stale` (params changed, awaiting rebuild) · `rebuilding` · `failed` (kernel operation failed) · `broken-ref` (a `SubShapeRef` it depends on could not be resolved).

**Operation-failure semantics (a domain-level rule, because it defines what the user can trust):** kernel operations fail on legitimate input (fillet radius too large, open/self-intersecting profile, empty boolean). When one fails, Bunyan **rejects the edit and keeps the last-good state** — no partial geometry, no silent repair — and surfaces a typed, understandable error. (Optional auto-repair and a downloadable repro bundle are future refinements; the *contract* is "reject + keep last-good".)

**Reference:** `resolved ↔ broken`. A broken reference is a first-class, visible state awaiting **manual retargeting** (itself an undoable edit), never auto-healed.

**Cache:** `fresh ↔ stale` (stale when the kernel build id changes or the recipe changed); a stale/missing/corrupt cache is rebuilt from the recipe and never treated as truth.

---

## 8. Core domain rules (the invariants to preserve at every version)

1. The parametric recipe is the source of truth; geometry and views are derived and disposable.
2. Sub-shape references are stable identities derived from provenance, never positional indices.
3. Broken references fail loudly (marked, manually retargeted), never silently reattach.
4. Failed operations reject and preserve the last-good state; no partial or auto-invented geometry.
5. New kinds of things (types, commands, formats, views) are **additive registrations**, never core edits.
6. Identity assignment is deterministic and reproducible across machines and parallel execution.
7. Units are millimetres internally; interchange declares its own units at the boundary.
8. Nothing in the current version may foreclose a declared north-star (§9).
9. **There is exactly one command layer.** Every actor — human or agent — acts on the Document only through Commands (§3.13); no actor has a private path to the kernel. Every Command **returns** the state delta it produced, so every action is verifiable.
10. **The model describes itself.** Types and Commands are discoverable at runtime from the registries that govern them (§3.13); there is no separately-maintained description of what the app can do.

---

## 9. North-stars — future directions the model must not dead-end

The domain model is shaped so these become **additive** growth, not rewrites. Each notes the domain hook already present.

- **Analysis & quantities** (structural/energy analysis, schedules, quantity take-off). *Hook:* Types may declare typed **Quantities** and **Materials** (§3.11); Views can host schedule representations. The model treats geometry and measurable properties as separable so an analytical view of the same objects can be added later.
- **Real-time multi-user co-editing** of the parametric graph. *Hook:* stable per-object and per-operation **identity** (§4), edits expressed as discrete **UndoableEdit deltas** (§3.12), and a DAG with explicit dependency direction — the substrate a future conflict-resolution layer (locked/sequential first, then concurrent) needs. The domain avoids hidden global mutable state that would make merging impossible.
- **Server-side / headless kernel** (move heavy geometry off the browser, batch processing). *Hook:* geometry is produced behind an **engine-agnostic worker boundary** (a flat, versioned message protocol — see `architecture.md`), so the kernel's *location* is not baked into the domain. The identity system is explicitly designed to allow a future native/C++ implementation without changing meaning.
- **Scripting & generative design** (script-authored parametric families, CadQuery/build123d spirit). *Hook:* a **BIM Object Type** is a contract, not a hard-coded class — a script can register a Type whose `buildGeometry` is user-defined, and its outputs are ordinary objects with no special-casing. Sketches are designed to later accept a **constraint solver**; the Opening **anchoring parameter** (§3.6) is the first, concrete constraint the model already carries.
- **Agent-operable authoring — an AI agent can explore, understand and drive Bunyan with no setup** *(decision D19; promoted to a north-star by owner ruling, 2026-07-12).* An agent should be able to open the app, ask it what it can do, read the model, act, and **verify what its action did** — without an SDK, without per-feature API wiring, and without a document written for it by hand. *Hooks, all already in the model:* **one command layer for every actor** (§3.13, domain rule 9) — so an agent is not a second-class client bolted on, it is *the same client*; **self-describing registries** (§3.4, §3.13, domain rule 10) — so capability discovery is generated, never maintained; **Commands return their state delta** (§3.12) — so an action is verifiable, not merely issued; **typed failures + reject-and-keep-last-good** (§7) — so a wrong action is a legible, recoverable refusal rather than a corrupted model; **stable identity at both the object *and the sub-shape* level** (§4, §5) — so an agent can say *"a window on the south face of that wall"* and have the reference **survive the wall being resized**, which is the thing most CAD tools cannot promise. *Strategic note (recorded because it is a product argument, not a technical one):* this is the **same wedge as openness** (§9 of `V1.0.0_spec.md`, D15) — *"you will never lose access to your models, you can verify what the geometry engine does, and an agent can drive it out of the box, because there is one public API and it is the same one the buttons use."*

**Interoperability trajectory.** Interchange is a **Codec** concept (import/export against one contract), so IFC today, and STEP/DXF/glTF/IFC5-IFCX tomorrow, are sibling registrations. Import is *mapped-or-GenericSolid*: known kinds become parametric Types, everything else survives as geometry. Export follows the same mapping as writer support matures.

---

## 10. Deliberate non-concepts (what the domain intentionally does not model)

To keep the model honest about its boundaries: Bunyan does **not** treat meshes, 2D drawings, or exported files as authoritative; it does **not** carry a global mutable geometry store outside the recipe+cache discipline; and it does **not** encode identity in geometry. These are not omissions to fix later — they are load-bearing constraints. Violating any of them reintroduces the exact failure modes (topological-naming drift, silent data loss, non-reproducible rebuilds) the model exists to prevent.

---

## 11. Pointers

- **How it is built** (layers, worker protocol, registries, determinism mechanics, security, persistence): `architecture.md`.
- **What ships in the first release** (scope, decisions, acceptance criteria): `V1.0.0_spec.md`.
- **The build sequence:** `v1.0.0_imp_plan.md`.
