#!/usr/bin/env node
/**
 * `pnpm state` — REGENERATE THE MACHINE-KNOWABLE FACTS.
 *
 * ⚠⚠ WHY. Before 2026-07-31 every one of these was typed by hand into prose and could drift silently:
 * `613 green` · `all five gates 0` · `21 ops + 3 reserved` · `51 types · 39 commands · 1 codec · 0 views`
 * · `SCENE_SCHEMA_VERSION 2` · the FRESH entry number in BOTH prompt files.
 *
 * The `registries` line matters most. Counting what is actually registered — **51 types, 39 commands,
 * 1 codec (inside a test), 0 views** — is what exposed domain rule 5 as half-false: two of the four
 * registries carried no behaviour and nothing dispatched through either, and a freeze-gate row had
 * been discharged on the assumption that they did. That count happened ONCE, during a sweep. Now it
 * happens every session.
 *
 * ⚠ WHAT IT WRITES, AND NOTHING ELSE:
 *   - `current_state.md`  §8, between the GENERATED markers
 *   - `<Agent>_Prompt.md` §2 FRESH block, for the RUNNING agent only — never the other's.
 *     (One writer per file. Two parallel sessions used to overwrite each other's FRESH silently.)
 *
 * Usage:
 *   pnpm state                 infer the agent from the git branch (zayd/… or amer/…)
 *   pnpm state --agent zayd    say it explicitly
 *   pnpm state --rebaseline    ALSO rewrite the frozen-surface baseline. ⚠ OWNER-GATED after the
 *                              freeze: re-baselining is what the freeze forbids.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSurface, diffSurface } from './frozen-surface.mjs';
import { parseAbstracts, MARKERS, BUDGET, entryBodies } from './docs-state.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1]?.startsWith('--') ? true : (argv[i + 1] ?? true)) : undefined;
};

const sh = (cmd, fallback = '') => {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
};

// ── git ──────────────────────────────────────────────────────────────────────────────────────────
const branch = sh('git rev-parse --abbrev-ref HEAD', '(unknown)');
const tip = sh('git log -1 --format=%h', '(unknown)');
const dirty = sh('git status --porcelain') !== '' ? 'dirty' : 'clean';
const baseRef = sh('git merge-base origin/main HEAD', '') || 'origin/main';
const diffStat = sh(`git diff --shortstat ${baseRef}`) || '(no diff vs origin/main)';
const diffFiles = sh(`git diff --name-only ${baseRef}`).split('\n').filter(Boolean).length;

// ── gh (degrades cleanly when unauthenticated: the PR flow still works via the web UI) ───────────
const ghAuthed = sh('gh auth status 2>&1 && echo OK').includes('OK');
const openPRs = ghAuthed
  ? sh('gh pr list --state open --json number,headRefName,title --limit 10') || '[]'
  : null;
let prLine = '⚠ gh not authenticated — run `gh auth login` (one-time, interactive)';
if (openPRs !== null) {
  try {
    const prs = JSON.parse(openPRs);
    prLine = prs.length
      ? prs.map((p) => `#${p.number} ${p.headRefName}`).join(' · ')
      : 'none — main is the tip of the work';
  } catch {
    prLine = '(gh returned unparseable output)';
  }
}

// ── the suite (written by `pnpm test`; see package.json) ─────────────────────────────────────────
let testLine = '⚠ not measured this session — run `pnpm verify`';
const summaryPath = join(ROOT, '.vitest-summary.json');
if (existsSync(summaryPath)) {
  try {
    const s = JSON.parse(readFileSync(summaryPath, 'utf8'));
    const total = s.numTotalTests ?? 0;
    const passed = s.numPassedTests ?? 0;
    // ⚠ `numTotalTestSuites` counts `describe` BLOCKS (206), not files. The file count is
    // `testResults.length` (78). Getting this backwards would put a wrong number in the very
    // block that exists to stop wrong numbers — §1c-9, measure the artifact, not the field name.
    const files = s.testResults?.length ?? 0;
    const suites = s.numTotalTestSuites ?? 0;
    testLine =
      passed === total
        ? `**${passed} green** · ${files} files · ${suites} suites`
        : `⚠⚠ ${passed}/${total} passing — **${total - passed} FAILING**`;
  } catch {
    /* leave the default */
  }
}

