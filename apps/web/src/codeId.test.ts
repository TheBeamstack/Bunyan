// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R6 (`D-20261012-06`: `bundle`) — a real `vite build` stamps `CODE_ID` with the bundle's digest,
 * so a changed main chunk, worker or asset changes the envelope and the whole cache is ignored.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, type Rollup } from 'vite';
import { afterAll, describe, expect, it } from 'vitest';
import { CACHE_SCHEME, sameCacheEnvelope, type CacheEnvelope } from '@bunyan/document';
import { bundleCodeId, codeIdPlugin } from '../codeIdPlugin.js';
import { CODE_ID, CODE_ID_PLACEHOLDER } from './codeId.js';

const CODE_ID_TS = fileURLToPath(new URL('./codeId.ts', import.meta.url));
const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

/** Builds a two-entry-point app (main + module worker) that exports `CODE_ID`, and runs its output. */
async function buildApp(main: string, worker: string): Promise<{ stamp: string; runtime: string }> {
  const dir = mkdtempSync(join(tmpdir(), 'bunyan-codeid-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'worker.js'), worker);
  writeFileSync(
    join(dir, 'main.js'),
    `export { CODE_ID } from ${JSON.stringify(CODE_ID_TS)};\n` +
      `export const spawn = () => new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });\n` +
      main,
  );
  const out = (await build({
    root: dir,
    configFile: false,
    logLevel: 'silent',
    plugins: [codeIdPlugin()],
    // An unhashed worker name, so only the worker's bytes — not its URL in the main chunk — can move the id.
    worker: { format: 'es', rollupOptions: { output: { entryFileNames: 'assets/[name].js' } } },
    build: {
      outDir: join(dir, 'dist'),
      lib: { entry: join(dir, 'main.js'), formats: ['es'], fileName: 'main' },
    },
  })) as Rollup.RollupOutput[];
  const files = out.flatMap((o) => o.output);
  expect(files.some((f) => f.type === 'asset' && f.fileName.includes('worker'))).toBe(true);
  const entry = files.find((f): f is Rollup.OutputChunk => f.type === 'chunk' && f.isEntry)!;
  expect(entry.code).not.toContain(CODE_ID_PLACEHOLDER);
  const stamp = /[0-9a-f]{64}/.exec(entry.code)?.[0] ?? '';
  const mod = (await import(pathToFileURL(join(dir, 'dist', entry.fileName)).href)) as {
    CODE_ID: string;
  };
  return { stamp, runtime: mod.CODE_ID };
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
    const a = await buildApp('export const wall = 1;\n', 'self.onmessage = () => 1;\n');
    expect(a.runtime).toBe(a.stamp);
    expect(a.runtime).toMatch(/^[0-9a-f]{64}$/);

    const again = await buildApp('export const wall = 1;\n', 'self.onmessage = () => 1;\n');
    expect(again.runtime).toBe(a.runtime);

    const mainFix = await buildApp('export const wall = 2;\n', 'self.onmessage = () => 1;\n');
    const workerFix = await buildApp('export const wall = 1;\n', 'self.onmessage = () => 2;\n');
    for (const changed of [mainFix, workerFix]) {
      expect(changed.runtime).toMatch(/^[0-9a-f]{64}$/);
      expect(changed.runtime).not.toBe(a.runtime);
      expect(sameCacheEnvelope(envelope(a.runtime), envelope(changed.runtime))).toBe(false);
    }
    expect(sameCacheEnvelope(envelope(a.runtime), envelope(again.runtime))).toBe(true);
  }, 60000);
});
