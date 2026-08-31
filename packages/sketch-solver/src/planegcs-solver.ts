// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `PlanegcsSolver` — the real `SketchSolver`, backed by `@salusoft89/planegcs` (FreeCAD's GCS in WASM).
 *
 * ⚠ IT MAPS OUR SOLVER-NEUTRAL IR (`SolvableSketch`) ↔ PLANEGCS PRIMITIVES BY STABLE ID, and that is the
 * whole reason the D26 no-permute invariant is nearly free (design §5): planegcs addresses every primitive
 * by an id we assign and returns coordinates by that id. It has no concept of our segment array and cannot
 * reorder it. We namespace ids inside the adapter (`pt:`/`ln:`/`c:`) so a user's point id can never collide
 * with a line or constraint id.
 *
 * ⚠ REPORTING IS DATA, NOT A THROW (D10 applied to the solver): a conflicting constraint set comes back as
 * `status: 'over-constrained'` with the conflicting ids named; remaining freedom as `dof > 0`
 * (`under-constrained` — allowed). `@bunyan/document`'s `solveSketch` is what turns an unsatisfiable result
 * into a build-time `geometry` failure (D42).
 *
 * ⚠ v1.0.0 SCOPE: straight-line profiles and the point/line constraint set
 * (coincident/distance/horizontal/vertical/parallel/perpendicular/equal). `tangent` and arc segments are in
 * the FROZEN contract (`SketchConstraintKind`, `SketchSegment.arc`) but not in this solver build — the solver
 * is swappable, so extending it is a v1.0.x change with no contract cost. An arc/tangent input yields a
 * typed `failed` result rather than wrong geometry.
 */

import type {
  SketchSolver,
  SolvableConstraint,
  SolvableSketch,
  SketchSolveResult,
  SolvedPoint,
} from '@bunyan/document';
import { make_gcs_wrapper, SolveStatus } from '@salusoft89/planegcs';
import type { GcsWrapper } from '@salusoft89/planegcs';
import type { SketchPrimitive } from '@salusoft89/planegcs';

const PT = 'pt:';
const LN = 'ln:';
const CX = 'c:';

/** Build the planegcs solver — async because it loads a WASM module. Reuse the instance across solves. */
export async function createPlanegcsSolver(): Promise<PlanegcsSolver> {
  const wrapper = await make_gcs_wrapper();
  return new PlanegcsSolver(wrapper);
}

export class PlanegcsSolver implements SketchSolver {
  readonly #wrapper: GcsWrapper;

  constructor(wrapper: GcsWrapper) {
    this.#wrapper = wrapper;
  }

  solve(sketch: SolvableSketch): SketchSolveResult {
    const w = this.#wrapper;
    w.clear_data();

    let primitives: SketchPrimitive[];
    try {
      primitives = toPlanegcsPrimitives(sketch);
    } catch (error) {
      return { status: 'failed', message: error instanceof Error ? error.message : String(error) };
    }

    w.push_primitives_and_params(primitives);
    const status = w.solve();

    // ⚠ CONFLICTS FIRST — an over-constrained solve reports status `Failed` AND a non-empty conflict set;
    // the conflict set is the actionable signal (which constraints to relax), so it wins.
    const conflicts = w.get_gcs_conflicting_constraints().map(stripConstraintId);
    if (conflicts.length > 0) {
      return { status: 'over-constrained', conflicts };
    }
    if (status === SolveStatus.Failed) {
      return { status: 'failed', message: 'planegcs did not converge' };
    }

    w.apply_solution();
    const solved: SolvedPoint[] = sketch.points.map((p) => {
      const point = w.sketch_index.get_sketch_point(PT + p.id);
      return { id: p.id, x: point.x, y: point.y };
    });
    const dof = w.gcs.dof();
    return { status: dof > 0 ? 'under-constrained' : 'solved', dof, solved };
  }

  /** Free the WASM module. Call at teardown (a test's `afterAll`, the app's dispose). */
  dispose(): void {
    this.#wrapper.destroy_gcs_module();
  }
}

function stripConstraintId(id: string): string {
  return id.startsWith(CX) ? id.slice(CX.length) : id;
}

/** Our IR → planegcs primitives: points, lines, then constraints. Ids namespaced so they never collide. */
function toPlanegcsPrimitives(sketch: SolvableSketch): SketchPrimitive[] {
  const out: SketchPrimitive[] = [];
  for (const p of sketch.points) {
    out.push({ id: PT + p.id, type: 'point', x: p.x, y: p.y, fixed: p.fixed });
  }
  for (const s of sketch.segments) {
    if (s.arc !== undefined) {
      throw new Error(`arc segment "${s.id}" is not supported by this solver build (v1.0.x)`);
    }
    out.push({ id: LN + s.id, type: 'line', p1_id: PT + s.from, p2_id: PT + s.to });
  }
  for (const c of sketch.constraints) {
    out.push(toConstraint(c));
  }
  return out;
}

/** One sketch constraint → its planegcs primitive. Operands are already resolved to our point/segment ids. */
function toConstraint(c: SolvableConstraint): SketchPrimitive {
  const id = CX + c.id;
  const driving = c.driving;
  const p = (i: number): string => PT + requireOperand(c.points, i, c, 'point');
  const l = (i: number): string => LN + requireOperand(c.segments, i, c, 'segment');
  switch (c.kind) {
    case 'coincident':
      return { id, type: 'p2p_coincident', p1_id: p(0), p2_id: p(1), driving };
    case 'distance':
      if (typeof c.value !== 'number') {
        throw new Error(`distance constraint "${c.id}" has no value`);
      }
      return { id, type: 'p2p_distance', p1_id: p(0), p2_id: p(1), distance: c.value, driving };
    case 'horizontal':
      return { id, type: 'horizontal_l', l_id: l(0), driving };
    case 'vertical':
      return { id, type: 'vertical_l', l_id: l(0), driving };
    case 'parallel':
      return { id, type: 'parallel', l1_id: l(0), l2_id: l(1), driving };
    case 'perpendicular':
      return { id, type: 'perpendicular_ll', l1_id: l(0), l2_id: l(1), driving };
    case 'equal':
      return { id, type: 'equal_length', l1_id: l(0), l2_id: l(1), driving };
    case 'tangent':
      throw new Error(
        `tangent constraint "${c.id}" needs an arc — not supported by this solver build`,
      );
    default:
      return assertNever(c.kind);
  }
}

function requireOperand(
  ids: readonly string[],
  i: number,
  c: SolvableConstraint,
  what: string,
): string {
  const value = ids[i];
  if (value === undefined) {
    throw new Error(`constraint "${c.id}" (${c.kind}) is missing ${what} operand ${String(i)}`);
  }
  return value;
}

function assertNever(value: never): never {
  throw new Error(`unhandled sketch constraint kind: ${String(value)}`);
}
