/**
 * `SchemaForm` — a `ParamSchema` rendered as a form. **This is D21 made visible.**
 *
 * ⚠⚠ THE POINT: the property panel and the ribbon's command dialog are the SAME component. A property
 * panel is this form over a Type's `parameterSchema`; a command dialog is this form over a Command's
 * `argsSchema`. Both schemas are the one small language in `@bunyan/document/schema.ts`, so a newly
 * registered type or command gets an editing UI for FREE — nothing here is written per-type or
 * per-command. A hand-authored form per type would drift within weeks; a derived one cannot (the same
 * reason the agent tool list is generated from these very schemas).
 *
 * It is a controlled component: it renders `value` and reports edits through `onEdit`. It never holds
 * the authoritative value (the exception is object/array JSON, where a transiently-invalid draft has
 * to live somewhere while the user types) — the parent owns it and decides whether an edit dispatches
 * live (the panel) or waits for a submit (the dialog).
 */

import { useState } from 'react';

import type { ParamField, ParamSchema, ParamValue, Params } from '@bunyan/document';

/** `live: true` marks a continuous edit — a slider drag — that should coalesce at the kernel (D23). */
export interface EditMeta {
  readonly live: boolean;
}

/**
 * Set (or, when `value` is `undefined`, clear) one field of a params bag, immutably and without a
 * dynamic `delete`. The shared way both consumers fold an edit into their draft.
 */
export function setField(bag: Params, field: string, value: ParamValue | undefined): Params {
  const next: Record<string, ParamValue> = {};
  for (const [key, existing] of Object.entries(bag)) {
    if (key !== field) next[key] = existing;
  }
  if (value !== undefined) next[field] = value;
  return next;
}

export interface SchemaFormProps {
  readonly schema: ParamSchema;
  readonly value: Params;
  readonly disabled?: boolean;
  /** A field changed. `next` is `undefined` when the user cleared an optional field. */
  readonly onEdit: (field: string, next: ParamValue | undefined, meta: EditMeta) => void;
  /** Namespaces `<label htmlFor>`/`id` pairs so two forms on one page do not collide. */
  readonly idPrefix?: string;
}

