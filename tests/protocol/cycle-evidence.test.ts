// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `.agent.toml [cycle] evidence` (R47), proved against a fixture shaped like THIS repo, not a
 * stand-in lane. `cycle_end.py` is diwan's — Bunyan carries no JS port of it, unlike
 * `agent-start.mjs`/`agent-finish.mjs`, so it is exercised here exactly as the steward's own
 * loop runs it: `python3 $DIWAN/scripts/cycle_end.py --seat <seat>`, cwd'd into a repo.
 *
 * `EXPECTED_EVIDENCE` is a PIN, not a re-derivation of `.agent.toml`: this file fails if a later
 * edit to `[cycle] evidence` is not also made here, on purpose — the point being that "the real
 * config still means what this suite says it means" is a checked fact, not an assumption.
 *
 * Measured before this table existed (2026-09-24): 18 of the last 80 commits on `main` touched
 * ONLY the five paths below and nothing else — no task branch, no PR, no `docs/CURRENT_STATE.md`
 * — which is the `brahim` steward's own scope here (`diwan/docs/seats/brahim.md` §"Scope") when
 * it is not moving a task.
 */
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  utimesSync,
  statSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const DIWAN = process.env.DIWAN ?? join(process.cwd(), '..', 'diwan');
const CYCLE_END = join(DIWAN, 'scripts', 'cycle_end.py');

// The pin. Keep this equal to `.agent.toml [cycle] evidence`, in the same order, on purpose.
const EXPECTED_EVIDENCE = [
  'docs/BACKLOG.md',
  'docs/OWNER-DECISIONS.md',
  'docs/decisions.md',
  'docs/PHASE_LOG.md',
  'handoff/',
];

function agentToml(verify: string, evidence: string[] | null): string {
  const cycle = evidence
    ? `\n[cycle]\nevidence = [${evidence.map((p) => `"${p}"`).join(', ')}]\n`
    : '';
  return `[repo]
name = "Bunyan"
language = "node"
diwan = "${DIWAN}"

[paths]
state = "docs/CURRENT_STATE.md"
backlog = "docs/BACKLOG.md"
docs = "docs"
seats = "docs/seats/README.md"
handoff = "handoff"
decisions = "docs/OWNER-DECISIONS.md"

[commands]
verify = "${verify}"
${cycle}
[git]
author_name = "Davidian-Abdo"
author_email = "e@x"
`;
}

const SEATS = `<!-- BEGIN SEATS -->

| Seat | Role | Machine | GitHub account | Prompt |
|---|---|---|---|---|
| brahim | steward | box | davidian-abdo | ../diwan/docs/seats/brahim.md |

<!-- END SEATS -->
`;

function git(args: string[], cwd: string, at?: number): void {
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: join(cwd, 'none'),
    GIT_CONFIG_SYSTEM: join(cwd, 'none'),
    ...(at !== undefined
      ? { GIT_AUTHOR_DATE: `@${at} +0000`, GIT_COMMITTER_DATE: `@${at} +0000` }
      : {}),
  };
  execFileSync('git', ['-C', cwd, ...args], { env, stdio: 'ignore' });
}

/** Every declared path is seeded in the base commit, backdated an hour so an un-backdated
 * commit does not become "work" in every scenario below (mirrors mdo's own fixture). */
function build(root: string, opts: { verify?: string; evidence?: string[] | null } = {}): void {
  const { verify = 'true', evidence = EXPECTED_EVIDENCE } = opts;
  mkdirSync(join(root, 'docs', 'seats'), { recursive: true });
  mkdirSync(join(root, 'handoff'), { recursive: true });
  writeFileSync(join(root, '.agent.toml'), agentToml(verify, evidence));
  writeFileSync(join(root, 'docs', 'seats', 'README.md'), SEATS);
  // `docs/CURRENT_STATE.md` is deliberately NOT created: none of these scenarios is about R1's
  // third artefact, and an on-disk state file's mtime ("when the fixture was built") would
  // confound the window check the same way an un-backdated base commit would.
  writeFileSync(join(root, 'docs', 'BACKLOG.md'), '# BACKLOG\n');
  writeFileSync(
    join(root, 'docs', 'OWNER-DECISIONS.md'),
    '# Owner decisions\n\nNo decision is open.\n',
  );
  writeFileSync(join(root, 'docs', 'decisions.md'), '# decisions\n');
  writeFileSync(join(root, 'docs', 'PHASE_LOG.md'), '# PHASE LOG\n');
  writeFileSync(join(root, 'handoff', '.gitkeep'), '');
  git(['init', '-q', '-b', 'main'], root);
  git(['add', '-A'], root);
  git(
    ['-c', 'user.name=D', '-c', 'user.email=e@x', 'commit', '-q', '-m', 'base'],
    root,
    Math.floor(Date.now() / 1000) - 3600,
  );
}

function commit(root: string, rel: string, body: string): void {
  const target = join(root, rel);
  mkdirSync(join(target, '..'), { recursive: true });
  writeFileSync(target, body);
  git(['add', '--', rel], root);
  git(['-c', 'user.name=D', '-c', 'user.email=e@x', 'commit', '-q', '-m', `work: ${rel}`], root);
}

function aTick(stateDir: string): string {
  const tick = join(stateDir, 'agentloop-bunyan.tick');
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(tick, '');
  const old = Date.now() / 1000 - 60;
  utimesSync(tick, old, old);
  return tick;
}

