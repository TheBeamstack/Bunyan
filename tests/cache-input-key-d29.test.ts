// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R1 — the cache input key (`docs/design/P5_step9_D29_bnn_cache_design.md` §2a–§2c, T-039).
 *
 * A cached solid is restored only when its assembly's key matches, so the key must move exactly when an
 * input the build reads moves. Every edit below is made to the PARSED `scene.json` text — the hand-edit
 * the manifest's `kernelBuildId`/`typeVersions` cannot see (§1) — and asserts WHICH roots' keys flipped.
 *
 * REVERT-VERIFY: drop any one §2b input class from `memberInputs` in `cachekey.ts` and its case below
 * goes red (recorded in the T-039 handoff).
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CACHE_SCHEME,
  cacheInputKey,
  cacheInputKeys,
  cacheKeyTables,
  canonicalJson,
  emptyScene,
  sameCacheEnvelope,
  sha256Utf8Hex,
} from '@bunyan/document';
import type { Element, Scene } from '@bunyan/document';

const el = (id: string, typeId: string, params: Record<string, unknown>, extra = {}): Element =>
  ({
    id,
    typeId,
    typeVersion: 1,
    params,
    classification: { ifcClass: 'IfcWall', loadBearing: false },
    ...extra,
  }) as Element;

const wall = (id: string, start: [number, number], end: [number, number]): Element =>
  el(id, 'core.wall', { start, end, thickness: 200, height: 2400 }, { styleId: 'WS' });

/**
 * W1 and W2 meet at (5000,0) and auto-miter; W3 is alone and hosts O1; `col` is datum- and grid-bound;
 * `sk` carries a sketch constraint; `cw` is a composite whose generated children wear `PANEL` — a style
 * no scene row names, read only because the Type's code chose it (§2b).
 */
function fixture(): Scene {
  return {
    ...emptyScene(),
    elements: {
      W1: wall('W1', [0, 0], [5000, 0]),
      W2: wall('W2', [5000, 0], [5000, 5000]),
      W3: { ...wall('W3', [20000, 0], [25000, 0]), containerId: 'L1' },
      O1: el('O1', 'core.opening', { width: 900, height: 2100 }, { hostId: 'W3', hostRef: 'r' }),
      col: el('col', 'core.column', { height: 3000 }),
      sk: el('sk', 'core.slab', { thickness: 250 }),
      cw: el('cw', 'test.styled-composite', { bays: 2 }),
    },
    styles: {
      WS: { id: 'WS', name: 'wall', layers: [{ materialId: 'M1', thickness: 200 }] },
      PANEL: { id: 'PANEL', name: 'panel', layers: [{ materialId: 'M1', thickness: 20 }] },
    } as unknown as Scene['styles'],
    materials: {
      M1: { id: 'M1', name: 'concrete', density: 2400 },
    } as unknown as Scene['materials'],
    sections: { S1: { id: 'S1', name: 'IPE200' } } as unknown as Scene['sections'],
    containers: {
      L1: { id: 'L1', kind: 'level', name: 'L1', elevation: 0 },
      L2: { id: 'L2', kind: 'level', name: 'L2', elevation: 3000 },
    } as unknown as Scene['containers'],
    grids: {
      G1: { id: 'G1', name: 'A', axis: 'y', offset: 1000 },
      G2: { id: 'G2', name: 'B', axis: 'y', offset: 7000 },
    } as unknown as Scene['grids'],
    constraints: {
      c1: {
        id: 'c1',
        element: 'col',
        kind: 'base',
        target: { kind: 'level', id: 'L1' },
        offset: 0,
      },
      c2: { id: 'c2', element: 'col', kind: 'grid', target: { kind: 'grid', id: 'G1' } },
      c3: { id: 'c3', element: 'sk', kind: 'distance', operands: {}, value: 400 },
      c4: { id: 'c4', element: 'cw:p0', kind: 'distance', operands: {}, value: 10 },
    } as unknown as Scene['constraints'],
  };
}

