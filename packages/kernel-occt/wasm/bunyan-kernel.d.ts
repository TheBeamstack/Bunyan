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
  /** kind: 0 = cut (A minus B), 1 = fuse, 2 = common. */
  booleanOp(a: number, b: number, kind: number): number;
  /** The edge is addressed by its CANONICAL INDEX — i.e. by its identity, not by its position. */
  fillet(shapeId: number, edgeIndex: number, radius: number): number;

  getNaming(shapeId: number): OcctNaming;
  getBounds(shapeId: number): OcctBounds;
  /** kind: -1 = the whole shape, 0 = a face, 1 = an edge (by canonical index). */
  subShapeBounds(shapeId: number, kind: number, index: number): OcctBounds;
  distanceBetween(a: number, b: number): OcctProximity;
  /** 0 = outside, 1 = inside, 2 = on the boundary, -1 = failed. */
  classifyPoint(shapeId: number, x: number, y: number, z: number, tolerance: number): number;
  measure(shapeId: number): OcctMeasure;
  tessellate(shapeId: number, deflection: number): OcctMeshViews;
  releaseShape(shapeId: number): boolean;
  /** Live shapes on the WASM heap. The leak canary (spec §6.2). */
  liveHandles(): number;
  lastError(): string;
}

declare function initBunyanKernel(moduleArg?: Record<string, unknown>): Promise<OcctModule>;
export default initBunyanKernel;
