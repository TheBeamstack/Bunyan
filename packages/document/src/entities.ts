/**
 * The domain entities of the document model (`core_logic.md` §3).
 *
 * ⚠ THE THREE THINGS THIS FILE EXISTS TO GET RIGHT, all owner-ruled 2026-07-13 and all frozen at P5:
 *
 *   D30 — an element owns an ORDERED LIST OF PARTS, not one solid. A wall is blockwork + insulation +
 *         plaster. "How much plaster is on this wall?" is unanswerable against a monolithic solid at
 *         any price, and quantity take-off is a declared north-star that domain rule 8 forbids
 *         foreclosing. A single-solid element is just an element with one part.
 *   D31 — what is SHARED lives on the `ElementStyle`; what is UNIQUE lives on the instance. Editing a
 *         style rebuilds every instance that references it (the most-used operation in Revit).
 *   D33 — `Material` and `Section` are ENTITIES, not strings. A string cannot carry `f_ck`, cannot be
 *         grouped by a schedule and cannot be read by an analysis engine — the two things the concept
 *         existed for.
 *
 * ⚠ AND NONE OF IT TOUCHES THE KERNEL. A `SubShapeRef` is `{nodeId, kind, role, occurrence}` and
 * `nodeId` is an OPAQUE STRING ⇒ a part is simply its own node in the operation DAG
 * (`wall-1.structure`). No new op, no protocol change, no `SubShapeRef` change.
 */

import type { RigidMotion, ShapeHandle } from '@bunyan/protocol';
import type { Connector, SystemId } from './systems.js';
import type { DesignOptionId } from './designoptions.js';

/**
 * An element's id is its **PEI** — its Persistent Element Identity (domain rule 13, D34).
 *
 * ⚠ IT IS THE ECOSYSTEM'S CONTRACT, NOT AN INTERNAL CONVENIENCE. Planitor's schedule and Miqdar's
 * analytical model both bind to it, and it survives every rebuild, resize and re-issue. Anything that
 * would re-mint an element's id on a rebuild is not a refactor — it is a breaking change to three
 * other products. (A whole platform, BIMsync, exists to manufacture this property for models that
 * lack it. That is the measure of what it is worth.)
 */
export type ElementId = string;
export type StyleId = string;
export type MaterialId = string;
export type SectionId = string;
export type ContainerId = string;
export type GridId = string;
export type RoomSeparatorId = string;
/** e.g. `core.wall.v1` — a registered contract, never a hard-coded class (domain rule 5). */
export type TypeId = string;

/** A parameter value. Deliberately JSON-shaped: `scene.json` is the truth and it must round-trip. */
export type ParamValue = string | number | boolean | null | readonly ParamValue[] | ParamObject;
export interface ParamObject {
  readonly [key: string]: ParamValue;
}
export type Params = Readonly<Record<string, ParamValue>>;

/* ================================================================================================
 * MATERIAL & SECTION — the two registries D33 added (spec §4.4a / §4.4b)
 * ============================================================================================= */

/**
 * A registered, named, versioned material — `C25/30`, `S235`, `EPS-80`, `Plaster-15`.
 *
 * ⚠ `structural` is not decoration: it is **Miqdar's solver input**, and it is the reason a Material
 * could never have been a string. `density` is also what collapses Planitor's quantity fallback
 * ladder (which hardcodes `7850` because IFC so often will not say) into a lookup.
 */
export interface Material {
  readonly id: MaterialId;
  readonly name: string;
  readonly category:
    'concrete' | 'steel' | 'timber' | 'masonry' | 'insulation' | 'finish' | 'other';
  /** kg/m³. Required — a material without a density cannot answer a weight, which is half its job. */
  readonly density: number;
  /** Physical properties an analysis engine reads. Open-ended by design: codes differ by material. */
  readonly structural?: Readonly<Record<string, number>>;
  /**
   * ⚠ RESERVED (D64/M18, owner-ruled 2026-07-23 — `../Miqdar/Miqdar_v1.0.0_spec.md` §4.6). The THERMAL
   * physical properties an energy analysis reads — `lambda` (conductivity, W/m·K), `specificHeat`
   * (J/kg·K), … Open-ended, exactly like `structural?`, because codes and analyses differ.
   *
   * ⚠⚠ WHY IT IS HERE, AND WHY IT IS A SIBLING OF `structural?` RATHER THAN A KEY INSIDE IT. `core_logic.md`
   * §3.11 prose promised *"thermal conductivity"* and §9 names *structural/**energy** analysis* a north-star
   * (domain rule 8 forbids foreclosing one) — but no thermal property was in the frozen `Material`, and
   * `Material` freezes at P5. The Miqdar real-frame walk (D64) found the gap. Thermal is NOT structural, so
   * folding λ into `structural?` would mislabel it at zero saving. Optional and absent-defaulted ⇒ every
   * existing material and every saved `.bnn` is untouched; no `SCENE_SCHEMA_VERSION` bump. NO body reads it
   * in v1.0.0 (Miqdar v1.0.0 is structural-only, M18) — this reserves the SHAPE so energy is never a
   * three-product amendment.
   *
   * ⚠ It is a MATERIAL property — single-valued per material, genuinely physical — NOT an on-element
   * analytical anchor. D64's analytical-anchor question is answered *"reserve nothing on the type/part"*
   * (the idealization is many-valued per element ⇒ it lives in Miqdar's side-graph, spec §4.4/§4.5). This
   * field does not weaken that ruling; it confirms the two-graph split (the material is physical; the
   * idealization is Miqdar's).
   */
  readonly thermal?: Readonly<Record<string, number>>;
  /** Display only. Never load-bearing — the geometry is truth, this is a projection of it. */
  readonly appearance?: { readonly color?: string; readonly opacity?: number };
}

