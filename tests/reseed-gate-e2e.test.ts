// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ THE RE-SEED GATE, ACTUALLY EXECUTED — the half `reseed-gate.test.ts` cannot reach.
 *
 * That file tests the gate's *helpers* (which paths are geometry, which payloads moved) and it is
 * exactly the shape of check this repo trusts least on its own: **every one of them can be green
 * while the gate itself never runs.** That is not a hypothetical here. Entry 73 found that
 * `check-reseed.mjs` had **never once executed its real path in 73 entries** — `actions/checkout`
 * shallow-clones, so its `base...head` diff died, and with no PR in the repo it had only ever taken
 * the *"not a pull request — skipping"* branch. A gate nobody had opened, passing every build.
 *
 * ⇒ So this file BUILDS A THROWAWAY GIT REPOSITORY, commits the scenarios the gate exists to judge,
 * and runs `node scripts/check-reseed.mjs` against it with `BASE_REF`/`HEAD_REF` set exactly as the
 * workflow sets them. It asserts the EXIT CODE, which is the only thing CI reads. Everything between
 * the helpers and the exit code — the `git ls-tree`/`git show` reads, the commit-message scan, the
 * order of the two failure paths — is covered only here.
 *
 * ⚠ It costs about a second and it needs `git`, which CI and both boxes have.
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const GATE = join(ROOT, 'scripts/check-reseed.mjs');

let repo: string;
let base: string;

/** A golden file with a settable clock and a settable VALUE — the two things the gate distinguishes. */
const golden = (seededAt: string, volume: number): string =>
  `${JSON.stringify(
    {
      $schema: 'bunyan.goldens.v1',
      seededAt,
      env: { ocpVersion: '7.9.3.1.1' },
      cases: [{ case: 'box-wall', volume }],
    },
    null,
    2,
  )}\n`;

const git = (...args: string[]): string =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();

const write = (rel: string, text: string): void => {
  mkdirSync(join(repo, rel, '..'), { recursive: true });
  writeFileSync(join(repo, rel), text);
};

const commit = (message: string): void => {
  git('add', '-A');
  git('commit', '-q', '--allow-empty', '-m', message);
};

/** Run the real gate exactly as `.github/workflows/ci.yml` does. Returns its exit code + output. */
const runGate = (): { code: number; out: string } => {
  try {
    const out = execFileSync('node', [GATE], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, BASE_REF: base, HEAD_REF: git('rev-parse', 'HEAD') },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

/** Reset the working repo to the base commit, so each scenario is independent. */
const resetToBase = (): void => {
  git('reset', '-q', '--hard', base);
};

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), 'bunyan-reseed-'));
  // The gate resolves its imports relative to itself, so the two helpers travel with it.
  mkdirSync(join(repo, 'scripts'), { recursive: true });
  for (const f of ['check-reseed.mjs', 'reseed-paths.mjs', 'reseed-payload.mjs']) {
    copyFileSync(join(ROOT, 'scripts', f), join(repo, 'scripts', f));
  }
  git('init', '-q', '.');
  git('config', 'user.email', 'gate@test');
  git('config', 'user.name', 'gate');
  // A geometry-producing file the real GEOMETRY_PATHS list matches, and a committed golden.
  write('tools/kernel-build/src/kernel.cpp', 'int main() { return 0; }\n');
  write('tests/goldens/geometry.golden.json', golden('2026-08-01T00:00:00Z', 1500));
  commit('base');
  base = git('rev-parse', 'HEAD');
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('the re-seed gate, run for real against a git history', () => {
  it('passes a PR that touches no geometry at all', () => {
    resetToBase();
    write('README.md', 'docs only\n');
    commit('docs');
    const { code, out } = runGate();
    expect(out).toMatch(/no geometry touched/);
    expect(code).toBe(0);
  });

  it('REFUSES geometry with no re-seed at all — the original rule, still enforced', () => {
    resetToBase();
    write('tools/kernel-build/src/kernel.cpp', 'int main() { return 1; }\n');
    commit('kernel change, no re-seed');
    const { code, out } = runGate();
    expect(out).toMatch(/no goldens were re-seeded/);
    expect(code).toBe(1);
  });

  /**
   * ⚠⚠ Q16 ITSELF, AND IT IS ENTRY 79'S DIFF REPRODUCED: a geometry-path change, goldens re-seeded,
   * and every value byte-identical — the file's only change is the clock. The gate used to PASS this,
   * which meant it could not distinguish *"re-seeded, values unchanged"* from *"re-seeded, values
   * MOVED, nobody looked."*
   */
  it('⚠⚠ REFUSES a re-seed that moved nothing but the timestamp', () => {
    resetToBase();
    write('tools/kernel-build/src/kernel.cpp', 'int main() { return 1; }\n');
    write('tests/goldens/geometry.golden.json', golden('2026-08-05T12:00:00Z', 1500));
    commit('re-seeded, timestamp only');
    const { code, out } = runGate();
    expect(out).toMatch(/NOT ONE VALUE MOVED/);
    expect(code).toBe(1);
  });

  it('…and ACCEPTS the same diff once the author confirms it in a commit message', () => {
    resetToBase();
    write('tools/kernel-build/src/kernel.cpp', 'int main() { return 1; }\n');
    write('tests/goldens/geometry.golden.json', golden('2026-08-05T12:00:00Z', 1500));
    commit('re-seeded, timestamp only');
    commit('confirm\n\nRe-seed-unchanged: relinked byte-for-byte on the pinned digest');
    const { code, out } = runGate();
    expect(out).toMatch(/CONFIRMED by the author/);
    // ⚠ The reason is quoted back into the log, so a reviewer reads the claim rather than a checkmark.
    expect(out).toMatch(/relinked byte-for-byte on the pinned digest/);
    expect(code).toBe(0);
  });

  it('accepts a real re-seed with NO confirmation needed — a moved value speaks for itself', () => {
    resetToBase();
    write('tools/kernel-build/src/kernel.cpp', 'int main() { return 1; }\n');
    write('tests/goldens/geometry.golden.json', golden('2026-08-05T12:30:00Z', 1501));
    commit('real re-seed, value moved');
    const { code, out } = runGate();
    expect(out).toMatch(/golden VALUES moved/);
    expect(code).toBe(0);
  });

  it('⚠ still skips when there is no BASE_REF — a push build is not a PR', () => {
    // The branch the gate spent 73 entries in. It must stay reachable, and it must stay silent.
    const out = execFileSync('node', [GATE], {
      cwd: repo,
      encoding: 'utf8',
      env: { ...process.env, BASE_REF: '', HEAD_REF: '' },
    });
    expect(out).toMatch(/no BASE_REF \(not a pull request\) — skipping/);
  });
});
