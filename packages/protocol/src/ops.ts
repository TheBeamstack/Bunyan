/**
 * The operation set of protocol v1.
 *
 * P1 scope: enough to prove the seam end to end (handshake, echo/transferables, a real solid,
 * tessellation with provenance, handle lifecycle, and a deliberately-failing op). P2 grows this
 * with the rest of the primitives, booleans and fillets — additively, without reshaping the envelope.
 */

import type { Bounds, MeshBuffers, Vec3 } from './mesh.js';
import type { KernelFailureCode } from './failures.js';
import type { SubShapeRef } from './subshape.js';

/**
 * An opaque token for a shape living on the WASM heap. The main thread NEVER holds a raw OCCT
 * pointer (spec §6.2) — it holds one of these, and the worker's handle registry owns the memory.
 */
export type ShapeHandle = string;

export interface KernelInfo {
  /** `occt` for the real kernel, `mock` for the protocol-conformant fake (P2 step 0). */
  readonly name: string;
  readonly kernelVersion: string;
  /**
   * The OCCT/OpenCascade.js build id. Recorded in `manifest.json`; a mismatch invalidates the
   * `geometry-cache.brep` and forces a rebuild from the recipe (spec §6).
   */
  readonly buildId: string;
  readonly threading: 'multi' | 'single';
  readonly capabilities: readonly string[];
}

export interface HandshakeResult {
  readonly protocolVersion: number;
  readonly kernel: KernelInfo;
}

export interface EchoPayload {
  readonly note: string;
  /** Round-trips a transferable so the plumbing is proven, not assumed (P1 step 5). */
  readonly blob?: Uint8Array;
}

export interface MakeBoxPayload {
  /** The DAG node that will OWN the resulting sub-shape identities (spec §4.5). */
  readonly nodeId: string;
  /** Millimetres. */
  readonly dx: number;
  readonly dy: number;
  readonly dz: number;
  /**
   * The min corner, in millimetres. Defaults to the origin.
   *
   * ⚠ A TRANSLATION, NOT A TRANSFORM — and the distinction is deliberate. Without it, two solids both
   * sit at the origin and a boolean between them can only ever cut a CORNER off a wall; a window in
   * the middle of one is unreachable, and that is the single operation this product exists to perform.
   * Rotation is NOT here: a rotated element needs a general `transform` op with its own naming rules,
   * and inventing half of one under time pressure is how contracts rot. Placement of a *rotated* wall
   * is P3's problem, and it is a new op, not a new field.
   */
  readonly at?: Vec3;
}

export interface ShapeResult {
  readonly handle: ShapeHandle;
  readonly bounds: Bounds;
  /** Every face/edge identity this operation assigned, canonically ordered. */
  readonly refs: readonly string[];
}

export interface TessellatePayload {
  readonly handle: ShapeHandle;
  /** Chordal deviation in mm. Smaller = finer mesh. */
  readonly deflection: number;
}

export interface MeasurePayload {
  readonly handle: ShapeHandle;
  /**
   * Optional: measure ONE named sub-shape (a `SubShapeRef` token) instead of the whole solid —
   * *"what is the AREA of that wall face?"*. Omitted ⇒ the whole shape.
   *
   * ⚠ THIS IS WHAT MAKES QUANTITIES POSSIBLE, and its absence was an oversight, not a design (Entry
   * 13). `bounds` took a `ref` from the day it was written (Entry 9); `measure` predates it (Entry 7)
   * and was never brought level. Without it the paint area, the formwork area and the cladding
   * take-off are **not askable** — which would foreclose *quantities*, a declared north-star that
   * **domain rule 8 forbids foreclosing**, leave P5's `quantities` hook on `BimObjectType` with
   * nothing to call, and starve Miqdar of its entire input (§4g).
   *
   * What comes back for a sub-shape: a FACE has `area` and `edgeLength` (its perimeter) and **zero
   * volume** — a face encloses nothing, and reporting anything else would be a lie a quantity
   * schedule would happily bill. An EDGE has `edgeLength` only.
   */
  readonly ref?: string;
}

/**
 * EXACT properties, straight from OCCT's `BRepGProp` — deliberately NOT derived from the mesh.
 *
 * Why this op exists (owner-approved, spec §4b-C): measuring a tessellation is only exact for
 * PLANAR-faced solids. A circular column's triangles under-report its volume by the chord error, so
 * a quantity schedule built on the mesh would quietly under-bill every column in the project. The
 * mesh is a disposable projection; quantities must come from the B-Rep, which is the source of truth.
 */
export interface MeasureResult {
  /** mm³ */
  readonly volume: number;
  /** mm² */
  readonly area: number;
  /** mm — summed over UNIQUE edges (see the kernel's note on `LinearProperties`). */
  readonly edgeLength: number;
  readonly counts: {
    readonly solids: number;
    readonly faces: number;
    readonly edges: number;
    readonly vertices: number;
  };
}

export interface MakeCylinderPayload {
  readonly nodeId: string;
  /** Millimetres. */
  readonly radius: number;
  readonly height: number;
  /** The centre of the base cap. Defaults to the origin. */
  readonly at?: Vec3;
  /**
   * The axis the cylinder extrudes along. Defaults to +Z (a column).
   *
   * It exists because the two things a cylinder is FOR in a building point in different directions: a
   * column stands up, and a duct penetration goes horizontally through a wall. Without this the
   * kernel could model one and not the other.
   */
  readonly axis?: Vec3;
}

/**
 * A 2D point in a profile's own plane, in millimetres.
 */
export type Vec2 = readonly [number, number];

/**
 * One authored segment of a profile boundary.
 *
 * ⚠ An arc is specified by a point it PASSES THROUGH (`via`), not by centre+radius+sweep. Three points
 * define exactly one arc: there is no handedness flag to get backwards, and no way to ask for a radius
 * too small to span the chord. The alternative parameterisation has two failure modes that a sketching
 * UI would have to defend against, and this one has none.
 */
