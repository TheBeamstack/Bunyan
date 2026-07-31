# P5 step 5F — Row Ⓕ: the last pre-freeze reservations (D62 MEP · D63 DWG · D65 Design Options / phase filters / area schemes)

**Status:** DESIGN — owner framing questions in §7, unanswered. **No code written yet.**
**Author:** Zayd, 2026-07-24 (dev box, headless). **Predecessors:** rows Ⓐ (D58 documentation anchors,
Entry 47) · Ⓑ (D59 nesting, Entry 48) · Ⓒ (D60 merge seam, Entry 49) · Ⓓ (D61 family seam, Entry 50) ·
Ⓔ (D64 analytical anchor, Entry 52). **Successor:** D66 (the 4-axis scale measurement), then the
owner-gated FREEZE (P5 step 6).

**What row Ⓕ is for.** Three parity capabilities that Bunyan v1.0.0 does **not** build, but whose
_contracts_ would be expensive to retrofit after the P5 freeze: **MEP systems & connectors (D62)**,
**DWG interop (D63)**, and **Design Options + phase filters + area schemes (D65)**. The imp_plan calls
them _"cheap reservations (mostly additive), but recorded before freeze so they are not 'discovered
missing.'"_ This doc tests that "mostly additive" claim per capability rather than assuming it.

**The method (the one that found every gap — `current_state.md` §1b).** For each capability: walk a real
case against the real contracts, ask _what shape would this need_, then ask **the freeze question** —
_if we build this in v1.0.x with nothing reserved, does it AMEND a frozen contract or ADD to it?_ Only
an amendment justifies a reservation. **A reservation that isn't owed is not free: it is a frozen field
nobody reads, and the freeze is the moment we stop being able to delete it.**

---

## 1. The headline finding — two of the three need LESS than the plan assumed

| Capability                                        | The plan's assumption                                                                          | What the walk found                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **D62** — MEP sweep-along-path/loft **kernel op** | "kernel ops that do not exist and are reserved as additive"                                    | ✅ **NO RESERVATION OWED.** The protocol froze at P3, and **`faceFrame` was already added POST-freeze** (Entry 30) under D13 — _"adding an op is additive and permitted."_ Adding `sweepAlongPath`/`loft` in v1.0.x is the **proven, precedented path**, not an amendment. Record it; reserve nothing. |
| **D62** — system/connector **type contracts**     | "reserved so MEP is not a frozen-contract amendment"                                           | ⚠ **GENUINELY OWED — this is the real row Ⓕ work.** A connector and a system are per-element/graph state that touches P5-frozen shapes (§3).                                                                                                                                                           |
| **D63** — a **DWG codec seam**                    | "reserve a DWG codec seam or record it out of scope"                                           | ✅ **THE SEAM ALREADY EXISTS.** `FormatCodec` + `registries.codecs` (`registries.ts:82`) is the interchange contract, and **domain rule 5** makes a new format an _additive registration_. ⚠ **But a DWG _underlay_ is not a codec output** (§4) — that is the part with no home.                      |
| **D65** — Design Options                          | "interacts with the scene/element graph (reserve so it is additive)"                           | ⚠ **GENUINELY OWED** — three separate bindings, and one of them is a trap (§5.1).                                                                                                                                                                                                                      |
| **D65** — phase filters/overrides                 | "confirm phase filters + graphic overrides are additive over `phaseCreated`/`phaseDemolished`" | ✅ **CONFIRMED ADDITIVE** — a filter is a _view_ property over datums that already exist (§5.2).                                                                                                                                                                                                       |
| **D65** — area schemes / gross-net                | "the room solver gives net; gross/rentable are unaddressed"                                    | ⚠ **OWED, and it is a MEASUREMENT-RULE question, not a storage question** (§5.3).                                                                                                                                                                                                                      |

⇒ **Row Ⓕ is smaller than billed on two counts and sharper on three.** The recorded-only items (the sweep
op, the codec registry, phase filters) cost a paragraph each. The real reservations are: **connectors +
systems**, **design options**, **area schemes**, and **a DWG underlay** (if it is in scope at all).

