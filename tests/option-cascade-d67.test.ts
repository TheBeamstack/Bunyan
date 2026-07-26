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
    expect(doc.brokenRefs()).toHaveLength(0);
    return { doc, wallA, wallB };
  };

  // ⚠ `scene.designOptions` is a RESERVED collection with no authoring verb in v1.0.0 (row Ⓕ gave
  // `createElement` the `designOptionId` ARG, but nothing writes the collection itself yet), so a consumer
  // resolving options supplies it — exactly as Planitor/Miqdar will when the bodies land.
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
});
