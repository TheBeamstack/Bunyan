// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * FIXTURE BIM OBJECT TYPES — registered, never hard-coded (domain rule 5).
 *
 * ⚠ WHAT THESE ARE, AND WHAT THEY ARE NOT. The plan says P3 ships the registries "**empty but
 * exercised** by one trivial test type/command" — the *real* MVP types (with their IFC mapping, their
 * quantity hooks and their migrations) are **P5**. These are the exercise: they prove the registry
 * contract can express a composite element, and they give the D29 measurement a realistic building to
 * measure. **They are deliberately in `tests/`, not in a package**, so nobody mistakes them for the
 * shipped types.
 *
 * ⚠ AND THEY ARE THE POINT OF THE EXERCISE IN A SECOND WAY. Every protocol and naming gap this project
 * has ever found was found by *using* the API to build something a building actually has — never by
 * reading the code (five times, and counting). So these types are written the way a building is
 * actually made: a wall is **three layers** (D30), it is placed by a **rigid motion** rather than
 * authored in world coordinates, and its window is cut through **all three layers** in the wall's own
 * frame.
 */

import type {
  BimObjectType,
  BuildContext,
  BuiltPart,
  BuiltVoid,
  SolvedSketch,
  VoidBuildContext,
} from '@bunyan/document';
import { readSketch } from '@bunyan/document';
import type { ParamValue } from '@bunyan/document';
import type { Profile, Vec2 } from '@bunyan/protocol';

/* ================================================================================================
 * WALL — the composite element. THE reason D30 exists.
 * ============================================================================================= */

/**
 * A wall is **blockwork + insulation + plaster**, in order, each with its own material — not a lump.
 *
 * It is authored along its own local +X, with its layers stacked across +Y and its height up +Z; the
 * `placement` puts it in the building. So `y-min` is always the same face of the same layer, no matter
 * where the wall ends up — which is what a window hosted on it depends on.
 */
export const wallType: BimObjectType = {
  id: 'core.wall.v1',
  version: 1,
  label: 'Wall',
  description:
    'A layered wall. Its layer stack comes from its Style (D31), and each layer is a Part (D30).',
  parameterSchema: {
    length: { kind: 'number', label: 'Length', unit: 'mm', required: true, min: 1 },
    height: { kind: 'number', label: 'Height', unit: 'mm', required: true, min: 1 },
  },
  styleSchema: {
    layers: { kind: 'array', label: 'Layer stack', items: { kind: 'object', label: 'Layer' } },
  },
  defaultClassification: { ifcClass: 'IfcWall', loadBearing: false },
  // ⚠ Only for a wall built with NO style. A styled wall takes each part's discipline from its LAYER
  // (D45) — which is the point: the RC core is structural and the plaster on it is not.
  defaultDiscipline: 'architectural',

  async buildGeometry(ctx: BuildContext): Promise<readonly BuiltPart[]> {
    const length = Number(ctx.params['length']);
    const height = Number(ctx.params['height']);
    const layers = ctx.style?.layers ?? [];
    if (layers.length === 0) {
      throw new Error(`wall "${ctx.element.id}" has no style layers — a wall is made of something`);
    }

    const parts: BuiltPart[] = [];
    let offset = 0;
    for (const layer of layers) {
      const nodeId = ctx.nodeId(layer.name);
      const solid = await ctx.geometry.request('makeBox', {
        nodeId,
        dx: length,
        dy: layer.thickness,
        dz: height,
        at: [0, offset, ctx.elevation],
      });
      parts.push({
        name: layer.name,
        materialId: layer.materialId,
        // ⚠ D45 — FROM THE LAYER. The concreter and the plasterer are routed to different work
        // packages on this one wall, and this field is the only thing in the model that can say so.
        discipline: layer.discipline,
        nodeId,
        handle: solid.handle,
        refs: solid.refs,
      });
      offset += layer.thickness;
    }
    return parts;
  },
};

