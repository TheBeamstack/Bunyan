/**
 * THE FROZEN SURFACE — extraction and digest.
 *
 * ⚠⚠ WHAT THIS IS FOR. The P5 freeze is the one irreversible act in this project: after it a wrong
 * contract costs an amendment across three products (`.bnn` files in the field, Miqdar, Planitor).
 * Until 2026-07-31 "did this change touch a frozen shape?" was answered by an agent remembering to
 * ask — and this project's own ledger scores memory-enforced rules at NINE DIRTY OUT OF EIGHTEEN.
 *
 * So it is answered mechanically instead. Every declaration in the watched files below is extracted,
 * stripped of comments and whitespace, and hashed. `tests/freeze-boundary.test.ts` compares those
 * hashes to a committed baseline:
 *
 *     unchanged  ->  RISK: additive           ->  the reviewing agent merges the PR
 *     changed    ->  RISK: contract-touching  ->  the OWNER merges it (or rules, then re-baselines)
 *
 * ⚠ IT IS ALSO THE FREEZE MECHANISM ITSELF, available before the freeze. Freezing is now a policy
 * change — *"the baseline may no longer be updated without an owner ruling"* — with a machine holding
 * the line afterwards, rather than a sentence in a document that nothing enforces.
 *
 * ⚠ WHAT IT DOES AND DOES NOT CATCH. It compares DECLARATION TEXT, normalised. It catches an added,
 * removed, renamed or retyped member on any watched declaration — which is the whole class the freeze
 * is about. It deliberately IGNORES comments, so correcting a false comment on a frozen shape (Entry
 * 71 did exactly that, twice) is correctly NOT a contract change. It does NOT understand semantics:
 * widening a union by editing a type it references in an unwatched file would slip past. If you add a
 * frozen shape, add its file here.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

/** The files whose exported declarations freeze at P5. Adding a frozen shape? Add its file. */
export const WATCHED = [
  // the kernel message protocol — ALREADY FROZEN (v1, D13). Changes here are the loudest of all.
  'packages/protocol/src/subshape.ts',
  'packages/protocol/src/ops.ts',
  'packages/protocol/src/envelope.ts',
  'packages/protocol/src/failures.ts',
  'packages/protocol/src/mesh.ts',
  'packages/protocol/src/version.ts',
  // the document contracts that freeze AT P5
  'packages/document/src/entities.ts', // Element/Part/ElementStyle/Material/Section/Grid/Constraint
  'packages/document/src/scene.ts', // scene.json itself + SCENE_SCHEMA_VERSION + SceneChange
  'packages/document/src/schema.ts', // ParamSchema / ParamField
  'packages/document/src/types.ts', // BimObjectType + BuildContext + VoidBuildContext + BuiltPart
  'packages/document/src/undo.ts', // UndoableEdit + the journal
  'packages/document/src/revision.ts', // ModelRevision + issued_at_seq
  'packages/document/src/documentation.ts', // the D58 anchoring reservations
  'packages/document/src/families.ts', // the D61 family grammar
  'packages/document/src/systems.ts', // the D62 MEP reservations
  'packages/document/src/designoptions.ts', // the D65 exclusion invariant's carrier
];

