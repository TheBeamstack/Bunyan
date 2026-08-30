// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE RE-SEED GATE'S *VALUE* CHECK — what actually changed in a golden, with the clock ignored (Q16).
 *
 * ⚠⚠ WHY THE PATH CHECK WAS NOT ENOUGH, AND IT HAS TWO WORKED EXAMPLES IN A ROW. The gate's rule was
 * *"if a commit touches geometry-producing code, it must also TOUCH the committed goldens"* — and
 * `seed-goldens` stamps a fresh `seededAt` on every run, so **a one-line timestamp diff satisfies it.**
 * A gate a clock can satisfy cannot tell *"re-seeded, geometry unchanged"* from *"re-seeded, geometry
 * MOVED, nobody looked"* — which is the exact hazard the gate exists to stop, named in its own comment
 * by Entry 74 and left half-fixed by Entry 75.
 *
 * ⚠ It is not hypothetical. **Entry 77** (the kernel C++ change) and **Entry 79** (the toolchain digest
 * pin) both shipped golden diffs that were `seededAt` and nothing else, and in both the only thing that
 * made compliance safe was an agent reading the diff by hand. Entry 79's was correct — a byte-identical
 * relink SHOULD move no value — and that is the point: the gate could not tell the safe case from the
 * dangerous one, so it certified both.
 *
 * ⇒ **The payload is the file with `seededAt` removed, canonicalised, and hashed.** Geometry changed +
 * payload hash unchanged is now a FAILURE with two honest ways out, both of which cost a sentence:
 * re-seed for real, or confirm in a commit message that the values are genuinely unmoved.
 *
 * ⚠ `env` is deliberately KEPT in the payload. It names the oracle build that produced these numbers
 * (`cadquery-ocp 7.9.3.1.1`, the Python, the platform), so a re-seed on a different oracle is a real
 * change to what the goldens certify — exactly the kind of movement this gate should notice.
 */

import { createHash } from 'node:crypto';

/** The field the seeder stamps on every run. The ONE thing excluded from the payload. */
export const CLOCK_FIELD = 'seededAt';

/**
 * The trailer that lets an author say *"the values really are unchanged, and here is why."*
 *
 * ⚠ A commit message rather than an env var or a CI input, deliberately: it lands in the repo's
 * history beside the diff it excuses, it is reviewable, and it cannot be set once and forgotten in a
 * workflow file. It requires a REASON — a bare marker with nothing after it does not match.
 */
export const CONFIRM_TRAILER = /^Re-seed-unchanged:\s*(\S.*)$/im;

/** The reason given in any of these commit messages, or `null` if none of them confirms. */
export function confirmationIn(messages) {
  for (const message of messages) {
    const m = CONFIRM_TRAILER.exec(message ?? '');
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * A stable string for any JSON value — keys sorted, so a re-serialisation that reorders them is not
 * mistaken for a change in what the goldens say.
 */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * The hash of a golden's payload — everything it asserts, with the clock removed.
 *
 * Returns `null` when the text is not parseable JSON, which the caller must treat as *"I cannot tell"*
 * rather than as *"unchanged"*: a gate that reads a parse failure as a pass is the silence-as-answer
 * mistake this repo keeps paying for (§1c-9).
 */
export function payloadHash(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  // ⚠ Rebuilt without the clock rather than `delete`d out of it: `no-dynamic-delete` is on, and a
  // copy is the honest operation anyway — this function must not mutate what it was handed.
  const payload =
    parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? Object.fromEntries(Object.entries(parsed).filter(([k]) => k !== CLOCK_FIELD))
      : parsed;
  return createHash('sha256').update(canonical(payload)).digest('hex').slice(0, 16);
}

/**
 * Did any golden's VALUES move between `before` and `after`?
 *
 * Both are `Map`/object of `path -> file text` (`null`/absent = the file did not exist on that side).
 * A golden that is new, deleted, or unparseable on either side counts as moved — the gate's job is to
 * refuse to certify what it cannot read, not to assume the best.
 */
export function goldenValuesMoved(before, after) {
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  const moved = [];
  for (const path of paths) {
    const a = before[path];
    const b = after[path];
    if (a === undefined || a === null || b === undefined || b === null) {
      moved.push(path);
      continue;
    }
    const ha = payloadHash(a);
    const hb = payloadHash(b);
    if (ha === null || hb === null || ha !== hb) moved.push(path);
  }
  return moved;
}
