/**
 * Types for the Emscripten module produced by `tools/kernel-build`.
 *
 * Hand-written, and deliberately SMALL: this is the entire JS↔WASM surface of the geometry kernel.
 * It does not grow when the product grows — new capability arrives as new C++ ops, not as more of
 * OCCT exposed to JavaScript. (Contrast `opencascade.js`, which binds ~9,000 OCCT objects.) If this
 * file ever starts looking like an OCCT API dump, something has gone wrong upstream of it.
 *
 * Regenerate nothing — keep it in step with `src/kernel.cpp`'s EMSCRIPTEN_BINDINGS block by hand.
 */

/** An embind `std::vector` handle. Reading costs one boundary crossing per element, and it MUST be `delete()`d. */
export interface OcctVectorString {
  size(): number;
  get(index: number): string | undefined;
  delete(): void;
}

/** An embind `std::vector<int>`. Same rules as `OcctVectorString`. */
export interface OcctVectorInt {
  size(): number;
  get(index: number): number | undefined;
  delete(): void;
}

/**
 * An embind `std::vector<double>`. Constructed on the JS side to pass a transform's motions IN, so
 * unlike the others it is written rather than read — and it is WASM heap, so it must be `delete()`d.
 */
export interface OcctVectorDouble {
  push_back(value: number): void;
  size(): number;
  get(index: number): number | undefined;
  delete(): void;
}

/** An embind `std::vector<NameRow>`. */
export interface OcctVectorNameRow {
  size(): number;
  get(index: number): OcctNameRow | undefined;
  delete(): void;
}

/**
 * ⚠ THE NAMING CONTRACT ACROSS THE BOUNDARY (decision D18).
 *
 * The C++ says what a sub-shape IS, structurally — which operand it came from and how. It never says
 * *whose* it is: no node ids, no ref tokens, no coordinates. `kernel.ts` turns this into identity.
 *
 * `relation` is one of:
 *   0 PRIMITIVE — the operation named it itself (`role` holds that name; e.g. `x-min`, `lateral`).
 *   1 INHERIT   — it IS an operand's sub-shape, still. It keeps that sub-shape's ref token, verbatim.
 *   2 DERIVE    — it has ancestors but is none of them (a split, a merge, a boolean's section edge, a
 *                 fillet's face). `src*` name the ancestors; `rank` is the occurrence among siblings.
 *   3 ADJACENT  — no history (a fillet rebuilds its neighbours). Named by the two faces that bound it:
 *                 `viaA`/`viaB` are canonical indices into the OUTPUT face list.
 */
export interface OcctNameRow {
  readonly relation: number;
  /** PRIMITIVE only. */
  readonly role: string;
  /** Occurrence among siblings sharing the same derivation. */
  readonly rank: number;
  /** The ancestors, as parallel arrays: an operand index, a kind (0 = face, 1 = edge), an index. */
  readonly srcOperand: OcctVectorInt;
  readonly srcKind: OcctVectorInt;
  readonly srcIndex: OcctVectorInt;
  /** ADJACENT only: canonical indices of the two bounding output faces. -1 otherwise. */
  readonly viaA: number;
  readonly viaB: number;
  delete?(): void;
}

export interface OcctNaming {
  /** Canonical order. Index = the face index carried by `triangleFace`. */
  readonly faces: OcctVectorNameRow;
  /** Canonical order. Index = the edge index carried by `edgeIndex`. */
  readonly edges: OcctVectorNameRow;
  /** The operand shape ids, in the order the operation received them. */
  readonly operands: OcctVectorInt;
  delete?(): void;
}

/** The minimum distance between two shapes, and the two points that realise it. */
export interface OcctProximity {
  /** -1 when the query failed. Zero means the shapes touch or overlap. */
  readonly distance: number;
  readonly ax: number;
  readonly ay: number;
  readonly az: number;
  readonly bx: number;
  readonly by: number;
  readonly bz: number;
}

