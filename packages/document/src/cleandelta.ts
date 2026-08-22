/**
 * ⚠⚠ THE CLEAN DELTA EXPORTER — *"the contract that carries money"* (Freeze-Gate ⑥, D36b/D57).
 *
 * **Design:** `P5_step6_clean_delta_design.md` (the payload mapping, field for field, proven to need no
 * frozen change) + `P5_step6A_enumeration_design.md` (the enumeration query it opens with, and the
 * owner's 2026-07-25 rulings). **Target:** `../Planitor/v2.2_spec.md` §4, `contract_version: "1.2"`,
 * `source: "bunyan"` — a real, on-box consumer contract, not a guess (D57: BIMsync is unbuilt and will
 * adapt to Bunyan, so Bunyan owns this payload and designs it for Planitor + Miqdar).
 *
 * ⚠⚠ **THE PROPERTY THIS FILE EXISTS TO PRESERVE, AND IT IS THE WHOLE MOAT:** `change_type` is **READ
 * off the journal, never inferred by diffing two models.** BIMsync must diff, because it is handed
 * foreign files and has nothing else. Bunyan *knows* — it was there when the wall moved. The delta since
 * revision N **is** `journal.filter(e => e.seq > revN.issued_at_seq)` (D40), and every `change_type`
 * below is a pure function of that slice. Nothing here fingerprints, matches or guesses.
 *
 * ⚠ `reidentified` is **never emitted** — it cannot occur (D1 derived sub-shape identity + D44 ULID
 * PEIs). Planitor's confusing-change resolution queue is *always empty* for a Bunyan model (Planitor D9).
 *
 * ⚠ Additive: this is an exporter over frozen shapes. No stored byte, no `SCENE_SCHEMA_VERSION` bump,
 * no frozen field — exactly as the ⑥ design proved before the freeze.
 */

import type { ElementId } from './entities.js';
import type { DocumentContext, PartQuantity } from './document.js';
import type { ModelRevision } from './revision.js';
import type { Scene, SceneChange } from './scene.js';
import { revertChanges } from './scene.js';
import type { UndoableEdit } from './undo.js';
import { journalCoversRevision, missingAnchorMessage } from './undo.js';
import type { EnumerateOptions, ModelElement } from './enumerate.js';
import { deferredElements } from './enumerate.js';
import { isElementActive, optionScopeOf } from './designoptions.js';
import { builtAxisLength } from './joins.js';
import type { JoinOptionSelection } from './joins.js';
import type { Registries } from './registries.js';
import type { GeometryGateway } from './geometry.js';

/**
 * The contract version this exporter emits — Planitor v2.2 §4.
 *
 * ⚠ 1.1 → 1.2 (Entry 60): `parts[].materialId` is REQUIRED. 1.1 identified a material by its display
 * NAME alone, which is `core_logic.md` rule 12's exact failure ("a value that must be grouped,
 * scheduled, or read by an analysis engine cannot be a copy"). Bumped rather than added optionally
 * because an OPTIONAL identity field leaves the defect reachable — a consumer could still key by name.
 * Cheapest possible moment to bump: 1.1 was published 2026-07-25 and no consumer has implemented it.
 */
export const CLEAN_DELTA_CONTRACT_VERSION = '1.2';

/**
 * Planitor's `change_type` enum, in full.
 *
 * ⚠ `reidentified` is declared and NEVER emitted — deliberately, and it is documented rather than
 * omitted because *the absence is the claim*. A consumer reading this type sees that Bunyan can express
 * the case and structurally cannot produce it.
 */
export type ChangeType =
  | 'added'
  | 'modified_qty'
  | 'modified_move'
  | 'modified_type'
  | 'deleted'
  | 'unchanged'
  | 'reidentified'
  | 'split'
  | 'merge';

/** mm³/mm² → m³/m². The wire contract is metric SI; Bunyan's internal unit is the millimetre. */
const MM3_TO_M3 = 1e9;
const MM2_TO_M2 = 1e6;