/**
 * A registered, named profile — `IPE300`, `HEA200`, `RECT-300x600`.
 *
 * ⚠ A FREE-FORM AUTHORED LOOP IS NOT A SECTION. `IPE300` must be *a thing with a name*, or it cannot
 * be scheduled ("all IPE300"), cannot be design-grouped by Miqdar, and cannot survive a round-trip as
 * anything but coordinates. `Profile` (the protocol's own type) remains the escape hatch for a shape
 * the catalogue does not have.
 */
export interface Section {
  readonly id: SectionId;
  readonly name: string;
  /** `EN 10365`, `custom`, … — where the numbers come from, so they can be trusted or replaced. */
  readonly standard?: string;
  readonly shape: 'rectangle' | 'circle' | 'i-beam' | 'custom';
  /** mm — the parameters the profile is generated from. Interpreted by `shape`. */
  readonly dimensions: Readonly<Record<string, number>>;
  /** Derived section properties (area mm², second moments mm⁴, …) — Miqdar reads these. */
  readonly properties?: Readonly<Record<string, number>>;
}

/* ================================================================================================
 * ELEMENT STYLE — D31. The level every BIM tool has and Bunyan did not.
 * ============================================================================================= */

/**
 * One layer of a style's stack: a material, how thick it is, **and whose trade builds it** (D45).
 * Ordered; order is the build order.
 */
export interface StyleLayer {
  /**
   * The part name this layer becomes — `structure`, `insulation`, `finish.interior`.
   *
   * ⚠ **UNIQUE WITHIN A STYLE, AND IT IS AN IDENTITY CONSTRAINT, NOT TIDINESS.** The part's DAG node is
   * `${elementId}.${name}` — so two layers both called `structure` mint **byte-identical
   * `SubShapeRef` tokens naming different faces of different solids**, and a window hosted on one of
   * them is hosted on both, or neither. Refused at the command layer, and asserted again at build.
   */
  readonly name: string;
  readonly materialId: MaterialId;
  /** mm. */
  readonly thickness: number;
  /**
   * ⚠⚠ **WHOSE TRADE BUILDS THIS LAYER** (decision **D45**) — and it lives HERE, on the layer, because
   * an element is almost never of one discipline. **An RC wall is a structural core with architectural
   * plaster on it.** Declaring a single discipline on the *element* says something false about exactly
   * the parts that matter — and it made two written ecosystem promises undeliverable: Miqdar
   * *"idealizes the structural layer of a wall, not its finishes"* (it could not ask which part that
   * was) and Planitor *"binds a task to the part it actually builds"* (it could not route the concreter
   * and the plasterer to different work packages on one wall).
   *
   * ⚠ **Authored, never inferred from the material** — a concrete screed is not structural, and a
   * timber shear wall is.
   */
  readonly discipline: Discipline;
}

/**
 * ⚠ It is a property of a **PART**, never of an element (D45). *The plasterer bills plaster.*
 *
 * **Miqdar filters on `loadBearing`**, not on this (everything Miqdar returns is structural by
 * definition — it would never have modelled a non-load-bearing partition). **Planitor routes by trade**,
 * and a trade builds a *part*. **IFC has no discipline attribute at all** — it is an MVD/property-set
 * concern. All three consumers of an element-level value evaporated when the owner went looking.
 */
export type Discipline = 'architectural' | 'structural' | 'mep' | 'other';

/**
 * A named, versioned, SHARED parameter set — `EXT-200-Concrete`, `IPE300-Beam`.
 *
 * **A Type is a KIND of thing (Wall). A Style is a SPECIFIC KIND of that thing. The instance is
 * *this one, here*.** Editing a style rebuilds every instance that references it — that is the point,
 * and it is what "change one wall type, update 400 walls" means.
 *
 * ⚠ It is also **the counterpart of Miqdar's `DesignGroup`**: an engineer assigns one section to a
 * GROUP of columns. Without a style there is nothing on Bunyan's side to write back into.
 */
export interface ElementStyle {
  readonly id: StyleId;
  readonly name: string;
  /** The type this style is *for*. A Wall style cannot be worn by a Slab. */
  readonly typeId: TypeId;
  readonly version: number;
  /** The ordered layer stack — this is what becomes the element's Parts (D30). */
  readonly layers?: readonly StyleLayer[];
  /** For a LinearMember (D32): the Section it is swept from. */
  readonly sectionId?: SectionId;
  /** Anything else that is a property of *the kind of wall*, not of *this wall* (domain rule 12). */
  readonly params?: Params;
}