/* ================================================================================================
 * SLAB — the element `makeBox` could not express, and the one that found `extrude` (Entry 12).
 * ============================================================================================= */

/**
 * A floor plate: **a planar boundary + a thickness.** A real one is L-shaped, or five-sided, or has a
 * curved edge — which is why this is an `extrude` of an authored profile and not a box, and why
 * discovering that took a session (Entry 12).
 *
 * Its layers (screed / structure / soffit) stack UP the z-axis, so a slab is composite exactly as a
 * wall is. Same rule, no special case.
 */
export const slabType: BimObjectType = {
  id: 'core.slab.v1',
  version: 1,
  label: 'Slab',
  description:
    'A planar boundary extruded to a thickness. Layered like a wall (screed / structure / soffit).',
  parameterSchema: {
    boundary: {
      kind: 'array',
      label: 'Boundary',
      required: true,
      description: 'Closed polygon [[x,y], …] in mm. The last point joins the first.',
      items: { kind: 'array', label: 'Point', items: { kind: 'number', label: 'mm' } },
    },
  },
  styleSchema: {
    layers: { kind: 'array', label: 'Layer stack', items: { kind: 'object', label: 'Layer' } },
  },
  defaultClassification: { ifcClass: 'IfcSlab', loadBearing: true },
  defaultDiscipline: 'structural',

  async buildGeometry(ctx: BuildContext): Promise<readonly BuiltPart[]> {
    const boundary = ctx.params['boundary'] as readonly (readonly number[])[];
    const layers = ctx.style?.layers ?? [];
    if (boundary.length < 3) throw new Error('a slab boundary needs at least three points');
    if (layers.length === 0) throw new Error(`slab "${ctx.element.id}" has no style layers`);

    const parts: BuiltPart[] = [];
    let z = ctx.elevation;
    for (const layer of layers) {
      const nodeId = ctx.nodeId(layer.name);
      const solid = await ctx.geometry.request('extrude', {
        nodeId,
        profile: polygon(boundary, z),
        height: layer.thickness,
      });
      parts.push({
        name: layer.name,
        materialId: layer.materialId,
        discipline: layer.discipline,
        nodeId,
        handle: solid.handle,
        refs: solid.refs,
      });
      z += layer.thickness;
    }
    return parts;
  },
};

/* ================================================================================================
 * LINEAR MEMBER — D32. **Beam and Column are ONE concept**, and there was no Beam at all.
 * ============================================================================================= */

/**
 * **A Section (D33) swept along an axis.** A column is this pointing up; a beam is this pointing
 * sideways. They were shipped as unrelated ideas — and one of them was not shipped at all, which is
 * how a BIM authoring tool came to have no beam.
 *
 * ⚠ **The kernel cost of fixing that was ZERO** (`extrude` already sweeps a profile along a
 * direction). The reason Beam was missing was never technical.
 *
 * The Section comes from the **Style** — because an engineer assigns one section to a GROUP of columns
 * (Miqdar's `DesignGroup`), and that is exactly what a Style is (D31).
 */
