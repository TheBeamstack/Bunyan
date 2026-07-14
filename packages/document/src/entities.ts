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
}

/**
 * A named structural axis — `A`, `B`, `1`, `2`. **Level organizes the model vertically; Grid organizes
 * it horizontally** (D32), and every BIM tool and every structural tool has both.
 *
 * A column sits at B-3, and it *stays* at B-3 when the grid spacing changes — which is why an element
 * carries `gridRefs`, not a copy of the coordinate.
 */
export interface Grid {
  readonly id: GridId;
  readonly name: string;
  readonly axis: 'x' | 'y';
  /** mm along the perpendicular axis. */
  readonly offset: number;
  readonly buildingId?: ContainerId;
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
  /** The grid intersection it is placed on, if any (D32) — `["B", "3"]`. */
  readonly gridRefs?: readonly GridId[];
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
