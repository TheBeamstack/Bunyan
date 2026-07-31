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
import { buildSurface, diffSurface, WATCHED } from '../scripts/frozen-surface.mjs';
import type { FrozenSurface } from '../scripts/frozen-surface.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

interface Snapshot {
  _baselinedAt: string;
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
