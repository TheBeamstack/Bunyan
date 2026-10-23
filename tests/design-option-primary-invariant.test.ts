// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * A DESIGN-OPTION SET WITH ZERO OR TWO PRIMARIES IS A BROKEN REFERENCE (T-055; D65, D85, D86).
 *
 * `checkPrimaryInvariant` refuses such a set at the three option verbs only. A `.bnn` or a code-assembled
 * `Scene` reaches it anyway, and `isElementActive` then counts both walls (two primaries) or neither
 * (none) — measured at main a7c903e with `brokenRefs()` and `unbuildable()` both empty.
 *
 * ⚠ Reported, never healed: the exclusion rule and the enumeration are asserted unchanged beside it.
 * ⚠ An untagged element hosted on a tagged one gets no entry of its own: its activity is its host's
 * (D67), so the host's entry names the cause, and naming it twice would report one defect per descendant.
 */

import { describe, expect, it } from 'vitest';
import {
  CORE_COMMANDS,
  DocumentContext,
  createRegistries,
  emptyScene,
  isElementActive,
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import type { DesignOption, Element, Scene } from '@bunyan/document';
import { wallType } from '@bunyan/types';

const wall = (id: string, extra: Partial<Element> = {}): Element => ({
  id,
  typeId: wallType.id,
  typeVersion: wallType.version,
  name: id,
  params: { start: [0, 0], end: [6000, 0], thickness: 200, height: 3000 },
  classification: wallType.defaultClassification,
  ...extra,
});

const sceneWith = (primaryA: boolean, primaryB: boolean, tagged = true): Scene => {
  const options: Record<string, DesignOption> = {
    'opt-a': { id: 'opt-a', setName: 'Facade', name: 'A', isPrimary: primaryA },
    'opt-b': { id: 'opt-b', setName: 'Facade', name: 'B', isPrimary: primaryB },
  };
  return {
    ...emptyScene(),
    designOptions: options,
    elements: tagged
      ? { wA: wall('wA', { designOptionId: 'opt-a' }), wB: wall('wB', { designOptionId: 'opt-b' }) }
      : { wC: wall('wC') },
  };
};

/** No kernel call is made: `brokenRefs()` and `modelElements()` are derived from the scene alone. */
const newDoc = (scene: Scene): DocumentContext => {
  const registries = createRegistries();
  registries.types.register(wallType);
  for (const command of CORE_COMMANDS) registries.commands.register(command);
  return new DocumentContext({ registries, geometry: undefined as never, scene });
};

const roads = (scene: Scene): readonly [string, DocumentContext][] => [
  ['code-assembled', newDoc(scene)],
  ['loadBnn(saveBnn())', newDoc(loadBnn(saveBnn(scene, { kernelBuildId: 'test' })).scene)],
];

const triples = (doc: DocumentContext): readonly [string, string, string][] =>
  doc.brokenRefs().map((b) => [b.elementId, b.ref, b.hostId]);

describe('a design-option set whose primary count is not 1 surfaces in brokenRefs()', () => {
  for (const [label, primaryA, primaryB] of [
    ['two primaries', true, true],
    ['zero primaries', false, false],
  ] as const) {
    for (const [road, doc] of roads(sceneWith(primaryA, primaryB))) {
      it(`${label}, ${road}: one entry per tagged element, ref its option, hostId itself`, () => {
        expect(triples(doc)).toEqual([
          ['wA', 'opt-a', 'wA'],
          ['wB', 'opt-b', 'wB'],
        ]);
        expect(doc.brokenRefs()[0]?.reason).toContain('Facade');
        // Reported, not healed: the exclusion rule still double-counts (two) or drops both (none).
        const active = primaryA;
        expect(
          doc
            .modelElements()
            .map((e) => e.id)
            .sort(),
        ).toEqual(active ? ['wA', 'wB'] : []);
        expect(isElementActive(doc.scene.elements['wA']!, doc.scene)).toBe(active);
        expect(isElementActive(doc.scene.elements['wB']!, doc.scene)).toBe(active);
      });
    }
  }

  it('exactly one primary adds no entry, on both roads', () => {
    for (const [, doc] of roads(sceneWith(true, false))) {
      expect(doc.brokenRefs()).toEqual([]);
      expect(doc.modelElements().map((e) => e.id)).toEqual(['wA']);
    }
  });

  it('a violating set with no tagged element adds no entry', () => {
    for (const [, doc] of roads(sceneWith(true, true, false))) {
      expect(doc.brokenRefs()).toEqual([]);
      expect(doc.modelElements().map((e) => e.id)).toEqual(['wC']);
    }
  });

  it('an untagged element hosted on a tagged one is covered by its host entry, not given its own', () => {
    const base = sceneWith(true, true);
    const scene: Scene = {
      ...base,
      elements: { ...base.elements, wD: wall('wD', { hostId: 'wA' }) },
    };
    for (const [, doc] of roads(scene)) {
      expect(triples(doc).map(([id]) => id)).toEqual(['wA', 'wB']);
      expect(isElementActive(doc.scene.elements['wD']!, doc.scene)).toBe(true);
    }
  });
});