export type ProfileSegment =
  | { readonly kind: 'line'; readonly to: Vec2 }
  | { readonly kind: 'arc'; readonly via: Vec2; readonly to: Vec2 };

/**
 * A closed, planar boundary — the thing a Slab, a Column and a GenericSolid are actually made of.
 *
 * ⚠ **THE SEGMENT INDEX IS A NAMING CONTRACT, not an implementation detail.** The face swept from
 * segment `k` is named `lateral.k` — and `k` is the index in the array *the author drew*. So dragging
 * a slab's corner moves the boundary without renumbering a single face, and an opening hosted on
 * `lateral.2` is still on `lateral.2` afterwards. **Reordering this array re-targets every reference
 * into the shape**, exactly as renaming a wall would. Editing a vertex is safe; permuting the list is
 * not, and a document-level command must never do it silently.
 *
 * The loop must be CLOSED (the last segment ends where `start` began) and NON-SELF-INTERSECTING — the
 * kernel validates both and refuses otherwise (spec §5.2), because a figure-eight boundary is closed
 * and planar and still nonsense.
 */
export interface Profile {
  /** The sketch plane. `xAxis` fixes the 2D frame; it is orthogonalised against `normal`. */
  readonly plane: {
    readonly origin: Vec3;
    readonly normal: Vec3;
    readonly xAxis: Vec3;
  };
  readonly start: Vec2;
  /** In order. The last segment's `to` must equal `start`. */
  readonly segments: readonly ProfileSegment[];
}

/**
 * EXTRUDE — sweep a profile into a solid.
 *
 * ⚠ THIS IS THE OP THREE OF THE FIVE MVP TYPES NEED, and it was missing. `makeBox` cannot express a
 * **Slab** (spec §5: "planar boundary + thickness" — and a real floor plate is L-shaped, or five-sided,
 * or has a curved edge), cannot express a **Column** of arbitrary profile, and cannot express
 * **GenericSolid** ("free sketch + extrude/revolve") at all. Found by modelling a building with the
 * protocol and discovering the floor plate was unbuildable — not by reading this file (Entry 12).
 *
 * Naming: `cap-start` / `cap-end` / `lateral.k`, all assigned by the operation from its own accessors.
 */
export interface ExtrudePayload {
  /** The DAG node that will OWN the resulting sub-shape identities. */
  readonly nodeId: string;
  readonly profile: Profile;
  /** Millimetres, along `direction`. Must be non-zero; may be negative to sweep the other way. */
  readonly height: number;
  /**
   * The sweep direction. Defaults to the profile plane's normal (the ordinary case: a slab boundary
   * drawn flat and thickened upward). A non-normal direction gives a slanted prism.
   */
  readonly direction?: Vec3;
}

/**
 * REVOLVE — spin a profile around an axis. The other half of GenericSolid, and the last op P2 step 1
 * named that had never been built.
 *
 * ⚠ WHY IT IS NOT OPTIONAL. **GenericSolid** (spec §5) is *"free sketch + extrude/**revolve**"*, and it
 * is also the import target for **every unmapped IFC entity** (D16). Without this op the escape hatch
 * has no floor. A dome, a column with a moulded base, a baluster, a vault, a tank — none is expressible
 * by extrusion, and every one of them is a revolve of a drawn section.
 *
 * NAMING — `lateral.k` after the AUTHORED segment, exactly as `extrude` does (D26), so dragging a
 * profile vertex re-targets nothing. `cap-start`/`cap-end` exist **only for a partial revolve.**
 *
 * ⚠⚠ THREE MEASURED FACTS ABOUT A FULL 360° REVOLVE — none of them guessable, all of them from the
 * probe (`tools/kernel-build/probe.cpp`, Entry 14). Do not "simplify" the kernel against them:
 *
 *   1. **It has NO caps** — the solid closes on itself. OCCT's `FirstShape()`/`LastShape()` do not
 *      return null for it; they return a face that **is not in the result**. So the check is
 *      "is it in the result", never "is it null".
 *   2. **Each lateral face has a SEAM** (it closes on itself, so no face *pair* bounds the seam edge —
 *      the cylinder's problem, Entry 9). The seam edge **is the authored profile edge**, handed back by
 *      identity, so it is named `lateral.k.seam` for free.
 *   3. **A segment PERPENDICULAR to the axis generates NO history at all** — yet its face (an annulus,
 *      or a disc) is in the result. That is the flat bottom of every column and the base of every dome.
 *      The kernel names those faces from the circles swept by the segment's own endpoint vertices —
 *      pure topology. A segment lying **on** the axis generates no face because none exists, and the
 *      two cases are told apart structurally (an on-axis vertex sweeps no circle).
 */
export interface RevolvePayload {
  /** The DAG node that will OWN the resulting sub-shape identities. */
  readonly nodeId: string;
  readonly profile: Profile;
  /** The axis to spin around. It must not intersect the profile's interior. */
  readonly axis: {
    readonly origin: Vec3;
    readonly direction: Vec3;
  };
  /**
   * Degrees, in `(0, 360]`. **360 is the ordinary case** (a column, a dome) and is the one with no
   * caps and a seam per face — see the block above. Anything less is a partial revolve, which behaves
   * exactly like an extrusion: two caps, no seams.
   */
  readonly angle: number;
}

/** `cut` = A minus B; `fuse` = A plus B; `common` = the intersection of A and B. */
export type BooleanKind = 'cut' | 'fuse' | 'common';

export interface BooleanPayload {
  /** The DAG node that owns the identities this operation CREATES (the section edges, the splits). */
  readonly nodeId: string;
  readonly kind: BooleanKind;
  readonly a: ShapeHandle;
  readonly b: ShapeHandle;
}

