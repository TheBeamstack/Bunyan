// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE HANDOFF-DOC MODEL — one parser, two consumers.
 *
 * `scripts/state.mjs` (the generator) and `tests/docs-budget.test.ts` (the gate) both read the
 * handoff documents through this file, so the gate can never check a different thing from what the
 * generator wrote. *(One fact, one home — the rule the migration exists to enforce.)*
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ⚠ THE ROTATION RULE IS A BYTE BUDGET, NOT A COUNT — and that is the whole point.
 *
 * The old rule compacted at "more than 20 entries". Entry sizes then roughly DOUBLED (Entry 61 was
 * 5,540 B; Entry 71 was 22,716 B), so a count-based threshold could not see the file growing. It
 * failed measurably: the 2026-07-30 compaction took current_state.md 377 KB -> 296 KB and it was back
 * to 393 KB the same day — larger than before the maintenance ran.
 *
 * Budgets are set from the measured post-migration size plus real headroom, so a normal session never
 * trips them and a drifting one always does.
 */
export const BUDGET = {
  currentState: 96 * 1024, // measured 54 KB after the migration
  section7: 32 * 1024, // measured ~13 KB for ten abstracts
  maxAbstracts: 10,
  decisions: 160 * 1024,
  history: 400 * 1024,
};

/** The eight fields every §7 abstract must carry. Missing one fails `docs:check`. */
export const ABSTRACT_FIELDS = ['CHANGED', 'VERIFIED', 'FOUND', 'OWES', 'RISK', 'FULL', 'REVIEW'];

export function readCurrentState(root) {
  return readFileSync(join(root, 'current_state.md'), 'utf8');
}

/** `§7 … §8` — the entry-abstract section, exclusive of the generated block. */
export function section7(src) {
  const start = src.indexOf('## §7 — Entry abstracts');
  const end = src.indexOf('## §8 — Generated');
  if (start < 0) throw new Error('current_state.md: §7 heading not found');
  if (end < 0) throw new Error('current_state.md: §8 heading not found');
  return src.slice(start, end);
}

/**
 * Parse §7's abstracts. Heading form:  `### <n> | <date> | <agent> | <headline>`
 * Fields are `- **NAME:**` bullets beneath it.
 *
 * Each abstract carries its fields TWICE, and the difference is load-bearing:
 *   * `fields[NAME]`     — the first physical line only. What the schema checks (present, non-empty,
 *                          `RISK` starts with a known word, `FULL` is a path) all live on line one.
 *   * `fieldsFull[NAME]` — the whole bullet, indented continuation lines joined back on.
 *
 * ⚠⚠ ANY CHECK THAT SEARCHES A FIELD FOR A MARKER MUST USE `fieldsFull`. A marker written after any
 * lead-in lands on line 2, and `fields` cannot see it. The `AWAITING REVIEW` guard in
 * `tests/docs-budget.test.ts` read `fields` and was measurably blind to exactly that (found
 * reviewing Entry 75, fixed in Entry 76).
 *
 * ⚠ AND THE REASON IS NOT THE ONE THIS COMMENT USED TO GIVE. It said these documents are
 * "prettier-formatted at `printWidth: 100`, so the line break is placed by sentence length, not by
 * the author". **False about the only file this parser ever opens:** `current_state.md` is listed in
 * `.prettierignore`, so prettier never touches it — measured with `--ignore-path /dev/null`, it does
 * not conform, and **288 lines would change** if it did. Its wrapping is placed BY HAND. That makes
 * `fieldsFull` MORE necessary, not less: no formatter maintains those breaks, nothing keeps them
 * stable across an edit, and `format:check` is not even looking. The old note also credited the miss
 * to a marker that "passed `prettier --check`" — vacuously true, since prettier skips the file.
 */
