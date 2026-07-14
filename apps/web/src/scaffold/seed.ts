/**
 * SCAFFOLD demo scene — a first building to render, authored the only way anything is authored: through
 * `doc.execute` (D19). Every call here is a command an agent could issue verbatim through
 * `window.bunyan`. Delete this alongside `scaffold/types.ts` when P5's real types + a real UI land.
 */

import type { DocumentContext, ElementId } from '@bunyan/document';

/** Seed a couple of materials, a composite wall style, and one wall. Returns the wall's id. */
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
    id: 'EXT-315',
    name: 'External wall 315mm',
    typeId: 'core.wall.v1',
    layers: [
      { name: 'structure', materialId: 'blockwork', thickness: 200, discipline: 'structural' },
      { name: 'insulation', materialId: 'eps-80', thickness: 80, discipline: 'architectural' },
      { name: 'finish', materialId: 'plaster-15', thickness: 15, discipline: 'architectural' },
    ],
  });

  const edit = await doc.execute('core.createElement', {
    typeId: 'core.wall.v1',
    styleId: 'EXT-315',
    name: 'Wall 1',
    params: { length: 4000, height: 2800 },
  });

  return edit.changes[0]!.id;
}
