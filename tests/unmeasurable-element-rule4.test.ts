/**
 * ⚠⚠ DOMAIN RULE 4, SWEPT BACKWARD — *"failed operations reject and preserve the last-good state; no
 * partial or auto-invented geometry"* — at the granularity the rule is actually about. Real OCCT,
 * headless. (2026-07-27, Entry 62 cont.)
 *
 * **THE FINDING: ONE ELEMENT THAT COULD NOT BE MEASURED KILLED THE WHOLE BUILDING'S TAKE-OFF.**
 * `projectQuantities` called `quantities(id)` unguarded, so a single `measure` refusal anywhere threw
 * out of the loop — no rows, no totals, no `unmeasured` list, nothing. The owner had already ruled the
 * opposite (Entry 58, Q1): *an element that cannot be MEASURED is reported in `unmeasured`, never zeroed
 * and never silently dropped.* **Aborting is a third behaviour that ruling did not sanction**, and it is
 * D43's shape one level up — *one unregistered type must not brick a file* becomes *one unmeasurable
 * element must not brick an export.*
 *
 * ⚠⚠ **AND THIS SESSION'S OWN WORK WIDENED IT, WHICH IS WHY IT WAS SWEPT.** D72 made `quantities()`
 * measure each declared exposed face via `measure(ref)`, and Entry 62 put a declaration on every shipped
 * Type — so the number of kernel calls a take-off makes, and with it the surface on which one can
 * refuse, grew by roughly a factor of the faces declared. *Entry 58's standing lesson, again on my own
 * work: a surface going green is when the sweep should START.*
 *
 * **TWO FIXES, AND THEY ARE COMPLEMENTARY, NOT REDUNDANT:**
 *
 *  1. **AT THE SOURCE (§1)** — a Type that declares an `exposedRefs` entry which is not one of its own
 *     part's `refs` is now REFUSED at build time, in the same idiom and two lines from the check that
 *     already refuses a Type minting two parts on one DAG node. Nothing validated the subset, so the
 *     element built **`valid`** and the bug surfaced only when somebody priced the building — the D69
 *     discipline (*fix it at the source, don't report it*), and this session's own lesson that a rule
 *     holds when violating it is LOUD.
 *     ⚠ **Authoring one REJECTS the command (D42), it does not carry the element — and that is not a
 *     departure from D43.** D43 is for a type this session does not KNOW (a plugin, a Miqdar file, one
 *     from the future): `failure: 'unbuildable'`, carried and preserved verbatim. A type that is simply
 *     WRONG is `failure: 'geometry'`, and rule 4 rejects it and keeps the last-good state. **On the LOAD
 *     path both are carried** (`rebuildAll` never rejects), which is the road §1b takes.
 *  2. **AS A BACKSTOP (§2)** — `projectQuantities` now reports a measure failure in `unmeasured` rather
 *     than throwing. Fix 1 removes the reachable cause; fix 2 is what honours the ruling for every other
 *     way the kernel can refuse a measurement, and it is tested against a gateway that refuses one.
 *
 * ⚠ **THE SECOND IS NOT MADE REDUNDANT BY THE FIRST.** Fix 1 removes the one cause anybody could name;
 * fix 2 is what honours the ruling for the causes nobody can name in advance — a degenerate solid, an
 * `INVALID_RESULT`, a kernel refusing for a reason that does not exist yet. §2 reaches it with a gateway
 * that refuses one measurement, because that is the only honest way left to reach it.
 *
 * ⚠ **A DIRECT `quantities(id)` STILL THROWS, DELIBERATELY.** Asking for one element's numbers and
 * getting a refusal is right; asking for the building's and getting nothing is not. The rule is about
 * *which* state is preserved, and here the last-good state of an aggregate is *every other element*.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import type {
  BimObjectType,
  BuildContext,
  BuiltPart,
  GeometryGateway,
  Registries,
} from '@bunyan/document';
import { wallType } from '@bunyan/types';

/** A box Type. `bogusExposed` makes it declare a face it does not have — the mistake a third-party or
 * data-family (D61) Type makes, on a member that FREEZES at P5. */