/**
 * ⚠⚠ SPLIT ON `\r?\n`, NOT `\n`, AND THIS IS NOT DEFENSIVE PROGRAMMING — IT IS THE DIFFERENCE BETWEEN
 * THIS PARSER WORKING ON AMER'S BOX AND RETURNING AN EMPTY ARRAY THERE (found Entry 80).
 *
 * The local PC has `core.autocrlf=true`, so every text file in its working tree is CRLF — 920 CRLF
 * pairs in `current_state.md`, measured. Splitting on `\n` then leaves a `\r` at the end of every
 * line, and the heading regex below ends `\| (.+)$`: JS `.` does not match `\r`, and `$` without the
 * `m` flag does not match before one. So NO heading ever matched, `parseAbstracts` returned `[]`, and
 * gate six failed five ways on that box while CI (Linux, LF) stayed green.
 *
 * ⚠ THE REPO ALREADY KNEW ABOUT THIS AND THIS FILE MISSED THE MEMO: `.prettierrc` carries
 * `endOfLine: "auto"` precisely so `format:check` is green on both. A parser that only reads LF is
 * the same assumption, unstated.
 */
// ⚠⚠ TWO HEADING SCHEMES, LIVE AT ONCE, AND THAT IS DELIBERATE (D82; AGENTS.md).
// Entries 1-90 keep the legacy `### N | date | agent | headline` heading verbatim — never rewritten,
// per AGENTS.md's own cutover note. Entry 91 onward (the five-seat protocol) writes
// `### T-nnn — title — date — seat: seat` for a builder/reviewer turn, or
// `### STEWARD-<slug> — title — date — seat: seat` for a steward turn that names no task.
// Both schemes coexist inside §7's newest-10 window for as long as any legacy entry has not yet
// rotated out, so the parser must read either without the caller having to know which it got.
const LEGACY_HEADING = /^### (\d+) \| (\d{4}-\d{2}-\d{2}) \| (\w+) \| (.+)$/;
const NEW_HEADING =
  /^### (T-\d{3}|STEWARD-[a-z0-9-]+) — (.+) — (\d{4}-\d{2}-\d{2}) — seat: ([a-z]+)$/;

export function parseAbstracts(src) {
  const sec = section7(src);
  const lines = sec.split(/\r?\n/);
  const out = [];
  let cur = null;
  let open = null; // the field whose bullet we are still inside
  for (const line of lines) {
    const legacy = line.match(LEGACY_HEADING);
    const fresh = !legacy && line.match(NEW_HEADING);
    if (legacy || fresh) {
      if (cur) out.push(cur);
      cur = legacy
        ? {
            id: legacy[1],
            n: +legacy[1],
            scheme: 'legacy',
            date: legacy[2],
            agent: legacy[3],
            seat: legacy[3],
            headline: legacy[4].trim(),
            fields: {},
            fieldsFull: {},
            raw: '',
          }
        : {
            id: fresh[1],
            // ⚠ Assigned once every heading in §7 has been seen — see below. `null` here is a
            // mid-parse placeholder, never a value a caller reads.
            n: null,
            scheme: 'T',
            date: fresh[3],
            agent: fresh[4],
            seat: fresh[4],
            headline: fresh[2].trim(),
            fields: {},
            fieldsFull: {},
            raw: '',
          };
      open = null;
      continue;
    }
    if (!cur) continue;
    cur.raw += line + '\n';
    const f = line.match(/^- \*\*([A-Z]+):\*\*\s*(.*)$/);
    if (f) {
      cur.fields[f[1]] = f[2].trim();
      cur.fieldsFull[f[1]] = f[2].trim();
      open = f[1];
      continue;
    }
    // A continuation is an INDENTED non-empty line — markdown's own rule for staying inside a list
    // item, and what prettier emits when it wraps. A blank line or an unindented one ends the bullet,
    // which is what stops the next abstract's prose from bleeding into this field.
    if (open && /^\s+\S/.test(line)) cur.fieldsFull[open] += '\n' + line.trim();
    else if (open) open = null;
  }
  if (cur) out.push(cur);

  // ⚠⚠ SYNTHETIC SORT KEYS FOR THE NEW SCHEME, CHOSEN SO EVERY EXISTING `.n`-BASED CALLER KEEPS
  // WORKING UNCHANGED. `T-nnn`/`STEWARD-<slug>` carry no comparable number of their own — a steward
  // turn has no task id at all, and task numbers are not guaranteed to increase turn-over-turn once
  // both builders and the steward mint entries independently. What IS guaranteed, by construction, is
  // array order: entries are always prepended (see `docs-budget.test.ts`'s own "newest-first" gate),
  // so the earliest new-scheme entry encountered while walking top-to-bottom is the newest one. `1000`
  // is not tuned to "usually" clear the legacy numbers — §7 holds at most `BUDGET.maxAbstracts` (10)
  // entries at once, so no legacy number can ever coexist with a new-scheme one within a few hundred
  // of it, let alone a thousand.
  //
  // ⚠⚠ `.n` IS A SORT KEY AND NOTHING ELSE — IT IS NOT AN IDENTITY, AND STORING IT AS ONE COST TWO
  // TURNS THEIR §7 ABSTRACT (T-024). `1000` means "whatever is newest right now", so a durable
  // reference to `1000` re-resolves to a different entry the moment one is prepended. Anything that
  // has to name an entry ACROSS a commit takes `abstractKey` below.
  const newOnes = out.filter((a) => a.n === null);
  newOnes.forEach((a, i) => {
    a.n = SYNTHETIC_ENTRY_BASE - i;
  });
  for (const a of out) a.key = abstractKey(a);
  return out;
}

