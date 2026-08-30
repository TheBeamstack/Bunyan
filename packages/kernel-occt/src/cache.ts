// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE GEOMETRY CACHE'S VERIFICATION HALF (D29, owner ruling 2026-07-14: SHIP).
 *
 * `kernel.cpp` measures; this file **digests, compares and refuses.** Everything that decides whether a
 * cached solid may hand out identity tokens is here, in one file, because it is the only part of Bunyan
 * where a wrong answer produces a *plausible* wrong building: a window silently hosted on a different
 * wall, months later, with every volume correct.
 *
 * ⚠⚠ THE ONE SENTENCE THE WHOLE DESIGN RESTS ON: **the recipe is the source of truth, so a refusal is
 * free.** A stale, re-ordered, corrupted or hostile cache costs a rebuild and never a wrong name — which
 * is what makes shipping a file that carries identity tokens safe at all, and why every check below
 * refuses rather than repairs. Nothing here ever tries to *recover* an identity by matching geometry;
 * that is the one thing D1 forbids, and it is the tempting fix for every failure this file reports.
 *
 * THE BINDING RULE, AND WHY IT IS NOT THE ONE THE RULING'S STEP 1 DESCRIBES.
 *
 * D29's step 1 says *"bind by CANONICAL ORDER … the same deterministic canonical re-sort the resolver
 * already applies before assigning identities (D8)."* **That sort is over DERIVATIONS** (`rowLess` in
 * `kernel.cpp`: relation, role, ancestors) — and a shape read back from a cache has no derivations,
 * because the recipe never ran. So the resolver's sort is not available on the import side, and the
 * implementable form of the ruling is:
 *
 *   1. bind by the READ SHAPE'S OWN sub-shape order (`TopExp::MapShapes`) — MEASURED to survive a
 *      `BRepTools` round trip on every shape class we build (box, holed wall, round column);
 *   2. **and pin that order with the fingerprint**, which is a digest over the quantised geometry of
 *      every sub-shape *in sequence*. A permuted file therefore digests differently and is refused.
 *
 * ⚠ That is strictly stronger than re-deriving the order by SORTING on the same geometry, which was the
 * obvious alternative: a sort re-normalises any permutation, so its digest can only detect that the
 * geometry changed — never that the tokens landed on the wrong sub-shapes. Verification beats matching.
 *
 * ⚠ AND THE HOLE BOTH FORMS SHARE, WHICH IS WHY `fingerprintOf` REFUSES ON A TIE: two sub-shapes with
 * the SAME quantised signature are indistinguishable to the digest, so their tokens could swap unseen.
 * That is D28 rule 4 verbatim (*"a collision is a defect, not a fallback — surface it"*). Measured on
 * every solid the shipped types build (`core.wall` incl. cut by a door, `core.opening`'s leaf and frame,
 * `core.curtainwall`'s panels and mullions — 16 solids, 18–34 sub-shapes each): **zero ties.** So the
 * refusal is a tripwire, not a path.
 */

import { KernelFailureError, kernelFailure } from '@bunyan/protocol';
import type { KernelFailureCode } from '@bunyan/protocol';

/** One sub-shape's quantised geometry. Every field is an integer on the mm grid (`toGrid`, D28). */
export interface SignatureRow {
  /** This sub-shape's index into the shape's ref arrays. -1 ⇒ it carries no name. */
  readonly canonical: number;
  /** A face's AREA (mm²) or an edge's LENGTH (mm), quantised. */
  readonly measure: number;
  readonly cx: number;
  readonly cy: number;
  readonly cz: number;
}

export interface ShapeSignature {
  readonly faces: readonly SignatureRow[];
  readonly edges: readonly SignatureRow[];
}

const FIELDS_PER_ROW = 5;

/**
 * The fingerprint's scheme tag. It is part of the compared string, so a future scheme does not silently
 * compare equal to this one — it mismatches, and a mismatch is a rebuild (free).
 */
export const FINGERPRINT_SCHEME = 'bnn1';

/**
 * ⚠ 8 MB per solid. Real ones measure 1–6 KB (a wall layer 2.7 KB, a wall cut by a window 5.5 KB, a
 * round column 1.1 KB), so this is ~1000× the observed size: it is a bound on absurdity, not a budget.
 * A cache is a bet we may abandon, so the cheapest possible refusal is the right one.
 */
export const MAX_BREP_BYTES = 8 * 1024 * 1024;

function fail(code: KernelFailureCode, message: string, op: string): never {
  throw new KernelFailureError(kernelFailure(code, message, { op }));
}

/** Read the flat `shapeSignature` vector. One boundary crossing per number, tens of numbers. */
export function parseSignature(flat: readonly number[], op: string): ShapeSignature {
  if (flat.length < 2) fail('INTERNAL', 'the kernel returned no signature for this shape', op);
  const nFaces = flat[0] ?? 0;
  const nEdges = flat[1] ?? 0;
  if (flat.length !== 2 + (nFaces + nEdges) * FIELDS_PER_ROW) {
    fail(
      'INTERNAL',
      `the signature vector is ${String(flat.length)} long, which does not match ` +
        `${String(nFaces)} faces + ${String(nEdges)} edges`,
      op,
    );
  }
  const rows: SignatureRow[] = [];
  for (let at = 2; at < flat.length; at += FIELDS_PER_ROW) {
    rows.push({
      canonical: flat[at] ?? -1,
      measure: flat[at + 1] ?? 0,
      cx: flat[at + 2] ?? 0,
      cy: flat[at + 3] ?? 0,
      cz: flat[at + 4] ?? 0,
    });
  }
  return { faces: rows.slice(0, nFaces), edges: rows.slice(nFaces) };
}

/** The digested text. ⚠ `canonical` is deliberately NOT in it — see `fingerprintOf`. */
function digestInput(signature: ShapeSignature, refs: readonly string[]): string {
  const row = (r: SignatureRow): string =>
    `${String(r.measure)},${String(r.cx)},${String(r.cy)},${String(r.cz)}`;
  return (
    `${FINGERPRINT_SCHEME}|F=${String(signature.faces.length)}|E=${String(signature.edges.length)}|` +
    `${signature.faces.map(row).join(';')}|${signature.edges.map(row).join(';')}|` +
    // ⚠⚠ THE TOKENS ARE IN THE DIGEST, AND THE RULED DESIGN DID NOT SAY SO — see `fingerprintOf`.
    refs.join(';')
  );
}

/**
 * The fingerprint of a shape as the kernel actually measures it — **the same function on both sides of
 * the round trip**, which is what makes the producer's rule and the consumer's rule one rule rather than
 * two that agree today.
 *
 * ⚠ `canonical` is excluded from the digest on purpose. It is the *name's* index, not the shape's
 * geometry: on export it is the resolver's permutation, and on import it is the identity permutation, so
 * digesting it would guarantee that no cache ever verified. What the digest pins is the **sequence of
 * geometries**, which is exactly what a re-ordered or edited file breaks.
 *
 * ⚠ IT REFUSES ON A TIE. Two sub-shapes of one kind sharing a quantised signature cannot be told apart
 * by any check downstream, so their tokens could swap undetected. Refusing at WRITE time means no
 * unverifiable cache is ever produced (D76's discipline: refuse the lie where it is minted), and
 * refusing at READ time means a hand-made one is not honoured either.
 *
 * ⚠⚠ **THE TOKENS THEMSELVES ARE IN THE DIGEST, AND §4j-2's RULED DESIGN DID NOT SAY SO — FOUND BY
 * WRITING THE TAMPER TEST.** The ruling defines the fingerprint as *"a digest over each named sub-shape's
 * measured geometry"*, recomputed from the shape read. Over the geometry alone it authenticates the
 * **shape** and says nothing about the **binding**: swap two face tokens in the `refs` array and every
 * check still passes — the digest matches (the shape is untouched), the count matches, the kinds match,
 * there are no duplicates — and the op hands back a solid with two identities on the wrong faces. **That
 * is exactly the outcome the whole design exists to prevent**, and it is reachable because `refs` travels
 * in the same untrusted `.bnn` as the bytes: the ruling guarded the binary half and left the metadata
 * half unguarded. So the digest covers the token sequence too, and a permuted list is `CACHE_STALE`.
 * *(The same shape as D70 and D76: the identity-bearing half of a payload was outside the check that
 * exists to authenticate it.)*
 */
export function fingerprintOf(
  signature: ShapeSignature,
  refs: readonly string[],
  op: string,
): string {
  for (const [kind, rows] of [
    ['face', signature.faces],
    ['edge', signature.edges],
  ] as const) {
    const seen = new Map<string, number>();
    for (const r of rows) {
      const key = `${String(r.measure)},${String(r.cx)},${String(r.cy)},${String(r.cz)}`;
      const first = seen.get(key);
      if (first !== undefined) {
        fail(
          'INVALID_RESULT',
          `two ${kind}s of this solid share one quantised geometric signature ` +
            `(${kind} ${String(first)} and ${String(rows.indexOf(r))}: ${key}) — a cache cannot ` +
            `distinguish them, so its tokens could swap unseen. Refusing to treat this shape as ` +
            `cacheable rather than issue a fingerprint that cannot verify what it claims (D28 rule 4)`,
          op,
        );
      }
      seen.set(key, rows.indexOf(r));
    }
  }
  return `${FINGERPRINT_SCHEME}:${sha256Hex(digestInput(signature, refs))}`;
}

/**
 * Emit the shape's tokens in the SHAPE'S OWN sub-shape order — the order `importBrep` re-attaches them
 * in, because it is the only order a reader can re-derive.
 *
 * ⚠ It refuses a sub-shape with no name (`canonical` -1). A cache that restores 33 of 34 identities is
 * not a faster load; it is a solid with a hole in its naming, and the hole would surface later as an
 * `UNRESOLVED_SUBSHAPE_REF` on whatever was hosted there.
 */
export function refsInShapeOrder(
  signature: ShapeSignature,
  faceRefs: readonly string[],
  edgeRefs: readonly string[],
  op: string,
): string[] {
  const pick = (rows: readonly SignatureRow[], refs: readonly string[], kind: string): string[] =>
    rows.map((r, at) => {
      const token = r.canonical < 0 ? undefined : refs[r.canonical];
      if (token === undefined) {
        fail(
          'INVALID_RESULT',
          `${kind} ${String(at)} of this solid carries no identity (canonical index ` +
            `${String(r.canonical)} of ${String(refs.length)}), so it cannot be restored from a cache`,
          op,
        );
      }
      return token;
    });
  return [...pick(signature.faces, faceRefs, 'face'), ...pick(signature.edges, edgeRefs, 'edge')];
}

/**
 * ⚠⚠ THE UNTRUSTED-INPUT GUARD — the required deliverable of D29 (§4j-2), and it is not decoration.
 *
 * A `.bnn` is a file a user can be **sent**, and `geometry-cache.brep` is the only part of it that
 * reaches a parser other than `JSON.parse`. Three things are refused **before OCCT is entered at all**,
 * and each one is here because it was MEASURED against native OCCT 7.9.3 (2026-07-30):
 *
 *   1. **Size.** Bounded (`MAX_BREP_BYTES`) — a cache is abandonable, so a big one is not worth reading.
 *   2. **7-bit ASCII.** The BRep format is text. Refusing a high byte means **the "only binary in a
 *      `.bnn`" is never handed to OCCT as binary** — it is handed over as a validated text document.
 *      (It also removes the `TextDecoder` question entirely: nothing can be silently rewritten into
 *      U+FFFD on its way in.)
 *   3. **Declared table counts must be plausible for the file's own SIZE.** ⚠ This is the one that
 *      matters, and nothing about it is hypothetical: **`Curve2ds 999999999` in a 93-BYTE file costs
 *      ~56 s of pure spin** — linear in the declared count (~57 ns each, no allocation, measured at
 *      1e3/1e5/1e6/1e7) — and OCCT then reports it as an ordinary null shape. A 93-byte file that
 *      consumes a minute of a worker is a denial of service on the load path of a *shared file*. No
 *      record can be described in fewer than two bytes, so `count ≤ bytes / 2` is a bound derived from
 *      the file itself rather than a magic number, and a real file is orders of magnitude inside it.
 *
 * ⚠ What is NOT claimed: this does not make OCCT's reader safe against everything. It makes the CHEAP
 * refusals cheap and keeps the expensive ones bounded; the last line of defence is still that a refusal
 * costs only a rebuild. (`real brep + trailing garbage` READS FINE and returns a valid shape — measured
 * — so the bytes are not authenticated by the reader in any way. The fingerprint is the only
 * authentication, which is why it is over the shape's own geometry and not over the file.)
 */
export function decodeBrepBytes(bytes: Uint8Array, op: string): string {
  if (bytes.length === 0) fail('CACHE_STALE', 'the cached B-Rep is empty', op);
  if (bytes.length > MAX_BREP_BYTES) {
    fail(
      'CACHE_STALE',
      `the cached B-Rep is ${String(bytes.length)} bytes, past the ${String(MAX_BREP_BYTES)}-byte ` +
        `bound — refusing to read it (a rebuild is cheaper than trusting it)`,
      op,
    );
  }
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] ?? 0;
    // Printable ASCII, tab, LF, CR. Everything else is not a BRep document.
    if (b > 0x7e || (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d)) {
      fail(
        'CACHE_STALE',
        `the cached B-Rep is not 7-bit ASCII (byte 0x${b.toString(16).padStart(2, '0')} at offset ` +
          `${String(i)}) — the BRep format is text, and binary here is refused rather than parsed`,
        op,
      );
    }
  }
  // ⚠ In chunks: `String.fromCharCode(...bytes)` on a multi-megabyte array overflows the argument
  // stack, which would turn a large cache into a RangeError instead of the typed refusal above.
  const parts: string[] = [];
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    parts.push(String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length))));
  }
  const text = parts.join('');

  // ⚠ THE MAGIC IS `CASCADE Topology V<n>`, AND THE `DBRep_DrawableShape` LINE IS OPTIONAL — measured,
  // because the first draft of this guard refused every file the exporter beside it produces. OCCT's
  // FILE overload writes that line; the STREAM overload (what `exportBrep` uses) does not, so a check
  // written from the file format's documentation rejects the stream format. Both are accepted, nothing
  // else is.
  const head = text.slice(0, 96).trimStart();
  if (!head.startsWith('CASCADE Topology V') && !head.startsWith('DBRep_DrawableShape')) {
    fail(
      'CACHE_STALE',
      'the cached B-Rep does not begin with a BRep header — refusing before OCCT reads a byte',
      op,
    );
  }
  // ⚠ Every table OCCT's reader loops over on a declared count. `Locations` is included because it is
  // read the same way; `TShapes` is the one that raised `Standard_OutOfRange` rather than spinning.
  const tables =
    /^(Curve2ds|Curves|Polygon3D|PolygonOnTriangulations|Surfaces|Triangulations|TShapes|Locations)\s+(\d+)/gm;
  const bound = Math.floor(bytes.length / 2);
  for (const match of text.matchAll(tables)) {
    const declared = Number(match[2]);
    if (!Number.isFinite(declared) || declared > bound) {
      fail(
        'CACHE_STALE',
        `the cached B-Rep declares ${match[1] ?? '?'} = ${match[2] ?? '?'} in only ` +
          `${String(bytes.length)} bytes, which cannot be true (no record is under 2 bytes) — refusing ` +
          `before OCCT reads it, because reading it costs time proportional to the number it made up`,
        op,
      );
    }
  }
  return text;
}

