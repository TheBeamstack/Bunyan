/**
 * THE FAMILY-DEFINITION DATA FORMAT — RESERVED grammar (D61, Freeze-Gate row Ⓓ; `P5_step5D_family_seam_
 * design.md`). Owner-ruled 2026-07-22: Q1 = embedded in `scene.json`; **Q2 = a FULLY-SHAPED grammar now**
 * (not an opaque envelope); Q3 = `FamilyId` is a prefixed ULID (D44).
 *
 * ⚠ WHAT A FAMILY IS: a building-element type authored as DATA, not code — Revit's Family Editor moat
 * (`v1.0.0_imp_plan.md` "Parity-D"). Today every Bunyan type is a code `BimObjectType` (`@bunyan/types`);
 * that is right for programmatic behaviour (a wall's join solver) but the WRONG authoring path for the long
 * tail of parametric content (a manufacturer's window, a furniture item), which is parametric GEOMETRY, not
 * behaviour: a profile, some parameters, some formulas, some sub-placements. **A `FamilyDefinition` is that
 * geometry, expressed as data** — loaded by an interpreter that produces a `BimObjectType` from it.
 *
 * ⚠ THIS FILE RESERVES THE GRAMMAR, NOT ITS INTERPRETER. No body reads a `FamilyDefinition` in v1.0.0; the
 * loader (`makeFamilyType(def): BimObjectType`), the document-scoped resolver, and the CRUD/library are
 * Parity-D, ADDITIVE over what freezes here. The reservation exists so those builds never touch a frozen
 * byte — the same discipline as the documentation layer (Ⓐ, `documentation.ts`).
 *
 * ⚠⚠ WHY A DATA FAMILY NEEDS NO NEW `BimObjectType` FIELD (the §1b finding, PROVEN in `tests/family-seam.
 * test.ts`, not assumed): a data family is interpreted by a `BimObjectType` a loader CLOSES OVER the
 * definition to produce. Its `buildGeometry(ctx)` reads `ctx.params` + the closed-over `def` and emits
 * ordinary `BuiltPart`s — structurally identical to a code type. So the freeze needs only a HOME for the
 * definition (`Scene.families?`, self-contained per rule 15) and this grammar; `BimObjectType` is untouched.
 *
 * ⚠⚠ THE ADDITIVE DISCIPLINE (the only thing that lets a Revit-class family grammar land later without an
 * amendment): **every recipe node is a discriminated union (`op`/`kind`) or an optional field — it grows by
 * ADDING A MEMBER, never by editing one** (the D53 rule that shapes `ConstraintTarget`/`GridGeometry`). And
 * `formatVersion` carries wholesale grammar evolution: a definition authored against an older grammar is
 * migrated forward on load, exactly as `BimObjectType.version`/`migrate` bring an element's params forward.
 * The primitives/modifiers below cover the CORE parametric family (the 80% case); a loft, a sweep-along-path,
 * a boolean between two sub-solids are FUTURE `op` members (each an additive kernel op per D13).
 */

import type { Profile } from '@bunyan/protocol';
import type { Classification, Discipline, Sketch, StyleId, TypeId } from './entities.js';
import type { ParamSchema } from './schema.js';

/**
 * A family's id — a prefixed ULID (D44, owner Q3): `family-01J8Z3K7Q2…`. Collision-impossible by
 * construction, which is the right property for user/marketplace content where MANY authors independently
 * mint families (the D60 Q1 reasoning: when identity crosses authors, make collision structurally
 * impossible). A `TypeId` is namespaced (`core.wall`) because ONE vendor mints it; a `FamilyId` is not.
 * `mintPei('family')` produces one. Nothing parses meaning out of the prefix (the D44 rule).
 */
export type FamilyId = string;

/**
 * ⚠ A PARAMETRIC SCALAR in a family recipe — the thing that makes a family PARAMETRIC. Either a literal
 * number (mm, per rule 7) or a reference to one of the family's own params by name. The param's value may
 * itself be formula-driven (`ParamField.formula`, ⓜ) — so `{ param: 'width' }` where `width = height * 0.6`
 * resolves through the formula evaluator at build time. The interpreter resolves every `FamilyValue` against
 * the instance's `ctx.params` before it touches the kernel.
 */
