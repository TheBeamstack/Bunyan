/**
 * THE ROOM-BOUNDING SOLVER (D50 §Space-extent Option B / D55, `P5_step1_room_bounding_design.md`).
 *
 * A `Space`'s floor area is DERIVED from its bounding walls by a room-bounding solve (Revit's model) —
 * it is never stored (recipe-is-truth: the boundary is a projection of the walls, like a Part or a mesh).
 * This file is the body behind that: seed point + wall footprints (+ room separators) → boundary polygon.
 *
 * ⚠⚠ THE FIVE OWNER RULINGS THIS FILE EXECUTES (2026-07-18, design §9):
 *   Q1 — the boundary runs on the wall INNER FINISH FACE (the honest usable floor area). We feed the
 *        arrangement each wall's two FACE-LINES (centerline offset by ±thickness/2), so the face on the
 *        room side falls out for free — the seed disambiguates which side that is.
 *   Q2 — DOCUMENT-LAYER 2D, pure TypeScript. No kernel op, no WASM, headless-testable. `@bunyan/document`
 *        stays pure; the solver is injected like the kernel/sketch solver (D19 precedent), DEFAULTING to the
 *        real `PlanarRoomSolver` (there is no third-party WASM to quarantine, unlike planegcs).
 *   Q3 — the solver consumes solver-neutral `BoundarySegment`s, NOT walls. `footprintOf` is the only piece
 *        that knows what a wall is, so the solver is built + tested now, before the real D52 baseline Wall.
 *   Q4 — a not-enclosed seed returns `{ enclosed: false }`; the Space reports area UNAVAILABLE, never `0` (D45).
 *   Q5 — volume is PRISMATIC (area × derived height); a sloped-soffit room is a recorded v1.0.x extension.
 *
 * ⚠ THE INVARIANT (design §1): the room is a QUERY recomputed on demand from the live scene — never stored,
 * never cached, never wired into the staged rebuild (`dependency.ts` already declares its edge a "nothing").
 * So there is nothing to invalidate: read the scene, solve, report. Move a wall and re-query → the area follows.
 */

import type { Element, SpatialContainer } from './entities.js';
import { elevationOf } from './scene.js';
import type { Scene } from './scene.js';

/* ================================================================================================
 * 1. THE SEAM — the room analogue of `GeometryGateway` / `SketchSolver` (D19 precedent). Solver-neutral:
 *    it speaks 2D segments and a seed, and knows nothing of walls, the scene, or the kernel (Q2/Q3).
 * ============================================================================================= */

export type Vec2 = readonly [number, number];

/** One boundary segment in the Level's plane, mm. A wall face-line or a room-separator edge. */
export interface BoundarySegment {
  readonly a: Vec2;
  readonly b: Vec2;
}

/** What the solver receives: the room's seed point and every segment that could bound it. */
export interface RoomBoundingInput {
  /** The room's identity anchor — a point known to lie inside it (Revit's "room location point"). */
  readonly seed: Vec2;
  /** Wall face-lines + separator edges on the Level, in its plane. */
  readonly segments: readonly BoundarySegment[];
}

/**
 * The solve outcome — DATA, never a throw (the D10 kernel discipline, applied to the solver):
 *   - `enclosed: true`  — the seed sits inside a closed region; `boundary` is its polygon (CCW loop).
 *   - `enclosed: false` — the seed is not enclosed (a gap with no separator). Area is UNAVAILABLE (D45).
 */
export type RoomBoundingResult =
  { readonly enclosed: true; readonly boundary: readonly Vec2[] } | { readonly enclosed: false };

/** The narrow, swappable seam — the room analogue of `GeometryGateway`. */
export interface RoomSolver {
  solve(input: RoomBoundingInput): RoomBoundingResult;
}

/* ================================================================================================
 * 2. 2D PRIMITIVES. Building-scale coordinates (mm, thousands); TOL is sub-micron, well below any real
 *    architectural feature, so a genuine intersection is never missed and two distinct corners never merge.
 * ============================================================================================= */

const TOL = 1e-6;

