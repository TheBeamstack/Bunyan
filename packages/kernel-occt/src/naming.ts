/**
 * PERSISTENT NAMING (D1) — the identity half.
 *
 * The C++ kernel says what each output sub-shape IS, structurally: which operand it came from, by
 * which relation, and — when history is silent — which faces bound it. It knows nothing of DAG nodes
 * or ref tokens (decision D18). This file answers the other half of the question: **whose is it?**
 *
 * ⚠ THE PROPERTY EVERYTHING ELSE RESTS ON — and it is a *stability* property, not a naming one:
 *
 *     Cutting a window into a wall must not re-target a window that is already there.
 *
 * That is what `INHERIT` buys. When the cut runs, OCCT reports the wall's front face as `Modified` —
 * but it is still ONE face, so it is still THAT face, and it keeps its token (`wall-1/face/y-min#0`)
 * unchanged. Every reference hosted on it survives. The same holds through a fillet, which rebuilds
 * the edges around it with no history at all: those edges are re-derived from the two faces that bound
 * them, and because both faces belong to the wall, the edge comes back with the wall's own token —
 * byte for byte the token it had before the fillet existed.
 *
 * Only genuinely NEW sub-shapes — a boolean's section edges, a fillet's rounded face, the pieces of a
 * face that was split in two — are owned by the operation that created them.
 *
 * ⚠ NOTHING IN THIS FILE READS A COORDINATE, AND THAT IS STILL THE RULE. A geometric rule silently
 * re-targets references the moment a solid is moved or rebuilt, and it fails in a way no volume check
 * can catch (spec §4.5, core_logic §5).
 *
 * ⚠⚠ THERE IS NOW EXACTLY ONE SANCTIONED EXCEPTION IN THE WHOLE SYSTEM, AND IT IS NOT HERE — IT IS IN
 * C++: the **bounded positional key** (D28, owner-ruled 2026-07-13; `kernel.cpp`, `centroidKey`). It
 * orders two sub-shapes that every structural test has already proven interchangeable — the two rims
 * of a duct drilled through a ROUND column — by their mm-rounded centroid. It never *identifies*
 * anything; it only breaks a tie, and only after structure has run out of things to say. By the time a
 * `rank` reaches this file it is already an integer, so the rule above holds here verbatim: if you
 * find yourself wanting to read a coordinate *in this file*, the answer is still no.
 */

import { decodeSubShapeRef, encodeSubShapeRef } from '@bunyan/protocol';
import type { SubShapeKind } from '@bunyan/protocol';
import type {
  OcctNameRow,
  OcctNaming,
  OcctVectorInt,
  OcctVectorNameRow,
} from '../wasm/bunyan-kernel.js';

/** How the kernel accounted for a sub-shape. Mirrors the constants in `kernel.cpp`. */
export const REL_PRIMITIVE = 0;
export const REL_INHERIT = 1;
export const REL_DERIVE = 2;
export const REL_ADJACENT = 3;

const KIND_FACE = 0;

/** The refs of one operand, in the kernel's canonical order. */
export interface OperandRefs {
  readonly faces: readonly string[];
  readonly edges: readonly string[];
}

/**
 * A ref token embedded INSIDE another role must not carry the token separators, or the encoding stops
 * round-tripping. `/` and `#` are the only two characters `encodeSubShapeRef` forbids, so they are the
 * only two we rewrite — and the mapping is injective, so two different ancestors can never collapse
 * into the same role.
 */
function embed(token: string): string {
  return token.replaceAll('/', '.').replaceAll('#', '~');
}

/** Reading an embind vector costs one boundary crossing PER ELEMENT — so drain it once, then free it. */
function drainInts(vector: OcctVectorInt): number[] {
  try {
    const out: number[] = [];
    for (let i = 0; i < vector.size(); i++) out.push(vector.get(i) ?? 0);
    return out;
  } finally {
    vector.delete();
  }
}

function drainRows(vector: OcctVectorNameRow): OcctNameRow[] {
  try {
    const out: OcctNameRow[] = [];
    for (let i = 0; i < vector.size(); i++) {
      const row = vector.get(i);
      if (row !== undefined) out.push(row);
    }
    return out;
  } finally {
    vector.delete();
  }
}

