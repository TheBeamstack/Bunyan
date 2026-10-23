// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R6 (`D-20261012-06`: `bundle`) — a real `vite build` stamps the bundle's digest into the HTML,
 * so a changed main chunk, worker or asset changes the envelope and the whole cache is ignored, and no
 * content-hashed file changes bytes under its name (B-20261020-02).
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, type Rollup } from 'vite';
import { afterAll, describe, expect, it } from 'vitest';
import { CACHE_SCHEME, sameCacheEnvelope, type CacheEnvelope } from '@bunyan/document';
import { bundleCodeId, codeIdPlugin } from '../codeIdPlugin.js';
import { CODE_ID, CODE_ID_META, CODE_ID_PLACEHOLDER, codeIdFrom } from './codeId.js';

const CODE_ID_TS = fileURLToPath(new URL('./codeId.ts', import.meta.url));
const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

interface Built {
  /** The id in the built `index.html`'s meta tag. */
  readonly stamp: string;
  /** `CODE_ID` as the built code reads it, run against that HTML. */
  readonly runtime: string;
  /** Every content-hashed file, by name. */
  readonly hashed: Map<string, string>;
}

/**
 * Builds an HTML app — an entry, a dynamically imported chunk carrying `CODE_ID` (as the real app's
 * `PartBatch` chunk does), a module worker — and runs its entry chunk with a `document` serving the
 * built HTML's meta tags.
 */
async function buildApp(main: string, worker: string): Promise<Built> {
  const dir = mkdtempSync(join(tmpdir(), 'bunyan-codeid-'));
  dirs.push(dir);
  writeFileSync(
    join(dir, 'index.html'),
    `<!doctype html><script type="module" src="./main.js"></script>\n`,
  );
  writeFileSync(join(dir, 'worker.js'), worker);
  writeFileSync(join(dir, 'id.js'), `export { CODE_ID } from ${JSON.stringify(CODE_ID_TS)};\n`);
  writeFileSync(
    join(dir, 'main.js'),
    `globalThis.__codeId = (await import('./id.js')).CODE_ID;\n` +
      `export const spawn = () => new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });\n` +
      main,
  );
  const out = (await build({
    root: dir,
    configFile: false,
    logLevel: 'silent',
    plugins: [codeIdPlugin()],
    worker: { format: 'es' },
    build: { outDir: join(dir, 'dist'), target: 'es2022', modulePreload: false },
  })) as Rollup.RollupOutput;
  const files = out.output;
  expect(files.some((f) => f.type === 'asset' && /worker-[\w-]+\.js$/.test(f.fileName))).toBe(true);
  const html = readFileSync(join(dir, 'dist', 'index.html'), 'utf8');
  const metas = new Map(
    [...html.matchAll(/<meta name="([^"]+)" content="([^"]*)"/g)].map((m) => [m[1]!, m[2]!]),
  );
  const stamp = metas.get(CODE_ID_META) ?? '';

  const entry = files.find((f): f is Rollup.OutputChunk => f.type === 'chunk' && f.isEntry)!;
  const g = globalThis as { document?: unknown; __codeId?: string };
  g.document = {
    // Vite's dynamic-import helper probes `<link>` support at load.
    createElement: () => ({ relList: { supports: () => false } }),
    querySelector: (sel: string) => {
      const name = /^meta\[name="([^"]+)"\]$/.exec(sel)?.[1];
      const content = name === undefined ? undefined : metas.get(name);
      return content === undefined ? null : { content };
    },
  };
  try {
    await import(pathToFileURL(join(dir, 'dist', entry.fileName)).href);
  } finally {
    delete g.document;
  }
  const runtime = g.__codeId ?? '';
  delete g.__codeId;

  const hashed = new Map<string, string>();
  for (const f of files) {
    if (f.fileName.endsWith('.html')) continue;
    const bytes = f.type === 'chunk' ? f.code : Buffer.from(f.source).toString('base64');
    hashed.set(f.fileName, bytes);
  }
  return { stamp, runtime, hashed };
}