export interface CleanDeltaPart {
  readonly name: string;
  /**
   * ⚠⚠ THE MATERIAL'S SHARED-ENTITY ID (contract 1.2, Entry 60 — the rule-12 backward sweep).
   *
   * **This is the grouping key. `material` below is a LABEL for humans, and nothing else.** Contract 1.1
   * shipped only the label, which broke `core_logic.md` rule 12 on the one surface the rule names:
   * *"Materials and Sections are shared entities, never strings — a value that must be grouped,
   * scheduled, or read by an analysis engine cannot be a copy."* A Clean Delta package is exactly that
   * value, and it was keyed on a mutable, non-unique display name. Three ways that goes wrong, all silent:
   *
   *   1. **Rename** `C25/30` → `C25/30 (pump)` and every downstream work package re-keys — rule 13's
   *      "identity survives every rebuild and re-issue" defeated for materials.
   *   2. **Two distinct materials sharing a display name** merge into one schedule group. `Material.name`
   *      carries no uniqueness constraint and nothing refuses a duplicate.
   *   3. **An unresolvable material** emits its raw id as the name (`materialName: name ?? materialId`,
   *      `document.ts`), so the SAME material arrives under two different keys depending on whether it
   *      resolved — one material, two groups.
   *
   * ⚠ The tell that this was a backward-sweep miss rather than a design choice: `enumerate.ts`'s
   * `totalsByMaterial` has always grouped by `part.materialId`. The rule was obeyed INTERNALLY and broken
   * on the contract three products bind to.
   */
  readonly materialId: string;
  /** The human-facing label — for display only. ⚠ NEVER group by this; group by `materialId`. */
  readonly material: string;
  /** m³ */
  readonly volume: number;
  /** m² */
  readonly area: number;
  /** kg — ⚠ ABSENT (not `0`) when the material's density does not resolve (D45, domain rule 15). */
  readonly mass?: number;
  readonly unit: string;
  /** ⚠ Whose trade builds it (D45) — the field Planitor's work-package routing runs on. */
  readonly discipline: string;
}

export interface CleanDeltaQuantity {
  /** The rolled-up value in `unit` — ⚠ a CONVENIENCE. `parts[]` is the quantity (Planitor's own rule). */
  readonly value: number;
  readonly unit: 'm3';
  /** ⚠ Always `exact` — measured on the B-Rep, per part, per material. Never downgraded (Planitor D10). */
  readonly basis: 'exact';
  readonly canonical: {
    readonly volume: number;
    readonly area: number;
    /** m — the element's SEMANTIC axis length, or `null` when it has none (Freeze-Gate ⓗ, §4a). */
    readonly length: number | null;
    readonly count: number;
  };
  readonly parts: readonly CleanDeltaPart[];
}

export interface CleanDeltaElement {
  /** ⚠ The PEI **is** `element.id` — a prefixed ULID (D44). No minting, no fingerprinting (Planitor D9). */
  readonly pei: ElementId;
  /** `null` for a Bunyan-authored model — identity is by construction, so nothing must be guessed back. */
  readonly ifc_guid: null;
  readonly fingerprint: null;
  readonly change_type: ChangeType;
  readonly spatial_container_code: string;
  readonly classification: {
    readonly ifc_class: string;
    readonly predefined_type: string | null;
    readonly material: string | null;
    readonly type_name: string;
    readonly out_of_scope: boolean;
  };
  /** Absent for a `deleted` element — it has no current geometry to measure. */
  readonly quantity?: CleanDeltaQuantity;
  /** The state at the previous revision. `null` fields where the element did not exist then. */
  readonly prior: {
    readonly quantity_value: number | null;
    readonly spatial_container_code: string | null;
  };
  /** v1.0.0 has no `split`/`merge` verb, so both are `null` — additive the day one lands. */
  readonly links: {
    readonly split_from_pei: null;
    readonly merge_into_pei: null;
  };
}

