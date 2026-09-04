// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `scripts/agent-finish.mjs`, exercised by spawning it — same reasoning as `agent-start.test.ts`.
 *
 * ⚠ Scope, stated rather than silently narrow: everything this suite covers happens BEFORE step 1
 * (`pnpm verify`), which is deliberate — a fixture repo has no real `packages/`/`apps/web` to
 * typecheck, lint or test, so exercising anything past step 1 needs a fixture shaped like a real
 * Bunyan checkout, which is a larger investment than the two gates that matter most for THIS turn:
 * seat identity and the machine gate at tick time (ADR-0007 E3's "the gate fires where the claim is
 * actually made" reasoning, ported — a `--incomplete` branch can be resumed by a different seat, and a
 * task's `machine:` can be edited between the claim and the tick, so claim-time and finish-time need
 * their OWN gate, not one shared check). ⚠ T-026's identity re-check ALSO fires before step 1 (`review`
 * refuses before `pnpm verify` on a wrong `gh` login), so every `--review` fixture run below now needs
 * a `gh` stand-in reporting the reviewing seat's own account — `hmdnah`/`amer` are `narutousomaki741`,
 * never this box's real ambient `davidian-abdo`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { makeFixture } from './fixture.mjs';
import { fakeGhReporting, ghCmdIn } from './gh-stub.mjs';
import { resolveBuilder, reviewClosingLines, setRowStatus } from '../../scripts/agent-finish.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const AGENT_FINISH = join(REPO, 'scripts/agent-finish.mjs');

/** What `execFileSync` throws on a non-zero exit, the shape this suite actually cares about. */
interface SpawnFailure {
  status?: number | null;
  stdout?: Buffer | string | null;
  stderr?: Buffer | string | null;
}
function isSpawnFailure(e: unknown): e is SpawnFailure {
  return typeof e === 'object' && e !== null;
}

function run(
  args: string[],
  envOverride?: Record<string, string | undefined>,
): { code: number; out: string; err: string } {
  try {
    const out = execFileSync('node', [AGENT_FINISH, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: envOverride ? { ...process.env, ...envOverride } : process.env,
    });
    return { code: 0, out, err: '' };
  } catch (e: unknown) {
    if (!isSpawnFailure(e)) throw e;
    return {
      code: e.status ?? 1,
      out: e.stdout?.toString() ?? '',
      err: e.stderr?.toString() ?? '',
    };
  }
}

let fx: ReturnType<typeof makeFixture>;
let extraDirs: string[] = [];
afterEach(() => {
  fx?.cleanup();
  for (const d of extraDirs) rmSync(d, { recursive: true, force: true });
  extraDirs = [];
});

/** `hmdnah`'s own account (`docs/seats/README.md`/the fixture's `SEATS_TABLE`), as a ready-to-use
 * `BUNYAN_GH_CMD` env override — every `--review` fixture run needs this, or the real ambient `gh`
 * (`davidian-abdo` on this box) fails T-026's identity re-check before reaching what the test means to
 * exercise. */
function hmdnahGhEnv(): Record<string, string> {
  const dir = fakeGhReporting('narutousomaki741');
  extraDirs.push(dir);
  return { BUNYAN_GH_CMD: ghCmdIn(dir) };
}

describe('step 0 — seat identity', () => {
  it('refuses with no seat', () => {
    fx = makeFixture();
    const r = run(['--root', fx.dir, 'T-001']);
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/No seat\./);
  });

  it('refuses with no task', () => {
    fx = makeFixture();
    const r = run(['--root', fx.dir, '--seat', 'zayd']);
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/usage: agent-finish\.mjs/);
  });
});

