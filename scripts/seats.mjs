#!/usr/bin/env node
/**
 * scripts/seats.mjs — the seat registry, and the only thing that answers three questions:
 *
 *     who is this seat        → role + machine + GitHub account   (D82: identity = role + machine)
 *     may it claim that task  → machine satisfaction              (the safety-critical gate)
 *     who reviews it          → reviewer routing                  (a pc claim needs a pc reviewer)
 *
 * WHY THIS FILE EXISTS SEPARATELY
 *   `agent-start.mjs`, `agent-finish.mjs` and the seat-protocol tests all need those answers. If each
 *   worked them out for itself, the gate would be several gates that can disagree. This is one, and it
 *   is exported as plain functions (never a side-effecting import) so it can be required from a test
 *   without running anything — the same shape as `docs-state.mjs` and `frozen-surface.mjs`.
 *
 * THE REGISTRY is the table between the `<!-- BEGIN SEATS -->`/`<!-- END SEATS -->` markers in
 * `docs/seats/README.md`. Nothing here hardcodes a seat name; adding a sixth seat is a row plus a
 * prompt file.
 *
 * CLI usage (`node scripts/seats.mjs …`), for ad-hoc use exactly like `agent-start.mjs` runs it:
 *   seats.mjs list                        every seat: seat role machine account prompt
 *   seats.mjs role <seat>
 *   seats.mjs machine <seat>
 *   seats.mjs account <seat>
 *   seats.mjs prompt <seat>
 *   seats.mjs browser                     the browser command found, or nothing (exit 1)
 *   seats.mjs task-field <T-nnn> <field>  machine | area | risk, read from the backlog entry
 *   seats.mjs can-claim <seat> <T-nnn>    exit 0 may claim, 1 may not — prints the reason
 *   seats.mjs ready-for <seat>            ready task ids this seat can satisfy, backlog order
 *   seats.mjs builder-for <T-nnn> [finishing-seat]   the seat that OWNS a task, from machine: alone
 *   seats.mjs reviewer-for <T-nnn|box|pc|any> [finishing-seat]
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------------------------------------ registry --

/**
 * Rows between the SEATS markers, as `{ seat, role, machine, account, prompt }`. Header and separator
 * rows are dropped by requiring a lowercase seat name in column 1 — the same trick `seat.sh` (mdo) uses
 * with awk, done here with a plain split since there is no shell to lean on.
 */
export function readRegistry(root = SELF_ROOT) {
  const path = join(root, 'docs/seats/README.md');
  if (!existsSync(path)) {
    throw new Error('seats.mjs: registry not found: docs/seats/README.md');
  }
  const src = readFileSync(path, 'utf8');
  const begin = src.indexOf('<!-- BEGIN SEATS -->');
  const end = src.indexOf('<!-- END SEATS -->');
  if (begin < 0 || end < 0) {
    throw new Error('seats.mjs: docs/seats/README.md has no BEGIN/END SEATS markers.');
  }
  const rows = [];
  for (const line of src.slice(begin, end).split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length !== 5) continue;
    const [seat, role, machine, account, prompt] = cells;
    if (!/^[a-z][a-z0-9_-]*$/.test(seat)) continue; // drops the header row and the `---` separator
    rows.push({ seat, role, machine, account, prompt });
  }
  return rows;
}

function seatRow(root, seat) {
  const row = readRegistry(root).find((r) => r.seat === seat);
  if (!row) {
    const known = readRegistry(root)
      .map((r) => r.seat)
      .join(' ');
    throw new Error(
      `seats.mjs: unknown seat '${seat}'. Known seats: ${known}\n` +
        `Identity is role + machine and nothing else (docs/seats/README.md). A turn nobody can\n` +
        `attribute is a turn nobody can question — and the machine half decides what you may claim.`,
    );
  }
  return row;
}

export const roleOf = (root, seat) => seatRow(root, seat).role;
export const machineOf = (root, seat) => seatRow(root, seat).machine;
export const accountOf = (root, seat) => seatRow(root, seat).account;
export const promptOf = (root, seat) => seatRow(root, seat).prompt;

// ------------------------------------------------------------------------------------------ PR title --

