/**
 * THE ASSOCIATIVITY MODEL — a member's GEOMETRY follows its datum constraints (D50 step 0b). Entry 34,
 * 2026-07-16. Executes D52 (height derived) and D53 (constraints first-class), against the real OCCT kernel.
 *
 * ⚠ WHAT THIS PROVES, END TO END: a `constrained-member` fixture reads the 0b `BuildContext` datums
 * (`baseElevation`/`topElevation`/`gridPoint`), so:
 *   - its height is DERIVED from the two Level datums (with offsets — a parapet, a footing);
 *   - its placement follows the grid intersection;
 *   - editing a binding (createConstraint/deleteConstraint) RE-STAGES the solid — the model is associative,
 *     not just creatable.
 *
 * ⚠ WHAT WAITS FOR 0e: literally editing a Level's `elevation` number (updateContainer) or a Grid's
 * `offset` (updateGrid). The invalidation edge for that is already in the graph and revert-verified
 * (`dependency-graph.test.ts`); 0e only adds the mutating command. Here the equivalent "the datum changed,
 * the geometry followed" is driven by REBINDING to a different datum — a real command path that exists now.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import type { Constraint, ConstraintTarget } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

const W = 400; // member cross-section
const D = 400;

describe('the associativity model — a member follows its datum constraints (Entry 34, step 0b)', () => {
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

  const newDoc = async (): Promise<DocumentContext> => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });
    // Site → Building → three Levels at 0 / 1500 / 3000.
    await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
    await doc.execute('core.createContainer', {
      id: 'bldg',
      kind: 'building',
      name: 'B',
      parentId: 'site',
    });
    for (const [id, elevation] of [
      ['L0', 0],
      ['Lmid', 1500],
      ['L1', 3000],
    ] as const) {
      await doc.execute('core.createContainer', {
        id,
        kind: 'level',
        name: id,
        parentId: 'bldg',
        elevation,
      });
    }
    // Two grid axes whose intersection is (2000, 5000): 'A' runs along Y (fixes X=2000), 'B' along X (Y=5000).
    await doc.execute('core.createGrid', { id: 'A', name: 'A', axis: 'y', offset: 2000 });
    await doc.execute('core.createGrid', { id: 'B', name: 'B', axis: 'x', offset: 5000 });
    return doc;
  };

  const boundsOf = async (doc: DocumentContext, elementId: string) => {
    const part = doc.partsOf(elementId)!.find((p) => p.name === 'member')!;
    return (await client.request('bounds', { handle: part.handle })).bounds;
  };

  it('⚠ HEIGHT IS DERIVED from base→top Levels — no height param needed (D52)', async () => {
    const doc = await newDoc();
    const edit = await doc.execute('core.createElement', {
      typeId: 'core.constrainedMember.v1',
      baseLevel: 'L0',
      topLevel: 'L1',
      params: { width: W, depth: D },
    });
    const id = edit.changes[0]!.id;
    expect(doc.brokenRefs()).toHaveLength(0);
    const b = await boundsOf(doc, id);
    // Bottom sits on L0 (z=0), top reaches L1 (z=3000): a 3000-tall member, its height authored NOWHERE.
    expect(b.min[2]).toBeCloseTo(0);
    expect(b.max[2]).toBeCloseTo(3000);
  });

  it('⚠ A PARAPET: top offset lifts the extent above the Level (Finding 1)', async () => {
    const doc = await newDoc();
    const edit = await doc.execute('core.createElement', {
      typeId: 'core.constrainedMember.v1',
      baseLevel: 'L0',
      topLevel: 'L1',
      topOffset: 1100,
      params: { width: W, depth: D },
    });
    const b = await boundsOf(doc, edit.changes[0]!.id);
    expect(b.min[2]).toBeCloseTo(0);
    expect(b.max[2]).toBeCloseTo(4100); // L1 (3000) + 1100 parapet
  });

  it('⚠ A FOOTING: negative base offset drops the extent below the Level (Finding 1)', async () => {
    const doc = await newDoc();
    const edit = await doc.execute('core.createElement', {
      typeId: 'core.constrainedMember.v1',
      baseLevel: 'L0',
      baseOffset: -300,
      topLevel: 'L1',
      params: { width: W, depth: D },
    });
    const b = await boundsOf(doc, edit.changes[0]!.id);
    expect(b.min[2]).toBeCloseTo(-300); // 300 below L0 for the footing
    expect(b.max[2]).toBeCloseTo(3000);
  });

  it('⚠ GRID PLACEMENT: the member is centred on the intersection of its grid constraints', async () => {
    const doc = await newDoc();
    const edit = await doc.execute('core.createElement', {
      typeId: 'core.constrainedMember.v1',
      baseLevel: 'L0',
      topLevel: 'L1',
      gridRefs: ['A', 'B'],
      params: { width: W, depth: D },
    });
    const b = await boundsOf(doc, edit.changes[0]!.id);
    // centred on (2000, 5000): X in [1800,2200], Y in [4800,5200].
    expect(b.min[0]).toBeCloseTo(2000 - W / 2);
    expect(b.max[0]).toBeCloseTo(2000 + W / 2);
    expect(b.min[1]).toBeCloseTo(5000 - D / 2);
    expect(b.max[1]).toBeCloseTo(5000 + D / 2);
  });

  it('⚠⚠ THE MODEL IS ASSOCIATIVE: REBIND the base datum and the solid FOLLOWS (real command path)', async () => {
    const doc = await newDoc();
    const created = await doc.execute('core.createElement', {
      typeId: 'core.constrainedMember.v1',
      baseLevel: 'L0',
      topLevel: 'L1',
      params: { width: W, depth: D },
    });
    const id = created.changes[0]!.id;
    expect((await boundsOf(doc, id)).min[2]).toBeCloseTo(0); // bottom on L0

    // Find and remove the base constraint, then rebind the base to Lmid (elevation 1500).
    const baseId = Object.values(doc.scene.constraints).find(
      (c) => c.element === id && c.kind === 'base',
    )!.id;
    await doc.execute('core.deleteConstraint', { id: baseId });
    await doc.execute('core.createConstraint', { element: id, kind: 'base', target: 'Lmid' });

    expect(doc.brokenRefs()).toHaveLength(0);
    // The base datum changed (L0 → Lmid) and the geometry FOLLOWED — the member now starts at 1500.
    const b = await boundsOf(doc, id);
    expect(b.min[2]).toBeCloseTo(1500);
    expect(b.max[2]).toBeCloseTo(3000); // top (L1) unchanged
  });

  it('adding a grid binding to an existing member RE-STAGES it onto the intersection', async () => {
    const doc = await newDoc();
    const created = await doc.execute('core.createElement', {
      typeId: 'core.constrainedMember.v1',
      baseLevel: 'L0',
      topLevel: 'L1',
      params: { width: W, depth: D },
    });
    const id = created.changes[0]!.id;
    expect((await boundsOf(doc, id)).min[0]).toBeCloseTo(-W / 2); // at the origin

    await doc.execute('core.createConstraint', { element: id, kind: 'grid', target: 'A' });
    await doc.execute('core.createConstraint', { element: id, kind: 'grid', target: 'B' });

    const b = await boundsOf(doc, id);
    expect(b.min[0]).toBeCloseTo(2000 - W / 2); // now on grid A ∩ B
    expect(b.min[1]).toBeCloseTo(5000 - D / 2);
  });

  it('a constraint to a missing datum is REFUSED, not silently dropped', async () => {
    const doc = await newDoc();
    const created = await doc.execute('core.createElement', {
      typeId: 'core.constrainedMember.v1',
      baseLevel: 'L0',
      topLevel: 'L1',
      params: { width: W, depth: D },
    });
    const id = created.changes[0]!.id;
    await expect(
      doc.execute('core.createConstraint', { element: id, kind: 'base', target: 'no-such-level' }),
    ).rejects.toThrow();
  });

  it('⚠ FREEZE-SAFETY (§8.9): the Constraint union extends WITHOUT editing existing members', () => {
    // The point of the rev-2 reshape (P5_step0b_design.md, Finding 2). Rows 6–9 (attach/align/dimension,
    // and the 0d sketch constraints) must be ADDITIVE members, never edits to `DatumConstraint`. This block
    // is the executable proof: a `DatumConstraint` stays assignable to an EXTENDED union, and an extended
    // target still admits `level`/`grid` — so the freeze does not foreclose a Revit/ArchiCAD-class model.
    type ExtendedTarget =
      | ConstraintTarget
      | { readonly kind: 'element'; readonly id: string }
      | { readonly kind: 'ref'; readonly token: string };
    type ExtendedConstraint =
      | Constraint
      | {
          readonly id: string;
          readonly element: string;
          readonly kind: 'attach';
          readonly target: ExtendedTarget;
        };

    const datum: Constraint = {
      id: 'x',
      element: 'e',
      kind: 'base',
      target: { kind: 'level', id: 'L' },
    };
    const widened: ExtendedConstraint = datum; // compiles ⇒ DatumConstraint is a member of the wider union
    const stillValid: ExtendedTarget = { kind: 'grid', id: 'A' }; // existing target still admitted
    expect(widened.kind).toBe('base');
    expect(stillValid.kind).toBe('grid');
  });
});
