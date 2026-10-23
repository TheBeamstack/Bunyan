// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R3 — THE LOAD-ONLY RESTORE (`docs/design/P5_step9_D29_bnn_cache_design.md` §3, §4).
 *
 * An assembly whose input key matches its record is imported instead of built. Every refusal — a
 * missing entry, a `CACHE_STALE`, a `Part.refs` that is not a permutation of what `importBrep` returned,
 * a record whose shape does not match the scene — releases what was imported and returns `undefined`,
 * and the caller builds from the recipe. Nothing here assigns or repairs an identity (D1).
 */

import type { Element, ElementId, Part } from './entities.js';
import type { ElementGeometry } from './build.js';
import type { GeometryCacheReader } from './bnn.js';
import type { CacheKeyTables } from './cachekey.js';
import type { CacheEnvelope } from './cachesign.js';
import { cacheInputKey, sameCacheEnvelope } from './cachekey.js';
import type { SignedCacheEnvelope } from './cachetrust.js';
import { verifyCacheIndex } from './cachetrust.js';
import type { GeometryGateway } from './geometry.js';
import type { Scene } from './scene.js';

/** One solid's cache entry: `<rootId>/<k>.brep` plus what `exportBrep` returned with it. */
export interface CachedBrep {
  readonly k: string;
  /** `exportBrep`'s refs, in shape order — what `importBrep` is handed. */
  readonly refs: readonly string[];
  readonly fingerprint: string;
}

/** A `Part` with its `handle` replaced by the entry that restores it (design §3). */
export type CachedPart = Omit<Part, 'handle'> & { readonly brep: CachedBrep };

export interface CachedGeometry {
  readonly elementId: ElementId;
  readonly parts: readonly CachedPart[];
  readonly children?: readonly CachedGeometry[];
  /** A generated child's synthetic row (D59); absent on an authored element. */
  readonly element?: Element;
}

/** One assembly: root, hosted voids sorted by id, all `valid` with no broken reference (design §3). */
export interface CacheRecord {
  readonly key: string;
  readonly root: CachedGeometry;
  readonly voids: readonly CachedGeometry[];
}

/** `geometry-cache/index.json`. */
export interface GeometryCacheIndex {
  readonly envelope: SignedCacheEnvelope;
  readonly records: Readonly<Record<ElementId, CacheRecord>>;
}

/** What a loaded document restores from: the file's reader, the running build's envelope and install. */
export interface GeometryCacheSource {
  readonly files: GeometryCacheReader;
  readonly current: CacheEnvelope;
  /** This install's secret (R5, `cachetrust.ts`): an index it did not sign is never restored. */
  readonly installSecret: Uint8Array;
}

/** The same shape `buildAssembly` returns, so `#stage` registers a restore exactly like a build. */
export interface RestoredAssembly {
  readonly result: ElementGeometry;
  readonly voids: readonly ElementGeometry[];
  readonly children: readonly ElementGeometry[];
}

/**
 * The records this build may use, or `undefined` for the whole cache: an absent or unparseable index,
 * an envelope differing from the reader's (§2a), or one this install did not sign (§2e, R5).
 * Per-record shape is checked at restore time.
 */
export function openCacheIndex(source: GeometryCacheSource): GeometryCacheIndex | undefined {
  const bytes = source.files.read('index.json');
  if (bytes === undefined) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || !isRecord(parsed['envelope']) || !isRecord(parsed['records'])) {
    return undefined;
  }
  const envelope = parsed['envelope'] as unknown as CacheEnvelope;
  if (!sameCacheEnvelope(envelope, source.current)) return undefined;
  // Verifying walks untrusted `records` recursively: a throw (e.g. nesting past the stack) is a refusal.
  try {
    if (!verifyCacheIndex(parsed['envelope'], parsed['records'], source.installSecret)) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  return parsed as unknown as GeometryCacheIndex;
}

