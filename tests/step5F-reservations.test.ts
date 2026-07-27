/**
 * ROW Ⓕ — THE LAST PRE-FREEZE RESERVATIONS (D62 MEP · D63 DWG · D65 Design Options / phase filters / area
 * schemes). Design: `P5_step5F_reservations_design.md`. Owner-ruled 2026-07-24.
 *
 * ⚠ WHAT A RESERVATION'S TEST PROVES (the `reserve-shapes.test.ts` discipline — there is no BODY to
 * exercise, so the test proves the two things a reservation must deliver or it is worthless):
 *   1. THE SHAPE IS OPTIONAL AND ADDITIVE — absent-able (every existing element/scene untouched) and, when
 *      present, satisfies the frozen contract. Enforced at COMPILE TIME by the typed constructions below.
 *   2. THE FIELD ROUND-TRIPS through the REAL `.bnn` codec. A reserved slot the persistence layer silently
 *      drops is not reserved; it is decorative.
 *
 * ⚠ PLUS ONE THING ROWS Ⓐ–Ⓔ DID NOT NEED: **the DESIGN-OPTION EXCLUSION INVARIANT** (§3). D65's storage is
 * the cheap half; the invariant — *"every aggregating consumer must exclude non-active options"* — is the
 * expensive half, because ignoring it double-counts a schedule and publishes work packages for a scheme
 * nobody is building. The owner ruled it be written INTO the contract, so it is tested as behaviour
 * (`isElementActive`), not merely as prose.
 *
 * ⚠ WHAT IS DELIBERATELY *NOT* HERE, AND THAT IS THE ROW'S OTHER FINDING (design §1) — three items the plan
 * assumed needed reserving and the walk found did not:
 *   · **the MEP sweep-along-path/loft OP** — the protocol froze at P3 and `faceFrame` was added AFTER it
 *     (Entry 30) under D13 ("adding an op is additive and permitted") ⇒ precedented, not an amendment.
 *   · **the DWG codec seam** — `FormatCodec` + `registries.codecs` already IS the seam, and domain rule 5
 *     makes a new format an additive registration. Asserted in §4 so the finding cannot quietly rot.
 *   · **phase filters / graphic overrides** — a filter is a view property over datums that already exist
 *     (`phaseCreated`/`phaseDemolished`, D54b/D56) and an override is display, which is derived, never
 *     stored truth (rule 1/17). Asserted in §4.
 *
 * PURE — row Ⓕ reserves data shapes and touches no geometry, so no kernel.
 */

import { describe, expect, it } from 'vitest';
import {
  emptyScene,
  loadBnn,
  saveBnn,
  codecFor,
  createRegistries,
  isElementActive,
  CORE_COMMANDS,
  SCENE_SCHEMA_VERSION,
} from '@bunyan/document';
import type {
  ActiveOptions,
  Classification,
  Connector,
  DesignOption,
  Element,
  OptionScope,
  PlanView,
  Scene,
  SystemDefinition,
} from '@bunyan/document';

const CLASS: Classification = { ifcClass: 'IfcDuctSegment', loadBearing: false };
const KERNEL_BUILD = 'occt-7.9.3-test';

/* ================================================================================================
 * 1. D62 — MEP SYSTEMS & CONNECTORS: optional, additive, and in the ELEMENT'S OWN BUILD FRAME
 * ============================================================================================= */

