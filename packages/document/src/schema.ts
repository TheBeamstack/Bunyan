/**
 * `ParamSchema` — the one schema language, and it has THREE consumers (decision D21).
 *
 * ⚠⚠ THIS IS THE FILE THAT MAKES THE AGENT SURFACE GENERATED RATHER THAN MAINTAINED, and that is not
 * a nicety — it is the whole of D21. A `BimObjectType` carries a `parameterSchema`; a `Command`
 * carries an `argsSchema`; and from those two facts you get, for free and without a second source of
 * truth:
 *
 *     the PROPERTY PANEL   (what fields does this wall have?)
 *     the RIBBON           (what can I do, and what does it need?)
 *     the AGENT TOOL LIST  (the same question, asked by a machine)
 *
 * **A hand-written agent doc would drift within weeks. A generated one CANNOT.** An agent therefore
 * needs no external documentation — it asks the app (`listCommands()`), and the answer is derived
 * from the registry that actually governs the behaviour.
 *
 * Deliberately a SMALL language, not JSON Schema: it must be renderable as a form, describable as an
 * agent tool, and validatable — and the subset that does all three is this one. Anything richer buys
 * expressiveness the property panel cannot draw.
 */

import type { ParamValue } from './entities.js';

export type ParamKind =
  | 'number'
  | 'integer'
  | 'string'
  | 'boolean'
  | 'enum'
  /** A reference to another entity — an element, a material, a section, a style, a container. */
  | 'ref'
  /** A `[x, y, z]` point in millimetres. */
  | 'point'
  /** A `SubShapeRef` token — a face or edge identity (D1). */
  | 'subShapeRef'
  | 'object'
  | 'array';

export interface ParamField {
  readonly kind: ParamKind;
  /** Human-facing. Also what an agent reads to decide whether this is the field it wants. */
  readonly label: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly default?: ParamValue;
  /** mm, mm², degrees, … — the unit the number is IN. Bunyan authors in millimetres (domain rule 7). */
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  /** For `enum`. */
  readonly options?: readonly string[];
  /**
   * For `ref`: which registry/collection the id must exist in. Validated, not assumed.
   *
   * ⚠ A STRING UNION THAT GROWS BY ADDING A MEMBER, never by editing one (the D53 discipline). It is
   * declarative metadata — it drives a future UI picker and the generated agent tool-list; **no body
   * switches on it today**, so a new member breaks nothing.
   *
   * ⚠ `'system'`/`'designOption'` were added by ROW Ⓕ (2026-07-24, D62/D65) *pre-freeze and deliberately*:
   * `createElement` reserves `systemId`/`designOptionId` args, and typing them as bare strings would have
   * forced whoever builds MEP/Design-Options to widen this union later — i.e. amend a frozen contract, which
   * is the exact ⓣ trap 0g.2 hit. Free now; an amendment after step 6.
   */
  readonly refTo?:
    'element' | 'material' | 'section' | 'style' | 'container' | 'grid' | 'system' | 'designOption';
  /** For `array`: the shape of each item. For `object`: the shape of its fields. */
  readonly items?: ParamField;
  readonly fields?: ParamSchema;
  /**
   * ⚠ RESERVED (D54c, Freeze-Gate ⑤). Conditional visibility — show this field only when a sibling field's
   * value matches (Revit's family "conditional" fields). Absent ⇒ always shown, so every existing schema is
   * unaffected. Evaluated by the property panel / agent tool projection in a later phase; 0g reserves the shape.
   */
  readonly relevantWhen?: ParamCondition;
  /**
   * ⚠ RESERVED (Freeze-Gate ⓜ). A Revit-style family FORMULA — an expression over sibling params that
   * computes this field's value (the field is then driven, read-only in the UI). Absent ⇒ author-entered.
   * The expression grammar + evaluator are a later phase; the STRING slot freezes now.
   */
  readonly formula?: string;
}

/**
 * ⚠ RESERVED (D54c). A predicate over another field's value, for `ParamField.relevantWhen`. A shaped
 * record so richer operators (`in`, `notEquals`, ranges) are additive members later, never edits — the
 * same discipline that shapes `ConstraintTarget`.
 */
export interface ParamCondition {
  /** The sibling field this visibility depends on. */
  readonly field: string;
  /** Shown when the sibling equals this value. (Future: `in`, `notEquals` — additive.) */
  readonly equals: ParamValue;
}

