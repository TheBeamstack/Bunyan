#!/usr/bin/env node
/**
 * scripts/agent-start.mjs — the start of a turn. Run this before anything else (Entry 91, D82).
 *
 *   0. establish WHO is running (seat → role + machine + GitHub account), and REFUSE unless
 *      `gh api user --jq .login` matches that account (D87, T-013) — see `identityGate` below
 *   1. pull
 *   2. print current_state.md's orientation + live-claim sections
 *   3. measure the repo (`node scripts/state.mjs --check-only`) and REFUSE if measured disagrees
 *      with §8 as committed
 *   4. show live claims (`git ls-remote 'refs/heads/task/*'`, each branch's own §0b), the
 *      NEXT TURN: REVIEW ONLY banner if one is raised, and open PRs
 *   5. run the turn shape for this seat's ROLE:
 *        builder  — claim the next ready task THIS MACHINE CAN SATISFY, and push the claim
 *        reviewer — claim a PR routed to this machine; claim no task
 *        steward  — claim nothing; print what is and is not ready
 *
 * The refusal in step 3 is the load-bearing part, ported from mdo ADR-0003 D5: it converts "trust the
 * previous session's prose" into "trust the repository."
 *
 * The refusal in step 5 is the safety-critical one, ported from mdo ADR-0007: a seat may not claim a
 * task whose `machine:` it cannot satisfy, because it would then tick a `done-when:` item its machine
 * could not execute. The box is headless.
 *
 * The refusal in step 0 (`identityGate`, T-013) is the OTHER safety-critical one: with no branch
 * protection available on this private repo (Q13, D87), it is the only thing standing between a
 * mis-set/forgotten per-seat `GH_TOKEN` and a self-approving merge under the box's default identity —
 * `gh pr merge` is not blocked by GitHub's own "Can not approve your own pull request" refusal.
 *
 * USAGE
 *   BUNYAN_SEAT=zayd node scripts/agent-start.mjs        claim the next ready task for this seat
 *   node scripts/agent-start.mjs --seat zayd T-007        claim a specific task
 *   node scripts/agent-start.mjs --seat hmdnah --review   review a PR (implied for a reviewer seat)
 *   node scripts/agent-start.mjs --seat brahim            steward: readiness view, claims nothing
 *   node scripts/agent-start.mjs --seat zayd --no-claim   run the checks only
 *   node scripts/agent-start.mjs --seat zayd --continue T-008   resume a branch a reviewer sent back
 *   node scripts/agent-start.mjs --root DIR               run against DIR instead of this checkout
 *   node scripts/agent-start.mjs --no-pull                do not fetch or pull first
 *
 * `--root`/`--no-pull` exist for the tests, the same reasoning as mdo's `agent-start.sh`: every
 * refusal here is a gate the whole protocol rests on, and until these two flags existed not one of
 * them could be exercised without pushing a real claim to the live repository.
 *
 * `--continue <T-nnn>` (D88, T-015) is how a defect either review step proves gets back to its
 * builder: it checks out the branch of the task's own OPEN PR, leaves the row at `review`, and writes
 * NO new §0b claim — the existing one already names this branch. It is not a second door onto work
 * another seat is holding: the admitted seat is DERIVED from the task's `machine:` field
 * (`seats.builderFor`), never read from the baton, which a `--review` finish rewrites to name the
 * REVIEWER, not the builder.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as seats from './seats.mjs';

const SELF_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function hr() {
  console.log('─'.repeat(74));
}
function die(msg) {
  console.log('');
  console.error(`✖ ${msg}`);
  process.exit(1);
}

function git(args, cwd, opts = {}) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', ...opts }).trim();
}
function tryGit(args, cwd) {
  try {
    return git(args, cwd);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------------------- BATON I/O --

const BATON_BEGIN = '<!-- BEGIN BATON — written by agent-start.mjs; pushed before work begins -->';
const BATON_END = '<!-- END BATON -->';

/** Parse a BATON block's `| field | value |` rows into an object, or `null` if it is the placeholder. */
export function parseBaton(csSrc) {
  const a = csSrc.indexOf(BATON_BEGIN);
  const b = csSrc.indexOf(BATON_END);
  if (a < 0 || b < 0) return null;
  const body = csSrc.slice(a + BATON_BEGIN.length, b);
  if (!body.includes('| seat |')) return null; // the placeholder "(no live claim...)" — nothing to parse
  const out = {};
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([a-z-]+)\s*\|\s*(.+?)\s*\|\s*$/);
    if (m && m[1] !== 'Field') out[m[1]] = m[2].replace(/`/g, '').trim();
  }
  return Object.keys(out).length ? out : null;
}

export function renderBaton({ seat, role, machine, task, branch, claimedAt, status }) {
  const rows = [
    ['seat', `\`${seat}\``],
    ['role', role],
    ['machine', machine],
    ['task', `\`${task}\``],
    ['branch', `\`${branch}\``],
    ['claimed-at', claimedAt],
    ['status', status],
  ];
  return (
    `${BATON_BEGIN}\n\n| Field | Value |\n|---|---|\n` +
    rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n') +
    `\n\n${BATON_END}`
  );
}

