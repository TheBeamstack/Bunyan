# P5 · Step 0g — The "Reserve the Shapes" Pass — DESIGN

**Author:** Zayd (dev box) · **Date:** 2026-07-17 · **Status:** ⏳ rev. 2 — owner ruled the three framing questions (2026-07-17); a SECOND round of design decisions is now open (see §8, §11, §12)
**Depends on:** ✅ 0a (dependency graph), ✅ 0b (constraints/datums), ✅ 0e/0f (CRUD + guard)
**Executes:** Freeze-Gate rows ③④⑤ (D54a/b/c, owner-ruled) · ⓒ/ⓕ (Entry 31 dispositions) · ⓚ/ⓛ/ⓜ/ⓝ (Entry 36 round-2) · ⓖ/ⓞ (the Space extent, now ruled → Option B, §8)

> ## ✅ OWNER RULINGS — 2026-07-17
>
> **Round 1 (framing):**
>
> 1. **Space extent → OPTION B** (derived from bounding walls — the room-bounding solve, Revit's model). §8.
> 2. **Phasing → TWO datums** (`phaseCreated?` + `phaseDemolished?`). §2.
> 3. **Round-2 batch → land all five** (ⓚ/ⓜ/ⓝ/ⓕ/ⓒ), **AND run a fresh Revit-parity + agent sweep for more.** §12.
>
> **Round 2 (what Option B + the sweep opened):** 4. **Space-B frozen shape → APPROVED as designed** (seed `location` + Revit vertical model; boundary derived, not stored). §8.2. 5. **Room-bounding solver → SHIPS IN v1.0.0** (not v1.0.x). ⚠⚠ **THIS RE-CUTS THE SCHEDULE — a second heavy solver alongside 0d.** §8.3. 6. **Room separation lines → RESERVE NOW** (not additive-later). §8.2 carries the frozen `RoomSeparator` shape. 7. **Sweep → reserve ALL FOUR** (ⓟ custom-properties/Pset bag · ⓠ classifications · ⓡ mark · ⓢ general grid geometry). §12.
>
> **Still open — only the two shapes with genuine design latitude, awaiting a final nod (§11):** the exact `RoomSeparator` shape (§8.2) and the `GridGeometry` shape (ⓢ, §12).
> **Freezes at P5:** every shape below lands in a contract that FREEZES at step 6 — `SubShapeRef`, `Element`, `ParamField`, `BimObjectType`, `Scene`/`SpatialContainer`. **This is why it gets a design and not just a commit:** the expensive thing to get wrong is the _payload shape_, not the body. After the freeze, adding any of these is a contract amendment across three products (Bunyan, Miqdar, Planitor) **plus a migration of every `.bnn` in the field.**

---

## 0. What this pass is, and what it deliberately is NOT

**It is:** the same move that reserved `sectionCut` / `importIfc` / `instantiate` / `exportBrep` in the frozen _protocol_ — declare the payload shape now, implement the body in a later phase. Each item below is **one optional field or hook**, additive, defaulting to today's exact behaviour, so **no existing schema, type, or saved file changes meaning.** All bodies (evaluators, importers, area solvers) are out of scope here — 0g reserves the _shape_ only.

**It is NOT:** a behaviour change. Nothing here builds geometry, evaluates a formula, computes an area, or reads an IFC file. If any item below needs a _body_ to be correct at v1.0.0, it does not belong in 0g — it belongs in its owning step. (The one item that flirts with this line is the Space extent — see §7, the open decision.)

**The freeze-forcing test, applied to each** (audit method 1, Entry 31): _name a v1.0.0-or-north-star feature that forces this field's shape to change after the freeze._ If the answer is "none," the field is safe to omit. Every item below has a real answer.

---

## 1. ③ — `SubShapeRef kind: 'vertex'` (D54a, owner-ruled: RESERVE)

**Status: the type already carries it.** `SubShapeKind = 'face' | 'edge' | 'vertex'` (`protocol/src/subshape.ts:13`); `encodeSubShapeRef` / `decodeSubShapeRef` / `compareSubShapeRefs` already round-trip a `'vertex'` token. So the _token shape_ is done. **What 0g owes is the reserved role grammar written down**, so a v1.0.x consumer (a dimension/tag anchor, a Miqdar structural node) binds to a corner against a defined contract rather than an invented one.

**Shape (no code change to the type — a documented reservation):**

- A vertex ref is `{ nodeId, kind: 'vertex', role, occurrence }`, encoded exactly as a face/edge ref.
- **The kernel does not export vertices yet** (it names faces + edges). Reserved means: the token grammar carries them, and the _first consumer that asks_ triggers the kernel-side export — additively, because the encoding already accepts them.
- **Reserved role grammar** (documented in `subshape.ts`, not yet emitted): a vertex is named **structurally, as the canonical intersection of the faces/edges that generate it** — mirroring how an edge is named as the canonical pair of its two faces (D24). Concretely, role `corner` with the occurrence disambiguating within a solid after the canonical re-sort. ⚠ **Never a coordinate** — the same D1 rule that governs faces and edges.

**Deliverable:** strengthen the reservation note in `subshape.ts` (kind already present); no runtime change, no test change. _This is the one item that is a comment, not a field._

---

## 2. ④ + ⓛ — Element phasing, as TWO datums (D54b owner-ruled RESERVE; ⓛ refines it)

**⚠ ④ and ⓛ are coupled and CANNOT be landed independently.** D54b reserved _one_ `phase` field. Round-2 finding ⓛ (Entry 36) says that is the wrong shape: **Revit phases each element by TWO datums — created AND demolished — and Planitor's demolition sequencing needs the second.** A single field cannot express "this wall exists in phase 2 and is demolished in phase 5." Reserving one field now and needing two later is _exactly_ a post-freeze `Element` amendment — the thing this pass exists to prevent. ⇒ **Reserve two.** _(This coupling is why ④ needs a fresh owner nod, not just D54b — see the decision block.)_

**Shape (`entities.ts`, on `Element`):**

```ts
  /**
   * ⚠ RESERVED (D54b + Freeze-Gate ⓛ). Construction-sequencing datums — the phase in which this
   * element is CREATED and the phase in which it is DEMOLISHED (Revit's model; Planitor sequences by
   * both). Both optional: absent `phaseCreated` ⇒ the element exists from the start ("new"); absent
   * `phaseDemolished` ⇒ it is never demolished. A phase-id reference, never parsed — the `phases`
   * definition collection is a purely-additive v1.0.x collection (like `constraints` was in 0b).
   */
  readonly phaseCreated?: string;
  readonly phaseDemolished?: string;
```

**Freeze-forcing feature:** Planitor construction/demolition sequencing (a declared ecosystem consumer). **Body deferred:** phase _definitions_ (a `phases` scene collection) are provably additive later — adding a `SceneCollection` member trips 0a's exhaustive switch, forcing its dependency edge to be declared, which is the guarantee working as designed.

---

## 3. ⑤ + ⓜ — `ParamField.relevantWhen?` and `ParamField.formula?` (D54c owner-ruled RESERVE ⑤; ⓜ round-2)

Both are optional fields on `ParamField` (`schema.ts`), both default to today's behaviour, both are siblings (conditional visibility / computed value — the two things Revit family parameters have that Bunyan's schema does not). `ParamSchema` freezes at P5 with `Command.argsSchema` and `BimObjectType.parameterSchema`, so a later `ParamField` field is an amendment to _every_ type and command contract at once.

