// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29's hashing and the cache MAC, as a leaf (T-060, T-061, design `P5_step9_D29_bnn_cache_design.md` §2e,
 * §4, §5): canonical JSON, SHA-256, HMAC-SHA-256, and the signing and opening of `geometry-cache/index.json`.
 * The named save's zip worker signs the index here and the app's cache-open worker opens it here, so neither
 * a 16k save nor a 16k open holds the main thread on the ~2 s HMAC pass.
 *
 * ⚠ It imports nothing, so a worker bundle that imports this file (`@bunyan/document/cachesign`) carries
 * no scene, joins or document code.
 */

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

/** What signing an index needs: the writer's envelope, its records by root, this install's secret. */
export interface CacheSigning {
  readonly envelope: CacheEnvelope;
  readonly records: Readonly<Record<string, unknown>>;
  readonly secret: Uint8Array;
}

/**
 * A geometry cache to write, `index.json` not yet signed: `files` is every other entry, relative to
 * `geometry-cache/`. `saveBnn` signs it on the caller; the app's named save posts it to the zip worker.
 */
export interface UnsignedGeometryCache extends CacheSigning {
  readonly files: Readonly<Record<string, Uint8Array>>;
}

/** Whether a `SaveOptions.cache` is unsigned: a signed one's every value is bytes, `envelope` included. */
export function isUnsignedGeometryCache(
  cache: UnsignedGeometryCache | Readonly<Record<string, Uint8Array>>,
): cache is UnsignedGeometryCache {
  const envelope: unknown = cache['envelope' as keyof typeof cache];
  return typeof envelope === 'object' && envelope !== null && !ArrayBuffer.isView(envelope);
}

const encoder = new TextEncoder();

/**
 * The MAC of an index. Only the four envelope fields are covered, by name, so a stored `mac` (or any
 * field a later scheme adds) never feeds itself; canonical JSON, so a reformatted index keeps its MAC.
 */
export function cacheIndexMac(
  envelope: CacheEnvelope,
  records: unknown,
  secret: Uint8Array,
): string {
  const { cache, fingerprint, kernelBuildId, codeId } = envelope;
  return hmacSha256Hex(
    secret,
    canonicalJson({ envelope: { cache, fingerprint, kernelBuildId, codeId }, records }),
  );
}

/** `geometry-cache/index.json`'s bytes, its envelope carrying this install's MAC. */
export function signedCacheIndex(
  envelope: CacheEnvelope,
  records: Readonly<Record<string, unknown>>,
  secret: Uint8Array,
): Uint8Array {
  const { cache, fingerprint, kernelBuildId, codeId } = envelope;
  const mac = cacheIndexMac(envelope, records, secret);
  return encoder.encode(
    JSON.stringify({ envelope: { cache, fingerprint, kernelBuildId, codeId, mac }, records }),
  );
}

/** The cache's files with `index.json` signed and last — the order `geometryCacheFiles` always wrote. */
export function signGeometryCache(
  unsigned: UnsignedGeometryCache,
): Readonly<Record<string, Uint8Array>> {
  return {
    ...unsigned.files,
    'index.json': signedCacheIndex(unsigned.envelope, unsigned.records, unsigned.secret),
  };
}

/** The zip path of the cache index (`bnn.ts`'s `GEOMETRY_CACHE_DIR` + `index.json`). */
export const CACHE_INDEX_ENTRY = 'geometry-cache/index.json';

/**
 * `.bnn` entries with the index signed in place: `assembleUnsignedBnnEntries` left a placeholder at its
 * position, and replacing a key's value keeps zip order, so the bytes equal `saveBnn`'s.
 */
export function signBnnEntries(
  entries: Readonly<Record<string, Uint8Array>>,
  signing: CacheSigning,
): Readonly<Record<string, Uint8Array>> {
  if (entries[CACHE_INDEX_ENTRY] === undefined) {
    throw new Error(`refusing to sign entries without a ${CACHE_INDEX_ENTRY} placeholder`);
  }
  return {
    ...entries,
    [CACHE_INDEX_ENTRY]: signedCacheIndex(signing.envelope, signing.records, signing.secret),
  };
}

