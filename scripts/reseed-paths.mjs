/**
 * The re-seed gate's path matcher, extracted so it can be TESTED rather than trusted.
 *
 * ⚠⚠ WHY THIS FILE EXISTS AT ALL — THE GATE'S FIRST REAL EXECUTION REFUSED A LICENCE FIELD.
 *
 * Entry 73 found that this gate had never once run its real path in 73 entries (`actions/checkout`
 * shallow-clones, so the `base...head` diff died, and with no PR in the repo the gate had only ever
 * taken its "not a pull request — skipping" branch). Entry 74 was therefore the first change ever
 * measured by it — and it FAILED, on this:
 *
 *     Changed geometry:
 *       packages/kernel-occt/package.json
 *       packages/types/package.json
 *
 * Both edits added `"license": "AGPL-3.0-only"`. Neither can change a single vertex. The gate matched
 * them because it tested `file.startsWith('packages/kernel-occt/')` — a DIRECTORY prefix, which
 * catches the manifest, the tsconfig, the README and every future file in the package.
 *
 * ⇒ **A path prefix is not a statement about geometry; it is a statement about location.** The list
 * below names the directories that actually hold geometry-producing code, so the gate refuses changes
 * that can alter the goldens and stays quiet for changes that cannot.
 *
 * ⚠ THE FAILURE MODE THIS FIXES IS THE EXPENSIVE ONE. A gate that cries wolf on a licence field
 * teaches the next agent to re-seed goldens it has no reason to re-seed — which would silently
 * re-baseline real geometry drift against a "the gate told me to" justification. An over-broad guard
 * does not fail safe; it fails by training people to route around it.
 */

/**
 * Code whose output the goldens certify. Extend as the kernel grows.
 *
 * ⚠ Entries must point at SOURCE, not at a package root. `packages/kernel-occt/` is wrong;
 * `packages/kernel-occt/src/` is right.
 */
export const GEOMETRY_PATHS = [
  'packages/kernel-mock/src/box.ts',
  'packages/kernel-occt/src/', // the real kernel's TypeScript half
  'packages/kernel-occt/wasm/', // the committed WASM artifact + its glue
  'packages/types/src/', // BimObjectType `buildGeometry` implementations (P5)
];

// ⚠ KNOWN GAP, SURFACED 2026-08-01 (Entry 73), ASSENTED TO BY ENTRY 74'S REVIEW, STILL NOT CLOSED
// HERE — and deliberately not bundled into the fix above, because the two changes point in opposite
// directions. Narrowing a false positive (what this file does) makes CI refuse LESS and cannot break
// anyone. Adding `tools/kernel-build/` — the C++ source the committed `wasm/` artifact is built FROM
// — makes CI refuse MORE, so it needs its own diff and its own revert-verification. It is the next
// session's queued task. In the meantime a convention holds the line: a C++ change always ships with
// the rebuilt artifact, which IS listed.

export const GOLDEN_PATHS = ['tests/goldens/'];

/** Does this changed file produce geometry the goldens certify? */
export const isGeometryFile = (file) => GEOMETRY_PATHS.some((p) => file.startsWith(p));

/** Is this changed file a committed golden? */
export const isGoldenFile = (file) => GOLDEN_PATHS.some((p) => file.startsWith(p));