/* ================================================================================================
 * THE SPATIAL CONTAINER TREE — D35. `Site → Building → Level → Space`.
 *
 * ⚠ A TWO-TOWER PROJECT WAS UNMODELLABLE before this, and `Space` (IfcSpace) did not exist — the spec
 * modelled "a room" as a COMPOSITE VERB (4 walls + a slab + a door), i.e. as a macro rather than a
 * thing. And the tree IS Planitor's Location Breakdown Structure ("Tower B → Level 03 → Zone B3-East"),
 * so the LBS now falls out of the authored model instead of being hand-declared.
 * ============================================================================================= */

export type ContainerKind = 'site' | 'building' | 'level' | 'space';

export interface SpatialContainer {
  readonly id: ContainerId;
  readonly kind: ContainerKind;
  readonly name: string;
  /** `undefined` only for the root Site. */
  readonly parentId?: ContainerId;
  /** mm, for a `level`. The elevation datum everything on the storey hangs from. */
  readonly elevation?: number;
  /** For a `space`: its number ("214"). Area/volume are MEASURED from geometry, never stored. */
  readonly number?: string;
  /* ----------------------------------------------------------------------------------------------
   * THE SPACE EXTENT MODEL — Option B (owner-ruled 2026-07-17, `P5_step0g_design.md` §8).
   *
   * ⚠ A Space's boundary is DERIVED from its bounding walls by a room-bounding solve (Revit's model)
   * and, being derived, is NEVER stored (recipe-is-truth — like a Part or a mesh). What IS stored are
   * the room's *identity inputs*: the seed point that says WHICH enclosed region this room is, and its
   * vertical extent. The solver (which turns these into an area) ships in v1.0.0 — a second heavy
   * subsystem alongside the sketch solver (0d); the schedule is re-cut for it. These fields freeze at P5.
   * -------------------------------------------------------------------------------------------- */
  /**
   * For a `space`: the SEED POINT — (x, y) in the Level's plane, mm — identifying which enclosed region
   * on the Level this room is. Its IDENTITY ANCHOR: the boundary is re-solved from it after walls move,
   * so the room persists across edits (Revit's "room location point"). Absent ⇒ the solver's default region.
   */
  readonly location?: readonly [number, number];
  /**
   * For a `space`: its vertical extent (Revit's Room model). Base = this Space's own Level (`parentId`)
   * + `baseOffset`; top = `upperLevelId` (another Level) + `limitOffset`. All optional; absent ⇒ base at
   * the Level plane, top at the next Level up. Height is DERIVED from these, never stored (D52's rule).
   */
  readonly baseOffset?: number;
  readonly upperLevelId?: ContainerId;
  readonly limitOffset?: number;
  /* ----------------------------------------------------------------------------------------------
   * ⚠ RESERVED (Freeze-Gate ⓤ, 0g-review 2026-07-18). The SAME IFC/agent escape hatch `Element` gets
   * (ⓟ/ⓠ) — an imported `IfcSpace`/`IfcBuildingStorey`/`IfcSite` carries psets (Pset_SpaceCommon:
   * area, occupancy, fire compartment) and classification codes that map to no Bunyan field, and P6
   * import (v1.0.0) would silently DROP them without a slot. Optional and additive (no
   * `SCENE_SCHEMA_VERSION` bump); absent ⇒ today's behaviour. Shape mirrors `Element`.
   * -------------------------------------------------------------------------------------------- */
  readonly properties?: Readonly<Record<string, Readonly<Record<string, ParamValue>>>>;
  readonly classifications?: Readonly<Record<string, string>>;
}

/**
 * A named structural axis — `A`, `B`, `1`, `2`. **Level organizes the model vertically; Grid organizes
 * it horizontally** (D32), and every BIM tool and every structural tool has both.
 *
 * A column sits at B-3, and it *stays* at B-3 when the grid spacing changes — which is why the binding is
 * a `grid` `Constraint` naming the axis (D50 step 0b), not a copy of the coordinate on the element.
 */
export interface Grid {
  readonly id: GridId;
  readonly name: string;
  readonly axis: 'x' | 'y';
  /** mm along the perpendicular axis. */
  readonly offset: number;
  readonly buildingId?: ContainerId;
  /**
   * ⚠ RESERVED (Freeze-Gate ⓢ, owner-ruled 2026-07-17). Non-orthogonal grid geometry — an angled or a
   * radial/curved axis (Revit parity: stadiums, curved façades). When present it SUPERSEDES `axis`+`offset`
   * for placement; `axis`+`offset` stay REQUIRED as the orthogonal fast path (so every existing grid is
   * untouched — the deliberate price of a purely-additive reserve is that a `geometry`-bearing grid keeps
   * `axis` only as its nominal orientation label). Absent ⇒ an ordinary axis-aligned grid (today's only case).
   *
   * ⚠⚠ THE INVARIANT ALL THREE CONSUMERS (Miqdar, Planitor, a 2D tagger) MUST READ (Freeze-Gate ⓥ): when
   * `geometry` is present, `axis`+`offset` are a NON-POSITIONAL nominal label — never read for placement.
   * Placement comes from `geometry` alone. Reading `axis`+`offset` on a `geometry`-bearing grid is a bug.
   */
  readonly geometry?: GridGeometry;
  /**
   * ⚠ RESERVED (Freeze-Gate ⓤ, 0g-review 2026-07-18). IFC psets / classification codes an imported
   * `IfcGrid` carries — the same escape hatch `Element`/`SpatialContainer` get, so P6 import (v1.0.0)
   * drops nothing. Optional and additive; absent ⇒ today's behaviour.
   */
  readonly properties?: Readonly<Record<string, Readonly<Record<string, ParamValue>>>>;
  readonly classifications?: Readonly<Record<string, string>>;
}

