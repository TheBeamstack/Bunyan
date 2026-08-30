// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ THE SCHEDULES BODY (D58 row Ⓐ, `P5_step6B_schedules_design.md`) — the body that turns a
 * `ScheduleDefinition` into rows. The third and last consumer `enumerate.ts` was built to serve.
 *
 * **A schedule is a QUERY WITH A LAYOUT**: a filter (which elements are rows) + columns (each a stable KEY
 * into the frozen model). Rows and cells derive from the live scene on every call; nothing here is stored.
 *
 * ⚠⚠ THE ONE ARCHITECTURAL DECISION, AND EVERY MEASURED DEFECT FOLLOWS FROM IT: **this module has no
 * enumeration loop.** It consumes `modelElements()`, where the four filters already live (walk the D59
 * children tree · exclude non-active design options with the D67 cascade · an element with no own parts
 * yields no quantity · an unmeasurable element is reported, never zeroed and never dropped). Measured
 * 2026-07-28 against the naive `Object.values(scene.elements)` loop — which is what
 * `tests/documentation-anchoring.test.ts` carried as a worked example until this body replaced it:
 *
 *   a curtain-panel schedule       0 rows where 6 is correct   (1 authored row, 17 real elements)
 *   a no-filter schedule           THREW on the pure composite (not on the void — design §1.2)
 *   one non-active design option   2.0000× over-report         (D65's named failure mode, first consumer)
 *
 * ⚠⚠ AND THE RULE THIS BODY IS THE FIRST TEST OF (Entry 64, domain rule 17): **a schedule is a
 * PROJECTION.** The reserved `ScheduleDefinition` came back clean *by shape* — it stores keys and has
 * nowhere to put a value — and clean-by-shape holds only until a body is written against it. So:
 *
 *   1. every result type lives HERE, never in `documentation.ts` (stored vs derived is legible from the
 *      file a type is in, and that is greppable);
 *   2. `evaluateSchedule` is a QUERY — it writes no `scene.json` byte, mints no `UndoableEdit`, and
 *      caches nothing on the `Scene`;
 *   3. the `.bnn` carries the DEFINITION and never the result.
 *
 * ⚠ The tempting violation is a legitimate-sounding one — caching evaluated rows on the scene "because a
 * 10k schedule is slow." That is D29's shape (a perf question dragging in a stored derived value); the
 * answer is the same: measure first, and if it is slow, cache where staleness cannot be saved to a file.
 */

import type { ElementId } from './entities.js';
import type {
  ScheduleColumn,
  ScheduleDefinition,
  ScheduleFilter,
  ScheduleId,
} from './documentation.js';
import type { ModelElement, UnmeasuredElement } from './enumerate.js';
import type { QuantityBreakdown } from './document.js';
import type { ParamSchema } from './schema.js';
import type { Scene } from './scene.js';

/** The unit a `quantity` column's number is IN (domain rule 7 — a number crosses no boundary bare). */
const QUANTITY_UNITS: Readonly<Record<'volume' | 'area' | 'mass', string>> = {
  volume: 'mm³',
  area: 'mm²',
  mass: 'kg',
};

/**
 * ⚠⚠ THE STABLE KEY A COLUMN IS ADDRESSED BY — and the ONE place the key grammar lives (owner-ruled
 * 2026-07-28, Q1). `field:mark` · `param:thickness` · `quantity:volume:structure` · `count`.
 *
 * ⚠ A `heading` NEVER reaches the key. A heading is display text — optional, human-facing, renameable —
 * and keying anything by it is **D70's defect verbatim** (the Clean Delta keyed materials by display NAME:
 * a rename re-keyed every work package, and two entities sharing a label merged into one). Here it would
 * mean a renamed heading silently re-grouping a schedule, and an unheaded column being ungroupable.
 *
 * ⚠ The `part` qualifier IS part of the key: *"concrete volume"* and *"plaster volume"* are two columns.
 */
export function columnKeyOf(column: ScheduleColumn): string {
  switch (column.source) {
    case 'field':
      return `field:${column.key}`;
    case 'param':
      return `param:${column.key}`;
    case 'quantity':
      return column.part === undefined
        ? `quantity:${column.key}`
        : `quantity:${column.key}:${column.part}`;
    case 'count':
      return 'count';
  }
}

/* ================================================================================================
 * THE AUTHORING GRAMMAR — what a `ScheduleDefinition` must SATISFY to be worth storing (Entry 68).
 *
 * ⚠⚠ WHY THIS LIVES HERE AND NOT IN `commands.ts`. `columnKeyOf` above is "the ONE place the key
 * grammar lives" (owner Q1). A validator that re-states the grammar somewhere else is a second copy of
 * it, and the two drift — which is the whole defect Q1 was ruled to prevent. So the CRUD calls this;
 * `commands.ts` only turns the issues into a typed `CommandFailure`.
 *
 * ⚠⚠ AND WHY THE REFUSAL BELONGS TO THE COMMAND, NOT TO THE EVALUATOR. A schedule is a PROJECTION
 * (rule 17): `projectSchedule` must never refuse a builder his table because a stored definition has
 * drifted — it degrades, deliberately (`groupRows` says so in its own comment). ⇒ the door where a
 * bad definition can still be REFUSED instead of degraded is the authoring one, and there was no
 * authoring door until this entry. Measured on the body before it existed (Entry 68 probes):
 *
 *   groupBy naming a column the schedule lacks   2 groups collapse to 1, key `[""]`  — every subtotal
 *                                                becomes the grand total, silently
 *   a `quantity` key outside the grammar         every cell NaN and the TOTAL NaN — and `JSON.stringify`
 *                                                writes NaN as `null`, so it reaches a consumer as "no value"
 *   an unknown column `source`                   a raw TypeError out of the evaluator
 *   two columns sharing one key                  2 headers, ONE total entry — the second silently merges
 *
 * ⚠ The last one is `checkLayers`' rule one level up (*two layers with the same name mint byte-identical
 * refs*): when a structure is addressed by a derived key, the key must be UNIQUE or the addressing is a
 * lie. Here `row.cells.find(c => c.columnKey === key)` always finds the first, so the second column is
 * unaddressable by construction — groupable, totalable and reachable only as its twin.
 * ============================================================================================= */

/** The column sources the frozen grammar admits — the `ScheduleColumn` union's discriminants. */
const SOURCES: readonly string[] = ['field', 'param', 'quantity', 'count'];
/** The `field` column keys the frozen grammar admits (`documentation.ts` `ScheduleColumn`). */
const FIELD_KEYS: readonly string[] = ['mark', 'name', 'id', 'type', 'level'];
/** The `quantity` axes the frozen grammar admits — the `QuantityBreakdown` axes (D45). */
const QUANTITY_KEYS: readonly string[] = ['volume', 'area', 'mass'];

/**
 * Everything wrong with a definition, as human/agent-readable sentences. Empty ⇒ it is storable.
 *
 * ⚠ It validates the WHOLE definition, never the args of one edit — an update that replaces `columns`
 * can strand a `groupBy` it never mentions, and the stranded pair is only visible in the merged result.
 */
export function scheduleDefinitionIssues(definition: ScheduleDefinition): readonly string[] {
  const issues: string[] = [];

  if (definition.name.trim() === '') issues.push('a schedule needs a name');

  // ⚠ A ZERO-COLUMN SCHEDULE IS A BLANK TABLE, and it renders without complaining — the same failure
  // mode as the empty curtain-panel table D78 measured (an artifact that looks authored and says
  // nothing). It is refused at the door rather than shipped and wondered about.
  if (definition.columns.length === 0) issues.push('a schedule needs at least one column');

  const seen = new Set<string>();
  for (const column of definition.columns) {
    // ⚠ CHECKED BEFORE THE SWITCH, AND NOT INSIDE IT AS A `default`. The union makes an unknown `source`
    // impossible to TypeScript and entirely possible at runtime — a definition arrives from an agent's
    // args or a hand-edited `.bnn`, neither of which the compiler saw. (Measured: an unknown source
    // reaches `columnKeyOf` and comes back `undefined`, then dies as a raw TypeError inside the projector.)
    if (!SOURCES.includes(column.source)) {
      issues.push(`column source "${column.source}" is not one of ${SOURCES.join(', ')}`);
      continue;
    }
    switch (column.source) {
      case 'field':
        if (!FIELD_KEYS.includes(column.key)) {
          issues.push(
            `column "field:${column.key}" — a field column must be one of ${FIELD_KEYS.join(', ')}`,
          );
        }
        break;
      case 'quantity':
        if (!QUANTITY_KEYS.includes(column.key)) {
          issues.push(
            `column "quantity:${column.key}" — a quantity column must be one of ${QUANTITY_KEYS.join(', ')}`,
          );
        }
        break;
      case 'param':
        // ⚠ DELIBERATELY UNCHECKED AGAINST ANY TYPE'S SCHEMA. A `param` key names a `ParamSchema` field
        // of whatever types the filter admits, and a schedule may legitimately be authored BEFORE the
        // elements it schedules exist (that is what a template is). An empty param cell is a legible
        // "this element has no such parameter"; an unknown QUANTITY axis is not, because it produces a
        // NUMBER (NaN) rather than a blank. The line is drawn where silence stops being legible.
        if (column.key.trim() === '') issues.push('a param column needs a parameter key');
        break;
      case 'count':
        break;
    }
    const key = columnKeyOf(column);
    if (seen.has(key)) {
      issues.push(
        `two columns share the key "${key}" — a column is ADDRESSED by its key (groupBy, totals, ` +
          `every cell lookup), so the second would be unreachable and their totals would merge`,
      );
    }
    seen.add(key);
  }

  // ⚠ THE Q1 RULING, ENFORCED AT THE ONLY DOOR THAT CAN: `groupBy` names STABLE COLUMN KEYS. A key that
  // names no column of THIS schedule is not a grouping — it silently buckets every row together under
  // the empty string, and every subtotal becomes the grand total (measured: 2 groups → 1).
  for (const key of definition.groupBy ?? []) {
    if (!seen.has(key)) {
      issues.push(
        `groupBy "${key}" names no column of this schedule — groupBy names stable COLUMN KEYS ` +
          `(${[...seen].join(', ') || 'none'}), never headings`,
      );
    }
  }

  return issues;
}

/** The default display heading when a column declares none — the key's own last segment, humanised. */
function defaultHeading(column: ScheduleColumn): string {
  switch (column.source) {
    case 'field':
      return column.key;
    case 'param':
      return column.key;
    case 'quantity':
      return column.part === undefined ? column.key : `${column.key} (${column.part})`;
    case 'count':
      return 'count';
  }
}

/** ONE cell. ⚠ `value` is ABSENT when there is none — unmeasurable, unset, or N/A. NEVER zeroed (rule 15). */
export interface ScheduleCell {
  readonly columnKey: string;
  readonly value?: string | number;
  /** ⚠ Declared for every NUMERIC cell (domain rule 7). mm / mm² / mm³ / kg — the unit the number IS in. */
  readonly unit?: string;
  /**
   * ⚠⚠ THE DISTINCTION THAT MUST NOT BE LOST: `true` ⇒ this element HAS this quantity and it could not be
   * resolved (an unresolvable density). Absent-with-no-flag ⇒ there is **nothing to measure** — a pure
   * void or a pure composite has no quantity **by construction**, which is not an unknown.
   *
   * Conflating the two is D72's `exposedRefs: [] vs absent` defect by a new road, and it bites in BOTH
   * directions: treat "nothing to measure" as unknown and every total goes absent the moment a curtain
   * wall enters the model; treat "could not resolve" as nothing and a partial sum ships wearing `exact`.
   * A renderer needs the same distinction — "—" is not "N/A".
   */
  readonly unknown?: true;
}

/** ONE row — one REAL element of the model (authored row or D59 generated child; `enumerate.ts` decides). */
export interface ScheduleRow {
  readonly elementId: ElementId;
  readonly rootId: ElementId;
  /** `true` ⇒ a generated child (D59). A first-class row with its own PEI, simply not a scene row. */
  readonly derived: boolean;
  readonly cells: readonly ScheduleCell[];
}

/**
 * A totalled numeric column. ⚠ `value` is ABSENT when ANY contributing cell was — the `QuantityTotal`
 * rule one level down: a partial sum wearing `basis: 'exact'` is domain rule 15's failure as an aggregate.
 */
export interface ScheduleTotal {
  readonly value?: number;
  readonly unit?: string;
  /** How many rows contributed a value. */
  readonly rows: number;
}

/** A `groupBy` bucket. Subtotals derive per numeric column exactly as the grand totals do. */
export interface ScheduleGroup {
  /** The group's values, in `groupBy` order — rendered from the cells, keyed by the STABLE column key. */
  readonly key: readonly string[];
  readonly rows: readonly ScheduleRow[];
  readonly subtotals: ReadonlyMap<string, ScheduleTotal>;
}

export interface ScheduleColumnHeader {
  readonly key: string;
  readonly heading: string;
  readonly unit?: string;
}

export interface ScheduleResult {
  readonly scheduleId: ScheduleId;
  readonly columns: readonly ScheduleColumnHeader[];
  readonly rows: readonly ScheduleRow[];
  /** Present iff the definition declares `groupBy`. */
  readonly groups?: readonly ScheduleGroup[];
  readonly totals: ReadonlyMap<string, ScheduleTotal>;
  /**
   * ⚠⚠ Every selected element that could not be measured — BESIDE the rows, never instead of them (D75).
   * The element keeps its row with the value absent; dropping it would make the table plausible and
   * short, which is exactly what nobody audits.
   */
  readonly unmeasured: readonly UnmeasuredElement[];
  /** ⚠ `exact`, always — and it stays honest precisely because `unmeasured` sits beside it (rule 15). */
  readonly basis: 'exact';
}

/**
 * WHICH elements are rows — the filter, over FROZEN stable keys, AND-combined.
 *
 * ⚠ Pure and kernel-free. It filters the ALREADY-enumerated real elements; it does not enumerate. Every
 * field binds to a key that is frozen and stable across an edit (`P5_step5A…_design.md` §4's table).
 */
export function selectRows(
  elements: readonly ModelElement[],
  filter: ScheduleFilter,
): readonly ModelElement[] {
  return elements.filter((element) => {
    if (filter.typeId !== undefined && element.typeId !== filter.typeId) return false;
    if (filter.ifcClass !== undefined && element.classification?.ifcClass !== filter.ifcClass) {
      return false;
    }
    if (
      filter.loadBearing !== undefined &&
      (element.classification?.loadBearing ?? false) !== filter.loadBearing
    ) {
      return false;
    }
    // ⚠ A container filter is a SUBTREE test, not an equality — "on Level 2" must include a wall placed
    // in a Space on Level 2, and it must reach a D59 child, which inherits its root's container.
    if (filter.containerId !== undefined && !element.containerPath.includes(filter.containerId)) {
      return false;
    }
    return true;
  });
}

/** What the evaluator needs from the document to answer a cell. Injected, so this module stays pure. */
export interface ScheduleSources {
  readonly scene: Scene;
  /** The element's measured parts, or `undefined` when it has none / could not be measured. */
  readonly quantitiesOf: (id: ElementId) => QuantityBreakdown | undefined;
  /** The Type's `parameterSchema`, for reading a `param` column's declared UNIT (rule 7). */
  readonly schemaOf: (typeId: string) => ParamSchema | undefined;
}

/** The nearest ancestor container of `kind: 'level'` — what a `field: 'level'` column means. */
function levelNameOf(scene: Scene, element: ModelElement): string | undefined {
  for (let i = element.containerPath.length - 1; i >= 0; i -= 1) {
    const container = scene.containers[element.containerPath[i]!];
    if (container?.kind === 'level') return container.name;
  }
  return undefined;
}

/** Sums one `quantity` column over an element's parts, optionally scoped to one part name. */
function quantityCell(
  element: ModelElement,
  column: Extract<ScheduleColumn, { source: 'quantity' }>,
  sources: ScheduleSources,
): ScheduleCell {
  const key = columnKeyOf(column);
  const unit = QUANTITY_UNITS[column.key];
  const breakdown = sources.quantitiesOf(element.id);
  // ⚠ No breakdown ⇒ NO VALUE, never 0. Two populations reach here and both are legitimate: an element
  // with no own parts (a pure void, a pure composite) and one that could not be measured (reported in
  // `unmeasured` by the caller). Neither is a quantity of zero.
  if (breakdown === undefined) return { columnKey: key, unit };
  const parts =
    column.part === undefined
      ? breakdown.parts
      : breakdown.parts.filter((p) => p.name === column.part);
  if (parts.length === 0) return { columnKey: key, unit };

  const measure = column.key;
  if (measure === 'mass') {
    // ⚠⚠ ABSENT rather than PARTIAL, and flagged UNKNOWN. A single unresolvable density makes the whole
    // sum unknown — the `QuantityTotal` rule (D45, rule 15): a partial sum is an under-count wearing
    // `exact`. ⚠ The flag is what separates this from the no-parts case above, which is not an unknown.
    let mass = 0;
    for (const part of parts) {
      if (part.mass === undefined) return { columnKey: key, unit, unknown: true };
      mass += part.mass;
    }
    return { columnKey: key, value: mass, unit };
  }
  const value = parts.reduce((sum, part) => sum + part[measure], 0);
  return { columnKey: key, value, unit };
}

/** Projects ONE element onto ONE column. ⚠ Absent value ≠ zero, everywhere in here. */
function cellFor(
  element: ModelElement,
  column: ScheduleColumn,
  sources: ScheduleSources,
  rowCount: number,
): ScheduleCell {
  const key = columnKeyOf(column);
  switch (column.source) {
    case 'field': {
      switch (column.key) {
        case 'mark':
          // ⚠ Absent for a generated child, structurally — a mark is AUTHORED and a D59 child is not a
          // scene row. `ChildOverride.mark?` is the reserved home (owner Q3); nothing reads it in v1.0.0.
          return element.mark === undefined
            ? { columnKey: key }
            : { columnKey: key, value: element.mark };
        case 'name':
          return element.name === undefined
            ? { columnKey: key }
            : { columnKey: key, value: element.name };
        case 'id':
          // ⚠ The PEI. Opaque by D44 — kept because it is the stable key an AGENT or an export binds a
          // row to (the D19/D22 audience), and the column is opt-in. A human-facing schedule uses
          // `mark`/`name`; this is recorded in `P5_step6B_schedules_design.md` §6.4, not re-litigated.
          return { columnKey: key, value: element.id };
        case 'type':
          // ⚠ The registered contract id, never a display label — rule 12's discipline on a schedule.
          return { columnKey: key, value: element.typeId };
        case 'level': {
          const level = levelNameOf(sources.scene, element);
          return level === undefined ? { columnKey: key } : { columnKey: key, value: level };
        }
      }
      // Unreachable while `field` keys are exhaustive above; a future key lands here as an empty cell
      // rather than a crash — a schedule is a projection, and an unknown column is a display gap.
      return { columnKey: key };
    }
    case 'param': {
      const value = element.params[column.key];
      // ⚠ THE UNIT IS READ OFF THE `ParamField`, never guessed (rule 7). A param's unit is its own
      // declaration — `tests/units-rule7.test.ts` is what makes that declaration reliable.
      const unit = sources.schemaOf(element.typeId)?.[column.key]?.unit;
      if (typeof value !== 'number' && typeof value !== 'string') return { columnKey: key };
      return {
        columnKey: key,
        value,
        ...(typeof value === 'number' && unit !== undefined ? { unit } : {}),
      };
    }
    case 'quantity':
      return quantityCell(element, column, sources);
    case 'count':
      // ⚠ No unit — a count is DIMENSIONLESS, which is rule 7's named exemption, not an omission.
      return { columnKey: key, value: rowCount };
  }
}

/**
 * Totals one numeric column over a set of rows. ⚠⚠ It MIRRORS `QuantityTotal` (`enumerate.ts`) exactly,
 * because three products already bind to that semantic and a schedule must not invent a second one:
 *
 *  - **`volume`/`area`: sum what is there.** An absent cell is reported in `unmeasured` BESIDE the total,
 *    which is the mechanism that keeps `basis: 'exact'` honest (`ProjectQuantities`' own contract). It is
 *    also the only correct reading, because most absent cells are not unknowns at all: a pure void and a
 *    pure composite have **no quantity by construction**, and treating "nothing to measure" as "could not
 *    measure" would make every total in the product absent the moment a curtain wall is in the model.
 *    *(That conflation is D72's `exposedRefs: [] vs absent` defect by a new road, and it was caught here
 *    by a total coming back `undefined` where 250,320,000 mm³ is right.)*
 *  - **`mass`: ABSENT if ANY contributing row's mass is absent.** Never a partial sum — the established
 *    `QuantityTotal.mass` rule (D45, rule 15). A missing density is a genuine unknown, not a nought, and
 *    an under-count wearing `exact` is the defect this whole family of rules exists to prevent.
 */
function totalOf(rows: readonly ScheduleRow[], header: ScheduleColumnHeader): ScheduleTotal {
  let sum = 0;
  let contributed = 0;
  let known = true;
  for (const row of rows) {
    const cell = row.cells.find((c) => c.columnKey === header.key);
    if (cell === undefined) continue;
    if (typeof cell.value !== 'number') {
      // ⚠ Only a cell that is genuinely UNKNOWN poisons the sum. A cell that is simply not applicable
      // (no parts to measure) contributes nothing and takes nothing away — see `ScheduleCell.unknown`.
      if (cell.unknown === true) known = false;
      continue;
    }
    sum += cell.value;
    contributed += 1;
  }
  return {
    ...(known ? { value: sum } : {}),
    ...(header.unit === undefined ? {} : { unit: header.unit }),
    rows: contributed,
  };
}

function totalsOver(
  rows: readonly ScheduleRow[],
  columns: readonly ScheduleColumnHeader[],
  numeric: ReadonlySet<string>,
): ReadonlyMap<string, ScheduleTotal> {
  const out = new Map<string, ScheduleTotal>();
  for (const header of columns) {
    if (!numeric.has(header.key)) continue;
    out.set(header.key, totalOf(rows, header));
  }
  return out;
}

/**
 * ⚠⚠ THE EVALUATION. `modelElements()` → filter → project each element onto columns.
 *
 * Pure and synchronous: every measurement it needs has already been taken by the caller
 * (`DocumentContext.evaluateSchedule` measures, this projects). That split is what lets a schedule with
 * no `quantity` column cost ZERO kernel calls — a 400-door schedule of marks and types is free.
 */
export function projectSchedule(
  definition: ScheduleDefinition,
  rows: readonly ModelElement[],
  sources: ScheduleSources,
  unmeasured: readonly UnmeasuredElement[],
): ScheduleResult {
  const columns: ScheduleColumnHeader[] = definition.columns.map((column) => {
    const key = columnKeyOf(column);
    const unit =
      column.source === 'quantity'
        ? QUANTITY_UNITS[column.key]
        : column.source === 'param'
          ? undefined // resolved per row — one param key may be declared by several Types
          : undefined;
    return {
      key,
      heading: column.heading ?? defaultHeading(column),
      ...(unit === undefined ? {} : { unit }),
    };
  });

  const built: ScheduleRow[] = rows.map((element) => ({
    elementId: element.id,
    rootId: element.rootId,
    derived: element.derived,
    cells: definition.columns.map((column) => cellFor(element, column, sources, rows.length)),
  }));

  // A `param` column's unit is per-Type, so the HEADER's unit is the one every row agreed on (and is
  // absent when they did not) — a header that claims mm over a column of mixed units would be rule 7's
  // failure dressed as compliance.
  const headers: ScheduleColumnHeader[] = columns.map((header) => {
    if (header.unit !== undefined) return header;
    const units = new Set(
      built.map((row) => row.cells.find((c) => c.columnKey === header.key)?.unit),
    );
    units.delete(undefined);
    return units.size === 1 ? { ...header, unit: [...units][0]! } : header;
  });

  // ⚠⚠ A COLUMN IS NUMERIC BY ITS DECLARED SOURCE, NOT BY WHETHER ANY ROW HAPPENED TO PRODUCE A NUMBER.
  // A `quantity` column is numeric by definition — so a column whose every cell is UNKNOWN still gets a
  // total entry, whose `value` is absent. Deriving numeric-ness from the rows instead meant such a column
  // got NO entry at all, and `totals.get(key) === undefined` then reads as *"there is no such column"*
  // rather than *"the answer is unknown"* — domain rule 14's shape (silence that a consumer reads as a
  // fact), caught here by a mass total that vanished instead of reporting itself unresolvable.
  // ⚠ `count` is excluded: it is the row count repeated on every row, so a "total" of it is a meaningless
  // number — and a meaningless number in a totals row is exactly what a builder would act on.
  const numeric = new Set(
    definition.columns
      .filter(
        (column) =>
          column.source === 'quantity' ||
          (column.source === 'param' &&
            built.some(
              (row) =>
                typeof row.cells.find((c) => c.columnKey === columnKeyOf(column))?.value ===
                'number',
            )),
      )
      .map((column) => columnKeyOf(column)),
  );

  const groups =
    definition.groupBy === undefined
      ? undefined
      : groupRows(built, definition.groupBy, headers, numeric);

  return {
    scheduleId: definition.id,
    columns: headers,
    rows: built,
    ...(groups === undefined ? {} : { groups }),
    totals: totalsOver(built, headers, numeric),
    unmeasured,
    basis: 'exact',
  };
}

/** Buckets rows by the values of the columns `groupBy` NAMES BY STABLE KEY (owner Q1). */
function groupRows(
  rows: readonly ScheduleRow[],
  groupBy: readonly string[],
  columns: readonly ScheduleColumnHeader[],
  numeric: ReadonlySet<string>,
): readonly ScheduleGroup[] {
  const buckets = new Map<string, { key: string[]; rows: ScheduleRow[] }>();
  for (const row of rows) {
    // ⚠ `groupBy` entries are COLUMN KEYS. An entry naming no column of this schedule contributes an
    // empty component rather than throwing: a schedule is a projection, and a stale grouping key is a
    // display defect, not a reason to refuse a builder his table.
    const key = groupBy.map((columnKey) => {
      const cell = row.cells.find((c) => c.columnKey === columnKey);
      return cell?.value === undefined ? '' : String(cell.value);
    });
    const id = key.join('\u0000');
    const bucket = buckets.get(id);
    if (bucket === undefined) buckets.set(id, { key, rows: [row] });
    else bucket.rows.push(row);
  }
  return [...buckets.values()].map((bucket) => ({
    key: bucket.key,
    rows: bucket.rows,
    subtotals: totalsOver(bucket.rows, columns, numeric),
  }));
}