export interface CleanDeltaPackage {
  readonly contract_version: string;
  readonly source: 'bunyan';
  readonly model_revision: {
    readonly snapshot_number: number;
    readonly previous_snapshot_number: number | null;
    readonly lineage: string;
    readonly promoted_at: string;
    readonly promoted_by: string;
  };
  readonly units: 'metric';
  readonly spatial: {
    readonly zones: readonly {
      readonly code: string;
      readonly name: string;
      readonly order: number;
    }[];
    readonly floors: readonly {
      readonly code: string;
      readonly zone_code: string;
      readonly label: string;
      readonly order: number;
      /** m — a Level's elevation. `null` for a container that declares none. */
      readonly elevation: number | null;
    }[];
  };
  readonly elements: readonly CleanDeltaElement[];
  readonly summary: Readonly<Record<ChangeType, number>>;
  /**
   * ⚠⚠ NOT IN PLANITOR'S §4 — AND IT IS OURS TO ADD, ADDITIVELY (owner-ruled 2026-07-25, §4 Q1). Every
   * real element in the delta that could not be MEASURED, and why. Rule 15 forbids reporting it as `0`;
   * silently omitting it from a package that carries money is the same wrongness one level up. A
   * consumer that does not know the field ignores it; a consumer that does can refuse to bill a
   * package that admits it is incomplete.
   */
  readonly unmeasured: readonly { readonly pei: ElementId; readonly reason: string }[];
}

export interface ExportOptions extends EnumerateOptions {
  /**
   * The revision to compute the delta AGAINST. Absent ⇒ the document's own previous revision.
   * ⚠ The document must have been issued at least once — a delta with no baseline is not a delta.
   */
  readonly since?: ModelRevision;
  /**
   * How to build the throwaway document that prices the model at `since` (the owner's Q2 ruling).
   * Absent ⇒ `prior.quantity_value` is `null` on every row and the export still succeeds — a caller
   * that only wants `change_type` (a schedule reconciliation) pays no kernel time at all.
   */
  readonly priorContext?: {
    readonly registries: Registries;
    readonly geometry: GeometryGateway;
    /** Constructs the throwaway document. Injected so this module never imports `DocumentContext`. */
    readonly create: (scene: Scene) => DocumentContext;
  };
}

/* ================================================================================================
 * §1 — THE REWIND. The scene as it stood at revision N.
 * ============================================================================================= */

/**
 * Reconstruct the scene at `sinceSeq` by inverting the journal slice, newest edit first.
 *
 * ⚠ THIS IS EXACT, AND IT IS EXACT FOR A STRUCTURAL REASON: the journal is **append-only and complete**
 * (D40 — an undo does not pop an entry, it appends a REVERSAL), and every `SceneChange` carries **both
 * sides** (`before` and `after`, spec §6.1). So walking it backwards restores the recipe exactly. It is
 * *not* a command replay — replaying commands backwards would re-run the booleans, and boolean topology
 * is not guaranteed identical across runs (`undo.ts`, the reason undo is a delta in the first place).
 */
export function sceneAt(scene: Scene, journal: readonly UndoableEdit[], sinceSeq: number): Scene {
  const after = [...journal].filter((e) => e.seq > sinceSeq).sort((a, b) => b.seq - a.seq);
  return after.reduce((acc, edit) => revertChanges(acc, edit.changes), scene);
}

/* ================================================================================================
 * §2 — `change_type`, DERIVED FROM THE JOURNAL SLICE (design §3). Every input is frozen.
 * ============================================================================================= */

/** The positional/geometry-free params — a change confined to these is a MOVE, not a re-quantification. */
const MOVE_PARAMS = new Set(['start', 'end', 'placement', 'origin', 'location']);

interface ElementHistory {
  readonly first?: SceneChange;
  readonly last?: SceneChange;
  /** True when some edit in the slice listed this element in `rebuilt` (the ASSOCIATIVE cascade). */
  readonly cascaded: boolean;
  readonly commands: readonly string[];
}

