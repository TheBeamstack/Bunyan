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
  baselineSnapshot,
  buildSurface,
  diffSurface,
  WATCHED,
} from '../scripts/frozen-surface.mjs';
import type { FrozenSurface } from '../scripts/frozen-surface.mjs';
import { riskVerdict } from '../scripts/docs-state.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

interface Snapshot {
  _baselinedAt: string;
  _baselinedAtEntry: number;
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

  it('is the verdict `pnpm state` actually prints, not one this test computes in private', () => {
    // ⚠ The assertions above prove the function; this proves it is WIRED. Without it the tests pass
    // while `state.mjs` keeps its own `risk = 'additive'` override — a green test asserting something
    // weaker than its own name, this repo's most expensive recurring defect.
    const state = readFileSync(new URL('../scripts/state.mjs', import.meta.url), 'utf8');
    expect(state, '`pnpm state` no longer calls riskVerdict').toMatch(
      /riskVerdict\(moved, rebaselining\)/,
    );
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
  it('writes the entry number instead of inheriting a stale one', () => {
    const prev = { _README: 'keep me', _baselinedAt: '2026-08-03', _baselinedAtEntry: 72 };
    const next = baselineSnapshot(
      prev,
      { 'a.ts': { 'interface A': 'deadbeef' } },
      {
        entry: 81,
        today: '2026-08-05',
      },
    ) as unknown as Snapshot & { _README: string };

    expect(next._baselinedAtEntry, 'the stale 72 survived the write').toBe(81);
    expect(next._baselinedAt).toBe('2026-08-05');
    expect(next._declarationCount).toBe(1);
    // Fields this function does not own still ride through — that is what `...prev` is for.
    expect(next._README).toBe('keep me');
  });

  it('counts declarations across every watched file, not just the first', () => {
    const next = baselineSnapshot(
      {},
      { 'a.ts': { 'interface A': 'x', 'type B': 'y' }, 'b.ts': { 'const C': 'z' } },
      { entry: 81, today: '2026-08-05' },
    ) as unknown as Snapshot;
    expect(next._declarationCount).toBe(3);
  });

  it('the committed baseline names an entry that exists, and no longer names 72', () => {
    // ⚠ The number the defect left behind. This is the one assertion that fails on the OLD snapshot,
    // which is why the file itself is corrected in this entry rather than left for the next rebaseline.
    expect(snapshot._baselinedAtEntry).toBe(77);
    expect(snapshot._baselinedAt).toBe('2026-08-03');
  });
});
