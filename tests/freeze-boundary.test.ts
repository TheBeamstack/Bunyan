/**
 * THE FREEZE BOUNDARY — the machine that decides `RISK: additive` vs `RISK: contract-touching`.
 *
 * ⚠⚠ WHY IT EXISTS. The P5 freeze is the one irreversible act in this project: after it a wrong
 * contract costs an amendment across three products (`.bnn` files in the field, Miqdar, Planitor).
 * Until 2026-07-31 the question *"did this change touch a frozen shape?"* was answered by an agent
 * remembering to ask. This project's own backward sweep scores memory-enforced rules at NINE DIRTY
 * OUT OF EIGHTEEN, and its transferable finding is that **a rule holds when violating it is LOUD**
 * (`current_state.md` §1c-8). This is that loudness, for the one rule where being wrong is permanent.
 *
 * WHAT A FAILURE MEANS. Not necessarily a mistake — it means the PR is **contract-touching**, so:
 *   1. it is `RISK: contract-touching` and the **OWNER merges it**, not the reviewing agent; and
 *   2. if the change is intended, the owner rules and the baseline is re-generated in the same PR:
 *        node -e "import('./scripts/frozen-surface.mjs').then(...)"   (see scripts/state.mjs --rebaseline)
 *
 * ⚠⚠ AND IT IS THE FREEZE MECHANISM ITSELF, AVAILABLE EARLY. The freeze has been "the owner's act"
 * for seventeen entries partly because it is a prose declaration with nothing enforcing it. Once this
 * baseline exists, freezing is a one-line policy change — *the baseline may no longer be updated
 * without an owner ruling* — and this test holds the line afterwards.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  baselineEntryIssues,
  baselineSnapshot,
  buildSurface,
  diffSurface,
  WATCHED,
} from '../scripts/frozen-surface.mjs';
import type { FrozenSurface } from '../scripts/frozen-surface.mjs';
import {
  abstractKey,
  newestAbstract,
  parseAbstracts,
  readCurrentState,
  riskVerdict,
  SYNTHETIC_ENTRY_BASE,
} from '../scripts/docs-state.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

interface Snapshot {
  _baselinedAt: string;
  /** An author-written legacy number, or a new-scheme `abstractKey` — never a §7 position (T-024). */
  _baselinedAtEntry: number | string;
  _declarationCount: number;
  surface: FrozenSurface;
}

const snapshot = JSON.parse(
  readFileSync(new URL('./frozen-surface.snapshot.json', import.meta.url), 'utf8'),
) as Snapshot;

