import nextFlatConfig from 'eslint-config-next-flat';
import tsParser from '@typescript-eslint/parser';

export default [
  // * Ignore patterns
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'android/app/build/**',
      'node_modules/**',
      'coverage/**',
      '.vercel/**',
      '*.config.ts',
      '*.config.js',
      '*.config.mjs',
      'next-env.d.ts',
    ],
  },
  // * JavaScript/JSX files
  {
    ...nextFlatConfig,
    files: ['**/*.js', '**/*.jsx'],
  },
  // * TypeScript/TSX files
  {
    ...nextFlatConfig,
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ...nextFlatConfig.languageOptions,
      parser: tsParser,
      parserOptions: {
        ...nextFlatConfig.languageOptions?.parserOptions,
        project: './tsconfig.json',
      },
    },
  },
];
