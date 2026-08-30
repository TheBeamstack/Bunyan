// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = fileURLToPath(new URL('.', import.meta.url));

// The kernel worker is an ES module (`new Worker(url, { type: 'module' })`), and the OCCT glue locates
// its 14 MB `.wasm` via `new URL('bunyan-kernel.wasm', import.meta.url)` — a pattern Vite's asset
// pipeline rewrites for us, in dev and in build. So `worker.format` MUST be 'es', and the pre-bundler
// must NOT try to swallow the multi-megabyte emscripten glue.
export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    // The workspace packages are TS source we compile ourselves; the OCCT glue is a huge pre-built
    // artifact that esbuild has no business pre-bundling.
    exclude: ['@bunyan/kernel-occt'],
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      // The app, plus the scale-harness page (plan P4 step 9b) — a second HTML entry so it is built and
      // gated, not only dev-served.
      input: {
        main: resolve(here, 'index.html'),
        scale: resolve(here, 'scale.html'),
        storageCheck: resolve(here, 'storage-check.html'),
      },
    },
  },
});
