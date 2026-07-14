/**
 * THE PEI GENERATOR — a monotonic ULID (decision **D44**).
 *
 * ⚠⚠ WHY NOT A COUNTER, WHICH IS WHAT THIS REPLACED. The counter was rebuilt on load by scanning the
 * ids of the elements that **survived** — so deleting `wall-3`, saving, reloading and creating gave the
 * new element the id `wall-3`. **A dead PEI handed to a different building element**, silently. And a
 * PEI is not an internal convenience: Planitor's progress records and Miqdar's analytical model both
 * bind to it, and §4i of the handoff *promises them* that Bunyan's reconciliation queue is empty by
 * construction — so nobody downstream is even looking for a mis-binding.
 *
 * ⚠ AND THE SECOND REASON, WHICH IS THE ONE THAT MADE IT A RULING RATHER THAN A BUG FIX: a
 * document-local counter **collides between two co-editing peers**, and fixing that needs an id
 * allocator, which is a **backend** — and D37 forbids Bunyan a backend. So a counter does not merely
 * risk reuse; it **forecloses real-time co-editing**, a declared north-star, which domain rule 8
 * forbids. A ULID is globally unique with no allocator and no coordination: the north-star stays open,
 * and id reuse becomes **impossible by construction** rather than prevented by care.
 *
 * Crockford base32, 10 chars of millisecond timestamp + 16 chars of randomness.
 *
 * ⚠ **Monotonic within a millisecond.** Two ids minted in the same tick must not collide, and
 * `Date.now()` has ~1 ms resolution while this code mints thousands of ids per ms (a 195-element
 * building loads in one). So within a tick the random tail is **incremented**, not re-drawn — the
 * standard ULID monotonic rule. Without it, a 10 000-id loop collides on birthday odds alone.
 */

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32: no I, L, O, U.
const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;

let lastTime = 0;
/** The random tail of the last id minted in `lastTime`'s millisecond, as base32 digit values. */
let lastRandom: number[] = [];

function randomDigits(): number[] {
  const bytes = new Uint8Array(RANDOM_LENGTH);
  crypto.getRandomValues(bytes);
  // 0-255 → 0-31. The top 3 bits are discarded rather than folded: a modulo would bias the low digits,
  // and a biased ULID tail is a smaller collision space than the one we think we have.
  return [...bytes].map((byte) => byte & 0x1f);
}

/** Increment the tail by one, in base32, right to left. The overflow case is astronomically rare. */
function incrementDigits(digits: readonly number[]): number[] {
  const next = [...digits];
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i]! < 31) {
      next[i]!++;
      return next;
    }
    next[i] = 0; // carry
  }
  // Every one of 16 digits was 'Z' — 32^16 ids in one millisecond. Re-draw rather than wrap silently.
  return randomDigits();
}

function encodeTime(time: number): string {
  let out = '';
  let rest = time;
  for (let i = 0; i < TIME_LENGTH; i++) {
    out = ALPHABET[rest % 32]! + out;
    rest = Math.floor(rest / 32);
  }
  return out;
}

/** A fresh ULID — lexicographically sortable, globally unique, no allocator, no backend. */
export function ulid(now: number = Date.now()): string {
  if (now === lastTime) {
    lastRandom = incrementDigits(lastRandom);
  } else {
    lastTime = now;
    lastRandom = randomDigits();
  }
  return encodeTime(now) + lastRandom.map((digit) => ALPHABET[digit]!).join('');
}

/**
 * The **PEI**: a readable prefix plus a ULID — `wall-01J8Z3K7Q2…`.
 *
 * The prefix is for humans and logs only; **nothing may parse meaning out of it** (a wall whose type is
 * later re-registered is still the same element). The id after it is the identity.
 */
export function mintPei(prefix: string): string {
  return `${prefix}-${ulid()}`;
}