/**
 * Roots per `readMany` on restore. Each pass scans the whole zip (22.56 ms at 16k entries), so 16k roots
 * cost 16 passes instead of one per part; a batch's bytes are held only until the next batch is read.
 */
export const RESTORE_BATCH_ROOTS = 1024;

/** The usable records of one batch of roots, and every `.brep` entry they name, read in one pass. */
export interface RestoreBatch {
  readonly records: ReadonlyMap<ElementId, CacheRecord>;
  readonly bytes: ReadonlyMap<string, Uint8Array>;
}

/** `bnn.ts`'s cap refusal (T-046/T-048), by its message: `BnnCapError` is not exported. */
const CAP_REFUSAL = '.bnn refused before inflating:';

/**
 * Design §4 step 1 for `roots`, then their entries in one `readMany`. A cap refusal from it empties the
 * batch, so each of its roots builds. Any other throw (a corrupt entry) re-reads each root alone and
 * keeps those whose own read succeeds, so one bad entry costs its root, not the batch (§3).
 */
export function readRestoreBatch(
  scene: Scene,
  roots: readonly ElementId[],
  tables: CacheKeyTables,
  index: GeometryCacheIndex,
  files: GeometryCacheReader,
): RestoreBatch {
  const records = new Map<ElementId, CacheRecord>();
  for (const root of roots) {
    const record = usableRecord(scene, root, tables, index);
    if (record !== undefined) records.set(root, record);
  }
  if (records.size === 0) return { records, bytes: new Map() };
  try {
    const names = [...records].flatMap(([root, record]) => recordEntries(root, record));
    return { records, bytes: files.readMany(names) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(CAP_REFUSAL)) {
      return { records: new Map(), bytes: new Map() };
    }
  }
  const kept = new Map<ElementId, CacheRecord>();
  const bytes = new Map<string, Uint8Array>();
  for (const [root, record] of records) {
    try {
      for (const [name, b] of files.readMany(recordEntries(root, record))) bytes.set(name, b);
      kept.set(root, record);
    } catch {
      // This root builds.
    }
  }
  return { records: kept, bytes };
}

/** Design §4 steps 2–3 for one root of `batch`. `undefined` ⇒ build it; nothing imported is left live. */
export async function restoreAssembly(
  root: ElementId,
  batch: RestoreBatch,
  geometry: GeometryGateway,
): Promise<RestoredAssembly | undefined> {
  const record = batch.records.get(root);
  if (record === undefined) return undefined;
  const { root: cachedRoot, voids } = record;

  const imported: string[] = [];
  const restore = async (node: CachedGeometry): Promise<ElementGeometry> => {
    const parts: Part[] = [];
    for (const cached of node.parts) {
      const bytes = batch.bytes.get(`${root}/${cached.brep.k}.brep`);
      if (bytes === undefined) throw new Refusal();
      const shape = await geometry.request('importBrep', {
        nodeId: cached.nodeId,
        brep: bytes,
        refs: cached.brep.refs,
        fingerprint: cached.brep.fingerprint,
      });
      imported.push(shape.handle);
      if (!isPermutation(cached.refs, shape.refs)) throw new Refusal();
      parts.push({
        name: cached.name,
        materialId: cached.materialId,
        discipline: cached.discipline,
        nodeId: cached.nodeId,
        handle: shape.handle,
        refs: cached.refs,
        ...(cached.exposedRefs === undefined ? {} : { exposedRefs: cached.exposedRefs }),
      });
    }
    const children: ElementGeometry[] = [];
    for (const child of node.children ?? []) children.push(await restore(child));
    return {
      elementId: node.elementId,
      parts,
      state: 'valid',
      ...(children.length === 0 ? {} : { children }),
      ...(node.element === undefined ? {} : { element: node.element }),
    };
  };

  try {
    const result = await restore(cachedRoot);
    const restoredVoids: ElementGeometry[] = [];
    for (const v of voids) restoredVoids.push(await restore(v));
    return { result, voids: restoredVoids, children: flatten(result.children ?? []) };
  } catch {
    // ⚠ ANY refusal, kernel or ours: hand back every solid imported for this assembly (design §2c.2).
    for (const handle of imported) await geometry.request('releaseShape', { handle });
    return undefined;
  }
}