interface Row {
  readonly relation: number;
  readonly role: string;
  readonly rank: number;
  readonly srcOperand: number[];
  readonly srcKind: number[];
  readonly srcIndex: number[];
  readonly viaA: number;
  readonly viaB: number;
}

function toRow(row: OcctNameRow): Row {
  return {
    relation: row.relation,
    role: row.role,
    rank: row.rank,
    srcOperand: drainInts(row.srcOperand),
    srcKind: drainInts(row.srcKind),
    srcIndex: drainInts(row.srcIndex),
    viaA: row.viaA,
    viaB: row.viaB,
  };
}

/** The kernel's structural report, drained across the boundary exactly once. */
export interface StructuralNaming {
  readonly faces: readonly Row[];
  readonly edges: readonly Row[];
  readonly operands: readonly number[];
}

export function drainNaming(naming: OcctNaming): StructuralNaming {
  return {
    faces: drainRows(naming.faces).map(toRow),
    edges: drainRows(naming.edges).map(toRow),
    operands: drainInts(naming.operands),
  };
}

/** Thrown when a sub-shape cannot be named. The kernel refuses rather than invent an identity. */
export class UnnameableSubShape extends Error {}

/**
 * TRANSFORM's refs — and this function is short ON PURPOSE. It cannot mint an identity.
 *
 * A rigid transform is a topological isomorphism: every face maps to exactly one face. So every row
 * MUST come back `REL_INHERIT`, and the answer is the operand's own token, passed through untouched.
 * The result's refs are the operand's refs — same tokens, same order. **A rotated wall is the same
 * wall.**
 *
 * ⚠ Why this is a separate function rather than a call to `composeRefs` with a `nodeId`: there is no
 * node to pass. A transform owns nothing, so handing this path a `nodeId` would give it the *ability*
 * to mint a fresh identity — and the day OCCT reported something unexpected, it would quietly do so,
 * re-targeting every reference hosted on the shape. Here that is not a rule to be obeyed but a thing
 * that cannot be expressed: with no `nodeId` in scope, `encodeSubShapeRef` cannot even be called. Any
 * relation other than INHERIT is refused, loudly.
 *
 * (MEASURED — probe.cpp cases 7-10: rotate, mirror, and a rotate of a wall that already has an opening
 * cut through it all report 100% INHERIT, zero orphans. The refusal below is the tripwire for the day
 * that stops being true, not an expected path.)
 */
export function composeTransformRefs(
  naming: StructuralNaming,
  operand: OperandRefs,
): { faces: string[]; edges: string[] } {
  const passThrough = (rows: readonly Row[], kind: SubShapeKind): string[] =>
    rows.map((row) => {
      const expectedKind = kind === 'face' ? KIND_FACE : 1;
      if (
        row.relation !== REL_INHERIT ||
        row.srcIndex.length !== 1 ||
        row.srcOperand[0] !== 0 ||
        row.srcKind[0] !== expectedKind
      ) {
        throw new UnnameableSubShape(
          `a transform produced a ${kind} that is NOT a pass-through of its operand ` +
            `(relation ${String(row.relation)}, ${String(row.srcIndex.length)} ancestor(s)) — a rigid ` +
            `motion must be a 1:1 map, so this cannot be named without inventing an identity`,
        );
      }
      const token = (kind === 'face' ? operand.faces : operand.edges)[row.srcIndex[0] ?? -1];
      if (token === undefined) {
        throw new UnnameableSubShape(
          `a transform's ${kind} inherits from operand ${kind} ${String(row.srcIndex[0])}, which has no ref`,
        );
      }
      return token;
    });

  const faces = passThrough(naming.faces, 'face');
  const edges = passThrough(naming.edges, 'edge');

  // A bijection cannot collide. If it does, the map was not a bijection and the premise is broken.
  const all = [...faces, ...edges];
  if (new Set(all).size !== all.length) {
    throw new UnnameableSubShape(
      'a transform mapped two sub-shapes onto ONE identity — it was not the 1:1 map a rigid motion must be',
    );
  }
  return { faces, edges };
}

/**
 * Compose the ref tokens for one operation's output.
 *
 * `nodeId` owns only what this operation CREATED. Everything it merely carried forward keeps the
 * identity it already had.
 */