function sub(p: Vec2, q: Vec2): Vec2 {
  return [p[0] - q[0], p[1] - q[1]];
}
function cross(p: Vec2, q: Vec2): number {
  return p[0] * q[1] - p[1] * q[0];
}
function dot(p: Vec2, q: Vec2): number {
  return p[0] * q[0] + p[1] * q[1];
}
function length(p: Vec2): number {
  return Math.hypot(p[0], p[1]);
}
function distance(p: Vec2, q: Vec2): number {
  return length(sub(p, q));
}

/** The shoelace signed area of a closed loop: > 0 ⇒ CCW (a bounded interior face); < 0 ⇒ CW (the outer face). */
export function signedArea(loop: readonly Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < loop.length; i++) {
    const p = loop[i]!;
    const q = loop[(i + 1) % loop.length]!;
    sum += cross(p, q);
  }
  return sum / 2;
}

/** The perimeter of a closed loop, mm. */
export function polygonPerimeter(loop: readonly Vec2[]): number {
  let sum = 0;
  for (let i = 0; i < loop.length; i++) {
    sum += distance(loop[i]!, loop[(i + 1) % loop.length]!);
  }
  return sum;
}

/**
 * Is `pt` strictly inside the polygon? Standard even-odd ray crossing (a +x ray). The seed is an interior
 * point by construction, so the on-edge degeneracy that plagues this test in general does not arise here.
 */
export function pointInPolygon(pt: Vec2, loop: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const a = loop[i]!;
    const b = loop[j]!;
    const straddles = a[1] > pt[1] !== b[1] > pt[1];
    if (straddles) {
      const xCross = ((b[0] - a[0]) * (pt[1] - a[1])) / (b[1] - a[1]) + a[0];
      if (pt[0] < xCross) inside = !inside;
    }
  }
  return inside;
}

/** Does `pt` lie ON segment a→b (within TOL)? Used to split a segment at a T-junction. */
function pointOnSegment(pt: Vec2, a: Vec2, b: Vec2): boolean {
  const d = sub(b, a);
  const len2 = dot(d, d);
  if (len2 <= TOL * TOL) return distance(pt, a) <= TOL;
  const t = dot(sub(pt, a), d) / len2;
  if (t < -TOL || t > 1 + TOL) return false;
  const perp = Math.abs(cross(sub(pt, a), d)) / Math.sqrt(len2);
  return perp <= TOL;
}

/** The proper crossing point of two non-parallel segments, or `undefined`. (Collinear overlap → undefined; */
/*  its overlap endpoints are already nodes via `pointOnSegment`, so no point is lost.) */
function properIntersection(a1: Vec2, a2: Vec2, b1: Vec2, b2: Vec2): Vec2 | undefined {
  const d1 = sub(a2, a1);
  const d2 = sub(b2, b1);
  const denom = cross(d1, d2);
  if (Math.abs(denom) <= TOL) return undefined; // parallel or degenerate
  const t = cross(sub(b1, a1), d2) / denom;
  const u = cross(sub(b1, a1), d1) / denom;
  if (t < -TOL || t > 1 + TOL || u < -TOL || u > 1 + TOL) return undefined;
  return [a1[0] + t * d1[0], a1[1] + t * d1[1]];
}

/* ================================================================================================
 * 3. THE PLANAR ARRANGEMENT + FACE TRACING (design §3). Split every segment at every intersection, build
 *    the half-edge graph, trace every bounded face, and pick the smallest one containing the seed.
 *    n = wall-faces + separator-edges on ONE Level (tens, not thousands) ⇒ an O(n²) split is ample.
 * ============================================================================================= */

interface HalfEdge {
  readonly from: number; // vertex index
  readonly to: number; // vertex index
  readonly angle: number; // direction of this half-edge, [0, 2π)
  next: number; // filled during linking: index into the half-edge array
  visited: boolean;
}

/** Merge a raw point into the canonical vertex list (within TOL), returning its index. O(n) — n is small. */
function internVertex(vertices: Vec2[], pt: Vec2): number {
  for (let i = 0; i < vertices.length; i++) {
    if (distance(vertices[i]!, pt) <= TOL) return i;
  }
  vertices.push(pt);
  return vertices.length - 1;
}

