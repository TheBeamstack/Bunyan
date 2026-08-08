/**
 * ⚠⚠ **THE PROMPT-SYNC GATE — `Zayd_Prompt.md` ON THE BRANCH MUST BE BYTE-IDENTICAL TO `main`'s.**
 *
 * Loop step 10(a) pushes `Zayd_Prompt.md` **straight to `main`, on its own, ahead of its PR**, because it
 * is the only document read at t=0 and a copy waiting in a PR would brief the next session staleley. The
 * identical bytes then sit on the branch too, so the PR merges without a conflict.
 *
 * **`pnpm state` rewrites that file's FRESH "Tree at generation" line.** Run it again after 10(a) — which
 * is the natural thing to do, because gate six wants a fresh `pnpm state` before every commit — and the
 * two copies part company by one line. Nothing errors. The merge then dies with a refusal that looks
 * nothing like its cause:
 *
 * ```
 * GraphQL: Pull Request has merge conflicts
 * ```
 *
 * It cost Entry 85 a blocked merge, Entry 87 caught it twice by hand, Entry 88 caught it a third time,
 * and Entry 87 warned Amer of the same thing on `Amer_Prompt.md`. **The written mitigation was a HABIT —
 * `git diff origin/main -- Zayd_Prompt.md` before merging — and a habit that must fire on every PR is a
 * gate nobody wrote** (Entry 87 §5). This is the gate.
 *
 * ---
 *
 * ## The hard part is not the comparison; it is knowing WHEN the comparison is meaningful
 *
 * A whole-file equality check is **WRONG** and would fire on every correct session: between step 6 and
 * step 10(a) a branch legitimately carries a `§2 TASK`/`NEW` that `main` has never seen. Restricting to
 * the FRESH block does not help either — `pnpm state` legitimately rewrites FRESH at step 8, also before
 * 10(a). **There is no subset of the file that is always equal.** The invariant is not about a region of
 * the file, it is about a MOMENT: byte-identity is required from step 10(a) onward, and not before.
 *
 * So the gate asks three questions in order, and **the two skip conditions are load-bearing — each one
 * was measured against real commits to prevent a real false failure** (`tests/prompt-sync.test.ts` §1):
 *
 * **Both skips ask the SAME question of the two sides, and that symmetry is the whole design** — a
 * three-way merge conflicts only where both sides edited the same file since they diverged:
 *
 * | Question | How | Skip means |
 * | --- | --- | --- |
 * | 1. Did the BRANCH touch the file since diverging? | `git diff <merge-base> <head> -- <file>` | not this seat's file — Amer's branch, or `main` itself |
 * | 2. Did MAIN touch it since diverging? | `git diff <merge-base> <main> -- <file>` | no conflict is possible: 10(a) has not landed here |
 * | 3. Then: do they MATCH? | `git diff <main> <head> -- <file>` | **non-empty here is the defect** |
 *
 * Measured on this repository's own history — and both skips earn their place, because a naive
 * `git diff main HEAD -- <file>` reports a difference in **three** of these four and is right about one:
 *
 * ```
 * in-sync Zayd PR   (4fd302f vs ec107cb)  main touched it  → PASS
 * pre-10(a)         (958658d vs 714447d)  main did not     → SKIP  (question 2 saves it)
 * Amer's branch     (4fd302f vs 8dcc932)  branch did not   → SKIP  (question 1 saves it)
 * on main itself    (eb74f43 vs eb74f43)  neither did      → SKIP  (question 1 gets there first)
 * ```
 *
 * ⚠⚠ **AND THE FOUR ABOVE ARE NOT THE WHOLE POPULATION — Entry 90's review found the fifth and it was
 * a FALSE FAILURE.** Question 2 used to ask `merge-base --is-ancestor <main> <head>` ("is main
 * contained in this branch?"), which is a question about COMMITS where the invariant is about a FILE.
 * **When the other agent merges their PR mid-session, main gains a commit this branch lacks, that skip
 * stops firing, and a correct session fails at step 7** — telling it 10(a) had pushed (it had not) and
 * prescribing `git checkout main -- Zayd_Prompt.md`, which **deletes the §2 `TASK`/`NEW` just written
 * for the next entry.** With two agents running in parallel that is the ordinary case, not an exotic
 * one. ⇒ Ask about the file. Four further states are pinned in `tests/prompt-sync.test.ts` §2:
 * `pnpm state` run twice, main fast-forwarded mid-session, main MERGED into the branch, and **two Zayd
 * PRs open at once** — the last of which must still FAIL, and does.
 *
 * ⚠⚠ **QUESTION 2 WAS WRONG THREE TIMES, AND EVERY WRONG VERSION PASSED ALL FOUR PINNED STATES — WHICH
 * IS THE REAL LESSON HERE.** It began as *"has a commit touched this file on main that is not in the
 * branch?"* (`git rev-list`), the 10(a) push's signature, which a **rebase** defeats: the commit becomes
 * an ancestor and the gate skipped while telling the next session *"step 10(a) has not pushed yet"*, by
 * then a lie. Attempt two asked who wrote the file last (wrong — the branch did, in both). Attempt
 * three, `merge-base --is-ancestor`, was right about the rebase and shipped — **and Entry 90 measured
 * that it fails a correct session the moment the parallel agent merges anything** (above).
 *
 * All three shared one mistake: they asked **which commits are where**, when the thing that must not
 * drift is **a file**. `main ⊆ branch` is only one of the ways main can have left this file alone;
 * `git diff <merge-base> <main> -- <file>` is all of them, and it is the criterion `git merge` itself
 * uses. ⇒ **One condition, one true reason** — and this time the reason is about the same noun as the
 * invariant. *(That a state is pinned proves the pin, not the population: four pinned states accepted
 * three wrong implementations in a row. Ask what the pins do not contain.)*
 *
 * ⚠ **WHY `BASE_REF` AND NOT `origin/main`.** In CI the gate reads the base **SHA** the workflow already
 * passes to the re-seed gate (`github.event.pull_request.base.sha`), never a ref name. ⚠ `origin/main`
 * turns out to exist there too — checkout fetches `+refs/heads/*:refs/remotes/origin/*` under
 * `fetch-depth: 0`, **measured on this gate's first CI run**, correcting what this comment claimed was
 * unmeasurable from the dev box. The SHA is kept anyway: it needs no ref to exist at all, and Entry 73's
 * lesson is what happens when a gate depends on a property of the CI checkout nobody checked. Locally there is no `BASE_REF`, so `origin/main` is used and its absence
 * is a skip, not a failure. **Cost: `git show origin/main:Zayd_Prompt.md` × 100 = 185 ms — 1.85 ms a
 * call, and it is a local object read, so it works offline.**
 *
 * ⚠⚠ **WHERE EACH HALF ACTUALLY EARNS ITS KEEP — measured, and not what I assumed when I started.**
 * There are two kinds of drift and they are caught in different places:
 *
 * - **Drift on the line 10(a) pushed** (the classic: `pnpm state` rerun rewrites the tree line). Main
 *   and the branch have both edited that line since diverging, so the merge **conflicts** — GitHub
 *   cannot build `refs/pull/N/merge` and the PR is already visibly unmergeable. **The LOCAL run is what
 *   helps here**, because it fails at step 7 with the `git checkout` fix instead of at merge time with
 *   `GraphQL: Pull Request has merge conflicts`.
 * - **Drift git can auto-merge** (an append, or an edit elsewhere in the file after 10(a)). No conflict,
 *   nothing visible, and a prompt lands on main that no session put there. **This is the CI half's job**,
 *   and it is the case the `HEAD_REF` fix below exists for.
 *
 * ⚠ **`Amer_Prompt.md` WAS DELIBERATELY NOT GATED, AND ENTRY 89 (AMER) HAS NOW ADDED IT.** Entry 88 left
 * it out for a reason that was exactly right at the time: the mechanism is identical and Entry 87 had
 * warned Amer about it, but PR #13 was open **right then** with `Amer_Prompt.md` still travelling inside
 * it, so switching this on unilaterally would have failed a reviewed PR over somebody else's protocol.
 * ⇒ Entry 89 merged PR #13, restored that file to main's bytes as part of the merge (the gate's own
 * failure mode, hit on the one file the gate did not yet cover), and took the call it was left. **Both
 * seats' prompts are now gated by one list, and the loop step both prompts share is enforced once.**
 */