export interface FilletPayload {
  readonly nodeId: string;
  readonly handle: ShapeHandle;
  /**
   * The edge to round, addressed BY ITS IDENTITY — a `SubShapeRef` token, not an index into some
   * traversal. That is the whole point of persistent naming: "round *that* edge" must still mean the
   * same edge after the wall is resized and the model rebuilt.
   */
  readonly edge: string;
  /** Millimetres. */
  readonly radius: number;
}

/**
 * CHAMFER — the fillet's flat sibling, and the other half of the spec's "fillet/chamfer" edge command
 * (§5.2). Identical contract: the edge is addressed **by its identity**, never by an index.
 */
export interface ChamferPayload {
  readonly nodeId: string;
  readonly handle: ShapeHandle;
  readonly edge: string;
  /** Millimetres — the setback from the edge, equal on both faces. */
  readonly distance: number;
}

/**
 * A rigid motion. Rotation, mirror and translation — and deliberately NOT scale.
 *
 * ⚠ Scale is absent on purpose, and it is not an oversight to be corrected later. A BIM element is
 * not resized by scaling its solid; it is resized by changing its PARAMETERS and re-running the
 * recipe (a 3 m wall becomes a 4 m wall because `dx` changed, not because the geometry was stretched).
 * A scale op would offer a second, non-parametric way to change a size, and the two would disagree
 * the moment anything was rebuilt. Non-uniform scale would also turn a column's circle into an
 * ellipse, which no `makeCylinder` recipe can reproduce.
 *
 * Angles are DEGREES. Authors think in degrees, and the values that actually occur in buildings —
 * 90, 45, 30 — are exact in degrees and irrational in radians.
 */
export type RigidMotion =
  | { readonly kind: 'translate'; readonly by: Vec3 }
  | {
      readonly kind: 'rotate';
      /** The axis direction. Need not be normalised; must not be zero-length. */
      readonly axis: Vec3;
      /** A point on the axis. Defaults to the origin. */
      readonly origin?: Vec3;
      readonly degrees: number;
    }
  | {
      readonly kind: 'mirror';
      /** The normal of the mirror PLANE. Need not be normalised; must not be zero-length. */
      readonly normal: Vec3;
      /** A point on the plane. Defaults to the origin. */
      readonly origin?: Vec3;
    };

/**
 * TRANSFORM — place a shape: rotate it, mirror it, move it.
 *
 * ⚠ THE ONE THING TO UNDERSTAND, AND IT IS THE WHOLE OP: **a transform creates no identities.**
 *
 * It is a topological isomorphism — every face maps to exactly one face — so every sub-shape of the
 * result IS the sub-shape it came from, merely somewhere else. Its refs are the operand's refs,
 * verbatim, in the same order. **A rotated wall is the same wall**, and the window hosted on its
 * `y-min` face is still hosted there afterwards. That is not a convenience; it is the reason the op
 * can exist at all. (MEASURED, not assumed: `tools/kernel-build/probe.cpp` cases 7-10 — rotate,
 * mirror, and a rotate of a wall that already has an opening cut through it, all report 100% of
 * output faces and edges through history, 1:1, with zero orphans.)
 *
 * ⚠ Consequently this is the ONLY shape-producing op with NO `nodeId`: there is nothing for a node to
 * own. If you find yourself wanting to pass one, what you actually want is a second element — see
 * below.
 *
 * ⚠ **A MIRRORED COPY IS A NEW ELEMENT, NOT A MIRRORED SHAPE.** To put a second, mirrored wall across
 * the corridor, the document layer creates a second element with its own `nodeId` and transforms
 * *that* — it does not mirror wall-1's solid and keep both. Fusing a shape with a transform of ITSELF
 * hands two different faces the same identity, and the kernel will refuse it loudly
 * (`UNRESOLVED_SUBSHAPE_REF`) rather than hand out a ref that names two things. That refusal is
 * correct: an element instance is in one place, and asking for it to be in two is the incoherent
 * request, not the failure.
 */
export interface TransformPayload {
  readonly handle: ShapeHandle;
  /** Applied IN ORDER: the first motion happens first. Must not be empty. */
  readonly motions: readonly RigidMotion[];
}

/**
 * THE GEOMETRIC QUERIES (decision D23).
 *
 * An agent must be able to ask **spatial** questions — "what are the tight bounds of this element?",
 * "what is within 2 m of this column?", "is this point inside that wall?" — and the answers are in the
 * B-Rep, so they are kernel ops. They had to land **before the protocol freezes at the end of P3**;
 * afterwards, adding one is a contract amendment.
 *
 * ⚠ Two rules these obey, and they are the reason the ops look the way they do:
 *   1. **They return semantics, never triangles.** A query answers in millimetres and identities.
 *   2. **They read the B-Rep, never the mesh.** A tessellated column is smaller than the real one by
 *      its chord error; an agent reasoning about clearances from the mesh would confidently
 *      under-report every clash in the project.
 *
 * ⚠ Document-level queries ("which walls are on level 2?") need NO kernel op — they read the
 * parametric recipe, which is the source of truth. Only geometry comes here.
 */
export interface BoundsPayload {
  readonly handle: ShapeHandle;
  /**
   * Optional: the tight bounds of ONE named sub-shape (a `SubShapeRef` token) rather than of the
   * whole shape — "where exactly is the south face of that wall?". Omitted ⇒ the whole shape.
   */
  readonly ref?: string;
}

export interface BoundsResult {
  readonly bounds: Bounds;
}

export interface DistancePayload {
  readonly a: ShapeHandle;
  readonly b: ShapeHandle;
}

export interface DistanceResult {
  /** mm. **Zero means the two shapes touch or overlap** — which makes this the clash primitive too. */
  readonly distance: number;
  /** The two points that realise the minimum — i.e. WHERE they are closest. */
  readonly pointA: readonly [number, number, number];
  readonly pointB: readonly [number, number, number];
}

