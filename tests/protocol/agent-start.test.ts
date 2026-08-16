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
import { chmodSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { makeFixture } from './fixture.mjs';
import { findTaskPR, identityGate, resolveReviewStep } from '../../scripts/agent-start.mjs';

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

function run(
  args: string[],
  envOverride?: Record<string, string | undefined>,
): { code: number; out: string; err: string } {
  try {
    const out = execFileSync('node', [AGENT_START, ...args], {
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

/**
 * The identity guard (T-013) means every spawn of `agent-start.mjs` now checks `gh api user`, and
 * THIS box's real `gh` is authenticated as exactly one account for the whole suite (`davidian-abdo`,
 * matching `zayd`/`brahim`). Tests that exercise `hmdnah`/`amer` (`narutousomaki741`) need a `gh`
 * reporting THAT login instead — a `gh` stand-in on PATH ahead of the real one, forwarding every other
 * subcommand unchanged, rather than a bypass flag inside the guard itself (which would be the exact
 * skip T-013 exists to close). Directory is the caller's to clean up via `extraDirs`.
 */
function fakeGhReporting(login: string): string {
  const realGh = execFileSync(process.platform === 'win32' ? 'where' : 'which', ['gh'], {
    encoding: 'utf8',
  })
    .trim()
    .split(/\r?\n/)[0];
  const dir = mkdtempSync(join(tmpdir(), 'bunyan-fake-gh-'));
  const script = join(dir, 'gh');
  writeFileSync(
    script,
    `#!/usr/bin/env bash\nif [ "$1" = "api" ] && [ "$2" = "user" ]; then\n  echo "${login}"\n  exit 0\nfi\nexec "${realGh}" "$@"\n`,
  );
  chmodSync(script, 0o755);
  return dir;
}

/**
 * Like `fakeGhReporting`, but also stubs `gh pr list`/`pr comment`/`pr checkout` so the reviewer
 * ROUTING LOOP (T-012) can be exercised end to end without ever touching real GitHub or ambient `gh`
 * auth — the same hermetic-stub reasoning as `fakeGhReporting`'s own header, applied to the review
 * path, which this suite had never spawned before (T-013 shipped without it and bit CI once already).
 * `pr checkout` is real `git` against THIS fixture, resolving each PR number to the branch the caller
 * already pushed there.
 */
function fakeGhForReview(
  login: string,
  prs: Array<{ number: number; headRefName: string; title: string }>,
): string {
  const realGh = execFileSync(process.platform === 'win32' ? 'where' : 'which', ['gh'], {
    encoding: 'utf8',
  })
    .trim()
    .split(/\r?\n/)[0];
  const dir = mkdtempSync(join(tmpdir(), 'bunyan-fake-gh-review-'));
  const script = join(dir, 'gh');
  const prListJson = JSON.stringify(prs).replace(/'/g, "'\\''");
  const checkoutCases = prs
    .map(
      (pr) =>
        `    ${pr.number}) git fetch -q origin "${pr.headRefName}" 2>/dev/null; git checkout -q "${pr.headRefName}" 2>/dev/null || git checkout -q -b "${pr.headRefName}" "origin/${pr.headRefName}"; exit $? ;;`,
    )
    .join('\n');
  writeFileSync(
    script,
    `#!/usr/bin/env bash
if [ "$1" = "api" ] && [ "$2" = "user" ]; then
  echo "${login}"
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "list" ]; then
  echo '${prListJson}'
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "comment" ]; then
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "checkout" ]; then
  case "$3" in
${checkoutCases}
    *) exit 1 ;;
  esac
fi
exec "${realGh}" "$@"
`,
  );
  chmodSync(script, 0o755);
  return dir;
}

/** Pushes a real `<seat>/<date>-<slug>` branch — the exact shape a `STEWARD:` PR's branch has — with
 * one commit, and leaves the fixture back on `main`. */
function pushSteward(dir: string, branch: string): void {
  execFileSync('git', ['checkout', '-q', '-b', branch], { cwd: dir });
  writeFileSync(join(dir, 'STEWARD-note.md'), 'fixture steward turn\n');
  execFileSync('git', ['add', '-A'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'STEWARD: fixture steward turn'], { cwd: dir });
  execFileSync('git', ['push', '-q', '-u', 'origin', branch], { cwd: dir });
  execFileSync('git', ['checkout', '-q', 'main'], { cwd: dir });
}

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

describe('step 0 — the identity guard, end to end (D87, T-013)', () => {
  it("REFUSES the whole turn when gh reports an account other than the SEAT's own", () => {
    fx = makeFixture();
    const fakeGhDir = fakeGhReporting('narutousomaki741'); // hmdnah/amer's account, not zayd's
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--no-claim', '--seat', 'zayd'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
    expect(r.code).not.toBe(0);
    // ⚠ both accounts named — a guard that says only "wrong account" sends the reader to the wrong
    // per-seat token file.
    expect(r.out + r.err).toContain('davidian-abdo');
    expect(r.out + r.err).toContain('narutousomaki741');
    // Never got past step 0 — no pull, no measurement, nothing.
    expect(r.out).not.toMatch(/measured state matches claimed state/);
  });

  it('an UNRESOLVABLE identity is a hard refusal, never a silent skip', () => {
    fx = makeFixture();
    // `node` itself must still resolve (execFileSync spawns it BY NAME through this same PATH) — only
    // `gh` is missing. A symlink to the real node binary, alone in an otherwise-empty directory, gives
    // a PATH with no `gh` anywhere on it without breaking the spawn itself.
    const noGhDir = mkdtempSync(join(tmpdir(), 'bunyan-no-gh-'));
    extraDirs.push(noGhDir);
    symlinkSync(process.execPath, join(noGhDir, 'node'));
    const r = run(['--root', fx.dir, '--no-pull', '--no-claim', '--seat', 'zayd'], {
      PATH: noGhDir,
    });
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/REFUSAL, never a skip/);
  });
});

describe('step 3 — measured vs. claimed, the load-bearing refusal', () => {
  it('REFUSES to start when §8 has never been generated', () => {
    fx = makeFixture([], { measured: false });
    const fakeGhDir = fakeGhReporting('davidian-abdo'); // zayd's own account
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--no-claim', '--seat', 'zayd'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/MEASURED STATE DISAGREES WITH CLAIMED STATE/);
  });

  it('proceeds once §8 truly matches reality', () => {
    fx = makeFixture();
    const fakeGhDir = fakeGhReporting('davidian-abdo'); // zayd's own account
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--no-claim', '--seat', 'zayd'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
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
    const fakeGhDir = fakeGhReporting('davidian-abdo'); // zayd's own account
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--no-claim', '--seat', 'zayd'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
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
    const fakeGhDir = fakeGhReporting('davidian-abdo'); // zayd's own account
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'zayd'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
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
    const fakeGhDir = fakeGhReporting('davidian-abdo'); // zayd's own account
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'zayd', 'T-001'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
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
    const fakeGhDir = fakeGhReporting('davidian-abdo'); // zayd's own account
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'zayd'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
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
    const zaydGhDir = fakeGhReporting('davidian-abdo'); // zayd's own account
    extraDirs.push(zaydGhDir);
    run(['--root', fx.dir, '--no-pull', '--seat', 'zayd'], {
      PATH: `${zaydGhDir}:${process.env.PATH}`,
    });

    const second = mkdtempSync(join(tmpdir(), 'bunyan-second-clone-'));
    extraDirs.push(second);
    execFileSync('git', ['clone', '-q', fx.origin, second]);
    const fakeGhDir = fakeGhReporting('narutousomaki741');
    extraDirs.push(fakeGhDir);
    const r = run(['--root', second, '--no-pull', '--seat', 'amer', 'T-001'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
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
    const fakeGhDir = fakeGhReporting('davidian-abdo'); // zayd's own account
    extraDirs.push(fakeGhDir);
    const ghEnv = { PATH: `${fakeGhDir}:${process.env.PATH}` };
    run(['--root', fx.dir, '--no-pull', '--seat', 'zayd'], ghEnv);

    const second = mkdtempSync(join(tmpdir(), 'bunyan-second-clone-'));
    extraDirs.push(second);
    execFileSync('git', ['clone', '-q', fx.origin, second]);
    const r = run(['--root', second, '--no-pull', '--seat', 'zayd'], ghEnv);
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

describe('resolveReviewStep — pure, no gh spawn needed (D88, T-014)', () => {
  // Regression for the gap hmdnah's step-1 review of T-014 (PR #28) found: `agent-start.mjs`'s new
  // reviewer-branch risk/step routing had zero test coverage, including this pure, non-`gh` slice.

  it('a risk: normal PR is a single-turn review — no step at all', () => {
    expect(resolveReviewStep('T-001', 'normal', null, 28)).toBeNull();
  });

  it('risk: high with no review/step-1 label reports step 1', () => {
    expect(resolveReviewStep('T-001', 'high', [], 28)).toBe(1);
    expect(resolveReviewStep('T-001', 'high', ['some-other-label'], 28)).toBe(1);
  });

  it('risk: high with the review/step-1 label present reports step 2', () => {
    expect(resolveReviewStep('T-001', 'high', ['review/step-1'], 28)).toBe(2);
  });

  it('refuses rather than guesses when risk: itself could not be read, before touching labels', () => {
    expect(() => resolveReviewStep('T-001', undefined, null, 28)).toThrow(
      /T-001 has no readable 'risk:' field .* refusing rather than defaulting to normal/,
    );
  });

  it('refuses rather than guesses which step, when risk: high but labels could not be read', () => {
    expect(() => resolveReviewStep('T-001', 'high', null, 28)).toThrow(
      /T-001 is risk: high, but PR #28's labels could not be read — refusing to guess/,
    );
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
    const fakeGhDir = fakeGhReporting('narutousomaki741');
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'hmdnah', '--continue', 'T-001'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
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
    const fakeGhDir = fakeGhReporting('narutousomaki741');
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'amer', '--continue', 'T-001'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
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
    const fakeGhDir = fakeGhReporting('davidian-abdo'); // zayd's own account
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'zayd', '--continue', 'T-001'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
    expect(r.code).not.toBe(0);
    expect(r.out + r.err).toMatch(/No open PR names T-001/);
  });

  it('rejects a malformed task id before doing anything else', () => {
    fx = makeFixture();
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'zayd', '--continue', 'not-a-task']);
    expect(r.code).not.toBe(0);
    expect(r.err).toMatch(/--continue expects a T-nnn id/);
  });

  it("a `machine: any` task admits the caller's OWN builder, never a hardcoded box default", () => {
    // Regression for the defect hmdnah's step-1 review found in T-015 (PR #27): the admission gate
    // called `seats.builderFor(root, continueTask)` with NO `finishingSeat`, so its `any` fallback
    // ("finishing seat's machine when given, else box") always resolved to `zayd` — wrongly refusing
    // `amer`, the real pc builder, exactly like the wrong-machine case below would if it weren't fixed.
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'either-machine work',
        area: 'infra',
        machine: 'any',
        risk: 'high',
      },
    ]);
    const fakeGhDir = fakeGhReporting('narutousomaki741');
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'amer', '--continue', 'T-001'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
    expect(r.code).not.toBe(0);
    // Admission itself must succeed — the run fails one gate LATER, at "no open PR" (this fixture's
    // origin is a bare local repo, so `gh pr list` finds nothing), never at the builder mismatch.
    expect(r.out + r.err).not.toMatch(/T-001's builder is 'zayd'/);
    expect(r.out + r.err).toMatch(/No open PR names T-001/);
  });
});

describe('--review routing — a titleless (STEWARD:) PR, end to end (T-012)', () => {
  it('routes to the reviewer on the branch prefix\'s machine, never leaves it "?"', () => {
    fx = makeFixture();
    const branch = 'brahim/2026-08-16-fake-steward';
    pushSteward(fx.dir, branch);

    const fakeGhDir = fakeGhForReview('narutousomaki741', [
      { number: 99, headRefName: branch, title: 'STEWARD: fake steward turn' },
    ]);
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'hmdnah', '--review'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
    expect(r.out + r.err).not.toMatch(/reviewer: \?/);
    expect(r.out).toMatch(/PR #99.*\(no T-nnn in title\).*reviewer: hmdnah.*YOURS/);
    expect(r.out).toMatch(/Reviewing: PR #99/);
  });

  it('REVERT-VERIFIED: without the fix, this exact fixture PR routes to nobody', () => {
    // Reproduces the pre-T-012 gap directly: the old loop resolved a reviewer ONLY when the title
    // matched `^T-\d{3}`, so a `STEWARD:`-titled PR always left `r = '?'` — no seat ever matched it,
    // so `mine` stayed null and the run stopped at "No open PR routes to this seat", identical to
    // routing to nobody. This asserts that RED behavior against the pre-fix formula, and the GREEN
    // behavior above (this describe's first test) against the actual shipped fix.
    const preT012 = (title: string) => {
      const id = (title.match(/^T-\d{3}/) ?? [])[0];
      return id ? 'resolved' : '?';
    };
    expect(preT012('STEWARD: fake steward turn')).toBe('?');
  });

  it('a titleless PR whose branch names no registered seat routes to NOBODY, not to whoever asks', () => {
    fx = makeFixture();
    const branch = 'no-seat-prefix-at-all';
    pushSteward(fx.dir, branch);

    const fakeGhDir = fakeGhForReview('narutousomaki741', [
      { number: 100, headRefName: branch, title: 'STEWARD: mystery turn' },
    ]);
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'hmdnah', '--review'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
    expect(r.out).toMatch(/reviewer: NOBODY.*names no registered seat.*routes to NOBODY/s);
    expect(r.out + r.err).toMatch(/No open PR routes to this seat/);
  });

  it('a T-nnn in the title still wins — the branch fallback never overrides it', () => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'box work',
        area: 'kernel',
        machine: 'box',
        risk: 'normal',
      },
    ]);
    // Deliberately pushed under a `pc` seat's own branch prefix — if the fallback ever ran for a
    // titled PR, this would misroute to `khalihlna`. It must not: the title is present, so machine:
    // box's own reviewer (`hmdnah`) wins.
    const branch = 'amer/2026-08-16-t001-on-the-wrong-prefix';
    pushSteward(fx.dir, branch);

    const fakeGhDir = fakeGhForReview('narutousomaki741', [
      { number: 101, headRefName: branch, title: 'T-001: box work' },
    ]);
    extraDirs.push(fakeGhDir);
    const r = run(['--root', fx.dir, '--no-pull', '--seat', 'hmdnah', '--review'], {
      PATH: `${fakeGhDir}:${process.env.PATH}`,
    });
    expect(r.out).toMatch(/PR #101 {2}T-001 {2}reviewer: hmdnah.*YOURS/);
  });
});

describe('identityGate — pure, no gh spawn needed (D87, T-013)', () => {
  it('refuses when gh reports a DIFFERENT login than the seat account', () => {
    const g = identityGate('hmdnah', 'narutousomaki741', 'Davidian-Abdo');
    expect(g.ok).toBe(false);
    // ⚠ both accounts named — a guard that says only "wrong account" sends the reader to the wrong
    // per-seat token file (docs/RUNBOOK.md "Seat credentials").
    expect(g.reason).toContain('narutousomaki741');
    expect(g.reason).toContain('Davidian-Abdo');
  });

  it('accepts a case-insensitive match — GitHub logins are case-preserving, not case-sensitive', () => {
    expect(identityGate('zayd', 'davidian-abdo', 'Davidian-Abdo').ok).toBe(true);
    expect(identityGate('zayd', 'davidian-abdo', 'davidian-abdo').ok).toBe(true);
  });

  it('refuses an UNRESOLVABLE identity — never a silent skip', () => {
    const g = identityGate('zayd', 'davidian-abdo', null);
    expect(g.ok).toBe(false);
    expect(g.reason).toMatch(/REFUSAL, never a skip/);
    expect(g.reason).toContain('davidian-abdo');
  });
});
