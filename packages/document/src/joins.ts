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

import { isElementActive, optionScopeOf } from './designoptions.js';
import type { ActiveOptions, DesignOption, DesignOptionId, OptionScope } from './designoptions.js';
import type { Element, ElementId, JoinConstraint } from './entities.js';
import { isJoinConstraint } from './entities.js';
import type { Scene } from './scene.js';
import type { CapLine, ResolvedJoin } from './types.js';

/**
 * Which design options a join resolution is asked under — the same shape `EnumerateOptions` and
 * `RoomOptionSelection` use, because it is the same question (`designoptions.ts`). Absent ⇒ every set's
 * primary option, i.e. the main model, which is the whole of v1.0.0 (nothing authors an option yet).
 */
export interface JoinOptionSelection {
  /** The active option per set. Absent/unlisted set ⇒ that set's primary option. */
  readonly active?: ActiveOptions;
  /** The option catalogue, when the caller holds one; absent ⇒ `scene.designOptions`. */
  readonly designOptions?: Readonly<Record<DesignOptionId, DesignOption>>;
}

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

/**
 * ⚠⚠ THE MID-SPAN TEST (Entry 60, the rule-16 backward sweep). Does `P` lie ON `seg`, STRICTLY between its
 * endpoints? That last word is the whole distinction: a point at an endpoint is a CORNER (miter territory,
 * `partnersAt`), a point in the middle is a T-junction (butt territory).
 *
 * **Why it had to exist.** Without it a partition whose end lands mid-span found no partner at all, kept its
 * plain perpendicular cap, and drove its last half-thickness INSIDE the through wall — so that sliver of
 * blockwork lived in both B-Reps and was counted twice by `projectQuantities`, wearing `basis: 'exact'`
 * (measured: 2.8800 m³ where 2.8320 m³ is the truth). `core_logic.md` rule 16: *"a quantity can never
 * double-count."* A T is the commonest interior condition in a building, and it was the one shape the join
 * resolver could not see.
 *
 * ⚠ Read from the `{start,end}` PARAMS like every other join decision — the recipe, never a built solid
 * (D1-safe, §0a). `JOIN_TOL` is the same "these are the same point" tolerance a corner uses.
 */