const boxType = (id: string, bogusExposed: boolean): BimObjectType => ({
  id,
  version: 1,
  label: 'Box',
  parameterSchema: {},
  defaultClassification: { ifcClass: 'IfcBuildingElementProxy', loadBearing: false },
  defaultDiscipline: 'architectural',
  async buildGeometry(ctx: BuildContext): Promise<readonly BuiltPart[]> {
    const nodeId = ctx.nodeId('box');
    const solid = await ctx.geometry.request('makeBox', {
      nodeId,
      dx: 1000,
      dy: 1000,
      dz: 1000,
      at: [0, 0, 0],
    });
    return [
      {
        name: 'box',
        materialId: '',
        discipline: ctx.defaultDiscipline,
        nodeId,
        handle: solid.handle,
        refs: solid.refs,
        exposedRefs: bogusExposed
          ? [`${nodeId}/face/lateral.7#0`] // a box has no lateral faces at all
          : solid.refs.filter((r) => r.includes('/face/z-max')),
      },
    ];
  },
});

describe('domain rule 4 — one unmeasurable element may not brick the building', () => {
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

  const newDoc = (types: readonly BimObjectType[], geometry: GeometryGateway = client) => {
    const r: Registries = createRegistries();
    r.types.register(wallType);
    for (const t of types) r.types.register(t);
    for (const c of CORE_COMMANDS) r.commands.register(c);
    return new DocumentContext({ registries: r, geometry });
  };

  const threeGoodWalls = async (doc: DocumentContext): Promise<void> => {
    for (let i = 0; i < 3; i++) {
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start: [0, i * 2000], end: [5000, i * 2000], thickness: 200, height: 3000 },
      });
    }
  };

  /* ============================================================================================
   * §1 — AT THE SOURCE: a declaration naming a face the part does not have is REFUSED at build.
   * ========================================================================================= */

  it('⚠⚠ §1 authoring with such a Type is REFUSED at build time, naming the face', async () => {
    const doc = newDoc([boxType('test.bogus', true)]);
    await threeGoodWalls(doc);

    // ⚠ IT REJECTS THE COMMAND (D42), it does not carry the element — and that is the established idiom
    // for a BROKEN Type, not a departure from D43. The duplicate-DAG-node check directly above it in
    // `build.ts` does exactly the same: D43 is for a type this session does not KNOW (a plugin, a
    // Miqdar file, one from the future), which is `failure: 'unbuildable'`; a type that is simply
    // WRONG is `failure: 'geometry'`, and rule 4 rejects it and keeps the last-good state.
    //
    // Measured failing first: the element built `valid`, entered the document, and the fault surfaced
    // only when somebody priced the building.
    await expect(
      doc.execute('core.createElement', { typeId: 'test.bogus', params: {} }),
    ).rejects.toThrow(/lateral\.7/);

    // Nothing partial: the three walls stand, no fourth element, no broken ref (rule 4's other half).
    expect(doc.modelElements()).toHaveLength(3);
    expect(doc.brokenRefs()).toHaveLength(0);
  });

  it('⚠⚠ §1b a document that ALREADY contains one opens, carries it, and still prices the rest', async () => {
    // ⚠ THE ROAD THAT GENUINELY REACHES THE LOAD PATH: author with a Type that declares correctly, save,
    // and reopen against a registry where that same type id now declares a face it does not have — an
    // app upgrade, a plugin version, a `.bnn` authored elsewhere. `rebuildAll` does NOT reject on a
    // failed element (D43: one bad type must not brick a file), so the element is carried…
    const authored = newDoc([boxType('test.swap', false)]);
    await threeGoodWalls(authored);
    await authored.execute('core.createElement', { typeId: 'test.swap', params: {} });
    const bad = Object.values(authored.scene.elements).find((e) => e.typeId === 'test.swap')!.id;

    const reopened = newDoc([boxType('test.swap', true)], client);
    const fresh = new DocumentContext({
      registries: reopened.registries,
      geometry: client,
      scene: authored.scene,
    });
    await fresh.rebuildAll();

    expect(fresh.geometryOf(bad)!.state).not.toBe('valid');
    expect(fresh.geometryOf(bad)!.error).toContain('lateral.7');

    // …and the take-off names it rather than dying on it. Measured failing first: the whole call threw
    // `[UNRESOLVED_SUBSHAPE_REF] … names a face, and this op needs an edge`, losing three perfectly
    // measurable walls to one bad declaration.
    const q = await fresh.projectQuantities();
    expect(q.rows).toHaveLength(3);
    expect(q.unmeasured.map((u) => u.elementId)).toEqual([bad]);
    expect(q.basis).toBe('exact');
  });

  it('§1c a Type that declares CORRECTLY is untouched — the fix changes only the wrong case', async () => {
    const doc = newDoc([boxType('test.good', false)]);
    await threeGoodWalls(doc);
    await doc.execute('core.createElement', { typeId: 'test.good', params: {} });

    const q = await doc.projectQuantities();
    expect(q.unmeasured).toHaveLength(0);
    expect(q.rows).toHaveLength(4);
    // The box declared its z-max face only: 1 m × 1 m, and nothing else.
    const box = q.rows.find((r) => r.typeId === 'test.good')!;
    expect(box.part.area / 1e6).toBeCloseTo(1, 6);
  });

  /* ============================================================================================
   * §2 — THE BACKSTOP: any OTHER measure refusal is reported, not thrown.
   * ========================================================================================= */

  it('⚠⚠ §2 a kernel that refuses ONE element’s measurement costs that element, not the export', async () => {
    // A gateway that refuses `measure` for whichever handle it is told to hate. This stands in for
    // every way the kernel can legitimately refuse a measurement that §1 cannot pre-empt — a degenerate
    // solid, an `INVALID_RESULT` — and it is the only way to reach the backstop now that §1 exists.
    const poison: { handle?: string } = {};
    const flaky: GeometryGateway = {
      request: (op, payload, options) => {
        if (
          op === 'measure' &&
          poison.handle !== undefined &&
          (payload as { handle: string }).handle === poison.handle
        ) {
          return Promise.reject(new Error('the kernel refused this measurement'));
        }
        return client.request(op, payload, options);
      },
    };

    const doc = newDoc([], flaky);
    await threeGoodWalls(doc);
    const victim = Object.values(doc.scene.elements)[1]!.id;
    poison.handle = doc.partsOf(victim)![0]!.handle;

    const q = await doc.projectQuantities();
    expect(q.rows).toHaveLength(2); // the other two walls still priced
    expect(q.unmeasured.map((u) => u.elementId)).toEqual([victim]);
    expect(q.unmeasured[0]!.reason).toContain('refused this measurement');
  });

  it('§2b a DIRECT `quantities(id)` still throws — asking about ONE element must refuse loudly', async () => {
    const poison: { handle?: string } = {};
    const flaky: GeometryGateway = {
      request: (op, payload, options) => {
        if (
          op === 'measure' &&
          poison.handle !== undefined &&
          (payload as { handle: string }).handle === poison.handle
        ) {
          return Promise.reject(new Error('the kernel refused this measurement'));
        }
        return client.request(op, payload, options);
      },
    };
    const doc = newDoc([], flaky);
    await threeGoodWalls(doc);
    const victim = Object.values(doc.scene.elements)[0]!.id;
    poison.handle = doc.partsOf(victim)![0]!.handle;

    // ⚠ The aggregate's last-good state is "every other element"; a single element's is nothing. The
    // backstop must not turn a direct question into a silent shrug.
    await expect(doc.quantities(victim)).rejects.toThrow();
  });
});