**Shape (`schema.ts`, on `ParamField`):**

```ts
  /**
   * ⚠ RESERVED (D54c). Conditional visibility: show this field only when a sibling field's value
   * matches. Absent ⇒ always shown (every existing schema is unaffected). Evaluated by the property
   * panel / agent tool projection in a later phase.
   */
  readonly relevantWhen?: ParamCondition;
  /**
   * ⚠ RESERVED (Freeze-Gate ⓜ). A Revit-style family FORMULA: an expression over sibling params that
   * computes this field's value (the field is then driven, read-only in the UI). Absent ⇒ the field is
   * author-entered. The expression grammar + evaluator are a later phase; the STRING slot freezes now.
   */
  readonly formula?: string;
```

with a small, extensible predicate type reserved alongside:

```ts
/**
 * ⚠ RESERVED (D54c). A predicate over another field's value, for `ParamField.relevantWhen`. A tagged
 * shape so richer operators (`in`, `notEquals`, ranges) are additive MEMBERS, never edits — the same
 * discipline that shaped `ConstraintTarget` in 0b.
 */
export interface ParamCondition {
  /** The sibling field this visibility depends on. */
  readonly field: string;
  /** Shown when the sibling equals this value. (Future: `in`, `notEquals` — additive.) */
  readonly equals: ParamValue;
}
```