export interface ClassifyPointPayload {
  readonly handle: ShapeHandle;
  readonly point: readonly [number, number, number];
  /** mm. Defaults to the kernel's own tolerance. */
  readonly tolerance?: number;
}

export interface ClassifyPointResult {
  readonly state: 'inside' | 'outside' | 'on';
}

export interface FaceFramePayload {
  readonly handle: ShapeHandle;
  /** The `SubShapeRef` token of the FACE to frame. Must resolve to a face, never an edge. */
  readonly ref: string;
}

/**
 * ⚠⚠ A FACE'S LOCAL FRAME — origin, outward normal, and two in-plane tangents — evaluated at the face's
 * parametric centre, **from the B-Rep surface, never from a bounding box** (found by modelling, Entry
 * 30, 2026-07-16; `tests/gap-void-curved-face.test.ts`).
 *
 * It exists because a hosted void needs to know **which way is into the host, and how the face is
 * oriented in space** — and for a CURVED face a bounding box cannot say either. A cylinder's single
 * wrap-around `lateral` face has a bbox equal to the whole solid's, so the bbox-only `inward` heuristic
 * degenerates: a "duct through a round column" was silently cut as a square pocket *down the column's
 * own axis*. The kernel evaluates the actual surface (`BRepAdaptor_Surface`), so the frame is exact for
 * a planar face and correct at the sampled point for a curved one — which is what a straight duct needs.
 *
 * ⚠ `normal` is the OUTWARD normal (it respects the face's `TopAbs_REVERSED` orientation), so
 * `inward = -normal`. `uAxis`/`vAxis` are unit tangents spanning the face at `origin`; `normal`,
 * `uAxis`, `vAxis` form a right-handed orthonormal frame. This is the general datum P6 section views and
 * P4.5 snapping will also want — it is a surface primitive, not an opening-specific one.
 */
export interface FaceFrameResult {
  /** A point ON the face surface, at its parametric centre (mm). */
  readonly origin: readonly [number, number, number];
  /** Unit OUTWARD normal at `origin` (orientation-corrected). `inward` is its negation. */
  readonly normal: readonly [number, number, number];
  /** Unit in-plane tangent at `origin`. */
  readonly uAxis: readonly [number, number, number];
  /** Unit in-plane tangent at `origin`, orthogonal to `uAxis`. */
  readonly vAxis: readonly [number, number, number];
}

export interface ReleaseShapePayload {
  readonly handle: ShapeHandle;
}

export interface ReleaseShapeResult {
  readonly released: boolean;
  /** Live handles remaining — the heap telemetry that drives the soft budget (spec §6.2). */
  readonly liveHandles: number;
}

/** Forces a marshalled failure. Exists to prove the typed-failure path in CI (P1 step 4). */
export interface DemoFailurePayload {
  readonly code: KernelFailureCode;
  readonly message?: string;
}

/* ================================================================================================
 * `instantiate` — RESERVED (owner ruling, 2026-07-14). The answer to the STYLE-EDIT PERFORMANCE CLIFF.
 * ============================================================================================= */

/**
 * ⚠⚠ **RE-OWN AN EXISTING SOLID UNDER A NEW `nodeId`** — and it exists to collapse the single largest
 * performance problem the product has.
 *
 * **THE MEASUREMENT (Entry 18, `document-scale.test.ts`):** a style edit across 50 walls costs 2,677 ms
 * — **~21 seconds extrapolated to Revit's "change one wall type, update 400 walls"**, which is **D31's
 * headline feature**. 100% of that time is inside OCCT (our plumbing is 0.2%), and **no disk cache can
 * help it**: it is the interactive path, not the load path.
 *
 * **THE OBSERVATION:** 400 walls sharing a style *and* their instance params have **byte-identical
 * local geometry.** They differ only in `placement` — and the rebuild engine already **builds every
 * element in its own frame and places it last** (D25: `transform` mints no identities). So the base
 * solid could be built **once** and re-used by all 400.
 *
 * **THE BLOCKER, AND THE ONLY REASON THIS NEEDS AN OP AT ALL:** two elements sharing one solid would
 * share its `SubShapeRef`s — so a window hosted on `wall-A`'s `y-min` face would be hosted on
 * `wall-B`'s too. **Catastrophic, and silently so.** `instantiate` is the fix: it says *"this shape,
 * under a NEW node"*, minting a **fresh, independent set of identities** for a topologically identical
 * solid. In OCCT a `TopoDS_Shape` copy is cheap — it shares the underlying `TShape` — so the re-own is
 * close to free.
 *
 *     TODAY:            400 × (build + boolean)                    ~21 s
 *     WITH instantiate:   1 × (build + boolean) + 400 × re-own     ~1 boolean + noise
 *
 * ⚠ **RESERVED, NOT BUILT** (D13) — the shape is frozen with the protocol; the body is v1.0.x's, and it
 * is **unmeasured: a hypothesis, not a plan.** It is declared *now* because **the expensive thing to get
 * wrong is the payload shape, not the body**, and the protocol freezes at the end of P3. Adding an op
 * after the freeze is permitted (D13) — but agreeing the *shape* while the protocol is still soft is
 * exactly the argument that reserved `sectionCut` and `importIfc`.
 *
 * ⚠ **AND THE INVARIANT IT MUST NOT BREAK:** the caller is asserting *"this solid is the geometry of a
 * DIFFERENT element."* The kernel therefore re-derives the identities **from the new `nodeId`** — it
 * does **not** copy the source's tokens and rewrite their prefix. Identity is *assigned by the
 * operation that mints it*, never transplanted (D1).
 */
export interface InstantiatePayload {
  /** The solid to re-own. It is **not** consumed: the source stays live and keeps its own identities. */
  readonly handle: ShapeHandle;
  /** The DAG node the new copy's identities belong to — `wall-01J8Z3K7Q2.structure`. */
  readonly nodeId: string;
}

