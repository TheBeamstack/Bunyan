/**
 * ⚠⚠ `pnpm state`'s RISK VERDICT, ACTUALLY EXECUTED — the half `freeze-boundary.test.ts` cannot reach.
 *
 * That file tests `riskVerdict()` as a function and then greps `state.mjs` to prove it is called. Both
 * are worth having and **both were green while the artifact printed the wrong word**, which is the
 * finding this file exists to hold down (Entry 81's own lesson, applied to Entry 81):
 *
 *   1. `pnpm state --rebaseline` correctly printed `contract-touching (re-baselined)` …
 *   2. … and then the very next plain `pnpm state` printed **`RISK: additive`** on the same PR,
 *      because the verdict was measured against the WORKING-TREE baseline that step 1 had just
 *      rewritten. Q15's defect, surviving Q15's fix, one command later.
 *
 * ⚠ And the second run is the one that counts: `pnpm state` OVERWRITES §8 and the prompt's `FRESH`
 * block, so the last invocation is the one a reviewer reads. Re-running it is routine — gate six
 * wants it before every commit and the loop's step 10(a) asks for it again after the prompt push.
 *
 * ⇒ So this file BUILDS A THROWAWAY REPOSITORY with a real `origin/main`, moves a watched declaration,
 * re-baselines, and asserts what `state.mjs` PRINTS and what it WRITES INTO §8 — the two artifacts a
 * reviewer routes on. `tests/reseed-gate-e2e.test.ts` is the same instrument for the other gate.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineEntryIssues, WATCHED } from '../scripts/frozen-surface.mjs';
import { parseAbstracts } from '../scripts/docs-state.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SNAP = 'tests/frozen-surface.snapshot.json';

/** The one watched file this test moves. Everything else is an empty stub `buildSurface` can read. */
const SUBJECT = 'packages/protocol/src/subshape.ts';

let repo: string;

const git = (...args: string[]): string =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();

const write = (rel: string, text: string): void => {
  mkdirSync(join(repo, rel, '..'), { recursive: true });
  writeFileSync(join(repo, rel), text);
};

const read = (rel: string): string => readFileSync(join(repo, rel), 'utf8');

const commit = (message: string): void => {
  git('add', '-A');
  git('commit', '-q', '--allow-empty', '-m', message);
};

/** Run the real generator exactly as `pnpm state` does. */
const runState = (...args: string[]): string =>
  execFileSync('node', [join(repo, 'scripts/state.mjs'), ...args], {
    cwd: repo,
    encoding: 'utf8',
    // ⚠ Point `gh` at an empty config so `state.mjs`'s `gh auth status` probe fails fast and the run
    // makes no network call. The PR line degrades cleanly by design; none of it is under test here.
    env: { ...process.env, GH_CONFIG_DIR: join(repo, '.gh'), GH_TOKEN: '', GITHUB_TOKEN: '' },
  });

/** The `RISK:` word `state.mjs` writes into §8 — what a reviewer actually reads. */
const riskInSection8 = (): string => {
  const m = /\*\*RISK: ([^*]+)\*\*/.exec(read('current_state.md'));
  return m?.[1]?.trim() ?? '(no RISK row in §8)';
};

