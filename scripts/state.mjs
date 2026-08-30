// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `pnpm state` — REGENERATE THE MACHINE-KNOWABLE FACTS.
 *
 * ⚠⚠ WHY. Before 2026-07-31 every one of these was typed by hand into prose and could drift silently:
 * `613 green` · `all five gates 0` · `21 ops + 3 reserved` · `51 types · 39 commands · 1 codec · 0 views`
 * · `SCENE_SCHEMA_VERSION 2` · the FRESH entry number in both prompt files (that last one, ⚠ AS OF
 * ENTRY 91, no longer exists — see below).
 *
 * The `registries` line matters most. Counting what is actually registered — **51 types, 39 commands,
 * 1 codec (inside a test), 0 views** — is what exposed domain rule 5 as half-false: two of the four
 * registries carried no behaviour and nothing dispatched through either, and a freeze-gate row had
 * been discharged on the assumption that they did. That count happened ONCE, during a sweep. Now it
 * happens every session.
 *
 * ⚠ WHAT IT WRITES, AND NOTHING ELSE: `current_state.md` §8, between the GENERATED markers.
 *
 * ⚠⚠ SUPERSEDED 2026-08-14 (D82, Entry 91): this used to ALSO rewrite `<Agent>_Prompt.md`'s §2 FRESH
 * block, for the running agent only. Prompt files are now fully stateless (`docs/BACKLOG.md` is the
 * only "what's next" source), so there is nothing left to write there — `scripts/agent-start.mjs`'s
 * measured-vs-claimed refusal answers "am I current?" instead, which is a script REFUSING a turn on
 * disagreement rather than a session reading a number and deciding whether to trust it.
 *
 * Usage:
 *   pnpm state                 measure and write §8
 *   pnpm state --check-only    measure, compare against the COMMITTED §8, exit 1 on disagreement.
 *                              Writes nothing — this is what `agent-start.mjs` runs (Entry 91).
 *   pnpm state --rebaseline    ALSO rewrite the frozen-surface baseline. ⚠ OWNER-GATED after the
 *                              freeze: re-baselining is what the freeze forbids. Incompatible with
 *                              `--check-only`, which never writes.
 *
 * ⚠⚠ WHAT `--check-only` EXCUSES, AND WHY THOSE FIVE ROWS ONLY (Entry 91). §8 is compared row for
 * row EXCEPT `branch · tip · tree` (describes WHERE the measurement was taken, not what it found —
 * changes on every commit by construction), `open PRs` and `diff vs origin/main` (relative to a
 * moving target — other PRs open and close, and `origin/main` advances, with no change to THIS
 * commit's own content), `suite` (`.vitest-summary.json` is gitignored, so a fresh checkout has
 * either a stale local artifact or none at all — it is a point-in-time report, not a reproducible fact
 * of the committed tree), and `docs budget` (SELF-REFERENTIAL: its `current_state` figure is
 * `size('current_state.md')`, read from disk BEFORE this run's own §8 write lands there — so the
 * figure a write pass embeds always describes the file's size one generation before the write that
 * embeds it, and a second, independent measurement pass a moment later correctly sees a different,
 * larger number. Found BY this gate, on its own first real exercise — nothing before `--check-only`
 * existed had ever compared a committed block against a fresh one closely enough to notice). Every
 * other row is computed by static inspection of committed source alone (regex counts, the
 * frozen-surface hash) and is therefore held to full agreement — a row that drifts there is either
 * real drift or a hand-edited block, and both are exactly what this gate is for.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
// ⚠ Imported explicitly rather than taken as a global: `eslint` does not declare Node globals for
// `.mjs` here, so the bare `Buffer` is a lint error even though the runtime has it.
import { Buffer } from 'node:buffer';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineSnapshot, buildSurface, diffSurface } from './frozen-surface.mjs';
import {
  parseAbstracts,
  newestAbstract,
  riskVerdict,
  MARKERS,
  BUDGET,
  entryBodies,
  generatedBlock,
} from './docs-state.mjs';