/**
 * Hand-edit `scene.json`: serialize, parse, set ONE value at `path` in the plain JSON, and return it as
 * the scene a load reads.
 */
function handEdit(scene: Scene, path: readonly (string | number)[], value: unknown): Scene {
  const json = JSON.parse(JSON.stringify(scene, null, 2)) as Record<string | number, unknown>;
  let node = json;
  for (const step of path.slice(0, -1)) node = node[step] as Record<string | number, unknown>;
  node[path[path.length - 1]!] = value;
  return json as unknown as Scene;
}

/** The roots whose key differs between two scenes, sorted. */
function flipped(before: Scene, after: Scene): string[] {
  const a = cacheInputKeys(before);
  const b = cacheInputKeys(after);
  return [...a.keys()].filter((root) => a.get(root) !== b.get(root)).sort();
}

const ALL_ROOTS = ['W1', 'W2', 'W3', 'col', 'cw', 'sk'];

type Case = readonly [
  name: string,
  path: readonly (string | number)[],
  value: unknown,
  roots: string[],
];

/** §2b, one row per per-element input class: the hand-edit and exactly the roots it must re-key. */
const PER_ELEMENT: readonly Case[] = [
  ['the element row — a root param', ['elements', 'W3', 'params', 'height'], 3000, ['W3']],
  [
    'the element row — a hosted void rebuilds with its host',
    ['elements', 'O1', 'params', 'width'],
    1200,
    ['W3'],
  ],
  [
    'the element row — containerId (the storey elevation read)',
    ['elements', 'W3', 'containerId'],
    'L2',
    ['W3'],
  ],
  ['datumElevations — a base constraint offset', ['constraints', 'c1', 'offset'], -300, ['col']],
  [
    'gridPointOf — a grid constraint retargeted',
    ['constraints', 'c2', 'target', 'id'],
    'G2',
    ['col'],
  ],
  [
    'resolveJoins — moving a neighbour re-keys the wall whose miter it reads, and no other',
    ['elements', 'W2', 'params', 'end'],
    [6000, 5000],
    ['W1', 'W2'],
  ],
  [
    'resolveJoins — a join override filed under the neighbour re-keys both walls',
    ['constraints', 'j1'],
    { id: 'j1', element: 'W2', other: 'W1', kind: 'join', resolution: 'none' },
    ['W1', 'W2'],
  ],
  ['sketchConstraintsOf — a sketch dimension', ['constraints', 'c3', 'value'], 500, ['sk']],
  [
    'a constraint on a generated child (`<rootId>:<slot>`) re-keys its root',
    ['constraints', 'c4', 'value'],
    12,
    ['cw'],
  ],
];

/** §2b, the five whole-digested tables: any edit re-keys every root. */
const SHARED_TABLES: readonly Case[] = [
  ['styles', ['styles', 'WS', 'layers', 0, 'thickness'], 250, ALL_ROOTS],
  [
    'styles — PANEL, read only by a D59 child no scene row names',
    ['styles', 'PANEL', 'layers', 0, 'thickness'],
    60,
    ALL_ROOTS,
  ],
  ['materials', ['materials', 'M1', 'density'], 2500, ALL_ROOTS],
  ['sections', ['sections', 'S1', 'name'], 'IPE220', ALL_ROOTS],
  ['containers', ['containers', 'L2', 'elevation'], 3200, ALL_ROOTS],
  ['grids', ['grids', 'G2', 'offset'], 7500, ALL_ROOTS],
];