---

## 2. The reservation test, stated once

A shape earns a reservation only if **all three** hold:

1. **It touches a P5-frozen contract** — `Element`/`scene.json`/`BimObjectType`/`Command`+`argsSchema`/
   `SubShapeRef`/`ParamSchema`/`UndoableEdit`. _(The kernel protocol froze at P3 and D13 already permits
   additive ops ⇒ a kernel op never qualifies.)_
2. **The v1.0.x body could not be built additively without it** — i.e. building it later would _edit_ a
   frozen shape rather than _add_ an optional one beside it.
3. **The shape is knowable now.** Reserving a shape we would get wrong is worse than reserving nothing:
   a wrong frozen field is the amendment we were avoiding, plus a migration.

⚠ **Precedent that decides most of this (rows Ⓐ/Ⓒ/Ⓓ, three times):** _one optional, absent-defaulted
top-level `scene.json` collection_ is purely additive — no `SCENE_SCHEMA_VERSION` bump, no migration, no
`emptyScene()` entry, no `SceneCollection` membership, and it folds into frozen v2 exactly. **That is the
cheapest reservation shape Bunyan has, and it is already proven three times** (`views`/`annotations`/
`schedules`/`sheets`; the merge-seam fields; `families`). Where a capability needs a _definition_
collection, this is the answer and it is nearly free.

---

## 3. D62 — MEP systems & connectors

### 3.1 The real case

A supply-air duct run: `AHU-1 → duct → tee → duct → diffuser`, in system _SA-1 (Supply Air)_. Each
segment is a rectangular duct 400×250 swept along a path. A **connector** is where two components join:
it carries a **size/shape**, the **system** it belongs to, a **flow direction**, and a **position +
orientation** on its element. Routing/sizing/pressure-loss are analysis — _not Bunyan's_ (and per D64's
two-graph logic, an MEP analysis engine would own its own graph bound by PEI, exactly as Miqdar does).

### 3.2 What Bunyan already covers

- **Geometry:** a duct segment is `extrude` along a straight axis today; a curved/mitred run needs
  `sweepAlongPath`. ✅ **Additive op, no reservation (§1).**
- **Discipline:** `Part.discipline: 'mep'` exists (D45) and the IFC importer maps `IfcDuctSegment` → an
  MEP-discipline type (imp_plan P6). ✅ Covered.
- **Nesting:** an air terminal hosted in a ceiling, a fitting owning sub-parts — `buildChildren` (D59). ✅
- **Classification:** `Element.classification.ifcClass` carries `IfcDuctSegment`. ✅

### 3.3 What has NO home — the two owed shapes

**(a) The CONNECTOR.** A connector is _per-element, multiple-per-element, and positional_. Today the only
places it could go are `Element.params` (an open JSON bag) or `Element.properties?` (the unschematised
pset lane). Both would "work" — and both are wrong for the same reason `Material` could not be a string
(D33): **a connector must be queryable and bindable.** _"Which connectors are unconnected?"_ and _"what
connects to this duct's outlet?"_ are the two questions an MEP tool exists to answer, and a value buried
in an untyped param bag can answer neither without every consumer re-parsing a private convention.

⚠ **But note what a connector is NOT: it is not a `SubShapeRef`.** It is authored placement data (a port
at 400mm along the axis, facing +X), not a derived sub-shape identity — so it does **not** touch the
naming system, and reserving it costs the kernel nothing (the `Part`/`nodeId` argument, D30).

**(b) The SYSTEM.** A system (_SA-1_) is a **named grouping across elements** — the MEP analogue of an
`ElementStyle` for grouping, or of the spatial tree for location. Elements reference it; a schedule groups
by it; a downstream tool filters on it. It is a _definition_ + a _membership edge_.

### 3.4 Freeze question