describe('the identity guard, RE-RUN at review/approve time (D87, T-013; T-026)', () => {
  // `agent-start.mjs`'s own gate guards the CLAIM; a review approves and merges well after that call
  // returned, in a session that may not even be the one that claimed it. Measured on PR #39: the box's
  // default `gh` identity WAS the PR's own author (`davidian-abdo`, `zayd`/`khalihlna`'s account) and
  // nothing between the claim and `gh pr merge` re-checked it — this closes that gap independently of
  // whether `agent-start.mjs` ever ran this turn.

  it("REFUSES a review finish when gh reports an account other than the SEAT's own", () => {
    fx = makeFixture([
      { id: 'T-001', status: 'ready', title: 'x', area: 'kernel', machine: 'box', risk: 'normal' },
    ]);
    // hmdnah's own account is narutousomaki741 — report the OTHER account instead, exactly PR #39's
    // shape: the box's ambient identity resolves to the PR's own author (davidian-abdo).
    const fakeGhDir = fakeGhReporting('davidian-abdo');
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--seat', 'hmdnah', 'T-001', '--review'], {
      BUNYAN_GH_CMD: ghCmdIn(fakeGhDir),
    });
    expect(r.code).not.toBe(0);
    // ⚠ both accounts named — a refusal that says only "wrong account" sends the reader to the wrong
    // per-seat token file (docs/RUNBOOK.md "Seat credentials").
    expect(r.out + r.err).toContain('davidian-abdo');
    expect(r.out + r.err).toContain('narutousomaki741');
    // Refused before ANYTHING a review turn does — no verify, no backlog flip, no push.
    expect(r.out).not.toMatch(/1\. Verification/);
    expect(r.out).not.toMatch(/risk\/step gate/);
  });

  it('an UNRESOLVABLE identity is a hard refusal, never a silent skip', () => {
    fx = makeFixture([
      { id: 'T-001', status: 'ready', title: 'x', area: 'kernel', machine: 'box', risk: 'normal' },
    ]);
    // A `gh` that fails outright (no stand-in reachable) rather than reporting any login.
    const r = run(['--root', fx.dir, '--seat', 'hmdnah', 'T-001', '--review'], {
      BUNYAN_GH_CMD: JSON.stringify([process.execPath, join(fx.dir, 'no-such-gh.cjs')]),
    });
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/REFUSAL, never a skip/);
  });

  it('a PLAIN (non-review) finish is unaffected — this guard is scoped to --review', () => {
    // Never mocks gh at all: if this guard fired unconditionally, it would spawn gh here too and
    // either hang/fail on an unmocked call or print a confirmation line that never used to exist.
    fx = makeFixture([
      { id: 'T-001', status: 'ready', title: 'x', area: 'kernel', machine: 'box', risk: 'normal' },
    ]);
    const r = run(['--root', fx.dir, '--seat', 'zayd', 'T-001']);
    expect(r.out).not.toMatch(/gh identity/);
    expect(r.out).toMatch(/✓ machine gate: T-001 is machine: box, seat is on box/);
  });

  it('a CORRECTLY authenticated review clears the guard, through to the risk/step gate', () => {
    fx = makeFixture([
      { id: 'T-001', status: 'ready', title: 'x', area: 'kernel', machine: 'box', risk: 'normal' },
    ]);
    const r = run(['--root', fx.dir, '--seat', 'hmdnah', 'T-001', '--review'], hmdnahGhEnv());
    expect(r.out).toMatch(/✓ gh identity: narutousomaki741 — matches seat 'hmdnah'/);
    expect(r.out).toMatch(/✓ risk\/step gate: risk: normal, single review turn/);
  });
});

describe('the machine gate, AT TICK TIME — not only at claim time', () => {
  it('refuses to finish a task with no machine: field', () => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'undeclared machine',
        area: 'kernel',
        machine: '',
        risk: 'normal',
      },
    ]);
    // The fixture always writes a machine: field; blank it to simulate a mis-decomposed row.
    const p = join(fx.dir, 'docs/BACKLOG.md');
    writeFileSync(p, readFileSync(p, 'utf8').replace('machine: ****', 'machine:'));
    const r = run(['--root', fx.dir, '--seat', 'zayd', 'T-001']);
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/T-001 has no 'machine:' field/);
  });

  it('REFUSES a box seat finishing a pc task — reporting exit criteria it could not have run', () => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'pc-only work',
        area: 'apps-web',
        machine: 'pc',
        risk: 'normal',
      },
    ]);
    const r = run(['--root', fx.dir, '--seat', 'zayd', 'T-001']);
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/machine: pc and seat 'zayd' is on machine: box/);
  });

  it('lets a pc seat finish a pc task through to the verify step', () => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'pc-only work',
        area: 'apps-web',
        machine: 'pc',
        risk: 'normal',
      },
    ]);
    const r = run(['--root', fx.dir, '--seat', 'amer', 'T-001']);
    // Fails later, at `pnpm verify` (this fixture has no real packages/ to lint/test) — the point
    // under test is that it got PAST the machine gate, not that the whole turn succeeds.
    expect(r.out).toMatch(/✓ machine gate: T-001 is machine: pc, seat is on pc/);
  });

  it('`machine: any` is finishable from either seat', () => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'either work',
        area: 'infra',
        machine: 'any',
        risk: 'normal',
      },
    ]);
    const r = run(['--root', fx.dir, '--seat', 'zayd', 'T-001']);
    expect(r.out).toMatch(/✓ machine gate: T-001 is machine: any, seat is on box/);
  });
});

