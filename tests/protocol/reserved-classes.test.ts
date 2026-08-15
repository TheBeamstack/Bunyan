/**
 * `scripts/reserved-classes.mjs` — the three owner-gated classes, detected against a REAL git history
 * in a fixture repo rather than by grepping the script.
 *
 * ⚠⚠ WHY IT IS EXECUTED AND NOT GREPPED. This repo's own ledger (`current_state.md §1c-7`) records
 * five gates that were believed to work because nothing ever ran them — the re-seed gate went 73
 * entries without executing once. A labeller is exactly that shape of thing: it is invisible when it
 * silently does nothing, because "no label" is also what an additive PR looks like. So every case
 * below builds a commit that really moves the thing, and asserts the verdict that comes back.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectReservedClasses, RESERVED_CLASSES } from '../../scripts/reserved-classes.mjs';
import { makeFixture } from './fixture.mjs';

let fx: ReturnType<typeof makeFixture>;
afterEach(() => {
  fx?.cleanup();
});

const STATE = join(process.cwd(), 'scripts/state.mjs');
const SNAP = 'tests/frozen-surface.snapshot.json';

function git(args: string[], cwd: string): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function rebaseline(dir: string): void {
  // ⚠ `state.mjs --rebaseline` writes `tests/frozen-surface.snapshot.json` with no mkdir, and the
  // bare fixture carries no `tests/` tree — the same "not a defect this fixture fixes, just a fact it
  // works around" note `fixture.mjs`'s own header makes about the WATCHED stubs.
  mkdirSync(join(dir, 'tests'), { recursive: true });
  execFileSync('node', [STATE, '--root', dir, '--rebaseline'], { stdio: 'ignore' });
}

/**
 * A fixture whose `main` carries a committed frozen-surface baseline — which is what every real
 * `main` has, and what the detector measures against. Without it there is nothing to diff and every
 * PR would look additive, so a fixture that skipped this would make the whole suite vacuously green.
 */
function baselinedFixture(): ReturnType<typeof makeFixture> {
  const f = makeFixture();
  rebaseline(f.dir);
  git(['add', '-A'], f.dir);
  git(['commit', '-q', '-m', 'fixture: baseline the frozen surface'], f.dir);
  return f;
}

/** Commit everything on a new branch off main, the shape every real PR has. */
function branchWith(dir: string, name: string, mutate: () => void): void {
  git(['checkout', '-q', '-b', name], dir);
  mutate();
  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', name], dir);
}

describe('the ordinary case — additive', () => {
  it('reports no reserved class for a diff that touches nothing owner-gated', () => {
    fx = makeFixture();
    branchWith(fx.dir, 'task/T-001-ordinary', () => {
      writeFileSync(join(fx.dir, 'docs/notes.md'), '# a note\n');
    });
    const scan = detectReservedClasses(fx.dir, { base: 'main' });
    expect(scan.classes).toEqual([]);
  });
});

describe('contract-touching — the frozen surface moved', () => {
  it('flags a widened declaration in a WATCHED file', () => {
    fx = baselinedFixture();
    branchWith(fx.dir, 'task/T-002-widen', () => {
      // `scene.ts` is watched; a new exported declaration is a surface move.
      writeFileSync(
        join(fx.dir, 'packages/document/src/scene.ts'),
        'export type SceneCollection = { added: true };\n',
      );
    });
    const scan = detectReservedClasses(fx.dir, { base: 'main' });
    expect(scan.classes).toContain('contract-touching');
    expect(scan.detail['contract-touching']).toMatch(/declaration\(s\) moved/);
  });

  it('does NOT flag a comment-only change to a watched file', () => {
    fx = baselinedFixture();
    branchWith(fx.dir, 'task/T-003-comment', () => {
      writeFileSync(
        join(fx.dir, 'packages/document/src/scene.ts'),
        '// a corrected comment, which is not a contract change (Entry 71 did this twice)\nexport {};\n',
      );
    });
    const scan = detectReservedClasses(fx.dir, { base: 'main' });
    expect(scan.classes).not.toContain('contract-touching');
  });

  /**
   * ⚠⚠ THE Q15 REGRESSION, IN ITS NEW HOME. `state.mjs` once measured the surface against the
   * baseline in the WORKING TREE — which a re-baselining PR has just rewritten — so the one kind of
   * PR that must never be called additive was the one that got called additive. This detector reads
   * the baseline out of the BASE ref for that exact reason, and this is the test that would catch it
   * regressing here.
   */
  it('still flags contract-touching when the branch also re-baselined the snapshot', () => {
    fx = baselinedFixture();
    branchWith(fx.dir, 'task/T-004-rebaseline', () => {
      writeFileSync(
        join(fx.dir, 'packages/document/src/scene.ts'),
        'export type SceneCollection = { added: true };\n',
      );
      // Re-baseline the way `pnpm state --rebaseline` would: the snapshot now MATCHES the new source.
      rebaseline(fx.dir);
    });
    const scan = detectReservedClasses(fx.dir, { base: 'main' });
    expect(scan.classes).toContain('contract-touching');
  });
});

