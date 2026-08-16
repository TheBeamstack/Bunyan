/**
 * `scripts/seats.mjs` — the registry, the machine gate, and reviewer routing. Pure functions, so this
 * imports and calls them directly (unlike `agent-start`/`agent-finish`, which are exercised by spawning
 * — see `agent-start.test.ts`'s header for why the split).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  builderFor,
  canClaim,
  dependsOn,
  machineOf,
  readRegistry,
  readyFor,
  reviewerFor,
  reviewFlipsToDone,
  reviewStepFor,
  reviewStepGate,
  roleOf,
  rowStatus,
  STEP1_LABEL,
  STEP1_LABEL_DESCRIPTION,
  taskField,
} from '../../scripts/seats.mjs';
import { makeFixture } from './fixture.mjs';

let fx: ReturnType<typeof makeFixture>;
afterEach(() => {
  fx?.cleanup();
});

describe('the registry', () => {
  beforeEach(() => {
    fx = makeFixture();
  });

  it('reads all five seats, in the shape docs/seats/README.md declares', () => {
    const rows = readRegistry(fx.dir);
    expect(rows.map((r) => r.seat).sort()).toEqual([
      'amer',
      'brahim',
      'hmdnah',
      'khalihlna',
      'zayd',
    ]);
    expect(machineOf(fx.dir, 'zayd')).toBe('box');
    expect(machineOf(fx.dir, 'amer')).toBe('pc');
    expect(roleOf(fx.dir, 'brahim')).toBe('steward');
  });

  it('refuses an unknown seat, naming the known ones', () => {
    expect(() => roleOf(fx.dir, 'nobody')).toThrow(/unknown seat 'nobody'/);
  });
});

describe('the machine gate — the safety-critical one', () => {
  beforeEach(() => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'a box task',
        area: 'kernel',
        machine: 'box',
        risk: 'normal',
      },
      {
        id: 'T-002',
        status: 'ready',
        title: 'a pc task',
        area: 'apps-web',
        machine: 'pc',
        risk: 'normal',
      },
      {
        id: 'T-003',
        status: 'ready',
        title: 'an any task',
        area: 'infra',
        machine: 'any',
        risk: 'normal',
      },
      {
        id: 'T-004',
        status: 'blocked',
        title: 'not ready yet',
        area: 'kernel',
        machine: 'box',
        risk: 'normal',
      },
    ]);
  });

  it('a box seat may claim a box task', () => {
    expect(canClaim(fx.dir, 'zayd', 'T-001')).toEqual({ ok: true });
  });

  it('REFUSES a box seat claiming a pc task, naming who it belongs to', () => {
    const v = canClaim(fx.dir, 'zayd', 'T-002');
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/machine: pc and seat 'zayd' is on machine: box/);
    expect(v.reason).toMatch(/amer/);
  });

  it('REFUSES a pc seat claiming a box task', () => {
    const v = canClaim(fx.dir, 'amer', 'T-001', {});
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/machine: box and seat 'amer' is on machine: pc/);
  });

  it('`any` is claimable by every machine', () => {
    expect(canClaim(fx.dir, 'zayd', 'T-003').ok).toBe(true);
    expect(canClaim(fx.dir, 'amer', 'T-003', { BUNYAN_BROWSER_CMD: 'node' }).ok).toBe(true);
  });

  it('a pc task additionally requires a real browser, probed rather than trusted', () => {
    // No BUNYAN_BROWSER_CMD, and PATH/known install locations are whatever this CI box actually has —
    // the point under test is that the SAME env with an override always succeeds.
    const withBrowser = canClaim(fx.dir, 'amer', 'T-002', { BUNYAN_BROWSER_CMD: 'node' });
    expect(withBrowser.ok).toBe(true);
    const withoutBrowser = canClaim(fx.dir, 'amer', 'T-002', {
      BUNYAN_BROWSER_CMD: '/definitely/not/a/real/binary/xyz',
      PATH: '',
    });
    expect(withoutBrowser.ok).toBe(false);
    expect(withoutBrowser.reason).toMatch(/REFUSED.*no browser was found/s);
  });

  it("`ready-for` lists only what this seat's machine can satisfy, in backlog order", () => {
    expect(readyFor(fx.dir, 'zayd')).toEqual(['T-001', 'T-003']);
    expect(readyFor(fx.dir, 'amer', { BUNYAN_BROWSER_CMD: 'node' })).toEqual(['T-002', 'T-003']);
  });

  it('`ready-for` never lists a `blocked` row, however satisfiable its machine', () => {
    expect(readyFor(fx.dir, 'zayd')).not.toContain('T-004');
  });
});

describe('dependency closure — an open PR is not a merged dependency', () => {
  beforeEach(() => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'done',
        title: 'already merged',
        area: 'kernel',
        machine: 'box',
        risk: 'normal',
      },
      {
        id: 'T-002',
        status: 'ready',
        title: 'depends on T-001, done',
        area: 'kernel',
        machine: 'box',
        risk: 'normal',
        dependsOn: 'T-001',
      },
      {
        id: 'T-003',
        status: 'ready',
        title: 'depends on T-004, only PR-open',
        area: 'kernel',
        machine: 'box',
        risk: 'normal',
        dependsOn: 'T-004',
      },
      {
        id: 'T-004',
        status: 'review',
        title: 'PR open, not yet merged',
        area: 'kernel',
        machine: 'box',
        risk: 'normal',
      },
    ]);
  });

  it('a task depending on a DONE (merged) task is claimable', () => {
    expect(canClaim(fx.dir, 'zayd', 'T-002')).toEqual({ ok: true });
  });

  it("REFUSES a task whose dependency is only 'review' (PR open, not merged)", () => {
    const v = canClaim(fx.dir, 'zayd', 'T-003');
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/T-003 depends on T-004, which is 'review', not 'done'/);
  });

  it('ready-for excludes a task whose dependency has not merged', () => {
    expect(readyFor(fx.dir, 'zayd')).toEqual(['T-002']);
  });
});

describe('reviewer routing — a pc claim needs a pc reviewer', () => {
  beforeEach(() => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'box work',
        area: 'kernel',
        machine: 'box',
        risk: 'normal',
      },
      {
        id: 'T-002',
        status: 'ready',
        title: 'pc work',
        area: 'apps-web',
        machine: 'pc',
        risk: 'normal',
      },
    ]);
  });

  it('a box task routes to the box reviewer', () => {
    expect(reviewerFor(fx.dir, 'T-001')).toEqual({ seat: 'hmdnah', solo: false });
  });

  it('a pc task routes to the pc reviewer, never the box one', () => {
    expect(reviewerFor(fx.dir, 'T-002')).toEqual({ seat: 'khalihlna', solo: false });
  });

  it("`machine: any` routes to the reviewer sharing the FINISHING seat's machine", () => {
    expect(reviewerFor(fx.dir, 'box', 'zayd')).toEqual({ seat: 'hmdnah', solo: false });
    expect(reviewerFor(fx.dir, 'pc', 'amer')).toEqual({ seat: 'khalihlna', solo: false });
  });
});

/**
 * `builderFor` — the `--continue` admission gate (T-015, D88). Symmetric with `reviewerFor` above,
 * but it must resolve from the task's `machine:` field ALONE: the §0b baton on a finished branch names
 * whichever seat last ran `agent-finish.mjs` there, which is the REVIEWER on the `--review` path, not
 * the builder `--continue` must admit.
 */
