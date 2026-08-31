// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * VIEW FILTER — headless assertions for the pure visibility logic (P4.5 design §7). GL draws nothing
 * here; this is all decision logic, so it is verified in Node per the standing split.
 */

import { describe, expect, it } from 'vitest';
import type { ElementId } from '@bunyan/document';
import {
  EMPTY_FILTER,
  isElementVisible,
  isPartVisible,
  isPristine,
  toggleHidden,
  toggleInSet,
  type ViewFilter,
} from './viewFilter';

const WALL = 'wall-1' as ElementId;
const DOOR = 'door-1' as ElementId;

describe('the empty filter shows everything', () => {
  it('is pristine and hides nothing', () => {
    expect(isPristine(EMPTY_FILTER)).toBe(true);
    expect(isElementVisible(EMPTY_FILTER, WALL, 'core.wall')).toBe(true);
    expect(isPartVisible(EMPTY_FILTER, WALL, 'core.wall', 'structure')).toBe(true);
  });
});

describe('hide / show', () => {
  it('hides only the hidden element, and toggles back', () => {
    const hidden = toggleHidden(EMPTY_FILTER, WALL);
    expect(isPristine(hidden)).toBe(false);
    expect(isElementVisible(hidden, WALL, 'core.wall')).toBe(false);
    expect(isElementVisible(hidden, DOOR, 'core.opening')).toBe(true);
    expect(isElementVisible(toggleHidden(hidden, WALL), WALL, 'core.wall')).toBe(true);
  });
});

describe('isolate overrides hide and type', () => {
  const filter: ViewFilter = {
    hidden: new Set([DOOR]), // even a hidden element…
    isolated: DOOR, //           …is the isolated one ⇒ it wins and shows
    types: new Set(['core.wall']),
    disciplines: null,
  };
  it('shows only the isolated element regardless of other element-level gates', () => {
    expect(isElementVisible(filter, DOOR, 'core.opening')).toBe(true);
    expect(isElementVisible(filter, WALL, 'core.wall')).toBe(false);
  });
});

describe('type filter (element level)', () => {
  const filter: ViewFilter = {
    ...EMPTY_FILTER,
    types: new Set(['core.wall']),
  };
  it('shows only elements whose typeId is in the set', () => {
    expect(isElementVisible(filter, WALL, 'core.wall')).toBe(true);
    expect(isElementVisible(filter, DOOR, 'core.opening')).toBe(false);
  });
});

describe('discipline filter (part level) — a discipline is a property of the PART, not the element (D45)', () => {
  const filter: ViewFilter = {
    ...EMPTY_FILTER,
    disciplines: new Set(['structure']),
  };
  it('drops a finishes part while keeping the structure part of the SAME element', () => {
    expect(isPartVisible(filter, WALL, 'core.wall', 'structure')).toBe(true);
    expect(isPartVisible(filter, WALL, 'core.wall', 'finishes')).toBe(false);
    // The element is still "visible" at the element level — only the one part is dropped.
    expect(isElementVisible(filter, WALL, 'core.wall')).toBe(true);
  });
});

describe('toggleInSet — null means "all", and re-checking every member collapses back to null', () => {
  const universe = ['core.wall', 'core.opening', 'core.curtainwall'];
  it('unchecking from "all" yields the complement', () => {
    const next = toggleInSet(null, 'core.opening', universe);
    expect(next).not.toBeNull();
    expect(next?.has('core.wall')).toBe(true);
    expect(next?.has('core.opening')).toBe(false);
  });
  it('re-checking the last missing member returns to null (pristine "all")', () => {
    const missingOne = new Set(['core.wall', 'core.opening']); // curtainwall unchecked
    expect(toggleInSet(missingOne, 'core.curtainwall', universe)).toBeNull();
  });
});
