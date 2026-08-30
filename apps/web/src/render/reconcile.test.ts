// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * P4's incremental-redraw exit criterion, asserted by COUNTING (not timing): a one-element edit
 * re-tessellates only the parts that changed. `planRedraw` is pure, so this runs in Node with no GPU —
 * exactly the measurable form the plan asks for (a wall-clock threshold in CI is a flake generator).
 *
 * The companion `incremental-redraw.test.ts` proves the OTHER half — that a real edit through
 * `DocumentContext` mints fresh handles only for the edited element, which is what makes this planner's
 * input correct in the running app.
 */

import { describe, it, expect } from 'vitest';
import { planRedraw, type CachedPart } from './reconcile';
import type { RenderPart } from './RenderPart';

function part(nodeId: string, handle: string, color = 0x111111): RenderPart {
  const elementId = nodeId.split('.')[0] ?? nodeId;
  return { elementId, nodeId, partName: nodeId, handle, color };
}

/** The cache the Viewport would hold after drawing `parts` once. */
function cacheOf(parts: readonly RenderPart[]): Map<string, CachedPart> {
  return new Map(parts.map((p) => [p.nodeId, { handle: p.handle, color: p.color }]));
}

/** Three composite walls, three parts each = 9 solids — a stand-in for the reference building. */
function building(handle: (nodeId: string) => string): RenderPart[] {
  const parts: RenderPart[] = [];
  for (const wall of ['wall-1', 'wall-2', 'wall-3']) {
    for (const layer of ['structure', 'insulation', 'finish']) {
      const nodeId = `${wall}.${layer}`;
      parts.push(part(nodeId, handle(nodeId)));
    }
  }
  return parts;
}

describe('planRedraw (incremental redraw)', () => {
  const first = building((nodeId) => `${nodeId}#0`);

  it('tessellates everything on the first draw (empty cache)', () => {
    const plan = planRedraw(new Map(), first);
    expect(plan.tessellate).toHaveLength(9);
    expect(plan.recolor).toHaveLength(0);
    expect(plan.remove).toHaveLength(0);
  });

  it('⚠ ONE-ELEMENT EDIT RE-TESSELLATES ONLY THAT ELEMENT — the exit criterion', () => {
    // wall-2 is rebuilt: its parts get fresh handles; the other six keep theirs.
    const next = first.map((p) =>
      p.nodeId.startsWith('wall-2.') ? part(p.nodeId, `${p.nodeId}#1`) : p,
    );

    const plan = planRedraw(cacheOf(first), next);

    expect(plan.tessellate).toHaveLength(3); // NOT 9
    expect(plan.tessellate.every((p) => p.elementId === 'wall-2')).toBe(true);
    expect(plan.recolor).toHaveLength(0);
    expect(plan.remove).toHaveLength(0);
  });

  it('a colour-only change swaps material, never re-tessellates', () => {
    const recolored = first.map((p) =>
      p.nodeId === 'wall-1.finish' ? part(p.nodeId, p.handle, 0x999999) : p,
    );
    const plan = planRedraw(cacheOf(first), recolored);
    expect(plan.tessellate).toHaveLength(0);
    expect(plan.recolor.map((p) => p.nodeId)).toEqual(['wall-1.finish']);
    expect(plan.remove).toHaveLength(0);
  });

  it('a removed element is disposed, an added one is tessellated', () => {
    const cache = cacheOf(first);

    const fewer = first.filter((p) => !p.nodeId.startsWith('wall-3.'));
    const removePlan = planRedraw(cache, fewer);
    expect([...removePlan.remove].sort()).toEqual([
      'wall-3.finish',
      'wall-3.insulation',
      'wall-3.structure',
    ]);
    expect(removePlan.tessellate).toHaveLength(0);

    const more = [...first, part('wall-4.structure', 'wall-4.structure#0')];
    const addPlan = planRedraw(cache, more);
    expect(addPlan.tessellate.map((p) => p.nodeId)).toEqual(['wall-4.structure']);
    expect(addPlan.remove).toHaveLength(0);
  });

  it('an unchanged scene is zero work', () => {
    const plan = planRedraw(cacheOf(first), first);
    expect(plan.tessellate).toHaveLength(0);
    expect(plan.recolor).toHaveLength(0);
    expect(plan.remove).toHaveLength(0);
  });
});