export const linearMemberType: BimObjectType = {
  id: 'core.linearMember.v1',
  version: 1,
  label: 'Beam / Column',
  description:
    'A Section swept along an axis (D32). A column is vertical, a beam is horizontal — ONE concept, two orientations.',
  parameterSchema: {
    length: { kind: 'number', label: 'Length', unit: 'mm', required: true, min: 1 },
    direction: {
      kind: 'enum',
      label: 'Direction',
      required: true,
      options: ['x', 'y', 'z'],
      default: 'z',
      description: 'z = a column, x/y = a beam. The same concept, rotated.',
    },
  },
  styleSchema: {
    sectionId: { kind: 'ref', refTo: 'section', label: 'Section' },
  },
  defaultClassification: { ifcClass: 'IfcColumn', loadBearing: true },
  // ⚠ A LinearMember has ONE part and no layer stack — so its discipline comes from HERE (D45). This is
  // exactly the case `defaultDiscipline` exists for, and it is never inferred from the material: a
  // concrete screed is not structural, and a timber shear wall is.
  defaultDiscipline: 'structural',

  async buildGeometry(ctx: BuildContext): Promise<readonly BuiltPart[]> {
    const length = Number(ctx.params['length']);
    const direction = asText(ctx.params['direction'], 'z');
    const sectionId = ctx.style?.sectionId;
    if (sectionId === undefined) {
      throw new Error(`linear member "${ctx.element.id}" has no Section on its style (D32/D33)`);
    }
    const section = ctx.section(sectionId);
    if (section === undefined) throw new Error(`unknown section "${sectionId}"`);

    // The one part a linear member has. ⚠ A single-solid element is just an element with ONE part —
    // that is the whole of D30's claim to being free.
    const nodeId = ctx.nodeId('structure');
    const materialId = ctx.style?.params?.['materialId'];
    if (typeof materialId !== 'string') {
      throw new Error(`linear member "${ctx.element.id}" has no material on its style`);
    }

    const axis: readonly [number, number, number] =
      direction === 'x' ? [1, 0, 0] : direction === 'y' ? [0, 1, 0] : [0, 0, 1];

    // A circular section is a cylinder; anything else is an extruded profile. Both are exact B-Rep —
    // and the round one is exactly the shape whose quantities the MESH would under-report (which is
    // why `measure` reads `BRepGProp` and not the triangles).
    const solid =
      section.shape === 'circle'
        ? await ctx.geometry.request('makeCylinder', {
            nodeId,
            radius: Number(section.dimensions['radius']),
            height: length,
            at: [0, 0, ctx.elevation],
            axis,
          })
        : await ctx.geometry.request('extrude', {
            nodeId,
            profile: rectangleProfile(
              Number(section.dimensions['width']),
              Number(section.dimensions['depth']),
              ctx.elevation,
              axis,
            ),
            height: length,
            direction: axis,
          });

    return [
      {
        name: 'structure',
        materialId,
        // The Type's own stamp — there is no layer to ask (D45).
        discipline: ctx.defaultDiscipline,
        nodeId,
        handle: solid.handle,
        refs: solid.refs,
      },
    ];
  },
};

/* ================================================================================================
 * OPENING — the archetype of a reference-carrying object, and the reason persistent naming exists.
 * ============================================================================================= */

/**
 * A void subtracted from a host. It names a **face of the host by its `SubShapeRef`** (D1) — a
 * derivation path, never an index — plus a position on that face.
 *
 * ⚠ **ANCHORING IS A DOMAIN DECISION, NOT AN IMPLEMENTATION DETAIL** (`core_logic` §3.6): how the
 * opening repositions when its host is RESIZED. `fixed` holds an absolute offset from the face's
 * datum corner (the safe default: growing the wall does not move the window). `centered` stays centred
 * on the face. This is the domain-level down-payment on the constraint solver the product grows toward.
 *
 * ⚠ And the void is cut through **every layer of the host** (the engine does that, not this type). A
 * window that pierced only the blockwork and left the plaster intact would be an obvious, embarrassing
 * bug — and it is the bug a single-solid model could not even have expressed.
 */
