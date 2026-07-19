/**
 * THE SKETCH-SOLVER SEAM (D50 §0d, `P5_step0d_design.md`) — the 2D constraint solver, injected the way
 * the kernel is (D19 precedent), so `@bunyan/document` never hard-depends on a solver implementation.
 *
 * ⚠⚠ WHY A SEAM, NOT A DIRECT IMPORT. Exactly the three reasons `GeometryGateway` exists:
 *   1. **Testability** — `MockSketchSolver` (a hand-canned solve) lets the document layer's non-solver
 *      logic run without booting a second WASM module, as `kernel-mock` does for OCCT.
 *   2. **Purity / boundary** — the real solver (`@salusoft89/planegcs`, FreeCAD's GCS in WASM) lives in
 *      `@bunyan/sketch-solver` and is handed to `DocumentContext` at bootstrap, beside the kernel. This
 *      package cannot import planegcs even by accident — it does not depend on it.
 *   3. **In-process, single-threaded (v1.0.0, D8)** — `solve` is synchronous; the solver module is
 *      already initialised. A worker is a v1.0.x option, additive, no contract cost.
 *
 * ⚠ THE ONE CORRECTNESS HAZARD IS D26 (the design's §5): the solver may move a point's coordinates; it
 * must NEVER permute the segment array, because segment `k` is named `lateral.k` in the extruded solid and
 * reordering re-targets every `SubShapeRef` into it. planegcs addresses every primitive by a STABLE id we
 * assign and returns coordinates by that id — it has no concept of our segment array and cannot reorder it.
 * `solveSketch` re-reads solved coordinates by id into the SAME segment array, and asserts membership.
 */

import type {
  Params,
  Sketch,
  SketchConstraint,
  SketchConstraintKind,
  SketchSegment,
} from './entities.js';

/* ================================================================================================
 * 1. Reading the sketch out of the element's params (Q1=A — the geometry lives in `params`).
 * ============================================================================================= */

/** The well-known key a sketch is stored under in an element's `params` (Q1=A). */
export const SKETCH_PARAM_KEY = 'sketch';

/**
 * Narrow the `sketch` param to a typed `Sketch`. The param schema proved it is an object; this reads the
 * two arrays out of it. Returns `undefined` when there is no sketch (an ordinary, non-sketch element).
 */
export function readSketch(params: Params): Sketch | undefined {
  const raw = params[SKETCH_PARAM_KEY];
  if (raw === undefined || raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return undefined;
  }
  const bag = raw as { points?: unknown; segments?: unknown };
  if (!Array.isArray(bag.points) || !Array.isArray(bag.segments)) return undefined;
  return raw as unknown as Sketch;
}

/* ================================================================================================
 * 2. The solver-neutral IR — what a `SketchSolver` receives. Deliberately decoupled from BOTH the
 *    params JSON shape (§1) and any solver's own primitive vocabulary, so an implementation swap
 *    touches only the adapter, never this contract.
 * ============================================================================================= */

/** A vertex the solver may move (unless `fixed`). `id` is the sketch-local stable point id. */
export interface SolvablePoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly fixed: boolean;
}

/**
 * A segment, keyed by a STABLE id the caller assigns (`seg-<index>`), between two point ids. Its `id` is
 * how a constraint names it and how the solver reports on it — NEVER its position in a list.
 */
export interface SolvableSegment {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly arc?: { readonly center: string; readonly clockwise: boolean };
}

/** A constraint, with operands already resolved to solver ids (point ids / segment ids). */
export interface SolvableConstraint {
  readonly id: string;
  readonly kind: SketchConstraintKind;
  /** Point ids this constraint references (coincident/distance). */
  readonly points: readonly string[];
  /** Segment ids this constraint references (horizontal/vertical/parallel/perpendicular/equal/tangent). */
  readonly segments: readonly string[];
  readonly value?: number;
  readonly driving: boolean;
}

export interface SolvableSketch {
  readonly points: readonly SolvablePoint[];
  readonly segments: readonly SolvableSegment[];
  readonly constraints: readonly SolvableConstraint[];
}

export interface SolvedPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/**
 * The solve outcome — DATA, never a throw (the D10 kernel discipline, applied to the solver):
 *   - `solved` — satisfiable; `solved` carries the coordinates (present for `under-constrained` too — a
 *     partially-constrained sketch is normal in CAD, and the solver picks the nearest solution).
 *   - `over-constrained` — a constraint conflicts; `conflicts` names them. The build refuses (D42).
 *   - `failed` — the numeric solve did not converge.
 */
export interface SketchSolveResult {
  readonly status: 'solved' | 'under-constrained' | 'over-constrained' | 'failed';
  /** Over-constrained: the ids of the conflicting constraints (our own ids). */
  readonly conflicts?: readonly string[];
  /** Remaining degrees of freedom — `> 0` ⇒ under-constrained (info, not an error). */
  readonly dof?: number;
  /** Present iff the sketch is satisfiable (`solved` or `under-constrained`). */
  readonly solved?: readonly SolvedPoint[];
  readonly message?: string;
}

/** The narrow, swappable seam — the sketch analogue of `GeometryGateway`. */
export interface SketchSolver {
  solve(sketch: SolvableSketch): SketchSolveResult;
}

/* ================================================================================================
 * 3. The mock — an identity solve. Returns every point where it already is, DOF unknown-but-zero. It
 *    keeps the document layer's non-solver logic (commands, the build wire, undo, .bnn) testable
 *    WITHOUT booting planegcs — exactly as `kernel-mock` does for OCCT.
 * ============================================================================================= */