export type ParamSchema = Readonly<Record<string, ParamField>>;

export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

/**
 * Validate a value bag against a schema. Returns issues rather than throwing: a command's failure is
 * a typed, reportable thing (spec §6.4 — "reject + keep last-good"), not an exception that unwinds
 * the document into an undefined state.
 *
 * ⚠ It does NOT check that a `ref` actually exists — that needs the document, and it happens in the
 * command layer where the document is in scope. This is the *shape* gate; that is the *identity* gate.
 */
export function validateParams(schema: ParamSchema, value: Params): readonly ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  validateInto(schema, value, '', issues);
  return issues;
}

type Params = Readonly<Record<string, ParamValue>>;

function validateInto(
  schema: ParamSchema,
  value: Params,
  prefix: string,
  issues: ValidationIssue[],
): void {
  for (const [name, field] of Object.entries(schema)) {
    const path = prefix === '' ? name : `${prefix}.${name}`;
    const present = Object.prototype.hasOwnProperty.call(value, name);
    const raw = present ? value[name] : field.default;

    if (raw === undefined || raw === null) {
      if (field.required === true) issues.push({ path, message: `"${path}" is required` });
      continue;
    }
    checkField(field, raw, path, issues);
  }

  for (const name of Object.keys(value)) {
    if (!Object.prototype.hasOwnProperty.call(schema, name)) {
      const path = prefix === '' ? name : `${prefix}.${name}`;
      issues.push({ path, message: `"${path}" is not a parameter of this schema` });
    }
  }
}

function checkField(
  field: ParamField,
  raw: ParamValue,
  path: string,
  issues: ValidationIssue[],
): void {
  const wrongType = (want: string): void => {
    issues.push({ path, message: `"${path}" must be ${want}, got ${typeof raw}` });
  };

  switch (field.kind) {
    case 'number':
    case 'integer': {
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        wrongType('a finite number');
        return;
      }
      if (field.kind === 'integer' && !Number.isInteger(raw)) {
        issues.push({ path, message: `"${path}" must be an integer, got ${raw}` });
      }
      if (field.min !== undefined && raw < field.min) {
        issues.push({ path, message: `"${path}" must be >= ${field.min}, got ${raw}` });
      }
      if (field.max !== undefined && raw > field.max) {
        issues.push({ path, message: `"${path}" must be <= ${field.max}, got ${raw}` });
      }
      return;
    }
    case 'string':
    case 'subShapeRef':
    case 'ref': {
      if (typeof raw !== 'string') wrongType('a string');
      return;
    }
    case 'boolean': {
      if (typeof raw !== 'boolean') wrongType('a boolean');
      return;
    }
    case 'enum': {
      if (typeof raw !== 'string' || !(field.options ?? []).includes(raw)) {
        issues.push({
          path,
          message: `"${path}" must be one of ${(field.options ?? []).join(', ')}`,
        });
      }
      return;
    }
    case 'point': {
      if (!Array.isArray(raw) || raw.length !== 3 || raw.some((n) => typeof n !== 'number')) {
        issues.push({ path, message: `"${path}" must be a [x, y, z] point in mm` });
      }
      return;
    }
    case 'array': {
      if (!Array.isArray(raw)) {
        wrongType('an array');
        return;
      }
      const items = field.items;
      if (items === undefined) return;
      (raw as readonly ParamValue[]).forEach((item, i) => {
        checkField(items, item, `${path}[${i}]`, issues);
      });
      return;
    }
    case 'object': {
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        wrongType('an object');
        return;
      }
      const fields = field.fields;
      if (fields === undefined) return;
      validateInto(fields, raw as Params, path, issues);
      return;
    }
  }
}

/**
 * Fill a value bag with the schema's declared defaults. This is what lets an agent call
 * `createElement('core.wall.v1', { start, end })` and get a wall — rather than having to know, and
 * restate, every parameter the type happens to have (D20).
 */
export function withDefaults(schema: ParamSchema, value: Params): Params {
  const out: Record<string, ParamValue> = { ...value };
  for (const [name, field] of Object.entries(schema)) {
    if (out[name] === undefined && field.default !== undefined) out[name] = field.default;
  }
  return out;
}