describe('the frozen surface', () => {
  it('has not moved since the baseline — any diff means RISK: contract-touching', () => {
    const current = buildSurface(ROOT);
    const { added, removed, changed } = diffSurface(snapshot.surface, current);

    const report = [
      changed.length ? `CHANGED (${changed.length}):\n  ${changed.join('\n  ')}` : '',
      removed.length ? `REMOVED (${removed.length}):\n  ${removed.join('\n  ')}` : '',
      added.length ? `ADDED   (${added.length}):\n  ${added.join('\n  ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    expect(
      report,
      report &&
        '\n\n⚠⚠ THIS PR IS `RISK: contract-touching`.\n' +
          'A shape that freezes at P5 has moved. That is not automatically wrong — but it is the\n' +
          'OWNER who merges it, never the reviewing agent. If the change is intended and ruled,\n' +
          'regenerate tests/frozen-surface.snapshot.json in this same PR and say so in the entry.\n' +
          '⚠ AFTER THE FREEZE, re-baselining requires an owner ruling. That policy IS the freeze.\n',
    ).toBe('');
  });

  it('watches every file that carries a shape freezing at P5', () => {
    // A frozen shape in an unwatched file is invisible to this gate — the one way it can be wrong.
    // These are the files current_state.md §2 names as freezing; keep the two lists in step.
    for (const rel of [
      'packages/protocol/src/subshape.ts',
      'packages/document/src/entities.ts',
      'packages/document/src/scene.ts',
      'packages/document/src/schema.ts',
      'packages/document/src/types.ts',
      'packages/document/src/undo.ts',
    ]) {
      expect(WATCHED).toContain(rel);
    }
  });

  it('carries the load-bearing declarations by name, so a silent deletion is caught', () => {
    // diffSurface already reports a removal, but naming them here makes the intent legible: these
    // are the shapes whose disappearance would be a three-product amendment.
    const declsIn = (file: string): string => {
      const entry = snapshot.surface[file];
      expect(entry, `${file} is missing from the baseline entirely`).toBeDefined();
      return Object.keys(entry ?? {}).join(' ');
    };
    expect(declsIn('packages/document/src/scene.ts')).toMatch(/const SCENE_SCHEMA_VERSION/);
    expect(declsIn('packages/protocol/src/subshape.ts')).toMatch(/SubShapeRef/);
    expect(declsIn('packages/document/src/undo.ts')).toMatch(/UndoableEdit/);
    expect(declsIn('packages/document/src/types.ts')).toMatch(/BimObjectType/);
  });
});

/* ================================================================================================
 * THE VERDICT ITSELF — Q15. The gate above decides WHETHER the surface moved; these decide WHAT THE
 * REVIEWER IS TOLD, which is the thing `REVIEW.md` item 7 and the loop's step 3 actually route on.
 * ============================================================================================= */

describe('the RISK verdict — the word a reviewer routes on (Q15)', () => {
  const MOVED = ['packages/document/src/scene.ts :: interface Scene'];

  it('says `additive` when nothing moved, and `contract-touching` when something did', () => {
    expect(riskVerdict([]).risk).toBe('additive');
    expect(riskVerdict([]).label).toBe('additive');
    expect(riskVerdict(MOVED).risk).toBe('contract-touching');
    expect(riskVerdict(MOVED).label).toBe('contract-touching');
  });

  /**
   * ⚠⚠ THE DEFECT, AND IT POINTED THE WRONG WAY ON EXACTLY THE PRs THAT MATTER.
   *
   * `pnpm state --rebaseline` used to overwrite the verdict with `additive` once it had rewritten the
   * baseline — reasoning that the surface now matches the file beside it. It does, and that is not
   * the question. **The only PR that ever runs `--rebaseline` is a PR that moved the frozen surface**,
   * so the flag printed *"the reviewing agent merges this"* onto every owner-gated PR in the repo.
   * An agent merging an owner-gated PR on a label the tooling gave it is the Entry 74 failure with a
   * machine as the excuse.
   */
  it('⚠⚠ still says contract-touching after `--rebaseline` — the flag is a QUALIFIER, not an answer', () => {
    const v = riskVerdict(MOVED, true);
    expect(v.risk).toBe('contract-touching');
    expect(v.label).toBe('contract-touching (re-baselined)');
    // ⚠ Weak-green guard: assert the word `additive` is nowhere in what a reviewer reads. A label of
    // `additive (re-baselined)` would satisfy a `toContain('re-baselined')` check and be the old bug.
    expect(`${v.label} ${v.detail}`).not.toMatch(/additive/);
    expect(v.detail).toMatch(/baseline REWRITTEN this session/);
  });

  it('the label still starts with the word the abstract schema checks', () => {
    // `docs-budget` requires an entry's `RISK:` field to match /^(additive|contract-touching)/, and an
    // author copies the printed label. Both forms must satisfy it.
    for (const label of [riskVerdict([], true).label, riskVerdict(MOVED, true).label]) {
      expect(label).toMatch(/^(additive|contract-touching)/);
    }
  });

  /**
   * ⚠⚠ THIS IS A GREP, AND A GREP IS A PROXY FOR EXECUTION — read `tests/state-risk-e2e.test.ts`
   * first. It is kept because it names the two shapes that must never come back, and it is worth
   * exactly that much: it was GREEN throughout the defect that e2e file exists for, because
   * `state.mjs` did call `riskVerdict` — with an input that had already been erased.
   *
   * ⚠ It also asserted the call's ARGUMENT LIST verbatim (`riskVerdict(moved, rebaselining)`), so it
   * failed on the fix and passed on the bug — the exact inversion a source-text assertion invites.
   * It matches the CALL now, and the e2e file measures what the call produces.
   */
  it('is the verdict `pnpm state` actually prints, not one this test computes in private', () => {
    const state = readFileSync(new URL('../scripts/state.mjs', import.meta.url), 'utf8');
    expect(state, '`pnpm state` no longer calls riskVerdict').toMatch(/riskVerdict\(\s*moved/);
    expect(state, '`pnpm state` still overwrites the risk after re-baselining').not.toMatch(
      /risk\s*=\s*'additive'/,
    );
    expect(state, "§8's frozen-surface row no longer prints the verdict's label").toMatch(
      /RISK: \$\{riskLabel\}/,
    );
  });
});

describe('the baseline file records WHICH ENTRY authorised it (Q15)', () => {
  /**
   * ⚠⚠ `_baselinedAtEntry` WAS CARRIED FORWARD BY `...prev` AND WRITTEN BY NOTHING. It read `72`
   * beside a `_baselinedAt` of `2026-08-03` — Entry 77's re-baseline — so the audit trail back to the
   * ruling that permits touching the freeze pointed five entries wide of it, and no test looked. The
   * rebaseline write ran BEFORE `state.mjs` parsed §7, which is why it never had the number to write.
   */
  it('writes the entry identity instead of inheriting a stale one', () => {
    const prev = { _README: 'keep me', _baselinedAt: '2026-08-03', _baselinedAtEntry: 72 };
    const next = baselineSnapshot(
      prev,
      { 'a.ts': { 'interface A': 'deadbeef' } },
      {
        entry: 'T-081 — 2026-08-05 — zayd',
        at: '2026-08-05',
      },
    ) as unknown as Snapshot & { _README: string };

    expect(next._baselinedAtEntry, 'the stale 72 survived the write').toBe(
      'T-081 — 2026-08-05 — zayd',
    );
    expect(next._baselinedAt).toBe('2026-08-05');
    expect(next._declarationCount).toBe(1);
    // Fields this function does not own still ride through — that is what `...prev` is for.
    expect(next._README).toBe('keep me');
  });

  it('counts declarations across every watched file, not just the first', () => {
    const next = baselineSnapshot(
      {},
      { 'a.ts': { 'interface A': 'x', 'type B': 'y' }, 'b.ts': { 'const C': 'z' } },
      { entry: 'T-081 — 2026-08-05 — zayd', at: '2026-08-05' },
    ) as unknown as Snapshot;
    expect(next._declarationCount).toBe(3);
  });

  it('the committed baseline names an entry that exists, and no longer names 72', () => {
    // ⚠⚠ THIS ASSERTION USED TO BE `toBe(77)` + `toBe('2026-08-03')`, AND IT WAS A THIRD HAND-MAINTAINED
    // CONSTANT (Entry 83). Entry 80's standing lesson is *"you cannot fix a hand-maintained constant by
    // adding another hand-maintained constant — ask WHO COMPUTES IT"*, and Q15's whole fix was to make
    // `_baselinedAtEntry` COMPUTED from the §7 parse. Pinning the literal it computed on one particular
    // day put the constant straight back: every LEGITIMATE re-baseline then fails this test, which is a
    // gate that cries wolf — and a gate that cries wolf is edited to shut up. It fired on exactly that,
    // Entry 83's own re-baseline (`expected 83 to be 77`), having asserted something STRONGER AND
    // DIFFERENT from its own title for two entries.
    //
    // ⚠⚠ AND ENTRY 83's REPLACEMENT — `expect(entries).toContain(...)` INLINE HERE — HAD THE SAME
    // DISEASE ONE STEP FURTHER OUT (found by Entry 84's review, which Entry 83's own checklist item 1
    // asked for). §7 is a ROTATING TEN-ENTRY WINDOW, so membership in it is not existence; the next
    // test measures the difference. The rule now lives in `baselineEntryIssues`, beside the writer it
    // audits, and is checked against a population that does not rot.
    expect(baselineEntryIssues(snapshot, parseAbstracts(readCurrentState(ROOT)))).toEqual([]);
  });

  /**
   * ⚠⚠ THE GATE MUST SURVIVE §7's ROTATION, AND THIS IS THE TEST THAT SAYS SO.
   *
   * `parseAbstracts` reads §7, whose own rotation rule caps it at ten abstracts. Entry **76** is a
   * real entry — its abstract is in `docs/history.md` §C, its body is
   * `handoff/zayd/2026-08-02-entry74-late-review.md` — and it is NOT in §7. A baseline naming it is a
   * repo that has not touched a frozen shape in a while, which is the CORRECT state, and after the P5
   * freeze it is the MANDATORY one: `_README` says the file may not be updated without an owner ruling.
   *
   * ⇒ Under the previous assertion (`expect(§7 numbers).toContain(entry)`) this scenario is RED with
   * nothing wrong. Revert `baselineEntryIssues` to that membership test and the second expectation
   * below fails; the first is what proves the scenario is real rather than hypothetical.
   */
  it('⚠ an entry that has ROTATED OUT of §7 still exists — the gate must not cry wolf', () => {
    const abstracts = parseAbstracts(readCurrentState(ROOT));

    // The premise, measured rather than assumed: 76 really has left the window.
    expect(abstracts.map((a) => a.n)).not.toContain(76);

    // …and it is still a real entry, so a baseline naming it is sound.
    expect(
      baselineEntryIssues({ _baselinedAtEntry: 76, _baselinedAt: '2026-08-02' }, abstracts),
    ).toEqual([]);
  });

  /**
   * ⚠ THE HALF THAT REPLACES WHAT `toContain` WAS REACHING FOR — and it costs no constant.
   *
   * Q15's defect was `_baselinedAtEntry: 72` sitting beside `_baselinedAt: '2026-08-03'`, which is
   * ENTRY 77's date. The two fields disagreed, so the disagreement was detectable without anyone
   * remembering a number. A new-scheme key carries its own date, so the same check needs no §7
   * lookup at all; the legacy half still resolves in §7 and SKIPS once the named entry rotates.
   */
  it("⚠⚠ catches Q15's own shape: an entry whose date disagrees with the one beside it", () => {
    const abstracts = parseAbstracts(readCurrentState(ROOT));

    // The new-scheme form — the only one a rebaseline writes from here on.
    expect(
      baselineEntryIssues(
        { _baselinedAtEntry: 'T-024 — 2026-08-19 — zayd', _baselinedAt: '2026-08-18' },
        abstracts,
      ),
    ).toEqual([
      '_baselinedAtEntry T-024 — 2026-08-19 — zayd is dated 2026-08-19, ' +
        'but _baselinedAt says 2026-08-18',
    ]);

    // The legacy form, on a fixture: §7 holds no `### N | …` entry any more, so a real-file
    // assertion here would be measuring an empty set.
    const legacy = parseAbstracts(
      [
        '## §7 — Entry abstracts (newest 10)',
        '',
        '### 88 | 2026-01-02 | Zayd | the newer legacy entry',
        '',
        '- **RISK:** additive',
        '',
        '### 87 | 2026-01-01 | Zayd | the older legacy entry',
        '',
        '- **RISK:** additive',
        '',
        '## §8 — Generated',
      ].join('\n'),
    );
    expect(
      baselineEntryIssues({ _baselinedAtEntry: 88, _baselinedAt: '2026-01-01' }, legacy),
    ).toEqual(['_baselinedAtEntry 88 is dated 2026-01-02 in §7, but _baselinedAt says 2026-01-01']);

    // A legacy number that has not happened yet — the shape a mistyped constant takes.
    expect(
      baselineEntryIssues({ _baselinedAtEntry: 89, _baselinedAt: '2026-01-02' }, legacy),
    ).toEqual(['_baselinedAtEntry is 89, but the newest entry that exists is 88']);

    // And the historical number stays pinned.
    expect(
      baselineEntryIssues({ _baselinedAtEntry: 72, _baselinedAt: '2026-08-03' }, abstracts).join(),
    ).toContain('72');
  });
});

/* ================================================================================================
 * T-024 — `_baselinedAtEntry` IS AN IDENTITY, NOT A §7 POSITION.
 *
 * ⚠⚠ THE DEFECT THIS BLOCK PINS, AND IT COST THE RECORD RATHER THAN A RE-RUN. `parseAbstracts`
 * mints `n = 1000 - i` over §7's array order, so `1000` names "whatever is newest" — and a baseline
 * that recorded it re-pointed at a different entry the moment a turn prepended its abstract. Every
 * such turn then failed the gate having moved no declaration. Its two escape hatches were falsifying
 * the abstract's date and `pnpm state --rebaseline`, which records nothing and is owner-gated after
 * the freeze; the turn that hit it second took neither and archived its abstract out of §7 instead.
 * ============================================================================================= */

describe('the baseline names an entry, not a position (T-024)', () => {
  /** §7 as it looks on the turn that trips this: an abstract appended a day after the baseline. */
  const crossDay = parseAbstracts(
    [
      '## §7 — Entry abstracts (newest 10)',
      '',
      '### T-024 — the turn appending today’s abstract — 2026-08-19 — seat: zayd',
      '',
      '- **RISK:** additive',
      '',
      '### STEWARD-unblock-pc-and-chrome-boot — the turn that re-baselined — 2026-08-18 — seat: brahim',
      '',
      '- **RISK:** additive (re-baselined)',
      '',
      '## §8 — Generated',
    ].join('\n'),
  );
  // ⚠ A fixture that failed to parse must FAIL, never resolve to `undefined` and assert nothing —
  // the same rule `newestAbstract` applies to an empty §7.
  const authorising = crossDay[1];
  if (authorising === undefined) throw new Error('the T-024 fixture did not parse two abstracts');

  it('⚠⚠ a §7 append on a later day leaves a sound baseline GREEN — the whole of T-024', () => {
    // The premise, measured rather than assumed: the newest abstract really does postdate the
    // baseline, which is the input the positional key could not survive.
    expect(newestAbstract(crossDay).date).toBe('2026-08-19');
    expect(authorising.date).toBe('2026-08-18');

    expect(
      baselineEntryIssues(
        { _baselinedAtEntry: abstractKey(authorising), _baselinedAt: authorising.date },
        crossDay,
      ),
    ).toEqual([]);
  });

  it('⚠ the positional key is REFUSED, on the same input that used to make it lie', () => {
    // `1000` resolves to the 2026-08-19 abstract here, not to the 2026-08-18 one that authorised the
    // baseline — which is exactly how a turn that moved no declaration went red.
    expect(newestAbstract(crossDay).n).toBe(SYNTHETIC_ENTRY_BASE);
    expect(
      baselineEntryIssues(
        { _baselinedAtEntry: SYNTHETIC_ENTRY_BASE, _baselinedAt: authorising.date },
        crossDay,
      ),
    ).toEqual([
      `_baselinedAtEntry is ${SYNTHETIC_ENTRY_BASE}, ` +
        'which is a §7 POSITION and not an entry identity (T-024)',
    ]);
  });

  it('the committed baseline records a key, and it resolves to a real §7 abstract', () => {
    // ⚠ Weak-green guard: the test above passes on a fixture the repo never sees. This one measures
    // the file that actually gates every PR.
    expect(typeof snapshot._baselinedAtEntry, 'the baseline still records a position').toBe(
      'string',
    );
    const named = parseAbstracts(readCurrentState(ROOT)).find(
      (a) => a.key === snapshot._baselinedAtEntry,
    );
    expect(named, `${String(snapshot._baselinedAtEntry)} names no abstract in §7`).toBeDefined();
    expect(named?.date).toBe(snapshot._baselinedAt);
  });

  it('⚠ the gate is repaired, not removed — a key whose date is not the baseline’s still fails', () => {
    const lying = `${authorising.id} — 2026-01-01 — ${authorising.seat}`;
    expect(
      baselineEntryIssues({ _baselinedAtEntry: lying, _baselinedAt: authorising.date }, crossDay),
    ).toHaveLength(1);
  });

  it('refuses anything that is neither a legacy number nor a key', () => {
    for (const bad of [null, 'T-024', '', 0, -3, { id: 'T-024' }]) {
      expect(
        baselineEntryIssues(
          { _baselinedAtEntry: bad as never, _baselinedAt: '2026-08-18' },
          crossDay,
        ).join(),
        `${JSON.stringify(bad)} was accepted as an entry identity`,
      ).toMatch(/not an entry identity/);
    }
  });
});
