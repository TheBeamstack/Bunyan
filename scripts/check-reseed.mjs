/**
 * The re-seed gate (spec §9; imp-plan P1 step 8, cross-cutting practice #2).
 *
 * "A new or changed `buildGeometry` MUST ship with re-seeded goldens — CI fails a build that adds
 * geometry without them." The spec calls this gate out explicitly *so headless agents don't miss
 * it*, which is precisely why it is a machine check and not a line in a checklist.
 *
 * Rule: if a commit touches geometry-producing code, it must also touch the committed goldens.
 * Re-seed with:  cd tools/oracle && uv run seed-goldens ../../tests/goldens
 */

import { execFileSync } from 'node:child_process';

/** Code whose output the goldens certify. Extend this as the kernel grows (P2: the OCCT package). */
const GEOMETRY_PATHS = [
  'packages/kernel-mock/src/box.ts',
  'packages/kernel-occt/', // ✅ landed in P2 — the real kernel + the committed WASM artifact
  'packages/types/', // BimObjectType `buildGeometry` implementations (P5)
];

// ⚠ KNOWN GAP, SURFACED 2026-08-01 (Entry 73) AND DELIBERATELY NOT CLOSED HERE — it is a policy
// change, not a bug fix. `tools/kernel-build/` (i.e. `src/kernel.cpp`) is NOT listed above, yet it
// is the source the committed `packages/kernel-occt/wasm/` artifact is built FROM. In practice a
// C++ change always ships with the rebuilt artifact, which IS listed, so the gate fires anyway —
// but that is a convention holding the line, not this file. Adding `tools/kernel-build/` would make
// CI refuse more than it does today, so it wants the reviewer's or the owner's assent first.

const GOLDEN_PATHS = ['tests/goldens/'];

const base = process.env['BASE_REF'];
const head = process.env['HEAD_REF'] ?? 'HEAD';

if (!base) {
  console.log('re-seed gate: no BASE_REF (not a pull request) — skipping.');
  process.exit(0);
}

let changed;
try {
  changed = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
} catch (error) {
  console.error(`re-seed gate: could not diff ${base}...${head}:`, error.message);
  process.exit(1);
}

const touchedGeometry = changed.filter((file) => GEOMETRY_PATHS.some((p) => file.startsWith(p)));
const touchedGoldens = changed.filter((file) => GOLDEN_PATHS.some((p) => file.startsWith(p)));

if (touchedGeometry.length > 0 && touchedGoldens.length === 0) {
  console.error('re-seed gate FAILED — geometry changed but no goldens were re-seeded.\n');
  console.error('Changed geometry:');
  for (const file of touchedGeometry) console.error(`  ${file}`);
  console.error('\nRe-seed on the pinned environment, then commit tests/goldens/:');
  console.error('  cd tools/oracle && uv run seed-goldens ../../tests/goldens');
  process.exit(1);
}

console.log(
  touchedGeometry.length === 0
    ? 're-seed gate: no geometry touched — OK.'
    : `re-seed gate: geometry changed and goldens re-seeded (${touchedGoldens.length} file[s]) — OK.`,
);