/**
 * ⚠ RESERVED (Freeze-Gate ⓢ, owner-ruled 2026-07-17). The geometry of a non-orthogonal `Grid`. A TAGGED
 * UNION so new forms (spline, multi-segment) are additive MEMBERS, never edits — the same discipline that
 * shapes `ConstraintTarget`. Points are (x, y) in the building plane, mm; angles in degrees.
 */
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
      readonly startAngle: number;
      readonly endAngle: number;
    };

/**
 * ⚠ RESERVED (owner-ruled 2026-07-17, `P5_step0g_design.md` §8.2). A room SEPARATION LINE — a 2D polyline
 * that bounds a `Space` where no wall runs (open-plan, a lobby flowing into a corridor). Revit's model,
 * as a chain (owner chose a polyline over a single segment). Authored in a Level's plane; consumed by the
 * room-bounding solver (v1.0.0). The CRUD to author one lands with that solver; 0g reserves the shape.
 */
export interface RoomSeparator {
  readonly id: RoomSeparatorId;
  /** The Level whose plane this separator lies in. */
  readonly levelId: ContainerId;
  /** The chain of points defining the boundary line, in the Level's plane, mm (≥ 2 points). */
  readonly points: readonly (readonly [number, number])[];
}

/* ================================================================================================
 * THE CONSTRAINT — an ACTIVE-DATUM binding (D50 step 0b, D53)
 * ============================================================================================= */

export type ConstraintId = string;

/**
 * What a constraint points AT. A tagged union so the operand can widen without redefining a field
 * (P5_step0b_design.md §2, Finding 2). Today: a Level or a Grid axis. Reserved-additive: an `element`
 * (attach a wall top to a roof) or a `ref` (a `SubShapeRef` token — align/lock a face). ⚠ Adding those
 * members must never edit these two.
 */
export type ConstraintTarget =
  | { readonly kind: 'level'; readonly id: ContainerId }
  | { readonly kind: 'grid'; readonly id: GridId };
// FUTURE (additive, not built in 0b): { kind: 'element'; id: ElementId } · { kind: 'ref'; token: string }

/**
 * A datum binding — "this element's geometry FOLLOWS that datum" (D53). First-class, in `scene.constraints`,
 * **never a param** — so the dependency graph reads one structure and `ParamSchema` stays a value schema.
 *
 * ⚠⚠ `Constraint` IS A DISCRIMINATED UNION ON `kind` (`P5_step0b_design.md` §2, Finding 2). Today it has
 * one member (`DatumConstraint`); attach/align/dimension (rows 6–8) and the sketch constraints (0d) land as
 * NEW members — `Constraint = DatumConstraint | AttachConstraint | …` — which is purely additive and is the
 * only shape that lets a Revit/ArchiCAD-class constraint model grow past a datum binding after the freeze.
 */
export type Constraint = DatumConstraint | SketchConstraint | JoinConstraint;

export interface DatumConstraint {
  readonly id: ConstraintId;
  /** The dependent — the element whose geometry follows the datum. */
  readonly element: ElementId;
  /** `base`/`top` bind a vertical extent to a Level; `grid` places the element on an axis (two ⇒ a point). */
  readonly kind: 'base' | 'top' | 'grid';
  readonly target: ConstraintTarget;
  /**
   * mm along the datum's normal. For `base`/`top`: the vertical offset from the Level — a parapet is
   * `top` + 1100, a footing is `base` − 300 (P5_step0b_design.md §2, Finding 1). Unused for `grid`.
   */
  readonly offset?: number;
}

/** ⚠ NARROW BEFORE YOU REACH FOR `.target`. A `DatumConstraint` binds to a scene datum; a sketch one does not. */
export function isDatumConstraint(c: Constraint): c is DatumConstraint {
  return c.kind === 'base' || c.kind === 'top' || c.kind === 'grid';
}

/**
 * A WALL-TO-WALL JOIN OVERRIDE (D50 step 0c, `P5_step0c_design.md` §3). ⚠ IT IS AN *OVERRIDE*, NOT THE
 * JOIN ITSELF. Two wall baselines that meet auto-join as a **mitre** (§0a — a pure function of their
 * `{start,end}` params, so recipe-is-truth and D1-safe); this record exists ONLY to deviate a specific
 * corner from that default — `butt` (this wall butts into `other`, which continues), an explicit `mitre`,
 * or `none` (Revit's *Disallow Join* — the two walls stay separate boxes). Absent ⇒ the auto-mitre.
 *
 * ⚠⚠ NEVER A FUSE (§4h, measured Entry 12). A join reshapes ONLY the wall's END-CAP within its own
 * recipe; the two long side faces (where windows live) keep byte-identical `SubShapeRef` tokens (D26), so
 * every hosted opening survives. A constraint is not a boolean.
 *
 * ⚠ A NEW MEMBER of the `Constraint` union (D53's growth path), never an edit to `DatumConstraint`: a peer
 * corner relationship is not a datum binding. `element`/`other` order encodes the butt direction.
 */