function normAngle(a: number): number {
  const twoPi = Math.PI * 2;
  return ((a % twoPi) + twoPi) % twoPi;
}

/**
 * The real solver: build the arrangement of the input segments, trace its bounded faces, and return the
 * boundary of the smallest face containing the seed — or `{ enclosed: false }` if the seed is unbounded.
 */
export class PlanarRoomSolver implements RoomSolver {
  solve(input: RoomBoundingInput): RoomBoundingResult {
    const raw = input.segments.filter((s) => distance(s.a, s.b) > TOL);
    if (raw.length === 0) return { enclosed: false };

    // (a) Collect every node: segment endpoints + all pairwise proper intersections.
    const nodes: Vec2[] = [];
    for (const s of raw) {
      nodes.push(s.a, s.b);
    }
    for (let i = 0; i < raw.length; i++) {
      for (let j = i + 1; j < raw.length; j++) {
        const x = properIntersection(raw[i]!.a, raw[i]!.b, raw[j]!.a, raw[j]!.b);
        if (x !== undefined) nodes.push(x);
      }
    }

    // (b) Split each segment at every node lying on it → sub-edges between consecutive distinct nodes.
    const vertices: Vec2[] = [];
    const edgeKeys = new Set<string>();
    const halfEdges: HalfEdge[] = [];
    const addHalf = (from: number, to: number): void => {
      if (from === to) return;
      const key = `${String(from)}->${String(to)}`;
      if (edgeKeys.has(key)) return; // a coincident wall/separator — keep one half-edge per direction
      edgeKeys.add(key);
      const d = sub(vertices[to]!, vertices[from]!);
      halfEdges.push({
        from,
        to,
        angle: normAngle(Math.atan2(d[1], d[0])),
        next: -1,
        visited: false,
      });
    };

    for (const s of raw) {
      const d = sub(s.b, s.a);
      const len2 = dot(d, d);
      const on: { t: number; idx: number }[] = [];
      for (const n of nodes) {
        if (!pointOnSegment(n, s.a, s.b)) continue;
        const t = dot(sub(n, s.a), d) / len2;
        on.push({ t, idx: internVertex(vertices, n) });
      }
      on.sort((p, q) => p.t - q.t);
      for (let i = 0; i + 1 < on.length; i++) {
        const from = on[i]!.idx;
        const to = on[i + 1]!.idx;
        addHalf(from, to);
        addHalf(to, from);
      }
    }
    if (halfEdges.length === 0) return { enclosed: false };

    // (c) Outgoing half-edges per vertex, sorted by angle — the rotational system for face tracing.
    const outgoing: number[][] = vertices.map(() => []);
    for (let h = 0; h < halfEdges.length; h++) outgoing[halfEdges[h]!.from]!.push(h);
    for (const list of outgoing) list.sort((x, y) => halfEdges[x]!.angle - halfEdges[y]!.angle);

    // (d) next(h): at h.to, take the outgoing edge whose angle is the greatest one strictly LESS than the
    //     return direction (the twin's angle) — the clockwise-most turn. This traces bounded faces CCW and
    //     the single outer face CW (design §3; verified against a unit square). A dangling edge folds back.
    for (let h = 0; h < halfEdges.length; h++) {
      const he = halfEdges[h]!;
      const ret = normAngle(halfEdges[h]!.angle + Math.PI); // direction of the twin (h.to → h.from)
      const list = outgoing[he.to]!;
      let best = -1;
      let bestAngle = -Infinity;
      let fallback = -1;
      let fallbackAngle = -Infinity; // greatest angle overall, for the wrap-around case
      for (const k of list) {
        const ang = halfEdges[k]!.angle;
        if (ang > fallbackAngle) {
          fallbackAngle = ang;
          fallback = k;
        }
        if (ang < ret - TOL && ang > bestAngle) {
          bestAngle = ang;
          best = k;
        }
      }
      he.next = best !== -1 ? best : fallback;
    }

    // (e) Trace every face cycle; keep the CCW (bounded) ones.
    interface Face {
      readonly loop: readonly Vec2[];
      readonly area: number;
    }
    const faces: Face[] = [];
    for (let h = 0; h < halfEdges.length; h++) {
      if (halfEdges[h]!.visited) continue;
      const loop: Vec2[] = [];
      let cur = h;
      let guard = 0;
      const limit = halfEdges.length + 1;
      while (!halfEdges[cur]!.visited && guard++ <= limit) {
        halfEdges[cur]!.visited = true;
        loop.push(vertices[halfEdges[cur]!.from]!);
        cur = halfEdges[cur]!.next;
        if (cur === -1) break;
      }
      const area = signedArea(loop);
      if (loop.length >= 3 && area > TOL) faces.push({ loop, area });
    }

    // (f) The room is the SMALLEST bounded face containing the seed (D45: none ⇒ not enclosed, never 0).
    let room: Face | undefined;
    for (const f of faces) {
      if (!pointInPolygon(input.seed, f.loop)) continue;
      if (room === undefined || f.area < room.area) room = f;
    }
    return room === undefined ? { enclosed: false } : { enclosed: true, boundary: room.loop };
  }
}