export class MockSketchSolver implements SketchSolver {
  solve(sketch: SolvableSketch): SketchSolveResult {
    return {
      status: 'solved',
      dof: 0,
      solved: sketch.points.map((p) => ({ id: p.id, x: p.x, y: p.y })),
    };
  }
}

/* ================================================================================================
 * 4. The engine helper — resolve an element's sketch + its constraints into a solve, and hand the Type
 *    back solved coordinates. Called from `BuildContext.solveSketch`, so a Type stays a pure function of
 *    scalars (it passes its own sketch; the engine attaches the constraints from the scene — the same
 *    move 0b made with datums).
 * ============================================================================================= */

/** The stable solver id of the segment at authored index `i` — `seg-0`, `seg-1`, … (D26: index IS identity). */
export function segmentSolverId(index: number): string {
  return `seg-${String(index)}`;
}

/** What a Type gets back from `ctx.solveSketch`. Coordinates by point id; the segment array is UNCHANGED. */
export interface SolvedSketch {
  /** Solved (x, y) per point id. */
  readonly points: Readonly<Record<string, readonly [number, number]>>;
  /** ⚠ The AUTHORED segment array, byte-identical order (D26). A Type reads it to emit `lateral.k`. */
  readonly segments: readonly SketchSegment[];
  /** Remaining degrees of freedom, when the solver reported it. `> 0` ⇒ under-constrained (allowed). */
  readonly dof?: number;
}

/** Thrown when a sketch cannot be solved. At build time this becomes a `geometry` failure ⇒ D42 rejection. */
export class SketchSolveError extends Error {
  readonly conflicts: readonly string[];
  constructor(message: string, conflicts: readonly string[] = []) {
    super(message);
    this.name = 'SketchSolveError';
    this.conflicts = conflicts;
  }
}

/** Build the solver-neutral IR from a Sketch + its constraints. Segment ids are index-derived (D26). */
export function toSolvableSketch(
  sketch: Sketch,
  constraints: readonly SketchConstraint[],
): SolvableSketch {
  const points: SolvablePoint[] = sketch.points.map((p) => ({
    id: p.id,
    x: p.x,
    y: p.y,
    fixed: p.fixed ?? false,
  }));
  const segments: SolvableSegment[] = sketch.segments.map((s, i) => ({
    id: segmentSolverId(i),
    from: s.from,
    to: s.to,
    ...(s.arc === undefined
      ? {}
      : { arc: { center: s.arc.center, clockwise: s.arc.clockwise ?? false } }),
  }));
  const solvable: SolvableConstraint[] = constraints.map((c) => ({
    id: c.id,
    kind: c.kind,
    points: c.operands.points ?? [],
    segments: (c.operands.segments ?? []).map(segmentSolverId),
    ...(c.value === undefined ? {} : { value: c.value }),
    driving: c.driving ?? true,
  }));
  return { points, segments, constraints: solvable };
}

/**
 * Solve a Type's sketch against its constraints and return solved coordinates — the body behind
 * `ctx.solveSketch`. Throws `SketchSolveError` on an unsatisfiable sketch (over-constrained / failed),
 * which the rebuild turns into a `geometry` failure so the command is rejected and the document kept
 * at last-good (D42). Under-constrained is NOT an error (CAD-normal); it returns coordinates with `dof > 0`.
 *
 * ⚠⚠ THE D26 GUARD. After the solve, we assert the solver returned a coordinate for EXACTLY the input
 * point-id set (no drop, no addition), and we return the AUTHORED segment array untouched. A solver that
 * ever reshaped the geometry throws here rather than silently re-targeting `lateral.k`.
 */
export function solveSketch(
  solver: SketchSolver,
  sketch: Sketch,
  constraints: readonly SketchConstraint[],
): SolvedSketch {
  const solvable = toSolvableSketch(sketch, constraints);
  const result = solver.solve(solvable);

  if (result.status === 'over-constrained') {
    const named = (result.conflicts ?? []).join(', ');
    throw new SketchSolveError(
      `sketch is over-constrained — conflicting constraints: ${named || '(unnamed)'}`,
      result.conflicts ?? [],
    );
  }
  if (result.status === 'failed' || result.solved === undefined) {
    throw new SketchSolveError(result.message ?? 'sketch solve failed to converge');
  }

  const solvedById: Record<string, readonly [number, number]> = {};
  for (const p of result.solved) solvedById[p.id] = [p.x, p.y];

  // ⚠ D26 GUARD — the solved point-id set MUST equal the authored one, exactly. A dropped or invented id
  // means the solver reshaped the sketch, and `lateral.k` can no longer be trusted. Refuse, do not guess.
  const authored = new Set(sketch.points.map((p) => p.id));
  for (const p of sketch.points) {
    if (solvedById[p.id] === undefined) {
      throw new SketchSolveError(`solver did not return a coordinate for sketch point "${p.id}"`);
    }
  }
  for (const id of Object.keys(solvedById)) {
    if (!authored.has(id)) {
      throw new SketchSolveError(
        `solver returned an unknown point "${id}" — the sketch was reshaped`,
      );
    }
  }

  return {
    points: solvedById,
    segments: sketch.segments, // ⚠ the AUTHORED array, never the solver's — D26.
    ...(result.dof === undefined ? {} : { dof: result.dof }),
  };
}