**Freeze-forcing features:** conditional UI (⑤ — Revit-class types have fields shown only for certain options) and family formulas (ⓜ). **Bodies deferred:** the property-panel evaluator and the formula engine.

---

## 4. ⓒ — `ifcMapping?` on `BimObjectType` (Entry 31 disposition: RESERVE)

**The plan's step 3 already _lists_ `ifcMapping` as a type field; the type has none.** P6 registers a Type per IFC class and must map an incoming IFC entity ↔ a Bunyan type + params (the _import_ direction). `defaultClassification.ifcClass` already carries the _export/identity_ direction; this is its inbound counterpart. `BimObjectType` freezes at P5 ⇒ P6 would otherwise amend a frozen type.

**Shape (`types.ts`, on `BimObjectType`):**

```ts
  /**
   * ⚠ RESERVED (Freeze-Gate ⓒ). The IMPORT mapping (P6): which IFC entity this Type is the target for,
   * and how an entity's attributes/properties fill its params. `defaultClassification.ifcClass` is the
   * OUTBOUND identity; this is the INBOUND rule. Absent ⇒ the Type is not an IFC import target
   * (imported as `GenericSolid`, spec step 4). Consumed only by the P6 importer.
   */
  readonly ifcMapping?: IfcMapping;
```

```ts
/** ⚠ RESERVED (Freeze-Gate ⓒ). Shaped-but-open; the P6 importer defines the resolution rules. */
export interface IfcMapping {
  /** The IFC entity type this Type imports (`IfcWallStandardCase`, `IfcBeam`, …). */
  readonly ifcClass: string;
  /** Optional map: Bunyan param name ← IFC property/quantity name. Open-ended by design. */
  readonly params?: Readonly<Record<string, string>>;
}
```

**Freeze-forcing feature:** IFC4 import (P6). **Body deferred:** the importer.

---

## 5. ⓕ — `migrateStyle?` on `BimObjectType` (Entry 31 disposition: RESERVE the hook OR record the no-change promise)

`ElementStyle` is versioned (`ElementStyle.version`) but **nothing migrates a style** — only `BimObjectType.migrate` brings _element params_ forward. If a type's `styleSchema` changes shape in v1.0.x, old styles cannot be brought forward. The symmetric, cheap insurance is a hook mirroring `migrate`.

**Recommendation: reserve the hook** (not merely record a promise). The no-change promise is checkable but _strong_ — it forbids ever reshaping a `styleSchema`, which forecloses the same class of evolution `migrate` exists to allow for params. Reserving costs one optional field.

**Shape (`types.ts`, on `BimObjectType`):**

```ts
  /**
   * ⚠ RESERVED (Freeze-Gate ⓕ). Bring a STYLE's params/layers authored against an older `styleSchema`
   * forward, mirroring `migrate` for element params. Called on load when a style's version < the
   * schema's current version. Absent ⇒ a style is loaded verbatim (today's behaviour).
   */
  readonly migrateStyle?: (styleParams: Params, fromVersion: number) => Params;
```

**Freeze-forcing feature:** any v1.0.x `styleSchema` reshape. **Body deferred:** the caller in `bnn.ts` load path (today only `migrate` is called).

---

## 6. ⓚ — Project georeference on `scene.json` (Entry 36 round-2)

`scene.json` has no base point or true north. Multi-building coordination and IFC import/export (`IfcMapConversion` / `IfcProjectedCRS` / `IfcSite`) both need the model's placement in the world. `Scene` freezes at P5 and is a **second-consumer contract** (Miqdar writes `.bnn` too) ⇒ reserve it now.

**Shape (`scene.ts`, on `Scene`):**