const SELF_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? (argv[i + 1]?.startsWith('--') ? true : (argv[i + 1] ?? true)) : undefined;
};
const checkOnly = flag('check-only') !== undefined;
// ⚠ `--root` exists for the SAME reason `agent-start.sh --root` exists in mdo: a test cannot assert
// "the refusal fires on a mismatched block" against the live repository, only against a throwaway
// fixture tree. Nothing it enables weakens a check — every path below still runs in full against
// whatever root it was given.
const ROOT = flag('root') && typeof flag('root') === 'string' ? flag('root') : SELF_ROOT;

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
//
// ⚠⚠ THE DIFF IS MEASURED HERE AND THE BASELINE IS REWRITTEN LATER, AND THE ORDER IS THE FIX (Q15).
// `--rebaseline` overwrites the file this diff is measured against, so a verdict computed after it is
// trivially `additive` — which is what `pnpm state --rebaseline` used to print on the only kind of PR
// that ever runs it. The write now happens below, once `newest` is parsed, for the second half of the
// same defect: the baseline records WHICH ENTRY authorised it, and that number lives in §7.
//
// ⚠⚠ AND THE ORDERING ALONE WAS NOT ENOUGH — IT ONLY HELD FOR THE ONE INVOCATION CARRYING THE FLAG
// (found reviewing Entry 81, revert-verified by `tests/state-risk-e2e.test.ts`). The verdict was read
// out of the WORKING-TREE baseline, and `--rebaseline` had just rewritten that file, so the very next
// plain `pnpm state` measured the surface against itself and printed `additive` again — on a PR that
// had moved the freeze. Re-running `pnpm state` is not exotic: gate six wants it before every commit,
// and step 10(a) of the loop asks for it a second time explicitly. The LAST run is the one whose
// output lands in §8 and in `FRESH`, so the fixed run was the one being overwritten.
//
// ⇒ Measure against the baseline **as it exists on the branch this work merges into**, read from git
// rather than from the checkout. That answers the question a reviewer is actually routing on — *"does
// this PR move the frozen surface relative to what main has frozen?"* — and it cannot be erased by
// rewriting a file in the working tree, on this run or any later one. When the base baseline is
// unreadable (a fresh repo, an unfetched `origin/main`) it falls back to the checkout, which is the
// old behaviour. ⚠ It keys on `surface`, not on the file: correcting the baseline's own metadata (as
// Entry 81 did to `_baselinedAtEntry`) is not a contract change and must not be labelled as one.
const SNAP_REL = 'tests/frozen-surface.snapshot.json';
const snapPath = join(ROOT, SNAP_REL);
const current = buildSurface(ROOT);
const parseSnapshot = (text) => {
  try {
    const s = JSON.parse(text);
    return s && typeof s.surface === 'object' && s.surface !== null ? s : null;
  } catch {
    return null;
  }
};
const workingSnap = existsSync(snapPath) ? parseSnapshot(readFileSync(snapPath, 'utf8')) : null;
const baseSnap = parseSnapshot(sh(`git show ${baseRef}:${SNAP_REL}`, ''));
const against = baseSnap ?? workingSnap;
const moved = [];
if (against) {
  const d = diffSurface(against.surface, current);
  moved.push(...d.changed, ...d.removed, ...d.added);
}
// The baseline was rewritten by THIS PR if the flag says so now, or if a previous run already
// committed the rewrite — the second is what the flag alone could not see.
const baselineRewritten =
  baseSnap !== null &&
  workingSnap !== null &&
  Object.values(diffSurface(baseSnap.surface, workingSnap.surface)).some((l) => l.length > 0);
const rebaselining = flag('rebaseline') !== undefined && !checkOnly;
const {
  risk,
  label: riskLabel,
  detail: riskDetail,
} = riskVerdict(moved, rebaselining || baselineRewritten);

