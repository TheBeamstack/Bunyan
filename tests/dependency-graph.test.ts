/**
 * THE TYPED DEPENDENCY GRAPH (D50 step 0a) — the rebuild invalidator is now a DECLARED graph, and the
 * once-missing edge is in it. Entry 33, 2026-07-16.
 *
 * ⚠⚠ THE EDGE THIS FILE GUARDS. `build.ts` reads `elevationOf(scene, element.containerId)` — so an
 * element's geometry depends on its container's elevation — but the old `#touched()` invalidator handled
 * only `elements` and `styles`, NOT `containers`. The edge lived in the BUILD and was missing from the
 * INVALIDATOR (Entry 24b). The moment `updateContainer` lands (step 0e), every element on that level would
 * silently keep its old Z, with a green suite. `dependents()` closes it, and the switch is exhaustive over
 * `SceneCollection` so no future collection can lose its edge the same way.
 *
 * ⚠ REVERT-CHECK (the standing rule): the `containers` assertions below FAIL against the old invalidator —
 * it returned nothing for a container change, so the walls on the moved level were never re-staged. A fix
 * without a test that fails in its absence is an assertion.
 *
 * This is a PURE test: `dependents` reads the recipe (`scene.elements`/`.containers`), not geometry, so it
 * needs no kernel — the whole point of a dependency graph is that "what must rebuild" is answerable from
 * the recipe alone.
 */

import { describe, expect, it } from 'vitest';
import { dependents, emptyScene } from '@bunyan/document';
import type {
  Classification,
  Element,
  ElementId,
  Scene,
  SceneChange,
  SpatialContainer,
} from '@bunyan/document';

const CLASS: Classification = { ifcClass: 'IfcWall', loadBearing: true };

function element(id: string, over: Partial<Element> = {}): Element {
  return {
    id,
    typeId: 'core.wall.v1',
    typeVersion: 1,
    params: {},
    classification: CLASS,
    ...over,
  };
}

function container(id: string, over: Partial<SpatialContainer> = {}): SpatialContainer {
  return { id, kind: 'level', name: id, ...over };
}

function sceneOf(containers: readonly SpatialContainer[], elements: readonly Element[]): Scene {
  return {
    ...emptyScene(),
    containers: Object.fromEntries(containers.map((c) => [c.id, c])),
    elements: Object.fromEntries(elements.map((e) => [e.id, e])),
  };
}

/** A two-level building: `site → tower → {L0, L1}`, one wall on each level. */
function twoLevelScene(extra: readonly Element[] = []): Scene {
  return sceneOf(
    [
      container('site', { kind: 'site' }),
      container('tower', { kind: 'building', parentId: 'site' }),
      container('L0', { parentId: 'tower', elevation: 0 }),
      container('L1', { parentId: 'tower', elevation: 3000 }),
    ],
    [
      element('wall-L0', { containerId: 'L0', styleId: 'EXT' }),
      element('wall-L1', { containerId: 'L1', styleId: 'EXT' }),
      ...extra,
    ],
  );
}

const ids = (list: readonly ElementId[]) => [...list].sort();
const change = (collection: SceneChange['collection'], id: string): SceneChange => ({
  collection,
  id,
  before: {},
  after: {},
});

describe('the typed dependency graph — the rebuild invalidator is a declared graph (step 0a)', () => {
  it('⚠⚠ container→element: changing a LEVEL re-stages the elements on THAT level, and only those', () => {
    const scene = twoLevelScene();
    // The once-missing edge. Move L0 and wall-L0 must rebuild; wall-L1 must not. (Old invalidator: [].)
    expect(ids(dependents(scene, change('containers', 'L0')))).toEqual(['wall-L0']);
    expect(ids(dependents(scene, change('containers', 'L1')))).toEqual(['wall-L1']);
  });

  it('container→element walks the WHOLE path: changing the BUILDING re-stages both levels', () => {
    const scene = twoLevelScene();
    // `elevationOf` walks root-ward, so an element under a Space three levels down still depends on the
    // Building. Changing `tower` (the ancestor of both levels) re-stages every element beneath it.
    expect(ids(dependents(scene, change('containers', 'tower')))).toEqual(['wall-L0', 'wall-L1']);
    expect(ids(dependents(scene, change('containers', 'site')))).toEqual(['wall-L0', 'wall-L1']);
  });

  it('a container nobody sits under re-stages nothing', () => {
    const scene = sceneOf(
      [container('tower', { kind: 'building' }), container('empty', { parentId: 'tower' })],
      [element('wall-L0', { containerId: 'L0' })],
    );
    expect(dependents(scene, change('containers', 'empty'))).toEqual([]);
  });

  it('style→instance: editing a shared style re-stages every element wearing it', () => {
    const scene = twoLevelScene();
    expect(ids(dependents(scene, change('styles', 'EXT')))).toEqual(['wall-L0', 'wall-L1']);
    expect(dependents(scene, change('styles', 'UNUSED'))).toEqual([]);
  });

  it('element-self + host↔hosted: an element change re-stages it AND its host assembly', () => {
    const win = element('win', { typeId: 'core.opening.v1', hostId: 'wall-L0' });
    const scene = twoLevelScene([win]);
    // A change to the opening re-stages the opening and its host wall (whose solid carries the hole).
    expect(ids(dependents(scene, { collection: 'elements', id: 'win', after: win }))).toEqual([
      'wall-L0',
      'win',
    ]);
    // A plain wall change re-stages just itself.
    expect(
      dependents(scene, { collection: 'elements', id: 'wall-L1', after: element('wall-L1') }),
    ).toEqual(['wall-L1']);
  });

  it('materials/sections declare NO geometry edge — a density edit re-stages nothing', () => {
    const scene = twoLevelScene();
    // A material carries density read by quantities()/Miqdar; no solid's SHAPE depends on it. This is a
    // declared "nothing", enforced by the exhaustive switch — not the silent gap the container edge was.
    expect(dependents(scene, change('materials', 'blockwork-200'))).toEqual([]);
    expect(dependents(scene, change('sections', 'IPE300'))).toEqual([]);
  });

  it('grid→element: the edge is DECLARED (dormant until step 0b) — a grid change re-stages bound elements', () => {
    const col = element('col', { typeId: 'core.linearMember.v1', gridRefs: ['A', '3'] });
    const scene = twoLevelScene([col]);
    // Declared now so the invalidator already knows the edge the moment step 0b makes a Grid a real host;
    // over-invalidating today is harmless (there is no updateGrid command yet, and the build ignores it).
    expect(dependents(scene, change('grids', 'A'))).toEqual(['col']);
    expect(dependents(scene, change('grids', 'ZZ'))).toEqual([]);
  });
});
