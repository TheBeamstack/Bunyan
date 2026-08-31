// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE ATTRIBUTION GATE — every dependency that SHIPS is named in `NOTICE`.
 *
 * ⚠⚠ WHY THIS EXISTS. Entry 74 shipped `NOTICE` with a section that read:
 *
 *     "The remaining dependencies are build- and test-time only (TypeScript, Vite, Vitest,
 *      ESLint, Prettier and their transitive dependencies) under permissive licences, and are
 *      not redistributed as part of Bunyan."
 *
 * That was **false**. Seven MIT-licensed packages — `react`, `react-dom`, `scheduler`, `three`,
 * `fflate`, `js-tokens`, `loose-envify` — are runtime dependencies that ship inside the built
 * browser bundle, and none of them was attributed. MIT requires its copyright and permission
 * notice to travel with "all copies or substantial portions of the Software", so this was a real
 * licence defect in the very file whose job is to prevent one.
 *
 * ⚠ HOW IT GOT THERE, because the mechanism matters more than the miss: the sweep was **reasoned
 * from the two dependencies already under discussion** (OCCT and planegcs) rather than run against
 * the lockfile. Entry 74's own review flagged that `pnpm licenses list` was the authoritative
 * instrument and that nobody had run it. Nobody did, for two more entries, because the review that
 * would have caught it never happened — Entry 74 merged itself.
 *
 * ⇒ THE FIX IS NOT THE CORRECTED PROSE. It is this test. `NOTICE` is a claim about the artifact,
 * and this project's ledger scores unenforced claims at NINE DIRTY OUT OF EIGHTEEN; the rules that
 * stayed clean are the ones a violation could not be written silently. Adding a runtime dependency
 * is now exactly that kind of violation.
 *
 * ⚠ It reads the INSTALLED TREE, not a hand-kept list — §1c-9, measure the artifact, not the
 * manual. `pnpm licenses list --prod` is the same measurement by hand.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, realpathSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const notice = readFileSync(join(ROOT, 'NOTICE'), 'utf8');

/** Only the fields this gate reads. `dependencies` is the runtime set — never `devDependencies`. */
type PackageJson = {
  name: string;
  version: string;
  license?: string;
  dependencies?: Record<string, string>;
};

const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as PackageJson;

/**
 * The `packages:` globs from `pnpm-workspace.yaml` — the workspace's OWN definition of which
 * directories are packages. Only the simple list form is supported, which is the only form this
 * file has ever used; anything else throws rather than silently returning a short list.
 */
function workspaceGlobs(): string[] {
  const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8');
  const block = /^packages:\s*$((?:\s*\n|\s*-.*\n?)*)/m.exec(yaml);
  const globs = [...(block?.[1] ?? '').matchAll(/^\s*-\s*['"]?([^'"\n]+?)['"]?\s*$/gm)].map(
    (m) => m[1]!,
  );
  if (globs.length === 0) {
    throw new Error('pnpm-workspace.yaml declares no `packages:` globs — the layout changed');
  }
  return globs;
}

/**
 * Every workspace manifest that can declare a runtime dependency, DISCOVERED rather than listed.
 *
 * ⚠⚠ THIS WAS A HAND-WRITTEN ARRAY OF TEN PATHS, AND THAT IS THE EXACT DEFECT THIS FILE EXISTS TO
 * PREVENT — a set enumerated from the author's memory instead of counted. Demonstrated in review
 * (Entry 77): a new package under `packages/*` carrying an unattributed runtime dependency, laid
 * out exactly as pnpm lays one out, left all five assertions GREEN, because the walk never looked
 * at its manifest. The old `.filter(existsSync)` made the inverse silent too — a renamed package
 * just dropped out of the set with nothing to say so.
 *
 * ⚠ It matters more than it looks, because `runtimeClosure()` deliberately does NOT recurse into
 * `workspace:` siblings — it relies on every sibling appearing in this list on its own. Two
 * hand-maintained facts were holding each other up.
 */
const MANIFESTS = [
  'package.json',
  ...workspaceGlobs().flatMap((glob) => {
    const literal = glob.replace(/\/\*$/, '');
    if (!glob.endsWith('/*')) return existsSync(join(ROOT, glob, 'package.json')) ? [glob] : [];
    if (!existsSync(join(ROOT, literal))) return [];
    return readdirSync(join(ROOT, literal), { withFileTypes: true })
      .filter((e) => e.isDirectory() || e.isSymbolicLink())
      .map((e) => `${literal}/${e.name}`);
  }),
]
  .map((d) => (d.endsWith('package.json') ? d : `${d}/package.json`))
  .filter((p) => existsSync(join(ROOT, p)));

type Dep = { name: string; version: string; license: string | undefined };

/**
 * The RUNTIME dependency closure: each workspace manifest's `dependencies` (never
 * `devDependencies`, never `workspace:*` siblings), plus everything those pull in transitively.
 *
 * pnpm symlinks a package's direct deps into its own `node_modules/`, and a package's transitive
 * deps sit beside it inside `.pnpm/<pkg>@<ver>/node_modules/`, so following real paths walks the
 * tree that actually ships.
 */
