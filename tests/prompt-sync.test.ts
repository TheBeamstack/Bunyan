/**
 * ENTRY 88 — **THE PROMPT-SYNC GATE.** The rationale, the three questions and the measurements are in
 * `scripts/prompt-sync.mjs`'s header; this file is what executes them.
 *
 * ⚠⚠ **THE THING THIS GATE HAD TO GET RIGHT IS NOT THE COMPARISON — IT IS THE SKIP.** A naive
 * `git diff origin/main -- Zayd_Prompt.md` reports a difference in **three of the four** real states this
 * repository's own history contains, and is right about exactly one of them. §1 pins all four against
 * real commits, so a future change to the skip logic fails here instead of failing a correct session at
 * step 7. §2 proves the gate goes RED when the file actually drifts — the failure it exists for, which
 * no state in this repository's history can supply, because every occurrence so far was caught and
 * fixed by hand before it was committed.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { GATED, explain, mainRef, promptSync, resolves } from '../scripts/prompt-sync.mjs';

const git = (args: string[], cwd?: string): string =>
  execFileSync('git', args, { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/**
 * ⚠ Real commits from this repository, and the gate's whole design rests on them. If a history rewrite
 * ever makes these unreachable the tests SKIP rather than fail — a missing object is not a defect in the
 * gate, and a test that dies on `git gc` teaches the next session to delete it.
 */
const COMMITS = {
  mainWith10a: '4fd302f', // main, carrying entry 88's prompt pushed by step 10(a)
  branchInSync: 'ec107cb', // entry 87's branch after its review — identical bytes
  mainBefore10a: '958658d', // main before that push
  branchMidSession: '714447d', // entry 87's branch at the same moment — legitimately different
  amerBranch: '8dcc932', // Entry 86 — never touches Zayd_Prompt.md
  afterMerge: 'eb74f43', // main after entry 87 merged
};
const haveHistory = Object.values(COMMITS).every((c) => resolves(c, process.cwd()));

describe('§1 — the prompt-sync gate, against the four states this repository has actually been in', () => {
  const verdict = (main: string, head: string) =>
    promptSync('Zayd_Prompt.md', { main, head, cwd: process.cwd() });

  it.skipIf(!haveHistory)('an IN-SYNC Zayd PR passes — the state every merge needs', () => {
    const v = verdict(COMMITS.mainWith10a, COMMITS.branchInSync);
    expect(v.ok).toBe(true);
    expect(v.skipped).toBeUndefined(); // ⚠ it PASSED, it did not decline to look
  });

  it.skipIf(!haveHistory)(
    '⚠⚠ PRE-10(a) SKIPS — a whole-file check would fail every correct session here',
    () => {
      // The branch is carrying its new §2 TASK/NEW and main has never seen them. This is the state a
      // session is in at step 7, when `pnpm verify` runs the gate.
      expect(
        git([
          'diff',
          '--name-only',
          COMMITS.mainBefore10a,
          COMMITS.branchMidSession,
          '--',
          'Zayd_Prompt.md',
        ]),
      ).toBe('Zayd_Prompt.md'); // ⚠ THE FILES DIFFER — and that is CORRECT
      const v = verdict(COMMITS.mainBefore10a, COMMITS.branchMidSession);
      expect(v.ok).toBe(true);
      expect(v.skipped).toMatch(/no conflict is possible/);
    },
  );

  it.skipIf(!haveHistory)(
    "⚠⚠ AMER'S BRANCH SKIPS — it does not write this file, and main moved under it",
    () => {
      expect(
        git([
          'diff',
          '--name-only',
          COMMITS.mainWith10a,
          COMMITS.amerBranch,
          '--',
          'Zayd_Prompt.md',
        ]),
      ).toBe('Zayd_Prompt.md'); // ⚠ AGAIN a real difference, and again not Amer's doing
      const v = verdict(COMMITS.mainWith10a, COMMITS.amerBranch);
      expect(v.ok).toBe(true);
      expect(v.skipped).toMatch(/does not modify/);
    },
  );

  it.skipIf(!haveHistory)('on `main` itself it skips — the two sides are the same commit', () => {
    const v = verdict(COMMITS.afterMerge, COMMITS.afterMerge);
    expect(v.ok).toBe(true);
    expect(v.skipped).toMatch(/does not modify/);
  });

  it('with neither BASE_REF nor origin/main it skips — a gate must not need the network', () => {
    expect(promptSync('Zayd_Prompt.md', { main: undefined }).skipped).toMatch(/no BASE_REF/);
  });

  it('BASE_REF is used when it resolves — the CI path, exercised from here', () => {
    const head = git(['rev-parse', 'HEAD']);
    expect(mainRef({ BASE_REF: head }, process.cwd())).toBe(head);
  });

  it('⚠⚠ an UNRESOLVABLE BASE_REF THROWS — it must never skip; that is the Entry-73 disease', () => {
    // A `BASE_REF` CI set that git cannot resolve means a shallow checkout. Skipping there is how the
    // re-seed gate reported green for 73 entries without once executing. Loud, or it is not a gate.
    expect(() => mainRef({ BASE_REF: 'deadbeefdeadbeef' }, process.cwd())).toThrow(/shallow/i);
  });
});

