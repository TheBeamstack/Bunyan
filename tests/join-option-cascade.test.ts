/**
 * ⚠⚠ THE WALL-JOIN RESOLVER AND THE DESIGN-OPTION EXCLUSION INVARIANT (D65/D67, row Ⓕ/Ⓖ).
 *
 * The second finding of the pre-freeze sweep (the first is `room-option-cascade.test.ts`), and it is the
 * sharper of the two: the room solver corrupts a DERIVED query, this corrupts the BUILT B-REP — so the
 * wrong number arrives wearing `basis: 'exact'`.
 *
 * `partnersAt` scans every element in the scene for a coincident baseline endpoint, with no notion that
 * some of them are hypothetical. Two failure modes follow from `resolveEnd`'s own precedence rule
 * (*"exactly one coincident neighbour ⇒ miter; zero or an ambiguous crowd of 2+ ⇒ the default cap"*):
 *
 *   1. **MITER AGAINST A GHOST** — a main-model wall meets only an option-B wall at a corner, so it sees
 *      exactly one partner and miters itself against a wall that will never be built.
 *
 *   2. **THE AMBIGUITY FLIP, and it is the vicious one** — two main-model walls meet at a corner and
 *      correctly miter (1 partner each). The author then adds a facade variant that happens to reach the
 *      same corner. Each main-model wall now sees **2** partners, the crowd reads as ambiguous, and the
 *      miter is **silently dropped** for a plain perpendicular cap. ⇒ **Adding a design option changes the
 *      geometry of a corner that is entirely main-model, elsewhere in the building, that nobody edited.**
 *
 * Both are D65's stated failure mode reached by the JOIN edge, and mode 2 is the D67 shape exactly: a rule
 * that cannot see what an element hangs off gives a confidently wrong answer about an innocent third party.
 */

import { describe, expect, it } from 'vitest';
import { emptyScene, resolveJoins } from '@bunyan/document';
import type {
  DesignOption,
  Element,
  ElementStyle,
  Scene,
  SpatialContainer,
} from '@bunyan/document';

const T = 200;

function wallStyle(): ElementStyle {
  return {
    id: 'style-wall',
    name: '200 blockwork',
    typeId: 'core.wall.v1',
    version: 1,
    layers: [
      { name: 'structure', materialId: 'mat-block', thickness: T, discipline: 'structural' },
    ],
  };
}

function wall(
  id: string,
  start: readonly [number, number],
  end: readonly [number, number],
  designOptionId?: string,
): Element {
  return {
    id,
    typeId: 'core.wall.v1',
    typeVersion: 1,
    styleId: 'style-wall',
    params: { start, end },
    containerId: 'level-0',
    classification: { ifcClass: 'IfcWall', loadBearing: true },
    ...(designOptionId === undefined ? {} : { designOptionId }),
  };
}

const OPTIONS: Record<string, DesignOption> = {
  'option-a': { id: 'option-a', setName: 'Facade', name: 'Option A', isPrimary: true },
  'option-b': { id: 'option-b', setName: 'Facade', name: 'Option B', isPrimary: false },
};

function sceneOf(walls: readonly Element[], withOptions = true): Scene {
  const containers: Record<string, SpatialContainer> = {
    bld: { id: 'bld', kind: 'building', name: 'B' },
    'level-0': { id: 'level-0', kind: 'level', name: 'L0', parentId: 'bld', elevation: 0 },
  };
  const elements: Record<string, Element> = {};
  for (const w of walls) elements[w.id] = w;
  return {
    ...emptyScene(),
    containers,
    elements,
    styles: { 'style-wall': wallStyle() },
    ...(withOptions ? { designOptions: OPTIONS } : {}),
  };
}

/** The two main-model walls of an ordinary corner at [5000, 0]. */
const MAIN_A = wall('w-main-a', [0, 0], [5000, 0]);
const MAIN_B = wall('w-main-b', [5000, 0], [5000, 4000]);

describe('resolveJoins obeys the design-option exclusion invariant (D65/D67)', () => {
  it('the baseline — two main-model walls at a corner MITER (one partner each)', () => {
    const joins = resolveJoins(sceneOf([MAIN_A, MAIN_B]), 'w-main-a');
    expect(joins.map((j) => j.end)).toEqual(['end']);
  });

  it('⚠⚠ MODE 1 — a main-model wall must NOT miter against a wall in a non-active option', () => {
    // Only the option-B wall reaches this corner. Option A is primary ⇒ option-B is not active ⇒ there is
    // no neighbour here at all, and the wall must draw its plain perpendicular cap.
    const scene = sceneOf([MAIN_A, wall('w-opt-b', [5000, 0], [5000, 4000], 'option-b')]);
    expect(resolveJoins(scene, 'w-main-a')).toEqual([]);
  });

  it('the ACTIVE option DOES join — the rule excludes, it does not ignore options', () => {
    const scene = sceneOf([MAIN_A, wall('w-opt-a', [5000, 0], [5000, 4000], 'option-a')]);
    expect(resolveJoins(scene, 'w-opt-a').map((j) => j.end)).toEqual(['start']);
    expect(resolveJoins(scene, 'w-main-a').map((j) => j.end)).toEqual(['end']);
  });

  it('⚠⚠⚠ MODE 2 — THE AMBIGUITY FLIP: adding a non-active option must not UN-MITER a main-model corner', () => {
    const before = resolveJoins(sceneOf([MAIN_A, MAIN_B]), 'w-main-a');
    // The author adds a facade variant that happens to reach the same corner. Nothing main-model changed.
    const after = resolveJoins(
      sceneOf([MAIN_A, MAIN_B, wall('w-opt-b', [5000, 0], [9000, 0], 'option-b')]),
      'w-main-a',
    );
    // Before the fix `after` was [] — the crowd of 2 read as ambiguous and the miter silently vanished.
    expect(after).toEqual(before);
    expect(after.map((j) => j.end)).toEqual(['end']);
  });

  it('two walls in MUTUALLY EXCLUSIVE options never join each other', () => {
    // option-a's wall and option-b's wall meet at a corner. Under option A, only A's wall is real, so it
    // has no partner there; B's is excluded outright.
    const scene = sceneOf([
      wall('w-a', [0, 0], [5000, 0], 'option-a'),
      wall('w-b', [5000, 0], [5000, 4000], 'option-b'),
    ]);
    expect(resolveJoins(scene, 'w-a')).toEqual([]);
  });

  it('an element naming an undefined option is excluded from the scan (broken-ref precedent)', () => {
    const scene = sceneOf([MAIN_A, wall('w-ghost', [5000, 0], [5000, 4000], 'option-x')], false);
    expect(resolveJoins(scene, 'w-main-a')).toEqual([]);
  });
});