| Shape             | Built later with nothing reserved?                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connector         | ⚠ Would need a new `Element` field (or a private `params` convention every consumer must know) ⇒ **an amendment, or a permanent wart.** **Reservation owed.** |
| System definition | ✅ An optional top-level `scene.systems?` collection is the proven-additive move (§2). **Cheap; reserve.**                                                    |
| System membership | ⚠ An element→system edge. Either a field on `Element` or a member list on the system. **The direction is the framing question (Q1).**                         |

### 3.5 Proposed shapes (subject to Q1/Q2)

```ts
// scene.json — one optional, absent-defaulted collection (the `families`/`views` precedent)
readonly systems?: Readonly<Record<SystemId, SystemDefinition>>;

interface SystemDefinition {
  readonly id: SystemId;              // prefixed ULID (D44)
  readonly name: string;              // "SA-1"
  /** supply/return/exhaust air, sanitary, storm, hot/cold water, power, data … a STRING key, not an
   *  enum: the domain is huge and jurisdiction-flavoured, and an enum would be the amendment. */
  readonly classification: string;
  readonly discipline: Discipline;    // reuses D45's vocabulary — 'mep' for all of these
}

// Element — the connector list + the system edge
readonly connectors?: readonly Connector[];
readonly systemId?: SystemId;

interface Connector {
  readonly name: string;                                   // slot, unique within the element ('in'|'out')
  readonly at: readonly [number, number, number];          // mm, in the element's OWN BUILD FRAME
  readonly direction: readonly [number, number, number];   // outward flow normal
  readonly shape: 'round' | 'rectangular' | 'oval';
  readonly dimensions: Readonly<Record<string, number>>;   // mm — {diameter} | {width,height}
  readonly flow?: 'in' | 'out' | 'bidirectional';
  readonly systemId?: SystemId;                            // a fitting may bridge two systems
}
```

⚠ **`at`/`direction` are in the element's OWN BUILD FRAME, deliberately** — the D25/D28 lesson: the
element is authored in its own frame and _then_ placed, so a connector's coordinates survive the element
being moved or rotated in the world. Storing world coordinates would re-introduce exactly the positional
fragility `transform`-mints-no-identities exists to prevent.

---

## 4. D63 — DWG interop

### 4.1 The finding: the codec seam already exists

`registries.codecs: Registry<FormatCodec>` with `FormatCodec = {id, label, extensions, canRead, canWrite}`
(`registries.ts:82`), and **domain rule 5**: _"New kinds of things (types, commands, formats, views) are
additive registrations, never core edits."_ `core_logic.md` §9's interoperability trajectory already
names the growth path: _"IFC today, and STEP/DXF/glTF/IFC5-IFCX tomorrow, are sibling registrations."_

⇒ **A DWG codec is a registration. No contract changes. Nothing to reserve.** Record it and move on.

### 4.2 The part that has no home — a 2D underlay

The practice reality D63 names is _"consultant backgrounds, details"_ — i.e. **a DWG placed under a view
as a tracing/reference background.** That is **not** a codec output in Bunyan's sense, because:

- It is **not a building element** — it has no PEI, no parts, no material, no discipline, no quantity. It
  must never appear in a schedule or a Clean Delta. _(Importing it as `GenericSolid` elements would be
  actively wrong: it would pollute quantities and the change feed with lines that are not the building.)_
- It is **not the model** — it is a **reference attached to a view** (Revit's "DWG link", pinned to a
  plan). Its natural home is the documentation layer: a `ViewDescriptor` reference.

⚠ **This is a genuine gap with a real question attached: is a 2D underlay in scope at all for v1.0.0's
freeze?** It is squarely a _documentation_ feature (D58 territory, whose apparatus is post-v1.0.0), and
row Ⓐ already reserved the documentation collections. Reserving an underlay slot on `ViewDescriptor` is
one optional field; recording it out of scope is free. **Framing question Q3.**

### 4.3 Recorded absent (so no agent assumes them planned)

**Point-cloud / reality capture** — not modelled, not reserved. **RVT import** — proprietary format; a
reader would be reverse-engineered and legally fraught; **likely never.** **IFC export** — stays v1.0.x
behind the `IfcSchemaVersion` abstraction (D3), unchanged by this row.

---