describe('Ⓕ/D62 — MEP systems and connectors are reserved, optional and additive', () => {
  it('an Element with NO system and NO connectors is valid (every element today)', () => {
    const bare: Element = {
      id: 'wall-1',
      typeId: 'core.wall.v1',
      typeVersion: 1,
      params: {},
      classification: { ifcClass: 'IfcWall', loadBearing: true },
    };
    expect(bare.systemId).toBeUndefined();
    expect(bare.connectors).toBeUndefined();
  });

  it('a duct carries a system + typed connectors, positioned in its OWN BUILD FRAME (the D25 lesson)', () => {
    const inlet: Connector = {
      name: 'in',
      at: [0, 0, 0],
      direction: [-1, 0, 0],
      shape: 'rectangular',
      dimensions: { width: 400, height: 250 },
      flow: 'in',
    };
    const outlet: Connector = {
      name: 'out',
      at: [2400, 0, 0],
      direction: [1, 0, 0],
      shape: 'rectangular',
      dimensions: { width: 400, height: 250 },
      flow: 'out',
    };
    const duct: Element = {
      id: 'duct-1',
      typeId: 'core.duct.v1',
      typeVersion: 1,
      params: { length: 2400 },
      classification: CLASS,
      systemId: 'system-SA1',
      connectors: [inlet, outlet],
      // ⚠ The duct is PLACED in the world — and its connectors are unaffected, because they are authored
      // in the element's own build frame. That is the whole reason the frame choice is load-bearing.
      placement: [{ kind: 'translate', by: [15000, 3000, 2700] }],
    };
    expect(duct.connectors).toHaveLength(2);
    expect(duct.connectors?.[1]?.at).toEqual([2400, 0, 0]);
    expect(duct.systemId).toBe('system-SA1');
  });

  it('a connector may override the element system — a valve/exchanger genuinely bridges two networks', () => {
    const port: Connector = {
      name: 'secondary',
      at: [0, 0, 200],
      direction: [0, 0, 1],
      shape: 'round',
      dimensions: { diameter: 54 },
      systemId: 'system-HWS',
    };
    expect(port.systemId).toBe('system-HWS');
  });

  it('a SystemDefinition classifies by open STRING key, not an enum (a new system kind must not amend)', () => {
    const supplyAir: SystemDefinition = {
      id: 'system-SA1',
      name: 'SA-1',
      classification: 'supply-air',
      discipline: 'mep',
      description: 'Level 3 open-plan supply',
    };
    const sanitary: SystemDefinition = {
      id: 'system-SAN3',
      name: 'SAN-3',
      classification: 'sanitary',
      discipline: 'mep',
    };
    expect(supplyAir.classification).toBe('supply-air');
    expect(sanitary.description).toBeUndefined();
  });
});

/* ================================================================================================
 * 2. D65 — DESIGN OPTIONS: the shapes
 * ============================================================================================= */

describe('Ⓕ/D65 — design options are reserved, optional and additive', () => {
  it('an element in NO option is MAIN MODEL — v1.0.0’s only case', () => {
    const wall: Element = {
      id: 'wall-1',
      typeId: 'core.wall.v1',
      typeVersion: 1,
      params: {},
      classification: { ifcClass: 'IfcWall', loadBearing: true },
    };
    expect(wall.designOptionId).toBeUndefined();
  });

  it('a view may choose which options it shows; absent ⇒ primary (a display selection, not a change)', () => {
    const plan: PlanView = {
      id: 'view-1',
      kind: 'plan',
      name: 'L03 — Lobby A',
      scale: 100,
      levelId: 'level-3',
      designOptionIds: ['option-A'],
    };
    const plain: PlanView = {
      id: 'view-2',
      kind: 'plan',
      name: 'L03',
      scale: 100,
      levelId: 'level-3',
    };
    expect(plan.designOptionIds).toEqual(['option-A']);
    expect(plain.designOptionIds).toBeUndefined();
  });
});

/* ================================================================================================
 * 3. ⚠⚠ THE EXCLUSION INVARIANT — the expensive half of D65, tested as BEHAVIOUR not prose
 *
 * The rule (written into `designoptions.ts` + `scene.ts` + `Element.designOptionId`): a document with
 * options deliberately holds MUTUALLY-EXCLUSIVE elements, so every consumer that AGGREGATES or PUBLISHES
 * (`quantities()`, the roll-up, the Clean Delta exporter, schedules — and downstream Planitor/Miqdar) must
 * exclude elements whose option is not active. Ignoring it double-counts: domain rule 15's failure mode.
 * ============================================================================================= */

const OPTIONS: Readonly<Record<string, DesignOption>> = {
  'option-A': { id: 'option-A', setName: 'Lobby scheme', name: 'Option A', isPrimary: true },
  'option-B': { id: 'option-B', setName: 'Lobby scheme', name: 'Option B', isPrimary: false },
};

const mainWall = { id: 'wall-main' };
const wallA = { id: 'wall-a', designOptionId: 'option-A' };
const wallB = { id: 'wall-b', designOptionId: 'option-B' };

// ⚠ D67 (row Ⓖ, `P5_step5G_option_cascade_design.md`): the rule is resolved against the MODEL, not a bare
// options record, so it can walk the belongs-to edges. These three hang off nothing, so the cascade is a
// no-op here — this file pins the OWN-TAG half; `option-cascade-d67.test.ts` pins the cascade.
const SCOPE: OptionScope = {
  elements: { 'wall-main': mainWall, 'wall-a': wallA, 'wall-b': wallB },
  designOptions: OPTIONS,
};

