import nextFlatConfig from 'eslint-config-next-flat';
import tsParser from '@typescript-eslint/parser';

export default [
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
