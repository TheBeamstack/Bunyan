#!/usr/bin/env node
/**
 * scripts/agent-finish.mjs — the end of a turn (Entry 91, D82).
 *
 *   0. establish WHO is finishing (seat → role + machine)
 *   1. run `pnpm verify` in full — a turn does not end red
 *   2. regenerate current_state.md's §8 (`node scripts/state.mjs`)
 *   3. refuse without: a §7 abstract naming this seat and task, a linked handoff body under
 *      handoff/<seat>/, and (for a task, non --incomplete) a `done` row in docs/BACKLOG.md
 *   4. write NEXT TURN: REVIEW ONLY — naming the resolved reviewer seat — when the task is
 *      `risk: high` OR the frozen surface reports `contract-touching`; a `--review` run clears it
 *   5. push the branch and print the exact `gh pr create` command, SHELL-QUOTED (ported from mdo's
 *      T-047 fix, pre-emptively, rather than rediscovering the same bug independently)
 *
 * USAGE
 *   BUNYAN_SEAT=zayd node scripts/agent-finish.mjs T-007
 *   node scripts/agent-finish.mjs --seat zayd T-007 --incomplete   unfinished; branch stays open
 *   node scripts/agent-finish.mjs --seat hmdnah T-007 --review     a review turn, not a build
 *   node scripts/agent-finish.mjs --seat brahim STEWARD-scaffolding   a non-task steward turn
 *   node scripts/agent-finish.mjs --root DIR ...                   run against DIR (tests)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as seats from './seats.mjs';
import { parseAbstracts } from './docs-state.mjs';
import { renderBaton } from './agent-start.mjs';

const SELF_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function hr() {
  console.log('─'.repeat(74));
}
function die(msg) {
  console.log('');
  console.error(`✖ ${msg}`);
  process.exit(1);
}
function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}
function tryGit(args, cwd) {
  try {
    return git(args, cwd);
  } catch {
    return null;
  }
}

/**
 * Rewrites `| T-nnn | <old> | …` to `| T-nnn | <next> | …` in docs/BACKLOG.md.
 *
 * ⚠⚠ IT REPADS THE CELL, because `format:check` is CI step 3 and the status words are different
 * lengths. Writing the word alone and keeping the old cell's trailing spaces changes the column's
 * width, `prettier --check` rejects the file, and the PR opens red on a diff the author never wrote —
 * measured on PR #20, where `ready`→`review` left one trailing space and CI failed naming
 * `docs/BACKLOG.md` alone. The committed column width is preserved rather than recomputed: every
 * status value fits inside the widest of them (`blocked`), so the table never needs to change shape.
 */
export function setRowStatus(backlogPath, taskId, next) {
  const src = readFileSync(backlogPath, 'utf8');
  const re = new RegExp(`^(\\|\\s*${taskId}\\s*\\| )([a-z-]+)( *)(\\|)`, 'm');
  const m = src.match(re);
  if (!m) die(`${taskId} has no summary-table row in docs/BACKLOG.md to update.`);
  const width = m[2].length + m[3].length;
  const padded = next + ' '.repeat(Math.max(1, width - next.length));
  writeFileSync(backlogPath, src.replace(re, `$1${padded}$4`));
}

function parseArgs(argv) {
  const a = {
    seat: process.env.BUNYAN_SEAT ?? '',
    root: SELF_ROOT,
    task: '',
    incomplete: false,
    review: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--seat') a.seat = argv[++i];
    else if (t.startsWith('--seat=')) a.seat = t.slice(7);
    else if (t === '--root') a.root = argv[++i];
    else if (t === '--incomplete') a.incomplete = true;
    else if (t === '--review') a.review = true;
    else if (t.startsWith('-')) die(`agent-finish.mjs: unknown flag '${t}'`);
    else a.task = t;
  }
  return a;
}

/** Single-quoted, with `'` closed/escaped/reopened — the only quoting a pasting shell treats as
 * fully literal. Ported PRE-EMPTIVELY from mdo's T-047 (a double-quoted title with a backtick in it
 * ran as a command substitution on paste — found there four times before it was fixed once). */