describe('§2 — the failure it exists for, constructed', () => {
  const repo = mkdtempSync(join(tmpdir(), 'bunyan-prompt-sync-'));
  afterAll(() => {
    // ⚠ `/tmp` is a tmpfs on the dev box — it costs RAM, not disk. Always clean up (§1c-2).
    rmSync(repo, { recursive: true, force: true });
  });

  it('⚠⚠ DRIFT AFTER 10(a) IS CAUGHT — this is the merge conflict, named at PR time instead', () => {
    const run = (...args: string[]) => git(args, repo);
    run('init', '-q', '-b', 'main');
    run('config', 'user.email', 'gate@test');
    run('config', 'user.name', 'gate');
    const prompt = join(repo, 'Zayd_Prompt.md');

    writeFileSync(prompt, 'FRESH: ENTRY 1\nTree at generation: `abc`\n');
    run('add', '-A');
    run('commit', '-qm', 'entry 1');

    // A session branches, edits §2 TASK, and runs `pnpm state` — the tree line moves.
    run('checkout', '-q', '-b', 'zayd/entry-2');
    writeFileSync(prompt, 'FRESH: ENTRY 2\nTree at generation: `def`\nTASK: the next thing\n');
    run('commit', '-qam', 'entry 2 work');
    const branchBefore10a = run('rev-parse', 'HEAD');

    // ⚠ Step 10(a): the SAME bytes go to main on their own, ahead of the PR.
    run('checkout', '-q', 'main');
    run('checkout', 'zayd/entry-2', '--', 'Zayd_Prompt.md');
    run('commit', '-qam', 'Zayd_Prompt: hand off to entry 3');
    const mainAfter10a = run('rev-parse', 'HEAD');
    run('checkout', '-q', 'zayd/entry-2');

    // In sync ⇒ the gate looks, and passes.
    const sync = promptSync('Zayd_Prompt.md', {
      main: mainAfter10a,
      head: branchBefore10a,
      cwd: repo,
    });
    expect(sync).toEqual({ ok: true });

    // …and now the defect: `pnpm state` runs once more and rewrites ONE line.
    writeFileSync(prompt, 'FRESH: ENTRY 2\nTree at generation: `ghi`\nTASK: the next thing\n');
    run('commit', '-qam', 'pnpm state again (the bug)');

    const drifted = promptSync('Zayd_Prompt.md', { main: mainAfter10a, head: 'HEAD', cwd: repo });
    expect(drifted.ok).toBe(false);
    expect(drifted.drift).toContain('Tree at generation');
    // ⚠ The message must name the FIX, because the drift's cause is invisible in the symptom.
    expect(explain(drifted)).toContain(`git checkout ${mainAfter10a} -- Zayd_Prompt.md`);

    // ⚠⚠ AND THE SAME DRIFT, REBASED — it SKIPS, and that is measured to be correct, not assumed.
    // After a rebase the 10(a) commit is an ancestor, so the two sides have not both edited the file
    // since diverging and `git merge` reports NO conflict: main simply takes the branch's line. There
    // is nothing for this gate to prevent. The skip must SAY that, though — see the message below.
    run('rebase', '-q', mainAfter10a);
    const rebased = promptSync('Zayd_Prompt.md', { main: mainAfter10a, head: 'HEAD', cwd: repo });
    expect(rebased.ok).toBe(true);
    expect(rebased.skipped).toMatch(/no conflict is possible/);

    run('checkout', '-q', 'main');
    expect(() => run('merge', '--no-commit', '--no-ff', 'zayd/entry-2')).not.toThrow();
  });
});

describe('§3 — the live gate', () => {
  it('every gated prompt file matches main', () => {
    const main = mainRef(process.env, process.cwd());
    for (const file of GATED) {
      const v = promptSync(file, { main, cwd: process.cwd() });
      expect(v.ok, v.ok ? '' : explain(v)).toBe(true);
    }
  });
});
