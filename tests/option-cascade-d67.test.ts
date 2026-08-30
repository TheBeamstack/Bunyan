// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D67 / ROW Ⓖ — THE DESIGN-OPTION EXCLUSION **CASCADE** (design: `P5_step5G_option_cascade_design.md`).
 * Owner-ruled 2026-07-25 during the pre-freeze adversarial sweep the owner authorised in place of freezing.
 *
 * ⚠⚠ THE FINDING, AND WHY IT IS A FREEZE ITEM. D65 ruled the exclusion invariant INTO THE FROZEN CONTRACT —
 * not merely into storage — so that Bunyan, Planitor and Miqdar would implement ONE rule instead of three
 * slightly different ones. The rule shipped reading only an element's OWN `designOptionId`, and its signature
 * handed it no model, so it was structurally incapable of asking what the element hangs off.
 *
 * Measured (§1, real OCCT, real geometry): an author tags the two WALLS of two mutually-exclusive facade
 * schemes — the natural authoring act, and the only one Revit asks for — and a consumer applying the frozen
 * rule counts **4 windows where 1 is correct**, three of them hosted on the wall the SAME RULE JUST EXCLUDED.
 * Each is **a window with no wall**, billed into a scheme nobody builds: D65's own stated failure mode,
 * reached by the one road D65 did not walk — the hosting edge.
 *
 * The correction (owner-ruled shape): the rule is resolved against the MODEL and walks every "belongs-to"
 * edge — `hostId` now, `parentElementId` (groups) when they land. An element counts iff its own option is
 * active AND every element it hangs off is active.
 *
 * ⚠ Generated children (a curtain wall's panels, D59 Model A) need NO rule and are asserted so in §5:
 * they are not `scene.elements` rows, so they are never enumerated separately and are excluded WITH their
 * parent, by construction. **D59's derived-children ruling pays off a second time.**
 *
 * ⚠ REVERT-VERIFY (§1b: a fix without a test that fails in its absence is an assertion): remove the ancestor
 * walk from `isElementActive` and §1/§2/§4/§6/§7 fail — §1 with the original 4-windows number.
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
  isElementActive,
} from '@bunyan/document';
import type { ActiveOptions, DesignOption, OptionedElement, OptionScope } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

const OPTIONS: Readonly<Record<string, DesignOption>> = {
  'opt-a': { id: 'opt-a', setName: 'Facade', name: 'Scheme A', isPrimary: true },
  'opt-b': { id: 'opt-b', setName: 'Facade', name: 'Scheme B', isPrimary: false },
};

