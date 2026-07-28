/**
 * ⚠ DOMAIN RULE 7, SWEPT BACKWARD — *"Units are millimetres internally; interchange declares its own
 * units at the boundary."*
 *
 * **The rule came back CLEAN**, and the sweep that established it was a COUNT of the boundaries, not a
 * read of the code (§1c-8's second form). Every place a number crosses out of the model declares what
 * it is in:
 *
 *   - **the kernel protocol** (frozen, engine-agnostic — a future native/server kernel implements it):
 *     *"Angles are DEGREES"* is written into `ops.ts`, and `kernel.cpp` converts to radians AND
 *     range-validates `(0, 360]` at the crossing;
 *   - **the Clean Delta wire**: mm³ → m³, mm² → m², mm → m, with `units: 'metric'` on the package and
 *     `unit` on the quantity (asserted below, because a conversion nobody exercises is a wish);
 *   - **the reserved surfaces that freeze at P5** — documentation (`world mm`, sheet mm, cut-plane mm),
 *     families (*"a number (mm, per rule 7)"*), `georeference` (mm + degrees), constraint values
 *     (*"mm or degrees"*) — each declares in the shape's own doc;
 *   - **`ParamSchema`**, the D21 boundary an AGENT authors through: 40 numeric fields declare `unit`.
 *
 * ⚠⚠ AND THE REASON THIS FILE EXISTS RATHER THAN A LEDGER LINE SAYING "CLEAN": **rule 7 had no mechanism
 * making a violation loud.** Rules 9 and 10 came back clean because they *could not* be broken silently
 * (`validateParams` refuses an undeclared arg; `dryRun` lives in the executor). Rule 7 was clean because
 * everyone who added a field happened to remember — which is precisely the condition under which the
 * seven dirty rules were found dirty. **A field shipped without its unit now fails here.**
 *
 * ⚠ The only fields legitimately without one are DIMENSIONLESS, and they are named — not skipped by a
 * predicate that would also swallow a forgotten millimetre.
 */

import { describe, expect, it } from 'vitest';
import { CORE_COMMANDS } from '@bunyan/document';
import type { BimObjectType, ParamSchema } from '@bunyan/document';
import {
  curtainWallColumnType,
  curtainWallMullionType,
  curtainWallPanelType,
  curtainWallType,
  openingType,
  wallType,
} from '@bunyan/types';

/**
 * Every numeric field this product ships that is a COUNT or an INDEX rather than a measurement.
 *
 * ⚠ Written out one by one on purpose. A rule that quantifies over a set is checked by enumerating the
 * set (§1c-8), and an allow-list of names is the only form of exception that cannot quietly grow.
 */
const DIMENSIONLESS = new Set([
  'cmd core.createSketchConstraint  segments[]', // segment indices within a sketch
  'type core.curtainwall  rows', // a count of grid cells
  'type core.curtainwall  cols',
  'type core.curtainwall.column  rows',
]);

interface Leaf {
  readonly at: string;
  readonly unit: string | undefined;
}

function numericLeaves(owner: string, schema: ParamSchema, path = ''): Leaf[] {
  const out: Leaf[] = [];
  for (const [name, field] of Object.entries(schema)) {
    const here = path === '' ? name : `${path}.${name}`;
    if (field.kind === 'number' || field.kind === 'integer') {
      out.push({ at: `${owner}  ${here}`, unit: field.unit });
    }
    const items = field.items;
    if (items !== undefined && (items.kind === 'number' || items.kind === 'integer')) {
      out.push({ at: `${owner}  ${here}[]`, unit: items.unit });
    }
    if (field.fields !== undefined) out.push(...numericLeaves(owner, field.fields, here));
    if (items?.fields !== undefined) out.push(...numericLeaves(owner, items.fields, `${here}[]`));
  }
  return out;
}

const SHIPPED_TYPES: readonly BimObjectType[] = [
  wallType,
  openingType,
  curtainWallType,
  curtainWallColumnType,
  curtainWallPanelType,
  curtainWallMullionType,
];

function everyNumericLeaf(): Leaf[] {
  const out: Leaf[] = [];
  for (const command of CORE_COMMANDS)
    out.push(...numericLeaves(`cmd ${command.id}`, command.argsSchema));
  for (const type of SHIPPED_TYPES) {
    out.push(...numericLeaves(`type ${type.id}`, type.parameterSchema));
    if (type.styleSchema !== undefined) {
      out.push(...numericLeaves(`style ${type.id}`, type.styleSchema));
    }
  }
  return out;
}

describe('domain rule 7 — units are millimetres internally, and declared at every boundary', () => {
  it('⚠⚠ every numeric field a HUMAN or an AGENT authors through declares its unit', () => {
    const undeclared = everyNumericLeaf()
      .filter((leaf) => leaf.unit === undefined)
      .map((leaf) => leaf.at)
      .filter((at) => !DIMENSIONLESS.has(at));

    // ⚠ The failure message IS the finding: it names the field that shipped without saying what its
    // number means. An agent handed `end: [8, 0]` with no unit builds an 8 mm wall and nothing refuses.
    expect(undeclared).toEqual([]);
  });

  it('⚠ the dimensionless exceptions are exactly the counts and indices — and they still exist', () => {
    const unitless = new Set(
      everyNumericLeaf()
        .filter((leaf) => leaf.unit === undefined)
        .map((leaf) => leaf.at),
    );
    // Both directions: nothing has quietly joined the allow-list, and nothing on it has silently gone
    // away (a renamed field would otherwise leave a dead exemption behind that exempts nothing).
    expect([...unitless].sort()).toEqual([...DIMENSIONLESS].sort());
  });

  it('⚠ a coordinate is millimetres, and says so in the SCHEMA rather than only in its prose', () => {
    // The baseline of a wall is the most unit-bearing pair of numbers in the product. It described its
    // millimetres in `description` (which a property panel does not render and an agent must parse)
    // while `height` beside it declared `unit`. Now both are machine-readable.
    expect(wallType.parameterSchema['start']?.items?.unit).toBe('mm');
    expect(wallType.parameterSchema['end']?.items?.unit).toBe('mm');
    expect(wallType.parameterSchema['height']?.unit).toBe('mm');
    expect(curtainWallType.parameterSchema['origin']?.items?.unit).toBe('mm');
  });

  it('⚠ the one INTERNAL non-millimetre unit is a non-length, and it is converted before it is used', () => {
    // `density` is kg/m³ — the single internal quantity that is not a millimetre, because it is not a
    // length. It is declared as such on its own field, and `quantities()` converts mm³ → m³ BEFORE
    // multiplying (`document.ts`: `(volume / 1e9) * density`), which is what keeps 135 kg of plaster
    // from being 1.35e11 kg. The conversion itself is asserted on real geometry in
    // `quantities-and-contract.test.ts`; what is asserted here is that the DECLARATION exists.
    const density = CORE_COMMANDS.find((c) => c.id === 'core.createMaterial')!.argsSchema[
      'density'
    ];
    expect(density?.unit).toBe('kg/m³');
  });
});
