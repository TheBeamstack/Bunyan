/**
 * WALL-TO-WALL JOINS (D50 step 0c, `P5_step0c_design.md`) — the plane geometry that turns a corner of two
 * baselines into the cap lines each wall's end-cap must lie on. Engine-side (never a Type): it reads the
 * scene, so a Wall stays a pure function of scalars (`ctx.joins`), exactly as 0b did for datums.
 *
 * ⚠⚠ THE ANTI-FUSE RULE IS THE DESIGN (§4h, measured Entry 12). A join reshapes ONLY a wall's END-CAP,
 * inside that wall's own recipe — never a boolean fuse of two elements. The wall's two long side faces
 * (where windows live) keep byte-identical `SubShapeRef` tokens (D26). This module computes cap LINES; the
 * Wall clips its side-lines to them and extrudes its own solid. Nothing here touches another element's faces.
 *
 * ⚠ AUTOMATIC ON PROXIMITY (owner-ruled Q3), and it is D1-safe (§0a): "do these two ends meet?" is decided
 * from the walls' `{start,end}` PARAMS — the recipe, the same inputs `footprintOf` reads — never from a
 * built solid. A `JoinConstraint` is only an OVERRIDE of the auto-mitre default (butt / explicit mitre /
 * none = Disallow Join). Absent ⇒ auto-mitre.
 */

import type { Element, ElementId, JoinConstraint } from './entities.js';
import { isJoinConstraint } from './entities.js';
import type { Scene } from './scene.js';
import type { CapLine, ResolvedJoin } from './types.js';

/** Endpoints within this many mm are "the same corner" (authored/snapped ends coincide exactly). */
const JOIN_TOL = 1e-3;
/** Direction degeneracy guard — a zero-length baseline, a collinear corner, a parallel butt. */
const EPS = 1e-9;

type V = readonly [number, number];

const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const scale = (a: V, s: number): V => [a[0] * s, a[1] * s];
const len = (a: V): number => Math.hypot(a[0], a[1]);
const dot = (a: V, b: V): number => a[0] * b[0] + a[1] * b[1];
/** 2D cross (z of the 3D cross) — zero ⇔ parallel. */
const cross = (a: V, b: V): number => a[0] * b[1] - a[1] * b[0];
/** Left normal — perpendicular, rotated +90°. */
const perp = (a: V): V => [-a[1], a[0]];
const near = (a: V, b: V): boolean => len(sub(a, b)) <= JOIN_TOL;

function unit(a: V): V | undefined {
  const l = len(a);
  return l < EPS ? undefined : [a[0] / l, a[1] / l];
}

/* ------------------------------------------------------------------------------------------------
 * READING A WALL FROM THE RECIPE — the only place that knows a wall is `{start,end}` params (D52).
 * ---------------------------------------------------------------------------------------------- */

export interface Baseline {
  readonly start: V;
  readonly end: V;
}

function readVec2(value: unknown): V | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const x: unknown = value[0];
  const y: unknown = value[1];
  return typeof x === 'number' && typeof y === 'number' ? [x, y] : undefined;
}

/** The wall's baseline in the Level plane, or `undefined` if the element carries no `{start,end}`. */
export function baselineOf(element: Element): Baseline | undefined {
  const start = readVec2(element.params['start']);
  const end = readVec2(element.params['end']);
  if (start === undefined || end === undefined) return undefined;
  return len(sub(end, start)) < EPS ? undefined : { start, end };
}

/**
 * A wall's total thickness (mm) — the sum of its style's layer thicknesses (D30), else a `thickness`
 * param, else 0. Shared with the join geometry so the miter reads the same number the build extrudes.
 */
export function totalWallThickness(element: Element, scene: Scene): number {
  const style = element.styleId === undefined ? undefined : scene.styles[element.styleId];
  const layers = style?.layers ?? [];
  if (layers.length > 0) return layers.reduce((sum, l) => sum + l.thickness, 0);
  const t = element.params['thickness'];
  return typeof t === 'number' ? t : 0;
}

