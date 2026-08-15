#!/usr/bin/env node
/**
 * scripts/pr-ready.mjs — checks the opened PR's title routes (`T-nnn: ` / `STEWARD: `) and that GitHub
 * reports it MERGEABLE.
 *
 * ⚠ `agent-finish.mjs` already refuses to PRINT a non-routing title, but that binds only a seat that
 * ran it; `--fill`, a hand-typed title and `gh pr edit --title` all reach GitHub without it. The regex
 * is `seats.mjs`'s `PR_TITLE_RE` so the two cannot disagree.
 *
 * ⚠⚠ `mergeable` is computed asynchronously and starts as `UNKNOWN`, so a single read on a push is
 * usually `UNKNOWN`. Passing on it makes the gate decorative and failing on it makes CI flaky — this
 * polls and reports `UNKNOWN` as its own outcome ("re-run the job"), never as either verdict.
 *
 * CLI
 *   node scripts/pr-ready.mjs --pr 42
 *   node scripts/pr-ready.mjs --title 'T-001: something'   title check alone, no network
 */
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { titleRoutes } from './seats.mjs';

const SELF_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** `gh pr view` as JSON, or `null` when gh cannot answer. */
function prView(root, pr, fields) {
  try {
    return JSON.parse(
      execFileSync('gh', ['pr', 'view', String(pr), '--json', fields.join(',')], {
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

  const failures = [];

  // ── 1. the title ────────────────────────────────────────────────────────────────────────────
  if (title === undefined && pr) {
    const data = prView(root, pr, ['title']);
    if (data === null) {
      console.error(`✖ gh could not read PR ${pr}. Is \`gh\` authenticated?`);
      process.exit(1);
    }
    title = data.title;
  }
  if (title === undefined) {
    console.error('usage: pr-ready.mjs --pr <n> | --title <title>');
    process.exit(2);
  }
  if (titleRoutes(title)) {
    console.log(`✓ title routes: ${title}`);
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
    const { mergeable, mergeStateStatus } = mergeableState(root, pr);
    if (mergeable === null) {
      failures.push(`gh could not read PR ${pr}'s mergeable state.`);
    } else if (mergeable === 'MERGEABLE') {
      console.log(`✓ mergeable: MERGEABLE${mergeStateStatus ? ` (${mergeStateStatus})` : ''}`);
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
          `    branch and re-push — and if the conflict is in current_state.md §0b/§8, take EITHER\n` +
          `    side and let \`pnpm state\` re-measure. Never hand-resolve those markers.`,
      );
    }
  }

  if (failures.length) {
    console.error('');
    for (const f of failures) console.error(`  ✖ ${f}`);
    process.exit(1);
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/pr-ready.mjs')) {
  main();
}