/** Fold the journal slice into a per-element history. One pass; the slice is already `seq`-ordered. */
function historiesIn(slice: readonly UndoableEdit[]): Map<ElementId, ElementHistory> {
  const out = new Map<ElementId, ElementHistory>();
  const get = (id: ElementId): ElementHistory => out.get(id) ?? { cascaded: false, commands: [] };

  for (const edit of [...slice].sort((a, b) => a.seq - b.seq)) {
    for (const change of edit.changes) {
      if (change.collection !== 'elements') continue;
      const prev = get(change.id);
      out.set(change.id, {
        ...prev,
        ...(prev.first === undefined ? { first: change } : {}),
        last: change,
        commands: [...prev.commands, edit.command],
      });
    }
    // ⚠⚠ THE ASSOCIATIVE CASCADE, AND IT IS THE CASE THE MOAT IS FOR: a Level moved and 400 walls'
    // quantities changed though nothing touched them directly. They appear in NO `SceneChange` — only
    // in `rebuilt`. A two-model diff gets this right only by luck; Bunyan reads it (design §3).
    for (const id of edit.rebuilt) {
      const prev = get(id);
      out.set(id, { ...prev, cascaded: true });
    }
  }
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The AUTHORED scene row a PEI belongs to — itself for an authored id, the part before the first `:`
 * for a generated child (`${parentId}:${slot}`, D59). Structural, so it still answers for an element
 * that no longer exists anywhere in the model.
 */
function authoredRootOf(id: ElementId): ElementId {
  const cut = id.indexOf(':');
  return cut === -1 ? id : id.slice(0, cut);
}

/** Key-order-independent structural equality — the rewound scene is rebuilt from JSON snapshots. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (!isRecord(a) || !isRecord(b)) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Did the element move in SPACE between the two endpoints — its position params, or its container?
 *
 * ⚠ A container change counts as a move, and that is Planitor D5: *"spatial move = a first-class change
 * → reassign the task's LBS leaf → approval-gated → re-run takt/phase/leveling for source and target
 * zones."* A wall that moved from Level 2 to Level 3 has moved, whatever its params say.
 */
function movedInSpace(before: Record<string, unknown>, after: Record<string, unknown>): boolean {
  if (!deepEqual(before['containerId'], after['containerId'])) return true;
  const b = isRecord(before['params']) ? before['params'] : {};
  const a = isRecord(after['params']) ? after['params'] : {};
  return [...MOVE_PARAMS].some((key) => !deepEqual(b[key], a[key]));
}

/**
 * The `change_type` of one element — from **the two ENDPOINTS**, with the journal deciding *which*
 * elements are even asked about.
 *
 * ⚠⚠ IT COMPARES THE STATE AT REVISION N WITH THE STATE NOW — NOT THE LAST EDIT IN THE SLICE. That
 * distinction is a defect this exporter shipped with for one build and an adversarial probe caught:
 * **edit a wall, then UNDO it, and the last edit in the slice is the reversal** — a `before → after`
 * that differs in `end` — so the wall was reported `modified_move` when **its net change since the
 * baseline is nothing at all.** Planitor would have processed a spatial move that never happened. An
 * undo is a first-class journal entry (D40), so any derivation reading only the last entry mistakes
 * *"the last thing that happened"* for *"what is different now"*.
 *
 * ⚠ THIS IS NOT "DIFFING TWO MODELS", AND THE DIFFERENCE IS THE WHOLE MOAT. The journal still decides
 * **which** elements are in the delta — including the ones no `SceneChange` names, reached only through
 * `rebuilt` (the associative cascade). We then read both endpoints **of those elements only**. BIMsync
 * has to compare *every* element of two models because it has no idea which ones moved; Bunyan never
 * asks that question. The set is read; the endpoints are compared.
 *
 * Ordered by consumer impact, and each branch is defensible on its own:
 */
export function changeTypeOf(
  existedBefore: boolean,
  existsNow: boolean,
  priorElement: unknown,
  currentElement: unknown,
  quantityChanged: boolean,
): ChangeType {
  if (!existedBefore && existsNow) return 'added';
  if (existedBefore && !existsNow) return 'deleted';
  // Created AND deleted within the same slice: it never existed at either endpoint, so there is
  // nothing downstream to add, price or archive. (Reported, not silently dropped — see the caller.)
  if (!existedBefore && !existsNow) return 'unchanged';
  if (!isRecord(priorElement) || !isRecord(currentElement)) return 'unchanged';

  // A different Type or Style ⇒ the consumer must re-derive the binding, not merely re-price it.
  if (
    !deepEqual(priorElement['typeId'], currentElement['typeId']) ||
    !deepEqual(priorElement['styleId'], currentElement['styleId'])
  ) {
    return 'modified_type';
  }
  // ⚠ Quantity BEFORE move: a wall dragged LONGER both moved and re-quantified, and a schedule that
  // read `modified_move` would never re-price work somebody now has to do.
  if (quantityChanged) return 'modified_qty';
  if (movedInSpace(priorElement, currentElement)) return 'modified_move';
  // Touched, but nothing a consumer prices or locates is different at the two endpoints — a metadata
  // edit (a `mark`, a property), or an edit that was subsequently undone. Planitor's own consumer rule
  // treats `unchanged` as a no-op, which is exactly right: there is nothing for it to do.
  return 'unchanged';
}

/* ================================================================================================
 * §3 — THE EXPORT.
 * ============================================================================================= */

function partToWire(part: PartQuantity): CleanDeltaPart {
  return {
    name: part.name,
    materialId: part.materialId,
    material: part.materialName,
    volume: part.volume / MM3_TO_M3,
    area: part.area / MM2_TO_M2,
    ...(part.mass === undefined ? {} : { mass: part.mass }),
    unit: 'm3',
    discipline: part.discipline,
  };
}

/**
 * The element's SEMANTIC axis length in metres, or `null` (Freeze-Gate ⓗ, design §4a).
 *
 * ⚠ It is a PARAM, never `measure.edgeLength` — the sum of every edge of a solid is meaningless as a
 * schedule quantity. *"120 m of IPE300"* is the member's axis, and a wall's is its baseline.
 */
function semanticLength(
  scene: Scene,
  elementId: ElementId | undefined,
  selection: JoinOptionSelection,
): number | null {
  const element = elementId === undefined ? undefined : scene.elements[elementId];
  if (element === undefined) return null;

  // ⚠⚠ THE BUILT AXIS, NOT THE AUTHORED BASELINE (Entry 60, domain rule 15). A join CLIPS a wall's end
  // cap, so a butted partition's solid is shorter than the baseline it was drawn on. Emitting the
  // baseline here put a reconstructed number beside a measured `volume` under one `basis: 'exact'` — and
  // the two disagreed about the same wall, which a consumer can detect from the package alone.
  // `builtAxisLength` returns the baseline exactly when nothing is joined.
  const axis = builtAxisLength(scene, element.id, selection);
  if (axis !== undefined) return axis / 1000;

  // Not a baseline wall — fall back to a declared `length` param (a LinearMember's axis).
  const length = element.params['length'];
  if (typeof length === 'number') return length / 1000;
  return null;
}

/**
 * ⚠⚠ THE EXPORT. `journal + revN → CleanDeltaPackage`, read rather than inferred.
 *
 * The shape of the work:
 *  1. slice the journal at `since.issued_at_seq` — *that one line is the whole ecosystem claim* (D40);
 *  2. enumerate every REAL element now (the D59 children walk + the D65/D67 option cascade);
 *  3. rewind the scene to `since` and — per the owner's Q2 ruling — rebuild **only the delta's
 *     elements** in a throwaway document, to price `prior` exactly;
 *  4. derive each `change_type` from the slice (design §3);
 *  5. emit, with the LBS tree Planitor resolves its zones and floors from.
 */
export async function exportCleanDelta(
  doc: DocumentContext,
  options: ExportOptions = {},
): Promise<CleanDeltaPackage> {
  const revision = doc.revision;
  if (revision === undefined) {
    throw new Error(
      'cannot export a Clean Delta from a document that has never issued a revision — ' +
        'a delta with no baseline is not a delta (D34: saving is not issuing)',
    );
  }
  const since = options.since ?? revision;
  // ⚠⚠ AND THE BASELINE MUST BE VISIBLE IN THE LOG, NOT MERELY NAMED BY THE MANIFEST (rule 14, swept
  // 2026-07-28). Slicing a journal that cannot see `since` yields `[]`, and `[]` here does not read as
  // "I cannot answer" — it reads as a complete package in which nothing changed. Measured before the
  // guard: a wall that grew 6 m → 8 m after the baseline was published as zero elements, all-zero
  // summary, `contract_version: 1.2`, `source: bunyan`. **The one wrong number this exporter can emit
  // is the empty one**, because Planitor's consumer rule reads absence-from-`elements` as `unchanged`
  // and keeps billing the model it already has.
  if (!journalCoversRevision(doc.changeFeed(), since)) {
    throw new Error(missingAnchorMessage(since));
  }
  const slice = doc.changeFeed().filter((e) => e.seq > since.issued_at_seq);
  const histories = historiesIn(slice);

  // --- 2. every real element NOW, indexed. --------------------------------------------------------
  // ⚠⚠ FORCE FIRST (D66 §3c, T-005), and BOUNDED TO THE DELTA — the same scope owner ruling Q2 gives the
  // prior rebuild below, for the same reason: the cost tracks the size of the CHANGE. A delta element
  // this document never built would otherwise arrive as `stale`, and a generated child of one would not
  // arrive at all — and absence from `elements` is precisely what Planitor's consumer rule reads as
  // `unchanged` and keeps billing.
  await doc.rebuildOnly(deferredElements(doc.scene, (id) => doc.geometryOf(id), histories.keys()));
  const now = new Map<ElementId, ModelElement>();
  for (const element of doc.modelElements(options)) now.set(element.id, element);

  // --- 3. the rewind + the bounded prior rebuild (owner ruling Q2). -------------------------------
  const priorScene = sceneAt(doc.scene, doc.changeFeed(), since.issued_at_seq);
  const priorQuantity = new Map<ElementId, number>();
  const priorContainer = new Map<ElementId, string>();
  /** Every REAL element (incl. generated children) that existed at revision N, within the delta. */
  const priorReal = new Set<ElementId>();
  const priorEnumerated = options.priorContext !== undefined;

  if (options.priorContext !== undefined) {
    const prior = options.priorContext.create(priorScene);
    try {
      // ⚠ ONLY the delta's elements — the ruling's whole point: the cost tracks the size of the CHANGE.
      const wanted = [...histories.keys()].filter((id) => priorScene.elements[id] !== undefined);
      await prior.rebuildOnly(wanted);
      for (const element of prior.modelElements(options)) {
        if (!histories.has(element.rootId) && !histories.has(element.id)) continue;
        priorReal.add(element.id);
        priorContainer.set(element.id, element.containerCode);
        if (!element.hasParts || element.state !== 'valid') continue;
        const breakdown = await prior.quantities(element.id);
        priorQuantity.set(
          element.id,
          breakdown.parts.reduce((sum, p) => sum + p.volume, 0) / MM3_TO_M3,
        );
      }
    } finally {
      // ⚠⚠ The throwaway document holds real OCCT solids. Not freeing them leaks the whole prior model
      // into the tab the user is still modelling in, once per export (spec §6.2, the Entry-21 class).
      await prior.dispose();
    }
  }

  // --- 4 + 5. the rows. ---------------------------------------------------------------------------
  const elements: CleanDeltaElement[] = [];
  const unmeasured: { pei: ElementId; reason: string }[] = [];
  const summary: Record<ChangeType, number> = {
    added: 0,
    modified_qty: 0,
    modified_move: 0,
    modified_type: 0,
    deleted: 0,
    unchanged: 0,
    reidentified: 0,
    split: 0,
    merge: 0,
  };

  // Every element the delta touches: the journal's own ids, PLUS every real element descending from one
  // (a curtain wall's panels re-derive when their parent's params change — the parent is in the journal,
  // the panels are the things a schedule bills).
  const touched = new Set<ElementId>(histories.keys());
  for (const element of now.values()) {
    if (histories.has(element.rootId)) touched.add(element.id);
  }
  // ⚠ AND THE ONES THAT VANISHED. A generated child whose SLOT disappeared (a curtain-wall grid shrunk
  // from 3 columns to 2) is in no scene row and in no `now` enumeration — so without this it would fall
  // out of the package silently, and Planitor's *"absence-from-elements ⇒ unchanged"* rule would quietly
  // keep billing a panel that no longer exists. It is reachable only from the PRIOR model.
  for (const id of priorReal) touched.add(id);

  // ⚠⚠ THE EXCLUSION INVARIANT ON THIS PATH TOO (D65 + D67) — and it is a THIRD road to the same
  // failure, found by probing this exporter adversarially. `modelElements` applies the rule, but the
  // journal names ids directly, so an element in a NON-ACTIVE design option arrived here through
  // `histories` with no match in `now` — and was emitted as a ghost row: `modified_qty`, no quantity,
  // an empty container code, `IfcBuildingElementProxy`. **Planitor would have received a work-package
  // row for a scheme nobody is building**, which is D65's own stated failure mode verbatim.
  //
  // Not-active is neither a change nor a deletion: those elements are **not part of the model being
  // published**, so they are omitted entirely. (v1.0.x, when options become authorable: an element that
  // was active at revision N and is now in a dropped option is a scope REMOVAL, and Planitor's
  // approval-gated soft-delete is where it belongs — additive, and it needs this rule to exist first.)
  const scope = optionScopeOf(doc.scene, options.designOptions);
  const activeOptions = options.active ?? {};

  for (const id of touched) {
    const element = now.get(id);
    const sceneRow = doc.scene.elements[id];
    if (sceneRow !== undefined && !isElementActive(sceneRow, scope, activeOptions)) continue;

    const history = histories.get(id) ?? histories.get(element?.rootId ?? id);

    let quantity: CleanDeltaQuantity | undefined;
    let currentValue: number | null = null;

    if (element !== undefined && element.state !== 'valid') {
      unmeasured.push({ pei: id, reason: element.failure ?? element.state });
    } else if (element !== undefined && element.hasParts) {
      const breakdown = await doc.quantities(id);
      const parts = breakdown.parts.map(partToWire);
      const volume = breakdown.parts.reduce((sum, p) => sum + p.volume, 0) / MM3_TO_M3;
      const area = breakdown.parts.reduce((sum, p) => sum + p.area, 0) / MM2_TO_M2;
      currentValue = volume;
      quantity = {
        value: volume,
        unit: 'm3',
        basis: 'exact',
        canonical: {
          volume,
          area,
          length: semanticLength(doc.scene, element.rootId, {
            ...(options.active === undefined ? {} : { active: options.active }),
            ...(options.designOptions === undefined
              ? {}
              : { designOptions: options.designOptions }),
          }),
          count: 1,
        },
        parts,
      };
    }

    const priorValue = priorQuantity.get(id) ?? null;

    // ⚠ EXISTENCE IS ASKED OF THE RIGHT REGISTER. An authored element exists iff it is a scene row; a
    // GENERATED CHILD (D59) is never a scene row at all, so its existence is its presence in the
    // enumeration. Asking `scene.elements` about a panel answers "no" for every panel that ever lived.
    // ⚠ THE ROOT IS DERIVED FROM THE PEI, NOT LOOKED UP. A child that VANISHED is in no enumeration,
    // so `now.get(id)?.rootId` is undefined for exactly the element whose parent we most need — and
    // falling back to `id` made a deleted panel look like an authored element that never existed
    // (reported `unchanged`: billed forever). The PEI grammar `${parentId}:${slot}` carries the answer
    // structurally, which is the point of having minted it that way (D59/D44).
    const rootId = authoredRootOf(id);
    const derived = id !== rootId;
    const parentBefore = priorScene.elements[rootId] !== undefined;
    // Its identity/recipe endpoints are the PARENT's — a child is derived from the parent's params, so
    // "did this panel's recipe change?" is exactly "did its curtain wall's?" (recipe-is-truth, D30).
    const priorElement = priorScene.elements[rootId];
    const currentElement = doc.scene.elements[rootId];
    const existsNow = derived ? element !== undefined : currentElement !== undefined;
    // ⚠ Without a prior context the prior model was never built, so a child's prior existence cannot be
    // known — fall back to its parent's, which is right except for a slot that appeared or vanished.
    const existedBefore = derived
      ? priorEnumerated
        ? priorReal.has(id)
        : parentBefore
      : parentBefore;

    // ⚠ A quantity comparison is only MEANINGFUL when both sides were MEASURED. Without a prior context
    // we fall back to evidence rather than to silence: the recipe changed, or the element was reached by
    // the associative cascade (in which case its datum moved under it and it must be re-priced). Both
    // beat reporting `unchanged` on a wall somebody now has to rebuild.
    const quantityChanged =
      priorValue === null || currentValue === null
        ? !deepEqual(priorElement, currentElement) || (history?.cascaded ?? false)
        : Math.abs(priorValue - currentValue) > 1e-9;

    const changeType = changeTypeOf(
      existedBefore,
      existsNow,
      priorElement,
      currentElement,
      quantityChanged,
    );
    summary[changeType] += 1;

    const scenePrior = priorScene.elements[element?.rootId ?? id];
    elements.push({
      pei: id,
      ifc_guid: null,
      fingerprint: null,
      change_type: changeType,
      spatial_container_code: element?.containerCode ?? '',
      classification: {
        ifc_class: element?.classification?.ifcClass ?? 'IfcBuildingElementProxy',
        predefined_type: null,
        material: quantity?.parts[0]?.material ?? null,
        type_name: element?.typeId ?? '',
        // ⚠ Exporter POLICY, not a stored field (design §2): a non-load-bearing element is still in
        // scope; `out_of_scope` is reserved for a discipline filter a caller supplies later.
        out_of_scope: false,
      },
      ...(quantity === undefined ? {} : { quantity }),
      prior: {
        quantity_value: priorValue,
        spatial_container_code:
          priorContainer.get(id) ??
          (scenePrior === undefined ? null : doc.containerCodeOf(scenePrior.containerId)),
      },
      links: { split_from_pei: null, merge_into_pei: null },
    });
  }

  return {
    contract_version: CLEAN_DELTA_CONTRACT_VERSION,
    source: 'bunyan',
    model_revision: {
      snapshot_number: revision.snapshot_number,
      previous_snapshot_number: revision.previous_snapshot_number ?? null,
      lineage: revision.lineage,
      promoted_at: revision.issued_at,
      promoted_by: revision.issued_by,
    },
    units: 'metric',
    spatial: spatialOf(doc),
    elements,
    summary,
    unmeasured,
  };
}

/**
 * Planitor's `zones` + `floors` — walked straight off `scene.containers` (D35).
 *
 * ⚠ *"The LBS falls out of the authored model"* (design §3.2): a `building` is a zone, a `level` is a
 * floor. Nothing is minted and nothing is mapped — the spatial tree the architect authored **is** the
 * Location Breakdown Structure, which is the entire reason Planitor's container→LBS map is a one-time
 * planner action for a Bunyan model rather than a per-import chore.
 */
function spatialOf(doc: DocumentContext): CleanDeltaPackage['spatial'] {
  const zones: { code: string; name: string; order: number }[] = [];
  const floors: {
    code: string;
    zone_code: string;
    label: string;
    order: number;
    elevation: number | null;
  }[] = [];

  for (const container of Object.values(doc.scene.containers)) {
    const code = doc.containerCodeOf(container.id);
    if (container.kind === 'building') {
      zones.push({ code, name: container.name, order: zones.length + 1 });
    } else if (container.kind === 'level') {
      floors.push({
        code,
        zone_code: doc.containerCodeOf(container.parentId),
        label: container.name,
        order: floors.length + 1,
        elevation: container.elevation === undefined ? null : container.elevation / 1000,
      });
    }
  }
  // Floors read in elevation order — a schedule presents storeys bottom-up, not in insertion order.
  floors.sort((a, b) => (a.elevation ?? 0) - (b.elevation ?? 0));
  return { zones, floors: floors.map((f, i) => ({ ...f, order: i + 1 })) };
}
