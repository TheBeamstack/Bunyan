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

1. **Geometry is derived, not stored as truth.** A saved project is primarily a *recipe* (`scene.json`): object types, parameters, and **the references objects hold** (an Opening's `hostRef`). ⚠ **Not an "identity token map"** — the identities of every face and edge are **re-derived** by replaying the recipe, because the derivation is deterministic (§5). Storing them would be storing a *result*. A cached B-Rep may accompany it for speed, but losing the cache never loses the design — it is rebuilt from the recipe.
2. **Identity must survive regeneration.** Because geometry is rebuilt, any reference to a *piece* of geometry (a face, an edge) cannot be a positional index — it must be an identity that is stable across rebuilds. This is the hardest and most important idea in the domain: **persistent sub-shape naming** (§5).

---

## 3. Domain entities

The domain is a small set of concepts. Each has an **identity**, a **state**, and **relationships**. (Types below are conceptual, not the literal wire format — see `architecture.md`.)

### 3.1 Project / Document
The whole design. A container of BIM Objects plus organizational scaffolding (levels), settings, and the derived caches. Persisted as a self-contained local package (`.bnn`). Identity: a project id. A Document is the unit of open/save/undo.

### 3.2 The SPATIAL CONTAINER TREE — Site → Building → Level → Space *(decision D35)*

**Every element lives somewhere, and "somewhere" is a TREE, not a floor number.** Bunyan carries IFC's own spatial decomposition, because it is the one every consumer of a building model already speaks:

| Container | Is | Why it must exist |
|---|---|---|
| **Site** | the parcel | the datum everything else hangs from |
| **Building** | one structure on it (*Tower A*, *Tower B*) | ⚠ **Bunyan could not express a two-tower project at all** before D35. Real projects are multi-building. |
| **Level / Story** | an elevation datum (ground floor, L03) | the primary organizing relationship; a Level has an elevation. Identity: `levelId`. |
| **Space / Room** | the room itself (*B3-East*, *Office 214*) | `IfcSpace`. ⚠ **It was missing, and worse — Bunyan's spec modelled "a room" as a COMPOSITE VERB (4 walls + a slab + a door), i.e. as a MACRO rather than a thing.** A Space is a first-class object everywhere (Revit "Room", ArchiCAD "Zone"): it carries a name, a number, and an **area/volume computed from the real geometry** — and **floor area is architecture's most-scheduled quantity** (paint, ceilings, screed, finishes). |

⚠⚠ **AND THE TREE IS NOT ONLY BUNYAN'S — IT IS THE ECOSYSTEM'S *LOCATION BREAKDOWN STRUCTURE*.** Planitor schedules against an **LBS** that reads *"Tower B → Level 03 → Zone B3-East"* — **that is this tree, exactly.** The Clean Delta Package (§3.15) carries a `spatial_container_code` per element which must resolve to an LBS node. ⇒ **With this tree, Planitor's LBS falls out of the authored model for free instead of being hand-declared.** One concept serves the architect (room schedules), the engineer (where is this frame) and the planner (where is this work). *(See §3.15 and D34.)*

### 3.2a Grid / Axis (Level's missing twin — decision D32)

Named structural axes (`A`, `B`, `C` / `1`, `2`, `3`) and their intersections. **Level organizes the model vertically; Grid organizes it horizontally**, and every BIM tool and every structural tool has both. It is placement scaffolding, exactly as Level is: a column sits at **B-3**, and it *stays* at B-3 when the grid spacing changes.

⚠ **It is the engineer's coordinate system, not the modeller's.** Miqdar lays a frame out on grids; a drawing is read on grids. Bunyan carried Level from day one and called it *"required scaffolding for everything BIM-shaped that follows"* — **Grid is the half of that sentence that was missing.**

### 3.3 BIM Object (instance)
A single modeled thing in the project — *this* wall, *that* column. It is an **instance of a BIM Object Type** carrying:
- `id` — stable instance identity.
- `typeId` — which Type governs it (§3.4).
- `styleId` — **which Style it is an instance OF** (§3.4a). *This* wall is a `core.wall`, and it is an **"EXT-200-Concrete"** — the Style carries everything shared, the instance carries only what is its own.
- `params` — the parameters that are **this instance's alone** (length, height, the endpoints of its axis…). ⚠ **Anything shared with other instances of the same Style — the layer stack, the section, the materials — belongs on the STYLE, not here** (§3.4a).
- `spaceId` / `levelId` / `buildingId` — where it lives in the **spatial container tree** (§3.2). ⚠ **This is also its LBS address in the ecosystem** — Planitor schedules work against it (§3.15).
- `gridRefs[]` — optional placement against named **Grid** axes (§3.2a).
- **`classification`** *(decision D36, **amended by D45**)* — **`loadBearing`** (bool) and its **IFC class**. ⚠ **Small, and Miqdar is BLIND without it.** Miqdar imports *"the structural elements"* — but a Wall may be a **shear wall or a partition**, and that is a *property*, not a type (IFC carries `LoadBearing` for exactly this reason). **Miqdar must never guess**: guessing yields a *wrong structural model* rather than a refused one. ⇒ **`loadBearing` IS Miqdar's import filter**, and it is a property of the **member**, not of a layer — plaster is not "load-bearing".
  - ⚠⚠ **`discipline` IS NOT HERE, AND THAT IS D45.** It was, and it was **wrong at the element level**: *an RC wall is structural and its plaster is architectural — and those are **two PARTS of one element**.* An element-level discipline is therefore **inaccurate about the very elements that matter**, and there is **nothing that needs it**: IFC has no discipline attribute on an `IfcWall`; **Miqdar filters on `loadBearing`**; and **Planitor routes work packages by discipline *per trade* — the plasterer bills plaster** (§3.15). ⇒ **Discipline is a property of a PART** (§3.3a), and a discipline filter is **part-scoped**: ask for *architectural* and you get the ceiling and the wall's plaster skin — **not** the slab, and **not** the RC core. *(A derived element-level value was considered and rejected: it is a lossy summary of data already in the payload, and someone would eventually route off the wrong one.)*
- `transform` — placement in world space (millimetre coordinates).
- `subShapeRefs[]` — references this object holds into *other* objects' geometry (§5), e.g. an Opening's reference to its host wall's face.

An object's exact geometry is **not** stored on the instance as truth — it is produced by its Type's `buildGeometry(params, style)` and cached.

### 3.3a Part (an element is not one solid — decision D30)

**An element owns an ORDERED LIST of PARTS, and each part is one solid.** A wall is not a lump: it is `structure` (blockwork), `insulation`, `finish` (plaster) — in order, from one face to the other. A stair is treads + risers + stringers. Each **Part** carries:

- `name` — its slot in the element's own vocabulary (`core`, `insulation`, `finish.interior`), **authored by the Type, never by OCCT's traversal**. ⚠ **Unique within its element** — a part's name becomes its DAG node (`wall-1.structure`), so two parts sharing a name would mint **two different faces under one identity**, and identity is the one thing that may never collide (§4);
- `materialId` — the **Material** it is made of (§3.11) — which is what makes a **quantity** answerable;
- **`discipline`** — Structural · Architectural · MEP *(decision **D45**)*. ⚠⚠ **THIS IS WHERE DISCIPLINE LIVES, AND NOWHERE ELSE.** An RC wall's **core is structural and its plaster is architectural**; a slab is structural and the ceiling under it is not. **An element is almost never of one discipline** — so declaring one on the element is a statement that is *inaccurate about exactly the elements that matter*. It is **required** on every part (a part that cannot say which trade builds it can be neither analysed nor scheduled), and it is sourced from the **Style's layer** (§3.4a) when there is one, and from the **Type's `defaultDiscipline`** when there is not. ⇒ **Miqdar idealizes the structural PARTS** (which is what it always meant); **Planitor routes the concreter and the plasterer to different work packages on ONE wall** (§3.15); and a discipline view is a **filter over parts**, not over elements;
- one **solid**, built by the Type from the element's params + its Style's layer stack.

⚠ **THIS IS WHY IT EXISTS, AND IT IS NOT A CONVENIENCE.** *"How much plaster is on this wall?"* is **unanswerable** against a single monolithic solid — and **quantity take-off is a declared north-star** (§9), which **domain rule 8 forbids foreclosing**. It is also what Miqdar needs (it idealizes the **structural** layer of a wall, not its finishes), and what stairs, railings and curtain walls all wait on. *(The kernel was built for this and the domain simply had not caught up: the OCCT build deliberately links **TKOffset** — "wall layers" — from day one.)*

⚠ **AND IT DOES NOT WEAKEN THE ANTI-FUSE RULE — IT SHARPENS IT.** *"Never fuse two elements"* stands, verbatim (it is what stops a neighbouring wall re-owning your wall's faces, breaking every window hosted on it). **A part is not a second element**: it belongs to exactly one element, is created by that element's own recipe, and dies with it. A boolean **between parts of one element** (an Opening cutting through every layer of its host) is an *intra*-element operation and is fine — it always was.

⚠ **AND IT COSTS THE KERNEL NOTHING.** A `SubShapeRef` is `{nodeId, kind, role, occurrence}` and **`nodeId` is an opaque string**, so a part is simply **its own node in the DAG** (`wall-1.structure`, `wall-1.finish`). **No new op, no protocol change, no change to `SubShapeRef`.** Parts are a *document-model* concept end to end — which is precisely why they can land before the P5 type freeze without touching the P3 protocol freeze.

### 3.4 BIM Object Type (the governing contract)
A *kind* of thing (Wall, Slab, Column, Opening, GenericSolid, and — later — Door, Window, Roof, Stair…). A Type is a registered contract, not a hard-coded class list. It defines:
- how to build geometry from parameters (`buildGeometry`),
- the parameter schema (which drives an auto-generated property UI),
- how it maps to/from interchange formats (IFC),
- optional **typed quantities** (for future schedules/analysis, §9),
- a **`defaultDiscipline`** *(D45)* — the discipline stamped on the parts it builds **when the element has no Style to say otherwise** (a GenericSolid, a beam whose section comes from the catalogue). ⚠ **It is never INFERRED from the material**: a concrete screed is not structural, a steel handrail is not structural, and a timber shear wall is — inference here yields a *wrong* model rather than a refused one. ⚠ **And this is why the IFC importer registers a Type PER IFC CLASS** (`IfcDuctSegment` → MEP, `IfcCovering` → architectural) rather than dumping every entity into one GenericSolid: **the IFC class is authored data from the source model, not a guess** — and a consultant's file full of ducts, cladding and braces would otherwise arrive as one undifferentiated discipline. *(P6; reserved by this ruling.)*
- a **version** and migration path so old projects keep loading as the Type evolves. ⚠ **Forward only.** An element authored against a **newer** version than this app carries is **never built against the older schema** — it is `failed` and preserved (§7, D43).

**Domain rule:** adding a new kind of building element is adding a new Type, never editing the core. This is the mechanism by which Bunyan reaches toward Revit-class breadth incrementally.

### 3.4a ElementStyle — the named, shared parameter set *(decision D31)*

**A Type is a KIND of thing (`Wall`). A Style is a SPECIFIC KIND of that thing (`EXT-200-Concrete`, `IPE300`).** The instance is *this one, here*. Every serious BIM tool has all three — Revit calls the middle one a **Family Type**, ArchiCAD a **Composite / Profile / Favourite** — and Bunyan had **only two**, which is the single largest modelling gap between it and the tools it intends to beat.

A **Style** is a first-class, named, versioned, **shared** entity carrying everything that is common to every instance using it:
- the **layer stack** — the ordered `{ name, material, thickness, **discipline** }` list that becomes the element's **Parts** (§3.3a). ⚠ **The layer is where `discipline` is AUTHORED** (D45): `EXT-215` says *structure → structural, finish.interior → architectural*, once, for all four hundred walls wearing it. **Layer names must be unique within a stack** — a name becomes a DAG node (§3.3a);
- the **section** — for a LinearMember (§3.5a), the `Section` it is swept from (§3.11a);
- any other parameter that is a property of *the kind of wall*, not of *this wall*.

**Editing a Style rebuilds every instance that references it.** That is the point, and it is the most-used operation in Revit: change `EXT-200-Concrete` and four hundred walls update.

⚠ **THREE THINGS ARE IMPOSSIBLE WITHOUT IT, AND THE THIRD IS THE ECOSYSTEM ONE:**
1. **Changing one wall type and having every wall follow** — the operation an architect performs all day.
2. **Scheduling by type** — which is *what a quantity schedule is*. "Give me all `EXT-200-Concrete`" is not a query you can ask of instances that each carry their own private copy of the same numbers.
3. **⚠ Miqdar's `DesignGroup` has nothing to write back into.** An engineer assigns **one section to a GROUP of columns** and re-runs; without a Style, Miqdar would have to set the section on each instance one at a time — which is precisely the workflow engineers do not use. **The Style IS the DesignGroup's counterpart in Bunyan**, and the round-trip is only trustworthy because both sides now name the same shared thing.

### 3.5 GenericSolid (the escape hatch)
A Type whose "parameters" are a free sketch plus an operation (extrude/revolve). It exists so the modeller is never blocked by the absence of a named Type, and it is the **import target for any geometry that does not map to a known Type** (e.g. unrecognized IFC entities import as GenericSolid with geometry preserved but non-parametric). It keeps the product useful at every stage of its growth.

**⚠ "Geometry preserved" means an exact B-Rep solid — never a mesh.** This is a *domain* rule, not an implementation preference, and it follows directly from §2: an imported thing that is only triangles cannot be measured, sectioned, booleaned or edited. It would be a **backdrop, not a building** — present on screen but outside the model's rules. An importer that cannot produce solids is therefore not an acceptable importer, whatever its convenience. *(This is why IFC import is IfcOpenShell and not `web-ifc` — spec D16.)*

### 3.5a LinearMember — Beam and Column are ONE concept *(decision D32)*

**A section, swept along an axis, with a justification.** That is a beam. Rotate the axis and it is a column. Bunyan shipped a `Column` (*"simple profile extrude"*) and **no `Beam` at all** — and the two were never the same concept, though they always were.

A **LinearMember** carries: an **axis** (two points, or two grid intersections), a **Section** from the catalogue (§3.11a, via its Style), a **cardinal point / justification** (which line of the section the axis actually runs through — top-of-steel, centroid, face; getting this wrong is a classic BIM error), and a **rotation** about the axis. `Beam` and `Column` are **specialisations**, not siblings — which is exactly how **IFC** sees it (`IfcBeam` and `IfcColumn` are both an `IfcExtrudedAreaSolid` swept along an axis), and how an engineer sees it.

⚠ **WHY THIS IS NOT A "NICE TO HAVE": WITHOUT A BEAM, THE ECOSYSTEM'S FLAGSHIP WORKFLOW IS LOSSY AT LAUNCH.** Miqdar's *structure-first* path — engineer designs the frame, exports it to Bunyan, architect builds the building around it — is **mostly beams and columns**. With no Beam type, every beam would land in Bunyan as a **`GenericSolid`**: geometrically correct, semantically dead. It could not be scheduled, re-sectioned, or round-tripped. **Miqdar's own spec had written that off as "lossy but correct… ACCEPTED".** It is not acceptable — **the ecosystem is the product**, and the kernel cost of fixing it is **zero** (`extrude` already sweeps a profile along a direction).

### 3.6 Opening & Host (the canonical parametric relationship)
An **Opening** is a void subtracted from a **Host** (a Wall or Slab). It is the archetype of a *reference-carrying* object and the reason persistent naming exists:
- The Opening references a **face of the host** via a `SubShapeRef` (§5), plus a position and size.
- When the host's parameters change and its geometry is rebuilt, the referenced face must still be found so the Opening re-cuts correctly.
- **Anchoring semantics (a domain decision, not an implementation detail).** How an Opening repositions when its host is resized is governed by an **anchoring parameter** on the Opening:
  - `fixed` — the Opening holds an **absolute offset from a datum edge/corner** of the host (the safe, predictable default). Growing the wall does not move the opening.
  - `proportional` — the Opening's position scales with the host, so it "floats" as a fraction of the host's extent.
  - `centered` — the Opening stays centred on the host face.
  This anchoring model is the seed of the general **constraint** concept the product grows toward (a real geometric constraint solver is a future direction; the anchoring parameter is the domain-level down-payment on it).

**⚠ AN OPENING HAS NO PARTS, AND THEREFORE NO DISCIPLINE** *(decision D45).* It is an **absence**, not a member: it has no material, no volume of its own, and no trade builds it. Its structural significance is a property of **the host** — Miqdar does not read *"an architectural opening element"*; it reads *"this structural wall part has a 1.5 × 1.5 void at (u, v)"*, **from the host's own B-Rep, where the hole physically is.** Nothing is invented, and the engineer sees the penetration in the only place it exists. *(The same holds for any future part-less element: no parts ⇒ no discipline ⇒ it appears in no discipline filter and no work package, which is correct — you cannot schedule a hole.)*

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

### 3.11 Material — a first-class, shared ENTITY *(decision D33; was "a property", and that was the bug)*

**A Material is a registered, named, versioned entity** — `C25/30`, `S235`, `EPS-80`, `Plaster-15` — carrying appearance **and physical properties** (density, E, f_ck, f_y, thermal conductivity). It is **shared**: a Part references it, a schedule groups by it, and **Miqdar reads its physical properties as solver input**.

⚠ **The old model said Material was "a property of an object/type", and that quietly foreclosed both consumers it was reserved for.** A material that is a *string on an object* cannot carry `f_ck`, cannot be grouped by a schedule, and cannot be bound by an analysis engine. **The two things the concept existed to enable were the two things it could not do.**

- **Part → Material** (§3.3a) is what makes *"how much plaster?"* answerable.
- **Style → layer stack → Material** (§3.4a) is what makes it answerable for *four hundred walls at once*.

### 3.11a Section — the catalogue *(decision D33)*

A registered, named, versioned **profile**: `IPE300`, `HEA200`, `RECT-300x600`, a rebar bar. A **LinearMember** (§3.5a) is swept from one, **via its Style**.

⚠ **A free-form authored loop is not a section.** `IPE300` must be a *thing with a name and identity* — otherwise it cannot be scheduled ("all IPE300"), cannot be design-grouped by Miqdar, and cannot survive a round-trip as anything but coordinates. The Profile (§3.7) remains the escape hatch for a shape the catalogue does not have.

### 3.11b Quantity (declared, and now actually answerable)

Typed measurable properties (length, area, volume, count) a Type exposes. **These stopped being theoretical** the moment `measure` gained a `ref` (it can measure a *named sub-shape*, not just a whole solid) and elements gained **Parts** with **Materials** — those are the two hooks a schedule needs, and both now exist.

These back the **analysis & quantities** north-star (§9).

### 3.12 Command & UndoableEdit
A **Command** is an *actor's* action (draw, extrude, boolean, move, array, retarget…) — where the actor may be a human at the UI **or an AI agent** (§3.13). Executing a Command against the Document produces an **UndoableEdit** — a *state delta*, not a recorded command to replay. Undo/redo moves the parametric state backward/forward and **re-resolves references**; because identity is stable and geometry is deterministically rebuildable, this avoids the classic "replay produces different topology" hazard. A Command whose kernel work fails produces **no** UndoableEdit (§7).

Two domain-level properties of an UndoableEdit, both load-bearing for §3.13:

- **The delta *is* the diff.** The state delta undo needs in order to reverse an action, and the answer an actor needs in order to **verify what its action actually did**, are the *same object*. A Command therefore **returns** its UndoableEdit; it does not merely push it onto a stack. This is what makes an action *verifiable* rather than merely *issued* — and it is the difference between an agent that can check its own work and one that must guess.
- **Edits may be grouped into a transaction.** An UndoableEdit may declare membership in a transaction; edits sharing one transaction undo and redo as **a single all-or-nothing unit**. v1.0.0 emits exactly one edit per Command (every edit is its own transaction), but the concept is **reserved in the model** because every *composite* action the product grows toward — "add a room", "import and place" — is a set of edits that must never be left half-applied.

### 3.12a The JOURNAL — and it is NOT the undo stack *(decision D40)*

**⚠⚠ THE UNDO STACK AND THE CHANGE FEED ARE TWO DIFFERENT THINGS, AND CONFLATING THEM COST US THE MOAT.**

The **undo stack** is a *session convenience*: bounded, and an undo **removes** an edit from it. The **journal** is the model's **append-only record of what happened**: every UndoableEdit, in order, carrying a **monotonic `seq`**, **never trimmed, never popped**. **An undone edit is journalled as a REVERSAL** — never erased — because a consumer downstream may already hold the state it is being reversed *from*.

**Why this is a domain concept and not bookkeeping:** the whole ecosystem rests on the sentence *"`change_type` is **read** from the edit log, never inferred by diffing two models"* (§3.15, domain rule 14). **A bounded, mutable stack cannot support that sentence.** *(It did not: the first implementation used the undo stack — 200 deep, popped by undo, with no revision anchor — so "what changed since revision N?" had no answer in the file, and a producer would have had to diff. Found by review, 2026-07-13.)*

A **Model Revision** (§3.15) therefore records **`issued_at_seq`** — the journal position at which it was issued — and the delta *is* `journal.filter(e => e.seq > revN.issued_at_seq)`. **Read, not inferred, by construction.**

**⚠ Issuing is a COMMAND** *(decision D41)*, not a file operation: it is *"an actor doing something to the Document"* and **domain rule 9 admits no second path.** An agent that can author a building must be able to release one.

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

### 3.15 THE ECOSYSTEM — Model Revision, PEI, and the Clean Delta *(decisions D34–D37)*

Bunyan is not a lone app. It is the **authoring head of a four-product ecosystem**, and the domain must name the joint or the joint will be invented three times:

| Product | Role | Reads from Bunyan |
|---|---|---|
| **Bunyan** | authors the building — exact B-Rep, persistent identity | — |
| **Miqdar** | structural analysis & design | the **model** (`.bnn`) + the **change feed** |
| **Planitor** | 4D/5D construction management (schedule, cost, resources) | the **change feed** |
| **BIMsync** | BIM collaboration; the **on-ramp for FOREIGN models** | *(peer producer, not consumer)* |

**Model Revision.** An **issued** snapshot of the document (`snapshot_number`, `previous`, lineage, **and `issued_at_seq` — the JOURNAL POSITION at which it was issued**, §3.12a). Saving is not issuing: a *revision* is a deliberate act — *"this is the model I am handing downstream"* — and it is the anchor the whole ecosystem's change tracking hangs from. Bunyan had **saves and no revisions**; you cannot compute a delta against a file that was never declared a baseline.

⚠⚠ **AND A BASELINE WITHOUT A POSITION IN THE LOG IS STILL NOT A BASELINE.** *"What changed since revision N?"* is `journal.filter(e => e.seq > revN.issued_at_seq)` — and **that sentence is only computable because the revision knows where in the journal it stands.** *(It did not: the revision carried no anchor and the "log" was a 200-deep undo stack, so the delta was **not computable from the file at all**, and a producer would have had to fall back to **diffing two models** — the exact guessing this whole section exists to abolish. Found by review, 2026-07-13; fixed by D40/D41.)* **Issuing is a Command** (D41): an actor that can author a building can release one.

**PEI — Persistent Element Identity.** The ecosystem's binding currency. **⚠ And in Bunyan it is not a new concept: it IS the element's `id`** (§3.3), which is derived from the recipe DAG and therefore stable across every rebuild, resize and re-issue. **Sub-element bindings use `SubShapeRef`** (§3.9) — so *"the formwork area of that beam's soffit"* survives the beam being resized.

**⚠⚠ WHY THIS IS THE ECOSYSTEM'S WHOLE VALUE, AND IT IS A STRUCTURAL FACT, NOT A CLAIM.**
Every other BIM tool loses element identity on revision: IFC GlobalIds churn, so when the architect re-issues, **every schedule binding, every quantity and every progress record attached to those elements breaks.** That single failure is why contractors abandon model-driven scheduling and go back to spreadsheets.
**BIMsync is an entire platform built to manufacture, for foreign models, the property Bunyan has by construction** — it *mints* a PEI, *fingerprints* elements to re-link them after churn, and where it cannot be sure, **it puts a human in front of a "confusing-change resolution queue."**
⇒ **For a Bunyan-authored model that queue is empty. Always. By construction.** Nothing was ever lost, so nothing has to be guessed back.

**The Clean Delta Package.** The canonical cross-product contract (owned as **one versioned schema** — D36): *what changed since revision N*, per element, with a `change_type`, a resolved spatial container, a classification and a **quantity**. Bunyan is a **native producer** of it (D34), and produces it in a strictly stronger form than any IFC-based producer can:

- `change_type` is **read off the JOURNAL** (§3.12a) — Bunyan *knows* the wall moved; it does not diff two models and infer it. **⚠ Read off the *journal*, not the undo stack: see §3.12a for why that distinction is the difference between the claim being true and being a slogan.**
- `reidentified` **cannot occur**; `split` / `merge` are reported **authoritatively** (they were *commands*).
- `quantity.basis` is **`exact`** — measured on the B-Rep (`measure` on a `ref`), **per Part, per Material** (§3.3a, §3.11). ⚠ **And what cannot be measured is OMITTED, never zeroed** *(D45)*: an unresolvable Material yields **volume and area (which are exact) and NO mass** — because a missing density is an *unknown*, not a nought, and *"0 kg, basis: exact"* is a wrong number wearing the badge that says trust me. **Rule 15 forbids an estimate dressed as a measurement; it forbids this a fortiori.**
- **⚠ `discipline` is carried PER PART, not per element** *(decision **D45**)*. **This is the field the work-package routing actually runs on**, and an element-level value cannot express the thing every real element is: an RC wall is a **structural core with architectural plaster on it**. ⇒ **The concreter's task binds to the `structure` part and the plasterer's to `finish.interior` — of the same wall, with the same PEI.** *That is what "a task binds to the part it actually builds" means, and a per-element discipline made it impossible.* **⚠ Agreed while the schema is still soft (D36b): free today, a three-repo amendment once it is signed.**

⚠ **That last line deletes a whole layer of guessing downstream.** Planitor today reconstructs a steel column's weight through a fallback ladder — *"section area from the IFC profile **or** a parameter; length from a declared quantity **or** the geometry"* — and **hardcodes steel's density at 7850** because IFC so often will not tell it. **Bunyan has every one of those inputs exactly**: the Section (§3.11a), the Material's density (§3.11), the axis length, and the part's true volume. **The ladder collapses into a lookup.**

**Interoperability, restated.** `.bnn` is the **model** (full, parametric, round-trippable — Bunyan ↔ Miqdar). The **Clean Delta** is the **change feed** (Bunyan/BIMsync → Planitor, Miqdar). **IFC is the door for the outside world**, not the ecosystem's internal transport — because IFC cannot carry a recipe, a `SubShapeRef`, or a stable id, which are the three things the ecosystem runs on.

---

## 4. Identity — the rules that make the model coherent

Identity is where BIM/CAD domains usually break. Bunyan's rules:

- **Instance identity** (`id`, `levelId`, `typeId`) is assigned on creation and **never reused**.
  - **⚠ AN ELEMENT'S `id` IS A PREFIXED ULID — `wall-01J8Z3K7Q2…`** *(decision **D44**)*. A readable type prefix, plus a **globally unique, time-sortable** suffix. **This is not cosmetics; it is domain rule 8.** A document-local counter (`wall-7`) is unique only *within one document* — so **two peers co-editing would both mint `wall-7`**, and making that safe needs a central id allocator, i.e. **a backend, which D37 forbids Bunyan to build**. A counter would therefore have **foreclosed the real-time co-editing north-star** (§9), and equally the merging or superposition of two models — and **re-minting a PEI to fix it later is "not a refactor; it is a breaking change to three other products"** (rule 13). ⇒ A ULID needs **no counter, no allocator and no server**, and it makes id-reuse **impossible by construction** rather than by discipline. *(It was reuse-by-discipline, and the discipline failed: the counter was rebuilt on load from the **surviving** ids, so deleting `wall-3` and reopening handed its PEI to the next new element. Found by review, 2026-07-13.)*
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
- **Object → Style** (`styleId`, §3.4a): the shared, named parameter set it is an instance of. ⚠ **Editing the Style rebuilds every object that references it** — this edge is the one that makes "change the wall type, update 400 walls" a single edit, and it is the edge Miqdar's `DesignGroup` writes along.
- **Object → Level** (`levelId`): organizes it vertically. **Object → Grid** (`gridRefs[]`, §3.2a): organizes it horizontally.
- **Object → Part** (ordered, §3.3a): an element owns an ordered list of parts, each one solid. **Part → Material** (§3.11): what it is made of — and therefore what it can be billed as. **Part → Discipline** (§3.3a, D45): **who builds it** — and therefore which work package it belongs to, and whether Miqdar idealizes it. ⚠ **The element carries neither**: an element is a *composite of disciplines*, and saying it has one is saying something false about the parts that differ.
- **Style → layer stack → Material**, and **Style → Section** (§3.11a) for a LinearMember: the shared definitions the parts are built from.
- **Object → Object via SubShapeRef** (host/dependent): the parametric backbone — Opening→Wall, Fillet→edge, future hosted families. Directed; drives dependency tracking and incremental rebuild. ⚠ **A ref targets a PART's node** (`wall-1.structure`), which is exactly why parts cost the identity system nothing: `nodeId` was always an opaque string.
- **Operation → Operation** (DAG): input/output derivation; the substrate of identity and rebuild.
- **Document → View** (derivation): views are projections, always regenerated.
- **Type → Codec** (via `ifcMapping`): how a kind of object crosses the interchange boundary.
- **Object → Quantity** (§3.11b): the analysis substrate — **realizable at last**, because a Part carries a Material and `measure` takes a `ref`.

**Domain invariant:** the reference graph among objects is a DAG (no cyclic hosting). Dependency direction defines rebuild order.

---

## 7. States & lifecycle

**Document:** `new → dirty ↔ saved`, with an orthogonal `recovered` (from autosave after a crash).

**BIM Object geometry:** `valid` (built and cached) · `stale` (params changed, awaiting rebuild) · `rebuilding` · `failed` (kernel operation failed, **or the element cannot be built at all — see below**) · `broken-ref` (a `SubShapeRef` it depends on could not be resolved).

**⚠ THE UNBUILDABLE ELEMENT — an unknown Type, or one from the FUTURE** *(decision **D43**)*. A document may legitimately contain an element this session **cannot build**: a Type it does not have registered (a plugin type; a script-registered type, §9; **a `.bnn` written by Miqdar**, which is on its own release clock and *must* be — §11), or an element authored against a **newer version of a Type than this app carries** (`typeVersion > type.version`). The rule:

> **The document OPENS. The element is `failed`, visible, and named ("this needs Wall v3; you have v2"). It is NEVER built, NEVER edited, NEVER a host — and it is PRESERVED VERBATIM THROUGH SAVE.**

**⚠⚠ THE SAVE HALF IS THE WHOLE POINT.** Dropping what we do not understand would mean *open a Miqdar file → save it → **its columns are gone, and their PEIs with them.*** A Bunyan round-trip must be **lossless for a file it only partly understands** — which is exactly the property IFC never gives anyone. And **an element from the future is never built against an older schema**: that is a *wrong building* rather than a refused one, and it is the failure D36/D45 exist to prevent. **Refusal is visible; a plausible wrong answer is not.**

**Operation-failure semantics (a domain-level rule, because it defines what the user can trust):** kernel operations fail on legitimate input (fillet radius too large, open/self-intersecting profile, empty boolean). When one fails, Bunyan **rejects the edit and keeps the last-good state** — no partial geometry, no silent repair — and surfaces a typed, understandable error. (Optional auto-repair and a downloadable repro bundle are future refinements; the *contract* is "reject + keep last-good".)

**⚠ AND "REJECT" MEANS THE WHOLE EDIT, NOT THE ELEMENT THAT REFUSED** *(decision **D42**)*. An edit may touch **four hundred** elements (a Style edit, §3.4a). If **one** of them refuses, **nothing is applied** — not the scene, not the geometry, not one sibling's solid. *(It was not so: the scene rolled back and the geometry did not, leaving a wall nobody had edited standing at a thickness the document had rejected, and reporting **double its true volume** as an `exact` quantity. Found by review, 2026-07-13.)*

**⇒ And because "will this work?" is now a question worth asking before acting, every Command may be run as a `dryRun`** *(D42)*: it executes **for real** — against a staged state, running the kernel, building the solids — and then **throws the result away**, returning either the `UndoableEdit` it *would* have produced or the typed failure naming the element that refused. **It is not a cheaper, semantic-only check**, because a check that cannot promise the booleans succeed is a check that promises nothing. **One executor, one code path, one set of failure modes** — a human sees the offender highlighted before committing, and an agent looks before it leaps. *(This replaces per-command preview queries: a hand-written `planDelete()` beside a `deleteElement()` is a second description of one behaviour, and domain rule 10 forbids those.)*

**Reference:** `resolved ↔ broken`. A broken reference is a first-class, visible state awaiting **manual retargeting** (itself an undoable edit), never auto-healed.

**Cache:** `fresh ↔ stale` (stale when the kernel build id changes or the recipe changed); a stale/missing/corrupt cache is rebuilt from the recipe and never treated as truth.

---

## 8. Core domain rules (the invariants to preserve at every version)

1. The parametric recipe is the source of truth; geometry and views are derived and disposable.
2. Sub-shape references are stable identities derived from provenance, never positional indices.
3. Broken references fail loudly (marked, manually retargeted), never silently reattach.
4. Failed operations reject and preserve the last-good state; no partial or auto-invented geometry.
5. New kinds of things (types, commands, formats, views) are **additive registrations**, never core edits.
   ⚠⚠ **SWEPT 2026-07-27 (Entry 60, D71) AND IT WAS HALF TRUE.** Counting what is actually registered — **51 types, 39 commands, 1 codec (inside a test), 0 views** — showed that `FormatCodec` and `ViewDefinition` carried **no behaviour** and that **nothing dispatched through either registry**; `.bnn` was read and written by name. Formats now genuinely satisfy this rule (`read`/`write` + `codecFor` + a registered `BNN_CODEC`). **Views are a RESERVED shape and are labelled as one** until the P6 bodies (D58) land. *A registry that holds descriptors and is consulted by nobody does not make this sentence true — and a decision was once discharged on the assumption that it did.*
6. Identity assignment is deterministic and reproducible across machines and parallel execution.
7. Units are millimetres internally; interchange declares its own units at the boundary.
8. Nothing in the current version may foreclose a declared north-star (§9).
9. **There is exactly one command layer.** Every actor — human or agent — acts on the Document only through Commands (§3.13); no actor has a private path to the kernel. Every Command **returns** the state delta it produced, so every action is verifiable. **⚠ ISSUING A REVISION IS A COMMAND** *(D41)* — it is an actor acting on the Document, and there is no second path. **And every Command can be run as a `dryRun`** *(D42)*: full fidelity, same code path, result discarded — so *"what would this do?"* is answered by **doing it**, not by a second, hand-written description of it (rule 10).
10. **The model describes itself.** Types and Commands are discoverable at runtime from the registries that govern them (§3.13); there is no separately-maintained description of what the app can do.
11. **An element owns an ordered list of PARTS; a part belongs to exactly one element.** *(D30.)* Never fuse two **elements** — that re-owns the first one's faces and retroactively breaks every reference hosted on it. But an element is **not** one solid: it is its parts, each with a material, and a boolean **among an element's own parts** (an opening cutting every layer of its host) is an ordinary intra-element operation. **A single-solid element is just an element with one part.**
12. **What is shared lives on the STYLE; what is unique lives on the INSTANCE.** *(D31.)* If two elements can legitimately disagree about a value, it is an instance parameter; if they cannot, it belongs to the Style and duplicating it onto instances is a defect. **Materials and Sections are shared entities, never strings** *(D33)* — a value that must be grouped, scheduled, or read by an analysis engine cannot be a copy.

13. **⚠ IDENTITY IS THE ECOSYSTEM'S CONTRACT, NOT AN INTERNAL CONVENIENCE.** *(D34.)* An element's `id` **is** its PEI, and it survives every rebuild, resize and **re-issue**. Downstream products (Planitor's schedule, Miqdar's analytical model) bind to it — and to `SubShapeRef` for sub-element bindings. ⇒ **Anything that would re-mint an element's id on a rebuild is not a refactor; it is a breaking change to three other products.** *A whole platform (BIMsync) exists to manufacture this property for models that lack it — that is the measure of what it is worth.*
14. **A model is ISSUED, not merely saved.** *(D34.)* A **Model Revision** is a deliberate snapshot; deltas are computed against it. **`change_type` is READ from the edit log, never inferred by diffing geometry** — a tool that guesses what changed will eventually guess wrong, and downstream that is a wrong schedule.
    **⚠⚠ AND THE LOG THAT SENTENCE MEANS IS THE *JOURNAL*, NOT THE UNDO STACK** *(D40, §3.12a)*. The journal is **append-only, unbounded, never popped by an undo**, and a Revision records **`issued_at_seq`**, the position it was issued at. **A bounded, mutable, unanchored stack cannot answer "what changed since revision N", and a rule that rests on one is a slogan.** *(It rested on one for an entire phase, and nobody noticed, because the undo stack was in the same file and had the same shape.)*
15. **A quantity is MEASURED, never reconstructed — and what cannot be measured is OMITTED, never zeroed.** *(D34, sharpened by D45.)* Bunyan reports quantities as **`exact`**, per Part, per Material, from the B-Rep. **It must never emit an estimated quantity dressed as a measured one** — the downstream products have a confidence ladder precisely because everyone else's numbers cannot be trusted, and Bunyan's entire contribution is to make that ladder unnecessary. ⚠ **A fortiori it must never emit a WRONG one wearing the `exact` badge**: an unresolvable Material yields volume and area (exact, because the geometry is real) and **no mass at all**. A missing density is an **unknown**, not a zero.
    ⚠⚠ **SWEPT 2026-07-27 (Entry 60, D72) AND IT WAS DIRTY TWICE — both times by the road nobody audits: a number that
is arithmetically impeccable and answers a question no one asked.** (1) The Clean Delta's `length` was **reconstructed
from a param** while `volume` beside it was **measured**, so a butted wall reported 2.00 m for a 1.9 m solid — *the
package contradicting itself inside one `basis: 'exact'`*. Now the built axis, clipped by its joins. (2) `area` was the
solid's **total enclosing surface** — 94.80 m² on a wall whose paintable face is 15 m² — counting buried inter-layer
faces, edges and caps. Now the faces a trade actually bills, declared by the Type (`BuiltPart.exposedRefs`) and
**measured per face**, so an opening subtracts and its reveals do not count. ⇒ **"Measured" is necessary and not
sufficient: a quantity must also be the RIGHT MEASUREMENT.** An exactly-measured number that no trade bills is a wrong
number wearing the `exact` badge just as surely as an estimate is.
16. **⚠ ONE PHYSICAL THING IS ONE ELEMENT, WITH ONE PEI — AND DISCIPLINE IS A PROPERTY OF ITS PARTS, NOT OF IT.** *(D45, D46.)* Bunyan is **one model**, not federated discipline models superposed. A column that appears in both the architectural and the structural view **is one column**: its RC core is a **structural part**, its cladding an **architectural part** (§3.3a). ⇒ **A quantity can never double-count**, and a downstream schedule binds to **one** id.
    ⚠⚠ **AND THE DOUBLE COUNT'S REAL ROAD WAS GEOMETRIC, NOT TAXONOMIC (Entry 60, D69).** Swept 2026-07-27: the discipline half of this rule was clean everywhere, but two walls could still physically OVERLAP — a partition whose end landed on another wall's **mid-span** found no join partner, kept a plain cap, and drove its last half-thickness inside the through wall, so that sliver lived in **both** B-Reps. Measured: **2.8800 m³ reported where 2.8320 m³ is the truth**, wearing `basis: 'exact'`. ⇒ **Two elements' solids must never occupy the same space**, and a join is how a wall stops. Mid-span T-junctions auto-butt as of v1.0.0.
    **The superposition rules — ⚠ PROVISIONAL (owner, 2026-07-13), and deliberately recorded unfinished so nothing freezes against them:**
    - **MEP never collides** with another discipline; **Architectural and Structural may.**
    - **On a collision, STRUCTURAL always wins**: the duplicated column *is* structural, and only its finishes are architectural. *(This is also the priority order a filter or an export must use if it is ever forced to reduce an element to a single discipline — but **it must not be**: filter the parts.)*
    - **⚠ OPEN, and named on purpose:** what is an MEP duct that genuinely occupies the same space as a structural beam? That is almost certainly a **CLASH** (a thing to be reported and resolved — `distance` already answers it, §9) rather than a *collision of disciplines*, but it is **not yet ruled.** *Do not implement past this line.*

17. **A DRAWING IS A PROJECTION OF THE B-REP, NEVER AN AUTHORED ARTIFACT.** *(D58.)* Every plan, section, elevation, schedule, tag, and dimension is a **live view computed from the model** — a `sectionCut`, a query, a `SubShapeRef`/vertex anchor — regenerated when the model changes, never the source of truth. A hand-drafted line not backed by geometry is the **same failure class as a mesh treated as authoritative** (§10): it drifts and lies. ⚠⚠ **This is the capability Revit exists to sell** — a coordinated construction-document set is the architect's actual deliverable, not a 3D model. **v1.0.0 ships the MINIMAL projection (one plan, one section, one schedule); the full documentation apparatus is the largest single item on the road to parity** (`v1.0.0_imp_plan.md` "Road to parity"). ⇒ **its anchoring contracts — a View descriptor, a Dimension/Tag on a `SubShapeRef`+vertex, a Schedule bound to type/param/quantity, a Sheet/Viewport — are RESERVED at the P5 freeze**, because foreclosing them is the most expensive foreclosure available.

18. **AN ELEMENT MAY OWN CHILD *ELEMENTS*, NOT ONLY PARTS.** *(D59.)* A Part is a solid inside one element (rule 11); but a **curtain wall** is panels + mullions on a grid, a **stair** is treads + stringers + railings, a **group/assembly** is elements-of-elements — each child a first-class element with **its own PEI**, hosted by its parent. Hosting is therefore **not one level deep** (opening→host is only the first case). The frozen model must carry **composition** as a real relationship, and — per the owner ruling (D59) — the **complete composition/hosting model is DESIGNED before the freeze**, not merely reserved, so a curtain wall / stair cannot become a frozen-contract amendment. ✅ **BUILT (2026-07-22, Model A — `P5_step5B_composition_nesting_design.md`):** a parent GENERATES its children from its recipe (never stored `scene.elements` rows — recipe-is-truth); each child's PEI is DERIVED (`${parentId}:${slot}`, the `nodeId`/`lateral.k` discipline one level up), so a curtain wall is ONE authored row whose panels/mullions regenerate each rebuild and a tag on a vanished slot is a broken-ref (the D1 story, one level up). The carrier is `BimObjectType.buildChildren?` + `ElementGeometry.children?` (a tree); **`parentElementId` is re-pinned to the MANUAL group/nest case** (a flat `groups` collection is additive v1.0.x). ⚠ **The anti-fuse rule (rule 11) still binds and HELD**: composing elements never fuses their solids; a nested element's references survive its siblings changing (the real `core.curtainwall`, depth-2, proved it vs OCCT).

---

## 9. North-stars — future directions the model must not dead-end

The domain model is shaped so these become **additive** growth, not rewrites. Each notes the domain hook already present.

- **Analysis & quantities** (structural/energy analysis, schedules, quantity take-off). *Hook:* **⚠ THE HOOKS STOPPED BEING THEORETICAL IN 2026-07-13 (D30/D31/D33).** An element owns **Parts**, each with a **Material** (§3.3a, §3.11) — so *"how much plaster is on this wall?"* is answerable at all; a **Style** groups instances (§3.4a) — so it is answerable for four hundred walls at once; and `measure` takes a **`ref`** — so it is answerable for a single named *face*. Views can host schedule representations. ⚠ **Until those three landed, this north-star was declared and quietly foreclosed** — a monolithic solid with a material *string* can be billed for nothing, and **domain rule 8 exists to prevent exactly that.** *(This is also the whole input surface of **Miqdar**, the analysis product — §11.)*
- **Real-time multi-user co-editing** of the parametric graph. **⚠ THIS IS A REVIT MOAT (worksharing), AND THE ECOSYSTEM DOES NOT REPLACE IT** — Planitor/Miqdar/BIMsync are *downstream consumers*, not co-authors; two architects editing one model is a capability Bunyan itself must own. *(D60, owner ruling 2026-07-21.)* *Hook:* globally-unique PEIs (D44), edits as discrete **UndoableEdit deltas** (§3.12), and the **append-only JOURNAL** (§3.12a) — together a strong CRDT/OT substrate. ⚠⚠ **A concurrency/merge SEAM is therefore RESERVED on the journal + `.bnn` before the P5 freeze** (a merge-ordered `seq`/lineage the single-user path ignores), because retrofitting one after issued files exist is a three-product amendment (D40's own caveat). Bunyan stays client-only in v1.0.0 (no backend — D37); the co-editing *transport* is a later, additive concern the reserved seam does not foreclose.
- **Server-side / headless kernel** (move heavy geometry off the browser, batch processing). *Hook:* geometry is produced behind an **engine-agnostic worker boundary** (a flat, versioned message protocol — see `architecture.md`), so the kernel's *location* is not baked into the domain. The identity system is explicitly designed to allow a future native/C++ implementation without changing meaning.
- **Scripting & generative design + USER-AUTHORED FAMILIES (no code).** *(D61, owner ruling 2026-07-21.)* **⚠ REVIT'S FAMILY EDITOR IS A CORE MOAT** — an architect creates new parametric content **without programming**, and that democratization is a large part of why Revit's content ecosystem exists. Today a `BimObjectType` is **TypeScript code** in the app bundle, so only a developer can add a family. The direction: a **data-driven family-definition format** — a parametric family authored as *data* (sketch + constraints + param schema + build recipe) that lives in a `.bnn`/library, loaded by the registry, **not** compiled in. *Hook:* a `BimObjectType` is a contract not a class; the sketch **constraint solver** already ships (planegcs); Materials/Sections are shared registries. ⚠ **A family-definition data-format SEAM is RESERVED before the P5 freeze**, since it touches `BimObjectType`/registry contracts. Code-authored types remain the path for complex behaviour; families become the path for content.
- **Agent-operable authoring — an AI agent can explore, understand and drive Bunyan with no setup** *(decision D19; promoted to a north-star by owner ruling, 2026-07-12).* An agent should be able to open the app, ask it what it can do, read the model, act, and **verify what its action did** — without an SDK, without per-feature API wiring, and without a document written for it by hand. *Hooks, all already in the model:* **one command layer for every actor** (§3.13, domain rule 9) — so an agent is not a second-class client bolted on, it is *the same client*; **self-describing registries** (§3.4, §3.13, domain rule 10) — so capability discovery is generated, never maintained; **Commands return their state delta** (§3.12) — so an action is verifiable, not merely issued; **typed failures + reject-and-keep-last-good** (§7) — so a wrong action is a legible, recoverable refusal rather than a corrupted model; **stable identity at both the object *and the sub-shape* level** (§4, §5) — so an agent can say *"a window on the south face of that wall"* and have the reference **survive the wall being resized**, which is the thing most CAD tools cannot promise. *Strategic note (recorded because it is a product argument, not a technical one):* this is the **same wedge as openness** (§9 of `V1.0.0_spec.md`, D15) — *"you will never lose access to your models, you can verify what the geometry engine does, and an agent can drive it out of the box, because there is one public API and it is the same one the buttons use."*

**Interoperability trajectory.** Interchange is a **Codec** concept (import/export against one contract), so IFC today, and STEP/DXF/glTF/IFC5-IFCX tomorrow, are sibling registrations. Import is *mapped-or-GenericSolid*: known kinds become parametric Types, everything else survives as geometry. Export follows the same mapping as writer support matures.

---

## 9a. The Revit-parity surface — what a real competitor must model, and where Bunyan stands *(2026-07-21 strategic review)*

**Why this section exists.** Every gap this project ever found came from reading the product *against its ambition*, not its spec (§1b of `current_state.md`). The ambition is stated as *"beat Revit."* This section makes that measurable so no future agent mistakes *"ready to freeze the MVP contracts"* for *"competitive with Revit"* — they are years apart, and the docs used to conflate them. **The v1.0.0 build is genuinely two element types (Wall, Opening) on an exact kernel; the list below is the actual distance.** The authoritative status ledger + phase map lives in `v1.0.0_imp_plan.md` "Road to Revit parity"; this is the domain framing.

**A. The element taxonomy.** Revit ships hundreds of categories; the domain must carry each as a first-class type with real *behaviour*, not only geometry. The parity set, with hosting/behaviour notes:

| Category | Domain notes | Status |
|---|---|---|
| Wall, Floor/Slab, Roof, Ceiling | composite (Parts, D30); Roof needs slope-defining edges; Ceiling hosts fixtures | Wall built; rest designed/spec'd |
| Stair, Railing | **element-of-elements (rule 18)**; code-driven risers/goings; Railing host-follows | not built — nesting design gates them (D59) |
| Column, Beam, Brace | `LinearMember` (D32) — a Section swept on an axis | spec'd, not built |
| Foundation (isolated/wall/mat) | structural; hosts columns/walls | not modelled |
| **Curtain Wall** | **element-of-elements** — panels + mullions on a grid (rule 18) | ✅ built as `core.curtainwall` — the D59 nesting probe (Model A, depth-2) |
| Door, Window | Opening + `buildLeaf` (leaf/frame) — the hole *and* the solid | built as `core.opening` |
| Room / Space / Area | derived boundary (D55, room solver); **Area schemes / gross-net** below | Space built; area schemes not |
| MEP: duct, pipe, conduit, cable tray, fixtures | **systems & connectors** (§ below); needs sweep-along-path | not modelled |
| Furniture, Casework, Generic Model, Mass | placed families; Mass drives massing studies | GenericSolid is the stand-in |
| Site / Topography | surfaces, not solids; grading | not modelled |

⚠ *"Adding a type is an additive registration" is true for the **B-Rep** and false for the **behaviour**.* A stair's code compliance, a curtain wall's grid, MEP connectors — the domain content is the bulk of the remaining work and it has not started. Do not read the finished kernel as a finished product.

**B. Construction documentation** — *the thing Revit exists to sell* (rule 17, D58). Plans, sections, elevations, detail views, drafting views; Schedules (quantity + type); Dimensions, Tags, Text, annotation scale, view-graphic overrides, view range/crop; Sheets, Titleblocks, Viewports, revision clouds. **v1.0.0 = one plan + one section + one schedule; the rest is the parity backlog with anchoring contracts reserved at freeze.**

**C. Systems & connectors (MEP).** *(D62.)* A duct/pipe/conduit/cable-tray **network**: segments with **connectors** (size, system, flow direction), routing, and system classification (supply/return/sanitary/…). Geometry needs **sweep-along-path** (and likely loft) — kernel ops that do not exist and are reserved as additive (D13 permits new ops). The **system/connector type contracts** are reserved so MEP is not a frozen-contract amendment.

**D. Collaboration / worksharing.** *(D60; §9.)* Multi-user co-authoring on one model is a Revit moat the ecosystem does not cover; a concurrency/merge seam is reserved pre-freeze. The ecosystem (Planitor/Miqdar/BIMsync) is the *downstream* collaboration story, not co-authoring.

**E. Content authoring — families.** *(D61; §9.)* Data-driven family authoring so architects create parametric content without code; a family-definition data-format seam is reserved pre-freeze.

**F. Project organisation.** **Design Options / alternatives** *(D65)* — parallel design variants a view chooses among; interacts with the scene/element graph (reserve so it is additive). **Phasing** — reserved as two datums (`phaseCreated`/`phaseDemolished`, D56); confirm phase **filters + graphic overrides** are additive over that. **Area schemes / gross-net / rentable area** *(D65)* — architecture's second-most-scheduled quantity after room area; the room solver gives *net*, gross/rentable are unaddressed.

**G. Interoperability breadth.** *(D63.)* **DWG import/export** — real practices live on 2D-CAD interop (consultant backgrounds, details); reserve a DWG codec seam or record it out of scope. **IFC export** stays v1.0.x behind the `IfcSchemaVersion` abstraction (D3). **Point-cloud/reality-capture and RVT import** are recorded absent (RVT is proprietary — likely never) so no agent assumes them planned.

**H. Analytical model (the Miqdar seam).** *(D64.)* Real structural/energy analysis wants an **analytical model** — analytical lines/surfaces, supports, releases, thermal properties — which many tools store *on the element*. The P5 gate ⑧ discharged this as *"reserve nothing — hints live in Miqdar's own graph bound by PEI."* **Re-examine** whether a load-bearing analytical-anchor field belongs on the frozen type/part before accepting that (owner delegated the ruling to Zayd, to be made with evidence from `Miqdar_v1.0.0_spec.md` §3.4); this is where "the ecosystem will be built" most stresses the freeze.

---

## 10. Deliberate non-concepts (what the domain intentionally does not model)

To keep the model honest about its boundaries: Bunyan does **not** treat meshes, 2D drawings, or exported files as authoritative; it does **not** carry a global mutable geometry store outside the recipe+cache discipline; and it does **not** encode identity in geometry. These are not omissions to fix later — they are load-bearing constraints. Violating any of them reintroduces the exact failure modes (topological-naming drift, silent data loss, non-reproducible rebuilds) the model exists to prevent.

---

## 11. Pointers

- **How it is built** (layers, worker protocol, registries, determinism mechanics, security, persistence): `architecture.md`.
- **What ships in the first release** (scope, decisions, acceptance criteria): `V1.0.0_spec.md`.
- **The build sequence:** `v1.0.0_imp_plan.md`.