```ts
  /**
   * ⚠ RESERVED (Freeze-Gate ⓚ). The project's placement in the world — survey base point + true north,
   * for multi-building coordination and IFC georeferencing (`IfcMapConversion`/`IfcProjectedCRS`).
   * Absent ⇒ the model is in its own local frame at the origin (today's behaviour, and the common case).
   */
  readonly georeference?: ProjectGeoreference;
```

```ts
/** ⚠ RESERVED (Freeze-Gate ⓚ). Shaped-but-open; IFC/GIS fields (CRS name, easting/northing) are additive. */
export interface ProjectGeoreference {
  /** Survey point in world coordinates, mm — the model origin's true location. */
  readonly basePoint: readonly [number, number, number];
  /** Clockwise rotation from world +Y to true north, degrees. */
  readonly trueNorth: number;
}
```

⚠ **`SCENE_SCHEMA_VERSION` does NOT bump for this.** It is an _optional_ field on `Scene`; a v2 file without it loads unchanged (`{ ...emptyScene(), ...parsed }` already defaults absent keys). Reserving it in the frozen `Scene` shape is the whole value — no migration.

**Freeze-forcing features:** multi-building projects, IFC import/export (P6). **Body deferred:** anything that reads it.

---

## 7. ⓝ — Element nesting (Entry 36 round-2)

Curtain walls (panels + mullions), groups, and assemblies are **elements-of-elements**. Today an `Element` has PARTS (solids of one element) but no child ELEMENTS. Two distinct concepts:

