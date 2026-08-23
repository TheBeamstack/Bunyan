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

  // ⚠⚠ THE BUILD RECIPE — CLOSED IN ENTRY 75. Surfaced by Entry 73, assented to by Entry 74's
  // review of it, and deliberately held back from Entry 74's own narrowing fix because the two
  // point in OPPOSITE directions: narrowing makes CI refuse less and can break nobody, whereas
  // this makes CI refuse MORE and can newly fail a PR that used to pass. It therefore got its own
  // diff and its own revert-verification, which is the whole reason it waited.
  //
  // These three files are the SOURCE the committed `packages/kernel-occt/wasm/` artifact is built
  // FROM, so a change to any of them changes the geometry the goldens certify. Until now only a
  // CONVENTION covered them — "a C++ change always ships with the rebuilt artifact, which IS
  // listed" — and this repo's own sweep ledger rates unenforced conventions 1-in-2 dirty.
  //
  // ⚠ FILE-EXACT, NOT `tools/kernel-build/` AND NOT `tools/kernel-build/src/`, because Entry 74's
  // lesson applies here first: a directory would catch `README.md`, `verify.mjs`, `probe.sh` — and
  // `src/probe.cpp`, which builds a SEPARATE measurement binary (`probe.sh`) and is never linked
  // into the shipped kernel (`link.sh` names `src/kernel.cpp` alone, measured). Gating a diagnostic
  // behind "re-seed the goldens" is exactly the false positive this list just stopped having.
  'tools/kernel-build/src/kernel.cpp', // the kernel's C++ ops — what link.sh actually compiles
  'tools/kernel-build/configure.sh', // OCCT's build configuration
  'tools/kernel-build/link.sh', // compiler/linker flags for the shipped module
  'tools/kernel-build/postlink.mjs', // rewrites the glue link.sh emits, so it shapes the artifact too

  // ⚠ ADDED IN ENTRY 79 WITH THE DIGEST PIN (Q14), and it belongs beside `link.sh` for the same
  // reason: this file names the COMPILER. `link.sh` decides which flags OCCT is optimised with;
  // `toolchain.json` decides which emcc applies them. A digest bump is a toolchain change, and a
  // toolchain change can move a golden — that is the whole argument for pinning it in the first
  // place. It is file-exact for Entry 74's reason: `tools/kernel-build/` would catch the README.
  'tools/kernel-build/toolchain.json', // WHICH compiler builds it — see that file's header
];

export const GOLDEN_PATHS = ['tests/goldens/'];

/** Does this changed file produce geometry the goldens certify? */
export const isGeometryFile = (file) => GEOMETRY_PATHS.some((p) => file.startsWith(p));

/** Is this changed file a committed golden? */
export const isGoldenFile = (file) => GOLDEN_PATHS.some((p) => file.startsWith(p));
