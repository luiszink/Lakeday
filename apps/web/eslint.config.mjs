import { baseEslintConfig } from '../../packages/config/eslint/base.mjs';

export default [
  ...baseEslintConfig,
  {
    ignores: ['next-env.d.ts'],
  },
];
