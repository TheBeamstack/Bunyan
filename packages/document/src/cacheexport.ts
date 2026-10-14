// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R4 — THE LAZY EXPORT (`docs/design/P5_step9_D29_bnn_cache_design.md` §3, §5).
 *
 * `exportAssembly` is the only caller of `exportBrep` in the document layer, and only idle time calls it
 * (`DocumentContext.exportCacheIdle`); a save assembles what was already exported or carried and never
 * exports (`DocumentContext.geometryCacheFiles`). 106 s of export per save at 16k is why (§5).
 */

import type { BrokenReference, ElementId } from './entities.js';
import type { ElementGeometry } from './build.js';
import type { CacheRecord, CachedGeometry, CachedPart } from './cacherestore.js';
import type { GeometryGateway } from './geometry.js';

/** One assembly's exported record (its key is stamped by the caller) and its `.brep` entries. */
export interface ExportedAssembly {
  readonly record: Omit<CacheRecord, 'key'>;
  /** Entry name relative to `geometry-cache/` → `exportBrep` bytes. */
  readonly files: ReadonlyMap<string, Uint8Array>;
}

/**
 * Exports one live assembly, or `undefined` when it may not be cached: any member not `valid`, a hosted
 * element with no geometry, or a broken reference in the assembly (design §3). A kernel refusal — a
 * handle freed by an edit committed mid-export — is `undefined` too; that edit re-queued the root.
 */
export async function exportAssembly(
  root: ElementId,
  hosted: readonly ElementId[],
  geometryOf: (id: ElementId) => ElementGeometry | undefined,
  brokenRefs: readonly BrokenReference[],
  geometry: GeometryGateway,
): Promise<ExportedAssembly | undefined> {
  const members = [root, ...[...hosted].sort()].map(geometryOf);
  if (members.some((g) => g === undefined || !allValid(g))) return undefined;
  const memberIds = new Set([root, ...hosted]);
  if (brokenRefs.some((b) => memberIds.has(b.elementId))) return undefined;

  const files = new Map<string, Uint8Array>();
  let k = 0;
  const node = async (g: ElementGeometry): Promise<CachedGeometry> => {
    const parts: CachedPart[] = [];
    for (const { handle, ...part } of g.parts) {
      const exported = await geometry.request('exportBrep', { handle });
      const name = String(k++);
      files.set(`${root}/${name}.brep`, exported.brep);
      parts.push({
        ...part,
        brep: { k: name, refs: exported.refs, fingerprint: exported.fingerprint },
      });
    }
    const children: CachedGeometry[] = [];
    for (const child of g.children ?? []) children.push(await node(child));
    return {
      elementId: g.elementId,
      parts,
      ...(children.length === 0 ? {} : { children }),
      ...(g.element === undefined ? {} : { element: g.element }),
    };
  };
  try {
    const [rootGeometry, ...voids] = members as ElementGeometry[];
    const cachedRoot = await node(rootGeometry!);
    const cachedVoids: CachedGeometry[] = [];
    for (const v of voids) cachedVoids.push(await node(v));
    return { record: { root: cachedRoot, voids: cachedVoids }, files };
  } catch {
    return undefined;
  }
}

function allValid(g: ElementGeometry): boolean {
  return g.state === 'valid' && (g.children ?? []).every(allValid);
}