/* ================================================================================================
 * 4. THE MOCK — for testing the injection seam without committing to the real solver. It never claims a
 *    room (every seed is "not enclosed"), which keeps a document constructed with it honest: a test that
 *    wants a real area must inject the real solver, exactly as a kernel test must use the real kernel.
 *    (Unlike the sketch mock, the DEFAULT is the REAL solver — it is pure TS, so there is no WASM to avoid.)
 * ============================================================================================= */
export class MockRoomSolver implements RoomSolver {
  // An interface method may be implemented with fewer parameters — the mock ignores its input by design.
  solve(): RoomBoundingResult {
    return { enclosed: false };
  }
}

/* ================================================================================================
 * 5. THE FOOTPRINT PROVIDER (Q3) — the ONLY piece that knows what a wall is. It turns the scene into the
 *    solver-neutral `BoundarySegment[]`, so the solver never sees a wall, a param, or the scene. When the
 *    real D52 baseline Wall (`{start,end}`) lands, it already satisfies this convention — nothing changes.
 * ============================================================================================= */

/** Read a `[x, y]` point out of an element param, or `undefined` if it is not a 2-number tuple. */
function readVec2(value: unknown): Vec2 | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const x: unknown = value[0];
  const y: unknown = value[1];
  if (typeof x !== 'number' || typeof y !== 'number') return undefined;
  return [x, y];
}

/**
 * A wall's total thickness (mm) — the sum of its style's layer thicknesses (D30/D31), falling back to a
 * `thickness` param, else 0. Zero thickness degrades gracefully to a centerline (a wall with no body cannot
 * offer a finish face); a real styled wall always has layers.
 */
function wallThickness(element: Element, scene: Scene): number {
  const style = element.styleId === undefined ? undefined : scene.styles[element.styleId];
  const layers = style?.layers ?? [];
  if (layers.length > 0) return layers.reduce((sum, l) => sum + l.thickness, 0);
  const t = element.params['thickness'];
  return typeof t === 'number' ? t : 0;
}

/**
 * The 2D footprint of ONE element on the Level plane, as boundary segments — Q1: a wall contributes its two
 * INNER/OUTER FACE-LINES (centerline offset by ±thickness/2), so the room boundary lands on the finish face.
 * An element with no baseline (`start`/`end` params — the D52 shape) contributes nothing (v1.0.0 bounds rooms
 * with walls + separators only; columns/other are a recorded v1.0.x extension). Zero-length walls are skipped.
 */