describe('D67 — the exclusion invariant cascades over every belongs-to edge', () => {
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

  const newDoc = (): DocumentContext => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return new DocumentContext({ registries, geometry: client });
  };

  /**
   * TWO MUTUALLY-EXCLUSIVE FACADE SCHEMES, built for real: Scheme A is one wall with one window, Scheme B
   * is one wall with three. **Only the WALLS carry an option tag** — which is the whole point: that is what
   * an architect authors, and the windows belong to their scheme by being hosted in it.
   */
  const twoSchemes = async (): Promise<{ doc: DocumentContext; wallA: string; wallB: string }> => {
    const doc = newDoc();
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

    const scheme = async (optionId: string, windows: number): Promise<string> => {
      const wallId = (
        await doc.execute('core.createElement', {
          typeId: 'core.wall.v1',
          styleId: 'EXT',
          containerId: 'l1',
          designOptionId: optionId,
          params: { length: 6000, height: 3000 },
        })
      ).changes[0]!.id;
      const structure = doc.partsOf(wallId)!.find((p) => p.name === 'structure')!;
      const face = structure.refs.find((r) => r.includes('/face/y-min'))!;
      for (let i = 0; i < windows; i++) {
        await doc.execute('core.createElement', {
          typeId: 'core.opening.v1',
          hostId: wallId,
          hostRef: face,
          containerId: 'l1',
          params: {
            width: 1000,
            height: 1400,
            anchor: 'fixed',
            offsetU: 500 + i * 1500,
            offsetV: 900,
          },
        });
      }
      return wallId;
    };

    const wallA = await scheme('opt-a', 1);
    const wallB = await scheme('opt-b', 3);
    // ⚠ WHAT THIS ASSERTS IS THAT NO WINDOW LOST ITS HOST FACE, and it is filtered rather than zero
    // because of D86: this fixture holds its catalogue OUTSIDE the scene (see `countActive`), so the
    // document cannot resolve either wall's tag and `brokenRefs()` now says so. A tag naming an option
    // the document itself does not hold is a broken reference, which is what the filter admits.
    expect(doc.brokenRefs().filter((b) => b.ref !== 'opt-a' && b.ref !== 'opt-b')).toHaveLength(0);
    return { doc, wallA, wallB };
  };

  // ⚠ This fixture exercises the CALLER-SUPPLIED catalogue — the `override` arm of `optionScopeOf`, which
  // Planitor/Miqdar take when they already hold one; the document's own `scene.designOptions` arm is
  // covered by `tests/design-option-crud.test.ts` (D85/Q17a).
  const countActive = (
    doc: DocumentContext,
    active: ActiveOptions = {},
  ): { walls: number; windows: number } => {
    const scope: OptionScope = { elements: doc.scene.elements, designOptions: OPTIONS };
    const counted = Object.values(doc.scene.elements).filter((e) =>
      isElementActive(e, scope, active),
    );
    return {
      walls: counted.filter((e) => e.typeId === 'core.wall.v1').length,
      windows: counted.filter((e) => e.typeId === 'core.opening.v1').length,
    };
  };

  /* ============================================================================================
   * §1 — THE MEASURED CASE. This is the assertion that was 4-instead-of-1 before the fix.
   * ========================================================================================= */

  it('⚠⚠ a window hosted on a NON-ACTIVE scheme’s wall is NOT counted (the D67 defect)', async () => {
    const { doc } = await twoSchemes();

    // No selection ⇒ the primary option (Scheme A) is what is being built.
    const { walls, windows } = countActive(doc);
    expect(walls).toBe(1); // this was always right
    expect(windows).toBe(1); // ⚠ THIS WAS 4 — three windows for a facade nobody builds
  });

  it('⚠ every counted window’s host is itself counted — no window without a wall, ever', async () => {
    const { doc } = await twoSchemes();
    const scope: OptionScope = { elements: doc.scene.elements, designOptions: OPTIONS };
    const counted = Object.values(doc.scene.elements).filter((e) => isElementActive(e, scope));
    const countedIds = new Set(counted.map((e) => e.id));
    for (const opening of counted.filter((e) => e.typeId === 'core.opening.v1')) {
      // The property the whole rule exists to guarantee, stated directly.
      expect(countedIds.has(opening.hostId!)).toBe(true);
    }
  });

  /* ============================================================================================
   * §2 — SWITCHING THE ACTIVE OPTION FLIPS BOTH THE WALL AND ITS WINDOWS, IN BOTH DIRECTIONS.
   * ========================================================================================= */

  it('choosing Scheme B flips the walls AND their hosted windows together', async () => {
    const { doc } = await twoSchemes();
    expect(countActive(doc, { Facade: 'opt-a' })).toEqual({ walls: 1, windows: 1 });
    expect(countActive(doc, { Facade: 'opt-b' })).toEqual({ walls: 1, windows: 3 });
  });

  it('⚠ EXACTLY ONE scheme is ever counted — the property a schedule/Clean Delta depends on', async () => {
    const { doc } = await twoSchemes();
    for (const active of [{}, { Facade: 'opt-a' }, { Facade: 'opt-b' }]) {
      const { walls } = countActive(doc, active);
      expect(walls).toBe(1); // never 0, never 2 — never a double-count
    }
  });

  /* ============================================================================================
   * §3 — THE CASCADE MUST NOT OVER-EXCLUDE. A rule that excluded too much would be just as wrong.
   * ========================================================================================= */

  it('a MAIN-MODEL wall’s windows are counted under every selection (nothing over-excluded)', async () => {
    const doc = newDoc();
    await doc.execute('core.createMaterial', {
      id: 'blockwork',
      name: 'Blockwork',
      category: 'masonry',
      density: 1800,
    });
    await doc.execute('core.createStyle', {
      id: 'EXT',
      name: 'EXT',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'blockwork', thickness: 200, discipline: 'structural' },
      ],
    });
    const wallId = (
      await doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: 'EXT',
        params: { length: 6000, height: 3000 },
      })
    ).changes[0]!.id;
    const structure = doc.partsOf(wallId)!.find((p) => p.name === 'structure')!;
    const face = structure.refs.find((r) => r.includes('/face/y-min'))!;
    await doc.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: wallId,
      hostRef: face,
      params: { width: 1000, height: 1400, anchor: 'fixed', offsetU: 500, offsetV: 900 },
    });

    const scope: OptionScope = { elements: doc.scene.elements, designOptions: OPTIONS };
    for (const active of [{}, { Facade: 'opt-a' }, { Facade: 'opt-b' }]) {
      const counted = Object.values(doc.scene.elements).filter((e) =>
        isElementActive(e, scope, active),
      );
      expect(counted).toHaveLength(2); // the wall AND its window, always
    }
  });

  it('an OPTIONED window on a MAIN-MODEL wall is judged on its own tag (the cascade is an AND, not a copy)', () => {
    const wall = { id: 'wall-main' };
    const winA = { id: 'win-a', hostId: 'wall-main', designOptionId: 'opt-a' };
    const winB = { id: 'win-b', hostId: 'wall-main', designOptionId: 'opt-b' };
    const scope: OptionScope = {
      elements: { 'wall-main': wall, 'win-a': winA, 'win-b': winB },
      designOptions: OPTIONS,
    };
    expect(isElementActive(winA, scope)).toBe(true);
    expect(isElementActive(winB, scope)).toBe(false);
    expect(isElementActive(winB, scope, { Facade: 'opt-b' })).toBe(true);
  });

  /* ============================================================================================
   * §4 — THE EDGE CASES, each matching an existing precedent (design §3).
   * ========================================================================================= */

  it('⚠ a MISSING host ⇒ EXCLUDED — a broken reference is not a licence to bill a window into thin air', () => {
    const orphan = { id: 'win-x', hostId: 'wall-that-is-gone' };
    const scope: OptionScope = { elements: { 'win-x': orphan }, designOptions: OPTIONS };
    expect(isElementActive(orphan, scope)).toBe(false);
  });

  it('⚠⚠ a CYCLE in the belongs-to edges is REFUSED and TERMINATES (a hostile .bnn, never a hang)', () => {
    const a = { id: 'a', hostId: 'b' };
    const b = { id: 'b', hostId: 'a' };
    const scope: OptionScope = { elements: { a, b }, designOptions: OPTIONS };
    expect(isElementActive(a, scope)).toBe(false);
    expect(isElementActive(b, scope)).toBe(false);
  });

  it('a deep chain is walked to the top — a window in a wall in a group in a group', () => {
    const outer = { id: 'grp-outer', designOptionId: 'opt-b' }; // NOT active
    const inner = { id: 'grp-inner', parentElementId: 'grp-outer' };
    const wall = { id: 'wall-1', parentElementId: 'grp-inner' };
    const win = { id: 'win-1', hostId: 'wall-1' };
    const scope: OptionScope = {
      elements: { 'grp-outer': outer, 'grp-inner': inner, 'wall-1': wall, 'win-1': win },
      designOptions: OPTIONS,
    };
    // Every link is main-model except the outermost group — and that is enough to exclude the window.
    expect(isElementActive(win, scope)).toBe(false);
    expect(isElementActive(win, scope, { Facade: 'opt-b' })).toBe(true);
  });

  /* ============================================================================================
   * §5 — THE GROUP EDGE (reserved, dormant) AND THE CHILD EDGE (safe by construction).
   * ========================================================================================= */

  it('⚠ the GROUP edge obeys the same rule — written once now, so v1.0.x groups land additively', () => {
    const group = { id: 'grp-1', designOptionId: 'opt-b' };
    const member = { id: 'chair-1', parentElementId: 'grp-1' };
    const scope: OptionScope = {
      elements: { 'grp-1': group, 'chair-1': member },
      designOptions: OPTIONS,
    };
    expect(isElementActive(member, scope)).toBe(false);
    expect(isElementActive(member, scope, { Facade: 'opt-b' })).toBe(true);
  });

  it('an element hanging off BOTH edges needs BOTH active — a traversal, not a single chain walk', () => {
    const host = { id: 'wall-1' }; // main model
    const group = { id: 'grp-1', designOptionId: 'opt-b' }; // NOT active
    const win = { id: 'win-1', hostId: 'wall-1', parentElementId: 'grp-1' };
    const scope: OptionScope = {
      elements: { 'wall-1': host, 'grp-1': group, 'win-1': win },
      designOptions: OPTIONS,
    };
    // Following only `hostId` would call this ACTIVE and miss the excluded group entirely.
    expect(isElementActive(win, scope)).toBe(false);
  });

  /* ============================================================================================
   * §6 — A DOCUMENT WITH NO OPTIONS IS UNCHANGED. v1.0.0's only case must stay exactly as it was.
   * ========================================================================================= */

  it('a document with NO options behaves exactly as v1.0.0 does — every element counts', async () => {
    const { doc } = await twoSchemes();
    // Strip the option tags: with no `designOptions` collection and no tags, everything is main model.
    const untagged = Object.fromEntries(
      Object.entries(doc.scene.elements).map(([id, e]) => {
        const rest: OptionedElement = {
          id: e.id,
          ...(e.hostId === undefined ? {} : { hostId: e.hostId }),
        };
        return [id, rest];
      }),
    );
    const scope: OptionScope = { elements: untagged };
    const counted = Object.values(untagged).filter((e) => isElementActive(e, scope));
    expect(counted).toHaveLength(Object.keys(doc.scene.elements).length); // 2 walls + 4 windows
  });

  /* ============================================================================================
   * §7 — ⚠⚠ THE ANCESTRY IS A **DAG**, NOT A CHAIN, AND A SHARED ANCESTOR IS NOT A CYCLE.
   *
   * Entry 85's `hostId` sweep — the other half of the Q19 walk, and the question the hand-off named:
   * *"does `cascadeOf`'s transitive walk agree with `isElementActive`'s traversal on CYCLES and on an
   * element hanging off BOTH edges at once — two cycle guards written separately is the D68 shape?"*
   * **They did not agree, and this one was wrong.**
   *
   * Two edges out of one node means the two routes upward can MEET. §5 above already pins that an
   * element may hang off both edges — but its `wall-1` and `grp-1` share no ancestor, so the shape that
   * matters was never built. Add one outer group above both and it is a **diamond**, which contains no
   * cycle at all.
   *
   * The old guard was `if (seen.has(ancestorId)) return false`, with ONE set doing TWO jobs: *"already
   * judged"* (necessarily global) and *"on the path I am walking"* (necessarily path-scoped). The second
   * route into the shared ancestor found it in `seen` and refused. ⇒ The element vanished from all SIX
   * `isElementActive` call sites — `enumerate.ts:188`, `room.ts:413`, `cleandelta.ts:525` and
   * `joins.ts:322/358/416` — with both diagnostics empty.
   *
   * ⚠ REVERT-VERIFY: restore the single `seen` set in `isElementActive` and every test in this section
   * fails, §7.1 with `modelElements()` 3 where 4 is correct.
   * ========================================================================================= */

  const DIAMOND_OPTIONS: OptionScope['designOptions'] = OPTIONS;

  it('⚠⚠ a SHARED ancestor reached by BOTH edges is a diamond, not a cycle — and it counts', () => {
    // win --hostId--> wall --parentElementId--> top
    // win --parentElementId--> grp --parentElementId--> top     ⇒ the routes meet at `top`.
    const top = { id: 'grp-top' };
    const wall = { id: 'wall-1', parentElementId: 'grp-top' };
    const grp = { id: 'grp-mid', parentElementId: 'grp-top' };
    const win = { id: 'win-1', hostId: 'wall-1', parentElementId: 'grp-mid' };
    const scope: OptionScope = {
      elements: { 'grp-top': top, 'wall-1': wall, 'grp-mid': grp, 'win-1': win },
      designOptions: DIAMOND_OPTIONS,
    };
    // Every element here is MAIN MODEL — not one carries a `designOptionId`. Nothing may be excluded.
    for (const element of [top, wall, grp, win]) {
      expect(isElementActive(element, scope), `${element.id} was excluded`).toBe(true);
    }
  });

  it('⚠ the same ancestor down BOTH edges of one element is not a cycle either', () => {
    const host = { id: 'wall-1' };
    const win = { id: 'win-1', hostId: 'wall-1', parentElementId: 'wall-1' };
    const scope: OptionScope = {
      elements: { 'wall-1': host, 'win-1': win },
      designOptions: DIAMOND_OPTIONS,
    };
    expect(isElementActive(win, scope)).toBe(true);
  });

  it('⚠ nor is a shared ancestor reached at DIFFERENT depths down the two routes', () => {
    // win --hostId--> wall --hostId--> top, and win --parentElementId--> top. Two hops versus one.
    const top = { id: 'grp-top' };
    const wall = { id: 'wall-1', hostId: 'grp-top' };
    const win = { id: 'win-1', hostId: 'wall-1', parentElementId: 'grp-top' };
    const scope: OptionScope = {
      elements: { 'grp-top': top, 'wall-1': wall, 'win-1': win },
      designOptions: DIAMOND_OPTIONS,
    };
    expect(isElementActive(win, scope)).toBe(true);
  });

  /**
   * ⚠⚠ THE WEAK GREEN THIS SECTION MUST NOT HAVE: a "fix" that stops refusing diamonds by no longer
   * refusing anything. The three tests above all assert `true`, so a `return true` passes every one of
   * them. **These two are the other direction**, and §4's cycle test is a third.
   */
  it('⚠⚠ a REAL cycle is still refused, and still terminates — even reached through a diamond', () => {
    // The diamond above, with the shared ancestor pointed back DOWN at the wall: a genuine loop.
    const top = { id: 'grp-top', parentElementId: 'wall-1' };
    const wall = { id: 'wall-1', parentElementId: 'grp-top' };
    const grp = { id: 'grp-mid', parentElementId: 'grp-top' };
    const win = { id: 'win-1', hostId: 'wall-1', parentElementId: 'grp-mid' };
    const scope: OptionScope = {
      elements: { 'grp-top': top, 'wall-1': wall, 'grp-mid': grp, 'win-1': win },
      designOptions: DIAMOND_OPTIONS,
    };
    expect(isElementActive(win, scope)).toBe(false);
    expect(isElementActive(wall, scope)).toBe(false);
  });

  it('⚠ and an EXCLUDED shared ancestor still excludes both routes', () => {
    const top = { id: 'grp-top', designOptionId: 'opt-b' }; // NOT the active option
    const wall = { id: 'wall-1', parentElementId: 'grp-top' };
    const grp = { id: 'grp-mid', parentElementId: 'grp-top' };
    const win = { id: 'win-1', hostId: 'wall-1', parentElementId: 'grp-mid' };
    const scope: OptionScope = {
      elements: { 'grp-top': top, 'wall-1': wall, 'grp-mid': grp, 'win-1': win },
      designOptions: DIAMOND_OPTIONS,
    };
    expect(isElementActive(win, scope)).toBe(false);
    expect(isElementActive(win, scope, { Facade: 'opt-b' })).toBe(true);
  });

  /**
   * ⚠⚠ §7.1 — THE SAME THING THROUGH THE SHIPPED VERBS, WHICH IS WHERE THE NUMBER COMES FROM (§1b).
   * Four verbs, no hand-assembled `Scene`, and **no design options in the document at all** — so this is
   * the D65 failure mode on a document that has never heard of design options, exactly like Q17a's.
   */
  it('⚠⚠ MEASURED: a diamond authored by four verbs hides an opening from modelElements()', async () => {
    const doc = newDoc();
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
    const wall = async (): Promise<string> =>
      (
        await doc.execute('core.createElement', {
          typeId: 'core.wall.v1',
          styleId: 'EXT',
          containerId: 'l1',
          params: { length: 6000, height: 3000 },
        })
      ).changes[0]!.id;

    const top = await wall();
    const hostWall = await wall();
    const group = await wall();
    await doc.execute('core.setElementMetadata', { elementId: hostWall, parentElementId: top });
    await doc.execute('core.setElementMetadata', { elementId: group, parentElementId: top });

    const structure = doc.partsOf(hostWall)!.find((p) => p.name === 'structure')!;
    const face = structure.refs.find((r) => r.includes('/face/y-min'))!;
    const win = (
      await doc.execute('core.createElement', {
        typeId: 'core.opening.v1',
        hostId: hostWall,
        hostRef: face,
        containerId: 'l1',
        params: { width: 1000, height: 1400, anchor: 'fixed', offsetU: 500, offsetV: 900 },
      })
    ).changes[0]!.id;
    await doc.execute('core.setElementMetadata', { elementId: win, parentElementId: group });

    // The premise: this document has no design options whatsoever.
    expect(doc.scene.designOptions).toBeUndefined();
    expect(Object.keys(doc.scene.elements)).toHaveLength(4);

    const listed = doc.modelElements().map((m) => m.id);
    expect(listed, 'the opening was hidden from every enumerating consumer').toContain(win);
    expect(listed).toHaveLength(4);

    // ⚠ AND IT WAS SILENT — the half that makes it dangerous. Neither diagnostic ever mentioned it.
    expect(doc.brokenRefs()).toEqual([]);
    expect(doc.unbuildable()).toEqual([]);
  });

  /* ============================================================================================
   * §8 — ENTRY 87: THE COLOURS, FUZZED AGAINST AN INDEPENDENT REFERENCE.
   *
   * ⚠⚠ WHY A FUZZ AND NOT MORE SHAPES. §7's six tests answer *"does the walk accept a DAG?"*. The
   * question they CANNOT answer is the mirror — *"does it now accept a cycle it should refuse?"* —
   * because three of them assert `true` and `return true` passes all three. Naming more shapes cannot
   * settle it either: the claim is that NO shape exists, and a list is not a proof of absence.
   *
   * So the reference below is written from the docblock's SENTENCES rather than from the code: the
   * closure by plain BFS, every node's own tag, and cycle detection by **Kahn's algorithm** — a wholly
   * different mechanism from a DFS colouring, so the two cannot share a bug.
   *
   * ⚠ Revert-verified: restoring the single `seen` set makes this fail within ~200 trials, and EVERY
   * disagreement it reports is `got false, reference true` — the old defect could only over-refuse.
   * ========================================================================================= */

  const referenceActive = (
    element: OptionedElement,
    scope: OptionScope | undefined,
    active: ActiveOptions = {},
  ): boolean => {
    const options = scope?.designOptions;
    const ownTag = (e: OptionedElement): boolean => {
      const id = e.designOptionId;
      if (id === undefined) return true;
      const option = options?.[id];
      if (option === undefined) return false;
      const chosen = active[option.setName];
      return chosen === undefined ? option.isPrimary : chosen === id;
    };

    const closure = new Map<string, OptionedElement>([[element.id, element]]);
    const queue: OptionedElement[] = [element];
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const ancestorId of [node.hostId, node.parentElementId]) {
        if (ancestorId === undefined) continue;
        const ancestor = scope?.elements[ancestorId];
        if (ancestor === undefined) return false;
        if (closure.has(ancestorId)) continue;
        closure.set(ancestorId, ancestor);
        queue.push(ancestor);
      }
    }
    for (const node of closure.values()) if (!ownTag(node)) return false;

    // Kahn: peel nodes with no unresolved ancestor. Anything left is in — or above — a cycle.
    const outDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>();
    for (const node of closure.values()) {
      const ancestors = [node.hostId, node.parentElementId].filter(
        (a): a is string => a !== undefined && closure.has(a),
      );
      outDegree.set(node.id, ancestors.length);
      for (const a of ancestors) dependents.set(a, [...(dependents.get(a) ?? []), node.id]);
    }
    const ready = [...outDegree].filter(([, d]) => d === 0).map(([id]) => id);
    let removed = 0;
    while (ready.length > 0) {
      const id = ready.pop()!;
      removed += 1;
      for (const dep of dependents.get(id) ?? []) {
        const d = outDegree.get(dep)! - 1;
        outDegree.set(dep, d);
        if (d === 0) ready.push(dep);
      }
    }
    return removed === closure.size;
  };

  it('\u26a0\u26a0 agrees with closure semantics on 20 000 random graphs \u2014 the cycle hunt, as a proof rather than a list', () => {
    let seed = 0x2b7e1516;
    const rnd = (n: number): number => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      seed |= 0;
      return Math.abs(seed) % n;
    };

    const disagreements: string[] = [];
    let refusing = 0;
    let twoEdged = 0;
    for (let trial = 0; trial < 20_000; trial += 1) {
      const n = 2 + rnd(6);
      const ids = Array.from({ length: n }, (_, i) => `e${i}`);
      const elements: OptionedElement[] = ids.map((id) => {
        const pick = (): string | undefined => {
          const r = rnd(n + 2);
          return r >= n ? undefined : ids[r];
        };
        const tag = rnd(6);
        // ⚠ The edges are SPREAD, not assigned: `exactOptionalPropertyTypes` distinguishes "absent"
        // from "present and undefined", and absent is the shape a real scene has.
        const host = pick();
        const parent = pick();
        return {
          id,
          ...(host === undefined ? {} : { hostId: host }),
          ...(parent === undefined ? {} : { parentElementId: parent }),
          ...(tag === 0 ? { designOptionId: 'opt-a' } : {}),
          ...(tag === 1 ? { designOptionId: 'opt-b' } : {}),
          ...(tag === 2 ? { designOptionId: 'opt-ghost' } : {}),
        };
      });
      const scope: OptionScope = {
        elements: Object.fromEntries(elements.map((e) => [e.id, e])),
        designOptions: OPTIONS,
      };
      const active: ActiveOptions = rnd(2) === 0 ? {} : { Facade: 'opt-b' };
      for (const e of elements) {
        const got = isElementActive(e, scope, active);
        const want = referenceActive(e, scope, active);
        if (got !== want) disagreements.push(`trial ${trial} on ${e.id}: got ${got}, want ${want}`);
      }
      if (elements.some((e) => !referenceActive(e, scope, {}))) refusing += 1;
      if (elements.some((e) => e.hostId !== undefined && e.parentElementId !== undefined)) {
        twoEdged += 1;
      }
    }

    expect(disagreements.slice(0, 3).join(' | ')).toBe('');
    // \u26a0 THE CENSUS, so a green result is not green because the fuzz built nothing interesting.
    expect(refusing).toBeGreaterThan(10_000);
    expect(twoEdged).toBeGreaterThan(10_000);
  });
});
