/**
 * `scripts/agent-start.mjs`, exercised by SPAWNING it — the same reasoning mdo gives for testing
 * `agent-start.sh` this way: every refusal here is a gate the whole protocol rests on, and a test
 * cannot assert "the script refuses" without actually running it and reading its real exit code. The
 * script's own `main()` calls `process.exit()` on every refusal path, which would kill an in-process
 * test runner if imported and called directly — spawning is not a workaround, it is the only way to
 * observe a CLI's actual contract (its exit code and stdout), and it is what `--root`/`--no-pull` exist
 * for.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { makeFixture } from './fixture.mjs';
import { findTaskPR } from '../../scripts/agent-start.mjs';

const REPO = fileURLToPath(new URL('../..', import.meta.url));
const AGENT_START = join(REPO, 'scripts/agent-start.mjs');

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
    const out = execFileSync('node', [AGENT_START, ...args], {
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
let extraDirs: string[] = [];
afterEach(() => {
  fx?.cleanup();
  for (const d of extraDirs) rmSync(d, { recursive: true, force: true });
  extraDirs = [];
});

describe('step 0 — seat identity', () => {
  it('refuses with no seat at all', () => {
    fx = makeFixture();
    const r = run(['--root', fx.dir, '--no-pull', '--no-claim']);
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/No seat\./);
  });

  it('refuses an unknown seat, naming the known ones', () => {
    fx = makeFixture();
    const r = run(['--root', fx.dir, '--no-pull', '--no-claim', '--seat', 'nobody']);
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/unknown seat 'nobody'/);
  });
});

describe('step 3 — measured vs. claimed, the load-bearing refusal', () => {
  it('REFUSES to start when §8 has never been generated', () => {
    fx = makeFixture([], { measured: false });
    const r = run(['--root', fx.dir, '--no-pull', '--no-claim', '--seat', 'zayd']);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/MEASURED STATE DISAGREES WITH CLAIMED STATE/);
  });

  it('proceeds once §8 truly matches reality', () => {
    fx = makeFixture();
    const r = run(['--root', fx.dir, '--no-pull', '--no-claim', '--seat', 'zayd']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/measured state matches claimed state/);
  });

  it('REFUSES again if the committed §8 is hand-edited after the fact', () => {
    fx = makeFixture();
    const csPath = join(fx.dir, 'current_state.md');
    const cs = readFileSync(csPath, 'utf8').replace(
      /newest entry\*\* \| \*\*[^|]+/,
      'newest entry** | **HAND-EDITED',
    );
    writeFileSync(csPath, cs);
    const r = run(['--root', fx.dir, '--no-pull', '--no-claim', '--seat', 'zayd']);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/MEASURED STATE DISAGREES/);
  });
});

describe('step 5 — the machine gate, the safety-critical one', () => {
  it('a box seat with only a pc task ready finds nothing it can claim', () => {
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
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'zayd']);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/No ready task this seat can satisfy/);
  });

  it('REFUSES an explicit --seat claim of a task on the wrong machine', () => {
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
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'zayd', 'T-001']);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/machine: pc and seat 'zayd' is on machine: box/);
  });
});

describe('step 5 — a successful claim is pushed before work begins', () => {
  it('claims the one ready box task, writes §0b, and pushes the branch', () => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'kernel work',
        area: 'kernel',
        machine: 'box',
        risk: 'normal',
      },
    ]);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'zayd']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/Claimed: T-001/);

    const cs = readFileSync(join(fx.dir, 'current_state.md'), 'utf8');
    expect(cs).toMatch(/\| seat \| `zayd` \|/);
    expect(cs).toMatch(/\| task \| `T-001` \|/);
    expect(cs).toMatch(/\| status \| working \|/);

    // The claim is on origin, not just locally — a claim invisible to the other machine is the whole
    // failure this mechanism exists to prevent.
    const branches = execFileSync('git', ['ls-remote', '--heads', 'origin', 'refs/heads/task/*'], {
      cwd: fx.dir,
      encoding: 'utf8',
    });
    expect(branches).toMatch(/task\/T-001-/);
  });

  it('a DIFFERENT seat, on the OTHER machine, sees the live claim and refuses to collide', () => {
    // machine: any is the one real cross-machine collision this project's seat structure allows —
    // `zayd` (box) and `amer` (pc) are the only two builders, and only an `any` task is claimable by
    // both, exactly as `docs/seats/README.md` describes.
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'either-machine work',
        area: 'infra',
        machine: 'any',
        risk: 'normal',
      },
    ]);
    run(['--root', fx.dir, '--no-pull', '--seat', 'zayd']);

    const second = mkdtempSync(join(tmpdir(), 'bunyan-second-clone-'));
    extraDirs.push(second);
    execFileSync('git', ['clone', '-q', fx.origin, second]);
    const r = run(['--root', second, '--no-pull', '--seat', 'amer', 'T-001']);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/already claimed by seat 'zayd'/);
  });

  it('the SAME seat, from a different clone, RESUMES its own open claim rather than duplicating it', () => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'kernel work',
        area: 'kernel',
        machine: 'box',
        risk: 'normal',
      },
    ]);
    run(['--root', fx.dir, '--no-pull', '--seat', 'zayd']);

    const second = mkdtempSync(join(tmpdir(), 'bunyan-second-clone-'));
    extraDirs.push(second);
    execFileSync('git', ['clone', '-q', fx.origin, second]);
    const r = run(['--root', second, '--no-pull', '--seat', 'zayd']);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/Continuing your own open claim/);
  });
});

describe('findTaskPR — pure, no gh spawn needed', () => {
  it('matches the open PR whose title names the task', () => {
    const prs = [
      { number: 23, headRefName: 'task/T-008-q19-x', title: 'T-008: Q19 — the belongs-to thing' },
      { number: 24, headRefName: 'task/T-011-y', title: 'T-011: Q17a — a thing' },
    ];
    expect(findTaskPR(prs, 'T-008')).toEqual(prs[0]);
    expect(findTaskPR(prs, 'T-011')).toEqual(prs[1]);
  });

  it('returns null when no open PR names the task', () => {
    expect(findTaskPR([], 'T-008')).toBeNull();
    expect(
      findTaskPR(
        [{ number: 1, headRefName: 'task/T-002-x', title: 'T-002: something else' }],
        'T-008',
      ),
    ).toBeNull();
  });
});

describe('--continue — a defect returns to its builder, never a second door (D88, T-015)', () => {
  it('refuses a seat whose ROLE does not build', () => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'kernel work',
        area: 'kernel',
        machine: 'box',
        risk: 'high',
      },
    ]);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'hmdnah', '--continue', 'T-001']);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/role 'reviewer', which does not build/);
  });

  it("refuses a builder seat that is not the task's OWN builder, per machine: — not the baton", () => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'kernel work',
        area: 'kernel',
        machine: 'box',
        risk: 'high',
      },
    ]);
    // amer is a builder, just not the box builder T-001's machine: resolves to.
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'amer', '--continue', 'T-001']);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/T-001's builder is 'zayd', not 'amer'/);
  });

  it('a ready row with no PR is still refused through the --continue door too', () => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'kernel work',
        area: 'kernel',
        machine: 'box',
        risk: 'high',
      },
    ]);
    // The right seat, but this fixture's origin is a bare local repo, not a GitHub one, so `gh pr
    // list` finds nothing — exactly the shape of a task nobody has opened a PR for yet.
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'zayd', '--continue', 'T-001']);
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/No open PR names T-001/);
  });

  it('rejects a malformed task id before doing anything else', () => {
    fx = makeFixture();
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'zayd', '--continue', 'not-a-task']);
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/--continue expects a T-nnn id/);
  });
});
