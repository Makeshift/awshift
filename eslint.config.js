import eslint from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import jsdoc from 'eslint-plugin-jsdoc'
import tseslint from 'typescript-eslint'
import fixUnusedImports from 'eslint-plugin-unused-imports'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

// TODO: Check if eslint-config-standard-with-typescript supports eslint flat-file config yet
// https://github.com/mightyiam/eslint-config-standard-with-typescript/issues/1299
const compat = new FlatCompat()

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      '**/node_modules',
      '**/*.d.ts'
    ]
  },
  {
    files: ['**/*.ts', '**/*.js'],
    extends: [
      jsdoc.configs['flat/recommended-typescript'],
      eslint.configs.recommended,
      ...compat.extends('standard-with-typescript')
    ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
        project: `${dirname(fileURLToPath(import.meta.url))}/tsconfig.json`
      }
    },
    plugins: {
      fixUnusedImports
    },
    rules: {
      '@typescript-eslint/consistent-type-assertions': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': 'off', // This is handled by the fixUnusedImports plugin
      'fixUnusedImports/no-unused-imports': 'warn',
      'fixUnusedImports/no-unused-vars': 'warn',
      'comma-dangle': 'off',
      'no-new': 'off'
    }
  }
)