describe('the risk/step gate — `--review` must read risk:, not only the frozen surface (D88, T-014)', () => {
  it('refuses --step on a build (non-review) finish', () => {
    fx = makeFixture([
      { id: 'T-001', status: 'ready', title: 'x', area: 'kernel', machine: 'box', risk: 'high' },
    ]);
    const r = run(['--root', fx.dir, '--seat', 'zayd', 'T-001', '--step', '1']);
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/only applies to a `--review` turn\./);
  });

  it('refuses an out-of-range --step value before doing anything else', () => {
    fx = makeFixture();
    const r = run(['--root', fx.dir, '--seat', 'hmdnah', 'T-001', '--review', '--step', '3']);
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/--step must be 1 or 2, got '3'/);
  });

  it('refuses a risk: high review that names no step', () => {
    fx = makeFixture([
      { id: 'T-001', status: 'ready', title: 'x', area: 'kernel', machine: 'box', risk: 'high' },
    ]);
    const r = run(['--root', fx.dir, '--seat', 'hmdnah', 'T-001', '--review'], hmdnahGhEnv());
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/requires --step 1 or --step 2/);
    // Fails BEFORE `pnpm verify` — cheap to catch a usage error before a full verify run.
    expect(r.out).not.toMatch(/1\. Verification/);
  });

  it('refuses --step on a risk: normal review — only risk: high uses two steps', () => {
    fx = makeFixture([
      { id: 'T-001', status: 'ready', title: 'x', area: 'kernel', machine: 'box', risk: 'normal' },
    ]);
    const r = run(
      ['--root', fx.dir, '--seat', 'hmdnah', 'T-001', '--review', '--step', '1'],
      hmdnahGhEnv(),
    );
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/only risk: high uses a two-step review/);
  });

  it('refuses an unreadable/absent risk: field, never defaulting to normal', () => {
    fx = makeFixture([
      { id: 'T-001', status: 'ready', title: 'x', area: 'kernel', machine: 'box', risk: 'high' },
    ]);
    const p = join(fx.dir, 'docs/BACKLOG.md');
    // Same trick the machine-gate suite uses: blank the field to simulate a mis-decomposed row.
    writeFileSync(p, readFileSync(p, 'utf8').replace('risk: **high**', 'risk:'));
    const r = run(['--root', fx.dir, '--seat', 'hmdnah', 'T-001', '--review'], hmdnahGhEnv());
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/no readable 'risk:' field/);
  });

  it('a risk: high review naming --step 1 or --step 2 clears the gate, through to verify', () => {
    fx = makeFixture([
      { id: 'T-001', status: 'ready', title: 'x', area: 'kernel', machine: 'box', risk: 'high' },
    ]);
    const ghEnv = hmdnahGhEnv();
    const r1 = run(
      ['--root', fx.dir, '--seat', 'hmdnah', 'T-001', '--review', '--step', '1'],
      ghEnv,
    );
    expect(r1.out).toMatch(/✓ risk\/step gate: risk: high, step 1 of 2/);
    const r2 = run(
      ['--root', fx.dir, '--seat', 'hmdnah', 'T-001', '--review', '--step', '2'],
      ghEnv,
    );
    expect(r2.out).toMatch(/✓ risk\/step gate: risk: high, step 2 of 2/);
  });

  it('a risk: normal review with no --step is unchanged from before T-014', () => {
    fx = makeFixture([
      { id: 'T-001', status: 'ready', title: 'x', area: 'kernel', machine: 'box', risk: 'normal' },
    ]);
    const r = run(['--root', fx.dir, '--seat', 'hmdnah', 'T-001', '--review'], hmdnahGhEnv());
    expect(r.out).toMatch(/✓ risk\/step gate: risk: normal, single review turn/);
  });
});

