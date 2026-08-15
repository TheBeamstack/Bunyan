/**
 * ENTRY 87 — **THE BELONGS-TO CYCLE, AUTHORED BY TWO SHIPPED VERBS.**
 *
 * ⚠⚠ THE FINDING. Entry 85 swept `hostId` and closed it: *"`hostId` cannot dangle through the shipped
 * verbs — `createElement` and `retargetReference` both `requireElement`; D39 takes the hosted with the
 * host."* Every word of that is true, and it answers the wrong question. **`requireElement` proves the
 * target EXISTS. It does not prove the target is not the element itself, or something that leads back
 * to it.** A reference that resolves can still be a reference that LOOPS.
 *
 * And a loop is not a broken reference — it is an **erased element**. `isElementActive` (correctly)
 * excludes every member of a belongs-to cycle, so the element leaves `modelElements()`, every schedule,
 * the project roll-up, the Clean Delta, the room solver, the join resolver and every view — while
 * sitting in `scene.elements` with `brokenRefs()` and `unbuildable()` **both empty**.
 *
 * Measured through the shipped verbs, on a document with no design options and no `.bnn` tampering:
 *
 * ```
 * core.retargetReference  { elementId: w, hostId: w }          → ACCEPTED
 * core.setElementMetadata { elementId: w, parentElementId: w } → ACCEPTED
 *     scene.elements 1 · modelElements() 0 · brokenRefs() [] · unbuildable() []
 *     projectQuantities() → { rows: [], unmeasured: [], basis: 'exact' }
 * ```
 *
 * **One verb call turns a real wall into zero rows wearing the `exact` badge.** That is domain rule 15's
 * failure mode and D83's silent erasure, arriving by a third road — and unlike D83 it
 * needs no ruling, because no authoring intent maps to *"a wall hosted on itself."* It is a precondition,
 * refused at the door, exactly as `requireElement` refuses a host that is not there.
 *
 * ⚠ THE GUARD WALKS BOTH EDGES ON PURPOSE (§3). A `hostId`-only guard leaves the MIXED cycle open, and
 * `isElementActive` excludes that one just the same.
 *
 * ⚠ REVERT-VERIFY: remove either `wouldCloseBelongsToCycle` call in `commands.ts` and §1/§2 fail — §1
 * with the measured erasure numbers themselves, not merely with "no error was thrown".
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  cascadeOf,
  createRegistries,
  isElementActive,
  wouldCloseBelongsToCycle,
} from '@bunyan/document';
import type { ElementId, OptionScope, OptionedElement } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

describe('the belongs-to cycle — authorable, silent, and now refused', () => {
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

  const seeded = async (): Promise<DocumentContext> => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });
    await doc.execute('core.createMaterial', {
      id: 'blockwork',
      name: 'Blockwork',
      category: 'masonry',
      density: 1800,
    });
    await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
    await doc.execute('core.createContainer', {
      id: 'l1',
      kind: 'level',
      name: 'Level 1',
      parentId: 'site',
      elevation: 0,
    });
    await doc.execute('core.createStyle', {
      id: 'EXT',
      name: 'EXT',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'blockwork', thickness: 200, discipline: 'structural' },
      ],
    });
    return doc;
  };

  const wall = async (doc: DocumentContext, length = 6000): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: 'EXT',
        containerId: 'l1',
        params: { length, height: 3000 },
      })
    ).changes[0]!.id;

  const faceOf = (doc: DocumentContext, id: string): string => {
    const structure = doc.partsOf(id)!.find((p) => p.name === 'structure')!;
    return structure.refs.find((r) => r.includes('/face/y-min'))!;
  };

  const openingIn = async (doc: DocumentContext, host: string): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: 'core.opening.v1',
        hostId: host,
        hostRef: faceOf(doc, host),
        containerId: 'l1',
        params: { width: 1000, height: 1400, anchor: 'fixed', offsetU: 500, offsetV: 900 },
      })
    ).changes[0]!.id;

  /* ============================================================================================
   * §1 — THE SELF-LOOP, ON BOTH EDGES. One verb call, and the element is gone from everything.
   * ========================================================================================= */

  it('⚠⚠ `core.retargetReference` REFUSES an element as its own host', async () => {
    const doc = await seeded();
    const w = await wall(doc);
    const face = faceOf(doc, w);

    await expect(
      doc.execute('core.retargetReference', { elementId: w, hostId: w, hostRef: face }),
    ).rejects.toThrow(/would close a cycle/);

    // ⚠ AND THE POINT IS NOT THAT IT THREW — it is that the element is STILL THERE and still counted.
    // Before the guard this call was ACCEPTED and every number below went to zero.
    const scope: OptionScope = { elements: doc.scene.elements };
    expect(doc.scene.elements[w]?.hostId).toBeUndefined();
    expect(isElementActive(doc.scene.elements[w]!, scope)).toBe(true);
    expect(doc.modelElements()).toHaveLength(1);
    expect(doc.brokenRefs()).toHaveLength(0);
    expect(doc.unbuildable()).toHaveLength(0);
  }, 60_000);

  it('⚠⚠ `core.setElementMetadata` REFUSES an element as its own parent — and this is the SILENT one', async () => {
    const doc = await seeded();
    const w = await wall(doc);

    await expect(
      doc.execute('core.setElementMetadata', { elementId: w, parentElementId: w }),
    ).rejects.toThrow(/would close a cycle/);

    const scope: OptionScope = { elements: doc.scene.elements };
    expect(doc.scene.elements[w]?.parentElementId).toBeUndefined();
    expect(isElementActive(doc.scene.elements[w]!, scope)).toBe(true);
    expect(doc.modelElements()).toHaveLength(1);

    // ⚠⚠ THE NUMBER THE DEFECT PRODUCED: a whole-model schedule of ZERO rows carrying `basis: 'exact'`.
    const quantities = await doc.projectQuantities();
    expect(quantities.basis).toBe('exact');
    expect(quantities.rows.length).toBeGreaterThan(0);
  }, 60_000);

  /* ============================================================================================
   * §2 — LONGER CYCLES, AND THE MIXED ONE THAT A SINGLE-EDGE GUARD WOULD MISS.
   * ========================================================================================= */

  it('a TWO-NODE hosting cycle is refused — wall hosted on the opening hosted in it', async () => {
    const doc = await seeded();
    const w = await wall(doc);
    const opening = await openingIn(doc, w);

    await expect(
      doc.execute('core.retargetReference', {
        elementId: w,
        hostId: opening,
        hostRef: faceOf(doc, w),
      }),
    ).rejects.toThrow(/would close a cycle/);

    expect(doc.modelElements().length).toBeGreaterThan(0);
    expect(doc.scene.elements[w]?.hostId).toBeUndefined();
  }, 60_000);

  it('⚠⚠ the MIXED cycle — `hostId` one way, `parentElementId` the other — is refused too', async () => {
    // A `hostId`-only guard accepts BOTH of these calls, and `isElementActive` then excludes both
    // elements. The guard's edge set must be the exclusion rule's edge set or the hole simply moves.
    const doc = await seeded();
    const a = await wall(doc);
    const b = await wall(doc, 4000);

    await doc.execute('core.setElementMetadata', { elementId: a, parentElementId: b });
    await expect(
      doc.execute('core.retargetReference', { elementId: b, hostId: a, hostRef: faceOf(doc, a) }),
    ).rejects.toThrow(/would close a cycle/);

    const scope: OptionScope = { elements: doc.scene.elements };
    expect(isElementActive(doc.scene.elements[a]!, scope)).toBe(true);
    expect(isElementActive(doc.scene.elements[b]!, scope)).toBe(true);
    expect(doc.modelElements()).toHaveLength(2);
  }, 60_000);

  it('a THREE-node chain cycle is refused — the guard walks the whole chain, not one step', () => {
    const scope: OptionScope = {
      elements: {
        a: { id: 'a', hostId: 'b' },
        b: { id: 'b', hostId: 'c' },
        c: { id: 'c' },
      },
    };
    // pointing c at a closes a → b → c → a
    expect(wouldCloseBelongsToCycle(scope, 'c', 'a')).toBe(true);
    expect(wouldCloseBelongsToCycle(scope, 'c', 'b')).toBe(true);
  });

  /* ============================================================================================
   * §3 — THE MIRROR: WHAT DOES THE GUARD NOW REFUSE THAT IT SHOULD NOT?
   *
   * ⚠ Every assertion above is a refusal, and `return true` passes all of them. This section is the
   * other direction, and it is the half that decides whether the guard is usable.
   * ========================================================================================= */

  it('⚠⚠ a LEGITIMATE retarget onto a different wall still works', async () => {
    const doc = await seeded();
    const w1 = await wall(doc);
    const w2 = await wall(doc, 4000);
    const opening = await openingIn(doc, w1);

    await doc.execute('core.retargetReference', {
      elementId: opening,
      hostId: w2,
      hostRef: faceOf(doc, w2),
    });

    expect(doc.scene.elements[opening]?.hostId).toBe(w2);
    expect(doc.brokenRefs()).toHaveLength(0);
    const scope: OptionScope = { elements: doc.scene.elements };
    expect(isElementActive(doc.scene.elements[opening]!, scope)).toBe(true);
  }, 60_000);

  it('⚠ a DIAMOND is not a cycle here either — the guard must not inherit the D67 defect', () => {
    // w hangs off grp by parent; grp and host both sit under `outer`. Pointing w's host at `host`
    // reaches `outer` by two routes and closes nothing.
    const scope: OptionScope = {
      elements: {
        w: { id: 'w', parentElementId: 'grp' },
        grp: { id: 'grp', parentElementId: 'outer' },
        host: { id: 'host', parentElementId: 'outer' },
        outer: { id: 'outer' },
      },
    };
    expect(wouldCloseBelongsToCycle(scope, 'w', 'host')).toBe(false);
  });

  it('⚠ re-parenting UPWARD is legal — a member may move to its own grandparent', () => {
    const scope: OptionScope = {
      elements: {
        w: { id: 'w', parentElementId: 'inner' },
        inner: { id: 'inner', parentElementId: 'outer' },
        outer: { id: 'outer' },
      },
    };
    expect(wouldCloseBelongsToCycle(scope, 'w', 'outer')).toBe(false);
    // …but the reverse — making the grandchild the parent of its own ancestor — is not.
    expect(wouldCloseBelongsToCycle(scope, 'outer', 'w')).toBe(true);
  });

  it('⚠ a BROKEN ancestor in the chain is not this guard’s business (domain rule 3)', () => {
    const scope: OptionScope = {
      elements: { a: { id: 'a', hostId: 'gone' }, b: { id: 'b' } },
    };
    // The walk hits a missing id, does not throw, does not claim a cycle, and terminates.
    expect(wouldCloseBelongsToCycle(scope, 'b', 'a')).toBe(false);
  });

  it('⚠ it TERMINATES on a scene that already contains a cycle — a `.bnn` older than the guard', () => {
    const scope: OptionScope = {
      elements: {
        a: { id: 'a', hostId: 'b' },
        b: { id: 'b', hostId: 'a' },
        fresh: { id: 'fresh' },
      },
    };
    expect(wouldCloseBelongsToCycle(scope, 'fresh', 'a')).toBe(false);
    expect(wouldCloseBelongsToCycle(scope, 'a', 'b')).toBe(true);
  });

  /* ============================================================================================
   * §4 — `cascadeOf` — THE OTHER WALK, SWEPT. Entry 85 left it alone on the grounds that its single
   * `seen` set is "a pure visited-memo over a single edge". That is a claim about code (§1c-7).
   * ========================================================================================= */

  it('⚠ `cascadeOf` TERMINATES on a hosting cycle and names the rest of it — the `.bnn` road stays open', () => {
    // The verbs can no longer author this, but D43 round-trips an unknown document verbatim, so the
    // shape is still reachable and the walk must still be total.
    const scene = {
      elements: {
        a: { id: 'a', hostId: 'b' },
        b: { id: 'b', hostId: 'a' },
      },
    } as unknown as Parameters<typeof cascadeOf>[0];
    expect(cascadeOf(scene, 'a').map((e) => e.id)).toEqual(['b']);
    expect(cascadeOf(scene, 'b').map((e) => e.id)).toEqual(['a']);

    // …and the MIXED cycle, which is the one a single-edge walk cannot even see (D83).
    const mixed = {
      elements: {
        a: { id: 'a', hostId: 'b' },
        b: { id: 'b', parentElementId: 'a' },
      },
    } as unknown as Parameters<typeof cascadeOf>[0];
    expect(cascadeOf(mixed, 'a').map((e) => e.id)).toEqual(['b']);
  });

  it('⚠⚠ `rebuilt` is COMPLETE, and not for the reason the command suggests — the EXECUTOR overrides it', async () => {
    // `deleteElement` passes `rebuilt: [element.hostId]` (empty for a root wall), which reads like an
    // undercount when the cascade kills N. It is not: `DocumentContext.execute` replaces the command's
    // hint with the `affected` set it computed itself. COUNTED rather than read (§1c-8).
    const doc = await seeded();
    const w = await wall(doc);
    const openings = [
      await openingIn(doc, w),
      (
        await doc.execute('core.createElement', {
          typeId: 'core.opening.v1',
          hostId: w,
          hostRef: faceOf(doc, w),
          containerId: 'l1',
          params: { width: 800, height: 1400, anchor: 'fixed', offsetU: 2500, offsetV: 900 },
        })
      ).changes[0]!.id,
    ];

    const edit = await doc.execute('core.deleteElement', { elementId: w });

    expect(edit.changes).toHaveLength(3); // the wall + both hosted openings
    // The root wall has NO host, so the command's own hint is `[]` — and `rebuilt` still names all three.
    expect([...edit.rebuilt].sort()).toEqual([w, ...openings].sort());
    expect(Object.keys(doc.scene.elements)).toHaveLength(0);
    expect(doc.brokenRefs()).toHaveLength(0);
  }, 120_000);

  /**
   * ⚠⚠ THE TWO WALKS SHARE ONE EDGE SET (D83, owner-ruled 2026-08-15), AND THIS IS WHERE THAT IS
   * ASSERTED. `cascadeOf` decides what a delete destroys; `isElementActive` decides what a consumer
   * counts. An element the second excludes and the first spares is a row in `scene.elements` that
   * nothing can see — which is what a `hostId`-only cascade left behind on the `parentElementId` edge.
   *
   * The behaviour through the shipped verbs, and the surfacing half of the same ruling, are
   * `tests/belongs-to-deletion-d83.test.ts`; this asserts the agreement itself, on the two functions.
   */
  it('⚠⚠ `cascadeOf` and `isElementActive` walk the SAME belongs-to edges', () => {
    const elements: Record<string, OptionedElement> = {
      root: { id: 'root' },
      hosted: { id: 'hosted', hostId: 'root' },
      member: { id: 'member', parentElementId: 'root' },
      outsider: { id: 'outsider' },
    };
    const scene = { elements } as unknown as Parameters<typeof cascadeOf>[0];

    // Everything the cascade takes is everything the exclusion rule would lose when `root` goes.
    expect(
      cascadeOf(scene, 'root')
        .map((e) => e.id)
        .sort(),
    ).toEqual(['hosted', 'member']);
    const survivors: OptionScope = { elements: { outsider: elements['outsider']! } };
    for (const id of ['hosted', 'member']) {
      expect(isElementActive(elements[id]!, survivors)).toBe(false);
    }
    expect(isElementActive(elements['outsider']!, survivors)).toBe(true);
  });

  it('deleting a HOSTED element rebuilds the surviving host — the one host a cascade leaves behind', async () => {
    const doc = await seeded();
    const w = await wall(doc);
    const opening = await openingIn(doc, w);

    const edit = await doc.execute('core.deleteElement', { elementId: opening });

    expect(edit.rebuilt).toContain(w); // the hole is gone; the wall must re-cut
    expect(Object.keys(doc.scene.elements)).toEqual([w]);
  }, 60_000);

  /* ============================================================================================
   * §5 — ENTRY 88'S REVIEW: IS §3 THE WHOLE POPULATION?
   *
   * ⚠⚠ §3 is five hand-picked graphs, and "the guard does not over-refuse" is a claim about a
   * POPULATION, which five examples cannot discharge. This section answers it by MEASUREMENT, in the
   * form Entry 85 used on `isElementActive` (`option-cascade-d67.test.ts` §8): a differential fuzz
   * against two oracles that share no code with the guard.
   * ========================================================================================= */

  it('⚠ SIBLINGS: retargeting onto your own sibling under a shared ancestor is LEGAL, both edges', () => {
    // The case §3 did not build, and the one a user reaches second (after the self-loop).
    const sameEdge: OptionScope = {
      elements: { a: { id: 'a', hostId: 'p' }, b: { id: 'b', hostId: 'p' }, p: { id: 'p' } },
    };
    expect(wouldCloseBelongsToCycle(sameEdge, 'a', 'b')).toBe(false);
    expect(wouldCloseBelongsToCycle(sameEdge, 'b', 'a')).toBe(false);

    // …and MIXED, where a single-edge guard would have had nothing to say either way.
    const mixed: OptionScope = {
      elements: {
        a: { id: 'a', hostId: 'p' },
        b: { id: 'b', parentElementId: 'p' },
        p: { id: 'p' },
      },
    };
    expect(wouldCloseBelongsToCycle(mixed, 'a', 'b')).toBe(false);
    expect(wouldCloseBelongsToCycle(mixed, 'b', 'a')).toBe(false);
  });

  it('⚠⚠ DIFFERENTIAL FUZZ — 20 000 graphs, 100 000 queries, guard === "this edit erases the element"', () => {
    // Deterministic LCG, so a disagreement is reproducible from the seed alone.
    let s = 20260808;
    const rnd = (n: number): number => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s % n;
    };

    /** ORACLE 1 — reachability, written independently of the guard: is `target` on any cycle? */
    const onACycle = (scope: OptionScope, target: ElementId): boolean => {
      const stack = [target];
      const seen = new Set<ElementId>();
      while (stack.length > 0) {
        const node = scope.elements[stack.pop()!];
        if (node === undefined) continue;
        for (const next of [node.hostId, node.parentElementId]) {
          if (next === undefined || seen.has(next)) continue;
          if (next === target) return true;
          seen.add(next);
          stack.push(next);
        }
      }
      return false;
    };

    // ⚠ SPARSE AND DEEP ON PURPOSE. A dense 8-node graph made 99.8% of queries a refusal — which tests
    // over-refusal hard and under-refusal barely at all. Both verdicts must be well populated, or
    // "zero disagreements" is a statement about one half of the guard.
    const N = 14;
    const ids = Array.from({ length: N }, (_, i) => `e${i}`);
    let refused = 0;
    let allowed = 0;
    const disagreements: string[] = [];

    for (let g = 0; g < 20_000; g++) {
      // Acyclic by construction — an edge always points at a strictly LOWER index, drawn from the
      // nearest three, which makes a deep narrow DAG rather than a near-total order.
      const elements: Record<string, OptionedElement> = {};
      for (let i = 0; i < N; i++) {
        const near = (): ElementId => ids[i - 1 - rnd(Math.min(i, 3))]!;
        elements[ids[i]!] = {
          id: ids[i]!,
          ...(i > 0 && rnd(2) === 0 ? { hostId: near() } : {}),
          ...(i > 0 && rnd(3) === 0 ? { parentElementId: near() } : {}),
        };
      }
      const base: OptionScope = { elements };

      for (let q = 0; q < 5; q++) {
        const e = ids[rnd(N)]!;
        const a = ids[rnd(N)]!;
        const edge = rnd(2) === 0 ? 'hostId' : 'parentElementId';
        const guard = wouldCloseBelongsToCycle(base, e, a);
        if (guard) refused++;
        else allowed++;

        // ⚠ The oracles read the edit APPLIED, not the guard's opinion of it.
        const mutated: OptionScope = {
          elements: { ...elements, [e]: { ...elements[e]!, [edge]: a } },
        };
        // ORACLE 2 — the product-level consequence. With no design options and no broken refs, an
        // element is inactive iff its belongs-to closure contains a cycle. THIS is what the guard is
        // for, and it shares no line of code with it.
        const erased = !isElementActive(mutated.elements[e]!, mutated);
        if (guard !== onACycle(mutated, e) || guard !== erased) {
          disagreements.push(`${e} -${edge}-> ${a} guard=${guard} erased=${erased}`);
        }
      }
    }

    expect(disagreements).toEqual([]);
    // ⚠ WITHOUT THESE TWO THE TEST PASSES WHILE ITS TITLE IS FALSE (checklist item 6): a fuzz that
    // only ever refuses proves nothing about over-refusal, and vice versa. Measured: 43 667 / 56 333.
    expect(refused).toBeGreaterThan(20_000);
    expect(allowed).toBeGreaterThan(20_000);
  });

  it('⚠ AND THE ONE DIVERGENCE — the guard proves "no NEW cycle", not "the element is active after"', () => {
    // A pre-existing cycle can no longer be AUTHORED, but D43 round-trips an unknown `.bnn` verbatim,
    // so a legacy document can still carry one. Attaching to it is ALLOWED — correctly: the cycle is
    // not this edit's doing, and refusing would block the repair. But the element is inactive at once.
    const elements = {
      a: { id: 'a', hostId: 'b' },
      b: { id: 'b', hostId: 'a' },
      fresh: { id: 'fresh' },
    } satisfies Record<string, OptionedElement>;
    expect(wouldCloseBelongsToCycle({ elements }, 'fresh', 'a')).toBe(false);

    const after: OptionScope = { elements: { ...elements, fresh: { id: 'fresh', hostId: 'a' } } };
    expect(isElementActive(after.elements['fresh']!, after)).toBe(false);

    // ⚠ This is NOT a hole in the guard — it is the ordinary inactive-ancestor rule, and a BROKEN
    // ancestor (which the guard also allows, §3) already erases exactly the same way.
    const broken: OptionScope = { elements: { x: { id: 'x', hostId: 'gone' } } };
    expect(isElementActive(broken.elements['x']!, broken)).toBe(false);
  });
});