/* ------------------------------------------------------------------------------------------------
 * THE CORNER GEOMETRY — a miter bisector, or a butt face-line. Both return a single cap LINE.
 * ---------------------------------------------------------------------------------------------- */

/**
 * The MITER line through the shared corner `P`: the angle bisector of the two walls' body directions
 * (`bodyA`/`bodyB` each point from `P` into their wall). Two walls meeting there both clip their caps to
 * this one line, so their faces meet exactly along it. `undefined` for a collinear corner (bisector
 * vanishes) or one whose line runs parallel to the wall it caps (nothing to clip).
 */
function miterLine(P: V, bodyA: V, bodyB: V, wallDir: V): CapLine | undefined {
  const dir = unit(add(bodyA, bodyB));
  if (dir === undefined) return undefined; // collinear opposite ⇒ straight through, no miter
  if (Math.abs(cross(dir, wallDir)) < EPS) return undefined; // cap parallel to the wall ⇒ nothing to clip
  return { point: P, dir };
}

/**
 * The BUTT line: the near face-line of the wall `element` butts into. It runs parallel to the neighbour's
 * baseline, offset by the neighbour's half-thickness toward the butting wall (`wBody` — the direction the
 * butting wall runs). `undefined` when the butting wall is parallel to the neighbour (no honest face to
 * stop on).
 */
function buttLine(
  P: V,
  wBody: V,
  neighbour: Baseline,
  neighbourThickness: number,
): CapLine | undefined {
  const oDir = unit(sub(neighbour.end, neighbour.start));
  if (oDir === undefined) return undefined;
  const oN = perp(oDir);
  const side = dot(oN, wBody);
  if (Math.abs(side) < EPS) return undefined; // butting wall parallel to the neighbour's faces
  const h = neighbourThickness / 2;
  const point = add(P, scale(oN, Math.sign(side) * h));
  return { point, dir: oDir };
}

/* ------------------------------------------------------------------------------------------------
 * RESOLVING A WALL'S JOINS — one cap line per non-default end (auto-miter or an override).
 * ---------------------------------------------------------------------------------------------- */

/** The join OVERRIDES that name this element (as `element` or `other`). Absent ⇒ every corner auto-miters. */
export function joinOverridesOf(scene: Scene, elementId: ElementId): readonly JoinConstraint[] {
  return Object.values(scene.constraints).filter(
    (c): c is JoinConstraint =>
      isJoinConstraint(c) && (c.element === elementId || c.other === elementId),
  );
}

/** Every OTHER wall with a baseline endpoint coincident with `P` — the auto-join partners at that corner. */
function partnersAt(scene: Scene, P: V, selfId: ElementId): readonly { id: ElementId; body: V }[] {
  const out: { id: ElementId; body: V }[] = [];
  for (const el of Object.values(scene.elements)) {
    if (el.id === selfId) continue;
    const b = baselineOf(el);
    if (b === undefined) continue;
    // Which end (if any) of this neighbour meets P — and the direction from P into its body.
    if (near(b.start, P)) {
      const body = unit(sub(b.end, b.start));
      if (body !== undefined) out.push({ id: el.id, body });
    } else if (near(b.end, P)) {
      const body = unit(sub(b.start, b.end));
      if (body !== undefined) out.push({ id: el.id, body });
    }
  }
  return out;
}

/**
 * The cap lines for a wall's two ends — the NON-DEFAULT ones only (an unjoined or `none` end is omitted,
 * and the Wall draws its plain perpendicular cap there). This is what `BuildContext.joins` carries.
 *
 * Precedence at each end: an OVERRIDE that names this wall AND meets this end wins; otherwise the auto-join
 * (exactly one coincident neighbour ⇒ miter; zero or an ambiguous crowd of 2+ ⇒ the default cap).
 */