/**
 * A PR title routes only if it names the unit it belongs to. `T-nnn: …` is a task turn, `STEWARD: …`
 * is a steward turn carrying no task (`AGENTS.md §1.3`).
 *
 * ⚠ THIS LIVES HERE BECAUSE TWO THINGS ASK THE QUESTION. `agent-finish.mjs` refuses to print a
 * `gh pr create` line for a title that does not route, and CI re-asks on the PR that actually got
 * opened — because the finish script's answer only binds a seat that RAN it, and `--fill` or a
 * hand-typed title reaches GitHub without ever passing through it. Two copies of the regex would be
 * two gates that can disagree, which is the defect `seats.mjs` itself exists to avoid (see the header).
 */
export const PR_TITLE_RE = /^(T-\d{3}: |STEWARD: )/;

/** `true` when a PR title carries a routable `T-nnn:` / `STEWARD:` prefix. */
export function titleRoutes(title) {
  return PR_TITLE_RE.test(title ?? '');
}

// -------------------------------------------------------------------------------------------- browser --

/**
 * The machine gate is only real if `pc` is MEASURED rather than declared. A seat declaring
 * machine=pc while sitting on a machine with no real browser is the exact failure this gate exists to
 * prevent, so this looks for the binary instead of believing the label.
 *
 * `BUNYAN_BROWSER_CMD` overrides — deliberately by NAMING an executable, never a boolean bypass, so
 * what was trusted is written down and can land in the claim.
 *
 * Returns the command/path found, or `null`.
 */
export function browserCmd(env = process.env) {
  const override = env.BUNYAN_BROWSER_CMD;
  if (override) return existsBinary(override) ? override : null;

  const onPath = [
    'chrome',
    'chromium',
    'chromium-browser',
    'google-chrome',
    'google-chrome-stable',
    'microsoft-edge',
    'firefox',
  ];
  for (const c of onPath) if (existsBinary(c)) return c;

  // Windows: Chrome/Edge/Firefox register via the registry and App Paths, not PATH, so the loop above
  // finds nothing there even with a real browser installed. Check the conventional install locations
  // directly — additive, and inert on a machine where these paths simply do not exist.
  const winPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
  ];
  for (const p of winPaths) if (existsSync(p)) return p;
  if (env.LOCALAPPDATA) {
    for (const p of [
      join(env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ]) {
      if (existsSync(p)) return p;
    }
  }
  return null;
}

