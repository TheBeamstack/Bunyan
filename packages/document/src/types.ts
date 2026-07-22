/**
 * `BimObjectType` — the governing contract (`core_logic.md` §3.4, spec §4.1).
 *
 * **Adding a new kind of building element is adding a new Type, never editing the core** (domain rule
 * 5). This is the mechanism by which Bunyan reaches toward Revit-class breadth incrementally, and it
 * is why the registries exist at all.
 *
 * ⚠ RELEASE-CANDIDATE. This contract FREEZES AT P5, and D30–D36 all land in it. It is being written
 * now, deliberately, against a **composite, styled** element — because freezing it against a
 * single-solid wall would validate a contract the product cannot use.
 */

import type { ShapeHandle } from '@bunyan/protocol';
import type {
  Classification,
  Discipline,
  Element,
  ElementStyle,
  Grid,
  Material,
  Params,
  Section,
  StyleId,
  TypeId,
  SpatialContainer,
} from './entities.js';
import type { GeometryGateway } from './geometry.js';
import type { Sketch } from './entities.js';
import type { SolvedSketch } from './sketch.js';
import type { ParamSchema } from './schema.js';

/**
 * A line in the Level plane a wall's end-cap must lie on (D50 step 0c). A point on the line + its
 * direction. The wall clips each layer's two side-lines to it to place that end's cap corners.
 */
export interface CapLine {
  readonly point: readonly [number, number];
  readonly dir: readonly [number, number];
}

/** One resolved join on a wall: which of its baseline ends is joined, and the cap line that end takes. */
export interface ResolvedJoin {
  readonly end: 'start' | 'end';
  readonly capLine: CapLine;
}

/**
 * What a Type's `buildGeometry` gets. Note what it does NOT get: a `KernelClient` (D19), the undo
 * stack, or any way to mutate the document. **A Type is a pure function from recipe to solids** — it
 * reads the parametric truth and produces geometry, and that one-way street is what makes the model
 * rebuildable from `scene.json` alone.
 */