export function composeRefs(
  nodeId: string,
  opTag: string,
  naming: StructuralNaming,
  operands: readonly OperandRefs[],
): { faces: string[]; edges: string[] } {
  const ancestorToken = (row: Row, at: number): string => {
    const operand = operands[row.srcOperand[at] ?? -1];
    const kind = row.srcKind[at];
    const index = row.srcIndex[at] ?? -1;
    const token = (kind === KIND_FACE ? operand?.faces : operand?.edges)?.[index];
    if (token === undefined) {
      throw new UnnameableSubShape(
        `the kernel named an ancestor (operand ${String(row.srcOperand[at])}, kind ${String(kind)}, ` +
          `index ${String(index)}) that has no ref — the operand's naming and the result's disagree`,
      );
    }
    return token;
  };

  // A DERIVE'd sub-shape is "what this operation did to these ancestors". The ancestors are SORTED, so
  // the name cannot depend on the order OCCT happened to report them in (spec §4.5, D8).
  const derivedRole = (row: Row): string => {
    const tokens = row.srcOperand.map((_, at) => embed(ancestorToken(row, at))).sort();
    return `${opTag}(${tokens.join('+')})`;
  };

  const compose = (row: Row, kind: SubShapeKind, faceRefs: readonly string[]): string => {
    switch (row.relation) {
      case REL_PRIMITIVE:
        return encodeSubShapeRef({ nodeId, kind, role: row.role, occurrence: row.rank });

      // It IS the ancestor, still. The token passes through untouched — this is the line that keeps a
      // window on the wall when a second window is cut.
      case REL_INHERIT:
        return ancestorToken(row, 0);

      case REL_DERIVE:
        return encodeSubShapeRef({ nodeId, kind, role: derivedRole(row), occurrence: row.rank });

      case REL_ADJACENT: {
        const a = faceRefs[row.viaA];
        const b = faceRefs[row.viaB];
        if (a === undefined || b === undefined) {
          throw new UnnameableSubShape(
            `an edge is bounded by faces ${String(row.viaA)}/${String(row.viaB)}, which have no refs`,
          );
        }
        const da = decodeSubShapeRef(a);
        const db = decodeSubShapeRef(b);
        if (da === undefined || db === undefined) {
          throw new UnnameableSubShape(`a bounding face's ref does not decode: "${a}" / "${b}"`);
        }

        // ⚠ THE STABILITY CASE. Both faces belong to the same node ⇒ the edge between them belongs to
        // that node too, under the name that node would have given it anyway. A box's `x-min|y-min`
        // edge is named this way, and so is the SAME edge after a fillet has rebuilt it elsewhere on
        // the solid — identical token, no history required. (The occurrence suffix appears only when
        // it is non-zero, so the common case stays readable and matches the mock byte for byte.)
        if (da.nodeId === db.nodeId) {
          const piece = (r: typeof da): string =>
            r.occurrence === 0 ? r.role : `${r.role}:${String(r.occurrence)}`;
          const [first, second] = [piece(da), piece(db)].sort() as [string, string];
          return encodeSubShapeRef({
            nodeId: da.nodeId,
            kind,
            role: `${first}|${second}`,
            occurrence: row.rank,
          });
        }

        // The two faces come from different nodes (a boolean's section edge, or an edge where a
        // fillet's own face meets the solid). Nobody owned this edge before; this operation does.
        const [first, second] = [embed(a), embed(b)].sort() as [string, string];
        return encodeSubShapeRef({
          nodeId,
          kind,
          role: `${first}^${second}`,
          occurrence: row.rank,
        });
      }

      default:
        throw new UnnameableSubShape(
          `the kernel reported relation ${String(row.relation)}, which this resolver does not know`,
        );
    }
  };

  // Faces first — every edge below is named in terms of them.
  const faces = naming.faces.map((row) => compose(row, 'face', []));
  const edges = naming.edges.map((row) => compose(row, 'edge', faces));

  // A collision here would mean two different sub-shapes answering to one name: the exact failure the
  // whole subsystem exists to prevent, and one that no geometric check would ever catch. Refuse.
  const all = [...faces, ...edges];
  if (new Set(all).size !== all.length) {
    throw new UnnameableSubShape(
      'two sub-shapes of this result resolved to the SAME identity — refusing rather than hand out a ref that names two things',
    );
  }
  return { faces, edges };
}