// ── the counts that make domain rule 5 checkable ─────────────────────────────────────────────────
//
// ⚠ EACH COUNT IS LABELLED FOR EXACTLY WHAT IT MEASURES, and that is not pedantry. The rule-5 sweep
// counted the RUNTIME registry (51 types — mostly test fixtures); these count the SHIPPED SOURCE.
// Two different denominators for the same noun is precisely how `current_state.md` §1c-8's ledger
// says a written-down number goes wrong, so the label travels with the number.
const readSrc = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : '');

/** Entries of a `const X = [ 'a', 'b' ] as const` array literal. */
const arrayEntries = (src, name) => {
  const m = src.match(new RegExp(`${name}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as const`));
  return m ? (m[1].match(/'[^']+'/g) ?? []).length : 0;
};

const opsSrc = readSrc('packages/protocol/src/ops.ts');
const opNames = arrayEntries(opsSrc, 'OP_NAMES');
const reserved = arrayEntries(opsSrc, 'RESERVED_OPS');
const ops = opNames - reserved;

/** Distinct declared ids in a source tree — the thing a registry will hold at runtime. */
const distinctIds = (src) => new Set(src.match(/id: '[a-z]+\.[a-zA-Z.]+'/g) ?? []).size;
const commands = distinctIds(readSrc('packages/document/src/commands.ts'));
const shippedTypes = distinctIds(
  ['wall.ts', 'opening.ts', 'curtainwall.ts', 'index.ts']
    .map((f) => readSrc(`packages/types/src/${f}`))
    .join('\n'),
);
const codecs = (readSrc('packages/document/src/bnn.ts').match(/:\s*FormatCodec\b/g) ?? []).length;

const schemaVersion =
  readSrc('packages/document/src/scene.ts').match(/SCENE_SCHEMA_VERSION\s*=\s*(\d+)/)?.[1] ?? '?';

// ── the frozen surface → RISK ────────────────────────────────────────────────────────────────────
const snapPath = join(ROOT, 'tests/frozen-surface.snapshot.json');
const current = buildSurface(ROOT);
let risk = 'additive';
let riskDetail = 'unchanged vs baseline';
if (existsSync(snapPath)) {
  const snap = JSON.parse(readFileSync(snapPath, 'utf8'));
  const d = diffSurface(snap.surface, current);
  const n = d.added.length + d.removed.length + d.changed.length;
  if (n > 0) {
    risk = 'contract-touching';
    riskDetail = `${n} declaration(s) moved — ${[...d.changed, ...d.removed, ...d.added].slice(0, 3).join(', ')}${n > 3 ? ' …' : ''}`;
  }
}
if (flag('rebaseline')) {
  const count = Object.values(current).reduce((n, d) => n + Object.keys(d).length, 0);
  const prev = existsSync(snapPath) ? JSON.parse(readFileSync(snapPath, 'utf8')) : {};
  writeFileSync(
    snapPath,
    JSON.stringify(
      {
        ...prev,
        _baselinedAt: new Date().toISOString().slice(0, 10),
        _declarationCount: count,
        surface: current,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `⚠ frozen-surface baseline REWRITTEN (${count} declarations). This is owner-gated after the freeze.`,
  );
  risk = 'additive';
  riskDetail = 're-baselined this session';
}

// ── the docs ─────────────────────────────────────────────────────────────────────────────────────
const csPath = join(ROOT, 'current_state.md');
let cs = readFileSync(csPath, 'utf8');
const abstracts = parseAbstracts(cs);
const newest = abstracts.reduce((a, b) => (a && a.n > b.n ? a : b), null);
const bodies = entryBodies(ROOT);
const size = (p) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p)).length : 0);
const kb = (n) => (n / 1024).toFixed(1);
const sec7Len = cs.slice(cs.indexOf('## §7'), cs.indexOf('## §8')).length;