/* ================================================================================================
 * `exportBrep` / `importBrep` — RESERVED. **THE GEOMETRY CACHE (D29 — owner ruling, 2026-07-14: SHIP).**
 * ============================================================================================= */

/**
 * ⚠⚠ **THE CACHE, AND THE ONE THING IT MUST NOT DO: MIS-NAME A FACE.**
 *
 * **The ruling (2026-07-14):** `geometry-cache.brep` **SHIPS in v1.0.0.** A 195-element building
 * cold-loads in **7.3 s** with no cache, and it scales linearly — a 2,000-element project would be
 * ~75 s, which is past what a splash screen can hide.
 *
 * ⚠⚠ **BUT A `.brep` STORES SHAPES AND NOT THEIR NAMES, AND THAT IS THE WHOLE DIFFICULTY.** Every
 * `SubShapeRef` in Bunyan is **derived by re-running the recipe** — identity is *assigned by the
 * operation that mints it* (D1). Load a solid from a cache and **the recipe never runs**, so no
 * identities are minted, and the window hosted on `wall-7.plaster/face/y-min#0` has **nothing to attach
 * to.** ⇒ the cache must carry the tokens too — which is a **persisted name→shape index**, i.e. exactly
 * the "identity token map" that D1 forbids (*"never a geometric index"*) and that the spec deleted from
 * §4.5 one session ago.
 *
 * **⇒ THE RULED DESIGN, AND IT KEEPS D1 INTACT:**
 *
 *   1. **Bind by CANONICAL ORDER, never by raw OCCT index.** The tokens are stored in the order of the
 *      **same deterministic canonical re-sort the resolver already applies before assigning identities**
 *      (D8). So a token is re-attached by a rule *derived from the shape itself* — not by trusting a
 *      position in a file.
 *
 *      ⚠⚠ **CORRECTED WHEN THE BODY WAS WRITTEN (2026-07-30) — THE RESOLVER'S SORT IS NOT AVAILABLE ON
 *      THE IMPORT SIDE, AND CANNOT BE.** D8's re-sort (`rowLess`) orders **derivations** — relation,
 *      role, ancestors — and a shape loaded from a cache **has no derivations, because the recipe never
 *      ran.** So "the same sort the resolver uses" describes something the reader cannot compute. The
 *      implementable form of this step, which is what ships: bind by **the read shape's own sub-shape
 *      order** (`TopExp::MapShapes` — MEASURED to survive a `BRepTools` round trip on every shape class
 *      we build) **and pin that order with the fingerprint of step 2**, which digests each sub-shape's
 *      quantised geometry *in sequence* — so a permuted file digests differently and is refused. That is
 *      strictly stronger than re-deriving the order by SORTING on the same geometry, because a sort
 *      re-normalises a permutation and could then only see that the geometry changed, never that the
 *      tokens landed on the wrong sub-shapes. The rule is still derived from the shape, and the position
 *      in the file is still not trusted — it is *verified*. See `kernel-occt/src/cache.ts`.
 *   2. **VERIFY, THEN TRUST.** `exportBrep` also returns a `fingerprint`: a digest over each named
 *      sub-shape's measured geometry (area / centroid, mm-rounded — the D28 basis). `importBrep`
 *      recomputes it and **refuses with `CACHE_STALE` on any disagreement.**
 *   3. **A REFUSAL IS FREE.** The recipe is the source of truth and can always rebuild. So a stale, a
 *      re-ordered, a corrupted or a **hostile** cache costs a rebuild — never a wrong name. **The cache
 *      is a bet the document is always free to abandon**, and that is what makes shipping it safe.
 *
 * ⚠ **THE SECURITY NOTE IS NOT DECORATION.** A `.bnn` is a file a user can be **SENT**, and this is the
 * one part of it fed as **binary** to OCCT's deserializer. `importBrep` must treat its bytes as
 * hostile — bounded, validated, and refused with a typed failure rather than a crash. (This was one of
 * the standing arguments *against* the cache; shipping it means paying that cost deliberately.)
 *
 * ⚠ **RESERVED, NOT BUILT.** The shapes freeze with the protocol at the end of P3; the bodies are the
 * next Zayd work item. **Nothing may assume the cache exists** — the no-cache load path is the primary
 * one, must remain supported forever, and is the only path **Miqdar** will ever have (it holds a solver,
 * not an OCCT kernel, so it *cannot* produce a cache even in principle).
 */
export interface ExportBrepPayload {
  readonly handle: ShapeHandle;
}

export interface ExportBrepResult {
  /** `BRepTools::Write` output. ⚠ The only binary in a `.bnn`, and the only untrusted input to OCCT. */
  readonly brep: Uint8Array;
  /**
   * Every identity this solid carries, **in canonical order** — the order `importBrep` will re-attach
   * them in. ⚠ It is not a lookup table: it is the *output* of the same sort the resolver uses.
   */
  readonly refs: readonly string[];
  /**
   * A digest over each named sub-shape's measured geometry, in the same canonical order. ⚠ **This is
   * what makes a mis-attached token impossible rather than merely unlikely** — `importBrep` recomputes
   * it from the shape it actually read, and refuses if it disagrees.
   *
   * ⚠⚠ **AND IT COVERS `refs` TOO — WIDENED 2026-07-30 WHEN THE BODY WAS WRITTEN, BECAUSE OVER THE
   * GEOMETRY ALONE IT DOES NOT DO WHAT THE SENTENCE ABOVE CLAIMS.** Recomputed from the shape only, it
   * authenticates the SHAPE and says nothing about the BINDING: swap two face tokens in `refs` and the
   * digest still matches (the shape is untouched), the count matches, the kinds match, nothing is
   * duplicated — and a solid comes back with two identities on the wrong faces, which is the exact
   * outcome this op exists to prevent. `refs` arrives from the same untrusted `.bnn` as the bytes, so
   * the metadata half needs the same guard as the binary half. The digest is therefore over the
   * quantised geometry sequence **and** the token sequence. (Opaque either way — a caller only ever
   * compares it to what `exportBrep` produced.)
   */
  readonly fingerprint: string;
}

