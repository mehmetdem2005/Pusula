// @ts-check
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      '_DEVRETME_silinecek/**',
      'node_modules/**',
      '**/next-env.d.ts',
    ],
  },
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      import: importPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@pusula/llm-gateway/src/adapters/*'],
              message:
                'LLM adapter\'ları doğrudan import etme — Gateway üzerinden geç (güvenlik kuralı)',
            },
          ],
        },
      ],
    },
  },
  {
    // NestJS DI, enjekte edilen sınıflar için value import gerektirir
    // (emitDecoratorMetadata). consistent-type-imports bunları type-import'a
    // çevirip DI'yı bozuyor; bu yüzden apps/api'de kapalı.
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
);
