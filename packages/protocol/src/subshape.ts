/**
 * `SubShapeRef` — the stable identity of a face/edge/vertex (spec §4.5, core_logic §3.9).
 *
 * STATUS: RELEASE-CANDIDATE. Decision D13 freezes this only after Wall + Opening exercise it
 * in P5. Until then it may change; after that it is frozen (it is written into `scene.json`).
 *
 * An identity is a *derivation path* through the operation DAG, never a raw OCCT index:
 * which node produced it, in which semantic role, and which occurrence within that role.
 * It is assigned when the operation runs and propagated forward — never recovered by
 * matching geometry after the fact.
 */

/**
 * ⚠ `'vertex'` IS RESERVED (D54a, Freeze-Gate ③, owner-ruled). The token grammar already carries it —
 * `encode`/`decode`/`compare` round-trip a vertex ref exactly like a face/edge — but the KERNEL does not
 * export vertices yet (it names faces + edges). Reserved means: the shape is frozen so the first consumer
 * (a dimension/tag anchor, a Miqdar structural node binding to a corner) triggers the kernel-side export
 * ADDITIVELY, never a contract change. Reserved role grammar: a vertex is named STRUCTURALLY, as the
 * canonical intersection of the faces/edges that generate it (role `corner`, occurrence disambiguating
 * after the canonical re-sort) — never a coordinate, exactly the D1 rule that governs faces and edges.
 */
export type SubShapeKind = 'face' | 'edge' | 'vertex';

export interface SubShapeRef {
  /** The operation/object node in the DAG that produced this sub-shape. */
  readonly nodeId: string;
  readonly kind: SubShapeKind;
  /** Semantic slot, e.g. `lateral`, `cap.start`, `cut.wall-face`. Defined per operation type. */
  readonly role: string;
  /** Disambiguates within a role, assigned AFTER the canonical re-sort (spec §4.5). */
  readonly occurrence: number;
}

/**
 * Separators are forbidden inside `nodeId`/`role` so the token encoding is unambiguous and
 * round-trips exactly. Untrusted input (a hostile `scene.json`) must fail to decode, not
 * silently produce a different ref.
 */
const TOKEN_SEP = '/';
const OCCURRENCE_SEP = '#';
const FORBIDDEN = new RegExp(`[${TOKEN_SEP}${OCCURRENCE_SEP}]`);

const KINDS: readonly SubShapeKind[] = ['face', 'edge', 'vertex'];

/**
 * The canonical string token stored in `scene.json` and used to label nodes of the
 * adjacency-graph hash. Deliberately floating-point-free: the hash must be reproducible
 * across machines by construction (spec §6.5).
 */
export function encodeSubShapeRef(ref: SubShapeRef): string {
  if (FORBIDDEN.test(ref.nodeId) || FORBIDDEN.test(ref.role)) {
    throw new Error(
      `SubShapeRef nodeId/role must not contain "${TOKEN_SEP}" or "${OCCURRENCE_SEP}"`,
    );
  }
  if (!Number.isInteger(ref.occurrence) || ref.occurrence < 0) {
    throw new Error(`SubShapeRef occurrence must be a non-negative integer, got ${ref.occurrence}`);
  }
  return `${ref.nodeId}${TOKEN_SEP}${ref.kind}${TOKEN_SEP}${ref.role}${OCCURRENCE_SEP}${ref.occurrence}`;
}

/** Returns `undefined` rather than throwing: token sources (a loaded file) are untrusted. */
export function decodeSubShapeRef(token: string): SubShapeRef | undefined {
  const hashAt = token.lastIndexOf(OCCURRENCE_SEP);
  if (hashAt < 0) return undefined;

  const occurrence = Number(token.slice(hashAt + 1));
  if (!Number.isInteger(occurrence) || occurrence < 0) return undefined;

  const parts = token.slice(0, hashAt).split(TOKEN_SEP);
  if (parts.length !== 3) return undefined;

  const [nodeId, kind, role] = parts as [string, string, string];
  if (nodeId === '' || role === '') return undefined;
  if (!KINDS.includes(kind as SubShapeKind)) return undefined;

  return { nodeId, kind: kind as SubShapeKind, role, occurrence };
}

export function subShapeRefsEqual(a: SubShapeRef, b: SubShapeRef): boolean {
  return (
    a.nodeId === b.nodeId && a.kind === b.kind && a.role === b.role && a.occurrence === b.occurrence
  );
}

/**
 * Total order used by the canonical re-sort (spec §4.5) before identities are assigned, so
 * multi-threaded OCCT boolean output ordering cannot leak into identity.
 *
 * Uses code-unit comparison (`<`/`>`), NOT `localeCompare` — locale-sensitive collation would
 * make identity depend on the machine's locale and break cross-machine reproducibility.
 */
export function compareSubShapeRefs(a: SubShapeRef, b: SubShapeRef): number {
  if (a.nodeId !== b.nodeId) return a.nodeId < b.nodeId ? -1 : 1;
  if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
  if (a.role !== b.role) return a.role < b.role ? -1 : 1;
  return a.occurrence - b.occurrence;
}