/** Strip line and block comments without tripping over `//` inside a string literal. */
function stripComments(src) {
  let out = '';
  let i = 0;
  let mode = 'code'; // code | line | block | single | double | tick
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (mode === 'code') {
      if (c === '/' && n === '/') {
        mode = 'line';
        i += 2;
        continue;
      }
      if (c === '/' && n === '*') {
        mode = 'block';
        i += 2;
        continue;
      }
      if (c === "'") mode = 'single';
      else if (c === '"') mode = 'double';
      else if (c === '`') mode = 'tick';
      out += c;
      i++;
      continue;
    }
    if (mode === 'line') {
      if (c === '\n') {
        mode = 'code';
        out += c;
      }
      i++;
      continue;
    }
    if (mode === 'block') {
      if (c === '*' && n === '/') {
        mode = 'code';
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    // inside a string literal
    if (c === '\\') {
      out += c + (n ?? '');
      i += 2;
      continue;
    }
    if (
      (mode === 'single' && c === "'") ||
      (mode === 'double' && c === '"') ||
      (mode === 'tick' && c === '`')
    ) {
      mode = 'code';
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Extract every top-level exported declaration as `name -> normalised text`.
 * Brace/paren depth is tracked so a nested `}` cannot end a declaration early; a declaration ends at
 * the `}` that closes it (interfaces, enums) or at the `;` / newline at depth 0 (types, consts).
 */
export function extractDeclarations(source) {
  const src = stripComments(source);
  const lines = src.split('\n');
  const decls = {};
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(
      /^export\s+(?:declare\s+)?(?:abstract\s+)?(interface|type|const|enum|class|function)\s+([A-Za-z0-9_$]+)/,
    );
    if (!m) {
      i++;
      continue;
    }
    const [, kind, name] = m;
    let depth = 0;
    let text = '';
    let started = false;
    while (i < lines.length) {
      const line = lines[i];
      text += line + '\n';
      for (const ch of line) {
        if (ch === '{' || ch === '(' || ch === '[') {
          depth++;
          started = true;
        } else if (ch === '}' || ch === ')' || ch === ']') depth--;
      }
      i++;
      if (started && depth <= 0) break;
      // a one-line `export type X = 'a' | 'b';` never opens a bracket
      if (!started && /;\s*$/.test(line)) break;
      // a multi-line union with no brackets: stop at the first line ending in `;`
      if (!started && kind === 'type' && /;\s*$/.test(text.trimEnd())) break;
    }
    decls[`${kind} ${name}`] = text.replace(/\s+/g, ' ').trim();
  }
  return decls;
}

/** The full surface: `{ "<file>": { "<kind> <name>": "<sha256 of normalised text>" } }`. */
export function buildSurface(root) {
  const surface = {};
  for (const rel of WATCHED) {
    const src = readFileSync(join(root, rel), 'utf8');
    const decls = extractDeclarations(src);
    const hashed = {};
    for (const [k, v] of Object.entries(decls)) {
      hashed[k] = createHash('sha256').update(v).digest('hex').slice(0, 16);
    }
    surface[rel] = hashed;
  }
  return surface;
}

/**
 * THE BASELINE FILE `--rebaseline` WRITES — every derived field COMPUTED, none inherited (Q15).
 *
 * ⚠⚠ `_baselinedAtEntry` USED TO BE CARRIED FORWARD BY `...prev` AND WRITTEN BY NOTHING. The old
 * writer spread the previous snapshot and then overrode `_baselinedAt`, `_declarationCount` and
 * `surface` — so the one field that says WHICH ENTRY'S RULING AUTHORISED THIS BASELINE was the only
 * one nobody updated. It read `72` beside a `_baselinedAt` of `2026-08-03`, five entries stale, and
 * no test looked. That is the `OCCT_BUILD_ID` disease Entry 79 named — *a constant a human must
 * remember to retype* — with not even a self-assertion, and on the audit trail back to the ruling
 * that permits touching the freeze.
 *
 * ⇒ The entry number is now PASSED IN, from the `current_state.md` §7 parse the same run performs.
 * `...prev` survives only to keep fields this function does not own (`_README`), and every field this
 * function DOES own is written on every rebaseline, so none of them can be stale by omission.
 */
export function baselineSnapshot(prev, surface, { entry, today }) {
  const declarationCount = Object.values(surface).reduce((n, d) => n + Object.keys(d).length, 0);
  return {
    ...prev,
    _baselinedAt: today,
    _baselinedAtEntry: entry,
    _declarationCount: declarationCount,
    surface,
  };
}

/**
 * ⚠⚠ THE COMMITTED BASELINE'S AUDIT FIELDS, CHECKED AGAINST A POPULATION THAT DOES NOT ROT.
 * Returns the reasons `_baselinedAtEntry`/`_baselinedAt` are wrong. Empty ⇒ they are sound.
 *
 * ⚠ WHY IT IS NOT `abstracts.includes(entry)`, WHICH IS WHAT ENTRY 83 WROTE AND ENTRY 84's REVIEW
 * TOOK APART. `parseAbstracts` reads `current_state.md` §7, and §7 is a **rotating ten-entry
 * window** — the rotation rule at its own head says so, and this repo already proves it: entries
 * **76** and **67** are real (abstracts in `docs/history.md` §C, bodies in `handoff/`) and are not
 * in §7. So `includes` does not test *"names an entry that exists"*; it tests *"names an entry that
 * has not rotated out yet"*, and those two come apart the moment the baseline sits still for ten
 * entries.
 *
 * ⚠⚠ AND IT IS GUARANTEED TO SIT STILL, BY THE POLICY THIS VERY FILE ENFORCES. `_README`: *"after
 * the P5 freeze this file may not be updated without an owner ruling — that policy IS the freeze."*
 * ⇒ post-freeze the baseline is FROZEN while §7 keeps rotating, so the gate goes red, on a PR that
 * changed nothing, for obeying the freeze. Entry 83's own comment names the consequence: *"a gate
 * that cries wolf is edited to shut up."* This is that comment, applied to itself.
 *
 * What survives rotation, and what each line is for:
 *   - the entry number is a POSITIVE INTEGER and no GREATER than the newest entry — it cannot name
 *     an entry that has not happened, which is the shape a mistyped constant takes;
 *   - `_baselinedAt` is a real ISO date, never a placeholder;
 *   - ⚠ **and the cross-field check, which is the one that would have caught Q15 itself**: while
 *     the named entry is still resolvable in §7, its DATE must agree. Q15's defect was `72` sitting
 *     beside `2026-08-03` — Entry 77's date — and 72 was in §7 at the time. It needs no
 *     hand-maintained constant, and it SKIPS once the entry rotates, which is why it never cries
 *     wolf.
 *
 * ⚠ The one thing this deliberately does NOT do is bound the baseline's AGE. An old baseline is the
 * correct state of a repo that has not touched a frozen shape lately — `diffSurface` is what says
 * whether the baseline still describes the code, and it is exact. Staleness at WRITE time is the
 * writer's invariant, and `baselineSnapshot` above owns it.
 */
export function baselineEntryIssues(snapshot, abstracts) {
  const issues = [];
  const entry = snapshot._baselinedAtEntry;
  const at = snapshot._baselinedAt;

  if (!Number.isInteger(entry) || entry < 1) {
    issues.push(`_baselinedAtEntry is ${JSON.stringify(entry)}, which is not an entry number`);
  }
  if (typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(at)) {
    issues.push(`_baselinedAt is ${JSON.stringify(at)}, which is not an ISO date`);
  }
  // ⚠ THE `72` REGRESSION PIN STAYS. That number is a specific historical defect rather than a
  // moving fact, so pinning it is not a hand-maintained constant — it can never need updating.
  if (entry === 72) {
    issues.push('_baselinedAtEntry is 72 — the number the Q15 defect left behind');
  }

  const numbers = abstracts.map((a) => a.n);
  if (numbers.length === 0) {
    issues.push('§7 parsed to zero abstracts — the parser has failed, not the baseline');
    return issues;
  }
  const newest = Math.max(...numbers);
  if (Number.isInteger(entry) && entry > newest) {
    issues.push(`_baselinedAtEntry is ${entry}, but the newest entry that exists is ${newest}`);
  }

  const named = abstracts.find((a) => a.n === entry);
  if (named !== undefined && named.date !== at) {
    issues.push(
      `_baselinedAtEntry ${entry} is dated ${named.date} in §7, but _baselinedAt says ${at}`,
    );
  }
  return issues;
}

/** Compare a surface to a baseline. Returns `{ added, removed, changed }`, all `file :: decl`. */
export function diffSurface(baseline, current) {
  const added = [];
  const removed = [];
  const changed = [];
  const files = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  for (const f of files) {
    const b = baseline[f] ?? {};
    const c = current[f] ?? {};
    for (const k of Object.keys(c)) {
      if (!(k in b)) added.push(`${f} :: ${k}`);
      else if (b[k] !== c[k]) changed.push(`${f} :: ${k}`);
    }
    for (const k of Object.keys(b)) if (!(k in c)) removed.push(`${f} :: ${k}`);
  }
  return { added, removed, changed };
}