export interface BuildContext {
  readonly element: Element;
  /** The instance params, with the schema's defaults filled in. */
  readonly params: Params;
  /** The element's style, if it has one — the SHARED half of its definition (D31). */
  readonly style?: ElementStyle;
  /** Resolve a material the style's layer stack (or the element) names (D33). */
  readonly material: (id: string) => Material | undefined;
  /** Resolve a section — what a LinearMember is swept from (D32/D33). */
  readonly section: (id: string) => Section | undefined;
  readonly container: (id: string) => SpatialContainer | undefined;
  /** The elevation of the element's Level, in mm. `0` if it is not on one. */
  readonly elevation: number;
  /**
   * ⚠ THE ACTIVE-DATUM INPUTS (D50 step 0b, Freeze-Gate row ⓐ). Before 0b a Type got one scalar
   * `elevation`; an associative element needs more, and the engine resolves it from the element's
   * `Constraint`s so a Type stays a pure function of scalars (it never sees the scene).
   */
  /** The elevation of any container, in mm — not just the element's own (a base/top wall reads two). */
  readonly elevationOf: (containerId: string) => number;
  /** Resolve a grid axis the element is placed on. */
  readonly grid: (id: string) => Grid | undefined;
  /**
   * The element's `base`/`top` constraint elevations (offset folded in) — `height` is DERIVED as
   * `topElevation − baseElevation` (D52). `undefined` when the element has no constraint of that kind, so
   * an un-constrained element falls back to `elevation` + its own `height` param (byte-identical to pre-0b).
   */
  readonly baseElevation?: number;
  readonly topElevation?: number;
  /** The (x, y) intersection of the element's `grid` constraints, if it is grid-placed. */
  readonly gridPoint?: readonly [number, number];
  /**
   * ⚠ THE WALL-TO-WALL JOINS on THIS element (D50 step 0c, `P5_step0c_design.md` §5), resolved by the
   * engine from the scene into plane geometry — so a Type reads scalars and never touches the scene (the
   * 0b move). One entry per NON-DEFAULT end: a `capLine` the wall's end-cap must lie on, instead of the
   * plain perpendicular the wall draws by default. An end that auto-mitres, butts, or is unjoined that the
   * engine could resolve appears here; an unjoined or `none` end does NOT (the wall uses its default cap).
   *
   * ⚠⚠ THE ANTI-FUSE PROPERTY LIVES HERE: a join only ever moves a wall's CAP. The wall clips each layer's
   * two long SIDE-lines (the window-hosting faces) to these cap lines; the side segments keep their
   * authored index, so their `lateral.k` tokens are byte-identical across any join edit (D26). Empty ⇒ a
   * plain wall. NEVER a boolean fuse of two elements (§4h, measured Entry 12).
   */
  readonly joins?: readonly ResolvedJoin[];
  /**
   * The Type's own `defaultDiscipline` (D45) — the stamp for a part built with **no style layer**.
   * A styled part takes its discipline from **its layer** (`ctx.style.layers[i].discipline`), which is
   * the entire point of the ruling: an RC wall's core is structural and its plaster is not.
   */
  readonly defaultDiscipline: Discipline;
  /** The kernel — narrowed to geometry, and nothing else (D19). */
  readonly geometry: GeometryGateway;
  /** The DAG node id for one of this element's parts: `wall-1.structure`. */
  readonly nodeId: (partName: string) => string;
  /**
   * ⚠ THE SKETCH SOLVER (D50 §0d). Hand it this element's 2D profile; it attaches the element's
   * `SketchConstraint`s (resolved from the scene, so the Type never touches the scene — the 0b move), runs
   * the solver, and returns solved coordinates by point id plus the AUTHORED segment array (D26). The Type
   * then emits a `Profile` from the solved coordinates in that order and feeds it to `extrude`/`revolve`.
   *
   * ⚠⚠ It THROWS (`SketchSolveError`) on an unsatisfiable sketch (over-constrained / non-convergent) —
   * which the rebuild turns into a `geometry` failure, so the command that made it is rejected and the
   * document stays at last-good (D42). An under-constrained sketch is NOT an error: it returns coordinates
   * with `dof > 0`. A Type that has no sketch simply never calls this.
   */
  readonly solveSketch: (sketch: Sketch) => SolvedSketch;
  /**
   * ⚠⚠ **DECLARE A SOLID THIS TYPE CREATED AND NO LONGER NEEDS** — and every Type that runs **more than
   * one kernel op per part** must call it, or it leaks one OCCT solid per rebuild, per part, forever.
   *
   *     const box = await ctx.geometry.request('makeBox', …);
   *     ctx.discard(box.handle);          // ⚠ BEFORE the risky op, not after — see below
   *     const rounded = await ctx.geometry.request('fillet', { handle: box.handle, … });
   *     return [{ …, handle: rounded.handle }];
   *
   * ⚠ **A Type must NOT free the handle itself.** The WASM heap has exactly one owner
   * (`DocumentContext`), and splitting that ownership is how leaks — and double-frees — are born. So a
   * Type *declares*; the engine *collects*; the document *frees*, at the end of the rebuild, once it
   * knows the handle is not also somebody's final solid.
   *
   * ⚠⚠ **AND THAT IS WHY YOU DECLARE *BEFORE* THE OP THAT MIGHT REFUSE.** Because `discard` only
   * declares — nothing is freed until the rebuild ends — **the handle is still a valid operand after
   * you have declared it.** Declare it *after* the op instead, and a kernel refusal throws straight past
   * the declaration: the solid leaks on precisely the path where a leak is hardest to see. (Measured
   * while writing the D42 test: two solids leaked per *refused* rebuild, and the happy path was clean.)
   *
   * ⚠ It exists because **every fixture type today runs exactly ONE op per part** (a box, an extrude) —
   * so the gap was invisible, and the first Type to do two (a wall with a rounded corner, written for
   * the D42 test) leaked four solids per rebuild. **P5's real Wall/Slab/Opening will all do two or
   * more** — extrude then chamfer, box then fillet — so this had to land before the contract freezes.
   */
  readonly discard: (handle: ShapeHandle) => void;
}

/**
 * What a Type returns: **an ORDERED LIST OF PARTS, not one solid** (D30).
 *
 * A wall is blockwork + insulation + plaster. **A single-solid element is just an element with one
 * part** — so nothing is complicated by this, and everything is made possible by it.
 */
export interface BuiltPart {
  /** The part's slot in the element's own vocabulary — authored by the Type, never by OCCT. */
  readonly name: string;
  readonly materialId: string;
  /**
   * ⚠ Whose trade builds it (D45). Comes from the **style layer** that produced this part; for a part
   * built with **no style** (a single-solid element), from the Type's `defaultDiscipline`.
   */
  readonly discipline: Discipline;
  /** The DAG node that owns this solid's identities. Always `ctx.nodeId(name)` — never invented. */
  readonly nodeId: string;
  readonly handle: ShapeHandle;
  readonly refs: readonly string[];
}

