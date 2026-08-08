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
import { GATED, explain, headRef, mainRef, promptSync, resolves } from '../scripts/prompt-sync.mjs';

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
    run('merge', '--abort'); // ⚠ leave no half-merge behind — the next test uses this repo
  });

  it("⚠⚠ CI's MERGE COMMIT must not be used as the branch — it contains main, so the gate would skip", () => {
    // Measured on this gate's own first CI run: `actions/checkout` on a `pull_request` checks out
    // `refs/pull/N/merge` and reports `HEAD is now at 7fd391f Merge 4a9cd10 into b96c3a3`. That commit
    // contains main by construction, so question 2 fires and the gate is green and useless — the exact
    // Entry-73 shape, reached from a third direction. The workflow therefore passes
    // `pull_request.head.sha`, NOT `github.sha`. This test is what stops that being undone.
    //
    // ⚠ Its own repo: the test above ends with the branch REBASED, which would mask this entirely.
    const fresh = mkdtempSync(join(tmpdir(), 'bunyan-prompt-sync-ci-'));
    try {
      const run = (...args: string[]) => git(args, fresh);
      run('init', '-q', '-b', 'main');
      run('config', 'user.email', 'gate@test');
      run('config', 'user.name', 'gate');
      const prompt = join(fresh, 'Zayd_Prompt.md');

      // ⚠ A realistic shape: a FRESH block the handoff rewrites, and a tail it does not.
      const TAIL = 'TASK: the standing task\nNEW: the standing lessons\n';
      writeFileSync(prompt, `FRESH: ENTRY 1\nTree: \`abc\`\n${TAIL}`);
      run('add', '-A');
      run('commit', '-qm', 'entry 1');

      run('checkout', '-q', '-b', 'zayd/entry-2');
      writeFileSync(prompt, `FRESH: ENTRY 2\nTree: \`def\`\n${TAIL}`);
      run('commit', '-qam', 'entry 2 work');

      run('checkout', '-q', 'main'); // step 10(a) — the SAME bytes go to main
      run('checkout', 'zayd/entry-2', '--', 'Zayd_Prompt.md');
      run('commit', '-qam', 'Zayd_Prompt: hand off');
      const main = run('rev-parse', 'HEAD');

      // ⚠⚠ DRIFT THAT GIT CAN AUTO-MERGE, AND THAT DISTINCTION IS WHY THE CI HALF MATTERS AT ALL.
      // If the branch rewrites the SAME line 10(a) pushed (the classic `pnpm state` rerun), main and
      // the branch have both edited it since diverging, the merge CONFLICTS, GitHub cannot build
      // `refs/pull/N/merge`, and the PR is already visibly unmergeable — measured while writing this
      // test, and it is why the drift case above is the LOCAL half's job. What CI can still be wrong
      // about is drift git merges cleanly: an APPEND after 10(a), which lands a prompt on main that
      // no session ever put there.
      run('checkout', '-q', 'zayd/entry-2');
      writeFileSync(prompt, `FRESH: ENTRY 2\nTree: \`def\`\n${TAIL}NOTE: appended after 10(a)\n`);
      run('commit', '-qam', 'a late append — auto-mergeable, and still drift');
      const realBranchTip = run('rev-parse', 'HEAD');

      run('checkout', '-q', 'main');
      run('merge', '-q', '--no-ff', '-m', 'Merge pull request', 'zayd/entry-2');
      const ciMergeCommit = run('rev-parse', 'HEAD');

      // ⚠ `github.sha` — the merge commit. It SKIPS, and the drift sails straight through.
      const wrong = promptSync('Zayd_Prompt.md', { main, head: ciMergeCommit, cwd: fresh });
      expect(wrong.ok).toBe(true);
      expect(wrong.skipped).toMatch(/no conflict is possible/);

      // ⚠ `pull_request.head.sha` — the real branch tip. It LOOKS, and it CATCHES.
      const right = promptSync('Zayd_Prompt.md', { main, head: realBranchTip, cwd: fresh });
      expect(right.skipped).toBeUndefined();
      expect(right.ok).toBe(false);
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });

  it('⚠⚠ UNCOMMITTED drift is caught too — that is the moment `pnpm state` creates it', () => {
    // The local half's whole value is failing at step 8, where the fix is free. `pnpm state` leaves the
    // drift in the WORKING TREE, so a `main..HEAD` comparison sees two clean commits and says nothing.
    // ⚠ Not hypothetical: this gate passed 42/42 on its own session while `git diff origin/main --`
    // showed a real one-line drift. Omitting the second ref is the fix.
    const fresh = mkdtempSync(join(tmpdir(), 'bunyan-prompt-sync-wt-'));
    try {
      const run = (...args: string[]) => git(args, fresh);
      run('init', '-q', '-b', 'main');
      run('config', 'user.email', 'gate@test');
      run('config', 'user.name', 'gate');
      const prompt = join(fresh, 'Zayd_Prompt.md');
      writeFileSync(prompt, 'FRESH: ENTRY 1\n');
      run('add', '-A');
      run('commit', '-qm', 'entry 1');

      run('checkout', '-q', '-b', 'zayd/entry-2');
      writeFileSync(prompt, 'FRESH: ENTRY 2\nTree: `def`\n');
      run('commit', '-qam', 'entry 2 work');
      run('checkout', '-q', 'main'); // 10(a)
      run('checkout', 'zayd/entry-2', '--', 'Zayd_Prompt.md');
      run('commit', '-qam', 'hand off');
      const main = run('rev-parse', 'HEAD');
      run('checkout', '-q', 'zayd/entry-2');

      // Committed state is clean; the gate looks and passes.
      expect(promptSync('Zayd_Prompt.md', { main, cwd: fresh })).toEqual({ ok: true });

      // `pnpm state` runs and leaves the drift UNCOMMITTED.
      writeFileSync(prompt, 'FRESH: ENTRY 2\nTree: `ghi`\n');
      const v = promptSync('Zayd_Prompt.md', { main, cwd: fresh });
      expect(v.ok).toBe(false);
      expect(v.drift).toContain('Tree');

      // ⚠ …but an EXPLICIT head means "compare these two commits", and a dirty tree must not leak in.
      const tip = run('rev-parse', 'HEAD');
      expect(promptSync('Zayd_Prompt.md', { main, head: tip, cwd: fresh })).toEqual({ ok: true });
    } finally {
      rmSync(fresh, { recursive: true, force: true });
    }
  });

  it('headRef prefers HEAD_REF, falls back to HEAD, and throws on an unresolvable one', () => {
    const here = process.cwd();
    expect(headRef({}, here)).toBe('HEAD');
    const sha = git(['rev-parse', 'HEAD']);
    expect(headRef({ HEAD_REF: sha }, here)).toBe(sha);
    expect(() => headRef({ HEAD_REF: 'deadbeefdeadbeef' }, here)).toThrow(/does not resolve/);
  });
});

describe('§3 — the live gate', () => {
  it('every gated prompt file matches main', () => {
    const main = mainRef(process.env, process.cwd());
    // ⚠ `headRef`, NOT `HEAD` — in CI `HEAD` is a merge commit that CONTAINS main, and the gate would
    // skip every PR while reporting green. See `prompt-sync.mjs`'s header; this line is the whole fix.
    const head = headRef(process.env, process.cwd());
    for (const file of GATED) {
      const v = promptSync(file, { main, head, cwd: process.cwd() });
      expect(v.ok, v.ok ? '' : explain(v)).toBe(true);
    }
  });
});
