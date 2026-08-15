/**
 * A throwaway git repository shaped enough for `scripts/{seats,agent-start,agent-finish,state}.mjs`
 * to run against via `--root`, exactly the reason mdo's own `agent-start.sh --root`/`--no-pull` exist:
 * a test cannot assert "the script refuses a claim already held by another seat" against the LIVE
 * repository — it would have to push a real claim to it.
 *
 * ⚠ `frozen-surface.mjs`'s `buildSurface()` reads every `WATCHED` path with no existence guard, so a
 * bare fixture with no `packages/` tree crashes `state.mjs` outright — not a defect this fixture is
 * responsible for fixing, just a fact it has to work around. Every `WATCHED` path gets a trivial stub.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { WATCHED } from '../../scripts/frozen-surface.mjs';

function git(args, cwd) {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

const SEATS_TABLE = `# Seats — the registry

<!-- BEGIN SEATS -->

| Seat | Role | Machine | GitHub account | Prompt |
|---|---|---|---|---|
| brahim | steward | box | davidian-abdo | Brahim_Prompt.md |
| zayd | builder | box | davidian-abdo | Zayd_Prompt.md |
| hmdnah | reviewer | box | narutousomaki741 | Hmdnah_Prompt.md |
| amer | builder | pc | narutousomaki741 | Amer_Prompt.md |
| khalihlna | reviewer | pc | davidian-abdo | Khalihlna_Prompt.md |

<!-- END SEATS -->
`;

function backlogSrc(rows) {
  // ⚠ PADDED, because prettier pads every markdown table to its widest cell and `docs/BACKLOG.md` is
  // formatted. An unpadded fixture is a table shape the real file never has — which is how the status
  // regexes shipped matching `| ready |` while the committed file said `| ready   |`.
  const pad = (v, w) => String(v).padEnd(w);
  const w = (f, min) => Math.max(min, ...rows.map((r) => String(r[f] ?? '—').length));
  const [wi, ws] = [w('id', 2), w('status', 6)];
  const table = rows
    .map(
      (r) =>
        `| ${pad(r.id, wi)} | ${pad(r.status, ws)} | ${r.title} | ${r.area} | ${r.machine} | ${r.risk} | ${r.dependsOn ?? '—'} |`,
    )
    .join('\n');
  const entries = rows
    .map(
      (r) => `
### ${r.id} — ${r.title}

- implements: fixture
- verify: \`echo ok\`
- done-when: it is done
- depends-on: ${r.dependsOn ?? '—'}
- area: ${r.area} · machine: **${r.machine}** · risk: **${r.risk}**
`,
    )
    .join('\n');
  return `# BACKLOG\n\n| ID | Status | Task | Area | Machine | Risk | Depends on |\n|---|---|---|---|---|---|---|\n${table}\n${entries}\n`;
}

const CURRENT_STATE = (extraAbstract = '') => `# Fixture — current_state.md

## §0b — Live claim (this branch)

<!-- BEGIN BATON — written by agent-start.mjs; pushed before work begins -->

*(no live claim on this branch)*

<!-- END BATON -->

## §7 — Entry abstracts (newest 10)

${extraAbstract}### 1 | 2026-01-01 | zayd | the fixture's own genesis entry

- **CHANGED:** nothing real, this is a fixture.
- **VERIFIED:** n/a
- **FOUND:** n/a
- **OWES:** n/a
- **RISK:** additive
- **FULL:** \`handoff/zayd/2026-01-01-genesis.md\`
- **REVIEW:** pre-dates the PR flow.

## §8 — Generated

<!-- BEGIN GENERATED — written by \`pnpm state\`. Never hand-edit. -->

(not yet generated)

<!-- END GENERATED -->
`;

/**
 * Build a fixture repo with an `origin` (a second bare repo) already configured, `main` checked out,
 * and every WATCHED frozen-surface path stubbed so `state.mjs` does not crash reading it.
 *
 * `rows` — backlog task rows (see `backlogSrc`).
 *
 * `measured` (default `true`) — `main`'s genesis commit carries a REAL, self-consistent §8, computed
 * by actually running `state.mjs` before the first commit — mirroring the invariant every real `main`
 * has (`agent-finish.mjs` regenerates and commits §8 before a PR can even be opened, so `main` is never
 * stale). Pass `false` only to test the un-measured state itself (§8 still says "not yet generated").
 *
 * Returns `{ dir, origin, cleanup() }`.
 */
export function makeFixture(rows = [], { measured = true } = {}) {
  const origin = mkdtempSync(join(tmpdir(), 'bunyan-fixture-origin-'));
  git(['init', '-q', '--bare', '-b', 'main'], origin);

  const dir = mkdtempSync(join(tmpdir(), 'bunyan-fixture-'));
  git(['init', '-q', '-b', 'main'], dir);
  git(['config', 'user.email', 'fixture@test'], dir);
  git(['config', 'user.name', 'fixture'], dir);
  git(['remote', 'add', 'origin', origin], dir);

  mkdirSync(join(dir, 'docs/seats'), { recursive: true });
  writeFileSync(join(dir, 'docs/seats/README.md'), SEATS_TABLE);
  writeFileSync(join(dir, 'docs/BACKLOG.md'), backlogSrc(rows));
  writeFileSync(join(dir, 'current_state.md'), CURRENT_STATE());
  for (const rel of WATCHED) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), 'export {};\n');
  }
  mkdirSync(join(dir, 'handoff/zayd'), { recursive: true });
  writeFileSync(join(dir, 'handoff/zayd/2026-01-01-genesis.md'), '# genesis\n');

  if (measured) {
    const stateScript = fileURLToPath(new URL('../../scripts/state.mjs', import.meta.url));
    execFileSync('node', [stateScript, '--root', dir], { stdio: 'ignore' });
  }

  git(['add', '-A'], dir);
  git(['commit', '-q', '-m', 'fixture: genesis'], dir);
  git(['push', '-q', '-u', 'origin', 'main'], dir);

  return {
    dir,
    origin,
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
      rmSync(origin, { recursive: true, force: true });
    },
  };
}

export { WATCHED };