describe('builder routing — derived from machine:, never a baton', () => {
  beforeEach(() => {
    fx = makeFixture([
      {
        id: 'T-001',
        status: 'ready',
        title: 'box work',
        area: 'kernel',
        machine: 'box',
        risk: 'normal',
      },
      {
        id: 'T-002',
        status: 'ready',
        title: 'pc work',
        area: 'apps-web',
        machine: 'pc',
        risk: 'normal',
      },
    ]);
  });

  it('a box task is owned by the box builder', () => {
    expect(builderFor(fx.dir, 'T-001')).toEqual({ seat: 'zayd' });
  });

  it('a pc task is owned by the pc builder, never the box one', () => {
    expect(builderFor(fx.dir, 'T-002')).toEqual({ seat: 'amer' });
  });

  it("`machine: any` resolves to the builder sharing the FINISHING seat's machine, else box", () => {
    fx = makeFixture([
      {
        id: 'T-003',
        status: 'ready',
        title: 'either work',
        area: 'infra',
        machine: 'any',
        risk: 'normal',
      },
    ]);
    expect(builderFor(fx.dir, 'T-003', 'amer')).toEqual({ seat: 'amer' });
    expect(builderFor(fx.dir, 'T-003')).toEqual({ seat: 'zayd' });
  });

  it('throws for a task with no machine: field', () => {
    expect(() => builderFor(fx.dir, 'T-999')).toThrow(/no 'machine:' field/);
  });
});

/**
 * ⚠ Against the COMMITTED `docs/BACKLOG.md`, not a fixture. The fixture emitted unpadded table rows
 * while prettier pads every real row to its widest cell, so `readyFor`/`rowStatus` shipped matching
 * `| ready |` against a file that says `| ready   |` — green everywhere, zero rows claimable in the
 * live repo. A fixture can only test the shape it builds; this reads the shape that exists.
 */
