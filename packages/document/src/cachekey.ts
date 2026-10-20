// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R1 — THE CACHE INPUT KEY (`docs/design/P5_step9_D29_bnn_cache_design.md` §2a–§2c, D93).
 *
 * A cached assembly is restored only when its key matches, so the key is a digest of exactly what
 * `buildAssembly` reads, computed from the scene alone with no kernel. Nothing here reads or writes a
 * `.bnn`; R2 stores these keys and R3 compares them.
 */

import type { Constraint, Element, ElementId } from './entities.js';
import { resolveJoins } from './joins.js';
import { datumElevations, gridPointOf, sketchConstraintsOf } from './scene.js';
import type { Scene } from './scene.js';

/** The cache scheme the envelope names (§2a). A change to what a key digests bumps it. */
export const CACHE_SCHEME = 'bnnc1';

/** §2a — the whole-cache level. Any field differing from the reader's own discards every entry. */
export interface CacheEnvelope {
  readonly cache: string;
  /** The writer's `FINGERPRINT_SCHEME` (`@bunyan/kernel-occt`), passed in: this layer has no kernel. */
  readonly fingerprint: string;
  /** The writer's own, never `manifest.json`'s — a carry-through writer rewrites the manifest (§2a). */
  readonly kernelBuildId: string;
  /** Which build of the Type code wrote the cache: the shipped bundle's digest (§2d, `D-20261012-06`). */
  readonly codeId: string;
}

export function sameCacheEnvelope(stored: CacheEnvelope, current: CacheEnvelope): boolean {
  return (
    stored.cache === current.cache &&
    stored.fingerprint === current.fingerprint &&
    stored.kernelBuildId === current.kernelBuildId &&
    stored.codeId === current.codeId
  );
}

/** Sorted keys, no whitespace, `JSON.stringify` numbers, `undefined` members dropped (§2b). */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

/**
 * The one pass over the scene (§2b "Cost"): the shared-table digest plus every per-root lookup indexed,
 * so computing all keys is O(n) rather than the O(n²) of `hostedBy`/`constraintsOf` per root.
 */
export interface CacheKeyTables {
  /** `styles`, `materials`, `sections`, `containers`, `grids`, digested whole (§2b). */
  readonly digest: string;
  /** Hosted elements by host, in `scene.elements` order — the order `hostedBy` cuts them in. */
  readonly hosted: ReadonlyMap<ElementId, readonly Element[]>;
  /** `[key, row]` by `element`, in `scene.constraints` order: the resolvers are order-sensitive. */
  readonly owned: ReadonlyMap<string, readonly OwnedRow[]>;
  /** Rows whose `element` is a generated child `<id>:<slot>…`, by the authored id before the first `:`. */
  readonly childOwned: ReadonlyMap<ElementId, readonly OwnedRow[]>;
}

type OwnedRow = readonly [key: string, row: Constraint];

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const bucket = map.get(key);
  if (bucket === undefined) map.set(key, [value]);
  else bucket.push(value);
}

export function cacheKeyTables(scene: Scene): CacheKeyTables {
  const digest = sha256Utf8Hex(
    canonicalJson({
      styles: scene.styles,
      materials: scene.materials,
      sections: scene.sections,
      containers: scene.containers,
      grids: scene.grids,
    }),
  );
  const hosted = new Map<ElementId, Element[]>();
  for (const e of Object.values(scene.elements))
    if (e.hostId !== undefined) push(hosted, e.hostId, e);
  const owned = new Map<string, OwnedRow[]>();
  const childOwned = new Map<ElementId, OwnedRow[]>();
  for (const entry of Object.entries(scene.constraints)) {
    const element = entry[1].element;
    push(owned, element, entry);
    // An authored id never contains `:` (`childElementId`, geometry.ts), so the prefix IS the root.
    const sep = element.indexOf(':');
    if (sep > 0) push(childOwned, element.slice(0, sep), entry);
  }
  return { digest, hosted, owned, childOwned };
}