export interface JoinConstraint {
  readonly id: ConstraintId;
  /** The dependency subject — the wall this override is filed under (the element-self edge, 0a). */
  readonly element: ElementId;
  /** The wall it joins. `{element, other}` IS the corner; order encodes which wall butts into which. */
  readonly other: ElementId;
  readonly kind: 'join';
  /** `butt` ⇒ `element` butts into `other`; `mitre` ⇒ symmetric bisector; `none` ⇒ disallow (stay boxes). */
  readonly resolution: 'butt' | 'mitre' | 'none';
  // FUTURE (additive, v1.0.x): readonly priority?: Readonly<Record<string, number>>  // per-layer join
}

/** ⚠ A peer corner override — not a datum binding, not a sketch rule. Narrow before reaching for `.other`. */
export function isJoinConstraint(c: Constraint): c is JoinConstraint {
  return c.kind === 'join';
}

export function isSketchConstraint(c: Constraint): c is SketchConstraint {
  // ⚠ POSITIVE-BY-ELIMINATION over the THREE members (0c added `join`). A bare `!isDatumConstraint` would
  // now mis-classify a `JoinConstraint` as a sketch constraint — the three must partition cleanly.
  return !isDatumConstraint(c) && !isJoinConstraint(c);
}

/* ================================================================================================
 * THE SKETCH — a 2D constrained profile (D50 §0d, `P5_step0d_design.md`). Q1=A (owner-ruled): the
 * sketch GEOMETRY lives in the element's `params` (a structured `ParamValue`); its RULES are first-class
 * `SketchConstraint`s in `scene.constraints`. That is D53's value-vs-relationship split applied to a
 * sketch — coordinates are values, constraints are relationships — the same split it drew for datums.
 *
 * ⚠⚠ THE POINT IDS AND THE SEGMENT ARRAY ORDER ARE FROZEN CONTRACT (D1/D26). A constraint names a point
 * by its stable id; a segment is named `lateral.k` by its INDEX in the authored array. The solver may move
 * a point's coordinates; it must NEVER permute the segment array, because reordering re-targets every
 * `SubShapeRef` into the extruded solid — silently, catastrophically (§5 of the design; the guard lives in
 * `sketch.ts`). The array is authored, never sorted.
 * ============================================================================================= */

/** A sketch vertex the solver moves. Its `id` is stable and unique within the sketch — a constraint names it. */
export interface SketchPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Anchored — the solver holds it fixed. Absent ⇒ free. A sketch needs ≥ 1 anchor to be locatable. */
  readonly fixed?: boolean;
}

/**
 * One profile segment: `from` → `to` by point id. Absent `arc` ⇒ a straight line. Present ⇒ a circular arc
 * from `from` to `to` about `arc.center` (another point id). ⚠ Its slot in `Sketch.segments` IS its identity
 * (`lateral.k`, D26) — the array is authored, never permuted.
 */
export interface SketchSegment {
  readonly from: string;
  readonly to: string;
  readonly arc?: { readonly center: string; readonly clockwise?: boolean };
}

/** A constrained profile: the vertices, the ordered segment loop between them. Lives in `element.params`. */
export interface Sketch {
  readonly points: readonly SketchPoint[];
  readonly segments: readonly SketchSegment[];
}

/**
 * The v1.0.0 sketch-constraint kinds (Q3, owner-ruled: the FULL named set). All are one-line planegcs
 * mappings. New kinds are additive union-of-kinds members later — never an edit to this list.
 */
export type SketchConstraintKind =
  | 'coincident' // two points share a location
  | 'parallel' // two segments parallel
  | 'perpendicular' // two segments perpendicular
  | 'tangent' // segment ↔ arc, or arc ↔ arc
  | 'horizontal' // a segment is horizontal in the sketch plane
  | 'vertical' // a segment is vertical
  | 'distance' // |p1 p2| = value  (the DRIVING dimension)
  | 'equal'; // two segments equal length

/**
 * Sketch-LOCAL operands. `points` are point ids; `segments` are segment INDICES (0-based, authored order —
 * D26). Arity is per-kind: coincident/distance → 2 points; horizontal/vertical → 1 segment;
 * parallel/perpendicular/equal/tangent → 2 segments. The command validates the shape; the solver maps it.
 *
 * ⚠ This is deliberately NOT a `ConstraintTarget` (which addresses SCENE datums — Levels/Grids). A datum
 * constraint binds an element to the scene; a sketch constraint relates geometry within one element.
 */
export interface SketchOperands {
  readonly points?: readonly string[];
  readonly segments?: readonly number[];
}

/**
 * A rule relating geometry inside ONE element's sketch (0d). A discriminated-union member beside
 * `DatumConstraint`; it shares the `id`/`element` spine and the `scene.constraints` collection.
 */
