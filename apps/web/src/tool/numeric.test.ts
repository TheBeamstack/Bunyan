// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Numeric entry tests (P4.5 §6) — the input that cannot lie.
 *
 * ⚠ The interesting assertions here are the REFUSALS. A numeric field that clamps, flips or guesses is
 * worse than one that waits, because the user believes the number they typed.
 */

import { describe, expect, it } from 'vitest';

import type { Vec3 } from '@bunyan/protocol';
import { applyNumericKey, opensNumericEntry, parseLengthMm, pointAtLength } from './numeric';

/** Thread a whole key sequence through the reducer, exactly as the controller does, one key at a time. */
function type(keys: readonly string[], allowed = true): string | null {
  let text: string | null = null;
  for (const key of keys) text = applyNumericKey(text, key, { allowed }).text;
  return text;
}

describe('parseLengthMm', () => {
  it('reads a plain millimetre value', () => {
    expect(parseLengthMm('5000')).toBe(5000);
    expect(parseLengthMm(' 2500.5 ')).toBe(2500.5);
  });

  it('⚠ refuses zero and negatives rather than clamping or flipping the direction', () => {
    // A negative "length" means the user wants the other way — which they say by POINTING there. Flipping
    // for them would be the tool inventing intent.
    expect(parseLengthMm('0')).toBeNull();
    expect(parseLengthMm('-3000')).toBeNull();
  });

  it('leaves the pointed position in force for a half-typed value', () => {
    for (const partial of ['', '   ', '-', '5e', 'abc', '.']) {
      expect(parseLengthMm(partial), partial).toBeNull();
    }
  });

  it('refuses Infinity and NaN, however they are spelled', () => {
    expect(parseLengthMm('Infinity')).toBeNull();
    expect(parseLengthMm('NaN')).toBeNull();
  });
});

describe('pointAtLength — the exact override', () => {
  const anchor: Vec3 = [1000, 500, 0];

  it('places the point at EXACTLY the typed length along the pointed direction', () => {
    // Cursor is somewhere off along +X; typing 5000 must land exactly 5000 away, not near it.
    const p = pointAtLength(anchor, [9999, 500, 0], 5000)!;
    expect(p[0]).toBeCloseTo(6000, 9);
    expect(p[1]).toBeCloseTo(500, 9);
    expect(Math.hypot(p[0] - anchor[0], p[1] - anchor[1], p[2] - anchor[2])).toBeCloseTo(5000, 9);
  });

  it('keeps the direction on a diagonal, and the length exact', () => {
    const p = pointAtLength([0, 0, 0], [3, 4, 0], 100)!;
    expect(p[0]).toBeCloseTo(60, 9);
    expect(p[1]).toBeCloseTo(80, 9);
  });

  it('⚠ returns null when the cursor is ON the anchor — there is no direction to go', () => {
    // Choosing one (+X, say) would place a wall the user never indicated.
    expect(pointAtLength(anchor, [...anchor] as Vec3, 5000)).toBeNull();
    expect(pointAtLength(anchor, [1000, 500, 1e-12], 5000)).toBeNull();
  });
});

describe('applyNumericKey — the field as a reducer, and the regression it was extracted for', () => {
  it('⚠⚠ ACCUMULATES a sequence: typing 5,0,0,0 gives "5000" — measured as "0" before Entry 70s fix', () => {
    // The original bug: each keystroke read a stale captured value and overwrote the field, so a wall
    // would have been committed at 0 mm. This threads the state explicitly, which is the fix.
    expect(type(['5', '0', '0', '0'])).toBe('5000');
    expect(type(['1', '.', '5'])).toBe('1.5');
  });

  it('does not open unless the tool declares numeric entry applies to this input', () => {
    expect(type(['5', '0'], false)).toBeNull();
  });

  it('Enter asks the caller to commit, and leaves the text intact for it to parse', () => {
    const open = applyNumericKey(null, '5', { allowed: true });
    const more = applyNumericKey(open.text, '0', { allowed: true });
    const entered = applyNumericKey(more.text, 'Enter', { allowed: true });
    expect(entered).toEqual({ text: '50', consumed: true, commit: true });
  });

  it('Escape closes the field, and consumes the key so it does not also clear the selection', () => {
    expect(applyNumericKey('500', 'Escape', { allowed: true })).toEqual({
      text: null,
      consumed: true,
      commit: false,
    });
  });

  it('⚠ backspacing the LAST character closes the field rather than leaving an empty open box', () => {
    expect(type(['5', 'Backspace'])).toBeNull();
    expect(type(['5', '0', 'Backspace'])).toBe('5');
  });

  it('⚠ a key it does not want is NOT consumed — the app keyboard owner still sees it', () => {
    // If this ever returned consumed:true, Ctrl+Z would die the moment a numeric field was open.
    expect(applyNumericKey('500', 'z', { allowed: true }).consumed).toBe(false);
    expect(applyNumericKey(null, 'Escape', { allowed: true }).consumed).toBe(false);
  });
});

describe('opensNumericEntry', () => {
  it('opens on digits and a decimal point', () => {
    for (const key of ['0', '5', '9', '.']) expect(opensNumericEntry(key), key).toBe(true);
  });

  it('⚠ does NOT swallow letters or named keys — the app has ONE keydown owner (Entry 67)', () => {
    // A tool that opened on every key would break Esc, undo/redo and every future shortcut.
    for (const key of ['a', 'z', 'Escape', 'Enter', 'Tab', 'Shift', 'ArrowUp', '-']) {
      expect(opensNumericEntry(key), key).toBe(false);
    }
  });
});