function pointOnSegment(P: V, seg: Baseline): boolean {
  const d = sub(seg.end, seg.start);
  const l = len(d);
  if (l < EPS) return false;
  const u: V = [d[0] / l, d[1] / l];
  const w = sub(P, seg.start);
  const along = dot(w, u);
  // Strictly inside: an endpoint hit is a corner, and the corner rule owns it.
  if (along <= JOIN_TOL || along >= l - JOIN_TOL) return false;
  return Math.abs(cross(u, w)) <= JOIN_TOL;
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
 * ⚠⚠ THE SPATIAL INDEX (Entry 61, `review_P5.md` #3) — what turns the join scan from O(N²) into O(N).
 * ---------------------------------------------------------------------------------------------- */

/**
 * **The problem, measured.** `partnersAt`, `throughWallsAt` and `wallsJoinedTo` each walked
 * `Object.values(scene.elements)` in full, and `resolveJoins` runs **per element** in the build — so a
 * cold load of N walls did N full scans. Measured on a room grid (pure TS, no kernel):
 *
 * ```
 *   walls    resolveJoins(all)   per-wall    wallsJoinedTo(all)
 *      60             8.6 ms      143 µs               12.7 ms
 *     544           344.9 ms      634 µs              281.7 ms
 *    1984          4757.7 ms     2398 µs             3645.1 ms
 * ```
 *
 * ⇒ ~**3.5 minutes of pure join scanning** extrapolated to the 10,000-element target D48 makes BINDING,
 * before the kernel does any geometry at all. (Entry 60 made it worse: `throughWallsAt` added a second
 * full scan per wall end. Fixing it is therefore partly this project's debt to itself.)
 *
 * **The fix, and why it needs no new plumbing.** A uniform grid over the walls' endpoints and segments,
 * cached **against the `Scene` object itself** in a `WeakMap`. `Scene` is replaced immutably on every
 * change (`applyChanges` folds into a new object), so a stale index is not merely unlikely — it is
 * unreachable: a changed scene is a different key, and the old entry is collected with the old scene.
 * No invalidation logic exists to get wrong, and **no function signature changes.**
 *
 * ⚠ The index stores EVERY wall, unfiltered. Design-option filtering (D65/D67/D68) stays at QUERY time
 * on the handful of candidates — because the same scene is legitimately queried under different option
 * selections, and an index that baked one selection in would answer the wrong question for the next.
 */
const CELL = 500; // mm. Walls are metres; this keeps buckets small without exploding the cell count.
const HALF_CELL = CELL / 2;

interface IndexEntry {
  readonly id: ElementId;
  readonly base: Baseline;
}

interface JoinIndex {
  /** cell → walls having an ENDPOINT in it. */
  readonly endpoints: Map<string, IndexEntry[]>;
  /** cell → walls whose SEGMENT passes through it. */
  readonly segments: Map<string, IndexEntry[]>;
}

const INDEX_CACHE = new WeakMap<Scene, JoinIndex>();

const cellKey = (x: number, y: number): string => `${Math.floor(x / CELL)}:${Math.floor(y / CELL)}`;

function pushAt(map: Map<string, IndexEntry[]>, key: string, entry: IndexEntry): void {
  const bucket = map.get(key);
  if (bucket === undefined) map.set(key, [entry]);
  else bucket.push(entry);
}

/**
 * Sample a segment into cells. Stepping by half a cell guarantees every point of the segment lies
 * within `CELL/4` of some sample, so a 3×3 neighbourhood query around any point on the segment is
 * certain to reach a cell the segment was recorded in — including the case where it merely clips a
 * corner and no sample lands inside that cell.
 */
function eachSegmentCell(base: Baseline, visit: (key: string) => void): void {
  const d = sub(base.end, base.start);
  const l = len(d);
  const steps = Math.max(1, Math.ceil(l / HALF_CELL));
  const seen = new Set<string>();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const key = cellKey(base.start[0] + d[0] * t, base.start[1] + d[1] * t);
    if (!seen.has(key)) {
      seen.add(key);
      visit(key);
    }
  }
}

function indexOf(scene: Scene): JoinIndex {
  const cached = INDEX_CACHE.get(scene);
  if (cached !== undefined) return cached;

  const endpoints = new Map<string, IndexEntry[]>();
  const segments = new Map<string, IndexEntry[]>();
  for (const el of Object.values(scene.elements)) {
    const base = baselineOf(el);
    if (base === undefined) continue;
    const entry: IndexEntry = { id: el.id, base };
    pushAt(endpoints, cellKey(base.start[0], base.start[1]), entry);
    pushAt(endpoints, cellKey(base.end[0], base.end[1]), entry);
    eachSegmentCell(base, (key) => {
      pushAt(segments, key, entry);
    });
  }
  const index: JoinIndex = { endpoints, segments };
  INDEX_CACHE.set(scene, index);
  return index;
}

/** Every distinct entry in the 3×3 cell neighbourhood of `P`, from one of the two maps. */
function near9(map: Map<string, IndexEntry[]>, P: V): readonly IndexEntry[] {
  const cx = Math.floor(P[0] / CELL);
  const cy = Math.floor(P[1] / CELL);
  const out: IndexEntry[] = [];
  const seen = new Set<ElementId>();
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const bucket = map.get(`${cx + dx}:${cy + dy}`);
      if (bucket === undefined) continue;
      for (const e of bucket) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        out.push(e);
      }
    }
  }
  return out;
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

/**
 * Every OTHER wall with a baseline endpoint coincident with `P` — the auto-join partners at that corner.
 *
 * ⚠⚠ **A WALL IN A NON-ACTIVE OPTION IS NOT A PARTNER (D65/D67).** This scan walked every element in the
 * scene, and the join rule *"exactly one coincident neighbour ⇒ miter; zero or a crowd of 2+ ⇒ the default
 * cap"* turns that into two distinct wrong answers, **both of which corrupt the BUILT B-Rep** — so unlike
 * the room solver's derived area, the wrong number here arrives wearing `basis: 'exact'`:
 *
 *   1. **Miter against a ghost** — the only wall reaching a corner belongs to a scheme nobody will build,
 *      so a main-model wall miters itself against it.
 *   2. **⚠ The ambiguity flip, and it is the vicious one** — two main-model walls meet and correctly miter;
 *      the author adds a facade variant that reaches the same corner; each now counts **2** partners, the
 *      crowd reads as ambiguous, and **the miter is silently dropped.** Adding a design option changes the
 *      geometry of a main-model corner elsewhere in the building that nobody edited.
 *
 * Measured in `tests/join-option-cascade.test.ts`. Mode 2 is D67's shape exactly: a rule that cannot see
 * what an element hangs off gives a confidently wrong answer about an innocent third party.
 */