/**
 * What a HOSTED VOID returns (an Opening): one solid, to be subtracted from every part of its host.
 *
 * ⚠ THIS IS AN *INTRA*-ELEMENT BOOLEAN AND IT ALWAYS WAS ALLOWED. The anti-fuse rule ("never fuse two
 * ELEMENTS") is untouched: a void is not a second element's solid being merged into this one, it is a
 * hole being cut in this one. An Opening cutting through all three layers of its host is exactly what
 * an opening is, and a window that pierced only the structural layer would be an obvious, embarrassing
 * bug — which is why P5 must test Opening against a COMPOSITE wall, not a monolithic one.
 */
export interface BuiltVoid {
  readonly handle: ShapeHandle;
}

/**
 * ⚠⚠ A GENERATED CHILD ELEMENT (D59 composition, Model A — owner-ruled 2026-07-22, `P5_step5B_composition_
 * nesting_design.md`). A curtain wall's panel or mullion; a stair's tread. What a composite parent's
 * `buildChildren` RETURNS — a first-class element (its own PEI, its own Type, its own parts and material),
 * but DERIVED from the parent's recipe, not stored (recipe-is-truth, D30). The engine builds each child
 * recursively via its `typeId` and gives it the DERIVED PEI `${parentId}/${slot}` (`childElementId`).
 *
 * ⚠ IT CARRIES A `typeId` + `params`, NOT PRE-BUILT SOLIDS — because a child IS an element (rule 18), so
 * it is built by its own Type in the parent's local frame (the parent computes each child's positioning
 * params). The parent's placement then rides the whole subtree last (the D25 isomorphism, like a door leaf).
 *
 * ⚠⚠ THE ANTI-FUSE RULE BINDS (rule 11, §4h): a child is its OWN solid, next to its siblings — NEVER fused.
 * Composition is spatial adjacency + identity ownership, never a boolean.
 */
export interface BuiltChild {
  /**
   * ⚠ THE STABLE SLOT KEY — the child's derived-PEI suffix (`panel.r0c0`, `mullion.v1`). It is IDENTITY
   * (D26): stable across rebuilds while the slot exists; a slot that vanishes (a grid shrinks) drops the
   * child, and any tag on its PEI becomes a broken-ref. Unique among one parent's children — the engine
   * refuses a duplicate slot (two children would mint byte-identical PEIs, the `core_logic.md` §5 rule).
   */
  readonly slot: string;
  /** The child's Type — it is a first-class element of this kind (a `core.curtainwall.panel`). */
  readonly typeId: TypeId;
  /** The child's instance params — the parent computes them (a panel's cell rectangle, a mullion's line). */
  readonly params: Params;
  /** The child's shared style, if any (D31) — a panel style shared across every panel. */
  readonly styleId?: StyleId;
  /** The child's classification. Absent ⇒ the child Type's `defaultClassification` (a panel is `IfcPlate`). */
  readonly classification?: Classification;
  /** A human-facing name for the child (a schedule/tag reads it). Absent ⇒ unnamed. */
  readonly name?: string;
}

/** What a hosted type's `buildVoid` gets, on top of the ordinary build context. */
export interface VoidBuildContext extends BuildContext {
  readonly host: Element;
  readonly hostParams: Params;
  /**
   * ⚠ The HOST's style, not the opening's. An opening has no layer stack of its own — but it must know
   * how thick its host is, because it has to cut through **every one** of its host's layers.
   */
  readonly hostStyle?: ElementStyle;
  /** The host face this void is hosted on, already resolved. Its bounds, in mm. */
  readonly hostFace: {
    readonly ref: string;
    readonly bounds: {
      readonly min: readonly [number, number, number];
      readonly max: readonly [number, number, number];
    };
    /**
     * ⚠⚠ WHICH WAY IS INTO THE HOST — the unit vector pointing from this face into the host SOLID
     * (found by modelling, 2026-07-15; see `tests/gap-void-inward-direction.test.ts`).
     *
     * A hosted void MUST project its cut along `inward`, never along a guessed `+normal`. A planar face
     * has a solid on exactly ONE side, and its bounding box **cannot say which** — so a void that
     * guesses (as the fixture Opening once did) cuts the right way for a MIN-side face and the WRONG way
     * for a MAX-side face, silently leaving matter behind a window on a wall's *exterior* face or a
     * stairwell in a slab. `inward` is `-frame.normal` — the exact inward direction for any planar face,
     * axis-aligned or not.
     */
    readonly inward: readonly [number, number, number];
    /**
     * ⚠⚠ THE FACE'S LOCAL FRAME, READ FROM THE B-REP SURFACE — origin, outward normal and two in-plane
     * tangents, evaluated at the face's parametric centre (found by modelling, Entry 30, 2026-07-16;
     * `tests/gap-void-curved-face.test.ts`).
     *
     * ⚠ **`bounds` and `inward` are enough for a PLANAR AXIS-ALIGNED face and nothing else.** A CURVED
     * face — a round column's or pipe's single wrap-around `lateral` face — has a bounding box **equal to
     * the whole solid's**, so neither `bounds` (no position on the surface) nor a single bbox-derived
     * `inward` (degenerate — it fell back to `+z` and bored a pocket *down the column's axis*) can place
     * a void on it. The frame comes from the actual surface (`faceFrame`), so a void projects its cut
     * along `-frame.normal` (into the host) from `frame.origin`, oriented by `uAxis`/`vAxis` — which cuts
     * a straight duct **through the side** of a round column. For a planar axis-aligned host the frame's
     * axes coincide with the world axes, so the older `bounds`+`inward` path stays byte-identical.
     */
    readonly frame: {
      readonly origin: readonly [number, number, number];
      readonly normal: readonly [number, number, number];
      readonly uAxis: readonly [number, number, number];
      readonly vAxis: readonly [number, number, number];
    };
  };
}