function shq(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

export function main(argv = process.argv.slice(2)) {
  const { seat, root, task, incomplete, review } = parseArgs(argv);
  if (!task) die('usage: agent-finish.mjs [--seat S] <T-nnn|STEWARD-slug> [--incomplete|--review]');

  // ------------------------------------------------------------------------------------- 0. seat --
  hr();
  console.log('0. Seat');
  if (!seat)
    die(
      'No seat. A turn nobody can attribute is a turn nobody can question.\n  BUNYAN_SEAT=<seat> or --seat <seat>',
    );
  let role, machine;
  try {
    role = seats.roleOf(root, seat);
    machine = seats.machineOf(root, seat);
  } catch (e) {
    die(e.message);
  }
  console.log(
    `   ${seat} — ${role} on ${machine}, finishing ${task}${review ? ' (review turn)' : ''}`,
  );

  const isTask = /^T-\d{3}$/.test(task);
  if (role === 'steward' && isTask && !review) {
    console.log(
      '   ⚠ a steward finishing a build task — the steward never builds. That is the defect, if true.',
    );
  }

  // -------------------------------------------------------------------------- the machine gate ----
  // AT TICK TIME, not only at claim time — a --incomplete branch can be resumed by a DIFFERENT seat,
  // and a task's machine: can be edited between the claim and the tick. Either way the criterion gets
  // ticked by a machine that could not execute it unless this fires here too.
  if (isTask) {
    const backlogPath = join(root, 'docs/BACKLOG.md');
    const backlog = existsSync(backlogPath) ? readFileSync(backlogPath, 'utf8') : '';
    const tm = seats.taskField(backlog, task, 'machine');
    if (!tm) {
      die(`${task} has no 'machine:' field in docs/BACKLOG.md — refusing to finish it.`);
    } else if (tm !== 'any' && tm !== machine) {
      const owners = seats
        .readRegistry(root)
        .filter((r) => r.machine === tm)
        .map((r) => r.seat);
      die(
        `REFUSED — ${task} is machine: ${tm} and seat '${seat}' is on machine: ${machine}.\n\n` +
          `  Finishing it here would report exit criteria this machine could not execute.\n` +
          `  It belongs to: ${owners.join(', ')}`,
      );
    }
    console.log(`   ✓ machine gate: ${task} is machine: ${tm}, seat is on ${machine}`);
  }

  // ------------------------------------------------------------------------------- 1. verify -----
  hr();
  console.log('1. Verification — pnpm verify');
  try {
    execFileSync('pnpm', ['verify'], { cwd: root, stdio: 'inherit' });
  } catch {
    die('pnpm verify FAILED. A turn does not end red — fix what it reported above.');
  }
  console.log('   ✓ pnpm verify');

  // --------------------------------------------------------- 2. regenerate the measured section ---
  hr();
  console.log('2. Regenerating current_state.md §8');
  const branchNow = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
  if (branchNow !== 'main') {
    // Commit this turn's work before measuring — measuring the tree that will become main means
    // merging origin/main in FIRST when it has moved, so the thing measured and the thing the next
    // turn compares against are the same tree.
    git(['add', '-A'], root);
    const staged = tryGit(['diff', '--cached', '--quiet'], root);
    if (staged === null) {
      // non-zero exit ⇒ there IS a staged diff (git's own convention for --quiet)
      git(['commit', '-q', '-m', task, '-m', `seat: ${seat} (${role} on ${machine})`], root);
      console.log("   ✓ committed this turn's work before measuring");
    }
    try {
      execFileSync('git', ['fetch', '-q', 'origin', 'main'], { cwd: root });
      const originMain = tryGit(['rev-parse', '--verify', '-q', 'origin/main'], root);
      const isAncestor =
        originMain && tryGit(['merge-base', '--is-ancestor', 'origin/main', 'HEAD'], root) !== null;
      if (originMain && !isAncestor) {
        console.log('   main has moved — merging it in so the measurement is of the merge result');
        try {
          execFileSync('git', ['merge', '--no-edit', 'origin/main'], { cwd: root, stdio: 'pipe' });
          console.log('   ✓ merged origin/main');
        } catch {
          try {
            execFileSync('git', ['merge', '--abort'], { cwd: root, stdio: 'ignore' });
          } catch {
            /* nothing to abort */
          }
          die(
            'origin/main has moved and merging it in conflicts. Resolve by hand, then re-run.\n' +
              '  If the conflict is in §0b/§8, take EITHER side and let this script re-measure —\n' +
              '  never hand-resolve those markers.',
          );
        }
      } else {
        console.log('   ✓ up to date with origin/main');
      }
    } catch {
      console.log('   ⚠ could not fetch origin/main (offline?) — measuring this branch alone.');
    }
  }

  // Prefer the ROOT's own copy of state.mjs; fall back to this script's own repo — see
  // `agent-start.mjs`'s identical fallback for why (a test fixture carries no `scripts/` of its own).
  const stateScript = existsSync(join(root, 'scripts/state.mjs'))
    ? join(root, 'scripts/state.mjs')
    : join(SELF_ROOT, 'scripts/state.mjs');
  try {
    execFileSync('node', [stateScript, '--root', root], { cwd: root, stdio: 'inherit' });
  } catch {
    die('state.mjs failed.');
  }
  console.log('   ✓ measured section written');

  // ------------------------------------------------------------------------- 3. handoff checks ---
  hr();
  console.log('3. Handoff artifacts');
  const csPath = join(root, 'current_state.md');
  const cs = readFileSync(csPath, 'utf8');
  const abstracts = parseAbstracts(cs);
  const newestOfMine = abstracts.find((a) => a.id === task && a.seat === seat);
  if (!newestOfMine) {
    die(
      `current_state.md §7 has no heading naming BOTH ${task} and seat '${seat}'.\n\n` +
        `  Use:  ### ${task} — <title> — ${new Date().toISOString().slice(0, 10)} — seat: ${seat}`,
    );
  }
  console.log(`   ✓ §7 abstract names ${task} and seat ${seat}`);

  const handoffDir = join(root, 'handoff', seat);
  const bodyName = existsSync(handoffDir)
    ? readdirSync(handoffDir)
        .filter((f) => f.includes(task) && f.endsWith('.md'))
        .sort()
        .at(-1)
    : undefined;
  if (!bodyName) {
    die(
      `No handoff body at handoff/${seat}/<date>-${task}-<slug>.md.\n\n` +
        `  Create it and link it from the §7 abstract's FULL: field.`,
    );
  }
  const bodyRel = `handoff/${seat}/${bodyName}`;
  const full = newestOfMine.fields.FULL ?? '';
  if (!full.includes(bodyRel)) {
    die(
      `The §7 entry's FULL: field does not link ${bodyRel} — an archive nobody can find is not read.`,
    );
  }
  console.log(`   ✓ handoff body ${bodyRel}, linked from §7`);

  const backlogPath = join(root, 'docs/BACKLOG.md');

  if (isTask && !review) {
    if (!incomplete) {
      // ⚠⚠ MECHANICALLY SET, NOT HAND-EDITED. A builder finishing a task moves its row `ready` →
      // `review` itself — `review` means "built, PR open, not yet merged," never "done" (BACKLOG.md's
      // own §"Status values"). Only a reviewer's `--review` run (additive) or brahim's merged-PR sweep
      // (the contract-touching backstop) ever writes `done` — a dependency is satisfied by `done`
      // alone, so a builder cannot accidentally satisfy someone else's `depends-on:` by finishing.
      setRowStatus(backlogPath, task, 'review');
      console.log("   ✓ backlog status → review (a reviewer's merge is what makes it done)");
    } else {
      console.log(
        '   • turn marked INCOMPLETE — branch stays open for the next seat, status untouched',
      );
      if (!cs.includes(task))
        die('An incomplete turn MUST record what is and is not done in current_state.md.');
    }
  }

  // ------------------------------------------------------------------------ 4. risk & routing ----
  hr();
  console.log('4. Risk and review routing');
  const BANNER = /^## NEXT TURN: REVIEW ONLY/m;
  let reviewContractTouching = false;
  if (review) {
    if (BANNER.test(cs)) {
      const cleared = cs.replace(
        /^## NEXT TURN: REVIEW ONLY\n(?:(?!^## |^<!-- BEGIN)[\s\S])*?(?=\n## |\n<!-- BEGIN)/m,
        '',
      );
      writeFileSync(csPath, cleared);
      console.log('   ✓ cleared NEXT TURN: REVIEW ONLY');
    } else {
      console.log('   (no REVIEW ONLY banner to clear)');
    }
    // ⚠⚠ THE STATUS FLIP THAT MAKES A DEPENDENCY REAL. `additive` ⇒ this reviewer is about to run
    // `gh pr merge` itself (printed below), so `review` → `done` here is correct, not premature — the
    // approval IS the gate, the merge command is its immediate, certain continuation. A
    // `contract-touching` PR waits on the OWNER's own timing, so the row stays `review`; brahim's
    // readiness sweep confirms the merge later via `gh pr list --state merged` and flips it then — the
    // backstop for exactly the case this script cannot promise.
    const surfaceRow = cs.match(
      /\| \*\*frozen surface\*\* \| \*\*RISK: (additive|contract-touching)/,
    );
    reviewContractTouching = surfaceRow?.[1] === 'contract-touching';
    if (isTask) {
      if (!reviewContractTouching) {
        setRowStatus(backlogPath, task, 'done');
        console.log(`   ✓ backlog status → done (${task} merges immediately after this turn)`);
      } else {
        console.log(
          `   risk: contract-touching — ${task} stays 'review' until the owner merges it`,
        );
      }
    }
  } else {
    let risk = 'normal';
    let contractTouching = false;
    if (isTask) {
      const backlog = readFileSync(join(root, 'docs/BACKLOG.md'), 'utf8');
      risk = seats.taskField(backlog, task, 'risk') ?? 'normal';
    }
    const surfaceRow = cs.match(
      /\| \*\*frozen surface\*\* \| \*\*RISK: (additive|contract-touching)/,
    );
    contractTouching = surfaceRow?.[1] === 'contract-touching';
    if (risk === 'high' || contractTouching) {
      const reviewer = seats.reviewerFor(root, isTask ? task : machine, seat).seat;
      const csNow = readFileSync(csPath, 'utf8');
      const banner =
        `\n## NEXT TURN: REVIEW ONLY\n\n` +
        `\`${task}\` (built by \`${seat}\`) was flagged **${contractTouching ? 'contract-touching' : 'high-risk'}**. ` +
        `The next session reviews its PR and **claims no new task**.\n\n` +
        `**reviewer seat: \`${reviewer}\`** — resolved from the task's machine:, because the first item ` +
        `on a review checklist is *revert the fix and paste the red output*.\n`;
      const marker = '<!-- BEGIN GENERATED';
      const idx = csNow.indexOf(marker);
      const next =
        idx >= 0
          ? csNow.slice(0, idx).replace(/\n+$/, '\n') + banner + '\n' + csNow.slice(idx)
          : csNow + banner;
      writeFileSync(csPath, next);
      console.log(
        `   ⚠ ${task} is ${contractTouching ? 'contract-touching' : 'high-risk'} — wrote NEXT TURN: REVIEW ONLY, reviewer seat: ${reviewer}`,
      );
    } else {
      console.log(
        `   risk: ${risk} — no dedicated review turn; the next seat reviews this PR before claiming.`,
      );
    }
  }

  // Hand the baton over in the claim itself.
  const status = incomplete
    ? 'incomplete — branch open, continue on it'
    : 'finished — PR open, awaiting review';
  const csForBaton = readFileSync(csPath, 'utf8');
  const bBegin = '<!-- BEGIN BATON — written by agent-start.mjs; pushed before work begins -->';
  const bEnd = '<!-- END BATON -->';
  if (csForBaton.includes(bBegin)) {
    const before = csForBaton.slice(0, csForBaton.indexOf(bBegin));
    const after = csForBaton.slice(csForBaton.indexOf(bEnd) + bEnd.length);
    const claimedAtMatch = csForBaton.match(/\| claimed-at \| (.+?) \|/);
    const claim = {
      seat,
      role,
      machine,
      task,
      branch: branchNow,
      claimedAt: claimedAtMatch ? claimedAtMatch[1] : new Date().toISOString(),
      status,
    };
    writeFileSync(csPath, before + renderBaton(claim) + after);
  }

  // ------------------------------------------------------------------------------------ 5. push --
  hr();
  console.log('5. Push');
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
  if (branch === 'main') die('You are on main. Work happens on task/ branches.');

  // ⚠⚠ A REVIEWER PUSHES TO THE PR IT ALREADY CHECKED OUT — it never opens a new one. `agent-start.mjs`
  // ran `gh pr checkout <n>` for this seat; committing a small proven fix (REVIEW.md's own table) and
  // pushing updates that SAME PR. Only a BUILDER's finish needs a title and a `gh pr create` line.
  if (review) {
    git(['add', '-A'], root);
    const nothingStaged = tryGit(['diff', '--cached', '--quiet'], root) !== null;
    if (nothingStaged) {
      console.log('   (nothing to commit — no fix landed on the branch)');
    } else {
      git(
        [
          'commit',
          '-q',
          '-m',
          `${task}: review fix`,
          '-m',
          `seat: ${seat} (${role} on ${machine})`,
        ],
        root,
      );
    }
    try {
      execFileSync('git', ['push'], { cwd: root, stdio: 'inherit' });
    } catch {
      die('push failed.');
    }

    hr();
    let prNumber = null;
    try {
      prNumber = JSON.parse(
        execFileSync('gh', ['pr', 'view', '--json', 'number'], { cwd: root, encoding: 'utf8' }),
      ).number;
    } catch {
      /* leave null — the message below still tells the seat what to do */
    }
    if (reviewContractTouching) {
      console.log(`Review complete: ${task}   seat: ${seat} (${role} on ${machine})`);
      console.log('');
      console.log(
        'RISK: contract-touching — approve it, then tell the owner it needs their merge.',
      );
      console.log(
        prNumber ? `  gh pr review ${prNumber} --approve` : '  gh pr review <n> --approve',
      );
      console.log('You do not merge this one. Stop here.');
    } else {
      console.log(`Review complete: ${task}   seat: ${seat} (${role} on ${machine})`);
      console.log('');
      console.log('RISK: additive — approve it, on your own account, then merge it yourself:');
      console.log(
        prNumber
          ? `  gh pr review ${prNumber} --approve && gh pr merge ${prNumber} --squash`
          : '  gh pr review <n> --approve && gh pr merge <n> --squash',
      );
      console.log('Then pull again before doing anything else.');
    }
    return;
  }

  let title;
  if (isTask) {
    const backlog = readFileSync(join(root, 'docs/BACKLOG.md'), 'utf8');
    const m = backlog.match(new RegExp(`^### ${task} — (.+)$`, 'm'));
    if (!m) die(`no '### ${task} — <title>' entry in docs/BACKLOG.md to title the PR from.`);
    title = `${task}: ${m[1]}`;
  } else {
    title = task.startsWith('STEWARD')
      ? `STEWARD: ${task.replace(/^STEWARD[-:]?\s*/, '')}`
      : `STEWARD: ${task}`;
  }
  // ⚠ The same predicate CI re-asks on the opened PR (`scripts/pr-ready.mjs`) — one regex, in
  // `seats.mjs`, because a second copy is a second gate that can disagree.
  if (!seats.titleRoutes(title))
    die(`the PR title '${title}' does not route — reviewer routing has nothing to key on.`);

  git(['add', '-A'], root);
  const nothingStaged = tryGit(['diff', '--cached', '--quiet'], root) !== null;
  if (nothingStaged) {
    console.log('   (nothing to commit)');
  } else {
    git(['commit', '-q', '-m', title, '-m', `seat: ${seat} (${role} on ${machine})`], root);
  }
  try {
    execFileSync('git', ['push', '-u', 'origin', branch], { cwd: root, stdio: 'inherit' });
  } catch {
    die('push failed.');
  }

  // -------------------------------------------------------------------- 6. the PR invocation -----
  const gitDir = git(['rev-parse', '--git-dir'], root);
  const bodyFile = join(
    gitDir.startsWith('/') || /^[A-Za-z]:/.test(gitDir) ? gitDir : join(root, gitDir),
    'bunyan-pr-body.md',
  );
  let reviewerSeat = 'unresolved';
  try {
    reviewerSeat = seats.reviewerFor(root, isTask ? task : machine, seat).seat;
  } catch {
    /* leave 'unresolved' */
  }
  const body =
    `**Task:** \`${task}\` — see \`docs/BACKLOG.md\`.\n\n` +
    `**Seat:** \`${seat}\` (${role} on ${machine}). **Reviewer seat:** \`${reviewerSeat}\` — routed from ` +
    `the task's \`machine:\` (\`AGENTS.md §1.2\`).\n\n` +
    `**Handoff body:** \`handoff/${seat}/${bodyName}\`\n\n` +
    `**Before merging:** re-execute the claim first (\`REVIEW.md\` item 1) — a fix nobody re-runs proves ` +
    `nothing.\n`;
  writeFileSync(bodyFile, body);

  hr();
  console.log(`Turn complete: ${task} on ${branch}   seat: ${seat} (${role} on ${machine})`);
  console.log('');
  console.log('Open the PR with EXACTLY this, then STOP:');
  console.log('');
  console.log(`  gh pr create --title ${shq(title)} --body-file ${shq(bodyFile)}`);
  console.log('');
  console.log(
    '  Never --fill — it titles the PR from the branch slug, and reviewer routing keys on',
  );
  console.log(
    `  the ${isTask ? 'T-nnn' : 'STEWARD:'} prefix. A batched-review turn may cover several small`,
  );
  console.log(
    '  open PRs in one session (docs/prompts/brahim-orchestrator.md) — each still finishes',
  );
  console.log('  with its own `agent-finish.mjs --review` and its own merge.');
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/agent-finish.mjs')) {
  main();
}