export function footprintOf(element: Element, scene: Scene): readonly BoundarySegment[] {
  const start = readVec2(element.params['start']);
  const end = readVec2(element.params['end']);
  if (start === undefined || end === undefined) return [];
  const dir = sub(end, start);
  const len = length(dir);
  if (len <= TOL) return [];
  const half = wallThickness(element, scene) / 2;
  if (half <= TOL) return [{ a: start, b: end }]; // no body ⇒ centerline
  // Perpendicular unit, times half-thickness — the offset to each face-line.
  const n: Vec2 = [(-dir[1] / len) * half, (dir[0] / len) * half];
  return [
    { a: [start[0] + n[0], start[1] + n[1]], b: [end[0] + n[0], end[1] + n[1]] },
    { a: [start[0] - n[0], start[1] - n[1]], b: [end[0] - n[0], end[1] - n[1]] },
  ];
}

/**
 * Assemble the solver input for a Space: its seed, plus every wall footprint and every room-separator edge
 * on the Space's Level. Returns `undefined` when the container is not a seeded Space (no room to solve).
 *
 * ⚠ "On the Level" = the Space's own Level (`parentId`). A wall's Level is its `containerId`; a separator's
 * is its `levelId`. v1.0.0 reads walls whose `containerId` IS that Level — the flat, common case.
 */
export function assembleRoomInput(scene: Scene, spaceId: string): RoomBoundingInput | undefined {
  const space = scene.containers[spaceId];
  if (space === undefined || space.kind !== 'space' || space.location === undefined)
    return undefined;
  const levelId = space.parentId;
  if (levelId === undefined) return undefined;

  const segments: BoundarySegment[] = [];
  for (const element of Object.values(scene.elements)) {
    if (element.containerId !== levelId) continue;
    segments.push(...footprintOf(element, scene));
  }
  for (const sep of Object.values(scene.roomSeparators)) {
    if (sep.levelId !== levelId) continue;
    for (let i = 0; i + 1 < sep.points.length; i++) {
      segments.push({ a: sep.points[i]!, b: sep.points[i + 1]! });
    }
  }
  return { seed: space.location, segments };
}

/* ================================================================================================
 * 6. THE VERTICAL EXTENT (Q5) — height is DERIVED, never stored (D52's rule, applied to the Space by 0g).
 *    base = the Space's Level + `baseOffset`; top = `upperLevelId` + `limitOffset`, else the next Level up.
 * ============================================================================================= */

export interface VerticalExtent {
  readonly base: number;
  readonly top: number;
}

/** The Building a Level belongs to (its `parentId`), for finding sibling Levels — or `undefined`. */
function buildingOf(scene: Scene, levelId: string): string | undefined {
  return scene.containers[levelId]?.parentId;
}

/** The smallest Level elevation strictly above `base` within `buildingId` — the "next Level up". */
function nextLevelAbove(
  scene: Scene,
  buildingId: string | undefined,
  base: number,
): number | undefined {
  let best: number | undefined;
  for (const c of Object.values(scene.containers)) {
    if (c.kind !== 'level' || c.elevation === undefined) continue;
    if (buildingId !== undefined && c.parentId !== buildingId) continue;
    if (c.elevation > base + TOL && (best === undefined || c.elevation < best)) best = c.elevation;
  }
  return best;
}

/**
 * The Space's vertical extent, or `undefined` when the top cannot be derived (no `upperLevelId` and no Level
 * above) — in which case volume is UNAVAILABLE (D45: omitted, never guessed) while area is still reported.
 */
export function verticalExtentOf(
  scene: Scene,
  space: SpatialContainer,
): VerticalExtent | undefined {
  const levelId = space.parentId;
  if (levelId === undefined) return undefined;
  const base = elevationOf(scene, levelId) + (space.baseOffset ?? 0);
  let top: number | undefined;
  if (space.upperLevelId !== undefined) {
    const upper = scene.containers[space.upperLevelId];
    if (upper === undefined) return undefined;
    top = elevationOf(scene, space.upperLevelId) + (space.limitOffset ?? 0);
  } else {
    const above = nextLevelAbove(scene, buildingOf(scene, levelId), elevationOf(scene, levelId));
    if (above === undefined) return undefined;
    top = above + (space.limitOffset ?? 0);
  }
  return top > base + TOL ? { base, top } : undefined;
}