export interface ImportBrepPayload {
  /**
   * The DAG node this SOLID belongs to — the part's own node (`wall-7.plaster`), carried so a later op
   * that names something new against this shape attributes it to the node that owns the geometry.
   *
   * ⚠⚠ **CORRECTED 2026-07-30, WHEN THE BODY WAS WRITTEN. It used to read "the refs below must already
   * be derived from it", and that is FALSE about real geometry — MEASURED on the shipped types:** a
   * `core.wall` cut by a door carries **34 identities of which 18 are the wall's own and 16 belong to two
   * other nodes**; the door's `frame` part carries **34 of which only 8 are its own.** That is not a
   * defect — it is `REL_INHERIT` and the cut nodes working exactly as D1 intends (a reveal face belongs
   * to the CUT, not to the wall) — but a body that had *validated* the old sentence would have refused to
   * load two of every three real parts. **Nothing here checks the refs against this node**, and nothing
   * should.
   */
  readonly nodeId: string;
  /** ⚠ UNTRUSTED BYTES. Validate; never assume a well-formed BREP. */
  readonly brep: Uint8Array;
  /** The tokens to re-attach, in canonical order, exactly as `exportBrep` emitted them. */
  readonly refs: readonly string[];
  /** ⚠ Recomputed and compared. A mismatch is `CACHE_STALE` — a refusal, never a shape. */
  readonly fingerprint: string;
}

/* ================================================================================================
 * RESERVED OPS (D13, owner-ruled 2026-07-13) — DECLARED HERE, IMPLEMENTED IN P6.
 *
 * ⚠⚠ WHY THESE EXIST BEFORE THEIR BODIES DO, AND WHY IT IS NOT PREMATURE.
 *
 * The message protocol FREEZES at the end of P3. P6 needs a `sectionCut` op (the 2D plan and
 * elevation — a headline v1.0.0 deliverable, and the *proof* that the kernel is the source of truth
 * rather than a 3D toy) and IFC-import ops (D16 — IfcOpenShell exposed as new C++ ops, by
 * construction). **Neither existed, and neither was scheduled before the freeze** — so P6 would have
 * opened by amending a frozen contract, which makes the freeze theatre. Unnoticed for 12 entries;
 * found by Entry 13's audit.
 *
 * The owner ruled BOTH halves (2026-07-13): D13 is re-worded so that *adding* an op is additive and
 * permitted while *changing an existing op's envelope* needs sign-off — **and the shapes below are
 * reserved now anyway**, because the expensive thing to get wrong is the PAYLOAD SHAPE, not the body.
 *
 * ⚠ THEY ARE DELIBERATELY UNIMPLEMENTED. No kernel registers a handler, so neither appears in
 * `capabilities` (which is derived from the handler map — D28-era rule) and both answer `UNKNOWN_OP`.
 * That is the contract: **the shape is frozen; the behaviour is P6's.** A test pins it.
 * ================================================================================================ */

/**
 * SECTION CUT — the 2D plan, section and elevation (P6 step 1).
 *
 * ⚠ THE INVARIANT THIS OP EXISTS TO PROVE: a drawing is a **projection of the B-Rep**, never a
 * separately-drawn artefact that can disagree with the model. Cut the same solids with a plane and you
 * get the plan; that is the whole claim of the product, and this is the op that makes it true.
 *
 * ⚠ AND THE REASON IT RETURNS `ref` ON EVERY CURVE: a plan must be **annotatable and clickable**. A
 * dimension anchored to a wall's face in plan is anchored to *that face's `SubShapeRef`*, so it
 * survives the wall being edited — exactly as a 3D reference does. A section that returned anonymous
 * polylines would be a picture, and pictures go stale. (Hidden-line removal is available to us:
 * **TKHLR** is one of the 18 toolkits in our OCCT build, and it was chosen for this.)
 */
export interface SectionCutPayload {
  /** Every solid to cut — typically a level's worth of elements. */
  readonly handles: readonly ShapeHandle[];
  /** The cutting plane. `xAxis` fixes the 2D frame the result's coordinates are expressed in. */
  readonly plane: {
    readonly origin: Vec3;
    readonly normal: Vec3;
    readonly xAxis: Vec3;
  };
  /**
   * `cut` returns only the slice (what the plane passes through). `cut+projection` also returns the
   * visible edges BEYOND the plane — which is what makes it a plan rather than a set of outlines.
   */
  readonly mode?: 'cut' | 'cut+projection';
  /** How far beyond the plane to look, in mm. Unbounded when omitted. */
  readonly depth?: number;
}