/** The envelope as `index.json` stores it: the writer's four fields plus its install's MAC. */
export type SignedCacheEnvelope = CacheEnvelope & { readonly mac: string };

/** Whether a parsed index carries the MAC `secret` gives it — i.e. this install wrote it, unedited. */
export function verifyCacheIndex(
  envelope: Record<string, unknown>,
  records: unknown,
  secret: Uint8Array,
): boolean {
  const mac = envelope['mac'];
  if (typeof mac !== 'string') return false;
  return mac === cacheIndexMac(envelope as unknown as CacheEnvelope, records, secret);
}

/** An index whose envelope is the reader's and whose MAC this install gave it; records not yet shape-checked. */
export interface OpenedCacheIndex {
  readonly envelope: SignedCacheEnvelope;
  readonly records: Readonly<Record<string, unknown>>;
}

/**
 * What opening an index needs: the whole `.bnn`'s bytes, which the opener inflates `index.json` from
 * (T-063), the running build's envelope, and this install's secret.
 */
export interface CacheIndexOpenRequest {
  readonly file: Uint8Array;
  readonly current: CacheEnvelope;
  readonly secret: Uint8Array;
}

/**
 * Records serialized (T-063, T-064): `roots[i]`'s record is its `JSON.stringify` as UTF-8 at
 * `json[offsets[i], offsets[i + 1])`, so a reader parses one root when it needs it, never the whole index.
 * `json` is the only view of its buffer, so a worker transfers it rather than cloning an object graph.
 */
export interface SerializedCacheRecords {
  readonly roots: readonly string[];
  readonly offsets: readonly number[];
  readonly json: Uint8Array;
}

/** An opened index, its records still serialized (T-063). */
export interface OpenedCacheRecords extends SerializedCacheRecords {
  readonly envelope: SignedCacheEnvelope;
}

/** `CacheSigning` as the named save posts it to the zip worker (T-064): the records as one buffer. */
export interface PostedCacheSigning {
  readonly envelope: CacheEnvelope;
  readonly records: SerializedCacheRecords;
  readonly secret: Uint8Array;
}

/** Each kept record's `JSON.stringify` bytes, by identity (`keepRecordJson`). */
const recordJson = new WeakMap<object, Uint8Array>();

/**
 * Keeps `json`, which must be `record`'s `JSON.stringify` as UTF-8, so `serializeRecords` copies it rather
 * than stringifying `record` on a save (T-064). Called at export and at open; a record is never mutated.
 */
export function keepRecordJson(record: object, json: Uint8Array): void {
  recordJson.set(record, json);
}

/** Where a carried value came from: an opened file's bytes, and its zip path (a `.brep`) or root (a record). */
export interface CarriedFrom {
  readonly file: Uint8Array;
  readonly name: string;
}

/** Each carried `.brep` and record, by identity (`keepCarried`). */
const carriedValues = new WeakMap<object, CarriedFrom>();

/**
 * Marks `value` as read unchanged from `file` under `name` (T-067): a `.brep` the reader inflated, or a
 * record parsed from the file's verified index. The named save posts it by name, and the zip worker reads it
 * from the file again. A value is never mutated after it is marked.
 */
export function keepCarried(value: object, file: Uint8Array, name: string): void {
  carriedValues.set(value, { file, name });
}

/** `keepCarried`'s mark on `value`, if any. */
export function carriedFrom(value: unknown): CarriedFrom | undefined {
  return typeof value === 'object' && value !== null ? carriedValues.get(value) : undefined;
}

const NO_BYTES = new Uint8Array(0);

/**
 * Each record's JSON bytes, in key order: a kept record's bytes, any other stringified (T-064, T-065), and
 * none for a root `skip` names (T-067: carried by name).
 */
export function recordJsonChunks(
  records: Readonly<Record<string, unknown>>,
  skip?: (root: string) => boolean,
): {
  readonly roots: readonly string[];
  readonly chunks: readonly Uint8Array[];
} {
  const roots = Object.keys(records);
  const chunks = roots.map((root) => {
    if (skip?.(root) === true) return NO_BYTES;
    const record = records[root];
    const kept = typeof record === 'object' && record !== null ? recordJson.get(record) : undefined;
    return kept ?? encoder.encode(JSON.stringify(record));
  });
  return { roots, chunks };
}

