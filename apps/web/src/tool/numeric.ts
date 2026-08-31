// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * NUMERIC ENTRY — P4.5 design §6, the thing that makes a CAD tool precise rather than approximate.
 *
 * While a tool is collecting a point, typing a digit opens a small field pinned near the cursor. The
 * typed value **overrides the pointed dimension**: rubber-banding a wall and typing `5000` sets the length
 * to exactly 5000 mm along the direction the cursor is indicating. `Enter` commits it as the input, `Esc`
 * closes the field without committing.
 *
 * ⚠⚠ WHY THIS IS PART OF THE CORRECTNESS STORY AND NOT A CONVENIENCE. §4.4's rule is *"approximate never
 * commits silently"* — a Tier-1 snap point comes off a chord-approximated mesh and must be resolved before
 * it is recorded. A TYPED length is the other exact source: the user did not point at 5000, they SAID
 * 5000, so the committed coordinate is computed in closed form from the anchor and needs no Tier-2
 * round-trip at all. *Numeric entry is not a shortcut past snapping; it is the one input that cannot lie.*
 *
 * Pure — headless-verified.
 */

import type { Vec3 } from '@bunyan/protocol';

/**
 * Parse what the user typed into millimetres. Returns `null` for anything that is not a usable number, so
 * a half-typed value (`"5e"`, `"-"`, `""`) simply leaves the pointed position in force.
 *
 * ⚠ Zero and negatives are refused, not clamped: a zero-length wall is not an edit, and a negative length
 * means the user wants the OTHER direction — which they express by pointing there, not by typing a sign.
 * Silently flipping the direction under them would be the tool inventing intent.
 */
export function parseLengthMm(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/**
 * The point exactly `lengthMm` from `anchor`, in the direction of `towards`.
 *
 * ⚠ Returns `null` when the direction is degenerate (the cursor is on the anchor): there is no direction
 * to go, and picking one — +X, say — would place a wall the user never indicated. The field stays open
 * and the tool waits for the cursor to mean something.
 */
export function pointAtLength(anchor: Vec3, towards: Vec3, lengthMm: number): Vec3 | null {
  const dx = towards[0] - anchor[0];
  const dy = towards[1] - anchor[1];
  const dz = towards[2] - anchor[2];
  const norm = Math.hypot(dx, dy, dz);
  if (norm < 1e-9) return null;
  const scale = lengthMm / norm;
  return [anchor[0] + dx * scale, anchor[1] + dy * scale, anchor[2] + dz * scale];
}

/**
 * Should this keystroke open the numeric field? A digit, a decimal point, or a leading minus while a tool
 * is mid-gesture.
 *
 * ⚠ It deliberately does NOT open on every key: the app has exactly one `keydown` owner (Entry 67), and a
 * tool that swallowed letters would break `Esc`, undo/redo and every future shortcut. Digits only.
 */
export function opensNumericEntry(key: string): boolean {
  return /^[0-9.]$/.test(key);
}

/** What one keystroke does to the numeric field. `text: null` ⇒ the field is closed. */
export interface NumericKeyResult {
  /** The field's new contents, or `null` when it is (still) closed. */
  readonly text: string | null;
  /** Did the numeric field consume this key? (If not, the app's keyboard owner should see it.) */
  readonly consumed: boolean;
  /** Enter was pressed on an open field — the caller should turn `text` into a point and commit it. */
  readonly commit: boolean;
}

/**
 * The numeric field as a PURE REDUCER over (current text, key).
 *
 * ⚠⚠ IT IS EXTRACTED RATHER THAN INLINED BECAUSE OF THE BUG THAT MADE IT NECESSARY (Entry 70, found by
 * driving the tool in a real browser). The accumulation lived inside a React `useCallback` that closed
 * over `numericText`; React batches, so `5`,`0`,`0`,`0` arriving in one tick all read the SAME stale value
 * and each overwrote the last — the field showed **`0`** where `5000` was typed, and a wall would have
 * been committed at 0 mm had `parseLengthMm` not refused it. Slow human typing hides it entirely.
 *
 * ⇒ The state is now an explicit ARGUMENT, so the accumulation is a sequence the suite can thread values
 * through, and the caller (`useToolController`) is left with one job: pass the CURRENT value. *The bug was
 * not in the arithmetic — it was in who owned the state — so the test that guards it must be one that
 * feeds the state in.*
 */
export function applyNumericKey(
  current: string | null,
  key: string,
  options: { readonly allowed: boolean },
): NumericKeyResult {
  const closed: NumericKeyResult = { text: current, consumed: false, commit: false };

  if (current === null) {
    // Opening: only where the tool declares numeric entry applies, and only on a digit.
    if (options.allowed && opensNumericEntry(key))
      return { text: key, consumed: true, commit: false };
    return closed;
  }

  if (key === 'Escape') return { text: null, consumed: true, commit: false };
  if (key === 'Enter') return { text: current, consumed: true, commit: true };
  if (key === 'Backspace') {
    // Backspacing the last character CLOSES the field rather than leaving an empty box that looks open
    // but means nothing.
    const next = current.slice(0, -1);
    return { text: next === '' ? null : next, consumed: true, commit: false };
  }
  if (opensNumericEntry(key)) return { text: current + key, consumed: true, commit: false };

  return { text: current, consumed: false, commit: false };
}
