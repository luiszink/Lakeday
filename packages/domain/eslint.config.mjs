import { baseEslintConfig } from '../config/eslint/base.mjs';

export default [
  ...baseEslintConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@prisma/*',
                'child_process',
                'child_process/**',
                'fs',
                'fs/**',
                'http',
                'http/**',
                'https',
                'https/**',
                'net',
                'net/**',
                'next',
                'next/**',
                'node:child_process',
                'node:child_process/**',
                'node:fs',
                'node:fs/**',
                'node:http',
                'node:http/**',
                'node:https',
                'node:https/**',
                'node:net',
                'node:net/**',
                'node:tls',
                'node:tls/**',
                'react',
                'react/**',
                'react-dom',
                'react-dom/**',
                'tls',
                'tls/**'
              ],
              message: 'Domain code must remain framework-free and perform no I/O.'
            }
          ]
        }
      ]
    }
  }
];