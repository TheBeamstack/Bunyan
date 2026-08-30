// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE DOCUMENTATION LAYER — RESERVED anchoring shapes (D58, Freeze-Gate row Ⓐ; `P5_step5A_documentation_
 * anchoring_design.md`).
 *
 * ⚠ THIS FILE RESERVES SHAPES, NOT BEHAVIOUR. A drawing is a LIVE PROJECTION of the B-Rep (`core_logic.md`
 * rule 17): the projected 2D geometry is DERIVED and never stored, exactly as a mesh, a `Part` and a room
 * boundary are. What is stored is the DEFINITION (a cut plane, a set of anchors, a filter + columns) — so a
 * documentation entity's value is a pure function of the frozen scene, and a resize updates it with zero
 * re-authoring. v1.0.0 ships a MINIMAL body in P6 (one plan + one section + one schedule, D58); the full
 * apparatus is post-v1.0.0 (Parity-B). No body reads these types yet — the reservation exists so both builds
 * are PURELY ADDITIVE over the frozen `scene.json`, never an amendment across three products.
 *
 * ⚠ EVERY TYPE HERE GROWS BY ADDING A UNION MEMBER OR AN OPTIONAL FIELD, NEVER BY EDITING ONE (the D53
 * discipline that shapes `ConstraintTarget`/`GridGeometry`). That is the only shape that lets a Revit-class
 * documentation model land after the freeze without touching a frozen byte.
 */

import type { ContainerId, ElementId, TypeId } from './entities.js';
import type { DesignOptionId } from './designoptions.js';

export type ViewId = string;
export type AnnotationId = string;
export type ScheduleId = string;
export type SheetId = string;

/* ================================================================================================
 * THE ANCHOR VOCABULARY — what an annotation points AT (the widened gate ⑨)
 * ============================================================================================= */

/**
 * WHAT AN ANNOTATION ANCHORS TO — a tagged union so the anchor grammar grows additively (a grid
 * intersection, a level datum are future members, never edits). This is the FROZEN anchor vocabulary gate ⑨
 * (Entry 44) proved sufficient for the two-face dimension case, widened to the whole surface (D58, row Ⓐ).
 *
 * ⚠ EACH `ref`/`vertex` ANCHOR CARRIES ITS OWN `elementId`, so a CROSS-ELEMENT dimension (a wall face to a
 * column face) is expressible — gate ⑨'s single-element `{ elementId, [refA, refB] }` is the degenerate case.
 * The id is stored explicitly, never parsed back out of the token's `nodeId`: recovering identity by matching
 * an opaque derivation path is the "identify after the fact" the whole naming design (D1) refuses.
 *
 * - `ref`     — a `SubShapeRef` token (a face/edge). Byte-identical across a host rebuild (D1) — the witness
 *               gate ⑨ used. `token` is a `SubShapeRef` in its encoded string form (`encodeSubShapeRef`).
 * - `vertex`  — a `SubShapeRef` token with `kind:'vertex'` (RESERVED D54a — the kernel exports vertices
 *               additively when the first consumer, this one, asks). The corner a dimension/leader lands on.
 * - `element` — an element id (a ULID PEI, D44 — assigned once, never reused). A tag leaders to the whole
 *               element; a schedule row IS one.
 * - `point`   — a free 2D point in a view's plane, mm. NOT model-anchored — a note pinned to paper. The
 *               escape hatch for annotation that references no geometry; it does NOT survive a model edit, by
 *               design (there is nothing for it to follow).
 */
export type AnnotationAnchor =
  | { readonly kind: 'ref'; readonly elementId: ElementId; readonly token: string }
  | { readonly kind: 'vertex'; readonly elementId: ElementId; readonly token: string }
  | { readonly kind: 'element'; readonly elementId: ElementId }
  | { readonly kind: 'point'; readonly at: readonly [number, number] };

/* ================================================================================================
 * ANNOTATIONS — a Dimension or a Tag. STORE AN ANCHOR + A RULE, NEVER A VALUE.
 * ============================================================================================= */

/**
 * ⚠ THE VALUE IS DERIVED, NEVER STORED (rule 17; the gate ⑨ conclusion). A `Dimension` stores its ANCHORS;
 * its number re-derives from live geometry (the frozen `bounds`/`distance` query ops — never off the mesh).
 * A `Tag` stores its SUBJECT key; its text re-derives from the element. So a resize moves the witness line
 * and updates the number with no re-authoring — exactly a Revit dimension. Storing the value would be storing
 * a stale result (domain rule 15's sibling).
 *
 * A tagged union on `kind`; a text note / revision cloud / spot elevation is an additive member, never an edit.
 */
export type Annotation = Dimension | Tag;

export interface Dimension {
  readonly id: AnnotationId;
  readonly kind: 'dimension';
  /** The view this dimension is drawn in (a plan/section). Absent ⇒ a schedule-independent model dimension. */
  readonly viewId?: ViewId;
  /** ≥ 2 anchors; the value is the measured distance/angle between them, DERIVED from live geometry. */
  readonly anchors: readonly AnnotationAnchor[];
  /** How the anchors are read into a number. `radial`/further kinds are additive members, never an edit. */
  readonly dimensionKind: 'linear' | 'angular' | 'radial';
}

export interface Tag {
  readonly id: AnnotationId;
  readonly kind: 'tag';
  readonly viewId?: ViewId;
  /** What it labels — an element (its mark/type) or a specific sub-shape (a leader landing on a face/corner). */
  readonly anchor: AnnotationAnchor;
  /**
   * WHICH derived value the tag displays — a stable KEY into the FROZEN model, never the value itself. The tag
   * text re-derives from this key on every draw. Reserved key grammar (new keys are additive strings):
   * `mark` (`Element.mark`), `type` (`typeId`), `param:<key>` (a `params` key), `quantity:<key>` (a
   * `QuantityBreakdown` axis — `volume`/`area`/`mass`, optionally per part).
   */
  readonly subject: string;
}

/* ================================================================================================
 * THE SCHEDULE — a tabular VIEW bound to type/param/quantity KEYS (D58: v1.0.0 ships ONE).
 * This is the anchor gate ⑨ never covered, and the reason row Ⓐ exists beyond it.
 * ============================================================================================= */

/**
 * A SCHEDULE — a filter (which elements are rows) + columns (each a stable KEY into the frozen model). The
 * rows and cell values are DERIVED from the live scene on every render, never stored — a schedule is a query
 * with a layout.
 *
 * ⚠ THE FREEZE QUESTION Ⓐ ANSWERS (the one gate ⑨ did NOT): a schedule binds to type/param/quantity with keys
 * that survive an edit, against FROZEN shapes (`P5_step5A_documentation_anchoring_design.md` §4): the filter
 * reads `typeId`/`Classification`/`containerId` (all frozen, stable); each column reads a `ScheduleColumn`
 * whose key is a frozen addressable (`field` → a frozen `Element` field; `param` → a `ParamSchema` field key;
 * `quantity` → a `QuantityBreakdown` axis; `count` → the row count). ⇒ NO NEW FROZEN FIELD anchors it, so the
 * exporter/renderer is a v1.0.x/P6 additive BODY over this reserved shape.
 */
export interface ScheduleDefinition {
  readonly id: ScheduleId;
  readonly name: string;
  /** WHICH elements are rows — a filter over FROZEN, stable keys (all optional; AND-combined). */
  readonly filter: ScheduleFilter;
  /** The columns, in order. Each is a stable key into the frozen model; the cell value derives. */
  readonly columns: readonly ScheduleColumn[];
  /**
   * Optional grouping (Revit's "sort/group"). Additive; absent ⇒ a flat list.
   *
   * ⚠⚠ IT NAMES **STABLE COLUMN KEYS**, NEVER DISPLAY HEADINGS (owner-ruled 2026-07-28, Q1;
   * `P5_step6B_schedules_design.md` §6.1). A key is `columnKeyOf(column)` — `field:mark`,
   * `param:thickness`, `quantity:volume:structure`. A `heading` is display text: optional, human-facing
   * and renameable, and grouping by it is **D70's defect verbatim** — the Clean Delta keyed materials by
   * display NAME, so a rename re-keyed every downstream work package and two entities sharing a label
   * merged into one. Here it would mean: rename a heading and every group silently re-keys; two columns
   * given the same heading merge; a column with **no** heading could not be grouped by at all.
   *
   * *(This comment was the whole of the fix — the ambiguity was caught before the shape had a body,
   * which is the cheapest moment this project has ever caught one of these.)*
   */
  readonly groupBy?: readonly string[];
  /**
   * WHICH design alternatives this schedule shows (owner-ruled 2026-07-28, Q2 —
   * `P5_step6B_schedules_design.md` §6.2). The `ViewCommon.designOptionIds?` field (D65) for the TABULAR
   * view: a schedule is placed on a sheet through the same `Viewport`, and it is the consumer D65's own
   * sentence names FIRST (*"a schedule double-counts and work packages are published for a scheme
   * nobody builds"*) — yet it was the one that got no field.
   *
   * Absent ⇒ each option set's PRIMARY option, plus the main model.
   *
   * ⚠⚠ IT IS A DISPLAY SELECTION, NOT A LICENCE TO DOUBLE-COUNT. Choosing options here is a question
   * *asked of* the model, never a change to it — the `clip` discipline. An aggregating consumer still
   * resolves ONE active option per set (`isElementActive`); the exclusion invariant is a correctness
   * rule that this field cannot switch off. *(Measured 2026-07-28 on the body that reads it: a wall
   * schedule that ignores the invariant over-reports by 2.0000×.)*
   */
  readonly designOptionIds?: readonly DesignOptionId[];
}

/** The row selector — every field optional, AND-combined; each binds to a FROZEN, stable key. */
export interface ScheduleFilter {
  /** e.g. only `core.wall` / `core.opening`. A registered contract id (D19), stable. */
  readonly typeId?: TypeId;
  /** e.g. all `IfcDoor`. Reads the frozen `Classification.ifcClass`. */
  readonly ifcClass?: string;
  /** e.g. structural only. Reads the frozen `Classification.loadBearing`. */
  readonly loadBearing?: boolean;
  /** Confine to a Level/Building/Site subtree (the frozen container tree). */
  readonly containerId?: ContainerId;
}

/**
 * ONE schedule column — a stable KEY into the frozen model + an optional heading. The value derives; the key
 * is frozen. A tagged union on `source` so a new column source (a formula, a classification code) is an
 * additive member, never an edit.
 *
 * - `field`    — a frozen `Element` field (the mark/name/id/type/level). The identity/description axes.
 * - `param`    — a `params` key (a `ParamSchema` field). A rename is a `migrate`, never a schedule break.
 * - `quantity` — a `QuantityBreakdown` axis: `volume` | `area` | `mass` (optionally scoped to one part name).
 * - `count`    — the number of rows in the (grouped) selection.
 */
export type ScheduleColumn =
  | {
      readonly source: 'field';
      readonly key: 'mark' | 'name' | 'id' | 'type' | 'level';
      readonly heading?: string;
    }
  | { readonly source: 'param'; readonly key: string; readonly heading?: string }
  | {
      readonly source: 'quantity';
      readonly key: 'volume' | 'area' | 'mass';
      /** Restrict to one part name (`structure`, `finish.interior`); absent ⇒ summed over all parts. */
      readonly part?: string;
      readonly heading?: string;
    }
  | { readonly source: 'count'; readonly heading?: string };

/* ================================================================================================
 * THE VIEW — a PROJECTION of the B-Rep. Stores HOW to project, never the projected lines.
 * ============================================================================================= */

/**
 * A VIEW DESCRIPTOR — a tagged union on `kind`. v1.0.0's minimal documentation ships a PLAN and a SECTION
 * (D58); this is their definition/anchoring contract. What is STORED is how to project — a cut plane, a
 * direction, a clip, a scale — never the projected 2D geometry (the `sectionCut` op, ALREADY RESERVED in the
 * frozen kernel protocol, derives it on demand — no new op).
 *
 * ⚠ A VIEW IS ANCHORED BY GEOMETRY (a cut plane in world mm), NOT BY A `SubShapeRef` — it shows a REGION, not
 * a sub-shape. Its stability is that it is a pure function of the frozen scene + its own cut plane: move a
 * wall and the plan re-projects, because the plan is re-derived, never stored.
 */
export type ViewDescriptor = PlanView | SectionView | ElevationView | ThreeDView;

/** Common to every view: a display scale (drives annotation sizing, not the model) + an optional clip box. */
export interface ViewCommon {
  readonly id: ViewId;
  readonly name: string;
  /** Drawing scale denominator (`100` ⇒ 1:100). Sizes annotations; the model is unaffected. */
  readonly scale: number;
  /** World-mm axis-aligned clip box `[min, max]`; absent ⇒ the whole model. */
  readonly clip?: readonly [readonly [number, number, number], readonly [number, number, number]];
  /**
   * WHICH design alternatives this view shows (D65, row Ⓕ, 2026-07-24 — `designoptions.ts`).
   * Absent ⇒ each option set's PRIMARY option, plus the main model.
   *
   * ⚠ A view is a PROJECTION (rule 17), so choosing options here is a *question asked of* the model, never
   * a change to it — the same discipline as `clip`. It does not license a view to show two exclusive
   * options at once as if both were built: an aggregating consumer still resolves ONE active option per set
   * (`isElementActive`). This field is a display selection; the exclusion invariant is a correctness rule.
   *
   * ⚠ It lands on `ViewCommon` — i.e. on a shape that was ITSELF an optional reservation (row Ⓐ) when this
   * field was added — so it was additive twice over and cost the freeze nothing.
   */
  readonly designOptionIds?: readonly DesignOptionId[];
}

/** A horizontal cut at a Level, looking down — the classic floor plan. */
export interface PlanView extends ViewCommon {
  readonly kind: 'plan';
  /** The Level whose plane is cut. */
  readonly levelId: ContainerId;
  /** mm above the Level plane the horizontal cut is taken at (Revit's "cut plane height"). */
  readonly cutHeight?: number;
}

/** A vertical cut plane, looking along its normal — a building section. */
export interface SectionView extends ViewCommon {
  readonly kind: 'section';
  /** A point on the cut plane, world mm. */
  readonly origin: readonly [number, number, number];
  /** The plane normal (the view direction), world mm. */
  readonly normal: readonly [number, number, number];
}

/** A view looking along a horizontal axis at the model's exterior — an elevation. */
export interface ElevationView extends ViewCommon {
  readonly kind: 'elevation';
  /** The horizontal look direction, world mm. */
  readonly direction: readonly [number, number, number];
}

/** A 3D projection (axonometric/perspective) — the model as eyes see it. */
export interface ThreeDView extends ViewCommon {
  readonly kind: '3d';
  /** The eye direction, world mm. */
  readonly direction?: readonly [number, number, number];
}

/* ================================================================================================
 * THE SHEET — the paper a view is placed on. A Viewport is nested (a sheet OWNS its viewports).
 * ============================================================================================= */

/**
 * A placement of a view on a sheet.
 *
 * ⚠ `viewId` may name a `views` entry OR a `schedules` entry — a schedule is placed on a sheet exactly like a
 * drawing view. Both id spaces are disjoint ULIDs, so ONE field addresses either; the type is `ViewId`
 * (`ScheduleId` is the same underlying `string`, so a separate union member would be duplicative).
 */
export interface Viewport {
  readonly viewId: ViewId;
  /** Where on the sheet, mm from the sheet's origin. */
  readonly at: readonly [number, number];
}

export interface Sheet {
  readonly id: SheetId;
  /** The drawing number — `A-101`. Distinct from the ULID `id`. */
  readonly number: string;
  readonly name: string;
  /** A reserved titleblock id; the titleblock library is a v1.0.x concern. Absent ⇒ no titleblock. */
  readonly titleblock?: string;
  readonly viewports: readonly Viewport[];
}
