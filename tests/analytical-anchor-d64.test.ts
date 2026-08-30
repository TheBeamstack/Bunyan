// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D64 (FREEZE GATE row Ⓔ) — THE ANALYTICAL-ANCHOR RE-EXAMINATION, ruled from EVIDENCE.
 *
 * The question (owner delegated to Zayd, 2026-07-21): does one optional ANALYTICAL field belong on the
 * frozen Bunyan type/part for REAL (not hint-level) structural/energy analysis, or does the PEI-bound
 * side-graph suffice?
 *
 * ⚠ THE ANSWER, EARNED — NOT ASSERTED — by the Miqdar real-frame walk (`../Miqdar/Miqdar_v1.0.0_spec.md`
 * §4, M19): **the PEI-bound side-graph suffices. Bunyan reserves NOTHING analytical on the type or part.**
 * Every idealization datum is either already-readable from the frozen contract (the LinearMember axis,
 * Section/Material properties, `loadBearing`, the spatial tree, grids, opening positions, exact quantities)
 * OR **many-valued per physical element** — the killer being effective (cracked) stiffness: the SAME column
 * carries gross EI (service) and 0.35·EI (seismic drift) AT ONCE, in one project, so it is a function of
 * (member, code, limit state, run), not a property of the element. A field that must hold many values for
 * one element cannot be a single field on it, even in principle. ⇒ the analytical anchor is
 * `physicalBinding` on MIQDAR's entities, pointing IN; nothing points from Bunyan out to Miqdar.
 *
 * ⚠ THE ONE EXCEPTION, AND IT IS NOT AN ANALYTICAL ANCHOR (M18, owner-ruled 2026-07-23). The ENERGY half of
 * D64 surfaced a single *material* gap: `core_logic.md` §3.11 prose promised "thermal conductivity" and §9
 * names energy analysis a north-star, but the frozen `Material` had density + a `structural?` bag and NO
 * thermal property. So Bunyan reserves ONE optional `Material.thermal?` — a PHYSICAL property, single-valued
 * per material (unlike cracked stiffness), so it lives cleanly on the physical graph. It confirms the
 * two-graph split; it does not violate it.
 *
 * WHAT THIS TEST PROVES (the reserve-shapes discipline, `reserve-shapes.test.ts`): `thermal?` is optional +
 * additive (compile-time), and it round-trips through the REAL `.bnn` codec (a reserved slot the codec drops
 * is decorative). PURE — a material reservation touches no geometry, so no kernel.
 *
 * ⚠ THE REVERT-CHECK IS STRUCTURAL: delete `thermal?` from `Material` (`entities.ts`) and this file's typed
 * constructions stop compiling (the `.thermal` reads go dead) — the reserved field is genuinely load-bearing.
 */

import { describe, expect, it } from 'vitest';
import { emptyScene, loadBnn, saveBnn } from '@bunyan/document';
import type { Material, Scene } from '@bunyan/document';

const KERNEL_BUILD = 'occt-7.9.3-test';

describe('D64/M18 — the reserved Material.thermal? slot (the ONLY new field the analytical walk produced)', () => {
  it('a Material with NO thermal slot is valid (absent-able) — every existing material is untouched', () => {
    const concrete: Material = {
      id: 'C25/30',
      name: 'Béton C25/30',
      category: 'concrete',
      density: 2500,
      structural: { fck: 25, E: 31000 },
    };
    expect(concrete.thermal).toBeUndefined();
    // the structural bag is unchanged — thermal is a SIBLING, not a key folded into it.
    expect(concrete.structural?.fck).toBe(25);
  });

  it('a Material MAY carry thermal properties (conductivity, specific heat) — an open bag like structural?', () => {
    const concrete: Material = {
      id: 'C25/30',
      name: 'Béton C25/30',
      category: 'concrete',
      density: 2500,
      structural: { fck: 25, E: 31000 },
      thermal: { lambda: 1.65, specificHeat: 1000 },
    };
    expect(concrete.thermal?.lambda).toBe(1.65);
    expect(concrete.thermal?.specificHeat).toBe(1000);
  });

  it('thermal round-trips through the REAL .bnn codec, byte-identical (not silently dropped)', () => {
    const insulation: Material = {
      id: 'EPS-80',
      name: 'EPS 80',
      category: 'insulation',
      density: 20,
      thermal: { lambda: 0.038 },
    };
    const scene: Scene = { ...emptyScene(), materials: { 'EPS-80': insulation } };
    const { scene: loaded } = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD }));
    expect(loaded).toEqual(scene);
    expect(loaded.materials['EPS-80']?.thermal?.lambda).toBe(0.038);
  });

  it('a .bnn whose materials carry NO thermal slot reloads with thermal absent (clean default)', () => {
    const steel: Material = { id: 'S235', name: 'Acier S235', category: 'steel', density: 7850 };
    const scene: Scene = { ...emptyScene(), materials: { S235: steel } };
    const { scene: loaded } = loadBnn(saveBnn(scene, { kernelBuildId: KERNEL_BUILD }));
    expect(loaded.materials['S235']?.thermal).toBeUndefined();
    // density and category — the pre-D64 shape — are untouched.
    expect(loaded.materials['S235']?.density).toBe(7850);
  });
});
