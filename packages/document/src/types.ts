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
  SpatialContainer,
  TypeId,
} from './entities.js';
import type { GeometryGateway } from './geometry.js';
import type { ParamSchema } from './schema.js';

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
   * Build the element's parts from its recipe. **Ordered.** Absent for a hosted void (an Opening
   * contributes a hole, not a solid).
   */
  readonly buildGeometry?: (ctx: BuildContext) => Promise<readonly BuiltPart[]>;

  /** A hosted VOID (an Opening): the solid to subtract from every part of its host. */
  readonly buildVoid?: (ctx: VoidBuildContext) => Promise<BuiltVoid>;

  /**
   * Bring params authored against an older version of this Type forward. Called on load, once per
   * element, when `element.typeVersion < type.version`.
   */
  readonly migrate?: (params: Params, fromVersion: number) => Params;
}

/** A Type that hosts itself ON another element (an Opening) rather than standing on its own. */
export function isHostedType(type: BimObjectType): boolean {
  return type.buildVoid !== undefined;
}
