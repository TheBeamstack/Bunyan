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
import { isGeometryFile, isGoldenFile, GOLDEN_PATHS } from './reseed-paths.mjs';
// ⚠ And the VALUE check lives in `reseed-payload.mjs` for the same reason — see its header for why a
// gate a timestamp can satisfy was not a gate (Q16).
import { confirmationIn, goldenValuesMoved } from './reseed-payload.mjs';

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

if (touchedGeometry.length === 0) {
  console.log('re-seed gate: no geometry touched — OK.');
  process.exit(0);
}

const remedy = [
  '\nRe-seed on the pinned environment, then commit tests/goldens/:',
  '  cd tools/oracle && uv run seed-goldens ../../tests/goldens',
].join('\n');

if (touchedGoldens.length === 0) {
  console.error('re-seed gate FAILED — geometry changed but no goldens were re-seeded.\n');
  console.error('Changed geometry:');
  for (const file of touchedGeometry) console.error(`  ${file}`);
  console.error(remedy);
  process.exit(1);
}

/* ================================================================================================
 * ⚠⚠ THE VALUE CHECK (Q16) — because the check above is satisfied by a CLOCK.
 *
 * `seed-goldens` stamps a fresh `seededAt` on every run, so "the goldens were touched" is true of a
 * one-line timestamp diff. Entry 77 and Entry 79 both shipped exactly that, and in both the only
 * thing that made compliance safe was an agent reading the diff by hand. The gate could not tell a
 * safe re-seed from a real golden movement, so it certified both.
 *
 * ⇒ Compare the PAYLOAD (the file with `seededAt` removed). If nothing moved, the author says so in a
 * commit message and the gate quotes their reason. Silence is no longer a pass.
 * ============================================================================================= */

/** Every committed golden, on both sides of the diff — read from git, never from the checkout. */
const goldensAt = (ref) => {
  const listed = execFileSync('git', ['ls-tree', '-r', '--name-only', ref], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => GOLDEN_PATHS.some((p) => f.startsWith(p)) && f.endsWith('.json'));
  const out = {};
  for (const file of listed) {
    try {
      out[file] = execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8' });
    } catch {
      out[file] = null; // present in the tree but unreadable — `goldenValuesMoved` refuses it too.
    }
  }
  return out;
};

let movedGoldens;
try {
  movedGoldens = goldenValuesMoved(goldensAt(base), goldensAt(head));
} catch (error) {
  console.error(`re-seed gate: could not read the goldens at ${base}/${head}:`, error.message);
  process.exit(1);
}

if (movedGoldens.length > 0) {
  console.log(
    `re-seed gate: geometry changed and golden VALUES moved (${movedGoldens.join(', ')}) — OK.`,
  );
  process.exit(0);
}

// The values did not move. That is a legitimate outcome — a byte-identical relink, a refactor with no
// numeric effect — but it is the author's claim to make, not the timestamp's.
const messages = execFileSync('git', ['log', '--format=%B%x00', `${base}..${head}`], {
  encoding: 'utf8',
})
  .split('\0')
  .filter((m) => m.trim());
const confirmed = confirmationIn(messages);

if (confirmed !== null) {
  console.log(
    `re-seed gate: golden values unchanged, CONFIRMED by the author — "${confirmed}" — OK.`,
  );
  process.exit(0);
}

console.error('re-seed gate FAILED — the goldens were re-seeded but NOT ONE VALUE MOVED.\n');
console.error('Changed geometry:');
for (const file of touchedGeometry) console.error(`  ${file}`);
console.error('\nTouched goldens (payload identical once `seededAt` is excluded):');
for (const file of touchedGoldens) console.error(`  ${file}`);
console.error(
  '\nA bumped timestamp is not a re-seed. Either the seeder did not actually run against the new\n' +
    'geometry, or the change genuinely moves no value. If it is the second, SAY SO — add a trailer to\n' +
    'a commit in this PR, and the reason lands in the history beside the diff:\n\n' +
    '  Re-seed-unchanged: relinked byte-for-byte on the pinned digest; no geometry op changed\n',
);
console.error(remedy);
process.exit(1);