import { execFileSync } from 'node:child_process';

/**
 * The prompt files this gate governs — **both seats, one list** (Entry 89 added Amer's; see the header).
 *
 * ⚠ The two skips are what make one list safe for two loops running in parallel: a branch that does not
 * write a given prompt skips on question 1, so Zayd's PR is never judged on `Amer_Prompt.md` and Amer's
 * is never judged on `Zayd_Prompt.md`. The gate is per-FILE, not per-seat.
 */
export const GATED = ['Zayd_Prompt.md', 'Amer_Prompt.md'];

const git = (args, cwd) =>
  execFileSync('git', args, { encoding: 'utf8', cwd, stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** Does `ref` resolve to an object in this repository? */
export function resolves(ref, cwd) {
  try {
    git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], cwd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Which ref plays the part of "main"? `BASE_REF` in CI (a SHA the workflow hands us — see the header),
 * `origin/main` locally. `undefined` when neither is available, which is a SKIP.
 */
export function mainRef(env = process.env, cwd) {
  const base = env['BASE_REF'];
  if (base) {
    // ⚠⚠ A `BASE_REF` CI SET BUT GIT CANNOT RESOLVE IS THE ENTRY-73 DISEASE, AND IT MUST NOT SKIP.
    // That is the exact signature of a shallow checkout — the condition that quietly disabled the
    // re-seed gate for 73 entries, because its unresolvable ref took the "not a pull request" branch.
    // A gate that turns itself off when its input is broken is worse than no gate: it reports green.
    if (!resolves(base, cwd)) {
      throw new Error(
        `prompt-sync gate: BASE_REF="${base}" does not resolve in this checkout.\n` +
          `That is what a SHALLOW clone looks like. The workflow needs actions/checkout with\n` +
          `fetch-depth: 0 (it already has it — so if you are reading this, something removed it).\n` +
          `⚠ Do NOT "fix" this by skipping: a gate that disables itself on a broken input is how the\n` +
          `re-seed gate reported green for 73 entries without ever executing.`,
      );
    }
    return base;
  }
  return resolves('origin/main', cwd) ? 'origin/main' : undefined;
}

/**
 * ⚠⚠ **WHICH COMMIT IS "THE BRANCH"? IN CI IT IS *NOT* `HEAD`, AND GETTING THIS WRONG SILENTLY DISABLES
 * THE WHOLE GATE.** On a `pull_request` event `actions/checkout` checks out `refs/pull/N/merge` — a
 * MERGE COMMIT of the branch into the base:
 *
 * ```
 * git checkout --progress --force refs/remotes/pull/15/merge
 * HEAD is now at 7fd391f Merge 4a9cd10… into b96c3a3…
 * ```
 *
 * Measured from this gate's own first CI run. That merge commit **contains main by construction**, so
 * question 2 below (`main ⊆ branch`) is true for every PR and the gate skips **every time, in the one
 * place it was built for** — green, silent, useless. Entry 73's disease, arrived at from a third
 * direction, and it survived a green CI run before being caught by reading the log rather than the
 * check mark.
 *
 * ⇒ CI passes the PR's real head SHA (`github.event.pull_request.head.sha`) and the gate uses it.
 * Locally there is no `HEAD_REF` and `HEAD` is already the branch tip.
 */
export function headRef(env = process.env, cwd) {
  const head = env['HEAD_REF'];
  if (head) {
    if (!resolves(head, cwd)) {
      throw new Error(
        `prompt-sync gate: HEAD_REF="${head}" does not resolve in this checkout.\n` +
          `Same rule as BASE_REF: do NOT skip here — see mainRef above.`,
      );
    }
    return head;
  }
  return 'HEAD';
}

/**
 * The verdict for ONE file. `{ ok: true, skipped: <why> }` when the comparison is not yet meaningful,
 * `{ ok: true }` when it is and they match, `{ ok: false, … }` when they do not.
 */
export function promptSync(file, { main, head = 'HEAD', cwd } = {}) {
  if (main === undefined) return { ok: true, skipped: 'no BASE_REF and no origin/main' };

  // 1 · Does this branch author the file? On `main`, and on a branch that never touched it, the
  //     merge-base IS the relevant side and this diff is empty — nothing to say.
  const mergeBase = git(['merge-base', main, head], cwd);
  if (git(['diff', '--name-only', mergeBase, head, '--', file], cwd) === '') {
    return { ok: true, skipped: `this branch does not modify ${file}` };
  }

  // 2 · Has MAIN touched this file since the two sides diverged? A conflict needs BOTH sides to have
  //     edited it; question 1 established the branch did, and this establishes whether main did. If
  //     main has not, there is nothing to assert — main will simply take the branch's copy.
  //
  //     ⚠⚠ THIS ASKS ABOUT THE FILE, NOT ABOUT THE TOPOLOGY, AND ENTRY 88 GOT THAT WRONG THREE TIMES.
  //     It began as `git rev-list <main> ^<head> -- <file>` — the 10(a) push's signature — which a
  //     REBASE defeats. That became `merge-base --is-ancestor <main> <head>` ("is main contained in
  //     the branch?"), which is right about the rebase and the mid-session state but asks a question
  //     about COMMITS when the invariant is about a FILE. ⚠ **Entry 90's review measured what that
  //     costs: main advancing for a reason that has nothing to do with this file — the OTHER AGENT
  //     merging their PR mid-session — stops the containment skip and fails a correct session**, with
  //     a message claiming 10(a) had pushed (false) and a remedy that deletes the §2 `TASK`/`NEW` the
  //     session had just written. See `tests/prompt-sync.test.ts` §2.
  //
  //     ⇒ The file-scoped question subsumes every state containment covered — `main ⊆ branch` makes
  //     main the merge-base, so this diff is empty too — and it stops answering for states it was
  //     never asked about. **One condition, one true reason**, and now it is the reason that is true:
  //     this is the three-way merge's own criterion, restricted to the one file that must not drift.
  if (git(['diff', '--name-only', mergeBase, main, '--', file], cwd) === '') {
    return {
      ok: true,
      skipped: `main has not touched ${file} since this branch diverged — no conflict is possible`,
    };
  }

  // 3 · Now — and only now — they must be byte-identical.
  //
  // ⚠⚠ AGAINST THE WORKING TREE WHEN WE CAN, NOT MERELY AGAINST `HEAD`. The drift is CREATED by
  // `pnpm state` at step 8, which leaves it UNCOMMITTED — and gate six runs right after. Diffing
  // `main..HEAD` there compares two clean commits, reports nothing, and the gate first speaks up one
  // commit too late. Caught on this gate's own session: `pnpm state` drifted the prompt, `git diff
  // origin/main --` showed it, and `docs:check` said 42 passed. Omitting the second ref makes `git
  // diff` compare against the WORKING TREE, which is the state the session can still fix for free.
  // ⚠ Only when `head` is the default: an explicit ref (CI's `HEAD_REF`, or a test) means "compare
  // these two commits", and a dirty tree must not leak into that answer.
  const drift =
    head === 'HEAD'
      ? git(['diff', main, '--', file], cwd)
      : git(['diff', main, head, '--', file], cwd);
  if (drift === '') return { ok: true };
  return { ok: false, file, main, drift };
}

/** The message a failure prints. It names the fix, because the failure's cause is not visible in it. */
export function explain({ file, main, drift }) {
  return (
    `${file} has drifted from ${main}.\n\n` +
    `Step 10(a) already pushed this file to main, so the two copies MUST be byte-identical or the\n` +
    `PR merges with a conflict — reported by GitHub as "Pull Request has merge conflicts", which\n` +
    `looks nothing like its cause. The usual culprit is a \`pnpm state\` run AFTER 10(a): it rewrites\n` +
    `FRESH's "Tree at generation" line.\n\n` +
    `FIX:  git checkout ${main} -- ${file} && pnpm docs:check && git commit\n\n` +
    `The drift:\n${drift}`
  );
}
