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
// ⚠ The path lists and the matcher live in `reseed-paths.mjs` so a TEST can exercise them. They used
// to be inline constants here, which is why nothing caught that a directory prefix matches a
// package.json — see that file's header for the licence field this gate refused.
import { isGeometryFile, isGoldenFile } from './reseed-paths.mjs';

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

const touchedGeometry = changed.filter(isGeometryFile);
const touchedGoldens = changed.filter(isGoldenFile);

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
