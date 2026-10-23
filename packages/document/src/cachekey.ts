// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R1 — THE CACHE INPUT KEY (`docs/design/P5_step9_D29_bnn_cache_design.md` §2a–§2c, D93).
 *
 * A cached assembly is restored only when its key matches, so the key is a digest of exactly what
 * `buildAssembly` reads, computed from the scene alone with no kernel. Nothing here reads or writes a
 * `.bnn`; R2 stores these keys and R3 compares them.
 */

import type { CacheEnvelope } from './cachesign.js';
import { canonicalJson, sha256Utf8Hex } from './cachesign.js';
import type { Constraint, Element, ElementId } from './entities.js';
import { resolveJoins } from './joins.js';
import { datumElevations, gridPointOf, sketchConstraintsOf } from './scene.js';
import type { Scene } from './scene.js';

/** The cache scheme the envelope names (§2a). A change to what a key digests bumps it. */
export const CACHE_SCHEME = 'bnnc1';

export function sameCacheEnvelope(stored: CacheEnvelope, current: CacheEnvelope): boolean {
  return (
    stored.cache === current.cache &&
    stored.fingerprint === current.fingerprint &&
    stored.kernelBuildId === current.kernelBuildId &&
    stored.codeId === current.codeId
  );
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

/** §2b's shared-table digest: the five tables whole, in every assembly's key. */
export function cacheTablesDigest(scene: Scene): string {
  return sha256Utf8Hex(
    canonicalJson({
      styles: scene.styles,
      materials: scene.materials,
      sections: scene.sections,
      containers: scene.containers,
      grids: scene.grids,
    }),
  );
}

export function cacheKeyTables(scene: Scene): CacheKeyTables {
  const digest = cacheTablesDigest(scene);
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