## 5. D65 — Design Options · phase filters · area schemes

### 5.1 Design Options — and the trap

Revit's model: an **Option Set** ("Lobby scheme") contains **Options** ("Option A", "Option B", one
primary); an element may belong to an option; a view chooses which option it shows; the "main model" is
option-free. Three bindings are needed: an **option definition**, an **element→option** edge, and a
**view→option choice**.

⚠⚠ **THE TRAP, and it is the reason this row is not merely "add a collection": DESIGN OPTIONS BREAK THE
"ONE PHYSICAL THING IS ONE ELEMENT" ASSUMPTION THAT QUANTITIES AND THE CLEAN DELTA RUN ON.** With
options, a document deliberately contains **mutually-exclusive elements** — Option A's wall and Option B's
wall both exist, and **exactly one is real.** Today `quantities()` and the Clean Delta enumerate elements
with no notion that some are hypothetical. Ship options naively and a schedule silently double-counts,
and a Clean Delta hands Planitor work packages for a scheme that was never built. That is **domain rule
15's failure mode** (an estimate wearing the `exact` badge) reached by a different road.

**The consequence for the freeze:** the _storage_ is cheap (a collection + an optional element field), but
the **invariant** — _"every consumer of quantities/deltas must exclude non-active options"_ — is a
contract-level statement that belongs in the frozen record even though no body reads it yet. This is
exactly the `Grid.geometry` supersession precedent (gate ⓥ): a reserved field whose **consumer-facing
invariant** was written into the contract at reserve time, not discovered in the field.

```ts
readonly designOptions?: Readonly<Record<DesignOptionId, DesignOption>>;

interface DesignOption {
  readonly id: DesignOptionId;
  readonly setName: string;          // the Option Set ("Lobby scheme") — a flat collection, grouped by name
  readonly name: string;             // "Option A"
  readonly isPrimary: boolean;       // the one the main model + every default consumer sees
}
// Element:
readonly designOptionId?: DesignOptionId;   // absent ⇒ MAIN MODEL (today's only case)
// ViewDescriptor (documentation.ts):
readonly designOptionIds?: readonly DesignOptionId[];  // absent ⇒ primary only
```

### 5.2 Phase filters — CONFIRMED ADDITIVE, nothing owed

