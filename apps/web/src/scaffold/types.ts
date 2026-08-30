// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ SCAFFOLD BIM OBJECT TYPES — NOT THE SHIPPED TYPES.
 *
 * P5 ships the real Wall / Slab / LinearMember / Opening — with their IFC mappings, their quantity
 * hooks and their migrations. This file exists so the P4 shell has *something real to render and edit*
 * before P5 lands: a registered, composite, styled Wall built out of `makeBox` layers, mirroring
 * `tests/fixtures/bim-types.ts`. When P5's types arrive, delete this file and register those instead.
 *
 * It is app-local (not imported from `tests/`) on purpose — the app must not depend on the test tree —
 * and it is deliberately minimal: one composite type is enough to exercise the whole seam end to end
 * (registry → command → DocumentContext → kernel → tessellate → render).
 */

import type { BimObjectType, BuildContext, BuiltPart } from '@bunyan/document';

/** A layered wall, authored along local +X, layers stacked across +Y, height up +Z (mirrors the fixture). */
export const scaffoldWallType: BimObjectType = {
  id: 'core.wall.v1',
  version: 1,
  // ⚠ RELABELLED (Entry 70). The real `core.wall` from `@bunyan/types` is now registered beside this one
  // (`bootstrap.ts`), and a bare "Wall" in two places is how someone authors the wrong one. This Type is
  // retained ONLY so a document saved before Entry 70 still builds; nothing should create a new one.
  label: 'Wall (legacy v1 scaffold)',
  description:
    'SCAFFOLD (pre-P5): a layered {length,height} wall. SUPERSEDED by the D52 baseline `core.wall` — retained only so pre-Entry-70 saved documents still build (D43 would otherwise mark them unbuildable).',
  parameterSchema: {
    // ⚠ min AND max are given so the property panel renders a DRAG SLIDER (see SchemaForm) — dragging it
    // is the live, kernel-coalesced edit path the panel exists to exercise. The bounds are ordinary wall
    // limits, not a UI hack: a 12 m single wall / 5 m storey height covers the scaffold's purpose.
    length: { kind: 'number', label: 'Length', unit: 'mm', required: true, min: 100, max: 12000 },
    height: { kind: 'number', label: 'Height', unit: 'mm', required: true, min: 100, max: 5000 },
  },
  styleSchema: {
    layers: { kind: 'array', label: 'Layer stack', items: { kind: 'object', label: 'Layer' } },
  },
  defaultClassification: { ifcClass: 'IfcWall', loadBearing: false },
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

export const SCAFFOLD_TYPES: readonly BimObjectType[] = [scaffoldWallType];