// ── the docs ─────────────────────────────────────────────────────────────────────────────────────
const csPath = join(ROOT, 'current_state.md');
let cs = readFileSync(csPath, 'utf8');
const abstracts = parseAbstracts(cs);
// ⚠ THROWS on an empty parse rather than writing `(none)` / `ENTRY ?` into main's prompt — see
// `newestAbstract` in `docs-state.mjs` for the failure it is standing in front of (Entry 80).
const newest = newestAbstract(abstracts);

// ⚠ THE REBASELINE WRITE, DELIBERATELY DOWN HERE. It needs `newest.key` — the entry whose ruling
// authorises this baseline — and the parse that produces it is above. `newestAbstract` throws on a
// failed parse, so a session that cannot read §7 does not get to rewrite the freeze baseline either.
// ⚠⚠ `.key`, NOT `.n`: `.n` is §7's array POSITION for a five-seat entry, so a baseline recording it
// re-resolved to whatever landed next (T-024).
if (rebaselining) {
  const prev = existsSync(snapPath) ? JSON.parse(readFileSync(snapPath, 'utf8')) : {};
  // ⚠⚠ BOTH FIELDS COME FROM THE SAME §7 PARSE, AND THE DATE USED TO COME FROM `new Date()`. The
  // baseline's gate cross-checks them against each other, so a clock-stamped date made every
  // rebaseline run outside the entry's own calendar day write a file its own gate rejects — see
  // `baselineSnapshot` and `tests/state-risk-e2e.test.ts`.
  const next = baselineSnapshot(prev, current, { entry: newest.key, at: newest.date });
  writeFileSync(snapPath, JSON.stringify(next, null, 2) + '\n');
  console.log(
    `⚠ frozen-surface baseline REWRITTEN (${next._declarationCount} declarations, entry ${next._baselinedAtEntry}). ` +
      'This is owner-gated after the freeze.',
  );
}
const bodies = entryBodies(ROOT);
// ⚠ NORMALISE CRLF BEFORE MEASURING, so §8 reports the same number the gate enforces. A CRLF working
// tree adds a byte per line (~920 to this file), and `tests/docs-budget.test.ts` measures what is
// COMMITTED — §8 quoting the checked-out size instead would disagree with the gate on Amer's box only.
const committed = (s) => s.replace(/\r\n/g, '\n');

/**
 * Write `text` back using the line ending the file ALREADY has.
 *
 * ⚠⚠ WITHOUT THIS, `pnpm state` LEAVES EVERY FILE IT TOUCHES FAILING `format:check` ON A CRLF BOX
 * (Entry 80). The generated blocks below are template literals, so they carry LF; splicing them into
 * a CRLF working file produces MIXED endings, and `.prettierrc`'s `endOfLine: "auto"` then infers the
 * dominant ending and rewrites them — which means step 8 (`pnpm state`) silently undoes step 7
 * (`prettier --write` → `pnpm verify`) and the loop's own ordering fails on Amer's machine only.
 *
 * ⚠ Nothing is committed differently either way (`core.autocrlf` normalises on the way in). This is
 * about the working tree, which is what the gates actually read.
 */
const withFileEol = (original, text) =>
  original.includes('\r\n') ? committed(text).replace(/\n/g, '\r\n') : text;
const size = (p) =>
  existsSync(join(ROOT, p))
    ? Buffer.byteLength(committed(readFileSync(join(ROOT, p), 'utf8')), 'utf8')
    : 0;
const kb = (n) => (n / 1024).toFixed(1);
const csLf = committed(cs);
const sec7Len = csLf.slice(csLf.indexOf('## §7'), csLf.indexOf('## §8')).length;