describe('Ⓕ/D65 — the exclusion invariant (the reason this row is not just "add a collection")', () => {
  it('MAIN-MODEL elements always count — under every selection', () => {
    expect(isElementActive(mainWall, SCOPE)).toBe(true);
    expect(isElementActive(mainWall, SCOPE, { 'Lobby scheme': 'option-B' })).toBe(true);
  });

  it('with NO selection, the PRIMARY option counts and its siblings do NOT', () => {
    expect(isElementActive(wallA, SCOPE)).toBe(true);
    expect(isElementActive(wallB, SCOPE)).toBe(false);
  });

  it('choosing option B flips exactly one — never both, which is the double-count being prevented', () => {
    const active: ActiveOptions = { 'Lobby scheme': 'option-B' };
    expect(isElementActive(wallA, SCOPE, active)).toBe(false);
    expect(isElementActive(wallB, SCOPE, active)).toBe(true);
  });

  it('⚠ EXACTLY ONE variant of a set is ever active — the property a schedule/Clean Delta depends on', () => {
    for (const active of [{}, { 'Lobby scheme': 'option-A' }, { 'Lobby scheme': 'option-B' }]) {
      const counted = [wallA, wallB].filter((e) => isElementActive(e, SCOPE, active));
      expect(counted).toHaveLength(1);
    }
  });

  it('an element naming an UNDEFINED option is EXCLUDED, not included (a broken ref must not double-count)', () => {
    expect(isElementActive({ id: 'x', designOptionId: 'option-ghost' }, SCOPE)).toBe(false);
    // …and with no options collection at all, an optioned element is still excluded.
    expect(isElementActive(wallA, undefined)).toBe(false);
  });

  it('a document with NO options behaves exactly as v1.0.0 does — every element counts', () => {
    const scene = emptyScene();
    expect(scene.designOptions).toBeUndefined();
    expect(isElementActive(mainWall, scene)).toBe(true);
  });
});

/* ================================================================================================
 * 4. THE RECORDED-ONLY FINDINGS — asserted so they cannot quietly rot (D63 · phase filters)
 * ============================================================================================= */

describe('Ⓕ — what needed NO reservation, asserted rather than merely written down', () => {
  it('D63: the DWG seam is a real registration — a codec is REACHED and INVOKED (domain rule 5)', () => {
    // ⚠⚠ THIS TEST USED TO PROVE NOTHING (corrected Entry 60, the rule-5 backward sweep). It registered
    // a metadata-only descriptor and asserted `codecs.size` went 0 → 1 — i.e. it exercised the generic
    // `Registry` class, which 51 type and 39 command registrations already prove. It would have passed
    // verbatim if `FormatCodec` were `{ id }`, and at the time NOTHING in the repo consulted
    // `registries.codecs` at all: `saveBnn`/`loadBnn` were called by name. **D63's conclusion (nothing
    // was owed pre-freeze) still holds — `FormatCodec` is not a frozen shape and gained its behaviour
    // additively. Its EVIDENCE did not.** The seam is now exercised properly in
    // `tests/format-codec-seam.test.ts`; this keeps row Ⓕ's own claim honest where it was recorded.
    const registries = createRegistries();
    expect(registries.codecs.size).toBe(0);

    let invoked = false;
    registries.codecs.register({
      id: 'dwg',
      label: 'AutoCAD DWG',
      extensions: ['.dwg'],
      canRead: true,
      canWrite: false,
      read: () => {
        invoked = true;
        return { scene: emptyScene() };
      },
    });

    // The claim is DISPATCH, not storage: a caller holding a filename reaches the new format.
    const codec = codecFor(registries, 'site-survey.dwg');
    expect(codec?.id).toBe('dwg');
    codec!.read!(new Uint8Array());
    expect(invoked).toBe(true);
    expect(registries.codecs.get('dwg')?.canWrite).toBe(false);
  });

  it('phase filters need nothing: the datums already exist and a filter is a VIEW property', () => {
    const el: Element = {
      id: 'wall-1',
      typeId: 'core.wall.v1',
      typeVersion: 1,
      params: {},
      classification: { ifcClass: 'IfcWall', loadBearing: true },
      phaseCreated: 'phase-existing',
      phaseDemolished: 'phase-2',
    };
    // Both datums are already reserved (D54b/D56) ⇒ a filter is a selection over them, and a graphic
    // override is display — derived, never stored (rule 1/17). Nothing further is owed.
    expect(el.phaseCreated).toBe('phase-existing');
    expect(el.phaseDemolished).toBe('phase-2');
  });
});

