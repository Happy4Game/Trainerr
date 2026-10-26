import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'android/**',
      'ios/**',
      'public/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      // Ionic utilise l'attribut slot des Web Components, pas les slots de Vue.
      'vue/no-deprecated-slot-attribute': 'off',
    },
  },
  {
    // Le domaine reste du TypeScript pur : aucune dépendance à l'interface ni à la base.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['vue', 'vue-*', '@ionic/*', '@capacitor/*', '@capacitor-community/*'],
              message: 'Le domaine ne dépend ni de Vue, ni d’Ionic, ni de Capacitor.',
            },
            {
              group: ['sql.js', 'jeep-sqlite', '@/data/*', '@/ui/*', '@/views/*'],
              message: 'Le domaine ne dépend pas de la couche données ou interface.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