function onPathCheck(name) {
  try {
    execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
function existsBinary(cmdOrPath) {
  return existsSync(cmdOrPath) || onPathCheck(cmdOrPath);
}

// -------------------------------------------------------------------------------------------- backlog --

/** The `### T-nnn — …` entry's own lines, bounded by the next `###`/`##`/`---` heading. */
export function taskBlock(backlogSrc, taskId) {
  const lines = backlogSrc.split(/\r?\n/);
  const heading = new RegExp(`^### ${taskId}( |$)`);
  const out = [];
  let inside = false;
  for (const line of lines) {
    if (heading.test(line)) {
      inside = true;
      out.push(line);
      continue;
    }
    if (inside) {
      if (/^(#|---\s*$)/.test(line)) break;
      out.push(line);
    }
  }
  return out.join('\n');
}

/**
 * `machine:` | `area:` | `risk:` | `depends-on:`, read out of a task's own block. A field may be its
 * own bulleted line (`- depends-on: T-004`) or joined onto one line with others by `·`
 * (`area: kernel · machine: box`) — `docs/BACKLOG.md`'s own template uses both shapes, so the match is
 * anchored on EITHER a line start (with an optional `- ` bullet marker) OR a preceding `·`.
 */
export function taskField(backlogSrc, taskId, field) {
  const block = taskBlock(backlogSrc, taskId);
  const re = new RegExp(
    `(?:^[-*\\s]*|·\\s*)${field}:\\s*\\*{0,2}([a-zA-Z0-9,\\- ]+?)\\*{0,2}\\s*(?:$|·)`,
    'm',
  );
  const m = block.match(re);
  return m ? m[1].trim() : undefined;
}

/** A task's status cell from the BACKLOG's own summary table (`| T-nnn | <status> | … |`). */
export function rowStatus(backlogSrc, taskId) {
  const m = backlogSrc.match(new RegExp(`^\\|\\s*${taskId}\\s*\\|\\s*([a-z-]+)\\s*\\|`, 'm'));
  return m ? m[1] : undefined;
}

/** The task ids a `depends-on:` field names, `[]` for none/unparseable (the em-dash placeholder). */
export function dependsOn(backlogSrc, taskId) {
  const raw = taskField(backlogSrc, taskId, 'depends-on');
  if (!raw) return [];
  return [...raw.matchAll(/T-\d{3}/g)].map((m) => m[0]);
}

// -------------------------------------------------------------------------- D88 two-step review (T-014) --

/** The label that routes a `risk: high` task's second review turn. Applied by `agent-finish.mjs --review
 * --step 1` when step 1 finishes; read by `agent-start.mjs --review` to tell the reviewer which step it
 * is running. It does not exist on a fresh repo — the applying side creates it before adding it. */
export const STEP1_LABEL = 'review/step-1';
export const STEP1_LABEL_COLOR = '0E8A16';
// ⚠⚠ GitHub caps a label's description at 100 characters and `gh label create` refuses anything
// longer — measured live (T-014, PR #28): the original 104-character wording died on the very first
// repo where this label did not already exist, which is every FIRST risk: high review ever run.
export const STEP1_LABEL_DESCRIPTION =
  'Step 1 (mechanical) review is done — step 2 (adversarial) may run (D88, T-014).';

/**
 * Which of D88's two review turns a `risk: high` task is on, given the open PR's own label names —
 * `null` for anything else (one ordinary review turn). Pure and gh-free so the routing decision is
 * testable without a real PR: every caller resolves `labelNames` itself, from `gh pr view --json labels`.
 */
export function reviewStepFor(risk, labelNames) {
  if (risk !== 'high') return null;
  return labelNames.includes(STEP1_LABEL) ? 2 : 1;
}

/**
 * Whether `--review --step N` is legal for a task carrying `risk`. `{ ok, reason }`, mirroring
 * `canClaim`'s shape. ⚠ **An unreadable/absent `risk` is ALWAYS a refusal, never a default to
 * 'normal'** — the same skip `T-013` guards against, the shape Entry 88 shipped three of. `step` is
 * `null` when `--step` was not given.
 */
export function reviewStepGate(risk, step) {
  if (!risk) {
    return {
      ok: false,
      reason: `no readable 'risk:' field in docs/BACKLOG.md — refusing rather than defaulting to normal.`,
    };
  }
  if (risk === 'high') {
    if (step !== 1 && step !== 2) {
      return {
        ok: false,
        reason: `risk: high requires --step 1 or --step 2 (D88's two-step review, REVIEW.md §"Two steps").`,
      };
    }
  } else if (step) {
    return {
      ok: false,
      reason: `risk: ${risk} — --step is refused; only risk: high uses a two-step review.`,
    };
  }
  return { ok: true };
}

/**
 * Whether a `--review` finish should flip the backlog row to `done` — the exact decision `T-014`
 * exists to correct. Before this fix the row flipped whenever the diff was not `contract-touching`,
 * with no notion of steps at all: a `risk: high` PR reached `done` after ONE of its two required
 * review turns (measured on T-008/PR #23). Pure so the defect and its fix are both directly testable
 * without spawning `gh` — flip the formula in a test to see the bug this closes.
 *
 * `contractTouching` keeps the row `review` regardless of risk, same as before this task: that PR
 * waits on the owner's own merge timing, never a reviewer's.
 */
export function reviewFlipsToDone(risk, step, contractTouching) {
  if (contractTouching) return false;
  if (risk === 'high') return step === 2;
  return true;
}

function readBacklog(root) {
  const path = join(root, 'docs/BACKLOG.md');
  if (!existsSync(path)) {
    throw new Error(
      'seats.mjs: docs/BACKLOG.md does not exist. Nothing is ready or claimable without it.',
    );
  }
  return readFileSync(path, 'utf8');
}

/**
 * Machine satisfaction. `any` is claimable by every seat; `box`/`pc` name the machine the task must be
 * EXECUTED on, and `pc` additionally requires a real browser to be present. Returns `{ ok, reason }` —
 * never throws for an ordinary refusal, because a refusal here is the expected, useful outcome the
 * whole gate exists to produce.
 */
export function canClaim(root, seat, taskId, env = process.env) {
  let row;
  try {
    row = seatRow(root, seat);
  } catch (e) {
    return { ok: false, reason: e.message };
  }
  let backlog;
  try {
    backlog = readBacklog(root);
  } catch (e) {
    return { ok: false, reason: e.message };
  }
  if (!new RegExp(`^### ${taskId} `, 'm').test(backlog)) {
    return { ok: false, reason: `${taskId} has no entry in docs/BACKLOG.md.` };
  }
  // ⚠⚠ DEPENDENCY CLOSURE, MECHANICALLY — the steward's readiness sweep is supposed to keep a `blocked`
  // row `blocked` until every dependency is `done`, but a mis-marked row (promoted on "a PR exists"
  // rather than "it merged") is exactly the silent failure this checks for instead of trusting. `done`
  // means MERGED — a dependency whose only PR is open is not satisfied, whatever the summary table says.
  for (const dep of dependsOn(backlog, taskId)) {
    const depStatus = rowStatus(backlog, dep);
    if (depStatus !== 'done') {
      return {
        ok: false,
        reason:
          `REFUSED — ${taskId} depends on ${dep}, which is '${depStatus ?? 'missing'}', not 'done'.\n` +
          `An open PR is not a merged dependency. Wait for ${dep}'s review, or claim something whose ` +
          `dependencies are already satisfied.`,
      };
    }
  }
  const tm = taskField(backlog, taskId, 'machine');
  if (!['any', 'box', 'pc'].includes(tm ?? '')) {
    return tm
      ? { ok: false, reason: `${taskId} has machine: '${tm}' — expected any | box | pc.` }
      : {
          ok: false,
          reason:
            `${taskId} has no 'machine:' field. It is NOT READY — a task whose machine is unstated\n` +
            `lets a seat tick an exit criterion its machine cannot check. Fix the entry (the steward's act).`,
        };
  }
  if (tm === 'any') return { ok: true };
  if (row.machine !== tm) {
    const owners = readRegistry(root)
      .filter((r) => r.machine === tm)
      .map((r) => r.seat);
    return {
      ok: false,
      reason:
        `REFUSED — ${taskId} is machine: ${tm} and seat '${seat}' is on machine: ${row.machine}.\n` +
        `Claiming it would mean reporting a criterion this machine cannot execute.\n` +
        `It belongs to: ${owners.length ? owners.join(', ') : 'NOBODY — no seat is registered on that machine.'}`,
    };
  }
  if (tm === 'pc' && !browserCmd(env)) {
    return {
      ok: false,
      reason:
        `REFUSED — ${taskId} is machine: pc and no browser was found here. Either this is not the pc,\n` +
        `or its browser is not installed. If one exists under another name, point at it:\n` +
        `BUNYAN_BROWSER_CMD=/path/to/chrome`,
    };
  }
  return { ok: true };
}

/** Ready task ids this seat can satisfy, in `docs/BACKLOG.md`'s own order. */
export function readyFor(root, seat, env = process.env) {
  const backlog = readBacklog(root);
  const ids = [...backlog.matchAll(/^\|\s*(T-\d{3})\s*\|\s*ready\s*\|/gm)].map((m) => m[1]);
  return ids.filter((id) => canClaim(root, seat, id, env).ok);
}

/**
 * A reviewer must run where it can RE-EXECUTE the claim, because the first checklist item is *revert
 * the fix and paste the red output*. A `pc` task therefore never routes to a box reviewer. For
 * `machine: any`, the review goes to the reviewer sharing the finishing builder's machine, which is
 * where the work was actually run.
 *
 * Falls back to the same-machine BUILDER when this project registers no reviewer on that machine (solo
 * mode) — `solo: true` on the result so a caller can print the honest warning every time, per
 * mdo ADR-0007 E10: a degradation nobody is told about is indistinguishable from a guarantee.
 */
export function reviewerFor(root, taskOrMachine, finishingSeat) {
  const registry = readRegistry(root);
  let m;
  if (['box', 'pc', 'any'].includes(taskOrMachine)) {
    m = taskOrMachine;
  } else {
    const backlog = readBacklog(root);
    m = taskField(backlog, taskOrMachine, 'machine');
    if (!m) throw new Error(`${taskOrMachine} has no 'machine:' field`);
  }
  if (m === 'any') {
    m = finishingSeat ? machineOf(root, finishingSeat) : 'box';
  }
  const reviewer = registry.find((r) => r.role === 'reviewer' && r.machine === m);
  if (reviewer) return { seat: reviewer.seat, solo: false };
  const builder = registry.find((r) => r.role === 'builder' && r.machine === m);
  if (!builder) {
    throw new Error(
      `no reviewer AND no builder registered for machine '${m}' — this project cannot review its own ` +
        `'${m}' work. Register a seat on that machine.`,
    );
  }
  return { seat: builder.seat, solo: true };
}

/**
 * The BUILDER who owns a task, derived from the task's own `machine:` field alone — NEVER from a
 * branch's §0b baton, which records the last seat to FINISH a turn there, and a `--review` finish
 * rewrites that baton to name the REVIEWER (measured 2026-08-15 against T-008: its baton reads
 * `seat: hmdnah / role: reviewer` while its own claim commit reads `claim: T-008 by zayd (box)`). A
 * gate on the baton would admit the reviewer and refuse the builder in every real `--continue` call.
 *
 * Symmetric with `reviewerFor`: resolve the task's machine, then the registry's builder on it, with
 * the same `any` fallback (the finishing seat's own machine when given, else `box`).
 */
export function builderFor(root, taskId, finishingSeat) {
  const registry = readRegistry(root);
  const backlog = readBacklog(root);
  let m = taskField(backlog, taskId, 'machine');
  if (!m) throw new Error(`${taskId} has no 'machine:' field`);
  if (m === 'any') {
    m = finishingSeat ? machineOf(root, finishingSeat) : 'box';
  }
  const builder = registry.find((r) => r.role === 'builder' && r.machine === m);
  if (!builder) {
    throw new Error(
      `no builder registered for machine '${m}' — nobody can own ${taskId}'s branch on it.`,
    );
  }
  return { seat: builder.seat };
}

// ------------------------------------------------------------------------------------------- dispatch --

if (
  import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` ||
  process.argv[1]?.endsWith('seats.mjs')
) {
  const [, , cmd, ...rest] = process.argv;
  const root = SELF_ROOT;
  try {
    switch (cmd) {
      case 'list':
        for (const r of readRegistry(root)) {
          console.log(`${r.seat} ${r.role} ${r.machine} ${r.account} ${r.prompt}`);
        }
        break;
      case 'role':
        console.log(roleOf(root, rest[0]));
        break;
      case 'machine':
        console.log(machineOf(root, rest[0]));
        break;
      case 'account':
        console.log(accountOf(root, rest[0]));
        break;
      case 'prompt':
        console.log(promptOf(root, rest[0]));
        break;
      case 'browser': {
        const b = browserCmd();
        if (!b) {
          console.log('absent');
          process.exit(1);
        }
        console.log(b);
        break;
      }
      case 'task-field': {
        const v = taskField(readBacklog(root), rest[0], rest[1]);
        if (!v) {
          console.error(`${rest[0]} has no '${rest[1]}:' field`);
          process.exit(1);
        }
        console.log(v);
        break;
      }
      case 'can-claim': {
        const v = canClaim(root, rest[0], rest[1]);
        if (!v.ok) {
          console.error(v.reason);
          process.exit(1);
        }
        console.log(`yes — ${rest[1]} is claimable by seat ${rest[0]}`);
        break;
      }
      case 'ready-for':
        for (const id of readyFor(root, rest[0])) console.log(id);
        break;
      case 'builder-for':
        console.log(builderFor(root, rest[0], rest[1]).seat);
        break;
      case 'reviewer-for': {
        const v = reviewerFor(root, rest[0], rest[1]);
        if (v.solo) {
          console.error(
            `seats.mjs: no reviewer seat on machine '${rest[0]}'; falling back to builder '${v.seat}'.\n` +
              `         Solo mode: the review is a SEPARATE turn by the same seat — fresh context, not\n` +
              `         fresh eyes. Weaker, and it must be said in the log.`,
          );
        }
        console.log(v.seat);
        break;
      }
      default:
        console.error(`seats.mjs: unknown command '${cmd}'`);
        process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
