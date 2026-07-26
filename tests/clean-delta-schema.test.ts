/**
 * THE CLEAN DELTA JSON SCHEMA — the other half of the ⑥ deliverable, and the artifact Planitor D11 makes
 * **the contract itself**: *"the Clean Delta Package becomes ONE VERSIONED JSON SCHEMA, and every repo
 * validates its producer/consumer against it IN CI"* — because *"a contract maintained by remembering to
 * edit N files **will** drift, and this one carries money and schedule."* Drift becomes a build failure.
 *
 * ⚠ THE VALIDATOR IS DELIBERATELY IN-REPO AND TINY. `ajv` is present in this tree only as a transitive
 * dependency of eslint (not importable under pnpm's strict layout), and adding a dependency to validate
 * our own output is a poor trade for the draft-07 SUBSET this schema actually uses:
 * `type` · `required` · `properties` · `items` · `enum` · `const`. Nothing else appears in the file, and
 * §3 asserts that too — so the subset cannot silently fall behind the schema.
 *
 * ⚠⚠ AND THE VALIDATOR ITSELF IS REVERT-VERIFIED (§2). A conformance test whose checker cannot fail is
 * theatre; every one of these mutations is asserted to be CAUGHT: a wrong `const`, a missing required
 * field, a wrong scalar type, an out-of-enum `change_type`, a bad nested part. *(§1b method 2: for every
 * criterion, ask what it would take for the test to pass while the criterion is false.)*
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  createRegistries,
  exportCleanDelta,
} from '@bunyan/document';
import type { Registries, Scene } from '@bunyan/document';
import { openingType, wallType } from '@bunyan/types';

const SCHEMA_PATH = fileURLToPath(
  new URL('../packages/document/schema/clean-delta-1.1.schema.json', import.meta.url),
);
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')) as Record<string, unknown>;

/* ================================================================================================
 * The validator — the draft-07 subset this schema uses, and nothing more.
 * ============================================================================================= */

type Json = Record<string, unknown>;

const typeOf = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

