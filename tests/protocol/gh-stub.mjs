// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * A `gh` stand-in, shared by `agent-start.test.ts` and `agent-finish.test.ts` (T-026) — both scripts'
 * identity guard (`identityGate`, D87/T-013) means every spawn of either now checks `gh api user`, and
 * THIS box's real `gh` is authenticated as exactly one account for the whole suite (`davidian-abdo`,
 * matching `zayd`/`brahim`/`khalihlna`). A test that exercises `hmdnah`/`amer` (`narutousomaki741`)
 * needs a `gh` reporting THAT login instead — a stand-in on `BUNYAN_GH_CMD` ahead of the real one,
 * forwarding every other subcommand unchanged, rather than a bypass flag inside the guard itself
 * (which would be the exact skip T-013 exists to close). One copy of this so the two suites cannot
 * disagree about what a fake `gh` does (AGENTS.md §7.2).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** As plain Node source (CommonJS — the temp dir carries no `package.json` to make it otherwise),
 * spawned as `[node, scriptPath]` via `BUNYAN_GH_CMD` (`scripts/seats.mjs#ghSpawn` reads it).
 * PATH-shadowing a bare `gh` never worked on Windows (no `PATH`/`PATHEXT` search the way a POSIX
 * `execvp` does), and a `.cmd`/`.bat` wrapper doesn't either — Node refuses to spawn one at all
 * without `shell: true` since CVE-2024-27980. `node.exe` is a real executable either platform can run
 * directly with no shell, so it — not a shell script — is the thing actually invoked. */
function writeGhStandin(dir, body) {
  writeFileSync(join(dir, 'gh.cjs'), body);
}

/** The `BUNYAN_GH_CMD` value naming the stand-in `writeGhStandin` wrote into `dir`. */
export function ghCmdIn(dir) {
  return JSON.stringify([process.execPath, join(dir, 'gh.cjs')]);
}

/** A `gh` stand-in reporting `login` for `gh api user`, and forwarding every other subcommand to the
 * REAL `gh` unchanged. Directory is the caller's to clean up. */
export function fakeGhReporting(login) {
  const realGh = execFileSync(process.platform === 'win32' ? 'where' : 'which', ['gh'], {
    encoding: 'utf8',
  })
    .trim()
    .split(/\r?\n/)[0];
  const dir = mkdtempSync(join(tmpdir(), 'bunyan-fake-gh-'));
  writeGhStandin(
    dir,
    `const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
if (args[0] === 'api' && args[1] === 'user') {
  console.log(${JSON.stringify(login)});
  process.exit(0);
}
const r = spawnSync(${JSON.stringify(realGh)}, args, { stdio: 'inherit' });
process.exit(r.status ?? 1);
`,
  );
  return dir;
}

/** Like `fakeGhReporting`, but also stubs `gh pr list`/`pr comment`/`pr checkout` so a reviewer
 * ROUTING LOOP (T-012) can be exercised end to end without ever touching real GitHub or ambient `gh`
 * auth — the same hermetic-stub reasoning as `fakeGhReporting`'s own header, applied to the review
 * path. `pr checkout` is real `git` against the caller's fixture, resolving each PR number to the
 * branch the caller already pushed there. */
export function fakeGhForReview(login, prs) {
  const realGh = execFileSync(process.platform === 'win32' ? 'where' : 'which', ['gh'], {
    encoding: 'utf8',
  })
    .trim()
    .split(/\r?\n/)[0];
  const dir = mkdtempSync(join(tmpdir(), 'bunyan-fake-gh-review-'));
  const checkoutMap = JSON.stringify(
    Object.fromEntries(prs.map((pr) => [String(pr.number), pr.headRefName])),
  );
  writeGhStandin(
    dir,
    `const { spawnSync, execFileSync } = require('node:child_process');
const args = process.argv.slice(2);
if (args[0] === 'api' && args[1] === 'user') {
  console.log(${JSON.stringify(login)});
  process.exit(0);
}
if (args[0] === 'pr' && args[1] === 'list') {
  console.log(${JSON.stringify(JSON.stringify(prs))});
  process.exit(0);
}
if (args[0] === 'pr' && args[1] === 'comment') {
  process.exit(0);
}
if (args[0] === 'pr' && args[1] === 'checkout') {
  const map = ${checkoutMap};
  const ref = map[args[2]];
  if (!ref) process.exit(1);
  try { execFileSync('git', ['fetch', '-q', 'origin', ref], { stdio: 'ignore' }); } catch {}
  try {
    execFileSync('git', ['checkout', '-q', ref], { stdio: 'ignore' });
  } catch {
    execFileSync('git', ['checkout', '-q', '-b', ref, 'origin/' + ref], { stdio: 'ignore' });
  }
  process.exit(0);
}
const r = spawnSync(${JSON.stringify(realGh)}, args, { stdio: 'inherit' });
process.exit(r.status ?? 1);
`,
  );
  return dir;
}