export type FamilyValue = number | { readonly param: string };

/** A map of a recipe field to parametric scalars — a child's params, a primitive's size. */
export type FamilyValueMap = Readonly<Record<string, FamilyValue>>;

/**
 * A 2D profile inside a family, discriminated so the profile grammar grows additively. Two members today:
 * - `sketch` — a solver-driven `Sketch` (its `SketchConstraint`s reference params, so the 2D shape is itself
 *   parametric; the family interpreter feeds it through the sketch solver, 0d, exactly as a code type does).
 * - `polygon` — a direct `Profile` (the protocol's own type): the catalogue / escape-hatch case, a fixed loop.
 */
export type FamilyProfile =
  | { readonly kind: 'sketch'; readonly sketch: Sketch }
  | { readonly kind: 'polygon'; readonly profile: Profile };

/**
 * ⚠ THE SOLID GENERATOR that STARTS a part — a discriminated union over `op`, each member grounded in a
 * FROZEN kernel op (P3). A new generator (`loft`, `sweep`) is an additive member here + an additive kernel
 * op (D13), never an edit. All lengths/angles are `FamilyValue` so they are driven by the instance params.
 */
export type FamilyPrimitive =
  | { readonly op: 'box'; readonly size: readonly [FamilyValue, FamilyValue, FamilyValue] }
  | {
      readonly op: 'extrude';
      readonly profile: FamilyProfile;
      readonly height: FamilyValue;
      /** Sweep direction; defaults to the profile plane normal (`extrude`'s own default). */
      readonly direction?: readonly [FamilyValue, FamilyValue, FamilyValue];
    }
  | {
      readonly op: 'revolve';
      readonly profile: FamilyProfile;
      /** Degrees. A full 360° revolve has no caps (the OCCT trap the harness measured); the interpreter honours it. */
      readonly angle: FamilyValue;
    };

/**
 * ⚠ WHICH EDGES a modifier acts on — WITHOUT a geometric index (D1: identity is never a raw index). A tagged
 * union: `all` (every edge), or `tag` (a semantic edge tag the primitive emitted — the resolution of tag→edge
 * is the interpreter's, Parity-D, and MUST go through the naming resolver, never a geometric match). Reserved
 * shaped; a richer selector (by-face, by-direction) is an additive member.
 */
export type FamilyEdgeSelector =
  { readonly by: 'all' } | { readonly by: 'tag'; readonly tag: string };

/**
 * ⚠ A MODIFIER applied to the running solid, IN ORDER — each grounded in a frozen kernel op. `chamfer`/
 * `fillet` today; a `shell`, a `draft` are additive members. Edge selection is semantic (`FamilyEdgeSelector`),
 * never an index — a modifier that named "edge 7" would break the moment a parameter reshaped the solid.
 */
export type FamilyModifier =
  | { readonly op: 'chamfer'; readonly distance: FamilyValue; readonly edges: FamilyEdgeSelector }
  | { readonly op: 'fillet'; readonly radius: FamilyValue; readonly edges: FamilyEdgeSelector };

/**
 * ONE PART of a family (D30 — an element is its ordered parts). A primitive + ordered modifiers, a material,
 * a discipline. The `name` is the part's slot in the element's own vocabulary (→ `BuiltPart.name`), authored
 * by the family, never by OCCT — the identity discipline of `partNodeId` (D30), one level up as data.
 */
export interface FamilyPart {
  readonly name: string;
  /** Resolved against `scene.materials` (D33). A dangling id is a broken-ref at build, never a silent 0 (D45). */
  readonly materialId: string;
  /** Else the family's `defaultDiscipline` (D45). A part's trade — never inferred from the material. */
  readonly discipline?: Discipline;
  readonly base: FamilyPrimitive;
  readonly modifiers?: readonly FamilyModifier[];
}

