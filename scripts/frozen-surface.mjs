// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

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
import { ENTRY_KEY, isSyntheticEntryNumber } from './docs-state.mjs';

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
 * ⇒ The entry identity is now PASSED IN, from the `docs/CURRENT_STATE.md` §7 parse the same run performs.
 * `...prev` survives only to keep fields this function does not own (`_README`), and every field this
 * function DOES own is written on every rebaseline, so none of them can be stale by omission.
 *
 * ⚠⚠ AND `at` IS THE AUTHORISING ENTRY'S OWN §7 DATE, NOT THE CLOCK — THE PARAMETER USED TO BE CALLED
 * `today` AND WAS `new Date()` (found reviewing Entry 84, `tests/state-risk-e2e.test.ts`). Q15's fix
 * made the NUMBER computed from §7 and left the DATE on the clock, so the two halves of one fact had
 * two sources. `baselineEntryIssues` below then closes on a cross-field check that they agree — which
 * is the right check — and **a rebaseline run on any day but the entry's own date produced a baseline
 * its own gate rejects**: a session crossing UTC midnight, Amer's `+0100` box before 01:00 local
 * (`toISOString()` is UTC), or an abstract written the day before the rebaseline. Nothing hand-edited,
 * nothing wrong, gate red — the cry-wolf shape this whole area exists to stop. One source for the
 * pair, and the cross-field check goes back to meaning *"someone hand-edited this file"*.
 */
export function baselineSnapshot(prev, surface, { entry, at }) {
  const declarationCount = Object.values(surface).reduce((n, d) => n + Object.keys(d).length, 0);
  return {
    ...prev,
    _baselinedAt: at,
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
 * TOOK APART. `parseAbstracts` reads `docs/CURRENT_STATE.md` §7, and §7 is a **rotating ten-entry
 * window** — the rotation rule at its own head says so, and this repo already proves it: entries
 * **76** and **67** are real (abstracts in `docs/PHASE_LOG.md` §C, bodies in `handoff/`) and are not
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
 * ⚠⚠ AND `_baselinedAtEntry` IS AN IDENTITY, NEVER A POSITION (T-024). It used to hold `.n`, which
 * for a five-seat entry is `1000 - i` over §7's array order — so it named "whatever is newest",
 * re-resolved to a different entry every time one was prepended, and the cross-field check below
 * then compared the baseline's date against an entry it never authorised. Any turn appending a §7
 * abstract on a later day went RED having moved no declaration; two turns hit it, and the second
 * lost its abstract to `docs/PHASE_LOG.md` rather than falsify a date or re-baseline. A new-scheme
 * baseline now records `abstractKey` — `<id> — <date> — <seat>` — and a synthetic number is refused
 * outright, so the position cannot come back through the file it was written into.
 *
 * ⚠⚠ AND `abstracts` IS THE RECORD, NOT §7 — `recordedAbstracts(root)`, which is §7 plus the archive
 * it rotates into. A self-consistent key proves the two audit fields agree with each other and
 * NOTHING about whether the turn it names ever happened: `T-999 — 2026-01-01 — nobody` passed the
 * keyed path clean. Resolving it against §7 alone buys that check back and pays T-024's own defect
 * for it — §7's headroom was one append wide when this was written, so the check would have gone red
 * on the next turn by anyone. The archive is append-only (invariant 10), so resolving against the
 * union is the same question asked of a population that does not rot.
 *
 * What survives rotation, and what each line is for:
 *   - the entry is either an author-written legacy NUMBER or a new-scheme KEY, and never a minted
 *     position — which is the shape T-024 named;
 *   - `_baselinedAt` is a real ISO date, never a placeholder;
 *   - ⚠ **and the cross-field check, which is the one that would have caught Q15 itself**: the
 *     entry's own date must agree with `_baselinedAt`. Q15's defect was `72` sitting beside
 *     `2026-08-03` — Entry 77's date. A key carries its date, so the pair is checkable forever; a
 *     legacy number is resolved in §7 while it is still there and SKIPS once it rotates, which is
 *     why that half never cries wolf;
 *   - ⚠ and the key must NAME A TURN THAT EXISTS, resolved in the record. The key is not unique —
 *     two turns by one seat on one task on one day share one (`abstractKey`) — so this resolves to a
 *     turn-pair in those cases, and both members carry the key's own date, so the check is unchanged
 *     by the collision. The legacy half keeps its skip: entries 1-90 are closed (D82), nothing new is
 *     ever validated there, and §A/§B summarise their oldest entries without a `###` heading.
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

  const keyed = typeof entry === 'string' && ENTRY_KEY.test(entry);
  const numbered = Number.isInteger(entry) && entry >= 1 && !isSyntheticEntryNumber(entry);
  if (!keyed && !numbered) {
    issues.push(
      isSyntheticEntryNumber(entry)
        ? `_baselinedAtEntry is ${entry}, which is a §7 POSITION and not an entry identity (T-024)`
        : `_baselinedAtEntry is ${JSON.stringify(entry)}, which is not an entry identity`,
    );
  }
  if (typeof at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(at)) {
    issues.push(`_baselinedAt is ${JSON.stringify(at)}, which is not an ISO date`);
  }
  // ⚠ THE `72` REGRESSION PIN STAYS. That number is a specific historical defect rather than a
  // moving fact, so pinning it is not a hand-maintained constant — it can never need updating.
  if (entry === 72) {
    issues.push('_baselinedAtEntry is 72 — the number the Q15 defect left behind');
  }

  if (abstracts.length === 0) {
    issues.push('§7 parsed to zero abstracts — the parser has failed, not the baseline');
    return issues;
  }

  if (keyed) {
    // ⚠⚠ THE CROSS-FIELD CHECK, ON AN IDENTITY THAT CARRIES ITS OWN DATE — SO THE DATE HALF NEEDS NO
    // LOOKUP. Q15's shape (a baseline whose recorded date is not the authorising entry's) still
    // fails: the key names the date the entry was written, `_baselinedAt` claims one, and a hand-edit
    // to either half separates them. Because the pair is self-contained it cannot rot with §7's
    // rotation and it cannot move with §7's order — which is the whole of T-024.
    //
    // ⚠ THE RESOLUTION BELOW IS THE HALF SELF-CONSISTENCY CANNOT COVER, and it is why `abstracts` is
    // the record rather than §7: moving BOTH audit fields together is a hand-edit no cross-field
    // check can see, and only a lookup catches it.
    const keyDate = ENTRY_KEY.exec(entry)[2];
    if (keyDate !== at) {
      issues.push(`_baselinedAtEntry ${entry} is dated ${keyDate}, but _baselinedAt says ${at}`);
    }
    if (!abstracts.some((a) => a.key === entry)) {
      issues.push(`_baselinedAtEntry ${entry} names no abstract in the record`);
    }
    return issues;
  }

  // ── the legacy numbered form: baselines written before the five-seat scheme ──────────────────
  // Only entries 1–90 carry an author-written number (D82), so nothing new is ever validated here.
  // The bound skips when §7 holds no legacy entry, for the same reason the date check skips a
  // rotated-out one: there is nothing left in the window to measure against.
  const legacy = abstracts.filter((a) => a.scheme === 'legacy');
  if (legacy.length > 0) {
    const newest = Math.max(...legacy.map((a) => a.n));
    if (Number.isInteger(entry) && entry > newest) {
      issues.push(`_baselinedAtEntry is ${entry}, but the newest entry that exists is ${newest}`);
    }
  }
  const named = legacy.find((a) => a.n === entry);
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