export interface SketchConstraint {
  readonly id: ConstraintId;
  /** The element whose sketch this constrains — the dependency subject (an element-self edge, 0a). */
  readonly element: ElementId;
  readonly kind: SketchConstraintKind;
  readonly operands: SketchOperands;
  /** mm or degrees — present only for the dimensional kinds (`distance`; later `angle`/`radius`). */
  readonly value?: number;
  /**
   * ⚠ RESERVED, always true in v1.0.0. planegcs's non-driving constraints are buggy (design §1), so every
   * v1.0.0 constraint DRIVES its geometry. A future reference/reporting dimension sets this false; reserving
   * the field now keeps that additive.
   */
  readonly driving?: boolean;
}

/* ================================================================================================
 * THE ELEMENT
 * ============================================================================================= */

/**
 * D36 — every element says what it IS, structurally.
 *
 * ⚠ MIQDAR'S SPEC SAYS IT IMPORTS "THE STRUCTURAL ELEMENTS" — and nothing in Bunyan could say which
 * those were. A Wall may be a shear wall or a partition: that is a **property, not a type**. Miqdar
 * must never guess, because a guess is a *wrong* structural model rather than a refused one.
 *
 * ⚠⚠ **AND `discipline` IS NOT HERE — IT IS ON THE PART** (decision **D45**, and the owner found it by
 * reading the product against the trade that builds it). Not here, and **not derived here either**: a
 * lossy summary of data already in the payload is a thing someone will one day route off. A void
 * (an Opening) has no parts, and therefore no discipline at all — there is nothing to build.
 */
export interface Classification {
  /** `IfcWall`, `IfcSlab`, `IfcBeam` … — the door to the outside world. */
  readonly ifcClass: string;
  readonly loadBearing: boolean;
}

/**
 * ⚠ RESERVED (D59, Freeze-Gate row Ⓑ, owner Q4 2026-07-22). A per-child override on a composite parent's
 * generated child, keyed by the child's slot (`Element.childOverrides`). All fields optional — an override
 * is a SPARSE PATCH, never a full re-specification. `hidden` drops the child; `typeId`/`styleId`/`params`
 * swap or re-parametrise it; a partial `params` merges over the recipe-generated ones. Shaped-but-minimal:
 * new override facets are additive fields (the reserve-shapes discipline). NO body reads it in v1.0.0.
 */
export interface ChildOverride {
  /** Drop this generated child entirely (Revit's "delete a curtain panel"). */
  readonly hidden?: boolean;
  /** Swap the child's Type (a glass panel → a door). */
  readonly typeId?: TypeId;
  /** Override the child's style. */
  readonly styleId?: StyleId;
  /** Merge over the recipe-generated child params (a partial patch, not a replacement). */
  readonly params?: Params;
  /**
   * ⚠ RESERVED (owner-ruled 2026-07-28, Q3 — `P5_step6B_schedules_design.md` §6.3). The AUTHORED short
   * label a schedule's identity column reads, for a GENERATED child (Revit's editable curtain-panel Mark).
   *
   * ⚠⚠ WHY IT NEEDS A HOME AT ALL: `Element.mark?` (ⓡ) is authored through `createElement`/
   * `core.setElementMetadata`, and a D59 Model-A child **is not a scene row**, so it is authored through
   * neither. Without this slot a curtain-panel schedule's Mark column is permanently blank for 16 of a
   * curtain wall's 17 rows — and `BuiltChild` (the recipe half) cannot carry it either, because a mark is
   * authored, not derived. This shape is exactly *"authored deviation from a generated child."*
   *
   * ⚠ A PURE RESERVATION: nothing reads `childOverrides` in v1.0.0, so a generated child's mark is absent
   * today and its identity column is the Type-supplied `BuiltChild.name`. The field exists so the body
   * that lands later is additive rather than an amendment across three products.
   */
  readonly mark?: string;
}

/**
 * A BIM object instance — a wall, a slab, a beam, an opening.
 *
 * ⚠ It carries only what is UNIQUE to it (domain rule 12): its axis, its height, where it is. What is
 * shared — the layer stack, the section, the materials — lives on its `styleId`.
 */
