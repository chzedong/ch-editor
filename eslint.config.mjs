import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,ts}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        HTMLElementTagNameMap: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // 基础规则
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // TypeScript规则
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // 代码风格
      indent: ['error', 2],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-infix-ops': ['error'],
      'keyword-spacing': ['error'],
      'space-before-blocks': ['error'],

      // 最佳实践
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-multiple-empty-lines': ['error', { max: 2 }],
      'no-trailing-spaces': 'error',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.min.js', 'vite.config.ts'],
  },
];