export function SchemaForm({ schema, value, disabled, onEdit, idPrefix = 'f' }: SchemaFormProps) {
  const entries = Object.entries(schema);
  if (entries.length === 0) {
    return <p className="form-empty">This schema has no fields.</p>;
  }
  return (
    <div className="schema-form">
      {entries.map(([name, field]) => (
        <FieldRow
          key={name}
          id={`${idPrefix}-${name}`}
          name={name}
          field={field}
          value={value[name]}
          disabled={disabled ?? false}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}

interface FieldRowProps {
  readonly id: string;
  readonly name: string;
  readonly field: ParamField;
  readonly value: ParamValue | undefined;
  readonly disabled: boolean;
  readonly onEdit: (field: string, next: ParamValue | undefined, meta: EditMeta) => void;
}

function FieldRow({ id, name, field, value, disabled, onEdit }: FieldRowProps) {
  const required = field.required === true;
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">
        {field.label}
        {field.unit !== undefined && <span className="field-unit"> ({field.unit})</span>}
        {required && <span className="field-required"> *</span>}
      </span>
      <Control
        id={id}
        name={name}
        field={field}
        value={value}
        disabled={disabled}
        onEdit={onEdit}
      />
      {field.description !== undefined && <span className="field-desc">{field.description}</span>}
    </label>
  );
}

function Control(props: FieldRowProps) {
  const { id, name, field, value, disabled, onEdit } = props;
  const emit = (next: ParamValue | undefined, live = false): void => {
    onEdit(name, next, { live });
  };

  switch (field.kind) {
    case 'number':
    case 'integer':
      return <NumberControl id={id} field={field} value={value} disabled={disabled} emit={emit} />;

    case 'boolean':
      return (
        <span className="field-control">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(e) => {
              emit(e.target.checked);
            }}
          />
        </span>
      );

    case 'enum':
      return (
        <span className="field-control">
          <select
            id={id}
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            onChange={(e) => {
              emit(e.target.value === '' ? undefined : e.target.value);
            }}
          >
            <option value="">{field.required === true ? '— choose —' : '— none —'}</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </span>
      );

    case 'point':
      return <PointControl id={id} value={value} disabled={disabled} emit={emit} />;

    case 'object':
    case 'array':
      return <JsonControl id={id} value={value} disabled={disabled} emit={emit} />;

    // string, ref, subShapeRef — all edited as text. A `ref`/`subShapeRef` is an id/token string; the
    // command layer validates that it actually resolves (the shape gate here, the identity gate there).
    default:
      return (
        <span className="field-control">
          <input
            id={id}
            type="text"
            value={typeof value === 'string' ? value : ''}
            placeholder={field.refTo !== undefined ? `${field.refTo} id` : ''}
            disabled={disabled}
            onChange={(e) => {
              emit(e.target.value === '' ? undefined : e.target.value);
            }}
          />
        </span>
      );
  }
}

interface ControlProps {
  readonly id: string;
  readonly value: ParamValue | undefined;
  readonly disabled: boolean;
  readonly emit: (next: ParamValue | undefined, live?: boolean) => void;
}

function NumberControl({
  id,
  field,
  value,
  disabled,
  emit,
}: ControlProps & { readonly field: ParamField }) {
  const num = typeof value === 'number' ? value : undefined;
  const { min, max } = field;
  const numberStep = field.kind === 'integer' ? 1 : 'any';

  // ⚠ A bounded number gets a slider, and dragging it is the LIVE path — every frame coalesces at the
  // kernel (D23). An unbounded number is typed; the runner still collapses bursts. `min`/`max` narrow
  // to `number` only inside this guard, which is why the slider is built here rather than inline.
  let slider = null;
  if (min !== undefined && max !== undefined) {
    const rangeStep = field.kind === 'integer' ? 1 : (max - min) / 500 || 'any';
    slider = (
      <input
        type="range"
        min={min}
        max={max}
        step={rangeStep}
        value={num ?? min}
        disabled={disabled}
        onChange={(e) => {
          emit(Number(e.target.value), true);
        }}
      />
    );
  }

  return (
    <span className="field-control field-number">
      {slider}
      <input
        id={id}
        type="number"
        inputMode={field.kind === 'integer' ? 'numeric' : 'decimal'}
        min={min}
        max={max}
        step={numberStep}
        value={num ?? ''}
        disabled={disabled}
        onChange={(e) => {
          emit(e.target.value === '' ? undefined : Number(e.target.value));
        }}
      />
    </span>
  );
}

function PointControl({ id, value, disabled, emit }: ControlProps) {
  const point =
    Array.isArray(value) && value.length === 3 ? (value as readonly number[]) : [0, 0, 0];
  const setAxis = (axis: number, raw: string): void => {
    const next = [...point];
    next[axis] = raw === '' ? 0 : Number(raw);
    emit(next);
  };
  return (
    <span className="field-control field-point">
      {(['x', 'y', 'z'] as const).map((axis, i) => (
        <input
          key={axis}
          id={i === 0 ? id : undefined}
          type="number"
          aria-label={axis}
          value={point[i] ?? 0}
          disabled={disabled}
          onChange={(e) => {
            setAxis(i, e.target.value);
          }}
        />
      ))}
    </span>
  );
}

/**
 * Object / array fields — edited as JSON. These are the compound args a command takes (`params`,
 * `layers`, `placement`); the property panel rarely shows one, but the ribbon dialog needs them. The
 * raw text lives here because a half-typed `{` is not a valid `ParamValue` and cannot round-trip
 * through the controlled `value` — we only emit up once it parses, and show the parse error until then.
 */
function JsonControl({ id, value, disabled, emit }: ControlProps) {
  const [text, setText] = useState(() =>
    value === undefined ? '' : JSON.stringify(value, null, 2),
  );
  const [error, setError] = useState<string | null>(null);

  const onChange = (raw: string): void => {
    setText(raw);
    if (raw.trim() === '') {
      setError(null);
      emit(undefined);
      return;
    }
    try {
      emit(JSON.parse(raw) as ParamValue);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'invalid JSON');
    }
  };

  return (
    <span className="field-control field-json">
      <textarea
        id={id}
        rows={4}
        spellCheck={false}
        value={text}
        placeholder="JSON"
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
      {error !== null && <span className="field-error">{error}</span>}
    </span>
  );
}