export interface Element {
  readonly id: ElementId;
  readonly typeId: TypeId;
  /** The version of the Type this element's params were authored against. Drives migration on load. */
  readonly typeVersion: number;
  readonly styleId?: StyleId;
  readonly name?: string;
  readonly params: Params;
  /** The spatial container it lives in (a Level, usually; D35). */
  readonly containerId?: ContainerId;
  // ⚠ `gridRefs` was REMOVED here (D50 step 0b, owner decision A): grid placement is now a first-class
  // `grid` `Constraint` in `scene.constraints`, not an element field — one binding mechanism (D53). The
  // field had zero readers, so nothing migrated; the constraint carries the same "column stays at B-3".
  readonly classification: Classification;
  /**
   * WHERE IT IS IN THE WORLD — a rigid motion applied to its finished parts (spec §6: `transform`).
   *
   * ⚠⚠ THE ELEMENT IS AUTHORED IN ITS OWN BUILD FRAME AND *THEN* PLACED, AND THAT ORDER IS
   * LOAD-BEARING FOR IDENTITY — it is not a modelling convenience.
   *
   *   1. **`transform` mints NO identities** (D25, measured Entry 11): a rigid motion is a topological
   *      isomorphism, so the placed wall's refs ARE the built wall's refs, token for token. A rotated
   *      wall is the same wall, and the window hosted on its `y-min` face is still hosted there.
   *   2. ⇒ **the openings are cut in the LOCAL frame, before placement** — which is why moving or
   *      rotating a wall in the world cannot re-target a single reference.
   *   3. ⇒ **D28's positional tie-break therefore runs in the element's own build frame**, which is
   *      exactly the structural fact that bounds its residual risk (spec §6.5). Moving a column across
   *      the site cannot re-rank a symmetric tie, because the tie was broken before the move existed.
   *
   * Scale is deliberately absent (see the protocol's `RigidMotion`): a BIM element is resized by
   * changing its PARAMETERS and re-running the recipe, never by stretching its solid.
   */
  readonly placement?: readonly RigidMotion[];
  /**
   * For a HOSTED element (an Opening): the element it is hosted BY, and the face it is hosted ON.
   *
   * ⚠ `hostRef` is a `SubShapeRef` TOKEN — a derivation path, never a geometric index (D1). It is what
   * must still resolve after the host is resized, and it is the reason persistent naming exists.
   */
  readonly hostId?: ElementId;
  readonly hostRef?: string;
  /* ----------------------------------------------------------------------------------------------
   * RESERVED-AT-FREEZE FIELDS (P5 step 0g, `P5_step0g_design.md`). Each is optional and defaults to
   * today's behaviour, so every existing element and every saved `.bnn` is untouched. They exist so a
   * v1.0.x / P6 / ecosystem feature never has to AMEND this frozen contract + migrate every file. No
   * body reads them yet — 0g reserves the SHAPE; the consumers land in their own phases.
   * -------------------------------------------------------------------------------------------- */
  /**
   * ⚠ RESERVED (D54b + Freeze-Gate ⓛ). Construction-sequencing datums — the phase in which this element
   * is CREATED and the one in which it is DEMOLISHED (Revit's model; Planitor sequences by both). Absent
   * `phaseCreated` ⇒ exists from the start ("new"); absent `phaseDemolished` ⇒ never demolished. A phase-id
   * reference, never parsed — the `phases` DEFINITION collection is a purely-additive v1.0.x collection.
   */
  readonly phaseCreated?: string;
  readonly phaseDemolished?: string;
  /**
   * ⚠ RESERVED (Freeze-Gate ⓝ). The element this one is a MANUAL member/child of — a GROUP/assembly's
   * members (a table + four chairs bundled to move together). Absent ⇒ a top-level element (today's case).
   *
   * ⚠⚠ RE-PINNED (D59, owner-ruled 2026-07-22, Model A — `P5_step5B_composition_nesting_design.md` §5).
   * This is NOT the carrier for a curtain wall's panels/mullions. Those are GENERATED children: DERIVED
   * from the parent's recipe (Model A), never stored `scene.elements` rows, so nothing points UP at the
   * parent — the child's own DERIVED PEI (`${parentId}:${slot}`, `childElementId`) carries the edge, and
   * the parent's `buildChildren` regenerates them each rebuild (recipe-is-truth, D30). This field is for
   * the OTHER relationship rule 18 names — a MANUAL group of independently-authored elements — whose flat
   * `groups` scene collection is a separate, purely-additive v1.0.x collection (proven additive, not built).
   * Distinct from `hostId` (a boolean host) and from PARTS (solids of ONE element).
   */
  readonly parentElementId?: ElementId;
  /**
   * ⚠ RESERVED (D59, Freeze-Gate row Ⓑ, owner Q4 2026-07-22). A SPARSE, SLOT-KEYED override patch on a
   * COMPOSITE parent — the one place Model A (derived children) is weaker than Revit. A generated child is
   * addressed by its slot (`panel.r2c3`); an entry here overrides that child ("swap panel R2C3 for a door",
   * "pin this mullion", "hide this panel") without promoting it to a stored row. Absent ⇒ every child is
   * exactly as the recipe generates it (v1.0.0's only case — NO body reads this yet). Reserving the shape
   * now keeps Model C (per-child overrides) purely additive. Key = child slot; value = a partial override.
   */
  readonly childOverrides?: Readonly<Record<string, ChildOverride>>;
  /**
   * ⚠ RESERVED (Freeze-Gate ⓟ). Arbitrary property sets — the round-trip escape hatch for IFC data that
   * maps to no Bunyan param (P6 carries `IfcPropertySet`s the way `GenericSolid` carries unmapped geometry),
   * AND where an agent or a user attaches metadata without a schema change (provenance folds in here as a
   * `bunyan.*` pset). ⚠ This is the deliberate UNSCHEMATISED lane — it does not weaken the schema-driven
   * model (D21); it is the named exception to it. Shape: pset name → { property → value }.
   */
  readonly properties?: Readonly<Record<string, Readonly<Record<string, ParamValue>>>>;
  /**
   * ⚠ RESERVED (Freeze-Gate ⓠ). Classification-system codes — `Uniclass2015`, `OmniClass`, `AssemblyCode`
   * (system → code). The frozen `Classification` is `{ ifcClass, loadBearing }` and carries no cost code;
   * estimating and Planitor's scheduling run on these. A separate open map so `Classification` stays untouched.
   */
  readonly classifications?: Readonly<Record<string, string>>;
  /**
   * ⚠ RESERVED (Freeze-Gate ⓡ). The human-facing per-instance MARK — `W-01`, `C12` — used on schedules and
   * drawing tags (v1.0.x 2D documentation). Distinct from `id` (the ULID/machine identity, never shown) and
   * from `name` (a description). Absent ⇒ untagged.
   */
  readonly mark?: string;
  /* ----------------------------------------------------------------------------------------------
   * ROW Ⓕ RESERVATIONS (2026-07-24, owner-ruled — `P5_step5F_reservations_design.md`). Optional and
   * absent-defaulted like every reservation above; no body reads them in v1.0.0.
   * -------------------------------------------------------------------------------------------- */
  /**
   * ⚠ RESERVED (D62, row Ⓕ). The MEP network this element belongs to (`systems.ts`). Absent ⇒ not part of
   * a system (every element today). A per-port override lives on `Connector.systemId` — a valve or heat
   * exchanger genuinely bridges two networks.
   */
  readonly systemId?: SystemId;
  /**
   * ⚠ RESERVED (D62, row Ⓕ). The PORTS where other MEP components join this one (`systems.ts`). Absent ⇒
   * no connectors (every element today).
   *
   * ⚠ Each `Connector.at`/`.direction` is in the element's OWN BUILD FRAME, never world space — the D25
   * lesson (`transform` mints no identities), so moving or rotating a duct cannot invalidate its ports.
   * `Connector.name` is unique within the element, exactly as `Part.name` is (D30).
   */
  readonly connectors?: readonly Connector[];
  /**
   * ⚠⚠ RESERVED (D65, row Ⓕ). The design ALTERNATIVE this element belongs to (`designoptions.ts`).
   * Absent ⇒ **main model** — shared by every option, always counted (v1.0.0's only case).
   *
   * ⚠⚠⚠ READ `designoptions.ts` BEFORE ANY BODY READS THIS FIELD. When present, this element may be
   * MUTUALLY EXCLUSIVE with another element in the same option set ⇒ **`quantities()`, the project-wide
   * roll-up, the Clean Delta exporter and every schedule MUST exclude elements whose option is not the
   * active one** (`isElementActive`). Ignoring it double-counts and publishes work packages for a scheme
   * nobody is building — domain rule 15's failure mode, reached by a new road. The invariant is part of
   * the frozen contract, not an implementation note (the `Grid.geometry`/ⓥ precedent).
   */
  readonly designOptionId?: DesignOptionId;
}