export function resolveJoins(scene: Scene, elementId: ElementId): readonly ResolvedJoin[] {
  const self = scene.elements[elementId];
  if (self === undefined) return [];
  const base = baselineOf(self);
  if (base === undefined) return [];
  const wallDir = unit(sub(base.end, base.start));
  if (wallDir === undefined) return [];

  const overrides = joinOverridesOf(scene, elementId);
  const ends: { name: 'start' | 'end'; P: V; body: V }[] = [
    { name: 'start', P: base.start, body: wallDir },
    { name: 'end', P: base.end, body: [-wallDir[0], -wallDir[1]] },
  ];

  const result: ResolvedJoin[] = [];
  for (const e of ends) {
    const capLine = resolveEnd(scene, elementId, e.P, e.body, wallDir, overrides);
    if (capLine !== undefined) result.push({ end: e.name, capLine });
  }
  return result;
}

function resolveEnd(
  scene: Scene,
  selfId: ElementId,
  P: V,
  body: V,
  wallDir: V,
  overrides: readonly JoinConstraint[],
): CapLine | undefined {
  // --- 1. An override that meets THIS end wins (it may force butt/none against the auto-miter). ---------
  for (const o of overrides) {
    const otherId = o.element === selfId ? o.other : o.element;
    const other = scene.elements[otherId];
    const otherBase = other === undefined ? undefined : baselineOf(other);
    if (otherBase === undefined) continue;
    if (!near(otherBase.start, P) && !near(otherBase.end, P)) continue; // this override is at a different corner
    switch (o.resolution) {
      case 'none':
        return undefined; // Disallow Join — the walls stay separate boxes.
      case 'mitre':
        return miterLine(P, body, partnerBody(otherBase, P), wallDir);
      case 'butt':
        // Directional: only the BUTTING wall (`element`) moves; the through wall (`other`) is untouched.
        return o.element === selfId
          ? buttLine(P, body, otherBase, totalWallThickness(other!, scene))
          : undefined;
    }
  }

  // --- 2. Auto-join: exactly one coincident neighbour ⇒ miter. Zero or 2+ ⇒ the default cap. -----------
  const partners = partnersAt(scene, P, selfId);
  if (partners.length !== 1) return undefined;
  return miterLine(P, body, partners[0]!.body, wallDir);
}

/** The direction from corner `P` into the neighbour's body (whichever of its ends meets `P`). */
function partnerBody(other: Baseline, P: V): V {
  if (near(other.start, P)) return unit(sub(other.end, other.start)) ?? [1, 0];
  return unit(sub(other.start, other.end)) ?? [1, 0];
}

/* ------------------------------------------------------------------------------------------------
 * THE DEPENDENCY EDGE (0a) — when a wall moves, which OTHER walls must re-stage their joins?
 * ---------------------------------------------------------------------------------------------- */

/**
 * Every wall whose cap depends on `selfId`: those sharing an endpoint with any of `points` (its old and/or
 * new baseline ends — auto-join neighbours), plus any wall named in an override with it. Used by the
 * invalidator so "move a wall, its neighbour's miter follows" is true (the bidirectional element↔element
 * edge, `P5_step0c_design.md` §4).
 */
export function wallsJoinedTo(
  scene: Scene,
  selfId: ElementId,
  points: readonly V[],
): readonly ElementId[] {
  const ids = new Set<ElementId>();
  for (const el of Object.values(scene.elements)) {
    if (el.id === selfId) continue;
    const b = baselineOf(el);
    if (b === undefined) continue;
    if (points.some((p) => near(b.start, p) || near(b.end, p))) ids.add(el.id);
  }
  for (const o of joinOverridesOf(scene, selfId)) {
    ids.add(o.element === selfId ? o.other : o.element);
  }
  ids.delete(selfId);
  return [...ids];
}

/** The baseline endpoints an element contributes to a proximity scan — empty if it is not a baseline wall. */
export function endpointsOf(element: Element | undefined): readonly V[] {
  if (element === undefined) return [];
  const b = baselineOf(element);
  return b === undefined ? [] : [b.start, b.end];
}

/**
 * Do two elements meet at a corner — i.e. does an endpoint of one coincide with an endpoint of the other?
 * The precondition a `core.setJoin` override checks: you cannot force a join between walls that do not
 * touch. Both must be baseline walls.
 */
export function wallsShareCorner(a: Element, b: Element): boolean {
  const pa = endpointsOf(a);
  const pb = endpointsOf(b);
  return pa.some((x) => pb.some((y) => near(x, y)));
}