/**
 * ⚠ RESERVED (Freeze-Gate ⓒ, `P5_step0g_design.md` §4). The IMPORT mapping (P6): which IFC entity this
 * Type is the target for, and how an entity's attributes fill its params. `defaultClassification.ifcClass`
 * is the OUTBOUND identity; this is the INBOUND rule. Shaped-but-open; the P6 importer defines the resolution.
 */
export interface IfcMapping {
  /** The IFC entity type this Type imports (`IfcWallStandardCase`, `IfcBeam`, …). */
  readonly ifcClass: string;
  /** Optional map: Bunyan param name ← IFC property/quantity name. Open-ended by design. */
  readonly params?: Readonly<Record<string, string>>;
}

export interface BimObjectType {
  readonly id: TypeId;
  /**
   * Bumped when the Type's parameters change shape. `manifest.json` records the version every element
   * was authored against, and `migrate` brings an old file forward on load (spec §4.1).
   */
  readonly version: number;
  readonly label: string;
  readonly description?: string;
  /** Drives the property panel, the create-command's args, AND the agent's tool list (D21). */
  readonly parameterSchema: ParamSchema;
  /** What a Style *for this type* may carry. `undefined` ⇒ the type is not styleable. */
  readonly styleSchema?: ParamSchema;
  /** The classification a new instance gets by default. The author may override it (D36). */
  readonly defaultClassification: Classification;
  /**
   * ⚠ The discipline stamped on parts this Type builds **with no style** (D45) — a LinearMember from a
   * bare Section, say. A styled element takes each part's discipline from **its own layer**, which is
   * the whole point of the ruling.
   *
   * ⚠ **Never inferred from the material.** A concrete screed is not structural; a timber shear wall is.
   * A hosted void (an Opening) has no parts and needs none.
   */
  readonly defaultDiscipline?: Discipline;

  /**
   * Build the element's parts from its recipe. **Ordered.** This is the STANDALONE-element builder — an
   * element that stands on its own (a wall, a slab, a column). Absent for a hosted void (an Opening
   * contributes a hole, not a solid) — a hosted element that also has a solid builds it with `buildLeaf`,
   * NOT this, because a door leaf cannot be built without its host frame (see `buildLeaf`).
   */
  readonly buildGeometry?: (ctx: BuildContext) => Promise<readonly BuiltPart[]>;

  /** A hosted VOID (an Opening): the solid to subtract from every part of its host. */
  readonly buildVoid?: (ctx: VoidBuildContext) => Promise<BuiltVoid>;