/* ================================================================================================
 * PART — D30. NOT STORED. Built from params + style, exactly as geometry is.
 * ============================================================================================= */

/**
 * One solid of an element, with the material it is made of.
 *
 * ⚠ **PARTS ARE NOT PERSISTED** (spec §6). They are BUILT from `params` + `style`, exactly as the
 * geometry is — because the recipe is truth and everything else is a derived, disposable projection
 * of it. Storing a part would be storing a *result*, and results go stale.
 *
 * `nodeId` is the part's node in the operation DAG (`wall-1.structure`) — the thing that OWNS the
 * sub-shape identities of this solid. It is stable across rebuilds by construction, because it is
 * derived from the element id and the part name, neither of which a rebuild changes.
 */
export interface Part {
  readonly name: string;
  readonly materialId: MaterialId;
  /**
   * ⚠ Whose trade builds it (D45). **The Clean Delta carries this PER PART** — it is the field the
   * downstream work-package routing actually runs on.
   */
  readonly discipline: Discipline;
  readonly nodeId: string;
  readonly handle: ShapeHandle;
  /** Every sub-shape identity this part's solid carries, canonically ordered. */
  readonly refs: readonly string[];
  /**
   * ⚠ The subset of `refs` a trade BILLS — declared by the Type (`BuiltPart.exposedRefs`, D72). Absent
   * ⇒ `quantities()` falls back to the solid's total enclosing surface, which is what every Type
   * reported before Entry 60. See `types.ts` `BuiltPart.exposedRefs` for why the Type must be the one
   * to say, and for the 94.80-vs-15 m² measurement that forced it.
   */
  readonly exposedRefs?: readonly string[];
}

/** `core_logic.md` §7 — the geometry lifecycle of an element. */
export type ElementState = 'valid' | 'stale' | 'rebuilding' | 'failed' | 'broken-ref';

/**
 * A reference whose target could not be resolved (domain rule 3).
 *
 * ⚠ IT IS A FIRST-CLASS, VISIBLE STATE AWAITING **MANUAL RETARGETING** — never auto-healed, and never
 * silently reattached. The document must still LOAD and still EDIT while carrying one: "predictable
 * breakage beats silent wrongness" is only half-kept if the breakage takes the document with it.
 */
export interface BrokenReference {
  readonly elementId: ElementId;
  /** The `SubShapeRef` token that did not resolve. */
  readonly ref: string;
  readonly hostId: ElementId;
  readonly reason: string;
}