describe('freeze — the baseline itself moved', () => {
  it('flags a re-baselined snapshot, separately from contract-touching', () => {
    fx = baselinedFixture();
    branchWith(fx.dir, 'task/T-005-freeze', () => {
      const p = join(fx.dir, SNAP);
      const snap = JSON.parse(readFileSync(p, 'utf8'));
      snap._baselinedAtEntry = 999;
      writeFileSync(p, JSON.stringify(snap, null, 2) + '\n');
    });
    const scan = detectReservedClasses(fx.dir, { base: 'main' });
    expect(scan.classes).toContain('freeze');
    // Metadata-only: the SURFACE did not move, so this is `freeze` alone. The two questions are
    // genuinely separate, and collapsing them would drop the P5 ruling's own case.
    expect(scan.classes).not.toContain('contract-touching');
  });
});

describe('legal-figure — CLA.md', () => {
  it('flags the placeholder being filled in, and says the figure is being set', () => {
    fx = makeFixture();
    writeFileSync(join(fx.dir, 'CLA.md'), 'Agreement with <LEGAL ENTITY>, of <LEGAL ENTITY>.\n');
    git(['add', '-A'], fx.dir);
    git(['commit', '-q', '-m', 'fixture: a CLA with the placeholder'], fx.dir);

    branchWith(fx.dir, 'task/T-006-cla', () => {
      writeFileSync(join(fx.dir, 'CLA.md'), 'Agreement with Some Person, of Some Person.\n');
    });
    const scan = detectReservedClasses(fx.dir, { base: 'main' });
    expect(scan.classes).toContain('legal-figure');
    expect(scan.detail['legal-figure']).toMatch(/2 → 0/);
  });

  it('flags any other CLA.md change too, and says the figure itself is unmoved', () => {
    fx = makeFixture();
    writeFileSync(join(fx.dir, 'CLA.md'), 'Agreement with <LEGAL ENTITY>.\n');
    git(['add', '-A'], fx.dir);
    git(['commit', '-q', '-m', 'fixture: a CLA with the placeholder'], fx.dir);

    branchWith(fx.dir, 'task/T-007-cla-typo', () => {
      writeFileSync(join(fx.dir, 'CLA.md'), 'Agreement with <LEGAL ENTITY>. Typo fixed.\n');
    });
    const scan = detectReservedClasses(fx.dir, { base: 'main' });
    expect(scan.classes).toContain('legal-figure');
    expect(scan.detail['legal-figure']).toMatch(/unmoved/);
  });
});

describe('the label set', () => {
  it('declares exactly the three classes AGENTS.md §5 names, all under needs-operator/', () => {
    expect(RESERVED_CLASSES.map((c) => c.id)).toEqual([
      'contract-touching',
      'legal-figure',
      'freeze',
    ]);
    for (const c of RESERVED_CLASSES) expect(c.label.startsWith('needs-operator/')).toBe(true);
  });

  /**
   * The labels this script writes and the labels the RUNBOOK tells the operator to create must be
   * the same three strings. They are created by hand, once, on a repository — so a drift here is
   * discovered as a red CI step on somebody's PR, months later.
   */
  it('matches the labels docs/RUNBOOK.md tells the operator to create', () => {
    const runbook = readFileSync(join(process.cwd(), 'docs/RUNBOOK.md'), 'utf8');
    for (const c of RESERVED_CLASSES) expect(runbook).toContain(c.label);
  });
});