  /**
   * ⚠⚠ THE HOSTED-SOLID HALF OF A DOOR/WINDOW (Freeze-Gate ⓙ, resolved P5 step 5, `review_P5.md` #2).
   *
   * A hosted element is not only a hole. A real door has a **leaf, frame and sill**; a real window has
   * a **frame and glazing** — solids that live IN the opening. Before this, a hosted type could ONLY
   * cut a void (`build.ts` called `buildVoid` and pushed `parts: []`); freezing the build wire without
   * this **forecloses every real door and window**, a declared v1.0.0 element.
   *
   * ⚠ IT IS A SEPARATE METHOD FROM `buildGeometry`, AND THE SEPARATION IS THE CONTRACT — not an accident:
   *   1. A leaf must be placed in the host's opening frame, so it needs the host geometry — it takes a
   *      `VoidBuildContext` (`hostFace`/`host`/`hostStyle`), exactly like `buildVoid`. `buildGeometry`
   *      takes a plain `BuildContext`, and under `strictFunctionTypes` a `(VoidBuildContext) ⇒ …` is NOT
   *      assignable to a `(BuildContext) ⇒ …` (proven: `TS2322`) — so `buildGeometry` structurally
   *      cannot be the leaf builder without widening the frozen `BuildContext` for every element.
   *   2. A door builds a solid ONLY when hosted. `buildGeometry` means *"I stand on my own"*; a door
   *      does not, and an un-hosted door is correctly `unbuildable` (a door with no wall is not a thing).
   *      Putting the leaf on `buildGeometry` would wrongly let the engine try to build it standalone,
   *      with no `hostFace` — garbage. `buildLeaf` says exactly *"I am a solid, but only in a host."*
   *
   * ⚠ IT NEEDS NO NEW FROZEN FIELD (the pre-freeze proof, `review_P5.md` #2): it reuses `VoidBuildContext`
   * and `BuiltPart` UNCHANGED — `hostFace.frame`/`bounds`/`inward` already place a leaf, and a leaf part is
   * an ordinary `BuiltPart`. The ONLY additive surface is this one optional method, landed pre-freeze.
   *
   * ⚠ Build the leaf in the HOST's LOCAL frame (from `hostFace`, like `buildVoid`); the engine applies the
   * host's placement last, so the door moves with its wall. The parts become the OPENING element's own
   * `parts` (its `quantities` measure the leaf, per part, per material — a door schedules its ironmongery).
   * Absent ⇒ the hosted element is a pure void (a plain opening / a rough hole), exactly as before.
   */
  readonly buildLeaf?: (ctx: VoidBuildContext) => Promise<readonly BuiltPart[]>;

  /**
   * ⚠⚠ THE COMPOSITE HALF — a parent that owns CHILD ELEMENTS, not only Parts (D59, Freeze-Gate row Ⓑ,
   * owner-ruled 2026-07-22 Model A, `P5_step5B_composition_nesting_design.md`).
   *
   * A curtain wall is panels + mullions on a grid; a stair is treads + stringers. Each is a first-class
   * element with its own PEI (rule 18) — but DERIVED from this parent's recipe, not a stored `scene.elements`
   * row (Model A: recipe-is-truth, the identity discipline of `partNodeId`/`lateral.k` promoted one level).
   * This method GENERATES them: it returns `BuiltChild` descriptors (each a `typeId` + `params`), and the
   * engine builds each recursively in this parent's local frame, gives it the derived PEI `${parentId}/${slot}`,
   * and rides the whole subtree on the parent's placement last. A child may itself be composite (depth > 1).
   *
   * ⚠ A composite parent may have `buildGeometry` (its own frame parts) OR `buildChildren` OR BOTH. Absent ⇒
   * a flat element (today's only case). ⚠⚠ The engine refuses a type that transitively nests ITSELF (a cycle
   * → a `geometry` failure, D42 — never a hang) and a duplicate slot (byte-identical child PEIs, §5). It
   * needs NO new frozen field: a `BuiltChild` is a `typeId`+`params`, a child's parts are ordinary `BuiltPart`s.
   */
  readonly buildChildren?: (ctx: BuildContext) => Promise<readonly BuiltChild[]>;

  /**
   * Bring params authored against an older version of this Type forward. Called on load, once per
   * element, when `element.typeVersion < type.version`.
   */
  readonly migrate?: (params: Params, fromVersion: number) => Params;

  /* ----------------------------------------------------------------------------------------------
   * RESERVED-AT-FREEZE (P5 step 0g, `P5_step0g_design.md` §4/§5). Optional, additive, no body in 0g.
   * -------------------------------------------------------------------------------------------- */
  /**
   * ⚠ RESERVED (Freeze-Gate ⓒ). The IFC import mapping — reserve it now or P6 amends a frozen
   * `BimObjectType`. Absent ⇒ the Type is not an IFC import target (imported as `GenericSolid`). The
   * plan's step 3 already LISTS `ifcMapping` as a type field; this makes the contract carry it.
   */
  readonly ifcMapping?: IfcMapping;
  /**
   * ⚠ RESERVED (Freeze-Gate ⓕ). Bring a STYLE's params/layers authored against an older `styleSchema`
   * forward — the twin of `migrate`, which only handles element params. Called on load when a style's
   * version < the schema's current version. Absent ⇒ a style is loaded verbatim (today's behaviour).
   */
  readonly migrateStyle?: (styleParams: Params, fromVersion: number) => Params;
}

/** A Type that hosts itself ON another element (an Opening) rather than standing on its own. */
export function isHostedType(type: BimObjectType): boolean {
  return type.buildVoid !== undefined;
}
