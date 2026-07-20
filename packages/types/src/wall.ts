/**
 * THE WALL — the real, shipped D52 baseline wall (P5 step 3, pulled forward with 0c per the owner's Q4).
 *
 * ⚠ THIS IS THE D52 SHAPE, AND IT IS DIFFERENT FROM THE LEGACY `length`/`height` FIXTURE. A wall IS its
 * baseline `{start, end}` in the Level plane; its length is DERIVED, and its height is derived from its
 * base/top Level datums (0b) — a param only as the un-constrained fallback. This is the only
 * parameterisation on which grid-hosting (0b) and wall-to-wall joins (0c) are expressible at all.
 *
 * ⚠⚠ IT BUILDS AS AN EXTRUDED PLAN POLYGON, NOT A BOX — and that is the whole anti-fuse mechanism (§4h,
 * `P5_step0c_design.md` §1). Each layer is a quad in the Level plane, authored in a FIXED segment order:
 *
 *     start-cap (lateral.0) → a-side (lateral.1) → end-cap (lateral.2) → b-side (lateral.3)
 *
 * The two SIDE faces (lateral.1 / lateral.3) are where windows are hosted. A join (auto-miter or an
 * override, delivered as `ctx.joins`) reshapes ONLY the CAP segments (0 / 2) — the sides keep their
 * authored index, so their `SubShapeRef` tokens are byte-identical across any join edit (D26), and every
 * hosted opening survives. A join NEVER fuses two elements; it only moves this wall's own cap.
 */

import type { BimObjectType, BuildContext, BuiltPart, CapLine, Discipline } from '@bunyan/document';
import type { Profile, Vec2 } from '@bunyan/protocol';

/** A layer to build: from the style stack (D30), or a single synthetic layer from a `thickness` param. */
interface LayerSpec {
  readonly name: string;
  readonly thickness: number;
  readonly materialId: string;
  readonly discipline: Discipline;
}

export const wallType: BimObjectType = {
  id: 'core.wall',
  version: 1,
  label: 'Wall',
  description:
    'A baseline wall (D52): authored by its {start,end}; length derived; height from its base/top Level datums (0b); corners auto-mitre and never fuse (0c).',
  parameterSchema: {
    start: {
      kind: 'array',
      label: 'Start',
      required: true,
      description: '[x, y] baseline start in the Level plane, mm.',
      items: { kind: 'number', label: 'mm' },
    },
    end: {
      kind: 'array',
      label: 'End',
      required: true,
      description: '[x, y] baseline end in the Level plane, mm.',
      items: { kind: 'number', label: 'mm' },
    },
    // Fallback ONLY: used when the wall has no top constraint (an un-constrained wall). A constrained wall
    // derives its height from base/top Levels (D52) and never reads this.
    height: { kind: 'number', label: 'Height', unit: 'mm', min: 1 },
    // Fallback ONLY: used when the wall has no style. A styled wall's thickness IS its layer stack (D30).
    thickness: { kind: 'number', label: 'Thickness', unit: 'mm', min: 1 },
  },
  styleSchema: {
    layers: { kind: 'array', label: 'Layer stack', items: { kind: 'object', label: 'Layer' } },
  },
  defaultClassification: { ifcClass: 'IfcWall', loadBearing: false },
  defaultDiscipline: 'architectural',

  async buildGeometry(ctx: BuildContext): Promise<readonly BuiltPart[]> {
    const start = readVec2(ctx.params['start']);
    const end = readVec2(ctx.params['end']);
    if (start === undefined || end === undefined) {
      throw new Error(`wall "${ctx.element.id}" needs [x,y] start and end baseline points (D52)`);
    }
    const dir = unit(sub(end, start));
    if (dir === undefined) throw new Error(`wall "${ctx.element.id}" has a zero-length baseline`);
    const n: Vec2 = [-dir[1], dir[0]]; // left normal — the across-thickness axis

    // ⚠ HEIGHT IS DERIVED FROM THE DATUMS (D52). base = the base Level (0b), else the wall's own Level;
    // top = the top Level, else base + the fallback `height` param. Never a compound of both.
    const base = ctx.baseElevation ?? ctx.elevation;
    const top = ctx.topElevation ?? base + Number(ctx.params['height'] ?? 0);
    const height = top - base;
    if (height <= 0) {
      throw new Error(
        `wall "${ctx.element.id}" has non-positive height (base ${base}, top ${top})`,
      );
    }

    const layers = layersOf(ctx);
    const total = layers.reduce((s, l) => s + l.thickness, 0);

    // The two cap lines: an override/auto-miter from `ctx.joins`, else the plain perpendicular cap.
    const startCap = capFor(ctx, 'start', start, n);
    const endCap = capFor(ctx, 'end', end, n);

    const parts: BuiltPart[] = [];
    let offset = -total / 2; // stack layers across the thickness, centred on the baseline
    for (const layer of layers) {
      const a = offset; // this layer's near side-line offset (along n)
      const b = offset + layer.thickness; // its far side-line offset
      offset = b;

      // Each side-line runs parallel to the baseline at its offset; clip both to the two cap lines.
      const aLine: CapLine = { point: add(start, scale(n, a)), dir };
      const bLine: CapLine = { point: add(start, scale(n, b)), dir };
      const bStart = intersect(bLine, startCap, ctx.element.id);
      const aStart = intersect(aLine, startCap, ctx.element.id);
      const aEnd = intersect(aLine, endCap, ctx.element.id);
      const bEnd = intersect(bLine, endCap, ctx.element.id);

      const nodeId = ctx.nodeId(layer.name);
      const solid = await ctx.geometry.request('extrude', {
        nodeId,
        // ⚠ AUTHORED SEGMENT ORDER IS THE CONTRACT (D26): start-cap, a-side, end-cap, b-side. The sides
        // (segments 1, 3) are the window-hosting faces; a join only ever moves the caps (0, 2).
        profile: quad(bStart, aStart, aEnd, bEnd, base),
        height,
      });
      parts.push({
        name: layer.name,
        materialId: layer.materialId,
        discipline: layer.discipline, // D45 — from the layer, so an RC core and its plaster route differently
        nodeId,
        handle: solid.handle,
        refs: solid.refs,
      });
    }
    return parts;
  },
};

