// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE DOC GATES — gate six of `pnpm verify`, and therefore of CI.
 *
 * ⚠⚠ WHY IT EXISTS. `docs/CURRENT_STATE.md` is read IN FULL, by BOTH agents, on EVERY session, so its
 * length is a cost paid on every run. It grew **5.9× in eleven days** (67 KB → 394 KB) under a
 * rotation rule that was expressed as a COUNT ("more than 20 entries") while entry sizes doubled
 * underneath it. That rule then failed measurably: the 2026-07-30 compaction took the file
 * 377 KB → 296 KB and it was back to **393 KB the same day — larger than before the maintenance ran.**
 *
 * The rule is now a BYTE BUDGET and it is enforced here rather than remembered. This project's own
 * ledger scores memory-enforced rules at NINE DIRTY OUT OF EIGHTEEN; the two rules that never rotted
 * (`units-rule7`, `d19-boundary`) are the two with a test behind them.
 *
 * WHAT A FAILURE MEANS: compact §7 (move the oldest abstracts' summaries into `docs/PHASE_LOG.md`,
 * AFTER checking their durable lessons are already in §1–§5), or run `pnpm state`. Never raise a
 * budget to make a failure go away without saying so in the entry.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BUDGET,
  ABSTRACT_FIELDS,
  readCurrentState,
  section7,
  parseAbstracts,
  newestAbstract,
  recordedAbstracts,
  entryBodies,
  generatedBlock,
  MARKERS,
  type EntryAbstract,
} from '../scripts/docs-state.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const src = readCurrentState(ROOT);
const abstracts = parseAbstracts(src);
const bodies = entryBodies(ROOT);
/**
 * ⚠ THE BUDGET IS ABOUT THE COMMITTED FILE, AND ON A CRLF WORKING TREE THAT IS NOT THE FILE ON DISK.
 *
 * `core.autocrlf=true` on the local PC adds one byte per line — ~920 of them to `docs/CURRENT_STATE.md`,
 * which put §7 at **32.05 KB against a 32 KB budget there while CI measured 31.7 KB**. A gate whose
 * verdict depends on which box checked the repo out is not a gate; normalising here makes both boxes
 * measure the thing that is actually stored. (Found alongside the parser defect, Entry 80.)
 */
const committed = (s: string) => s.replace(/\r\n/g, '\n');
const bytes = (p: string) =>
  existsSync(join(ROOT, p))
    ? Buffer.byteLength(committed(readFileSync(join(ROOT, p), 'utf8')), 'utf8')
    : 0;
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

/**
 * A field's COMPLETE text, continuation lines included. ⚠ Never read `fields.REVIEW` for a marker
 * check — it is only the first physical line, and the author's hand decides where that line ends.
 * (`docs/CURRENT_STATE.md` is in `.prettierignore`; the formatter has never touched these breaks.)
 */
const reviewText = (a: EntryAbstract) => a.fieldsFull?.REVIEW ?? a.fields.REVIEW ?? '';

/**
 * ⚠⚠ NEWEST-FIRST IS MEASURED AGAINST THE `date:` IN EACH HEADING, NEVER AGAINST `.n`.
 *
 * `parseAbstracts` hands every new-scheme (`T-nnn`/`STEWARD-<slug>`) entry `n = 1000 - i` — its index
 * in the same top-to-bottom walk and nothing else (`docs-state.mjs`, "SYNTHETIC SORT KEYS"). Asserting
 * those numbers descend asserts that the loop counted down; it holds whatever order §7 is in, and §7
 * now holds no legacy `### N | …` entry whose number an author actually wrote. Measured on a
 * two-entry fixture with the older entry on top: `n` is `1000, 999` — descending, check green.
 *
 * The date is authored, so it is the one signal in a heading that can disagree with position. It has
 * DAY granularity, which is coarser than a turn, so equal dates are accepted in either order: what
 * this catches is a whole day out of sequence, not two entries within one day.
 *
 * Returns one description per offending adjacent pair; empty ⇒ §7 descends by date.
 */
const outOfDateOrder = (list: EntryAbstract[]) =>
  list.flatMap((below, i) => {
    const above = list[i - 1];
    return above && above.date < below.date
      ? [`${below.id} (${below.date}) is below ${above.id} (${above.date})`]
      : [];
  });