function runTheGate(root: string): void {
  const src = [
    'import sys; sys.path.insert(0, sys.argv[1])',
    'from protocol import load_config, run_gate, Refusal',
    'try:',
    "    run_gate(load_config(), 'verify', required=True)",
    'except Refusal:',
    '    pass',
  ].join('\n');
  execFileSync('python3', ['-c', src, join(DIWAN, 'scripts')], { cwd: root, stdio: 'ignore' });
  statSync(join(root, '.git', 'agent-gate-state.json'));
}

function endCycle(root: string, tick: string): { code: number; out: string; err: string } {
  try {
    const out = execFileSync('python3', [CYCLE_END, '--seat', 'brahim'], {
      cwd: root,
      env: { ...process.env, AGENT_LOOP_NAME: 'bunyan', AGENT_LOOP_TICK: tick },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out, err: '' };
  } catch (e: unknown) {
    const failure = e as { status?: number | null; stdout?: string; stderr?: string };
    return { code: failure.status ?? 1, out: failure.stdout ?? '', err: failure.stderr ?? '' };
  }
}

function receipt(tick: string): Record<string, string> {
  const text = readFileSync(tick.replace(/\.tick$/, '.cycle'), 'utf8');
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0) out[line.slice(0, i)] = line.slice(i + 1);
  }
  return out;
}

function moved(tick: string, before: number): boolean {
  return statSync(tick).mtimeMs > before;
}

let root = '';
let stateDir = '';
afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true });
  if (stateDir) rmSync(stateDir, { recursive: true, force: true });
  root = '';
  stateDir = '';
});

function freshDirs(): void {
  root = mkdtempSync(join(tmpdir(), 'bunyan-cycle-evidence-'));
  stateDir = mkdtempSync(join(tmpdir(), 'bunyan-cycle-evidence-state-'));
}

describe('the real .agent.toml declares exactly this', () => {
  it('matches the pin', () => {
    // No fixture: `protocol.load_config()` with no `start` walks up from `cwd` to the nearest
    // `.agent.toml`, which — run from this repo's root, as `pnpm test`/`vitest` always is — is
    // the real, committed file. The fixture below tests the MECHANISM; this pins the DECLARATION.
    const src = [
      'import sys; sys.path.insert(0, sys.argv[1])',
      'import json, protocol',
      'print(json.dumps(protocol.load_config().cycle_evidence))',
    ].join('\n');
    const out = execFileSync('python3', ['-c', src, join(DIWAN, 'scripts')], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(JSON.parse(out)).toEqual(EXPECTED_EVIDENCE);
  });
});

describe('1 · a steward-shaped cycle records work', () => {
  it.each([
    ['docs/BACKLOG.md', '# BACKLOG\n\n| T-200 | ready | x |\n'],
    ['docs/OWNER-DECISIONS.md', '# Owner decisions\n\n## D-20260924-01\n'],
    ['docs/decisions.md', '# decisions\n\n## D92\n'],
    ['docs/PHASE_LOG.md', '# PHASE LOG\n\n## cycle N\n'],
    ['handoff/brahim/2026-09-24-routing.md', 'posted: -\n'],
  ])('%s alone is enough', (rel, body) => {
    freshDirs();
    build(root);
    const tick = aTick(stateDir);
    const before = statSync(tick).mtimeMs;
    commit(root, rel, body);

    const done = endCycle(root, tick);

    expect(done.code, done.out + done.err).toBe(0);
    expect(receipt(tick).OUTCOME).toBe('work');
    expect(moved(tick, before)).toBe(true);
  });

  it('a commit outside the declared paths still refuses', () => {
    freshDirs();
    build(root);
    const tick = aTick(stateDir);
    const before = statSync(tick).mtimeMs;
    commit(root, 'docs/RUNBOOK.md', 'an edit R47 does not name\n');

    const done = endCycle(root, tick);

    expect(done.code, done.out + done.err).toBe(21);
    expect(moved(tick, before)).toBe(false);
  });
});

describe('2 · the quiet tick, and only', () => {
  it('a measured steward cycle with nothing to do ends quiet', () => {
    freshDirs();
    build(root);
    const tick = aTick(stateDir);
    const before = statSync(tick).mtimeMs;
    runTheGate(root);

    const done = endCycle(root, tick);

    expect(done.code, done.out + done.err).toBe(0);
    expect(receipt(tick).OUTCOME).toBe('quiet');
    expect(moved(tick, before)).toBe(true);
  });

  it('no gate run still refuses', () => {
    freshDirs();
    build(root);
    const tick = aTick(stateDir);
    const before = statSync(tick).mtimeMs;

    const done = endCycle(root, tick);

    expect(done.code, done.out + done.err).toBe(21);
    expect(receipt(tick).OUTCOME).toBe('no-work');
    expect(moved(tick, before)).toBe(false);
  });
});

describe('3 · a bad declaration fails loudly', () => {
  it('a path outside the repository is a config refusal, not a vacuous pass', () => {
    freshDirs();
    build(root, { evidence: ['../outside.md'] });
    const tick = aTick(stateDir);

    const done = endCycle(root, tick);

    expect(done.code, done.out + done.err).toBe(4);
    expect(done.err).toContain('[cycle] evidence');
  });
});