describe('D29 R1 — the cache input key', () => {
  it('keys exactly the assembly roots; a hosted void is part of its host, never its own entry', () => {
    expect([...cacheInputKeys(fixture()).keys()].sort()).toEqual(ALL_ROOTS);
  });

  describe('§2b — each per-element input class flips exactly the assemblies that read it', () => {
    for (const [name, path, value, roots] of PER_ELEMENT) {
      it(name, () => {
        expect(flipped(fixture(), handEdit(fixture(), path, value))).toEqual(roots);
      });
    }
  });

  describe('§2b — the five shared tables are digested whole', () => {
    for (const [table, path, value, roots] of SHARED_TABLES) {
      it(`an edit to ${table} flips every key`, () => {
        expect(flipped(fixture(), handEdit(fixture(), path, value))).toEqual(roots);
      });
    }
  });

  it('§2b canonical JSON — a whitespace and key-order reformat of scene.json flips no key', () => {
    const reverseKeys = (v: unknown): unknown =>
      Array.isArray(v)
        ? v.map(reverseKeys)
        : v !== null && typeof v === 'object'
          ? Object.fromEntries(
              Object.entries(v)
                .reverse()
                .map(([k, x]) => [k, reverseKeys(x)]),
            )
          : v;
    const text = JSON.stringify(reverseKeys(fixture()), null, '\t');
    expect(text).not.toBe(JSON.stringify(fixture()));
    expect(flipped(fixture(), JSON.parse(text) as Scene)).toEqual([]);
  });

  it('the one-pass tables give the same key as a per-call recomputation', () => {
    const scene = fixture();
    const tables = cacheKeyTables(scene);
    for (const [root, key] of cacheInputKeys(scene))
      expect(cacheInputKey(scene, root, tables)).toBe(key);
  });

  it('canonical JSON: sorted keys, no whitespace, undefined members dropped', () => {
    expect(canonicalJson({ b: [1, { d: 2, c: undefined, a: 'x' }], a: 1.5 })).toBe(
      '{"a":1.5,"b":[1,{"a":"x","d":2}]}',
    );
  });

  it('sha256Utf8Hex matches node:crypto, non-ASCII included (scene names are not ASCII)', () => {
    for (const text of ['', 'abc', 'جدار خارجي — 200 mm', 'x'.repeat(1000), '😀']) {
      expect(sha256Utf8Hex(text)).toBe(createHash('sha256').update(text, 'utf8').digest('hex'));
    }
  });

  it('§2a the envelope: any one field differing discards the whole cache', () => {
    const env = {
      cache: CACHE_SCHEME,
      fingerprint: 'bnn1',
      kernelBuildId: 'k1',
      codeId: 'c1',
    } as const;
    expect(sameCacheEnvelope(env, { ...env })).toBe(true);
    for (const field of ['cache', 'fingerprint', 'kernelBuildId', 'codeId'] as const) {
      expect(sameCacheEnvelope(env, { ...env, [field]: 'other' })).toBe(false);
    }
  });

  it('key time at 1k / 4k / 16k elements (printed; R1 measures, §2b "Cost")', () => {
    const scaled = (n: number): Scene => {
      // Closed 4-wall rooms (every corner a miter), one base constraint per wall.
      const elements: Record<string, Element> = {};
      const constraints: Record<string, unknown> = {};
      for (let i = 0; i < n / 4; i++) {
        const x = (i % 100) * 6000;
        const y = Math.floor(i / 100) * 6000;
        const pts: [number, number][] = [
          [x, y],
          [x + 5000, y],
          [x + 5000, y + 5000],
          [x, y + 5000],
        ];
        for (let k = 0; k < 4; k++) {
          const id = `w${String(i)}_${String(k)}`;
          elements[id] = { ...wall(id, pts[k]!, pts[(k + 1) % 4]!), containerId: 'L1' };
          constraints[`c_${id}`] = {
            id: `c_${id}`,
            element: id,
            kind: 'base',
            target: { kind: 'level', id: 'L1' },
          };
        }
      }
      return { ...fixture(), elements, constraints: constraints as Scene['constraints'] };
    };
    const rows: string[] = [];
    for (const n of [1000, 4000, 16000]) {
      const scene = scaled(n);
      const t0 = performance.now();
      const keys = cacheInputKeys(scene);
      const ms = performance.now() - t0;
      expect(keys.size).toBe(n);
      rows.push(`${String(n)} elements: ${ms.toFixed(1)} ms`);
    }
    console.log(`[T-039] cacheInputKeys — ${rows.join(' · ')}`);
  });
});