export const openingType: BimObjectType = {
  id: 'core.opening.v1',
  version: 1,
  label: 'Opening',
  description: 'A void cut through every layer of its host, anchored to a named face of it (D1).',
  parameterSchema: {
    width: { kind: 'number', label: 'Width', unit: 'mm', required: true, min: 1 },
    height: { kind: 'number', label: 'Height', unit: 'mm', required: true, min: 1 },
    anchor: {
      kind: 'enum',
      label: 'Anchoring',
      options: ['fixed', 'centered'],
      default: 'fixed',
      description: 'How it repositions when the host is resized (core_logic §3.6).',
    },
    offsetU: { kind: 'number', label: 'Offset along the face', unit: 'mm', default: 0 },
    offsetV: { kind: 'number', label: 'Offset up the face', unit: 'mm', default: 0 },
  },
  // ⚠ AN OPENING HAS NO PARTS ⇒ NO DISCIPLINE, and there is nothing to do but not require one (D45).
  // A void is not built by anybody's trade — it is the absence of building.
  defaultClassification: { ifcClass: 'IfcOpeningElement', loadBearing: false },

  async buildVoid(ctx: VoidBuildContext): Promise<BuiltVoid> {
    const width = Number(ctx.params['width']);
    const height = Number(ctx.params['height']);
    const anchor = asText(ctx.params['anchor'], 'fixed');
    const { min, max } = ctx.hostFace.bounds;

    // ⚠ TWO KINDS OF HOST FACE, AND THEY NEED DIFFERENT DATA. A PLANAR AXIS-ALIGNED face (a wall/slab/
    // rectangular-beam face — the whole MVP so far) collapses to a plane in exactly one axis, and its
    // bounding box says everything: where it is, how big it is, which axis is flat. A CURVED face — a
    // round column's or pipe's single wrap-around `lateral` face — does NOT: its bbox equals the whole
    // solid's, so it says nothing about the surface. For that we need `hostFace.frame`, read from the
    // B-Rep (Entry 30, `tests/gap-void-curved-face.test.ts`).
    const TOL = 1e-6;
    const flatAxes = [0, 1, 2].filter(
      (axis) => Math.abs((max[axis] ?? 0) - (min[axis] ?? 0)) < TOL,
    );

    if (flatAxes.length !== 1) {
      // ===== CURVED / OBLIQUE FACE — project the cut along the surface frame. =====
      // The bbox cannot place a void here; the frame can. Start 100 mm OUTSIDE the face (along the
      // OUTWARD normal) and sweep a width×height rectangle INWARD, deep enough to clear the whole host —
      // an oriented "duct" that goes THROUGH a round column's side instead of a pocket down its axis.
      const { origin, normal, uAxis, vAxis } = ctx.hostFace.frame;
      const offU = anchor === 'centered' ? 0 : Number(ctx.params['offsetU']);
      const offV = anchor === 'centered' ? 0 : Number(ctx.params['offsetV']);
      const inward: [number, number, number] = [-normal[0], -normal[1], -normal[2]];
      // The cut's start plane: on the face (+ any offset along the tangents), then pulled 100 mm out.
      const start: [number, number, number] = [
        origin[0] + offU * uAxis[0] + offV * vAxis[0] + 100 * normal[0],
        origin[1] + offU * uAxis[1] + offV * vAxis[1] + 100 * normal[1],
        origin[2] + offU * uAxis[2] + offV * vAxis[2] + 100 * normal[2],
      ];
      // Sweep far enough to clear the whole host from any entry point (the bbox diagonal is a safe upper
      // bound); excess is outside the solid, so the boolean removes nothing extra — a clean through-cut.
      const span =
        Math.hypot(
          (max[0] ?? 0) - (min[0] ?? 0),
          (max[1] ?? 0) - (min[1] ?? 0),
          (max[2] ?? 0) - (min[2] ?? 0),
        ) + 200;
      const solid = await ctx.geometry.request('extrude', {
        nodeId: ctx.element.id,
        profile: {
          plane: { origin: start, normal: inward, xAxis: [...uAxis] as [number, number, number] },
          start: [-width / 2, -height / 2],
          segments: [
            { kind: 'line', to: [width / 2, -height / 2] },
            { kind: 'line', to: [width / 2, height / 2] },
            { kind: 'line', to: [-width / 2, height / 2] },
            { kind: 'line', to: [-width / 2, -height / 2] },
          ],
        },
        height: span,
        direction: inward,
      });
      return { handle: solid.handle };
    }

    // ===== PLANAR AXIS-ALIGNED FACE — the wall/slab/rectangular-beam case. BYTE-IDENTICAL to before. =====
    const { inward } = ctx.hostFace;

    // ⚠ THE NORMAL AXIS COMES FROM `inward`, NOT FROM A GUESS. A face bbox says which axis is flat, but
    // NOT which side the host is on — so we take the engine's `inward` vector (which does know) and read
    // both the axis and the sign off it. (Found by modelling: guessing "+normal from min" cut the wrong
    // way for every max-side face — a window on a wall's exterior, a stairwell in a slab. See
    // `tests/gap-void-inward-direction.test.ts`.)
    const normalAxis =
      Math.abs(inward[0]) >= Math.abs(inward[1]) && Math.abs(inward[0]) >= Math.abs(inward[2])
        ? 0
        : Math.abs(inward[1]) >= Math.abs(inward[2])
          ? 1
          : 2;
    const inwardSign = inward[normalAxis] >= 0 ? 1 : -1;
    // Of the two axes the face DOES span, the vertical one (z, if present) is "up the face".
    const inPlane = [0, 1, 2].filter((axis) => axis !== normalAxis);
    const vAxis = inPlane.includes(2) ? 2 : (inPlane[1] ?? 1);
    const uAxis = inPlane.find((axis) => axis !== vAxis) ?? 0;

    const u =
      anchor === 'centered'
        ? (min[uAxis]! + max[uAxis]!) / 2 - width / 2
        : min[uAxis]! + Number(ctx.params['offsetU']);
    const v =
      anchor === 'centered'
        ? (min[vAxis]! + max[vAxis]!) / 2 - height / 2
        : min[vAxis]! + Number(ctx.params['offsetV']);

    // ⚠ Deep enough to pass through EVERY layer of the host, with margin on both sides. A void that
    // merely touched the far face would leave a skin of plaster over the window — a "tangential"
    // boolean, and the classic way to get an invalid solid out of a valid-looking operation.
    const depth = totalThickness(ctx) + 200;

    // The face plane sits at `faceCoord` along the normal axis. Start the cut 100 mm OUTSIDE the host
    // (against `inward`) and run it `depth` INTO the host (along `inward`) — direction-agnostic, so it
    // is right whichever side's face was named. `makeBox` wants a min corner + positive sizes.
    const faceCoord = min[normalAxis];
    const near = faceCoord - 100 * inwardSign;
    const far = faceCoord + depth * inwardSign;

    const at: [number, number, number] = [0, 0, 0];
    at[uAxis] = u;
    at[vAxis] = v;
    at[normalAxis] = Math.min(near, far);

    const size: [number, number, number] = [0, 0, 0];
    size[uAxis] = width;
    size[vAxis] = height;
    size[normalAxis] = Math.abs(far - near);

    const solid = await ctx.geometry.request('makeBox', {
      nodeId: ctx.element.id,
      dx: size[0],
      dy: size[1],
      dz: size[2],
      at,
    });
    return { handle: solid.handle };
  },
};