describe('the handoff docs stay within budget', () => {
  it('docs/CURRENT_STATE.md is under its byte budget', () => {
    const n = bytes('docs/CURRENT_STATE.md');
    expect(
      n,
      `docs/CURRENT_STATE.md is ${kb(n)}, over its ${kb(BUDGET.currentState)} budget.\n` +
        'Compact §7: move the oldest abstracts into docs/PHASE_LOG.md — AFTER checking their durable\n' +
        'lessons are already promoted into §1–§5. That check is what makes compression safe.',
    ).toBeLessThanOrEqual(BUDGET.currentState);
  });

  it('§7 is under its byte budget and holds no more than ten abstracts', () => {
    expect(section7(committed(src)).length).toBeLessThanOrEqual(BUDGET.section7);
    expect(abstracts.length).toBeLessThanOrEqual(BUDGET.maxAbstracts);
  });

  it('decisions.md and docs/PHASE_LOG.md are under budget', () => {
    expect(bytes('docs/decisions.md')).toBeLessThanOrEqual(BUDGET.decisions);
    expect(bytes('docs/PHASE_LOG.md')).toBeLessThanOrEqual(BUDGET.history);
  });
});

describe('every §7 abstract is well formed', () => {
  it('there is at least one abstract', () => {
    expect(abstracts.length).toBeGreaterThan(0);
  });

  it('carries all mandatory fields — FOUND and OWES are the point of the schema', () => {
    // ⚠ These two fields did not exist before 2026-07-31. What a recent entry uniquely contributes
    // is *what is now known that was not* and *what is owed to whom* — and both used to be buried
    // inside 12–22 KB of prose where an agent could pass straight over them.
    for (const a of abstracts) {
      for (const f of ABSTRACT_FIELDS) {
        expect(
          Object.keys(a.fields),
          `Entry ${String(a.key)} is missing the ${f}: field`,
        ).toContain(f);
        expect(
          a.fields[f]?.length ?? 0,
          `Entry ${String(a.key)}'s ${f}: field is empty`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('declares a RISK the freeze gate understands', () => {
    for (const a of abstracts) {
      expect(a.fields.RISK, `Entry ${String(a.key)}`).toMatch(/^(additive|contract-touching)/);
    }
  });

  it('points at a body that exists, and every body has an abstract or is archived', () => {
    for (const a of abstracts) {
      const p = (a.fields.FULL ?? '').replace(/`/g, '').trim();
      expect(p, `Entry ${String(a.key)}'s FULL: must name a handoff/ path`).toMatch(
        /^handoff\/\w+\/.+\.md$/,
      );
      expect(existsSync(join(ROOT, p)), `Entry ${String(a.key)}: ${p} does not exist`).toBe(true);
    }
    // The converse is deliberately weaker: a body may outlive its abstract (that is what rotation
    // does), but it must then be indexed in docs/PHASE_LOG.md so nothing becomes unreachable.
    const history = readFileSync(join(ROOT, 'docs/PHASE_LOG.md'), 'utf8');
    const referenced = new Set(abstracts.map((a) => a.fields.FULL?.replace(/`/g, '').trim()));
    for (const b of bodies) {
      if (referenced.has(b)) continue;
      expect(history, `${b} has no abstract and is not indexed in docs/PHASE_LOG.md`).toContain(b);
    }
  });

  it('numbers entries uniquely — the parallel-agent collision detector', () => {
    // Two agents working in parallel both claim the next number in their own PR. The second to merge
    // hits a git conflict on ONE §7 row; if it were ever resolved carelessly this test catches it.
    const ns = abstracts.map((a) => a.n);
    expect(new Set(ns).size, `duplicate entry numbers: ${ns.join(', ')}`).toBe(ns.length);
  });

  it('is written newest-first, judged by each entry’s own date', () => {
    // ⚠ `newestAbstract` takes the MAX `.n`, which for a new-scheme entry is its position — so §7's
    // order IS which entry the generator calls newest, in §8 and in `--rebaseline`'s audit fields.
    // `outOfDateOrder` above says why the date, not `.n`, is what can disagree with that position.
    expect(outOfDateOrder(abstracts), 'abstracts must be newest-first').toEqual([]);
  });

  /**
   * ⚠⚠ THE TEETH, ON A FIXTURE — because the real file passes either way and that is the defect.
   *
   * The check this replaced read `.n`, which `parseAbstracts` derives from the same walk it is being
   * asked to validate, so it was true by construction. Both assertions here are on ONE fixture: the
   * old signal descends on it, and the new one still refuses it.
   */
  it('⚠⚠ refuses an older entry sitting above a newer one — what `.n` could not see', () => {
    const outOfOrder = parseAbstracts(
      [
        '## §7 — Entry abstracts (newest 10)',
        '',
        '### T-002 — the older entry, wrongly on top — 2026-01-01 — seat: zayd',
        '',
        '- **RISK:** additive',
        '',
        '### T-001 — the newer entry, wrongly below — 2026-01-02 — seat: zayd',
        '',
        '- **RISK:** additive',
        '',
        '## §8 — Generated',
      ].join('\n'),
    );
    expect(
      outOfOrder.map((a) => a.id),
      'the synthetic §7 must parse',
    ).toEqual(['T-002', 'T-001']);

    const ns = outOfOrder.map((a) => a.n);
    expect([...ns], 'the positional key descends here — which is why it proved nothing').toEqual(
      [...ns].sort((x, y) => y - x),
    );
    expect(outOfDateOrder(outOfOrder)).toEqual(['T-001 (2026-01-02) is below T-002 (2026-01-01)']);
  });

  it('accepts two same-date entries in either relative order', () => {
    // A day cannot order two turns taken on the same day, and §7 routinely holds several — so this
    // check must be silent about them rather than guess. Both orders of the same pair are accepted.
    const sameDay = (first: string, second: string) =>
      parseAbstracts(
        [
          '## §7 — Entry abstracts (newest 10)',
          '',
          `### ${first} — one turn — 2026-01-01 — seat: zayd`,
          '',
          '- **RISK:** additive',
          '',
          `### ${second} — the other turn, same day — 2026-01-01 — seat: hmdnah`,
          '',
          '- **RISK:** additive',
          '',
          '## §8 — Generated',
        ].join('\n'),
      );
    expect(outOfDateOrder(sameDay('T-001', 'T-002'))).toEqual([]);
    expect(outOfDateOrder(sameDay('T-002', 'T-001'))).toEqual([]);
  });

  /* ============================================================================================
   * ⚠⚠ THE AUTHOR MUST NOT MERGE THEIR OWN ENTRY — the hole Entry 74 fell through.
   * ========================================================================================= */

  /**
   * ⚠⚠ WHAT THIS CATCHES, AND WHY IT IS WORTH A TEST.
   *
   * The owner ruled (`handoff_system_design.md` §11, decision 5) that **the REVIEWING agent merges**
   * an additive PR. The reviewer is by construction a LATER session — `REVIEW.md`'s own justification
   * is that *"a fresh session has genuinely lost the author's working state, which is what makes a
   * self-review worth doing at all."* So an entry is supposed to land as an OPEN PR and be merged by
   * the session that follows it.
   *
   * **Entry 74 was merged by its own author, minutes after opening it, and nothing objected.** The
   * prompt's step 3 says *"RISK: additive + approving + CI green → MERGE it"* without scoping "it" to
   * the PR that existed at t=0, and step 10(b) ended at `gh pr create` without ever saying *stop*.
   * Composed, those two read as permission. The ruling that forbids it lived only in the design doc —
   * §1e's *"a copy is a claim nobody will re-read"*, one more time.
   *
   * THE CHECK: the `AWAITING REVIEW` marker means *"this entry is the currently-open PR."* Only the
   * NEWEST abstract may carry it. The moment a later entry exists, the earlier one must have been
   * reviewed — so a stale marker proves either that step 3 was skipped, or that the author merged
   * their own work and never came back to record who reviewed it.
   *
   * ⚠ It cannot fire in the session that commits the violation — merging is a GitHub action, invisible
   * to a test in this repo. It fires at the NEXT entry, which is the first moment the evidence exists
   * locally. That is late, but it is not useless: it is exactly how the *"nine of eighteen rules
   * dirty"* sweeps were caught, and it converts a silent lapse into a loud one.
   */
  it('⚠⚠ only the NEWEST entry may be AWAITING REVIEW — the author never merges their own', () => {
    const newest = newestAbstract(abstracts);
    for (const a of abstracts) {
      if (a.n === newest.n) continue;
      const review = reviewText(a);
      // Entries written before the PR flow existed are exempt, and say so in those words.
      if (/pre-dates the PR flow/i.test(review)) continue;
      expect(
        /AWAITING REVIEW/i.test(review),
        `Entry ${String(a.key)} still says AWAITING REVIEW, but entry ${String(newest.key)} exists.\n` +
          `Either step 3 was skipped, or entry ${String(a.key)} was merged by its own author.\n` +
          `The reviewing session must rewrite entry ${String(a.key)}'s REVIEW: line to record who reviewed ` +
          `it and what they found.\n` +
          `  REVIEW: ${review}`,
      ).toBe(false);
    }
  });

  /**
   * ⚠⚠ THE GUARD ABOVE READ ONLY THE FIELD'S FIRST PHYSICAL LINE — found by Entry 76's review.
   *
   * `parseAbstracts` stored `fields.REVIEW` as the remainder of the `- **REVIEW:**` line and dropped
   * every continuation line. **These documents are prettier-formatted at `printWidth: 100`, so where
   * the break falls is decided mechanically by the sentence's length — not by the author.** Phrase the
   * marker after any lead-in and it wraps onto line 2, where the guard could not see it.
   *
   * Measured on the real file before the fix: Entry 74's `REVIEW:` rewritten as
   *
   *     - **REVIEW:** ⚠ This entry is the currently open PR and the next session merges it at step 3 —
   *       **AWAITING REVIEW.**
   *
   * passed `prettier --check` **and** left `docs:check` fully GREEN — a stale marker on `main`, exactly
   * the condition the guard exists to make impossible. It is `REVIEW.md` item 6 in its purest form: the
   * test passed while its own title was false.
   *
   * ⚠ The fix is `fieldsFull`, which keeps the whole indented block. The check deliberately does NOT
   * use the abstract's `raw` text: Entry 75's own `VERIFIED:` field discusses the marker in prose
   * (*"restore Entry 74's stale `AWAITING REVIEW`"*), so a raw-text match would fire on the entry that
   * introduced the guard the moment it stopped being newest.
   */
  it('⚠⚠ sees a marker that prettier wrapped onto a continuation line', () => {
    const wrapped = [
      '## §7 — Entry abstracts (newest 10)',
      '',
      '### 99 | 2026-01-02 | Zayd | the newer entry, legitimately open',
      '',
      '- **REVIEW:** ⚠ **AWAITING REVIEW — this is the open PR.**',
      '',
      '### 98 | 2026-01-01 | Zayd | the stale one, merged by its own author',
      '',
      '- **REVIEW:** ⚠ This entry is the currently open PR and the next session merges it at step 3 —',
      '  **AWAITING REVIEW.**',
      '',
      '## §8 — Generated',
    ].join('\n');

    const stale = parseAbstracts(wrapped).find((a) => a.n === 98);
    expect(stale, 'the synthetic §7 must parse').toBeDefined();
    expect(reviewText(stale as EntryAbstract)).toMatch(/AWAITING REVIEW/i);

    // ...and the field is still ONE entry's worth: the next abstract must not bleed into it.
    expect(reviewText(stale as EntryAbstract)).not.toMatch(/§8|Generated/);
  });
});

describe('the generated blocks are present and current', () => {
  it('docs/CURRENT_STATE.md §8 has been generated', () => {
    const g = generatedBlock(src, MARKERS.state.begin, MARKERS.state.end);
    expect(g, 'docs/CURRENT_STATE.md is missing its GENERATED markers').not.toBeNull();
    expect(g!.body, 'docs/CURRENT_STATE.md §8 has never been generated — run `pnpm state`.').not.toMatch(
      /not yet generated/,
    );
    expect(g!.body).toMatch(/newest entry/);
  });

  it('§8 agrees with §7 about which entry is newest', () => {
    // The one place the generator and the hand-written section can disagree. If they do, someone
    // hand-edited §8 or added an abstract without re-running `pnpm state`.
    const g = generatedBlock(src, MARKERS.state.begin, MARKERS.state.end)!;
    const newest = newestAbstract(abstracts);
    expect(g.body, `§8 does not name entry ${newest.id} as newest — run \`pnpm state\`.`).toContain(
      `${newest.id} (${newest.seat}`,
    );
  });

  // ⚠⚠ SUPERSEDED 2026-08-14 (D82, Entry 91): 'both prompts still carry their FRESH markers' is
  // retired along with the §2 DYNAMIC block it guarded. Prompts are stateless now — see
  // `docs/CURRENT_STATE.md §1d` and `AGENTS.md` for what replaced the mechanism this test protected.
});

describe('the doc tree is intact', () => {
  it('every file the reading order names actually exists', () => {
    // §1c-7's disease applied to the docs themselves: a pointer nobody followed. After a move, this
    // is the check that would have caught a stale path.
    for (const p of [
      'docs/contracts/core_logic.md',
      'docs/contracts/architecture.md',
      'docs/contracts/V1.0.0_spec.md',
      'docs/contracts/v1.0.0_imp_plan.md',
      'docs/decisions.md',
      'docs/PHASE_LOG.md',
      'docs/reviews/review_prompt.md',
      'docs/design/handoff_system_design.md',
      'REVIEW.md',
      'open_rulings.md',
    ]) {
      expect(
        existsSync(join(ROOT, p)),
        `${p} is named in the reading order but does not exist`,
      ).toBe(true);
    }
  });

  it('.prettierignore still exempts the prose docs at their CURRENT paths', () => {
    // ⚠ These are PATHS. A stale entry does not error — it silently stops exempting a file, and
    // format:check is CI step 3, which failed silently for six sessions once already.
    const ignore = readFileSync(join(ROOT, '.prettierignore'), 'utf8');
    for (const p of [
      'docs/contracts/core_logic.md',
      'docs/contracts/v1.0.0_imp_plan.md',
      'docs/CURRENT_STATE.md',
      'handoff/',
    ]) {
      expect(ignore, `.prettierignore does not exempt ${p}`).toContain(p);
    }
  });
});

/**
 * ⚠⚠ THE GATE READ THE FILE AS IT WAS COMMITTED, NOT AS IT IS CHECKED OUT — and on Amer's box those
 * are different files (found Entry 80, the first Amer session under this handoff system).
 *
 * The local PC has `core.autocrlf=true`, so `docs/CURRENT_STATE.md` arrives in the working tree with 920
 * CRLF pairs. `parseAbstracts` split on `\n`, leaving `\r` on every line, and its heading regex ends
 * `\| (.+)$` — JS `.` does not match `\r` and `$` (no `m` flag) does not match before one. So no
 * heading matched, `abstracts` was `[]`, and FIVE of this file's tests failed there while CI stayed
 * green, every session, invisibly to the only machine that runs CI.
 *
 * ⚠ AND THE SILENT HALF WAS WORSE THAN THE LOUD ONE. `pnpm state` took the same empty array through
 * `reduce(…, null)` and wrote `**(none)**` into §8 and `ENTRY ?` into `Amer_Prompt.md`'s FRESH —
 * which loop step 10(a) pushes STRAIGHT TO MAIN, ahead of its own PR. The next session's "am I
 * behind?" check would have been a question mark, and nothing would have errored.
 *
 * ⚠ Weak-green (REVIEW.md item 6): both variants are derived from the REAL file, so this fails on an
 * LF box too — it is not a Windows-only test that a Linux CI can never exercise, which is the whole
 * point. The LF parse is asserted non-empty first, so it cannot pass by both sides returning `[]`.
 */
/**
 * ⚠⚠ THE ENTRY KEY IS NOT UNIQUE, AND THIS IS WHERE THAT IS MEASURED RATHER THAN CLAIMED.
 *
 * `abstractKey` states the fact and points here on purpose: a count written into a comment is
 * falsified by the next abstract, which is exactly what happened to the `⚠ MEASURED` note this
 * replaces — it said *"not unique across §7 today"* in a commit whose own rotation had just left §7
 * with zero collisions.
 *
 * The generator is **any two turns by one seat on one task on one day**, and it has two live routes:
 * D88's two review steps, and `agent-start.mjs --continue` returning a defect to its builder. Both
 * are CORRECT turns, which is why there is no uniqueness gate — a §7-scoped one would be green on
 * most days and red on a turn that did nothing wrong, and a gate that cries wolf is edited to shut
 * up. What IS checkable is that every collision is a pair of distinct turns rather than one abstract
 * written twice, and that is what this asserts.
 */
describe('the entry key collides, and every collision is a turn-PAIR', () => {
  const recorded = recordedAbstracts(ROOT);
  const byKey = new Map<string, typeof recorded>();
  for (const a of recorded) {
    const k = String(a.key);
    byKey.set(k, [...(byKey.get(k) ?? []), a]);
  }
  const collisions = [...byKey.values()].filter((g) => g.length > 1);

  it('collisions exist across §7 + docs/PHASE_LOG.md — the population invariant 10 makes permanent', () => {
    expect(
      collisions.length,
      'no colliding key in the record — the claim in `abstractKey` is now false',
    ).toBeGreaterThan(0);
    // …and §7 alone is not the scope that decides: the record is strictly larger than the window.
    expect(recorded.length).toBeGreaterThan(parseAbstracts(readCurrentState(ROOT)).length);
  });

  /**
   * ⚠ THE PROPERTY THAT KEEPS THE COLLISION OUT OF `baselineEntryIssues`. A durable reference
   * resolves to a turn-PAIR, and the half that gate reads is the date — so a collision is harmless
   * exactly as long as both members carry one date. That holds because the date is IN the key, which
   * is what this pins: an `abstractKey` narrowed to drop it would make a reference ambiguous about
   * the one field the gate compares.
   */
  it('every colliding key is one task, one seat, ONE DAY', () => {
    for (const group of collisions) {
      const k = String(group[0]?.key);
      expect(new Set(group.map((a) => a.id)).size, `${k}: not one task`).toBe(1);
      expect(new Set(group.map((a) => a.seat)).size, `${k}: not one seat`).toBe(1);
      expect(new Set(group.map((a) => a.date)).size, `${k}: not one day`).toBe(1);
    }
  });
});

describe('the doc parser reads the file as it is CHECKED OUT, not as it was committed', () => {
  const lf = src.replace(/\r?\n/g, '\n');
  const crlf = src.replace(/\r?\n/g, '\r\n');
  const identity = (a: EntryAbstract) => `${a.n}|${a.date}|${a.agent}|${a.headline}`;

  it('finds the same abstracts whichever line ending the working tree has', () => {
    const fromLf = parseAbstracts(lf);
    expect(
      fromLf.length,
      'the LF parse found nothing — the rest of this test would be vacuous',
    ).toBeGreaterThan(0);
    expect(parseAbstracts(crlf).map(identity)).toEqual(fromLf.map(identity));
  });

  it('carries no carriage return into a parsed field', () => {
    const parsed = parseAbstracts(crlf);
    // ⚠ Without this line the loop below is vacuous on exactly the broken parser it exists to catch —
    // caught by revert-verifying my own test, which is the point of doing it.
    expect(parsed.length, 'the CRLF parse found nothing, so the loop below proves nothing').toBe(
      parseAbstracts(lf).length,
    );
    for (const a of parsed) {
      for (const [name, value] of Object.entries(a.fieldsFull)) {
        expect(value, `entry ${String(a.key)}'s ${name} kept a \\r`).not.toMatch(/\r/);
      }
    }
  });

  it('REFUSES an empty parse instead of answering `(none)`', () => {
    // The guard `pnpm state` now runs before it writes anything. A parser that finds nothing has not
    // discovered an empty §7 — §7 is never empty here — it has failed, and must say so.
    expect(() => newestAbstract([])).toThrow(/ZERO abstracts/);
    expect(newestAbstract(parseAbstracts(crlf)).n).toBe(
      Math.max(...parseAbstracts(lf).map((a) => a.n)),
    );
  });

  it('is the guard `pnpm state` actually runs, not one this test calls in private', () => {
    // ⚠ The two assertions above prove the guard works; this one proves it is WIRED. Without it the
    // test passes while `state.mjs` keeps its own silent `reduce(…, null)` — a green test asserting
    // something weaker than its own name, which is this repo's most expensive recurring defect.
    const state = readFileSync(join(ROOT, 'scripts/state.mjs'), 'utf8');
    expect(state, '`pnpm state` no longer calls newestAbstract').toMatch(
      /const newest = newestAbstract\(abstracts\)/,
    );
    expect(state, '`pnpm state` still has a silent default for the newest entry').not.toMatch(
      /abstracts\.reduce\(/,
    );
  });
});
