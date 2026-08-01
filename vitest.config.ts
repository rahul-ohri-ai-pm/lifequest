import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.ts rather than a `test` block inside it: vitest
// bundles its own (rollup-based) copy of Vite, and mixing its types with the project's
// Vite 8 (rolldown) makes `plugins` structurally incompatible — `tsc` fails on the config
// file itself. Nothing is lost by splitting them. §8 keeps src/engine/ pure TypeScript
// with no React, DOM, or CSS imports, so the tests need no plugins and no browser
// environment; this file is the whole test setup.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