export interface SectionCurve {
  /**
   * The sub-shape this curve came from — the provenance that makes the drawing parametric.
   *
   * ⚠⚠ THIS COMMENT USED TO SAY *"absent only where a curve has no single owner (a silhouette of a
   * curved surface has no edge behind it)"*, AND THAT WAS FALSE ABOUT HALF THE OP. Measured in Entry
   * 69 (`P5_step6C_plan_section_design.md` §1.2/§6.1): a **projected** curve can carry no `ref` AT
   * ALL, ever — HLR emits new geometry that shares **0 of 4** `IsSame()` with its input, and its
   * finest granularity is the whole solid, not a face. The silhouette case is real but it is the
   * rare one; the common one is that projection cannot attribute, full stop.
   *
   * ⇒ **`kind:'cut'` ALWAYS carries a `ref`** — OCCT's own `Generated()` history attributes every cut
   * edge to exactly one owner face (measured 4/4, 1/1, 8/8, zero orphans). **`kind:'projected'` never
   * does**; it carries `nodeId` instead, below. v1.0.0 emits only `cut` (D81/Q1), so in practice
   * every curve a shipped Bunyan draws has one.
   */
  readonly ref?: SubShapeRef;
  /**
   * ⚠ RESERVED (D81/Q2, 2026-08-03) — the DAG node (the part) a PROJECTED curve came from, which is
   * precisely the granularity §1.2 measured: no more, and honestly no less.
   *
   * Nothing writes it in v1.0.0, because Q1 ships `mode:'cut'` only. It exists now because the field
   * must precede the freeze or the P6 projection body amends a frozen contract. `nodeId` is already
   * the opaque first component of every `SubShapeRef`, so this introduces no new vocabulary — and
   * that is the argument for it over widening `SubShapeKind` with `'solid'`, which would have widened
   * the identity vocabulary three products bind to and that `scene.json` is written in.
   *
   * ⚠ A consumer must not read this as sub-shape identity. It names a solid; it cannot name a face.
   */
  readonly nodeId?: string;
  /** `cut` = the plane passes through solid material here. `projected` = visible beyond the plane. */
  readonly kind: 'cut' | 'projected';
  /** A polyline IN THE PLANE'S 2D FRAME, flat [x0,y0, x1,y1, …] in millimetres. */
  readonly points: readonly number[];
  /**
   * Whether THIS polyline closes on itself — reported from `BRep_Tool::IsClosed`, never assumed.
   *
   * ⚠⚠ THIS COMMENT USED TO READ *"a cut curve bounds material and is closed"*, AND THAT WAS FALSE.
   * Measured through the whole stack on a plain wall: **4 cut curves, `closed=false` on all 4.**
   * `BRepAlgoAPI_Section` returns individual **EDGES**, so the loop that bounds the material is the
   * UNION of them — the granularity here is the edge, not the loop. A consumer that hatched every
   * `kind:'cut'` curve as a closed region would hatch nothing.
   *
   * ⚠ Correcting it is NOT a contract touch and did not need a ruling: `scripts/frozen-surface.mjs`
   * strips comments before hashing, and says so in its own header for exactly this case. Entry 77
   * measured the falsehood and deferred it believing otherwise; Entry 78's review re-measured it,
   * corrected it here, and pinned it in `tests/plan-section.test.ts` §10 so it cannot rot back.
   */
  readonly closed: boolean;
}

export interface SectionCutResult {
  readonly curves: readonly SectionCurve[];
}

/**
 * IFC IMPORT — exact solids, via IfcOpenShell (D16, P6 step 3).
 *
 * ⚠ `web-ifc` was REJECTED and this shape records why: it returns **meshes**, and a mesh cannot be
 * measured, sectioned or edited — which would break the B-Rep-is-truth invariant the moment an
 * imported wall needed a window. IfcOpenShell hands back **real B-Rep solids**, and it can do so only
 * because *we own the OCCT build* and can link a second C++ library against it (owner ruling 11).
 *
 * ⚠ The result is deliberately SEMANTIC, not geometric-only: an IFC import that threw away
 * `globalId`, the IFC type and the property sets would import a *shape* and lose the *building*.
 */
export interface ImportIfcPayload {
  /** The raw file. Transferred, not copied — an IFC model is routinely hundreds of MB. */
  readonly bytes: Uint8Array;
  /**
   * Import only these IFC types (`IfcWall`, `IfcSlab`, …). All when omitted. An unmapped type still
   * imports — as a `GenericSolid`, which is precisely why `revolve` had to exist before P6.
   */
  readonly types?: readonly string[];
}

export interface ImportedElement {
  /** The IFC `GlobalId` — the identity the source file gives it, and the key a re-import matches on. */
  readonly globalId: string;
  readonly ifcType: string;
  readonly name?: string;
  readonly handle: ShapeHandle;
  /** IFC property sets, flattened. Carried through because quantities and schedules depend on them. */
  readonly properties?: Readonly<Record<string, string | number | boolean>>;
}

export interface ImportIfcResult {
  readonly elements: readonly ImportedElement[];
  /** Entities the importer could not turn into a solid. Loud, never silent — spec §9's rule. */
  readonly skipped: readonly { readonly globalId: string; readonly reason: string }[];
}

/**
 * The single source of truth for op names and their payload/result types. Adding an op is adding
 * a line here — the dispatcher, the client and the mock all derive their types from this map.
 */
export interface OpMap {
  handshake: { payload: { readonly clientProtocolVersion: number }; result: HandshakeResult };
  kernelInfo: { payload: Record<string, never>; result: KernelInfo };
  echo: { payload: EchoPayload; result: EchoPayload };
  makeBox: { payload: MakeBoxPayload; result: ShapeResult };
  makeCylinder: { payload: MakeCylinderPayload; result: ShapeResult };
  extrude: { payload: ExtrudePayload; result: ShapeResult };
  revolve: { payload: RevolvePayload; result: ShapeResult };
  boolean: { payload: BooleanPayload; result: ShapeResult };
  fillet: { payload: FilletPayload; result: ShapeResult };
  chamfer: { payload: ChamferPayload; result: ShapeResult };
  transform: { payload: TransformPayload; result: ShapeResult };
  measure: { payload: MeasurePayload; result: MeasureResult };
  bounds: { payload: BoundsPayload; result: BoundsResult };
  distance: { payload: DistancePayload; result: DistanceResult };
  classifyPoint: { payload: ClassifyPointPayload; result: ClassifyPointResult };
  faceFrame: { payload: FaceFramePayload; result: FaceFrameResult };
  tessellate: { payload: TessellatePayload; result: MeshBuffers };
  releaseShape: { payload: ReleaseShapePayload; result: ReleaseShapeResult };
  demoFailure: { payload: DemoFailurePayload; result: never };

