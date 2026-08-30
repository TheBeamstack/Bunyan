// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE OPENING — the real, shipped hosted element (P5 step 5), and the type that resolves Freeze-Gate ⓙ.
 *
 * ⚠⚠ A HOSTED ELEMENT IS NOT ONLY A HOLE. Before ⓙ the build engine called a hosted type's `buildVoid`
 * ONLY, and pushed `parts: []` — so a "door" was a hole with no leaf, no frame, no ironmongery, which
 * every Revit/ArchiCAD door has. This type is the proof of the resolved contract: it provides BOTH
 *
 *   - `buildVoid`  — the rectangular hole cut through EVERY layer of the host wall, and
 *   - `buildLeaf`  — the door's own solids (a `leaf` panel + a `frame` lining), each a Part with its own
 *                    Material, placed IN that hole. These become the opening element's own `parts`, so
 *                    `quantities()` measures the door per part, per material (D30/D45) — a door schedules
 *                    its own leaf timber and frame hardwood, which a hole never could.
 *
 * ⚠ BOTH HALVES POSITION FROM `hostFace.frame` (origin + outward normal + two in-plane tangents, read from
 * the B-Rep surface — Entry 30), so the leaf lands exactly in the hole whatever the wall's orientation: a
 * wall running NE has an oblique side face, and a bbox cannot place anything on it, but the frame can. The
 * hole and the leaf share ONE convention (`offsetU` from the wall START, `offsetV` from the face centre —
 * Revit's model, owner-ruled 2026-07-21), so they cannot drift apart AND a join never moves the door.
 *
 * ⚠ IT HAS `buildLeaf`, NOT `buildGeometry` — and that is the contract, not a detail. A door is a solid
 * ONLY when hosted (it builds in its wall's opening frame); an un-hosted door is correctly `unbuildable`,
 * because a door with no wall is not a thing. `buildGeometry` means "I stand on my own"; a door does not.
 */

import type { BimObjectType, BuiltPart, BuiltVoid, VoidBuildContext } from '@bunyan/document';
import type { Profile, Vec2 } from '@bunyan/protocol';
import { facesWithRoles } from './exposed.js';

type Vec3 = readonly [number, number, number];

export const openingType: BimObjectType = {
  id: 'core.opening',
  version: 1,
  label: 'Door',
  description:
    'A hosted opening (D1) that cuts a hole through every layer of its host AND builds a leaf + frame in it (ⓙ).',
  parameterSchema: {
    width: { kind: 'number', label: 'Width', unit: 'mm', required: true, min: 1 },
    height: { kind: 'number', label: 'Height', unit: 'mm', required: true, min: 1 },
    // ⚠ REVIT'S MODEL (owner-ruled 2026-07-21): `offsetU` is the door centre's distance FROM THE HOST WALL'S
    // START, measured along the wall — NOT from the (join-mobile) face centre, so a join/resize never moves
    // the door (tests/opening-join-drift). The void and the leaf share this one convention, so they never
    // drift apart. `offsetV` is a sill/head offset from the face centre; `0` = vertically centred.
    offsetU: { kind: 'number', label: 'Offset from the wall start', unit: 'mm', default: 0 },
    offsetV: { kind: 'number', label: 'Offset up the face', unit: 'mm', default: 0 },
    // The door's OWN solids. Absent leaf material ⇒ the leaf still builds; its mass is simply unmeasurable
    // (D45 — omitted, never zeroed), exactly as for a wall layer with an unresolved material.
    leafThickness: { kind: 'number', label: 'Leaf thickness', unit: 'mm', default: 40, min: 1 },
    frameWidth: { kind: 'number', label: 'Frame face width', unit: 'mm', default: 50, min: 1 },
    leafMaterialId: { kind: 'ref', refTo: 'material', label: 'Leaf material' },
    frameMaterialId: { kind: 'ref', refTo: 'material', label: 'Frame material' },
  },
  // ⚠ A hosted element takes each part's discipline from `defaultDiscipline` — a door has no layer stack.
  // A leaf and a frame are both the architect's, never the engineer's (D45).
  defaultClassification: { ifcClass: 'IfcDoor', loadBearing: false },
  defaultDiscipline: 'architectural',

  async buildVoid(ctx: VoidBuildContext): Promise<BuiltVoid> {
    const { width, height } = readSize(ctx);
    const { centre, normal, u } = faceBasis(ctx);
    const inward: Vec3 = [-normal[0], -normal[1], -normal[2]];

    // Start the cut 100 mm OUTSIDE the face and sweep INWARD far enough to clear the whole host — excess
    // sits outside the solid, so the boolean removes nothing extra (a clean through-cut, never a tangency).
    const start = shift(centre, normal, 100);
    const span = hostSpan(ctx) + 200;
    const solid = await ctx.geometry.request('extrude', {
      nodeId: ctx.element.id,
      profile: rect(start, inward, u, width, height),
      height: span,
      direction: inward,
    });
    return { handle: solid.handle };
  },

  async buildLeaf(ctx: VoidBuildContext): Promise<readonly BuiltPart[]> {
    const { width, height } = readSize(ctx);
    const leafThickness = num(ctx.params['leafThickness'], 40);
    const frameWidth = num(ctx.params['frameWidth'], 50);
    const leafMaterialId = str(ctx.params['leafMaterialId']);
    const frameMaterialId = str(ctx.params['frameMaterialId']);

    const { centre, normal, u } = faceBasis(ctx);
    const inward: Vec3 = [-normal[0], -normal[1], -normal[2]];
    const thickness = hostSpan(ctx); // the wall's own thickness — the frame lines the full depth of it

    const leafW = Math.max(width - 2 * frameWidth, 1);
    const leafH = Math.max(height - 2 * frameWidth, 1);

    // ---- THE LEAF: one thin panel, centred in the wall's thickness and in the opening. ---------------
    const leafMid = shift(centre, inward, thickness / 2 - leafThickness / 2);
    const leafNode = ctx.nodeId('leaf');
    const leaf = await ctx.geometry.request('extrude', {
      nodeId: leafNode,
      profile: rect(leafMid, inward, u, leafW, leafH),
      height: leafThickness,
      direction: inward,
    });

    // ---- THE FRAME: a lining filling the perimeter of the hole, the full depth of the wall. ----------
    // ⚠ TWO OPS ⇒ `ctx.discard`, DECLARED BEFORE THE BOOLEAN. A picture-frame lining is (outer − inner);
    // both boxes are intermediates that must be freed, and — per the contract — they are declared while
    // still valid operands (a refusal must not leak them: the handle stays usable after `discard`).
    // The OUTER box is exactly the frame's extent (flush, full wall depth). The INNER cutter is 1 mm proud
    // at each end, so its end-caps never fall coplanar with the outer's — a clean through-cut, no tangency.
    const outer = await ctx.geometry.request('extrude', {
      nodeId: `${ctx.element.id}.frame:outer`,
      profile: rect(centre, inward, u, width, height),
      height: thickness,
      direction: inward,
    });
    const inner = await ctx.geometry.request('extrude', {
      nodeId: `${ctx.element.id}.frame:inner`,
      profile: rect(shift(centre, normal, 1), inward, u, leafW, leafH),
      height: thickness + 2,
      direction: inward,
    });
    ctx.discard(outer.handle);
    ctx.discard(inner.handle);
    const frameNode = ctx.nodeId('frame');
    const frame = await ctx.geometry.request('boolean', {
      nodeId: frameNode,
      kind: 'cut',
      a: outer.handle,
      b: inner.handle,
    });

    return [
      {
        name: 'leaf',
        materialId: leafMaterialId,
        discipline: ctx.defaultDiscipline,
        nodeId: leafNode,
        handle: leaf.handle,
        refs: leaf.refs,
        // ⚠⚠ WHICH FACES A TRADE BILLS (D72, domain rule 15; the owed declaration, 2026-07-27). The leaf
        // is a thin panel extruded ALONG the wall's inward normal, so its two door-sized faces are the
        // extrude's CAPS — the pair a painter rolls. Its four `lateral.k` edges sit inside the frame's
        // reveal with a leaf-to-lining gap, are a surface of nothing, and are not billed. Measured: the
        // undeclared whole solid reported 3.4240 m² against 3.2000 m² of door.
        exposedRefs: facesWithRoles(leaf.refs, ['cap-start', 'cap-end']),
      },
      {
        name: 'frame',
        materialId: frameMaterialId,
        discipline: ctx.defaultDiscipline,
        nodeId: frameNode,
        handle: frame.handle,
        refs: frame.refs,
        // ⚠⚠ THE LINING YOU CAN SEE, AND IT NEEDS THE `node` QUALIFIER TO SAY SO. A frame is
        // `outer − inner`, so it owns `lateral.k` twice: the OUTER set is buried in the wall's opening
        // (the hole's reveal presses against it) and the INNER set is the visible lining beside the
        // leaf. Matching the role alone would return whichever the canonical order put first and bill
        // 1.20 m² of buried surface. The two `cap-*` faces are the flat rings showing on each side of
        // the wall — the architrave face. Measured: 2.9000 m² undeclared against 1.7000 m² visible.
        exposedRefs: [
          ...facesWithRoles(frame.refs, ['lateral.0', 'lateral.1', 'lateral.2', 'lateral.3'], {
            node: `${ctx.element.id}.frame:inner`,
          }),
          ...facesWithRoles(frame.refs, ['cap-start', 'cap-end']),
        ],
      },
    ];
  },
};

/* ------------------------------------------------------------------------------------------------
 * Helpers — plane geometry off the host face frame. A Type is a pure function of its context.
 * ---------------------------------------------------------------------------------------------- */

function readSize(ctx: VoidBuildContext): { readonly width: number; readonly height: number } {
  const width = num(ctx.params['width'], 0);
  const height = num(ctx.params['height'], 0);
  if (width <= 0 || height <= 0) {
    throw new Error(`opening "${ctx.element.id}" needs a positive width and height`);
  }
  return { width, height };
}

/** The opening's local basis on the host face: the CENTRE, the outward normal, and the two in-plane axes —
 * every solid is placed in this one frame, so the hole and the leaf cannot drift.
 *
 * ⚠ REVIT'S MODEL (owner-ruled 2026-07-21): `offsetU` is measured from the HOST WALL'S START along the face,
 * not from the face's parametric centre. A mitre/join/resize extends the built face and moves its centre,
 * which silently relocated the door (measured 50 mm, `tests/opening-join-drift`). The wall's {start,end}
 * baseline is a RECIPE value a join never touches, so anchoring to it is stable — and the frozen
 * `VoidBuildContext` already carries it (`hostParams`), so this needs no frozen-contract change. A host with
 * no baseline (a slab/column face) has no start to anchor to ⇒ the face centre, exactly as before. */
function faceBasis(ctx: VoidBuildContext): {
  readonly centre: Vec3;
  readonly normal: Vec3;
  readonly u: Vec3;
} {
  const { origin, normal, uAxis, vAxis } = ctx.hostFace.frame;
  const offU = num(ctx.params['offsetU'], 0);
  const offV = num(ctx.params['offsetV'], 0);

  // Orient u to point start→end (whatever sign OCCT gave the face parametrisation), then anchor at the wall
  // start. Both are derived from the host recipe (`hostParams`), so the anchor is stable across joins/resizes.
  const start = readVec2(ctx.hostParams['start']);
  const end = readVec2(ctx.hostParams['end']);
  let u: Vec3 = uAxis;
  let anchor: Vec3 = origin;
  if (start !== undefined) {
    if (end !== undefined && (end[0] - start[0]) * uAxis[0] + (end[1] - start[1]) * uAxis[1] < 0) {
      u = [-uAxis[0], -uAxis[1], -uAxis[2]];
    }
    // Foot of the wall start on the u-axis through the frame origin (the face is vertical ⇒ z is immaterial).
    const du = (start[0] - origin[0]) * u[0] + (start[1] - origin[1]) * u[1];
    anchor = shift(origin, u, du);
  }
  const centre = shift(shift(anchor, u, offU), vAxis, offV);
  return { centre, normal, u };
}

/** How far the cut must run to clear the host — its full thickness, with margin added by the caller. */
function hostSpan(ctx: VoidBuildContext): number {
  const layers = ctx.hostStyle?.layers ?? [];
  const sum = layers.reduce((total, layer) => total + layer.thickness, 0);
  if (sum > 0) return sum;
  const thickness = num(ctx.hostParams['thickness'], 0);
  return thickness > 0 ? thickness : 400;
}

/** A `width` × `height` rectangle centred at `origin`, in the plane whose normal is `sweep` and whose local
 * x-axis is `xAxis`. Authored in a fixed segment order — the door's own faces get stable `lateral.k` (D26). */
function rect(origin: Vec3, sweep: Vec3, xAxis: Vec3, width: number, height: number): Profile {
  const hw = width / 2;
  const hh = height / 2;
  return {
    plane: { origin: [...origin], normal: [...sweep], xAxis: [...xAxis] },
    start: [-hw, -hh] as Vec2,
    segments: [
      { kind: 'line', to: [hw, -hh] as Vec2 },
      { kind: 'line', to: [hw, hh] as Vec2 },
      { kind: 'line', to: [-hw, hh] as Vec2 },
      { kind: 'line', to: [-hw, -hh] as Vec2 },
    ],
  };
}

const shift = (p: Vec3, dir: Vec3, d: number): Vec3 => [
  p[0] + dir[0] * d,
  p[1] + dir[1] * d,
  p[2] + dir[2] * d,
];

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A material ref may be absent (an unpriced door still builds — its mass is just omitted, D45). */
function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Read a 2D point (`[x, y]`) from a param value — the host wall's {start,end} baseline (D52). */
function readVec2(value: unknown): readonly [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const x: unknown = value[0];
  const y: unknown = value[1];
  return typeof x === 'number' && typeof y === 'number' ? [x, y] : undefined;
}