const agent = (flag('agent') || (branch.startsWith('amer/') ? 'amer' : 'zayd')).toString();
const AgentName = agent[0].toUpperCase() + agent.slice(1);

// ── write §8 ─────────────────────────────────────────────────────────────────────────────────────
const generated = `
| | |
| --- | --- |
| **newest entry** | **${newest ? `${newest.n} (${newest.agent}, ${newest.date})` : '(none)'}** |
| branch · tip · tree | \`${branch}\` · \`${tip}\` · ${dirty} |
| open PRs | ${prLine} |
| suite | ${testLine} |
| protocol | ${ops} live ops · ${reserved} reserved (of ${opNames} declared) |
| shipped source | ${shippedTypes} \`BimObjectType\`s in \`@bunyan/types\` · ${commands} command ids in \`commands.ts\` · ${codecs} \`FormatCodec\` |
| schema | \`SCENE_SCHEMA_VERSION\` ${schemaVersion} |
| **frozen surface** | **RISK: ${risk}** — ${riskDetail} |
| diff vs origin/main | ${diffStat} (${diffFiles} files) |
| docs budget | current_state ${kb(size('current_state.md'))}/${kb(BUDGET.currentState)} KB · §7 ${kb(sec7Len)}/${kb(BUDGET.section7)} KB · abstracts ${abstracts.length}/${BUDGET.maxAbstracts} · bodies ${bodies.length} |

_Generated ${new Date().toISOString().slice(0, 10)} by \`pnpm state\`._
`;

const m = MARKERS.state;
if (!cs.includes(m.begin) || !cs.includes(m.end)) {
  console.error('✖ current_state.md is missing its GENERATED markers.');
  process.exit(1);
}
cs =
  cs.slice(0, cs.indexOf(m.begin) + m.begin.length) +
  '\n' +
  generated +
  '\n' +
  cs.slice(cs.indexOf(m.end));
writeFileSync(csPath, cs);

// ── write THIS agent's FRESH, and only this agent's ──────────────────────────────────────────────
const promptPath = join(ROOT, `${AgentName}_Prompt.md`);
if (existsSync(promptPath)) {
  let p = readFileSync(promptPath, 'utf8');
  const f = MARKERS.fresh;
  if (p.includes(f.begin) && p.includes(f.end)) {
    const fresh = `
\`\`\`
FRESH:  Newest entry in \`current_state.md\` §7 = **ENTRY ${newest?.n ?? '?'}**
        (${newest?.agent ?? '?'}, ${newest?.date ?? '?'}) — ${newest?.headline ?? ''}

        ⇒ After \`git pull\`: §8's "newest entry" == ${newest?.n ?? '?'}  ⇒ you are current, start TASK.
          HIGHER than ${newest?.n ?? '?'} ⇒ the other agent has merged: read every abstract after
          ${newest?.n ?? '?'} before starting, and re-check that TASK is still the right thing to do.

        ⚠⚠ THIS LINE NEVER PINS A COMMIT HASH, AND CANNOT. A commit's SHA is a hash of its own
        content, so any hash written in this file can only ever name an EARLIER commit than the
        one carrying it. A hash match is a check that CANNOT PASS. **The entry number is the
        check** — it moves only when real work lands. (Git answers "what is the tip?"; this
        answers "am I behind?", which git cannot.)

        Tree at generation: \`${branch}\` · \`${tip}\` · ${dirty} · RISK: ${risk}
\`\`\`
`;
    p =
      p.slice(0, p.indexOf(f.begin) + f.begin.length) +
      '\n' +
      fresh +
      '\n' +
      p.slice(p.indexOf(f.end));
    writeFileSync(promptPath, p);
  }
}

console.log(`✔ current_state.md §8 and ${AgentName}_Prompt.md FRESH regenerated.`);
console.log(`  newest entry ${newest?.n} · RISK: ${risk} · ${testLine}`);
if (risk === 'contract-touching') {
  console.log('  ⚠⚠ contract-touching ⇒ the OWNER merges this PR, not the reviewing agent.');
}