  // RESERVED (D13) — the shape is frozen now; the body is P6's. No kernel implements these, so they
  // are absent from `capabilities` and answer UNKNOWN_OP. See the block above `SectionCutPayload`.
  sectionCut: { payload: SectionCutPayload; result: SectionCutResult };
  importIfc: { payload: ImportIfcPayload; result: ImportIfcResult };
  /**
   * ⚠ RESERVED (owner ruling 2026-07-14) — the answer to the style-edit performance cliff (§4j).
   * Returns an ordinary `ShapeResult`: a new handle, and a FRESH set of refs derived from `nodeId`.
   */
  instantiate: { payload: InstantiatePayload; result: ShapeResult };
  /**
   * ⚠ RESERVED (D29, owner ruling 2026-07-14: the geometry cache SHIPS). `importBrep` returns an
   * ordinary `ShapeResult` — but only after VERIFYING the fingerprint. A mismatch is `CACHE_STALE`.
   */
  exportBrep: { payload: ExportBrepPayload; result: ExportBrepResult };
  importBrep: { payload: ImportBrepPayload; result: ShapeResult };
}

export type OpName = keyof OpMap;
export type OpPayload<Op extends OpName> = OpMap[Op]['payload'];
export type OpResult<Op extends OpName> = OpMap[Op]['result'];

export const OP_NAMES = [
  'handshake',
  'kernelInfo',
  'echo',
  'makeBox',
  'makeCylinder',
  'extrude',
  'revolve',
  'boolean',
  'fillet',
  'chamfer',
  'transform',
  'measure',
  'bounds',
  'distance',
  'classifyPoint',
  'faceFrame',
  'tessellate',
  'releaseShape',
  'demoFailure',
  'sectionCut',
  'importIfc',
  'instantiate',
  'exportBrep',
  'importBrep',
] as const satisfies readonly OpName[];

/**
 * RESERVED OPS (D13) — declared in the protocol, deliberately NOT implemented until P6.
 *
 * Their **payload shape is frozen** with the rest of the protocol at the end of P3; their behaviour is
 * P6's. No kernel registers a handler for them, so they never appear in `capabilities` and they answer
 * `UNKNOWN_OP` — which is the honest reply, and the same one the mock gives for a boolean it cannot
 * fake. ⚠ **Reserved is not the same as missing:** a missing op means P6 must amend a frozen contract;
 * a reserved one means P6 writes a body against a shape that was agreed while the protocol was soft.
 *
 * ⚠⚠ **`exportBrep` / `importBrep` LEFT THIS LIST ON 2026-07-30 — THE D29 CACHE BODIES ARE BUILT** (the
 * real kernel implements both; `capabilities` picked them up with no other edit, which is the whole
 * design of deriving the advertisement from the handler map). **The MOCK still does not implement them,
 * and that is correct rather than incomplete:** it holds no B-Rep, so it cannot serialise one, and a
 * mock that faked a cache would fake exactly the thing the cache exists to verify.
 *
 * ⚠⚠ **AND `sectionCut` LEFT IT ON 2026-08-03 (Entry 77, D81) — THE 2D CUT HAS A BODY.** The reservation
 * did its job exactly as designed: the payload shape was agreed in Entry 15 while the protocol was soft,
 * and the body was written three phases later against that unchanged shape, with `capabilities` picking
 * it up from the handler map and no other edit. ⚠ The MOCK does not implement it, for the `exportBrep`
 * reason one artifact along: it holds no B-Rep, so it has nothing to cut, and a mock that returned
 * plausible curves would fake precisely the invariant the op exists to prove (that a drawing IS the
 * B-Rep). ⚠ `mode:'cut+projection'` is still unimplemented — D81/Q1 ruled cut-only for v1.0.0 — and it
 * needs no reservation of its own, because the frozen payload already carries the mode.
 */
export const RESERVED_OPS = ['importIfc', 'instantiate'] as const satisfies readonly OpName[];

export function isOpName(value: string): value is OpName {
  return (OP_NAMES as readonly string[]).includes(value);
}

/**
 * The ops that are PLUMBING, not geometry: every kernel has them, so advertising them says nothing.
 * `capabilities` exists to answer "can this kernel do booleans?", and a caller learns nothing from
 * being told it can `echo`.
 */
export const INFRASTRUCTURE_OPS = [
  'handshake',
  'kernelInfo',
  'echo',
  'releaseShape',
  'demoFailure',
] as const satisfies readonly OpName[];

/**
 * A kernel's `capabilities`, DERIVED from the handlers it actually implements — never hand-written.
 *
 * ⚠ THIS EXISTS BECAUSE THE HAND-WRITTEN LIST DRIFTED, AND NOTHING NOTICED FOR TWO SESSIONS.
 * `transform` was implemented in Entry 11 and left out of the OCCT kernel's `capabilities` until Entry
 * 12 tripped over it by accident. The list and the handler map were two statements of the same fact,
 * and one of them was stale — which is the exact failure mode D21 forbids for the agent's tool list
 * ("generated, never maintained"). The same rule now binds the kernel's own self-description.
 *
 * ⚠ AND IT CLOSES A SECOND HOLE. `OpHandlers` is `Partial`, so an op declared in `OpMap` with NO
 * HANDLER is not a compile error — it silently becomes `UNKNOWN_OP` at runtime. That optionality is
 * correct (it is how the mock honestly refuses a boolean it cannot fake), but it means nothing checks
 * a kernel for completeness. Deriving the advertisement from the implementation means a missing handler
 * can no longer be *misadvertised*: the kernel simply stops claiming it.
 *
 * Ordered by `OP_NAMES`, so the list is canonical rather than insertion-ordered.
 */
export function capabilitiesOf(handlers: Readonly<Record<string, unknown>>): readonly string[] {
  const infrastructure = new Set<string>(INFRASTRUCTURE_OPS);
  return OP_NAMES.filter((op) => handlers[op] !== undefined && !infrastructure.has(op));
}