export function writeBaton(csPath, block) {
  const src = readFileSync(csPath, 'utf8');
  const a = src.indexOf(BATON_BEGIN);
  const b = src.indexOf(BATON_END);
  if (a < 0 || b < 0) throw new Error('current_state.md has no §0b BATON markers.');
  writeFileSync(csPath, src.slice(0, a) + block + src.slice(b + BATON_END.length));
}

/** A comment is not content — stripped before any section is judged (the mdo lesson, applied here
 * from day one instead of being rediscovered): a heading MENTIONED in prose or inside an HTML
 * comment must never be able to trip a gate meant to fire only when a SCRIPT raised it. */
function stripComments(src) {
  return src.replace(/<!--[\s\S]*?-->/g, '');
}

// ------------------------------------------------------------------------- identity guard (D87, T-013) --
// ⚠⚠ WHY THIS EXISTS: `gh` on box holds only ONE account at a time (`hosts.yml` is global — D87), and
// GitHub's own self-approval refusal ("Can not approve your own pull request") does NOT extend to
// `gh pr merge` — measured 2026-08-15 against `hmdnah`/T-008: the review was refused, but the merge
// was not. With no branch protection available on a private repo (Q13, D87), a mis-set or simply
// forgotten per-seat `GH_TOKEN` silently falls back to the box's default identity and can merge under
// it — a self-approval in effect, with nothing on GitHub's side to catch it. This is the ONLY guard.

/**
 * Whether `gh`'s own authenticated login matches this seat's account. Pure — given the two strings
 * already resolved — so the refusal text is testable without spawning `gh`; `resolveGhLogin` below is
 * the only thing that actually calls it, kept separate for the same reason `findTaskPR`/
 * `resolveReviewStep` are pulled out of `main()`.
 *
 * `actualLogin` is `null` when identity could not be resolved AT ALL — `gh` missing, unauthenticated,
 * or offline. ⚠ That is a REFUSAL, never a silent skip (`current_state.md §1d`: a gate's hard part is
 * the skip; Entry 88 shipped three defects of exactly this shape). Comparison is case-insensitive —
 * GitHub logins are case-preserving but not case-sensitive for identity (`Davidian-Abdo` ==
 * `davidian-abdo`).
 */
export function identityGate(seat, expectedAccount, actualLogin) {
  if (!actualLogin) {
    return {
      ok: false,
      reason:
        `could not resolve 'gh api user --jq .login' — gh is not installed, not authenticated, or ` +
        `unreachable. An unresolvable identity is a REFUSAL, never a skip: seat '${seat}' must be ` +
        `authenticated as '${expectedAccount}' before this turn can start (docs/RUNBOOK.md "Seat ` +
        `credentials").`,
    };
  }
  if (actualLogin.toLowerCase() !== expectedAccount.toLowerCase()) {
    return {
      ok: false,
      reason:
        `gh is authenticated as '${actualLogin}', but seat '${seat}' is '${expectedAccount}'.\n\n` +
        `  Check which per-seat token file should be exported as GH_TOKEN for this turn ` +
        `(docs/RUNBOOK.md "Seat credentials") — expected '${expectedAccount}', found '${actualLogin}'.\n` +
        `  Never 'gh auth switch': the active account is global in hosts.yml and this box runs more ` +
        `than one seat.`,
    };
  }
  return { ok: true };
}

/** `gh api user --jq .login`, or `null` on any failure — never throws, so the caller always has an
 * explicit "unresolved" value to hand to `identityGate` rather than an exception to catch twice. */