function runtimeClosure(): Map<string, Dep> {
  const seen = new Map<string, Dep>();
  const queue: Array<{ name: string; from: string }> = [];

  for (const m of MANIFESTS) {
    const deps = readJson(join(ROOT, m)).dependencies ?? {};
    for (const [name, spec] of Object.entries(deps)) {
      if (spec.startsWith('workspace:')) continue;
      queue.push({ name, from: join(ROOT, dirname(m), 'node_modules') });
    }
  }

  while (queue.length) {
    const { name, from } = queue.shift()!;
    const linked = join(from, name);
    if (!existsSync(join(linked, 'package.json'))) continue;

    const real = realpathSync(linked);
    const j = readJson(join(real, 'package.json'));
    const key = `${j.name}@${j.version}`;
    if (seen.has(key)) continue;
    seen.set(key, { name: j.name, version: j.version, license: j.license });

    // The node_modules that CONTAINS this package — one level up, or two when scoped.
    const containing = j.name.startsWith('@') ? dirname(dirname(real)) : dirname(real);
    for (const dep of Object.keys(j.dependencies ?? {})) {
      queue.push({ name: dep, from: containing });
    }
  }
  return seen;
}

const closure = runtimeClosure();
/** ⚠ `closure` is keyed by `name@version`, so a bare-name lookup MUST go through this. */
const shipped = new Set([...closure.values()].map((d) => d.name));

/** Scoped packages are filed under their bare name: `@salusoft89/planegcs` -> `planegcs`. */
const citationName = (name: string) => (name.includes('/') ? name.split('/')[1] : name);

describe('NOTICE attributes everything that is redistributed', () => {
  it('finds a non-trivial runtime closure at all — a silent empty walk would pass everything', () => {
    // ⚠ WEAK GREEN, pre-empted. Every assertion below quantifies over `closure`, so an empty map
    // would make all of them vacuously true and this gate would report success while checking
    // nothing. That is the exact shape of the two P3 defects in §1c-7.
    expect(
      closure.size,
      'the runtime dependency walk found nothing — node_modules missing, or the layout changed',
    ).toBeGreaterThanOrEqual(8);
  });

  it('⚠ reads EVERY workspace manifest, discovered from pnpm-workspace.yaml', () => {
    // ⚠ The walk's input set is the thing that was wrong. Every assertion below quantifies over
    // the closure, and the closure quantifies over MANIFESTS — so a manifest that is never read
    // makes its dependencies invisible without failing anything. That is the same weak green as
    // the empty-closure case above, one level further out.
    const onDisk = [
      'package.json',
      ...['packages', 'apps'].flatMap((root) =>
        existsSync(join(ROOT, root))
          ? readdirSync(join(ROOT, root), { withFileTypes: true })
              .filter((e) => e.isDirectory() || e.isSymbolicLink())
              .map((e) => `${root}/${e.name}/package.json`)
              .filter((p) => existsSync(join(ROOT, p)))
          : [],
      ),
    ];
    expect(
      [...MANIFESTS].sort(),
      'a workspace package exists that this gate never opens — its runtime dependencies would ' +
        'ship unattributed and every assertion here would still pass',
    ).toEqual(onDisk.sort());
  });

  it('⚠⚠ names every runtime dependency that ships in the bundle', () => {
    // ⚠ THE CHECK IS THE LICENCE-TEXT CITATION, NOT THE BARE NAME, and that is deliberate.
    // A substring match on the name passes on prose: "three" occurs in the sentence naming the
    // direct dependencies, and "react" is a substring of "react-dom". Measured — deleting three's
    // whole attribution block left `notice.includes('three')` TRUE and this gate green. Requiring
    // the citation ties the name to an artifact, and cannot be satisfied by a passing mention.
    for (const dep of closure.values()) {
      const cite = `licenses/${citationName(dep.name)}-LICENSE.txt`;
      expect(
        notice.includes(cite),
        `${dep.name}@${dep.version} (${dep.license ?? 'license unknown'}) is a RUNTIME dependency ` +
          `and is redistributed in the built bundle, but NOTICE does not attribute it.\n` +
          `Expected NOTICE to cite \`${cite}\`.\n` +
          `Add it to NOTICE and copy its licence text into licenses/.\n` +
          `Cross-check with: pnpm licenses list --prod`,
      ).toBe(true);
    }
  });

  it('⚠ reproduces each one’s licence text under licenses/', () => {
    for (const dep of closure.values()) {
      const text = `licenses/${citationName(dep.name)}-LICENSE.txt`;
      expect(
        existsSync(join(ROOT, text)),
        `${dep.name} ships, so its licence must travel with it: ${text} is missing.\n` +
          `Copy it from the installed package — the artifact, never a web page.`,
      ).toBe(true);
    }
  });

  it('⚠ every licences/ path NOTICE cites actually exists', () => {
    // §1c-7 applied to this file itself: a cited path nobody followed. A licence text that moved
    // leaves NOTICE pointing at nothing, and nothing else would notice.
    const cited = [...notice.matchAll(/`(licenses\/[A-Za-z0-9._@+-]+\.txt)`/g)]
      .map((m) => m[1])
      .filter((p): p is string => p !== undefined);
    expect(cited.length, 'NOTICE cites no licence texts at all').toBeGreaterThan(0);
    for (const p of cited) {
      expect(existsSync(join(ROOT, p)), `NOTICE cites ${p}, which does not exist`).toBe(true);
    }
  });

  it('⚠ does not quietly attribute a dev dependency as if it shipped', () => {
    // The inverse error, and the cheaper one to make: padding NOTICE with build-time packages
    // makes the shipped list unreadable and hides a real omission inside it.
    for (const name of ['vitest', 'eslint', 'prettier', 'typescript', 'vite']) {
      expect(
        shipped.has(name) || !new RegExp(`^\\s+${name}\\s`, 'm').test(notice),
        `NOTICE lists ${name} as a redistributed dependency, but it is build-time only`,
      ).toBe(true);
    }
  });
});