/** The base of the synthetic range `parseAbstracts` mints from §7 POSITION. */
export const SYNTHETIC_ENTRY_BASE = 1000;

/**
 * True when a number is one this parser minted from position rather than one an author wrote.
 * The mint is `SYNTHETIC_ENTRY_BASE - i` over a §7 capped at `BUDGET.maxAbstracts`, so the whole
 * synthetic population is `(BASE - maxAbstracts, BASE]` and no legacy entry number comes near it.
 */
export function isSyntheticEntryNumber(n) {
  return (
    Number.isInteger(n) &&
    n > SYNTHETIC_ENTRY_BASE - BUDGET.maxAbstracts &&
    n <= SYNTHETIC_ENTRY_BASE
  );
}

/** The shape `abstractKey` writes for a new-scheme entry: the heading's identity fields, minus its title. */
export const ENTRY_KEY = /^(T-\d{3}|STEWARD-[a-z0-9-]+) — (\d{4}-\d{2}-\d{2}) — ([a-z]+)$/;

/**
 * THE STABLE IDENTITY OF AN ABSTRACT — what anything durable records instead of `.n` (T-024).
 *
 * A legacy entry already has one: the number its author wrote. A new-scheme entry does not, so its
 * key is the three identity fields of its own heading — id, date, seat — which are authored, survive
 * rotation out of §7, and are greppable in the file. The title is left out because it is prose an
 * author may correct; these three are not.
 *
 * ⚠ THE KEY IS NOT UNIQUE, AND §7 IS NOT THE SCOPE THAT DECIDES. The population a durable reference
 * resolves against is §7 PLUS `docs/history.md` — invariant 10 makes the archive permanent — and
 * collisions live in it. The generator is **any two turns by one seat on one task on one day**, which
 * has two live routes: D88's two review steps, and `agent-start.mjs --continue`'s return of a defect
 * to its builder. A reference resolves to that turn-pair rather than to one turn; both members carry
 * the same date by construction, which is the half `baselineEntryIssues` checks.
 *
 * ⚠ NO UNIQUENESS GATE, AND NOT FOR THE REASON THIS COMMENT FIRST GAVE. A §7-scoped gate would be
 * GREEN on most days and RED on a correct turn — the second review step, or a returned build — so it
 * cries wolf rather than reporting a defect. The count is measured rather than stated here, because a
 * number written into a comment is falsified by the next abstract: `tests/docs-budget.test.ts`'s
 * "the entry key collides, and every collision is a turn-PAIR" measures it over the whole record.
 */