// ── write §8 ─────────────────────────────────────────────────────────────────────────────────────
const generated = `
| | |
| --- | --- |
| **newest entry** | **${newest.id} (${newest.seat}, ${newest.date})** |
| branch · tip · tree | \`${branch}\` · \`${tip}\` · ${dirty} |
| open PRs | ${prLine} |
| suite | ${testLine} |
| protocol | ${ops} live ops · ${reserved} reserved (of ${opNames} declared) |
| shipped source | ${shippedTypes} \`BimObjectType\`s in \`@bunyan/types\` · ${commands} command ids in \`commands.ts\` · ${codecs} \`FormatCodec\` |
| schema | \`SCENE_SCHEMA_VERSION\` ${schemaVersion} |
| **frozen surface** | **RISK: ${riskLabel}** — ${riskDetail} |
| diff vs origin/main | ${diffStat} (${diffFiles} files) |
| docs budget | current_state ${kb(size('current_state.md'))}/${kb(BUDGET.currentState)} KB · §7 ${kb(sec7Len)}/${kb(BUDGET.section7)} KB · abstracts ${abstracts.length}/${BUDGET.maxAbstracts} · bodies ${bodies.length} |

_Generated ${new Date().toISOString().slice(0, 10)} by \`pnpm state\`._
`;

const m = MARKERS.state;
if (!cs.includes(m.begin) || !cs.includes(m.end)) {
  console.error('✖ current_state.md is missing its GENERATED markers.');
  process.exit(1);
}

if (checkOnly) {
  // ⚠ Row-for-row against the COMMITTED block, excusing exactly the four rows the header names.
  // A table row is `| label | value |` — normalise by dropping the excused labels and trailing
  // whitespace, never by re-deriving structure the file itself already gives us.
  const EXCUSED = [
    'branch · tip · tree',
    'open PRs',
    'suite',
    'diff vs origin/main',
    'docs budget',
  ];
  const norm = (block) =>
    block
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+$/, ''))
      .filter((l) => l.startsWith('|') && !EXCUSED.some((label) => l.startsWith(`| ${label} `)))
      .join('\n');
  const claimedBlock = generatedBlock(cs, m.begin, m.end);
  const claimed = claimedBlock ? norm(claimedBlock.body) : null;
  const measured = norm(generated);
  if (claimed === null || claimed !== measured) {
    console.error('✖ MEASURED STATE DISAGREES WITH CLAIMED STATE — refusing.\n');
    console.error('  claimed (committed §8):');
    console.error((claimed ?? '  (no generated block at all)').replace(/^/gm, '    '));
    console.error('\n  measured (right now):');
    console.error(measured.replace(/^/gm, '    '));
    console.error(
      '\n  The repository is the authority, not the prose. Either the previous turn did not run\n' +
        '  `pnpm state` before committing, or someone hand-edited the generated block.\n' +
        '  Resolve by:  pnpm state   (rewrites the block from reality), then re-read `current_state.md`.',
    );
    process.exit(1);
  }
  console.log('✔ measured state matches claimed state.');
  process.exit(0);
}

cs =
  cs.slice(0, cs.indexOf(m.begin) + m.begin.length) +
  '\n' +
  generated +
  '\n' +
  cs.slice(cs.indexOf(m.end));
writeFileSync(csPath, withFileEol(readFileSync(csPath, 'utf8'), cs));

// ⚠⚠ THERE IS NO FRESH BLOCK TO WRITE, AS OF ENTRY 91 (D82's stateless-prompt decision).
// Every prompt file is now the four static facts only — no §2 DYNAMIC block, no per-agent FRESH
// marker, no "which entry is main on" tracking here. That question is answered by
// `scripts/agent-start.mjs`'s measured-vs-claimed refusal instead: it re-measures the repository and
// refuses to start a turn on any disagreement with what `current_state.md`'s own §8 claims, which is
// a strictly stronger guarantee than a session eyeballing a FRESH number and deciding whether to
// trust it. `MARKERS.fresh` stays exported (harmless, currently unused) rather than deleted outright,
// so a reader of `docs-state.mjs` mid-migration can still see what the retired mechanism looked like.

console.log(`✔ current_state.md §8 regenerated.`);
console.log(`  newest entry ${newest.id} (${newest.seat}) · RISK: ${riskLabel} · ${testLine}`);
if (risk === 'contract-touching') {
  console.log('  ⚠⚠ contract-touching ⇒ the OWNER merges this PR, not the reviewing agent.');
}