const CURRENT_STATE = `# state

## §7 — Entry abstracts

### 1 | 2026-08-05 | zayd | the only entry

- **CHANGED:** nothing
- **VERIFIED:** nothing
- **FOUND:** nothing
- **OWES:** nothing
- **RISK:** additive
- **FULL:** handoff/zayd/2026-08-05-x.md
- **REVIEW:** ⚠ AWAITING REVIEW — this is the open PR

## §8 — Generated

<!-- BEGIN GENERATED — written by \`pnpm state\`. Never hand-edit. -->
<!-- END GENERATED -->
`;

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), 'bunyan-state-'));
  for (const f of ['state.mjs', 'docs-state.mjs', 'frozen-surface.mjs']) {
    mkdirSync(join(repo, 'scripts'), { recursive: true });
    copyFileSync(join(ROOT, 'scripts', f), join(repo, 'scripts', f));
  }
  // `buildSurface` reads every watched file, so all of them must exist. Only SUBJECT has content.
  for (const rel of WATCHED) {
    write(rel, rel === SUBJECT ? "export type SubShapeKind = 'face' | 'edge';\n" : '');
  }
  write('current_state.md', CURRENT_STATE);
  mkdirSync(join(repo, 'tests'), { recursive: true }); // where `--rebaseline` writes the baseline

  git('init', '-q', '-b', 'main', '.');
  git('config', 'user.email', 'state@test');
  git('config', 'user.name', 'state');
  commit('base');
  // The baseline main freezes against, written by the generator itself rather than by hand.
  runState('--rebaseline');
  commit('baseline');
  // `state.mjs` measures against `git merge-base origin/main HEAD`, so origin/main must resolve.
  git('update-ref', 'refs/remotes/origin/main', git('rev-parse', 'HEAD'));
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('the RISK verdict `pnpm state` actually prints (Q15)', () => {
  it('says additive when the branch has not moved a watched declaration', () => {
    expect(runState()).toMatch(/RISK: additive/);
    expect(riskInSection8()).toBe('additive');
  });

  it('says contract-touching as soon as one moves', () => {
    write(SUBJECT, "export type SubShapeKind = 'face' | 'edge' | 'vertex';\n");
    commit('widen a frozen union');
    const out = runState();
    expect(out).toMatch(/RISK: contract-touching/);
    expect(out).toMatch(/the OWNER merges this PR/);
    expect(riskInSection8()).toBe('contract-touching');
  });

  it('keeps saying it while re-baselining — the flag is a qualifier, not an answer', () => {
    const out = runState('--rebaseline');
    expect(out).toMatch(/baseline REWRITTEN/);
    expect(out).toMatch(/RISK: contract-touching \(re-baselined\)/);
    expect(riskInSection8()).toBe('contract-touching (re-baselined)');
  });

  /**
   * ⚠⚠ THE DEFECT. Same branch, same moved declaration, one command later — and this is the run whose
   * output SURVIVES, because §8 and `FRESH` are overwritten every time. Before the fix this printed
   * `RISK: additive`, and the loop's step 3 routes an additive PR to *"the reviewing agent merges it"*.
   * That is the Entry 74 failure with the tooling as the excuse.
   */
  it('⚠⚠ STILL says contract-touching on the NEXT plain run, after the baseline was committed', () => {
    commit('commit the rewritten baseline');
    const out = runState();
    expect(out, 'the verdict was erased by re-baselining').toMatch(/RISK: contract-touching/);
    expect(out).toMatch(/the OWNER merges this PR/);
    expect(riskInSection8()).toMatch(/^contract-touching/);
    // ⚠ Weak-green guard: `additive` must appear nowhere a reviewer looks. A label of
    // `additive (re-baselined)` would satisfy a bare `toMatch(/re-baselined/)` and be the old bug.
    expect(riskInSection8()).not.toMatch(/additive/);
  });

  it('⚠ and a metadata-only baseline edit is NOT a contract change', () => {
    // Entry 81 corrected `_baselinedAtEntry` in the committed baseline and stayed `additive`. The
    // verdict keys on `surface`, so touching the file's own bookkeeping must not route to the owner.
    const snap = JSON.parse(read(SNAP)) as Record<string, unknown>;
    snap['_baselinedAtEntry'] = 999;
    write(SNAP, JSON.stringify(snap, null, 2) + '\n');
    commit('correct the baseline metadata');
    git('update-ref', 'refs/remotes/origin/main', git('rev-parse', 'HEAD'));
    expect(runState()).toMatch(/RISK: additive/);
  });

  /**
   * ⚠⚠ THE WRITER'S OWN OUTPUT MUST PASS THE READER'S GATE, ON EVERY DAY OF THE YEAR — and until this
   * test existed it did so on ONE day: whichever day the entry happened to be dated.
   *
   * `baselineEntryIssues` (Entry 84) closes on a cross-field check: the baseline's `_baselinedAt` must
   * agree with the §7 date of the entry `_baselinedAtEntry` names. That is the right check — it is what
   * catches Q15's own shape without a hand-maintained constant. But the two fields it compares were
   * COMPUTED FROM DIFFERENT SOURCES: the number came from the §7 parse and the date came from
   * `new Date()`. **A rebaseline run on any day other than the entry's own date therefore produced a
   * baseline that its own gate rejects** — no hand-edit, nothing wrong, gate red.
   *
   * ⚠ That is not hypothetical and it is not rare: a session that crosses UTC midnight, a session on
   * Amer's `+0100` box between 00:00 and 01:00 local (`toISOString()` is UTC and the §7 date is not),
   * or any entry whose abstract was written the day before its rebaseline. This very fixture reproduces
   * it — §7 says `2026-08-05` and the clock says whatever today is.
   *
   * ⇒ Q15's fix made the NUMBER computed; the date stayed on the clock, so the pair had two sources for
   * one fact. `state.mjs` now stamps the authorising entry's own date, and the cross-field check goes
   * back to meaning what it says: someone hand-edited this file.
   *
   * ⚠ EXECUTED, NOT GREPPED (Entry 81's standing lesson): this runs the real generator and reads the
   * file it wrote, so it cannot pass on a call site that is merely written.
   */
  it("⚠⚠ writes a baseline its own gate accepts — the date is the ENTRY's, never the clock's", () => {
    runState('--rebaseline');
    const snap = JSON.parse(read(SNAP)) as { _baselinedAtEntry: number; _baselinedAt: string };
    const abstracts = parseAbstracts(read('current_state.md'));

    // The premise, measured: §7's only entry is NOT dated today, so a clock-stamped date disagrees.
    expect(abstracts.map((a) => a.date)).not.toContain(new Date().toISOString().slice(0, 10));

    expect(snap._baselinedAtEntry).toBe(1);
    expect(snap._baselinedAt).toBe('2026-08-05');
    expect(baselineEntryIssues(snap, abstracts)).toEqual([]);
  });

  it('⚠ falls back to the checked-out baseline when the base ref has none', () => {
    // A fresh clone with no `origin/main`, or a repo before the baseline was ever committed. The old
    // behaviour — measure against the working tree — is the only thing left to measure against.
    const fresh = mkdtempSync(join(tmpdir(), 'bunyan-state-noremote-'));
    try {
      execFileSync('git', ['clone', '-q', '--no-local', repo, fresh]);
      execFileSync('git', ['remote', 'remove', 'origin'], { cwd: fresh });
      const out = execFileSync('node', [join(fresh, 'scripts/state.mjs')], {
        cwd: fresh,
        encoding: 'utf8',
        env: { ...process.env, GH_CONFIG_DIR: join(fresh, '.gh'), GH_TOKEN: '', GITHUB_TOKEN: '' },
      });
      expect(out).toMatch(/RISK: additive/);
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });
});
