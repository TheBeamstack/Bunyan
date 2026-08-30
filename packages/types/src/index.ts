// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `@bunyan/types` — the shipped MVP `BimObjectType`s (P5). These are the REAL, registered building
 * elements, distinct from the exercise fixtures in `tests/fixtures/bim-types.ts`. The document engine
 * loads them into its Type registry; it never depends on them (D19 — the dependency runs one way).
 *
 * v1.0.0 so far: the D52 baseline, join-aware **Wall** (step 0c/3); the **Opening** (ⓙ door leaf); and the
 * **Curtain Wall** — the canonical D59 nesting probe (elements-of-elements, rule 18). Slab, LinearMember and
 * the rest of the MVP set land here as the type phase proceeds.
 */

export { FACADE_FACE_ROLES, facesWithRoles } from './exposed.js';
export { wallType } from './wall.js';
export { openingType } from './opening.js';
export {
  curtainWallType,
  curtainWallColumnType,
  curtainWallPanelType,
  curtainWallMullionType,
} from './curtainwall.js';
