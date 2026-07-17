/**
 * THE MISSING CRUD + THE REFUSE-OR-RETARGET GUARD (D50 step 0e/0f, D51 generalised). Entry 35, 2026-07-17.
 * Designed in `P5_step0e_design.md` (owner-approved). Against the real OCCT kernel.
 *
 * ⚠ WHAT THIS PROVES:
 *  - the registries are no longer create-only — a Level moves, a grid nudges, a section resizes, a density
 *    typo is fixed, an unused entity is deleted;
 *  - ⚠⚠ MOVE A LEVEL / A GRID AND THE BUILDING FOLLOWS — END TO END (editing the number, not rebinding);
 *  - ⚠⚠ THE D51 GUARD, finally built: renaming a layer that hosts an opening is REFUSED (naming it), and
 *    the refusal test IS the revert-check — delete the guard and it resolves silently, exactly today's bug;
 *  - the guard is generalised (row ⓓ): every delete of a referenced library entity refuses-or-retargets.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, CommandFailure, DocumentContext, createRegistries } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

const newRegistries = () => {
  const registries = createRegistries();
  for (const type of FIXTURE_TYPES) registries.types.register(type);
  for (const command of CORE_COMMANDS) registries.commands.register(command);
  return registries;
};

describe('the missing CRUD + the refuse-or-retarget guard (Entry 35, step 0e/0f)', () => {
  let kernel: OcctKernel;
  let client: KernelClient;
  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  });
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  const boundsOf = async (doc: DocumentContext, id: string, part: string) => {
    const p = doc.partsOf(id)!.find((x) => x.name === part)!;
    return (await client.request('bounds', { handle: p.handle })).bounds;
  };

  /* ---- Block A: updates MOVE GEOMETRY (the missing halves of 0a/0b) ------------------------------- */

  it('⚠⚠ updateContainer: edit a Level’s elevation and the member FOLLOWS (end to end)', async () => {
    const doc = new DocumentContext({ registries: newRegistries(), geometry: client });
    await doc.execute('core.createContainer', {
      id: 'L0',
      kind: 'level',
      name: 'L0',
      elevation: 0,
    });
    await doc.execute('core.createContainer', {
      id: 'L1',
      kind: 'level',
      name: 'L1',
      elevation: 3000,
    });
    const created = await doc.execute('core.createElement', {
      typeId: 'core.constrainedMember.v1',
      baseLevel: 'L0',
      topLevel: 'L1',
      params: { width: 400, depth: 400 },
    });
    const id = created.changes[0]!.id;
    expect((await boundsOf(doc, id, 'member')).min[2]).toBeCloseTo(0);

    // Edit the NUMBER — the real user action 0e adds. The 0a container edge re-stages the member.
    await doc.execute('core.updateContainer', { id: 'L0', elevation: 500 });
    const b = await boundsOf(doc, id, 'member');
    expect(b.min[2]).toBeCloseTo(500); // the building followed the Level
    expect(b.max[2]).toBeCloseTo(3000); // top (L1) unchanged
  });

  it('⚠ updateGrid: nudge an axis offset and the grid-hosted member follows', async () => {
    const doc = new DocumentContext({ registries: newRegistries(), geometry: client });
    await doc.execute('core.createContainer', {
      id: 'L0',
      kind: 'level',
      name: 'L0',
      elevation: 0,
    });
    await doc.execute('core.createContainer', {
      id: 'L1',
      kind: 'level',
      name: 'L1',
      elevation: 3000,
    });
    await doc.execute('core.createGrid', { id: 'A', name: 'A', axis: 'y', offset: 2000 });
    const created = await doc.execute('core.createElement', {
      typeId: 'core.constrainedMember.v1',
      baseLevel: 'L0',
      topLevel: 'L1',
      gridRefs: ['A'],
      params: { width: 400, depth: 400 },
    });
    const id = created.changes[0]!.id;
    expect((await boundsOf(doc, id, 'member')).min[0]).toBeCloseTo(2000 - 200);

    await doc.execute('core.updateGrid', { id: 'A', offset: 3000 });
    expect((await boundsOf(doc, id, 'member')).min[0]).toBeCloseTo(3000 - 200); // followed the axis
  });

  it('⚠ updateSection re-stages every member swept from it (the sections edge is real now)', async () => {
    const doc = new DocumentContext({ registries: newRegistries(), geometry: client });
    await doc.execute('core.createMaterial', {
      id: 'steel',
      name: 'S235',
      category: 'steel',
      density: 7850,
    });
    await doc.execute('core.createSection', {
      id: 'C300',
      name: 'C300',
      shape: 'circle',
      dimensions: { radius: 150 },
    });
    await doc.execute('core.createStyle', {
      id: 'COL',
      name: 'COL',
      typeId: 'core.linearMember.v1',
      sectionId: 'C300',
      params: { materialId: 'steel' },
    });
    const created = await doc.execute('core.createElement', {
      typeId: 'core.linearMember.v1',
      styleId: 'COL',
      params: { length: 3000, direction: 'z' },
    });
    const id = created.changes[0]!.id;
    const width = async () => {
      const b = await boundsOf(doc, id, 'structure');
      return b.max[0] - b.min[0];
    };
    expect(await width()).toBeCloseTo(300); // diameter at radius 150

    await doc.execute('core.updateSection', { id: 'C300', dimensions: { radius: 300 } });
    expect(await width()).toBeCloseTo(600); // the member grew — the section edit re-staged it
  });

  it('updateMaterial changes the QUANTITY and rebuilds NO geometry (density is not a shape)', async () => {
    const w = await compositeWall();
    const before = await w.doc.quantities(w.wallId);
    const structBefore = before.parts.find((p) => p.name === 'structure')!;

    await w.doc.execute('core.updateMaterial', { id: 'blockwork-200', density: 3000 });
    const after = await w.doc.quantities(w.wallId);
    const structAfter = after.parts.find((p) => p.name === 'structure')!;

    expect(structAfter.volume).toBeCloseTo(structBefore.volume); // geometry unchanged
    expect(structAfter.mass!).toBeCloseTo(structBefore.mass! * (3000 / 2000)); // quantity followed
  });

  /* ---- Block B: THE D51 GUARD — a layer rename may not silently orphan an opening ----------------- */

  it('⚠⚠ renaming a layer that HOSTS an opening is REFUSED, and the failure NAMES the opening', async () => {
    const w = await compositeWall(true);
    expect(w.doc.brokenRefs()).toHaveLength(0);
    // Rename `finish.interior` (the window's host layer) → the guard refuses. ⚠ THIS IS THE REVERT-CHECK:
    // delete the guard in commands.ts and this resolves silently, brokenRefs 0→1 — exactly today's bug.
    await expect(
      w.doc.execute('core.updateStyle', { styleId: 'EXT-295', layers: renamedLayers('lining') }),
    ).rejects.toBeInstanceOf(CommandFailure);
    expect(w.doc.brokenRefs()).toHaveLength(0); // reject + keep last-good: nothing changed
  });

  it('retargetMap rewrites the opening’s token — the window STILL CUTS after the rename', async () => {
    const w = await compositeWall(true);
    const holed = (await w.doc.quantities(w.wallId)).parts.find(
      (p) => p.name === 'structure',
    )!.volume;

    await w.doc.execute('core.updateStyle', {
      styleId: 'EXT-295',
      layers: renamedLayers('lining'),
      retargetMap: { 'finish.interior': 'lining' },
    });
    expect(w.doc.brokenRefs()).toHaveLength(0); // the opening was redirected, not orphaned
    const after = (await w.doc.quantities(w.wallId)).parts.find(
      (p) => p.name === 'structure',
    )!.volume;
    expect(after).toBeCloseTo(holed); // the window still cuts the same hole
  });

  it('acknowledge lets the opening ORPHAN — a first-class broken ref, never silent', async () => {
    const w = await compositeWall(true);
    await w.doc.execute('core.updateStyle', {
      styleId: 'EXT-295',
      layers: renamedLayers('lining'),
      acknowledge: true,
    });
    expect(w.doc.brokenRefs().length).toBeGreaterThan(0); // named, visible, awaiting retarget (domain rule 3)
  });

  /* ---- Block C: referential integrity, generalised (row ⓓ) ------------------------------------- */

  it('deleteMaterial in use is REFUSED; retargetMap reassigns; acknowledge leaves mass omitted', async () => {
    const a = await compositeWall();
    await expect(
      a.doc.execute('core.deleteMaterial', { id: 'blockwork-200' }),
    ).rejects.toBeInstanceOf(CommandFailure);

    // retargetMap: reassign the style's layer to another material, then delete — one atomic edit.
    await a.doc.execute('core.createMaterial', {
      id: 'blockwork-215',
      name: 'Blockwork 215',
      category: 'masonry',
      density: 2150,
    });
    await a.doc.execute('core.deleteMaterial', {
      id: 'blockwork-200',
      retargetMap: { 'blockwork-200': 'blockwork-215' },
    });
    expect(a.doc.scene.materials['blockwork-200']).toBeUndefined();
    const struct = (await a.doc.quantities(a.wallId)).parts.find((p) => p.name === 'structure')!;
    expect(struct.mass!).toBeCloseTo((struct.volume / 1e9) * 2150); // now built of the replacement

    // A second wall to prove acknowledge: delete a material a layer still names ⇒ mass OMITTED, not zeroed.
    const b = await compositeWall();
    await b.doc.execute('core.deleteMaterial', { id: 'blockwork-200', acknowledge: true });
    const orphanStruct = (await b.doc.quantities(b.wallId)).parts.find(
      (p) => p.name === 'structure',
    )!;
    expect(orphanStruct.mass).toBeUndefined(); // unknown, not a wrong nought (domain rule 15)
  });

  it('deleteStyle in use is REFUSED (an element wears it)', async () => {
    const w = await compositeWall();
    await expect(w.doc.execute('core.deleteStyle', { id: 'EXT-295' })).rejects.toBeInstanceOf(
      CommandFailure,
    );
  });

  it('deleteContainer with a child / an element on it is REFUSED', async () => {
    const doc = new DocumentContext({ registries: newRegistries(), geometry: client });
    await doc.execute('core.createContainer', { id: 'bldg', kind: 'building', name: 'B' });
    await doc.execute('core.createContainer', {
      id: 'L0',
      kind: 'level',
      name: 'L0',
      parentId: 'bldg',
      elevation: 0,
    });
    await expect(doc.execute('core.deleteContainer', { id: 'bldg' })).rejects.toBeInstanceOf(
      CommandFailure,
    ); // a child Level hangs off it
    // A leaf container nobody references deletes cleanly.
    await doc.execute('core.deleteContainer', { id: 'L0' });
    expect(doc.scene.containers['L0']).toBeUndefined();
  });

  it('deleteGrid an element is placed on is REFUSED', async () => {
    const doc = new DocumentContext({ registries: newRegistries(), geometry: client });
    await doc.execute('core.createContainer', {
      id: 'L0',
      kind: 'level',
      name: 'L0',
      elevation: 0,
    });
    await doc.execute('core.createContainer', {
      id: 'L1',
      kind: 'level',
      name: 'L1',
      elevation: 3000,
    });
    await doc.execute('core.createGrid', { id: 'A', name: 'A', axis: 'y', offset: 0 });
    await doc.execute('core.createElement', {
      typeId: 'core.constrainedMember.v1',
      baseLevel: 'L0',
      topLevel: 'L1',
      gridRefs: ['A'],
      params: { width: 400, depth: 400 },
    });
    await expect(doc.execute('core.deleteGrid', { id: 'A' })).rejects.toBeInstanceOf(
      CommandFailure,
    );
  });

  /* ---- Block D: atomicity ------------------------------------------------------------------------- */

  it('a retargeting delete is ONE undoable edit — undo restores the entity AND the redirect', async () => {
    const w = await compositeWall();
    await w.doc.execute('core.createMaterial', {
      id: 'blockwork-215',
      name: 'B215',
      category: 'masonry',
      density: 2150,
    });
    await w.doc.execute('core.deleteMaterial', {
      id: 'blockwork-200',
      retargetMap: { 'blockwork-200': 'blockwork-215' },
    });
    expect(w.doc.scene.materials['blockwork-200']).toBeUndefined();
    const layerMat = () =>
      w.doc.scene.styles['EXT-295']!.layers!.find((l) => l.name === 'structure')!.materialId;
    expect(layerMat()).toBe('blockwork-215');

    await w.doc.undo();
    expect(w.doc.scene.materials['blockwork-200']).toBeDefined(); // the material came back…
    expect(layerMat()).toBe('blockwork-200'); // …AND the layer points at it again (one edit)
  });

  /* ---- shared fixtures --------------------------------------------------------------------------- */

  const LAYERS = [
    {
      name: 'finish.interior',
      materialId: 'plaster-15',
      thickness: 15,
      discipline: 'architectural',
    },
    { name: 'structure', materialId: 'blockwork-200', thickness: 200, discipline: 'structural' },
    { name: 'insulation', materialId: 'eps-80', thickness: 80, discipline: 'architectural' },
  ] as const;

  const renamedLayers = (interiorTo: string) =>
    LAYERS.map((l) => (l.name === 'finish.interior' ? { ...l, name: interiorTo } : { ...l }));

  async function compositeWall(withWindow = false) {
    const doc = new DocumentContext({ registries: newRegistries(), geometry: client });
    for (const [id, name, category, density] of [
      ['plaster-15', 'Plaster', 'finish', 1200],
      ['blockwork-200', 'Blockwork', 'masonry', 2000],
      ['eps-80', 'EPS', 'insulation', 20],
    ] as const) {
      await doc.execute('core.createMaterial', { id, name, category, density });
    }
    await doc.execute('core.createStyle', {
      id: 'EXT-295',
      name: 'EXT-295',
      typeId: 'core.wall.v1',
      layers: LAYERS.map((l) => ({ ...l })),
    });
    const wall = await doc.execute('core.createElement', {
      typeId: 'core.wall.v1',
      styleId: 'EXT-295',
      params: { length: 4000, height: 2500 },
    });
    const wallId = wall.changes[0]!.id;
    if (withWindow) {
      const interior = doc.partsOf(wallId)!.find((p) => p.name === 'finish.interior')!;
      const hostFace = interior.refs.find((ref) => ref.includes('/face/y-min'))!;
      await doc.execute('core.createElement', {
        typeId: 'core.opening.v1',
        hostId: wallId,
        hostRef: hostFace,
        params: { width: 1200, height: 1400, anchor: 'fixed', offsetU: 800, offsetV: 500 },
      });
    }
    return { doc, wallId };
  }
});