export interface OcctBounds {
  readonly xMin: number;
  readonly yMin: number;
  readonly zMin: number;
  readonly xMax: number;
  readonly yMax: number;
  readonly zMax: number;
}

/** A face's local frame at its parametric centre (origin, outward normal, two in-plane tangents). */
export interface OcctFrame {
  readonly ox: number;
  readonly oy: number;
  readonly oz: number;
  readonly nx: number;
  readonly ny: number;
  readonly nz: number;
  readonly ux: number;
  readonly uy: number;
  readonly uz: number;
  readonly vx: number;
  readonly vy: number;
  readonly vz: number;
}

/** Exact properties from OCCT's `BRepGProp` — not derived from the mesh. */
export interface OcctMeasure {
  readonly volume: number;
  readonly area: number;
  readonly edgeLength: number;
  readonly solids: number;
  readonly faces: number;
  readonly edges: number;
  readonly vertices: number;
}

/**
 * ⚠ ZERO-COPY VIEWS ONTO THE WASM HEAP — NOT owned arrays.
 *
 * Every array here is a window onto the kernel's internal mesh buffers. They are invalidated by the
 * NEXT `tessellate` call, and by any WASM heap growth. Copy what you need out of them synchronously
 * (that is exactly what `kernel.ts` does) and never hold one across an `await`.
 */
export interface OcctMeshViews {
  /** False when the op failed; call `lastError()`. The views are empty in that case. */
  readonly ok: boolean;
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly indices: Int32Array;
  /** Per triangle: the canonical index of its owning face. */
  readonly triangleFace: Int32Array;
  readonly edgePositions: Float32Array;
  /** Per polyline: the canonical index of the edge it draws. */
  readonly edgeIndex: Int32Array;
  /** Per polyline: offset in VERTICES into `edgePositions`. */
  readonly edgeStart: Int32Array;
  /** Per polyline: number of vertices. */
  readonly edgeCount: Int32Array;
}

export interface OcctModule {
  /** The embind `std::vector<double>` constructor — the only one JS builds rather than drains. */
  VectorDouble: new () => OcctVectorDouble;

  /** Every op returns a shape id, or 0 on failure (then `lastError()` explains). None ever throws. */
  makeBox(x: number, y: number, z: number, dx: number, dy: number, dz: number): number;
  makeCylinder(
    x: number,
    y: number,
    z: number,
    ax: number,
    ay: number,
    az: number,
    radius: number,
    height: number,
  ): number;
  /**
   * Sweep an authored closed profile into a solid. The profile is a flat array:
   *   [0..2] plane origin  [3..5] plane normal  [6..8] plane x-axis  [9..10] start (u,v)
   *   then one segment per 5 doubles: [kind, viaU, viaV, toU, toV]   (0 = line, 1 = three-point arc)
   *
   * ⚠ Faces are named `cap-start` / `cap-end` / `lateral.k`, where k is the index of the segment THE
   * AUTHOR DREW — so editing the boundary never renumbers the faces hosted on it.
   */
  extrudeProfile(profile: OcctVectorDouble, dx: number, dy: number, dz: number): number;
  /**
   * Spin an authored closed profile around an axis. Same profile encoding as `extrudeProfile`; the
   * angle is in DEGREES, in (0, 360].
   *
   * ⚠ A FULL 360° REVOLVE IS NOT THE PARTIAL ONE WITH A BIGGER NUMBER, and the differences are
   * MEASURED (probe.cpp, Entry 14), not assumed: it has NO caps (and OCCT's cap accessors return a
   * face that is not in the result, rather than null); each lateral face carries a SEAM; and a segment
   * perpendicular to the axis generates NO history although its face exists. `revolveProfile` handles
   * all three — see the block comment in kernel.cpp before touching it.
   */
  revolveProfile(
    profile: OcctVectorDouble,
    ox: number,
    oy: number,
    oz: number,
    ax: number,
    ay: number,
    az: number,
    angleDeg: number,
  ): number;
  /** kind: 0 = cut (A minus B), 1 = fuse, 2 = common. */
  booleanOp(a: number, b: number, kind: number): number;
  /** The edge is addressed by its CANONICAL INDEX — i.e. by its identity, not by its position. */
  fillet(shapeId: number, edgeIndex: number, radius: number): number;
  /** The fillet's flat sibling. Same contract: the edge is addressed by identity. */
  chamfer(shapeId: number, edgeIndex: number, distance: number): number;
  /**
   * Rotate / mirror / translate. Motions are a flat array, 8 doubles each, applied IN ORDER:
   *   translate : [0, tx,ty,tz,  0, 0, 0,  0      ]
   *   rotate    : [1, ax,ay,az,  ox,oy,oz, degrees]
   *   mirror    : [2, nx,ny,nz,  ox,oy,oz, 0      ]   (normal of the mirror PLANE)
   * It creates no identities: the result's sub-shapes ARE the operand's, moved.
   */
  transformShape(shapeId: number, motions: OcctVectorDouble): number;

