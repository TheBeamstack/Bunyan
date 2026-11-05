// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `scripts/pr-ready.mjs` — the PR title/mergeable check.
 *
 * The title half is a pure predicate and is called directly. The mergeable half needs GitHub, so the
 * `view` seam is injected — ⚠ NOT to avoid testing it, but because the ONE behaviour worth pinning
 * here is the `UNKNOWN` poll, and `UNKNOWN` is a transient state you cannot ask a real API to hold
 * still in. A test that could not reproduce it would be a test of the happy path wearing its name.
 */
import { describe, expect, it } from 'vitest';
import { checkPr, mergeableState, titleRoutes, type PrView } from '../../scripts/pr-ready.mjs';

/** A `gh pr view` stand-in: answers the title/head/author read with `pr` and the poll with `mergeable`. */
function fakeView(pr: PrView, mergeable = 'MERGEABLE') {
  return (_root: string, _n: unknown, fields: string[]): PrView =>
    fields.includes('mergeable') ? { mergeable, mergeStateStatus: null } : pr;
}

const BOT = { login: 'app/dependabot', is_bot: true };
const BUMP = 'Bump vite from 6.4.3 to 6.4.4';
const DEP_HEAD = 'dependabot/npm_and_yarn/vite-6.4.4';
const poll = { attempts: 2, waitMs: 1 };

describe('a dependabot PR routes by its head branch and bot author', () => {
  it('routes a dependabot head opened by the dependabot app', () => {
    const view = fakeView({ title: BUMP, headRefName: DEP_HEAD, author: BOT });
    const got = checkPr({ root: '.', pr: '118', view, poll });
    expect(got.failures).toEqual([]);
    expect(got.passes.join('\n')).toMatch(/routed as a dependency PR/);
  });

  it('refuses the same head opened by a human', () => {
    const view = fakeView({
      title: BUMP,
      headRefName: DEP_HEAD,
      author: { login: 'davidian-abdo', is_bot: false },
    });
    expect(checkPr({ root: '.', pr: '118', view, poll }).failures).toHaveLength(1);
  });

  it('refuses the same title on a non-dependabot head, even from the bot', () => {
    const view = fakeView({ title: BUMP, headRefName: 'task/T-068-x', author: BOT });
    expect(checkPr({ root: '.', pr: '118', view, poll }).failures).toHaveLength(1);
  });

  it('still fails a dependabot PR GitHub reports CONFLICTING or UNKNOWN', () => {
    for (const state of ['CONFLICTING', 'UNKNOWN']) {
      const view = fakeView({ title: BUMP, headRefName: DEP_HEAD, author: BOT }, state);
      const got = checkPr({ root: '.', pr: '118', view, poll });
      expect(got.failures, state).toHaveLength(1);
      expect(got.failures?.[0], state).toMatch(state === 'UNKNOWN' ? /UNKNOWN/ : /not mergeable/);
    }
  });

  it('refuses a bare dependabot title, which carries no head or author', () => {
    expect(checkPr({ root: '.', title: BUMP }).failures).toHaveLength(1);
  });
});

describe('the title predicate', () => {
  it('accepts the two routable shapes', () => {
    expect(titleRoutes('T-001: the versioned entity pattern')).toBe(true);
    expect(titleRoutes('STEWARD: five-seat scaffolding')).toBe(true);
  });

  it('refuses a branch-slug title — what `gh pr create --fill` produces', () => {
    expect(titleRoutes('task/T-001-versioned-entity-pattern')).toBe(false);
    expect(titleRoutes('Entry 91: the old numbering')).toBe(false);
    expect(titleRoutes('')).toBe(false);
    expect(titleRoutes(undefined)).toBe(false);
  });

  it('requires the separator, so `T-001` alone does not route', () => {
    expect(titleRoutes('T-001 the versioned entity pattern')).toBe(false);
    expect(titleRoutes('T-1: too few digits')).toBe(false);
  });
});

describe('the mergeable poll — UNKNOWN is not a pass', () => {
  it('returns the settled value once GitHub finishes computing', () => {
    let calls = 0;
    const view = () => {
      calls++;
      return calls < 3
        ? { mergeable: 'UNKNOWN', mergeStateStatus: null }
        : { mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' };
    };
    const got = mergeableState('.', 1, { attempts: 5, waitMs: 1, view });
    expect(got.mergeable).toBe('MERGEABLE');
    expect(calls).toBe(3);
  });

  it('reports UNKNOWN rather than green when GitHub never settles', () => {
    const view = () => ({ mergeable: 'UNKNOWN', mergeStateStatus: null });
    expect(mergeableState('.', 1, { attempts: 3, waitMs: 1, view }).mergeable).toBe('UNKNOWN');
  });

  it('stops polling immediately on a settled CONFLICTING', () => {
    let calls = 0;
    const view = () => {
      calls++;
      return { mergeable: 'CONFLICTING', mergeStateStatus: 'DIRTY' };
    };
    expect(mergeableState('.', 1, { attempts: 5, waitMs: 1, view }).mergeable).toBe('CONFLICTING');
    expect(calls, 'a settled verdict must not be re-polled').toBe(1);
  });

  it('surfaces an unreachable gh as null rather than as a pass', () => {
    const got = mergeableState('.', 1, { attempts: 2, waitMs: 1, view: () => null });
    expect(got.mergeable).toBeNull();
  });
});