/**
 * A NESTED CHILD ELEMENT placed by the family (D59 composition — Model A, DERIVED never stored). Mirrors
 * `BuiltChild` as DATA: a `slot` (the derived-PEI suffix `${parentId}:${slot}`), a child `typeId` (which may
 * itself be a family), and the child's params, each a `FamilyValue` the parent computes from its own params.
 * The interpreter turns this list into `BuiltChild[]` and the engine builds each recursively (the frozen
 * `buildChildren` path). The anti-fuse rule binds: a child is its own solid beside its siblings, never fused.
 */
export interface FamilyChildPlacement {
  readonly slot: string;
  readonly typeId: TypeId;
  readonly params: FamilyValueMap;
  readonly styleId?: StyleId;
  /** Absent ⇒ the child type's `defaultClassification` (a curtain-wall panel is `IfcPlate`). */
  readonly classification?: Classification;
  readonly name?: string;
}

/**
 * ⚠ THE HOSTED HALF — a data-authored door/window (Freeze-Gate ⓙ as DATA). A hosted family cuts a void in
 * its host and/or places a leaf in the opening, exactly the code `buildVoid`/`buildLeaf` split (`types.ts`):
 * - `voidPrimitive` → the interpreter's `buildVoid` (the hole, in the host-face frame — `hostFace.frame`).
 * - `leafParts` → the interpreter's `buildLeaf` (the leaf/frame/sill solids, host-local, placed last).
 * Present ⇒ the family is HOSTED (an element of it is `unbuildable` without a host, like a code door). A
 * standalone family omits `hosting` and uses `parts`.
 */
export interface FamilyHosting {
  /** Does it cut a hole through every layer of its host? A pure leaf (a surface-mounted fixture) may not. */
  readonly cutsHost: boolean;
  /** The void solid, in the host-face frame. Present iff `cutsHost`. */
  readonly voidPrimitive?: FamilyPrimitive;
  /** The solids that live IN the opening (a door leaf + frame). Become the hosted element's own parts (D30). */
  readonly leafParts?: readonly FamilyPart[];
}

/**
 * ⚠⚠ THE FAMILY DEFINITION — a building-element type as DATA (D61, owner Q2 = fully-shaped). Embedded in
 * `scene.json` (`Scene.families?`, owner Q1) so a `.bnn` is self-contained (rule 15 — a family-typed element
 * on a machine without the family's code STILL builds, exactly why materials are embedded). Its fields mirror
 * a `BimObjectType`'s — because the loader produces one FROM it — but they are DATA a non-programmer authors.
 *
 * ⚠ IT NEEDS ONE OF `parts` / `children` / `hosting` to be non-empty (a family that builds nothing is a
 * validation error the loader raises — the Parity-D concern; the shape allows all-absent so the grammar can
 * grow). A composite standalone family may carry BOTH `parts` (its own frame) AND `children` (D59, both-case).
 */
export interface FamilyDefinition {
  readonly id: FamilyId;
  readonly label: string;
  readonly description?: string;
  /**
   * The grammar version this definition is authored against. Bumped when the grammar changes shape; a loader
   * migrates an older definition forward on load — the twin of `BimObjectType.version`/`migrate`, one level
   * up. This is the seam that makes even a fully-shaped grammar evolvable without a freeze amendment.
   */
  readonly formatVersion: number;
  /** The params the family exposes — property panel + agent tools + formula-driven dims (D21, ⓜ). */
  readonly parameterSchema: ParamSchema;
  /** The classification a new instance gets (IFC identity) — like a Type's `defaultClassification` (D36). */
  readonly defaultClassification: Classification;
  /** The discipline stamped on a part with no explicit `discipline` (D45). */
  readonly defaultDiscipline?: Discipline;
  /** The ordered standalone parts (D30). Absent for a pure hosted void. */
  readonly parts?: readonly FamilyPart[];
  /** Nested child elements (D59 composition). */
  readonly children?: readonly FamilyChildPlacement[];
  /** Present ⇒ the family is hosted (a door/window) rather than standalone. */
  readonly hosting?: FamilyHosting;
}