  getNaming(shapeId: number): OcctNaming;
  getBounds(shapeId: number): OcctBounds;
  /** kind: -1 = the whole shape, 0 = a face, 1 = an edge (by canonical index). */
  subShapeBounds(shapeId: number, kind: number, index: number): OcctBounds;
  /** The local frame of one named FACE (by canonical index) — origin, outward normal, tangents. */
  faceFrame(shapeId: number, index: number): OcctFrame;
  distanceBetween(a: number, b: number): OcctProximity;
  /** 0 = outside, 1 = inside, 2 = on the boundary, -1 = failed. */
  classifyPoint(shapeId: number, x: number, y: number, z: number, tolerance: number): number;
  /**
   * kind: -1 = the whole shape, 0 = a face, 1 = an edge (by canonical index) — the same addressing as
   * `subShapeBounds`. A sub-shape reports zero volume: a face encloses nothing.
   */
  measure(shapeId: number, kind: number, index: number): OcctMeasure;
  tessellate(shapeId: number, deflection: number): OcctMeshViews;

  /**
   * THE GEOMETRY CACHE (D29). ⚠ `shapeSignature` is called on BOTH sides of the round trip — that is
   * what makes the producer's rule and the consumer's rule ONE rule. See `src/cache.ts`.
   */
  /** `BRepTools::Write`, VERSION_1, WITHOUT triangulation (the mesh is disposable). "" ⇒ see lastError. */
  exportBrep(shapeId: number): string;
  /**
   * Every sub-shape's quantised geometry, in the SHAPE'S OWN sub-shape order — flat:
   *   [ nFaces, nEdges, then per sub-shape: canonicalIndex, quantisedMeasure, cx, cy, cz ]
   * `canonicalIndex` -1 ⇒ the sub-shape carries no name (refused upstream). Empty ⇒ see lastError.
   */
  shapeSignature(shapeId: number): OcctVectorDouble;
  /**
   * Read a cached shape. ⚠ UNTRUSTED TEXT — guard it first (`decodeBrepBytes`). Assigns NO identities:
   * the caller supplies the tokens and verifies the fingerprint before the handle escapes. 0 ⇒ refused.
   */
  importBrep(brep: string): number;
  releaseShape(shapeId: number): boolean;
  /** Live shapes on the WASM heap. The leak canary (spec §6.2). */
  liveHandles(): number;
  /**
   * dlmalloc bytes currently in use (`mallinfo.uordblks`) — the fine-grained heap-per-solid signal for
   * the scale gate (P4 step 9a). A double, so it stays exact past 2 GB. See `document-heap-scale.test.ts`.
   */
  heapUsedBytes(): number;
  lastError(): string;
}

declare function initBunyanKernel(moduleArg?: Record<string, unknown>): Promise<OcctModule>;
export default initBunyanKernel;
