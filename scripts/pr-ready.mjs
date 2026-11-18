// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * scripts/pr-ready.mjs — checks the opened PR's title routes (`T-nnn: ` / `STEWARD: `, or a dependabot
 * PR by head branch and bot author) and that GitHub reports it MERGEABLE.
 *
 * ⚠ `--fill`, a hand-typed title and `gh pr edit --title` all reach GitHub without any script
 * checking the title first, so this re-asks on the PR that actually got opened.
 *
 * ⚠⚠ `mergeable` is computed asynchronously and starts as `UNKNOWN`, so a single read on a push is
 * usually `UNKNOWN`. Passing on it makes the gate decorative and failing on it makes CI flaky — this
 * polls and reports `UNKNOWN` as its own outcome ("re-run the job"), never as either verdict.
 *
 * CLI
 *   node scripts/pr-ready.mjs --pr 42
 *   node scripts/pr-ready.mjs --title 'T-001: something'   title check alone, no network
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ghSpawn } from './reserved-classes.mjs';

const SELF_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** `T-nnn: ` / `STEWARD: ` — the only two routable PR-title prefixes: a task turn, or a steward turn
 * carrying no task. */
const PR_TITLE_RE = /^(T-\d{3}: |STEWARD: )/;

/** `true` when a PR title carries a routable `T-nnn:` / `STEWARD:` prefix. */
export function titleRoutes(title) {
  return PR_TITLE_RE.test(title ?? '');
}

/**
 * `true` for a dependabot bump: head branch `dependabot/…` AND author the dependabot app. Its title is
 * dependabot's own (`Bump x from a to b`), so it routes by provenance; both halves are required, so a
 * human cannot borrow the route by naming a branch.
 */
export function dependabotRoutes(pr) {
  return (
    typeof pr?.headRefName === 'string' &&
    pr.headRefName.startsWith('dependabot/') &&
    pr.author?.login === 'app/dependabot' &&
    pr.author?.is_bot === true
  );
}

/** `gh pr view` as JSON, or `null` when gh cannot answer. */
function prView(root, pr, fields) {
  try {
    return JSON.parse(
      ghSpawn(['pr', 'view', String(pr), '--json', fields.join(',')], {
        cwd: root,
        encoding: 'utf8',
      }),
    );
  } catch {
    return null;
  }
}

function sleep(ms) {
  // Synchronous on purpose: this script is a linear CI step, and `Atomics.wait` needs no event loop.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Poll `mergeable` until GitHub settles it. Returns the settled value, or `'UNKNOWN'` if it never
 * settled within `attempts`.
 */
export function mergeableState(root, pr, { attempts = 6, waitMs = 5000, view = prView } = {}) {
  for (let i = 0; i < attempts; i++) {
    const data = view(root, pr, ['mergeable', 'mergeStateStatus']);
    if (data === null) return { mergeable: null, mergeStateStatus: null };
    if (data.mergeable && data.mergeable !== 'UNKNOWN') return data;
    if (i < attempts - 1) sleep(waitMs);
  }
  return { mergeable: 'UNKNOWN', mergeStateStatus: null };
}

/**
 * Both checks against `pr` (read through `view`) or a bare `title`. Returns `{ passes, failures }`;
 * `failures` is `null` when gh could not read the PR at all.
 */
export function checkPr({ root, pr, title, view = prView, poll = {} }) {
  const passes = [];
  const failures = [];

  // ── 1. the title ────────────────────────────────────────────────────────────────────────────
  let data = null;
  if (title === undefined && pr) {
    data = view(root, pr, ['title', 'headRefName', 'author']);
    if (data === null) return { passes, failures: null };
    title = data.title;
  }
  if (titleRoutes(title)) {
    passes.push(`✓ title routes: ${title}`);
  } else if (dependabotRoutes(data)) {
    passes.push(`✓ routed as a dependency PR: ${data.headRefName} by ${data.author.login}`);
  } else {
    failures.push(
      `the PR title does not route:\n      ${title}\n` +
        `    It must start with \`T-nnn: \` (a task turn) or \`STEWARD: \` (a steward turn carrying\n` +
        `    no task) — AGENTS.md §1.3. Reviewer routing has nothing to key on otherwise.\n` +
        `    Fix it in place:  gh pr edit ${pr ?? '<n>'} --title 'T-nnn: …'`,
    );
  }

  // ── 2. mergeable ────────────────────────────────────────────────────────────────────────────
  if (pr) {
    const { mergeable, mergeStateStatus } = mergeableState(root, pr, { ...poll, view });
    if (mergeable === null) {
      failures.push(`gh could not read PR ${pr}'s mergeable state.`);
    } else if (mergeable === 'MERGEABLE') {
      passes.push(`✓ mergeable: MERGEABLE${mergeStateStatus ? ` (${mergeStateStatus})` : ''}`);
    } else if (mergeable === 'UNKNOWN') {
      // ⚠ NOT a pass and NOT a hard failure of the PR itself — GitHub never finished computing.
      // Said out loud rather than swallowed, because a gate that reports green on UNKNOWN is the
      // `§1c-7` disease and a gate that reports red on it is flaky. Re-running the job re-asks.
      failures.push(
        `GitHub did not settle PR ${pr}'s mergeable state (still UNKNOWN after polling).\n` +
          `    This is GitHub's background merge test, not a verdict about the branch. Re-run the job.`,
      );
    } else {
      failures.push(
        `PR ${pr} is not mergeable: ${mergeable}` +
          (mergeStateStatus ? ` (${mergeStateStatus})` : '') +
          `\n    GitHub calls this "Pull Request has merge conflicts". Merge origin/main into the\n` +
          `    branch and re-push — and if the conflict is in docs/CURRENT_STATE.md §0b/§8, take EITHER\n` +
          `    side and let \`pnpm state\` re-measure. Never hand-resolve those markers.`,
      );
    }
  }
  return { passes, failures };
}

export function main(argv = process.argv.slice(2)) {
  let root = SELF_ROOT;
  let pr;
  let title;
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--root') root = argv[++i];
    else if (t === '--pr') pr = argv[++i];
    else if (t === '--title') title = argv[++i];
    else {
      console.error(`pr-ready.mjs: unknown flag '${t}'`);
      process.exit(2);
    }
  }
  if (title === undefined && !pr) {
    console.error('usage: pr-ready.mjs --pr <n> | --title <title>');
    process.exit(2);
  }

  const { passes, failures } = checkPr({ root, pr, title });
  if (failures === null) {
    console.error(`✖ gh could not read PR ${pr}. Is \`gh\` authenticated?`);
    process.exit(1);
  }
  for (const p of passes) console.log(p);
  if (failures.length) {
    console.error('');
    for (const f of failures) console.error(`  ✖ ${f}`);
    process.exit(1);
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/pr-ready.mjs')) {
  main();
}
