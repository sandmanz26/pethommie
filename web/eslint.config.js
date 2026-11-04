import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/**
 * Module boundaries (see docs/ARCHITECTURE.md):
 *   shared  ← used by both, depends on neither
 *   site    ← marketing site, may use shared
 *   app     ← the product, may use shared
 * Anything outside the current folder is imported through the `@/` alias, never `../`.
 */
const parentImports = {
  group: ['../*'],
  message: 'Import across folders with the @/ alias; use ./ only for files in the same folder.',
}
const boundary = (...groups) => ({
  'no-restricted-imports': ['error', { patterns: [parentImports, ...groups] }],
})
const no = (dirs, why) => ({ group: dirs.flatMap((d) => [`@/${d}`, `@/${d}/*`]), message: why })

export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // `const { password, ...safe } = record` is how a field is left out on purpose.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Vercel functions (api/): Node.js, not the browser; no React. They don't import the app (separate tsconfig).
  {
    files: ['api/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['@/*'], message: 'api/ runs on its own on Vercel: import from api/_lib, not the app.' }] }] },
  },
  { files: ['src/**/*.{ts,tsx}'], rules: boundary() },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: boundary(no(['site', 'app'], 'shared code must not depend on the site or the app.')),
  },
  {
    files: ['src/site/**/*.{ts,tsx}'],
    rules: boundary(no(['app'], 'the marketing site must not depend on the app.')),
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: boundary(no(['site'], 'the app must not depend on the marketing site.')),
  },
)