/** hmdnah's probe (PR #90 review step 1): two builds whose code differs elsewhere, chunks only. */
async function probeChunks(other: string): Promise<Map<string, string>> {
  const dir = mkdtempSync(join(tmpdir(), 'hm-probe-'));
  writeFileSync(join(dir, 'id.js'), `export { CODE_ID } from ${JSON.stringify(CODE_ID_TS)};\n`);
  writeFileSync(join(dir, 'other.js'), other);
  writeFileSync(
    join(dir, 'main.js'),
    `export const id = () => import('./id.js');\nexport const other = () => import('./other.js');\n`,
  );
  const out = (await build({
    root: dir,
    configFile: false,
    logLevel: 'silent',
    plugins: [codeIdPlugin()],
    build: {
      outDir: join(dir, 'dist'),
      write: false,
      rollupOptions: { input: join(dir, 'main.js'), preserveEntrySignatures: 'strict' },
    },
  })) as Rollup.RollupOutput;
  rmSync(dir, { recursive: true, force: true });
  return new Map(
    out.output
      .filter((f): f is Rollup.OutputChunk => f.type === 'chunk')
      .map((f) => [f.fileName, f.code]),
  );
}

const envelope = (codeId: string): CacheEnvelope => ({
  cache: CACHE_SCHEME,
  fingerprint: 'bnn1',
  kernelBuildId: 'k',
  codeId,
});

describe('D29 R6 — codeId is the shipped bundle', () => {
  it('the placeholder is one 64-character non-hex literal, and an unstamped load is its own code', () => {
    expect(CODE_ID_PLACEHOLDER).toHaveLength(64);
    expect(CODE_ID).toMatch(/^unstamped:/);
    expect(codeIdFrom(CODE_ID_PLACEHOLDER)).toMatch(/^unstamped:/);
    expect(codeIdFrom(undefined)).not.toBe(codeIdFrom(undefined));
    expect(codeIdFrom('a'.repeat(64))).toBe('a'.repeat(64));
  });

  it('bundleCodeId moves with any file, name or byte, and not with file order', () => {
    const files = [
      { fileName: 'a.js', bytes: 'x' },
      { fileName: 'b.wasm', bytes: new Uint8Array([1, 2]) },
    ];
    const base = bundleCodeId(files);
    expect(bundleCodeId([...files].reverse())).toBe(base);
    expect(
      bundleCodeId([files[0]!, { fileName: 'b.wasm', bytes: new Uint8Array([1, 3]) }]),
    ).not.toBe(base);
    expect(bundleCodeId([{ fileName: 'a.jsx', bytes: '' }, files[1]!])).not.toBe(base);
    expect(bundleCodeId([files[0]!])).not.toBe(base);
  });

  it('a build stamps CODE_ID; the same sources stamp the same id, a changed bundle discards the cache', async () => {
    const a = await buildApp('globalThis.wall = 1;\n', 'self.onmessage = () => 1;\n');
    expect(a.stamp).toMatch(/^[0-9a-f]{64}$/);
    expect(a.runtime).toBe(a.stamp);

    const again = await buildApp('globalThis.wall = 1;\n', 'self.onmessage = () => 1;\n');
    expect(again.runtime).toBe(a.runtime);

    const mainFix = await buildApp('globalThis.wall = 2;\n', 'self.onmessage = () => 1;\n');
    const workerFix = await buildApp('globalThis.wall = 1;\n', 'self.onmessage = () => 2;\n');
    for (const changed of [mainFix, workerFix]) {
      expect(changed.runtime).toMatch(/^[0-9a-f]{64}$/);
      expect(changed.runtime).not.toBe(a.runtime);
      expect(sameCacheEnvelope(envelope(a.runtime), envelope(changed.runtime))).toBe(false);
      // B-20261020-02: the chunk carrying CODE_ID keeps its name here, so its bytes must not move.
      let shared = 0;
      for (const [name, bytes] of a.hashed)
        if (changed.hashed.has(name)) {
          shared += 1;
          expect(changed.hashed.get(name), name).toBe(bytes);
        }
      expect(shared).toBeGreaterThan(0);
    }
    expect(sameCacheEnvelope(envelope(a.runtime), envelope(again.runtime))).toBe(true);
  }, 60000);

  it('a content-hashed chunk name still identifies its bytes after the stamp', async () => {
    const a = await probeChunks('export const v = 1;\n');
    const b = await probeChunks('export const v = 2;\n');
    for (const [name, code] of a) if (b.has(name)) expect(b.get(name), name).toBe(code);
  }, 60000);
});