function resolveGhLogin(root) {
  try {
    const out = execFileSync('gh', ['api', 'user', '--jq', '.login'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------------------------- live claims --

/** `{ branch, seat, task, status }` for every `task/*` branch on origin, read from ITS OWN §0b. */
function liveClaims(root) {
  const raw = tryGit(['ls-remote', '--heads', 'origin', 'refs/heads/task/*'], root) ?? '';
  const branches = raw
    .split('\n')
    .filter(Boolean)
    .map((l) => l.replace(/.*refs\/heads\//, ''));
  const out = [];
  for (const branch of branches) {
    const cs = tryGit(['show', `origin/${branch}:current_state.md`], root);
    const baton = cs ? parseBaton(cs) : null;
    out.push({
      branch,
      seat: baton?.seat ?? null,
      task: baton?.task ?? null,
      status: baton?.status ?? null, // 'working' | 'incomplete' | 'finished — …' | null (unreadable)
    });
  }
  return out;
}

/** open | finished | unknown — mirrors mdo's claim_state_of, and for the SAME reason: a finished
 * claim is a PR waiting for a reviewer, never an incomplete turn to resume. */
function claimState(status) {
  if (!status) return 'unknown';
  if (/^working|^incomplete/.test(status)) return 'open';
  if (/^finished/.test(status)) return 'finished';
  return 'unknown';
}

// -------------------------------------------------------------------------------------------- args --

function parseArgs(argv) {
  const a = {
    seat: process.env.BUNYAN_SEAT ?? '',
    root: SELF_ROOT,
    noPull: false,
    noClaim: false,
    review: false,
    wantTask: '',
    continueTask: '',
  };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--seat') a.seat = argv[++i];
    else if (t.startsWith('--seat=')) a.seat = t.slice(7);
    else if (t === '--root') a.root = argv[++i];
    else if (t.startsWith('--root=')) a.root = t.slice(7);
    else if (t === '--no-pull') a.noPull = true;
    else if (t === '--no-claim') a.noClaim = true;
    else if (t === '--review') a.review = true;
    else if (t === '--continue' || t.startsWith('--continue=')) {
      const v = t === '--continue' ? argv[++i] : t.slice('--continue='.length);
      if (!/^T-\d{3}$/.test(v ?? '')) die(`--continue expects a T-nnn id, got '${v}'.`);
      a.continueTask = v;
    } else if (/^T-\d{3}$/.test(t)) a.wantTask = t;
    else die(`agent-start.mjs: unknown argument '${t}'`);
  }
  return a;
}

// -------------------------------------------------------------------------------------- --continue --

/** The open PR (`gh pr list --json number,headRefName,title`) whose title names `taskId`, or `null`.
 * Exported so the rule — `--continue` requires an OPEN PR, never a bare branch — is unit-testable
 * without spawning `gh`. */
export function findTaskPR(openPRs, taskId) {
  return openPRs.find((p) => (p.title.match(/^T-\d{3}/) ?? [])[0] === taskId) ?? null;
}

/**
 * The two-step review routing decision (D88, T-014) — pure, given already-resolved inputs. `mineRisk`
 * is `docs/BACKLOG.md`'s `risk:` for `mineId` (`undefined` when unreadable, never defaulted to
 * `'normal'`); `labels` is the claimed PR's label names, or `null` when `gh pr view --json labels`
 * could not be read. Returns `null` for a single-turn review (`risk` is not `'high'`), `1`/`2` for a
 * two-step one, and throws rather than guesses on either input being unreadable. Kept separate from the
 * `gh` call that produces `labels` so this exact refusal logic is unit-testable without spawning `gh` —
 * the same reason `findTaskPR` above is pulled out.
 */
export function resolveReviewStep(mineId, mineRisk, labels, prNumber) {
  if (mineId && !mineRisk) {
    throw new Error(
      `${mineId} has no readable 'risk:' field in docs/BACKLOG.md — refusing rather than defaulting ` +
        `to normal.`,
    );
  }
  if (mineRisk !== 'high') return null;
  if (!labels) {
    throw new Error(
      `${mineId} is risk: high, but PR #${prNumber}'s labels could not be read — refusing to guess ` +
        `which review step this is. Confirm 'gh' is authenticated and retry.`,
    );
  }
  return seats.reviewStepFor(mineRisk, labels);
}

// =================================================================================================
// MAIN — guarded so this module can also be imported (its exports above) without running the CLI.
// =================================================================================================
export function main(argv = process.argv.slice(2)) {
  const {
    seat,
    root,
    noPull,
    noClaim,
    review,
    wantTask: wantTaskArg,
    continueTask,
  } = parseArgs(argv);
  let wantTask = wantTaskArg;
  const csPath = join(root, 'current_state.md');

  // ------------------------------------------------------------------------------------- 0. seat --
  hr();
  console.log('0. Seat');
  if (!seat) {
    die(
      `No seat. Say who you are before you do anything:\n\n` +
        `    BUNYAN_SEAT=<seat> node scripts/agent-start.mjs   or   --seat <seat>\n\n` +
        `  Known seats: ${seats
          .readRegistry(root)
          .map((r) => r.seat)
          .join(' ')}\n` +
        `  Identity is role + machine and nothing else (docs/seats/README.md).`,
    );
  }
  let role, machine, prompt, account;
  try {
    role = seats.roleOf(root, seat);
    machine = seats.machineOf(root, seat);
    prompt = seats.promptOf(root, seat);
    account = seats.accountOf(root, seat);
  } catch (e) {
    die(e.message);
  }
  const browser = seats.browserCmd() ?? 'absent';
  console.log(`   seat:    ${seat}`);
  console.log(`   role:    ${role}`);
  console.log(`   machine: ${machine}`);
  console.log(`   account: ${account}`);
  console.log(`   browser: ${browser}`);
  console.log(`   prompt:  ${prompt}`);
  if (machine === 'pc' && browser === 'absent') {
    console.log('');
    console.log('   ⚠ This seat declares machine: pc but no browser was found here. Every');
    console.log(
      '     `pc` task will be refused. Either this is not the pc, or its browser is missing.',
    );
  }
  if (existsSync(join(root, prompt))) {
    console.log(`   (read ${prompt} — four facts, and it carries no state)`);
  }

  // ---- the identity guard (D87, T-013) — refuses BEFORE anything else happens ------------------
  const ghLogin = resolveGhLogin(root);
  const idGate = identityGate(seat, account, ghLogin);
  if (!idGate.ok) die(idGate.reason);
  console.log(`   ✓ gh identity: ${ghLogin} — matches seat '${seat}' (${account})`);

  // ------------------------------------------------------------------------------------- 1. pull --
  hr();
  console.log('1. Pulling');
  if (noPull) {
    console.log('   (--no-pull: skipped)');
  } else {
    try {
      git(['fetch', '--prune', 'origin'], root);
    } catch {
      console.log('   (fetch failed — working offline?)');
    }
    try {
      git(['checkout', 'main'], root);
      git(['pull', '--ff-only'], root);
    } catch {
      die('pull failed — resolve by hand before starting a turn.');
    }
  }

  // ------------------------------------------------------------------------------ 2. claimed state --
  hr();
  console.log('2. Claimed state — current_state.md');
  if (!existsSync(csPath))
    die('current_state.md is missing. This repo has no claimed state to trust.');
  const csHead = readFileSync(csPath, 'utf8').split(/\r?\n/).slice(0, 130).join('\n');
  console.log(csHead);

  // ----------------------------------------------------------------------------------- 3. measure --
  hr();
  console.log('3. Measured state');
  // Prefer the ROOT's own copy of state.mjs; fall back to this script's own repo. A throwaway test
  // fixture carries docs/ and current_state.md but no scripts/ of its own, and reading one
  // repository's state through another's state.mjs would measure neither correctly.
  const stateScript = existsSync(join(root, 'scripts/state.mjs'))
    ? join(root, 'scripts/state.mjs')
    : join(SELF_ROOT, 'scripts/state.mjs');
  try {
    execFileSync('node', [stateScript, '--check-only', '--root', root], { stdio: 'inherit' });
  } catch {
    die('state.mjs --check-only failed. Do not proceed; fix what it reported above.');
  }

  // --------------------------------------------------------------- 4. live claims, PRs, the banner --
  hr();
  console.log('4. Live claims, review banner, and open PRs');
  const claims = liveClaims(root);
  if (claims.length) {
    for (const c of claims)
      console.log(`   • ${c.branch} — claimed by ${c.seat ?? 'unknown seat'}`);
  } else {
    console.log('   No live claims.');
  }

  const csFull = readFileSync(csPath, 'utf8');
  const csStripped = stripComments(csFull);
  const BANNER = /^## NEXT TURN: REVIEW ONLY/m;
  let reviewOnly = false;
  let wantReviewer = null;
  if (BANNER.test(csStripped)) {
    reviewOnly = true;
    const section = csStripped
      .split(/\r?\n/)
      .join('\n')
      .match(/^## NEXT TURN: REVIEW ONLY\n([\s\S]*?)(?=\n## |\n<!-- BEGIN|$)/m);
    const body = section ? section[1] : '';
    console.log('');
    console.log('   ⚠  NEXT TURN: REVIEW ONLY');
    console.log(
      body
        .trim()
        .split('\n')
        .map((l) => `   ${l}`)
        .join('\n'),
    );
    const m = body.match(/reviewer seat: *`?([a-z][a-z0-9_-]*)`?/);
    wantReviewer = m ? m[1] : null;
    if (wantReviewer && wantReviewer !== seat) {
      die(
        `This review is routed to seat '${wantReviewer}', not to '${seat}'.\n\n` +
          `  A reviewer must be able to RE-EXECUTE the claim. Routing is resolved from the task's\n` +
          `  machine:, and ${wantReviewer} is the reviewer on that machine.`,
      );
    }
  }

  const blockedBody = csStripped
    .match(/^## BLOCKED\n([\s\S]*?)(?=\n## |\n<!-- BEGIN|$)/m)?.[1]
    ?.replace(/^\s*\n|\n\s*$/g, '')
    .trim();
  if (blockedBody && blockedBody !== '*(none)*') {
    console.log('');
    console.log(
      blockedBody
        .split('\n')
        .map((l) => `   ${l}`)
        .join('\n'),
    );
    console.log('');
    console.log('   A previous turn stopped BLOCKED. Read the above before claiming anything.');
  }

  let openPRs = [];
  try {
    const json = execFileSync(
      'gh',
      ['pr', 'list', '--state', 'open', '--json', 'number,headRefName,title', '--limit', '10'],
      { cwd: root, encoding: 'utf8' },
    );
    openPRs = JSON.parse(json);
  } catch {
    console.log('');
    console.log('   (gh not available or not authenticated — check open PRs manually)');
  }
  if (openPRs.length) {
    console.log('');
    console.log('   Open PRs:');
    for (const pr of openPRs) console.log(`     #${pr.number}  ${pr.title}  (${pr.headRefName})`);
  } else {
    console.log('');
    console.log('   No open PRs.');
  }

  if (noClaim) {
    hr();
    console.log('--no-claim: stopping here.');
    return;
  }

  // ------------------------------------------------------------------------------- 5. turn shape --
  hr();
  console.log(`5. Turn shape — ${role}`);

  // ---- --continue: a defect either review step proves goes back to its builder (D88, T-015) ------
  if (continueTask) {
    console.log('');
    console.log(
      `   --continue ${continueTask}: returning the branch to its builder, not a new claim.`,
    );
    if (role !== 'builder') {
      die(
        `--continue is a builder operation; seat '${seat}' is role '${role}', which does not build.`,
      );
    }
    // The admitted seat is DERIVED from the task's own machine:, never read off the §0b baton — a
    // `--review` finish rewrites that baton to name the REVIEWER, so a gate on it would refuse the
    // builder in every real call (measured 2026-08-15 against T-008's own baton).
    let admitted;
    try {
      admitted = seats.builderFor(root, continueTask, seat);
    } catch (e) {
      die(e.message);
    }
    if (admitted.seat !== seat) {
      die(
        `${continueTask}'s builder is '${admitted.seat}', not '${seat}'.\n\n` +
          `  --continue is not a second door onto work another seat is holding.`,
      );
    }

    const pr = findTaskPR(openPRs, continueTask);
    if (!pr) {
      die(
        `No open PR names ${continueTask}. --continue resumes a branch a reviewer already sent back —\n` +
          `  there is nothing to resume without one. A 'ready' row with no PR is claimed the ordinary way.`,
      );
    }
    console.log(`   found PR #${pr.number} on ${pr.headRefName}`);

    // Read the row status from the PR's OWN branch, never main: the ready→review flip lives on the
    // unmerged branch, so main's own copy of docs/BACKLOG.md still reads 'ready' until the PR merges.
    const branchBacklog = tryGit(['show', `origin/${pr.headRefName}:docs/BACKLOG.md`], root);
    const branchStatus = branchBacklog ? seats.rowStatus(branchBacklog, continueTask) : undefined;
    if (branchStatus !== 'review') {
      die(
        `${continueTask}'s row on ${pr.headRefName} reads '${branchStatus ?? 'unreadable'}', not 'review'.\n\n` +
          `  --continue only resumes a branch a reviewer already sent back.`,
      );
    }

    try {
      git(['fetch', 'origin', pr.headRefName], root);
    } catch {
      die(`could not fetch ${pr.headRefName} from origin.`);
    }
    try {
      git(['checkout', pr.headRefName], root);
    } catch {
      try {
        git(['checkout', '-b', pr.headRefName, `origin/${pr.headRefName}`], root);
      } catch {
        die(`could not check out ${pr.headRefName}.`);
      }
    }

    hr();
    console.log(
      `Continuing: ${continueTask}   Seat: ${seat} (${role} on ${machine})   Branch: ${pr.headRefName}`,
    );
    console.log('');
    console.log(
      "The row stays 'review' throughout — this is a defect returning to its builder, not a",
    );
    console.log(
      'fresh claim, so no new §0b claim is written; the existing one already names this branch.',
    );
    console.log('');
    console.log(`Finish with: node scripts/agent-finish.mjs --seat ${seat} ${continueTask}`);
    return;
  }

  // ---- reviewer ------------------------------------------------------------------------------
  if (role === 'reviewer' || review) {
    if (role !== 'reviewer') {
      // The steward answer comes FIRST — mdo found this arm unreachable when checked in the other
      // order (T-028): a steward is told "not you, this project has a reviewer" on any project that
      // HAS one, which reads as "then go review" — advice to do the one thing the role forbids, on
      // every project shape.
      if (role === 'steward')
        die('A steward does not review build work — it never builds or merges.');
      const hasReviewerHere = seats
        .readRegistry(root)
        .some((r) => r.role === 'reviewer' && r.machine === machine);
      if (hasReviewerHere) {
        const names = seats
          .readRegistry(root)
          .filter((r) => r.role === 'reviewer')
          .map((r) => `${r.seat} (${r.machine})`)
          .join(' ');
        die(
          `--review was given but seat '${seat}' is a ${role}, and this project HAS a reviewer on ` +
            `machine '${machine}'. Reviewers here: ${names}`,
        );
      }
      console.log('');
      console.log(
        "   ⚠ SOLO MODE: no reviewer seat on machine '" +
          machine +
          "', so this builder seat takes the review turn.",
      );
      console.log('     That is fresh CONTEXT, not fresh EYES. Say so in your log entry.');
    }

    console.log('');
    console.log('   You claim NO TASK. You claim a PR.');
    if (!openPRs.length) {
      console.log('   No open PR to review. Nothing for this seat to do — say so and stop.');
      return;
    }
    console.log('   Routing:');
    let mine = null;
    for (const pr of openPRs) {
      const tMatch = pr.title.match(/^T-\d{3}/);
      const id = tMatch ? tMatch[0] : null;
      let r = '?';
      let note = '';
      try {
        if (id) {
          r = seats.reviewerFor(root, id, undefined).seat;
        } else {
          // No T-nnn in the title (T-012) — the routine `STEWARD:` case, not an edge case. Fall back
          // to the branch's own seat prefix, which DERIVES the machine the work actually ran on and
          // never widens it (`zayd/… ⇒ box`, `amer/… ⇒ pc`, `brahim/… ⇒ box`).
          const fb = seats.reviewerForBranch(root, pr.headRefName, undefined);
          if (fb.seat) {
            r = fb.seat;
          } else {
            r = 'NOBODY';
            note = ` — ${fb.reason}`;
          }
        }
      } catch {
        /* leave '?' */
      }
      const mark = r === seat ? ' → YOURS' : '';
      console.log(
        `     PR #${pr.number}  ${id ?? '(no T-nnn in title)'}  reviewer: ${r}${mark}${note}`,
      );
      if (r === seat && !mine) mine = pr;
    }
    if (!mine) {
      console.log('');
      console.log('   No open PR routes to this seat. Stop, and say which seat they route to.');
      return;
    }
    console.log('');
    console.log(`   Claiming PR #${mine.number} for review.`);
    try {
      execFileSync(
        'gh',
        [
          'pr',
          'comment',
          String(mine.number),
          '--body',
          `Review claimed by seat \`${seat}\` (${machine}) at ${new Date().toISOString()}.`,
        ],
        { cwd: root },
      );
    } catch {
      console.log('   ⚠ could not comment the claim on the PR — say so in your log entry.');
    }
    try {
      execFileSync('gh', ['pr', 'checkout', String(mine.number)], { cwd: root, stdio: 'inherit' });
    } catch {
      die(`could not check out PR #${mine.number}.`);
    }
    hr();
    console.log(`Reviewing: PR #${mine.number}   seat: ${seat} (${machine})`);
    console.log('');

    // ── D88's two-step review (T-014) ──────────────────────────────────────────────────────────
    // Which step this is lives on the PR's OWN `review/step-1` label, never the NEXT TURN: REVIEW
    // ONLY banner — that is written into the task branch and read here after `git checkout main`,
    // where it has never existed (REVIEW.md §"Two steps"). Risk itself comes from `docs/BACKLOG.md`,
    // already merged to `main`, so it needs no branch content either.
    const mineId = (mine.title.match(/^T-\d{3}/) ?? [])[0];
    let mineRisk;
    if (mineId) {
      mineRisk = seats.taskField(
        readFileSync(join(root, 'docs/BACKLOG.md'), 'utf8'),
        mineId,
        'risk',
      );
    }
    let labels = null;
    if (mineRisk === 'high') {
      try {
        labels = JSON.parse(
          execFileSync('gh', ['pr', 'view', String(mine.number), '--json', 'labels'], {
            cwd: root,
            encoding: 'utf8',
          }),
        ).labels.map((l) => l.name);
      } catch {
        labels = null;
      }
    }
    let reviewStep;
    try {
      reviewStep = resolveReviewStep(mineId, mineRisk, labels, mine.number);
    } catch (e) {
      die(e.message);
    }
    if (reviewStep) {
      console.log(
        `   ⚠ risk: high — TWO-STEP REVIEW (D88). You are running STEP ${reviewStep} of 2.`,
      );
      console.log('');
      if (reviewStep === 1) {
        console.log('   Step 1 is MECHANICAL — REVIEW.md items 1, 4, 5, 7 only. Post a report.');
        console.log("   No approval, no merge — the row stays 'review'.");
      } else {
        console.log("   Step 2 is ADVERSARIAL — read step 1's report, then run items 2, 3, 6.");
        console.log(
          '   Re-confirm item 7 immediately before merging. Approve and merge on green CI.',
        );
      }
      console.log('');
      console.log(
        `Finish with: node scripts/agent-finish.mjs --seat ${seat} ${mineId} --review --step ${reviewStep}`,
      );
      return;
    }

    console.log('In this order, and the first one is not optional (REVIEW.md):');
    console.log(
      '  1. RE-EXECUTE THE CLAIM. Revert, run the test, paste RED. Restore, paste green.',
    );
    console.log("  2. Read the spec sections the task's implements: names, not only the diff.");
    console.log(
      '  3. Check every done-when: item was EXECUTED, on a machine that could execute it.',
    );
    console.log(
      '  4. RISK: additive → you merge it, on your own account. contract-touching → approve',
    );
    console.log('     and tell the owner it needs their merge.');
    console.log('');
    console.log(
      `Finish with: node scripts/agent-finish.mjs --seat ${seat} ${mineId ?? '<STEWARD-slug>'} --review`,
    );
    return;
  }

  // ---- steward -------------------------------------------------------------------------------
  if (role === 'steward') {
    console.log('');
    console.log('   You never build. You decide what is ready and which machine it needs;');
    console.log("   seats decide what they take. You never claim on another seat's behalf.");
    console.log('');
    const backlogPath = join(root, 'docs/BACKLOG.md');
    if (!existsSync(backlogPath)) {
      console.log('   docs/BACKLOG.md does not exist yet.');
    } else {
      const backlog = readFileSync(backlogPath, 'utf8');
      const ready = [...backlog.matchAll(/^\| (T-\d{3}) \| ready \|/gm)].map((m) => m[1]);
      console.log('   Ready rows, and which BUILDER seats can satisfy each:');
      for (const id of ready) {
        const m = seats.taskField(backlog, id, 'machine') ?? 'MISSING';
        const who = seats
          .readRegistry(root)
          .filter((r) => r.role === 'builder')
          .filter((r) => seats.canClaim(root, r.seat, id).ok)
          .map((r) => r.seat);
        console.log(`     ${id}  machine: ${m}  → ${who.length ? who.join(' ') : 'NOBODY'}`);
      }
      const allIds = [...backlog.matchAll(/^### (T-\d{3})/gm)].map((m) => m[1]);
      console.log('');
      console.log('   Rows missing a machine:/area:/risk: field:');
      let bad = false;
      for (const id of allIds) {
        for (const f of ['machine', 'area', 'risk']) {
          if (!seats.taskField(backlog, id, f)) {
            console.log(`     ${id} — no ${f}:`);
            bad = true;
          }
        }
      }
      if (!bad) console.log('     (none)');
    }
    hr();
    console.log(`Steward turn: ${seat}`);
    console.log('');
    console.log(
      'Leave behind: statuses that are true, ready rows that satisfy every READY criterion,',
    );
    console.log(`and a §7 abstract whose body is in handoff/${seat}/.`);
    console.log('');
    console.log(`Finish with: node scripts/agent-finish.mjs --seat ${seat} <T-nnn|STEWARD-slug>`);
    return;
  }

  // ---- builder ---------------------------------------------------------------------------------
  if (reviewOnly)
    die('current_state.md says NEXT TURN: REVIEW ONLY. A builder seat claims nothing now.');

  const backlogPath = join(root, 'docs/BACKLOG.md');
  if (!existsSync(backlogPath)) die('docs/BACKLOG.md does not exist — nothing is claimable.');
  const backlog = readFileSync(backlogPath, 'utf8');

  console.log('');
  if (wantTask) {
    if (!new RegExp(`^### ${wantTask} `, 'm').test(backlog))
      die(`${wantTask} has no entry in docs/BACKLOG.md.`);
    // ⚠ Whitespace-tolerant: prettier pads every table cell to its column's widest value, so a
    // committed row reads `| T-001 | ready   |`. A strict single-space match reports every row
    // un-ready and nothing is ever claimable.
    if (seats.rowStatus(backlog, wantTask) !== 'ready') {
      die(`${wantTask} is not 'ready' in docs/BACKLOG.md. Readiness is the steward's act.`);
    }
    const v = seats.canClaim(root, seat, wantTask);
    if (!v.ok) die(`Refusing to claim ${wantTask} from seat '${seat}'.\n\n  ${v.reason}`);
  } else {
    for (const cand of seats.readyFor(root, seat)) {
      const held = claims.find((c) => c.task === cand);
      if (held) {
        if (held.seat && held.seat !== seat) {
          console.log(`   ${cand} is already claimed by '${held.seat}' — skipping.`);
          continue;
        }
        const st = claimState(held.status);
        if (st === 'finished') {
          console.log(
            `   ${cand} is finished on ${held.branch} — that is a PR awaiting review. Skipping.`,
          );
          continue;
        }
        if (st === 'unknown') {
          console.log(`   ${cand} has an unreadable claim on ${held.branch} — skipping.`);
          continue;
        }
      }
      wantTask = cand;
      break;
    }
  }
  if (!wantTask) {
    die(
      'No ready task this seat can satisfy.\n\n' +
        '  Ready rows exist only for another machine, or every one is already claimed. This is not\n' +
        '  a reason to widen a machine: field — it is a reason to say so and stop.',
    );
  }

  console.log('');
  console.log(seats.taskBlock(backlog, wantTask));
  console.log('');

  const titleMatch = backlog.match(new RegExp(`^### ${wantTask} — (.+)$`, 'm'));
  const title = titleMatch ? titleMatch[1] : wantTask;
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  let branch = `task/${wantTask}-${slug}`;

  const existing = claims.find((c) => c.branch.startsWith(`task/${wantTask}-`));
  if (existing) {
    if (existing.seat && existing.seat !== seat) {
      die(
        `${wantTask} is already claimed by seat '${existing.seat}' on branch ${existing.branch}.\n\n` +
          `  The claim is pushed before work begins precisely so this is visible across machines.`,
      );
    }
    const st = claimState(existing.status);
    if (st !== 'open') {
      die(
        `${wantTask} already has a claim on ${existing.branch} held by this seat, status: ${existing.status}\n\n` +
          `  That is not an incomplete turn to continue.`,
      );
    }
    console.log(`   Continuing your own open claim on ${existing.branch}.`);
    branch = existing.branch;
    try {
      git(['checkout', branch], root);
    } catch {
      git(['checkout', '-b', branch, `origin/${branch}`], root);
    }
  } else if (tryGit(['rev-parse', '--verify', branch], root)) {
    console.log(`   Local branch ${branch} already exists — continuing on it.`);
    git(['checkout', branch], root);
  } else {
    git(['checkout', '-b', branch], root);
  }

  // ---- write the claim, then PUSH IT BEFORE ANY WORK BEGINS ----------------------------------
  writeBaton(
    csPath,
    renderBaton({
      seat,
      role,
      machine,
      task: wantTask,
      branch,
      claimedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      status: 'working',
    }),
  );
  git(['add', csPath], root);
  try {
    git(['commit', '-q', '-m', `claim: ${wantTask} by ${seat} (${machine})`], root);
  } catch {
    console.log('   (claim already recorded)');
  }
  const hasOrigin = tryGit(['remote', 'get-url', 'origin'], root) !== null;
  if (hasOrigin) {
    try {
      git(['push', '-u', 'origin', branch], root);
      console.log(`   ✓ claim pushed — ${branch}`);
    } catch {
      die(
        'could not push the claim. Work does not begin on an unpushed claim: across two machines it\n' +
          '  is invisible, and a second session will start the same task.',
      );
    }
  } else {
    console.log(
      "   ⚠ no 'origin' remote: the claim is local only, and invisible to the other machine.",
    );
  }

  hr();
  console.log(`Claimed: ${wantTask}   Seat: ${seat} (${role} on ${machine})   Branch: ${branch}`);
  console.log('');
  console.log('Before you write anything:');
  console.log("  · read ONLY the spec sections this task's 'implements:' field names");
  console.log('  · if you cannot reach green CI in one turn, SPLIT IT BEFORE STARTING');
  console.log('  · if a done-when: item needs a machine you are not on, STOP and say so');
  console.log('');
  console.log(`Finish with: node scripts/agent-finish.mjs --seat ${seat} ${wantTask}`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/agent-start.mjs')) {
  main();
}