describe('the status flip keeps the table formatted — `format:check` is CI step 3', () => {
  // The status words are different lengths, so writing one over another without repadding changes
  // the column's width and `prettier --check` rejects the file. It opened PR #20 red on a diff its
  // author never wrote, which is why this is asserted on the writer rather than fixed per branch.
  function table(): string {
    return [
      '| id    | status  | title |',
      '| ----- | ------- | ----- |',
      '| T-001 | ready   | x     |',
      '| T-002 | blocked | y     |',
      '',
    ].join('\n');
  }

  it('repads `ready` → `review` → `done` so every row stays the same width', () => {
    fx = makeFixture();
    const p = join(fx.dir, 'docs/BACKLOG.md');
    writeFileSync(p, table());

    setRowStatus(p, 'T-001', 'review');
    expect(readFileSync(p, 'utf8')).toContain('| T-001 | review  | x     |');

    setRowStatus(p, 'T-001', 'done');
    expect(readFileSync(p, 'utf8')).toContain('| T-001 | done    | x     |');

    // The real gate: every row of the table is still the same length as its header.
    const lines = readFileSync(p, 'utf8').trimEnd().split('\n');
    for (const line of lines) expect(line).toHaveLength(lines[0]!.length);
  });
});

describe('resolveBuilder — the §0b baton `builder` field survives a review finish (T-016)', () => {
  // Regression: before T-016 the baton had only `seat`, and a `--review` finish overwrote it with the
  // REVIEWING seat — the builder's identity was recoverable only from the claim commit message, never
  // from §0b itself (`current_state.md §0b`'s own defect note, Discovered 2026-08-15).

  it('a review finish carries the PRIOR builder forward, never the reviewing seat', () => {
    const priorBaton = { seat: 'zayd', builder: 'zayd', status: 'finished — PR open' };
    expect(resolveBuilder(true, priorBaton, 'hmdnah')).toBe('zayd');
  });

  it('a review finish falls back to the finishing seat when no prior builder is on record', () => {
    expect(resolveBuilder(true, null, 'hmdnah')).toBe('hmdnah');
    expect(resolveBuilder(true, { seat: 'zayd' }, 'hmdnah')).toBe('hmdnah');
  });

  it('a plain (non-review) finish always sets builder to the finishing seat', () => {
    expect(resolveBuilder(false, null, 'zayd')).toBe('zayd');
    expect(resolveBuilder(false, { seat: 'zayd', builder: 'zayd' }, 'zayd')).toBe('zayd');
    // Even resuming someone else's incomplete branch (T-015's --continue) is a BUILD finish, not a
    // review one — the finishing seat is who actually built it this time.
    expect(resolveBuilder(false, { seat: 'zayd', builder: 'zayd' }, 'amer')).toBe('amer');
  });
});

describe('reviewClosingLines — the verdict is OWED, never performed (T-026)', () => {
  // This script never calls `gh pr review`/`gh pr merge` itself — it prints the command for the seat
  // to run next. Measured on PR #39: a handoff body recorded "Verdict: APPROVED, and merged by me" for
  // a PR that carried ZERO reviews. None of these three branches may read as already done.
  const base = {
    task: 'T-001',
    seat: 'hmdnah',
    role: 'reviewer',
    machine: 'box',
    prNumber: 7,
  };

  it('risk: high step 1 — explicitly no approval, no merge', () => {
    const lines = reviewClosingLines({
      ...base,
      riskHighStep1: true,
      reviewContractTouching: false,
    });
    const text = lines.join('\n');
    expect(text).toMatch(/no approval, no merge/);
    expect(text).not.toMatch(/APPROVED|merged/i);
  });

  it("contract-touching — approval stated as OWED, not performed; the merge is the owner's", () => {
    const lines = reviewClosingLines({
      ...base,
      riskHighStep1: false,
      reviewContractTouching: true,
    });
    const text = lines.join('\n');
    expect(text).toMatch(/OWED, not yet performed/);
    expect(text).not.toMatch(/Review complete/); // "complete" read as done, measured on PR #39
    expect(text).toMatch(/gh pr review 7 --approve/);
    expect(text).not.toContain('gh pr merge'); // never this reviewer's to run
  });

  it('additive — approval AND merge stated as OWED, not performed', () => {
    const lines = reviewClosingLines({
      ...base,
      riskHighStep1: false,
      reviewContractTouching: false,
    });
    const text = lines.join('\n');
    expect(text).toMatch(/OWED, not yet performed/);
    expect(text).not.toMatch(/Review complete/);
    expect(text).toMatch(/gh pr review 7 --approve && gh pr merge 7 --squash/);
  });

  it('falls back to a placeholder PR number when it could not be resolved', () => {
    const lines = reviewClosingLines({
      ...base,
      prNumber: null,
      riskHighStep1: false,
      reviewContractTouching: false,
    });
    expect(lines.join('\n')).toMatch(/gh pr review <n> --approve && gh pr merge <n> --squash/);
  });
});