/**
 * The index's record for `root` if its key is the scene's and it is well formed — what a restore
 * imports and what a save carries (design §4 step 1, §5). Its bytes are not read here.
 */
export function usableRecord(
  scene: Scene,
  root: ElementId,
  tables: CacheKeyTables,
  index: GeometryCacheIndex,
): CacheRecord | undefined {
  const record: unknown = Object.hasOwn(index.records, root) ? index.records[root] : undefined;
  if (!isRecord(record) || record['key'] !== cacheInputKey(scene, root, tables)) return undefined;
  const hosted = (tables.hosted.get(root) ?? []).map((e) => e.id).sort();
  return wellFormed(record, root, hosted) ? (record as unknown as CacheRecord) : undefined;
}

/** Every `.brep` entry a record names, relative to `geometry-cache/`. */
export function recordEntries(root: ElementId, record: CacheRecord): string[] {
  const names: string[] = [];
  const walk = (node: CachedGeometry): void => {
    for (const part of node.parts) names.push(`${root}/${part.brep.k}.brep`);
    for (const child of node.children ?? []) walk(child);
  };
  walk(record.root);
  for (const v of record.voids) walk(v);
  return names;
}

class Refusal extends Error {}

function flatten(tree: readonly ElementGeometry[]): ElementGeometry[] {
  return tree.flatMap((node) => [node, ...flatten(node.children ?? [])]);
}

/** Same multiset of tokens, so restoring keeps the record's (the build's) order (design §4 step 3). */
function isPermutation(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const x = [...a].sort();
  const y = [...b].sort();
  return x.every((token, i) => token === y[i]);
}

/**
 * The record names this root, exactly the scene's hosted elements, only `<root>:` children, and every
 * part is well-typed with a safe entry name. ⚠ It is untrusted JSON: the key matching says the scene is
 * the one the writer built, not that this structure is what the writer wrote.
 */
function wellFormed(record: Record<string, unknown>, root: ElementId, hosted: string[]): boolean {
  const cachedRoot = record['root'];
  const voids = record['voids'];
  if (!isRecord(cachedRoot) || cachedRoot['elementId'] !== root || !Array.isArray(voids)) {
    return false;
  }
  if (!wellFormedNode(cachedRoot, root, false)) return false;
  if (voids.length !== hosted.length) return false;
  return voids.every(
    (v, i) => isRecord(v) && v['elementId'] === hosted[i] && wellFormedNode(v, root, false),
  );
}

function wellFormedNode(node: Record<string, unknown>, root: ElementId, child: boolean): boolean {
  if (typeof node['elementId'] !== 'string') return false;
  if (child !== (node['element'] !== undefined)) return false;
  if (child && !node['elementId'].startsWith(`${root}:`)) return false;
  const parts = node['parts'];
  if (!Array.isArray(parts) || !parts.every(wellFormedPart)) return false;
  const children = node['children'];
  if (children === undefined) return true;
  return (
    Array.isArray(children) &&
    children.every((c) => isRecord(c) && isRecord(c['element']) && wellFormedNode(c, root, true))
  );
}

function wellFormedPart(part: unknown): boolean {
  if (!isRecord(part) || !isRecord(part['brep'])) return false;
  const brep = part['brep'];
  const refs = part['refs'];
  const exposed = part['exposedRefs'];
  return (
    ['name', 'materialId', 'discipline', 'nodeId'].every((f) => typeof part[f] === 'string') &&
    isStrings(refs) &&
    (exposed === undefined || (isStrings(exposed) && exposed.every((r) => refs.includes(r)))) &&
    typeof brep['k'] === 'string' &&
    /^[A-Za-z0-9_-]+$/.test(brep['k']) &&
    isStrings(brep['refs']) &&
    typeof brep['fingerprint'] === 'string'
  );
}

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
