import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // §8: no `any`. `unknown` + narrowing is the escape hatch.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Vendored verbatim from the Magic UI registry — kept close to upstream so a future
    // re-pull is a diff, not a merge. Don't relint someone else's house style.
    // `purity` fires on DotPattern's Math.random() jitter, which is the effect: the dots
    // are meant to twinkle out of phase, and re-randomising on re-render is harmless for
    // a decorative background.
    files: ['src/components/ui/**'],
    rules: { 'react-hooks/exhaustive-deps': 'off', 'react-hooks/purity': 'off' },
  },
  {
    files: ['scripts/**', 'vite.config.ts'],
    languageOptions: { globals: globals.node },
  }
);
