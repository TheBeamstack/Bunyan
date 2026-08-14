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
 * their OWN gate, not one shared check).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { makeFixture } from './fixture.mjs';

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

function run(args: string[]): { code: number; out: string; err: string } {
  try {
    const out = execFileSync('node', [AGENT_FINISH, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
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
afterEach(() => {
  fx?.cleanup();
});

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