/* ------------------------------------------------------------------------------------------------
 * Helpers — plane geometry + reading the recipe. Kept local: a Type is a pure function of its context.
 * ---------------------------------------------------------------------------------------------- */

const sub = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
const add = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
const scale = (a: Vec2, s: number): Vec2 => [a[0] * s, a[1] * s];
const cross = (a: Vec2, b: Vec2): number => a[0] * b[1] - a[1] * b[0];

function unit(a: Vec2): Vec2 | undefined {
  const l = Math.hypot(a[0], a[1]);
  return l < 1e-9 ? undefined : [a[0] / l, a[1] / l];
}

function readVec2(value: unknown): Vec2 | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const x: unknown = value[0];
  const y: unknown = value[1];
  return typeof x === 'number' && typeof y === 'number' ? [x, y] : undefined;
}

/** The cap line for one baseline end: a resolved join (auto-miter / override) if present, else the plain
 * perpendicular cap through the endpoint. */
function capFor(ctx: BuildContext, end: 'start' | 'end', point: Vec2, normal: Vec2): CapLine {
  const join = (ctx.joins ?? []).find((j) => j.end === end);
  return join?.capLine ?? { point, dir: normal };
}

/** Intersection of two lines (each a point + direction). Throws (⇒ a `geometry` failure, D42) if parallel. */
function intersect(l1: CapLine, l2: CapLine, elementId: string): Vec2 {
  const d1: Vec2 = [l1.dir[0], l1.dir[1]];
  const d2: Vec2 = [l2.dir[0], l2.dir[1]];
  const denom = cross(d1, d2);
  if (Math.abs(denom) < 1e-9) {
    throw new Error(
      `wall "${elementId}": a cap line is parallel to a side — cannot place the corner`,
    );
  }
  const p1: Vec2 = [l1.point[0], l1.point[1]];
  const p2: Vec2 = [l2.point[0], l2.point[1]];
  const t = cross(sub(p2, p1), d2) / denom;
  return add(p1, scale(d1, t));
}

/** A closed quad in the z = `z` plane, authored in the fixed segment order (D26). */
function quad(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, z: number): Profile {
  return {
    plane: { origin: [0, 0, z], normal: [0, 0, 1], xAxis: [1, 0, 0] },
    start: p0,
    segments: [
      { kind: 'line', to: p1 }, // seg0 — start-cap
      { kind: 'line', to: p2 }, // seg1 — a-side (window host, lateral.1)
      { kind: 'line', to: p3 }, // seg2 — end-cap
      { kind: 'line', to: p0 }, // seg3 — b-side (window host, lateral.3)
    ],
  };
}

/** The layers to build: the style stack (D30), else one synthetic layer from a `thickness` param. */
function layersOf(ctx: BuildContext): readonly LayerSpec[] {
  const styleLayers = ctx.style?.layers ?? [];
  if (styleLayers.length > 0) {
    return styleLayers.map((l) => ({
      name: l.name,
      thickness: l.thickness,
      materialId: l.materialId,
      discipline: l.discipline,
    }));
  }
  const thickness = Number(ctx.params['thickness'] ?? 0);
  if (thickness > 0) {
    return [{ name: 'wall', thickness, materialId: '', discipline: ctx.defaultDiscipline }];
  }
  throw new Error(`wall "${ctx.element.id}" has neither style layers nor a thickness param (D30)`);
}
