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
      '@bunyan/kernel-client': pkg('kernel-client'),
    },
  },
  test: {
    globals: true,
    // The kernel is transport-agnostic, so the whole seam is testable in plain Node — no browser,
    // no jsdom. That is what lets the headless build box run the same suite CI runs.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