/* ================================================================================================
 * 5. ROUND-TRIP — every row-Ⓕ reservation survives the REAL `.bnn` codec
 * ============================================================================================= */

function sceneWithRowF(): Scene {
  const duct: Element = {
    id: 'duct-1',
    typeId: 'core.duct.v1',
    typeVersion: 1,
    params: { length: 2400 },
    classification: CLASS,
    systemId: 'system-SA1',
    connectors: [
      {
        name: 'out',
        at: [2400, 0, 0],
        direction: [1, 0, 0],
        shape: 'rectangular',
        dimensions: { width: 400, height: 250 },
        flow: 'out',
      },
    ],
    designOptionId: 'option-A',
  };
  return {
    ...emptyScene(),
    elements: { 'duct-1': duct },
    systems: {
      'system-SA1': {
        id: 'system-SA1',
        name: 'SA-1',
        classification: 'supply-air',
        discipline: 'mep',
      },
    },
    designOptions: OPTIONS,
  };
}

describe('Ⓕ round-trip: the reservations survive save→load, and absence still defaults cleanly', () => {
  it('a .bnn carrying every row-Ⓕ reservation reloads byte-identical', () => {
    const scene = sceneWithRowF();
    const { scene: loaded } = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD }));
    expect(loaded).toEqual(scene);
  });

  it('the fields are genuinely CARRIED, not silently dropped (the revert-check)', () => {
    const scene = sceneWithRowF();
    const { scene: loaded } = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD }));
    const duct = loaded.elements['duct-1'];
    expect(duct?.systemId).toBe('system-SA1');
    expect(duct?.connectors?.[0]?.dimensions).toEqual({ width: 400, height: 250 });
    expect(duct?.designOptionId).toBe('option-A');
    expect(loaded.systems?.['system-SA1']?.classification).toBe('supply-air');
    expect(loaded.designOptions?.['option-B']?.isPrimary).toBe(false);
  });

  it('a .bnn with NONE of them loads with all three absent and the schema version UNBUMPED', () => {
    const plain: Scene = { ...emptyScene(), elements: {} };
    const { scene: loaded } = loadBnn(saveBnn(plain, { kernelBuildId: KERNEL_BUILD }));
    expect(loaded.systems).toBeUndefined();
    expect(loaded.designOptions).toBeUndefined();
    // ⚠ THE WHOLE POINT: row Ⓕ folds into frozen v2 — no migration, no bump (the Ⓐ/Ⓓ precedent).
    expect(loaded.schemaVersion).toBe(SCENE_SCHEMA_VERSION);
  });
});

/* ================================================================================================
 * 6. THE VERB HALF (the ⓣ lesson, applied before it could bite again)
 *
 * ⚠ 0g reserved NOUNS without ARGS and had to come back for `argsSchema` (0g.2, Freeze-Gate ⓣ) — and
 * `Command.argsSchema` freezes at the SAME step 6 as `Element`. So row Ⓕ reserves both in ONE step: an
 * element can be BORN with its system/connectors/option, or a later body would amend a frozen contract
 * AND the generated agent tool-list.
 * ============================================================================================= */

describe('Ⓕ verb half: the reserved element fields have an authoring path', () => {
  it('the three row-Ⓕ args are in createElement.argsSchema (the structural revert-check)', () => {
    const createElement = CORE_COMMANDS.find((c) => c.id === 'core.createElement');
    expect(createElement).toBeDefined();
    for (const key of ['systemId', 'connectors', 'designOptionId']) {
      expect(createElement?.argsSchema[key]).toBeDefined();
    }
  });

  it('systemId/designOptionId are typed as REFS to their own collections, not bare strings', () => {
    // ⚠ `refTo` gained 'system'/'designOption' pre-freeze for exactly this reason: typing them as strings
    // would force whoever builds MEP/Design-Options to widen a FROZEN union later (the ⓣ trap, one level
    // deeper). No body switches on `refTo` today, so the widening broke nothing.
    const createElement = CORE_COMMANDS.find((c) => c.id === 'core.createElement');
    expect(createElement?.argsSchema['systemId']?.refTo).toBe('system');
    expect(createElement?.argsSchema['designOptionId']?.refTo).toBe('designOption');
  });
});