/** `records` as one buffer, in key order: a kept record's bytes are copied, any other is stringified. */
export function serializeRecords(
  records: Readonly<Record<string, unknown>>,
): SerializedCacheRecords {
  const { roots, chunks } = recordJsonChunks(records);
  const offsets = [0];
  for (const chunk of chunks) offsets.push(offsets[offsets.length - 1]! + chunk.length);
  const json = new Uint8Array(offsets[offsets.length - 1]!);
  for (const [i, chunk] of chunks.entries()) json.set(chunk, offsets[i]);
  return { roots, offsets, json };
}

/**
 * The records back, in `roots` order: `JSON.stringify` of the result equals that of the records serialized,
 * so an index signed from it has `saveBnn`'s bytes. `Object.fromEntries`, so a `__proto__` root stays a key.
 * A root `carried` returns a record for takes that one instead of its slice (T-067).
 */
export function deserializeRecords(
  serialized: SerializedCacheRecords,
  carried?: (root: string) => unknown,
): Record<string, unknown> {
  const decoder = new TextDecoder();
  const { roots, offsets, json } = serialized;
  return Object.fromEntries(
    roots.map((root, i) => [
      root,
      carried?.(root) ??
        (JSON.parse(decoder.decode(json.subarray(offsets[i], offsets[i + 1]))) as unknown),
    ]),
  );
}

/** Opens an index on a worker (T-061, T-063). `undefined` ⇒ the cache restores nothing. */
export type CacheIndexOpener = (
  request: CacheIndexOpenRequest,
) => Promise<OpenedCacheRecords | undefined>;

/** An opened index's records, one JSON slice per root in one buffer (`OpenedCacheRecords`). */
export function serializeCacheRecords(opened: OpenedCacheIndex): OpenedCacheRecords {
  return { envelope: opened.envelope, ...serializeRecords(opened.records) };
}

/**
 * Parse `index.json` and check it (§2a, §2e): `undefined` for unparseable bytes, an envelope differing from
 * `current`, or a MAC `secret` did not give. Never throws: verifying walks untrusted `records` recursively,
 * and a throw (e.g. nesting past the stack) is a refusal.
 */
export function openSignedCacheIndex(
  bytes: Uint8Array,
  current: CacheEnvelope,
  secret: Uint8Array,
): OpenedCacheIndex | undefined {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!isObject(parsed) || !isObject(parsed['envelope']) || !isObject(parsed['records'])) {
      return undefined;
    }
    const envelope = parsed['envelope'];
    if (!sameCacheEnvelope(envelope as unknown as CacheEnvelope, current)) return undefined;
    if (!verifyCacheIndex(envelope, parsed['records'], secret)) return undefined;
    return parsed as unknown as OpenedCacheIndex;
  } catch {
    return undefined;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/* ------------------------------------------------------------------------------------------------
 * SHA-256 over UTF-8. ⚠ Not `@bunyan/kernel-occt`'s `sha256Hex`: that one masks to ASCII (its input is
 * its own), this layer may not import a kernel package (D19), and `crypto.subtle` is async.
 * ---------------------------------------------------------------------------------------------- */

const BLOCK = 64;

/** HMAC-SHA-256 (RFC 2104) over the UTF-8 of `message`, on the in-house `sha256` (no async `subtle`). */
export function hmacSha256Hex(key: Uint8Array, message: string): string {
  const k = new Uint8Array(BLOCK);
  k.set(key.length > BLOCK ? sha256(key) : key);
  const inner = k.map((b) => b ^ 0x36);
  const outer = k.map((b) => b ^ 0x5c);
  return toHex(sha256(outer, sha256(inner, encoder.encode(message))));
}

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

export function sha256Utf8Hex(text: string): string {
  return toHex(sha256(encoder.encode(text)));
}

export function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 of the concatenated `chunks`, copied once into the padded buffer (HMAC's two passes). */
export function sha256(...chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((n, c) => n + c.length, 0);
  const padded = new Uint8Array((((length + 8) >> 6) + 1) << 6);
  let at = 0;
  for (const c of chunks) {
    padded.set(c, at);
    at += c.length;
  }
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  const bits = length * 8;
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
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, h[i]!);
  return out;
}
