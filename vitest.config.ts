import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const pkg = (name: string): string =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@bunyan/protocol': pkg('protocol'),
      '@bunyan/kernel-core': pkg('kernel-core'),
      '@bunyan/kernel-mock': pkg('kernel-mock'),
      '@bunyan/kernel-occt': pkg('kernel-occt'),
      '@bunyan/kernel-client': pkg('kernel-client'),
      '@bunyan/document': pkg('document'),
      '@bunyan/sketch-solver': pkg('sketch-solver'),
      '@bunyan/types': pkg('types'),
    },
  },
  // The Emscripten modules resolve their own .wasm from `import.meta.url` and read it off disk under
  // Node. Leave them untransformed — Vite would rewrite that URL and the module would fail to find its
  // own binary. `@salusoft89/planegcs` (the sketch solver's WASM, 0d) is the same kind of module.
  optimizeDeps: { exclude: ['@bunyan/kernel-occt', '@salusoft89/planegcs'] },
  test: {
    globals: true,
    // The kernel is transport-agnostic, so the whole seam is testable in plain Node — no browser,
    // no jsdom. That is what lets the headless build box run the same suite CI runs.
    environment: 'node',
    // `tests/**` is the kernel + document suite; `apps/**` is Amer's browser hot path. Both are
    // collected so a test written beside the app it covers actually runs — before P4 step 0 the app
    // could not be tested at all (review_P4.md §2 / Entry 24). App tests that need the DOM opt into
    // jsdom per-file; the pure logic here (the edit runner) runs in plain Node like everything else.
    include: ['tests/**/*.test.ts', 'apps/**/*.test.ts?(x)'],
  },
});