/**
 * What `buildContextFor` resolves from an element's own constraint rows, computed by the build's own
 * resolvers over a scene holding only those rows. The rows keep their `scene.constraints` keys and
 * order, so last-wins `datumElevations`/`gridPointOf` and the solver's row order resolve exactly as in
 * the build, from O(rows) instead of a scan of every constraint.
 */
function resolvedConstraints(scene: Scene, id: string, rows: readonly OwnedRow[]): unknown {
  const own: Scene = { ...scene, constraints: Object.fromEntries(rows) };
  return {
    datums: datumElevations(own, id),
    gridPoint: gridPointOf(own, id),
    sketch: sketchConstraintsOf(own, id),
  };
}

/**
 * §2b, per member of the assembly (the root, then each hosted element). Constraints and joins are
 * digested RESOLVED: a row is read only through what its resolver makes of it, and `containers`/`grids`
 * are already in the shared digest, as `row.containerId` + `containers` determine `elevationOf`.
 */
function memberInputs(scene: Scene, element: Element, tables: CacheKeyTables): unknown {
  const childRows = tables.childOwned.get(element.id) ?? [];
  const children: Record<string, unknown> = {};
  for (const [, c] of childRows)
    children[c.element] ??= resolvedConstraints(scene, c.element, childRows);
  return {
    row: element,
    owned: resolvedConstraints(scene, element.id, tables.owned.get(element.id) ?? []),
    children,
    joins: resolveJoins(scene, element.id),
  };
}

/** The input key of one assembly root (§2a): `sha256` of the canonical JSON of what its build reads. */
export function cacheInputKey(scene: Scene, root: ElementId, tables: CacheKeyTables): string {
  const element = scene.elements[root];
  if (element === undefined) throw new Error(`cannot key unknown element "${root}"`);
  const members = [element, ...(tables.hosted.get(root) ?? [])];
  return sha256Utf8Hex(
    canonicalJson({
      scheme: CACHE_SCHEME,
      tables: tables.digest,
      members: members.map((m) => memberInputs(scene, m, tables)),
    }),
  );
}

/** Every assembly root's key — the elements with no host — from one pass over the scene. */
export function cacheInputKeys(scene: Scene): ReadonlyMap<ElementId, string> {
  const tables = cacheKeyTables(scene);
  const keys = new Map<ElementId, string>();
  for (const e of Object.values(scene.elements)) {
    if (e.hostId === undefined) keys.set(e.id, cacheInputKey(scene, e.id, tables));
  }
  return keys;
}

/* ------------------------------------------------------------------------------------------------
 * SHA-256 over UTF-8. ⚠ Not `@bunyan/kernel-occt`'s `sha256Hex`: that one masks to ASCII (its input is
 * its own), this layer may not import a kernel package (D19), and `crypto.subtle` is async.
 * ---------------------------------------------------------------------------------------------- */

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const encoder = new TextEncoder();

export function sha256Utf8Hex(text: string): string {
  const data = encoder.encode(text);
  const padded = new Uint8Array((((data.length + 8) >> 6) + 1) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  const bits = data.length * 8;
  view.setUint32(padded.length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(padded.length - 4, bits >>> 0);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15]!;
      const b = w[i - 2]!;
      const s0 = rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3);
      const s1 = rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10);
      w[i] = w[i - 16]! + s0 + w[i - 7]! + s1;
    }
    let [a, b, c, d, e, f, g, hh] = [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!, h[5]!, h[6]!, h[7]!];
    for (let i = 0; i < 64; i++) {
      const t1 =
        (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i]! + w[i]!) >>>
        0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((x, i) => (h[i] = h[i]! + x)); // Uint32Array wraps mod 2³²
  }
  return [...h].map((x) => x.toString(16).padStart(8, '0')).join('');
}