`Element.phaseCreated?`/`phaseDemolished?` are already reserved (D54b/D56). A **phase filter** ("show
New as solid, Existing as halftone, Demolished dashed") is:

- a **selection rule** over datums that already exist, and
- a **graphic override** — which is _display_, and display is a derived projection (rule 1/17), never
  stored truth.

Both are **view properties**, and `ViewDescriptor` is itself an already-reserved optional collection
(row Ⓐ) ⇒ adding a `phaseFilter` to it later is adding a field to a shape that is _not yet frozen in
use_ and is optional throughout. ✅ **Additive. Record the confirmation; reserve nothing.**

### 5.3 Area schemes / gross-net — a measurement rule, not a stored value

`roomMetrics()` derives a Space's area from the room-bounding solve **on the wall inner finish face**
(owner Q1, D55) — i.e. **net/usable** area. Gross (to wall centreline or exterior face) and rentable
(BOMA/carpet, with loading factors) are **different boundary rules over the same walls.**

⚠ **The key structural fact: this is NOT a storage problem.** An area is **derived, never stored**
(recipe-is-truth, D55), so gross/rentable are _additional derivations_, not additional fields on `Space`.
`footprintOf()` already computes a wall's two face-lines from centreline ± thickness/2 — **the centreline
and outer face are already in scope at the point the boundary is assembled**, so a `boundaryRule`
parameter on the solve is a pure, additive extension of a derived query.

⇒ **What (if anything) is owed is only the _scheme definition_** — "this project's rentable areas use
BOMA 2017 with a 1.15 loading factor" is authored project data with no home. That is one optional
collection, or it is out of scope. **Framing question Q4.**

---

## 6. What this row does NOT touch (stated so it is not re-opened)

- **No kernel/protocol change.** `sweepAlongPath`/`loft` are additive-when-built (D13, `faceFrame`
  precedent). Row Ⓕ writes no C++ and touches no frozen op envelope.
- **No `SCENE_SCHEMA_VERSION` bump.** Every proposed shape is an optional, absent-defaulted collection or
  field — the three-times-proven pattern (§2).
- **No verb owed** _(the row-Ⓐ argument, and it applies here)_: systems/options/schemes are **not
  elements**, so their CRUD is **new commands**, and a new command is a purely additive registry entry
  (D19/domain rule 5). ⚠ **The one exception to check at build time:** `Element.systemId`/
  `designOptionId`/`connectors` are _element_ fields, and an element is born via `createElement` — whose
  `argsSchema` **does** freeze. This is the **ⓣ lesson** (row 0g.2: reserved nouns with no authoring path
  forced an `argsSchema` widening). ⇒ **If we reserve element-side fields, their `createElement` args
  must land in the same step.** Flagged; it is why Q1's answer matters beyond storage.
- **No backend** (D37 intact). **No BIMsync inference** — off-box, spec unread.

---

## 7. ⚠ OWNER FRAMING QUESTIONS — please rule before I build

**Q1 — MEP connectors & systems: how much shape, and where?**

- **(A) Full reserve (recommended):** `scene.systems?` collection + `Element.connectors?` + `Element.systemId?`, with the `createElement` args to author them. Cost: one collection, two element fields, three args. Buys: MEP is a v1.0.x _build_, not an amendment; connectors are queryable from day one.
- **(B) System only:** reserve `scene.systems?` + `Element.systemId?`; let connectors live in `params` until MEP is built. Cheaper; risks the "private convention" wart (§3.3a).
- **(C) Record-only:** reserve nothing; accept that MEP costs a contract amendment in v1.0.x.

**Q2 — Is a connector's `at`/`direction` in the element's own build frame (recommended) or world space?** I strongly recommend the build frame (§3.5) — it is the D25 lesson and it makes a connector survive placement. Confirm.

**Q3 — DWG underlay: reserve a slot on `ViewDescriptor`, or record out of scope?**

- **(A) Record out of scope (recommended):** the DWG _codec_ needs nothing (§4.1); an underlay is documentation apparatus, which is post-v1.0.0 anyway, and `ViewDescriptor` is itself an optional reserved shape we can extend then.
- **(B) Reserve one optional `underlays?` field on `ViewDescriptor`** now.

**Q4 — Area schemes: reserve a scheme-definition collection, or treat gross/rentable as a pure derived-query extension?**

- **(A) Derived-query only (recommended):** no reservation; `roomMetrics(spaceId, {boundaryRule})` is additive whenever we want it (§5.3). Loading factors live in a schedule/report when that lands.
- **(B) Reserve `scene.areaSchemes?`** for authored scheme definitions + factors.

**Q5 — Design Options: reserve now, or record out of scope?**

- **(A) Reserve (recommended):** the collection + `Element.designOptionId?` + the view choice, **and write the exclusion invariant into the frozen contract** (§5.1) — because the trap is not storage, it is quantities/Clean-Delta correctness, and that sentence is far cheaper to write now than to discover downstream.
- **(B) Record out of scope:** options are a big feature; accept the amendment if we ever build them.

---

## 8. Build plan once ruled

1. Land the ruled shapes (`entities.ts` / `scene.ts` / `documentation.ts` as applicable) — optional,
   absent-defaulted, no schema bump.
2. If element-side fields are ruled in: widen `createElement.argsSchema` **in the same step** (§6, the ⓣ
   lesson) + a `core.setElementSystem`-style verb if the owner wants post-create editing.
3. `tests/step5F-reservations.test.ts` — the row-Ⓐ/Ⓓ discipline: (a) compile-time optional/additive, (b)
   round-trip through the **real** `.bnn` codec, (c) the design-option **exclusion invariant** asserted as
   a documented expectation, (d) **revert-verify** (strip a reservation ⇒ the test stops compiling).
4. `pnpm verify` green (currently 345), then record the Entry. Commit owner-gated.
