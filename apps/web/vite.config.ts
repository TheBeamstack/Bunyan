import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  },
});
