// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-071 (incident B-20261122-02): the docs-budget gate counts only git-tracked handoff bodies.
 *
 * `agent_finish.py` requires the turn's body at `handoff/<seat>/<file>.md` and no commit carries it
 * (diwan `docs/LANE-CONTRACT.md §7`), so a disk walk made every finish's own body fail `pnpm verify`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { entryBodies, unindexedBodies } from '../scripts/docs-state.mjs';

let root = '';
const TRACKED = 'handoff/zayd/2026-11-22-T-999-tracked.md';
const UNTRACKED = 'handoff/zayd/2026-11-22-T-998-untracked.md';

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'bunyan-t071-'));
  execFileSync('git', ['-c', 'init.defaultBranch=main', 'init', '-q', root]);
  mkdirSync(join(root, 'handoff', 'zayd'), { recursive: true });
  for (const p of [TRACKED, UNTRACKED, 'handoff/README.md']) writeFileSync(join(root, p), '# x\n');
  execFileSync('git', ['-C', root, 'add', TRACKED, 'handoff/README.md']);
});

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

describe('entryBodies — git-tracked handoff bodies only (T-071)', () => {
  it('omits an untracked body on disk, so the docs-budget check passes with it present', () => {
    const bodies = entryBodies(root);
    expect(bodies).not.toContain(UNTRACKED);
    expect(unindexedBodies(bodies, new Set([TRACKED]), '')).toEqual([]);
  });

  it('still fails a tracked body that has no abstract and no PHASE_LOG.md index', () => {
    const bodies = entryBodies(root);
    expect(bodies).toEqual([TRACKED]);
    expect(unindexedBodies(bodies, new Set(), 'no mention here')).toEqual([TRACKED]);
    expect(unindexedBodies(bodies, new Set(), `indexed: ${TRACKED}`)).toEqual([]);
  });
});