- **Nesting** (hard case): an element _owns_ child elements — a curtain wall owns its panels and mullions, which are real elements with their own types/styles/quantities. ⇒ reserve `parentElementId?: ElementId`.
- **Flat groups** (easy case): a named selection set. ⇒ **provably additive** as a future `groups` scene collection (adding a `SceneCollection` member trips 0a's exhaustive switch — the guarantee, again). **Not reserved as a field**; recorded as additive.

**Shape (`entities.ts`, on `Element`) — nesting only:**

```ts
  /**
   * ⚠ RESERVED (Freeze-Gate ⓝ). The element this one is NESTED IN — a curtain wall's panels/mullions,
   * an assembly's members. Absent ⇒ a top-level element (today's only case). Distinct from `hostId`
   * (a boolean host) and from PARTS (solids of ONE element). Flat named `groups` are a separate,
   * additive v1.0.x scene collection, not this field.
   */
  readonly parentElementId?: ElementId;
```

**Freeze-forcing feature:** curtain walls / assemblies (Revit-class). **Body deferred:** the build/quantities roll-up over nested elements; flat groups.

---

## 8. ⓖ / ⓞ — Space extent → ✅ OPTION B (room-bounding), and the design decisions B forces

**Ruling: B.** A `Space`'s extent is **derived from its bounding walls** by a room-bounding solve — Revit's model, and the "beat-Revit" choice. A `Space` today is `{ id, kind, name, number }` with no shape, and the code comment already promises _"area/volume measured from geometry"_ — B is what finally makes that promise true, automatically and in sync as walls move.

### 8.1 The invariant that shapes B: a derived extent is NOT stored

Recipe-is-truth (spec §6). A room boundary is a _derived_ projection of the walls, exactly like a Part or a mesh — so, like them, it is **computed on demand, never written into `scene.json`.** ⇒ **No `boundary` field is frozen.** What a derived room _does_ need frozen is the **authored inputs the solve reads** — its identity anchor and its vertical extent. Those are truth; the boundary is their consequence.

### 8.2 What B FORCES us to reserve now (the identity inputs)

A room-bounding solve computes the enclosed region _around a point_, between two datums. Freeze these on `SpatialContainer` (Revit's Room model, field-for-field):

```ts
  /**
   * For a `space` (D50/Option B, owner-ruled 2026-07-17): the SEED POINT that identifies which
   * enclosed region on the Level this room is — (x, y) in the Level's plane, mm. This is the room's
   * IDENTITY ANCHOR: the boundary is re-solved from it after walls move, so the room persists across
   * edits. (Revit's "room location point".) Absent ⇒ the region is picked by the solver's default.
   */
  readonly location?: readonly [number, number];
  /**
   * For a `space`: its vertical extent, Revit's Room model. Base is the Space's own Level (its
   * `parentId`) + `baseOffset`; top is `upperLevelId` (another Level) + `limitOffset`. All optional;
   * absent ⇒ base = Level plane, top = the next Level up (the common case). Height is DERIVED from these,
   * never stored — the same rule D52 applies to walls.
   */
  readonly baseOffset?: number;
  readonly upperLevelId?: ContainerId;
  readonly limitOffset?: number;
```

**Room separation lines** (Revit's 2D lines that bound a room where there is no wall — open-plan, a lobby flowing into a corridor) → **RESERVED NOW (owner-ruled).** A first-class scene collection, so a room can be bounded even where no wall runs. Adding `'roomSeparators'` to `SceneCollection` trips 0a's exhaustive switch, forcing its dependency edge to be declared (an explicit "nothing" for element geometry — a separator changes no element's _solid_; it re-bounds a _room_, which is a query recomputed on demand — the same shape the `materials` edge has). **Proposed frozen shape (awaiting the final nod, §11):**

```ts
export type RoomSeparatorId = string;
/** ⚠ RESERVED (owner-ruled 2026-07-17). A 2D POLYLINE that bounds a room where no wall does — Revit's
 *  room separation line, as a chain. Authored in a Level's plane; consumed by the room-bounding
 *  solver (v1.0.0). Owner chose a polyline over a single segment. */
export interface RoomSeparator {
  readonly id: RoomSeparatorId;
  /** The Level whose plane this separator lies in. */
  readonly levelId: ContainerId;
  /** The chain of points defining the boundary line, in the Level's plane, mm (≥ 2 points). */
  readonly points: readonly (readonly [number, number])[];
}
// Scene gains: readonly roomSeparators: Readonly<Record<RoomSeparatorId, RoomSeparator>>;
```

⚠ **No `SCENE_SCHEMA_VERSION` bump:** pre-freeze the schema is still RC, and old files default the absent key to `{}` via `emptyScene()` (the `{ ...emptyScene(), ...parsed }` load path). No command authors a separator in 0g — the CRUD lands with the solver (step 1); 0g reserves the _shape_, empty.

### 8.3 The schedule cost B carries — a real scope decision, decoupled from the freeze

The room-bounding solver is **a substantial, unbudgeted subsystem** — it must trace an enclosing wall loop in the Level plane, handle non-convex rooms, openings, and the not-fully-enclosed case. It is in the **same weight class as the sketch-constraint solver** (0d), which `core_logic.md` §9 already flags as the largest unbudgeted piece. So its **timing is a scope call:**

- **✅ v1.0.0 — OWNER-RULED.** The solver ships in this release; floor area is answerable at launch (satisfies the exit criterion _"how much... floor area"_ directly).
- ~~v1.0.x — reserve now, ship later.~~ (Not chosen.)

⚠⚠ **THE SCHEDULE CONSEQUENCE, RECORDED (owner accepted it in choosing v1.0.0):** v1.0.0 now carries **TWO heavy, formerly-unbudgeted solvers** — the sketch-constraint solver (0d) **and** the room-bounding solver (this). Both were north-star hooks that D50 + this ruling pulled into scope. **The plan's schedule must be re-cut to reflect two solver subsystems, and the number stated to the Architect before either is started** (`v1.0.0_imp_plan.md` step 0d already carries this instruction for the sketch solver; step 1/Space inherits it for room-bounding). _This is the one place a "reserve the shapes" pass grew a real build item — surfaced here so it is not lost._

⚠ **KEY: the FROZEN SHAPE (§8.2) does not depend on this.** _When_ the solver lands moves no frozen byte; the contract is settled by §8.2 alone. 0g reserves the shape now regardless.

### 8.4 Whether the solve is kernel (OCCT) or document-layer 2D

An implementation detail, **not a freeze decision** — room bounding is 2D polygon work in the Level plane and could be either. Deferred to build time. Noted here only so it is not mistaken for a contract question.

---

## 9. What lands where (the whole pass, one commit)

| Item                     | File                                                      | Change                                                                                                                |
| ------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| ③ vertex grammar         | `protocol/src/subshape.ts`                                | reservation note (kind already present)                                                                               |
| ④+ⓛ phasing              | `document/src/entities.ts`                                | `Element.phaseCreated?` / `phaseDemolished?`                                                                          |
| ⓝ nesting                | `document/src/entities.ts`                                | `Element.parentElementId?`                                                                                            |
| ⓖ/ⓞ Space extent (**B**) | `document/src/entities.ts`                                | `SpatialContainer.location?` / `baseOffset?` / `upperLevelId?` / `limitOffset?` (boundary derived, not stored — §8)   |
| Room separators (ruled)  | `document/src/entities.ts` + `scene.ts` + `dependency.ts` | `RoomSeparator` type + `Scene.roomSeparators` collection + `SceneCollection` member + its (nothing-for-geometry) edge |
| ⓟ properties             | `document/src/entities.ts`                                | `Element.properties?` (Pset bag)                                                                                      |
| ⓠ classifications        | `document/src/entities.ts`                                | `Element.classifications?` (system→code map)                                                                          |
| ⓡ mark                   | `document/src/entities.ts`                                | `Element.mark?`                                                                                                       |
| ⓢ grid geometry          | `document/src/entities.ts`                                | `GridGeometry` union + `Grid.geometry?`                                                                               |
| ⑤ relevantWhen           | `document/src/schema.ts`                                  | `ParamField.relevantWhen?` + `ParamCondition`                                                                         |
| ⓜ formula                | `document/src/schema.ts`                                  | `ParamField.formula?`                                                                                                 |
| ⓒ ifcMapping             | `document/src/types.ts`                                   | `BimObjectType.ifcMapping?` + `IfcMapping`                                                                            |
| ⓕ migrateStyle           | `document/src/types.ts`                                   | `BimObjectType.migrateStyle?`                                                                                         |
| ⓚ georeference           | `document/src/scene.ts`                                   | `Scene.georeference?` + `ProjectGeoreference`                                                                         |

**No `SCENE_SCHEMA_VERSION` bump** (every scene-level add is an optional field; absent-key defaulting already covers old files). **No command/argsSchema change** (0g reserves _data shapes_, not verbs — the reserved fields are author-set via the existing `createElement`/`updateContainer` paths once their bodies exist; none needs a new command at v1.0.0). **No behaviour change**, so existing tests stay green untouched.

## 10. How 0g is verified (a reservation still earns a test)

A reservation's test is not "does the body work" (there is no body) but **"is the shape actually reserved, and does absence stay byte-identical":**

1. **A type-level freeze-safety check** (the pattern 0b used for `ConstraintTarget`): a compile-time assertion that each reserved field is optional and that a value carrying it satisfies the interface — so a later _edit_ to the shape is caught, and its _additive_ nature is pinned.
2. **A round-trip test:** a `scene.json` carrying `georeference`, an element with `phaseCreated`/`parentElementId`, a Space with a `boundary`, a type with `ifcMapping` — saved and reloaded — is **byte-identical** (proves the field persists and no loader drops it). And a scene _without_ any of them loads and builds exactly as today (proves absent-default).
3. **Revert check** where meaningful: removing a reserved field from a fixture that sets it must fail the round-trip (the field is genuinely carried, not silently ignored).

⚠ **No kernel run needed** — 0g touches no geometry, so its tests are pure (fast, headless, no OCCT). The full suite (247) must stay green with zero edits to existing tests; the freeze pass only ADDS.

---

## 12. The fresh Revit-parity + agent-friendly sweep (owner asked for it — Q3 ruling)

Method: the same freeze-forcing test, now aimed at _"what does a Revit-beating, agent-native BIM tool need that the frozen `Element`/`Material`/`Grid` cannot express?"_ Four strong candidates surfaced. Each is one optional field, additive, defaulting to today. **✅ OWNER RULED: reserve ALL FOUR (ⓟ ⓠ ⓡ ⓢ).** Three have a settled shape below; ⓢ carries the one real shape-design and awaits the final nod (§11).

- **ⓟ — Custom properties / IFC property-set bag.** `Element.properties?: Readonly<Record<string, Readonly<Record<string, ParamValue>>>>` (Pset name → {prop → value}). ⚠ This is the **round-trip escape hatch for arbitrary IFC data** (P6 import/export carries `IfcPropertySet`s that map to no Bunyan param — the property analogue of what `GenericSolid` is for unmapped geometry), **and** the place an **agent or a user attaches metadata without a schema change.** _Tension:_ Bunyan is deliberately schema-driven (D21), so this is explicitly the "unschematised extension" lane, not a licence to abandon schemas. **Strongly recommend reserve** — without it, an imported IFC model silently drops every property it carries, and an agent has nowhere to write a note.

- **ⓠ — Classification systems (Uniclass / OmniClass / Assembly Code).** `Element.classifications?: Readonly<Record<string, string>>` (system → code, e.g. `{ Uniclass2015: 'EF_25_10' }`). The frozen `Classification` is `{ ifcClass, loadBearing }` — no cost/estimating code. **Revit has Assembly Code + Keynote; Planitor's scheduling and any cost take-off run on classification codes.** Reserved as a _separate open map_ so the frozen `Classification` stays untouched. **Recommend reserve** — it is the ecosystem's costing/scheduling key.

- **ⓡ — Instance mark.** `Element.mark?: string`. Revit's "Mark" — a human-facing per-instance tag (`W-01`, `C12`) used on **schedules and drawing tags**, distinct from the ULID (machine identity) and from `name` (description). 2D documentation (v1.0.x, spec §438) needs it to tag anything. **Recommend reserve** — cheap, and drawings can't tag without it.

- **ⓢ — General grid geometry (angled / radial grids). ✅ reserve; shape awaiting the nod (§11).** Today `Grid` is axis-aligned only (`axis: 'x' | 'y'`, `offset`). **Revit grids can be angled and curved** (radial grids — stadiums, curved façades). Reserved _additively_: an optional `geometry` override that, **when present, supersedes `axis`+`offset`** (which stays required, the fast path for the orthogonal common case — so every existing grid is untouched). A **tagged union** so more forms (spline, multi-segment) are additive MEMBERS, never edits — the `ConstraintTarget` discipline again. **Proposed frozen shape:**

```ts
/** ⚠ RESERVED (Freeze-Gate ⓢ, owner-ruled 2026-07-17). Non-orthogonal grid geometry. Tagged so new
 *  forms are additive members. When a Grid carries this, it supersedes `axis`+`offset` for placement. */
export type GridGeometry =
  | {
      readonly kind: 'line';
      readonly start: readonly [number, number];
      readonly end: readonly [number, number];
    }
  | {
      readonly kind: 'arc';
      readonly center: readonly [number, number];
      readonly radius: number;
      readonly startAngle: number; // degrees
      readonly endAngle: number;
    };
// Grid gains: readonly geometry?: GridGeometry;
```

_The redundancy — an angled grid still carrying a nominal `axis`+`offset` — is the deliberate price of a **purely additive** reserve: making `axis`/`offset` optional would be an edit to a field every existing grid relies on. A `geometry`-bearing grid uses `geometry` for placement and keeps `axis` only as its nominal orientation label._

**Noted, NOT reserved as fields (recorded as additive-later / fold-in):**

- **Provenance (agent-vs-human authorship).** Agent-native tools benefit from knowing what an agent made — but this **folds into ⓟ** (a `bunyan.provenance` pset) rather than earning a first-class field. No separate reservation.
- **Design options / variants** (Revit Design Options — an agent exploring alternatives). Heavy; a **provably-additive future `variants` collection**, not a field. Not reserved now.

---

## 11. Open questions for the owner (rev. 3 — before implementation)

**✅ ALL RULED (2026-07-17), see the header block.** Space-B shape approved (§8.2) · solver → v1.0.0, schedule re-cut recorded (§8.3) · separators reserved now (§8.2) · all four sweep picks in (§12).

**✅ FULLY RULED (2026-07-17).** The last two shapes are settled:

1. **`RoomSeparator` → POLYLINE** (`levelId` + `points[]`), owner's choice over a single segment. §8.2.
2. **`GridGeometry` → the full `line | arc` tagged union**, an additive override on `Grid` (`axis`+`offset` stay the fast path). §12.

**Nothing is open. Implementation may proceed** — 0g lands all items, then `pnpm verify`.
