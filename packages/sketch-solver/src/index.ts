// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `@bunyan/sketch-solver` — the 2D constraint solver, planegcs behind the `@bunyan/document` seam (D50 §0d).
 *
 * ⚠ THIS IS THE ONLY PACKAGE THAT DEPENDS ON `@salusoft89/planegcs`. `@bunyan/document` accepts a narrow
 * `SketchSolver` interface; the app's bootstrap constructs the planegcs-backed solver here and hands it
 * over, exactly as it does the kernel client (D19 precedent). A `MockSketchSolver` lives in `@bunyan/document`
 * so the document layer stays testable without booting this second WASM module.
 */

export { PlanegcsSolver, createPlanegcsSolver } from './planegcs-solver.js';
