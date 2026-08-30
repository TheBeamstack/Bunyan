// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * SCAFFOLD demo scene — a first building to render, authored the only way anything is authored: through
 * `doc.execute` (D19). Every call here is a command an agent could issue verbatim through
 * `window.bunyan`.
 *
 * ⚠ AS OF ENTRY 70 THIS SEEDS THE REAL, SHIPPED `core.wall` (the D52 baseline), not the scaffold
 * `core.wall.v1` it used to. A baseline wall is authored by its `{start, end}` in the Level plane; its
 * length is DERIVED and its height comes from its base/top datums, with the `height` param as the
 * un-constrained fallback (`packages/types/src/wall.ts`). That change is what makes the P4.5 wall tool
 * expressible at all — "click a start point, click an end point" has nowhere to land on a `{length,
 * height}` wall.
 *
 * ⚠ It seeds TWO walls meeting at a corner, on purpose and not for decoration: one wall exercises
 * nothing about the interaction model, while a corner gives the snap index a real endpoint to find
 * (design §4.1), gives 0c's auto-miter something to resolve, and is the smallest scene in which
 * "snap the new wall to the end of that one" is a question with a right answer.
 */

import type { DocumentContext, ElementId } from '@bunyan/document';

/** The demo wall style — three layers, so an element is visibly its PARTS (D30) and disciplines differ. */
export const DEMO_STYLE_ID = 'EXT-315';
/** The Type every wall the wall tool draws is created as. */
export const WALL_TYPE_ID = 'core.wall';
/** Storey height for the demo + for a tool-drawn wall (the D52 fallback, used when no top datum binds). */
export const DEFAULT_WALL_HEIGHT_MM = 2800;

/** The Type the opening tool hosts on a clicked face — the real `core.opening` (leaf + frame, ⓙ). */
export const OPENING_TYPE_ID = 'core.opening';
/**
 * The opening the tool places before anyone edits it in the property panel: a standard single door.
 *
 * ⚠ These are the TOOL's defaults, not the Type's. `core.opening` declares `width`/`height` as
 * `required` with no default, precisely because there is no such thing as a default door in a
 * contract — the number belongs to whoever is authoring. A pointing tool has to choose one to have
 * anything to place, and choosing it here keeps that choice out of the frozen schema.
 */
export const DEFAULT_OPENING_WIDTH_MM = 900;
export const DEFAULT_OPENING_HEIGHT_MM = 2100;

/** Seed a few materials, a composite wall style, and two walls meeting at a corner. Returns the first. */
export async function seedDemoScene(doc: DocumentContext): Promise<ElementId> {
  await doc.execute('core.createMaterial', {
    id: 'blockwork',
    name: 'Blockwork',
    category: 'masonry',
    density: 1400,
  });
  await doc.execute('core.createMaterial', {
    id: 'eps-80',
    name: 'EPS insulation',
    category: 'insulation',
    density: 30,
  });
  await doc.execute('core.createMaterial', {
    id: 'plaster-15',
    name: 'Gypsum plaster',
    category: 'finish',
    density: 1200,
  });

  await doc.execute('core.createStyle', {
    id: DEMO_STYLE_ID,
    name: 'External wall 315mm',
    typeId: WALL_TYPE_ID,
    layers: [
      { name: 'structure', materialId: 'blockwork', thickness: 200, discipline: 'structural' },
      { name: 'insulation', materialId: 'eps-80', thickness: 80, discipline: 'architectural' },
      { name: 'finish', materialId: 'plaster-15', thickness: 15, discipline: 'architectural' },
    ],
  });

  const first = await doc.execute('core.createElement', {
    typeId: WALL_TYPE_ID,
    styleId: DEMO_STYLE_ID,
    name: 'Wall 1',
    params: { start: [0, 0], end: [4000, 0], height: DEFAULT_WALL_HEIGHT_MM },
  });

  // The corner partner. Its start IS wall 1's end — the coincident endpoint the snap index must find.
  await doc.execute('core.createElement', {
    typeId: WALL_TYPE_ID,
    styleId: DEMO_STYLE_ID,
    name: 'Wall 2',
    params: { start: [4000, 0], end: [4000, 3000], height: DEFAULT_WALL_HEIGHT_MM },
  });

  return first.changes[0]!.id;
}