/** Validate `value` against `node`, collecting dotted-path errors. Returns [] when it conforms. */
function validate(value: unknown, node: Json, path = '$'): string[] {
  const errors: string[] = [];

  if ('const' in node && value !== node['const']) {
    errors.push(
      `${path}: expected const ${JSON.stringify(node['const'])}, got ${JSON.stringify(value)}`,
    );
  }
  if (Array.isArray(node['enum']) && !node['enum'].includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of ${JSON.stringify(node['enum'])}`);
  }
  if (node['type'] !== undefined) {
    const allowed = Array.isArray(node['type']) ? node['type'] : [node['type']];
    // `integer` is not used by this schema; `number` covers it.
    if (!allowed.includes(typeOf(value))) {
      errors.push(`${path}: expected type ${allowed.join('|')}, got ${typeOf(value)}`);
      return errors; // a wrong type makes every nested check meaningless noise
    }
  }

  if (typeOf(value) === 'object') {
    const record = value as Json;
    for (const key of (node['required'] as string[] | undefined) ?? []) {
      if (!(key in record)) errors.push(`${path}: missing required property "${key}"`);
    }
    const properties = (node['properties'] as Record<string, Json> | undefined) ?? {};
    for (const [key, sub] of Object.entries(properties)) {
      if (key in record) errors.push(...validate(record[key], sub, `${path}.${key}`));
    }
  }

  if (typeOf(value) === 'array' && node['items'] !== undefined) {
    (value as unknown[]).forEach((item, i) => {
      errors.push(...validate(item, node['items'] as Json, `${path}[${String(i)}]`));
    });
  }

  return errors;
}

/** Every JSON Schema keyword appearing anywhere in the schema file — §3 checks the subset covers it. */
function keywordsIn(node: unknown, found = new Set<string>()): Set<string> {
  if (typeOf(node) !== 'object') return found;
  for (const [key, sub] of Object.entries(node as Json)) {
    found.add(key);
    if (key === 'properties') {
      for (const child of Object.values(sub as Json)) keywordsIn(child, found);
    } else {
      keywordsIn(sub, found);
    }
  }
  return found;
}

describe('the Clean Delta JSON Schema — the contract as an artifact (Planitor D11)', () => {
  let kernel: OcctKernel;
  let client: KernelClient;

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  });
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  const newRegistries = (): Registries => {
    const r = createRegistries();
    r.types.register(wallType);
    r.types.register(openingType);
    for (const command of CORE_COMMANDS) r.commands.register(command);
    return r;
  };

  /** A real building, a baseline, then an add + a resize + a delete after it. */
  const exported = async (): ReturnType<typeof exportCleanDelta> => {
    const doc = new DocumentContext({ registries: newRegistries(), geometry: client });
    await doc.execute('core.createMaterial', {
      id: 'concrete',
      name: 'C25/30',
      category: 'concrete',
      density: 2400,
    });
    await doc.execute('core.createContainer', { id: 'site', kind: 'site', name: 'Site' });
    await doc.execute('core.createContainer', {
      id: 'bldg',
      kind: 'building',
      name: 'Tower A',
      parentId: 'site',
    });
    await doc.execute('core.createContainer', {
      id: 'l1',
      kind: 'level',
      name: 'Level 1',
      parentId: 'bldg',
      elevation: 0,
    });
    await doc.execute('core.createStyle', {
      id: 'EXT',
      name: 'EXT',
      typeId: wallType.id,
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 200, discipline: 'structural' },
      ],
    });
    const makeWall = async (length: number): Promise<string> =>
      (
        await doc.execute('core.createElement', {
          typeId: wallType.id,
          styleId: 'EXT',
          containerId: 'l1',
          params: { start: [0, 0], end: [length, 0], height: 3000 },
        })
      ).changes[0]!.id;

    const resized = await makeWall(6000);
    const removed = await makeWall(4000);
    await doc.execute('core.issueRevision', { by: 'architect' });
    const rev1 = doc.revision!;

    await makeWall(2500); // added
    await doc.execute('core.setParams', { elementId: resized, params: { end: [9000, 0] } });
    await doc.execute('core.deleteElement', { elementId: removed });
    await doc.execute('core.issueRevision', { by: 'architect' });

    return exportCleanDelta(doc, {
      since: rev1,
      priorContext: {
        registries: newRegistries(),
        geometry: client,
        create: (scene: Scene) =>
          new DocumentContext({ registries: newRegistries(), geometry: client, scene }),
      },
    });
  };

  /* ============================================================================================
   * §1 — CONFORMANCE. What the exporter actually emits satisfies the published schema.
   * ========================================================================================= */

  it('⚠⚠ a REAL exported package validates against the published schema', async () => {
    const pkg = await exported();
    // Round-trip through JSON first: what a consumer receives is the WIRE form, not the in-memory
    // object — `undefined` fields vanish there, which is exactly how an optional field must behave.
    const wire = JSON.parse(JSON.stringify(pkg)) as unknown;

    expect(validate(wire, schema)).toEqual([]);
    expect((wire as Record<string, unknown>)['contract_version']).toBe('1.1');
    expect((wire as Record<string, unknown>)['source']).toBe('bunyan');
  }, 180000);

  it('the schema is the version the exporter announces — they cannot drift apart silently', async () => {
    const pkg = await exported();
    expect((schema['properties'] as Record<string, Json>)['contract_version']!['const']).toBe(
      pkg.contract_version,
    );
    expect(schema['$id']).toContain('clean-delta-1.1');
  }, 180000);

  /* ============================================================================================
   * §2 — ⚠⚠ REVERT-VERIFY THE VALIDATOR. A checker that cannot fail proves nothing.
   * ========================================================================================= */

  it('⚠⚠ CATCHES every way the package could drift from the contract', async () => {
    const pkg = await exported();
    const wire = JSON.parse(JSON.stringify(pkg)) as Json;
    const mutate = (fn: (draft: Json) => void): string[] => {
      const draft = JSON.parse(JSON.stringify(wire)) as Json;
      fn(draft);
      return validate(draft, schema);
    };

    // a wrong contract version (the drift Planitor D11 exists to turn into a build failure)
    expect(mutate((d) => (d['contract_version'] = '1.0'))[0]).toMatch(/expected const/);
    // a producer that forgot the per-part breakdown's material
    expect(
      mutate((d) => {
        delete ((d['elements'] as Json[])[0]!['quantity'] as Json)['parts'];
      })[0],
    ).toMatch(/missing required property "parts"/);
    // ⚠ a downgraded basis — the one thing Planitor D10 forbids
    expect(
      mutate((d) => {
        ((d['elements'] as Json[])[0]!['quantity'] as Json)['basis'] = 'guessed';
      })[0],
    ).toMatch(/is not one of/);
    // a change_type outside the enum
    expect(mutate((d) => ((d['elements'] as Json[])[0]!['change_type'] = 'vibes'))[0]).toMatch(
      /is not one of/,
    );
    // a quantity that became a string
    expect(
      mutate((d) => {
        ((d['elements'] as Json[])[0]!['quantity'] as Json)['value'] = '2.4';
      })[0],
    ).toMatch(/expected type number/);
    // a missing `prior` — the field that carries the delta's before-state
    expect(
      mutate((d) => {
        delete (d['elements'] as Json[])[0]!['prior'];
      })[0],
    ).toMatch(/missing required property "prior"/);
    // a nested part with a non-numeric volume (proves the walk really recurses into arrays)
    expect(
      mutate((d) => {
        (((d['elements'] as Json[])[0]!['quantity'] as Json)['parts'] as Json[])[0]!['volume'] =
          null;
      })[0],
    ).toMatch(/expected type number/);
    // a missing top-level collection
    expect(mutate((d) => delete d['spatial'])[0]).toMatch(/missing required property "spatial"/);
  }, 180000);

  /* ============================================================================================
   * §3 — THE SUBSET IS HONEST. The validator covers every keyword the schema uses.
   * ========================================================================================= */

  it('⚠ uses only the draft-07 keywords this validator implements — no silently-ignored constraint', () => {
    // Structural/annotation keywords carry no validation semantics; the rest MUST be implemented above,
    // or the schema would state a rule the conformance test quietly skips.
    const annotations = new Set(['$schema', '$id', 'title', 'description']);
    const implemented = new Set(['type', 'required', 'properties', 'items', 'enum', 'const']);

    const unhandled = [...keywordsIn(schema)].filter(
      (k) => !annotations.has(k) && !implemented.has(k),
    );
    expect(
      unhandled,
      `schema uses keywords the conformance validator ignores: ${unhandled.join(', ')}`,
    ).toEqual([]);
  });
});