/**
 * SHA-256, in ~40 lines and no dependency.
 *
 * ⚠ WHY A REAL DIGEST AND NOT A CHEAP HASH: the input is a file a user can be sent, so an attacker who
 * can find a second signature sequence with the same digest can hand out a solid whose tokens are
 * attached to the wrong faces — and a 32/64-bit hash is trivially collidable by construction. ⚠ WHY NOT
 * `crypto.subtle`: it is async, and a kernel op handler is synchronous by contract. `node:crypto` is not
 * available in a browser worker, which is where this actually runs. `tests/geometry-cache-d29.test.ts`
 * checks these digests against Node's `createHash('sha256')`, so the implementation is verified against
 * a reference rather than trusted.
 */
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export function sha256Hex(text: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    // The digest input is built by this file and is pure ASCII; anything else would be a bug here.
    bytes.push(c & 0x7f);
  }
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(Math.floor(bitLength / 2 ** (8 * i)) & 0xff);

  const h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

  for (let block = 0; block < bytes.length; block += 64) {
    for (let i = 0; i < 16; i++) {
      const at = block + i * 4;
      w[i] =
        (((bytes[at] ?? 0) << 24) |
          ((bytes[at + 1] ?? 0) << 16) |
          ((bytes[at + 2] ?? 0) << 8) |
          (bytes[at + 3] ?? 0)) >>>
        0;
    }
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15] ?? 0;
      const b = w[i - 2] ?? 0;
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[i] = ((w[i - 16] ?? 0) + s0 + (w[i - 7] ?? 0) + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h as unknown as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + (K[i] ?? 0) + (w[i] ?? 0)) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    const next = [a, b, c, d, e, f, g, hh];
    for (let i = 0; i < 8; i++) h[i] = ((h[i] ?? 0) + (next[i] ?? 0)) >>> 0;
  }
  return h.map((x) => x.toString(16).padStart(8, '0')).join('');
}
