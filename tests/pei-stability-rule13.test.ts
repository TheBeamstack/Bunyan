/**
 * ⚠⚠ DOMAIN RULE 13 — *"An element's `id` IS its PEI, and it survives every rebuild, resize and
 * RE-ISSUE."* Real OCCT, headless. (Entry 60's follow-on backward sweep.)
 *
 * **Why this file exists, and why it is late.** Rule 13 is the sentence the whole ecosystem rests on —
 * *"anything that would re-mint an element's id on a rebuild is not a refactor; it is a breaking change
 * to three other products"* — and **nothing in the suite asserted it.** The PEI's stability was true, and
 * it was true by construction rather than by test, which is the precise condition §1b's second method
 * warns about: the day someone changes `redo()` to re-execute the command instead of re-applying its
 * recorded changes, `createElement` mints a fresh ULID, every downstream binding to that element breaks,
 * and **not one test in this repo goes red.**
 *
 * ⚠ The sweep that produced this file read the code first and concluded rule 13 was safe. That is not
 * the standard this project holds itself to — rule 6 was the only rule ever to come back clean, and it
 * came back clean because it was tested by DELETING it, not by reading it. So each claim below is
 * measured against the real kernel, and a clean result is recorded as *verified* rather than *assumed*.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  createRegistries,
  loadBnn,
  saveBnn,
} from '@bunyan/document';
import { DERIVED_PEI_SEPARATOR } from '@bunyan/document';
import type { Registries } from '@bunyan/document';
import {
  curtainWallColumnType,
  curtainWallMullionType,
  curtainWallPanelType,
  curtainWallType,
  wallType,
} from '@bunyan/types';

const T = 200;
const H = 2400;

describe('domain rule 13 — the PEI survives every rebuild, resize and re-issue', () => {
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

  const newRegistries = (): Registries => {
    const r = createRegistries();
    r.types.register(wallType);
    r.types.register(curtainWallType);
    r.types.register(curtainWallColumnType);
    r.types.register(curtainWallPanelType);
    r.types.register(curtainWallMullionType);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    return r;
  };

  const newDoc = (): DocumentContext =>
    new DocumentContext({ registries: newRegistries(), geometry: client });

  const wall = async (doc: DocumentContext): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, 0], end: [4000, 0], thickness: T, height: H },
      })
    ).changes[0]!.id;

  /* ============================================================================================
   * §1 — THE THREE VERBS RULE 13 NAMES, one test each.
   * ========================================================================================= */

  it('⚠⚠ survives UNDO → REDO — a redo re-applies recorded changes, it does not re-execute the command', async () => {
    const doc = newDoc();
    const id = await wall(doc);

    await doc.undo();
    await doc.redo();

    // ⚠ THE FAILURE THIS PINS: `createElement` calls `ctx.mintId(...)`. If `redo()` ever re-ran the
    // command instead of re-applying `edit.changes`, this would be a BRAND NEW ULID and every
    // downstream binding — Planitor's work package, Miqdar's analytical member, a tag — would dangle.
    expect(Object.keys(doc.scene.elements)).toEqual([id]);
    expect(doc.partsOf(id)).toBeDefined();
  });

  it('survives a RESIZE — the geometry is rebuilt, the identity is not re-minted', async () => {
    const doc = newDoc();
    const id = await wall(doc);

    await doc.execute('core.setParams', { elementId: id, params: { end: [9000, 0] } });

    expect(Object.keys(doc.scene.elements)).toEqual([id]);
    expect(doc.scene.elements[id]!.params['end']).toEqual([9000, 0]);
  });

  it('survives a RE-ISSUE — issuing a revision is a command, and it mints nothing', async () => {
    const doc = newDoc();
    const id = await wall(doc);

    await doc.execute('core.issueRevision', { by: 'architect' });
    await doc.execute('core.setParams', { elementId: id, params: { height: 3000 } });
    await doc.execute('core.issueRevision', { by: 'architect' });

    expect(doc.revision!.snapshot_number).toBe(2);
    expect(Object.keys(doc.scene.elements)).toEqual([id]);
  });

  it('survives SAVE → LOAD → REBUILD (the id is read from the file, never re-minted)', async () => {
    const doc = newDoc();
    const id = await wall(doc);
    const bytes = saveBnn(doc.scene, { kernelBuildId: 'test' });

    const reopened = new DocumentContext({
      registries: newRegistries(),
      geometry: client,
      scene: loadBnn(bytes).scene,
    });
    await reopened.rebuildAll();

    expect(Object.keys(reopened.scene.elements)).toEqual([id]);
    expect(reopened.partsOf(id)).toBeDefined();
  });

  /* ============================================================================================
   * §2 — THE DERIVED HALF (D59). A generated child's PEI is `${parentId}:${slot}` — the slot is what
   * carries the identity, so the question is whether an edit that does NOT change the grid keeps it.
   * ========================================================================================= */

  it('⚠ a GENERATED CHILD keeps its derived PEI across an edit that does not change its slot', async () => {
    const doc = newDoc();
    const parent = (
      await doc.execute('core.createElement', {
        typeId: curtainWallType.id,
        params: { origin: [0, 0], width: 6000, height: 3000, cols: 3, rows: 2 },
      })
    ).changes[0]!.id;

    const before = doc.modelElements().map((e) => e.id);
    expect(before.length).toBeGreaterThan(1); // the parent plus its generated tree

    // A height change re-derives every child from the parent's recipe — but the GRID is untouched, so
    // every slot key, and therefore every child PEI, must come back byte-identical.
    await doc.execute('core.setParams', { elementId: parent, params: { height: 3600 } });

    expect(doc.modelElements().map((e) => e.id)).toEqual(before);
  });

  it('⚠ a derived PEI uses ":" — the one separator absent from a ULID and refused in a part name', () => {
    // Not cosmetic: the child PEI is embedded in its parts' nodeIds and therefore inside `SubShapeRef`
    // tokens. "/" and "#" and "~" are SubShapeRef/DAG separators (`commands.ts` refuses them in a part
    // name), so a "/"-joined child id would be ambiguous the moment it entered a ref.
    // ⚠ Seven doc sites said `/` until this sweep; the code always said `:`. Asserted here so the
    // documentation and the code can never drift apart again unnoticed.
    expect(DERIVED_PEI_SEPARATOR).toBe(':');
    const doc = newDoc();
    return doc
      .execute('core.createElement', {
        typeId: curtainWallType.id,
        params: { origin: [0, 0], width: 6000, height: 3000, cols: 2, rows: 1 },
      })
      .then((edit) => {
        const parent = edit.changes[0]!.id;
        const derived = doc.modelElements().filter((e) => e.derived);
        expect(derived.length).toBeGreaterThan(0);
        for (const child of derived) {
          expect(child.id.startsWith(`${parent}${DERIVED_PEI_SEPARATOR}`)).toBe(true);
          expect(child.id).not.toContain('/');
          expect(child.id).not.toContain('#');
          expect(child.id).not.toContain('~');
        }
      });
  });
});