export function abstractKey(a) {
  return a.scheme === 'legacy' ? a.n : `${a.id} — ${a.date} — ${a.seat}`;
}

/**
 * ⚠⚠ THE POPULATION A DURABLE REFERENCE RESOLVES AGAINST: §7's WINDOW **PLUS THE ARCHIVE IT ROTATES
 * INTO**. This is the "population that does not rot" `baselineEntryIssues` names, and until T-024's
 * return it did not exist — every caller passed `parseAbstracts(readCurrentState(root))`, i.e. §7
 * alone, which is a ten-entry byte-capped window that drops its oldest abstract on any turn that
 * needs the room.
 *
 * ⚠⚠ WHY §7 ALONE CANNOT CARRY AN EXISTENCE CHECK, MEASURED RATHER THAN ARGUED. §7 stood at
 * 32209 of 32768 bytes with the authorising abstract at the bottom, so its headroom was smaller than
 * the smallest abstract it held: **one** append rotated that abstract out. A check that asks
 * *"is it in §7?"* therefore answers *"has nobody written a turn since?"*, and goes red on a PR that
 * moved no declaration — T-024's own failure shape, on the gate T-024 built to remove it.
 *
 * ⚠ THE ARCHIVE IS APPEND-ONLY BY INVARIANT 10 AND ITS HEADINGS ARE COPIED VERBATIM, in both
 * schemes (`docs/history.md` §C's legacy numbers, §E's `T-nnn`/`STEWARD-slug`), so the union is
 * monotone: an abstract enters it and never leaves. `parseAbstracts` is the authority on §7 and this
 * reads only headings from the archive — a summarised entry keeps its identity fields and nothing
 * else is needed to resolve a reference.
 *
 * ⚠ Archived new-scheme entries get `n: null`, NOT a synthetic position. `parseAbstracts` mints
 * `1000 - i` from §7's array order, and minting a second series here would hand two different entries
 * the same number — the exact confusion `.n` already cost two turns their abstract (T-024).
 */
export function recordedAbstracts(root) {
  const live = parseAbstracts(readCurrentState(root));
  const archive = readFileSync(join(root, 'docs/history.md'), 'utf8');
  const archived = [];
  for (const line of archive.split(/\r?\n/)) {
    const nu = NEW_HEADING.exec(line);
    if (nu) {
      archived.push({
        scheme: 'T',
        n: null,
        id: nu[1],
        headline: nu[2],
        date: nu[3],
        seat: nu[4],
        agent: nu[4],
        key: `${nu[1]} — ${nu[3]} — ${nu[4]}`,
      });
      continue;
    }
    const legacy = LEGACY_HEADING.exec(line);
    if (legacy) {
      archived.push({
        scheme: 'legacy',
        n: Number(legacy[1]),
        id: legacy[1],
        headline: legacy[4],
        date: legacy[2],
        seat: legacy[3].toLowerCase(),
        agent: legacy[3],
        key: Number(legacy[1]),
      });
    }
  }
  if (archived.length === 0) {
    throw new Error(
      'docs/history.md: ZERO archived abstract headings parsed.\n' +
        'That is a PARSER failure, not an empty archive — §7 has rotated into this file since Entry 33.\n' +
        'Check line endings first: this is what a CRLF working tree did to §7 before Entry 80.',
    );
  }
  return [...live, ...archived];
}

/**
 * The highest-numbered abstract — and it REFUSES an empty set rather than answering `null`.
 *
 * ⚠⚠ WHY A THROW AND NOT A DEFAULT. `pnpm state` writes two things from this value: §8's "newest
 * entry" row and the running agent's `FRESH` block — and `FRESH` is pushed STRAIGHT TO MAIN at the
 * loop's step 10(a), ahead of its own PR, because it is the only document read at t=0. When the CRLF
 * defect above made `parseAbstracts` return `[]`, the old `reduce(…, null)` did not fail: it wrote
 * `**(none)**` into §8 and `ENTRY ?` into the prompt, and the push would have briefed the NEXT
 * session with a question mark where its "am I behind?" check belongs.
 *
 * That is `current_state.md` §1c's own lesson about OCCT's `Modified()` — silence read as an answer.
 * A parser that finds nothing has not discovered that there are no entries; it has failed. The
 * only safe thing it can do is say so and stop before anything is written.
 */
