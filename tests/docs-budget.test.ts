/**
 * THE DOC GATES — gate six of `pnpm verify`, and therefore of CI.
 *
 * ⚠⚠ WHY IT EXISTS. `current_state.md` is read IN FULL, by BOTH agents, on EVERY session, so its
 * length is a cost paid on every run. It grew **5.9× in eleven days** (67 KB → 394 KB) under a
 * rotation rule that was expressed as a COUNT ("more than 20 entries") while entry sizes doubled
 * underneath it. That rule then failed measurably: the 2026-07-30 compaction took the file
 * 377 KB → 296 KB and it was back to **393 KB the same day — larger than before the maintenance ran.**
 *
 * The rule is now a BYTE BUDGET and it is enforced here rather than remembered. This project's own
 * ledger scores memory-enforced rules at NINE DIRTY OUT OF EIGHTEEN; the two rules that never rotted
 * (`units-rule7`, `d19-boundary`) are the two with a test behind them.
 *
 * WHAT A FAILURE MEANS: compact §7 (move the oldest abstracts' summaries into `docs/history.md`,
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
  entryBodies,
  generatedBlock,
  MARKERS,
} from '../scripts/docs-state.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const src = readCurrentState(ROOT);
const abstracts = parseAbstracts(src);
const bodies = entryBodies(ROOT);
const bytes = (p: string) => (existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p)).length : 0);
const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;

describe('the handoff docs stay within budget', () => {
  it('current_state.md is under its byte budget', () => {
    const n = bytes('current_state.md');
    expect(
      n,
      `current_state.md is ${kb(n)}, over its ${kb(BUDGET.currentState)} budget.\n` +
        'Compact §7: move the oldest abstracts into docs/history.md — AFTER checking their durable\n' +
        'lessons are already promoted into §1–§5. That check is what makes compression safe.',
    ).toBeLessThanOrEqual(BUDGET.currentState);
  });

  it('§7 is under its byte budget and holds no more than ten abstracts', () => {
    expect(section7(src).length).toBeLessThanOrEqual(BUDGET.section7);
    expect(abstracts.length).toBeLessThanOrEqual(BUDGET.maxAbstracts);
  });

  it('decisions.md and history.md are under budget', () => {
    expect(bytes('docs/decisions.md')).toBeLessThanOrEqual(BUDGET.decisions);
    expect(bytes('docs/history.md')).toBeLessThanOrEqual(BUDGET.history);
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
        expect(Object.keys(a.fields), `Entry ${a.n} is missing the ${f}: field`).toContain(f);
        expect(a.fields[f]?.length ?? 0, `Entry ${a.n}'s ${f}: field is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('declares a RISK the freeze gate understands', () => {
    for (const a of abstracts) {
      expect(a.fields.RISK, `Entry ${a.n}`).toMatch(/^(additive|contract-touching)/);
    }
  });

  it('points at a body that exists, and every body has an abstract or is archived', () => {
    for (const a of abstracts) {
      const p = (a.fields.FULL ?? '').replace(/`/g, '').trim();
      expect(p, `Entry ${a.n}'s FULL: must name a handoff/ path`).toMatch(/^handoff\/\w+\/.+\.md$/);
      expect(existsSync(join(ROOT, p)), `Entry ${a.n}: ${p} does not exist`).toBe(true);
    }
    // The converse is deliberately weaker: a body may outlive its abstract (that is what rotation
    // does), but it must then be indexed in docs/history.md so nothing becomes unreachable.
    const history = readFileSync(join(ROOT, 'docs/history.md'), 'utf8');
    const referenced = new Set(abstracts.map((a) => a.fields.FULL?.replace(/`/g, '').trim()));
    for (const b of bodies) {
      if (referenced.has(b)) continue;
      expect(history, `${b} has no abstract and is not indexed in docs/history.md`).toContain(b);
    }
  });

  it('numbers entries uniquely and monotonically — the parallel-agent collision detector', () => {
    // Two agents working in parallel both claim the next number in their own PR. The second to merge
    // hits a git conflict on ONE §7 row; if it were ever resolved carelessly this test catches it.
    const ns = abstracts.map((a) => a.n);
    expect(new Set(ns).size, `duplicate entry numbers: ${ns.join(', ')}`).toBe(ns.length);
    expect([...ns], 'abstracts must be newest-first').toEqual([...ns].sort((x, y) => y - x));
  });
});

describe('the generated blocks are present and current', () => {
  it('current_state.md §8 has been generated', () => {
    const g = generatedBlock(src, MARKERS.state.begin, MARKERS.state.end);
    expect(g, 'current_state.md is missing its GENERATED markers').not.toBeNull();
    expect(g!.body, 'current_state.md §8 has never been generated — run `pnpm state`.').not.toMatch(
      /not yet generated/,
    );
    expect(g!.body).toMatch(/newest entry/);
  });

  it('§8 agrees with §7 about which entry is newest', () => {
    // The one place the generator and the hand-written section can disagree. If they do, someone
    // hand-edited §8 or added an abstract without re-running `pnpm state`.
    const g = generatedBlock(src, MARKERS.state.begin, MARKERS.state.end)!;
    const newest = abstracts.reduce((a, b) => (a.n > b.n ? a : b));
    expect(g.body, `§8 does not name entry ${newest.n} as newest — run \`pnpm state\`.`).toContain(
      `${newest.n} (${newest.agent}`,
    );
  });

  it('both prompts still carry their FRESH markers', () => {
    for (const f of ['Amer_Prompt.md', 'Zayd_Prompt.md']) {
      const p = readFileSync(join(ROOT, f), 'utf8');
      expect(p, `${f} lost its FRESH markers`).toContain(MARKERS.fresh.begin);
      expect(p).toContain(MARKERS.fresh.end);
    }
  });
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
      'docs/history.md',
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
      'current_state.md',
      'handoff/',
    ]) {
      expect(ignore, `.prettierignore does not exempt ${p}`).toContain(p);
    }
  });
});