/**
 * How thick the HOST is — every layer of it. ⚠ `ctx.hostStyle`, never `ctx.style`: the opening's own
 * style (it has none) would say zero, and a void 0 mm deep cuts nothing at all.
 */
function totalThickness(ctx: VoidBuildContext): number {
  const layers = ctx.hostStyle?.layers ?? [];
  const sum = layers.reduce((total, layer) => total + layer.thickness, 0);
  return sum > 0 ? sum : 400;
}

/* ================================================================================================
 * Helpers
 * ============================================================================================= */

/** ⚠ Not `String(v)`: a `ParamValue` may be an object, and `String({})` is `"[object Object]"`. */
function asText(value: ParamValue | undefined, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** A closed polygon in the z = `z` plane. */
function polygon(points: readonly (readonly number[])[], z: number): Profile {
  const first = points[0]!;
  const segments = points.slice(1).map((point) => ({
    kind: 'line' as const,
    to: [point[0]!, point[1]!] as Vec2,
  }));
  segments.push({ kind: 'line' as const, to: [first[0]!, first[1]!] as Vec2 });
  return {
    plane: { origin: [0, 0, z], normal: [0, 0, 1], xAxis: [1, 0, 0] },
    start: [first[0]!, first[1]!] as Vec2,
    segments,
  };
}

/** A `width` × `depth` rectangle, centred on the sweep axis — the section of a beam or a column. */
function rectangleProfile(
  width: number,
  depth: number,
  elevation: number,
  axis: readonly [number, number, number],
): Profile {
  const origin: [number, number, number] = [0, 0, axis[2] === 1 ? elevation : elevation];
  // The profile plane is perpendicular to the sweep axis; `xAxis` fixes its 2D frame.
  const xAxis: [number, number, number] = axis[2] === 1 ? [1, 0, 0] : [0, 0, 1];
  const halfW = width / 2;
  const halfD = depth / 2;
  return {
    plane: { origin, normal: [...axis] as [number, number, number], xAxis },
    start: [-halfW, -halfD],
    segments: [
      { kind: 'line', to: [halfW, -halfD] },
      { kind: 'line', to: [halfW, halfD] },
      { kind: 'line', to: [-halfW, halfD] },
      { kind: 'line', to: [-halfW, -halfD] },
    ],
  };
}

/* ================================================================================================
 * CONSTRAINED MEMBER — the fixture that exercises the ACTIVE-DATUM inputs (D50 step 0b).
 * ============================================================================================= */

/**
 * A single-solid vertical member whose GEOMETRY FOLLOWS ITS CONSTRAINTS, not just its params — the
 * fixture that proves the 0b `BuildContext` contract (base/top Levels, grid placement) the way the real
 * Wall (P5 step 3) will use it.
 *
 * - Its **Z extent is derived**: bottom = `baseElevation` (a Level + offset), top = `topElevation` —
 *   height is `top − base`, never a param (D52). With no base/top constraint it falls back to the
 *   element's own `elevation` + a `height` param, so it stays a perfectly ordinary member.
 * - Its **XY placement follows the grid**: it is centred on `gridPoint` (the intersection of its `grid`
 *   constraints) when it has one, else on the world origin.
 *
 * A parapet is `top` + 1100; a footing is `base` − 300 — expressible because the constraint carries an
 * `offset` (P5_step0b_design.md §2, Finding 1).
 */
export const constrainedMemberType: BimObjectType = {
  id: 'core.constrainedMember.v1',
  version: 1,
  label: 'Constrained member',
  description:
    'A vertical member spanning base→top Levels, placed on a grid intersection (D50 step 0b).',
  parameterSchema: {
    width: { kind: 'number', label: 'Width', unit: 'mm', required: true, min: 1 },
    depth: { kind: 'number', label: 'Depth', unit: 'mm', required: true, min: 1 },
    // Fallback height, used ONLY when the member has no top constraint (an un-constrained member).
    height: { kind: 'number', label: 'Height', unit: 'mm', min: 1 },
  },
  defaultClassification: { ifcClass: 'IfcColumn', loadBearing: true },
  defaultDiscipline: 'structural',

  async buildGeometry(ctx: BuildContext): Promise<readonly BuiltPart[]> {
    const width = Number(ctx.params['width']);
    const depth = Number(ctx.params['depth']);
    // ⚠ HEIGHT IS DERIVED FROM THE DATUMS (D52) — a param only as the un-constrained fallback.
    const base = ctx.baseElevation ?? ctx.elevation;
    const top = ctx.topElevation ?? base + Number(ctx.params['height'] ?? 0);
    const height = top - base;
    if (height <= 0) {
      throw new Error(
        `constrained member "${ctx.element.id}" has non-positive height (base ${base}, top ${top})`,
      );
    }
    const [cx, cy] = ctx.gridPoint ?? [0, 0];
    const nodeId = ctx.nodeId('member');
    const solid = await ctx.geometry.request('makeBox', {
      nodeId,
      dx: width,
      dy: depth,
      dz: height,
      // centred on the grid intersection in XY, sitting on the base datum in Z.
      at: [cx - width / 2, cy - depth / 2, base],
    });
    return [
      {
        name: 'member',
        materialId: '',
        discipline: 'structural',
        nodeId,
        handle: solid.handle,
        refs: solid.refs,
      },
    ];
  },
};

/* ================================================================================================
 * SKETCH PROFILE — the fixture that exercises the SKETCH SOLVER (D50 §0d). Its profile is a CONSTRAINED
 * 2D sketch: the Type hands `ctx.solveSketch` its rough points + authored segments, the engine attaches
 * the element's `SketchConstraint`s and runs planegcs, and the SOLVED coordinates are extruded to a solid.
 *
 * ⚠ THE WHOLE POINT OF THE PIPELINE, IN ONE TYPE: `solve → Profile → extrude`. `lateral.k` is the face
 * swept from authored SEGMENT k (D26) — so a re-solve after a dimensional edit moves the geometry while a
 * window hosted on `lateral.2` stays on `lateral.2`. That is the sketch analogue of 0b's rebind-a-datum.
 * ============================================================================================= */
export const sketchProfileType: BimObjectType = {
  id: 'core.sketchProfile.v1',
  version: 1,
  label: 'Sketch profile',
  description:
    'A solved 2D sketch extruded to a thickness — the 0d pipeline (solve → profile → extrude).',
  parameterSchema: {
    sketch: {
      kind: 'object',
      label: 'Sketch',
      required: true,
      description:
        '{ points:[{id,x,y,fixed?}], segments:[{from,to}] } — geometry lives in params (Q1=A).',
    },
    thickness: { kind: 'number', label: 'Thickness', unit: 'mm', required: true, min: 1 },
  },
  defaultClassification: { ifcClass: 'IfcSlab', loadBearing: false },
  defaultDiscipline: 'architectural',

  async buildGeometry(ctx: BuildContext): Promise<readonly BuiltPart[]> {
    const sketch = readSketch(ctx.params);
    if (sketch === undefined) {
      throw new Error(`sketch element "${ctx.element.id}" has no sketch in its params`);
    }
    const thickness = Number(ctx.params['thickness']);
    // ⚠ SOLVE FIRST. The engine attaches this element's SketchConstraints and runs planegcs. An
    // over-constrained sketch THROWS here ⇒ a `geometry` failure ⇒ D42 rejects the command that made it.
    const solved = ctx.solveSketch(sketch);
    const nodeId = ctx.nodeId('profile');
    const solid = await ctx.geometry.request('extrude', {
      nodeId,
      profile: profileFromSketch(solved, ctx.elevation),
      height: thickness,
    });
    return [
      {
        name: 'profile',
        materialId: '',
        discipline: ctx.defaultDiscipline,
        nodeId,
        handle: solid.handle,
        refs: solid.refs,
      },
    ];
  },
};

/** A closed `Profile` from a SOLVED sketch, in AUTHORED segment order — segment k becomes `lateral.k` (D26). */
function profileFromSketch(solved: SolvedSketch, z: number): Profile {
  const segments = solved.segments;
  if (segments.length < 3) throw new Error('a sketch profile needs at least three segments');
  const at = (pointId: string): Vec2 => {
    const p = solved.points[pointId];
    if (p === undefined) throw new Error(`sketch profile references unknown point "${pointId}"`);
    return [p[0], p[1]];
  };
  return {
    plane: { origin: [0, 0, z], normal: [0, 0, 1], xAxis: [1, 0, 0] },
    start: at(segments[0]!.from),
    segments: segments.map((s) => ({ kind: 'line' as const, to: at(s.to) })),
  };
}

export const FIXTURE_TYPES = [
  wallType,
  slabType,
  linearMemberType,
  openingType,
  constrainedMemberType,
  sketchProfileType,
];