function partnersAt(
  scene: Scene,
  P: V,
  selfId: ElementId,
  scope: OptionScope,
  active: ActiveOptions,
): readonly { id: ElementId; body: V }[] {
  const out: { id: ElementId; body: V }[] = [];
  // ⚠ The 3×3 neighbourhood of P, not the whole scene (Entry 61). The exact `near()` test below is
  // unchanged and still decides — the index only narrows WHO is asked, never WHAT is asked.
  for (const candidate of near9(indexOf(scene).endpoints, P)) {
    if (candidate.id === selfId) continue;
    const el = scene.elements[candidate.id];
    if (el === undefined) continue;
    if (!isElementActive(el, scope, active)) continue;
    const b = candidate.base;
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
 * ⚠⚠ Every OTHER wall this point lands on MID-SPAN — the T-junction partners (Entry 60).
 *
 * The sibling of `partnersAt`, and the two are deliberately disjoint: `partnersAt` matches an endpoint (a
 * corner ⇒ miter), this matches the interior of a segment (a T ⇒ butt). Same option filter, for the same
 * D65/D67 reason — a partition must not butt onto a wall belonging to a scheme nobody will build, and it
 * must not be pushed into ambiguity by one either.
 */
function throughWallsAt(
  scene: Scene,
  P: V,
  selfId: ElementId,
  scope: OptionScope,
  active: ActiveOptions,
): readonly { id: ElementId; base: Baseline; thickness: number }[] {
  const out: { id: ElementId; base: Baseline; thickness: number }[] = [];
  // ⚠ Segment cells, 3×3 around P (Entry 61). `pointOnSegment` still decides; thickness is resolved
  // only for the few candidates that survive it, so the expensive style lookup stays off the hot path.
  for (const candidate of near9(indexOf(scene).segments, P)) {
    if (candidate.id === selfId) continue;
    const el = scene.elements[candidate.id];
    if (el === undefined) continue;
    if (!isElementActive(el, scope, active)) continue;
    if (pointOnSegment(P, candidate.base))
      out.push({ id: el.id, base: candidate.base, thickness: totalWallThickness(el, scene) });
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
export function resolveJoins(
  scene: Scene,
  elementId: ElementId,
  selection: JoinOptionSelection = {},
): readonly ResolvedJoin[] {
  const self = scene.elements[elementId];
  if (self === undefined) return [];
  const base = baselineOf(self);
  if (base === undefined) return [];
  const wallDir = unit(sub(base.end, base.start));
  if (wallDir === undefined) return [];

  const scope = optionScopeOf(scene, selection.designOptions);
  const active = selection.active ?? {};
  const overrides = joinOverridesOf(scene, elementId);
  const ends: { name: 'start' | 'end'; P: V; body: V }[] = [
    { name: 'start', P: base.start, body: wallDir },
    { name: 'end', P: base.end, body: [-wallDir[0], -wallDir[1]] },
  ];

  const result: ResolvedJoin[] = [];
  for (const e of ends) {
    const capLine = resolveEnd(scene, elementId, e.P, e.body, wallDir, overrides, scope, active);
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
  scope: OptionScope,
  active: ActiveOptions,
): CapLine | undefined {
  // --- 1. An override that meets THIS end wins (it may force butt/none against the auto-miter). ---------
  for (const o of overrides) {
    const otherId = o.element === selfId ? o.other : o.element;
    const other = scene.elements[otherId];
    // ⚠ An override naming a wall in a non-active option is an override against something that is not
    // there. It cannot force a join (the same rule as the auto-scan below).
    if (other !== undefined && !isElementActive(other, scope, active)) continue;
    const otherBase = other === undefined ? undefined : baselineOf(other);
    if (otherBase === undefined) continue;
    const atCorner = near(otherBase.start, P) || near(otherBase.end, P);
    // ⚠ An override may now name a MID-SPAN pair too (Entry 60) — that is how an author disables the
    // auto-butt on a T, which `core.setJoin` refused to express until the T could be joined at all.
    const atMidSpan = pointOnSegment(P, otherBase);
    if (!atCorner && !atMidSpan) continue; // this override is at a different junction
    switch (o.resolution) {
      case 'none':
        return undefined; // Disallow Join — the walls stay separate boxes.
      case 'mitre':
        // ⚠ A mid-span T has no corner to bisect: the two walls do not both END here, so there is no
        // angle between their bodies. Refuse to invent one — fall back to the plain cap.
        return atCorner ? miterLine(P, body, partnerBody(otherBase, P), wallDir) : undefined;
      case 'butt':
        // Directional: only the BUTTING wall (`element`) moves; the through wall (`other`) is untouched.
        return o.element === selfId
          ? buttLine(P, body, otherBase, totalWallThickness(other!, scene))
          : undefined;
    }
  }

  // --- 2. Auto-join: exactly one coincident neighbour ⇒ miter. Zero or 2+ ⇒ the default cap. -----------
  const partners = partnersAt(scene, P, selfId, scope, active);
  if (partners.length === 1) return miterLine(P, body, partners[0]!.body, wallDir);
  if (partners.length > 1) return undefined; // an ambiguous crowd of corners — the default cap

  // --- 3. ⚠⚠ Auto-BUTT on a mid-span T (Entry 60, domain rule 16). -----------------------------------
  // Reached only when no wall ENDS here, so a corner cannot be what this is. Exactly one wall running
  // through the point ⇒ this wall butts onto its near face. The same ambiguity discipline as a corner:
  // a crowd of 2+ through walls has no single face to stop on, so it falls back to the default cap.
  //
  // ⚠ DIRECTIONAL, and that is what makes it double-count-free: only the BUTTING wall's cap moves; the
  // through wall runs on untouched. The two solids then abut on a face instead of overlapping in a
  // sliver, which is the whole point — `t_partition × t_through/2 × height` of blockwork stops existing
  // twice. (`buttLine` is the same geometry a `resolution:'butt'` override has always produced.)
  const through = throughWallsAt(scene, P, selfId, scope, active);
  if (through.length !== 1) return undefined;
  return buttLine(P, body, through[0]!.base, through[0]!.thickness);
}

/**
 * ⚠⚠ THE BUILT AXIS LENGTH of a wall, in mm — its baseline CLIPPED BY ITS JOINS (Entry 60, domain rule
 * 15). `undefined` when the element is not a baseline wall.
 *
 * **Why it exists.** The Clean Delta's `canonical.length` reconstructed the length from the `{start,end}`
 * param while `volume` beside it was measured on the B-Rep — so a butted partition reported **2.00 m of a
 * wall whose solid ran 1.9 m**, and both numbers sat under one `basis: 'exact'`. Rule 15: *"a quantity is
 * MEASURED, never reconstructed… it must never emit a WRONG one wearing the `exact` badge."* The package
 * contradicted itself, which is the one form of wrongness a consumer can detect unaided — and it is worth
 * fixing precisely because most consumers will not look.
 *
 * ⚠ **This is not `measure.edgeLength`, and Freeze-Gate ⓗ's reasoning is not overturned.** Summing every
 * edge of a solid is still meaningless as a schedule quantity. "Not edgeLength" merely never implied "the
 * raw authored baseline": the built AXIS is the third option, it is what a QS bills, and it is derived
 * from the recipe (the cap lines `resolveJoins` already produces) rather than read off a solid — so it
 * stays D1-safe and kernel-free.
 *
 * ⚠ With nothing joined it returns the baseline exactly, so every existing jointless document is
 * unchanged.
 */
export function builtAxisLength(
  scene: Scene,
  elementId: ElementId,
  selection: JoinOptionSelection = {},
): number | undefined {
  const self = scene.elements[elementId];
  if (self === undefined) return undefined;
  const base = baselineOf(self);
  if (base === undefined) return undefined;
  const span = sub(base.end, base.start);
  const total = len(span);
  const u = unit(span);
  if (u === undefined) return undefined;

  // Parameters along the baseline, in mm from `start`. A join moves the end it caps; an unjoined end
  // keeps its authored position.
  let tStart = 0;
  let tEnd = total;
  for (const join of resolveJoins(scene, elementId, selection)) {
    const t = intersectAlong(base.start, u, join.capLine);
    if (t === undefined) continue; // cap parallel to the baseline — nothing to clip
    if (join.end === 'start') tStart = t;
    else tEnd = t;
  }
  // ⚠ Never negative: a pathological cap (a wall shorter than the wall it butts into is half as thick)
  // must not produce a negative length wearing `exact`. Rule 15's own discipline — refuse the absurd
  // number rather than publish it.
  return Math.max(0, tEnd - tStart);
}

/** Where the baseline `start + t·u` meets `cap`, as `t` in mm. `undefined` when they are parallel. */
function intersectAlong(start: V, u: V, cap: CapLine): number | undefined {
  const denom = cross(u, cap.dir);
  if (Math.abs(denom) < EPS) return undefined;
  return cross(sub(cap.point, start), cap.dir) / denom;
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
 *
 * ⚠ **DELIBERATELY NOT OPTION-FILTERED, unlike `resolveJoins` — do not "fix" this asymmetry.** This is the
 * INVALIDATOR, and its two error directions are not symmetric: naming too many walls costs a rebuild that
 * produces identical geometry, while naming too few leaves a stale solid in the document — the silent class
 * (0a's original `#touched` container hole, Entry 33). It is also the conservative choice under a selection
 * this function is not given: an element that is not active under one selection is active under another, and
 * switching options must re-stage the corners on both sides of the switch.
 */
export function wallsJoinedTo(
  scene: Scene,
  selfId: ElementId,
  points: readonly V[],
  segments: readonly Baseline[] = [],
): readonly ElementId[] {
  const ids = new Set<ElementId>();
  const index = indexOf(scene);
  // ⚠ Driven from the QUERY POINTS now, not from every element (Entry 61) — a wall is a candidate only
  // if one of its endpoints shares a cell neighbourhood with one of ours. Same predicate, same answers.
  const candidates = new Map<ElementId, IndexEntry>();
  for (const p of points) for (const e of near9(index.endpoints, p)) candidates.set(e.id, e);
  // ⚠ AND the mid-span edge, reversed: walls whose ENDPOINT lies on one of our segments. Rasterise our
  // own segment and collect the endpoints recorded in those cells.
  for (const seg of segments) {
    eachSegmentCell(seg, (key) => {
      for (const e of index.endpoints.get(key) ?? []) candidates.set(e.id, e);
      // A cell the segment merely clips: its neighbours may hold the endpoint that lies on us.
      const [cx, cy] = key.split(':').map(Number) as [number, number];
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const e of index.endpoints.get(`${cx + dx}:${cy + dy}`) ?? [])
            candidates.set(e.id, e);
    });
  }
  for (const candidate of candidates.values()) {
    if (candidate.id === selfId) continue;
    const b = candidate.base;
    if (points.some((p) => near(b.start, p) || near(b.end, p))) ids.add(candidate.id);
    // ⚠⚠ THE MID-SPAN EDGE (Entry 60). A wall that BUTTS INTO this one rests its cap on this wall's FACE,
    // so it depends on this wall's baseline AND its thickness — thicken the through wall and every
    // partition landing on it must re-stage. Without this the partition keeps a stale solid, which is
    // precisely the silent direction this function's own header warns about (0a's `#touched` hole).
    // ⚠ Note the asymmetry is intentional and matches the geometry: the BUTTING wall depends on the
    // through wall, never the reverse — a butt moves only the wall that stops.
    else if (segments.some((s) => pointOnSegment(b.start, s) || pointOnSegment(b.end, s))) {
      ids.add(candidate.id);
    }
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

/**
 * ⚠ Do two walls MEET AT ALL — at a corner, or with one's end on the other's mid-span (Entry 60)?
 *
 * The widened `core.setJoin` precondition. It has to widen in step with the auto-join: once a T joins
 * automatically, an author needs a way to say *don't* (`resolution:'none'`), and the verb that expresses
 * every other join override is the one that should express this one. **The record itself is unchanged** —
 * `{element, other, resolution}` already keys the junction uniquely, because two straight baselines meet
 * at at most one point, and WHERE they meet is derived from the baselines (recipe-is-truth). No new
 * frozen field; the precondition relaxed, the contract did not move.
 */
export function wallsMeet(a: Element, b: Element): boolean {
  if (wallsShareCorner(a, b)) return true;
  const ba = baselineOf(a);
  const bb = baselineOf(b);
  if (ba === undefined || bb === undefined) return false;
  return (
    pointOnSegment(ba.start, bb) ||
    pointOnSegment(ba.end, bb) ||
    pointOnSegment(bb.start, ba) ||
    pointOnSegment(bb.end, ba)
  );
}