export function newestAbstract(abstracts) {
  if (!abstracts.length) {
    throw new Error(
      'current_state.md: §7 parsed to ZERO abstracts.\n' +
        'That is a PARSER failure, not an empty section — §7 is never empty in this repo.\n' +
        'Check line endings first: this is what a CRLF working tree did before Entry 80.',
    );
  }
  return abstracts.reduce((a, b) => (a.n > b.n ? a : b));
}

/**
 * THE FROZEN-SURFACE VERDICT — what moved, what the reviewer READS, and therefore WHO MERGES (Q15).
 *
 * ⚠⚠ THE LABEL AND THE ROUTING VALUE ARE THE SAME STRING FOR A REASON, AND `--rebaseline` USED TO
 * BREAK IT. The old code computed the diff, and then, if the baseline had just been rewritten, it
 * assigned `risk = 'additive'` — on the grounds that the surface now matches the file beside it. That
 * is true and it is the wrong thing to say: **the only PR that ever runs `--rebaseline` is a PR that
 * moved the frozen surface**, so the flag turned the label on exactly the PRs that must NOT be
 * agent-merged. `REVIEW.md` item 7 and the loop's step 3 both route on that word: *additive ⇒ the
 * reviewing agent merges; contract-touching ⇒ the OWNER merges.* An agent merging an owner-gated PR
 * because the tooling told it to is the Entry 74 failure with a machine as the excuse.
 *
 * ⇒ The verdict describes THE DIFF THAT WAS MEASURED, always — re-baselining is reported as a
 * qualifier on top of it, never as an answer that replaces it. `risk` is what routes; `label` is what
 * §8 prints; and `label` still STARTS with `risk`, so `docs-budget`'s `/^(additive|contract-touching)/`
 * check on an entry's `RISK:` field holds for an author who copies the printed line.
 *
 * ⚠ `moved` must be measured against the PREVIOUS baseline, i.e. before `--rebaseline` overwrites it.
 * Measured afterwards it is trivially empty, which is the same lie by another route.
 */
export function riskVerdict(moved, rebaselined = false) {
  const risk = moved.length > 0 ? 'contract-touching' : 'additive';
  const label = rebaselined ? `${risk} (re-baselined)` : risk;
  const named = moved.slice(0, 3).join(', ');
  const detail =
    moved.length > 0
      ? `${moved.length} declaration(s) moved — ${named}${moved.length > 3 ? ' …' : ''}`
      : 'unchanged vs baseline';
  return {
    risk,
    label,
    detail: rebaselined ? `${detail} · baseline REWRITTEN this session` : detail,
  };
}

/** Every entry body actually present on disk, as repo-relative paths. */
export function entryBodies(root) {
  const dir = join(root, 'handoff');
  if (!existsSync(dir)) return [];
  const out = [];
  for (const agent of readdirSync(dir)) {
    const sub = join(dir, agent);
    for (const f of readdirSync(sub)) {
      if (f.endsWith('.md')) out.push(`handoff/${agent}/${f}`);
    }
  }
  return out.sort();
}

/** The generated block's bounds in a file, or null. */
export function generatedBlock(src, begin, end) {
  const a = src.indexOf(begin);
  const b = src.indexOf(end);
  if (a < 0 || b < 0) return null;
  return { start: a + begin.length, end: b, body: src.slice(a + begin.length, b) };
}

export const MARKERS = {
  state: {
    begin: '<!-- BEGIN GENERATED — written by `pnpm state`. Never hand-edit. -->',
    end: '<!-- END GENERATED -->',
  },
  fresh: {
    begin: '<!-- BEGIN FRESH — written by `pnpm state`. Never hand-edit. -->',
    end: '<!-- END FRESH -->',
  },
};