describe('the real docs/BACKLOG.md, as prettier formats it', () => {
  const root = process.cwd();
  const backlog = readFileSync(join(root, 'docs/BACKLOG.md'), 'utf8');
  const ids = [...backlog.matchAll(/^### (T-\d{3}) — /gm)]
    .map((m) => m[1])
    .filter((id): id is string => id !== undefined);

  it('has task entries to parse at all', () => {
    expect(ids.length).toBeGreaterThan(0);
  });

  it('resolves a status for every task, from the padded summary table', () => {
    for (const id of ids) {
      expect(rowStatus(backlog, id), `${id} has no parseable status cell`).toMatch(
        /^(blocked|ready|review|done)$/,
      );
    }
  });

  it('exposes every ready row to at least one seat', () => {
    const ready = ids.filter((id) => rowStatus(backlog, id) === 'ready');
    expect(ready.length, 'no ready rows — the loop would idle forever').toBeGreaterThan(0);
    const reachable = new Set([
      ...readyFor(root, 'zayd'),
      ...readyFor(root, 'amer', { ...process.env, BUNYAN_BROWSER_CMD: process.execPath }),
    ]);
    for (const id of ready) {
      const blockedByDep = dependsOn(backlog, id).some((d) => rowStatus(backlog, d) !== 'done');
      if (!blockedByDep)
        expect(reachable.has(id), `${id} is ready but no seat can claim it`).toBe(true);
    }
  });

  it('gives every task a machine a seat can satisfy', () => {
    for (const id of ids) {
      expect(taskField(backlog, id, 'machine'), `${id} has no machine:`).toMatch(/^(any|box|pc)$/);
    }
  });
});

describe('the two-step review gate (D88, T-014)', () => {
  describe('reviewStepFor — which of the two turns a risk: high PR is on', () => {
    it('is null for anything but risk: high — one ordinary review turn', () => {
      expect(reviewStepFor('normal', [])).toBeNull();
      expect(reviewStepFor(undefined, [])).toBeNull();
      expect(reviewStepFor('high', [STEP1_LABEL])).not.toBeNull();
    });

    it('is step 1 when the PR carries no review/step-1 label yet', () => {
      expect(reviewStepFor('high', [])).toBe(1);
      expect(reviewStepFor('high', ['unrelated-label'])).toBe(1);
    });

    it('is step 2 once the review/step-1 label is on the PR', () => {
      expect(reviewStepFor('high', [STEP1_LABEL])).toBe(2);
      expect(reviewStepFor('high', ['unrelated-label', STEP1_LABEL])).toBe(2);
    });
  });

  describe('reviewStepGate — is `--step N` legal for this risk', () => {
    it('refuses an unreadable/absent risk, never defaulting to normal', () => {
      const v = reviewStepGate(undefined, null);
      expect(v.ok).toBe(false);
      expect(v.reason).toMatch(/no readable 'risk:' field/);
    });

    it('refuses risk: high with no --step', () => {
      const v = reviewStepGate('high', null);
      expect(v.ok).toBe(false);
      expect(v.reason).toMatch(/requires --step 1 or --step 2/);
    });

    it('accepts risk: high with --step 1 or --step 2', () => {
      expect(reviewStepGate('high', 1).ok).toBe(true);
      expect(reviewStepGate('high', 2).ok).toBe(true);
    });

    it('refuses risk: high with an out-of-range step', () => {
      expect(reviewStepGate('high', 3).ok).toBe(false);
    });

    it('refuses --step on a risk: normal (or any non-high) task', () => {
      const v = reviewStepGate('normal', 1);
      expect(v.ok).toBe(false);
      expect(v.reason).toMatch(/only risk: high uses a two-step review/);
    });

    it('accepts risk: normal with no --step — unchanged from before T-014', () => {
      expect(reviewStepGate('normal', null).ok).toBe(true);
    });
  });

  describe('reviewFlipsToDone — the exact decision T-014 exists to correct', () => {
    it('risk: high step 1 does NOT flip to done — the T-008/PR #23 defect this task closes', () => {
      expect(reviewFlipsToDone('high', 1, false)).toBe(false);
    });

    it('risk: high step 2 DOES flip to done', () => {
      expect(reviewFlipsToDone('high', 2, false)).toBe(true);
    });

    it('risk: normal flips to done regardless of step — unchanged from before T-014', () => {
      expect(reviewFlipsToDone('normal', null, false)).toBe(true);
    });

    it('contract-touching never flips, at any risk/step', () => {
      expect(reviewFlipsToDone('high', 2, true)).toBe(false);
      expect(reviewFlipsToDone('normal', null, true)).toBe(false);
    });

    it('REVERT-VERIFIED: the pre-T-014 formula stamps a risk: high step 1 `done` — this is the bug', () => {
      // `agent-finish.mjs --review` used to flip the row on `!contractTouching` alone, with no notion
      // of steps at all — exactly what shipped in PR #23 and had to be corrected by hand.
      const preT014Formula = (_risk: string, _step: number | null, contractTouching: boolean) =>
        !contractTouching;
      expect(preT014Formula('high', 1, false)).toBe(true); // RED: the old code stamps 'done'
      expect(reviewFlipsToDone('high', 1, false)).toBe(false); // GREEN: the fix leaves it 'review'
    });
  });

  // Regression for a defect hmdnah's step-2 review of T-014 (PR #28) found by actually running the
  // mechanism against GitHub's real API: `gh label create --description` refuses anything over 100
  // characters, so `agent-finish.mjs --step 1` could never create `review/step-1` on a repo where it
  // does not already exist — the exact state of every FIRST risk: high review. Proven live: the
  // unshortened description was 104 characters and `gh label create` returned "description is too
  // long (maximum is 100 characters)".
  it("STEP1_LABEL_DESCRIPTION fits GitHub's 100-character label description limit", () => {
    expect(STEP1_LABEL_DESCRIPTION.length).toBeLessThanOrEqual(100);
  });
});
