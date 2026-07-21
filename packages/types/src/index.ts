/**
 * `@bunyan/types` — the shipped MVP `BimObjectType`s (P5). These are the REAL, registered building
 * elements, distinct from the exercise fixtures in `tests/fixtures/bim-types.ts`. The document engine
 * loads them into its Type registry; it never depends on them (D19 — the dependency runs one way).
 *
 * v1.0.0 so far: the D52 baseline, join-aware **Wall** (step 0c/3). Opening, Slab, LinearMember and the
 * rest of the MVP set land here as the type phase (steps 4–5) proceeds.
 */

export { wallType } from './wall.js';
export { openingType } from './opening.js';
