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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mergeableState } from '../../scripts/pr-ready.mjs';
import { PR_TITLE_RE, titleRoutes } from '../../scripts/seats.mjs';

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

  /**
   * ⚠ ONE REGEX, TWO CALLERS. `agent-finish.mjs` refuses to print a `gh pr create` line for a title
   * that does not route, and this CI step re-asks on the PR that actually exists. If the check ever
   * grows a second copy of the pattern, the two can disagree — and the one that is wrong is
   * whichever one nobody ran.
   */
  it('is the same regex agent-finish.mjs routes on', () => {
    const finish = readFileSync(join(process.cwd(), 'scripts/agent-finish.mjs'), 'utf8');
    expect(finish, 'agent-finish.mjs no longer calls seats.titleRoutes').toMatch(
      /seats\.titleRoutes\(title\)/,
    );
    expect(PR_TITLE_RE.source).toContain('STEWARD');
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
